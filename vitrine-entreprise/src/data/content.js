export const BRAND = {
  maison: "La maison des entrepreneurs apaisés",
  slogan: "Entreprendre avec clarté financière, sérénité et équilibre.",
};

export const MISSION = "Équilibrer vie personnelle et vie professionnelle.";

export const MARQUEE_ITEMS = [
  "Marketplace",
  "Clarté financière",
  "Bien-être",
  "Performance durable",
];

export const STATS = [
  { v: 300, s: "+", label: "dirigeants passés par le diagnostic" },
  { v: 2, s: " min", label: "pour obtenir profil + leviers" },
  { v: 3, s: "", label: "leviers prioritaires, sur mesure" },
  { v: 4.9, s: "/5", d: 1, label: "note moyenne des résultats" },
];

export const LOGOS = ["Atelier Lume", "Groupe Verney", "Maison Tinel", "Ferme du Sud", "Kaléo Lab", "Studio Ocre"];

export const TESTIMONIALS = [
  {
    text: "Pour la première fois, j’ouvre mes chiffres sans appréhension — et je pilote sans y passer mes week-ends.",
    author: "Claire M.",
    role: "Fondatrice, Maison Tinel",
  },
  {
    text: "Six points de marge récupérés en un trimestre. Sans vendre plus — juste en voyant clair.",
    author: "Karim B.",
    role: "Dirigeant, Groupe Verney",
  },
  {
    text: "L’acquisition s’est jouée à trois semaines de clarification près. Le sourcing qualifié a changé la donne.",
    author: "Julien R.",
    role: "Repreneur, Ferme du Sud",
  },
];

export const POSITIONING = {
  nots: ["Ni cabinet M&A", "Ni marketplace de plus", "Ni app de bien-être"],
  lead: "Zayado accompagne l’entrepreneur dans la construction d’une entreprise performante, rentable et équilibrée.",
  lines: [
    ["L’acquisition", "un moyen de développement"],
    ["L’optimisation", "le moteur de création de valeur"],
    ["Le cockpit", "le système de pilotage"],
    ["La marketplace", "le moyen d’équiper et d’accompagner"],
    ["Le bien-être", "une partie intégrante de la performance"],
  ],
};

export const FOUNDATIONS = [
  {
    key: "entrepreneur",
    title: "L’entrepreneur",
    sub: "le bien-être, au centre",
    icon: "user",
    axes: ["Physique", "Mental (mindset)", "Performance"],
    path: ["Énergie", "Focus", "Récupération", "Équilibre"],
    pathLabel: "La progression visée",
  },
  {
    key: "entreprise",
    title: "L’entreprise",
    sub: "la partie financière",
    icon: "building",
    axes: ["Clarté financière", "Rentabilité", "Trésorerie"],
    path: ["Clarté", "Organisation", "Rentabilité", "Environnement"],
    pathLabel: "La progression visée",
  },
];

export const MEANS = [
  { num: "01", title: "Acquérir", text: "La croissance externe au service de l’équilibre : rachat ou reprise, maîtrisé de bout en bout.", to: "/services#service-acquerir" },
  { num: "02", title: "Optimiser", text: "La performance et l’environnement de travail — rentabilité, coûts, ergonomie.", to: "/services#service-optimiser" },
  { num: "03", title: "Piloter — Cockpit", text: "Le lien permanent : les chiffres de l’entreprise et l’énergie de l’entrepreneur.", to: "/cockpit" },
  { num: "04", title: "La Marketplace", text: "Équiper les deux socles : produits, équipements, partenaires.", to: "/marketplace" },
];

export const COCKPIT = {
  entreprise: ["Chiffre d’affaires", "Marge", "Trésorerie", "Rentabilité", "Projets", "Performance"],
  entrepreneur: ["Énergie", "Charge", "Récupération", "Concentration", "Rythme", "Équilibre"],
  aiQuote: "Votre CA progresse, mais votre charge de travail augmente fortement. Voici les trois actions prioritaires pour préserver votre rentabilité sans augmenter votre charge.",
  note: "Bien plus qu’un dashboard financier — c’est le lien permanent entre l’entreprise et celui qui la dirige.",
  status: "En construction — le cockpit sera ouvert d’abord aux clients accompagnés.",
};

