"""Processus (page /app/processus) : liste de processus par utilisateur, côté serveur.

Extrait de server.py (audit d'architecture) sans changement de route ni de table.
  GET /processus   — lit les processus du compte connecté
  PUT /processus   — les remplace (50 max, 200 ko max)
"""
import json
from datetime import datetime
from typing import List

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import JSON, DateTime, String, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column


def install_processus(g: dict) -> None:
    api, Base, get_db, _uid = g["api"], g["Base"], g["get_db"], g["_uid"]

    class ProcessusData(Base):
        __tablename__ = "processus_data"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=g["new_uuid"])
        user_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
        items: Mapped[list] = mapped_column(JSON, default=list)
        updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=g["utcnow"], onupdate=g["utcnow"])

    class ProcessusIn(BaseModel):
        items: List[dict] = Field(default_factory=list)

    @api.get("/processus")
    async def lire_processus(db: AsyncSession = Depends(get_db)):
        row = (await db.execute(select(ProcessusData).where(ProcessusData.user_id == _uid()))).scalar_one_or_none()
        return {"items": (row.items if row else []) or []}

    @api.put("/processus")
    async def enregistrer_processus(body: ProcessusIn, db: AsyncSession = Depends(get_db)):
        items = body.items[:50]
        if len(json.dumps(items)) > 200_000:
            raise HTTPException(413, "Trop de contenu.")
        uid = _uid()
        row = (await db.execute(select(ProcessusData).where(ProcessusData.user_id == uid))).scalar_one_or_none()
        if row:
            row.items = items
        else:
            db.add(ProcessusData(user_id=uid, items=items))
        await db.commit()
        return {"ok": True, "items": items}

    # Utilisé par la récupération des données du compte démo (server.py)
    g["ProcessusData"] = ProcessusData
