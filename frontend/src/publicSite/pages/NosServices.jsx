import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, BriefcaseBusiness, Check, ChevronRight, FileText, Landmark, Search, Sparkles, WalletCards } from "lucide-react";
import { PublicHeader, UnifiedFooter } from "./LandingHub";

const SERVICES = [
  { id:"finance", icon:WalletCards, title:"Finance & pilotage", intro:"Comprendre vos chiffres, sécuriser votre trésorerie et décider avec des données utiles.", points:["Pilotage financier", "Analyse de trésorerie", "Reporting et indicateurs", "Préparation des décisions"], cta:"Parler de mon besoin" },
  { id:"gestion", icon:FileText, title:"Gestion & organisation", intro:"Structurer les tâches administratives et les processus qui prennent trop de temps au quotidien.", points:["Organisation administrative", "Suivi des échéances", "Facturation et documents", "Mise en place de méthodes simples"], cta:"Faire mon diagnostic" },
  { id:"developpement", icon:BarChart3, title:"Développement & acquisition", intro:"Clarifier vos priorités commerciales et transformer vos actions marketing en résultats mesurables.", points:["Positionnement", "Acquisition", "Marketing opérationnel", "Suivi des actions et résultats"], cta:"Définir ma priorité" },
  { id:"structuration", icon:BriefcaseBusiness, title:"Création & structuration", intro:"Passer d'une idée ou d'une activité dispersée à un projet plus clair, cadré et exploitable.", points:["Cadrage du projet", "Business model", "Choix des prochaines étapes", "Orientation vers les expertises nécessaires"], cta:"Valider mon projet" },
];