export const WELLBEING = {
  entreprise: ["Clarté", "Organisation", "Rentabilité", "Environnement"],
  entrepreneur: ["Énergie", "Focus", "Récupération", "Équilibre"],
  principle: "Une entreprise performante ne doit pas être construite au détriment de celui qui la dirige.",
};

export const SERVICES = [
  {
    id: "acquerir",
    num: "01",
    title: "Acquérir",
    promise: "Se développer par le rachat ou la reprise.",
    accent: "grandir sans repartir de zéro",
    short: "Pour l’entrepreneur qui veut se développer par le rachat : de la recherche d’opportunités à la signature — et après.",
    icon: "key",
    forWho: ["Dirigeants en croissance externe", "Repreneurs d’entreprise", "Investisseurs actifs"],
    items: [
      "Recherche d’opportunités",
      "Sourcing Apollo / réseau",
      "Qualification",
      "Analyse financière",
      "Valorisation",
      "Financement",
      "Négociation",
      "Accompagnement à l’acquisition",
    ],
    steps: [
      { t: "Cadrage — critères & cibles", d: "Vos critères d’acquisition, votre capacité, votre horizon. On définit la cible idéale." },
      { t: "Sourcing & qualification", d: "Recherche active — réseau, Apollo — et qualification serrée des opportunités." },
      { t: "Analyse & valorisation", d: "Analyse financière, valorisation, montage du financement." },
      { t: "Négociation & closing", d: "On négocie, on sécurise — et on vous accompagne dans l’intégration." },
    ],
    quote: { text: "L’acquisition s’est jouée à trois semaines de clarification près. Le sourcing qualifié a changé la donne.", author: "Julien R.", role: "Repreneur, Ferme du Sud" },
  },
  {
    id: "optimiser",
    num: "02",
    title: "Optimiser",
    promise: "Créer de la valeur dans ce que vous exploitez déjà.",
    accent: "la performance ET l’environnement",
    short: "Une fois l’entreprise identifiée ou reprise : rentabiliser, alléger, organiser — jusqu’à l’environnement de travail.",
    icon: "trending",
    forWho: ["Entreprises en croissance", "Activités récemment reprises", "Marges et coûts à maîtriser"],
    groups: [
      { label: "La performance", items: ["Rentabilité", "Coûts", "Organisation", "Processus", "Marketing", "Outils"] },
      { label: "L’environnement de travail", items: ["Aménagement / décoration", "Ergonomie", "Équipements", "Partenaires spécialisés, dont Trouveton"] },
    ],
    steps: [
      { t: "Diagnostic de valeur", d: "Rentabilité réelle, coûts dormants, processus qui frottent." },
      { t: "Plan d’arbitrage", d: "Priorités chiffrées : marges, organisation, outils, marketing." },
      { t: "Environnement de travail", d: "Aménagement, ergonomie, équipements — avec nos partenaires, dont Trouveton." },
      { t: "Suivi 60 jours", d: "On mesure l’effet réel et on ajuste, ensemble." },
    ],
    quote: { text: "Six points de marge récupérés en un trimestre. Sans vendre plus — juste en voyant clair.", author: "Karim B.", role: "Dirigeant, Groupe Verney" },
  },
];

