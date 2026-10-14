"""Pilotage financier — les chiffres, et seulement ceux qui viennent d'un fichier.

  GET    /api/pilotage/vue                 l'écran complet
  POST   /api/pilotage/imports             importer un FEC, un CSV ou un Excel (base64)
  POST   /api/pilotage/imports/exemple     charger le jeu d'essai sur 6 mois
  DELETE /api/pilotage/imports/{id}        retirer un import et tout ce qu'il apportait

Un import écrit aussi dans `vision_finances` et la trésorerie du profil : l'accueil
et le Pilotage lisent les mêmes chiffres, il n'y a pas deux vérités.
Aucun chiffre n'est produit sans écriture importée — sans import, tout est à zéro
et le point mort est `null`.
"""

import base64
import math
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from lib.db import db
from routers.cercle import synchroniser_objectif
from lib.fec import FichierIllisible, fec_exemple, libelle_mois, lire_fichier
from models.pilotage import (
    ImportFichier,
    ImportIn,
    MoisPilotage,
    PilotageVue,
    PointMort,
    Tresorerie,
)
from models.plan import SupprimeOut

router = APIRouter(prefix="/pilotage")

from lib.utilisateur import uid  # noqa: E402


def _maintenant() -> datetime:
    return datetime.now(timezone.utc)


async def _mois_cumules() -> dict[str, dict[str, float]]:
    """Fusionne les mois de tous les imports : deux fichiers peuvent se compléter."""
    cumul: dict[str, dict[str, float]] = {}
    docs = await db.pilotage_imports.find({"user_id": uid()}).to_list(100)
    for doc in docs:
        for cle, seau in (doc.get("mois") or {}).items():
            cible = cumul.setdefault(
                cle, {"revenus": 0.0, "charges_fixes": 0.0, "charges_variables": 0.0, "ventes": 0.0}
            )
            for champ in cible:
                cible[champ] += float(seau.get(champ, 0) or 0)
    return dict(sorted(cumul.items()))


async def _synchroniser_accueil(cumul: dict[str, dict[str, float]], tresorerie: float | None) -> None:
    """L'accueil lit `vision_finances` : on y recopie les 6 derniers mois importés."""
    await db.vision_finances.delete_many({"user_id": uid()})
    derniers = list(cumul.items())[-6:]
    if derniers:
        await db.vision_finances.insert_many([
            {
                "id": str(uuid.uuid4()),
                "user_id": uid(),
                "mois": libelle_mois(cle),
                "revenus": round(seau["revenus"], 2),
                "depenses": round(seau["charges_fixes"] + seau["charges_variables"], 2),
                "ordre": i,
            }
            for i, (cle, seau) in enumerate(derniers)
        ])
    if tresorerie is not None:
        await db.vision_profil.update_one(
            {"user_id": uid()}, {"$set": {"tresorerie": round(tresorerie, 2)}}
        )


async def _tresorerie_importee() -> float | None:
    return (await _tresorerie_et_source())[0]


async def _tresorerie_et_source() -> tuple[float | None, str]:
    """Solde du dernier import qui en porte un, et d'où il vient (FEC ou colonne Solde d'un relevé)."""
    docs = await db.pilotage_imports.find({"user_id": uid()}).sort("date_import", -1).to_list(100)
    for doc in docs:
        if doc.get("tresorerie") is not None:
            source = "comptes 512/53 du FEC" if doc.get("format") == "FEC" else f"solde du relevé « {doc.get('nom', '')} »"
            return float(doc["tresorerie"]), source
    return None, "saisie du profil"


