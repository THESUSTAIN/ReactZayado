"""Espace Entreprise × SheetFlow : bases (Google Sheets, Excel OneDrive, Microsoft Lists), lignes, pages,
modèles, commentaires, chronomètre. Miroir TS : frontend/src/lib/types.ts (à garder synchronisé)."""

import uuid
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

SourceKind = Literal["google-sheets", "excel", "ms-lists", "test"]
ColumnType = Literal["text", "number", "date", "select"]
ViewType = Literal["table", "cards", "form", "kanban", "dashboard", "calendar", "timeline", "chrono"]


def _uuid() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Column(BaseModel):
    key: str
    label: str
    type: ColumnType = "text"
    options: list[str] = []


class ViewConfig(BaseModel):
    title_field: Optional[str] = None
    group_by: Optional[str] = None
    amount_field: Optional[str] = None
    hours_field: Optional[str] = None
    date_field: Optional[str] = None
    end_field: Optional[str] = None
    person_field: Optional[str] = None
    ref_field: Optional[str] = None
    category_field: Optional[str] = None
    filter_field: Optional[str] = None
    filter_value: Optional[str] = None


class Source(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    kind: SourceKind
    url: Optional[str] = None
    fichier_nom: str = ""
    onglet: str = ""
    columns: list[Column] = []
    default_config: ViewConfig = ViewConfig()
    row_count: int = 0
    modele: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    last_synced: str = Field(default_factory=now_iso)


class SourceConnect(BaseModel):
    kind: SourceKind
    url: Optional[str] = Field(default=None, max_length=2000)
    fichier_id: Optional[str] = Field(default=None, max_length=300)
    name: Optional[str] = Field(default=None, max_length=80)


class Row(BaseModel):
    id: str
    source_id: str
    data: dict[str, Any]
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class RowWrite(BaseModel):
    data: dict[str, Any]


class Page(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    source_id: str
    view: ViewType
    config: ViewConfig = ViewConfig()
    modele: Optional[str] = None
    ordre: int = 0
    created_at: str = Field(default_factory=now_iso)


class PageCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    source_id: str
    view: ViewType
    config: Optional[ViewConfig] = None


class PageUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    view: Optional[ViewType] = None
    config: Optional[ViewConfig] = None


class Modele(BaseModel):
    id: str
    nom: str
    description: str
    vue: ViewType
    onglet: str
    colonnes: list[str]
    installe: bool = False
    page_id: Optional[str] = None


class Commentaire(BaseModel):
    id: str
    row_id: str
    parent_id: Optional[str] = None
    auteur_nom: str
    texte: str
    le: str
    de_moi: bool = False


class CommentaireIn(BaseModel):
    texte: str = Field(min_length=1, max_length=1000)
    parent_id: Optional[str] = None


class ChronoEtat(BaseModel):
    actif: bool = False
    debut: Optional[str] = None
    reference: str = ""
    note: str = ""
    source_id: Optional[str] = None


class ChronoStart(BaseModel):
    source_id: str
    reference: str = Field(default="", max_length=120)
    note: str = Field(default="", max_length=300)


class Classeur(BaseModel):
    kind: SourceKind
    fichier_id: str
    nom: str
    url: Optional[str] = None


class EspaceParams(BaseModel):
    libelle_chrono: str = "Ticket"
    classeur: Optional[Classeur] = None
    test_disponible: bool = False
    peut_gerer: bool = False
    peut_ecrire: bool = False


class ParamsUpdate(BaseModel):
    libelle_chrono: str = Field(min_length=1, max_length=40)


class Indicateur(BaseModel):
    cle: str
    libelle: str
    valeur: str
    detail: str
    source: str
    lu_le: str
    page_id: Optional[str] = None


class Aujourdhui(BaseModel):
    date: str
    indicateurs: list[Indicateur]
