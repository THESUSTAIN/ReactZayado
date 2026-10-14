"""Canaux du Copilote : parler à Zayado depuis WhatsApp ou Telegram, PAR UTILISATEUR.

- Telegram (recommandé, sans rien installer) : un bot Zayado partagé
  (TELEGRAM_BOT_TOKEN + TELEGRAM_BOT_USERNAME, variables plateforme). L'utilisateur
  clique « Connecter » → lien t.me/<bot>?start=<code> → le bot relie SON chat à
  SON compte. Les messages suivants arrivent sur son Copilote.
- WhatsApp : session WhatsApp Web du microservice (QR code à scanner), déjà
  par compte (agent_id = uid) — on expose juste un parcours clair.

Routes : GET /canaux, POST /canaux/telegram/lien, POST /canaux/whatsapp/qr,
DELETE /canaux/{canal}, POST /webhooks/telegram-zayado (appelé par Telegram).
"""
import hashlib
import logging
import os
import secrets
from datetime import datetime, timezone

import httpx
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select

log = logging.getLogger("kairos.canaux")


def _tg_conf() -> dict:
    token = (os.environ.get("TELEGRAM_BOT_TOKEN") or "").strip()
    return {"token": token, "username": (os.environ.get("TELEGRAM_BOT_USERNAME") or "").strip().lstrip("@"),
            # Secret vérifié sur chaque appel du webhook (en-tête officiel Telegram).
            "secret": hashlib.sha256(f"zayado-tg:{token}".encode()).hexdigest()[:48] if token else ""}


