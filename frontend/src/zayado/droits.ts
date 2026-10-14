import type { Offre } from "@/zayado/types";

/* Règles d'accès par offre — grille « Fonctionnalités par tarif » du dossier.
   Le cœur (Aujourd'hui, Plan d'action) n'est jamais bridé. */
export interface Droits {
  prix: string;
  signaux_par_jour: number | null; // null = illimité
  modes_radar: 1 | 2;
  prospects_max: number | null;
  enrichissement: boolean; // Dropcontact
  tunnels_max: number;
  sequences_lancement: boolean;
  campagne_pub: boolean;
  commission: string;
}

export const OFFRES: Offre[] = ["Rêveur", "Solo", "Pro"];

export const DROITS: Record<Offre, Droits> = {
  Rêveur: {
    prix: "15 €/mois",
    signaux_par_jour: 5,
    modes_radar: 1,
    prospects_max: 10,
    enrichissement: false,
    tunnels_max: 1,
    sequences_lancement: false,
    campagne_pub: false,
    commission: "10 % (max 49 €)",
  },
  Solo: {
    prix: "29 €/mois (fondateur 24 €)",
    signaux_par_jour: null,
    modes_radar: 2,
    prospects_max: null,
    enrichissement: false,
    tunnels_max: 3,
    sequences_lancement: false,
    campagne_pub: true,
    commission: "5 % (max 29 €)",
  },
  Pro: {
    prix: "69 €/mois (fondateur 49 €)",
    signaux_par_jour: null,
    modes_radar: 2,
    prospects_max: null,
    enrichissement: true,
    tunnels_max: 3,
    sequences_lancement: true,
    campagne_pub: true,
    commission: "0 %",
  },
};

export const droitsDe = (offre: string | undefined): Droits => DROITS[(offre as Offre) in DROITS ? (offre as Offre) : "Rêveur"];
