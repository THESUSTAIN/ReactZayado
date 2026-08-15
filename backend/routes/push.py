"""
push.py — Notifications Web Push (VAPID), portées depuis final-main et
adaptées au modèle de Cours-main (pas de vrais comptes — une "session"
locale par navigateur, comme le reste de l'app).

Endpoints :
  GET  /api/push/public-key     → clé publique VAPID (le frontend en a besoin pour s'abonner)
  POST /api/push/subscribe      → enregistre la subscription du navigateur
  POST /api/push/unsubscribe    → la supprime
  POST /api/push/test           → envoie une notif de test (bouton "Tester" dans Paramètres)

Ce qui N'A PAS été porté depuis final : le "kill-switch WordPress" (config
distante) — Cours n'a pas de WordPress, ça n'a pas de sens ici.
"""
import json
import logging
import os
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pywebpush import webpush, WebPushException

from database import get_db
from models import PushSubscription

logger = logging.getLogger(__name__)
push_router = APIRouter(prefix="/api/push", tags=["push"])

VAPID_PUBLIC_KEY = (os.environ.get("VAPID_PUBLIC_KEY") or "").strip()
_VAPID_KEY_FILE = os.path.join(os.path.dirname(__file__), "keys", "vapid_public.txt")
if not VAPID_PUBLIC_KEY and os.path.isfile(_VAPID_KEY_FILE):
    VAPID_PUBLIC_KEY = open(_VAPID_KEY_FILE).read().strip()

VAPID_PRIVATE_KEY_PATH = os.environ.get(
    "VAPID_PRIVATE_KEY_PATH",
    os.path.join(os.path.dirname(__file__), "keys", "vapid_private.pem"),
)
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:hello@example.com")


class SubscriptionIn(BaseModel):
    endpoint: str
    keys: dict
    session_id: str = "default"


@push_router.get("/public-key")
async def get_public_key():
    return {"public_key": VAPID_PUBLIC_KEY}


@push_router.post("/subscribe")
async def subscribe(sub: SubscriptionIn, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(
        select(PushSubscription).where(PushSubscription.session_id == sub.session_id)
    )).scalar_one_or_none()
    payload = json.dumps({"endpoint": sub.endpoint, "keys": sub.keys})
    if existing:
        existing.subscription_json = payload
    else:
        db.add(PushSubscription(session_id=sub.session_id, subscription_json=payload))
    await db.commit()
    return {"ok": True}


@push_router.post("/unsubscribe")
async def unsubscribe(session_id: str = "default", db: AsyncSession = Depends(get_db)):
    row = (await db.execute(
        select(PushSubscription).where(PushSubscription.session_id == session_id)
    )).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
    return {"ok": True}


async def send_push(db: AsyncSession, session_id: str, title: str, body: str, url: str = "/") -> bool:
    """Envoie une notification à une session. Best-effort : renvoie False sans
    lever d'exception si la subscription est absente/expirée ou si les clés
    VAPID ne sont pas configurées — jamais bloquant pour l'appelant."""
    if not VAPID_PUBLIC_KEY or not os.path.isfile(VAPID_PRIVATE_KEY_PATH):
        logger.warning("Push non envoyé : clés VAPID absentes")
        return False
    row = (await db.execute(
        select(PushSubscription).where(PushSubscription.session_id == session_id)
    )).scalar_one_or_none()
    if not row:
        return False
    try:
        sub_info = json.loads(row.subscription_json)
        webpush(
            subscription_info=sub_info,
            data=json.dumps({"title": title, "body": body, "url": url}),
            vapid_private_key=VAPID_PRIVATE_KEY_PATH,
            vapid_claims={"sub": VAPID_SUBJECT},
        )
        return True
    except WebPushException as e:
        logger.warning(f"Push échoué pour {session_id}: {e}")
        if e.response is not None and e.response.status_code in (404, 410):
            await db.delete(row)
            await db.commit()
        return False
    except Exception as e:
        logger.warning(f"Push échoué pour {session_id}: {e}")
        return False


@push_router.post("/test")
async def test_push(session_id: str = "default", db: AsyncSession = Depends(get_db)):
    sent = await send_push(db, session_id, "Copilote IA", "Ceci est une notification de test ✦", "/")
    if not sent:
        raise HTTPException(400, "Envoi impossible — vérifiez que les notifications sont activées et que les clés VAPID sont configurées.")
    return {"ok": True}
