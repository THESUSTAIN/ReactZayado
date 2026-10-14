"""Paiement en ligne dans les tunnels des utilisateurs (Mollie) + commission Zayado.

Deux façons d'encaisser, choisies automatiquement :
  1. Mollie Connect (recommandé, conforme) : le créateur du tunnel relie SON compte Mollie.
     Le paiement est créé sur son compte avec `applicationFee` = commission Zayado,
     prélevée par Mollie et versée sur le compte Zayado. Le reste va directement au créateur.
     Variables : MOLLIE_CLIENT_ID, MOLLIE_CLIENT_SECRET (app créée dans Mollie › Développeurs › Mes apps).
  2. Encaissement centralisé : le créateur n'a pas relié Mollie → le paiement arrive sur le
     compte Zayado (MOLLIE_API_KEY), la commission est retenue et le net est reversé par l'admin
     (registre « à reverser » ci-dessous).
SIMULATION : uniquement si aucune clé n'est disponible ET ENV=local (paiement marqué payé).

Commission (selon l'offre du créateur) : COMMISSION_TUNNELS (JSON), par défaut
Rêveur / sans offre 10 % (max 49 €), Solo 5 % (max 29 €), Pro, Équipe, Entreprise 0 %.

Privé  (/api/copilote/…) : GET /paiements · PUT /paiements/reglages · GET|DELETE /paiements/connect
Public (/api/…)          : POST /public/t/{slug}/payer · GET /public/t/{slug}/paiement/{pid}
                           POST /public/t-paiement/webhook · GET /mollie/connect/retour
Admin  (/api/admin/…)    : GET /admin/paiements-tunnels · POST /admin/paiements-tunnels/{owner}/reverser
"""

import base64
import json
import logging
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from lib.db import db
from lib.utilisateur import OFFRES, uid

log = logging.getLogger("zayado.paiements_tunnels")
MOLLIE = "https://api.mollie.com/v2"
OAUTH_AUTORISER = "https://my.mollie.com/oauth2/authorize"
OAUTH_JETONS = "https://api.mollie.com/oauth2/tokens"
SCOPES = "payments.read payments.write profiles.read organizations.read"
STATUTS = {"paid": "paye", "authorized": "paye", "pending": "en_attente", "open": "en_attente",
           "failed": "echoue", "canceled": "annule", "expired": "expire"}
ETAPES = {"tripwire": "Offre de démarrage", "commande": "Offre principale", "upsell": "Option", "downsell": "Version allégée"}
COMMISSION_DEFAUT = {"essentielle": [10, 49], "reveur": [10, 49], "serenite": [5, 29]}

router = APIRouter()          # monté sous /copilote
router_public = APIRouter()   # monté sous /api


# ═══════════ Configuration ═══════════
def _srv():
    return sys.modules.get("server")


def _front() -> str:
    return os.environ.get("PUBLIC_FRONTEND_URL", "https://app.zayado.net").rstrip("/")


def _cle_zayado() -> str:
    return os.environ.get("MOLLIE_API_KEY", "").strip()


def _env(*noms: str) -> str:
    """Première variable définie (accepte aussi les noms posés sur Railway : Mollie_ID, Mollie_secret)."""
    return next((os.environ[n].strip() for n in noms if os.environ.get(n, "").strip()), "")


def _connect_conf() -> tuple[str, str]:
    return (_env("MOLLIE_CLIENT_ID", "MOLLIE_ID", "Mollie_ID"),
            _env("MOLLIE_CLIENT_SECRET", "MOLLIE_SECRET", "Mollie_secret"))


def _retour_connect() -> str:
    """Doit être identique à l'« URL de redirection » de l'app Mollie (Développeurs › Mes apps)."""
    return os.environ.get("MOLLIE_CONNECT_REDIRECT", "").strip() or f"{_front()}/api/mollie/connect/retour"


def _local() -> bool:
    return os.environ.get("ENV", "").lower() == "local"


def _maintenant() -> str:
    return datetime.now(timezone.utc).isoformat()


def _chiffrer(v: str) -> str:
    srv = _srv()
    return srv._chiffrer(v) if srv and getattr(srv, "_fernet", None) else v


def _dechiffrer(v: str) -> str:
    srv = _srv()
    try:
        return srv._dechiffrer(v) if srv and getattr(srv, "_fernet", None) else v
    except Exception:  # noqa: BLE001
        return ""


