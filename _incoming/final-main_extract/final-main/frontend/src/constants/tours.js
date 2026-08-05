// ─── VISITES GUIDÉES — définitions par page ─────────────────────
// Chaque étape référence UN vrai élément du DOM (selector CSS ou
// data-testid) qui sera spotlighté par le composant <GuidedTour>.
// Format d'une étape :
//   {
//     selector: 'string CSS' ou plusieurs séparés par | (le premier trouvé gagne),
//     title:    'Titre court affiché dans la bulle',
//     body:     'Explication en 1-2 phrases',
//     side?:    'top' | 'bottom' | 'left' | 'right' | 'auto' (défaut: auto),
//     pad?:     padding autour du spotlight en px (défaut 10),
//     beforeShow?: async () => {} — hook optionnel pour ouvrir un sheet avant
//     centerFallback?: true si l'element est optionnel et on affiche au centre en fallback
//   }
//
// Utilise "|" pour plusieurs selectors (mobile+desktop). Le premier qui existe est utilisé.

export const TOURS = {
  "/": [
    {
      selector: '[data-testid="kpi-cards"]',
      centerFallback: true,
      title: "Tes 4 KPIs essentiels",
      body: "CA du mois, Trésorerie, Prospects, Énergie. Un chiffre en rouge = action à prendre.",
      side: "bottom",
    },
    {
      selector: '[data-testid="copilote-card"]',
      centerFallback: true,
      title: "Le Co-pilote prépare, tu décides",
      body: "Valide ou reporte chaque suggestion. L'IA ne fait JAMAIS d'envoi automatique.",
      side: "auto",
    },
    {
      selector: '[data-testid="vision-carousel"]',
      centerFallback: true,
      title: "Ta vision, au centre",
      body: "Ton objectif de vie business + prochaines actions Coach. Clique pour ouvrir ton Vision Board.",
      side: "auto",
    },
    {
      selector: '[data-testid="header-search"], [data-testid="header-search-input"]',
      centerFallback: true,
      title: "Recherche globale",
      body: "Tape un client, un chiffre, un mot-clé — la recherche fouille toutes les pages en une frappe.",
      side: "bottom",
    },
    {
      selector: '[data-testid="header-notifications-btn"]',
      centerFallback: true,
      title: "Notifications",
      body: "Alertes prioritaires : opportunité chaude, trésorerie basse, échéance URSSAF. Rien de bruyant, seulement l'utile.",
      side: "bottom",
    },
    {
      selector: '[data-testid="header-profile-btn"]',
      centerFallback: true,
      title: "Menu profil",
      body: "Paramètres, langue (FR/EN), aide, déconnexion. Tout est ici — pas de menu caché.",
      side: "left",
    },
  ],
  "/vision-board": [
    {
      selector: '[data-testid="m-add"], [data-testid="vision-prompt-bar-container"]',
      centerFallback: true,
      title: "Ajouter au canvas",
      body: "Ouvre la sheet Ajouter : Note, Objectif, Palette — ou un Modèle prêt (Lancement / Croissance / Équilibre / Rayonnement) qui pose 5 cartes en 1 tap.",
      side: "top",
    },
    {
      selector: '[data-testid="m-more"], [data-testid="vision-export"], [data-testid="vision-focus"]',
      centerFallback: true,
      title: "Menu Plus (⋯)",
      body: "Coach Vision · Modèles de départ · Rappels doux hebdo · Exporter en Vision Book · Vider. Le seul menu à connaître.",
      side: "top",
    },
    {
      selector: '[data-testid="vision-canvas-container"], [data-testid="m-vision-root"]',
      centerFallback: true,
      title: "Ton canvas",
      body: "Tap = édite. Tap long = déplace, redimensionne, supprime. Chaque carte nourrit ton Coach IA.",
      side: "auto",
    },
  ],
  "/pilotage": [
    {
      selector: '[data-testid="period-selector"]',
      centerFallback: true,
      title: "Choisir la période",
      body: "Ce mois-ci, trimestre, année. Toutes les cartes et le graphique se réajustent.",
      side: "bottom",
    },
    {
      selector: '[data-testid="add-entry-btn"]',
      centerFallback: true,
      title: "Ajouter une entrée",
      body: "Facture, dépense ou cotisation en 3 champs. Ou automatise via l'intégration Qonto/Stripe (Réglages → Intégrations).",
      side: "bottom",
    },
    {
      selector: '[data-testid="sources-strip"]',
      centerFallback: true,
      title: "Tes sources connectées",
      body: "Un point vert = synchronisé. Clique une source pour la connecter ou la resynchroniser.",
      side: "bottom",
    },
    {
      selector: '[data-testid="summary-card"], [data-testid="verdict-card"]',
      centerFallback: true,
      title: "Ton verdict financier",
      body: "Salaire possible, trésorerie, marge nette. Le vrai chiffre d'un indépendant : salaire possible = CA − charges − cotisations.",
      side: "auto",
    },
    {
      selector: '[data-testid="ca-chart"]',
      centerFallback: true,
      title: "Évolution du CA",
      body: "Ton chiffre d'affaires mois par mois. Repère facilement les creux et les pics saisonniers.",
      side: "auto",
    },
    {
      selector: '[data-testid="coach-card"]',
      centerFallback: true,
      title: "Coach financier",
      body: "L'IA repère les alertes (trésorerie, URSSAF, retard) et prépare tes 3 actions financières prioritaires.",
      side: "auto",
    },
    {
      selector: '[data-testid="cashflow-simulator"], [data-testid="sim-amount-slider"]',
      centerFallback: true,
      title: "Simulateur de trésorerie",
      body: "Fais varier tes contrats et montants moyens : la projection de trésorerie s'actualise en temps réel.",
      side: "auto",
    },
    {
      selector: '[data-testid="alerts-card"], [data-testid="pilotage-echeances"]',
      centerFallback: true,
      title: "Alertes & échéances",
      body: "URSSAF, TVA, retards clients — rien ne t'échappe. Chaque alerte a une action à un clic.",
      side: "auto",
    },
    {
      selector: '[data-testid="export-comptable-btn"]',
      centerFallback: true,
      title: "Export comptable",
      body: "Génère un fichier prêt à envoyer à ton comptable (période sélectionnée).",
      side: "bottom",
    },
  ],
  "/bien-etre": [
    {
      selector: '[data-testid="morning-ritual"]',
      centerFallback: true,
      title: "Check-in du matin",
      body: "5 niveaux d'énergie. 3 secondes chaque matin. C'est le geste qui construit ton historique.",
      side: "auto",
    },
    {
      selector: '[data-testid="wellness-submit"]',
      centerFallback: true,
      title: "Valider ton état",
      body: "Un clic enregistre. Ton pattern se révèle après ~10 jours de saisie.",
      side: "top",
    },
    {
      selector: '[data-testid="burnout-alert"], [data-testid="verdict-card"]',
      centerFallback: true,
      title: "Verdict + alerte burn-out",
      body: "Si ton énergie baisse 3 jours d'affilée, le Co-pilote adapte automatiquement tes priorités du jour.",
      side: "auto",
    },
    {
      selector: '[data-testid="micro-actions"]',
      centerFallback: true,
      title: "Micro-actions du jour",
      body: "3 gestes de 5 minutes maximum, adaptés à ton état d'énergie actuel.",
      side: "auto",
    },
    {
      selector: '[data-testid="energy-history"]',
      centerFallback: true,
      title: "Ton historique 30 jours",
      body: "Visualise tes pics et tes creux. Utile pour identifier les vraies causes de fatigue.",
      side: "auto",
    },
    {
      selector: '[data-testid="boutique-recos"]',
      centerFallback: true,
      title: "Recommandations Zayado",
      body: "Selon ton score, la boutique propose des outils (lampe, thé, coussin). Rien d'obligatoire.",
      side: "top",
    },
  ],
  "/croissance": [
    {
      selector: '[data-testid="growth-pipeline"]',
      centerFallback: true,
      title: "Ton pipeline Kanban",
      body: "Fais glisser les cartes : Détecté → Contacté → En discussion → Signé. Le pipeline se met à jour tout seul.",
      side: "auto",
    },
    {
      selector: '[data-testid="growth-leads"]',
      centerFallback: true,
      title: "Chasse aux leads",
      body: "L'IA scanne Reddit, LinkedIn, Google Maps et te ramène des prospects qualifiés à ton client idéal.",
      side: "auto",
    },
    {
      selector: '[data-testid="growth-canaux"]',
      centerFallback: true,
      title: "Choisir les canaux",
      body: "NET (digital) → Reddit, LinkedIn, X. TERRAIN (local) → Google Maps, forums, Nextdoor. Max 3 pour la qualité.",
      side: "auto",
    },
    {
      selector: '[data-testid="growth-conversations"]',
      centerFallback: true,
      title: "Conversations",
      body: "Suivi de toutes tes discussions ouvertes. Le Coach suggère la prochaine relance.",
      side: "auto",
    },
    {
      selector: '[data-testid="growth-alerts"]',
      centerFallback: true,
      title: "Alertes croissance",
      body: "Signaux faibles à saisir maintenant : compétiteur en baisse, mot-clé trending, prospect chaud.",
      side: "auto",
    },
  ],
  "/simulation": [
    {
      selector: '[data-testid="sim-programme-input"]',
      centerFallback: true,
      title: "Décris ton programme",
      body: "Master 2 Marketing, Licence Pro RH, MBA Finance… L'IA calibre 3 clients virtuels adaptés à ton domaine.",
      side: "bottom",
    },
    {
      selector: '[data-testid="sim-start-btn"]',
      centerFallback: true,
      title: "Démarrer la simulation",
      body: "Un clic génère 3 clients virtuels avec une première mission chacun. Bêta gratuite illimitée (20 tâches/jour max).",
      side: "top",
    },
    {
      selector: '[data-testid="sim-response-input"]',
      centerFallback: true,
      title: "Ta réponse au client",
      body: "Rédige ta réponse professionnelle. L'IA t'évalue sur le fond, la forme et l'adaptation au client.",
      side: "top",
    },
    {
      selector: '[data-testid="sim-submit-btn"]',
      centerFallback: true,
      title: "Envoyer et recevoir le feedback",
      body: "L'IA note ta réponse sur 10, souligne tes points forts et pointe ce qui peut être amélioré.",
      side: "top",
    },
    {
      selector: '[data-testid="sim-feedback"], [data-testid="sim-feedback-score"]',
      centerFallback: true,
      title: "Feedback IA détaillé",
      body: "Score, commentaires, points forts, axes d'amélioration. Un vrai coaching individuel sur chaque mission.",
      side: "left",
    },
  ],
  "/parametres": [
    {
      selector: '[data-testid="settings-completion"]',
      centerFallback: true,
      title: "Ton profil en un coup d'œil",
      body: "L'anneau doré indique le % de complétion de ton profil. Plus il est complet, plus le Co-pilote est précis.",
      side: "bottom",
    },
    {
      selector: '[data-testid="settings-search-input"]',
      centerFallback: true,
      title: "Rechercher un réglage",
      body: "Tape un mot-clé (ex: notification, mémoire, Stripe) pour sauter directement à la bonne section.",
      side: "bottom",
    },
    {
      selector: '[data-testid="settings-nav-desktop"], [data-testid="settings-nav-mobile"]',
      centerFallback: true,
      title: "Les 8 sections",
      body: "Profil, Mémoire IA, Notifications, Inspiration, Intégrations, Facturation, Apparence & Sécurité. Chaque section est autonome.",
      side: "auto",
    },
    {
      selector: '[data-testid="settings-memoire"]',
      centerFallback: true,
      title: "Mémoire du Co-pilote",
      body: "Décris ta vision, ton client idéal et tes valeurs. Le Coach IA s'appuie dessus pour toutes ses suggestions.",
      side: "auto",
      beforeShow: async () => {
        // Ouvre l'onglet "memoire" si présent dans la nav
        const btn = document.querySelector('[data-testid="settings-nav-memoire"], [data-testid="settings-nav-mobile-memoire"]');
        if (btn) btn.click();
      },
    },
    {
      selector: '[data-testid="settings-integrations"], [data-testid="settings-nav-integrations"]',
      centerFallback: true,
      title: "Intégrations",
      body: "Connecte Stripe, Qonto, Google Drive, LinkedIn, Brevo… pour que Zayado remplisse Pilotage et Croissance automatiquement.",
      side: "auto",
      beforeShow: async () => {
        const btn = document.querySelector('[data-testid="settings-nav-integrations"], [data-testid="settings-nav-mobile-integrations"]');
        if (btn) btn.click();
      },
    },
    {
      selector: '[data-testid="settings-facturation"], [data-testid="settings-nav-facturation"]',
      centerFallback: true,
      title: "Facturation & forfait",
      body: "Change de forfait, télécharge tes factures, applique un code promo. Tout est ici, jamais caché.",
      side: "auto",
      beforeShow: async () => {
        const btn = document.querySelector('[data-testid="settings-nav-facturation"], [data-testid="settings-nav-mobile-facturation"]');
        if (btn) btn.click();
      },
    },
    {
      selector: '[data-testid="settings-securite"], [data-testid="settings-nav-securite"]',
      centerFallback: true,
      title: "Sécurité & données",
      body: "Envoi de magic link, export RGPD complet, suppression de compte. Tes données t'appartiennent — toujours exportables.",
      side: "auto",
      beforeShow: async () => {
        const btn = document.querySelector('[data-testid="settings-nav-securite"], [data-testid="settings-nav-mobile-securite"]');
        if (btn) btn.click();
      },
    },
  ],
  "/roadmap": [
    {
      selector: '[data-testid="roadmap-shipped"]',
      centerFallback: true,
      title: "Livré",
      body: "Ce qui est déjà en production. Les dernières fonctionnalités ajoutées apparaissent en haut.",
      side: "bottom",
    },
    {
      selector: '[data-testid="roadmap-in-progress"]',
      centerFallback: true,
      title: "En cours",
      body: "Ce qu'on développe actuellement, avec une estimation trimestrielle. C'est ici que ça bouge le plus vite.",
      side: "bottom",
    },
    {
      selector: '[data-testid="roadmap-planned"]',
      centerFallback: true,
      title: "Envisagé (à voter)",
      body: "Les idées candidates. Vote ▲ pour celles qui te seraient utiles — les plus demandées passent en priorité.",
      side: "auto",
    },
    {
      selector: '[data-testid="roadmap-vote-btn"]',
      centerFallback: true,
      title: "Voter pour une fonctionnalité",
      body: "Un clic sur ▲ = un vote. Ton vote est enregistré localement — on lit ces signaux pour prioriser la prochaine sprint.",
      side: "left",
    },
    {
      selector: '[data-testid="roadmap-back"]',
      centerFallback: true,
      title: "Retour au cockpit",
      body: "La roadmap est publique : tu peux la partager avec un pair ou un investisseur curieux.",
      side: "bottom",
    },
  ],
  "/bureau": [
    {
      selector: '[data-testid="tab-missions"]',
      centerFallback: true,
      title: "Onglet Missions",
      body: "Ton Kanban personnel : À faire / En cours / Fait. Tape la tâche + une date d'échéance.",
      side: "bottom",
    },
    {
      selector: '[data-testid="new-task-input"], [data-testid="add-task-btn"]',
      centerFallback: true,
      title: "Ajouter une mission",
      body: "Renseigne le libellé + la date, puis Ajouter. Elle apparaît en tête de la colonne À faire.",
      side: "top",
    },
    {
      selector: '[data-testid="generate-tasks-btn"]',
      centerFallback: true,
      title: "Générer mes missions",
      body: "L'IA lit ton Vision Board et propose 5-10 missions concrètes de la semaine. Refais-le chaque lundi.",
      side: "top",
    },
    {
      selector: '[data-testid="tab-processus"]',
      centerFallback: true,
      title: "Onglet Processus",
      body: "Documente tes process récurrents. L'IA les transforme en check-lists réutilisables pour gagner du temps.",
      side: "auto",
    },
    {
      selector: '[data-testid="tab-documents"]',
      centerFallback: true,
      title: "Onglet Documents",
      body: "Connecte Google Drive / OneDrive, ou dépose factures et contrats. L'IA OCRise et remplit auto Pilotage.",
      side: "auto",
    },
    {
      selector: '[data-testid="tab-copilote"], [data-testid="copilote-input"]',
      centerFallback: true,
      title: "Onglet Co-pilote",
      body: "Chat direct avec ton Co-pilote IA. Il connaît ton Vision Board et tes chiffres pour des réponses concrètes.",
      side: "auto",
    },
    {
      selector: '[data-testid="bureau-simulation-entry"]',
      centerFallback: true,
      title: "Simulation Client — Bêta gratuite",
      body: "Entraîne-toi sur des clients virtuels IA calibrés à ton domaine. Feedback détaillé sur chaque mission.",
      side: "top",
    },
  ],
};

/**
 * Renvoie true si l'utilisateur a déjà terminé la visite guidée pour ce path.
 * Persisté en localStorage (clé `zayado_tour_seen_{path}`).
 */
export function hasSeenTour(path) {
  try {
    return localStorage.getItem(`zayado_tour_seen_${path.replace(/\//g, "_")}`) === "1";
  } catch {
    return false;
  }
}

export function markTourSeen(path) {
  try {
    localStorage.setItem(`zayado_tour_seen_${path.replace(/\//g, "_")}`, "1");
  } catch { /* noop */ }
}

export function resetTour(path) {
  try {
    localStorage.removeItem(`zayado_tour_seen_${path.replace(/\//g, "_")}`);
  } catch { /* noop */ }
}
