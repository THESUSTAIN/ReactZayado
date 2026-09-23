// Données fictives locales pour le cockpit Zayado (aucun backend requis).

export const mockUser = {
  name: "Camille",
  firstName: "Camille",
  role: "Fondatrice · Zayado",
  checkinHour: "08:30",
};

export const initialEnergy = {
  score: 4, // sur 5
  mental: 3, // charge mentale sur 5
  mood: "aligné",
};

export const initialBalance = {
  pro: 60,
  perso: 40,
};

export const initialPriorities = [
  { id: "p1", title: "Finaliser la proposition pour Nova Studio", duration: 45, progress: 75, icon: "FileText", done: false },
  { id: "p2", title: "Appel de cadrage avec l'équipe design", duration: 30, progress: 20, icon: "Users", done: false },
  { id: "p3", title: "Marche + respiration avant le déjeuner", duration: 15, progress: 100, icon: "Footprints", done: true },
];

export const initialGoal = {
  title: "Lancer l'offre Immersion Q3",
  percent: 62,
  daysLeft: 34,
  substeps: [
    { label: "Page de vente rédigée", done: true },
    { label: "3 premiers clients pilotes", done: true },
    { label: "Séquence d'emails", done: false },
    { label: "Webinaire de lancement", done: false },
  ],
};

export const lastVictory = {
  title: "Tu as signé ton 2ᵉ client pilote hier 🎉",
  detail: "Une preuve de plus que ta vision résonne. Savoure ce moment.",
  date: "Hier · 17:42",
};

export const energyTrend14 = [
  { day: "01", value: 3 },
  { day: "02", value: 4 },
  { day: "03", value: 2 },
  { day: "04", value: 3 },
  { day: "05", value: 4 },
  { day: "06", value: 5 },
  { day: "07", value: 4 },
  { day: "08", value: 3 },
  { day: "09", value: 2 },
  { day: "10", value: 3 },
  { day: "11", value: 4 },
  { day: "12", value: 4 },
  { day: "13", value: 5 },
  { day: "14", value: 4 },
];

export const valuesLibrary = [
  "Liberté", "Impact", "Créativité", "Sérénité", "Croissance",
  "Authenticité", "Connexion", "Excellence", "Équilibre", "Audace",
  "Générosité", "Curiosité",
];

export const sidebarItems = [
  { key: "today", name: "Aujourd'hui", icon: "LayoutDashboard", active: true, badge: null },
  { key: "vision", name: "Vision", icon: "Compass", badge: null },
  { key: "ideas", name: "Idées", icon: "Lightbulb", badge: null },
  { key: "actions", name: "Actions", icon: "CheckSquare", badge: null },
  { key: "wellbeing", name: "Bien-être", icon: "Heart", badge: null },
  { key: "crm", name: "CRM", icon: "Users", badge: "alert" },
  { key: "signals", name: "Signaux", icon: "Radio", badge: "soon" },
  { key: "finance", name: "Finance / DAF", icon: "DollarSign", badge: "soon" },
  { key: "prospection", name: "Prospection Apollo", icon: "Target", badge: "soon" },
  { key: "extension", name: "Extension Navigateur", icon: "Puzzle", badge: "soon" },
  { key: "settings", name: "Paramètres", icon: "Settings", badge: null },
];

export const ecosystemLinks = [
  { name: "Boutique", icon: "Store" },
  { name: "Mon espace", icon: "LayoutGrid" },
  { name: "Groupement", icon: "Network" },
  { name: "Nos services", icon: "Sparkles" },
];

// Ton adaptatif selon le mode d'énergie.
export const energyModes = {
  elan: {
    key: "elan",
    label: "Élan",
    banner: "Ton énergie est belle aujourd'hui. C'est le moment idéal pour avancer sur ce qui compte vraiment.",
    color: "#C9A96A",
  },
  soutien: {
    key: "soutien",
    label: "Soutien",
    banner: "Énergie moyenne, et c'est parfaitement normal. Une chose à la fois, à ton rythme.",
    color: "#3B82F6",
  },
  recuperation: {
    key: "recuperation",
    label: "Récupération",
    banner: "Ton énergie est basse. Aujourd'hui, on allège. Prends soin de toi d'abord, le reste peut attendre.",
    color: "#14B8A6",
  },
};
