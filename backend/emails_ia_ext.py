"""Emails IA (admin) — brouillon rédigé par l'IA → validation → envoi Brevo.

Flux :
  1. L'admin décrit son intention (et/ou colle un email reçu). L'IA analyse et
     rédige un brouillon dans le ton et le contexte de l'entreprise.
  2. Le brouillon est enregistré (statut « brouillon ») ET envoyé sur l'email de
     l'admin avec un lien « Valider et envoyer ».
  3. Validation, au choix : bouton dans l'admin, lien signé reçu par email, ou
     réponse « ok envoi » sur WhatsApp.
  4. Envoi individuel à chaque destinataire (personne ne voit les autres) via la
     clé Brevo du compte (repli : clé plateforme BREVO_API_KEY).

Différences avec la version de référence (Sentriq) : envoi du brouillon par
Brevo (pas SMTP, bloqué sur Railway), plusieurs destinataires, échec d'envoi
visible (plus silencieux), double validation impossible, validation par lien /
WhatsApp, garde-fous _assert_safe_email conservés.
"""
import asyncio
import hashlib
import hmac
import json
import logging
import os
import re
from html import escape
from datetime import datetime
from typing import Any, List, Optional

import httpx
from fastapi import Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, Integer, String, Text, select
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.emails_ia")

# ── Identité de l'entreprise (une seule source, modifiable par variables d'env) ──
MARQUE = os.environ.get("EMAILS_IA_MARQUE", "DeepShield")
SITE_URL = os.environ.get("EMAILS_IA_SITE_URL", "https://sentriq.me").rstrip("/")
EDITEUR = os.environ.get("EMAILS_IA_EDITEUR", "Zayado")
CONTEXTE = os.environ.get(
    "EMAILS_IA_CONTEXTE",
    "outil d'analyse par IA qui détecte les deepfakes et les arnaques : photos, vidéos, "
    "audio, emails et liens. Chaque analyse donne un verdict (authentique, suspect ou faux) "
    "et un score sur 100, avec des conseils concrets. Public : particuliers, familles, "
    "seniors, petites entreprises.",
)
MAX_DEST = 50

_RE_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")
_RE_OK_ENVOI = re.compile(r"^\s*ok[\s,.!-]*envoi[\s.!]*$", re.I)


def normaliser_destinataires(brut) -> List[str]:
    """Accepte une liste ou un texte (virgules, points-virgules, retours ligne)."""
    if isinstance(brut, str):
        brut = re.split(r"[,;\s]+", brut)
    vus, out = set(), []
    for e in brut or []:
        e = (e or "").strip().lower()
        if e and _RE_EMAIL.match(e) and e not in vus:
            vus.add(e)
            out.append(e)
    return out


def _json_llm(raw: str) -> dict:
    txt = re.sub(r"^```(?:json)?|```$", "", (raw or "").strip(), flags=re.M).strip()
    debut, fin = txt.find("{"), txt.rfind("}")
    if debut < 0 or fin < 0:
        raise ValueError("Réponse IA sans JSON")
    return json.loads(txt[debut:fin + 1])


def signer(secret: str, brouillon_id: str) -> str:
    return hmac.new(secret.encode(), f"emails-ia:{brouillon_id}".encode(), hashlib.sha256).hexdigest()[:40]


