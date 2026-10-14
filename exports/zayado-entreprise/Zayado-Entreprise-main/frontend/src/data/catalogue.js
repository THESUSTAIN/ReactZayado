// Catalogue « par besoin » — la maison de l'entrepreneur.
// NB : notes et « avis vérifiés » = EXEMPLES RÉALISTES à remplacer par de vrais avis.

const APP_URL = process.env.REACT_APP_APP_URL || "https://app.zayado.net";

export const BESOIN_UNIVERS = [
  {
    key: "entreprise", label: "Pour mon entreprise",
    besoins: ["Clarté financière", "Trésorerie & rentabilité", "Organisation & efficacité", "Espace & environnement", "Équipe & délégation"],
  },
  {
    key: "entrepreneur", label: "Pour l'entrepreneur",
    besoins: ["Énergie & récupération", "Focus & clarté mentale", "Calme & rythme", "Corps & posture", "Vision & cap"],
  },
];

/* Les offres : produits, outils digitaux Zayado, box, services partenaires */
export const MARKET_ITEMS = [
  // --- Outils & offres Zayado (digitaux) ---
  { id: "cashflow-manager", nom: "ZAYADO Cashflow Manager", type: "digital", univers: "entreprise", besoin: "Trésorerie & rentabilité",
    desc: "Modèle de trésorerie automatisé et prévisionnel à 13 semaines, connecté à vos encaissements.",
    benefice: "Gain : 4 h/semaine · Zéro surprise d'agios",
    note: "9.8", avis: 142, prix: 49, prixMode: "abonnement clés en main", prixLabel: "49€/mois",
    img: "lampe", cta: "Activer" },
  { id: "notion-4piliers", nom: "Système Opérationnel Notion — 4 Piliers", type: "digital", univers: "entreprise", besoin: "Organisation & efficacité",
    desc: "L'écosystème complet pour structurer vos process, déléguer sans friction et aligner votre équipe.",
    benefice: "Charge mentale −60 % · Délégation immédiate",
    note: "9.6", avis: 318, prix: 79, prixMode: "paiement unique · à vie", prixLabel: "79€ TTC",
    img: "planner", cta: "Ajouter" },
  { id: "myextension-ai", nom: "MyExtension AI Starter", type: "digital", univers: "entreprise", besoin: "Clarté financière",
    desc: "Assistant contextuel d'automatisation des synthèses opérationnelles et des réponses mails.",
    benefice: "Gain : 7 h/30 · Traitement automatisé",
    note: "9.9", avis: 520, prix: 29, prixMode: "abonnement sans engagement", prixLabel: "29€/mois",
    img: "casque", cta: "Activer", exclusif: true },

  // --- Produits physiques (sélection) ---
  { id: "fauteuil", nom: "Fauteuil ergonomique Alba", type: "produit", univers: "entrepreneur", besoin: "Corps & posture",
    desc: "Un dossier qui soutient vraiment les longues sessions de travail, sans faire « bureau de salon ».",
    benefice: "Dos soutenu · Journées sans courbatures",
    note: "9.7", avis: 96, prix: 349, prixMode: "livraison incluse", prixLabel: "349€",
    img: "fauteuil", cta: "Ajouter" },
  { id: "lampe", nom: "Lampe de concentration Fjord", type: "produit", univers: "entrepreneur", besoin: "Focus & clarté mentale",
    desc: "Lumière chaude dirigée, sans éblouissement — la lampe qu'on garde allumée pendant les chiffres.",
    benefice: "Focus durable · Zéro fatigue visuelle",
    note: "9.5", avis: 74, prix: 89, prixMode: "livraison incluse", prixLabel: "89€",
    img: "lampe", cta: "Ajouter" },
  { id: "plaid", nom: "Plaid de récupération Lainé", type: "produit", univers: "entrepreneur", besoin: "Calme & rythme",
    desc: "La pause qui repose : laine épaisse, poids apaisant, à portée du fauteuil de lecture.",
    benefice: "Récupération réelle entre deux blocs",
    note: "9.4", avis: 51, prix: 69, prixMode: "livraison incluse", prixLabel: "69€",
    img: "plaid", cta: "Ajouter" },
  { id: "planner", nom: "Carnet « Mon cap 90 jours »", type: "produit", univers: "entrepreneur", besoin: "Vision & cap",
    desc: "Vision, objectifs, 3 priorités, gratitude — le carnet guidé du Cockpit, en papier.",
    benefice: "Le cap écrit, tenu, relu chaque matin",
    note: "9.8", avis: 187, prix: 29, prixMode: "existe en box", prixLabel: "29€",
    img: "carnet", cta: "Ajouter" },

  // --- Box ---
  { id: "box-hiver", nom: "Box entrepreneur apaisé — fin d'année", type: "box", univers: "entrepreneur", besoin: "Énergie & récupération", promo: true,
    desc: "Carnet guidé « Mon cap 2027 », infusion bio, bougie naturelle, outil de micro-pause, carte rituel — et votre Cockpit IA offert 2 mois.",
    benefice: "Le rituel de fin d'année qui remet l'énergie au centre",
    note: "9.9", avis: 34, prix: 49, prixMode: "précommande · édition limitée", prixLabel: "49€",
    img: "mug", cta: "Commander", to: "/box" },
  { id: "box-equipe", nom: "Box équipe — cadeaux d'entreprise", type: "box", univers: "entreprise", besoin: "Équipe & délégation",
    desc: "Le cadeau de fin d'année qui dit merci à chaque collaborateur : carnet, infusion, micro-pause. Personnalisable à votre image dès 10 box.",
    benefice: "Un cadeau qui parle de vous, pas d'un gadget",
    note: "9.8", avis: 12, prix: 39, prixMode: "dès 10 box · dégressif · HT", prixLabel: "39€ HT/u",
    img: "vegetal", cta: "Commander", to: "/box" },

  { id: "mug", nom: "Tasse rituelle & thé signature", type: "produit", univers: "entrepreneur", besoin: "Calme & rythme", collection: "rituel",
    desc: "La tasse du premier rituel du matin — avec un thé signature sélectionné avec soin.",
    benefice: "Un vrai rituel, pas un café avalé",
    note: "9.6", avis: 88, prix: 18, prixMode: "livraison incluse", prixLabel: "18€",
    img: "mug", cta: "Ajouter" },
  { id: "vegetal", nom: "Végétal de bureau — tranquillité verte", type: "produit", univers: "entrepreneur", besoin: "Espace & environnement",
    desc: "Un végétal choisi pour les bureaux : peu d'entretien, beaucoup de calme visuel.",
    benefice: "Un environnement qui apaise pendant les chiffres",
    note: "9.3", avis: 37, prix: 59, prixMode: "livraison incluse", prixLabel: "59€",
    img: "vegetal", cta: "Ajouter" },

  // --- Services & accompagnement ---
  { id: "accompagnement-clarte", nom: "Accompagnement clarté financière", type: "service", univers: "entreprise", besoin: "Clarté financière",
    desc: "Un expert Zayado cadre votre situation, vos chiffres et vos priorités — du premier rendez-vous au plan tenu.",
    benefice: "Des chiffres clairs, un plan tenu à 90 jours",
    note: "9.9", avis: 27, prix: null, prixMode: "devis après diagnostic", prixLabel: "Sur devis",
    img: "carnet", cta: "Se lancer", to: "/services" },
  { id: "reprise-transmission", nom: "Reprise & transmission d'entreprise", type: "service", univers: "entreprise", besoin: "Trésorerie & rentabilité",
    desc: "Évaluation, négociation, structuration : la famille complète « Reprise et transmission », un seul interlocuteur.",
    benefice: "Un métier de plus en plus demandé, cadré par des experts",
    note: "9.7", avis: 18, prix: null, prixMode: "devis après diagnostic", prixLabel: "Sur devis",
    img: "fauteuil", cta: "Se lancer", to: "/tunnel/acquisition" },
  { id: "amenagement-travaux", nom: "Aménagement & travaux (partenaire vérifié)", type: "service", univers: "entreprise", besoin: "Espace & environnement",
    desc: "Bureaux, acoustique, lumière, plantes : des artisans sélectionnés pour un environnement qui soutient l'effort.",
    benefice: "Un bureau qui donne envie de travailler",
    note: "9.5", avis: 41, prix: null, prixMode: "devis partenaire", prixLabel: "Devis",
    img: "vegetal", cta: "Se lancer", to: "/services" },
];

