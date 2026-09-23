import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { useSeo } from "@/lib/useSeo";

// Reconstruit en vrai tunnel de vente (pas une page vitrine) : accroche +
// douleur → capture email (lead magnet) → bénéfices → preuve → FAQ
// (objections) → CTA final. Même logique que les tunnels Zayado déjà
// construits pour la boutique (Acquisition, etc.), appliquée ici.
const POINTS = [
  { titre: "Un board généré par l'IA en 5 minutes", texte: "Décris ton projet en quelques phrases : Zayado compose ta maison stratégique — vision, piliers, actions — prête à ajuster." },
  { titre: "Des objectifs 3 ans reliés à aujourd'hui", texte: "Ton cap long terme se décline en horizons 90 jours puis en priorités du jour. Tu sais toujours pourquoi tu fais ce que tu fais." },
  { titre: "Élan et Refuge", texte: "Chaque carte porte ton mode du moment : foncer quand l'énergie est là, ralentir sans culpabiliser quand elle ne l'est pas." },
];

const FAQ = [
  { q: "Je n'ai jamais réussi à tenir une vision écrite, pourquoi ça marcherait ici ?", r: "Parce qu'elle ne reste pas sur une page — elle pilote ta priorité du jour, chaque matin. Tu ne la relis pas une fois par an, tu la vis chaque jour." },
  { q: "Combien de temps pour la construire ?", r: "5 minutes pour le premier jet, généré par l'IA à partir de ce que tu décris. Tu l'ajustes ensuite librement." },
  { q: "C'est vraiment gratuit ?", r: "Oui, le Vision Board complet est inclus dans l'offre Découverte, gratuite, sans limite de durée." },
];

export default function VisionObjectifs() {
  useSeo({
    title: "Définir sa vision d'entreprise et structurer ses objectifs | Zayado",
    description: "Clarifie ta vision d'entreprise avec un board généré par IA : objectifs 3 ans, feuille de route 90 jours et priorités du jour reliées. Pour entrepreneurs indépendants.",
  });

  return (
    <MarketingLayout>
      {/* Accroche + douleur */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-14 sm:pt-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-gold">Fonctionnalité · Vision & Objectifs</p>
        <div className="tiret-rouge mt-4" />
        <h1 className="mt-4 max-w-3xl font-display text-3xl font-extrabold leading-[1.1] sm:text-5xl" data-testid="vision-h1">
          Définir sa vision d'entreprise — <span className="font-serif-italic font-normal text-gradient-gold">et la tenir, enfin.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-offwhite/70 sm:text-lg">
          90 % des indépendants écrivent leur vision en janvier et l'oublient en février. Zayado la garde vivante :
          elle pilote tes priorités de chaque matin et ton radar d'opportunités.
        </p>

        {/* CTA direct — plus de capture email séparée, redondante avec la
            connexion qui suit (magic link = création de compte automatique). */}
        <div className="mt-7">
          <Link to="/login" data-testid="vision-cta-hero" className="btn-gold inline-block !px-8 !py-3.5">Découvrir Zayado, gratuitement</Link>
        </div>
      </section>

      {/* Bénéfices */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 lg:grid-cols-2">
        <img src="/screenshots/vision.png" alt="Vision Board Zayado : maison stratégique avec modèles Roue de l'équilibre et Feuille de route 90 jours" data-testid="vision-img" className="w-full rounded-2xl border border-white/15 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.7)]" loading="lazy" />
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

      {/* FAQ — objections levées avant qu'elles ne bloquent la conversion */}
      <section className="border-t border-white/8 bg-white/[0.02]">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="mb-6 text-center font-display text-2xl font-bold">Ce que tu te demandes peut-être</h2>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <details key={i} className="glass rounded-2xl px-6 py-4" data-testid={`vision-faq-${i}`}>
                <summary className="cursor-pointer text-sm font-semibold">{f.q}</summary>
                <p className="mt-2.5 text-sm leading-relaxed text-offwhite/65">{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-4xl px-5 py-16 text-center">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Une vision claire attire les bonnes opportunités.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-offwhite/65 sm:text-base">
          Et chez Zayado, elle les attire littéralement : le Radar du jour croise tes objectifs avec les signaux du marché.
        </p>
        <Link to="/login" data-testid="vision-cta-final" className="btn-gold mt-6 inline-block !px-8 !py-3.5">Construire ma vision — gratuit</Link>
        <p className="mt-4"><Link to="/fonctionnalites/prospection-croissance" data-testid="vision-lien-prospection" className="inline-flex items-center gap-2 text-sm font-semibold text-gold hover:underline">Découvrir la prospection reliée à ta vision <ArrowRight size={14} /></Link></p>
      </section>
    </MarketingLayout>
  );
}