export default function NosServices() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({ situation:"", besoin:"", urgence:"", budget:"" });
  const [result, setResult] = useState(null);
  const recommendation = useMemo(() => {
    if (answers.besoin === "finance") return SERVICES[0];
    if (answers.besoin === "gestion") return SERVICES[1];
    if (answers.besoin === "developpement") return SERVICES[2];
    if (answers.besoin === "structuration") return SERVICES[3];
    if (answers.situation === "projet") return SERVICES[3];
    return SERVICES[0];
  }, [answers]);
  const next = () => {
    if (step < 4) return setStep(step + 1);
    setResult(recommendation);
  };
  const select = (key, value) => setAnswers(a => ({ ...a, [key]: value }));
  const reset = () => { setStep(1); setResult(null); setAnswers({ situation:"", besoin:"", urgence:"", budget:"" }); };

  return <div className="min-h-screen flex flex-col" style={{ background:"var(--zayado-cream)" }}>
    <Helmet>
      <title>Services Pro pour indépendants et petites structures | ZAYADO</title>
      <meta name="description" content="Finance, pilotage, gestion, développement et structuration : découvrez les services professionnels ZAYADO et faites un diagnostic de votre besoin pour être orienté vers le bon accompagnement." />
      <link rel="canonical" href="https://zayado.net/nos-services" />
      <meta property="og:title" content="Services Pro ZAYADO | Un accompagnement adapté à votre besoin" />
      <meta property="og:description" content="Un diagnostic simple vous oriente vers le bon service ZAYADO : finance, gestion, développement ou structuration." />
      <meta property="og:image" content="https://zayado.net/zayado-og.jpg" />
      <script type="application/ld+json">{JSON.stringify({"@context":"https://schema.org","@type":"Service","name":"Services professionnels ZAYADO","provider":{"@type":"Organization","name":"ZAYADO","url":"https://zayado.net"},"areaServed":"FR","serviceType":["Pilotage financier","Gestion","Développement commercial","Structuration de projet"]})}</script>
    </Helmet>
    <PublicHeader />
    <main className="flex-1">
      <section className="bg-[#0c1d33] text-white">
        <div className="max-w-[1180px] mx-auto px-6 py-16 sm:py-20 grid lg:grid-cols-[1.05fr_.95fr] gap-10 items-center">
          <div><span className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[.18em] text-[#d4b982]">ZAYADO Services Pro</span><h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[.98]">Une équipe autour de votre activité, <span className="text-[#d4b982]">sans tout recruter.</span></h1><p className="mt-5 max-w-2xl text-base sm:text-lg leading-7 text-white/70">Nous commençons par comprendre votre situation. ZAYADO vous oriente ensuite vers le bon accompagnement, opéré avec ses collaborateurs ou avec des partenaires spécialisés selon la mission.</p></div>
          <div className="rounded-3xl bg-white p-6 sm:p-7 text-[#1a1815] shadow-2xl" id="diagnostic">
            <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.16em] font-bold text-[#b89855]">Diagnostic express</p><h2 className="mt-1 text-2xl font-bold text-[#1a3a6e]">Quel est votre besoin ?</h2></div><span className="text-xs text-[#6b6358]">{step}/4</span></div>
            <div className="mt-4 h-1.5 rounded-full bg-[#eee8dc]"><div className="h-full rounded-full bg-[#b89855] transition-all" style={{width:`${step*25}%`}} /></div>
            {!result ? <div className="mt-6">
              {step===1 && <Question title="Où en êtes-vous ?" options={[["projet","J'ai un projet ou je démarre"],["actif","Mon activité existe déjà"],["croissance","Je veux accélérer"]]} value={answers.situation} onChange={v=>select("situation",v)} />}
              {step===2 && <Question title="Sur quoi voulez-vous avancer ?" options={[["finance","Finance & pilotage"],["gestion","Gestion & organisation"],["developpement","Développement & acquisition"],["structuration","Création & structuration"]]} value={answers.besoin} onChange={v=>select("besoin",v)} />}
              {step===3 && <Question title="Quand souhaitez-vous avancer ?" options={[["now","Dès maintenant"],["month","Dans le mois"],["explore","Je veux d'abord comprendre"]]} value={answers.urgence} onChange={v=>select("urgence",v)} />}
              {step===4 && <Question title="Quel niveau d'accompagnement recherchez-vous ?" options={[["ponctuel","Une mission ponctuelle"],["suivi","Un suivi régulier"],["team","Une équipe autour de moi"]]} value={answers.budget} onChange={v=>select("budget",v)} />}
              <button disabled={!answers[{1:"situation",2:"besoin",3:"urgence",4:"budget"}[step]]} onClick={next} className="mt-6 w-full rounded-xl bg-[#1a3a6e] px-4 py-3 text-sm font-bold text-white disabled:opacity-35">{step===4?"Voir mon orientation":"Continuer"} <ArrowRight size={15} className="inline ml-1"/></button>
            </div> : <div className="mt-6"><div className="rounded-2xl bg-[#f6f3ee] p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#b89855]">Votre première orientation</p><h3 className="mt-2 text-xl font-bold text-[#1a3a6e]">{result.title}</h3><p className="mt-2 text-sm leading-6 text-[#6b6358]">{result.intro}</p></div><div className="mt-4 grid gap-2">{result.points.map(p=><p key={p} className="text-sm flex gap-2"><Check size={15} className="mt-0.5 text-[#b89855]"/>{p}</p>)}</div><div className="mt-5 flex gap-2"><Link to={`/contact?service=${result.id}`} className="flex-1 text-center rounded-xl bg-[#1a3a6e] px-4 py-3 text-sm font-bold text-white">Parler à ZAYADO</Link><button onClick={reset} className="rounded-xl border px-4 py-3 text-sm font-semibold">Recommencer</button></div></div>}
          </div>
        </div>
      </section>

      <section className="max-w-[1180px] mx-auto px-6 py-16" id="services">
        <div className="max-w-2xl"><p className="text-xs uppercase tracking-[.18em] font-bold text-[#b89855]">Nos expertises</p><h2 className="mt-2 text-3xl sm:text-4xl font-bold text-[#1a3a6e]">Des services conçus autour des vrais problèmes du quotidien.</h2><p className="mt-4 text-sm leading-7 text-[#6b6358]">Le service reste ZAYADO côté client. La réalisation peut être assurée par notre équipe ou par un partenaire spécialisé lorsque la compétence l'exige.</p></div>
        <div className="mt-8 grid md:grid-cols-2 gap-5">{SERVICES.map(s=>{const Icon=s.icon;return <article key={s.id} id={s.id} className="rounded-3xl border bg-white p-7" style={{borderColor:"var(--zayado-border)"}}><div className="w-11 h-11 rounded-xl grid place-items-center bg-[#f3e9d0] text-[#b89855]"><Icon size={20}/></div><h3 className="mt-5 text-xl font-bold text-[#1a3a6e]">{s.title}</h3><p className="mt-2 text-sm leading-6 text-[#6b6358]">{s.intro}</p><ul className="mt-5 grid gap-2">{s.points.map(p=><li key={p} className="text-sm flex gap-2"><Check size={15} className="mt-0.5 text-[#b89855]"/>{p}</li>)}</ul><Link to={`/services/${s.id === "finance" ? "finance-pilotage" : s.id === "gestion" ? "gestion-organisation" : s.id}`} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#1a3a6e]">Décrire mon besoin <ChevronRight size={15}/></Link></article>})}</div>
      </section>

      <section className="bg-white border-y" style={{borderColor:"var(--zayado-border)"}}><div className="max-w-[1180px] mx-auto px-6 py-14 grid md:grid-cols-3 gap-6"><Info icon={Search} title="1. Diagnostic" text="Quelques questions pour comprendre votre situation et votre priorité."/><Info icon={Sparkles} title="2. Orientation" text="Nous vous orientons vers le bon service et le bon niveau d'intervention."/><Info icon={Landmark} title="3. Mission" text="La mission est cadrée puis réalisée par ZAYADO, un collaborateur ou un partenaire adapté."/></div></section>
    </main>
    <UnifiedFooter />
  </div>;
}

function Question({title,options,value,onChange}){return <div><h3 className="text-base font-bold text-[#1a3a6e]">{title}</h3><div className="mt-3 grid gap-2">{options.map(([v,l])=><button type="button" key={v} onClick={()=>onChange(v)} className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${value===v?"border-[#b89855] bg-[#f3e9d0] font-semibold":"border-[#e2dac7] bg-white hover:bg-[#fbf8f1]"}`}>{l}</button>)}</div></div>}
function Info({icon:Icon,title,text}){return <div className="rounded-2xl bg-[#fbf8f1] p-6"><Icon size={20} className="text-[#b89855]"/><h3 className="mt-4 font-bold text-[#1a3a6e]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#6b6358]">{text}</p></div>}