async def _plan_de(user_id: str) -> str:
    srv = _srv()
    if not srv:
        return "essentielle"
    from sqlalchemy import select
    async with srv.async_session() as s:
        vp = (await s.execute(select(srv.VisionProfile).where(srv.VisionProfile.user_id == user_id))).scalar_one_or_none()
    return (vp.plan if vp and vp.plan else "essentielle")


def _bareme() -> dict:
    try:
        return {**COMMISSION_DEFAUT, **json.loads(os.environ.get("COMMISSION_TUNNELS", "{}"))}
    except json.JSONDecodeError:
        return COMMISSION_DEFAUT


async def _taux(user_id: str) -> tuple[str, float, float | None]:
    plan = await _plan_de(user_id)
    taux, plafond = (list(_bareme().get(plan) or [0, None]) + [None])[:2]
    return plan, float(taux or 0), (float(plafond) if plafond else None)


def _commission(montant: float, taux: float, plafond: float | None) -> float:
    c = round(montant * taux / 100, 2)
    return min(c, plafond) if plafond is not None else c


# ═══════════ Mollie Connect (compte du créateur) ═══════════
async def _connexion(user_id: str) -> dict | None:
    return await db.mollie_connect.find_one({"id": f"mc-{user_id}"})


async def _jetons(corps: dict) -> dict:
    cid, secret = _connect_conf()
    auth = base64.b64encode(f"{cid}:{secret}".encode()).decode()
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(OAUTH_JETONS, data=corps, headers={"Authorization": f"Basic {auth}"})
    if r.status_code >= 400:
        log.warning("Mollie OAuth → %s %s", r.status_code, r.text[:200])
        raise HTTPException(502, "Mollie a refusé la connexion du compte.")
    return r.json()


async def _jeton_valide(conn: dict) -> str:
    """Jeton d'accès du créateur (1 h), renouvelé avec le jeton de rafraîchissement."""
    if conn.get("expire", 0) > time.time() + 60:
        return _dechiffrer(conn["access"])
    t = await _jetons({"grant_type": "refresh_token", "refresh_token": _dechiffrer(conn["refresh"])})
    maj = {"access": _chiffrer(t["access_token"]), "expire": time.time() + int(t.get("expires_in", 3600))}
    if t.get("refresh_token"):
        maj["refresh"] = _chiffrer(t["refresh_token"])
    await db.mollie_connect.update_one({"id": conn["id"]}, {"$set": maj})
    return t["access_token"]


async def _mollie(methode: str, chemin: str, jeton: str, corps: dict | None = None, params: dict | None = None) -> dict:
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.request(methode, f"{MOLLIE}/{chemin}", json=corps, params=params,
                            headers={"Authorization": f"Bearer {jeton}"})
    if r.status_code >= 400:
        log.warning("Mollie %s %s → %s %s", methode, chemin, r.status_code, r.text[:200])
        raise HTTPException(502, f"Mollie a refusé la requête ({r.status_code}).")
    return r.json()


async def _mode(owner: str) -> tuple[str, dict | None]:
    conn = await _connexion(owner)
    if conn and all(_connect_conf()):
        return "connect", conn
    if _cle_zayado():
        return "centralise", None
    if _local():
        return "simulation", None
    return "aucun", None


async def paiement_actif(owner: str) -> bool:
    """Utilisé par la page publique : le bouton devient « Payer » si le créateur l'a activé."""
    reg = await db.tunnel_paiement_reglages.find_one({"id": f"pr-{owner}"}) or {}
    return bool(reg.get("en_ligne")) and (await _mode(owner))[0] != "aucun"


# ═══════════ Privé : le créateur du tunnel ═══════════
class ReglagesIn(BaseModel):
    en_ligne: bool
    iban: str | None = Field(default=None, max_length=40)
    titulaire: str | None = Field(default=None, max_length=120)


def _masquer(iban: str) -> str:
    return f"{iban[:4]} •••• {iban[-4:]}" if len(iban) > 8 else ""


def _totaux(ventes: list[dict]) -> dict:
    payees = [v for v in ventes if v.get("statut") == "paye"]
    brut = round(sum(v["montant"] for v in payees), 2)
    com = round(sum(v["commission"] for v in payees), 2)
    centr = [v for v in payees if v.get("mode") in ("centralise", "simulation")]
    du = round(sum(v["net"] for v in centr), 2)
    reverse = round(sum(v["net"] for v in centr if v.get("reverse")), 2)
    return {"ventes": len(payees), "brut": brut, "commission": com, "net": round(brut - com, 2),
            "a_reverser": du, "reverse": reverse, "solde": round(du - reverse, 2)}


