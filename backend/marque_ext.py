"""Marque administrable — nom, logos (appli + e-mails), pieds de page, contact.

Un seul endroit pour tout changer si l'entreprise change un jour :
Admin › Marque & entreprise. Les informations juridiques complètes (siège,
SIREN, capital…) restent dans Admin › Pages publiques › Mentions légales.

Endpoints
  1. GET  /marque                      — PUBLIC : la marque affichée par l'appli et le site
  2. PUT  /admin/marque                — admin : modifie (partiel accepté)
  3. POST /admin/marque/origine        — admin : revient aux valeurs d'origine
  4. GET  /admin/marque/apercu-email   — admin : HTML d'un e-mail type avec la marque en cours

Le cache module est rechargé au démarrage et à chaque modification : les gabarits
d'e-mails (_email_wrap dans server.py) le lisent de façon synchrone via
g["_marque_courante"]. Champ vide = valeur d'origine (env ou code).
"""
import logging
import os
import re
from datetime import datetime, timezone

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, String, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.marque")

CHAMPS = ("nom_marque", "logo_app_url", "logo_email_url", "email_pied",
          "site_pied", "nom_expediteur", "contact_email")
_CACHE: dict = {"data": None}


def install_marque(g):
    api, Base = g["api"], g["Base"]
    app = g["app"]

    class MarqueParams(Base):
        """Une seule ligne (id « marque ») : la marque de l'entreprise."""
        __tablename__ = "marque_params"
        id: Mapped[str] = mapped_column(String(20), primary_key=True, default="marque")
        nom_marque: Mapped[str] = mapped_column(String(80), default="")
        logo_app_url: Mapped[str] = mapped_column(String(500), default="")
        logo_email_url: Mapped[str] = mapped_column(String(500), default="")
        email_pied: Mapped[str] = mapped_column(String(300), default="")
        site_pied: Mapped[str] = mapped_column(String(300), default="")
        nom_expediteur: Mapped[str] = mapped_column(String(80), default="")
        contact_email: Mapped[str] = mapped_column(String(200), default="")
        updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                     default=lambda: datetime.now(timezone.utc))

    class MarqueIn(BaseModel):
        nom_marque: str | None = Field(default=None, max_length=80)
        logo_app_url: str | None = Field(default=None, max_length=500)
        logo_email_url: str | None = Field(default=None, max_length=500)
        email_pied: str | None = Field(default=None, max_length=300)
        site_pied: str | None = Field(default=None, max_length=300)
        nom_expediteur: str | None = Field(default=None, max_length=80)
        contact_email: str | None = Field(default=None, max_length=200)

    def _url_ok(v: str) -> bool:
        # vide = valeur d'origine ; sinon https absolue ou chemin local (/logo.png, /api/medias/…)
        return not v or v.startswith("https://") or v.startswith("/")

    async def _lire(db: AsyncSession) -> dict:
        row = await db.get(MarqueParams, "marque")
        return {c: (getattr(row, c) or "") for c in CHAMPS} if row else {c: "" for c in CHAMPS}

    async def _recharger(db: AsyncSession) -> dict:
        _CACHE["data"] = await _lire(db)
        return _CACHE["data"]

    def _courante() -> dict:
        """Lecture synchrone pour les gabarits d'e-mails (cache chaud, sinon vide = origine)."""
        return _CACHE["data"] or {}

    def _publique(d: dict) -> dict:
        return {
            "nom_marque": d.get("nom_marque") or "Zayado",
            "logo_app_url": d.get("logo_app_url") or "",
            "logo_email_url": d.get("logo_email_url") or os.environ.get("EMAIL_LOGO_URL", ""),
            "email_pied": d.get("email_pied") or "",
            "site_pied": d.get("site_pied") or "",
            "nom_expediteur": d.get("nom_expediteur") or os.environ.get("EMAIL_FROM_NAME", "Zayado"),
            "contact_email": d.get("contact_email") or "contact@zayado.net",
        }

    g["_marque_courante"] = _courante

    @app.on_event("startup")
    async def _marque_warmup():
        try:
            async with g["async_session"]() as db:
                await _recharger(db)
            log.info("Marque administrable chargée.")
        except Exception as e:  # noqa: BLE001 — la table sera lue à la 1re requête
            log.warning("Marque : pré-chargement impossible (%s)", e)

    @api.get("/marque")
    async def marque_publique(db: AsyncSession = Depends(g["get_db"])):
        if _CACHE["data"] is None:
            await _recharger(db)
        return _publique(_CACHE["data"])

    @api.put("/admin/marque")
    async def marque_modifier(body: MarqueIn, db: AsyncSession = Depends(g["get_db"]),
                              _role=Depends(g["exiger_role"]("admin"))):
        row = await db.get(MarqueParams, "marque")
        if row is None:
            row = MarqueParams(id="marque")
            db.add(row)
        for champ in CHAMPS:
            v = getattr(body, champ)
            if v is None:
                continue
            v = v.strip()
            if champ.startswith("logo_") and not _url_ok(v):
                raise HTTPException(422, f"{champ} : URL https (ou chemin local /…) requise.")
            if champ == "contact_email" and v and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", v):
                raise HTTPException(422, "contact_email : adresse e-mail invalide.")
            setattr(row, champ, v)
        row.updated_at = datetime.now(timezone.utc)
        await db.commit()
        return _publique(await _recharger(db))

    @api.post("/admin/marque/origine")
    async def marque_origine(db: AsyncSession = Depends(g["get_db"]),
                             _role=Depends(g["exiger_role"]("admin"))):
        row = await db.get(MarqueParams, "marque")
        if row:
            for champ in CHAMPS:
                setattr(row, champ, "")
            row.updated_at = datetime.now(timezone.utc)
            await db.commit()
        return _publique(await _recharger(db))

    @api.get("/admin/marque/apercu-email")
    async def marque_apercu_email(db: AsyncSession = Depends(g["get_db"]),
                                  _role=Depends(g["exiger_role"]("admin"))):
        if _CACHE["data"] is None:
            await _recharger(db)
        corps = ("<h1 style=\"margin:0 0 12px;font-size:22px\">Aperçu de la marque</h1>"
                 "<p>Voici exactement l'en-tête et le pied de page que recevront tes clients "
                 "par e-mail avec les réglages en cours.</p>")
        return {"html": g["_email_wrap"](corps)}