async def _vue() -> PilotageVue:
    cumul = await _mois_cumules()
    docs = await db.pilotage_imports.find({"user_id": uid()}).sort("date_import", -1).to_list(100)

    mois = [
        MoisPilotage(
            cle=cle,
            mois=libelle_mois(cle),
            revenus=round(seau["revenus"], 2),
            depenses=round(seau["charges_fixes"] + seau["charges_variables"], 2),
            charges_fixes=round(seau["charges_fixes"], 2),
            charges_variables=round(seau["charges_variables"], 2),
            resultat=round(seau["revenus"] - seau["charges_fixes"] - seau["charges_variables"], 2),
            ventes=int(seau["ventes"]),
        )
        for cle, seau in cumul.items()
    ][-6:]

    courant = mois[-1] if mois else None
    point_mort = None
    if mois:
        fixes_moyens = sum(m.charges_fixes for m in mois) / len(mois)
        ca_total = sum(m.revenus for m in mois)
        variables_total = sum(m.charges_variables for m in mois)
        taux = 1 - (variables_total / ca_total) if ca_total > 0 else 0.0
        seuil = round(fixes_moyens / taux, 2) if taux > 0 else None
        ventes_total = sum(m.ventes for m in mois)
        panier = round(ca_total / ventes_total, 2) if ventes_total else None
        clients = math.ceil(seuil / panier) if seuil and panier else None
        ca_courant = courant.revenus if courant else 0.0
        pourcentage = min(100, round(100 * ca_courant / seuil)) if seuil and seuil > 0 else 0
        if seuil is None:
            explication = "Marge sur coûts variables nulle ou négative : le point mort n'est pas calculable."
        elif clients:
            explication = (
                f"Avec {fixes_moyens:,.0f} € de charges fixes par mois et une marge de "
                f"{taux * 100:.0f} %, il faut {seuil:,.0f} € de chiffre d'affaires — soit "
                f"{clients} client{'s' if clients > 1 else ''} au panier moyen réel de {panier:,.0f} €."
            ).replace(",", " ")
        else:
            explication = (
                f"Avec {fixes_moyens:,.0f} € de charges fixes par mois et une marge de "
                f"{taux * 100:.0f} %, il faut {seuil:,.0f} € de chiffre d'affaires par mois."
            ).replace(",", " ")
        point_mort = PointMort(
            charges_fixes_mensuelles=round(fixes_moyens, 2),
            taux_marge_variable=round(taux, 4),
            seuil_euros=seuil,
            panier_moyen=panier,
            clients_necessaires=clients,
            ca_mois_courant=ca_courant,
            pourcentage=pourcentage,
            atteint=bool(seuil and ca_courant >= seuil),
            explication=explication,
        )

    solde, source = await _tresorerie_et_source()
    if solde is None:
        profil = await db.vision_profil.find_one({"user_id": uid()}) or {}
        solde = float(profil.get("tresorerie", 0))
    depenses_moyennes = (sum(m.depenses for m in mois) / len(mois)) if mois else 0.0

    return PilotageVue(
        imports=[
            ImportFichier(
                id=d["id"],
                nom=d["nom"],
                format=d.get("format", ""),
                lignes=int(d.get("lignes", 0)),
                periode_debut=d.get("periode_debut", ""),
                periode_fin=d.get("periode_fin", ""),
                date_import=d.get("date_import", ""),
                revenus=round(float(d.get("revenus", 0)), 2),
                depenses=round(float(d.get("depenses", 0)), 2),
            )
            for d in docs
        ],
        mois=mois,
        point_mort=point_mort,
        tresorerie=Tresorerie(
            solde=round(solde, 2),
            source=source,
            depenses_moyennes=round(depenses_moyennes, 2),
            autonomie_mois=round(solde / depenses_moyennes, 1) if depenses_moyennes > 0 else 0.0,
        ),
        mois_courant=courant.mois if courant else None,
        revenus_mois=courant.revenus if courant else 0.0,
        depenses_mois=courant.depenses if courant else 0.0,
        resultat_mois=courant.resultat if courant else 0.0,
        ecritures_total=sum(int(d.get("lignes", 0)) for d in docs),
    )


async def _enregistrer(nom: str, donnees: bytes) -> PilotageVue:
    try:
        lu = lire_fichier(nom, donnees)
    except FichierIllisible as erreur:
        raise HTTPException(status_code=422, detail=str(erreur))
    except Exception:  # un fichier corrompu ne doit pas renvoyer un 500 muet
        raise HTTPException(status_code=422, detail="Fichier illisible : ni FEC, ni CSV, ni Excel valide.")

    revenus = sum(s["revenus"] for s in lu["mois"].values())
    depenses = sum(s["charges_fixes"] + s["charges_variables"] for s in lu["mois"].values())
    await db.pilotage_imports.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": uid(),
        "nom": nom,
        "format": lu["format"],
        "lignes": lu["lignes"],
        "mois": lu["mois"],
        "tresorerie": lu["tresorerie"],
        "periode_debut": lu["periode_debut"],
        "periode_fin": lu["periode_fin"],
        "date_import": _maintenant().isoformat(timespec="seconds"),
        "revenus": round(revenus, 2),
        "depenses": round(depenses, 2),
    })

    cumul = await _mois_cumules()
    await _synchroniser_accueil(cumul, await _tresorerie_importee())
    vue = await _vue()
    await synchroniser_objectif(vue.point_mort)  # le cercle : objectif du mois → Radar + Plan d'action
    return vue


@router.get("/vue", response_model=PilotageVue)
async def pilotage_vue() -> PilotageVue:
    return await _vue()


@router.post("/imports", response_model=PilotageVue)
async def importer(body: ImportIn) -> PilotageVue:
    # 10 Mo de fichier ≈ 13,4 millions de caractères en base64 : on refuse avant de décoder.
    if len(body.contenu_b64) > 14_000_000:
        raise HTTPException(status_code=413, detail="Fichier trop lourd : 10 Mo maximum.")
    try:
        donnees = base64.b64decode(body.contenu_b64.split(",")[-1], validate=False)
    except Exception:
        raise HTTPException(status_code=422, detail="Contenu du fichier illisible.")
    if not donnees:
        raise HTTPException(status_code=422, detail="Fichier vide.")
    return await _enregistrer(body.nom.strip(), donnees)


@router.post("/imports/exemple", response_model=PilotageVue)
async def importer_exemple() -> PilotageVue:
    contenu = fec_exemple(_maintenant().date()).encode("utf-8")
    return await _enregistrer("Jeu d'essai — FEC 6 mois.txt", contenu)


@router.delete("/imports/{import_id}", response_model=SupprimeOut)
async def supprimer_import(import_id: str) -> SupprimeOut:
    res = await db.pilotage_imports.delete_one({"user_id": uid(), "id": import_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Import introuvable")
    cumul = await _mois_cumules()
    await _synchroniser_accueil(cumul, await _tresorerie_importee())
    await synchroniser_objectif((await _vue()).point_mort)
    return SupprimeOut(id=import_id, supprime=True)
