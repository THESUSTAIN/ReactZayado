import React from "react";
import { Link } from "react-router-dom";
import { Compass, Radar, Heart, Bot, ArrowRight, Check, X, Smartphone, ShieldCheck, Download, Users } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { useSeo } from "@/lib/useSeo";

const PILIERS = [
  {
    to: "/fonctionnalites/vision-objectifs", icon: Compass, img: "/screenshots/vision.png",
    titre: "Vision & Objectifs",
    texte: "Pose ton cap une fois. Chaque journée s'aligne dessus — objectifs 3 ans, 90 jours, aujourd'hui.",
    testid: "landing-pilier-vision",
  },
  {
    to: "/fonctionnalites/prospection-croissance", icon: Radar, img: "/screenshots/radar-demo.gif",
    titre: "Prospection & Croissance",
    texte: "Le Radar du jour : 3 opportunités reliées à ta vision, message pré-rédigé. Tu valides, c'est envoyé.",
    testid: "landing-pilier-prospection",
  },
  {
    to: "/fonctionnalites/bien-etre-dirigeant", icon: Heart, img: "/screenshots/bien-etre.png",
    titre: "Bien-être du dirigeant",
    texte: "Ton énergie d'abord. Check-in quotidien, charge mentale surveillée, semaine adaptée à ton état réel.",
    testid: "landing-pilier-bienetre",
  },
  {
    // TODO : remplacer par une vraie capture du widget chatbot une fois
    // disponible — cockpit.png réutilisé en attendant plutôt qu'une image
    // inventée.
    to: "/pricing", icon: Bot, img: "/screenshots/cockpit.png",
    titre: "Agent Business (chatbot IA)",
    texte: "Dès le palier Pro : ton propre chatbot marque blanche pour TES clients, inclus dans le même outil.",
    testid: "landing-pilier-agent",
  },
];

const ETAPES = [
  { num: "01", titre: "Tu poses ta vision", texte: "Cinq minutes d'onboarding guidé : ton activité, ta cible, ton cap financier. L'IA compose ton board." },
  { num: "02", titre: "Chaque matin, l'essentiel", texte: "3 priorités adaptées à ton énergie du jour, ton point business (CA, trésorerie) et 3 opportunités de croissance." },
  { num: "03", titre: "Tu avances, sereinement", texte: "Tu valides, tu coches, tu respires. Kairos se souvient de tout et ajuste demain." },
];

const PERSONAS = [
  { titre: "Coachs & consultants", texte: "Qui vendent leur expertise et veulent des clients sans passer leurs soirées sur LinkedIn." },
  { titre: "Freelances & indépendants", texte: "Qui jonglent entre production et prospection, et veulent un seul endroit pour tout suivre." },
  { titre: "Entrepreneurs sensibles", texte: "Qui veulent réussir sans sacrifier leur énergie — et en ont assez des outils qui crient." },
];

const AVANT_APRES = [
  { avant: "5 outils qui ne se parlent pas", apres: "Un seul cockpit qui connaît ton contexte" },
  { avant: "Des listes de 27 tâches anxiogènes", apres: "3 priorités adaptées à ton énergie du jour" },
  { avant: "La prospection repoussée au lendemain", apres: "3 opportunités qualifiées chaque matin" },
  { avant: "Le burn-out découvert trop tard", apres: "La charge mentale surveillée en continu" },
];

const FAQ = [
  { q: "Kairos remplace quoi, concrètement ?", r: "Ton tableau de tâches, ta note d'objectifs, ton suivi de chiffre d'affaires et ta liste de prospection. Un seul endroit, une seule connexion — et une IA qui connaît ton contexte." },
  { q: "Est-ce adapté si je débute mon activité ?", r: "Oui. L'offre Essentielle est gratuite : cockpit quotidien, vision board et check-in d'énergie. La prospection IA arrive quand tu es prêt, avec l'offre Sérénité." },
  { q: "Mes données sont-elles à moi ?", r: "Oui. Chaque compte est isolé, tu peux exporter toutes tes données en un clic depuis les paramètres, et demander leur suppression complète à tout moment." },
  { q: "En combien de temps suis-je opérationnel ?", r: "Dix minutes : l'onboarding te pose 5 questions, pré-remplit ta vision et ton suivi business, et ton premier point du jour est généré dans la foulée." },
];

const REASSURANCE = [
  { icon: Check, label: "Sans engagement" },
  { icon: ShieldCheck, label: "Données hébergées en UE" },
  { icon: Download, label: "Export en 1 clic" },
  { icon: Users, label: "Support humain" },
];

