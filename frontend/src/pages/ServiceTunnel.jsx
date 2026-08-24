import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Check, ChevronRight, ShieldCheck, Clock3, MessageCircle, Calculator, Users, FileText, Building2, TrendingUp } from "lucide-react";
import { PublicHeader, UnifiedFooter } from "./LandingHub";

const CONFIG = {
  "/services/finance-pilotage": {
    title:"Finance & pilotage pour indépendants et petites structures",
    desc:"Un pilotage financier clair pour comprendre votre activité, sécuriser votre trésorerie et décider avec de vrais chiffres.",
    intent:"Piloter mon activité",
    tag:"Opéré par Zayado",
    icon:Calculator,
    color:"#102945",
    bullets:["Lecture de rentabilité et marge","Suivi de trésorerie et points de vigilance","Tableaux de bord et préparation des décisions","Accompagnement adapté à votre niveau de maturité"],
    steps:["Décrire votre activité", "Identifier le besoin financier prioritaire", "Recevoir le bon parcours Zayado"]
  },
  "/services/gestion-administrative": {
    title:"Gestion & délégation administrative",
    desc:"Déléguez une partie du quotidien opérationnel sans perdre la visibilité sur votre activité.",
    intent:"Déléguer ma gestion",
    tag:"Service Zayado / partenaire selon le besoin",
    icon:FileText,
    color:"#1f3a5f",
    bullets:["Facturation et suivi administratif","Organisation des flux et échéances","Préparation des éléments de gestion","Orientation vers un spécialiste si nécessaire"],
    steps:["Identifier ce que vous voulez déléguer", "Mesurer la charge et le niveau d'urgence", "Construire la bonne intervention"]
  },
  "/services/creation-structuration": {
    title:"Créer ou structurer son activité",
    desc:"Passez d'un projet dispersé à une activité structurée : modèle, statut, organisation et premières priorités.",
    intent:"Créer ou structurer mon activité",
    tag:"Parcours accompagné",
    icon:Building2,
    color:"#6f2d2a",
    bullets:["Clarification de l'offre et du modèle économique","Choix des premières priorités","Préparation des éléments de création","Mise en relation avec les expertises nécessaires"],
    steps:["Où en êtes-vous aujourd'hui ?", "Quelle décision devez-vous prendre ?", "Quel accompagnement vous manque ?"]
  },
  "/services/cession-reprise": {
    title:"Cession ou reprise d'entreprise",
    desc:"Un parcours structuré pour préparer une cession, étudier une reprise ou avancer sur une opération de transmission.",
    intent:"Préparer une opération",
    tag:"Accès prioritaire MyExtension AI",
    icon:TrendingUp,
    color:"#162f4f",
    bullets:["Cadrage du projet de cession ou reprise","Analyse financière et points de vigilance","Préparation du dossier et des prochaines étapes","Orientation vers les expertises spécialisées"],
    steps:["Cession, reprise ou exploration ?", "Quel horizon et quel niveau de maturité ?", "Quel est le prochain jalon critique ?"]
  }
};

