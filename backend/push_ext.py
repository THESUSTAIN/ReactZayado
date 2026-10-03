"""Notifications Web Push (VAPID) — abonnements par utilisateur + envoi.

- GET  /api/push/public-key        : clé publique VAPID (pour le navigateur)
- POST /api/push/subscribe         : enregistre un PushSubscription
- DELETE /api/push/subscribe       : supprime l'abonnement
- POST /api/push/test              : envoie une notif de test à soi-même
- POST /api/push/rappel-checkin    : envoie le rappel de check-in à soi-même

Fonction partagée `envoyer_push(...)` réutilisée pour les rappels de check-in
et les opportunités du Radar. Les clés VAPID viennent de l'environnement.
"""
import asyncio
import json
import logging
import os
from datetime import datetime, timezone

from fastapi import Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import String, Text, DateTime, select
from sqlalchemy.orm import Mapped, mapped_column
try:
    from pywebpush import webpush, WebPushException
except ImportError:  # dépendance absente : le serveur démarre quand même, seules les notifs push sont coupées
    webpush = None

    class WebPushException(Exception):  # type: ignore[no-redef]
        pass

log = logging.getLogger("kairos.push")


def _uuid() -> str:
    import uuid
    return str(uuid.uuid4())


def install_push(g: dict) -> None:
    api, get_db, Base = g["api"], g["get_db"], g["Base"]
    _uid, DEMO_USER_ID = g["_uid"], g["DEMO_USER_ID"]

    class PushSubscription(Base):
        __tablename__ = "push_subscriptions"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        endpoint: Mapped[str] = mapped_column(Text, unique=True)
        p256dh: Mapped[str] = mapped_column(Text)
        auth: Mapped[str] = mapped_column(Text)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    g["PushSubscription"] = PushSubscription

    def _vapid() -> dict:
        return {
            "public": (os.environ.get("VAPID_PUBLIC_KEY") or "").strip(),
            "private": (os.environ.get("VAPID_PRIVATE_KEY") or "").strip(),
            "subject": (os.environ.get("VAPID_SUBJECT") or "mailto:contact@zayado.net").strip(),
        }

    def _connecte() -> str:
        uid = _uid()
        if uid == DEMO_USER_ID:
            raise HTTPException(401, "Connecte-toi pour activer les notifications.")
        return uid

    def _envoyer_un(sub: "PushSubscription", payload: str) -> str:
        """Envoi bloquant d'une notif. Retourne "ok" (acceptée par le service push), "mort" (abonnement
        expiré, 404/410 : à supprimer) ou "echec" (autre erreur : abonnement gardé, mais PAS compté comme envoyé).
        Avant, un échec était compté comme un envoi réussi : le bouton « test » annonçait « envoyée » sans rien
        recevoir, et les relances ne basculaient jamais sur Telegram."""
        v = _vapid()
        if webpush is None:
            log.warning("pywebpush non installé : notification ignorée.")
            return "echec"
        try:
            webpush(
                subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
                data=payload,
                vapid_private_key=v["private"],
                vapid_claims={"sub": v["subject"]},
                ttl=3600,
                timeout=10,
            )
            return "ok"
        except WebPushException as exc:
            resp = getattr(exc, "response", None)
            if resp is not None and resp.status_code in (404, 410):
                return "mort"
            log.warning("Echec push (abonnement conservé) : %s", exc)
            return "echec"
        except Exception as exc:  # noqa: BLE001  (clé privée invalide, réseau coupé…)
            log.warning("Echec push (%s) : %s", type(exc).__name__, exc)
            return "echec"

    async def envoyer_push(db, user_id: str, titre: str, corps: str, url: str = "/app", tag: str = "zayado") -> dict:
        """Envoie une notif à tous les appareils d'un utilisateur. Nettoie les morts."""
        v = _vapid()
        if not (v["public"] and v["private"]):
            return {"envoye": 0, "raison": "vapid_absent"}
        subs = list((await db.execute(select(PushSubscription).where(PushSubscription.user_id == user_id))).scalars())
        payload = json.dumps({"title": titre, "body": corps, "url": url, "tag": tag})
        envoye = supprime = echec = 0
        for s in subs:
            etat = await asyncio.to_thread(_envoyer_un, s, payload)
            if etat == "ok":
                envoye += 1
            elif etat == "mort":
                await db.delete(s)
                supprime += 1
            else:
                echec += 1
        if supprime:
            await db.commit()
        return {"envoye": envoye, "supprime": supprime, "echec": echec}

    g["envoyer_push"] = envoyer_push

    @api.get("/push/public-key")
    async def push_public_key():
        return {"publicKey": _vapid()["public"]}

    class SubKeys(BaseModel):
        p256dh: str
        auth: str

    class SubIn(BaseModel):
        endpoint: str
        keys: SubKeys

    @api.post("/push/subscribe")
    async def subscribe(body: SubIn, db=Depends(get_db)):
        uid = _connecte()
        existing = (await db.execute(select(PushSubscription).where(PushSubscription.endpoint == body.endpoint))).scalars().first()
        if existing:
            existing.user_id = uid
            existing.p256dh = body.keys.p256dh
            existing.auth = body.keys.auth
        else:
            db.add(PushSubscription(user_id=uid, endpoint=body.endpoint, p256dh=body.keys.p256dh, auth=body.keys.auth))
        await db.commit()
        return {"ok": True}

    @api.delete("/push/subscribe")
    async def unsubscribe(body: SubIn, db=Depends(get_db)):
        uid = _connecte()
        sub = (await db.execute(select(PushSubscription).where(
            PushSubscription.endpoint == body.endpoint, PushSubscription.user_id == uid))).scalars().first()
        if sub:
            await db.delete(sub)
            await db.commit()
        return {"ok": True}

    @api.get("/push/statut")
    async def push_statut(db=Depends(get_db)):
        uid = _connecte()
        n = len(list((await db.execute(select(PushSubscription).where(PushSubscription.user_id == uid))).scalars()))
        return {"actif": n > 0, "appareils": n, "disponible": bool(_vapid()["public"])}

    @api.post("/push/test")
    async def push_test(db=Depends(get_db)):
        uid = _connecte()
        r = await envoyer_push(db, uid, "Zayado", "🔔 Tes notifications sont bien activées.", "/app", "test")
        if not r.get("envoye"):
            if r.get("raison") == "vapid_absent":
                raise HTTPException(503, "Notifications non configurées côté serveur (clés VAPID absentes).")
            if r.get("echec"):
                raise HTTPException(502, "Le service de notification a refusé l'envoi : vérifie les clés VAPID dans les journaux du serveur.")
            raise HTTPException(400, "Aucun appareil abonné (active d'abord les notifications).")
        return r

    @api.post("/push/rappel-checkin")
    async def push_rappel_checkin(db=Depends(get_db)):
        uid = _connecte()
        return await envoyer_push(db, uid, "C'est l'heure de ton check-in ✨",
                                  "Note ton énergie du jour en 30 secondes pour un point du jour adapté.",
                                  "/app", "checkin")
