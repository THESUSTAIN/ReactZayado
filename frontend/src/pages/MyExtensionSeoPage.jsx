import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { UnifiedFooter } from "./LandingHub";

const NAVY = "#071B3A";
const NAVY2 = "#163B63";
const GOLD = "#E3C887";
const CREAM = "#F6F1E8";

const DATA = {
  vision: {
    title: "Vision Board pour entrepreneur | MyExtension AI by Zayado",
    description: "Construisez une Vision claire, reliez vos objectifs à vos priorités et transformez votre ambition en trajectoire de travail dans MyExtension AI.",
    canonical: "https://zayado.net/myextension-ai/vision",
    eyebrow: "VISION",
    h1: "Donnez une direction concrète à votre activité.",
    intro: "MyExtension AI commence par votre Vision : un cap lisible, des priorités cohérentes et une trajectoire que vous pouvez réellement traduire en actions.",
    points: ["Définir votre Cap et vos objectifs", "Relier vision, projets et prochaines actions", "Suivre l’évolution de votre Score Business et de vos priorités"],
    cta: "Découvrir MyExtension AI",
    related: [["Pilotage financier", "/myextension-ai/pilotage-financier"], ["Espace de travail", "/myextension-ai/espace-travail"]],
  },
  finance: {
    title: "Pilotage financier pour indépendant | MyExtension AI",
    description: "Suivez trésorerie, chiffre d’affaires, marge et résultat avec un espace de pilotage financier conçu pour les indépendants et petites structures.",
    canonical: "https://zayado.net/myextension-ai/pilotage-financier",
    eyebrow: "PILOTAGE FINANCIER",
    h1: "Comprenez vos chiffres avant de prendre vos décisions.",
    intro: "Le module Pilotage & trésorerie rassemble les indicateurs financiers essentiels et vous aide à les lire dans le contexte de votre activité.",
    points: ["Trésorerie disponible, chiffre d’affaires, marge nette et résultat net", "Historique de trésorerie et lecture des tendances", "Décisions financières, simulations et export des données"],
    cta: "Voir le cockpit financier",
    related: [["Vision", "/myextension-ai/vision"], ["Mon Mouvement", "/myextension-ai/espace-travail"]],
  },
  work: {
    title: "Gestion des tâches et projets pour indépendant | MyExtension AI",
    description: "Organisez missions, tâches, projets, ressources et semaine de travail dans MyExtension AI avec une logique simple et soutenable.",
    canonical: "https://zayado.net/myextension-ai/espace-travail",
    eyebrow: "ESPACE DE TRAVAIL",
    h1: "Passez du Cap à une action soutenable.",
    intro: "Mon Mouvement structure l’exécution : mission principale, engagements, projets, plan de semaine et ressources utiles sont réunis dans un même espace.",
    points: ["Mission principale et engagements actionnables", "Projets reliés aux tâches et mesure du temps", "Plan de semaine et ressources utiles"],
    cta: "Voir l’espace de travail",
    related: [["Énergie", "/myextension-ai/energie"], ["Vision", "/myextension-ai/vision"]],
  },
  energy: {
    title: "Énergie et bien-être au travail pour entrepreneur | MyExtension AI",
    description: "Suivez votre énergie, vos rituels et votre capacité du jour pour organiser votre travail sans sacrifier votre équilibre.",
    canonical: "https://zayado.net/myextension-ai/energie",
    eyebrow: "ÉNERGIE & CAPACITÉ",
    h1: "Votre journée doit tenir compte de votre capacité réelle.",
    intro: "Le module Mindset & capacité relie vos check-ins, vos rituels, vos tâches et votre capacité du jour pour vous aider à ajuster votre charge.",
    points: ["Check-ins d’énergie et historique", "Rituels et séries de régularité", "Verdict de surcharge, action recommandée et lien avec votre Vision"],
    cta: "Découvrir l’espace Énergie",
    related: [["Espace de travail", "/myextension-ai/espace-travail"], ["Vision", "/myextension-ai/vision"]],
  },
};

