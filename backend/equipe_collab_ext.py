"""Travail d'équipe : partager des idées, les commenter, et « prendre » une idée en action.

Principe : chacun garde SON espace (cockpit, Vision, Plan d'action). Rien n'est partagé par défaut.
Une idée n'est visible par l'équipe que si son auteur la partage (et il peut arrêter à tout moment).

Qui est dans l'équipe ? Le titulaire (offre Équipe/Entreprise active) + les personnes qu'il a invitées
et qui ont créé leur compte. Si l'offre du titulaire s'arrête ou si un membre est retiré, l'accès au
partage s'arrête aussitôt (calculé à chaque appel, rien n'est copié).

Routes :
  GET  /api/equipe/espace                     équipe, membres, idées que j'ai partagées
  POST /api/idees/{id}/partager               {partage: bool}  (auteur seulement)
  GET  /api/equipe/idees                      idées partagées par l'équipe, avec auteur, commentaires, preneurs
  GET  /api/equipe/idees/{id}/commentaires
  POST /api/equipe/idees/{id}/commentaires    {texte}
  POST /api/equipe/idees/{id}/prendre         crée une action dans MON Plan d'action (et ma carte Trello si reliée)
"""
import logging
from datetime import datetime
from typing import Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, String, Text, UniqueConstraint, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.equipe_collab")


def nom_affiche(prenom: Optional[str], email: Optional[str]) -> str:
    """Prénom si on l'a, sinon le début de l'adresse e-mail (jamais l'adresse entière : on ne la montre pas aux collègues)."""
    p = (prenom or "").strip()
    if p:
        return p.split()[0]
    e = (email or "").strip()
    return (e.split("@")[0] if e else "Un coéquipier")[:30] or "Un coéquipier"


