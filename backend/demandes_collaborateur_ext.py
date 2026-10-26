"""Demandes Collaborateurs (page /app/collaborateurs) : envoi, suivi utilisateur, traitement admin.

Extrait de server.py (audit d'architecture) sans changement de route ni de table.
  POST  /growth/work-request                      — nouvelle demande (+ e-mail à l'équipe)
  GET   /demandes-collaborateur/mes               — suivi par l'utilisateur
  GET   /admin/demandes-collaborateur             — liste admin
  PATCH /admin/demandes-collaborateur/{id}        — statut / réponse (+ e-mail à l'utilisateur)
"""
import html as _html
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, String, Text, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column


def _iso_naif(dt):
    return None if dt is None else (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)).isoformat()


def install_demandes_collaborateur(g: dict) -> None:
    api, Base, get_db, _uid, User = g["api"], g["Base"], g["get_db"], g["_uid"], g["User"]
    logger, admin = g["logger"], Depends(g["exiger_role"]("admin"))

    # Lus au moment de l'appel : les tests peuvent remplacer server.send_email.
    async def _envoyer(**kw):
        return await g["send_email"](**kw)

    class DemandeCollaborateur(Base):
        __tablename__ = "demandes_collaborateur"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=g["new_uuid"])
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        message: Mapped[str] = mapped_column(Text)
        contact: Mapped[str] = mapped_column(String(255), default="")
        canal: Mapped[str] = mapped_column(String(50), default="collaborateur")
        statut: Mapped[str] = mapped_column(String(20), default="nouvelle")  # nouvelle / en_cours / traitee
        created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
        # Réponse de l'équipe, visible dans « Mes demandes » (colonnes ajoutées par la réparation de schéma).
        reponse: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
        maj_le: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    class DemandeCollaborateurIn(BaseModel):
        message: str
        contact: str = ""
        channel: str = "collaborateur"
        objet: str = ""
        important: bool = False

    class DemandeMajIn(BaseModel):
        statut: Optional[str] = None
        reponse: Optional[str] = Field(default=None, max_length=5000)
        prevenir: bool = True

    @api.post("/growth/work-request")
    async def creer_demande_collaborateur(body: DemandeCollaborateurIn, db: AsyncSession = Depends(get_db)):
        message = (body.message or "").strip()
        if not message:
            raise HTTPException(422, "Le message est vide.")
        uid = _uid()
        profil = await g["_profil"](db, uid)
        objet = (body.objet or "").strip()[:200]
        if objet:
            message = f"Objet : {objet}\n\n{message}"
        if body.important:
            message = f"[IMPORTANT] {message}"
        d = DemandeCollaborateur(user_id=uid, message=message[:5000], contact=(body.contact or "").strip()[:255],
                                 canal=(body.channel or "collaborateur")[:50])
        db.add(d)
        await db.commit()
        # Notification e-mail à l'équipe (best effort : la demande est déjà enregistrée).
        dest = os.environ.get("NOTIF_EMAIL", "contact@zayado.net")
        try:
            sujet = ("⚠️ IMPORTANT · " if body.important else "") + (f"Collaborateur : {objet}" if objet else "Nouvelle demande Collaborateurs")
            await _envoyer(to=dest, subject=sujet,
                           html=g["_email_wrap"](f"<p><b>De :</b> {_html.escape(profil.prenom or '')} {_html.escape(profil.email or '')}</p>"
                                                 f"<p><b>Contact indiqué :</b> {_html.escape(d.contact or '—')}</p>"
                                                 f"<p>{_html.escape(d.message).replace(chr(10), '<br>')}</p>"))
        except Exception:  # noqa: BLE001
            logger.warning("Notification e-mail de la demande collaborateur non envoyée.")
        return {"ok": True, "id": d.id}

    @api.get("/demandes-collaborateur/mes")
    async def mes_demandes_collaborateur(db: AsyncSession = Depends(get_db)):
        """Suivi côté utilisateur : ses demandes, leur statut et la réponse de l'équipe."""
        uid = _uid()
        rows = (await db.execute(select(DemandeCollaborateur).where(DemandeCollaborateur.user_id == uid)
                                 .order_by(DemandeCollaborateur.created_at.desc()).limit(30))).scalars().all()
        return {"demandes": [{"id": r.id, "message": r.message, "statut": r.statut, "reponse": r.reponse,
                              "created_at": _iso_naif(r.created_at), "maj_le": _iso_naif(r.maj_le)} for r in rows]}

    @api.get("/admin/demandes-collaborateur")
    async def admin_demandes_collaborateur(db: AsyncSession = Depends(get_db), _role=admin):
        rows = (await db.execute(select(DemandeCollaborateur).order_by(DemandeCollaborateur.created_at.desc()).limit(200))).scalars().all()
        emails = {u.id: u.email for u in (await db.execute(select(User).where(User.id.in_({r.user_id for r in rows})))).scalars()} if rows else {}
        return {"demandes": [{"id": r.id, "user_id": r.user_id, "email": emails.get(r.user_id), "message": r.message, "contact": r.contact,
                              "statut": r.statut, "reponse": r.reponse, "maj_le": _iso_naif(r.maj_le),
                              "created_at": _iso_naif(r.created_at)} for r in rows]}

    @api.patch("/admin/demandes-collaborateur/{demande_id}")
    async def admin_maj_demande(demande_id: str, body: DemandeMajIn, db: AsyncSession = Depends(get_db), _role=admin):
        d = await db.get(DemandeCollaborateur, demande_id)
        if not d:
            raise HTTPException(404, "Demande introuvable.")
        if body.statut:
            if body.statut not in ("nouvelle", "en_cours", "traitee"):
                raise HTTPException(422, "Statut inconnu.")
            d.statut = body.statut
        if body.reponse is not None:
            d.reponse = body.reponse.strip() or None
        d.maj_le = datetime.now(timezone.utc)
        await db.commit()
        envoye = False
        if body.prevenir and body.reponse:
            u = await db.get(User, d.user_id)
            dest = (d.contact or "").strip() or (u.email if u else "")
            if dest and "@" in dest:
                try:
                    await _envoyer(to=dest, subject="L'équipe Zayado a répondu à ta demande",
                                   html=g["_email_wrap"](f"<p>Bonjour,</p><p>{_html.escape(body.reponse).replace(chr(10), '<br>')}</p>"
                                                         f"<p>Tu retrouves le suivi dans Zayado › Collaborateurs.</p>"))
                    envoye = True
                except Exception:  # noqa: BLE001
                    logger.warning("Réponse à la demande %s non envoyée par e-mail.", demande_id)
        return {"ok": True, "email_envoye": envoye}

    # Lu par admin_plus_ext (compteur « demandes à voir »)
    g["DemandeCollaborateur"] = DemandeCollaborateur