async def _etat(owner: str) -> dict:
    mode, conn = await _mode(owner)
    plan, taux, plafond = await _taux(owner)
    reg = await db.tunnel_paiement_reglages.find_one({"id": f"pr-{owner}"}) or {}
    ventes = await db.tunnel_paiements.find({"user_id": owner}).sort("cree_le", -1).to_list(500)
    return {
        "mode": mode, "connect_disponible": all(_connect_conf()), "connecte": bool(conn),
        "organisation": (conn or {}).get("organisation", ""), "en_ligne": bool(reg.get("en_ligne")),
        "iban": _masquer(_dechiffrer(reg.get("iban", ""))) if reg.get("iban") else "", "titulaire": reg.get("titulaire", ""),
        "offre": OFFRES.get(plan, plan.capitalize()), "taux": taux, "plafond": plafond,
        "totaux": _totaux(ventes), "ventes": [_vente_out(v) for v in ventes[:50]],
    }


def _vente_out(v: dict) -> dict:
    return {k: v.get(k) for k in ("id", "tunnel_nom", "etape", "libelle", "montant", "commission", "net", "mode",
                                  "statut", "client_nom", "client_email", "cree_le", "paye_le", "reverse")}


@router.get("/paiements")
async def mes_paiements():
    return await _etat(uid())


@router.put("/paiements/reglages")
async def reglages(b: ReglagesIn):
    owner = uid()
    maj: dict = {"user_id": owner, "en_ligne": b.en_ligne}
    if b.iban is not None:
        iban = b.iban.replace(" ", "").upper()
        if iban and (len(iban) < 15 or not iban[:2].isalpha()):
            raise HTTPException(422, "IBAN invalide.")
        maj["iban"] = _chiffrer(iban) if iban else ""
    if b.titulaire is not None:
        maj["titulaire"] = b.titulaire.strip()
    await db.tunnel_paiement_reglages.update_one({"id": f"pr-{owner}"}, {"$set": maj}, upsert=True)
    return await _etat(owner)


@router.get("/paiements/connect")
async def lien_connect():
    cid, secret = _connect_conf()
    if not (cid and secret):
        raise HTTPException(503, "Mollie Connect n'est pas encore configuré par Zayado (MOLLIE_CLIENT_ID / MOLLIE_CLIENT_SECRET).")
    etat = _chiffrer(f"{uid()}|{int(time.time())}")
    q = {"client_id": cid, "redirect_uri": _retour_connect(), "state": etat, "scope": SCOPES,
         "response_type": "code", "approval_prompt": "auto"}
    return {"url": f"{OAUTH_AUTORISER}?{urlencode(q)}"}


@router.delete("/paiements/connect")
async def deconnecter():
    owner = uid()
    await db.mollie_connect.delete_one({"id": f"mc-{owner}"})
    return await _etat(owner)


@router_public.get("/mollie/connect/retour")
async def retour_connect(code: str = "", state: str = "", error: str = ""):
    """Retour OAuth de Mollie : on enregistre les jetons du créateur (chiffrés) et son profil de paiement."""
    cible = f"{_front()}/tunnels?mollie="
    try:
        owner, ts = _dechiffrer(state).split("|")
        if error or not code or time.time() - int(ts) > 3600:
            return RedirectResponse(cible + "refuse")
    except (ValueError, AttributeError):
        return RedirectResponse(cible + "refuse")
    t = await _jetons({"grant_type": "authorization_code", "code": code, "redirect_uri": _retour_connect()})
    jeton = t["access_token"]
    profils = (await _mollie("GET", "profiles", jeton)).get("_embedded", {}).get("profiles", [])
    profil = next((p for p in profils if p.get("status") == "verified"), profils[0] if profils else None)
    if not profil:
        return RedirectResponse(cible + "sans-profil")
    try:
        org = (await _mollie("GET", "organizations/me", jeton)).get("name", "")
    except HTTPException:
        org = profil.get("name", "")
    await db.mollie_connect.update_one({"id": f"mc-{owner}"}, {"$set": {
        "user_id": owner, "access": _chiffrer(jeton), "refresh": _chiffrer(t.get("refresh_token", "")),
        "expire": time.time() + int(t.get("expires_in", 3600)), "profile_id": profil["id"],
        "testmode": profil.get("mode") == "test" or _local(), "organisation": org, "connecte_le": _maintenant()}}, upsert=True)
    return RedirectResponse(cible + "connecte")


