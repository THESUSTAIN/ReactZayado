import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, ChevronDown, Menu, X, ShoppingBag, Check, Sparkles, BriefcaseBusiness, WalletCards, HeartPulse, Newspaper } from "lucide-react";
import { SAAS_URL } from "../lib/api";

const SITE = "https://zayado.net";
const NAVY = "var(--zayado-navy)";
const GOLD = "var(--zayado-gold)";

export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [menu, setMenu] = React.useState(null);
  const timer = React.useRef(null);
  const open = (key) => { clearTimeout(timer.current); setMenu(key); };
  const close = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setMenu(null), 120); };
  return (
    <>
      <div className="hidden md:block bg-[#0c1d33] text-white text-[11px]">
        <div className="max-w-[1280px] mx-auto px-6 py-2 flex justify-between"><span>ZAYADO · Entreprendre avec sens, clarté et équilibre</span><span>Indépendants · micro-entrepreneurs · petites structures</span></div>
      </div>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b" style={{ borderColor: "var(--zayado-border)" }}>
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 h-[72px] flex items-center gap-4">
          <Link to="/" className="shrink-0 flex items-center gap-2" aria-label="ZAYADO accueil">
            <span className="text-4xl font-serif font-semibold leading-none" style={{ color: GOLD }}>Z</span>
            <span><span className="block text-[24px] font-bold tracking-[.08em]" style={{ color: NAVY }}>ZAYADO</span><span className="block -mt-1 text-[9px] tracking-[.18em] uppercase" style={{ color: GOLD }}>Entreprendre avec sens</span></span>
          </Link>
          <nav className="hidden lg:flex items-center gap-5 ml-6 text-sm font-medium" style={{ color: NAVY }}>
            <Link to="/boutique" className="hover:opacity-65">Boutique</Link>
            <div className="relative" onMouseEnter={() => open("services")} onMouseLeave={close}>
              <button className="inline-flex items-center gap-1 py-5">Services Pro <ChevronDown size={14} /></button>
              {menu === "services" && <MegaMenu onClose={() => setMenu(null)} columns={[
                { title: "Accompagner", items: [["Finance & pilotage", "/nos-services#finance"], ["Gestion & organisation", "/nos-services#gestion"], ["Développement commercial", "/nos-services#developpement"], ["Création & structuration", "/creation-entreprise"]] },
                { title: "Commencer", items: [["Faire mon diagnostic", "/nos-services"], ["Valider mon projet", "/valider-son-projet"], ["Tester mon projet", "/tester-son-projet"], ["Voir les tarifs", "/tarifs"]] }
              ]} />}
            </div>
            <Link to="/avantages" className="hover:opacity-65">Avantages</Link>
            <Link to="/blog" className="hover:opacity-65 inline-flex items-center gap-1"><Newspaper size={14} /> Actualités</Link>
            <Link to="/partenaires" className="hover:opacity-65">Partenaires</Link>
            <Link to="/myextension-ai" className="hover:opacity-65">MyExtension AI</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a href={`${SAAS_URL}/login`} className="hidden sm:inline-flex rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: NAVY }}>Mon espace</a>
            <Link to="/panier" aria-label="Panier" className="p-2 rounded-full hover:bg-[#f6f3ee]"><ShoppingBag size={19} /></Link>
            <button className="lg:hidden p-2" aria-label="Ouvrir le menu" onClick={() => setMobileOpen(v => !v)}>{mobileOpen ? <X size={21}/> : <Menu size={21}/>}</button>
          </div>
        </div>
        {mobileOpen && <div className="lg:hidden border-t bg-white max-h-[78vh] overflow-y-auto">
          <nav className="px-5 py-4 grid gap-1 text-sm font-medium" style={{ color: NAVY }}>
            <Link onClick={() => setMobileOpen(false)} className="py-2" to="/boutique">Boutique</Link>
            <Link onClick={() => setMobileOpen(false)} className="py-2" to="/nos-services">Services Pro</Link>
            <Link onClick={() => setMobileOpen(false)} className="py-2" to="/avantages">Avantages</Link>
            <Link onClick={() => setMobileOpen(false)} className="py-2" to="/blog">Actualités</Link>
            <Link onClick={() => setMobileOpen(false)} className="py-2" to="/partenaires">Partenaires</Link>
            <Link onClick={() => setMobileOpen(false)} className="py-2" to="/myextension-ai">MyExtension AI</Link>
            <Link onClick={() => setMobileOpen(false)} className="py-2" to="/tarifs">Tarifs</Link>
            <a className="mt-2 rounded-full py-2.5 text-center text-white" style={{ background: NAVY }} href={`${SAAS_URL}/login`}>Se connecter</a>
          </nav>
        </div>}
      </header>
    </>
  );
}