def install_equipe_collab(g: dict) -> None:
    api, Base, get_db = g["api"], g["Base"], g["get_db"]
    _uid, new_uuid, utcnow, DEMO_USER_ID = g["_uid"], g["new_uuid"], g["utcnow"], g["DEMO_USER_ID"]
    Idee, User, VisionProfile, VisionTache = g["Idee"], g["User"], g["VisionProfile"], g["VisionTache"]
    Abonnement, EquipeMembre, PLACES_EQUIPE = g["Abonnement"], g["EquipeMembre"], g["PLACES_EQUIPE"]
    _actif, _titulaire_equipe = g["_abonnement_actif"], g["_titulaire_equipe"]

    class EquipeIdeePartage(Base):
        __tablename__ = "equipe_idees_partagees"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        idee_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
        auteur_id: Mapped[str] = mapped_column(String(36), index=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    class EquipeCommentaire(Base):
        __tablename__ = "equipe_commentaires"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        idee_id: Mapped[str] = mapped_column(String(36), index=True)
        user_id: Mapped[str] = mapped_column(String(36))
        texte: Mapped[str] = mapped_column(Text)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    class EquipeIdeePrise(Base):
        __tablename__ = "equipe_idees_prises"
        __table_args__ = (UniqueConstraint("idee_id", "user_id", name="uq_equipe_prise"),)
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        idee_id: Mapped[str] = mapped_column(String(36), index=True)
        user_id: Mapped[str] = mapped_column(String(36))
        action_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    async def _equipe(db, uid: str) -> Optional[dict]:
        """L'équipe de `uid` : {owner_id, role, membres:[{user_id, nom, moi}]} ou None. Calculée en direct."""
        if not uid or uid == DEMO_USER_ID:
            return None
        owner_id, role = None, None
        ab = await db.get(Abonnement, uid)
        if _actif(ab) and ab.plan in PLACES_EQUIPE:
            owner_id, role = uid, "titulaire"
        else:
            t = await _titulaire_equipe(db, uid)
            if t:
                owner_id, role = t[0], "membre"
        if not owner_id:
            return None
        emails = [m.email for m in (await db.execute(select(EquipeMembre).where(EquipeMembre.owner_id == owner_id))).scalars()]
        users = []
        if emails:
            users = list((await db.execute(select(User).where(User.email.in_(emails)))).scalars())
        titulaire = await db.get(User, owner_id)
        tous = ([titulaire] if titulaire else []) + [u for u in users if u.id != owner_id]
        if not any(u.id == uid for u in tous):
            return None
        profils = {p.user_id: p for p in (await db.execute(select(VisionProfile).where(
            VisionProfile.user_id.in_([u.id for u in tous])))).scalars()}
        membres = [{"user_id": u.id, "nom": nom_affiche(getattr(profils.get(u.id), "prenom", None), u.email), "moi": u.id == uid}
                   for u in tous]
        return {"owner_id": owner_id, "role": role, "membres": membres}

    async def _exiger_equipe(db, uid: str) -> dict:
        eq = await _equipe(db, uid)
        if not eq:
            raise HTTPException(403, "Le partage d'idées est inclus dans l'offre Équipe.")
        if len(eq["membres"]) < 2:
            raise HTTPException(409, "Invite d'abord un coéquipier : il n'y a encore personne avec qui partager.")
        return eq

    async def _prevenir(db, destinataires, titre: str, corps: str, cle: str) -> None:
        notifier = g.get("notifier")
        if not notifier:
            return
        for d in destinataires:
            try:
                await notifier(db, d, "equipe", titre, corps, "/app/actions?tab=idees&vue=equipe", tag="equipe", cle=f"{cle}:{d}")
            except Exception as e:  # noqa: BLE001
                log.warning("Notification équipe : %s", e)

    @api.get("/equipe/espace")
    async def equipe_espace(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        eq = await _equipe(db, uid)
        if not eq:
            return {"equipe": False}
        mes = [r for r in (await db.execute(select(EquipeIdeePartage.idee_id).where(EquipeIdeePartage.auteur_id == uid))).scalars()]
        return {"equipe": True, "role": eq["role"], "moi": uid, "membres": eq["membres"],
                "seul": len(eq["membres"]) < 2, "mes_partages": mes}

    class PartagerIn(BaseModel):
        partage: bool = True

    @api.post("/idees/{idee_id}/partager")
    async def idee_partager(idee_id: str, body: PartagerIn, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        eq = await _exiger_equipe(db, uid)
        it = (await db.execute(select(Idee).where(Idee.id == idee_id, Idee.user_id == uid))).scalar_one_or_none()
        if not it:
            raise HTTPException(404, "Idée introuvable.")
        ligne = (await db.execute(select(EquipeIdeePartage).where(EquipeIdeePartage.idee_id == idee_id))).scalar_one_or_none()
        if body.partage and not ligne:
            db.add(EquipeIdeePartage(idee_id=idee_id, auteur_id=uid))
            await db.commit()
            moi = next(m["nom"] for m in eq["membres"] if m["moi"])
            await _prevenir(db, [m["user_id"] for m in eq["membres"] if not m["moi"]],
                            f"{moi} partage une idée 💡", it.titre[:140], f"equipe-idee:{idee_id}")
        elif not body.partage and ligne:
            await db.delete(ligne)
            await db.commit()
        return {"ok": True, "partage": body.partage}

    @api.get("/equipe/idees")
    async def equipe_idees(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        eq = await _exiger_equipe(db, uid)
        noms = {m["user_id"]: m["nom"] for m in eq["membres"]}
        parts = list((await db.execute(select(EquipeIdeePartage).where(
            EquipeIdeePartage.auteur_id.in_(list(noms))).order_by(EquipeIdeePartage.created_at.desc()))).scalars())
        ids = [p.idee_id for p in parts]
        if not ids:
            return {"items": [], "moi": uid}
        idees = {i.id: i for i in (await db.execute(select(Idee).where(Idee.id.in_(ids)))).scalars()}
        nb_com: dict = {}
        for c in (await db.execute(select(EquipeCommentaire.idee_id).where(EquipeCommentaire.idee_id.in_(ids)))).scalars():
            nb_com[c] = nb_com.get(c, 0) + 1
        prises: dict = {}
        for pr in (await db.execute(select(EquipeIdeePrise).where(EquipeIdeePrise.idee_id.in_(ids)))).scalars():
            prises.setdefault(pr.idee_id, []).append({"user_id": pr.user_id, "nom": noms.get(pr.user_id, "Un coéquipier")})
        items = []
        for p in parts:
            i = idees.get(p.idee_id)
            if not i:
                continue
            items.append({"id": i.id, "titre": i.titre, "description": i.description or "", "impact": i.impact, "effort": i.effort,
                          "score": round(i.impact / max(1, i.effort), 2), "auteur_id": p.auteur_id,
                          "auteur": noms.get(p.auteur_id, "Un coéquipier"), "a_moi": p.auteur_id == uid,
                          "commentaires": nb_com.get(i.id, 0), "prises": prises.get(i.id, []),
                          "je_prends": any(x["user_id"] == uid for x in prises.get(i.id, [])),
                          "partage_le": p.created_at.isoformat() if p.created_at else None})
        return {"items": items, "moi": uid}

    async def _idee_partagee(db, uid: str, idee_id: str):
        eq = await _exiger_equipe(db, uid)
        p = (await db.execute(select(EquipeIdeePartage).where(EquipeIdeePartage.idee_id == idee_id))).scalar_one_or_none()
        if not p or p.auteur_id not in {m["user_id"] for m in eq["membres"]}:
            raise HTTPException(404, "Cette idée n'est pas partagée avec ton équipe.")
        i = (await db.execute(select(Idee).where(Idee.id == idee_id))).scalar_one_or_none()
        if not i:
            raise HTTPException(404, "Idée introuvable.")
        return eq, p, i

    @api.get("/equipe/idees/{idee_id}/commentaires")
    async def equipe_commentaires(idee_id: str, db: AsyncSession = Depends(get_db)):
        eq, _p, _i = await _idee_partagee(db, _uid(), idee_id)
        noms = {m["user_id"]: m["nom"] for m in eq["membres"]}
        rows = (await db.execute(select(EquipeCommentaire).where(EquipeCommentaire.idee_id == idee_id)
                                 .order_by(EquipeCommentaire.created_at))).scalars()
        return {"items": [{"id": c.id, "auteur": noms.get(c.user_id, "Un coéquipier"), "moi": c.user_id == _uid(),
                           "texte": c.texte, "le": c.created_at.isoformat() if c.created_at else None} for c in rows]}

    class CommentaireIn(BaseModel):
        texte: str = Field(min_length=1, max_length=1000)

    @api.post("/equipe/idees/{idee_id}/commentaires")
    async def equipe_commenter(idee_id: str, body: CommentaireIn, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        eq, p, i = await _idee_partagee(db, uid, idee_id)
        texte = body.texte.strip()
        if not texte:
            raise HTTPException(422, "Écris un message.")
        c = EquipeCommentaire(idee_id=idee_id, user_id=uid, texte=texte)
        db.add(c)
        await db.commit()
        moi = next(m["nom"] for m in eq["membres"] if m["moi"])
        # Préviens l'auteur de l'idée (sauf si c'est lui qui écrit), pas toute l'équipe : pas de bruit.
        if p.auteur_id != uid:
            await _prevenir(db, [p.auteur_id], f"{moi} a commenté ton idée 💬", f"{i.titre[:80]} : {texte[:100]}", f"equipe-com:{c.id}")
        return {"ok": True, "id": c.id}

    @api.post("/equipe/idees/{idee_id}/prendre")
    async def equipe_prendre(idee_id: str, db: AsyncSession = Depends(get_db)):
        """Un coéquipier se charge de l'idée : une action est créée dans SON Plan d'action, une seule fois."""
        uid = _uid()
        eq, p, i = await _idee_partagee(db, uid, idee_id)
        if (await db.execute(select(EquipeIdeePrise).where(EquipeIdeePrise.idee_id == idee_id,
                                                           EquipeIdeePrise.user_id == uid))).scalar_one_or_none():
            raise HTTPException(409, "Tu as déjà pris cette idée : elle est dans ton Plan d'action.")
        t = VisionTache(user_id=uid, titre=i.titre[:300], duree_min=25, icon="Users", statut="a_faire")
        db.add(t)
        await db.flush()
        db.add(EquipeIdeePrise(idee_id=idee_id, user_id=uid, action_id=t.id))
        await db.commit()
        f_apres = g.get("_apres_creation_tache")  # carte Trello du coéquipier, si son Plan d'action est relié
        if f_apres:
            try:
                f_apres(uid, t.titre, t.duree_min)
            except Exception as e:  # noqa: BLE001
                log.warning("Carte Trello coéquipier : %s", e)
        moi = next(m["nom"] for m in eq["membres"] if m["moi"])
        if p.auteur_id != uid:
            await _prevenir(db, [p.auteur_id], f"{moi} prend ton idée 🙌", i.titre[:140], f"equipe-prise:{idee_id}:{uid}")
        return {"ok": True, "action_id": t.id}

    g["EquipeIdeePartage"] = EquipeIdeePartage
