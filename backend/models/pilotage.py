"""Modèles du Pilotage financier.

Interfaces TypeScript miroir : frontend/src/types/pilotage.ts — les deux se
modifient dans la même édition.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class MoisPilotage(BaseModel):
    cle: str                     # AAAA-MM
    mois: str                    # « mars 25 »
    revenus: float
    depenses: float
    charges_fixes: float
    charges_variables: float
    resultat: float
    ventes: int


class PointMort(BaseModel):
    charges_fixes_mensuelles: float
    taux_marge_variable: float             # 0 → 1
    seuil_euros: Optional[float] = None    # None si la marge n'est pas calculable
    panier_moyen: Optional[float] = None
    clients_necessaires: Optional[int] = None
    ca_mois_courant: float
    pourcentage: int
    atteint: bool
    explication: str


class Tresorerie(BaseModel):
    solde: float
    source: str                  # « comptes 512/53 du FEC » ou « saisie du profil »
    depenses_moyennes: float
    autonomie_mois: float


class ImportFichier(BaseModel):
    id: str
    nom: str
    format: str
    lignes: int
    periode_debut: str
    periode_fin: str
    date_import: str
    revenus: float
    depenses: float


class PilotageVue(BaseModel):
    imports: List[ImportFichier] = Field(default_factory=list)
    mois: List[MoisPilotage] = Field(default_factory=list)
    point_mort: Optional[PointMort] = None
    tresorerie: Tresorerie
    mois_courant: Optional[str] = None
    revenus_mois: float
    depenses_mois: float
    resultat_mois: float
    ecritures_total: int


class ImportIn(BaseModel):
    nom: str = Field(min_length=1, max_length=200)
    contenu_b64: str = Field(min_length=8)
