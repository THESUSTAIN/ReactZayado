import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, Sparkles, Menu, X, ShieldCheck, ChevronDown, Server, Lock, RefreshCw, Compass, Radar, Heart, ArrowRight, Check,
  Bot, ListChecks, Lightbulb, Users, Plug, TrendingUp,
} from "lucide-react";
import GrilleTarifs from "@/components/pricing/GrilleTarifs";
import Economies from "@/components/pricing/Economies";
import { useSeo } from "@/lib/useSeo";

// Page d'accueil publique (modèle validé : barre de saisie en verre, grand
// titre serif, bouton beige, visuel de l'appli, lignes dépliables en verre
// blanc). Palette Zayado : navy + beige #DEC2A3 / #F1E2CC.
// Aucun avis ni note inventés : la ligne de confiance ne cite que des faits.

const START = "/login?next=%2Fonboarding";

const LIGNES = [
  {
    id: "croissance", titre: "Trouver des clients", icon: Radar,
    texte: "Chaque matin, le Radar te donne de vraies personnes à contacter (ou des partenaires qui peuvent te recommander), avec le message déjà rédigé. Pour les particuliers : ce qu'ils tapent sur Google près de chez toi et une pub prête à lancer. La prospection devient un rituel de 10 minutes, pas une corvée.",
  },
  {
    id: "lancer", titre: "Piloter ton chiffre d'affaires", icon: TrendingUp,
    texte: "Fixe ton objectif de CA, relie-le à tes actions et suis ton chiffre d'affaires et ta trésorerie (Qonto, Pennylane) dans le Pouls business. Tu sais chaque semaine si tu es dans les clous, sans ouvrir un tableur.",
  },
  {
    id: "gerer", titre: "Alléger ta charge mentale", icon: Heart,
    texte: "3 priorités par jour adaptées à ton énergie, un plan d'action où tout est relié, une revue de semaine en 5 minutes. Et pour le mental : une carte du jour et des parcours de 7 jours pour oser vendre, annoncer tes prix ou rebondir après un refus.",
  },
];

// Pages détaillées : elles vivent sur la boutique Shopify (référencement), l'appli reste noindex.
const SHOP = "https://zayado.net/pages";

