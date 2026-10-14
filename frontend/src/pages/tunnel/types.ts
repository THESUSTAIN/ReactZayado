// Miroir des schémas Pydantic de backend/tunnel_zayado_ext.py — à garder synchronisés.
export interface Offre {
  titre: string;
  prix: string; // "27.00"
  description: string;
  livrables: string[];
}

export interface Offres {
  kit: Offre;
  fast_track: Offre;
  essai_solo_prix: string;
  essai_solo_jours: number;
  solo_prix_ensuite: string;
  rdv_url: string;
  guide_reprise_url?: string;
  simulation: boolean;
}

export interface CaptureIn {
  email: string;
  prenom: string;
  situation: string;
  priorite: string;
  consentement: boolean;
}

export interface CaptureOut {
  prospect_id: string;
}

export interface Prospect {
  id: string;
  prenom: string;
  situation: string;
  priorite: string;
}

export interface CheckoutOut {
  commande_id: string;
  checkout_url: string | null;
  statut: string;
  simulation: boolean;
}

export interface FastTrackEtat {
  id: string;
  statut: string;
  montant: string;
}

export interface Commande {
  id: string;
  titre: string;
  montant: string;
  statut: string;
  email: string;
  fast_track: FastTrackEtat | null;
  fast_track_refuse: boolean;
  analyse_disponible: boolean;
  simulation: boolean;
}

export interface MoisAnalyse {
  mois: string;
  revenus: number;
  charges: number;
  resultat: number;
}

export interface Analyse {
  fichier: string;
  analyse_le: string;
  format: string;
  lignes: number;
  periode_debut: string | null;
  periode_fin: string | null;
  mois: MoisAnalyse[];
  total_revenus: number;
  total_charges: number;
  total_resultat: number;
  charges_mensuelles_moyennes: number;
  tresorerie: number | null;
  autonomie_mois: number | null;
  mois_deficitaires: number;
  part_charges_fixes: number | null;
  points: string[];
}
