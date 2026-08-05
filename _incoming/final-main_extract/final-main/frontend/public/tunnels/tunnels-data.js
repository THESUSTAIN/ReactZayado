/* Zayado · Tunnels — data + result generation
 * 5 tunnels × 7 étapes (landing · questionnaire · loading · result · teaser · unlock · signup)
 * Vanilla JS, aucun framework requis.
 */
(function(){
'use strict';

const WELLBEING = "Avancer, développer et rayonner — sans sacrifier votre équilibre.";
const CHIPS = ["Sens", "Travail", "Bien-être", "Indépendance", "Clarté", "Ambition"];

const TUNNELS = {
  "tester-mon-projet": {
    id: "T1", slug: "tester-mon-projet", number: 1, icon: "rocket",
    kicker: "Tunnel · Tester mon projet",
    title: "Testez gratuitement", titleGold: "votre projet",
    subtitle: "Obtenez en quelques minutes une mini-analyse professionnelle de votre idée d'entreprise — score de viabilité, SWOT, recommandations et Vision Board.",
    pills: ["Score de viabilité", "Analyse SWOT", "Recommandations", "Vision Board"],
    cta: "Tester mon projet", reassurance: "Gratuit · Sans engagement · 3 minutes",
    seo: {
      title: "Tester mon projet d'entreprise — Score de viabilité gratuit | Zayado",
      description: "Testez gratuitement la viabilité de votre projet d'entreprise : score, analyse SWOT, recommandations et vision board en 3 minutes."
    },
    faq: [
      { q: "C'est vraiment gratuit ?", a: "Oui, le test de viabilité et son score sont 100% gratuits, sans carte bancaire." },
      { q: "Combien de temps ça prend ?", a: "Environ 3 minutes : 8 questions simples sur votre idée et votre marché." },
      { q: "Que reçois-je à la fin ?", a: "Un score de viabilité, une analyse SWOT et des recommandations personnalisées, avec option de créer un Vision Board." },
      { q: "Dois-je créer un compte pour voir mon score ?", a: "Le score s'affiche immédiatement. Un compte gratuit est demandé pour accéder au rapport détaillé." },
      { q: "Mes réponses sont-elles confidentielles ?", a: "Oui, vos réponses ne sont utilisées que pour générer votre analyse et ne sont pas partagées à des tiers." }
    ],
    resultTitle: "Score de viabilité de votre projet",
    questions: [
      { id: "idea", type: "textarea", label: "Décrivez votre idée en une phrase", placeholder: "Ex : Une box mensuelle de produits locaux pour familles urbaines" },
      { id: "market", type: "single", label: "Connaissez-vous votre marché cible ?", options: ["Très bien", "Assez bien", "Vaguement", "Pas encore"] },
      { id: "problem", type: "single", label: "Votre offre résout un problème…", options: ["Urgent et fréquent", "Réel mais occasionnel", "Confort / nice to have", "Je ne sais pas encore"] },
      { id: "competition", type: "single", label: "Combien de concurrents identifiez-vous ?", options: ["Aucun", "1 à 3", "4 à 10", "Beaucoup"] },
      { id: "differentiation", type: "single", label: "Votre différenciation est…", options: ["Forte et défendable", "Correcte", "Faible", "À trouver"] },
      { id: "budget", type: "single", label: "Budget de lancement disponible", options: ["< 1 000 €", "1 000 – 5 000 €", "5 000 – 20 000 €", "> 20 000 €"] },
      { id: "time", type: "single", label: "Temps que vous pouvez y consacrer", options: ["Temps plein", "Mi-temps", "Quelques heures/semaine", "Très peu"] },
      { id: "revenue", type: "single", label: "Avez-vous déjà un premier client / une vente ?", options: ["Oui, plusieurs", "Oui, un", "Des promesses", "Pas encore"] }
    ]
  },
  "creer-mon-entreprise": {
    id: "T2", slug: "creer-mon-entreprise", number: 2, icon: "building",
    kicker: "Tunnel · Créer mon entreprise",
    title: "Créez votre entreprise", titleGold: "sereinement",
    subtitle: "Statut juridique, régime fiscal, formalités : recevez une feuille de route personnalisée pour immatriculer votre entreprise sans vous tromper.",
    pills: ["Statut recommandé", "Régime fiscal", "Checklist formalités", "Estimation coûts"],
    cta: "Créer mon entreprise", reassurance: "Gratuit · Sans engagement · 4 minutes",
    seo: {
      title: "Créer mon entreprise — Statut juridique & feuille de route | Zayado",
      description: "Quel statut juridique choisir ? Recevez une feuille de route personnalisée : statut, fiscalité, formalités et coûts."
    },
    faq: [
      { q: "C'est vraiment gratuit ?", a: "Oui, la recommandation de statut juridique et la feuille de route sont gratuites." },
      { q: "Combien de temps ça prend ?", a: "Environ 4 minutes : 7 questions sur votre activité et vos priorités." },
      { q: "Le statut recommandé remplace-t-il un avocat/expert-comptable ?", a: "Non, c'est une première orientation pédagogique. Pour l'immatriculation, un professionnel reste recommandé." },
      { q: "Que reçois-je à la fin ?", a: "Un statut recommandé, un régime fiscal, une checklist de formalités et une estimation des coûts." },
      { q: "Mes réponses sont-elles confidentielles ?", a: "Oui, vos réponses ne servent qu'à générer votre feuille de route personnalisée." }
    ],
    resultTitle: "Votre feuille de route de création",
    questions: [
      { id: "activity", type: "single", label: "Quel type d'activité ?", options: ["Prestation de services", "Vente de marchandises", "Activité mixte", "Profession libérale"] },
      { id: "associates", type: "single", label: "Serez-vous seul ou à plusieurs ?", options: ["Seul", "Avec associés"] },
      { id: "revenue_est", type: "single", label: "Chiffre d'affaires prévisionnel (an 1)", options: ["< 35 000 €", "35 000 – 80 000 €", "80 000 – 200 000 €", "> 200 000 €"] },
      { id: "protection", type: "single", label: "Priorité concernant votre patrimoine", options: ["Protéger au maximum", "Équilibre", "Simplicité avant tout"] },
      { id: "charges", type: "single", label: "Aurez-vous des charges / investissements importants ?", options: ["Oui, élevés", "Modérés", "Faibles"] },
      { id: "hire", type: "single", label: "Prévoyez-vous d'embaucher ?", options: ["Oui, rapidement", "Peut-être plus tard", "Non"] },
      { id: "remuneration", type: "single", label: "Comment souhaitez-vous vous rémunérer ?", options: ["Salaire régulier", "Dividendes", "Flexible / mixte", "Je ne sais pas"] }
    ]
  },
  "trouver-mes-premiers-clients": {
    id: "T3", slug: "trouver-mes-premiers-clients", number: 3, icon: "users",
    kicker: "Tunnel · Trouver mes premiers clients",
    title: "Trouvez vos premiers", titleGold: "clients",
    subtitle: "Ciblage, canaux, offre d'appel, budget : un plan d'acquisition adapté à votre projet pour signer vos premiers contrats rapidement.",
    pills: ["Ciblage précis", "Canaux prioritaires", "Offre d'appel", "Plan 30 jours"],
    cta: "Trouver mes clients", reassurance: "Gratuit · Sans engagement · 4 minutes",
    seo: {
      title: "Trouver mes premiers clients — Plan d'acquisition gratuit | Zayado",
      description: "Recevez un plan d'acquisition sur-mesure : ciblage, canaux, offre d'appel, budget et plan 30 jours pour signer vos premiers clients."
    },
    faq: [
      { q: "C'est vraiment gratuit ?", a: "Oui, votre plan d'acquisition personnalisé est entièrement gratuit." },
      { q: "Combien de temps ça prend ?", a: "Quelques minutes pour répondre aux questions sur votre cible et vos ressources." },
      { q: "Le plan est-il vraiment personnalisé ?", a: "Oui, il est généré à partir de vos réponses : secteur, budget, temps disponible et canaux pertinents pour vous." },
      { q: "Que reçois-je à la fin ?", a: "Un ciblage, des canaux prioritaires, une offre d'appel suggérée et un plan sur 30 jours." },
      { q: "Dois-je avoir déjà un produit fini ?", a: "Non, le plan s'adapte même si votre offre est encore en construction." }
    ],
    resultTitle: "Votre plan d'acquisition",
    questions: [
      { id: "offer", type: "textarea", label: "Décrivez votre offre en une phrase", placeholder: "Ex : Coaching en gestion du stress pour dirigeants" },
      { id: "target", type: "single", label: "Votre cible est…", options: ["B2B (entreprises)", "B2C (particuliers)", "B2B2C (mixte)"] },
      { id: "avatar", type: "single", label: "Votre client idéal est identifié ?", options: ["Précisément", "En grandes lignes", "Vaguement", "Pas encore"] },
      { id: "channel", type: "multi", label: "Où sont vos clients potentiels ?", options: ["LinkedIn", "Instagram", "Google", "Bouche à oreille", "Événements", "Autre"] },
      { id: "price", type: "single", label: "Positionnement prix", options: ["Premium", "Milieu de gamme", "Accessible", "En cours de définition"] },
      { id: "budget_acq", type: "single", label: "Budget d'acquisition mensuel", options: ["0 €", "< 500 €", "500 – 2 000 €", "> 2 000 €"] },
      { id: "delay", type: "single", label: "Dans combien de temps voulez-vous vos premiers clients ?", options: ["Immédiatement", "Sous 30 jours", "Sous 90 jours", "Pas d'urgence"] }
    ]
  },
  "structurer-mon-entreprise": {
    id: "T4", slug: "structurer-mon-entreprise", number: 4, icon: "layout",
    kicker: "Tunnel · Structurer mon entreprise",
    title: "Structurez &", titleGold: "pilotez votre activité",
    subtitle: "Diagnostic de pilotage et feuille de route priorisée : organisation, process, indicateurs et outils pour croître sereinement.",
    pills: ["Diagnostic pilotage", "Priorités 90 jours", "Indicateurs clés", "Outils recommandés"],
    cta: "Recevoir mon diagnostic", reassurance: "Gratuit · Sans engagement · 5 minutes",
    seo: {
      title: "Structurer mon entreprise — Diagnostic de pilotage | Zayado",
      description: "Diagnostic de pilotage complet : organisation, process, indicateurs et feuille de route priorisée."
    },
    faq: [
      { q: "C'est vraiment gratuit ?", a: "Oui, le diagnostic de pilotage est gratuit." },
      { q: "À qui s'adresse ce diagnostic ?", a: "Aux entrepreneurs déjà en activité qui veulent mieux organiser et piloter leur entreprise." },
      { q: "Combien de temps ça prend ?", a: "Quelques minutes pour évaluer votre organisation actuelle." },
      { q: "Que reçois-je à la fin ?", a: "Un diagnostic de votre organisation, process et indicateurs, avec une feuille de route priorisée." },
      { q: "Faut-il des outils spécifiques déjà en place ?", a: "Non, le diagnostic part de votre situation actuelle, quel que soit votre niveau d'outillage." }
    ],
    resultTitle: "Votre diagnostic de pilotage",
    questions: [
      { id: "stage", type: "single", label: "Où en est votre entreprise ?", options: ["< 1 an", "1 à 3 ans", "3 à 5 ans", "> 5 ans"] },
      { id: "team", type: "single", label: "Combien êtes-vous ?", options: ["Solo", "2 à 5", "6 à 20", "> 20"] },
      { id: "processes", type: "single", label: "Vos processus sont…", options: ["Documentés & automatisés", "Partiellement en place", "Dans ma tête", "Inexistants"] },
      { id: "dashboards", type: "single", label: "Suivez-vous des indicateurs (KPIs) ?", options: ["Oui, régulièrement", "De temps en temps", "Non"] },
      { id: "cashflow", type: "single", label: "Visibilité sur votre trésorerie", options: ["Excellente (prévisionnel)", "Correcte", "Faible", "Aucune"] },
      { id: "delegation", type: "single", label: "Savez-vous déléguer ?", options: ["Oui, efficacement", "En partie", "Non, tout repose sur moi"] },
      { id: "priority", type: "single", label: "Votre principal frein aujourd'hui", options: ["Le temps", "L'organisation", "Les finances", "Le recrutement"] }
    ]
  },
  "optimiser-ma-rentabilite": {
    id: "T5", slug: "optimiser-ma-rentabilite", number: 5, icon: "trending",
    financial: true,
    kicker: "Tunnel · Optimiser ma rentabilité",
    title: "Optimisez", titleGold: "votre rentabilité",
    subtitle: "Analyse financière professionnelle basée sur 9 ratios clés : liquidité, solvabilité, rentabilité et croissance. Feux tricolores + graphique radar.",
    pills: ["9 ratios clés", "Feux 🔴🟠🟢", "Radar 4 axes", "Plan d'optimisation"],
    cta: "Analyser ma rentabilité", reassurance: "Gratuit · Confidentiel · 5 minutes",
    seo: {
      title: "Optimiser ma rentabilité — Analyse financière 9 ratios | Zayado",
      description: "Analyse financière complète : liquidité, endettement, marge nette, solvabilité, BFR, ROI. Diagnostic + plan d'optimisation."
    },
    faq: [
      { q: "C'est vraiment gratuit ?", a: "Oui, l'analyse financière et ses 9 ratios sont gratuits." },
      { q: "Ai-je besoin de mes vrais chiffres comptables ?", a: "Des données approximatives suffisent pour une première analyse ; plus elles sont précises, plus le diagnostic est fiable." },
      { q: "Combien de temps ça prend ?", a: "Quelques minutes pour renseigner vos principaux indicateurs financiers." },
      { q: "Que reçois-je à la fin ?", a: "Un diagnostic sur 9 ratios clés (liquidité, solvabilité, rentabilité, croissance) avec un plan d'optimisation." },
      { q: "Mes données financières sont-elles confidentielles ?", a: "Oui, elles ne servent qu'à générer votre diagnostic et ne sont pas partagées à des tiers." }
    ],
    resultTitle: "Votre diagnostic financier",
    compliance: "Vos données financières sont strictement confidentielles, traitées de manière anonyme et jamais partagées. Elles servent uniquement à générer votre diagnostic.",
    questions: [
      { id: "sector", type: "single", label: "Votre secteur d'activité", options: ["Service B2B", "E-commerce", "Manufacture / Industrie", "Commerce / Retail"] },
      { id: "ca", type: "number", label: "Chiffre d'affaires annuel (€)", placeholder: "Ex : 500000" },
      { id: "ca_prev", type: "number", label: "Chiffre d'affaires N-1 (€)", placeholder: "Ex : 430000" },
      { id: "net_profit", type: "number", label: "Bénéfice net (€)", placeholder: "Ex : 45000" },
      { id: "current_assets", type: "number", label: "Actif circulant / court terme (€)", placeholder: "Ex : 180000" },
      { id: "current_liabilities", type: "number", label: "Passif circulant / court terme (€)", placeholder: "Ex : 110000" },
      { id: "total_assets", type: "number", label: "Total de l'actif (€)", placeholder: "Ex : 620000" },
      { id: "total_debt", type: "number", label: "Total des dettes (€)", placeholder: "Ex : 260000" },
      { id: "equity", type: "number", label: "Capitaux propres (€)", placeholder: "Ex : 300000" },
      { id: "ebit", type: "number", label: "Résultat d'exploitation / EBIT (€)", placeholder: "Ex : 60000" },
      { id: "interest_rate", type: "number", label: "Taux d'intérêt moyen de la dette (%)", placeholder: "Ex : 4" },
      { id: "investment", type: "number", label: "Investissement total engagé (€)", placeholder: "Ex : 250000" },
      { id: "employees", type: "number", label: "Nombre de salariés", placeholder: "Ex : 6" }
    ]
  }
};

const RESULT_LIB = {
  T1: {
    dims: ["Marché", "Différenciation", "Faisabilité", "Traction"],
    strengths: ["Idée clairement formulée", "Problème réel identifié", "Marché accessible"],
    watch: ["Différenciation à renforcer", "Valider le prix psychologique", "Tester l'appétence réelle"],
    reco: [
      "Réalisez 10 entretiens de découverte avec des clients cibles.",
      "Construisez une landing page test pour mesurer l'intérêt.",
      "Définissez votre proposition de valeur unique en une phrase."
    ]
  },
  T2: {
    dims: ["Statut", "Fiscalité", "Protection", "Simplicité"],
    strengths: ["Projet clair", "Prévisionnel cohérent", "Bonne anticipation"],
    watch: ["Choix du régime fiscal", "Protection du patrimoine", "Charges à budgéter"],
    reco: [
      "Comparez micro-entreprise, EURL et SASU selon votre CA prévisionnel.",
      "Anticipez votre rémunération (salaire vs dividendes).",
      "Préparez votre dossier d'immatriculation avec la checklist Zayado."
    ]
  },
  T3: {
    dims: ["Ciblage", "Canaux", "Contenu", "Budget"],
    strengths: ["Offre définie", "Cible identifiée", "Canaux pertinents"],
    watch: ["Régularité du contenu", "Budget d'acquisition", "Taux de conversion"],
    reco: [
      "Concentrez-vous sur 1 à 2 canaux prioritaires les 30 premiers jours.",
      "Créez une offre d'appel irrésistible pour vos premiers clients.",
      "Mettez en place un rituel de prospection hebdomadaire."
    ]
  },
  T4: {
    dims: ["Organisation", "Process", "Pilotage", "Délégation"],
    strengths: ["Activité établie", "Vision claire", "Volonté de structurer"],
    watch: ["Formalisation des process", "Suivi des KPIs", "Capacité à déléguer"],
    reco: [
      "Documentez vos 3 processus les plus critiques.",
      "Mettez en place un tableau de bord avec 5 KPIs essentiels.",
      "Identifiez une première tâche à déléguer ce mois-ci."
    ]
  }
};

const SIGNAL_META = {
  green:  { color: "#2E7D5B", bg: "#E7F3EC", label: "Sain",         dot: "🟢" },
  orange: { color: "#B87A1E", bg: "#FBF1DF", label: "À surveiller", dot: "🟠" },
  red:    { color: "#C0392B", bg: "#FBE9E7", label: "Alerte",       dot: "🔴" }
};

function num(v){ const n = parseFloat(String(v||"").replace(/[^0-9.-]/g,"")); return isNaN(n)?0:n; }
function safeDiv(x,y){ return y===0?0:x/y; }

function computeFinancialRatios(a){
  const ca=num(a.ca), caPrev=num(a.ca_prev), netProfit=num(a.net_profit);
  const currentAssets=num(a.current_assets), currentLiab=num(a.current_liabilities);
  const totalAssets=num(a.total_assets), totalDebt=num(a.total_debt);
  const equity=num(a.equity), ebit=num(a.ebit);
  const rate=num(a.interest_rate)/100, investment=num(a.investment);
  const employees=num(a.employees)||1;

  const liquidity=safeDiv(currentAssets,currentLiab);
  const debtRatio=safeDiv(totalDebt,totalAssets)*100;
  const netMargin=safeDiv(netProfit,ca)*100;
  const solvency=safeDiv(equity,totalDebt);
  const interestCoverage=safeDiv(ebit,totalDebt*rate||1);
  const growth=safeDiv(ca-caPrev,caPrev)*100;
  const bfr=currentAssets-currentLiab;
  const roi=safeDiv(netProfit,investment)*100;
  const productivity=safeDiv(ca,employees)/1000;

  const sig = (v,g,o)=> g(v)?"green":o(v)?"orange":"red";
  return [
    {key:"liquidity",label:"Ratio de liquidité",formula:"Actif court / Passif court",display:liquidity.toFixed(2),signal:sig(liquidity,v=>v>=1.5&&v<=2.5,v=>(v>=1&&v<1.5)||v>2.5),benchmark:"Sain : 1,5 – 2,5",axis:"Liquidité"},
    {key:"debt",label:"Ratio d'endettement",formula:"Dettes tot. / Actif tot.",display:debtRatio.toFixed(0)+"%",signal:sig(debtRatio,v=>v<40,v=>v>=40&&v<=65),benchmark:"Sain : < 40%",axis:"Solvabilité"},
    {key:"margin",label:"Marge nette",formula:"(Bénéf. net / CA) × 100",display:netMargin.toFixed(1)+"%",signal:sig(netMargin,v=>v>8,v=>v>=3&&v<=8),benchmark:"Sain : > 8%",axis:"Rentabilité"},
    {key:"solvency",label:"Ratio de solvabilité",formula:"Capitaux propres / Dettes tot.",display:solvency.toFixed(2),signal:sig(solvency,v=>v>1,v=>v>=0.5&&v<=1),benchmark:"Sain : > 1",axis:"Solvabilité"},
    {key:"coverage",label:"Couverture des intérêts",formula:"EBIT / (Dettes × Taux)",display:interestCoverage.toFixed(1)+"×",signal:sig(interestCoverage,v=>v>3,v=>v>=1.5&&v<=3),benchmark:"Sain : > 3×",axis:"Solvabilité"},
    {key:"growth",label:"Taux de croissance",formula:"(CAn - CAn-1) / CAn-1",display:growth.toFixed(1)+"%",signal:sig(growth,v=>v>10,v=>v>=0&&v<=10),benchmark:"Sain : > 10%",axis:"Croissance"},
    {key:"bfr",label:"BFR",formula:"Actif circ. - Passif circ.",display:bfr.toLocaleString("fr-FR")+" €",signal:bfr<=currentAssets*0.3?"green":"orange",benchmark:"À adapter au secteur",axis:"Liquidité"},
    {key:"roi",label:"ROI",formula:"Bénéfice / Investissement",display:roi.toFixed(1)+"%",signal:sig(roi,v=>v>15,v=>v>=5&&v<=15),benchmark:"Sain : > 15%",axis:"Rentabilité"},
    {key:"productivity",label:"Productivité",formula:"CA / Nb salariés",display:productivity.toFixed(0)+" k€/sal.",signal:sig(productivity,v=>v>50,v=>v>=30&&v<=50),benchmark:"Sain : > 50 k€/salarié",axis:"Rentabilité"}
  ];
}
function buildRadar(ratios){
  const axes=["Liquidité","Solvabilité","Rentabilité","Croissance"];
  const scoreOf=s=>s==="green"?100:s==="orange"?60:25;
  return axes.map(axis=>{
    const items=ratios.filter(r=>r.axis===axis);
    const avg=items.length?Math.round(items.reduce((t,r)=>t+scoreOf(r.signal),0)/items.length):50;
    return {axis, value:avg};
  });
}
function scoreFromAnswers(tunnel, ans){
  let total=0, count=0;
  tunnel.questions.forEach(q=>{
    if(q.type==="single" && q.options){
      const idx=q.options.indexOf(ans[q.id]);
      if(idx>=0){ total+=(q.options.length-1-idx)/(q.options.length-1); count++; }
    } else if(q.type==="multi"){
      const arr=ans[q.id]||[]; total+=Math.min(arr.length/3,1); count++;
    }
  });
  return count?Math.round((total/count)*100):62;
}
function generateResult(slug, ans){
  const t = TUNNELS[slug]; if(!t) return null;
  if(t.financial){
    const ratios=computeFinancialRatios(ans);
    const radar=buildRadar(ratios);
    const greens=ratios.filter(r=>r.signal==="green").length;
    const reds=ratios.filter(r=>r.signal==="red").length;
    const score=Math.max(20,Math.min(98,Math.round((greens/ratios.length)*100)));
    const verdict = reds>=3 ? "Des points de vigilance importants nécessitent une action rapide."
                  : greens>=6 ? "Votre entreprise présente une santé financière solide."
                  : "Une base saine, avec des leviers d'optimisation identifiés.";
    return {type:"financial",score,verdict,
      intro:"Vous avez une base solide. Sans pilotage financier régulier, vous risquez toutefois de rater vos objectifs sur 12 mois.",
      ratios, radar,
      teaserRatios:ratios.slice(0,3), lockedRatios:ratios.slice(3),
      reco:[
        reds>0?"Priorisez le redressement des indicateurs en alerte (🔴).":"Consolidez vos indicateurs verts pour sécuriser la croissance.",
        "Mettez en place un prévisionnel de trésorerie glissant sur 12 mois.",
        "Optimisez votre BFR selon les standards de votre secteur."
      ]};
  }
  const lib=RESULT_LIB[t.id];
  const score=scoreFromAnswers(t,ans);
  const radar=lib.dims.map((axis,i)=>({axis, value:Math.max(25,Math.min(100,score+[8,-6,4,-10][i%4]))}));
  const verdict = score>=75?"Excellent potentiel — vous êtes prêt à passer à l'action."
                : score>=55?"Bon potentiel — quelques ajustements maximiseront vos chances."
                : "Potentiel à consolider — priorisez les fondations avant d'accélérer.";
  return {type:"generic",score,verdict,
    intro:"Vous avez une base solide, et des opportunités existent pour aller plus loin.",
    radar, strengths:lib.strengths, watch:lib.watch, reco:lib.reco,
    teaserStrengths:lib.strengths.slice(0,2)};
}

window.ZayadoTunnels = { TUNNELS, generateResult, SIGNAL_META, WELLBEING, CHIPS };
})();
