/* Interfaces miroir de backend/models/pilotage.py. */

export interface MoisPilotage {
  cle: string;
  mois: string;
  revenus: number;
  depenses: number;
  charges_fixes: number;
  charges_variables: number;
  resultat: number;
  ventes: number;
}

export interface PointMort {
  charges_fixes_mensuelles: number;
  taux_marge_variable: number;
  seuil_euros: number | null;
  panier_moyen: number | null;
  clients_necessaires: number | null;
  ca_mois_courant: number;
  pourcentage: number;
  atteint: boolean;
  explication: string;
}

export interface TresoreriePilotage {
  solde: number;
  source: string;
  depenses_moyennes: number;
  autonomie_mois: number;
}

export interface ImportFichier {
  id: string;
  nom: string;
  format: string;
  lignes: number;
  periode_debut: string;
  periode_fin: string;
  date_import: string;
  revenus: number;
  depenses: number;
}

export interface PilotageVue {
  imports: ImportFichier[];
  mois: MoisPilotage[];
  point_mort: PointMort | null;
  tresorerie: TresoreriePilotage;
  mois_courant: string | null;
  revenus_mois: number;
  depenses_mois: number;
  resultat_mois: number;
  ecritures_total: number;
}
