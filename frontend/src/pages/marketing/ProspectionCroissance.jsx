import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { useSeo } from "@/lib/useSeo";

const POINTS = [
  { titre: "3 opportunités par jour, pas une de plus", texte: "Le Radar croise les signaux autorisés (LinkedIn, communautés, tendances) avec ta vision et ta cible. Le reste est filtré — le calme avant tout." },
  { titre: "Un message pré-rédigé pour chaque opportunité", texte: "L'IA rédige le premier contact dans ton ton, relié à ton offre. Tu relis, tu copies, tu envoies. Deux minutes montre en main." },
  { titre: "Tu valides, rien ne part sans toi", texte: "Depuis l'app, Telegram ou WhatsApp : chaque action de prospection attend ton feu vert. L'agent prépare, tu décides." },
];

const FAQ = [
  { q: "Est-ce du scraping ou du démarchage automatique agressif ?", r: "Non. Le Radar croise des signaux publics avec ta vision — il ne contacte jamais personne sans ton feu vert explicite." },
  { q: "Combien de temps ça prend vraiment chaque jour ?", r: "En moyenne 10 minutes : lire les 3 opportunités, ajuster le message si besoin, valider." },
  { q: "Et si je n'ai pas encore de cible claire ?", r: "Le Radar s'affine avec ta Vision — plus elle est précise, plus les opportunités le sont aussi. Tu peux commencer flou et ajuster en avançant." },
];

export default function ProspectionCroissance() {
  useSeo({
    title: "Trouver des clients quand on est indépendant — prospection IA apaisée | Zayado",
    description: "Le Radar Zayado propose 3 opportunités qualifiées par jour, reliées à ta vision, avec message pré-rédigé. Prospection automatisée par IA pour indépendants, sans y passer ses soirées.",
  });

  return (
    <MarketingLayout>
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-14 sm:pt-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-gold">Fonctionnalité · Prospection & Croissance</p>
        <div className="tiret-rouge mt-4" />
        <h1 className="mt-4 max-w-3xl font-display text-3xl font-extrabold leading-[1.1] sm:text-5xl" data-testid="prospection-h1">
          Trouver des clients quand on est indépendant — <span className="font-serif-italic font-normal text-gradient-gold">sans y passer ses soirées.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-offwhite/70 sm:text-lg">
          La prospection est la tâche que tous les indépendants repoussent. Le Radar du jour la réduit à dix minutes :
          trois opportunités qualifiées chaque matin, reliées à ta vision.
        </p>

        <div className="mt-7">
          <Link to="/login" data-testid="prospection-cta-hero" className="btn-gold inline-block !px-8 !py-3.5">Découvrir Zayado, gratuitement</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 lg:grid-cols-2">
        <div className="space-y-6 lg:order-1 order-2">
          {POINTS.map((p) => (
            <div key={p.titre} className="flex gap-4">
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15"><Check size={13} className="text-gold" /></span>
              <div>
                <h2 className="font-display text-lg font-bold">{p.titre}</h2>
                <p className="mt-1 text-sm leading-relaxed text-offwhite/65">{p.texte}</p>
              </div>
            </div>
          ))}
        </div>
        <img src="/screenshots/radar-demo.gif" alt="Démo animée du Radar Zayado : balayage des signaux et opportunités qualifiées en temps réel" data-testid="prospection-img" className="w-full rounded-2xl border border-white/15 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.7)] lg:order-2 order-1" loading="lazy" />
      </section>

      <section className="border-t border-white/8 bg-white/[0.02]">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="mb-6 text-center font-display text-2xl font-bold">Ce que tu te demandes peut-être</h2>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <details key={i} className="glass rounded-2xl px-6 py-4" data-testid={`prospection-faq-${i}`}>
                <summary className="cursor-pointer text-sm font-semibold">{f.q}</summary>
                <p className="mt-2.5 text-sm leading-relaxed text-offwhite/65">{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-16 text-center">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">La prospection fonctionne si tu tiens le rythme.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-offwhite/65 sm:text-base">
          Et on tient un rythme quand on n'est pas épuisé. C'est pour ça que Zayado surveille aussi ton énergie.
        </p>
        <Link to="/login" data-testid="prospection-cta-final" className="btn-gold mt-6 inline-block !px-8 !py-3.5">Activer mon Radar — gratuit</Link>
        <p className="mt-4"><Link to="/fonctionnalites/bien-etre-dirigeant" data-testid="prospection-lien-bienetre" className="inline-flex items-center gap-2 text-sm font-semibold text-gold hover:underline">Découvrir le pilier bien-être <ArrowRight size={14} /></Link></p>
      </section>
    </MarketingLayout>
  );
}
