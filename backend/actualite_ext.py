"""Actualité : relance du matin (email + notification PWA), résumés IA, contexte web du chat.

Avant ce module :
  - le réglage « chaque matin » était enregistré mais aucune tâche ne l'exécutait ;
  - le chat envoyait chaque message seul, sans historique ni recherche web.

Réglages (profil.contexte_metier) :
  actu_rythme  : quotidien | lundi | jamais   (jamais = à la demande, rien n'est envoyé)
  actu_canaux  : liste parmi "email", "push"   (défaut : les deux)
  actu_nb      : 1 à 3 actus par envoi         (défaut : 3)
  actu_heure   : "HH:MM" heure locale          (défaut : 08:00)

Routes :
  POST /api/copilote/actualite/resumes   : 2 lignes de résumé IA par actu (cache 24 h)
  POST /api/copilote/actualite/test      : envoi immédiat + diagnostic canal par canal
  GET  /api/copilote/actualite/statut    : ce qui manque pour que l'envoi arrive
  GET  /api/admin/actualite/envois       : (admin) journal des envois

Règles : 1 envoi par jour au maximum, jamais sur le jour de repos, jamais avant l'heure choisie,
rien tant que l'utilisateur n'a pas choisi un rythme. Boucle toutes les 10 min (RUN_CRONS=0 pour couper).
"""
import asyncio
import html as _html
import ipaddress
import json
import logging
import os
import re
import socket
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

import httpx
from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, String, Text, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.actualite")

RYTHMES_ENVOI = ("quotidien", "lundi")
CANAUX = ("email", "push")
URL_RE = re.compile(r"https?://[^\s)»\]>\"']+")
MOTS_ACTU = ("actu", "actualité", "actualite", "news", "dernier", "dernière", "aujourd'hui", "nouveau", "nouveauté",
             "intéressant", "interessant", "recherche", "cherche", "quoi de neuf", "tendance", "veille")
_cache_resumes: dict = {}


# ───────────────────────── fonctions pures (testées) ─────────────────────────

def nettoyer(texte: str, limite: int = 220) -> str:
    """Retire le HTML et les espaces superflus ; coupe proprement sur un mot."""
    t = _html.unescape(re.sub(r"<[^>]+>", " ", texte or ""))
    t = re.sub(r"\s+", " ", t).strip()
    if len(t) <= limite:
        return t
    return t[:limite].rsplit(" ", 1)[0].rstrip(",;: ") + "…"


def lire_prefs(cm: Optional[dict]) -> dict:
    cm = cm or {}
    canaux = cm.get("actu_canaux")
    if not isinstance(canaux, list):
        canaux = list(CANAUX)
    canaux = [c for c in canaux if c in CANAUX]
    try:
        nb = max(1, min(3, int(cm.get("actu_nb") or 3)))
    except (TypeError, ValueError):
        nb = 3
    heure = str(cm.get("actu_heure") or "08:00")
    if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", heure):
        heure = "08:00"
    return {"rythme": cm.get("actu_rythme") or "jamais", "canaux": canaux, "nb": nb, "heure": heure,
            "jour_repos": cm.get("jour_repos") if isinstance(cm.get("jour_repos"), int) else -1}


def doit_envoyer(prefs: dict, loc: datetime, deja_envoye_aujourdhui: bool) -> Optional[str]:
    """None = on envoie ; sinon la raison pour laquelle on n'envoie pas (utile pour les tests)."""
    if prefs["rythme"] not in RYTHMES_ENVOI:
        return "rythme_non_choisi"
    if not prefs["canaux"]:
        return "aucun_canal"
    if deja_envoye_aujourdhui:
        return "deja_envoye"
    if prefs["jour_repos"] >= 0 and (loc.weekday() + 1) % 7 == prefs["jour_repos"]:
        return "jour_de_repos"
    if prefs["rythme"] == "lundi" and loc.weekday() != 0:
        return "pas_lundi"
    h, m = (int(x) for x in prefs["heure"].split(":"))
    if (loc.hour, loc.minute) < (h, m):
        return "trop_tot"
    return None


