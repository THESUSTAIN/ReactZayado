"""Modèles du Plan d'action — le moyeu.

Interfaces TypeScript miroir dans frontend/src/types/plan.ts.

Les idées vivent sur le Vision Board, pas ici : le Plan d'action tient trois
colonnes seulement — Objectifs, Actions, Processus. Rien ne devient du travail
sans y passer.
"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

Colonne = Literal["objectifs", "actions", "processus"]


class ObjectifPlan(BaseModel):
    id: str
    titre: str
    cible: float
    atteint: float
    unite: str
    module: str = ""
    pourcentage: int


class ActionPlan(BaseModel):
    id: str
    titre: str
    module: str
    echeance: str
    fait: bool
    source: str = ""
    priorite: bool = False
    masquee: bool = False  # au-delà de la capacité du jour : rangée, pas supprimée


class ProcessusPlan(BaseModel):
    id: str
    titre: str
    rythme: str
    serie: int = 0
    fait_aujourdhui: bool = False


class CapacitePlan(BaseModel):
    pourcentage: int
    actions_possibles: int
    actions_masquees: int
    libelle_energie: Optional[str] = None


class PlanVue(BaseModel):
    capacite: CapacitePlan
    objectifs: List[ObjectifPlan] = Field(default_factory=list)
    actions: List[ActionPlan] = Field(default_factory=list)
    processus: List[ProcessusPlan] = Field(default_factory=list)
    faites_aujourdhui: int = 0


class ActionIn(BaseModel):
    titre: str = Field(min_length=2, max_length=200)
    module: str = "Plan"
    echeance: str = ""


class ObjectifIn(BaseModel):
    titre: str = Field(min_length=2, max_length=200)
    cible: float = Field(gt=0)
    unite: str = Field(min_length=1, max_length=30)


class ProcessusIn(BaseModel):
    titre: str = Field(min_length=2, max_length=200)
    rythme: Literal["quotidien", "hebdomadaire", "mensuel"] = "quotidien"


class SupprimeOut(BaseModel):
    id: str
    supprime: bool
