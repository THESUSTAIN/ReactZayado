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
    "sagesse_journal", "discernement_brouillon", "priere_exaucees", "pour_moi_vu",
}
SEUIL_MASQUAGE = 3  # signalements ouverts à partir desquels une publication est masquée en attendant l'admin
MOTIFS_SIGNALEMENT = ("inapproprie", "haineux", "spam", "donnees_perso", "autre")


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

    class FoiSignalement(Base):
        __tablename__ = "foi_signalements"
        __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_foi_signalement"),)
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        post_id: Mapped[str] = mapped_column(String(36), index=True)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        motif: Mapped[str] = mapped_column(String(20), default="autre")
        commentaire: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
        statut: Mapped[str] = mapped_column(String(10), default="ouvert", index=True)   # ouvert | garde | supprime
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    g.update(FoiEtat=FoiEtat, FoiPost=FoiPost, FoiSoutien=FoiSoutien, FoiReponse=FoiReponse, FoiSignalement=FoiSignalement)
    exiger_role = g["exiger_role"]

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
        if _role_courant() != "admin":
            masques = (select(FoiSignalement.post_id).where(FoiSignalement.statut == "ouvert")
                       .group_by(FoiSignalement.post_id).having(func.count() >= SEUIL_MASQUAGE))
            q = q.where((FoiPost.id.not_in(masques)) | (FoiPost.user_id == uid))
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
        for sg in (await db.execute(select(FoiSignalement).where(FoiSignalement.post_id == post_id, FoiSignalement.statut == "ouvert"))).scalars():
            sg.statut = "supprime"
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

    # ───────── Signalements (modération) ─────────
    class SignalementIn(BaseModel):
        motif: str = Field(default="autre", max_length=20)
        commentaire: Optional[str] = Field(default=None, max_length=500)

    @api.post("/foi/posts/{post_id}/signaler")
    async def foi_signaler(post_id: str, body: SignalementIn, db: AsyncSession = Depends(get_db)):
        uid = _connecte()
        p = await db.get(FoiPost, post_id)
        if not p:
            raise HTTPException(404, "Publication introuvable.")
        if p.user_id == uid:
            raise HTTPException(422, "Tu ne peux pas signaler ta propre publication.")
        existe = (await db.execute(select(FoiSignalement).where(FoiSignalement.post_id == post_id, FoiSignalement.user_id == uid))).scalar_one_or_none()
        if existe:
            return {"ok": True, "deja": True}
        db.add(FoiSignalement(post_id=post_id, user_id=uid, motif=body.motif if body.motif in MOTIFS_SIGNALEMENT else "autre",
                              commentaire=(body.commentaire or "").strip()[:500] or None))
        await db.commit()
        return {"ok": True}

    @api.get("/admin/foi/signalements")
    async def admin_foi_signalements(statut: str = "ouvert", db: AsyncSession = Depends(get_db), _r=Depends(exiger_role("admin"))):
        sigs = list((await db.execute(select(FoiSignalement).where(FoiSignalement.statut == statut).order_by(FoiSignalement.created_at.desc()))).scalars())
        par_post: dict = {}
        for sg in sigs:
            par_post.setdefault(sg.post_id, []).append(sg)
        User = g["User"]
        items = []
        for pid, liste in par_post.items():
            p = await db.get(FoiPost, pid)
            auteur = await db.get(User, p.user_id) if p else None
            items.append({
                "post_id": pid, "espace": p.espace if p else None, "texte": p.texte if p else "(publication supprimée)",
                "auteur_affiche": p.auteur if p else None, "auteur_email": auteur.email if auteur else None,
                "publie_le": _iso(p.created_at) if p else None, "nombre": len(liste), "masque": len(liste) >= SEUIL_MASQUAGE,
                "motifs": sorted({sg.motif for sg in liste}),
                "commentaires": [sg.commentaire for sg in liste if sg.commentaire][:5],
                "dernier": _iso(max(sg.created_at for sg in liste)),
            })
        items.sort(key=lambda x: -x["nombre"])
        return {"items": items}

    class DecisionIn(BaseModel):
        decision: str   # garder | supprimer

    @api.post("/admin/foi/signalements/{post_id}")
    async def admin_foi_decider(post_id: str, body: DecisionIn, db: AsyncSession = Depends(get_db), _r=Depends(exiger_role("admin"))):
        if body.decision not in ("garder", "supprimer"):
            raise HTTPException(422, "Décision inconnue.")
        for sg in (await db.execute(select(FoiSignalement).where(FoiSignalement.post_id == post_id, FoiSignalement.statut == "ouvert"))).scalars():
            sg.statut = "garde" if body.decision == "garder" else "supprime"
        if body.decision == "supprimer":
            p = await db.get(FoiPost, post_id)
            if p:
                await db.execute(delete(FoiReponse).where(FoiReponse.post_id == post_id))
                await db.execute(delete(FoiSoutien).where(FoiSoutien.post_id == post_id))
                await db.delete(p)
        await db.commit()
        return {"ok": True}

    # ───────── « Pour toi » : soutiens et réponses reçus ─────────
    @api.get("/foi/pour-moi")
    async def foi_pour_moi(marquer_vu: bool = False, db: AsyncSession = Depends(get_db)):
        uid = _connecte()
        vu = (await db.execute(select(FoiEtat).where(FoiEtat.user_id == uid, FoiEtat.cle == "pour_moi_vu"))).scalar_one_or_none()
        depuis = None
        if vu and (vu.valeur or {}).get("v"):
            try:
                depuis = datetime.fromisoformat(vu.valeur["v"])
                depuis = depuis if depuis.tzinfo else depuis.replace(tzinfo=timezone.utc)
            except Exception:  # noqa: BLE001
                depuis = None
        mes_posts = list((await db.execute(select(FoiPost).where(FoiPost.user_id == uid))).scalars())
        ids = [p.id for p in mes_posts]
        soutiens_total = sum(p.soutiens or 0 for p in mes_posts)
        nouveaux_soutiens = nouvelles_reponses = 0
        if ids:
            qs = select(func.count()).select_from(FoiSoutien).where(FoiSoutien.post_id.in_(ids), FoiSoutien.user_id != uid)
            qr = select(func.count()).select_from(FoiReponse).where(FoiReponse.post_id.in_(ids), FoiReponse.user_id != uid)
            if depuis is not None:
                qs, qr = qs.where(FoiSoutien.created_at > depuis), qr.where(FoiReponse.created_at > depuis)
            nouveaux_soutiens = (await db.execute(qs)).scalar_one()
            nouvelles_reponses = (await db.execute(qr)).scalar_one()
        if marquer_vu:
            maintenant = datetime.now(timezone.utc).isoformat()
            if vu is None:
                db.add(FoiEtat(user_id=uid, cle="pour_moi_vu", valeur={"v": maintenant}))
            else:
                vu.valeur = {"v": maintenant}
            await db.commit()
        return {"publications": len(ids), "soutiens_total": soutiens_total,
                "nouveaux_soutiens": nouveaux_soutiens, "nouvelles_reponses": nouvelles_reponses}
