import type {
  ActionItem,
  AgentConfig,
  ChatMessage,
  CockpitState,
  Idea,
  RadarOpportunity,
} from "./types";

// ---------- date helpers (localStorage app: the browser clock is the only clock) ----------

const fmt = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const todayKey = (): string => fmt(new Date());

const dayOffsetKey = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return fmt(d);
};

const isoDayOffset = (offset: number): string => dayOffsetKey(-offset);

// ---------- Radar: simulated prospecting pool (AI is pre-written, deterministic pick) ----------

export const RADAR_POOL: RadarOpportunity[] = [
  {
    id: "r01",
    action: "Relancer un devis envoyé il y a 8 jours",
    channel: "Email",
    score: 95,
    objective: "Sécuriser le chiffre d'affaires",
    message:
      "Sujet : Notre proposition du 12 — toujours d'actualité ?\n\nBonjour Madame Garcia,\n\nJe me permets de revenir vers vous concernant la proposition transmise le 12 dernier. Avez-vous pu la partager en interne ? Si des ajustements seraient utiles — périmètre, rythme ou budget — je peux vous en proposer une version révisée d'ici vendredi.\n\nRestant à votre disposition,\nCamille Renard",
  },
  {
    id: "r02",
    action: "Ré-engager un prospect mis en veille",
    channel: "Email",
    score: 92,
    objective: "Signer 2 clients récurrents",
    message:
      "Sujet : Votre projet d'identité visuelle — où en êtes-vous ?\n\nBonjour Madame Lefebvre,\n\nNous avions évoqué ensemble la refonte de votre identité visuelle il y a quelques semaines. Je sais que les agendas chargés repoussent souvent ce type de projet. Si le sujet reste d'actualité, je serais ravie de vous transmettre une proposition adaptée à votre rythme.\n\nSeriez-vous disponible pour un échange de 20 minutes cette semaine ?\n\nBien cordialement,\nCamille Renard",
  },
  {
    id: "r03",
    action: "Partager un succès client en publication",
    channel: "LinkedIn",
    score: 87,
    objective: "Développer la notoriété",
    message:
      "Post LinkedIn à publier entre 8h et 9h30 :\n\n« Une cliente m'a dit récemment : depuis notre rebranding, nos prospects comprennent enfin ce que nous faisons. C'est exactement le but. Chaque identité de marque que je conçois part de votre histoire, pas d'un template. Merci à Maison Léonie pour sa confiance. »\n\n→ Joindre le visuel avant / après, une question ouverte en commentaire.",
  },
  {
    id: "r04",
    action: "Demander une recommandation écrite",
    channel: "Email",
    score: 84,
    objective: "Signer 2 clients récurrents",
    message:
      "Sujet : Un petit coup de pouce ?\n\nBonjour Monsieur Morel,\n\nVotre retour sur notre collaboration m'a beaucoup touché. Si vous connaissez une entreprise qui chercherait à structurer sa communication, je serais honorée que vous pensiez à moi. Je vous transmets une courte présentation que vous pouvez transférer telle quelle, si vous l'estimez utile.\n\nMerci infiniment,\nCamille Renard",
  },
  {
    id: "r05",
    action: "Proposer un audit gratuit à une PME ciblée",
    channel: "Email",
    score: 81,
    objective: "Développer la notoriété",
    message:
      "Sujet : Un constat rapide sur la visibilité en ligne d'Atelier Rive\n\nBonjour,\n\nConsultante en communication digitale, je suis passée devant votre atelier et j'ai consulté votre site. Je vous propose un audit offert de 30 minutes de votre présence en ligne, avec trois recommandations concrètes et sans engagement. Êtes-vous disponible la semaine prochaine ?\n\nBien à vous,\nCamille Renard",
  },
  {
    id: "r06",
    action: "Recontacter un ancien client pour un bilan",
    channel: "Appel",
    score: 78,
    objective: "Signer 2 clients récurrents",
    message:
      "Script d'appel (5 minutes) :\n\n« Bonjour Madame Bernard, cela fait six mois depuis notre dernière campagne. J'aimerais faire le point avec vous sur les résultats obtenus et vous partager deux recommandations simples pour le trimestre qui vient. Auriez-vous un quart d'heure cette semaine ? »",
  },
  {
    id: "r07",
    action: "Relayer un témoignage client en message direct",
    channel: "WhatsApp",
    score: 74,
    objective: "Signer 2 clients récurrents",
    message:
      "Message WhatsApp à Sandra (cliente satisfaite) :\n\n« Bonjour Sandra, j'espère que le lancement s'est bien passé ! Petite question : connaissez-vous dans votre réseau un commerce qui préparerait une ouverture ? Les recommandations de clientes comme vous sont ce qui fait le plus vivre le studio. »",
  },
  {
    id: "r08",
    action: "Réagir à un commentaire puis envoyer un message privé",
    channel: "LinkedIn",
    score: 76,
    objective: "Développer la notoriété",
    message:
      "Message privé à [Prénom] :\n\n« Bonjour [Prénom], votre commentaire sur ma publication m'a fait plaisir. Vous évoquiez la difficulté de régulariser votre contenu : j'ai justement une méthode simple sur ce point, que j'utilise avec mes clients. Je vous l'envoie ? »",
  },
  {
    id: "r09",
    action: "Proposer un partenariat croisé à un graphiste",
    channel: "Appel",
    score: 72,
    objective: "Sécuriser le chiffre d'affaires",
    message:
      "Script d'appel (partenariat) :\n\n« Thomas, on cale un café jeudi ? J'ai deux projets où votre main serait précieuse, et j'ai en tête deux entreprises qui pourraient t'intéresser pour ton studio. On met en place un apport d'affaires réciproque ? »",
  },
  {
    id: "r10",
    action: "Relancer un projet arrêté à la dernière étape",
    channel: "Email",
    score: 70,
    objective: "Sécuriser le chiffre d'affaires",
    message:
      "Sujet : Votre espace client — finalisons la dernière étape\n\nBonjour Monsieur Rousseau,\n\nIl nous reste la validation de la charte pour clore votre projet. Dès votre retour, je lance la livraison des fichiers définitifs sous 48 heures.\n\nBien cordialement,\nCamille Renard",
  },
  {
    id: "r11",
    action: "Inviter à un atelier de positionnement",
    channel: "Email",
    score: 68,
    objective: "Développer la notoriété",
    message:
      "Sujet : Invitation — atelier gratuit « Poser sa marque en 3 entretiens »\n\nBonjour,\n\nJ'anime un atelier gratuit de 45 minutes pour les indépendants qui veulent clarifier leur positionnement. Voici le lien d'inscription. N'hésitez pas à le transmettre à un entrepreneur que vous souhaitez soutenir.\n\nÀ très bientôt,\nCamille Renard",
  },
  {
    id: "r12",
    action: "Demander un témoignage mis à jour",
    channel: "WhatsApp",
    score: 65,
    objective: "Développer la notoriété",
    message:
      "Message WhatsApp à Juliette :\n\n« Bonjour Juliette, votre témoignage nous avait beaucoup aidés l'an dernier. Accepteriez-vous de le mettre à jour en deux phrases, pour illustrer nos accompagnements de cette année ? Rien d'obligatoire, bien sûr. »",
  },
];

