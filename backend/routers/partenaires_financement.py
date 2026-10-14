"""Partenaires pour reprendre une entreprise sans apport (annuaire géré par l'admin).

Admin  : GET/POST /api/admin/partenaires-financement · PUT/DELETE /api/admin/partenaires-financement/{pid}
Public : GET /api/public/partenaires-financement   (partenaires actifs : nom, catégorie, ce qu'ils apportent, site)
Au premier appel, l'annuaire est prérempli avec 24 acteurs reconnus en France (sites officiels, sans contact
inventé : l'admin complète le nom et l'e-mail de son interlocuteur).
"""

import sys
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from lib.db import db

Categorie = Literal["pret_honneur", "garantie", "banque", "microcredit", "aide_publique", "credit_vendeur",
                    "fonds_propres", "financement_participatif", "accompagnement"]
CATEGORIES: dict[str, str] = {
    "pret_honneur": "Prêt d'honneur (0 %, sans garantie)", "garantie": "Garantie bancaire", "banque": "Banque — prêt de reprise",
    "microcredit": "Microcrédit", "aide_publique": "Aide publique / apport", "credit_vendeur": "Crédit vendeur",
    "fonds_propres": "Fonds propres / investisseurs", "financement_participatif": "Financement participatif",
    "accompagnement": "Accompagnement & mise en relation",
}

DEPART: list[tuple[str, str, str, str]] = [
    ("Initiative France", "pret_honneur", "Prêt d'honneur à 0 % sans garantie personnelle, qui sert d'apport et déclenche le prêt bancaire.", "https://www.initiative-france.fr"),
    ("Réseau Entreprendre", "pret_honneur", "Prêt d'honneur à 0 % pour repreneurs + mentorat par un chef d'entreprise pendant 2 à 3 ans.", "https://www.reseau-entreprendre.org"),
    ("France Active", "garantie", "Garantie de prêt bancaire jusqu'à 80 % et prêts solidaires : réduit la caution personnelle.", "https://www.franceactive.org"),
    ("Bpifrance — garantie transmission", "garantie", "Garantie des prêts de reprise (jusqu'à 50-70 %) qui rassure la banque quand l'apport est faible.", "https://www.bpifrance.fr"),
    ("Bpifrance — prêt transmission", "banque", "Prêt sans garantie en complément du crédit bancaire pour financer l'immatériel (fonds, clientèle).", "https://www.bpifrance.fr"),
    ("SIAGI", "garantie", "Société de caution des artisans et commerçants : garantit le prêt de reprise des TPE.", "https://www.siagi.com"),
    ("Adie", "microcredit", "Microcrédit jusqu'à 12 000 € et prêt d'honneur pour ceux que les banques refusent.", "https://www.adie.org"),
    ("France Travail — ARCE", "aide_publique", "60 % des droits chômage versés en capital : un apport immédiat pour le repreneur demandeur d'emploi.", "https://www.francetravail.fr"),
    ("Région — aides à la reprise", "aide_publique", "Prêts d'honneur, avances remboursables et garanties régionales selon la région du projet.", "https://regions-france.org"),
    ("Crédit vendeur (le cédant)", "credit_vendeur", "Le cédant accepte d'être payé en partie plus tard (10 à 30 %) : remplace l'apport et prouve sa confiance.", ""),
    ("Crédit Agricole", "banque", "Prêt de reprise de fonds de commerce et de parts sociales, réseau régional.", "https://www.credit-agricole.fr"),
    ("Banque Populaire", "banque", "Prêt de transmission, partenaire historique des réseaux de prêts d'honneur.", "https://www.banquepopulaire.fr"),
    ("Caisse d'Epargne", "banque", "Prêt de reprise pour TPE et professions libérales.", "https://www.caisse-epargne.fr"),
    ("Crédit Mutuel", "banque", "Prêt de reprise et accompagnement des créateurs-repreneurs.", "https://www.creditmutuel.fr"),
    ("CIC", "banque", "Prêt de transmission d'entreprise pour TPE et PME.", "https://www.cic.fr"),
    ("LCL", "banque", "Financement de la reprise de fonds de commerce et de société.", "https://www.lcl.fr"),
    ("BNP Paribas", "banque", "Prêt de reprise et montage avec garanties Bpifrance.", "https://mabanque.bnpparibas"),
    ("Société Générale", "banque", "Prêt de transmission d'entreprise et accompagnement des repreneurs.", "https://entreprises.societegenerale.fr"),
    ("France Angels", "fonds_propres", "Business angels qui entrent au capital aux côtés du repreneur sur les projets plus importants.", "https://www.franceangels.org"),
    ("Siparex", "fonds_propres", "Fonds d'investissement pour les reprises de PME (LBO small cap).", "https://www.siparex.com"),
    ("Tudigo", "financement_participatif", "Prêt ou capital apporté par la communauté et les clients de l'entreprise reprise.", "https://www.tudigo.co"),
    ("WiSEED", "financement_participatif", "Financement participatif en prêt et en capital pour les PME.", "https://www.wiseed.com"),
    ("CCI — Transentreprise", "accompagnement", "Bourse d'entreprises à reprendre et accompagnement des repreneurs par les CCI et CMA.", "https://www.transentreprise.com"),
    ("CMA France — chambres de métiers", "accompagnement", "Reprise d'entreprises artisanales : stage, diagnostic et mise en relation avec les cédants.", "https://www.artisanat.fr"),
    ("Ordre des experts-comptables", "accompagnement", "Un expert-comptable pour évaluer la cible et monter le plan de financement présenté aux banques.", "https://www.experts-comptables.fr"),
]


