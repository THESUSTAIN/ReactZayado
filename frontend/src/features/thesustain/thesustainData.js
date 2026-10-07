// TheSustain — Contenu chrétien (données fictives locales, prototype).
// Remplacera plus tard des réponses de l'API TheSustain. Aucun backend requis.

export const THESUSTAIN_URL = "https://thesustain.net";

export const modules = [
  { id: "sagesse", emoji: "📖", title: "Sagesse", tagline: "Un thème par jour pour nourrir ta foi et donner du sens à ton travail." },
  { id: "priere", emoji: "🙏", title: "Prière", tagline: "Prière personnelle, intentions, intercession — et un mur de prière." },
  { id: "parcours", emoji: "🧭", title: "Parcours bibliques", tagline: "Bible & entrepreneuriat, en parcours guidés de 7 jours." },
  { id: "lecture", emoji: "📜", title: "Lecture biblique", tagline: "Un verset à la fois, avec une aide à la mémoire pour le retenir." },
  { id: "memoire", emoji: "🧠", title: "Mémoire", tagline: "Apprends des versets par cœur : quêtes du jour, niveaux et révision espacée." },
  { id: "discernement", emoji: "🕯️", title: "Discernement", tagline: "Un journal de décision éclairé par des valeurs bibliques." },
  { id: "cercle", emoji: "🤝", title: "Cercle", tagline: "Une communauté de bâtisseurs : prière, témoignages, entraide." },
  { id: "repos", emoji: "🕊️", title: "Repos & Sabbat", tagline: "Pauses Psaumes et rythme de repos, contre l'épuisement de l'entrepreneur." },
];

// ───── SAGESSE ─────
export const sagesse = {
  theme: "Intégrité dans les affaires",
  verse: "« Que celui qui vole ne vole plus ; mais plutôt qu'il travaille, en faisant de ses mains ce qui est bien, pour avoir de quoi donner à celui qui est dans le besoin. »",
  reference: "Éphésiens 4:28",
  meditation: [
    "Prends trois minutes. Respire lentement.",
    "L'intégrité n'est pas une contrainte qui ralentit ton activité — elle en est la fondation la plus solide. Une entreprise bâtie sur la vérité inspire confiance, et la confiance est le capital le plus précieux d'un entrepreneur.",
    "Là où tu es tenté(e) de couper un angle ou d'arrondir un chiffre, imagine la paix d'une conscience alignée.",
    "Ton travail n'est pas seulement une source de revenus : il peut devenir un canal de bénédiction pour ceux qui t'entourent.",
  ],
  prayer: "Seigneur, donne-moi de bâtir mon activité sur la vérité et la droiture. Que mes décisions d'aujourd'hui reflètent mes valeurs, même quand personne ne regarde. Amen.",
  reflectionQuestion: "Où, dans mon activité, suis-je tenté(e) de sacrifier l'intégrité pour un gain rapide ?",
  applicationPrompt: "Comment cette valeur peut-elle influencer ta manière de vendre, négocier ou diriger cette semaine ?",
  teachings: [
    { title: "Le travail comme vocation", duration: "2 min", text: "Dans la Bible, le travail n'est pas une punition mais un appel : cultiver, créer, servir. Voir ton activité comme une vocation change la façon de la mener." },
    { title: "L'argent, serviteur et non maître", duration: "3 min", text: "« Nul ne peut servir deux maîtres. » L'argent est un excellent serviteur mais un mauvais maître. La question n'est pas combien tu gagnes, mais qui gouverne ton cœur." },
    { title: "Le repos comme acte de foi", duration: "2 min", text: "S'arrêter, c'est reconnaître que tout ne dépend pas de nous. Le repos n'est pas une faiblesse d'entrepreneur : c'est une discipline de confiance." },
  ],
};

// ───── PRIÈRE ─────
export const prayerWallSeed = [
  { id: "pw-1", author: "Marie L.", text: "Priez pour mon lancement d'entreprise cette semaine. J'ai peur mais je veux avancer avec confiance.", prayingCount: 12, iPrayed: false, time: "il y a 2 h" },
  { id: "pw-2", author: "David K.", text: "Je dois prendre une décision difficile concernant un associé. Que Dieu m'accorde discernement et paix.", prayingCount: 7, iPrayed: false, time: "il y a 5 h" },
  { id: "pw-3", author: "Anonyme", text: "Trésorerie tendue ce mois-ci. Je remets mes finances entre les mains de Dieu et je garde espoir.", prayingCount: 21, iPrayed: false, time: "hier" },
];
export const prayerPrompts = ["Pour ma famille", "Pour mon activité", "Pour une personne dans le besoin", "Pour la sagesse dans mes décisions", "Action de grâce"];