const hashCode = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export function pickOpportunities(day: string, scan: number): RadarOpportunity[] {
  const pool = RADAR_POOL;
  const start = (hashCode(day) + scan * 3) % pool.length;
  return [0, 1, 2].map((i) => pool[(start + i) % pool.length]);
}

// ---------- Agent Business: simulated conversation engine ----------

export const AGENT_TONES = [
  "Expert bienveillant",
  "Direct & chiffré",
  "Chaleureux & dynamique",
  "Sobre & professionnel",
];

export const PROSPECT_PRESETS = [
  "Bonjour, quels sont vos tarifs pour un accompagnement réseaux sociaux ?",
  "Nous avons un budget de 5 000 €, pouvez-vous nous aider ?",
  "Êtes-vous disponible en urgence cette semaine ?",
  "Que couvre exactement votre prestation d'identité de marque ?",
];

export function agentReply(cfg: AgentConfig, raw: string): string {
  const t = raw.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));

  if (has("humain", "conseiller", "parler à quelqu'un", "parler a quelqu'un")) {
    return "Je comprends, je vous mets en relation avec Camille. Pour que votre échange soit utile dès la première minute, pourrais-je avoir votre nom et votre email ? Camille vous recontacte sous 24 heures ouvrées.";
  }
  if (has("tarif", "prix", "coût", "cout", "combien", "devis")) {
    if (has("5 000", "5000", "budget de 10", "10 000", "10000")) {
      const callRule = cfg.rules.find((r) => r.id === "call-budget");
      if (callRule?.active)
        return "Merci pour ces précisions. Pour un projet de ce budget, Camille propose systématiquement un appel de 30 minutes afin de chiffrer au plus juste : voici son lien de réservation. Puis-je avoir votre email pour vous envoyer la grille tarifaire détaillée ?";
    }
    return `Concernant nos tarifs : ${cfg.offers.split("\n")[0] ?? ""} Je peux vous envoyer la grille détaillée — quel est votre email ?`;
  }
  if (has("dispo", "délai", "delai", "urgence", "rendez-vous", "rdv", "disponible")) {
    return `Voici nos conditions actuelles : ${cfg.hours.split("\n")[0] ?? ""} Pour les demandes urgentes, Camille réserve chaque jeudi matin aux novos clients. Souhaitez-vous que je vous propose un créneau ?`;
  }
  if (has("bonjour", "salut", "bonsoir", "hello")) {
    return `${cfg.welcome} Vous pouvez me demander nos tarifs, nos délais ou le détail de nos prestations.`;
  }
  if (has("identité", "identite", "site", "seo", "réseaux", "reseaux", "contenu", "logo", "marque", "communication")) {
    return `Avec plaisir. Concrètement : ${cfg.offers.split("\n")[0] ?? ""} Chaque accompagnement démarre par un diagnostic de 45 minutes, sans engagement. Voulez-vous que je vous explique la suite ?`;
  }
  return "Merci pour votre message ! Pour vous répondre précisément, pourrais-je avoir un peu plus de contexte sur votre besoin — et votre email afin que Camille puisse vous recontacter si nécessaire ?";
}

