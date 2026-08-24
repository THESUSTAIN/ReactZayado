import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, Menu, X, Search, ShoppingBag, Sparkles, BriefcaseBusiness, ShieldCheck, MapPin, HeartHandshake } from "lucide-react";

const SITE_URL = "https://zayado.net";
const NAVY = "#102945";
const GOLD = "#C8A45D";
const CREAM = "#F6F3EE";
const RED = "#A01722";

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState(false);
  const serviceItems = [
    ["Finance & pilotage", "/services/finance-pilotage", "Suivi financier et décisions"],
    ["Gestion & délégation", "/services/gestion-administrative", "Vous libérer de l'opérationnel"],
    ["Création & structuration", "/services/creation-structuration", "Poser des bases solides"],
    ["Cession / reprise", "/services/cession-reprise", "Préparer ou sécuriser une opération"],
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-[#e5dece] bg-white/95 backdrop-blur" data-testid="public-header">
      <div className="bg-[#102945] text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-2 flex items-center justify-between gap-4">
          <span>Entreprendre avec sens, clarté et équilibre.</span>
          <div className="hidden sm:flex gap-4 opacity-90"><Link to="/faq">Aide</Link><Link to="/contact">Contact</Link></div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-[76px] flex items-center gap-5">
        <button className="lg:hidden p-2" aria-label="Ouvrir le menu" onClick={() => setOpen(true)}><Menu size={22}/></button>
        <Link to="/" className="shrink-0 flex items-center gap-2" aria-label="Zayado accueil">
          <span className="text-3xl font-serif font-bold tracking-tight" style={{color:NAVY}}>Z</span>
          <span className="hidden sm:block">
            <span className="block text-[23px] font-semibold tracking-[0.08em]" style={{color:NAVY}}>ZAYADO</span>
            <span className="block text-[10px] tracking-[0.15em] uppercase" style={{color:GOLD}}>Entreprendre avec sens</span>
          </span>
        </Link>
        <div className="hidden md:flex flex-1 max-w-xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b8377]" size={17}/>
          <input aria-label="Recherche" className="w-full rounded-full border border-[#ded6c6] bg-[#fbfaf7] pl-11 pr-4 py-3 text-sm outline-none focus:border-[#b89855]" placeholder="Rechercher un produit, un service ou une offre…" />
        </div>
        <div className="ml-auto hidden md:flex items-center gap-4 text-sm" style={{color:NAVY}}>
          <Link to="/myextension-ai" className="hover:opacity-70">MyExtension AI</Link>
          <Link to="/boutique" className="hover:opacity-70 inline-flex items-center gap-1"><ShoppingBag size={16}/> Boutique</Link>
          <Link to="/panier" className="hover:opacity-70">Panier</Link>
        </div>
      </div>
      <nav className="border-t border-[#eee8dc] bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-12 flex items-center justify-between">
          <div className="hidden lg:flex items-center gap-7 text-sm font-medium" style={{color:NAVY}}>
            <Link to="/" className="hover:text-[#b89855]">Accueil</Link>
            <Link to="/boutique" className="hover:text-[#b89855]">Boutique</Link>
            <div className="relative" onMouseEnter={() => setServices(true)} onMouseLeave={() => setServices(false)}>
              <button className="inline-flex items-center gap-1 hover:text-[#b89855] py-3">Services <ChevronDown size={14}/></button>
              {services && (
                <div className="absolute top-full left-0 w-[720px] rounded-b-2xl border border-[#e6dfd2] bg-white p-6 shadow-2xl grid grid-cols-2 gap-6">
                  <div><div className="text-[11px] uppercase tracking-widest text-[#9d8351] mb-4">Services Zayado</div>
                    {serviceItems.map(([label,href,sub])=><Link key={href} to={href} className="block rounded-xl p-3 hover:bg-[#f7f2e8]"><div className="font-semibold" style={{color:NAVY}}>{label}</div><div className="text-xs text-[#786f63] mt-1">{sub}</div></Link>)}
                  </div>
                  <div className="rounded-2xl p-5" style={{background:`linear-gradient(135deg, ${NAVY}, #284779)`}}>
                    <div className="text-white/70 text-xs uppercase tracking-widest mb-2">Diagnostic</div>
                    <div className="text-white text-xl font-semibold">Votre besoin → le bon parcours.</div>
                    <p className="text-white/75 text-sm mt-2">4 questions pour être orienté vers le bon service, sans formulaire générique.</p>
                    <Link to="/nos-services" className="inline-flex mt-5 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold" style={{color:NAVY}}>Commencer <ArrowRight size={15}/></Link>
                  </div>
                </div>
              )}
            </div>
            <Link to="/avantages" className="hover:text-[#b89855]">Avantages</Link>
            <Link to="/myextension-ai" className="hover:text-[#b89855]">MyExtension AI</Link>
            <Link to="/blog" className="hover:text-[#b89855]">Le journal</Link>
          </div>
          <div className="hidden lg:flex items-center gap-4 text-sm"><Link to="/a-propos" style={{color:NAVY}}>À propos</Link><Link to="/contact" style={{color:NAVY}}>Contact</Link><Link to="/myextension-ai" className="rounded-full px-4 py-2 font-semibold text-white" style={{background:RED}}>Découvrir MyExtension AI</Link></div>
          <div className="lg:hidden w-full flex justify-between text-sm"><Link to="/boutique">Boutique</Link><Link to="/nos-services">Services</Link><Link to="/avantages">Avantages</Link><Link to="/myextension-ai">MyExtension AI</Link></div>
        </div>
      </nav>
      {open && <div className="fixed inset-0 z-[100] bg-black/40 lg:hidden" onClick={()=>setOpen(false)}>
        <aside className="absolute left-0 top-0 h-full w-[88%] max-w-sm bg-white p-5 overflow-y-auto" onClick={e=>e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6"><Link to="/" onClick={()=>setOpen(false)} className="text-xl font-semibold" style={{color:NAVY}}>ZAYADO</Link><button onClick={()=>setOpen(false)} aria-label="Fermer"><X/></button></div>
          <div className="space-y-2 text-sm">
            <Link onClick={()=>setOpen(false)} className="block rounded-xl p-3 hover:bg-[#f7f2e8]" to="/">Accueil</Link>
            <Link onClick={()=>setOpen(false)} className="block rounded-xl p-3 hover:bg-[#f7f2e8]" to="/boutique">Boutique</Link>
            {serviceItems.map(([label,href,sub])=><Link onClick={()=>setOpen(false)} key={href} to={href} className="block rounded-xl p-3 hover:bg-[#f7f2e8]"><div className="font-semibold" style={{color:NAVY}}>{label}</div><div className="text-xs text-[#786f63] mt-1">{sub}</div></Link>)}
            <Link onClick={()=>setOpen(false)} className="block rounded-xl p-3 hover:bg-[#f7f2e8]" to="/avantages">Avantages Zayado</Link>
            <Link onClick={()=>setOpen(false)} className="block rounded-xl p-3 hover:bg-[#f7f2e8]" to="/myextension-ai">MyExtension AI</Link>
          </div>
        </aside>
      </div>}
    </header>
  );
}

export function UnifiedFooter() {
  return <footer className="border-t border-[#e5dece] bg-white mt-16" style={{color:NAVY}}>
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 grid md:grid-cols-4 gap-8">
      <div><div className="text-2xl font-semibold tracking-[0.08em]">ZAYADO</div><p className="text-sm text-[#756d62] mt-3 max-w-xs">Une marketplace pensée pour les indépendants et petites structures : produits, avantages, services et un cockpit logiciel.</p></div>
      <div><div className="font-semibold mb-3">Zayado</div><div className="space-y-2 text-sm text-[#756d62]"><Link className="block" to="/boutique">Boutique</Link><Link className="block" to="/avantages">Avantages</Link><Link className="block" to="/nos-services">Services</Link><Link className="block" to="/myextension-ai">MyExtension AI</Link></div></div>
      <div><div className="font-semibold mb-3">Explorer</div><div className="space-y-2 text-sm text-[#756d62]"><Link className="block" to="/blog">Le journal</Link><Link className="block" to="/a-propos">À propos</Link><Link className="block" to="/faq">FAQ</Link><Link className="block" to="/contact">Contact</Link></div></div>
      <div><div className="font-semibold mb-3">Recevoir les nouveautés</div><p className="text-sm text-[#756d62] mb-3">Offres, nouveaux services et sélections Zayado.</p><form className="flex"><input className="flex-1 min-w-0 rounded-l-xl border border-[#ded6c6] px-3 py-2 text-sm" placeholder="Votre e-mail" type="email"/><button className="rounded-r-xl px-4 text-white" style={{background:RED}}>OK</button></form></div>
    </div>
    <div className="border-t border-[#eee8dc] py-4 text-xs text-[#8b8377] max-w-7xl mx-auto px-4 md:px-6 flex flex-wrap gap-4 justify-between"><span>© {new Date().getFullYear()} Zayado. Tous droits réservés.</span><span><Link to="/legal/mentions-legales" className="mr-4">Mentions légales</Link><Link to="/legal/confidentialite" className="mr-4">Confidentialité</Link><Link to="/legal/cgv">CGV</Link></span></div>
  </footer>
}

function Trust(){const items=[
  [ShieldCheck,"Sélection vérifiée","Nous expliquons ce qui a été vérifié"],
  [BriefcaseBusiness,"Services utiles","Une équipe et des partenaires spécialisés"],
  [MapPin,"Avantages nomades","Offres pro et Business Travel"],
  [HeartHandshake,"Accompagnement humain","Quand l'outil ne suffit plus"],
];return <section className="border-y border-[#e9e2d6] bg-[#fbfaf7]"><div className="max-w-7xl mx-auto px-4 md:px-6 py-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{items.map(([I,t,s])=><div key={t} className="flex gap-3 items-start"><I size={22} style={{color:GOLD}}/><div><div className="font-semibold text-sm" style={{color:NAVY}}>{t}</div><div className="text-xs text-[#7b7368] mt-1">{s}</div></div></div>)}</div></section>}

export default function Landing(){
  const categories=[
    {title:"Boutique",desc:"Des outils qui prolongent votre performance au quotidien.",href:"/boutique",tone:"navy",items:["Corps","Âme","Rituel"]},
    {title:"Avantages",desc:"Des tarifs négociés et des offres ponctuelles pour entreprendre mieux.",href:"/avantages",tone:"cream",items:["Tarifs négociés","Business Travel","Offres du moment"]},
    {title:"Services",desc:"Finance, gestion, création et opérations accompagnées par Zayado.",href:"/nos-services",tone:"terra",items:["Finance & pilotage","Gestion","Création","Cession / reprise"]},
  ];
  const products=[
    ["Lunettes anti-lumière bleue Z-Focus","39,90 €"],["Support ordinateur réglable","49,90 €"],["Lampe luminothérapie 10 000 lux","79,90 €"],["Coussin lombaire ergonomique","34,90 €"],["Journal d'introspection Zayado","24,90 €"],
  ];
  return <div className="min-h-screen" style={{background:CREAM,color:NAVY}}>
    <Helmet><title>ZAYADO | Marketplace pour indépendants et petites structures</title><meta name="description" content="ZAYADO réunit une boutique sélectionnée, des avantages négociés et des services professionnels pour aider les indépendants et petites structures à entreprendre avec sens, clarté et équilibre."/><link rel="canonical" href={SITE_URL+"/"}/><meta property="og:title" content="ZAYADO | Marketplace pour indépendants et petites structures"/><meta property="og:description" content="Produits, avantages, services et MyExtension AI dans un même écosystème."/><meta property="og:url" content={SITE_URL+"/"}/><meta property="og:type" content="website"/><meta name="robots" content="index,follow,max-image-preview:large"/><script type="application/ld+json">{JSON.stringify({"@context":"https://schema.org","@type":"WebSite","name":"Zayado","url":SITE_URL,"description":"Marketplace pour indépendants et petites structures"})}</script></Helmet>
    <PublicHeader/>
    <main>
      <section className="relative overflow-hidden" style={{background:"linear-gradient(115deg,#0c1d33 0%,#1a3a6e 55%,#102945 100%)",color:"white"}}>
        <div className="absolute inset-y-0 right-0 w-[48%] bg-[url('https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85')] bg-cover bg-center opacity-55"/>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c1d33] via-[#0c1d33]/85 to-transparent"/>
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-20 lg:py-28 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.16em]">La marketplace Zayado</div>
            <h1 className="mt-6 text-5xl md:text-6xl lg:text-7xl font-serif font-semibold leading-[0.98]">Entreprendre avec <span style={{color:GOLD}}>sens</span>, clarté et équilibre.</h1>
            <p className="mt-6 max-w-2xl text-lg md:text-xl text-white/78">Les bons produits, les bons avantages et les bons services réunis au même endroit — pour les indépendants et les petites structures qui veulent avancer sans s'éparpiller.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link to="/boutique" className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-sm" style={{background:GOLD,color:NAVY}}>Découvrir la boutique <ArrowRight size={16}/></Link><Link to="/nos-services" className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-sm border border-white/25 bg-white/5">Trouver mon service <ArrowRight size={16}/></Link></div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70"><span>✓ Sélection éditorialisée</span><span>✓ Partenaires vérifiés</span><span>✓ MyExtension AI connecté</span></div>
          </div>
          <div className="lg:col-span-5 hidden lg:block"><div className="rounded-[28px] bg-white/10 border border-white/15 backdrop-blur p-5 shadow-2xl"><div className="text-xs uppercase tracking-[0.18em] text-white/60">Votre écosystème</div><div className="mt-5 grid grid-cols-2 gap-3">{[["Boutique","Produits sélectionnés"],["Avantages","Tarifs négociés"],["Services","Équipe & partenaires"],["MyExtension AI","Cockpit business"]].map(([a,b])=><div key={a} className="rounded-2xl bg-white/8 border border-white/10 p-4"><div className="font-semibold">{a}</div><div className="text-xs text-white/60 mt-1">{b}</div></div>)}</div></div></div>
        </div>
      </section>
      <Trust/>
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16"><div className="flex items-end justify-between gap-4 mb-8"><div><div className="text-xs uppercase tracking-widest" style={{color:GOLD}}>Un seul écosystème</div><h2 className="mt-2 text-3xl md:text-4xl font-serif">Choisissez votre point d'entrée.</h2></div><Link className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold" to="/a-propos">Pourquoi Zayado <ArrowRight size={15}/></Link></div><div className="grid md:grid-cols-3 gap-5">{categories.map(c=><Link key={c.title} to={c.href} className={`rounded-[28px] p-7 border transition hover:-translate-y-1 ${c.tone==='navy'?'text-white border-[#24456f] bg-gradient-to-br from-[#102945] to-[#284779]':'border-[#e4dccd] bg-white'}`}><div className="flex justify-between items-start"><span className="text-2xl font-serif">{c.title}</span><ArrowRight size={19}/></div><p className={`${c.tone==='navy'?'text-white/70':'text-[#71695e]'} mt-4 text-sm leading-relaxed`}>{c.desc}</p><div className="mt-6 space-y-2 text-sm">{c.items.map(i=><div key={i} className="flex items-center gap-2"><Check size={15} style={{color:c.tone==='navy'?GOLD:'#b89855'}}/>{i}</div>)}</div></Link>)}</div></section>
      <section className="py-16" style={{background:"linear-gradient(135deg,#f6efe2 0%,#efe8d9 100%)"}}><div className="max-w-7xl mx-auto px-4 md:px-6 grid lg:grid-cols-12 gap-8 items-center"><div className="lg:col-span-4"><div className="text-xs uppercase tracking-widest" style={{color:GOLD}}>Offres du moment</div><h2 className="mt-2 text-3xl md:text-4xl font-serif">Le bon avantage, au bon moment.</h2><p className="mt-4 text-sm leading-relaxed text-[#70675c]">Tarifs négociés toute l'année, ou offres limitées pour les entrepreneurs en mouvement : coworking, business travel, outils et expériences.</p><Link to="/avantages" className="inline-flex mt-6 items-center gap-2 rounded-full px-5 py-3 bg-[#102945] text-white text-sm font-semibold">Voir les avantages <ArrowRight size={16}/></Link></div><div className="lg:col-span-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[["Coworking · Paris","-20%","À partir de 29 €"],["Hôtel Business · Lyon","-15%","À partir de 79 €"],["Salle de réunion · Bordeaux","-25%","À partir de 49 €"],["Airport Lounge · CDG","-15%","À partir de 34 €"]].map(([t,b,p])=><div key={t} className="rounded-2xl bg-white overflow-hidden border border-[#e1d8c8]"><div className="h-28 bg-cover bg-center" style={{backgroundImage:"url(https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=700&q=80)"}}/><div className="p-4"><div className="font-semibold text-sm">{t}</div><div className="text-xs mt-1" style={{color:RED}}>{b}</div><div className="text-xs text-[#746b60] mt-2">{p}</div></div></div>)}</div></div></section>
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16"><div className="flex items-end justify-between mb-7"><div><div className="text-xs uppercase tracking-widest" style={{color:GOLD}}>Sélection boutique</div><h2 className="mt-2 text-3xl md:text-4xl font-serif">Les outils qui prolongent votre performance.</h2></div><Link to="/boutique" className="text-sm font-semibold inline-flex items-center gap-1">Tout voir <ArrowRight size={15}/></Link></div><div className="grid grid-cols-2 md:grid-cols-5 gap-4">{products.map(([n,p],i)=><Link to="/boutique" key={n} className="rounded-2xl bg-white border border-[#e4dccd] overflow-hidden hover:-translate-y-1 transition"><div className="aspect-square bg-cover bg-center" style={{backgroundImage:`url(${["https://images.unsplash.com/photo-1511499767150-a48a237f0083","https://images.unsplash.com/photo-1516321318423-f06f85e504b3","https://images.unsplash.com/photo-1507473885765-e6ed057f782c","https://images.unsplash.com/photo-1517148815978-75f6acaaf32c","https://images.unsplash.com/photo-1517842645767-c639042777db"][i]}?auto=format&fit=crop&w=700&q=80)`}}/><div className="p-3"><div className="text-sm font-semibold leading-snug">{n}</div><div className="mt-2 font-bold text-sm" style={{color:RED}}>{p}</div></div></Link>)}</div></section>
      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-20"><div className="rounded-[30px] p-8 md:p-12 text-white grid lg:grid-cols-2 gap-8 items-center" style={{background:"linear-gradient(135deg,#102945,#1f3a5f 60%,#284779)"}}><div><div className="text-xs uppercase tracking-[0.18em] text-white/65">MyExtension AI</div><h2 className="mt-2 text-3xl md:text-4xl font-serif">Le cockpit qui relie tout.</h2><p className="mt-4 text-white/72 max-w-xl">Vos décisions, vos projets, vos tâches et vos données business réunis dans un même espace. L'IA prépare ; vous décidez.</p><Link to="/myextension-ai" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold" style={{color:NAVY}}>Découvrir MyExtension AI <ArrowRight size={16}/></Link></div><div className="grid grid-cols-2 gap-3">{[["Vision","Trajectoire claire"],["Pilotage","Finance & activité"],["Travail","Missions & documents"],["Énergie","Bien-être connecté"]].map(([a,b])=><div key={a} className="rounded-2xl border border-white/10 bg-white/8 p-4"><div className="font-semibold">{a}</div><div className="text-xs text-white/60 mt-1">{b}</div></div>)}</div></div></section>
      <section className="max-w-3xl mx-auto px-4 md:px-6 pb-20 text-center"><Sparkles className="mx-auto" size={22} style={{color:GOLD}}/><h2 className="mt-3 text-3xl font-serif">Le principe Zayado</h2><p className="mt-4 text-[#70675c] leading-relaxed">Nous sélectionnons, vérifions et organisons. Vous choisissez ce qui vous aide réellement. Quand un service est opéré par un partenaire, Zayado reste votre point d'entrée ; quand un service est opéré par Zayado, vous bénéficiez directement de notre équipe.</p></section>
    </main>
    <UnifiedFooter/>
  </div>
}