// Mur des décharges — déposer un fardeau et le remettre à Dieu.
export const dechargePrompts = ["Une peur", "Une colère", "Un échec", "Une inquiétude financière", "Une relation difficile", "Une fatigue"];
export const dechargeVersets = [
  { text: "« Jetez sur lui tous vos soucis, car il prend soin de vous. »", ref: "1 Pierre 5:7" },
  { text: "« Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos. »", ref: "Matthieu 11:28" },
  { text: "« Ne t'ai-je pas donné cet ordre : Fortifie-toi et prends courage ? »", ref: "Josué 1:9" },
  { text: "« L'Éternel est près de ceux qui ont le cœur brisé. »", ref: "Psaume 34:18" },
];

// ───── REPOS & SABBAT : Pauses Psaumes + anti burn-out ─────
export const psaumes = [
  { text: "« L'Éternel est mon berger : je ne manquerai de rien. »", ref: "Psaume 23:1" },
  { text: "« Il me fait reposer dans de verts pâturages. »", ref: "Psaume 23:2" },
  { text: "« Mon âme, bénis l'Éternel, et n'oublie aucun de ses bienfaits. »", ref: "Psaume 103:2" },
  { text: "« Recherche la paix, et poursuis-la. »", ref: "Psaume 34:14" },
  { text: "« Au milieu de mes angoisses, tu me rends la vie. »", ref: "Psaume 138:7" },
  { text: "« C'est en vain que vous vous levez matin, que vous vous couchez tard : il en donne autant à ses bien-aimés pendant leur sommeil. »", ref: "Psaume 127:2" },
];
export const sabbat = {
  intro: "Le Sabbat n'est pas une perte de temps : c'est reconnaître que l'œuvre ne dépend pas seulement de toi. Un entrepreneur qui se repose témoigne de sa confiance.",
  engagements: [
    "Je bloque un temps de repos hebdomadaire, non négociable.",
    "Je coupe les notifications pro pendant ce temps.",
    "Je consacre un moment à ma famille / mes proches.",
    "Je prends un temps calme avec Dieu, sans objectif de productivité.",
    "Je note une chose pour laquelle je suis reconnaissant(e).",
  ],
  verse: { text: "« Venez à l'écart dans un lieu désert, et reposez-vous un peu. »", ref: "Marc 6:31" },
};

// ───── LECTURE BIBLIQUE (versets à lire et mémoriser, un à la fois) ─────
export const versetsLecture = [
  { text: "« Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle. »", ref: "Jean 3:16" },
  { text: "« Je puis tout par celui qui me fortifie. »", ref: "Philippiens 4:13" },
  { text: "« Car je connais les projets que j'ai formés sur vous, dit l'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l'espérance. »", ref: "Jérémie 29:11" },
  { text: "« Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu. »", ref: "Romains 8:28" },
  { text: "« Confie-toi en l'Éternel de tout ton cœur, et ne t'appuie pas sur ta sagesse. »", ref: "Proverbes 3:5" },
  { text: "« Cherchez premièrement le royaume et la justice de Dieu, et toutes ces choses vous seront données par-dessus. »", ref: "Matthieu 6:33" },
  { text: "« Dieu est pour nous un refuge et un appui, un secours qui ne manque jamais dans la détresse. »", ref: "Psaume 46:1" },
  { text: "« Ne nous lassons pas de faire le bien ; car nous moissonnerons au temps convenable, si nous ne nous relâchons pas. »", ref: "Galates 6:9" },
  { text: "« Tout ce que vous faites, faites-le de bon cœur, comme pour le Seigneur et non pour des hommes. »", ref: "Colossiens 3:23" },
  { text: "« Ne t'ai-je pas donné cet ordre : Fortifie-toi et prends courage ? Ne t'effraie point et ne t'épouvante point. »", ref: "Josué 1:9" },
];