// ---------- Copilote IA: simulated document generator ----------

export const DOC_TYPES: { id: "brief" | "plan30" | "swot" | "offre"; label: string; desc: string }[] = [
  { id: "brief", label: "Brief commercial", desc: "Un document d'une page pour cadrer une campagne de prospection" },
  { id: "plan30", label: "Plan d'action 30 jours", desc: "Quatre semaines organisées, une priorité par semaine" },
  { id: "swot", label: "Analyse SWOT", desc: "Forces, faiblesses, opportunités et menaces de votre activité" },
  { id: "offre", label: "Proposition d'offre", desc: "Un document commercial prêt à envoyer à un prospect" },
];

const stamp = (): string =>
  new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function generateDoc(
  type: "brief" | "plan30" | "swot" | "offre",
  target: string,
  goal: string,
  constraints: string,
): string {
  const t = target || "les PME de votre région";
  const g = goal || "signer deux nouveaux clients récurrents";
  const c = constraints || "aucune contrainte particulière renseignée";
  const head = `Généré par le Copilote IA (simulation) — ${stamp()}\nDocument à relire et à valider avant tout envoi.\n\n`;

  if (type === "brief") {
    return (
      head +
      `BRIEF COMMERCIAL — Cible : ${t}\n\n1. CONTEXTE\nVotre studio accompagne depuis 4 ans des marques engagées sur leur identité et leur visibilité. Ce brief vise ${g}, en cohérence avec votre vision annuelle.\n\n2. CIBLE\n${t}. Frictions observées : dispersion des canaux, message flou, absence de rituel de prospection.\n\n3. OBJECTIF DE CAMPAGNE\n${g}.\nIndicateur de réussite : 3 rendez-vous qualifiés sur les 30 prochains jours.\n\n4. ANGLE\nPositionnement « partenaire de marque, pas simple prestataire ». Preuve centrale : le cas Maison Léonie (visibilité x2,4 en 6 mois).\n\n5. CANAUX\nEmail en priorité, LinkedIn en soutien, appel pour les dossiers chauds.\n\n6. CONTRAINTES\n${c}.\n\n7. PROCHAINES ÉTAPES\nValider ce brief, puis déployer les messages proposés par le Radar.`
    );
  }
  if (type === "plan30") {
    return (
      head +
      `PLAN D'ACTION 30 JOURS — Objectif : ${g}\n\nSEMAINE 1 — Fondations\n• Figer la cible : ${t}\n• Préparer vos 3 messages types (email, LinkedIn, appel)\n• Bloquer 5 créneaux de prospection dans votre agenda\n\nSEMAINE 2 — Prise d'élan\n• Lancer 3 opportunités Radar par jour, messages personnalisés\n• Relancer les 5 derniers devis non aboutis\n• Publier un témoignage client\n\nSEMAINE 3 — Amplification\n• Demander 2 recommandations écrites\n• Proposer un partenariat croisé à un prestataire complémentaire\n• Faire le point sur les réponses reçues\n\nSEMAINE 4 — Consolidation\n• Revue hebdo élargie : taux de réponse, rendez-vous obtenus\n• Ajuster le discours en fonction des objections entendues\n• Célébrer une victoire et préparer le mois suivant\n\nContraintes prises en compte : ${c}.`
    );
  }
  if (type === "swot") {
    return (
      head +
      `ANALYSE SWOT — ${stamp()}\n\nFORCES\n• 4 ans d'expérience et un cas d'école fort (Maison Léonie)\n• Une offre claire : identité de marque et visibilité clé en main\n• Des clients qui recommandent spontanément\n\nFAIBLESSES\n• Prospection irrégulière, dépendance au bouche-à-oreille\n• Tarifs rarement présentés en réunion, surtout par email\n• Peu de contenu publié de façon récurrente\n\nOPPORTUNITÉS\n• ${t.charAt(0).toUpperCase() + t.slice(1)} : demande croissante de communication responsable\n• Partenariats possibles avec graphistes et imprimeurs locaux\n• Ateliers payants pour capter une audience tiède\n\nMENACES\n• Concurrence low-cost sur les plateformes freelance\n• Saisonnalité des budgets des TPE\n\nOBJECTIF RATTACHÉ : ${g}. Contraintes : ${c}.`
    );
  }
  return (
    head +
    `PROPOSITION D'ACCOMPAGNEMENT — À l'attention de ${t}\n\nVOTRE BESOIN\nD'après nos échanges, vous cherchez à ${g}, avec une contrainte forte : ${c}.\n\nNOTRE APPROCHE\nUn accompagnement en trois temps : diagnostic (45 min), mise en place (2 semaines), transmission avec rituels simples pour tenir dans le temps.\n\nCE QUI EST INCLUS\n• Identité de marque positionnée et reel de présentation\n• Plan de visibilité sur 90 jours, 3 messages types par canal\n• Une session de coaching prospection par mois\n\nINVESTISSEMENT\n• Pack Identité : 1 200 €\n• Accompagnement mensuel : 890 € / mois, sans engagement au-delà de 3 mois\n• Projet sur mesure : devis sous 72 h après notre échange\n\nCONDITIONS\n50 % à la commande, solde à la livraison. Devis valable 30 jours.\n\nPROCHAINE ÉTAPE\nUn appel de 30 minutes cette semaine pour ajuster le périmètre.`
  );
}

