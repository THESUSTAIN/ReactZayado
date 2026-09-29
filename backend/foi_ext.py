"""Ma Foi (TheSustain) — vraies données côté serveur.

Avant : tout le module vivait dans le navigateur (localStorage) et le Mur de
prière / le Cercle étaient pré-remplis de faux membres (« Marie L. »,
« Julien P. »…) avec de faux compteurs. Personne ne voyait les messages des
autres : c'était une maquette.

Maintenant :
- /foi/etat/{cle}        : données PERSONNELLES du module (prière, intentions,
                           favoris, progression…) rattachées au compte.
- /foi/posts?espace=…    : publications PARTAGÉES entre les membres
                           (espace = "mur" pour le Mur de prière, "cercle" pour le Cercle),
                           soutiens (« je prie pour toi » / encouragements) et réponses réels.
Modération : l'auteur ou un admin peut supprimer une publication.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import JSON, DateTime, Integer, String, Text, UniqueConstraint, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

ESPACES = ("mur", "cercle")
CATEGORIES = ("prieres", "questions", "bible", "foi-travail", "temoignages", "entraide")
CLES_ETAT = {
    "sagesse_application", "lecture_index", "lecture_favoris", "priere_personal", "priere_intentions",
    "priere_saved", "priere_decharges", "parcours_progress", "discernement_saved", "sabbat_checks",
    "memoire_progress", "choix_modules", "palais_lieux",
}


def _iso(dt) -> Optional[str]:
    """ISO avec fuseau (SQLite relit les dates SANS fuseau : le navigateur les
    prenait pour de l'heure locale → « il y a 2 h » pour un message tout neuf)."""
    if dt is None:
        return None
    return (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)).isoformat()


