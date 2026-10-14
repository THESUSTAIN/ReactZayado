import { Link } from "react-router-dom";
import { ArrowRight, Check, ShieldCheck, Sparkles, Users, Heart } from "lucide-react";
import usePageMeta from "@/hooks/usePageMeta";
import { Reveal } from "@/components/Reveal";
import { COCKPIT_MODULES, COCKPIT_TARIFS } from "@/data/content";

const APP_URL = process.env.REACT_APP_APP_URL || "https://app.zayado.net";
const OFF = "#EDF2FF";
const GOLD = "#DEC2A3";

const ctaEssai = (key = "serenite", essai = true) =>
  `${APP_URL}/login?next=${encodeURIComponent(`/onboarding?plan=${key}${essai ? "&essai=1" : ""}`)}`;

const VALEURS = [
  { Icon: Sparkles, texte: "L’IA prépare, tu décides." },
  { Icon: Users, texte: "Jamais seul." },
  { Icon: Heart, texte: "L’équilibre avant la croissance à tout prix." },
  { Icon: Check, texte: "Honnêteté, toujours." },
];

const FAQ = [
  { q: "L’essai, comment ça marche ?", a: `Solo : ${COCKPIT_TARIFS.essai}. Rêveur : le premier mois offert. Sans engagement, résiliable en un clic.` },
  { q: "Mes données sont où ?", a: "Chez nous, en France, RGPD strict. Tes chiffres et ton énergie ne nourrissent aucune publicité." },
  { q: "Je paie comment ?", a: "Par carte, paiement sécurisé Mollie. Mensuel ou annuel (deux mois offerts en annuel)." },
];

