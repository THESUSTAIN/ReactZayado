// Diagnostic d'équilibre Zayado : 8 domaines × 3 questions (+ Vie spirituelle en option).
// Chaque domaine s'appuie sur des livres de référence (affichés dans le résultat :
// crédibilité + base des articles SEO). Calcul côté navigateur : la page publique
// marche sans compte ; le résultat est enregistré à l'inscription.

export const ECHELLE = [
  { v: 1, label: "Pas du tout" },
  { v: 2, label: "Plutôt pas" },
  { v: 3, label: "Moyen" },
  { v: 4, label: "Plutôt oui" },
  { v: 5, label: "Tout à fait" },
];

export const DOMAINES = [
  { cle: "business", label: "Activité", emoji: "🚀", cote: "pro", couleur: "#DEC2A3",
    livre: "The E-Myth Revisited (Michael Gerber) · The 12 Week Year (Moran & Lennington)",
    conseil: "Bloque 1 h par semaine pour travailler SUR ton entreprise : un objectif chiffré à 12 semaines et la prochaine action.",
    questions: ["Mon activité avance vers un objectif clair et chiffré.", "Je sais d'où viendront mes prochains clients.", "Je prends du temps pour travailler SUR mon entreprise, pas seulement DEDANS."] },
  { cle: "finances", label: "Finances", emoji: "💶", cote: "pro", couleur: "#C9A66B",
    livre: "Profit First (Mike Michalowicz) · La psychologie de l'argent (Morgan Housel)",
    conseil: "Mets de côté un petit pourcentage de chaque encaissement dès qu'il arrive, avant de payer le reste.",
    questions: ["Je connais mon chiffre d'affaires et ma trésorerie du mois.", "Je me verse un revenu régulier.", "J'ai une réserve de sécurité d'au moins 3 mois de charges."] },
  { cle: "temps", label: "Temps & focus", emoji: "⏱️", cote: "pro", couleur: "#7C93C3",
    livre: "Les 7 habitudes (Stephen Covey) · Deep Work (Cal Newport) · L'essentialisme (Greg McKeown)",
    conseil: "Chaque lundi, réserve 2 plages de 90 minutes sans notifications pour ce qui est important mais pas urgent.",
    questions: ["Chaque semaine, je bloque du temps pour l'important (pas seulement l'urgent).", "Je travaille par longues plages sans interruption.", "Je sais dire non à ce qui me disperse."] },
  { cle: "energie", label: "Santé & énergie", emoji: "⚡", cote: "perso", couleur: "#2FB89A",
    livre: "The Power of Full Engagement (Loehr & Schwartz) · Pourquoi nous dormons (Matthew Walker)",
    conseil: "Gère ton énergie, pas seulement ton temps : une vraie pause toutes les 90 minutes et une heure de coucher fixe.",
    questions: ["Je dors assez pour me sentir reposé·e.", "Je bouge au moins 3 fois par semaine.", "Je fais de vraies pauses dans la journée."] },
  { cle: "serenite", label: "Sérénité", emoji: "🌿", cote: "perso", couleur: "#4AC0E0",
    livre: "Burnout (Emily & Amelia Nagoski) · L'intelligence émotionnelle (Daniel Goleman)",
    conseil: "Termine chaque journée par un geste qui « ferme » le stress : marche, respiration, prière, ou quelques lignes de journal.",
    questions: ["Je finis ma journée sans me sentir submergé·e.", "J'ai un moyen de relâcher le stress (sport, prière, respiration, parole…).", "Je suis indulgent·e avec moi-même quand ça ne va pas."] },
  { cle: "relations", label: "Relations", emoji: "🤝", cote: "perso", couleur: "#E0669A",
    livre: "The Good Life (Waldinger & Schulz) · Les langages de l'amour (Gary Chapman)",
    conseil: "Planifie un moment sans écran avec un proche cette semaine, comme un rendez-vous client.",
    questions: ["Je passe du temps de qualité avec mes proches chaque semaine.", "J'ai au moins une personne à qui je peux tout dire.", "Mon travail laisse de la place à ma vie de famille ou de couple."] },
  { cle: "croissance", label: "Croissance", emoji: "🌱", cote: "perso", couleur: "#8b6fbf",
    livre: "Osez réussir ! (Carol Dweck) · Un rien peut tout changer (James Clear)",
    conseil: "Choisis une habitude de 2 minutes (lire 2 pages, 1 idée notée) et accroche-la à une habitude existante.",
    questions: ["J'apprends quelque chose de nouveau chaque mois.", "Je vois mes erreurs comme des occasions d'apprendre.", "J'ai des habitudes quotidiennes qui me font progresser."] },
  { cle: "sens", label: "Sens & impact", emoji: "🧭", cote: "perso", couleur: "#F1E2CC",
    livre: "Découvrir un sens à sa vie (Viktor Frankl) · Commencer par pourquoi (Simon Sinek)",
    conseil: "Écris ton « pourquoi » en une phrase et relis-le avant chaque décision importante de la semaine.",
    questions: ["Je sais pourquoi je fais ce que je fais.", "Mon activité est alignée avec mes valeurs.", "Je sens que mon travail compte pour d'autres."] },
];

