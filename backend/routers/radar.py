"""Radar — le dehors. Il répond à la question posée par le Pilotage.

Chemins conservés depuis le projet déjà déployé :
  GET   /api/radar/vue?mode=              l'écran complet (signaux, sources, pipeline)
  GET   /api/radar/signaux?mode=          le fil seul
  GET   /api/radar/sources                ce qui alimente le Radar, en clair
  GET   /api/radar/prospects              le pipeline
  PATCH /api/radar/prospects/{pid}        changer d'étape
  POST  /api/radar/signaux/{id}/prendre   → écrit une action dans le Plan d'action
  POST  /api/radar/signaux/{id}/ecarter   → définitif
  POST  /api/radar/opposition             registre d'opposition
  PUT   /api/radar/reglages               clientèle, zone, mots-clés

Deux règles du produit tenues ici :
  1. le Radar PROPOSE, il n'écrit jamais seul — « prendre » crée l'action, rien d'autre ;
  2. aucun fait n'est inventé : source et date sont obligatoires, et un fil vide
     reste vide plutôt que d'être rempli de signaux fabriqués.
"""

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from lib.db import db
from models.radar import (
    ETAPES,
    LIBELLES_ETAPES,
    EcarterOut,
    EtapeCompte,
    EtapeIn,
    Metrique,
    Objectif,
    OppositionIn,
    PrendreOut,
    Prospect,
    RadarVue,
    Reglages,
    ReglagesIn,
    Signal,
    Source,
)

router = APIRouter(prefix="/radar")

from lib.utilisateur import uid  # noqa: E402
MOIS = [
    "janv.", "févr.", "mars", "avr.", "mai", "juin",
    "juil.", "août", "sept.", "oct.", "nov.", "déc.",
]


def _aujourdhui() -> date:
    return datetime.now(timezone.utc).date()


def _fraicheur(date_fait: str) -> str:
    """La fraîcheur est calculée, jamais stockée : un signal vieillit tout seul."""
    try:
        jours = (_aujourdhui() - date.fromisoformat(date_fait)).days
    except ValueError:
        return ""
    if jours <= 0:
        return "aujourd'hui"
    if jours == 1:
        return "hier"
    if jours < 31:
        return f"il y a {jours} jours"
    mois = jours // 30
    return f"il y a {mois} mois" if mois > 1 else "il y a 1 mois"


def _signal(doc: dict) -> Signal:
    metrique = doc.get("metrique")
    return Signal(
        id=doc["id"],
        mode=doc["mode"],
        categorie=doc["categorie"],
        source=doc["source"],
        cible=doc["cible"],
        fait=doc["fait"],
        date_fait=doc["date_fait"],
        fraicheur=_fraicheur(doc["date_fait"]),
        pourquoi=doc.get("pourquoi", ""),
        lien=doc.get("lien"),
        secteur=doc.get("secteur", ""),
        zone=doc.get("zone", ""),
        statut=doc.get("statut", "nouveau"),
        secondaire=bool(doc.get("secondaire")),
        metrique=Metrique(**metrique) if metrique else None,
    )


async def _reglages() -> Reglages:
    doc = await db.radar_reglages.find_one({"user_id": uid()})
    doc = doc or {}  # démarre vide : aucun réglage inventé
    return Reglages(
        clientele=doc.get("clientele", "les_deux"),
        zone=doc.get("zone", ""),
        mots_cles=doc.get("mots_cles", []),
    )


async def _objectif() -> Objectif:
    """L'objectif n'est pas saisi dans le Radar : il vient du Pilotage."""
    doc = await db.pilotage_objectif.find_one({"user_id": uid()})
    if not doc:
        return Objectif(clients_vises=0, signes=0, a_trouver=0, source="Pilotage — aucun objectif défini")
    from routers.cercle import signes_du_mois
    vises, signes = int(doc.get("clients_vises", 0)), await signes_du_mois()
    return Objectif(
        clients_vises=vises,
        signes=signes,
        a_trouver=max(0, vises - signes),
        source=doc.get("source", "Pilotage"),
    )