export const TUNNELS = {
  optimisation: {
    slug: "optimisation",
    eyebrow: "Tunnel — Optimisation d’entreprise",
    title: "Vos marges existent déjà. On va les libérer.",
    caveat: "sans vendre plus, sans travailler plus",
    sub: "L’optimisation d’entreprise Zayado : rentabilité, coûts, organisation et environnement de travail. Moins de brume, plus de résultat — pour l’entreprise et pour celui qui la dirige.",
    douleurs: [
      "Je sens que je laisse de la marge sur la table, mais je ne sais pas où",
      "Les coûts grignotent tout — et je ne les vois même plus",
      "Je passe mes journées à éteindre des incendies, pas à piloter",
      "Mon espace de travail me fatigue plus qu’il ne m’aide",
      "Chaque décision financière se prend au flair",
    ],
    avantages: [
      "Marges réelles cartographiées, offre par offre",
      "Charges dormantes débusquées — souvent 5 à 15 % du chiffre",
      "Une organisation et des process qui tiennent sans vous",
      "Un environnement de travail qui soutient l’énergie — ergonomie, aménagement, avec Trouveton",
      "Un pilotage simple : 5 chiffres, 10 minutes par mois",
    ],
    angles: [],
    steps: [
      { t: "Diagnostic", d: "2 minutes pour situer votre entreprise et votre charge." },
      { t: "Analyse de valeur", d: "Marges, coûts, organisation : on lit la réalité chiffrée." },
      { t: "Plan d’arbitrage", d: "Trois leviers chiffrés, actionnables cette semaine." },
      { t: "Suivi 60 jours", d: "On mesure, on ajuste, on ancre." },
    ],
    quote: { text: "Six points de marge récupérés en un trimestre. Sans vendre plus — juste en voyant clair.", author: "Karim B.", role: "Dirigeant, Groupe Verney" },
    formService: { title: "Optimisation" },
  },
  acquisition: {
    slug: "acquisition",
    eyebrow: "Tunnel — Acquisition & reprise",
    title: "Et si votre prochaine entreprise était déjà construite ?",
    caveat: "acheter, souvent plus rentable que créer",
    sub: "L’acquisition Zayado : sourcing, qualification, analyse, valorisation, financement, négociation. Vous signez une entreprise qui tourne — pas un pari.",
    douleurs: [
      "Créer : trois ans de galère avant un revenu stable — si tout va bien",
      "Je ne sais pas où chercher, ni comment repérer les bonnes cibles",
      "La peur de payer trop cher une entreprise mal analysée",
      "Le financement semble inaccessible — l’apport, d’abord",
      "Reprendre, c’est acheter des problèmes qu’on ne voit pas",
    ],
    avantages: [
      "Un revenu et des clients dès le premier jour — l’activité existe déjà",
      "Sourcing qualifié (réseau, Apollo) : les entreprises à vendre sont bien plus nombreuses qu’on ne le croit",
      "Analyse et valorisation serrées : on paie le juste prix, pas le prix du regret",
      "Jusqu’à 80–90 % du prix financé — l’apport n’est plus le mur qu’on imagine",
      "Accompagné de bout en bout, jusqu’à l’intégration et la rentabilité",
    ],
    angles: [
      "L’angle qui change tout : acheter avec 0 € d’apport, c’est possible — quand le plan est construit pour.",
      "Et le calcul gagnant : une entreprise rentable rachetée coûte souvent moins cher que trois ans passés à créer la même.",
    ],
    steps: [
      { t: "Cadrage", d: "Critères, capacité, horizon : la cible idéale, noir sur blanc." },
      { t: "Sourcing & qualification", d: "Réseau et Apollo — les bonnes cibles, pas toutes les cibles." },
      { t: "Analyse, valorisation, financement", d: "La réalité chiffrée, le juste prix, le montage qui passe." },
      { t: "Négociation & intégration", d: "On signe — et on reste jusqu’à la rentabilité." },
    ],
    quote: { text: "L’acquisition s’est jouée à trois semaines de clarification près. Le sourcing qualifié a changé la donne.", author: "Julien R.", role: "Repreneur, Ferme du Sud" },
    formService: { title: "Acquérir" },
  },
};