def install_foi(g: dict) -> None:
    api, Base, get_db = g["api"], g["Base"], g["get_db"]
    _uid, _role_courant, new_uuid, utcnow = g["_uid"], g["_role_courant"], g["new_uuid"], g["utcnow"]
    DEMO_USER_ID = g["DEMO_USER_ID"]

    class FoiEtat(Base):
        __tablename__ = "foi_etat"
        __table_args__ = (UniqueConstraint("user_id", "cle", name="uq_foi_etat"),)
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        cle: Mapped[str] = mapped_column(String(60))
        valeur: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
        updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    class FoiPost(Base):
        __tablename__ = "foi_posts"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        espace: Mapped[str] = mapped_column(String(10), index=True)          # mur | cercle
        categorie: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        auteur: Mapped[str] = mapped_column(String(80))                       # prénom + initiale, ou « Anonyme »
        texte: Mapped[str] = mapped_column(Text)
        soutiens: Mapped[int] = mapped_column(Integer, default=0)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    class FoiSoutien(Base):
        __tablename__ = "foi_soutiens"
        __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_foi_soutien"),)
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        post_id: Mapped[str] = mapped_column(String(36), index=True)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    class FoiReponse(Base):
        __tablename__ = "foi_reponses"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        post_id: Mapped[str] = mapped_column(String(36), index=True)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        auteur: Mapped[str] = mapped_column(String(80))
        texte: Mapped[str] = mapped_column(Text)
        genre: Mapped[str] = mapped_column(String(20), default="encouragement")
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    g.update(FoiEtat=FoiEtat, FoiPost=FoiPost, FoiSoutien=FoiSoutien, FoiReponse=FoiReponse)

    def _connecte() -> str:
        uid = _uid()
        if uid == DEMO_USER_ID:
            raise HTTPException(401, "Connecte-toi pour utiliser Ma Foi.")
        return uid

    async def _nom_affiche(db: AsyncSession, uid: str) -> str:
        profil = await g["_profil"](db, uid)
        prenom = (profil.prenom or "").strip()
        if prenom:
            return prenom.split()[0][:40]
        User = g["User"]
        u = await db.get(User, uid)
        return ((u.email or "Membre").split("@")[0][:1].upper() + ".") if u else "Membre"

    # ───────── Données personnelles ─────────
    @api.get("/foi/etat")
    async def foi_etat_tout(db: AsyncSession = Depends(get_db)):
        uid = _connecte()
        rows = (await db.execute(select(FoiEtat).where(FoiEtat.user_id == uid))).scalars()
        return {r.cle: (r.valeur or {}).get("v") for r in rows}

    class EtatIn(BaseModel):
        valeur: object = None

    @api.put("/foi/etat/{cle}")
    async def foi_etat_ecrire(cle: str, body: EtatIn, db: AsyncSession = Depends(get_db)):
        uid = _connecte()
        if cle not in CLES_ETAT:
            raise HTTPException(404, "Clé inconnue.")
        brut = repr(body.valeur)
        if len(brut) > 200_000:
            raise HTTPException(413, "Contenu trop volumineux.")
        r = (await db.execute(select(FoiEtat).where(FoiEtat.user_id == uid, FoiEtat.cle == cle))).scalar_one_or_none()
        if r is None:
            db.add(FoiEtat(user_id=uid, cle=cle, valeur={"v": body.valeur}))
        else:
            r.valeur = {"v": body.valeur}
        await db.commit()
        return {"ok": True}

    # ───────── Publications partagées ─────────
    async def _serialiser(db: AsyncSession, posts: list, uid: str, admin: bool) -> list:
        ids = [p.id for p in posts]
        if not ids:
            return []
        mes = set((await db.execute(select(FoiSoutien.post_id).where(FoiSoutien.post_id.in_(ids), FoiSoutien.user_id == uid))).scalars())
        reps = list((await db.execute(select(FoiReponse).where(FoiReponse.post_id.in_(ids)).order_by(FoiReponse.created_at))).scalars())
        par_post: dict = {}
        for r in reps:
            par_post.setdefault(r.post_id, []).append({
                "id": r.id, "author": r.auteur, "text": r.texte, "kind": r.genre,
                "created_at": _iso(r.created_at),
                "mine": r.user_id == uid, "can_delete": admin or r.user_id == uid,
            })
        return [{
            "id": p.id, "espace": p.espace, "category": p.categorie, "author": p.auteur, "text": p.texte,
            "count": p.soutiens or 0, "mine_support": p.id in mes, "mine": p.user_id == uid,
            "can_delete": admin or p.user_id == uid,
            "created_at": _iso(p.created_at),
            "replies": par_post.get(p.id, []),
        } for p in posts]

    @api.get("/foi/posts")
    async def foi_posts(espace: str = "cercle", categorie: Optional[str] = None, page: int = 1,
                        db: AsyncSession = Depends(get_db)):
        uid = _connecte()
        if espace not in ESPACES:
            raise HTTPException(422, "Espace inconnu.")
        q = select(FoiPost).where(FoiPost.espace == espace)
        if categorie and categorie in CATEGORIES:
            q = q.where(FoiPost.categorie == categorie)
        total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
        page = max(1, page)
        posts = list((await db.execute(q.order_by(FoiPost.created_at.desc()).offset((page - 1) * 30).limit(30))).scalars())
        return {"items": await _serialiser(db, posts, uid, _role_courant() == "admin"), "total": total, "page": page}

    class PostIn(BaseModel):
        espace: str = Field(max_length=10)
        texte: str = Field(min_length=2, max_length=3000)
        categorie: Optional[str] = Field(default=None, max_length=20)
        anonyme: bool = False

    @api.post("/foi/posts")
    async def foi_publier(body: PostIn, db: AsyncSession = Depends(get_db)):
        uid = _connecte()
        if body.espace not in ESPACES:
            raise HTTPException(422, "Espace inconnu.")
        cat = body.categorie if body.categorie in CATEGORIES else None
        auteur = "Anonyme" if body.anonyme else await _nom_affiche(db, uid)
        p = FoiPost(espace=body.espace, categorie=cat, user_id=uid, auteur=auteur, texte=body.texte.strip())
        db.add(p)
        await db.commit()
        await db.refresh(p)
        return (await _serialiser(db, [p], uid, _role_courant() == "admin"))[0]

    @api.post("/foi/posts/{post_id}/soutenir")
    async def foi_soutenir(post_id: str, db: AsyncSession = Depends(get_db)):
        uid = _connecte()
        p = await db.get(FoiPost, post_id)
        if not p:
            raise HTTPException(404, "Publication introuvable.")
        s = (await db.execute(select(FoiSoutien).where(FoiSoutien.post_id == post_id, FoiSoutien.user_id == uid))).scalar_one_or_none()
        if s:
            await db.delete(s)
            p.soutiens = max(0, (p.soutiens or 0) - 1)
            actif = False
        else:
            db.add(FoiSoutien(post_id=post_id, user_id=uid))
            p.soutiens = (p.soutiens or 0) + 1
            actif = True
        await db.commit()
        return {"ok": True, "mine_support": actif, "count": p.soutiens}

    class ReponseIn(BaseModel):
        texte: str = Field(min_length=1, max_length=2000)
        genre: str = Field(default="encouragement", max_length=20)

    @api.post("/foi/posts/{post_id}/reponses")
    async def foi_repondre(post_id: str, body: ReponseIn, db: AsyncSession = Depends(get_db)):
        uid = _connecte()
        if not await db.get(FoiPost, post_id):
            raise HTTPException(404, "Publication introuvable.")
        genre = body.genre if body.genre in ("encouragement", "prière", "conseil", "expérience") else "encouragement"
        db.add(FoiReponse(post_id=post_id, user_id=uid, auteur=await _nom_affiche(db, uid), texte=body.texte.strip(), genre=genre))
        await db.commit()
        p = await db.get(FoiPost, post_id)
        return (await _serialiser(db, [p], uid, _role_courant() == "admin"))[0]

    @api.delete("/foi/posts/{post_id}")
    async def foi_supprimer(post_id: str, db: AsyncSession = Depends(get_db)):
        uid = _connecte()
        p = await db.get(FoiPost, post_id)
        if not p:
            raise HTTPException(404, "Publication introuvable.")
        if p.user_id != uid and _role_courant() != "admin":
            raise HTTPException(403, "Seul l'auteur ou un admin peut supprimer.")
        await db.execute(delete(FoiReponse).where(FoiReponse.post_id == post_id))
        await db.execute(delete(FoiSoutien).where(FoiSoutien.post_id == post_id))
        await db.delete(p)
        await db.commit()
        return {"ok": True}

    @api.delete("/foi/reponses/{rep_id}")
    async def foi_supprimer_reponse(rep_id: str, db: AsyncSession = Depends(get_db)):
        uid = _connecte()
        r = await db.get(FoiReponse, rep_id)
        if not r:
            raise HTTPException(404, "Réponse introuvable.")
        if r.user_id != uid and _role_courant() != "admin":
            raise HTTPException(403, "Seul l'auteur ou un admin peut supprimer.")
        await db.delete(r)
        await db.commit()
        return {"ok": True}