export default function ServiceTunnel(){
  const { pathname } = useLocation();
  const cfg = CONFIG[pathname] || CONFIG["/services/finance-pilotage"];
  const Icon = cfg.icon;
  const [answers,setAnswers] = useState({});
  const [done,setDone] = useState(false);
  const questions = [
    {k:"stage",q: "Où en êtes-vous ?", opts:["Je démarre","Mon activité est lancée","Je veux la structurer / déléguer","Je prépare une opération"]},
    {k:"need",q:"Quelle est votre priorité ?", opts:["Comprendre mes chiffres","Gagner du temps","Structurer l'activité","Préparer une décision importante"]},
    {k:"urgency",q:"Quel est votre horizon ?", opts:["Cette semaine","Ce mois-ci","Dans les 3 prochains mois","Je suis encore en exploration"]},
  ];
  const progress = Object.keys(answers).length / questions.length;
  const recommendation = useMemo(()=> {
    if (answers.need === "Comprendre mes chiffres") return "Un parcours Finance & pilotage est le plus pertinent.";
    if (answers.need === "Gagner du temps") return "Un parcours Gestion & délégation est le plus pertinent.";
    if (answers.need === "Structurer l'activité") return "Un parcours Création & structuration est le plus pertinent.";
    if (answers.need === "Préparer une décision importante") return "Un échange de cadrage est le meilleur prochain pas.";
    return "Nous vous orienterons selon vos réponses.";
  },[answers]);
  return <div className="min-h-screen" style={{background:"#f6f3ee"}}>
    <Helmet><title>{cfg.title} | ZAYADO</title><meta name="description" content={cfg.desc}/><link rel="canonical" href={`https://zayado.net${pathname}`}/><meta name="robots" content="index,follow"/></Helmet>
    <PublicHeader/>
    <main>
      <section className="text-white" style={{background:`linear-gradient(120deg,${cfg.color} 0%,#102945 100%)`}}><div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24"><div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-3 py-1.5 text-xs uppercase tracking-widest"><Icon size={14}/> {cfg.tag}</div><h1 className="mt-5 max-w-4xl text-4xl md:text-6xl font-serif leading-tight">{cfg.title}</h1><p className="mt-5 max-w-2xl text-white/75 text-lg leading-relaxed">{cfg.desc}</p><div className="mt-8 flex flex-wrap gap-3"><a href="#diagnostic" className="rounded-full bg-white px-5 py-3 text-sm font-semibold" style={{color:cfg.color}}>Commencer le diagnostic</a><Link to="/nos-services" className="rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold">Voir tous les services</Link></div></div></section>
      <section className="max-w-6xl mx-auto px-4 md:px-6 -mt-8 relative"><div className="bg-white rounded-[28px] border border-[#e4dccd] shadow-xl p-6 md:p-8 grid md:grid-cols-3 gap-4">{cfg.steps.map((s,i)=><div key={s} className="rounded-2xl bg-[#faf8f4] p-5"><div className="text-xs uppercase tracking-widest text-[#a18145]">Étape 0{i+1}</div><div className="font-semibold mt-2">{s}</div></div>)}</div></section>
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-16 grid lg:grid-cols-2 gap-8"><div><div className="text-xs uppercase tracking-widest text-[#a18145]">Ce que vous gagnez</div><h2 className="mt-2 text-3xl md:text-4xl font-serif">Un service lisible, sans jargon commercial.</h2><div className="mt-6 space-y-4">{cfg.bullets.map(b=><div key={b} className="flex gap-3"><Check className="mt-1 shrink-0" size={18} style={{color:"#a18145"}}/><span className="text-[#5f584e]">{b}</span></div>)}</div></div><div id="diagnostic" className="rounded-[28px] bg-white border border-[#e4dccd] p-6 md:p-8 shadow-sm"><div className="flex justify-between items-center"><div><div className="text-xs uppercase tracking-widest text-[#a18145]">Diagnostic express</div><h2 className="mt-1 text-2xl font-serif">3 questions, puis la bonne orientation.</h2></div><div className="text-sm text-[#7a7165]">{Math.round(progress*100)}%</div></div><div className="h-2 bg-[#eee7da] rounded-full mt-5 overflow-hidden"><div className="h-full transition-all" style={{width:`${progress*100}%`,background:"#c19b56"}}/></div><div className="mt-7 space-y-6">{questions.map((q)=>!answers[q.k] ? <div key={q.k}><div className="font-semibold mb-3">{q.q}</div><div className="grid sm:grid-cols-2 gap-2">{q.opts.map(o=><button key={o} onClick={()=>setAnswers(a=>({...a,[q.k]:o}))} className="text-left rounded-xl border border-[#e1d9ca] px-4 py-3 text-sm hover:border-[#b89855] hover:bg-[#fbf8f1]">{o}</button>)}</div></div>:null)}</div>{Object.keys(answers).length===questions.length && <div className="mt-7 rounded-2xl bg-[#f6f0e4] p-5"><div className="text-xs uppercase tracking-widest text-[#a18145]">Votre orientation</div><div className="font-semibold mt-1">{recommendation}</div><p className="text-sm text-[#70675c] mt-2">L'étape suivante permet de vérifier votre situation avec une personne de l'équipe Zayado.</p><Link to={`/contact?service=${encodeURIComponent(cfg.intent)}`} className="inline-flex mt-4 items-center gap-2 rounded-full px-5 py-3 text-white text-sm font-semibold" style={{background:cfg.color}}>Parler à Zayado <ArrowRight size={15}/></Link><button onClick={()=>setAnswers({})} className="block mt-3 text-xs underline text-[#6f675d]">Recommencer</button></div>}</div></div></section>
      <section className="bg-white border-y border-[#e4dccd]"><div className="max-w-6xl mx-auto px-4 md:px-6 py-12 grid sm:grid-cols-3 gap-6 text-center"><div><ShieldCheck className="mx-auto" size={22} style={{color:"#a18145"}}/><div className="font-semibold mt-2">Cadre clair</div><div className="text-xs text-[#71685e] mt-1">Ce qui est opéré par Zayado est identifié.</div></div><div><Clock3 className="mx-auto" size={22} style={{color:"#a18145"}}/><div className="font-semibold mt-2">Parcours court</div><div className="text-xs text-[#71685e] mt-1">Diagnostic avant le formulaire.</div></div><div><MessageCircle className="mx-auto" size={22} style={{color:"#a18145"}}/><div className="font-semibold mt-2">Bon interlocuteur</div><div className="text-xs text-[#71685e] mt-1">Vous arrivez avec un contexte déjà cadré.</div></div></div></section>
    </main>
    <UnifiedFooter/>
  </div>
}