# ═══════════ Public : le visiteur paie dans le tunnel ═══════════
class PayerIn(BaseModel):
    nom: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=160)
    consentement: bool
    etape: str = Field(pattern="^(tripwire|commande|upsell|downsell)$")


def _prix_etape(t: dict, etape: str) -> tuple[str, float]:
    par_cle = {e.get("cle"): e for e in t.get("etapes", [])}
    if etape == "tripwire":
        e = par_cle.get("remerciement") or {}
        nom, prix = e.get("offre_nom") or ETAPES[etape], e.get("prix")
    elif etape == "commande":
        e = par_cle.get("vente") or {}
        nom, prix = e.get("offre_nom") or t.get("nom") or ETAPES[etape], e.get("prix")
    else:
        o = t.get(etape) or {}
        nom, prix = o.get("nom") or ETAPES[etape], o.get("prix")
    if not prix or float(prix) <= 0:
        raise HTTPException(422, "Cette offre n'a pas de prix : elle ne peut pas être payée en ligne.")
    return str(nom)[:160], round(float(prix), 2)


async def _rafraichir(v: dict) -> dict:
    """Relit Mollie si le paiement attend encore (le webhook peut être en retard)."""
    if v.get("statut") != "en_attente" or not v.get("mollie_id") or v.get("mode") == "simulation":
        return v
    try:
        if v["mode"] == "connect":
            conn = await _connexion(v["user_id"])
            if not conn:
                return v
            p = await _mollie("GET", f"payments/{v['mollie_id']}", await _jeton_valide(conn),
                              params={"testmode": "true"} if conn.get("testmode") else None)
        else:
            p = await _mollie("GET", f"payments/{v['mollie_id']}", _cle_zayado())
    except HTTPException:
        return v
    statut = STATUTS.get(p.get("status", ""), "en_attente")
    if statut != v["statut"]:
        await _changer_statut(v, statut)
        v = {**v, "statut": statut}
    return v


async def _changer_statut(v: dict, statut: str) -> None:
    maj = {"statut": statut}
    if statut == "paye" and v.get("statut") != "paye":
        maj["paye_le"] = _maintenant()
        from lib.notifs import notifier
        await notifier(v["user_id"], "tunnel", f"Paiement reçu : {v['montant']:.2f} € 💶",
                       f"{v['client_nom']} a payé « {v['libelle']} » sur « {v['tunnel_nom']} ».",
                       f"/tunnels/{v['tunnel_id']}", cle=f"tunnel-paiement:{v['id']}")
    await db.tunnel_paiements.update_one({"id": v["id"]}, {"$set": maj})
    if statut == "paye" and v.get("statut") != "paye" and not v.get("emails_envoyes"):
        await db.tunnel_paiements.update_one({"id": v["id"]}, {"$set": {"emails_envoyes": True}})
        await envoyer_emails_paiement(v)


def _eur(x: float) -> str:
    return f"{x:,.2f} €".replace(",", " ").replace(".", ",")