export default function Cockpit() {
  usePageMeta(
    "Le Cockpit IA des entrepreneurs · Zayado",
    "Vision, actions, prospection et énergie réunies dans un seul cockpit IA. Essai 2 mois pour 1 €, sans engagement, paiement sécurisé Mollie."
  );

  return (
    <div className="zayado-app-bg min-h-screen text-[#EDF2FF]" data-testid="cockpit-page">
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 md:pt-24">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }} data-testid="cockpit-badge">
            <Sparkles size={13} /> L’application Zayado
          </span>
          <h1 className="font-display mt-7 max-w-3xl text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
            Pilote ton entreprise, <em style={{ color: GOLD }}>sans t’épuiser.</em>
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-relaxed opacity-80">
            Vision, actions, prospection et énergie réunies dans un seul cockpit IA. Tu n’as plus besoin de dix
            outils — ni de choisir entre ta santé et ta rentabilité.
          </p>
          <div className="mt-8 flex flex-wrap gap-3.5">
            <a href={ctaEssai("serenite", true)} data-testid="cockpit-hero-cta-essai" className="btn btn-creme px-7 py-3.5 text-[15px]">
              Essayer {COCKPIT_TARIFS.essai} <ArrowRight size={16} />
            </a>
            <a href="#tarifs" data-testid="cockpit-hero-cta-tarifs" className="btn inline-flex items-center gap-2 border border-white/25 px-7 py-3.5 text-[15px]" style={{ color: OFF }}>
              Voir les tarifs
            </a>
          </div>
          <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] opacity-60">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Sans engagement</span>
            <span>Paiement sécurisé Mollie</span>
            <span>RGPD strict · données en France</span>
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-12 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4" data-testid="cockpit-valeurs">
            {VALEURS.map((v) => (
              <div key={v.texte} className="glass-navy flex items-center gap-2.5 rounded-2xl px-4 py-3.5 text-[13.5px] font-semibold">
                <v.Icon size={16} style={{ color: GOLD }} /> {v.texte}
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* FONCTIONNALITÉS */}
      <section id="fonctionnalites" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-14" data-testid="cockpit-fonctionnalites">
        <Reveal>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Un seul cockpit, tout ton pilotage.</h2>
          <p className="mt-3 max-w-2xl text-[15px] opacity-70">
            Six modules qui travaillent ensemble et parlent de TON activité.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {COCKPIT_MODULES.map((m, i) => (
            <Reveal key={m.id} delay={(i % 3) * 0.08} className="h-full">
              <article className="glass-navy flex h-full flex-col rounded-[22px] p-7" data-testid={`cockpit-module-${m.id}`}>
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em]" style={{ color: GOLD }}>{m.label}</p>
                <h3 className="font-display mt-3 text-[21px] font-bold leading-snug">{m.accroche}</h3>
                <p className="mt-3 flex-1 text-[13.5px] leading-relaxed opacity-65 italic">{m.douleur}</p>
                <ul className="mt-5 space-y-2">
                  {m.benefices.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed opacity-90">
                      <Check size={15} className="mt-0.5 flex-none" style={{ color: GOLD }} /> {b}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* TARIFS */}
      <section id="tarifs" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-14" data-testid="cockpit-tarifs">
        <Reveal>
          <h2 className="font-display text-center text-3xl font-bold sm:text-4xl">Une offre pour chaque étape.</h2>
          <p className="font-hand mt-2 text-center text-2xl" style={{ color: GOLD }}>
            essai {COCKPIT_TARIFS.essai} — sans engagement
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {COCKPIT_TARIFS.plans.map((p, i) => (
            <Reveal key={p.key} delay={i * 0.07} className="h-full">
              <div
                className={`glass-navy relative flex h-full flex-col rounded-[22px] p-6 ${p.star ? "border-[rgba(222,194,163,0.55)]" : ""}`}
                style={p.star ? { borderWidth: 2 } : {}}
                data-testid={`cockpit-tarif-${p.key}`}
              >
                {p.star && (
                  <p className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ background: GOLD, color: "#0B1F3A" }}>
                    Le plus choisi
                  </p>
                )}
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>{p.nom}</p>
                <p className="font-display mt-3 text-4xl font-extrabold">
                  {p.prix} €<span className="text-sm font-normal opacity-60"> /mois</span>
                </p>
                <p className="mt-1 text-[12px] opacity-60">
                  ou {p.annuel.toLocaleString("fr-FR")} € / an{p.fondateur ? ` · fondateur ${p.fondateur} €/mois` : ""}
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-[13px] leading-relaxed opacity-85">
                      <Check size={14} className="mt-0.5 flex-none" style={{ color: GOLD }} /> {pt}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: GOLD }}>{p.note}</p>
                <a href={ctaEssai(p.key, p.key === "serenite")} data-testid={`cockpit-tarif-cta-${p.key}`} className="btn btn-creme mt-5 px-5 py-3 text-[13.5px]">
                  Choisir {p.nom}
                </a>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="glass-navy mt-6 flex flex-col items-start justify-between gap-4 rounded-[22px] p-7 sm:flex-row sm:items-center" data-testid="cockpit-tarif-entreprise">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>Entreprise</p>
              <p className="font-display mt-2 text-xl font-bold">À partir de {COCKPIT_TARIFS.entreprise.plancher} € / mois — sur devis</p>
              <p className="mt-1 text-[13px] opacity-65">{COCKPIT_TARIFS.entreprise.points.join(" · ")}</p>
            </div>
            <a href={`mailto:contact@zayado.net?subject=Offre Entreprise`} data-testid="cockpit-tarif-entreprise-cta" className="btn inline-flex items-center gap-2 border border-white/25 px-6 py-3 text-[13.5px]" style={{ color: OFF }}>
              Demander un devis <ArrowRight size={14} />
            </a>
          </div>
          <p className="mt-5 text-center text-[11.5px] opacity-50">{COCKPIT_TARIFS.pied} · Membres TheSustain : −20 %</p>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-14" data-testid="cockpit-faq">
        <Reveal>
          <h2 className="font-display text-center text-3xl font-bold">Les questions qu’on nous pose.</h2>
          <div className="mt-8 space-y-2.5">
            {FAQ.map((f) => (
              <details key={f.q} className="glass-navy rounded-2xl px-5 py-4" data-testid={`cockpit-faq-item`}>
                <summary className="cursor-pointer text-[14.5px] font-semibold">{f.q}</summary>
                <p className="mt-2 text-[14px] leading-relaxed opacity-75">{f.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-4xl px-5 pb-20 pt-6 text-center">
        <Reveal>
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
            Raconte ton projet.<br />Le cockpit fait le reste.
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3.5">
            <a href={ctaEssai()} data-testid="cockpit-final-cta" className="btn btn-creme px-8 py-4 text-[16px]">
              Commencer l’essai <ArrowRight size={16} />
            </a>
            <Link to="/diagnostic" data-testid="cockpit-final-cta-diagnostic" className="btn inline-flex items-center gap-2 border border-white/25 px-8 py-4 text-[16px]" style={{ color: OFF }}>
              Faire le diagnostic
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
