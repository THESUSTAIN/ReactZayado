import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { useSeo } from "@/lib/useSeo";

const POINTS = [
  { titre: "Un check-in d'énergie chaque matin", texte: "Trois glissières, dix secondes : énergie, stress, sommeil. Ta journée se cale sur ton état réel, pas sur une liste idéale." },
  { titre: "La charge mentale surveillée", texte: "Quand la tension monte plusieurs jours de suite, Zayado allège tes priorités et te le dit franchement — avant la cassure." },
  { titre: "Des rituels doux, pas des injonctions", texte: "Respiration guidée 4-7-8, journal des 3, pause consciente. Trois rituels courts à cocher, sans objectif ni pression." },
];

const FAQ = [
  { q: "Ce n'est pas encore un burn-out, est-ce vraiment pour moi ?", r: "Justement — c'est fait pour repérer les signaux avant que ça devienne un vrai burn-out, pas pour le soigner après coup." },
  { q: "Ça remplace un suivi psychologique ?", r: "Non. C'est un suivi léger de ton énergie business, pas un accompagnement thérapeutique. En cas de vrai mal-être, un professionnel reste la bonne ressource." },
  { q: "Dix secondes par jour, vraiment ?", r: "Oui pour le check-in de base. Les rituels (respiration, journal) sont optionnels et à ton rythme, jamais imposés." },
];

export default function BienEtreDirigeant() {
  useSeo({
    title: "Éviter le burn-out du dirigeant : énergie et charge mentale suivies | Zayado",
    description: "Zayado suit l'énergie, le stress et la charge mentale de l'entrepreneur chaque jour et adapte ses priorités. L'anti-burn-out intégré à ton cockpit business.",
  });

  return (
    <MarketingLayout>
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-14 sm:pt-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-gold">Fonctionnalité · Bien-être du dirigeant</p>
        <div className="tiret-rouge mt-4" />
        <h1 className="mt-4 max-w-3xl font-display text-3xl font-extrabold leading-[1.1] sm:text-5xl" data-testid="bienetre-h1">
          L'énergie du dirigeant d'abord. <span className="font-serif-italic font-normal text-gradient-gold">Le business suit.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-offwhite/70 sm:text-lg">
          Aucun outil de productivité ne te demande comment tu vas. Zayado, si — chaque matin — et il adapte ta journée
          à ta réponse. C'est notre différence, pas une option.
        </p>

        <div className="mt-7">
          <Link to="/login" data-testid="bienetre-cta-hero" className="btn-gold inline-block !px-8 !py-3.5">Découvrir Zayado, gratuitement</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 lg:grid-cols-2">
        <img src="/screenshots/bien-etre.png" alt="Suivi bien-être Zayado : énergie, stress, sommeil et charge du dirigeant avec rituels doux" data-testid="bienetre-img" className="w-full rounded-2xl border border-white/15 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.7)]" loading="lazy" />
        <div className="space-y-6">
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
      </section>

      <section className="border-t border-white/8 bg-white/[0.02]">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="mb-6 text-center font-display text-2xl font-bold">Ce que tu te demandes peut-être</h2>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <details key={i} className="glass rounded-2xl px-6 py-4" data-testid={`bienetre-faq-${i}`}>
                <summary className="cursor-pointer text-sm font-semibold">{f.q}</summary>
                <p className="mt-2.5 text-sm leading-relaxed text-offwhite/65">{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-16 text-center">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Un dirigeant en forme est la meilleure stratégie.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-offwhite/65 sm:text-base">
          Et quand l'énergie revient, la vision reprend le volant.
        </p>
        <Link to="/login" data-testid="bienetre-cta-final" className="btn-gold mt-6 inline-block !px-8 !py-3.5">Faire mon premier check-in — gratuit</Link>
        <p className="mt-4"><Link to="/fonctionnalites/vision-objectifs" data-testid="bienetre-lien-vision" className="inline-flex items-center gap-2 text-sm font-semibold text-gold hover:underline">Découvrir le pilier vision <ArrowRight size={14} /></Link></p>
      </section>
    </MarketingLayout>
  );
}
