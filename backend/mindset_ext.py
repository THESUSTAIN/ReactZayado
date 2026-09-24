"""
Bien-être & Mindset : carte du jour, parcours de 7 jours, carnet privé,
recadrage d'une pensée qui bloque, déclencheurs au bon moment, et
mini-exercice public intégrable dans les articles du Journal Shopify.

Déclencheurs (suggestion contextuelle) :
  • énergie ≤ 2 sur les 3 derniers check-ins → carte « Journée allégée »
  • prospect marqué « écarté » dans le Radar (3 derniers jours) → parcours « Rebondir »
  • chiffre du mois < 50 % de l'objectif (Pouls business) → parcours « Revenus irréguliers »
"""
import asyncio
import hashlib
import json
import logging
import re
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import JSON, DateTime, String, Text, UniqueConstraint, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from mindset_contenus import CARTE_ALLEGEE, CARTES, MINI, PARCOURS

log = logging.getLogger("kairos.mindset")
PAR_ID = {p["id"]: p for p in PARCOURS}

# Détresse : on ne « recadre » pas, on oriente vers une aide humaine.
MOTS_DETRESSE = ("suicide", "suicid", "me tuer", "en finir", "plus envie de vivre", "me faire du mal",
                 "mourir", "disparaître pour toujours", "disparaitre pour toujours", "je veux mourir")
MESSAGE_DETRESSE = (
    "Ce que tu écris a l'air très lourd, et c'est important de ne pas rester seul avec ça. "
    "Tu peux appeler le 3114, numéro national de prévention du suicide : gratuit, 24 h/24, 7 j/7. "
    "En cas de danger immédiat, appelle le 15 ou le 112. Parler à un proche ou à ton médecin peut aussi aider."
)


def carte_du_jour(uid: str, jour: date) -> dict:
    """Carte stable pour la journée, différente d'un jour à l'autre et d'une personne à l'autre."""
    h = int(hashlib.sha256(f"{uid}:{jour.isoformat()}".encode()).hexdigest(), 16)
    return CARTES[h % len(CARTES)]


def detresse(texte: str) -> bool:
    t = (texte or "").lower()
    return any(m in t for m in MOTS_DETRESSE)


