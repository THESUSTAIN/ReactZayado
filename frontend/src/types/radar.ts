/* Interfaces miroir de backend/models/radar.py. */

export type ModeRadar = "entreprises" | "particuliers";
export type StatutSignal = "nouveau" | "pris" | "ecarte";
export type EtapePipeline = "nouveau" | "contacte" | "en_discussion" | "signe" | "ecarte";

export interface Metrique {
  valeur: number;
  unite: string;
  tendance_pct: number | null;
  periode: string;
}

export interface Signal {
  id: string;
  mode: ModeRadar;
  categorie: string;
  source: string;
  cible: string;
  fait: string;
  date_fait: string;
  fraicheur: string;
  pourquoi: string;
  lien: string | null;
  secteur: string;
  zone: string;
  statut: StatutSignal;
  secondaire: boolean;
  metrique: Metrique | null;
}

export interface Objectif {
  clients_vises: number;
  signes: number;
  a_trouver: number;
  source: string;
}

export interface SourceRadar {
  cle: string;
  nom: string;
  role: string;
  actif: boolean;
  etat: string;
  detail: string;
  payante: boolean;
}

export interface Prospect {
  id: string;
  nom: string;
  etape: EtapePipeline;
  source: string;
  maj: string;
}

export interface EtapeCompte {
  cle: EtapePipeline;
  libelle: string;
  nombre: number;
}

export interface Reglages {
  clientele: "entreprises" | "particuliers" | "les_deux";
  zone: string;
  mots_cles: string[];
}

export interface RadarVue {
  objectif: Objectif;
  reglages: Reglages;
  signaux: Signal[];
  sources: SourceRadar[];
  prospects: Prospect[];
  pipeline: EtapeCompte[];
  opposition: number;
}

export interface PrendreOut {
  signal_id: string;
  action_id: string;
  action_titre: string;
  prospect_id: string | null;
}

export interface EcarterOut {
  signal_id: string;
  statut: StatutSignal;
  opposition: number;
}

/* Libellés des catégories, côté affichage uniquement. */
export const CATEGORIES_ENTREPRISES: Record<string, string> = {
  creation: "Création",
  recrutement: "Recrutement",
  appel_offres: "Appel d'offres",
  veille: "Changement",
  procedure: "Redressement / sauvegarde",
  liquidation: "Liquidation judiciaire",
  radiation: "Radiation",
};

export const SECTIONS_PARTICULIERS: { cle: string; titre: string; note: string }[] = [
  {
    cle: "demande",
    titre: "La demande exprimée",
    note: "Le signal est un sujet, jamais une personne.",
  },
  {
    cle: "entrante",
    titre: "Les demandes entrantes",
    note: "La personne a demandé à être contactée.",
  },
  {
    cle: "bassin",
    titre: "Mon bassin — le vrai gisement",
    note: "Relation client existante : légal sans réserve, et le meilleur taux de conversion.",
  },
  {
    cle: "prescripteur",
    titre: "Les prescripteurs",
    note: "Même clientèle, métier complémentaire, jamais concurrent. Canal lent.",
  },
];