/* Les 3 collections boutique (comme sur Shopify) + Promos */
export const COLLECTIONS = [
  { key: "corps", label: "Corps", besoins: ["Corps & posture", "Énergie & récupération"] },
  { key: "ame", label: "Âme", besoins: ["Focus & clarté mentale", "Calme & rythme", "Vision & cap"] },
  { key: "rituel", label: "Rituel", besoins: ["Équipe & délégation"], boxes: true },
];

export const collectionDe = (item) => {
  if (item.type === "box" || item.collection) return item.collection || "rituel";
  return COLLECTIONS.find((c) => c.besoins.includes(item.besoin))?.key || null;
};

/* Promos : drapeau sur l'offre en précommande lancement */
export const estPromo = (item) => !!item.promo;

/* Les 6 branches du Cockpit — de la vision à l'action (fiches SEO avec douleur) */
export const COCKPIT_FICHES = [
  { slug: "cockpit-vision", module: "Ma Vision — le cap", eyebrow: "Pourquoi j'avance",
    titre: "Retrouver le cap quand tout court après vous",
    douleur: "Votre projet court, mais vous ne savez plus pourquoi vous courez. La vision est dans votre tête, elle se dilue dans le quotidien.",
    promesse: "Le Cockpit transforme votre vision en objectif 3 ans, en cap 90 jours et en décisions à trancher — écrits, visibles, tenus.",
    benefices: ["Vision Board généré par l'IA à partir de vos mots", "Roue de l'équilibre et feuille de route 90 jours", "Compte à rebours de votre objectif, toujours visible"],
    img: "carnet" },
  { slug: "cockpit-radar", module: "Radar — le dehors", eyebrow: "Ce qu'on me propose",
    titre: "Arrêter de rater les occasions qui passent à côté de vous",
    douleur: "La prospection passe toujours après tout le reste. Le marché bouge pendant que vous produisez.",
    promesse: "Chaque jour, 3 opportunités qualifiées reliées à vos objectifs — avec le message prêt à envoyer.",
    benefices: ["Opportunités détectées selon VOTRE marché", "Analyse SWOT de votre activité à la demande", "Signaux faibles : ce qu'ils cherchent, avant les autres"],
    img: "casque" },
  { slug: "cockpit-plan-daction", module: "Plan d'action — l'engagement", eyebrow: "Ce que je prends",
    titre: "Une seule liste de choses à faire, enfin tenue",
    douleur: "Idées partout, tâches qui s'empilent, et cette impression d'avancer dans le flou jusqu'à vous décourager.",
    promesse: "Idées → Objectifs → Actions → Processus : la seule liste de l'appli. Le Radar y écrit, mais jamais seul.",
    benefices: ["Tout se tient : du cap au lundi matin", "Priorité unique, calibrée à votre énergie", "Revue hebdo guidée en 5 minutes"],
    img: "planner" },
  { slug: "cockpit-aujourdhui", module: "Aujourd'hui", eyebrow: "Ce que je fais",
    titre: "Savoir quoi faire aujourd'hui — et jusqu'où aller",
    douleur: "Vous ouvrez votre ordinateur et vous ne savez pas par où commencer. Alors vous commencez par l'urgent, encore.",
    promesse: "Une priorité, calibrée. L'anneau de capacité. Ce qui reste du plan. Le point du jour, prêt chaque matin.",
    benefices: ["Priorités + objectif 90 jours + victoires réunis", "Pouls business : trésorerie et semaine d'un coup d'œil", "Le cockpit s'adapte à votre énergie du jour"],
    img: "lampe" },
  { slug: "cockpit-bien-etre", module: "Bien-être — la capacité", eyebrow: "Combien je peux en faire",
    titre: "Tenir un projet exigeant sans s'user",
    douleur: "Vous tenez le rythme… jusqu'au jour où vous ne tenez plus. Votre énergie n'est ni suivie, ni pilotée.",
    promesse: "Check-in énergie en 30 secondes, courbe des 7 derniers jours, rituels doux : votre énergie devient une donnée pilotée, pas une surprise.",
    benefices: ["Creux visibles avant l'épuisement", "Respiration 4-7-8, journal, pause consciente", "L'effort équilibré avec la capacité réelle du jour"],
    img: "plaid" },
  { slug: "cockpit-ma-foi", module: "Ma Foi — le discernement", eyebrow: "Au nom de quoi je tranche",
    titre: "Décider avec un discernement qui ne dépend pas de la pression",
    douleur: "Au moment de trancher, tout se vaut — et le bruit du quotidien couvre ce qui compte vraiment.",
    promesse: "Verset, prière, repos : un espace calme pour éclairer vos décisions. Discrétion totale, à votre rythme.",
    benefices: ["Un lieu pour ce qui éclaire les décisions", "Repos protégé, rythme respecté", "Optionnel et privé — à vous seul·e"],
    img: "mug", discret: true },
];