export const JOURNAL = [
  {
    slug: "acheter-0-euro-apport",
    type: "Article",
    date: "12 juin",
    min: 5,
    hook: "L’apport n’est pas un mur.",
    author: "L’équipe Zayado",
    title: "Acheter une entreprise avec 0 € d’apport : comment c’est possible",
    excerpt: "L’apport n’est pas un mur. C’est une question de structure. Le plan qui change tout.",
    body: [
      "Tout le monde le répète : pour racheter une entreprise, il faut d’abord de l’apport. C’est faux — ou du moins, c’est incomplet. Ce qu’il faut, c’est un plan : une cible saine, un montage solide, et une histoire qui tient devant un financeur.",
      "Les banques et les fonds financent l’essentiel du prix quand trois conditions sont réunies : une rentabilité démontrée, un dirigeant qui sait d’où vient la valeur, et un accompagnement qui sécurise l’après-signature.",
      "Le vrai travail n’est donc pas d’économiser un apport pendant trois ans. C’est de qualifier la bonne cible, de la valoriser justement, et de construire le montage. C’est exactement le travail d’Acquérir, l’accompagnement Zayado.",
      "0 € d’apport, ce n’est pas une promesse magique — c’est une méthode. Et elle commence par un diagnostic de 2 minutes.",
    ],
  },
  {
    slug: "acheter-ou-creer",
    type: "Article",
    date: "28 mai",
    min: 4,
    hook: "Trois ans, ou un plan.",
    author: "L’équipe Zayado",
    title: "Acheter ou créer : le calcul que personne ne fait",
    excerpt: "Créer coûte trois ans. Acheter coûte un plan. Comparons vraiment.",
    body: [
      "Créer une entreprise, c’est bâtir à zéro : trouver les clients, bâtir les process, recruter, tenir la trésorerie. Trois ans, en moyenne, avant un revenu stable — si tout va bien.",
      "Acheter une entreprise rentable, c’est inverser le temps : les clients, l’équipe et les process existent déjà. Le revenu commence le premier jour. Le risque se déplace : il n’est plus dans le marché, il est dans le prix payé et la qualité de l’analyse.",
      "C’est là que tout se joue : une valorisation serrée, une due diligence éclair, un plan 100 jours. Bien accompagné, acheter coûte souvent moins cher que créer la même entreprise.",
      "Le calcul honnête n’est pas « créer contre acheter ». C'est « trois ans d’efforts contre un plan bien exécuté ».",
    ],
  },
  {
    slug: "vendre-a-0-euro",
    type: "Article",
    date: "14 mai",
    min: 4,
    hook: "Mythe ou méthode ?",
    author: "L’équipe Zayado",
    title: "Lancer, vendre, transmettre : l’entreprise à 0 euro, mythe ou méthode ?",
    excerpt: "Autour d’une idée fixe : une entreprise qui se lance — ou se cède — sans apport.",
    body: [
      "« Lancer son entreprise à 0 € » : la promesse fait vendre des formations. La réalité est plus intéressante : ce qui coûte cher, ce n’est pas l’argent — c’est le temps perdu à improviser.",
      "Il existe une voie plus rapide : reprendre une activité existante, la financer majoritairement par sa rentabilité future, et la faire fructifier. L’apport devient une variable de structure, pas une condition d’entrée.",
      "Et pour celui qui a déjà bâti : vendre, c’est le même tunnel à l’envers. Une entreprise lisible — chiffres clairs, process documentés — se vend mieux et plus cher.",
      "Mythe ? Non. Méthode. À condition de la construire avec ceux qui la pratiquent.",
    ],
  },
  {
    slug: "temoin-claire",
    type: "Témoignage",
    date: "9 mai",
    min: 2,
    hook: "Les mots de Claire.",
    author: "Claire M., Maison Tinel",
    title: "Claire : « J’ouvre mes chiffres sans appréhension »",
    excerpt: "Le journal de la maison : les mots des dirigeants qui respirent enfin.",
    body: [
      "Claire a fondé Maison Tinel il y a six ans. Avant le diagnostic Zayado, ses chiffres vivaient dans un tableur qu’elle n’ouvrait pas.",
      "« Pour la première fois, j’ouvre mes chiffres sans appréhension — et je pilote sans y passer mes week-ends. Le diagnostic a mis des mots exactement là où ça coinçait. »",
      "Depuis : un tableau de bord à 5 chiffres, une routine de 10 minutes par mois, et des week-ends rendus à la famille.",
    ],
  },
  {
    slug: "note-equilibre",
    type: "Note",
    date: "2 mai",
    min: 1,
    hook: "L’équilibre d’abord.",
    author: "La note de la maison",
    title: "La note de la maison : l’équilibre n’est pas une récompense",
    excerpt: "Une note courte, une idée forte — le journal Zayado, c’est ça.",
    body: [
      "On lit partout que l’équilibre viendra « quand ça sera calé ». Faux. L’équilibre ne se mérite pas après la performance — il la produit.",
      "Un dirigeant reposé voit la marge là où un dirigeant épuisé voit l’urgence. C’est un fait de gestion, pas un slogan.",
      "Alors commencez petit : 10 minutes par mois sur les chiffres, une heure cette semaine pour vous. Le reste suit.",
    ],
  },
];

