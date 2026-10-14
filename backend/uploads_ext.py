"""Téléversement de fichiers (photos du mur d'Élan) vers le stockage objet
Emergent — chemin namespacé par utilisateur, référence gardée en base
(soft-delete : le stockage objet n'a pas d'API de suppression), téléchargement
servi par le backend avec contrôle d'accès."""
import os
from datetime import datetime

import requests
from fastapi import Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import DateTime, String, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

# Limites par nature de fichier — l'envoi part du téléphone : une vidéo dépasse vite 10 Mo.
LIMITES_MO = {"image": 10, "audio": 20, "video": 50, "autre": 10}
TAILLE_MAX = LIMITES_MO["autre"] * 1024 * 1024  # garde-fou par défaut
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
PREFIXE_APP = "zayado"


def install_uploads(g: dict) -> None:
    api, Base, get_db = g["api"], g["Base"], g["get_db"]
    _uid, new_uuid, utcnow = g["_uid"], g["new_uuid"], g["utcnow"]
    cle_emergent = (os.environ.get("EMERGENT_LLM_KEY") or "").strip()

    class Fichier(Base):
        __tablename__ = "fichiers"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        chemin: Mapped[str] = mapped_column(String(300), index=True)
        nom_original: Mapped[str] = mapped_column(String(255), default="")
        content_type: Mapped[str] = mapped_column(String(100), default="application/octet-stream")
        taille: Mapped[int] = mapped_column(default=0)
        supprime: Mapped[bool] = mapped_column(default=False)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    g["Fichier"] = Fichier

    cle_stockage = None

    def init_storage(force: bool = False) -> str:
        nonlocal cle_stockage
        if cle_stockage and not force:
            return cle_stockage
        reponse = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": cle_emergent}, timeout=30)
        reponse.raise_for_status()
        cle_stockage = reponse.json()["storage_key"]
        return cle_stockage

    try:
        init_storage()
    except Exception:  # init au premier usage si l'env n'est pas encore prêt
        pass

    @api.post("/uploads", tags=["fichiers"])
    async def televerser(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
        contenu = await file.read()
        nature = ((file.content_type or "").split("/")[0] or "autre")
        mo = LIMITES_MO.get(nature, LIMITES_MO["autre"])
        if len(contenu) > mo * 1024 * 1024:
            raise HTTPException(413, f"Fichier trop lourd : {mo} Mo maximum pour ce type de fichier.")
        ext = (file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "bin").lower()[:8]
        chemin = f"{PREFIXE_APP}/uploads/{_uid()}/{new_uuid()}.{ext}"
        try:
            cle = init_storage()
            reponse = requests.put(
                f"{STORAGE_URL}/objects/{chemin}",
                headers={"X-Storage-Key": cle, "Content-Type": file.content_type or "application/octet-stream"},
                data=contenu, timeout=120,
            )
            reponse.raise_for_status()
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(502, "Stockage indisponible — réessaie dans un instant.")
        chemin_final = reponse.json().get("path", chemin)
        f = Fichier(user_id=_uid(), chemin=chemin_final, nom_original=(file.filename or "")[:255],
                    content_type=file.content_type or "application/octet-stream", taille=len(contenu))
        db.add(f)
        await db.commit()
        return {"path": chemin_final, "url": f"/api/files/{chemin_final}", "taille": len(contenu)}

    @api.get("/files/{chemin:path}", tags=["fichiers"])
    async def telecharger(chemin: str, db: AsyncSession = Depends(get_db)):
        """Servi authentifié (le front récupère en blob — jamais de token dans l'URL)."""
        f = (await db.execute(select(Fichier).where(
            Fichier.chemin == chemin, Fichier.user_id == _uid(), Fichier.supprime == False))).scalar_one_or_none()  # noqa: E712
        if not f:
            raise HTTPException(404, "Fichier introuvable.")
        try:
            cle = init_storage()
            reponse = requests.get(f"{STORAGE_URL}/objects/{chemin}", headers={"X-Storage-Key": cle}, timeout=60)
            reponse.raise_for_status()
        except Exception:
            raise HTTPException(502, "Stockage indisponible — réessaie dans un instant.")
        return Response(content=reponse.content, media_type=f.content_type,
                        headers={"Cache-Control": "private, max-age=86400"})

    @api.delete("/files/{chemin:path}", tags=["fichiers"])
    async def marquer_supprime(chemin: str, db: AsyncSession = Depends(get_db)):
        """Soft-delete : le stockage objet n'offre pas de suppression."""
        f = (await db.execute(select(Fichier).where(
            Fichier.chemin == chemin, Fichier.user_id == _uid(), Fichier.supprime == False))).scalar_one_or_none()  # noqa: E712
        if not f:
            raise HTTPException(404, "Fichier introuvable.")
        f.supprime = True
        await db.commit()
        return {"ok": True}