export function refineIdea(text: string, category: Idea["category"]): string {
  return (
    `Idée structurée par l'IA (simulation) — catégorie : ${category}\n\n` +
    `• En une phrase : ${text.replace(/\s*$/, "")} — pensé pour vos clients qui manquent de temps.\n` +
    `• Pour qui : les indépendants et TPE qui veulent des résultats sans monter une équipe marketing.\n` +
    `• Valeur : un résultat concret en 2 semaines, sans jargon.\n` +
    `• Première action : en parler à un client de confiance et noter ses objections mot pour mot.`
  );
}

export function buildWeeklySummary(input: {
  actionsDone: number;
  actionsTotal: number;
  radarHandled: number;
  ideasCount: number;
  nextPriority: string;
}): string {
  const ratio = input.actionsTotal === 0 ? 0 : Math.round((input.actionsDone / input.actionsTotal) * 100);
  const verdict =
    ratio >= 80
      ? "Semaine remarquable : votre régularité paie, gardez ce rythme."
      : ratio >= 50
        ? "Semaine solide : l'essentiel est en place, protégez vos créneaux de prospection."
        : "Semaine en demi-teinte : réduisez le périmètre et reconstruisez la régularité.";
  return (
    `Synthèse IA (simulation) — ${ratio} % des actions du jour traitées, ` +
    `${input.radarHandled}/3 opportunités Radar exploitées, ${input.ideasCount} idées en banque. ` +
    verdict +
    (input.nextPriority ? ` Priorité de la semaine prochaine : ${input.nextPriority}.` : "")
  );
}

