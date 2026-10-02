// Mock data for the Cockpit Zayado showcase (frontend-only, simulated)

export const BRAND = {
  name: "Zayado",
  eyebrow: "Le cockpit IA des entrepreneurs apaisés",
  title: "Cockpit Zayado",
  subtitle:
    "Vision, priorités, prospection et énergie du dirigeant, réunies dans une seule application.",
  tagline: "L'IA prépare. Vous décidez.",
  url: "app.zayado.net",
};

// Each feature tile + its rich simulated preview payload
export const FEATURES = [
  {
    id: "aujourdhui",
    icon: "Sun",
    accent: "#DEC2A3",
    title: "Aujourd'hui",
    desc: "Le point du jour et les 3 priorités",
    preview: {
      kind: "today",
      date: "Mardi 30 septembre",
      greeting: "Bonjour Camille, journée calme et cadrée en vue.",
      summary:
        "2 rendez-vous, un devis à relancer et 30 min de deep work réservées. Votre énergie est bonne, gardez l'après-midi pour la création.",
      priorities: [
        { label: "Finaliser la proposition pour Atelier Lumen", done: true },
        { label: "Relancer 3 prospects chauds du Radar", done: false },
        { label: "Bloquer 1h de prospection ciblée", done: false },
      ],
      energy: 74,
    },
  },
  {
    id: "vision",
    icon: "Compass",
    accent: "#7C7FC9",
    title: "Vision Bord & Action",
    desc: "Objectifs et feuille de route par l'IA",
    preview: {
      kind: "vision",
      northStar: "Atteindre 8 000 € de CA mensuel récurrent d'ici juin",
      objectives: [
        { label: "Signer 4 clients en abonnement", progress: 50 },
        { label: "Publier 2 études de cas", progress: 30 },
        { label: "Automatiser l'onboarding client", progress: 15 },
      ],
      roadmap: [
        { phase: "Ce mois", text: "Lancer l'offre Pilote & valider 3 témoignages" },
        { phase: "T4", text: "Mettre en place le tunnel de prospection assistée" },
        { phase: "S1 2026", text: "Déléguer la production, se concentrer sur la vision" },
      ],
    },
  },
  {
    id: "radar",
    icon: "Radar",
    accent: "#3E7FA3",
    title: "Radar",
    desc: "3 opportunités qualifiées par jour ou plus",
    preview: {
      kind: "radar",
      intro: "3 opportunités fraîches, triées par pertinence pour votre cible.",
      opportunities: [
        {
          name: "Atelier Lumen",
          role: "Studio de design · Lyon",
          match: 94,
          reason: "Cherche un partenaire branding, budget confirmé.",
          message:
            "Bonjour, j'ai vu votre refonte récente — superbe direction artistique. J'accompagne justement les studios comme le vôtre sur…",
        },
        {
          name: "Noé Fontaine",
          role: "Fondateur · SaaS RH",
          match: 88,
          reason: "A liké 2 de vos posts, en phase de levée.",
          message:
            "Bonjour Noé, bravo pour la traction de votre produit. Un détail m'a marqué sur votre page d'accueil…",
        },
        {
          name: "Maison Claret",
          role: "E-commerce · Bordeaux",
          match: 81,
          reason: "Trafic en hausse, pas de stratégie de fidélisation.",
          message:
            "Bonjour, félicitations pour la croissance de la boutique. J'ai une idée simple pour augmenter le panier moyen…",
        },
      ],
    },
  },
  {
    id: "copilote",
    icon: "Bot",
    accent: "#3E8E86",
    title: "Copilote IA",
    desc: "Prépare vos messages, jamais n'envoie seul",
    preview: {
      kind: "copilot",
      note: "Le copilote rédige et propose. Vous relisez et validez toujours.",
      thread: [
        { from: "you", text: "Prépare une relance douce pour Atelier Lumen." },
        {
          from: "ai",
          text:
            "Voici un brouillon : « Bonjour, je reviens vers vous au sujet de la proposition envoyée lundi. Pas de pression — dites-moi simplement si le calendrier vous convient toujours. »",
        },
        { from: "you", text: "Un peu plus chaleureux et signe de ma part." },
        {
          from: "ai",
          text:
            "« Bonjour, j'espère que votre semaine démarre bien ! Je voulais m'assurer que ma proposition de lundi vous était bien parvenue. Hâte d'avancer ensemble. — Camille »",
        },
      ],
    },
  },
  {
    id: "bienetre",
    icon: "Heart",
    accent: "#C08497",
    title: "Bien-être",
    desc: "Énergie, mindset et charge mentale suivies",
    preview: {
      kind: "wellbeing",
      energy: 74,
      mentalLoad: 38,
      mood: "Serein",
      streak: 12,
      insights: [
        "Votre charge mentale baisse les jours où vous bloquez du deep work le matin.",
        "3 micro-pauses respirées aujourd'hui — continuez, ça paie.",
      ],
      week: [55, 62, 48, 70, 66, 74, 72],
    },
  },
  {
    id: "pouls",
    icon: "Activity",
    accent: "#9B86B0",
    title: "Pouls business",
    desc: "Trésorerie et stratégie rentabilité en un coup d'œil",
    preview: {
      kind: "pulse",
      cash: "12 480 €",
      cashTrend: "+8,2 %",
      mrr: "5 900 €",
      runway: "7 mois",
      bars: [40, 52, 48, 61, 58, 72, 80],
      advice:
        "Rentabilité en progression. Concentrez la semaine sur 2 devis à fort panier plutôt que 5 petits — effort moindre, marge supérieure.",
    },
  },
];