export const VISION_HUMAINE = {
  lead: "Une maison construite sur des valeurs, pas sur du volume.",
  caveat: "ce qui guide chaque choix, chaque sélection",
  values: [
    { title: "Ouverture", content: "Zayado s’adresse à toutes celles et ceux qui entreprennent, quelles que soient leurs convictions." },
    { title: "Intégrité", content: "Nous sélectionnons peu, honnêtement, et disons clairement ce que nous faisons et ne faisons pas." },
    { title: "Sens", content: "Entreprendre peut nourrir une vie, pas la consumer. C’est la boussole de chaque choix." },
  ],
};

export const COMING_SOON = {
  sub: "Une nouvelle façon d’aider les entrepreneurs à mieux travailler, mieux vivre — et décider avec plus de clarté.",
  pillars: [
    { icon: "chart", label: "Finances" },
    { icon: "case", label: "Organisation" },
    { icon: "heart", label: "Bien-être" },
    { icon: "target", label: "Décisions" },
  ],
  rays: [
    { icon: "glasses", label: "Santé visuelle & concentration" },
    { icon: "chair", label: "Ergonomie & prévention" },
    { icon: "anchor", label: "Ancrage & recentrage" },
    { icon: "plant", label: "Environnement inspirant" },
    { icon: "move", label: "Liberté & mobilité" },
    { icon: "coffee", label: "Thés & infusions" },
    { icon: "gift", label: "Idées cadeaux" },
    { icon: "pack", label: "Parcours complets (packs)" },
  ],
  domains: ["zayado.net", "app.zayado.net"],
};

export const PRODUCTS = [
  { id: "fauteuil", name: "Fauteuil « Équilibre »", price: 349, cat: "Mobilier", group: "entreprise", img: "fauteuil", desc: "Ergonomie pensée pour les longues journées de pilotage — tissu beige, structure navy." },
  { id: "lampe", name: "Lampe « Clarté »", price: 89, cat: "Éclairage", group: "entreprise", img: "lampe", desc: "Lumière chaude, ombre douce : l’éclairage qui fatigue moins les yeux." },
  { id: "vegetal", name: "Trio végétal « Respire »", price: 59, cat: "Végétalisation", group: "entreprise", img: "vegetal", desc: "Trois plantes robustes pour un bureau qui respire — cache-pots beige inclus." },
  { id: "carnet", name: "Le Carnet de Clarté", price: 34, cat: "Outils", group: "entreprise", img: "carnet", desc: "Le carnet pour poser ses 5 chiffres clés — une page par semaine, un œil par mois." },
  { id: "plaid", name: "Coffret « Récupération »", price: 69, cat: "Bien-être", group: "entrepreneur", img: "plaid", desc: "Plaid bouclé et bougie ambre : la vraie pause, celle qui recharge." },
  { id: "casque", name: "Casque « Focus »", price: 199, cat: "Concentration", group: "entrepreneur", img: "casque", desc: "Réduction de bruit premium pour les plages de travail profond." },
  { id: "planner", name: "Planner 90 jours", price: 29, cat: "Outils", group: "entrepreneur", img: "planner", desc: "Un trimestre structuré : objectifs, chiffres, rituels. Couverture rigide navy." },
  { id: "mug", name: "Mug « Clair. »", price: 18, cat: "Objet", group: "entrepreneur", img: "mug", desc: "Pour les matinées de pilotage. Céramique crème, écriture manuscrite navy." },
];

