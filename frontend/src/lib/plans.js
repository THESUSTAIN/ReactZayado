// Grille tarifaire Zayado — source unique pour la page Tarifs, l'onboarding,
// la landing et les paramètres. Les clés (essentielle, serenite, pro, business,
// entreprise) restent les mêmes qu'avant pour ne pas casser les abonnements
// existants ni le paiement Mollie ; seuls les noms affichés et les prix changent.
// Prix HT. Annuel = prix mensuel équivalent × 12 (arrondi rond, ≈ 2 mois offerts).
// ⚠ Garder aligné avec PRICING dans backend/server.py (montants encaissés).

export const PLANS = [
  {
    key: "essentielle", nom: "Découverte", mensuel: 0, annuel: 0,
    pourQui: "Pour tester sans risque",
    points: ["Cockpit du jour & priorité du matin", "1 Vision Board", "Check-in énergie", "Copilote IA : 20 questions / mois"],
  },
  {
    key: "serenite", nom: "Solo", mensuel: 24, annuel: 228, star: true,
    fondateur: { mensuel: 19, annuel: 180 },
    pourQui: "Pour le solopreneur qui pilote seul",
    points: ["Tout Découverte", "Copilote IA sans limite (usage équitable)", "Vision Boards illimités, lien public, Vision Book", "Radar : 3 opportunités par jour", "Pouls business (Qonto) & revue hebdo", "E-mail du lundi : ta semaine en 1 minute"],
  },
  {
    key: "pro", nom: "Pro", mensuel: 69, annuel: 708,
    fondateur: { mensuel: 49, annuel: 468 },
    pourQui: "Pour l'indépendant qui a des clients",
    points: ["Tout Solo", "Ton chatbot client, à ta marque", "Documents IA : brief, plan 30 j, SWOT", "Alertes WhatsApp & Telegram", "Espace vendeur (marketplace)", "Support prioritaire"],
  },
  {
    key: "business", nom: "Équipe", mensuel: 149, annuel: 1548,
    pourQui: "Pour une TPE de 2 à 5 personnes",
    points: ["Tout Pro", "3 comptes inclus", "3 chatbots clients", "Chatbot qui répond avec tes documents"],
  },
];

export const PLAN_ENTREPRISE = {
  key: "entreprise", nom: "Entreprise", devis: true, plancher: 299,
  pourQui: "Pour les structures plus grandes",
  points: ["Tout Équipe", "Comptes et chatbots sans limite", "Ton domaine, ta propre clé IA", "Accompagnement dédié"],
};

// Tarif fondateur (100 premiers clients, date de fin réglée côté serveur) :
// garanti tant que le client reste abonné. Montants encaissés : backend/commerce_ext.py.
export const PLANS_LANCEMENT = PLANS.filter((p) => ["essentielle", "serenite", "pro"].includes(p.key));
export const prixFondateurMois = (p, cycle) =>
  p.fondateur ? (cycle === "annuel" ? Math.round(p.fondateur.annuel / 12) : p.fondateur.mensuel) : null;
export const dateFinFr = (iso) => {
  try { return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return iso; }
};

export const planNom = (key) => [...PLANS, PLAN_ENTREPRISE].find((p) => p.key === key)?.nom || key;
export const prixMois = (p, cycle) => (cycle === "annuel" ? Math.round(p.annuel / 12) : p.mensuel);

// Comparatif détaillé (✓ = inclus, texte = limite)
export const COMPARATIF = [
  ["Cockpit du jour, priorité, check-in énergie", "✓", "✓", "✓", "✓"],
  ["Vision Board", "1", "Illimité", "Illimité", "Illimité"],
  ["Cartes Live reliées à tes données", "✓", "✓", "✓", "✓"],
  ["Copilote IA", "20 / mois", "Sans limite*", "Sans limite*", "Sans limite*"],
  ["Lien public & Vision Book PDF", "—", "✓", "✓", "✓"],
  ["Radar (3 opportunités / jour)", "—", "✓", "✓", "✓"],
  ["Pouls business (Qonto) & revue hebdo", "—", "✓", "✓", "✓"],
  ["Documents IA (brief, plan 30 j, SWOT)", "—", "—", "✓", "✓"],
  ["Chatbot client à ta marque", "—", "—", "1", "3"],
  ["Alertes WhatsApp & Telegram", "—", "—", "✓", "✓"],
  ["Espace vendeur (marketplace)", "—", "—", "✓", "✓"],
  ["Comptes inclus", "1", "1", "1", "3"],
  ["Support", "E-mail", "E-mail", "Prioritaire", "Prioritaire"],
];