class PartenaireIn(BaseModel):
    nom: str = Field(min_length=2, max_length=120)
    categorie: Categorie
    description: str = Field(default="", max_length=600)
    site: str = Field(default="", max_length=300)
    contact_nom: str = Field(default="", max_length=120)
    contact_email: str = Field(default="", max_length=160)
    telephone: str = Field(default="", max_length=40)
    region: str = Field(default="France entière", max_length=80)
    notes: str = Field(default="", max_length=1000)
    actif: bool = True


class Partenaire(PartenaireIn):
    id: str
    cree_le: str


class PartenairePublic(BaseModel):
    id: str
    nom: str
    categorie: Categorie
    categorie_libelle: str
    description: str
    site: str
    region: str


async def _admin():
    await sys.modules["server"].exiger_role("admin")()


router_public = APIRouter()  # monté sous /api


async def _tous() -> list[dict]:
    if not await db.partenaires_financement.find_one({}):
        now = datetime.now(timezone.utc).isoformat()
        for i, (nom, cat, desc, site) in enumerate(DEPART):
            await db.partenaires_financement.insert_one({
                "id": str(uuid.uuid4()), "nom": nom, "categorie": cat, "description": desc, "site": site,
                "contact_nom": "", "contact_email": "", "telephone": "", "region": "France entière", "notes": "",
                "actif": True, "cree_le": f"{now}-{i:02d}"})
    docs = await db.partenaires_financement.find({}).to_list(1000)
    return sorted(docs, key=lambda d: (list(CATEGORIES).index(d["categorie"]), d["nom"].lower()))


def _out(d: dict) -> Partenaire:
    return Partenaire.model_validate({k: d.get(k) for k in Partenaire.model_fields if k in d})


@router_public.get("/admin/partenaires-financement", response_model=list[Partenaire], dependencies=[Depends(_admin)])
async def lister():
    return [_out(d) for d in await _tous()]


@router_public.post("/admin/partenaires-financement", response_model=Partenaire, dependencies=[Depends(_admin)])
async def creer(b: PartenaireIn):
    await _tous()
    d = {"id": str(uuid.uuid4()), "cree_le": datetime.now(timezone.utc).isoformat(), **b.model_dump()}
    await db.partenaires_financement.insert_one(d)
    return _out(d)


@router_public.put("/admin/partenaires-financement/{pid}", response_model=Partenaire, dependencies=[Depends(_admin)])
async def modifier(pid: str, b: PartenaireIn):
    d = await db.partenaires_financement.find_one({"id": pid})
    if not d:
        raise HTTPException(404, "Partenaire introuvable.")
    await db.partenaires_financement.update_one({"id": pid}, {"$set": b.model_dump()})
    return _out({**d, **b.model_dump()})


@router_public.delete("/admin/partenaires-financement/{pid}", dependencies=[Depends(_admin)])
async def supprimer(pid: str):
    await db.partenaires_financement.delete_one({"id": pid})
    return {"ok": True, "id": pid}


@router_public.get("/public/partenaires-financement", response_model=list[PartenairePublic])
async def publics():
    return [PartenairePublic(id=d["id"], nom=d["nom"], categorie=d["categorie"], categorie_libelle=CATEGORIES[d["categorie"]],
                             description=d.get("description", ""), site=d.get("site", ""), region=d.get("region", ""))
            for d in await _tous() if d.get("actif", True)]
