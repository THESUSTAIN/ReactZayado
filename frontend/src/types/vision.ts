/* Interfaces TypeScript miroir de backend/models/vision.py.
   Les deux se modifient dans la même édition — rien ne s'infère entre Python et TS. */

export interface Priorite {
  id: string;
  titre: string;
  source: string;
  objectif: string;
  fait: boolean;
}

export interface Capacite {
  pourcentage: number;
  actions_possibles: number;
  actions_masquees: number;
}

export interface Score {
  valeur: number;
  pro_pct: number;
  perso_pct: number;
  rituels_faits: number;
  rituels_total: number;
}

export interface JourEnergie {
  date: string;
  jour: string;
  niveau: number | null;
}

export interface Energie {
  niveau: number | null;
  libelle: string | null;
  semaine: JourEnergie[];
}

export interface ImageBoard {
  id: string;
  url: string;
  legende: string;
}

export interface Board {
  citation: string;
  images: ImageBoard[];
}

export interface MoisFinance {
  mois: string;
  revenus: number;
  depenses: number;
}

export interface Finances {
  revenus_mois: number;
  depenses_mois: number;
  tresorerie: number;
  autonomie_mois: number;
  evolution: MoisFinance[];
}

export interface AxeRoue {
  axe: string;
  score: number;
}

export interface Action {
  id: string;
  titre: string;
  module: string;
  echeance: string;
  fait: boolean;
}

export interface Victoire {
  id: string;
  texte: string;
  date_label: string;
}

export interface VisionGlobale {
  prenom: string;
  offre: string;
  date_label: string;
  priorite: Priorite | null;
  capacite: Capacite;
  score: Score;
  energie: Energie;
  board: Board;
  finances: Finances;
  roue: AxeRoue[];
  priorites: Action[];
  victoires: Victoire[];
}

export interface CheckinEnergieOut {
  niveau: number;
  libelle: string;
  capacite: Capacite;
}

export interface ActionFaiteOut {
  id: string;
  fait: boolean;
}

/* Les cinq niveaux, dans l'ordre du backend (LIBELLES_ENERGIE). */
export const LIBELLES_ENERGIE = ["Vidé", "Fatigué", "Ça va", "En forme", "Au top"] as const;