def extraire_urls(texte: str) -> list:
    return [u.rstrip(".,;") for u in URL_RE.findall(texte or "")][:2]


def url_publique(url: str) -> bool:
    """Refuse localhost / réseaux privés (on ne lit que des pages publiques)."""
    try:
        p = urlparse(url)
        if p.scheme not in ("http", "https") or not p.hostname:
            return False
        for info in socket.getaddrinfo(p.hostname, None):
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return False
        return True
    except Exception:  # noqa: BLE001
        return False


def veut_actu(message: str) -> bool:
    m = (message or "").lower()
    return any(k in m for k in MOTS_ACTU)


def titre_cite(message: str) -> Optional[str]:
    m = re.search(r"«\s*(.+?)\s*»", message or "")
    return m.group(1) if m else None


def corps_email(prenom: str, articles: list, base_url: str) -> str:
    esc = _html.escape
    lignes = []
    for a in articles:
        lignes.append(
            f'<tr><td style="padding:14px 0;border-bottom:1px solid #e5e7eb">'
            f'<div style="font-size:16px;font-weight:600;color:#0f172a">{esc(a["titre"])}</div>'
            f'<div style="font-size:14px;color:#475569;margin-top:4px">{esc(a.get("description") or "")}</div>'
            f'<div style="font-size:12px;color:#94a3b8;margin-top:6px">{esc(a.get("source_label") or "")}'
            f'{" · " + esc(a["date"]) if a.get("date") else ""}</div></td></tr>')
    salut = f"Bonjour {esc(prenom)}," if prenom else "Bonjour,"
    return (f'<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:16px">'
            f'<p style="font-size:15px;color:#0f172a">{salut} voici ton actualité du jour.</p>'
            f'<table width="100%" cellspacing="0" cellpadding="0">{"".join(lignes)}</table>'
            f'<p style="margin-top:20px"><a href="{esc(base_url)}/app?tab=actu" '
            f'style="background:#c9a24a;color:#0b1220;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">'
            f'Discuter avec l\'IA</a></p></div>')


# ───────────────────────── installation ─────────────────────────

class ResumesIn(BaseModel):
    articles: list = Field(default_factory=list, max_length=3)


