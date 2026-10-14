export const PROFILES = {
  acquerir: {
    key: "acquerir",
    name: "Le Développeur",
    caveat: "croître par le rachat",
    desc: "Vous voulez grandir par acquisition — reprendre, intégrer, développer. Votre priorité : sécuriser chaque étape, du sourcing au financement.",
    leviers: [
      "Cartographier vos critères d’acquisition",
      "Sourcer et qualifier sans y passer vos soirées",
      "Sécuriser financement et négociation",
    ],
    serviceId: "acquerir",
  },
  optimiser: {
    key: "optimiser",
    name: "L’Optimiseur",
    caveat: "la valeur est déjà là",
    desc: "Votre activité — ou celle que vous reprenez — a de la valeur ; encore faut-il la lire. Votre priorité : rentabiliser, alléger, installer un pilotage simple.",
    leviers: [
      "Rentabiliser ce que vous exploitez déjà",
      "Alléger les coûts qui ne servent plus",
      "Adapter votre environnement de travail",
    ],
    serviceId: "optimiser",
  },
};

export const QUESTIONS = [
  {
    id: "situation",
    q: "Où en êtes-vous aujourd’hui ?",
    options: [
      { label: "Je lance mon activité (premiers revenus)", w: { optimiser: 2 } },
      { label: "Je pilote une entreprise en croissance", w: { optimiser: 2 } },
      { label: "Je reprends — ou je veux me développer par le rachat", w: { acquerir: 3 } },
    ],
  },
  {
    id: "objectif",
    if: (a) => a.situation === "Je lance mon activité (premiers revenus)",
    q: "Votre priorité n°1 en ce moment ?",
    options: [
      { label: "Mettre de l’ordre dans mes chiffres", w: { optimiser: 2 } },
      { label: "Me verser un revenu régulier, enfin", w: { optimiser: 2 } },
      { label: "Prévoir les trois prochains mois sereinement", w: { optimiser: 1, acquerir: 1 } },
    ],
  },
  {
    id: "frein",
    if: (a) => a.situation === "Je pilote une entreprise en croissance",
    q: "Qu’est-ce qui vous freine le plus ?",
    options: [
      { label: "Je sens que je laisse de la marge sur la table", w: { optimiser: 3 } },
      { label: "Je n’ai pas le temps de piloter les chiffres", w: { optimiser: 2 } },
      { label: "La trésorerie est serrée sans raison claire", w: { optimiser: 2, acquerir: 1 } },
    ],
  },
  {
    id: "priorite_reprise",
    if: (a) => a.situation === "Je reprends — ou je veux me développer par le rachat",
    q: "Votre priorité dans le rachat ?",
    options: [
      { label: "Trouver et qualifier les bonnes cibles", w: { acquerir: 3 } },
      { label: "Analyser, valoriser, financer solidement", w: { acquerir: 3 } },
      { label: "Relancer la rentabilité après l’acquisition", w: { acquerir: 2, optimiser: 1 } },
    ],
  },
  {
    id: "confort",
    q: "Vos chiffres, aujourd’hui, c’est plutôt :",
    options: [
      { label: "Une boîte noire — je préfère ne pas ouvrir", w: { optimiser: 2 } },
      { label: "Je suis les grands nombres, sans plus", w: { optimiser: 2 } },
      { label: "Plutôt clair — mais je veux aller plus vite", w: { optimiser: 1, acquerir: 1 } },
    ],
  },
  {
    id: "temps",
    q: "Le temps passé chaque mois sur vos finances :",
    options: [
      { label: "Moins d’une heure — c’est trop peu", w: { optimiser: 2 } },
      { label: "Entre une et trois heures", w: { optimiser: 2 } },
      { label: "Honnêtement ? Je découvre au fil de l’eau", w: { optimiser: 1, acquerir: 2 } },
    ],
  },
  {
    id: "frustration",
    q: "Votre plus grande frustration :",
    options: [
      { label: "Décider sans vrais repères", w: { optimiser: 2 } },
      { label: "Le jargon des experts, indigeste", w: { optimiser: 2 } },
      { label: "L’impression de sous-facturer ce que je vaux", w: { optimiser: 3 } },
    ],
  },
  {
    id: "horizon",
    q: "Dans six mois, vous voulez :",
    options: [
      { label: "Piloter en 10 minutes par mois", w: { optimiser: 3 } },
      { label: "Des marges enfin optimisées", w: { optimiser: 3 } },
      { label: "Une acquisition signée — et bien intégrée", w: { acquerir: 3 } },
    ],
  },
  {
    id: "passe",
    q: "Avez-vous déjà été accompagné sur vos finances ?",
    options: [
      { label: "Jamais", w: { optimiser: 2 } },
      { label: "Il y a longtemps", w: { optimiser: 2 } },
      { label: "Oui, récemment — je passe à la vitesse supérieure", w: { acquerir: 2 } },
    ],
  },
];

export function visibleQuestions(answers) {
  return QUESTIONS.filter((q) => !q.if || q.if(answers));
}

export function scoreAnswers(answers) {
  const totals = { acquerir: 0, optimiser: 0 };
  QUESTIONS.forEach((q) => {
    const val = answers[q.id];
    if (!val) return;
    const opt = q.options.find((o) => o.label === val);
    if (!opt) return;
    Object.entries(opt.w).forEach(([k, v]) => { totals[k] += v; });
  });
  const order = ["optimiser", "acquerir"];
  let best = order[0];
  order.forEach((k) => { if (totals[k] > totals[best]) best = k; });
  return best;
}
