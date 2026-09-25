// Grille tarifaire Zayado — source unique pour la page Tarifs, l'onboarding,
// la landing et les paramètres. Les clés (essentielle, serenite, pro, business,
// entreprise) restent les mêmes qu'avant pour ne pas casser les abonnements
// existants ni le paiement Mollie ; seuls les noms affichés et les prix changent.
// Prix TTC (entreprise non assujettie à la TVA) partout, sauf mention contraire.
// Annuel = prix mensuel équivalent × 12 (arrondi rond, ≈ 2 mois offerts).
// ⚠ Garder aligné avec PRICING dans backend/server.py (montants encaissés).

export const PLANS = [
  {
    // Plus d'offre gratuite : « essentielle » = compte sans offre active (accès bloqué).
    key: "essentielle", nom: "Aucune offre active", mensuel: 0, annuel: 0, masque: true,
    pourQui: "",
    points: [],
  },
  {
    // Rêveur : prix affiché et encaissé TTC (clientèle souvent non assujettie à la TVA).
    key: "reveur", nom: "Rêveur", mensuel: 15, annuel: 150, ttc: true,
    pourQui: "Pour poser ta vision et nourrir tes idées",
    points: ["Vision Boards illimités, lien public, Vision Book", "Images IA pour tes boards (3 / jour)", "Idées : capture, tri et développement par l'IA", "Chat IA qui connaît ton projet (usage équitable)"],
  },
  {
    key: "serenite", nom: "Solo", mensuel: 29, annuel: 288, star: true, ttc: true,
    fondateur: { mensuel: 24, annuel: 228 },
    pourQui: "Pour le solopreneur qui pilote seul",
    points: ["Tout Rêveur", "Cockpit du jour & Plan d'action (objectifs, actions, processus)", "Radar : 30 vrais prospects / mois (Apollo)", "Radar local : recherches Google, pub Facebook prête, ventes immobilières", "Bien-être & Mindset : carte du jour, parcours 7 jours, carnet", "Pouls business (Qonto), revue hebdo, e-mail du lundi"],
  },
  {
    key: "pro", nom: "Pro", mensuel: 69, annuel: 708, ttc: true,
    fondateur: { mensuel: 49, annuel: 468 },
    pourQui: "Pour l'indépendant qui a des clients",
    points: ["Tout Solo", "Radar : 90 vrais prospects / mois", "Agent Business : ton chatbot client, à ta marque", "Documents IA : brief, plan 30 j, SWOT", "Alertes WhatsApp & Telegram", "Espace vendeur : tes produits sur la boutique zayado.net", "Support prioritaire"],
  },
  {
    key: "business", nom: "Équipe", mensuel: 149, annuel: 1548, ttc: true,
    pourQui: "Pour avancer à 2 ou 3 : associé, assistant, commercial",
    points: ["Tout Pro pour toi", "2 comptes Solo inclus pour ton équipe (chacun son cockpit, sa Vision et son Radar)", "Radar : 150 vrais prospects / mois pour toi", "3 chatbots clients", "Chatbot qui répond avec tes documents (FAQ, tarifs, procédures)", "Invite ou retire un coéquipier en 1 clic"],
  },
];

export const PLAN_ENTREPRISE = {
  key: "entreprise", nom: "Entreprise", devis: true, plancher: 299,
  pourQui: "Pour les structures plus grandes",
  points: ["Tout Équipe", "Comptes et chatbots sans limite", "Ton domaine, ta propre clé IA", "Accompagnement dédié"],
};

// Tarif fondateur (100 premiers clients, date de fin réglée côté serveur) :
// garanti tant que le client reste abonné. Montants encaissés : backend/commerce_ext.py.
export const PLANS_LANCEMENT = PLANS.filter((p) => ["reveur", "serenite", "pro"].includes(p.key));
// Offres affichées dans le comparatif (sans « essentielle »).
export const PLANS_GRILLE = PLANS.filter((p) => !p.masque);