// ───── PARCOURS BIBLIQUES ─────
const d = (day, passage, reference, reflection, question, prayer, action) => ({ day, passage, reference, reflection, question, prayer, action });
export const parcours = [
  { id: "integrite", emoji: "⚖️", title: "Entreprendre avec intégrité", subtitle: "7 jours pour bâtir sur la vérité", days: [
    d(1, "« L'homme intègre marche en sécurité, mais celui qui suit des voies tortueuses sera découvert. »", "Proverbes 10:9", "La sécurité ne vient pas des raccourcis, mais de la droiture répétée jour après jour.", "Quelle zone d'ombre voudrais-je mettre en lumière dans mon activité ?", "Seigneur, rends mes chemins droits et mon cœur transparent.", "Identifier une pratique à clarifier et la corriger aujourd'hui."),
    d(2, "« Une balance fausse est en horreur à l'Éternel, mais un poids juste lui est agréable. »", "Proverbes 11:1", "Dieu se soucie des détails de nos transactions. La justice dans les petites choses construit la confiance.", "Mes prix, mes délais, mes promesses sont-ils justes ?", "Donne-moi d'être juste dans le visible comme dans l'invisible.", "Vérifier une promesse client et l'honorer pleinement."),
    d(3, "« Que votre parole soit oui, oui, non, non. »", "Matthieu 5:37", "La fiabilité de votre parole est votre meilleure carte de visite.", "Ai-je fait des promesses que je peine à tenir ?", "Apprends-moi à dire vrai, simplement.", "Reprendre contact avec quelqu'un à qui j'avais promis quelque chose."),
    d(4, "« Ne vous inquiétez de rien, mais présentez vos demandes à Dieu. »", "Philippiens 4:6", "L'intégrité inclut l'honnêteté envers soi : reconnaître ses peurs et les confier.", "Quelle peur guide secrètement mes décisions ?", "Je te remets mes inquiétudes professionnelles.", "Écrire une inquiétude et la relire en fin de journée."),
    d(5, "« Tout ce que vous faites, faites-le de bon cœur, comme pour le Seigneur. »", "Colossiens 3:23", "L'excellence discrète, faite sans public, est une forme d'intégrité.", "Où puis-je mieux faire, même si personne ne le voit ?", "Que mon travail te rende gloire, dans les détails.", "Soigner une tâche que j'aurais tendance à bâcler."),
    d(6, "« Mieux vaut peu, avec la justice, que de grands revenus, avec l'injustice. »", "Proverbes 16:8", "Le succès injuste est un château de sable. La justice construit la durée.", "Suis-je prêt(e) à gagner moins pour rester juste ?", "Donne-moi de préférer la paix au profit malhonnête.", "Refuser ou renégocier une opportunité qui heurte mes valeurs."),
    d(7, "« Bien, bon et fidèle serviteur ; tu as été fidèle en peu de chose. »", "Matthieu 25:21", "La fidélité dans le peu ouvre la porte au beaucoup.", "Quel petit engagement puis-je tenir avec constance ?", "Rends-moi fidèle, jour après jour.", "Choisir une habitude d'intégrité à garder après ce parcours."),
  ]},
  { id: "activite-en-panne", emoji: "🌧️", title: "Quand l'activité ne fonctionne plus", subtitle: "7 jours pour traverser la tempête", days: [
    d(1, "« L'Éternel est près de ceux qui ont le cœur brisé. »", "Psaume 34:18", "Dieu ne fuit pas vos échecs. Il s'en approche.", "Où ai-je le cœur brisé en ce moment ?", "Approche-toi de moi dans cette difficulté.", "Nommer honnêtement ce qui ne va pas."),
    d(2, "« Nous sommes pressés de toute manière, mais non réduits à l'extrémité. »", "2 Corinthiens 4:8", "Pressé n'est pas écrasé. Il reste toujours un espace pour respirer.", "Quelle petite marge de manœuvre me reste-t-il ?", "Montre-moi l'issue que je ne vois pas encore.", "Lister trois options, même minuscules."),
    d(3, "« Venez à moi, vous tous qui êtes fatigués et chargés. »", "Matthieu 11:28", "Le repos n'est pas un luxe, c'est une nécessité pour décider clairement.", "Suis-je en train de décider dans l'épuisement ?", "Donne-moi ton repos avant mes décisions.", "M'accorder une vraie pause aujourd'hui."),
    d(4, "« Toutes choses concourent au bien de ceux qui aiment Dieu. »", "Romains 8:28", "Même un échec peut devenir matière première d'un rebond.", "Que puis-je apprendre de cette période ?", "Transforme cette épreuve en leçon.", "Écrire une leçon tirée de la difficulté."),
    d(5, "« Ne crains rien, car je suis avec toi. »", "Ésaïe 41:10", "La peur rétrécit la vision. La présence de Dieu l'élargit.", "Qu'est-ce que la peur m'empêche d'entreprendre ?", "Remplace ma peur par ta paix.", "Faire un pas que la peur repoussait."),
    d(6, "« Recommande ton sort à l'Éternel, et il agira. »", "Psaume 37:5", "Confier n'est pas se résigner : c'est agir sans porter seul le poids.", "Que puis-je remettre à Dieu aujourd'hui ?", "Je te confie ce que je ne maîtrise pas.", "Déléguer ou lâcher une chose non essentielle."),
    d(7, "« Ceux qui se confient en l'Éternel renouvellent leur force. »", "Ésaïe 40:31", "La restauration est souvent progressive, comme une aube.", "Où est-ce que je sens un début de renouveau ?", "Renouvelle ma force pour la suite.", "Définir la première action de la reconstruction."),
  ]},
  { id: "argent", emoji: "💰", title: "Argent et responsabilité", subtitle: "7 jours pour un rapport sain à l'argent", days: [
    d(1, "« Car là où est ton trésor, là aussi sera ton cœur. »", "Matthieu 6:21", "Votre budget révèle vos priorités réelles.", "Qu'est-ce que mes dépenses disent de mon cœur ?", "Aligne mon argent sur mes valeurs.", "Regarder une dépense récente à la lumière de mes priorités."),
    d(2, "« Que celui qui donne le fasse avec joie. »", "2 Corinthiens 9:7", "La générosité brise le pouvoir de l'argent sur nous.", "Puis-je donner quelque chose cette semaine ?", "Rends-moi généreux, pas anxieux.", "Faire un don, même symbolique."),
    d(3, "« L'emprunteur est esclave de celui qui prête. »", "Proverbes 22:7", "La dette non maîtrisée limite la liberté d'entreprendre.", "Où la dette pèse-t-elle sur mes décisions ?", "Donne-moi sagesse dans mes engagements financiers.", "Faire le point sur une dette et un plan."),
    d(4, "« Le sage amasse peu à peu. »", "Proverbes 13:11", "La patience financière bat la précipitation.", "Suis-je patient(e) ou pressé(e) avec l'argent ?", "Apprends-moi la constance plutôt que le coup d'éclat.", "Mettre de côté une petite somme."),
    d(5, "« Rendez à César ce qui est à César. »", "Marc 12:17", "L'intégrité fiscale fait partie de la foi vécue.", "Suis-je juste dans mes obligations ?", "Donne-moi la droiture jusque dans les comptes.", "Vérifier une obligation administrative en retard."),
    d(6, "« Il vaut mieux donner que recevoir. »", "Actes 20:35", "L'abondance se mesure aussi à ce qu'on partage.", "Comment mon activité peut-elle bénir d'autres ?", "Fais de mon activité un canal de bien.", "Servir un client au-delà du contrat."),
    d(7, "« Mon Dieu pourvoira à tous vos besoins. »", "Philippiens 4:19", "La confiance remplace l'angoisse de manquer.", "Où ai-je besoin de faire confiance pour mes finances ?", "Je te confie mes besoins et mon avenir.", "Écrire une prière de confiance financière."),
  ]},
  { id: "diriger", emoji: "🧗", title: "Diriger sans s'épuiser", subtitle: "7 jours contre le burn-out de l'entrepreneur", days: [
    d(1, "« Venez à l'écart et reposez-vous un peu. »", "Marc 6:31", "Même Jésus invitait ses proches au repos au milieu de l'action.", "Quand me suis-je vraiment reposé(e) ?", "Apprends-moi à m'arrêter sans culpabilité.", "Planifier une vraie coupure cette semaine."),
    d(2, "« Choisis des hommes capables... et délègue. »", "Exode 18:21", "Vouloir tout porter seul mène à l'épuisement.", "Que pourrais-je déléguer dès demain ?", "Donne-moi l'humilité de partager la charge.", "Déléguer une tâche aujourd'hui."),
    d(3, "« Le sommeil du travailleur est doux. »", "Ecclésiaste 5:11", "Le corps a des limites que la volonté ne peut ignorer.", "Est-ce que je respecte mon corps ?", "Aide-moi à honorer mes limites.", "Se coucher plus tôt ce soir."),
    d(4, "« Ma grâce te suffit, ma puissance s'accomplit dans la faiblesse. »", "2 Corinthiens 12:9", "Reconnaître sa faiblesse, c'est s'ouvrir à la grâce.", "Où est-ce que je refuse de montrer ma faiblesse ?", "Que ta force agisse dans mes limites.", "Demander de l'aide sur un point."),
    d(5, "« Ne vous inquiétez pas du lendemain. »", "Matthieu 6:34", "L'anxiété du futur vole l'énergie du présent.", "Quelle inquiétude future me fatigue ?", "Aide-moi à vivre ce jour.", "Reporter une inquiétude à une date fixée."),
    d(6, "« Il restaure mon âme. »", "Psaume 23:3", "Diriger demande une âme restaurée, pas seulement un agenda plein.", "Qu'est-ce qui restaure vraiment mon âme ?", "Restaure ce qui est fatigué en moi.", "Faire une activité qui me ressource."),
    d(7, "« Le fruit de l'Esprit, c'est... la paix. »", "Galates 5:22", "La paix intérieure est un indicateur de santé de l'entrepreneur.", "Où puis-je cultiver plus de paix ?", "Donne-moi une paix qui dépasse mes circonstances.", "Choisir une habitude anti-épuisement à garder."),
  ]},
  { id: "vocation", emoji: "🌱", title: "Trouver sa vocation", subtitle: "7 jours pour clarifier votre appel", days: [
    d(1, "« Avant que je te forme, je te connaissais. »", "Jérémie 1:5", "Votre vocation est enracinée dans votre identité, pas seulement vos compétences.", "Qui suis-je, au-delà de ce que je fais ?", "Révèle-moi qui tu m'as créé pour être.", "Écrire trois mots qui me définissent vraiment."),
    d(2, "« Chacun a reçu un don. »", "1 Pierre 4:10", "Vos talents ne sont pas un hasard, mais une ressource à mettre au service.", "Quels dons ai-je tendance à minimiser ?", "Aide-moi à honorer les dons reçus.", "Lister mes talents, même négligés."),
    d(3, "« Délecte-toi en l'Éternel, il te donnera les désirs de ton cœur. »", "Psaume 37:4", "Les désirs profonds peuvent être des indices de vocation.", "Quel désir revient toujours en moi ?", "Purifie et confirme les désirs justes.", "Noter un désir persistant."),
    d(4, "« La moisson est grande, mais il y a peu d'ouvriers. »", "Matthieu 9:37", "La vocation rencontre un besoin du monde.", "Quel besoin autour de moi me touche ?", "Montre-moi où je peux servir.", "Identifier un besoin que je pourrais adresser."),
    d(5, "« Nous sommes son ouvrage, créés pour de bonnes œuvres. »", "Éphésiens 2:10", "Vous êtes préparé(e) d'avance pour un impact précis.", "Quelle œuvre me semble 'faite pour moi' ?", "Conduis-moi vers ce pour quoi tu m'as préparé.", "Décrire l'impact que je rêve d'avoir."),
    d(6, "« Fais tout pour la gloire de Dieu. »", "1 Corinthiens 10:31", "Toute activité honnête peut devenir vocation quand elle a du sens.", "Comment donner plus de sens à ce que je fais déjà ?", "Donne du sens à mon travail quotidien.", "Relier une tâche ordinaire à un but plus grand."),
    d(7, "« Celui qui a commencé en vous cette œuvre l'achèvera. »", "Philippiens 1:6", "La vocation se déploie dans le temps, pas en un jour.", "Quel prochain pas puis-je poser ?", "Achève en moi ce que tu as commencé.", "Fixer un premier pas concret."),
  ]},
  { id: "epreuve", emoji: "⛰️", title: "Traverser une période difficile", subtitle: "7 jours pour tenir et espérer", days: [
    d(1, "« Même quand je marche dans la vallée, je ne crains aucun mal. »", "Psaume 23:4", "On peut traverser la vallée sans y rester.", "Dans quelle vallée suis-je aujourd'hui ?", "Marche avec moi dans cette vallée.", "Nommer l'épreuve sans la dramatiser."),
    d(2, "« Nous nous glorifions même des afflictions. »", "Romains 5:3", "L'épreuve peut produire la persévérance.", "Qu'est-ce que cette épreuve développe en moi ?", "Fais grandir ma persévérance.", "Noter une force née de la difficulté."),
    d(3, "« Jetez sur lui tous vos soucis, car il prend soin de vous. »", "1 Pierre 5:7", "Porter seul n'est pas un devoir spirituel.", "Quel souci puis-je lui jeter maintenant ?", "Je dépose mes soucis en tes mains.", "Confier un souci à Dieu et à une personne de confiance."),
    d(4, "« Il y a un temps pour tout. »", "Ecclésiaste 3:1", "Les saisons difficiles ont aussi une fin.", "Est-ce que j'accepte que ce soit une saison ?", "Aide-moi à traverser cette saison avec foi.", "Écrire ce que j'attends de la saison prochaine."),
    d(5, "« Ma chair et mon cœur peuvent défaillir, Dieu est mon rocher. »", "Psaume 73:26", "Quand les forces manquent, l'appui demeure.", "Sur quoi est-ce que je m'appuie vraiment ?", "Sois mon rocher quand je faiblis.", "Identifier un appui solide dans ma vie."),
    d(6, "« Pleurez avec ceux qui pleurent. »", "Romains 12:15", "On ne traverse pas seul : la communauté porte.", "Qui pourrait m'accompagner en ce moment ?", "Envoie-moi les bonnes personnes.", "Contacter une personne de soutien."),
    d(7, "« L'espérance ne trompe point. »", "Romains 5:5", "L'espérance n'est pas du déni : c'est une confiance active.", "Où puis-je raviver l'espérance ?", "Ranime mon espérance.", "Écrire une raison d'espérer."),
  ]},
  { id: "servir", emoji: "🤲", title: "Servir plutôt que réussir", subtitle: "7 jours pour un leadership serviteur", days: [
    d(1, "« Le Fils de l'homme est venu non pour être servi, mais pour servir. »", "Marc 10:45", "Le vrai leadership commence par le service.", "Est-ce que je cherche à être servi ou à servir ?", "Fais de moi un serviteur.", "Rendre service sans contrepartie."),
    d(2, "« Que chacun regarde à l'intérêt des autres. »", "Philippiens 2:4", "Servir, c'est élargir son regard au-delà de soi.", "Quel intérêt d'autrui puis-je considérer ?", "Ouvre mes yeux sur les besoins autour de moi.", "Poser une question sincère à un client."),
    d(3, "« Le plus grand parmi vous sera votre serviteur. »", "Matthieu 23:11", "La grandeur se mesure au service rendu.", "Où puis-je 'descendre' pour mieux servir ?", "Détache-moi du besoin de paraître grand.", "Faire une tâche humble que j'évite."),
    d(4, "« Vous avez reçu gratuitement, donnez gratuitement. »", "Matthieu 10:8", "La gratuité désarme la logique du seul profit.", "Que puis-je offrir gratuitement ?", "Rends-moi généreux de mon temps.", "Offrir un conseil gratuit."),
    d(5, "« L'amour ne cherche point son intérêt. »", "1 Corinthiens 13:5", "Servir purifie les motivations.", "Mes motivations sont-elles centrées sur moi ?", "Purifie mes motivations.", "Vérifier l'intention derrière une décision."),
    d(6, "« Portez les fardeaux les uns des autres. »", "Galates 6:2", "Un leader serviteur allège la charge des autres.", "Quel fardeau d'autrui puis-je alléger ?", "Montre-moi qui a besoin d'être soulagé.", "Aider une personne surchargée."),
    d(7, "« Ce que vous avez fait au plus petit, c'est à moi que vous l'avez fait. »", "Matthieu 25:40", "Servir les autres, c'est servir Dieu lui-même.", "Qui est 'le plus petit' que je pourrais servir ?", "Que mon service te rejoigne.", "Choisir une habitude de service à garder."),
  ]},
];

