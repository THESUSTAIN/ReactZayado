"""Relance douce de l'onboarding interrompu.

Le parcours enregistre au fil de l'eau son étape (contexte_metier.onboarding_etape,
onboarding_total, onboarding_maj). Si quelqu'un s'arrête en route, le lendemain le
Copilote lui écrit une seule fois : « Il te reste N questions » avec un lien qui le
ramène exactement à la même étape. Coupable avec RELANCE_ONBOARDING=0.
"""
import asyncio
import os
from datetime import datetime, timedelta, timezone

from sqlalchemy import select


def install_onboarding(g: dict) -> None:
    VP = g["VisionProfile"]
    User = g["User"]
    log = g.get("logger")

    def _front() -> str:
        f = g.get("_frontend_url")
        return ((f() if f else "") or "https://app.zayado.net").rstrip("/")

    async def tour_relance_onboarding(now: datetime | None = None) -> int:
        now = now or datetime.now(timezone.utc)
        envoyer, session = g.get("send_email"), g.get("async_session")
        if not envoyer or not session:
            return 0
        n = 0
        async with session() as db:
            for p in list((await db.execute(select(VP).where(VP.onboarded.is_(False)))).scalars()):
                cm = dict(p.contexte_metier or {})
                if cm.get("onboarding_relance_le") or cm.get("onboarding_etape") in (None, ""):
                    continue
                try:
                    maj = datetime.fromisoformat(str(cm.get("onboarding_maj")))
                    maj = maj if maj.tzinfo else maj.replace(tzinfo=timezone.utc)
                except (TypeError, ValueError):
                    continue
                # Le lendemain (au moins 20 h après), et pas des semaines plus tard.
                if not (now - timedelta(days=7) < maj <= now - timedelta(hours=20)):
                    continue
                u = await db.get(User, p.user_id)
                if not u or not u.email:
                    continue
                reste = max(1, int(cm.get("onboarding_total") or 11) - int(cm.get("onboarding_etape") or 0))
                cm["onboarding_relance_le"] = now.isoformat()
                p.contexte_metier = cm
                await db.commit()
                prenom = (p.prenom or "").strip()
                html = (f"<p>Bonjour{(' ' + prenom) if prenom else ''},</p>"
                        f"<p>C'est ton Copilote Zayado. Tu t'es arrêté·e en route hier : "
                        f"<b>il te reste {reste} question{'s' if reste > 1 else ''}</b>, que des choix à toucher.</p>"
                        f"<p><a href=\"{_front()}/onboarding\">Reprendre là où je me suis arrêté·e</a></p>"
                        f"<p>À tout de suite,<br>Ton Copilote Zayado</p>")
                try:
                    await envoyer(to=u.email, subject=f"Il te reste {reste} question{'s' if reste > 1 else ''} 🙂", html=html)
                    n += 1
                except Exception as e:  # noqa: BLE001
                    if log:
                        log.warning("Relance onboarding non envoyée (%s) : %s", p.user_id, e)
        return n

    async def _boucle():
        await asyncio.sleep(90)
        while True:
            try:
                await tour_relance_onboarding()
            except Exception as e:  # noqa: BLE001
                if log:
                    log.warning("Boucle de relance onboarding : %s", e)
            await asyncio.sleep(3600)

    app = g.get("app")
    if app is not None:
        @app.on_event("startup")
        async def _demarrer():
            if os.environ.get("RELANCE_ONBOARDING", "1").strip().lower() in ("0", "false", "non", "off"):
                return
            if os.environ.get("RUN_CRONS", "1").strip().lower() in ("0", "false", "non", "off"):
                return
            asyncio.create_task(_boucle())

    g["tour_relance_onboarding"] = tour_relance_onboarding
