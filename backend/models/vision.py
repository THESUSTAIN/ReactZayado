"""Modèles de la page Vision globale.

Chaque modèle ici a une interface TypeScript miroir dans
frontend/src/types/vision.ts — les deux se modifient dans la même édition.
"""

from typing import List, Optional

from pydantic import BaseModel, Field

# Les cinq niveaux d'énergie, dans l'ordre. L'index 0 n'existe pas : un niveau
# va de 1 à 5, et `None` veut dire « pas encore de check-in aujourd'hui ».
LIBELLES_ENERGIE = ["Vidé", "Fatigué", "Ça va", "En forme", "Au top"]


class Priorite(BaseModel):
    id: str
    titre: str
    source: str
    objectif: str
    fait: bool = False


class Capacite(BaseModel):
    pourcentage: int
    actions_possibles: int
    actions_masquees: int


class Score(BaseModel):
    valeur: int
    pro_pct: int
    perso_pct: int
    rituels_faits: int
    rituels_total: int


class JourEnergie(BaseModel):
    date: str
    jour: str
    niveau: Optional[int] = None


class Energie(BaseModel):
    niveau: Optional[int] = None
    libelle: Optional[str] = None
    semaine: List[JourEnergie] = Field(default_factory=list)


class ImageBoard(BaseModel):
    id: str
    url: str
    legende: str = ""


class Board(BaseModel):
    citation: str
    images: List[ImageBoard] = Field(default_factory=list)


class MoisFinance(BaseModel):
    mois: str
    revenus: float
    depenses: float


class Finances(BaseModel):
    revenus_mois: float
    depenses_mois: float
    tresorerie: float
    autonomie_mois: float
    evolution: List[MoisFinance] = Field(default_factory=list)


class AxeRoue(BaseModel):
    axe: str
    score: int


class Action(BaseModel):
    id: str
    titre: str
    module: str
    echeance: str
    fait: bool = False


class Victoire(BaseModel):
    id: str
    texte: str
    date_label: str


class VisionGlobale(BaseModel):
    """Tout ce que la page Vision globale affiche, en une seule réponse."""

    prenom: str
    offre: str
    date_label: str
    priorite: Optional[Priorite] = None
    capacite: Capacite
    score: Score
    energie: Energie
    board: Board
    finances: Finances
    roue: List[AxeRoue] = Field(default_factory=list)
    priorites: List[Action] = Field(default_factory=list)
    victoires: List[Victoire] = Field(default_factory=list)


class CheckinEnergieIn(BaseModel):
    niveau: int = Field(ge=1, le=5)


class CheckinEnergieOut(BaseModel):
    niveau: int
    libelle: str
    capacite: Capacite


class VictoireIn(BaseModel):
    texte: str = Field(min_length=3, max_length=300)


class ActionFaiteOut(BaseModel):
    id: str
    fait: bool
