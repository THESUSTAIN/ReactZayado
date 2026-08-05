export const STATUTS = [
  "Micro-entreprise", "SASU", "EURL", "BNC", "LMNP/LMP", "En cours de création", "Autre",
];
export const SECTEURS = [
  "Conseil / Coaching", "Commerce / Retail", "Services aux entreprises", "Artisanat",
  "Immobilier", "Santé / Bien-être", "Tech / SaaS", "Créatif / Communication", "Autre",
];
export const OBJECTIFS = [
  "Trouver mes premiers clients", "Structurer mon activité", "Augmenter mon CA",
  "Lancer un nouveau service", "Créer mon entreprise", "Autre",
];
export const FREINS = [
  "Trouver des clients", "Gérer mon temps", "Organiser mes finances", "Me faire connaître",
  "La charge mentale / le burn-out", "Les démarches administratives",
  "Garder la motivation", "Structurer mes processus",
];
export const WORKSPACES = [
  { id: "drive", label: "Google Drive", needsUrl: true, ph: "URL du dossier partagé" },
  { id: "onedrive", label: "Microsoft OneDrive", needsUrl: true, ph: "URL du dossier partagé" },
  { id: "notion", label: "Notion", needsUrl: false },
  { id: "trello", label: "Trello", needsUrl: false },
  { id: "none", label: "Je n'utilise pas de cloud pour l'instant", needsUrl: false },
];
export const AI_LOADING_MESSAGES = [
  "Analyse de votre projet en cours…",
  "Détection du type de projet : TERRAIN ou NET…",
  "Configuration de votre Expansion Agent…",
  "Préparation de votre Vision Board…",
  "Génération de votre 1ère mission du jour…",
  "Votre cockpit est configuré.",
];
export const SLIDES = [
  { tag: "BIENVENUE", title: "Entreprendre avec sens, clarté et stabilité.", sub: "Zayado est la marketplace des entrepreneurs indépendants. Pas juste un outil. Un écosystème.", cta: "Continuer" },
  { tag: "LE PROBLÈME", title: "Créer son activité ne devrait pas signifier s'épuiser.", sub: "Trop d'entrepreneurs s'épuisent non pas par manque de talent, mais par manque de clarté, de structure et de soutien.", cta: "Continuer" },
  { tag: "LA MÉTHODE", title: "L'IA prépare. Vous décidez.", sub: "L'IA prépare, analyse, classe et rédige. Vous validez, décidez et construisez la relation.", cta: "Continuer" },
  { tag: "C'EST PARTI", title: "Votre cockpit est prêt à être configuré.", sub: "5 questions. 3 minutes. Votre Co-pilote sera prêt à travailler pour vous immédiatement.", cta: "Commencer" },
];
export const CITATIONS_CLARTE = [
  "Les grandes choses se font par une série de petites choses réunies.",
  "La vision sans action n'est qu'un rêve.",
  "Le succès, c'est la somme de petits efforts répétés jour après jour.",
  "Ce qui est mesuré s'améliore.",
  "Un objectif sans plan n'est qu'un souhait.",
];
export const CITATIONS_SENS = [
  "La foi, c'est prendre le premier pas même quand on ne voit pas tout l'escalier.",
  "Ce qui vient du cœur touche le cœur.",
  "La patience et le temps font plus que la force.",
  "Chaque jour est une nouvelle occasion de recommencer.",
  "On récolte ce que l'on sème, avec le temps qu'il faut.",
];
export const randomCitation = (ambiance) => {
  const arr = ambiance === "clarte" ? CITATIONS_CLARTE : CITATIONS_SENS;
  // Seed basé sur la date du jour — même citation toute la journée, change le lendemain,
  // sans dépendre d'un backend dédié.
  const today = new Date().toISOString().slice(0, 10); // "2026-07-12"
  let seed = 0;
  for (let i = 0; i < today.length; i++) seed = (seed * 31 + today.charCodeAt(i)) >>> 0;
  return arr[seed % arr.length];
};