const VEDETTES = [
  { id: "radar", nom: "Trouver des clients", Icon: Radar, image: "/screenshots/radar.webp", page: `${SHOP}/trouver-des-clients`, offre: "Dès Solo",
    titre: "De vrais clients à contacter, chaque matin",
    texte: "La prospection, c'est ce qui fait rentrer l'argent. Le Radar croise ta cible et ta zone pour te proposer de vraies personnes à contacter (ou des partenaires qui recommandent), avec le message déjà rédigé.",
    points: ["30 à 150 contacts vérifiés par mois selon l'offre", "Ce que tes clients tapent sur Google près de chez toi", "Une pub Facebook / Instagram prête à lancer"] },
  { id: "vision", nom: "Vision Board", Icon: Compass, image: "/screenshots/vision.webp", page: `${SHOP}/vision-board`, offre: "Dès Rêveur",
    titre: "Ta vision, visible chaque jour",
    texte: "Compose ton Vision Board avec tes mots, tes images IA et tes objectifs chiffrés. Il vit dans ton cockpit : chaque carte peut être reliée à tes vrais résultats.",
    points: ["Boards illimités, lien public et Vision Book PDF", "Images générées par l'IA (10 par jour)", "Objectifs à 3 ans, 90 jours et aujourd'hui"] },
  { id: "agent", nom: "Agent Business", Icon: Bot, image: "/screenshots/agent-business.webp", page: `${SHOP}/agent-business`, offre: "Dès Pro",
    titre: "Un assistant qui répond à tes clients",
    texte: "Une question sans réponse, c'est souvent une vente perdue. Ton chatbot à ta marque répond sur ton site avec tes tarifs et tes infos, qualifie les demandes et te les transmet sur WhatsApp ou Telegram.",
    points: ["À ta marque, installé sur ton site par Zayado", "Répond avec tes documents (offre Équipe)", "Alertes instantanées pour les demandes sérieuses"] },
  { id: "plan", nom: "Plan d'action", Icon: ListChecks, image: "/screenshots/actions.webp", page: `${SHOP}/plan-action`, offre: "Dès Solo",
    titre: "Des objectifs aux actions du jour",
    texte: "Ton objectif de chiffre d'affaires, découpé en actions concrètes : chaque action cochée fait avancer l'objectif auquel elle est reliée. Tu vois ce qui rapporte, et ce qui peut attendre.",
    points: ["5 objectifs actifs maximum, pour rester concentré", "Kanban des actions, reliées à tes objectifs", "Processus réutilisables qui créent tes actions"] },
  { id: "mindset", nom: "Bien-être & Mindset", Icon: Heart, image: "/screenshots/bien-etre.webp", page: `${SHOP}/bien-etre-mindset`, offre: "Dès Solo",
    titre: "Le mental d'entrepreneur, entraîné 5 minutes par jour",
    texte: "Oser annoncer ses prix et relancer, ça se travaille. Une carte du jour choisie selon ton énergie, des parcours de 7 jours pour oser vendre, parler d'argent, dire non ou rebondir, et un carnet privé.",
    points: ["4 parcours de 7 jours", "« Une pensée qui bloque ? » pour prendre du recul", "Carnet privé, visible par toi seul"] },
  { id: "idees", nom: "Idées & chat IA", Icon: Lightbulb, image: "/screenshots/idees.webp", page: `${SHOP}/decouvrir-zayado`, offre: "Dès Rêveur",
    titre: "Une IA qui connaît ton projet",
    texte: "Note une idée en vrac : l'IA la trie, la développe et la transforme en action. Le chat connaît ta vision, ta cible et tes chiffres : pas besoin de tout réexpliquer.",
    points: ["Capture rapide, tri et développement", "Envoi vers Trello, Jira, HubSpot ou Teams", "Chat IA disponible sur toutes les pages"] },
];

// Intégrations réellement branchées dans l'appli (aucun faux logo client).
const INTEGRATIONS = [
  ["Travail d'équipe", ["Microsoft Teams", "Trello", "Jira", "HubSpot"]],
  ["Chiffres & compta", ["Qonto", "Pennylane", "Odoo"]],
  ["Fichiers", ["Google Drive", "OneDrive", "SharePoint"]],
  ["Alertes", ["WhatsApp", "Telegram", "E-mail"]],
  ["Clients & ventes", ["Apollo", "Données Google (DataForSEO)", "Ventes DVF", "Shopify", "Mollie"]],
];