def install_emails_ia(g: dict) -> None:
    Base, api, get_db = g["Base"], g["api"], g["get_db"]
    _uid, utcnow, new_uuid = g["_uid"], g["utcnow"], g["new_uuid"]
    User, exiger_role = g["User"], g["exiger_role"]
    UserConnection = g["UserConnection"]
    _dechiffrer = g["_dechiffrer"]
    _client_llm = g["_client_llm"]
    _assert_safe_email = g["_assert_safe_email"]
    send_email = g["send_email"]
    JWT_SECRET = g["JWT_SECRET"]
    WA_SERVICE_URL = g.get("WA_SERVICE_URL", "")

    class EmailBrouillon(Base):
        __tablename__ = "emails_ia_brouillons"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        owner_id: Mapped[str] = mapped_column(String(36), index=True)
        sujet: Mapped[str] = mapped_column(String(250))
        html: Mapped[str] = mapped_column(Text)
        texte: Mapped[str] = mapped_column(Text, nullable=True)
        intention: Mapped[str] = mapped_column(Text, nullable=True)
        analyse: Mapped[str] = mapped_column(Text, nullable=True)      # analyse IA de l'email reçu
        destinataires: Mapped[str] = mapped_column(Text)               # JSON list
        # brouillon | envoi | envoye | echec | annule
        statut: Mapped[str] = mapped_column(String(20), default="brouillon", index=True)
        resultat: Mapped[str] = mapped_column(Text, nullable=True)     # JSON {envoyes, echecs}
        apercu_envoye: Mapped[int] = mapped_column(Integer, default=0)
        cree_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
        envoye_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    g["EmailBrouillon"] = EmailBrouillon

    # ── Clé Brevo : celle du compte s'il en a enregistré une, sinon la clé plateforme ──
    async def _cle_brevo(db, owner_id: str) -> dict:
        conn = (await db.execute(select(UserConnection).where(
            UserConnection.user_id == owner_id, UserConnection.provider == "brevo",
            UserConnection.revoked_at.is_(None)))).scalar_one_or_none()
        if conn and conn.credentials_enc:
            try:
                c = json.loads(_dechiffrer(conn.credentials_enc))
                if c.get("api_key"):
                    return {"api_key": c["api_key"], "source": "compte",
                            "sender_email": c.get("sender_email") or os.environ.get("BREVO_SENDER_EMAIL", "noreply@zayado.net"),
                            "sender_name": c.get("sender_name") or MARQUE}
            except Exception:  # noqa: BLE001
                log.warning("Clé Brevo du compte illisible — repli plateforme")
        return {"api_key": os.environ.get("BREVO_API_KEY", ""), "source": "plateforme",
                "sender_email": os.environ.get("BREVO_SENDER_EMAIL", "noreply@zayado.net"),
                "sender_name": MARQUE}

    def _json_out(d: "EmailBrouillon") -> dict:
        return {"id": d.id, "sujet": d.sujet, "html": d.html, "texte": d.texte, "intention": d.intention,
                "analyse": d.analyse, "destinataires": json.loads(d.destinataires or "[]"),
                "statut": d.statut, "resultat": json.loads(d.resultat) if d.resultat else None,
                "apercu_envoye": bool(d.apercu_envoye),
                "cree_le": d.cree_le.isoformat() if d.cree_le else None,
                "envoye_le": d.envoye_le.isoformat() if d.envoye_le else None}

    # ── Rédaction IA ──
    def _systeme(ton: str, avec_reception: bool) -> str:
        return (
            f"Tu es l'assistant emailing de {MARQUE}, {CONTEXTE} Édité par {EDITEUR}. Site : {SITE_URL}.\n"
            f"Rédige en français, ton {ton}, court (200 mots maximum).\n"
            "Règles strictes : n'invente AUCUN chiffre, prix, date, promesse ni fonctionnalité qui ne figure pas dans "
            "l'intention fournie ; en cas de doute, reste générique. Aucun lien hors " + SITE_URL + ". "
            "Pas de formulaire, ne demande jamais de mot de passe ni de données bancaires. "
            f"Nom de l'entreprise à utiliser partout : « {MARQUE} » (jamais un autre nom). "
            "HTML simple avec styles en ligne (fond clair, texte sombre, un seul bouton doré #E0C175 sur marine #0a1f4d si utile). "
            f"Signature : « L'équipe {MARQUE} ».\n"
            + ("L'utilisateur te transmet un EMAIL REÇU : analyse-le (ce que veut l'expéditeur, urgence, ton, risque "
               "d'arnaque ou de phishing) puis rédige la réponse corrigée et prête à envoyer. "
               if avec_reception else "")
            + 'Réponds UNIQUEMENT en JSON : {"sujet":"… (70 caractères max)","html":"<div>…</div>","texte":"version texte",'
              '"analyse":"2-3 phrases : lecture de la demande / points d\'attention (vide si pas d\'email reçu)"}'
        )

    async def _rediger(intention: str, ton: str, recu: Optional[dict], dest: List[str], sid: str) -> dict:
        client = _client_llm(f"emailia-{sid}", _systeme(ton, bool(recu)))
        if client is None:
            raise HTTPException(503, "IA non configurée (clé MAMMOTH_API_KEY absente).")
        from llm_mammouth import UserMessage
        bloc = f"INTENTION : {intention}\nDESTINATAIRES : {len(dest)} personne(s)"
        if recu:
            bloc = (f"EMAIL REÇU\nDe : {recu.get('expediteur', '')}\nObjet : {recu.get('sujet', '')}\n"
                    f"Corps :\n{(recu.get('corps') or '')[:6000]}\n\n" + bloc)
        try:
            raw = await asyncio.wait_for(client.send_message(UserMessage(text=bloc)), timeout=60)
            p = _json_llm(str(raw))
        except HTTPException:
            raise
        except Exception as e:  # noqa: BLE001
            log.warning("Rédaction email IA échouée : %s", e)
            raise HTTPException(502, "L'IA n'a pas pu rédiger le brouillon, réessaie dans un instant.")
        return {"sujet": (p.get("sujet") or f"Message de {MARQUE}")[:200],
                "html": p.get("html") or "<p>(corps vide)</p>",
                "texte": p.get("texte") or re.sub(r"<[^>]+>", "", p.get("html") or ""),
                "analyse": (p.get("analyse") or "").strip()}

    # ── Envoi Brevo, un mail par destinataire ──
    async def _envoyer(db, d: "EmailBrouillon") -> dict:
        # Verrou : un seul envoi possible par brouillon (lien + WhatsApp + admin en même temps)
        if d.statut != "brouillon":
            raise HTTPException(409, f"Ce brouillon est déjà « {d.statut} ».")
        cle = await _cle_brevo(db, d.owner_id)
        if not cle["api_key"]:
            raise HTTPException(503, "Aucune clé Brevo : ajoutes-en une dans l'onglet Emails IA ou définis BREVO_API_KEY.")
        d.statut = "envoi"
        await db.commit()
        dests = json.loads(d.destinataires)
        multi = len(dests) > 1
        html = d.html + (f'<p style="font-size:11px;color:#888;margin-top:24px">Vous recevez ce message de la part de {escape(MARQUE)}. '
                         "Pour ne plus en recevoir, répondez simplement « STOP ».</p>" if multi else "")
        envoyes, echecs = [], []
        async with httpx.AsyncClient(timeout=15) as client:
            for to in dests:
                try:
                    r = await client.post("https://api.brevo.com/v3/smtp/email", headers={
                        "api-key": cle["api_key"], "content-type": "application/json"}, json={
                        "sender": {"email": cle["sender_email"], "name": cle["sender_name"]},
                        "to": [{"email": to}], "subject": d.sujet, "htmlContent": html,
                        "textContent": d.texte or ""})
                    if r.status_code in (200, 201):
                        envoyes.append(to)
                    else:
                        echecs.append({"email": to, "erreur": f"Brevo {r.status_code}: {r.text[:120]}"})
                except Exception as e:  # noqa: BLE001
                    echecs.append({"email": to, "erreur": str(e)[:120]})
                await asyncio.sleep(0.15)
        d.statut = "envoye" if envoyes else "echec"
        d.resultat = json.dumps({"envoyes": envoyes, "echecs": echecs, "cle": cle["source"]})
        d.envoye_le = utcnow()
        await db.commit()
        return {"envoyes": len(envoyes), "echecs": echecs, "cle": cle["source"]}

    async def _apercu_admin(db, d: "EmailBrouillon") -> Optional[str]:
        """Envoie le brouillon à l'admin avec lien de validation. Renvoie un message d'erreur, ou None."""
        u = (await db.execute(select(User).where(User.id == d.owner_id))).scalar_one_or_none()
        if not u:
            return "Compte admin introuvable."
        base = os.environ.get("BACKEND_PUBLIC_URL", "").rstrip("/")
        if not base:
            return "BACKEND_PUBLIC_URL non défini : le lien de validation par email ne peut pas être généré."
        lien = f"{base}/api/webhooks/emails-ia/valider/{d.id}/{signer(JWT_SECRET, d.id)}"
        dests = json.loads(d.destinataires)
        corps = (f'<div style="font-family:Arial,sans-serif;max-width:600px">'
                 f'<p style="background:#fef3c7;padding:10px;border-radius:6px"><strong>BROUILLON à valider</strong> — '
                 f'{len(dests)} destinataire(s) : {escape(", ".join(dests[:8]))}{"…" if len(dests) > 8 else ""}</p><hr>'
                 f'{d.html}<hr>'
                 f'<p><a href="{lien}" style="background:#E0C175;color:#0a1f4d;padding:10px 18px;border-radius:8px;'
                 f'text-decoration:none;font-weight:bold">Valider et envoyer</a></p>'
                 f'<p style="font-size:12px;color:#666">Ou réponds « ok envoi » sur WhatsApp. Rien ne part sans ta validation.</p></div>')
        try:
            await send_email(to=u.email, subject=f"[BROUILLON] {d.sujet}", html=corps)
        except HTTPException as e:
            return str(e.detail)
        except ValueError as e:
            return f"Aperçu bloqué par les garde-fous : {e}"
        d.apercu_envoye = 1
        await db.commit()
        return None

    # ── Routes admin ──
    class BrouillonIn(BaseModel):
        intention: str = Field(min_length=3, max_length=2000)
        destinataires: Any = Field(default_factory=list)   # liste ou texte collé
        ton: str = "professionnel et chaleureux"
        email_recu: Optional[dict] = None                     # {expediteur, sujet, corps}
        apercu_par_email: bool = True

    @api.post("/admin/emails-ia/brouillon")
    async def creer_brouillon(body: BrouillonIn, db=Depends(get_db), _r=Depends(exiger_role("admin"))):
        dest = normaliser_destinataires(body.destinataires)
        if not dest:
            raise HTTPException(422, "Ajoute au moins une adresse email valide.")
        if len(dest) > MAX_DEST:
            raise HTTPException(422, f"{MAX_DEST} destinataires maximum par envoi.")
        sid = new_uuid()
        r = await _rediger(body.intention.strip(), body.ton, body.email_recu, dest, sid)
        try:
            _assert_safe_email(r["sujet"], r["html"])
        except ValueError as e:
            raise HTTPException(422, f"Brouillon refusé par les garde-fous anti-phishing : {e}. Reformule l'intention.")
        d = EmailBrouillon(id=sid, owner_id=_uid(), sujet=r["sujet"], html=r["html"], texte=r["texte"],
                           intention=body.intention.strip(), analyse=r["analyse"] or None,
                           destinataires=json.dumps(dest))
        db.add(d)
        await db.commit()
        alerte = await _apercu_admin(db, d) if body.apercu_par_email else None
        out = _json_out(d)
        out["alerte_apercu"] = alerte   # non bloquant mais VISIBLE (l'ancienne version échouait en silence)
        return out

    @api.get("/admin/emails-ia")
    async def lister_brouillons(db=Depends(get_db), _r=Depends(exiger_role("admin"))):
        rows = (await db.execute(select(EmailBrouillon).where(EmailBrouillon.owner_id == _uid())
                                 .order_by(EmailBrouillon.cree_le.desc()).limit(50))).scalars()
        cle = await _cle_brevo(db, _uid())
        return {"brouillons": [_json_out(d) for d in rows], "marque": MARQUE,
                "brevo": {"configuree": bool(cle["api_key"]), "source": cle["source"], "expediteur": cle["sender_email"]}}

    @api.post("/admin/emails-ia/{brouillon_id}/envoyer")
    async def envoyer_brouillon(brouillon_id: str, db=Depends(get_db), _r=Depends(exiger_role("admin"))):
        d = (await db.execute(select(EmailBrouillon).where(EmailBrouillon.id == brouillon_id,
                                                           EmailBrouillon.owner_id == _uid()))).scalar_one_or_none()
        if not d:
            raise HTTPException(404, "Brouillon introuvable.")
        return await _envoyer(db, d)

    @api.post("/admin/emails-ia/{brouillon_id}/annuler")
    async def annuler_brouillon(brouillon_id: str, db=Depends(get_db), _r=Depends(exiger_role("admin"))):
        d = (await db.execute(select(EmailBrouillon).where(EmailBrouillon.id == brouillon_id,
                                                           EmailBrouillon.owner_id == _uid()))).scalar_one_or_none()
        if not d or d.statut != "brouillon":
            raise HTTPException(404, "Aucun brouillon à annuler.")
        d.statut = "annule"
        await db.commit()
        return {"ok": True}

    class CleBrevoIn(BaseModel):
        api_key: str = Field(min_length=20, max_length=200)
        sender_email: Optional[str] = None
        sender_name: Optional[str] = None

    @api.post("/admin/emails-ia/cle-brevo")
    async def enregistrer_cle_brevo(body: CleBrevoIn, db=Depends(get_db), _r=Depends(exiger_role("admin"))):
        """Enregistre la clé Brevo du compte (chiffrée Fernet, jamais renvoyée)."""
        if body.sender_email and not _RE_EMAIL.match(body.sender_email):
            raise HTTPException(422, "Email expéditeur invalide.")
        chiffrer = g["_chiffrer"]
        payload = chiffrer(json.dumps({"api_key": body.api_key.strip(), "sender_email": body.sender_email,
                                       "sender_name": body.sender_name}))
        conn = (await db.execute(select(UserConnection).where(
            UserConnection.user_id == _uid(), UserConnection.provider == "brevo",
            UserConnection.revoked_at.is_(None)))).scalar_one_or_none()
        if not conn:
            conn = UserConnection(user_id=_uid(), provider="brevo", label="Brevo")
            db.add(conn)
        conn.credentials_enc, conn.status = payload, "ready"
        await db.commit()
        return {"ok": True}

    # ── Validation par lien signé reçu par email (public : préfixe /api/webhooks/) ──
    def _page(titre: str, msg: str, bouton: Optional[str] = None) -> HTMLResponse:
        form = f'<form method="post"><button style="background:#E0C175;color:#0a1f4d;border:0;padding:12px 22px;border-radius:10px;font-weight:700;font-size:16px">{bouton}</button></form>' if bouton else ""
        return HTMLResponse(f'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
                            f'<body style="font-family:Arial;background:#0a1f4d;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0">'
                            f'<div style="max-width:420px;padding:24px;text-align:center"><h2>{escape(titre)}</h2><p>{escape(msg)}</p>{form}</div>')

    async def _charger_signe(db, brouillon_id: str, sig: str):
        if not hmac.compare_digest(sig, signer(JWT_SECRET, brouillon_id)):
            return None
        return (await db.execute(select(EmailBrouillon).where(EmailBrouillon.id == brouillon_id))).scalar_one_or_none()

    @api.get("/webhooks/emails-ia/valider/{brouillon_id}/{sig}")
    async def valider_page(brouillon_id: str, sig: str, db=Depends(get_db)):
        # GET = simple page de confirmation (les scanners d'emails pré-chargent les liens : jamais d'envoi en GET)
        d = await _charger_signe(db, brouillon_id, sig)
        if not d:
            return _page("Lien invalide", "Ce lien n'est pas valide.")
        n = len(json.loads(d.destinataires))
        if d.statut != "brouillon":
            return _page("Déjà traité", f"Ce brouillon est « {d.statut} ».")
        return _page("Valider l'envoi ?", f"« {d.sujet} » sera envoyé à {n} destinataire(s).", "Oui, envoyer")

    @api.post("/webhooks/emails-ia/valider/{brouillon_id}/{sig}")
    async def valider_envoi(brouillon_id: str, sig: str, db=Depends(get_db)):
        d = await _charger_signe(db, brouillon_id, sig)
        if not d:
            return _page("Lien invalide", "Ce lien n'est pas valide.")
        try:
            res = await _envoyer(db, d)
        except HTTPException as e:
            return _page("Non envoyé", str(e.detail))
        return _page("Envoyé ✅" if res["envoyes"] else "Échec", f"{res['envoyes']} envoyé(s), {len(res['echecs'])} échec(s).")

    # ── Validation WhatsApp : appelée par le webhook WhatsApp existant ──
    async def traiter_ok_envoi(db, uid: str, message: str) -> Optional[str]:
        """Si `message` est « ok envoi » et qu'un brouillon attend, l'envoie et renvoie la réponse
        à poster sur WhatsApp. Sinon None (le webhook continue normalement)."""
        if not _RE_OK_ENVOI.match(message or ""):
            return None
        u = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
        if not u or getattr(u, "role", "") != "admin":
            return None
        d = (await db.execute(select(EmailBrouillon).where(
            EmailBrouillon.owner_id == uid, EmailBrouillon.statut == "brouillon")
            .order_by(EmailBrouillon.cree_le.desc()).limit(1))).scalar_one_or_none()
        if not d:
            return "Aucun brouillon en attente."
        try:
            res = await _envoyer(db, d)
        except HTTPException as e:
            return f"Envoi impossible : {e.detail}"
        return f"Envoyé : « {d.sujet} » → {res['envoyes']} destinataire(s), {len(res['echecs'])} échec(s)."

    g["traiter_ok_envoi"] = traiter_ok_envoi