function MegaMenu({ columns }) {
  return <div className="absolute left-1/2 top-full -translate-x-1/2 w-[650px] rounded-2xl border bg-white shadow-2xl p-6 z-50" style={{ borderColor: "var(--zayado-border)" }}>
    <div className="grid grid-cols-2 gap-8">{columns.map(c => <div key={c.title}><p className="text-[11px] font-bold uppercase tracking-[.16em] mb-3" style={{ color: GOLD }}>{c.title}</p><div className="grid gap-2">{c.items.map(([label,to]) => <Link key={to} to={to} className="rounded-xl px-3 py-2 hover:bg-[#f6f3ee]"><span className="block font-semibold">{label}</span><span className="text-xs opacity-55">Découvrir l'accompagnement →</span></Link>)}</div></div>)}</div>
  </div>;
}

export function UnifiedFooter() {
  return <footer className="border-t bg-white" style={{ borderColor: "var(--zayado-border)" }}>
    <div className="max-w-[1280px] mx-auto px-6 py-12 grid gap-10 md:grid-cols-4">
      <div><div className="text-2xl font-bold tracking-[.08em]" style={{ color: NAVY }}>ZAYADO</div><p className="mt-3 text-sm leading-6 opacity-65">Marketplace et services pour les indépendants et petites structures. Entreprendre avec sens, clarté et équilibre.</p></div>
      <div><h2 className="text-sm font-bold">Explorer</h2><div className="mt-4 grid gap-2 text-sm opacity-70"><Link to="/boutique">Boutique</Link><Link to="/nos-services">Services Pro</Link><Link to="/blog">Actualités</Link><Link to="/partenaires">Partenaires</Link></div></div>
      <div><h2 className="text-sm font-bold">Outils</h2><div className="mt-4 grid gap-2 text-sm opacity-70"><Link to="/myextension-ai">MyExtension AI</Link><Link to="/vision-board">Vision Board</Link><Link to="/simulateurs">Simulateurs</Link><Link to="/tarifs">Tarifs</Link></div></div>
      <div><h2 className="text-sm font-bold">Recevoir les nouveautés</h2><p className="mt-3 text-sm opacity-65">Conseils, nouvelles offres et ouverture des services Zayado.</p><form className="mt-4 flex"><input type="email" required placeholder="Votre e-mail" aria-label="Votre e-mail" className="min-w-0 flex-1 rounded-l-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--zayado-border)" }}/><button className="rounded-r-xl px-4 text-white" style={{ background: GOLD }}>OK</button></form></div>
    </div>
    <div className="border-t" style={{ borderColor: "var(--zayado-border)" }}><div className="max-w-[1280px] mx-auto px-6 py-4 flex flex-wrap gap-4 justify-between text-[11px] opacity-55"><span>© {new Date().getFullYear()} ZAYADO</span><span>Mentions légales · CGV · Confidentialité · Cookies</span></div></div>
  </footer>;
}

export default function Landing() {
  const jsonLd = { "@context":"https://schema.org", "@graph":[
    {"@type":"Organization","name":"ZAYADO","url":SITE,"description":"Marketplace et services pour indépendants et petites structures."},
    {"@type":"WebSite","name":"ZAYADO","url":SITE},
    {"@type":"WebPage","name":"ZAYADO — Marketplace pour indépendants et petites structures","url":SITE}
  ]};
  return <div className="public-page min-h-screen" style={{ background: "var(--zayado-cream)" }}>
    <Helmet>
      <title>ZAYADO | Marketplace et services pour indépendants et petites structures</title>
      <meta name="description" content="ZAYADO réunit une boutique sélectionnée, des avantages négociés, des services professionnels et MyExtension AI pour aider les indépendants et petites structures à entreprendre avec sens, clarté et équilibre." />
      <link rel="canonical" href={SITE + "/"} />
      <meta name="robots" content="index,follow,max-image-preview:large" />
      <meta property="og:type" content="website" /><meta property="og:title" content="ZAYADO | Entreprendre avec sens, clarté et équilibre" /><meta property="og:description" content="Une marketplace et des services pensés pour les indépendants et petites structures." /><meta property="og:image" content={SITE + "/zayado-og.jpg"} /><meta property="og:url" content={SITE + "/"}/>
      <meta name="twitter:card" content="summary_large_image" /><meta name="twitter:image" content={SITE + "/zayado-og.jpg"}/>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
    <PublicHeader />
    <main>
      <section className="relative overflow-hidden bg-[#0c1d33] text-white">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-[.9fr_1.1fr] min-h-[560px]">
          <div className="relative z-10 px-6 sm:px-10 lg:px-14 py-16 lg:py-24 flex flex-col justify-center">
            <span className="inline-flex w-fit rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[.18em] text-[#d4b982]">La marketplace ZAYADO</span>
            <h1 className="mt-6 max-w-xl text-4xl sm:text-5xl lg:text-[60px] leading-[.98] font-bold tracking-[-.04em]">Entreprendre avec <span className="text-[#d4b982]">sens</span>, clarté et équilibre.</h1>
            <p className="mt-6 max-w-xl text-base sm:text-lg leading-7 text-white/72">Une même place pour trouver des outils utiles, profiter d'avantages négociés, accéder à des services professionnels et piloter votre activité avec MyExtension AI.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link to="/boutique" className="inline-flex items-center gap-2 rounded-xl bg-[#d4b982] px-5 py-3 text-sm font-bold text-[#0c1d33]">Découvrir ZAYADO <ArrowRight size={16}/></Link><Link to="/nos-services" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold">Parler de mon besoin <ArrowRight size={16}/></Link></div>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg text-[11px] text-white/60"><span><Check className="inline text-[#d4b982]" size={14}/> Sélection vérifiée</span><span><Check className="inline text-[#d4b982]" size={14}/> Offre claire</span><span><Check className="inline text-[#d4b982]" size={14}/> Parcours humain</span></div>
          </div>
          <div className="min-h-[360px] lg:min-h-full bg-cover bg-center" style={{ backgroundImage: "url('/zayado-hero.jpg')" }} aria-label="Espace de travail élégant et professionnel" role="img" />
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-6 py-14">
        <div className="flex items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.18em] font-bold" style={{color:GOLD}}>Un seul écosystème</p><h2 className="mt-2 text-3xl sm:text-4xl font-bold" style={{color:NAVY}}>Ce que vous pouvez faire avec ZAYADO</h2></div><Link to="/boutique" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold" style={{color:NAVY}}>Tout explorer <ArrowRight size={15}/></Link></div>
        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[{icon:WalletCards,t:"Piloter",d:"Finance, gestion et décisions plus lisibles.",to:"/nos-services"},{icon:BriefcaseBusiness,t:"Développer",d:"Des services et ressources pour avancer concrètement.",to:"/nos-services#developpement"},{icon:Sparkles,t:"S'équiper",d:"Une boutique sélectionnée pour le travail quotidien.",to:"/boutique"},{icon:HeartPulse,t:"Préserver",d:"Des solutions pensées pour l'énergie et l'équilibre.",to:"/boutique"}].map(({icon:Icon,t,d,to})=><Link key={t} to={to} className="group rounded-2xl border bg-white p-6 hover:-translate-y-0.5 transition" style={{borderColor:"var(--zayado-border)"}}><span className="grid place-items-center w-11 h-11 rounded-xl" style={{background:"#f3e9d0",color:GOLD}}><Icon size={20}/></span><h3 className="mt-5 text-lg font-bold" style={{color:NAVY}}>{t}</h3><p className="mt-2 text-sm leading-6 opacity-65">{d}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold" style={{color:GOLD}}>Découvrir <ArrowRight size={14}/></span></Link>)}
        </div>
      </section>

      <section className="bg-white border-y" style={{borderColor:"var(--zayado-border)"}}><div className="max-w-[1200px] mx-auto px-6 py-14"><div className="grid lg:grid-cols-[.8fr_1.2fr] gap-10 items-start"><div><p className="text-xs uppercase tracking-[.18em] font-bold" style={{color:GOLD}}>Services Pro</p><h2 className="mt-2 text-3xl sm:text-4xl font-bold" style={{color:NAVY}}>Pas besoin de tout faire seul.</h2><p className="mt-4 text-sm leading-7 opacity-65">ZAYADO structure ses services autour de vos besoins réels. Un premier diagnostic vous oriente vers le bon accompagnement, puis la mission est prise en charge par ZAYADO et ses collaborateurs ou partenaires selon le besoin.</p><Link to="/nos-services" className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white" style={{background:NAVY}}>Faire mon diagnostic <ArrowRight size={16}/></Link></div><div className="grid sm:grid-cols-2 gap-4">{[["Finance & pilotage","Trésorerie, reporting, analyse et décisions."],["Gestion & organisation","Structurer l'administratif et le quotidien."],["Développement","Acquisition, marketing et croissance."],["Création & structuration","Clarifier le projet avant de passer à l'action."]].map(([t,d])=><div key={t} className="rounded-2xl border p-5" style={{borderColor:"var(--zayado-border)",background:"#fbf8f1"}}><h3 className="font-bold" style={{color:NAVY}}>{t}</h3><p className="mt-2 text-sm leading-6 opacity-65">{d}</p></div>)}</div></div></div></section>

      <section className="max-w-[1200px] mx-auto px-6 py-14"><div className="rounded-3xl bg-[#0c1d33] text-white p-8 sm:p-12 grid lg:grid-cols-[1fr_auto] gap-8 items-center"><div><p className="text-xs uppercase tracking-[.18em] text-[#d4b982] font-bold">MyExtension AI</p><h2 className="mt-2 text-3xl sm:text-4xl font-bold">L'outil qui relie votre activité.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">Vision, CRM, pilotage financier, croissance, espace de travail et énergie : MyExtension AI transforme les informations de votre activité en un cockpit utilisable au quotidien.</p></div><a href={SAAS_URL} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d4b982] px-6 py-3 text-sm font-bold text-[#0c1d33]">Découvrir MyExtension AI <ArrowRight size={16}/></a></div></section>

      <section className="bg-[#f3e9d0]"><div className="max-w-[1200px] mx-auto px-6 py-12 grid md:grid-cols-3 gap-6"><div><p className="font-bold" style={{color:NAVY}}>Avantages ZAYADO</p><p className="mt-2 text-sm leading-6 opacity-65">Des conditions négociées et des offres ponctuelles utiles aux indépendants.</p></div><div><p className="font-bold" style={{color:NAVY}}>Business Travel</p><p className="mt-2 text-sm leading-6 opacity-65">Coworking, hôtels, salles de réunion et expériences professionnelles selon les villes et les partenaires.</p></div><div><p className="font-bold" style={{color:NAVY}}>Actualités</p><p className="mt-2 text-sm leading-6 opacity-65">Des contenus utiles sur la finance, la croissance, l'organisation et le bien-être entrepreneurial.</p></div></div></section>
    </main>
    <UnifiedFooter />
  </div>;
}