// ---------- Seed state (first load, before any localStorage write) ----------

const seedActions = (): ActionItem[] => [
  { id: "a1", title: "Envoyer la proposition à Maison Léonie", project: "Maison Léonie", minutes: 25, energy: "Haut", bucket: "today", done: false },
  { id: "a2", title: "Relancer Atelier Rive — devis du 12", project: "Atelier Rive", minutes: 15, energy: "Moyen", bucket: "today", done: false },
  { id: "a3", title: "Préparer le post LinkedIn client Vermeil", project: "Studio Vermeil", minutes: 20, energy: "Faible", bucket: "today", done: true },
  { id: "a4", title: "Structurer l'offre « Marque Étape »", project: "Interne", minutes: 90, energy: "Haut", bucket: "week", done: false },
  { id: "a5", title: "Point mensuel avec la comptable", project: "Interne", minutes: 45, energy: "Moyen", bucket: "week", done: false },
  { id: "a6", title: "Sous-traiter l'intégration du site Vermeil", project: "Studio Vermeil", minutes: 120, energy: "Faible", bucket: "delegue", done: false },
];

const seedIdeas = (): Idea[] => [
  { id: "i1", text: "Formule « Marque Étape » : identité + 15 jours de visibilité clé en main", category: "Offre", refined: null, createdAt: isoDayOffset(-3) },
  { id: "i2", text: "Série LinkedIn « Les coulisses d'un rebranding » en 5 épisodes", category: "Marketing / Contenu", refined: null, createdAt: isoDayOffset(-2) },
  { id: "i3", text: "Modèle Notion unique pour tous les briefs clients", category: "Optimisation interne", refined: null, createdAt: isoDayOffset(-5) },
  { id: "i4", text: "Atelier commun avec une imprimeuse locale sur l'identité de boutique", category: "À creuser plus tard", refined: null, createdAt: isoDayOffset(-6) },
];

const seedFinance = () => ({
  objective: 8500,
  treasury: 12450,
  monthlyCharges: 5200,
  revenue: (() => {
    const values = [6200, 7100, 5800, 7600, 8200, 6900];
    const now = new Date();
    return values.map((value, idx) => {
      const back = 5 - idx;
      const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
      const month = d.toLocaleDateString("fr-FR", { month: "short" });
      return { month, value, prevision: back === 0 ? 8400 : null };
    });
  })(),
  invoices: [
    { id: "f1", client: "Maison Léonie", amount: 1800, due: isoDayOffset(6), status: "En attente" as const },
    { id: "f2", client: "Atelier Rive", amount: 950, due: isoDayOffset(-3), status: "Relance" as const },
    { id: "f3", client: "Studio Vermeil", amount: 2400, due: isoDayOffset(-12), status: "Payée" as const },
    { id: "f4", client: "Comptoir Sud", amount: 1200, due: isoDayOffset(14), status: "En attente" as const },
  ],
});

