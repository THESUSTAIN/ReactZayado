"""Carrousel de la page login — administrable depuis la console admin.

Même principe que vision_plus : server.py appelle `install_carrousel(globals())`
juste avant `app.include_router(api)`.

Contenu
  1. GET  /contenu/login-carousel        — PUBLIC : la config affichée par /login
  2. PUT  /admin/contenu/login-carousel  — admin : remplace la config (JSON validé)
  3. POST /admin/medias                  — admin : upload image/vidéo (stockage objet)
  4. GET  /medias/{media_id}             — PUBLIC : sert un média uploadé

Chaque slide : {type: image|video, src, titre, description,
                style: {position: bas|centre, voile: leger|moyen|fort, taille: normal|grand}}
"""
import asyncio
import logging
import os
import uuid as _uuid
from datetime import datetime, timezone

import requests
from fastapi import Depends, File, HTTPException, Response, UploadFile
from pydantic import BaseModel
from sqlalchemy import Boolean, DateTime, Integer, String, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

log = logging.getLogger("kairos.carrousel")

# ── Stockage objet Emergent (playbook objstore) ──
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "zayado"
_storage_key = None


def _init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ.get("EMERGENT_LLM_KEY")}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _put_object(path: str, data: bytes, content_type: str) -> dict:
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": _init_storage(), "Content-Type": content_type},
        data=data, timeout=180,
    )
    if resp.status_code == 404:  # clé morte en cours de session : on en refrappe une
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": _init_storage(force=True), "Content-Type": content_type},
            data=data, timeout=180,
        )
    resp.raise_for_status()
    return resp.json()


def _get_object(path: str) -> tuple:
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": _init_storage()}, timeout=90)
    if resp.status_code == 404:
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": _init_storage(force=True)}, timeout=90)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ── Constantes métier ──
MIME_PAR_EXT = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp",
    "mp4": "video/mp4", "webm": "video/webm", "mov": "video/quicktime",
}
MAX_IMAGE = 8 * 1024 * 1024
MAX_VIDEO = 60 * 1024 * 1024

STYLE_DEFAUT = {"position": "bas", "voile": "moyen", "taille": "normal"}

SLIDES_DEFAUT = [
    {"type": "image",
     "src": "https://images.unsplash.com/photo-1526916027372-0c0852cef5d3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHw0fHxtZWRpdGF0aW9uJTIwZW50cmVwcmVuZXVyJTIwY2FsbSUyMGZvY3VzJTIwcmVmbGVjdGlvbnxlbnwwfHx8fDE3OTA0NzUwOTd8MA&ixlib=rb-4.1.0&q=85",
     "titre": "Pilote ton activité avec clarté",
     "description": "Priorités, chiffre d'affaires et décisions — rassemblés au même endroit, chaque matin.",
     "style": dict(STYLE_DEFAUT)},
    {"type": "image",
     "src": "https://images.unsplash.com/photo-1781905136236-b6fbd49a45e8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwzfHxwZWFjZWZ1bCUyMG5hdHVyZSUyMHNhbmN0dWFyeSUyMHNlcmVuZSUyMGxhbmRzY2FwZXxlbnwwfHx8fDE3OTA0NzUwOTd8MA&ixlib=rb-4.1.0&q=85",
     "titre": "Ton bien-être d'abord",
     "description": "Un copilote qui s'adapte à ton énergie réelle, jamais l'inverse.",
     "style": dict(STYLE_DEFAUT)},
    {"type": "image",
     "src": "https://images.unsplash.com/photo-1786294972879-8c8511aa0ab6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHw0fHxwZWFjZWZ1bCUyMG5hdHVyZSUyMHNhbmN0dWFyeSUyMHNlcmVuZSUyMGxhbmRzY2FwZXxlbnwwfHx8fDE3OTA0NzUwOTd8MA&ixlib=rb-4.1.0&q=85",
     "titre": "Entreprends avec sens",
     "description": "Vision, valeurs et équilibre — ta vie ne tient pas dans un tableur.",
     "style": dict(STYLE_DEFAUT)},
]

CLE_CARROUSEL = "login_carousel"


def _normaliser_slide(s: dict) -> dict:
    """Validation stricte d'une slide (frontière admin → base)."""
    if not isinstance(s, dict):
        raise HTTPException(422, "Slide invalide.")
    type_ = s.get("type")
    if type_ not in ("image", "video"):
        raise HTTPException(422, "Type de slide : image ou video.")
    src = str(s.get("src") or "").strip()
    if not src or len(src) > 2000 or not (src.startswith("https://") or src.startswith("http://") or src.startswith("/api/medias/")):
        raise HTTPException(422, "Source de slide invalide (URL https ou média uploadé attendue).")
    style = s.get("style") or {}
    return {
        "type": type_,
        "src": src,
        "titre": str(s.get("titre") or "")[:120],
        "description": str(s.get("description") or "")[:300],
        "style": {
            "position": style.get("position") if style.get("position") in ("bas", "centre") else "bas",
            "voile": style.get("voile") if style.get("voile") in ("leger", "moyen", "fort") else "moyen",
            "taille": style.get("taille") if style.get("taille") in ("normal", "grand") else "normal",
        },
    }


