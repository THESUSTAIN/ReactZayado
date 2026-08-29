// Mock data for the Hub IA chat clone (frontend-only)

export const navItems = [
  { id: "hub", label: "Hub IA", icon: "MessageSquareDot" },
  { id: "vision", label: "Vision", icon: "LineChart" },
  { id: "croissance", label: "Croissance", icon: "TrendingUp" },
  { id: "daf", label: "DAF IA", icon: "Wallet" },
  { id: "espace", label: "Espace", icon: "LayoutGrid" },
];

export const initialMessages = [
  {
    id: "m1",
    type: "assistant-text",
    sender: "MyExtension AI",
    time: "08:12",
    text: "Bonjour Alexandre. J'ai veillé sur votre activité cette nuit. Voici votre point du jour.",
  },
  {
    id: "m2",
    type: "daily-report",
    sender: "MyExtension AI",
    time: "08:12",
    title: "Point du jour",
    date: "Mardi 16 juin",
    summary: "3 événements traités automatiquement. 1 décision requiert votre validation.",
    stats: [
      { label: "Prospects", value: "+4", delta: "+18%", positive: true },
      { label: "Trésorerie", value: "84 320 €", delta: "+2 100 €", positive: true },
      { label: "Focus", value: "2h40", delta: "objectif 3h", positive: false },
    ],
  },
  {
    id: "m3",
    type: "validation",
    sender: "MyExtension AI",
    time: "08:13",
    title: "Validation requise",
    subtitle: "Virement fournisseur — Notion Labs",
    text: "Un paiement récurrent de 1 250 € est prêt à être exécuté. Dois-je le confirmer ?",
    primary: "Approuver",
    secondary: "Reporter",
  },
  {
    id: "m4",
    type: "user-text",
    time: "08:14",
    text: "Ajoute Camille Rousseau à mon pipeline de prospection.",
  },
  {
    id: "m5",
    type: "prospect",
    sender: "MyExtension AI",
    time: "08:15",
    title: "Prospect ajouté",
    subtitle: "Camille Rousseau · CMO @ Lumen",
    text: "Détecté via LinkedIn. Voulez-vous que je génère une séquence d'approche en 3 messages ?",
    primary: "Générer la séquence",
    secondary: "Plus tard",
  },
];

// Simple canned assistant replies for interactivity
export const cannedReplies = [
  "C'est noté. Je m'en occupe et je vous tiens informé dès que c'est traité.",
  "Bien reçu. J'analyse votre demande et reviens vers vous dans un instant.",
  "Parfait. J'ai enregistré votre instruction et lancé l'action correspondante.",
  "Compris. Je synchronise vos données et prépare une recommandation.",
];