export const MARKETPLACE_GROUPS = [
  { key: "entreprise", label: "Pour l’entreprise", sub: "mobilier · ergonomie · éclairage · décoration · végétalisation · équipements · outils" },
  { key: "entrepreneur", label: "Pour l’entrepreneur", sub: "bien-être · concentration · récupération · confort · mobilité · environnement de travail" },
];

/* Rayons générés depuis les produits réels — un rayon ou un univers vide ne s’affiche jamais
   (même logique que côté Shopify : pas de menu de catalogue vide). */
export const MARKETPLACE_RAYS = MARKETPLACE_GROUPS.map((g) => {
  const inGroup = PRODUCTS.filter((p) => p.group === g.key);
  const rays = [...new Set(inGroup.map((p) => p.cat))].map((cat) => ({
    cat,
    count: inGroup.filter((p) => p.cat === cat).length,
    to: `/marketplace?q=${encodeURIComponent(cat)}`,
  }));
  return { key: g.key, label: g.label, sub: g.sub, to: `/marketplace/${g.key}`, rays };
}).filter((u) => u.rays.length > 0);

/* Le Cockpit — contenu repris des pages publiques de l'appli (app.zayado.net) */
export const COCKPIT_MODULES = [
  { id: "point-du-jour", label: "Le Cockpit & son point du jour", douleur: "Tu ouvres ton ordinateur et tu ne sais plus par où commencer.", accroche: "Chaque matin, ton point du jour est déjà prêt.", benefices: ["Priorités, objectif 90 jours, victoires et énergie réunis sur un écran", "Le pouls business : trésorerie et semaine d'un coup d'œil", "Ton rythme respecté : le cockpit s'adapte à ton énergie"] },
  { id: "copilote", label: "Copilote IA & Actualité marché", douleur: "Tu décides seul·e, et le marché bouge pendant que tu produis.", accroche: "Un copilote qui connaît ton projet et veille ton marché chaque jour.", benefices: ["Actualité de TON marché, résumée chaque jour", "Un chat contextuel qui clarifie, rédige et prépare tes documents", "Chaque article peut devenir une décision en un clic"] },
  { id: "vision", label: "Vision Board", douleur: "Ta vision est dans ta tête, donc elle se dilue dans le quotidien.", accroche: "Ta vision prend vie sur un board que tu vois chaque jour.", benefices: ["Vision Board généré par l'IA à partir de tes mots", "Roue d'équilibre et feuille de route 90 jours", "Compte à rebours de ton objectif 3 ans, toujours visible"] },
  { id: "radar", label: "Radar d'opportunités", douleur: "La prospection passe toujours après tout le reste.", accroche: "Chaque jour, 3 opportunités qualifiées t'attendent.", benefices: ["Opportunités reliées à tes objectifs, message prêt à envoyer", "Analyse SWOT de ton activité à la demande", "Signaux faibles de ton marché détectés pour toi"] },
  { id: "revue", label: "Revue hebdo", douleur: "Les semaines filent sans que tu saches si tu avances vraiment.", accroche: "Cinq minutes par semaine pour reprendre la main.", benefices: ["Synthèse guidée : victoires, apprentissages, obstacles", "Une seule priorité choisie pour la semaine qui vient", "Le Copilote prépare la revue avec tes données de la semaine"] },
  { id: "bienetre", label: "Bien-être & rituels", douleur: "Tu tiens le rythme… jusqu'au jour où tu ne tiens plus.", accroche: "Ton énergie devient une donnée pilotée, pas une surprise.", benefices: ["Check-in énergie en 30 secondes chaque matin", "Courbe des 7 derniers jours : tes creux deviennent visibles", "Rituels doux guidés : respiration 4-7-8, journal, pause consciente"] },
];