def install_actualite(g: dict) -> None:
    api, Base, get_db, app = g["api"], g["Base"], g["get_db"], g.get("app")
    _uid, new_uuid, utcnow, async_session = g["_uid"], g["new_uuid"], g["utcnow"], g["async_session"]
    DEMO_USER_ID = g["DEMO_USER_ID"]

    class ActuEnvoi(Base):
        __tablename__ = "actu_envois"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        jour: Mapped[str] = mapped_column(String(10), index=True)   # date locale AAAA-MM-JJ
        origine: Mapped[str] = mapped_column(String(10))            # cron | test
        canal: Mapped[str] = mapped_column(String(10))              # email | push
        ok: Mapped[bool] = mapped_column(default=False)
        detail: Mapped[str] = mapped_column(Text, default="")
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    g["ActuEnvoi"] = ActuEnvoi

    # ── IA : résumé de 2 lignes ──
    async def resumer(articles: list) -> list:
        """Une description courte (2 lignes) par actu. Repli : le résumé du flux, nettoyé."""
        brut = [nettoyer(a.get("resume") or a.get("titre") or "", 180) for a in articles]
        out = []
        a_faire = []
        for i, a in enumerate(articles):
            c = _cache_resumes.get(a.get("lien") or a.get("titre"))
            if c:
                out.append(c)
            else:
                out.append(None)
                a_faire.append(i)
        if a_faire:
            try:
                client = g["_client_llm"]("actu-resumes", (
                    "Tu rédiges des descriptions d'actualités pour une application d'entrepreneurs. "
                    "Pour chaque actu, écris 2 lignes maximum (35 mots max), factuelles, sans promesse ni jugement, "
                    "dans la langue du titre. Réponds UNIQUEMENT par un tableau JSON de chaînes, dans le même ordre."))
                if client is None:
                    raise RuntimeError("aucune clé IA")
                demande = json.dumps([{"titre": articles[i].get("titre"), "extrait": brut[i]} for i in a_faire], ensure_ascii=False)
                rep = await asyncio.wait_for(client.send_message(g_user_message(demande)), timeout=25)
                tab = json.loads(re.search(r"\[.*\]", rep, re.S).group(0))
                for i, texte in zip(a_faire, tab):
                    if isinstance(texte, str) and texte.strip():
                        out[i] = nettoyer(texte, 260)
                        _cache_resumes[articles[i].get("lien") or articles[i].get("titre")] = out[i]
            except Exception as e:  # noqa: BLE001
                log.info("Résumé IA indisponible, repli sur le flux : %s", e)
        return [o or brut[i] for i, o in enumerate(out)]

    def g_user_message(texte: str):
        from llm_mammouth import UserMessage
        return UserMessage(text=texte)

    @api.post("/copilote/actualite/resumes")
    async def resumes(body: ResumesIn):
        arts = [a for a in body.articles if isinstance(a, dict)][:3]
        return {"resumes": await resumer(arts)}

    # ── Récupération des actus d'un utilisateur (réutilise la route /copilote/actualite) ──
    async def actus_utilisateur(db, uid: str, nb: int) -> list:
        jeton = g["_current_uid"].set(uid)
        try:
            rep = await g["actualite"](marche="", filtre="tout", db=db)
        finally:
            g["_current_uid"].reset(jeton)
        if rep.get("masque") or rep.get("erreur"):
            return []
        arts = (rep.get("articles") or [])[:nb]
        descr = await resumer(arts)
        return [{"titre": a["titre"], "lien": a.get("lien", ""), "date": nettoyer(a.get("date", ""), 25),
                 "source_label": a.get("source_label") or "", "description": d} for a, d in zip(arts, descr)]

    # ── Envoi sur un canal, avec diagnostic précis ──
    def base_url() -> str:
        return (os.environ.get("FRONTEND_URL") or os.environ.get("APP_URL") or "https://zayado.net").rstrip("/")

    async def envoyer_email(profil, articles: list) -> tuple:
        if not (os.environ.get("BREVO_API_KEY") or g.get("EMAIL_KEY")):
            return False, "BREVO_API_KEY absente côté serveur"
        if not (profil.email or "").strip():
            return False, "aucune adresse e-mail dans le profil"
        try:
            await g["send_email"](to=profil.email, subject=f"Ton actualité du jour ({len(articles)})",
                                  html=corps_email(profil.prenom or "", articles, base_url()))
            return True, f"envoyé à {profil.email}"
        except HTTPException as e:
            return False, str(e.detail)
        except Exception as e:  # noqa: BLE001
            return False, f"erreur d'envoi : {e}"

    async def envoyer_notif(db, uid: str, articles: list) -> tuple:
        if not (os.environ.get("VAPID_PUBLIC_KEY") and os.environ.get("VAPID_PRIVATE_KEY")):
            return False, "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY absentes côté serveur"
        PS = g["PushSubscription"]
        n = len(list((await db.execute(select(PS.id).where(PS.user_id == uid))).scalars()))
        if n == 0:
            return False, "aucun appareil abonné : active les notifications sur ton téléphone ou ton ordinateur"
        premier = articles[0]
        corps = premier["titre"] + (f" (+{len(articles) - 1} autre{'s' if len(articles) > 2 else ''})" if len(articles) > 1 else "")
        try:
            r = await g["envoyer_push"](db, uid, "Ton actualité du jour", corps, "/app?tab=actu", "actu")
        except Exception as e:  # noqa: BLE001
            return False, f"erreur d'envoi : {e}"
        return (True, f"envoyé sur {r.get('envoye')} appareil(s)") if r.get("envoye") else (False, "aucun appareil n'a reçu la notification")

    async def journaliser(db, uid, jour, origine, canal, ok, detail):
        db.add(ActuEnvoi(user_id=uid, jour=jour, origine=origine, canal=canal, ok=ok, detail=detail[:400]))
        await db.commit()

    async def envoyer_a(db, profil, prefs: dict, loc_jour: str, origine: str) -> dict:
        arts = await actus_utilisateur(db, profil.user_id, prefs["nb"])
        if not arts:
            return {"articles": 0, "canaux": {}, "raison": "aucune_actu"}
        res = {}
        for canal in prefs["canaux"]:
            ok, detail = await (envoyer_email(profil, arts) if canal == "email" else envoyer_notif(db, profil.user_id, arts))
            res[canal] = {"ok": ok, "detail": detail}
            await journaliser(db, profil.user_id, loc_jour, origine, canal, ok, detail)
        return {"articles": len(arts), "canaux": res}

    def heure_locale(profil, maintenant_utc: datetime) -> datetime:
        try:
            tz = ZoneInfo(profil.fuseau or "Europe/Paris")
        except Exception:  # noqa: BLE001
            tz = ZoneInfo("Europe/Paris")
        return maintenant_utc.astimezone(tz)

    async def executer_actualite(maintenant_utc: Optional[datetime] = None) -> list:
        maintenant_utc = maintenant_utc or datetime.now(timezone.utc)
        envoyes = []
        VP = g["VisionProfile"]
        async with async_session() as db:
            profils = list((await db.execute(select(VP).where(VP.notifications.is_(True), VP.onboarded.is_(True)))).scalars())
            for p in profils:
                try:
                    if p.user_id == DEMO_USER_ID:
                        continue
                    prefs = lire_prefs(p.contexte_metier)
                    loc = heure_locale(p, maintenant_utc)
                    auj = loc.date().isoformat()
                    deja = (await db.execute(select(ActuEnvoi.id).where(
                        ActuEnvoi.user_id == p.user_id, ActuEnvoi.jour == auj, ActuEnvoi.origine == "cron").limit(1))).first() is not None
                    if doit_envoyer(prefs, loc, deja):
                        continue
                    r = await envoyer_a(db, p, prefs, auj, "cron")
                    if r["canaux"]:
                        envoyes.append({"user_id": p.user_id, **r})
                except Exception as e:  # noqa: BLE001
                    await db.rollback()
                    log.warning("Actualité du matin ignorée pour %s : %s", p.user_id, e)
        return envoyes

    g["executer_actualite"] = executer_actualite

    @api.post("/copilote/actualite/test")
    async def test_envoi(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        if uid == DEMO_USER_ID:
            raise HTTPException(401, "Connecte-toi pour tester l'envoi.")
        p = await g["_profil"](db, uid)
        prefs = lire_prefs(p.contexte_metier)
        if not prefs["canaux"]:
            prefs["canaux"] = list(CANAUX)
        loc = heure_locale(p, datetime.now(timezone.utc))
        r = await envoyer_a(db, p, prefs, loc.date().isoformat(), "test")
        if r.get("raison") == "aucune_actu":
            raise HTTPException(409, "Aucune actualité disponible pour l'instant (mode récupération ou sources vides).")
        return r

    @api.get("/copilote/actualite/statut")
    async def statut(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        p = await g["_profil"](db, uid)
        prefs = lire_prefs(p.contexte_metier)
        PS = g["PushSubscription"]
        n_app = len(list((await db.execute(select(PS.id).where(PS.user_id == uid))).scalars()))
        manque = []
        if prefs["rythme"] not in RYTHMES_ENVOI:
            manque.append("Choisis un rythme (chaque matin ou le lundi).")
        if not p.notifications:
            manque.append("L'interrupteur général des notifications est coupé.")
        if "email" in prefs["canaux"] and not (os.environ.get("BREVO_API_KEY") or g.get("EMAIL_KEY")):
            manque.append("E-mail : BREVO_API_KEY absente côté serveur.")
        if "email" in prefs["canaux"] and not (p.email or "").strip():
            manque.append("E-mail : aucune adresse dans ton profil.")
        if "push" in prefs["canaux"] and not (os.environ.get("VAPID_PUBLIC_KEY") and os.environ.get("VAPID_PRIVATE_KEY")):
            manque.append("Notification : clés VAPID absentes côté serveur.")
        if "push" in prefs["canaux"] and n_app == 0:
            manque.append("Notification : aucun appareil abonné.")
        return {"prefs": prefs, "appareils": n_app, "pret": not manque, "manque": manque}

    @api.get("/admin/actualite/envois")
    async def journal(db: AsyncSession = Depends(get_db), _r=Depends(g["exiger_role"]("admin"))):
        rows = (await db.execute(select(ActuEnvoi).order_by(ActuEnvoi.created_at.desc()).limit(200))).scalars()
        return [{"user_id": r.user_id, "jour": r.jour, "origine": r.origine, "canal": r.canal, "ok": bool(r.ok),
                 "detail": r.detail, "date": r.created_at.isoformat() if r.created_at else None} for r in rows]

    # ── Contexte web du chat : actus du jour, recherche, texte d'un article collé ──
    async def lire_page(url: str) -> str:
        if not await asyncio.to_thread(url_publique, url):
            return ""
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0 ZayadoBot"}) as c:
                r = await c.get(url)
            if r.status_code != 200 or "html" not in r.headers.get("content-type", ""):
                return ""
            t = re.sub(r"(?is)<(script|style|nav|footer|header|aside)[^>]*>.*?</\1>", " ", r.text)
            return nettoyer(t, 4000)
        except Exception as e:  # noqa: BLE001
            log.info("Page illisible %s : %s", url[:80], e)
            return ""

    async def recherche_web(requete: str) -> list:
        url = g["_gnews"](requete, "france", "France")
        items = await g["_flux_cache"](url)
        return [{"titre": a["titre"], "url": a["lien"], "resume": nettoyer(a.get("resume", ""), 200), "date": nettoyer(a.get("date", ""), 25)}
                for a in items[:5] if a.get("titre")]

    async def contexte_web(db, uid: str, message: str) -> tuple:
        """Retourne (texte à joindre au prompt, sources affichables sous la réponse)."""
        blocs, sources = [], []
        urls = extraire_urls(message)
        titre = titre_cite(message)
        for u in urls:
            page = await lire_page(u)
            if page:
                blocs.append(f"Texte de la page {u} :\n{page}")
                sources.append({"titre": titre or u, "url": u})
        if titre or veut_actu(message):
            try:
                trouves = await recherche_web(titre or re.sub(r"\s+", " ", message)[:80])
                if trouves:
                    blocs.append("Résultats de recherche web (Google Actualités) :\n" + "\n".join(
                        f"- {t['titre']} ({t['date']}) {t['resume']} [{t['url']}]" for t in trouves))
                    sources += [{"titre": t["titre"], "url": t["url"]} for t in trouves[:3]]
            except Exception as e:  # noqa: BLE001
                log.info("Recherche web échouée : %s", e)
        if veut_actu(message) and not urls:
            try:
                du_jour = await actus_utilisateur(db, uid, 3)
                if du_jour:
                    blocs.append("Actualités du jour de l'utilisateur :\n" + "\n".join(f"- {a['titre']} : {a['description']}" for a in du_jour))
            except Exception as e:  # noqa: BLE001
                log.info("Actus du jour indisponibles : %s", e)
        return "\n\n".join(blocs), sources[:5]

    g["contexte_web_chat"] = contexte_web

    async def _boucle():
        await asyncio.sleep(60)
        while True:
            try:
                await executer_actualite()
            except Exception as e:  # noqa: BLE001
                log.warning("Actualité du matin : %s", e)
            await asyncio.sleep(600)

    if app is not None:
        @app.on_event("startup")
        async def _demarrer_actualite():
            if os.environ.get("RUN_CRONS", "1").strip().lower() in ("0", "false", "non", "off"):
                return
            asyncio.create_task(_boucle())
