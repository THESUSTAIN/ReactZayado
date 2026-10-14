"""Plan d'action — le moyeu. La seule liste de choses à faire de l'application.

Chemins conservés depuis le projet déjà déployé :
  GET    /api/plan-action/vue           les trois colonnes + la capacité du jour
  POST   /api/plan-action/actions       ajouter une action
  POST   /api/plan-action/objectifs     ajouter un objectif
  POST   /api/plan-action/processus     ajouter un processus
  DELETE /api/plan-action/actions/{id}  retirer une action
  POST   /api/plan-action/processus/{id}/basculer   cocher le processus du jour

Le « fait » d'une action reste sur PATCH /api/plan-action/{id}/fait (routeur vision),
pour que l'accueil et cette page passent par exactement le même endroit.

La capacité du jour ne supprime rien : elle RANGE. Les actions au-delà du seuil
sont marquées `masquee` et restent consultables.
"""

import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.plan import (
    ActionIn,
    ActionPlan,
    CapacitePlan,
    ObjectifIn,
    ObjectifPlan,
    PlanVue,
    ProcessusIn,
    ProcessusPlan,
    SupprimeOut,
)
from models.vision import LIBELLES_ENERGIE

router = APIRouter(prefix="/plan-action")

from lib.utilisateur import uid  # noqa: E402
MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]


def _aujourdhui() -> date:
    return datetime.now(timezone.utc).date()


def _seuil(pourcentage: int) -> int:
    if pourcentage < 30:
        return 1
    if pourcentage < 55:
        return 2
    if pourcentage < 80:
        return 3
    return 5


@router.get("/vue", response_model=PlanVue)
async def plan_vue() -> PlanVue:
    jour = _aujourdhui()

    checkin = await db.vision_checkins.find_one({"user_id": uid(), "date": jour.isoformat()})
    niveau = checkin.get("niveau") if checkin else None
    rituels = await db.vision_rituels.find({"user_id": uid()}).to_list(50)
    rituels_faits = len([r for r in rituels if r.get("fait_aujourdhui")])
    part_rituels = (rituels_faits / len(rituels)) if rituels else 0.0
    pourcentage = round(100 * (0.6 * niveau / 5 + 0.4 * part_rituels)) if niveau else 0

    docs = await db.plan_actions.find({"user_id": uid()}).sort("ordre", 1).to_list(200)
    ouvertes = [d for d in docs if not d.get("fait")]
    possibles = _seuil(pourcentage) if niveau else len(ouvertes)

    actions: list[ActionPlan] = []
    rang_ouverte = 0
    for d in docs:
        ouverte = not d.get("fait")
        masquee = False
        if ouverte:
            # La priorité du jour n'est jamais masquée : c'est elle qui tient la journée.
            masquee = bool(niveau) and not d.get("priorite") and rang_ouverte >= possibles
            rang_ouverte += 1
        actions.append(
            ActionPlan(
                id=d["id"],
                titre=d["titre"],
                module=d.get("module", ""),
                echeance=d.get("echeance", ""),
                fait=bool(d.get("fait")),
                source=d.get("source", ""),
                priorite=bool(d.get("priorite")),
                masquee=masquee,
            )
        )

    objectifs_docs = await db.plan_objectifs.find({"user_id": uid()}).sort("ordre", 1).to_list(50)
    # L'objectif posé par le Pilotage avance tout seul : prospects signés ce mois au Radar.
    from routers.cercle import ID_OBJECTIF_CLIENTS, signes_du_mois
    if any(o.get("id") == ID_OBJECTIF_CLIENTS for o in objectifs_docs):
        signes = await signes_du_mois()
        for o in objectifs_docs:
            if o.get("id") == ID_OBJECTIF_CLIENTS:
                o["atteint"] = signes
    objectifs = [
        ObjectifPlan(
            id=o["id"],
            titre=o["titre"],
            cible=float(o["cible"]),
            atteint=float(o.get("atteint", 0)),
            unite=o.get("unite", ""),
            module=o.get("module", ""),
            pourcentage=min(100, round(100 * float(o.get("atteint", 0)) / float(o["cible"]))) if float(o["cible"]) else 0,
        )
        for o in objectifs_docs
    ]

    processus_docs = await db.plan_processus.find({"user_id": uid()}).sort("ordre", 1).to_list(50)
    processus = [
        ProcessusPlan(
            id=p["id"],
            titre=p["titre"],
            rythme=p.get("rythme", "quotidien"),
            serie=int(p.get("serie", 0)),
            fait_aujourdhui=p.get("dernier_jour") == jour.isoformat(),
        )
        for p in processus_docs
    ]

    return PlanVue(
        capacite=CapacitePlan(
            pourcentage=pourcentage,
            actions_possibles=min(possibles, len(ouvertes)),
            actions_masquees=len([a for a in actions if a.masquee]),
            libelle_energie=LIBELLES_ENERGIE[niveau - 1] if niveau else None,
        ),
        objectifs=objectifs,
        actions=actions,
        processus=processus,
        faites_aujourdhui=len([a for a in actions if a.fait]),
    )