async def _signaux(mode: str) -> list[Signal]:
    docs = await db.radar_signaux.find(
        {"user_id": uid(), "mode": mode, "statut": {"$ne": "ecarte"}}
    ).sort("date_fait", -1).to_list(200)
    # Les prescripteurs sont un canal lent : ils passent toujours en dernier.
    return sorted([_signal(d) for d in docs], key=lambda s: (s.secondaire, s.statut == "pris"))


async def _pipeline() -> tuple[list[Prospect], list[EtapeCompte]]:
    docs = await db.radar_prospects.find({"user_id": uid()}).sort("maj", -1).to_list(200)
    prospects = [
        Prospect(id=d["id"], nom=d["nom"], etape=d.get("etape", "nouveau"), source=d.get("source", ""), maj=d.get("maj", ""))
        for d in docs
    ]
    comptes = [
        EtapeCompte(cle=e, libelle=LIBELLES_ETAPES[e], nombre=len([p for p in prospects if p.etape == e]))
        for e in ETAPES
    ]
    return prospects, comptes


async def _sources(mode: str) -> list[Source]:
    docs = await db.radar_sources.find({"user_id": uid(), "mode": mode}).sort("ordre", 1).to_list(50)
    if not docs:  # sources réelles et leur état (clé présente ou non), jamais un faux « connecté »
        from routers.copilote import sources_par_defaut
        return [Source(**x) for x in await sources_par_defaut(mode)]
    return [
        Source(
            cle=d["cle"], nom=d["nom"], role=d["role"],
            actif=bool(d.get("actif")), etat=d.get("etat", ""),
            detail=d.get("detail", ""), payante=bool(d.get("payante")),
        )
        for d in docs
    ]


@router.get("/vue", response_model=RadarVue)
async def radar_vue(mode: str = Query("entreprises", pattern="^(entreprises|particuliers)$")) -> RadarVue:
    prospects, pipeline = await _pipeline()
    return RadarVue(
        objectif=await _objectif(),
        reglages=await _reglages(),
        signaux=await _signaux(mode),
        sources=await _sources(mode),
        prospects=prospects,
        pipeline=pipeline,
        opposition=await db.radar_opposition.count_documents({"user_id": uid()}),
    )


@router.get("/signaux", response_model=list[Signal])
async def radar_signaux(mode: str = Query("entreprises", pattern="^(entreprises|particuliers)$")) -> list[Signal]:
    return await _signaux(mode)


@router.get("/sources", response_model=list[Source])
async def radar_sources(mode: str = Query("entreprises", pattern="^(entreprises|particuliers)$")) -> list[Source]:
    return await _sources(mode)


@router.get("/prospects", response_model=list[Prospect])
async def radar_prospects() -> list[Prospect]:
    prospects, _ = await _pipeline()
    return prospects


def _sequence(doc: dict) -> list[tuple[str, int]]:
    """« Prendre » n'a pas le même effet selon le signal (plan/radar.md) : (titre, jours après aujourd'hui)."""
    cible, cat = doc["cible"], doc.get("categorie", "")
    if doc["mode"] == "entreprises":
        return [(doc.get("action") or f"Contacter {cible}", 0), (f"Relancer {cible} (J+5)", 5), (f"Relancer {cible} (J+12)", 12)]
    if cat == "entrante":  # la personne a levé la main : on répond aujourd'hui
        return [(doc.get("action") or f"Répondre à {cible}", 0)]
    if cat == "demande":  # un sujet, jamais une personne
        return [(f"Publier un contenu sur « {cible} »", 0)]
    if cat == "bassin":
        return [(f"Reprendre contact avec {cible}", 0), (f"Demander un avis à {cible}", 3), (f"Demander une recommandation à {cible}", 7)]
    if cat == "prescripteur":
        return [(f"Proposer un partenariat à {cible} (réciprocité)", 0), (f"Relancer {cible}", 10)]
    return [(doc.get("action") or f"Traiter le signal : {cible}", 0)]


