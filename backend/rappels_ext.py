"""Bloquer un vrai créneau de pause (Bien-être).

Avant : le bouton « Bloquer un créneau » lançait une respiration. Maintenant :
- une action « Pause … à HH:MM » est ajoutée au Plan d'action (visible dans « À faire ») ;
- si le Copilote Telegram est relié, un rappel est envoyé à l'heure dite.

Les rappels sont envoyés par une petite boucle (toutes les minutes, si RUN_CRONS n'est pas coupé).
"""
import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, DateTime, String, Text, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.rappels")


def install_rappels(g: dict) -> None:
    api, Base, get_db, app = g["api"], g["Base"], g["get_db"], g.get("app")
    _uid, new_uuid, utcnow, async_session = g["_uid"], g["new_uuid"], g["utcnow"], g["async_session"]
    DEMO_USER_ID = g["DEMO_USER_ID"]

    class Rappel(Base):
        __tablename__ = "rappels"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        texte: Mapped[str] = mapped_column(Text)
        a: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
        canal: Mapped[str] = mapped_column(String(20), default="telegram")
        envoye: Mapped[bool] = mapped_column(Boolean, default=False)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    g["Rappel"] = Rappel

    async def _telegram(db, uid) -> Optional[str]:
        UC = g["UserConnection"]
        c = (await db.execute(select(UC).where(UC.user_id == uid, UC.provider == "telegram_zayado",
                                                UC.status == "ready"))).scalars().first()
        return c.phone_number if c and c.phone_number else None

    class PauseIn(BaseModel):
        heure: str = Field(pattern=r"^\d{2}:\d{2}$")
        duree: int = Field(default=15, ge=3, le=120)
        rappel: bool = True

    @api.post("/bien-etre/pause")
    async def bloquer_pause(body: PauseIn, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        if uid == DEMO_USER_ID:
            raise HTTPException(401, "Connecte-toi pour bloquer un créneau.")
        profil = await g["_profil"](db, uid)
        try:
            tz = ZoneInfo(profil.fuseau or "Europe/Paris")
        except Exception:  # noqa: BLE001
            tz = ZoneInfo("Europe/Paris")
        h, m = (int(x) for x in body.heure.split(":"))
        maintenant = datetime.now(tz)
        quand = maintenant.replace(hour=h, minute=m, second=0, microsecond=0)
        if quand < maintenant - timedelta(minutes=1):
            quand += timedelta(days=1)  # heure déjà passée : demain
        jour = "aujourd'hui" if quand.date() == maintenant.date() else "demain"
        titre = f"Pause {body.duree} min · {jour} à {body.heure}"
        VisionTache = g["VisionTache"]
        db.add(VisionTache(user_id=uid, titre=titre, duree_min=body.duree, micro=body.duree <= 5, statut="a_faire", icon="Coffee"))
        chat = await _telegram(db, uid) if body.rappel else None
        if chat:
            db.add(Rappel(user_id=uid, texte=f"☕ C'est l'heure de ta pause de {body.duree} min. Lève-toi, respire, bois un verre d'eau. Le reste peut attendre.",
                          a=quand.astimezone(timezone.utc), canal="telegram"))
        await db.commit()
        return {"ok": True, "titre": titre, "telegram": bool(chat), "quand": quand.isoformat()}

    async def envoyer_rappels_dus() -> int:
        from canaux_ext import _tg_conf
        token = _tg_conf()["token"]
        if not token:
            return 0
        n = 0
        async with async_session() as db:
            dus = list((await db.execute(select(Rappel).where(Rappel.envoye.is_(False), Rappel.a <= datetime.now(timezone.utc)).limit(50))).scalars())
            for r in dus:
                chat = await _telegram(db, r.user_id)
                if chat:
                    await g["_tg_send"](token, chat, r.texte)
                    n += 1
                r.envoye = True
            await db.commit()
        return n

    g["envoyer_rappels_dus"] = envoyer_rappels_dus

    async def _boucle():
        await asyncio.sleep(30)
        while True:
            try:
                await envoyer_rappels_dus()
            except Exception as e:  # noqa: BLE001
                log.warning("Rappels : %s", e)
            await asyncio.sleep(60)

    if app is not None:
        @app.on_event("startup")
        async def _demarrer():
            if os.environ.get("RUN_CRONS", "1").strip().lower() in ("0", "false", "non", "off"):
                return
            asyncio.create_task(_boucle())