@router.post("/actions", response_model=ActionPlan)
async def ajouter_action(body: ActionIn) -> ActionPlan:
    jour = _aujourdhui()
    dernier = await db.plan_actions.find({"user_id": uid()}).sort("ordre", -1).to_list(1)
    action = ActionPlan(
        id=str(uuid.uuid4()),
        titre=body.titre.strip(),
        module=body.module or "Plan",
        echeance=body.echeance or f"{jour.day} {MOIS[jour.month - 1]}",
        fait=False,
        source="saisie manuelle",
    )
    await db.plan_actions.insert_one({
        **action.model_dump(exclude={"masquee"}),
        "user_id": uid(),
        "priorite": False,
        "ordre": (dernier[0]["ordre"] + 1) if dernier else 100,
    })
    return action


@router.delete("/actions/{action_id}", response_model=SupprimeOut)
async def supprimer_action(action_id: str) -> SupprimeOut:
    res = await db.plan_actions.delete_one({"user_id": uid(), "id": action_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Action introuvable")
    return SupprimeOut(id=action_id, supprime=True)


@router.post("/objectifs", response_model=ObjectifPlan)
async def ajouter_objectif(body: ObjectifIn) -> ObjectifPlan:
    dernier = await db.plan_objectifs.find({"user_id": uid()}).sort("ordre", -1).to_list(1)
    objectif = ObjectifPlan(
        id=str(uuid.uuid4()),
        titre=body.titre.strip(),
        cible=body.cible,
        atteint=0,
        unite=body.unite,
        module="Plan",
        pourcentage=0,
    )
    await db.plan_objectifs.insert_one({
        **objectif.model_dump(exclude={"pourcentage"}),
        "user_id": uid(),
        "ordre": (dernier[0]["ordre"] + 1) if dernier else 100,
    })
    return objectif


@router.post("/processus", response_model=ProcessusPlan)
async def ajouter_processus(body: ProcessusIn) -> ProcessusPlan:
    dernier = await db.plan_processus.find({"user_id": uid()}).sort("ordre", -1).to_list(1)
    processus = ProcessusPlan(id=str(uuid.uuid4()), titre=body.titre.strip(), rythme=body.rythme, serie=0)
    await db.plan_processus.insert_one({
        **processus.model_dump(exclude={"fait_aujourdhui"}),
        "user_id": uid(),
        "dernier_jour": None,
        "ordre": (dernier[0]["ordre"] + 1) if dernier else 100,
    })
    return processus


@router.post("/processus/{processus_id}/basculer", response_model=ProcessusPlan)
async def basculer_processus(processus_id: str) -> ProcessusPlan:
    doc = await db.plan_processus.find_one({"user_id": uid(), "id": processus_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Processus introuvable")
    jour = _aujourdhui().isoformat()
    deja = doc.get("dernier_jour") == jour
    serie = max(0, int(doc.get("serie", 0)) - 1) if deja else int(doc.get("serie", 0)) + 1
    await db.plan_processus.update_one(
        {"id": processus_id},
        {"$set": {"dernier_jour": None if deja else jour, "serie": serie}},
    )
    return ProcessusPlan(
        id=processus_id,
        titre=doc["titre"],
        rythme=doc.get("rythme", "quotidien"),
        serie=serie,
        fait_aujourdhui=not deja,
    )
