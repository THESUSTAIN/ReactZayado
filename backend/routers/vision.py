"""Vision globale — la seule page branchée pour l'instant.

Chemins conservés depuis le projet déjà déployé :
  GET   /api/vision/globale              l'écran complet en une réponse
  POST  /api/bien-etre/energie           le check-in du jour
  PATCH /api/plan-action/{id}/fait       « C'est fait » sur une action
  POST  /api/victoires                   ajouter une victoire
"""

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.vision import (
    LIBELLES_ENERGIE,
    Action,
    ActionFaiteOut,
    AxeRoue,
    Board,
    Capacite,
    CheckinEnergieIn,
    CheckinEnergieOut,
    Energie,
    Finances,
    ImageBoard,
    JourEnergie,
    MoisFinance,
    Priorite,
    Score,
    Victoire,
    VictoireIn,
    VisionGlobale,
)

router = APIRouter()

# Un seul utilisateur pour l'instant : l'authentification viendra avec sa page.
from lib.utilisateur import uid  # noqa: E402

JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
JOURS_COURTS = ["L", "M", "M", "J", "V", "S", "D"]
MOIS = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]


def _aujourdhui() -> date:
    """« Aujourd'hui » est ancré côté serveur, jamais par le navigateur."""
    return datetime.now(timezone.utc).date()


def _date_label(jour: date) -> str:
    semaine = jour.isocalendar().week
    return f"{JOURS[jour.weekday()]} {jour.day} {MOIS[jour.month - 1]} · semaine {semaine}".upper()


def _capacite(niveau: int | None, rituels_faits: int, rituels_total: int, restantes: int) -> Capacite:
    """La capacité du jour plafonne la charge.

    Sans check-in, on n'invente aucun pourcentage et on ne masque rien :
    pourcentage à 0 côté API, le front affiche un tiret.
    """
    if niveau is None:
        return Capacite(pourcentage=0, actions_possibles=restantes, actions_masquees=0)
    part_rituels = (rituels_faits / rituels_total) if rituels_total else 0.0
    pourcentage = round(100 * (0.6 * niveau / 5 + 0.4 * part_rituels))
    if pourcentage < 30:
        possibles = 1
    elif pourcentage < 55:
        possibles = 2
    elif pourcentage < 80:
        possibles = 3
    else:
        possibles = 5
    return Capacite(
        pourcentage=pourcentage,
        actions_possibles=min(possibles, restantes),
        actions_masquees=max(0, restantes - possibles),
    )


async def _profil() -> dict:
    """Profil du Copilote : créé VIDE au premier passage, avec le prénom et l'offre réels du compte."""
    from lib.utilisateur import identite

    profil = await db.vision_profil.find_one({"user_id": uid()})
    if not profil:
        ident = await identite()
        profil = {"id": str(uuid.uuid4()), "user_id": uid(), "prenom": ident.get("prenom", ""),
                  "offre": ident.get("offre", "Rêveur"), "citation": "", "tresorerie": 0, "pro_pct": 0, "perso_pct": 0}
        await db.vision_profil.insert_one(dict(profil))
    return profil


async def _offre_reelle() -> str:
    """Offre payée du compte (jamais une valeur figée à la création du profil)."""
    from lib.utilisateur import identite
    return (await identite()).get("offre") or ""


async def _semaine_energie(jour: date) -> tuple[list[JourEnergie], int | None]:
    debut = (jour - timedelta(days=6)).isoformat()
    docs = await db.vision_checkins.find(
        {"user_id": uid(), "date": {"$gte": debut}}
    ).to_list(30)
    par_date = {d["date"]: d.get("niveau") for d in docs}
    semaine = [
        JourEnergie(
            date=(jour - timedelta(days=i)).isoformat(),
            jour=JOURS_COURTS[(jour - timedelta(days=i)).weekday()],
            niveau=par_date.get((jour - timedelta(days=i)).isoformat()),
        )
        for i in range(6, -1, -1)
    ]
    return semaine, par_date.get(jour.isoformat())


