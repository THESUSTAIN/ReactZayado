// Hand-written mirrors of backend/models/workspace.py — keep in sync.
export type SourceKind = "google-sheets" | "excel" | "ms-lists" | "test";
export type ColumnType = "text" | "number" | "date" | "select";
export type ViewType = "table" | "cards" | "form" | "kanban" | "dashboard" | "calendar" | "timeline" | "chrono";
export type CellValue = string | number | null;

export interface Column {
  key: string;
  label: string;
  type: ColumnType;
  options: string[];
}

export interface ViewConfig {
  title_field: string | null;
  group_by: string | null;
  amount_field: string | null;
  hours_field: string | null;
  date_field: string | null;
  end_field: string | null;
  person_field: string | null;
  ref_field: string | null;
  category_field: string | null;
  filter_field: string | null;
  filter_value: string | null;
}

export interface Source {
  id: string;
  name: string;
  kind: SourceKind;
  url: string | null;
  fichier_nom: string;
  onglet: string;
  columns: Column[];
  default_config: ViewConfig;
  row_count: number;
  modele: string | null;
  created_at: string;
  last_synced: string;
}

export interface SourceConnect {
  kind: SourceKind;
  url?: string;
  fichier_id?: string;
  name?: string;
}

export interface Row {
  id: string;
  source_id: string;
  data: Record<string, CellValue>;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  name: string;
  source_id: string;
  view: ViewType;
  config: ViewConfig;
  modele: string | null;
  ordre: number;
  created_at: string;
}

export interface PageCreate {
  name: string;
  source_id: string;
  view: ViewType;
  config?: ViewConfig;
}

export interface PageUpdate {
  name?: string;
  view?: ViewType;
  config?: ViewConfig;
}

export interface Modele {
  id: string;
  nom: string;
  description: string;
  vue: ViewType;
  onglet: string;
  colonnes: string[];
  installe: boolean;
  page_id: string | null;
}

export interface Commentaire {
  id: string;
  row_id: string;
  parent_id: string | null;
  auteur_nom: string;
  texte: string;
  le: string;
  de_moi: boolean;
}

export interface CommentaireIn {
  texte: string;
  parent_id?: string | null;
}

export interface ChronoEtat {
  actif: boolean;
  debut: string | null;
  reference: string;
  note: string;
  source_id: string | null;
}

export interface ChronoStart {
  source_id: string;
  reference: string;
  note: string;
}

export interface Classeur {
  kind: SourceKind;
  fichier_id: string;
  nom: string;
  url: string | null;
}

export interface EspaceParams {
  libelle_chrono: string;
  classeur: Classeur | null;
  test_disponible: boolean;
  peut_gerer: boolean;
  peut_ecrire: boolean;
}

export interface ParamsUpdate {
  libelle_chrono: string;
}

export interface Indicateur {
  cle: string;
  libelle: string;
  valeur: string;
  detail: string;
  source: string;
  lu_le: string;
  page_id: string | null;
}

export interface Aujourdhui {
  date: string;
  indicateurs: Indicateur[];
}