// ───── DISCERNEMENT ─────
export const valeursBibliques = ["Intégrité", "Justice", "Générosité", "Humilité", "Fidélité", "Sagesse", "Courage", "Paix", "Service", "Patience"];
export const questionsPriere = [
  "Cette décision est-elle en paix avec mes valeurs profondes ?",
  "Qui sera affecté par ce choix, et comment ?",
  "Est-ce que la peur ou l'espérance guide ce choix ?",
  "Suis-je pressé(e) par une échéance qui m'empêche de discerner ?",
  "De quel conseil sage aurais-je besoin avant de décider ?",
];
export function buildDiscernementSynthese({ decision, valeurs, craintes, pourquoi }) {
  const valeursTxt = valeurs && valeurs.length ? valeurs.join(", ") : "les valeurs que tu choisiras d'examiner";
  return {
    intro: "Voici une mise en forme de ta réflexion. Ceci n'est pas un avis divin ni une réponse : seulement un support pour prier et décider en conscience.",
    elements: [
      decision ? `Décision envisagée : « ${decision} »` : "Tu n'as pas encore formulé la décision envisagée.",
      `Valeurs bibliques à examiner : ${valeursTxt}.`,
      ...(pourquoi ? [`Ce qui te pousse : ${pourquoi}`] : []),
      craintes ? `Craintes identifiées : ${craintes}` : "Tu pourrais nommer tes craintes pour les mettre en lumière.",
    ],
    questions: questionsPriere,
    disclaimer: "Rappel : cet espace t'aide à structurer ta pensée. La décision, la prière et l'écoute t'appartiennent.",
  };
}