const seedAgentConfig = (): AgentConfig => ({
  name: "Zaza — assistante de Camille",
  tone: AGENT_TONES[0],
  welcome:
    "Bonjour ! Je suis Zaza, l'assistante de Camille Renard. Comment puis-je vous aider — tarifs, délais ou détail des prestations ?",
  offers:
    "Pack Identité : 1 200 € — logo, charte, cartes et reel de présentation.\nAccompagnement mensuel : 890 €/mois — 3 publications/semaine, reporting mensuel.\nSite vitrine sur mesure : à partir de 2 400 €.",
  faq: "Livraison des fichiers : 48 h après validation. Déplacement : gratuit sur Nantes, 0,45 €/km ailleurs. Paiement : 50 % à la commande, 50 % à la livraison.",
  hours: "Lundi-vendredi 9h-18h. Les demandes urgentes passent par le créneau réservé du jeudi matin.",
  rules: [
    { id: "no-discount", label: "Ne jamais promettre de remise supérieure à 10 %", active: true },
    { id: "call-budget", label: "Toujours proposer un appel si le budget évoqué dépasse 3 000 €", active: true },
    { id: "no-deadline", label: "Ne jamais communiquer de délai sans validation de Camille", active: true },
    { id: "collect-contact", label: "Collecter un moyen de contact avant tout transfert humain", active: false },
  ],
});

const seedChat = (): ChatMessage[] => [
  {
    id: "c0",
    role: "system",
    text: "Simulation locale — l'agent ne contacte personne. Testez-le comme un vrai visiteur.",
  },
  {
    id: "c1",
    role: "agent",
    text: seedAgentConfig().welcome,
  },
];

export function seedState(): CockpitState {
  const day = todayKey();
  return {
    energy: [
      { date: dayOffsetKey(6), level: 6, mode: "Rythme de croisière" },
      { date: dayOffsetKey(5), level: 7, mode: "Focus maximal" },
      { date: dayOffsetKey(4), level: 5, mode: "Mode récupération" },
      { date: dayOffsetKey(3), level: 8, mode: "Focus maximal" },
      { date: dayOffsetKey(2), level: 7, mode: "Rythme de croisière" },
      { date: dayOffsetKey(1), level: 6, mode: "Rythme de croisière" },
    ],
    vision: {
      mission:
        "Faire de mon studio une référence en communication pour les marques engagées, sans sacrifier mes vendredis.",
      cap: "Où je veux emmener mon activité dans les 12 prochains mois : un panel de clients récurrents, une offre lisible, un rythme tenable.",
      objectives: [
        { id: "v1", label: "Chiffre d'Affaires", detail: "96 000 € sur l'année — 8 000 €/mois en moyenne", progress: 62 },
        { id: "v2", label: "Notoriété & Offre", detail: "Lancer l'offre « Marque Étape » et publier chaque semaine", progress: 48 },
        { id: "v3", label: "Temps libre & Équilibre", detail: "Vendredis off et 4 semaines de congés effectives", progress: 75 },
      ],
      antiGoals: [
        "Refuser les projets sous 500 € qui n'ouvrent aucune perspective",
        "Ne plus travailler le week-end sur des urgences non prévues au contrat",
        "Arrêter les appels improvisés sans agenda ni compte rendu",
      ],
    },
    radar: { day, scansUsed: 0, opportunities: pickOpportunities(day, 0), handledIds: [] },
    agentConfig: seedAgentConfig(),
    agentChat: seedChat(),
    actions: seedActions(),
    ideas: seedIdeas(),
    docs: [],
    finance: seedFinance(),
    review: {
      wins: [
        "Signature du contrat Maison Léonie",
        "Publication du guide LinkedIn — 42 commentaires",
        "Rituel de relance du vendredi installé",
      ],
      blockers: "Deux après-midi avalés par des urgences non planifiées.",
      learnings: "Les relances du jeudi matin obtiennent deux fois plus de réponses.",
      nextPriority: "Boucler l'offre « Marque Étape » et la présenter à 3 prospects.",
      summary: null,
    },
  };
}
