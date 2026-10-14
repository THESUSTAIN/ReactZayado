"""Modèles du Radar.

Interfaces TypeScript miroir dans frontend/src/types/radar.ts.

Règle du produit, tenue ici : un signal porte TOUJOURS une source et une date.
Aucun score de pertinence n'est inventé, aucun « 87 % de match ».
"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

Mode = Literal["entreprises", "particuliers"]
Statut = Literal["nouveau", "pris", "ecarte"]
EtapePipeline = Literal["nouveau", "contacte", "en_discussion", "signe", "ecarte"]

ETAPES: list[EtapePipeline] = ["nouveau", "contacte", "en_discussion", "signe", "ecarte"]
LIBELLES_ETAPES = {
    "nouveau": "À contacter",
    "contacte": "Contacté",
    "en_discussion": "Rendez-vous",
    "signe": "Signé",
    "ecarte": "Écarté",
}


class Metrique(BaseModel):
    """Chiffre d'un signal de demande exprimée : volume et tendance, jamais une personne."""

    valeur: int
    unite: str
    tendance_pct: Optional[int] = None
    periode: str = ""


class Signal(BaseModel):
    id: str
    mode: Mode
    categorie: str  # entreprises : creation/recrutement/appel_offres/veille — particuliers : demande/entrante/bassin/prescripteur
    source: str
    cible: str
    fait: str
    date_fait: str
    fraicheur: str
    pourquoi: str
    lien: Optional[str] = None
    secteur: str = ""
    zone: str = ""
    statut: Statut = "nouveau"
    secondaire: bool = False  # les prescripteurs : canal lent, carte secondaire
    metrique: Optional[Metrique] = None


class Objectif(BaseModel):
    """Hérité du Pilotage : c'est lui qui pose la question à laquelle le Radar répond."""

    clients_vises: int
    signes: int
    a_trouver: int
    source: str


class Source(BaseModel):
    cle: str
    nom: str
    role: str
    actif: bool
    etat: str
    detail: str
    payante: bool = False


class Prospect(BaseModel):
    id: str
    nom: str
    etape: EtapePipeline
    source: str
    maj: str


class EtapeCompte(BaseModel):
    cle: EtapePipeline
    libelle: str
    nombre: int


class Reglages(BaseModel):
    clientele: Literal["entreprises", "particuliers", "les_deux"]
    zone: str
    mots_cles: List[str] = Field(default_factory=list)


class RadarVue(BaseModel):
    objectif: Objectif
    reglages: Reglages
    signaux: List[Signal] = Field(default_factory=list)
    sources: List[Source] = Field(default_factory=list)
    prospects: List[Prospect] = Field(default_factory=list)
    pipeline: List[EtapeCompte] = Field(default_factory=list)
    opposition: int = 0


class PrendreOut(BaseModel):
    signal_id: str
    action_id: str
    action_titre: str
    prospect_id: Optional[str] = None


class EcarterOut(BaseModel):
    signal_id: str
    statut: Statut
    opposition: int


class EtapeIn(BaseModel):
    etape: EtapePipeline


class ReglagesIn(BaseModel):
    clientele: Optional[Literal["entreprises", "particuliers", "les_deux"]] = None
    zone: Optional[str] = None
    mots_cles: Optional[List[str]] = None


class OppositionIn(BaseModel):
    valeur: str = Field(min_length=2, max_length=200)