async def envoyer_emails_paiement(v: dict) -> dict:
    """Confirmation à l'acheteur (aux couleurs du vendeur) et avis de vente au vendeur. Jamais bloquant."""
    from html import escape
    from routers.tunnels_publics import _editeur_de
    srv = _srv()
    res = {"acheteur": False, "vendeur": False}
    if not srv:
        return res
    e = await _editeur_de(v["user_id"]) or {}
    marque = escape(e.get("raison_sociale") or v.get("tunnel_nom") or "Votre vendeur")
    contact = escape(e.get("email") or "")
    lien_page = f"{_front()}/t/{v['slug']}"
    acheteur = (
        f"<p>Bonjour {escape(v['client_nom'])},</p>"
        f"<p>Merci pour votre confiance : votre paiement est <b>confirmé</b>.</p>"
        '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border:1px solid #E3E8F3;border-radius:12px">'
        f'<tr><td style="padding:14px 16px">Offre</td><td style="padding:14px 16px;text-align:right"><b>{escape(v["libelle"])}</b></td></tr>'
        f'<tr><td style="padding:0 16px 14px">Montant payé</td><td style="padding:0 16px 14px;text-align:right"><b>{_eur(v["montant"])}</b></td></tr>'
        f'<tr><td style="padding:0 16px 14px">Vendu par</td><td style="padding:0 16px 14px;text-align:right">{marque}</td></tr></table>'
        f"<p>{marque} revient vers vous très vite pour la suite."
        + (f" Une question ? Écrivez à {contact}." if contact else "") + "</p>"
        f'<p><a href="{lien_page}" style="color:#0B1F3A">Revoir la page de l\'offre</a></p>'
        "<p style=\"color:#5B6B82;font-size:12px\">Paiement sécurisé par Mollie. Conservez cet e-mail comme justificatif.</p>"
    )
    try:
        await srv.send_email(to=v["client_email"], subject=f"Paiement confirmé — {v['libelle']}"[:150], html=srv._email_wrap(acheteur))
        res["acheteur"] = True
    except Exception as ex:  # noqa: BLE001
        log.warning("E-mail acheteur non envoyé : %s", ex)
    vendeur_email = ""
    from sqlalchemy import select
    async with srv.async_session() as s:
        u = (await s.execute(select(srv.User).where(srv.User.id == v["user_id"]))).scalar_one_or_none()
        vendeur_email = u.email if u else ""
    if vendeur_email:
        mode = "versé directement sur votre compte Mollie" if v["mode"] == "connect" else "reversé sur votre IBAN par Zayado"
        vendeur = (
            f"<p>Bonne nouvelle : <b>{escape(v['client_nom'])}</b> vient de payer sur votre tunnel « {escape(v['tunnel_nom'])} ».</p>"
            '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border:1px solid #E3E8F3;border-radius:12px">'
            f'<tr><td style="padding:14px 16px">Offre</td><td style="padding:14px 16px;text-align:right"><b>{escape(v["libelle"])}</b></td></tr>'
            f'<tr><td style="padding:0 16px 14px">Montant</td><td style="padding:0 16px 14px;text-align:right">{_eur(v["montant"])}</td></tr>'
            f'<tr><td style="padding:0 16px 14px">Commission Zayado</td><td style="padding:0 16px 14px;text-align:right">− {_eur(v["commission"])}</td></tr>'
            f'<tr><td style="padding:0 16px 14px"><b>Pour vous</b></td><td style="padding:0 16px 14px;text-align:right"><b>{_eur(v["net"])}</b></td></tr></table>'
            f"<p>Montant {mode}. Pensez à contacter votre client : {escape(v['client_email'])}.</p>"
            f'<p><a href="{_front()}/tunnels" style="color:#0B1F3A">Voir mes ventes dans VisionAct</a></p>'
        )
        try:
            await srv.send_email(to=vendeur_email, subject=f"Nouvelle vente : {_eur(v['montant'])} — {v['libelle']}"[:150], html=srv._email_wrap(vendeur))
            res["vendeur"] = True
        except Exception as ex:  # noqa: BLE001
            log.warning("E-mail vendeur non envoyé : %s", ex)
    return res


@router_public.post("/public/t/{slug}/payer")
async def payer(slug: str, b: PayerIn):
    from routers.tunnels_publics import ContactPublicIn, _tunnel_public, contact_public
    if not b.consentement:
        raise HTTPException(422, "Le consentement est nécessaire.")
    t, owner = await _tunnel_public(slug)
    if not await paiement_actif(owner):
        raise HTTPException(409, "Le paiement en ligne n'est pas activé sur ce tunnel.")
    libelle, montant = _prix_etape(t, b.etape)
    await contact_public(slug, ContactPublicIn(nom=b.nom, email=b.email, consentement=True, intention=b.etape))
    mode, conn = await _mode(owner)
    _, taux, plafond = await _taux(owner)
    commission = _commission(montant, taux, plafond)
    v = {"id": str(uuid.uuid4()), "user_id": owner, "slug": slug, "tunnel_id": t["id"], "tunnel_nom": t.get("nom", ""),
         "etape": b.etape, "libelle": libelle, "montant": montant, "taux": taux, "commission": commission,
         "net": round(montant - commission, 2), "mode": mode, "statut": "en_attente", "mollie_id": None,
         "client_nom": b.nom.strip(), "client_email": b.email.strip().lower(), "cree_le": _maintenant(), "reverse": False}
    retour = f"{_front()}/t/{slug}?paiement={v['id']}"
    corps = {"amount": {"currency": "EUR", "value": f"{montant:.2f}"}, "description": f"{libelle}"[:255],
             "redirectUrl": retour, "webhookUrl": f"{_front()}/api/public/t-paiement/webhook",
             "metadata": {"tunnel_paiement": v["id"], "slug": slug}}
    await db.tunnel_paiements.insert_one(v)
    if mode == "simulation":
        await _changer_statut(v, "paye")
        await db.tunnel_paiements.update_one({"id": v["id"]}, {"$set": {"mollie_id": f"sim_{v['id']}"}})
        return {"id": v["id"], "checkout_url": retour, "simulation": True}
    if mode == "connect":
        corps.update({"profileId": conn["profile_id"]})
        if conn.get("testmode"):
            corps["testmode"] = True
        if commission > 0:
            corps["applicationFee"] = {"amount": {"currency": "EUR", "value": f"{commission:.2f}"},
                                       "description": f"Commission Zayado {taux:g} %"[:255]}
        p = await _mollie("POST", "payments", await _jeton_valide(conn), corps)
    else:  # centralisé (ou erreur si aucun moyen — exclu par paiement_actif)
        p = await _mollie("POST", "payments", _cle_zayado(), corps)
    await db.tunnel_paiements.update_one({"id": v["id"]}, {"$set": {"mollie_id": p["id"]}})
    return {"id": v["id"], "checkout_url": p.get("_links", {}).get("checkout", {}).get("href"), "simulation": False}