class CarrouselIn(BaseModel):
    slides: list


def install_carrousel(g: dict) -> None:
    Base = g["Base"]
    api = g["api"]
    get_db = g["get_db"]
    exiger_role = g["exiger_role"]
    new_uuid = g["new_uuid"]

    def utcnow():
        return datetime.now(timezone.utc)

    class SiteContent(Base):
        """Contenu éditorial du site piloté par l'admin (clé → JSON)."""
        __tablename__ = "site_contents"
        cle: Mapped[str] = mapped_column(String(60), primary_key=True)
        valeur: Mapped[dict] = mapped_column(JSON, default=dict)
        updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    class CarrouselMedia(Base):
        """Médias uploadés pour le carrousel (soft-delete, pas de delete API côté stockage)."""
        __tablename__ = "carrousel_medias"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        storage_path: Mapped[str] = mapped_column(String(300))
        filename: Mapped[str] = mapped_column(String(250), default="")
        content_type: Mapped[str] = mapped_column(String(80), default="application/octet-stream")
        size: Mapped[int] = mapped_column(Integer, default=0)
        is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    g["SiteContent"] = SiteContent
    g["CarrouselMedia"] = CarrouselMedia

    async def _lire_slides(db: AsyncSession) -> list:
        row = await db.get(SiteContent, CLE_CARROUSEL)
        if row and isinstance(row.valeur, dict) and row.valeur.get("slides"):
            return row.valeur["slides"]
        return SLIDES_DEFAUT

    @api.get("/contenu/login-carousel")
    async def lire_carrousel(db: AsyncSession = Depends(get_db)):
        """PUBLIC : la page /login (sans compte) lit cette config."""
        return {"slides": await _lire_slides(db)}

    @api.put("/admin/contenu/login-carousel")
    async def ecrire_carrousel(body: CarrouselIn, db: AsyncSession = Depends(get_db),
                               _r=Depends(exiger_role("admin"))):
        if not isinstance(body.slides, list) or not (1 <= len(body.slides) <= 6):
            raise HTTPException(422, "Entre 1 et 6 slides.")
        slides = [_normaliser_slide(s) for s in body.slides]
        row = await db.get(SiteContent, CLE_CARROUSEL)
        if row is None:
            row = SiteContent(cle=CLE_CARROUSEL, valeur={"slides": slides})
            db.add(row)
        else:
            row.valeur = {"slides": slides}
        await db.commit()
        return {"ok": True, "slides": slides}

    @api.post("/admin/medias")
    async def upload_media(fichier: UploadFile = File(...), db: AsyncSession = Depends(get_db),
                           _r=Depends(exiger_role("admin"))):
        nom = fichier.filename or "media"
        ext = nom.rsplit(".", 1)[-1].lower() if "." in nom else ""
        mime = MIME_PAR_EXT.get(ext)
        if not mime:
            raise HTTPException(422, "Format accepté : jpg, png, webp, gif, mp4, webm, mov.")
        data = await fichier.read()
        est_video = mime.startswith("video/")
        limite = MAX_VIDEO if est_video else MAX_IMAGE
        if len(data) > limite:
            raise HTTPException(413, f"Fichier trop lourd (max {limite // (1024 * 1024)} Mo pour {'une vidéo' if est_video else 'une image'}).")
        path = f"{APP_NAME}/carrousel/{_uuid.uuid4().hex}.{ext}"
        try:
            res = await asyncio.to_thread(_put_object, path, data, mime)
        except Exception as e:  # noqa: BLE001
            log.warning("Upload carrousel impossible : %s", e)
            raise HTTPException(502, "Le stockage de fichiers est indisponible pour le moment.")
        media = CarrouselMedia(storage_path=res["path"], filename=nom[:240],
                               content_type=mime, size=len(data))
        db.add(media)
        await db.commit()
        return {"id": media.id, "url": f"/api/medias/{media.id}", "type": "video" if est_video else "image"}

    @api.get("/medias/{media_id}")
    async def servir_media(media_id: str, db: AsyncSession = Depends(get_db)):
        """PUBLIC : la page /login affiche les médias sans compte."""
        media = await db.get(CarrouselMedia, media_id)
        if not media or media.is_deleted:
            raise HTTPException(404, "Média introuvable.")
        try:
            data, _ct = await asyncio.to_thread(_get_object, media.storage_path)
        except Exception:  # noqa: BLE001
            raise HTTPException(404, "Média introuvable.")
        return Response(content=data, media_type=media.content_type,
                        headers={"Cache-Control": "public, max-age=86400"})

    log.info("Carrousel login administrable installé.")