function Vedettes() {
  const [actif, setActif] = useState(VEDETTES[0].id);
  const v = VEDETTES.find((x) => x.id === actif);
  return (
    <section className="mx-auto mt-24 max-w-6xl px-5" data-testid="landing-vedettes">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">Fonctionnalités</p>
      <h2 className="mt-3 text-center font-display text-3xl font-bold sm:text-4xl">Tout ce qu'il faut pour avancer, au même endroit</h2>
      <div className="mt-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] sm:flex-wrap sm:justify-center">
        {VEDETTES.map((x) => (
          <button key={x.id} onClick={() => setActif(x.id)} data-testid={`vedette-${x.id}`}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-medium transition ${actif === x.id ? "bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] text-navy-900" : "border border-white/25 bg-white/[0.06] text-offwhite/80 hover:bg-white/10"}`}>
            <x.Icon size={15} /> {x.nom}
          </button>
        ))}
      </div>
      <div className="mt-6 grid items-center gap-6 rounded-[24px] border border-white/20 bg-white/[0.08] p-5 backdrop-blur-xl sm:p-7 lg:grid-cols-[1fr_1.25fr]" data-testid="vedette-panneau">
        <div>
          <p className="inline-flex rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[11px] font-semibold text-gold">{v.offre}</p>
          <h3 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{v.titre}</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-offwhite/70">{v.texte}</p>
          <ul className="mt-4 space-y-2">
            {v.points.map((p) => <li key={p} className="flex items-start gap-2 text-[14px] text-offwhite/80"><Check size={15} className="mt-0.5 shrink-0 text-gold" />{p}</li>)}
          </ul>
          <a href={v.page} className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-gold hover:underline" data-testid="vedette-lien">
            En savoir plus sur {v.nom} <ArrowRight size={15} />
          </a>
        </div>
        <div className="overflow-hidden rounded-[18px] border border-white/20 bg-[#0f1b3a]/60">
          <img key={v.image} src={v.image} alt={`Zayado — ${v.nom}`} loading="lazy" className="block aspect-[16/10] w-full object-cover object-top"
            onError={(e) => { e.currentTarget.src = "/screenshots/cockpit.webp"; }} />
        </div>
      </div>
    </section>
  );
}

// Simulation volontairement simple et prudente : ce n'est pas une promesse de résultat.
function Simulateur() {
  const [panier, setPanier] = useState(800);
  const [taux, setTaux] = useState(3);
  const calc = (contacts) => Math.round(contacts * (taux / 100) * panier);
  const champ = "w-full rounded-xl border border-white/20 bg-white/[0.08] px-3 py-2.5 text-[15px] text-offwhite outline-none focus:border-gold/60";
  return (
    <section className="mx-auto mt-24 max-w-4xl px-5" data-testid="landing-simulateur">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">Ce que ça peut rapporter</p>
      <h2 className="mt-3 text-center font-display text-3xl font-bold sm:text-4xl">La prospection, c'est ce qui fait rentrer l'argent</h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] text-offwhite/65">Indique ton panier moyen et ton taux de signature habituel : voici ce que représentent les contacts du Radar chaque mois.</p>
      <div className="mt-8 grid gap-5 rounded-[24px] border border-white/20 bg-white/[0.08] p-5 backdrop-blur-xl sm:p-7 md:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          <label className="block text-[13px] text-offwhite/70">Panier moyen d'un client (€)
            <input type="number" min="50" step="50" value={panier} onChange={(e) => setPanier(Math.max(0, Number(e.target.value) || 0))} className={`${champ} mt-1.5`} data-testid="simu-panier" />
          </label>
          <label className="block text-[13px] text-offwhite/70">Sur 100 personnes contactées, combien signent ? ({taux} %)
            <input type="range" min="1" max="10" value={taux} onChange={(e) => setTaux(Number(e.target.value))} className="mt-3 w-full accent-[#DEC2A3]" data-testid="simu-taux" />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[["Solo", 30, "24 € TTC / mois"], ["Pro", 90, "49 € TTC / mois"]].map(([nom, n, prix]) => (
            <div key={nom} className="rounded-2xl border border-white/15 bg-white/[0.06] p-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-gold">{nom} · {n} contacts / mois</p>
              <p className="mt-2 font-display text-3xl font-bold" data-testid={`simu-${nom.toLowerCase()}`}>{calc(n).toLocaleString("fr-FR")} €</p>
              <p className="text-[12.5px] text-offwhite/60">de chiffre d'affaires potentiel par mois, pour {prix} au tarif fondateur</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-[11.5px] text-offwhite/45">Simulation indicative à partir de tes propres chiffres, pas une promesse de résultat : le taux de signature dépend de ton offre, de ton message et de ton suivi.</p>
    </section>
  );
}

function Integrations() {
  return (
    <section className="mx-auto mt-24 max-w-5xl px-5" data-testid="landing-integrations">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">Intégrations</p>
      <h2 className="mt-3 text-center font-display text-3xl font-bold sm:text-4xl">Branché sur les outils que tu utilises déjà</h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] text-offwhite/65">Zayado ne remplace pas ta banque ni ton CRM : il les lit pour te donner la bonne priorité au bon moment. Et tu peux ouvrir ton cockpit directement dans Microsoft Teams.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map(([groupe, outils]) => (
          <div key={groupe} className="rounded-[20px] border border-white/20 bg-white/[0.08] p-5 backdrop-blur-xl">
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-offwhite/60"><Plug size={13} className="text-gold" /> {groupe}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {outils.map((o) => <span key={o} className="rounded-full border border-white/20 bg-white/[0.07] px-3 py-1.5 text-[13px] font-medium text-offwhite/90">{o}</span>)}
            </div>
          </div>
        ))}
        <div className="flex flex-col justify-center rounded-[20px] border border-gold/40 bg-gold/[0.08] p-5">
          <p className="flex items-center gap-2 text-[15px] font-semibold"><Users size={16} className="text-gold" /> Zayado dans Microsoft Teams</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-offwhite/70">Ajoute l'appli Zayado à Teams : ton point du jour, ton Radar et ton Plan d'action dans un onglet, à côté de tes conversations.</p>
        </div>
      </div>
      <p className="mt-4 text-center text-[11.5px] text-offwhite/45">Les noms cités sont des marques de leurs propriétaires respectifs. Zayado s'y connecte via leurs API officielles.</p>
    </section>
  );
}

function Remplace() {
  return (
    <section className="mx-auto mt-24 max-w-3xl px-5" data-testid="landing-remplace">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">Le calcul</p>
      <h2 className="mt-3 text-center font-display text-3xl font-bold sm:text-4xl">Un abonnement au lieu de quatre</h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-[15px] text-offwhite/65">Prospects, assistant IA, chatbot client, données Google : séparément, ces outils coûtent plus de 200 € par mois. Dans Zayado, ils travaillent ensemble sur <b className="text-offwhite">ton</b> projet.</p>
      <div className="mt-8"><Economies /></div>
    </section>
  );
}

const ETAPES = [
  { num: "01", titre: "Tu poses ta vision", texte: "Onboarding guidé de cinq minutes. L'IA retient ton projet pour la suite." },
  { num: "02", titre: "Chaque matin, l'essentiel", texte: "Tes priorités, ton énergie, tes chiffres et tes opportunités sur un seul écran." },
  { num: "03", titre: "Tu avances, sereinement", texte: "Tu valides, tu coches, tu respires. Zayado ajuste demain." },
];

function Ligne({ l, ouvert, onToggle }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/25 bg-white/[0.12] backdrop-blur-2xl transition hover:bg-white/[0.16]" data-testid={`landing-ligne-${l.id}`}>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-5 py-4 text-left" aria-expanded={ouvert}>
        <Sparkles size={17} className="shrink-0 text-gold" />
        <span className="flex-1 text-[15.5px] font-medium text-offwhite">{l.titre}</span>
        <ChevronDown size={17} className={`text-offwhite/60 transition ${ouvert ? "rotate-180" : ""}`} />
      </button>
      {ouvert && (
        <div className="flex gap-3 px-5 pb-5 pl-[52px] text-[14px] leading-relaxed text-offwhite/75">
          <p>{l.texte}</p>
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [idee, setIdee] = useState("");
  const [menu, setMenu] = useState(false);
  const [ouverte, setOuverte] = useState(null);
  const menuRef = useRef(null);

  useSeo({
    title: "Zayado — Plus de clients, moins de charge mentale",
    description: "Le cockpit IA des indépendants : de vrais prospects chaque matin, ton chiffre d'affaires suivi, tes priorités triées. Dès 15 €, ou Solo 1 mois pour 1 €.",
    path: "/",
  });

  useEffect(() => {
    if (!menu) return undefined;
    const fermer = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", fermer);
    return () => document.removeEventListener("mousedown", fermer);
  }, [menu]);

  const commencer = (e) => {
    e.preventDefault();
    // L'idée saisie est gardée pour préremplir l'onboarding après la connexion.
    try { if (idee.trim()) localStorage.setItem("zayado_idee_landing", idee.trim().slice(0, 300)); } catch { /* stockage indisponible */ }
    navigate(START);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden text-offwhite" data-testid="landing">
      {/* Fond transparent : c'est le fond global de l'app (AuroraBackground + --fond-zayado) qui s'affiche, identique partout. */}

      {/* Barre du haut */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2" data-testid="landing-logo">
          <img src="/logo.png" alt="Zayado" className="h-9 w-9 object-contain" />
          <span className="hidden font-display text-lg font-bold sm:inline">Zayado</span>
        </Link>
        <div className="flex items-center gap-3" ref={menuRef}>
          <Link to={START} className="inline-flex items-center gap-2 rounded-full border border-white/60 px-4 py-2 text-[14px] font-medium text-offwhite transition hover:bg-white/10" data-testid="landing-agent">
            <Sparkles size={16} /> Copilote IA
          </Link>
          <button onClick={() => setMenu((v) => !v)} aria-label="Menu" className="rounded-lg p-2 text-offwhite hover:bg-white/10" data-testid="landing-menu">
            {menu ? <X size={24} /> : <Menu size={24} />}
          </button>
          {menu && (
            <nav className="fenetre absolute right-5 top-[68px] w-60 rounded-2xl p-2 sm:right-8" data-testid="landing-menu-liste">
              {[["/pricing", "Tarifs"], [START, "Créer mon cockpit"], ["/login", "Se connecter"]].map(([to, label]) => (
                <Link key={label} to={to} onClick={() => setMenu(false)} className="block rounded-xl px-4 py-2.5 text-[14px] text-offwhite/85 hover:bg-white/10">{label}</Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="relative z-10">
        {/* Héros */}
        <section className="mx-auto max-w-3xl px-5 pt-4 text-center sm:pt-8">
          <form onSubmit={commencer} className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-white/25 bg-white/[0.10] p-1.5 pl-5 shadow-[0_10px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl" data-testid="landing-saisie">
            <Search size={20} className="shrink-0 text-offwhite/60" />
            <input value={idee} onChange={(e) => setIdee(e.target.value)} placeholder="Décris ton activité en une phrase…"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-offwhite outline-none placeholder:text-offwhite/55" data-testid="landing-saisie-input" />
            <button type="submit" className="shrink-0 rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-5 py-2.5 text-[15px] font-semibold text-navy-900 transition hover:brightness-105 sm:px-7" data-testid="landing-saisie-btn">
              Commencer
            </button>
          </form>
          <p className="mt-3 text-[13px] text-offwhite/80">
            Solo <b className="font-semibold text-offwhite">1 mois pour 1 €</b> · Rêveur dès 15 € · sans engagement · <Link to="/pricing" className="underline underline-offset-2 hover:text-gold">voir les offres</Link>
          </p>

          <h1 className="mt-14 font-display text-[40px] font-bold leading-[1.08] tracking-tight sm:mt-20 sm:text-[64px]" data-testid="landing-titre">
            Plus de clients,<br className="hidden sm:block" /> moins de charge mentale
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-offwhite/65 sm:text-[18px]">
            Le cockpit IA des indépendants : de vrais prospects chaque matin, ton chiffre d'affaires suivi, tes priorités triées. Tu vends plus, tu t'épuises moins.
          </p>
          <Link to={START} className="mt-8 inline-flex items-center rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-8 py-3.5 text-[16px] font-semibold text-navy-900 shadow-[0_10px_30px_rgba(222,194,163,0.25)] transition hover:brightness-105" data-testid="landing-cta">
            Je me lance
          </Link>
          <p className="mt-5 flex items-center justify-center gap-2 text-[13.5px] text-offwhite/80">
            <ShieldCheck size={16} className="text-offwhite/80" /> Sans engagement, résiliable en 1 clic
          </p>
        </section>

        {/* Visuel de l'appli */}
        <section className="mx-auto mt-12 max-w-3xl px-5">
          <div className="rounded-[22px] border-2 border-[#DEC2A3]/80 bg-[#16275a]/70 p-1.5 shadow-[0_30px_80px_rgba(4,10,28,0.45),0_0_0_6px_rgba(255,255,255,0.05)] backdrop-blur-xl">
            <img src="/screenshots/cockpit-accueil.webp" alt="Le cockpit Zayado : énergie, équilibre, objectif et point du jour"
              className="block w-full rounded-[16px]" loading="eager" data-testid="landing-visuel"
              onError={(e) => { e.currentTarget.src = "/screenshots/cockpit.webp"; }} />
          </div>
        </section>

        {/* Lignes dépliables */}
        <section className="mx-auto mt-6 max-w-3xl space-y-2.5 px-5" data-testid="landing-lignes">
          {LIGNES.map((l) => (
            <Ligne key={l.id} l={l} ouvert={ouverte === l.id} onToggle={() => setOuverte((o) => (o === l.id ? null : l.id))} />
          ))}
        </section>

        {/* Confiance (faits vérifiables uniquement) */}
        <section className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 text-[13px] text-offwhite/75" data-testid="landing-confiance">
          {[[Server, "Hébergé en Europe · RGPD"], [Lock, "Paiement sécurisé Mollie"], [RefreshCw, "Mises à jour incluses"]].map(([Icon, t]) => (
            <span key={t} className="inline-flex items-center gap-1.5"><Icon size={15} className="text-gold" />{t}</span>
          ))}
        </section>

        {/* 3 étapes */}
        <section className="mx-auto mt-24 max-w-5xl px-5">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">Comment ça marche</p>
          <h2 className="mt-3 text-center font-display text-3xl font-bold sm:text-4xl">Trois étapes, zéro prise de tête</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {ETAPES.map((e) => (
              <div key={e.num} className="rounded-[20px] border border-white/20 bg-white/[0.10] p-6 backdrop-blur-xl">
                <p className="font-display text-3xl font-bold text-gold">{e.num}</p>
                <p className="mt-3 text-[16px] font-semibold">{e.titre}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-offwhite/65">{e.texte}</p>
              </div>
            ))}
          </div>
        </section>

        <Vedettes />
        <Simulateur />
        <Remplace />
        <Integrations />

        {/* Offres */}
        <section className="mx-auto mt-24 max-w-5xl px-5">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">Offres</p>
          <h2 className="mt-3 text-center font-display text-3xl font-bold sm:text-4xl">Dès 15 €, ou Solo 1 mois pour 1 €</h2>
          {/* Même grille que la page Tarifs (tarif fondateur compris) : plus de prix différents d'une page à l'autre. */}
          <div className="mt-8"><GrilleTarifs /></div>
          <div className="mt-8 text-center">
            <Link to="/pricing" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-[14px] font-medium hover:bg-white/10" data-testid="landing-tarifs">
              Comparer les offres <ArrowRight size={15} />
            </Link>
          </div>
        </section>

        {/* Dernier appel */}
        <section className="mx-auto mt-24 max-w-3xl px-5 pb-20 text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Prêt à piloter autrement ?</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-offwhite/65">Cinq minutes pour poser ta vision. Ton premier point du jour arrive demain matin.</p>
          <Link to={START} className="mt-7 inline-flex items-center rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-8 py-3.5 text-[16px] font-semibold text-navy-900 transition hover:brightness-105">
            Je me lance
          </Link>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-5 py-8 text-center text-[12.5px] text-offwhite/45">
        <div className="mb-3 flex flex-wrap justify-center gap-5">
          <Link to="/pricing" className="hover:text-gold">Tarifs</Link>
          <a href={`${SHOP}/decouvrir-zayado`} className="hover:text-gold">Découvrir Zayado</a>
          <a href="https://zayado.net/policies/terms-of-service" className="hover:text-gold">CGV</a>
          <a href="https://zayado.net/policies/privacy-policy" className="hover:text-gold">Confidentialité</a>
          <Link to="/login" className="hover:text-gold">Se connecter</Link>
          <a href="mailto:contact@zayado.net" className="hover:text-gold">Contact</a>
        </div>
        © {new Date().getFullYear()} Zayado — SAS TheSustain
      </footer>
    </div>
  );
}
