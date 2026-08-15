"""
agent_livraison.py — Encouragements proactifs (port depuis final-main,
adapté au modèle mono-session de Cours-main).

Le principe repris de final : pas de nouvel appel LLM par notification —
seulement des règles sur des données déjà en base (énergie basse, vision
jamais retouchée, factures en retard), envoyées via Web Push. Idempotent :
chaque notification est journalisée (table Setting) pour ne jamais être
renvoyée deux fois.

Cours-main n'a qu'une session locale ("default") — pas de boucle sur une
liste d'utilisateurs comme dans final, juste un cycle sur cette session
unique si elle a un abonnement push actif.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta, date as _date

from sqlalchemy import select

from database import async_session_factory
from models import Humeur, Facture, Setting, PushSubscription
from routes.push import send_push

logger = logging.getLogger("agent_livraison")

INTERVAL_SECONDS = 6 * 3600  # toutes les 6h
STARTUP_DELAY = 120


async def _already_sent(db, event_id: str) -> bool:
    obj = await db.get(Setting, f"nudge_sent:{event_id}")
    return obj is not None


async def _mark_sent(db, event_id: str):
    obj = await db.get(Setting, f"nudge_sent:{event_id}")
    if not obj:
        db.add(Setting(key=f"nudge_sent:{event_id}", value="1"))
        await db.commit()


async def _build_notifications(db) -> list:
    out = []
    now = datetime.now(timezone.utc)
    today = _date.today().isoformat()

    # 1) Énergie basse plusieurs check-ins de suite (surcharge)
    try:
        rows = (await db.execute(select(Humeur).order_by(Humeur.created_at.desc()).limit(3))).scalars().all()
        if len(rows) == 3 and all((r.energie or 100) < 45 for r in rows):
            event_id = f"low_energy:{today}"
            if not await _already_sent(db, event_id):
                out.append((event_id, "On dirait que ça tire un peu",
                            "Tes 3 derniers check-ins sont bas. Un petit temps de récupération avant de continuer ?", "/bien-etre"))
    except Exception as e:
        logger.warning(f"[agent_livraison] energy check failed: {e}")

    # 2) Factures en retard
    try:
        factures = (await db.execute(select(Facture).where(Facture.statut == "En retard"))).scalars().all()
        if factures:
            event_id = f"factures_retard:{now.isocalendar()[1]}:{len(factures)}"  # 1 rappel max/semaine/palier
            if not await _already_sent(db, event_id):
                out.append((event_id, f"{len(factures)} facture(s) en retard",
                            "Un petit coup d'œil à ton Pilotage pour relancer ?", "/pilotage"))
    except Exception as e:
        logger.warning(f"[agent_livraison] factures check failed: {e}")

    # 3) Vision jamais retouchée depuis longtemps (>14 jours)
    try:
        vision_setting = await db.get(Setting, "vision")
        # On se sert de la date du dernier SWOT/document généré comme proxy
        # d'activité récente sur la Vision — sinon "depuis toujours" par défaut.
        last_touch = await db.get(Setting, "swot_generated_at")
        stale = True
        if last_touch and last_touch.value:
            try:
                dt = datetime.fromisoformat(last_touch.value)
                stale = (now - dt) > timedelta(days=14)
            except Exception:
                stale = True
        if vision_setting and vision_setting.value and stale:
            event_id = f"vision_stale:{now.date().isocalendar()[1] // 2}"  # tous les ~14 jours
            if not await _already_sent(db, event_id):
                out.append((event_id, "Un moment pour ta vision ?",
                            "Ça fait un moment que tu n'as pas fait le point sur ta vision. Reviens-y quelques minutes.", "/"))
    except Exception as e:
        logger.warning(f"[agent_livraison] vision check failed: {e}")

    return out


async def agent_livraison_loop():
    await asyncio.sleep(STARTUP_DELAY)
    logger.info("[agent_livraison] Loop started")
    while True:
        try:
            async with async_session_factory() as db:
                has_sub = (await db.execute(select(PushSubscription).where(PushSubscription.session_id == "default"))).scalar_one_or_none()
                if has_sub:
                    notifs = await _build_notifications(db)
                    for event_id, title, body, url in notifs:
                        sent = await send_push(db, "default", title, body, url)
                        if sent:
                            await _mark_sent(db, event_id)
        except Exception as e:
            logger.error(f"[agent_livraison] loop error: {e}")
        await asyncio.sleep(INTERVAL_SECONDS)