export default function Landing() {
  useSeo({
    title: "Kairos — Le hub équilibre vie pro / vie perso pour entrepreneurs indépendants | Zayado",
    description: "Kairos aligne ta vision, ton énergie et ta prospection dans un seul cockpit IA. L'outil Zayado pour concilier activité et équilibre personnel. 3 priorités par jour, radar d'opportunités. Essai gratuit.",
  });

  return (
    <MarketingLayout>
      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 text-center sm:pt-20">
        <div className="tiret-rouge mx-auto" data-testid="landing-tiret" />
        <p className="mt-5 inline-block rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-gold" data-testid="landing-eyebrow">
          Le hub équilibre vie pro / vie perso des entrepreneurs
        </p>
        <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-6xl" data-testid="landing-h1">
          Fais avancer ton entreprise <span className="font-serif-italic font-normal text-gradient-gold">sans te griller.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-offwhite/70 sm:text-lg">
          Kairos réunit ta vision, tes 3 priorités du jour et ta prospection dans un seul cockpit apaisé —
          avec une IA qui regarde ton énergie avant de te proposer quoi que ce soit.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/login" data-testid="landing-cta-essai" className="btn-gold !px-7 !py-3.5 text-base">Créer mon cockpit — gratuit</Link>
          <Link to="/pricing" data-testid="landing-cta-tarifs" className="btn-ghost !px-7 !py-3.5 text-base">Voir les tarifs</Link>
        </div>
        <p className="mt-4 text-xs text-offwhite/45">Sans carte bancaire · Opérationnel en 10 minutes</p>

        <div className="relative mx-auto mt-14 max-w-5xl">
          <div className="pointer-events-none absolute -inset-10 rounded-[40px] bg-gold/[0.07] blur-3xl" />
          <img
            src="/screenshots/cockpit.png"
            alt="Le cockpit Kairos : énergie du jour, point business et radar d'opportunités réunis"
            data-testid="landing-hero-img"
            className="relative w-full rounded-2xl border border-white/15 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]"
            loading="eager"
          />
        </div>
      </section>

      {/* ── Réassurance ── */}
      <section className="border-y border-white/8 bg-white/[0.02]">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-5">
          {REASSURANCE.map((r) => (
            <span key={r.label} className="inline-flex items-center gap-2 text-xs font-medium text-offwhite/60" data-testid={`landing-reassurance-${r.label.toLowerCase().replace(/[^a-z]/g, "-")}`}>
              <r.icon size={13} className="text-gold" /> {r.label}
            </span>
          ))}
        </div>
      </section>

      {/* ── Le problème ── */}
      <section className="border-b border-white/8 bg-white/[0.02]">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Trello pour les tâches. Notion pour les notes.<br className="hidden sm:block" /> Un tableur pour le CA. <span className="text-gradient-gold font-serif-italic font-normal">Et ta tête, dans tout ça ?</span></h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-offwhite/65 sm:text-base">
            L'indépendant moyen jongle entre 5 outils qui ne se parlent pas — et aucun ne lui demande comment il va.
            Kairos part du principe inverse : ton énergie et ta vision d'abord, les outils ensuite.
          </p>
        </div>
      </section>

      {/* ── Comment ça marche ── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.26em] text-gold">Comment ça marche</p>
        <h2 className="mt-3 text-center font-display text-2xl font-bold sm:text-3xl">Trois temps. Zéro surcharge.</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {ETAPES.map((e) => (
            <div key={e.num} className="glass rounded-2xl p-7" data-testid={`landing-etape-${e.num}`}>
              <span className="font-display text-4xl font-extrabold text-gold/25">{e.num}</span>
              <h3 className="mt-3 font-display text-lg font-bold">{e.titre}</h3>
              <p className="mt-2 text-sm leading-relaxed text-offwhite/65">{e.texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Les 3 piliers (maillage vers sous-pages) ── */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.26em] text-gold">Un seul outil</p>
        <h2 className="mt-3 text-center font-display text-2xl font-bold sm:text-3xl">Un seul cockpit, quatre forces.</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PILIERS.map((p) => (
            <Link key={p.to} to={p.to} data-testid={p.testid} className="glass group block overflow-hidden rounded-2xl transition-all duration-300 hover:border-gold/40">
              <div className="aspect-[16/9] overflow-hidden border-b border-white/10">
                <img src={p.img} alt={`Aperçu ${p.titre} dans Kairos`} loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold"><p.icon size={15} /></span>
                  <h3 className="font-display text-base font-bold">{p.titre}</h3>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-offwhite/60">{p.texte}</p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gold">Découvrir <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" /></p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Mobile : ton cockpit dans ta poche ── */}
      <section className="border-y border-white/8 bg-white/[0.02]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-2">
          <div className="flex justify-center">
            <div className="w-[240px] rounded-[2.8rem] border-[6px] border-[#22335c] bg-[#0c1d33] p-2 shadow-[0_35px_70px_-25px_rgba(0,0,0,0.8)]" data-testid="landing-phone-mockup">
              <div className="relative overflow-hidden rounded-[2.2rem]">
                <div className="absolute left-1/2 top-2 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-black/85" />
                <img src="/screenshots/radar.png" alt="Le Radar Kairos sur mobile : les opportunités du jour dans la poche" loading="lazy" className="h-[430px] w-full object-cover object-top" />
              </div>
            </div>
          </div>
          <div>
            <div className="tiret-rouge" />
            <p className="mt-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-gold"><Smartphone size={13} /> Dans ta poche</p>
            <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Ton business te suit, sans t'envahir.</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-offwhite/65 sm:text-base">
              Depuis ton mobile, ton copilote reste joignable où tu es déjà : un « oui » sur Telegram ou WhatsApp
              suffit pour valider une opportunité, créer une tâche ou clôturer une action.
            </p>
            <ul className="mt-6 space-y-2.5">
              {["Validation Telegram & WhatsApp en un message", "Point du jour consultable partout", "Micro-actions de 5 minutes pour les trajets"].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-offwhite/70"><Check size={14} className="mt-0.5 shrink-0 text-gold" />{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Pour qui ── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="tiret-rouge mx-auto" />
        <h2 className="mt-4 text-center font-display text-2xl font-bold sm:text-3xl">Pensé pour celles et ceux qui portent tout, seuls.</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PERSONAS.map((p) => (
            <div key={p.titre} className="glass rounded-2xl p-7" data-testid={`landing-persona-${p.titre.toLowerCase().replace(/[^a-z]/g, "-")}`}>
              <h3 className="font-display text-lg font-bold">{p.titre}</h3>
              <p className="mt-2 text-sm leading-relaxed text-offwhite/65">{p.texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Avant / Avec Kairos ── */}
      <section className="mx-auto max-w-4xl px-5 pb-20">
        <div className="tiret-rouge mx-auto" />
        <h2 className="mt-4 text-center font-display text-2xl font-bold sm:text-3xl">Avant / Avec Kairos</h2>
        <div className="mt-10 space-y-3">
          {AVANT_APRES.map((l, i) => (
            <div key={i} className="glass grid items-center gap-3 rounded-2xl px-6 py-4 sm:grid-cols-2" data-testid={`landing-avant-apres-${i}`}>
              <p className="flex items-center gap-2.5 text-sm text-offwhite/50"><X size={14} className="shrink-0 text-[#C1272D]" />{l.avant}</p>
              <p className="flex items-center gap-2.5 text-sm font-medium text-offwhite"><Check size={14} className="shrink-0 text-gold" />{l.apres}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Offre ── */}
      <section className="border-y border-white/8 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { nom: "Essentielle", prix: "0€", points: ["Cockpit quotidien & 3 priorités", "Vision Board", "Check-in énergie"] },
              { nom: "Sérénité", prix: "19€/mois", points: ["Copilote IA illimité", "Radar du jour (3 opportunités)", "Pouls Business & revue hebdo"], star: true },
              { nom: "Agent Business", prix: "dès 49€/mois", points: ["30 vrais prospects qualifiés/mois", "Validation Telegram & WhatsApp", "Espace vendeur marketplace"] },
            ].map((o) => (
              <div key={o.nom} className={`glass rounded-2xl p-7 ${o.star ? "border-gold/40" : ""}`} data-testid={`landing-offre-${o.nom.toLowerCase().replace(/[^a-z]/g, "-")}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{o.nom}</p>
                <p className="mt-2 font-display text-3xl font-extrabold">{o.prix}</p>
                <ul className="mt-4 space-y-2">
                  {o.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm text-offwhite/70"><Check size={14} className="mt-0.5 shrink-0 text-gold" />{pt}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center"><Link to="/pricing" className="text-sm font-semibold text-gold underline-offset-4 hover:underline" data-testid="landing-lien-tarifs">Voir le détail des tarifs →</Link></p>
        </div>
      </section>

      {/* ── FAQ SEO ── */}
      <section className="mx-auto max-w-3xl px-5 py-20">
        <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">Questions fréquentes</h2>
        <div className="mt-10 space-y-3">
          {FAQ.map((f, i) => (
            <details key={i} className="glass rounded-2xl px-6 py-4" data-testid={`landing-faq-${i}`}>
              <summary className="cursor-pointer text-sm font-semibold text-offwhite">{f.q}</summary>
              <p className="mt-2.5 text-sm leading-relaxed text-offwhite/65">{f.r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="mx-auto max-w-4xl px-5 pb-24 text-center">
        <div className="tiret-rouge mx-auto" />
        <h2 className="mt-5 font-display text-3xl font-extrabold sm:text-4xl">Ton entreprise mérite un cockpit.<br /><span className="font-serif-italic font-normal text-gradient-gold">Toi aussi.</span></h2>
        <Link to="/login" data-testid="landing-cta-final" className="btn-gold mt-8 inline-flex !px-8 !py-4 text-base">Commencer gratuitement</Link>
      </section>
    </MarketingLayout>
  );
}