// ───── CERCLE ─────
export const cercleCategories = [
  { id: "prieres", emoji: "🙏", label: "Prières" },
  { id: "questions", emoji: "💬", label: "Questions" },
  { id: "bible", emoji: "📖", label: "Bible" },
  { id: "foi-travail", emoji: "💼", label: "Foi & travail" },
  { id: "temoignages", emoji: "❤️", label: "Témoignages" },
  { id: "entraide", emoji: "🤝", label: "Entraide" },
];
export const cercleSeed = [
  { id: "c-1", category: "foi-travail", author: "Julien P.", text: "Je viens de perdre mon principal client. Je ne sais pas comment réagir. Comment gardez-vous la foi dans ces moments ?", time: "il y a 1 h", encouragements: 9, iEncouraged: false, replies: [
    { id: "r-1", author: "Sarah M.", text: "Je suis passée par là l'an dernier. Un autre client est arrivé 3 semaines après. Courage, tu n'es pas seul.", kind: "expérience" },
    { id: "r-2", author: "Paul R.", text: "Je prie pour toi ce soir. « L'Éternel est près de ceux qui ont le cœur brisé. »", kind: "prière" },
  ], aiSuggestion: "Souhaitez-vous également analyser l'impact de cette perte sur votre activité ?" },
  { id: "c-2", category: "temoignages", author: "Esther N.", text: "Après 6 mois difficiles, mon activité repart. La persévérance et la prière portent du fruit. Merci à ce cercle 🙏", time: "il y a 4 h", encouragements: 24, iEncouraged: false, replies: [], aiSuggestion: null },
  { id: "c-3", category: "questions", author: "Thomas B.", text: "Comment concilier une croissance ambitieuse et le respect du repos (Sabbat) ? J'ai du mal à m'arrêter.", time: "hier", encouragements: 6, iEncouraged: false, replies: [
    { id: "r-3", author: "Marie L.", text: "J'ai bloqué le dimanche dans mon agenda comme un vrai rendez-vous. Ça a tout changé.", kind: "conseil" },
  ], aiSuggestion: null },
];