@router_public.get("/public/t/{slug}/paiement/{pid}")
async def statut_paiement(slug: str, pid: str):
    v = await db.tunnel_paiements.find_one({"id": pid, "slug": slug})
    if not v:
        raise HTTPException(404, "Paiement introuvable.")
    v = await _rafraichir(v)
    return {"id": v["id"], "statut": v["statut"], "etape": v["etape"], "libelle": v["libelle"], "montant": v["montant"],
            "client_nom": v["client_nom"], "client_email": v["client_email"], "simulation": v["mode"] == "simulation"}


@router_public.post("/public/t-paiement/webhook")
async def webhook_mollie(request: Request):
    """Mollie envoie `id=tr_…` (formulaire). On relit le paiement avec le bon jeton : jamais de statut reçu tel quel."""
    form = await request.form()
    pid = str(form.get("id") or "").strip()
    if pid:
        v = await db.tunnel_paiements.find_one({"mollie_id": pid})
        if v:
            await _rafraichir(v)
    return {"ok": True}


# ═══════════ Admin : registre des reversements (encaissement centralisé) ═══════════
async def _admin():
    srv = _srv()
    await srv.exiger_role("admin")()


@router_public.get("/admin/paiements-tunnels", dependencies=[Depends(_admin)])
async def admin_paiements():
    ventes = await db.tunnel_paiements.find({}).sort("cree_le", -1).to_list(5000)
    par: dict[str, list] = {}
    for v in ventes:
        par.setdefault(v["user_id"], []).append(v)
    srv = _srv()
    emails: dict[str, str] = {}
    if srv and par:
        from sqlalchemy import select
        async with srv.async_session() as s:
            for u in (await s.execute(select(srv.User).where(srv.User.id.in_(list(par))))).scalars():
                emails[u.id] = u.email
    lignes = []
    for owner, vs in par.items():
        reg = await db.tunnel_paiement_reglages.find_one({"id": f"pr-{owner}"}) or {}
        conn = await _connexion(owner)
        lignes.append({"user_id": owner, "email": emails.get(owner, ""), "connecte": bool(conn),
                       "iban": _dechiffrer(reg.get("iban", "")) if reg.get("iban") else "", "titulaire": reg.get("titulaire", ""),
                       **_totaux(vs)})
    tous = _totaux(ventes)
    return {"totaux": tous, "createurs": sorted(lignes, key=lambda x: -x["solde"]),
            "ventes": [{**_vente_out(v), "email_createur": emails.get(v["user_id"], "")} for v in ventes[:100]]}


@router_public.post("/admin/paiements-tunnels/{owner}/reverser", dependencies=[Depends(_admin)])
async def admin_reverser(owner: str):
    """Marque comme reversé tout le net dû (ventes payées, encaissement centralisé)."""
    ventes = await db.tunnel_paiements.find({"user_id": owner, "statut": "paye"}).to_list(5000)
    n = 0
    for v in ventes:
        if v.get("mode") in ("centralise", "simulation") and not v.get("reverse"):
            await db.tunnel_paiements.update_one({"id": v["id"]}, {"$set": {"reverse": True, "reverse_le": _maintenant()}})
            n += 1
    return {"ok": True, "ventes_reversees": n}