export const COCKPIT_TARIFS = {
  essai: "2 mois pour 1 €",
  plans: [
    { key: "reveur", nom: "Rêveur", prix: 15, annuel: 150, note: "1er mois offert", points: ["Cockpit & point du jour", "Roue de l'équilibre", "Vision Board"] },
    { key: "serenite", nom: "Solo", prix: 29, annuel: 288, fondateur: 24, star: true, note: "2 mois pour 1 €", points: ["Tout Rêveur", "Copilote IA & actualité marché", "Actions & revue hebdo"] },
    { key: "pro", nom: "Pro", prix: 69, annuel: 708, fondateur: 49, note: "tarif fondateur garanti", points: ["Tout Solo", "Radar d'opportunités", "Connexions (Qonto) & pouls business"] },
    { key: "equipe", nom: "Équipe", prix: 99, annuel: 990, note: "jusqu'à 5 personnes", points: ["Tout Pro pour toi", "Un espace Solo par coéquipier", "« Ton entreprise » : planning, absences, chrono"] },
  ],
  entreprise: { nom: "Entreprise", plancher: 299, note: "sur devis", points: ["Déploiement multi-équipes", "Accompagnement dédié", "Sécurité & export"] },
  pied: "TTC · sans engagement · résiliable en 1 clic · paiement sécurisé Mollie",
};

export const MARKETPLACE_SEO = {
  entreprise: {
    h1: "Marketplace — Pour l’entreprise",
    caveat: "équiper le socle entreprise",
    seoTitle: "Marketplace pour l’entreprise : mobilier, ergonomie, éclairage | Zayado",
    desc: "La marketplace Zayado pour l’entreprise : mobilier, ergonomie, éclairage, végétalisation, équipements et outils — une sélection curée pour travailler mieux, plus efficacement, durablement.",
    paragraphs: [
      "La marketplace Zayado réunit ce dont une entreprise a besoin pour travailler mieux : mobilier ergonomique, éclairage pensé pour la concentration, végétalisation qui apaise, équipements et outils fiables. Chaque produit est choisi pour servir la performance — sans jamais sacrifier le confort de ceux qui l’usage.",
      "C’est l’apparence d’une boutique, l’âme d’une marketplace : une sélection curée, pas pléthorique, reliée à l’accompagnement Zayado (Optimiser) et à ses partenaires spécialisés, dont Trouveton pour l’aménagement et les travaux. Vous cherchez la structure avant l’objet ? Le diagnostic gratuit vous oriente en 2 minutes.",
    ],
    tags: ["marketplace entreprise", "mobilier de bureau", "ergonomie au travail", "éclairage bureau", "végétalisation bureau", "équipement professionnel", "organisation & efficacité", "optimisation opérationnelle"],
    faq: [
      { q: "Livrez-vous partout en France ?", a: "Oui — la sélection est pensée pour le marché français, avec livraison suivie." },
      { q: "Puis-je être conseillé avant d’équiper mon équipe ?", a: "Oui : le diagnostic Zayado oriente vers les bons équipements et partenaires — dont Trouveton pour l’aménagement." },
      { q: "Les prix incluent-ils la pose ?", a: "Les produits sont livrés prêts à l’usage ; l’installation passe par nos partenaires « Services & partenaires », sur devis." },
    ],
  },
  entrepreneur: {
    h1: "Marketplace — Pour l’entrepreneur",
    caveat: "équiper le socle bien-être",
    seoTitle: "Marketplace pour l’entrepreneur : bien-être, concentration, récupération | Zayado",
    desc: "La marketplace Zayado pour l’entrepreneur : produits bien-être, concentration, récupération, confort et mobilité — pour préserver l’énergie de celui qui dirige, au quotidien.",
    paragraphs: [
      "Diriger demande de l’énergie. La marketplace Zayado pour l’entrepreneur réunit les produits qui la protègent : bien-être au quotidien, concentration profonde, récupération sérieuse, confort et mobilité au bureau comme en déplacement.",
      "Le bien-être n’est pas séparé du business — c’est notre base. Ces objets prolongent l’accompagnement (les axes Physique, Mental et Performance) et le Cockpit, qui suit votre énergie comme vos chiffres. Un doute sur par où commencer ? Le diagnostic gratuit répond en 2 minutes.",
    ],
    tags: ["marketplace entrepreneur", "bien-être dirigeant", "concentration au travail", "récupération entrepreneur", "confort bureau domicile", "mindset & recentrage", "ancrage & recentrage", "énergie & récupération", "équilibre vie pro vie perso"],
    faq: [
      { q: "C’est du bien-être ou du business ?", a: "Les deux : la performance de l’entreprise se construit avec l’énergie de l’entrepreneur — nos deux socles." },
      { q: "Par quoi commencer ?", a: "Par le diagnostic gratuit (2 min) : il situe votre énergie et votre charge, puis oriente vers les bons produits." },
      { q: "Livrez-vous hors France ?", a: "La sélection vise le marché français ; contactez-nous pour les cas particuliers." },
    ],
  },
};