def install_mindset(g: dict) -> None:
    api, Base, get_db = g["api"], g["Base"], g["get_db"]
    _uid, new_uuid, utcnow, logger = g["_uid"], g["new_uuid"], g["utcnow"], g["logger"]

    class MindsetEntree(Base):
        __tablename__ = "mindset_entrees"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        source: Mapped[str] = mapped_column(String(20))           # carte | parcours | pensee
        ref: Mapped[str] = mapped_column(String(80))               # id carte, « parcours:jour », etc.
        titre: Mapped[str] = mapped_column(String(200), default="")
        reponses: Mapped[list] = mapped_column(JSON, default=list)  # [{question, reponse}]
        jour: Mapped[str] = mapped_column(String(10), index=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    class MindsetParcours(Base):
        __tablename__ = "mindset_parcours"
        __table_args__ = (UniqueConstraint("user_id", "parcours_id", name="uq_mindset_parcours"),)
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        parcours_id: Mapped[str] = mapped_column(String(40))
        jours_faits: Mapped[list] = mapped_column(JSON, default=list)
        derniere_date: Mapped[str] = mapped_column(String(10), nullable=True)
        demarre_le: Mapped[str] = mapped_column(String(10))
        termine_le: Mapped[str] = mapped_column(String(10), nullable=True)

    g["MindsetEntree"], g["MindsetParcours"] = MindsetEntree, MindsetParcours

    def _suivi_json(p: dict, s: Optional[MindsetParcours]) -> dict:
        faits = sorted(set((s.jours_faits or []) if s else []))
        prochain = next((n for n in range(1, 8) if n not in faits), None)
        aujourd = date.today().isoformat()
        dispo = bool(s) and prochain is not None and (not s.derniere_date or s.derniere_date < aujourd or not faits)
        return {"id": p["id"], "titre": p["titre"], "sous_titre": p["sous_titre"], "pour_qui": p["pour_qui"],
                "couleur": p["couleur"], "demarre": bool(s), "jours_faits": faits, "prochain_jour": prochain,
                "jour_disponible": dispo, "termine": bool(s and s.termine_le),
                "jours": [{"n": i + 1, "titre": j["titre"]} for i, j in enumerate(p["jours"])]}

    async def _suivis(db, uid) -> dict:
        rows = (await db.execute(select(MindsetParcours).where(MindsetParcours.user_id == uid))).scalars().all()
        return {r.parcours_id: r for r in rows}

    async def _suggestion(db, uid) -> Optional[dict]:
        """Le bon exercice au bon moment, à partir des vraies données du compte."""
        VisionCheckin = g.get("VisionCheckin")
        if VisionCheckin is not None:
            derniers = (await db.execute(select(VisionCheckin).where(VisionCheckin.user_id == uid)
                                         .order_by(VisionCheckin.date.desc()).limit(3))).scalars().all()
            if len(derniers) == 3 and all((c.energie or 5) <= 2 for c in derniers):
                return {"type": "carte", "raison": "Ton énergie est basse depuis 3 check-ins.", "carte": CARTE_ALLEGEE}
        RadarProspect = g.get("RadarProspect")
        if RadarProspect is not None:
            depuis = (date.today() - timedelta(days=3)).isoformat()
            ecarte = (await db.execute(select(RadarProspect).where(
                RadarProspect.user_id == uid, RadarProspect.statut == "ecarte", RadarProspect.jour >= depuis).limit(1))).scalar_one_or_none()
            if ecarte:
                return {"type": "parcours", "raison": "Tu as essuyé un refus récemment.", "parcours": "rebondir"}
        Pouls = g.get("VisionPoulsBusiness")
        if Pouls is not None:
            p = (await db.execute(select(Pouls).where(Pouls.user_id == uid))).scalar_one_or_none()
            if p and p.ca_objectif and p.ca_mensuel < 0.5 * p.ca_objectif and date.today().day >= 15:
                return {"type": "parcours", "raison": "Ton chiffre du mois est sous la moitié de ton objectif.", "parcours": "revenus-irreguliers"}
        return None

    @api.get("/mindset/aujourdhui")
    async def mindset_aujourdhui(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        jour = date.today()
        carte = carte_du_jour(uid, jour)
        fait = (await db.execute(select(MindsetEntree).where(MindsetEntree.user_id == uid, MindsetEntree.jour == jour.isoformat(),
                                                             MindsetEntree.source == "carte"))).scalars().first()
        suivis = await _suivis(db, uid)
        actif = next((_suivi_json(PAR_ID[k], s) for k, s in suivis.items() if k in PAR_ID and not s.termine_le), None)
        sugg = await _suggestion(db, uid)
        if sugg and sugg["type"] == "parcours":
            sugg["parcours"] = _suivi_json(PAR_ID[sugg["parcours"]], suivis.get(sugg["parcours"]))
        return {"carte": carte, "carte_faite": bool(fait), "parcours_actif": actif, "suggestion": sugg}

    @api.get("/mindset/parcours")
    async def mindset_parcours(db: AsyncSession = Depends(get_db)):
        suivis = await _suivis(db, _uid())
        return {"items": [_suivi_json(p, suivis.get(p["id"])) for p in PARCOURS]}

    @api.get("/mindset/parcours/{pid}")
    async def mindset_parcours_detail(pid: str, db: AsyncSession = Depends(get_db)):
        p = PAR_ID.get(pid)
        if not p:
            raise HTTPException(404, "Parcours introuvable.")
        uid = _uid()
        s = (await _suivis(db, uid)).get(pid)
        suivi = _suivi_json(p, s)
        entrees = (await db.execute(select(MindsetEntree).where(MindsetEntree.user_id == uid, MindsetEntree.source == "parcours",
                                                                MindsetEntree.ref.like(f"{pid}:%")))).scalars().all()
        par_jour = {int(e.ref.split(":")[1]): e.reponses for e in entrees if e.ref.split(":")[1].isdigit()}
        suivi["contenu"] = [{"n": i + 1, **j, "reponses": par_jour.get(i + 1)} for i, j in enumerate(p["jours"])]
        return suivi

    @api.post("/mindset/parcours/{pid}/demarrer")
    async def mindset_demarrer(pid: str, db: AsyncSession = Depends(get_db)):
        if pid not in PAR_ID:
            raise HTTPException(404, "Parcours introuvable.")
        uid = _uid()
        s = (await _suivis(db, uid)).get(pid)
        if not s:
            db.add(MindsetParcours(user_id=uid, parcours_id=pid, jours_faits=[], demarre_le=date.today().isoformat()))
            await db.commit()
        return await mindset_parcours_detail(pid, db)

    class ReponsesIn(BaseModel):
        source: str = Field(pattern="^(carte|parcours)$")
        ref: str = Field(max_length=80)
        reponses: list[str] = Field(default_factory=list, max_length=6)

    @api.post("/mindset/reponses")
    async def mindset_reponses(body: ReponsesIn, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        aujourd = date.today().isoformat()
        textes = [str(r or "").strip()[:2000] for r in body.reponses]
        if not any(textes):
            raise HTTPException(400, "Écris au moins une réponse.")
        victoire = None
        if body.source == "carte":
            carte = next((c for c in CARTES + [CARTE_ALLEGEE] if c["id"] == body.ref), None)
            if not carte:
                raise HTTPException(404, "Carte introuvable.")
            titre, questions = carte["titre"], carte["questions"]
        else:
            m = re.fullmatch(r"([a-z-]+):([1-7])", body.ref)
            if not m or m.group(1) not in PAR_ID:
                raise HTTPException(400, "Référence de parcours invalide.")
            pid, n = m.group(1), int(m.group(2))
            s = (await _suivis(db, uid)).get(pid)
            if not s:
                s = MindsetParcours(user_id=uid, parcours_id=pid, jours_faits=[], demarre_le=aujourd)
                db.add(s)
            suivi = _suivi_json(PAR_ID[pid], s)
            if n not in suivi["jours_faits"] and n != suivi["prochain_jour"]:
                raise HTTPException(409, "Termine d'abord le jour précédent.")
            if n == suivi["prochain_jour"] and suivi["jours_faits"] and s.derniere_date == aujourd:
                raise HTTPException(409, "Un jour à la fois : le suivant se débloque demain.")
            jour = PAR_ID[pid]["jours"][n - 1]
            titre, questions = f"{PAR_ID[pid]['titre']} · Jour {n} — {jour['titre']}", jour["questions"]
            if n not in (s.jours_faits or []):
                s.jours_faits = sorted(set((s.jours_faits or []) + [n]))
                s.derniere_date = aujourd
                if len(s.jours_faits) == 7:
                    s.termine_le = aujourd
                    Victoire = g.get("VisionVictoire")
                    if Victoire is not None:
                        victoire = f"Parcours « {PAR_ID[pid]['titre']} » terminé"
                        db.add(Victoire(user_id=uid, texte=victoire, detail="7 jours de pratique Mindset", date=aujourd))
            ancienne = (await db.execute(select(MindsetEntree).where(MindsetEntree.user_id == uid, MindsetEntree.source == "parcours",
                                                                     MindsetEntree.ref == body.ref))).scalar_one_or_none()
            if ancienne:
                await db.delete(ancienne)
        e = MindsetEntree(user_id=uid, source=body.source, ref=body.ref, titre=titre, jour=aujourd,
                          reponses=[{"question": q, "reponse": r} for q, r in zip(questions, textes)])
        db.add(e)
        await db.commit()
        return {"ok": True, "id": e.id, "victoire": victoire}

    @api.get("/mindset/carnet")
    async def mindset_carnet(db: AsyncSession = Depends(get_db)):
        rows = (await db.execute(select(MindsetEntree).where(MindsetEntree.user_id == _uid())
                                 .order_by(MindsetEntree.created_at.desc()).limit(300))).scalars().all()
        return {"items": [{"id": r.id, "source": r.source, "ref": r.ref, "titre": r.titre, "jour": r.jour,
                           "reponses": r.reponses or []} for r in rows]}

    @api.delete("/mindset/carnet/{eid}")
    async def mindset_carnet_supprimer(eid: str, db: AsyncSession = Depends(get_db)):
        r = (await db.execute(select(MindsetEntree).where(MindsetEntree.id == eid, MindsetEntree.user_id == _uid()))).scalar_one_or_none()
        if not r:
            raise HTTPException(404, "Entrée introuvable.")
        await db.delete(r)
        await db.commit()
        return {"ok": True}

    class PenseeIn(BaseModel):
        pensee: str = Field(min_length=3, max_length=600)

    @api.post("/mindset/recadrer")
    async def mindset_recadrer(body: PenseeIn, db: AsyncSession = Depends(get_db)):
        """Aide à prendre du recul sur une pensée qui bloque (outil de réflexion, pas de diagnostic)."""
        uid = _uid()
        if detresse(body.pensee):
            return {"detresse": True, "message": MESSAGE_DETRESSE}
        res = None
        f = g.get("_client_llm")
        client = f(f"mindset-{uid}-{date.today()}", (
            "Tu aides un entrepreneur à prendre du recul sur une pensée qui le freine, avec bienveillance et lucidité, "
            "sans diagnostic, sans jargon psychologique, sans promesse. Tutoiement. Réponds UNIQUEMENT en JSON : "
            '{"faits":"ce qui est factuel dans la situation (1 phrase)","autre_regard":"une lecture plus juste et nuancée (2 phrases)",'
            '"petit_pas":"une action concrète de moins de 10 minutes"}')) if f else None
        if client is not None:
            try:
                from llm_mammouth import UserMessage
                texte = await asyncio.wait_for(client.send_message(UserMessage(text=body.pensee)), timeout=25)
                m = re.search(r"\{.*\}", str(texte), re.S)
                d = json.loads(m.group(0)) if m else {}
                if d.get("autre_regard"):
                    res = {k: str(d.get(k) or "")[:600] for k in ("faits", "autre_regard", "petit_pas")}
            except Exception as e:  # noqa: BLE001
                logger.info("Recadrage IA indisponible (%s)", e)
        if not res:
            res = {"faits": "Note ce qui s'est réellement passé, sans interprétation.",
                   "autre_regard": "Une pensée n'est pas un fait. Demande-toi ce que tu dirais à un ami qui pense la même chose.",
                   "petit_pas": "Écris une seule petite action qui irait dans le sens contraire de cette pensée, et fais-la aujourd'hui."}
        db.add(MindsetEntree(user_id=uid, source="pensee", ref="recadrage", titre="Une pensée qui bloque", jour=date.today().isoformat(),
                             reponses=[{"question": "La pensée", "reponse": body.pensee.strip()},
                                       {"question": "Les faits", "reponse": res["faits"]},
                                       {"question": "Un autre regard", "reponse": res["autre_regard"]},
                                       {"question": "Mon petit pas", "reponse": res["petit_pas"]}]))
        await db.commit()
        return {"detresse": False, **res}

    # ── Public : mini-exercice intégré dans les articles du Journal Shopify ──
    @api.get("/public/mindset/{slug}")
    async def mindset_public(slug: str):
        m = MINI.get(slug)
        if not m:
            raise HTTPException(404, "Exercice introuvable.")
        return m