/* Précommande Box — contenu repris du document de test (PDF) */
export const BOX_PRECO = {
  deadline: "20 novembre 2026",
  deadlineDate: new Date("2026-11-20T23:59:00+01:00"),
  seuil: 30,
  expedition: "expédition vers le 7 décembre",
  entrepreneur: {
    nom: "Box entrepreneur apaisé",
    prix: 49, prixBarre: 59,
    id: "box-hiver",
    contenu: [
      ["Carnet guidé « Mon cap 2027 »", "Vision, objectifs, 3 priorités, gratitude — aux couleurs de Zayado.", "Esprit · pièce maîtresse"],
      ["Infusion bio « Calme et focus »", "La pause qui repose — marques déjà conformes, jamais reconditionnées.", "Rythme"],
      ["Bougie naturelle ou brume d'ambiance", "Le rituel du soir.", "Rythme"],
      ["Outil de micro-pause", "Balle de massage ou bande de mobilité — bouger un peu, souvent.", "Corps"],
      ["Carte « Rituel 5 minutes »", "Un recentrage à faire le matin.", "Esprit · en pratique"],
      ["Carte « Votre Cockpit IA » + QR code", "L'abonnement 2 mois pour 1 €, juste pour vous.", "Le passage vers le pilotage"],
      ["Le geste qui fait tout", "Mot signé à la main, papier de soie, sticker de fermeture — l'effet waouh à l'ouverture.", "À partager : #EntrepreneurApaisé"],
    ],
  },
  equipe: {
    nom: "Box équipe",
    prix: 39, prixLabel: "39 € HT l'unité, dégressif dès 10 box",
    min: 10,
    contenu: [
      "Le contenu essentiel : carnet, infusion, outil de micro-pause, carte « Rituel 5 minutes »",
      "Carte de remerciement à la place de la carte Cockpit",
      "Dès 10 box : « le mot du dirigeant » imprimé sur chaque carte",
      "Dès 10 box : votre logo sur la carte — un cadeau à votre image",
      "Dès 25 box : carnet co-brandé Zayado × votre entreprise",
      "Dès 10 box : envoi direct à chaque destinataire depuis votre liste",
    ],
  },
  garanties: [
    "Seuil de 30 box : s'il n'est pas atteint, chaque client est intégralement remboursé, sans aucune démarche.",
    "Rétractation 14 jours après réception — sauf box personnalisées (ni reprises ni échangées).",
    "Une seule série : précommander, c'est garantir votre box — pas de stock, pas de gaspillage.",
  ],
};

export const ficheDe = (slug) =>
  MARKET_ITEMS.filter((i) => i.id === slug).map((i) => ({
    slug: i.id, eyebrow: i.besoin, module: i.nom, titre: i.nom, douleur: i.desc,
    promesse: i.benefice, benefices: [], img: i.img, item: i,
  }))[0] ||
  COCKPIT_FICHES.find((f) => f.slug === slug) ||
  null;