export const DOMAINE_SPIRITUEL = {
  cle: "spirituel", label: "Vie spirituelle", emoji: "🕊️", cote: "spirituel", couleur: "#B8A1E3",
  livre: "The Ruthless Elimination of Hurry (John Mark Comer) · Emotionally Healthy Spirituality (Peter Scazzero)",
  conseil: "Pose un rendez-vous fixe de 10 minutes de prière ou de silence, et protège un vrai jour de repos.",
  questions: ["Je prends un temps régulier pour la prière ou la méditation.", "Je garde un vrai jour de repos dans la semaine.", "Ma foi (ou ma vie intérieure) m'aide dans mes décisions."],
};

export const domainesDe = (spirituel) => (spirituel ? [...DOMAINES, DOMAINE_SPIRITUEL] : DOMAINES);

// Liste à plat des questions : { id: "business-0", domaine, texte }
export const questionsDe = (spirituel) => domainesDe(spirituel).flatMap((d) =>
  d.questions.map((texte, i) => ({ id: `${d.cle}-${i}`, domaine: d, texte })));

// 1..5 → 0..100 par domaine ; global, pro, perso.
export function calculer(reponses, spirituel) {
  const scores = {};
  domainesDe(spirituel).forEach((d) => {
    const v = d.questions.map((_, i) => reponses[`${d.cle}-${i}`]).filter(Boolean);
    if (v.length) scores[d.cle] = Math.round((v.reduce((s, x) => s + (x - 1), 0) / (v.length * 4)) * 100);
  });
  const moy = (cles) => { const v = cles.map((k) => scores[k]).filter((x) => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  const toutes = Object.keys(scores);
  return {
    scores,
    global: moy(toutes),
    pro: moy(DOMAINES.filter((d) => d.cote === "pro").map((d) => d.cle)),
    perso: moy(DOMAINES.filter((d) => d.cote === "perso").map((d) => d.cle)),
    spirituel: scores.spirituel ?? null,
  };
}

export const niveau = (s) => (s >= 75 ? "Solide" : s >= 55 ? "Correct" : s >= 35 ? "Fragile" : "À reconstruire");

const CLE_ATTENTE = "zayado_diagnostic_attente";
export const garderEnAttente = (payload) => { try { localStorage.setItem(CLE_ATTENTE, JSON.stringify(payload)); } catch { /* stockage indisponible */ } };
export const lireEnAttente = () => { try { return JSON.parse(localStorage.getItem(CLE_ATTENTE) || "null"); } catch { return null; } };
export const oublierEnAttente = () => { try { localStorage.removeItem(CLE_ATTENTE); } catch { /* stockage indisponible */ } };
