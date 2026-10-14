/* Interfaces miroir de backend/models/plan.py. */

export interface ObjectifPlan {
  id: string;
  titre: string;
  cible: number;
  atteint: number;
  unite: string;
  module: string;
  pourcentage: number;
}

export interface ActionPlan {
  id: string;
  titre: string;
  module: string;
  echeance: string;
  fait: boolean;
  source: string;
  priorite: boolean;
  masquee: boolean;
}

export interface ProcessusPlan {
  id: string;
  titre: string;
  rythme: string;
  serie: number;
  fait_aujourdhui: boolean;
}

export interface CapacitePlan {
  pourcentage: number;
  actions_possibles: number;
  actions_masquees: number;
  libelle_energie: string | null;
}

export interface PlanVue {
  capacite: CapacitePlan;
  objectifs: ObjectifPlan[];
  actions: ActionPlan[];
  processus: ProcessusPlan[];
  faites_aujourdhui: number;
}

export interface SupprimeOut {
  id: string;
  supprime: boolean;
}