// Essai « 1 mois pour 1 € » (modèle Shopify) sur Solo, une fois par compte.
// ⚠ Garder aligné avec ESSAI_PRIX / ESSAI_JOURS côté serveur (commerce_ext.py).
export const ESSAI = { plan: "serenite", prix: 1, mois: 1 };
export const prixFondateurMois = (p, cycle) =>
  p.fondateur ? (cycle === "annuel" ? Math.round(p.fondateur.annuel / 12) : p.fondateur.mensuel) : null;
export const dateFinFr = (iso) => {
  try { return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return iso; }
};

export const planNom = (key) => [...PLANS, PLAN_ENTREPRISE].find((p) => p.key === key)?.nom || key;
export const prixMois = (p, cycle) => (cycle === "annuel" ? Math.round(p.annuel / 12) : p.mensuel);
// Mention fiscale : entreprise non assujettie à la TVA → tout est affiché TTC.
export const TVA = 0.2;
export const taxe = (p) => (p.ttc ? "TTC" : "HT");
export const equivalent = (p, prix) => {
  const v = p.ttc ? prix / (1 + TVA) : prix * (1 + TVA);
  const txt = (Math.round(v * 100) / 100).toLocaleString("fr-FR", { minimumFractionDigits: Number.isInteger(Math.round(v * 100) / 100) ? 0 : 2, maximumFractionDigits: 2 });
  return `soit ${txt} € ${p.ttc ? "HT" : "TTC"}`;
};

// Comparatif détaillé (✓ = inclus, texte = limite)
export const COMPARATIF = [
  ["Vision Boards illimités, lien public & Vision Book PDF", "✓", "✓", "✓", "✓"],
  ["Images IA pour le Vision Board", "3 / jour", "10 / jour", "10 / jour", "10 / jour"],
  ["Idées : capture, tri et développement par l'IA", "✓", "✓", "✓", "✓"],
  ["Chat IA qui connaît ton projet", "Sans limite*", "Sans limite*", "Sans limite*", "Sans limite*"],
  ["Cockpit du jour, priorités, check-in énergie", "—", "✓", "✓", "✓"],
  ["Plan d'action : objectifs, actions, processus", "—", "✓", "✓", "✓"],
  ["Bien-être & Mindset : carte du jour, parcours 7 jours, carnet", "—", "✓", "✓", "✓"],
  ["Radar : vrais prospects ou prescripteurs (Apollo)", "—", "30 / mois", "90 / mois", "150 / mois"],
  ["Radar local : recherches Google, pub prête, ventes immobilières", "—", "✓", "✓", "✓"],
  ["Pouls business (Qonto), revue hebdo, e-mail du lundi", "—", "✓", "✓", "✓"],
  ["Documents IA (brief, plan 30 j, SWOT)", "—", "—", "✓", "✓"],
  ["Agent Business : chatbot client à ta marque", "—", "—", "1", "3"],
  ["Chatbot qui répond avec tes documents", "—", "—", "—", "✓"],
  ["Alertes WhatsApp & Telegram", "—", "—", "✓", "✓"],
  ["Espace vendeur : produits publiés sur zayado.net", "—", "—", "✓", "✓"],
  ["Comptes inclus", "1", "1", "1", "3 (toi + 2 Solo)"],
  ["Support", "E-mail", "E-mail", "Prioritaire", "Prioritaire"],
];

// Ce que Zayado remplace (prix publics constatés en septembre 2026, indicatifs,
// hors taxes le plus souvent, facturation mensuelle). À mettre à jour si besoin.
export const OUTILS_REMPLACES = [
  { outil: "Apollo.io Basic", role: "Trouver de vrais prospects avec e-mail", prix: 59, devise: "$", inclus: "Solo" },
  { outil: "ChatGPT Plus", role: "Assistant IA", prix: 20, devise: "€", inclus: "Rêveur" },
  { outil: "Tidio Starter", role: "Chatbot client sur ton site", prix: 24, devise: "$", inclus: "Pro" },
  { outil: "Semrush Pro", role: "Mots-clés Google et volumes de recherche", prix: 139, devise: "$", inclus: "Solo" },
];