@router.get("/vision/globale", response_model=VisionGlobale)
async def vision_globale() -> VisionGlobale:
    jour = _aujourdhui()
    profil = await _profil()

    semaine, niveau = await _semaine_energie(jour)

    actions = await db.plan_actions.find({"user_id": uid()}).sort("ordre", 1).to_list(100)
    priorite_doc = next((a for a in actions if a.get("priorite")), None)
    autres = [a for a in actions if not a.get("priorite")]
    restantes = len([a for a in autres if not a.get("fait")])

    rituels = await db.vision_rituels.find({"user_id": uid()}).to_list(50)
    rituels_faits = len([r for r in rituels if r.get("fait_aujourdhui")])

    roue_docs = await db.vision_roue.find({"user_id": uid()}).sort("ordre", 1).to_list(20)
    roue = [AxeRoue(axe=d["axe"], score=d["score"]) for d in roue_docs]
    valeur_score = round(sum(a.score for a in roue) / len(roue)) if roue else 0

    mois_docs = await db.vision_finances.find({"user_id": uid()}).sort("ordre", 1).to_list(24)
    evolution = [MoisFinance(mois=d["mois"], revenus=d["revenus"], depenses=d["depenses"]) for d in mois_docs]
    moyenne_depenses = (sum(m.depenses for m in evolution) / len(evolution)) if evolution else 0.0
    tresorerie = float(profil.get("tresorerie", 0))
    dernier = evolution[-1] if evolution else None

    board_images = await db.vision_board_images.find({"user_id": uid()}).sort("ordre", 1).to_list(20)
    victoires_docs = await db.victoires.find({"user_id": uid()}).sort("date", -1).to_list(10)

    return VisionGlobale(
        prenom=profil["prenom"],
        offre=(await _offre_reelle()) or profil.get("offre", "Rêveur"),
        date_label=_date_label(jour),
        priorite=(
            Priorite(
                id=priorite_doc["id"],
                titre=priorite_doc["titre"],
                source=priorite_doc.get("source", ""),
                objectif=priorite_doc.get("objectif", ""),
                fait=bool(priorite_doc.get("fait")),
            )
            if priorite_doc
            else None
        ),
        capacite=_capacite(niveau, rituels_faits, len(rituels), restantes),
        score=Score(
            valeur=valeur_score,
            pro_pct=int(profil.get("pro_pct", 0)),
            perso_pct=int(profil.get("perso_pct", 0)),
            rituels_faits=rituels_faits,
            rituels_total=len(rituels),
        ),
        energie=Energie(
            niveau=niveau,
            libelle=LIBELLES_ENERGIE[niveau - 1] if niveau else None,
            semaine=semaine,
        ),
        board=Board(
            citation=profil.get("citation", ""),
            images=[
                ImageBoard(id=d["id"], url=d["url"], legende=d.get("legende", ""))
                for d in board_images
            ],
        ),
        finances=Finances(
            revenus_mois=dernier.revenus if dernier else 0.0,
            depenses_mois=dernier.depenses if dernier else 0.0,
            tresorerie=tresorerie,
            autonomie_mois=round(tresorerie / moyenne_depenses, 1) if moyenne_depenses else 0.0,
            evolution=evolution,
        ),
        roue=roue,
        priorites=[
            Action(
                id=a["id"],
                titre=a["titre"],
                module=a.get("module", ""),
                echeance=a.get("echeance", ""),
                fait=bool(a.get("fait")),
            )
            for a in autres
        ],
        victoires=[
            Victoire(id=d["id"], texte=d["texte"], date_label=d.get("date_label", ""))
            for d in victoires_docs
        ],
    )


@router.post("/bien-etre/energie", response_model=CheckinEnergieOut)
async def checkin_energie(body: CheckinEnergieIn) -> CheckinEnergieOut:
    jour = _aujourdhui()
    await db.vision_checkins.update_one(
        {"user_id": uid(), "date": jour.isoformat()},
        {
            "$set": {"niveau": body.niveau, "maj": datetime.now(timezone.utc).isoformat(timespec="seconds")},
            "$setOnInsert": {"id": str(uuid.uuid4()), "user_id": uid(), "date": jour.isoformat()},
        },
        upsert=True,
    )
    rituels = await db.vision_rituels.find({"user_id": uid()}).to_list(50)
    rituels_faits = len([r for r in rituels if r.get("fait_aujourdhui")])
    actions = await db.plan_actions.find({"user_id": uid(), "priorite": {"$ne": True}}).to_list(100)
    restantes = len([a for a in actions if not a.get("fait")])
    return CheckinEnergieOut(
        niveau=body.niveau,
        libelle=LIBELLES_ENERGIE[body.niveau - 1],
        capacite=_capacite(body.niveau, rituels_faits, len(rituels), restantes),
    )


@router.patch("/plan-action/{action_id}/fait", response_model=ActionFaiteOut)
async def action_faite(action_id: str) -> ActionFaiteOut:
    doc = await db.plan_actions.find_one({"user_id": uid(), "id": action_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Action introuvable")
    fait = not bool(doc.get("fait"))
    await db.plan_actions.update_one({"id": action_id}, {"$set": {"fait": fait}})
    return ActionFaiteOut(id=action_id, fait=fait)


@router.patch("/plan-action/{action_id}/reporter", response_model=ActionFaiteOut)
async def action_reportee(action_id: str) -> ActionFaiteOut:
    """Reporte la priorité du jour à demain : elle perd le statut de priorité,
    et la prochaine action non faite du Plan d'action prend sa place."""
    doc = await db.plan_actions.find_one({"user_id": uid(), "id": action_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Action introuvable")
    demain = _aujourdhui() + timedelta(days=1)
    await db.plan_actions.update_one({"id": action_id}, {"$set": {"priorite": False, "echeance": f"{demain.day} {MOIS[demain.month - 1]}"}})
    restantes = await db.plan_actions.find({"user_id": uid()}).sort("ordre", 1).to_list(500)
    suivante = next((a for a in restantes if not a.get("fait") and a.get("id") != action_id), None)
    if suivante:
        await db.plan_actions.update_one({"id": suivante["id"]}, {"$set": {"priorite": True}})
    return ActionFaiteOut(id=action_id, fait=bool(doc.get("fait")))


@router.post("/victoires", response_model=Victoire)
async def ajouter_victoire(body: VictoireIn) -> Victoire:
    jour = _aujourdhui()
    victoire = Victoire(
        id=str(uuid.uuid4()),
        texte=body.texte.strip(),
        date_label=f"{jour.day} {MOIS[jour.month - 1]}",
    )
    await db.victoires.insert_one(
        {**victoire.model_dump(), "user_id": uid(), "date": jour.isoformat()}
    )
    return victoire
