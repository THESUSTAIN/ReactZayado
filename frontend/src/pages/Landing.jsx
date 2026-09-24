import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, Sparkles, Menu, X, ShieldCheck, ChevronDown, Server, Lock, RefreshCw, Compass, Radar, Heart, ArrowRight, Check,
} from "lucide-react";
import { PLANS, prixMois } from "@/lib/plans";
import { useSeo } from "@/lib/useSeo";

// Page d'accueil publique (modèle validé : barre de saisie en verre, grand
// titre serif, bouton beige, visuel de l'appli, lignes dépliables en verre
// blanc). Palette Zayado : navy + beige #DEC2A3 / #F1E2CC.
// Aucun avis ni note inventés : la ligne de confiance ne cite que des faits.

const START = "/login?next=%2Fonboarding";

const LIGNES = [
  {
    id: "lancer", titre: "Lancer", icon: Compass,
    texte: "Pose ta vision en cinq minutes : ton activité, ta cible, ton cap financier. Zayado compose ton Vision Board et tes objectifs à 3 ans, 90 jours et aujourd'hui.",
  },
  {
    id: "croissance", titre: "Croissance", icon: Radar,
    texte: "Chaque matin, le Radar te propose 3 opportunités reliées à ta vision, avec un message déjà rédigé. Dès l'offre Pro, ton propre chatbot répond à tes clients.",
  },
  {
    id: "gerer", titre: "Gérer", icon: Heart,
    texte: "3 priorités adaptées à ton énergie du jour, ton pouls business (CA, trésorerie) et une revue de semaine. Tu avances sans t'épuiser.",
  },
];

const ETAPES = [
  { num: "01", titre: "Tu poses ta vision", texte: "Onboarding guidé de cinq minutes. L'IA retient ton projet pour la suite." },
  { num: "02", titre: "Chaque matin, l'essentiel", texte: "Tes priorités, ton énergie, tes chiffres et tes opportunités sur un seul écran." },
  { num: "03", titre: "Tu avances, sereinement", texte: "Tu valides, tu coches, tu respires. Zayado ajuste demain." },
];

function Ligne({ l, ouvert, onToggle }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/[0.08] backdrop-blur-xl transition hover:bg-white/[0.11]" data-testid={`landing-ligne-${l.id}`}>
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
    title: "Zayado — le cockpit IA des entrepreneurs",
    description: "Ta vision, tes priorités, ton énergie et tes chiffres au même endroit, avec une IA qui connaît ton projet. Offre Découverte gratuite, sans engagement.",
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
    <div className="relative min-h-screen overflow-x-hidden text-offwhite" style={{ background: "#0b1733" }} data-testid="landing">
      {/* Halo bleu du modèle */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[1400px]"
        style={{ background: "radial-gradient(ellipse 55% 38% at 50% 58%, rgba(52,98,190,0.55), transparent 70%), radial-gradient(ellipse 80% 40% at 50% 0%, rgba(30,58,120,0.45), transparent 70%)" }} />

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
            <b className="font-semibold text-offwhite">Offre Découverte gratuite</b>, sans carte bancaire · <Link to="/pricing" className="underline underline-offset-2 hover:text-gold">voir les offres</Link>
          </p>

          <h1 className="mt-14 font-display text-[40px] font-bold leading-[1.08] tracking-tight sm:mt-20 sm:text-[64px]" data-testid="landing-titre">
            Donne un cap clair<br className="hidden sm:block" /> à ton entreprise
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-offwhite/65 sm:text-[18px]">
            Le cockpit IA des entrepreneurs : ta vision, tes priorités, ton énergie et tes chiffres au même endroit.
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
          <div className="rounded-[22px] border-2 border-[#DEC2A3]/80 bg-[#0b1733] p-1.5 shadow-[0_30px_80px_rgba(0,0,0,0.5),0_0_0_6px_rgba(255,255,255,0.04)]">
            <img src="/screenshots/cockpit-accueil.png" alt="Le cockpit Zayado : énergie, équilibre, objectif et point du jour"
              className="block w-full rounded-[16px]" loading="eager" data-testid="landing-visuel"
              onError={(e) => { e.currentTarget.src = "/screenshots/cockpit.png"; }} />
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
              <div key={e.num} className="glass rounded-[20px] p-6">
                <p className="font-display text-3xl font-bold text-gold">{e.num}</p>
                <p className="mt-3 text-[16px] font-semibold">{e.titre}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-offwhite/65">{e.texte}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Offres */}
        <section className="mx-auto mt-24 max-w-5xl px-5">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">Offres</p>
          <h2 className="mt-3 text-center font-display text-3xl font-bold sm:text-4xl">Commence gratuitement</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => (
              <div key={p.key} className={`glass flex flex-col rounded-[20px] p-5 ${p.star ? "ring-1 ring-gold/50" : ""}`} data-testid={`landing-offre-${p.key}`}>
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gold">{p.nom}</p>
                <p className="mt-1 text-[12.5px] text-offwhite/60">{p.pourQui}</p>
                <p className="mt-3 font-display text-3xl font-bold">{prixMois(p, "mensuel")} €<span className="ml-1 text-xs font-normal text-offwhite/50">HT / mois</span></p>
                <ul className="mt-4 flex-1 space-y-1.5 text-[13px] text-offwhite/70">
                  {p.points.slice(0, 3).map((pt) => <li key={pt} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-gold" />{pt}</li>)}
                </ul>
              </div>
            ))}
          </div>
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
          <Link to="/login" className="hover:text-gold">Se connecter</Link>
          <a href="mailto:contact@zayado.net" className="hover:text-gold">Contact</a>
        </div>
        © {new Date().getFullYear()} Zayado — SAS TheSustain
      </footer>
    </div>
  );
}