@router.post("/signaux/{signal_id}/prendre", response_model=PrendreOut)
async def prendre_signal(signal_id: str) -> PrendreOut:
    """« Prendre » déclenche la chaîne : le signal devient des actions datées du Plan d'action
    (séquence selon le type de signal), et un prospect quand il y a une personne ou une entreprise."""
    doc = await db.radar_signaux.find_one({"user_id": uid(), "id": signal_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Signal introuvable")
    if doc.get("statut") == "pris":
        raise HTTPException(status_code=409, detail="Signal déjà pris")

    jour = _aujourdhui()
    dernier = await db.plan_actions.find({"user_id": uid()}).sort("ordre", -1).to_list(1)
    ordre = (dernier[0]["ordre"] + 1) if dernier else 100
    premiere: tuple[str, str] | None = None
    for i, (titre, decalage) in enumerate(_sequence(doc)):
        quand = jour + timedelta(days=decalage)
        action_id = str(uuid.uuid4())
        await db.plan_actions.insert_one({
            "id": action_id, "user_id": uid(), "titre": titre[:200], "module": "Radar",
            "echeance": f"{quand.day} {MOIS[quand.month - 1]}",
            "source": f"{doc['source']} du {doc['date_fait']}", "fait": False, "priorite": False,
            "ordre": ordre + i, "signal_id": signal_id,
        })
        premiere = premiere or (action_id, titre)

    prospect_id = None
    if doc["mode"] == "entreprises" or doc.get("categorie") in ("entrante", "bassin", "prescripteur"):
        prospect_id = str(uuid.uuid4())
        await db.radar_prospects.insert_one({
            "id": prospect_id,
            "user_id": uid(),
            "nom": doc["cible"],
            "etape": "nouveau",
            "source": doc["source"],
            "maj": jour.isoformat(),
            "signal_id": signal_id,
        })

    await db.radar_signaux.update_one({"id": signal_id}, {"$set": {"statut": "pris"}})
    return PrendreOut(signal_id=signal_id, action_id=premiere[0], action_titre=premiere[1], prospect_id=prospect_id)


@router.post("/signaux/{signal_id}/tunnel")
async def signal_vers_tunnel(signal_id: str):
    """Un sujet dont la demande monte → un tunnel pré-rédigé sur ce sujet, en un clic."""
    doc = await db.radar_signaux.find_one({"user_id": uid(), "id": signal_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Signal introuvable")
    from routers.cercle import TunnelAutoIn, creer_tunnel_auto
    return await creer_tunnel_auto(TunnelAutoIn(sujet=doc["cible"], origine=f"Radar — {doc['source']}", signal_id=signal_id))


class ProspectManuelIn(BaseModel):
    nom: str = Field(min_length=2, max_length=160)
    note: str = Field(default="", max_length=300)
    action: bool = True


@router.post("/prospects", response_model=Prospect)
async def ajouter_prospect(body: ProspectManuelIn) -> Prospect:
    """Saisie manuelle : un prospect connu de l'utilisateur entre dans le pipeline
    (source « Saisie manuelle », rien d'inventé) et, au choix, une action de premier contact."""
    jour = _aujourdhui()
    doc = {"id": str(uuid.uuid4()), "user_id": uid(), "nom": body.nom.strip(), "etape": "nouveau",
           "source": "Saisie manuelle", "maj": jour.isoformat(), "note": body.note.strip()}
    await db.radar_prospects.insert_one(dict(doc))
    if body.action:
        dernier = await db.plan_actions.find({"user_id": uid()}).sort("ordre", -1).to_list(1)
        await db.plan_actions.insert_one({
            "id": str(uuid.uuid4()), "user_id": uid(), "titre": f"Premier contact : {doc['nom']}"[:200],
            "module": "Radar", "echeance": f"{jour.day} {MOIS[jour.month - 1]}", "source": "Saisie manuelle",
            "fait": False, "priorite": False, "ordre": (dernier[0]["ordre"] + 1) if dernier else 100,
        })
    return Prospect(id=doc["id"], nom=doc["nom"], etape="nouveau", source=doc["source"], maj=doc["maj"])


@router.post("/signaux/{signal_id}/ecarter", response_model=EcarterOut)
async def ecarter_signal(signal_id: str) -> EcarterOut:
    """« Écarter » est définitif : le signal ne remonte plus."""
    res = await db.radar_signaux.update_one(
        {"user_id": uid(), "id": signal_id}, {"$set": {"statut": "ecarte"}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Signal introuvable")
    return EcarterOut(
        signal_id=signal_id,
        statut="ecarte",
        opposition=await db.radar_opposition.count_documents({"user_id": uid()}),
    )


@router.patch("/prospects/{prospect_id}", response_model=Prospect)
async def changer_etape(prospect_id: str, body: EtapeIn) -> Prospect:
    doc = await db.radar_prospects.find_one({"user_id": uid(), "id": prospect_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Prospect introuvable")
    maj = _aujourdhui().isoformat()
    champs = {"etape": body.etape, "maj": maj}
    if body.etape == "signe" and doc.get("etape") != "signe":
        champs["signe_le"] = maj  # compte pour l'objectif du mois (Pilotage → Plan d'action)
    await db.radar_prospects.update_one({"id": prospect_id}, {"$set": champs})
    if "signe_le" in champs:
        await _feter_objectif(doc["nom"])
    return Prospect(id=prospect_id, nom=doc["nom"], etape=body.etape, source=doc.get("source", ""), maj=maj)


async def _feter_objectif(nom: str) -> None:
    """Client signé : si l'objectif du mois (calculé par le Pilotage) vient d'être atteint, on le fête — une fois par mois."""
    from lib.notifs import notifier
    from routers.cercle import signes_du_mois
    obj = await db.pilotage_objectif.find_one({"user_id": uid()}) or {}
    vises = int(obj.get("clients_vises") or 0)
    if not vises:
        return
    signes = await signes_du_mois()
    if signes == vises:
        mois = _aujourdhui().strftime("%Y-%m")
        await notifier(uid(), "objectif", "Objectif du mois atteint 🎉",
                       f"{nom} vient de signer : {signes} client{'s' if signes > 1 else ''} sur {vises}. Tes charges du mois sont couvertes.",
                       "/", cle=f"objectif:{uid()}:{mois}")


@router.post("/opposition", response_model=EcarterOut)
async def ajouter_opposition(body: OppositionIn) -> EcarterOut:
    """Registre d'opposition : toute demande de non-sollicitation bloque la
    remontée pour toujours, et les signaux correspondants sont écartés."""
    valeur = body.valeur.strip()
    await db.radar_opposition.update_one(
        {"user_id": uid(), "valeur": valeur},
        {"$setOnInsert": {"id": str(uuid.uuid4()), "user_id": uid(), "valeur": valeur,
                          "ajoute_le": _aujourdhui().isoformat()}},
        upsert=True,
    )
    await db.radar_signaux.update_many(
        {"user_id": uid(), "cible": valeur}, {"$set": {"statut": "ecarte"}}
    )
    return EcarterOut(
        signal_id="",
        statut="ecarte",
        opposition=await db.radar_opposition.count_documents({"user_id": uid()}),
    )


@router.put("/reglages", response_model=Reglages)
async def maj_reglages(body: ReglagesIn) -> Reglages:
    champs = {k: v for k, v in body.model_dump().items() if v is not None}
    if champs:
        await db.radar_reglages.update_one({"user_id": uid()}, {"$set": champs}, upsert=True)
    return await _reglages()