export const SERVICE_PARTNERS = [
  { title: "Aménagement & travaux", partner: "avec Trouveton", desc: "Bureaux, espaces de rencontre, environnements de travail : conception et réalisation." },
  { title: "Accompagnement Zayado", partner: "Acquérir · Optimiser", desc: "Nos deux piliers d’accompagnement, sur mesure, avec preuve sociale." },
  { title: "Équipements spécialisés", partner: "réseau de partenaires", desc: "Le bon fournisseur pour chaque poste de travail et chaque outil." },
];

export const BOXES = [
  { id: "box-hiver", name: "Box entrepreneur apaisé — fin d'année", price: 49, season: "Précommande · édition de fin d'année", img: "boxHiver", desc: "Carnet guidé « Mon cap 2027 », infusion bio, rituel du soir, micro-pause : le rituel complet pour clore l'année et tracer la suivante." },
  { id: "box-ete", name: "Box Été — « Souffle & Croissance »", price: 89, season: "Édition de mi-année", img: "boxEte", desc: "Pochette lin, bougie agrumes, carnet : le rituel de mi-année pour reprendre de la hauteur." },
];

export const VALUES = [
  { num: "01", title: "Équilibre", text: "L’entrepreneur d’abord. Une entreprise qui tourne ne doit pas avaler sa vie." },
  { num: "02", title: "Clarté", text: "Des chiffres qui parlent la langue des décisions — pas du jargon." },
  { num: "03", title: "Sélection", text: "Curée, pas pléthorique. Chaque produit mérite sa place." },
];

export const LANDING = {
  hero: {
    sub: "Une sélection de produits et de services pour vous aider à mieux travailler, mieux vivre et développer une activité rentable, durablement.",
    caveat: "Entreprendre autrement",
    benefits: [
      { icon: "leaf", t: "Plus de focus", d: "Un quotidien plus serein" },
      { icon: "chart", t: "Plus de clarté", d: "Des décisions plus simples" },
      { icon: "users", t: "Plus d’efficacité", d: "Des solutions concrètes pour votre activité" },
      { icon: "flower", t: "Un meilleur équilibre", d: "Entrepreneurs et petites équipes" },
    ],
    equilibre: { score: 78, items: [["Clarté financière", 88], ["Énergie", 72], ["Organisation", 64], ["Sérénité", 80], ["Équilibre pro/perso", 58]] },
    action: { label: "Prochaine action", text: "Finaliser mon plan financier" },
  },
  needs: {
    eyebrow: "Votre point de départ",
    title: "Quel est votre besoin aujourd’hui ?",
    sub: "Faites un diagnostic rapide et accédez à l’univers qui vous correspond.",
    moi: {
      title: "Pour moi",
      text: "Prendre soin de mon énergie, ma concentration et mon bien-être au quotidien.",
      cta: { label: "Explorer l’univers", to: "/marketplace/entrepreneur" },
      tags: ["Énergie & récupération", "Focus & clarté mentale", "Ancrage & recentrage", "Corps & posture", "Calme & rythme", "Mindset & recentrage"],
    },
    diag: {
      title: "Faire mon diagnostic",
      text: "Répondez à quelques questions sur vous et votre activité pour recevoir des recommandations personnalisées.",
      cta: { label: "Commencer maintenant", to: "/diagnostic" },
    },
    entreprise: {
      title: "Pour mon entreprise",
      text: "Organiser, simplifier et piloter mon activité avec plus de clarté.",
      tags: ["Espace & environnement", "Organisation & efficacité", "Clarté financière", "Optimisation opérationnelle", "Équipement du quotidien"],
      cta: { label: "Voir les solutions", to: "/marketplace/entreprise" },
    },
  },
};