export default function MyExtensionSeoPage({ type }) {
  const d = DATA[type];
  return <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${NAVY} 0%, #0E2B4D 62%, ${CREAM} 100%)`, color: "#fff" }}>
    <Helmet>
      <title>{d.title}</title>
      <meta name="description" content={d.description} />
      <link rel="canonical" href={d.canonical} />
      <meta name="robots" content="index,follow" />
      <meta property="og:title" content={d.title} />
      <meta property="og:description" content={d.description} />
      <meta property="og:url" content={d.canonical} />
      <meta property="og:image" content="https://zayado.net/og-image.svg" />
    </Helmet>

    <header className="border-b border-white/10 bg-[#071B3A]/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Link to="/myextension-ai" className="font-semibold tracking-wide">MYEXTENSION AI</Link>
        <div className="flex gap-3 items-center text-xs text-white/70">
          <Link to="/myextension-ai">Accueil</Link>
          <Link to="/myextension-ai/vision">Vision</Link>
          <Link to="/myextension-ai/pilotage-financier">Pilotage</Link>
          <Link to="/myextension-ai/espace-travail">Travail</Link>
          <Link to="/myextension-ai/energie">Énergie</Link>
          <a href="/app/login" className="rounded-full px-4 py-2 text-[#102945] font-semibold" style={{background:"linear-gradient(135deg,#f4e6c5,#c89b52)"}}>Ouvrir l’app</a>
        </div>
      </div>
    </header>

    <main>
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="max-w-4xl">
          <div className="text-xs uppercase tracking-[.25em]" style={{ color: GOLD }}>{d.eyebrow}</div>
          <h1 className="mt-5 text-5xl md:text-7xl font-semibold leading-[.95] tracking-tight">{d.h1}</h1>
          <p className="mt-7 max-w-3xl text-lg md:text-xl leading-relaxed text-white/68">{d.intro}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="/app/login" className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[#102945] font-semibold" style={{background:"linear-gradient(135deg,#f4e6c5,#c89b52)"}}>{d.cta} <ArrowRight size={16}/></a>
            <Link to="/myextension-ai" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-white/85 font-semibold">Voir l’ensemble du cockpit</Link>
          </div>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-4">
          {d.points.map((p)=><article key={p} className="rounded-2xl border border-white/10 bg-white/[0.05] p-6"><CheckCircle2 size={18} style={{color:GOLD}}/><p className="mt-4 text-white/82 leading-relaxed">{p}</p></article>)}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0A223D]/80">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20 grid lg:grid-cols-[1fr_.7fr] gap-10 items-center">
          <div>
            <div className="text-xs uppercase tracking-[.25em]" style={{ color: GOLD }}>Dans l’application</div>
            <h2 className="mt-3 text-4xl md:text-5xl font-semibold">Une logique simple : vos données, votre contexte, vos choix.</h2>
            <p className="mt-5 text-white/65 max-w-2xl">MyExtension AI ne remplace pas vos systèmes de référence. Il sert à réunir le contexte utile et à vous aider à préparer vos prochaines décisions.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#153A5D] p-6">
            <div className="text-xs uppercase tracking-[.2em] text-white/45">Architecture de décision</div>
            <div className="mt-5 space-y-3">{["Vision", "Pilotage", "Travail", "Énergie"].map((x,i)=><div key={x} className="rounded-xl bg-white/[0.06] border border-white/10 px-4 py-3 flex items-center justify-between"><span>{x}</span><span style={{color:GOLD}}>0{i+1}</span></div>)}</div>
          </div>
        </div>
      </section>

      <section className="bg-[#F6F1E8] text-[#102945]">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16">
          <div className="text-xs uppercase tracking-[.25em] text-[#9D7A43]">À explorer ensuite</div>
          <div className="grid md:grid-cols-2 gap-5 mt-6">
            {d.related.map(([label,href])=><Link key={href} to={href} className="rounded-2xl border border-[#dfd6c8] bg-white p-6 flex items-center justify-between hover:-translate-y-0.5 transition"><div><div className="font-semibold">{label}</div><div className="mt-1 text-sm text-black/50">Voir la page dédiée</div></div><ArrowRight size={18}/></Link>)}
          </div>
        </div>
      </section>
    </main>
    <UnifiedFooter />
  </div>
}
