/* Contrat du Copilote — miroir de backend/models/copilote.py et des réponses de backend/routers/copilote.py
   (models/vision.py, models/plan.py, models/radar.py). Les champs et les chemins sont
   repris tels quels pour que le branchement du vrai backend ne change rien côté écran.
   Les types marqués « NOUVEAU » n'existent pas encore côté backend : ils sont à brancher. */

export type Offre = "Rêveur" | "Solo" | "Pro";
export const LIBELLES_ENERGIE = ["Vidé", "Fatigué", "Ça va", "En forme", "Au top"] as const;

// ---------- Vision globale / Aujourd'hui ----------
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

// ---------- Plan d'action ----------
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

// ---------- Radar ----------
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
  /** NOUVEAU — numéro SIREN quand la source le fournit (BODACC). */
  siren?: string | null;
}
export interface ObjectifRadar {
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
  objectif: ObjectifRadar;
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
/** NOUVEAU — résultat d'une collecte sur les sources publiques. */
export interface CollecteOut {
  nouveaux: number;
  sources: string[];
  erreurs: string[];
}
/** NOUVEAU — saisie manuelle d'un signal (sujet, bassin, prescripteur). */
export interface SignalManuelIn {
  mode: ModeRadar;
  categorie: string;
  cible: string;
  fait: string;
  pourquoi: string;
  lien?: string;
}

export const LIBELLES_ETAPES: Record<EtapePipeline, string> = {
  nouveau: "À contacter",
  contacte: "Contacté",
  en_discussion: "Rendez-vous",
  signe: "Signé",
  ecarte: "Écarté",
};
export const CATEGORIES_ENTREPRISES: Record<string, string> = {
  creation: "Création",
  veille: "Changement",
  procedure: "Redressement / sauvegarde",
  liquidation: "Liquidation judiciaire",
  radiation: "Radiation",
  recrutement: "Recrutement",
  appel_offres: "Appel d'offres",
};
export const SECTIONS_PARTICULIERS: { cle: string; titre: string; note: string }[] = [
  { cle: "demande", titre: "La demande exprimée", note: "Le signal est un sujet, jamais une personne." },
  { cle: "entrante", titre: "Les demandes entrantes", note: "La personne a demandé à être contactée." },
  { cle: "bassin", titre: "Mon bassin — le vrai gisement", note: "Relation client existante : légal sans réserve." },
  { cle: "prescripteur", titre: "Les prescripteurs", note: "Même clientèle, métier complémentaire. Canal lent." },
];

// ---------- NOUVEAU : profil ----------
export interface Profil {
  prenom: string;
  offre: Offre;
  metier: string;
}
export interface ProfilIn extends Profil {
  clientele: Reglages["clientele"];
  zone: string;
  mots_cles: string[];
}

// ---------- Fiche entreprise (API Recherche d'entreprises) ----------
export interface FicheEntreprise {
  siren: string;
  nom: string;
  activite: string;
  date_creation: string | null;
  effectif: string | null;
  commune: string;
  dirigeants: string[];
  lien: string;
  etat: "actif" | "cesse";
  date_fermeture: string | null;
}

export interface AnnonceBodacc {
  id: string;
  date: string;
  famille: string;
  nature: string;
  tribunal: string;
  lien: string;
  alerte: boolean;
}

export interface FinanceAnnee {
  annee: string;
  ca: number | null;
  resultat_net: number | null;
}

export interface SourceInpi {
  connecte: boolean;
  lien: string;
  actes: number | null;
  bilans: number | null;
}

export interface FicheDetail extends FicheEntreprise {
  adresse: string;
  categorie: string;
  etablissements_ouverts: number | null;
  finances: FinanceAnnee[];
  annonces: AnnonceBodacc[];
  procedure_collective: string | null;
  radiee: boolean;
  inpi: SourceInpi;
}

// ---------- Tunnels de vente — miroir de backend/models/copilote.py ----------
export type EtatTunnel = "brouillon" | "en_ligne" | "en_veille";
export type CleEtape = "capture" | "remerciement" | "vente" | "upsell";
export type Parcours = "produit" | "rendez_vous";
export type TypeUpsell = "acceleration" | "complementarite" | "delegation";
export type PlacementUpsell = "post_reservation" | "pendant_appel";
export interface EtapeTunnel {
  cle: CleEtape;
  titre: string;
  accroche: string;
  contenu: string;
  bouton: string;
  offre_nom: string;
  prix: number | null;
}
export interface ContactTunnel {
  id: string;
  nom: string;
  email: string;
  date: string;
}
/** Équation de valeur ($100M Offers) : résultat × probabilité ÷ (délai × effort). */
export interface OffreValeur {
  resultat_reve: string;
  preuve: string;
  delai: string;
  effort: string;
  bonus: string[];
  garantie: string;
  rarete: string;
}
export interface Upsell {
  type: TypeUpsell;
  placement: PlacementUpsell;
  nom: string;
  prix: number | null;
  prix_barre: number | null;
  contenu: string[];
  oui: string;
  non: string;
  script_appel: string;
}
export interface Downsell {
  nom: string;
  prix: number | null;
  mensualites: number;
}
export interface ContenuLancement {
  cle: string;
  titre: string;
  decalage: number;
  date: string | null;
  texte: string;
}
/** Séquence de lancement (Launch, Jeff Walker). */
export interface Lancement {
  ouverture: string | null;
  fermeture: string | null;
  contenus: ContenuLancement[];
  programme: boolean;
}
export interface Tunnel {
  id: string;
  nom: string;
  sujet: string;
  etat: EtatTunnel;
  parcours: Parcours;
  etapes: EtapeTunnel[];
  contacts: ContactTunnel[];
  offre: OffreValeur;
  upsell: Upsell;
  downsell: Downsell;
  lancement: Lancement;
  cree_le: string;
  origine: string;
  slug?: string | null;
  seo?: { titre?: string; description?: string; image?: string };
  /** Code personnalisé par l'admin, injecté sur /t/{slug}. */
  code?: Partial<CodeTunnel>;
}
/** Miroir de CodeTunnel (backend/routers/admin_tunnels.py). */
export interface CodeTunnel {
  head: string;
  css: string;
  html_haut: string;
  html_bas: string;
  js: string;
}
export interface TunnelIn {
  nom: string;
  sujet: string;
  origine?: string;
  parcours?: Parcours;
  type_upsell?: TypeUpsell;
  /** Clé d'un modèle « par douleur client » (GET /copilote/tunnels-douleurs). */
  douleur?: string;
}
/** Miroir de ModeleDouleur (backend/routers/tunnels_douleurs.py). */
export interface ModeleDouleur {
  cle: string;
  douleur: string;
  promesse: string;
  parcours: Parcours;
  type_upsell: TypeUpsell;
}
export interface TunnelPatch {
  nom?: string;
  etat?: EtatTunnel;
  etapes?: EtapeTunnel[];
  offre?: OffreValeur;
  upsell?: Upsell;
  downsell?: Downsell;
}
export interface ModeleUpsell {
  type: TypeUpsell;
  nom: string;
  concept: string;
  exemple: string;
}
export const LIBELLES_ETAPES_TUNNEL: Record<CleEtape, string> = {
  capture: "Inscription",
  remerciement: "Merci + petite offre",
  vente: "Offre principale",
  upsell: "Option en plus",
};
export const LIBELLES_ETAT_TUNNEL: Record<EtatTunnel, string> = {
  brouillon: "Brouillon",
  en_ligne: "En ligne",
  en_veille: "En veille",
};
export const LIBELLES_PARCOURS: Record<Parcours, string> = {
  produit: "Vente en ligne",
  rendez_vous: "Prise de rendez-vous",
};
export const LIBELLES_PLACEMENT: Record<PlacementUpsell, string> = {
  post_reservation: "Juste après la commande",
  pendant_appel: "Pendant l'appel",
};

/** Proposition IA des 4 pages — jamais enregistrée sans validation (backend PropositionTunnel). */
export interface PropositionTunnel {
  etapes: EtapeTunnel[];
  source: "ia" | "modele";
  note: string;
  offre: OffreValeur | null;
  upsell: Upsell | null;
  downsell: Downsell | null;
}