// Passerelle association TheSustain
export const association = {
  nom: "TheSustain",
  pitch: "L'association et l'univers spirituel derrière Ma Foi : contenus, événements et ressources chrétiennes pour les entrepreneurs.",
  liens: [
    { label: "Découvrir l'association", href: "https://thesustain.net" },
    { label: "Événements & rencontres", href: "https://thesustain.net" },
    { label: "Ressources chrétiennes", href: "https://thesustain.net" },
  ],
};

// ───── SAGESSE : un thème différent chaque jour (texte Louis Segond 1910) ─────
const th = (theme, verse, reference, reflectionQuestion, applicationPrompt, prayer) => ({ theme, verse, reference, reflectionQuestion, applicationPrompt, prayer });
export const themesSagesse = [
  { ...th("Intégrité dans les affaires", sagesse.verse, sagesse.reference, sagesse.reflectionQuestion, sagesse.applicationPrompt, sagesse.prayer) },
  th("Confier ses projets", "« Recommande à l'Éternel tes œuvres, et tes projets réussiront. »", "Proverbes 16:3",
    "Quel projet est-ce que je porte seul(e), sans l'avoir remis à Dieu ?", "Quel projet de la semaine veux-tu confier avant de te lancer ?",
    "Seigneur, je te remets mes projets. Aligne-les sur ce qui est bon, et donne-moi la paix quel que soit le résultat. Amen."),
  th("L'inquiétude", "« Ne vous inquiétez de rien ; mais en toute chose faites connaître vos besoins à Dieu par des prières et des supplications, avec des actions de grâces. »", "Philippiens 4:6",
    "Quelle inquiétude revient le plus souvent dans ma journée de travail ?", "Écris l'inquiétude qui te pèse, puis une chose concrète que tu peux faire aujourd'hui.",
    "Seigneur, tu connais mes soucis de trésorerie, de clients, d'avenir. Je te les confie et je te remercie pour ce que j'ai déjà reçu. Amen."),
  th("Le travail comme service", "« Tout ce que vous faites, faites-le de bon cœur, comme pour le Seigneur et non pour des hommes. »", "Colossiens 3:23",
    "Pour qui est-ce que je travaille vraiment : pour la reconnaissance, pour l'argent, ou pour servir ?", "Quelle tâche ingrate peux-tu faire cette semaine avec soin, comme un service ?",
    "Seigneur, que mon travail d'aujourd'hui soit fait de bon cœur, même ce que personne ne verra. Amen."),
  th("Bien s'entourer", "« Les projets échouent, faute d'une assemblée qui délibère ; mais ils réussissent quand il y a de nombreux conseillers. »", "Proverbes 15:22",
    "Qui peut me dire la vérité sur mon activité, même quand elle dérange ?", "À qui vas-tu demander conseil cette semaine, et sur quelle question ?",
    "Seigneur, place sur ma route des personnes sages et donne-moi l'humilité de les écouter. Amen."),
  th("Le repos", "« Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos. »", "Matthieu 11:28",
    "Qu'est-ce qui m'empêche vraiment de m'arrêter ?", "Quel temps de repos non négociable bloques-tu dans ton agenda cette semaine ?",
    "Seigneur, je dépose ma fatigue devant toi. Apprends-moi à me reposer sans culpabilité. Amen."),
  th("La générosité", "« Que chacun donne comme il l'a résolu en son cœur, sans tristesse ni contrainte ; car Dieu aime celui qui donne avec joie. »", "2 Corinthiens 9:7",
    "Où est-ce que je retiens par peur de manquer ?", "Quel geste généreux (temps, conseil, don) peux-tu faire cette semaine ?",
    "Seigneur, libère mon cœur de la peur de manquer, et fais de moi quelqu'un qui donne avec joie. Amen."),
  th("L'humilité", "« L'arrogance précède la ruine, et l'orgueil précède la chute. »", "Proverbes 16:18",
    "Dans quelle situation ai-je du mal à reconnaître que je me suis trompé(e) ?", "Quelle erreur récente peux-tu reconnaître simplement, auprès d'un client ou d'un proche ?",
    "Seigneur, garde-moi de l'orgueil qui aveugle. Donne-moi de reconnaître mes erreurs et d'apprendre. Amen."),
  th("Persévérer", "« Ne nous lassons pas de faire le bien ; car nous moissonnerons au temps convenable, si nous ne nous relâchons pas. »", "Galates 6:9",
    "Qu'est-ce que je suis sur le point d'abandonner trop tôt ?", "Quelle petite action régulière vas-tu tenir cette semaine, même sans résultat visible ?",
    "Seigneur, quand je ne vois pas encore de fruit, garde-moi fidèle dans les petites choses. Amen."),
  th("Le courage", "« Ne t'ai-je pas donné cet ordre : Fortifie-toi et prends courage ? Ne t'effraie point et ne t'épouvante point, car l'Éternel, ton Dieu, est avec toi dans tout ce que tu entreprendras. »", "Josué 1:9",
    "Quelle décision je repousse parce qu'elle me fait peur ?", "Quel appel, quel devis ou quelle conversation difficile vas-tu faire cette semaine ?",
    "Seigneur, donne-moi le courage d'avancer malgré la peur, en sachant que tu es avec moi. Amen."),
  th("Demander la sagesse", "« Si quelqu'un d'entre vous manque de sagesse, qu'il la demande à Dieu, qui donne à tous simplement et sans reproche, et elle lui sera donnée. »", "Jacques 1:5",
    "Sur quelle question ai-je besoin de sagesse plutôt que d'information ?", "Formule la question sur laquelle tu demandes la sagesse cette semaine.",
    "Seigneur, je manque de sagesse pour cette décision. Donne-la-moi simplement, comme tu l'as promis. Amen."),
  th("L'argent", "« Ne vous livrez pas à l'amour de l'argent ; contentez-vous de ce que vous avez ; car Dieu lui-même a dit : Je ne te délaisserai point, et je ne t'abandonnerai point. »", "Hébreux 13:5",
    "L'argent est-il mon serviteur ou mon maître en ce moment ?", "Quelle décision financière de la semaine veux-tu prendre en paix plutôt que dans la peur ?",
    "Seigneur, que l'argent reste un serviteur dans mon activité. Merci de ne jamais m'abandonner. Amen."),
  th("La diligence", "« Les projets de l'homme diligent ne mènent qu'à l'abondance, mais celui qui agit avec précipitation n'arrive qu'à la disette. »", "Proverbes 21:5",
    "Où est-ce que je confonds vitesse et précipitation ?", "Quel projet mérite que tu prennes le temps de le préparer vraiment ?",
    "Seigneur, donne-moi la patience de bien préparer, et la constance de bien faire. Amen."),
  th("Servir les autres", "« Ne faites rien par esprit de parti ou par vaine gloire, mais que l'humilité vous fasse regarder les autres comme étant au-dessus de vous-mêmes. »", "Philippiens 2:3",
    "Comment est-ce que je considère mes clients, mes partenaires, mon équipe ?", "Quelle attention concrète peux-tu offrir à un client ou un collaborateur cette semaine ?",
    "Seigneur, apprends-moi à diriger en servant, et à voir la valeur de chaque personne. Amen."),
  th("L'échec et la faiblesse", "« Ma grâce te suffit, car ma puissance s'accomplit dans la faiblesse. »", "2 Corinthiens 12:9",
    "Quel échec récent me fait encore honte ?", "Qu'as-tu appris de ton dernier échec, et que feras-tu différemment ?",
    "Seigneur, je te donne mes échecs. Que ta grâce soit plus forte que ma honte. Amen."),
  th("Les paroles", "« Une réponse douce calme la fureur, mais une parole dure excite la colère. »", "Proverbes 15:1",
    "Comment je réagis quand un client ou un partenaire est dur avec moi ?", "Quelle conversation tendue peux-tu aborder avec douceur cette semaine ?",
    "Seigneur, mets sur mes lèvres des paroles justes et douces, surtout dans les tensions. Amen."),
];
const jourDeLAnnee = (d = new Date()) => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
// Même thème pour toute la journée, un autre demain.
export const themeDuJour = (d = new Date()) => {
  const t = themesSagesse[jourDeLAnnee(d) % themesSagesse.length];
  return { ...sagesse, ...t, meditation: [
    "Prends trois minutes. Respire lentement.",
    `Lis le verset une fois, puis une deuxième fois plus lentement : ${t.verse}`,
    `Laisse venir la question du jour : ${t.reflectionQuestion}`,
    "Termine en confiant à Dieu ce qui est venu, sans chercher à tout résoudre.",
  ] };
};
export const cleDuJour = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