def install_canaux(g: dict) -> None:
    api, get_db = g["api"], g["get_db"]
    _uid, DEMO_USER_ID = g["_uid"], g["DEMO_USER_ID"]
    UserConnection = g["UserConnection"]
    _tg_traiter, _tg_send = g["_tg_traiter"], g["_tg_send"]
    webhook_pose = {"ok": False}

    def _connecte() -> str:
        uid = _uid()
        if uid == DEMO_USER_ID:
            raise HTTPException(401, "Connecte-toi pour relier ton Copilote.")
        return uid

    async def _inclus(db, uid) -> bool:
        """Copilote sur Telegram / WhatsApp : inclus à partir de l'offre Pro (grille tarifaire)."""
        User = g.get("User")
        u = await db.get(User, uid) if User is not None else None
        if u and u.role in ("admin", "vendeur"):
            return True
        f_acces, Abo = g.get("_acces_actif"), g.get("Abonnement")
        if not (f_acces and Abo is not None) or not await f_acces(db, uid):
            return False
        a = await db.get(Abo, uid)
        return bool(a and a.plan in ("pro", "business", "entreprise"))

    async def _exiger_inclus(db, uid) -> None:
        if not await _inclus(db, uid):
            raise HTTPException(403, "Le Copilote sur Telegram et WhatsApp est inclus à partir de l'offre Pro.")

    async def _conn(db, uid, provider):
        return (await db.execute(select(UserConnection).where(
            UserConnection.user_id == uid, UserConnection.provider == provider,
            UserConnection.revoked_at.is_(None)))).scalars().first()

    async def _poser_webhook() -> None:
        """Pointe le bot partagé vers /api/webhooks/telegram-zayado (idempotent, une fois par processus)."""
        c = _tg_conf()
        base = (os.environ.get("BACKEND_PUBLIC_URL") or "").rstrip("/")
        if webhook_pose["ok"] or not (c["token"] and base):
            return
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.post(f"https://api.telegram.org/bot{c['token']}/setWebhook",
                                      json={"url": f"{base}/api/webhooks/telegram-zayado", "secret_token": c["secret"],
                                            "allowed_updates": ["message", "edited_message"]})
                webhook_pose["ok"] = bool(r.json().get("ok"))
        except Exception as e:  # noqa: BLE001
            log.warning("Webhook du bot Telegram Zayado non posé : %s", e)

    @api.get("/canaux")
    async def canaux(db=Depends(get_db)):
        uid = _connecte()
        tg = await _conn(db, uid, "telegram_zayado")
        tg_perso = await _conn(db, uid, "telegram")
        wa = await _conn(db, uid, "whatsapp")
        c = _tg_conf()
        return {
            "inclus": await _inclus(db, uid),
            "telegram": {"disponible": bool(c["token"] and c["username"]),
                         "statut": ("connecte" if (tg and tg.status == "ready") or (tg_perso and tg_perso.status == "ready")
                                    else "en_attente" if tg and tg.status == "en_attente" else "deconnecte"),
                         "bot": f"@{c['username']}" if c["username"] else None},
            "whatsapp": {"disponible": bool(g.get("WA_SERVICE_SECRET") and g.get("WA_SERVICE_URL")),
                         "statut": "connecte" if wa and wa.status == "ready" else ("en_attente" if wa and wa.status == "qr" else "deconnecte"),
                         "numero": wa.phone_number if wa else None},
        }

    @api.post("/canaux/telegram/lien")
    async def telegram_lien(db=Depends(get_db)):
        uid = _connecte()
        await _exiger_inclus(db, uid)
        c = _tg_conf()
        if not (c["token"] and c["username"]):
            raise HTTPException(503, "La connexion Telegram arrive bientôt.")
        await _poser_webhook()
        code = secrets.token_urlsafe(12).replace("-", "").replace("_", "")[:16]
        conn = await _conn(db, uid, "telegram_zayado")
        if not conn:
            conn = UserConnection(user_id=uid, provider="telegram_zayado")
            db.add(conn)
        if conn.status != "ready":
            conn.status = "en_attente"
        conn.label = f"code:{code}"
        await db.commit()
        return {"url": f"https://t.me/{c['username']}?start={code}", "bot": f"@{c['username']}"}

    @api.post("/canaux/whatsapp/qr")
    async def whatsapp_qr(db=Depends(get_db)):
        await _exiger_inclus(db, _connecte())
        if not (g.get("WA_SERVICE_SECRET") and g.get("WA_SERVICE_URL")):
            raise HTTPException(503, "La connexion WhatsApp arrive bientôt.")
        data = await g["whatsapp_start"](db)
        return {"statut": data.get("status"), "qr": data.get("qr")}

    @api.delete("/canaux/{canal}")
    async def deconnecter(canal: str, db=Depends(get_db)):
        uid = _connecte()
        providers = {"telegram": ("telegram_zayado", "telegram"), "whatsapp": ("whatsapp",),
                     # Espaces cloud (enregistrement automatique des documents)
                     "google_drive": ("google_drive",), "microsoft_drive": ("microsoft_drive",)}.get(canal)
        if not providers:
            raise HTTPException(404, "Canal inconnu.")
        for p in providers:
            conn = await _conn(db, uid, p)
            if conn:
                conn.revoked_at = datetime.now(timezone.utc)
                conn.status = "revoked"
        await db.commit()
        return {"ok": True}

    @api.post("/webhooks/telegram-zayado")
    async def telegram_zayado(request: Request, db=Depends(get_db)):
        c = _tg_conf()
        if not c["token"] or request.headers.get("x-telegram-bot-api-secret-token", "") != c["secret"]:
            raise HTTPException(401, "Non autorisé")
        update = await request.json()
        msg = update.get("message") or update.get("edited_message") or {}
        chat_id = (msg.get("chat") or {}).get("id")
        text = (msg.get("text") or "").strip()
        if not chat_id or not text:
            return {"ok": True}
        # Liaison : /start <code>
        if text.lower().startswith("/start"):
            code = text.split(maxsplit=1)[1].strip() if " " in text else ""
            conn = None
            if code:
                conn = (await db.execute(select(UserConnection).where(
                    UserConnection.provider == "telegram_zayado", UserConnection.label == f"code:{code}",
                    UserConnection.revoked_at.is_(None)))).scalars().first()
            if not conn:
                await _tg_send(c["token"], chat_id, "Bonjour ! Pour me relier à ton compte, ouvre Zayado → Copilote → « Connecter Telegram ».")
                return {"ok": True}
            conn.status, conn.phone_number, conn.label = "ready", str(chat_id), "Telegram"
            await db.commit()
            await _tg_send(c["token"], chat_id, "C'est relié ✅ Je suis ton Copilote Zayado. Écris-moi quand tu veux : une idée, une priorité, « c'est fait »…")
            return {"ok": True}
        conn = (await db.execute(select(UserConnection).where(
            UserConnection.provider == "telegram_zayado", UserConnection.phone_number == str(chat_id),
            UserConnection.status == "ready", UserConnection.revoked_at.is_(None)))).scalars().first()
        if not conn:
            await _tg_send(c["token"], chat_id, "Je ne te reconnais pas encore. Relie ton compte depuis Zayado → Copilote → « Connecter Telegram ».")
            return {"ok": True}
        if not await _inclus(db, conn.user_id):
            await _tg_send(c["token"], chat_id, "Ton offre Zayado n'inclut plus le Copilote sur Telegram (offre Pro et plus). Tout reste disponible dans l'app.")
            return {"ok": True}
        return await _tg_traiter(db, conn.user_id, c["token"], chat_id, text)
