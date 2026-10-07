import React, { useState } from "react";
import { ChevronDown, ShieldCheck, Server, Lock, FileText } from "lucide-react";
import { PLANS_GRILLE, COMPARATIF } from "@/lib/plans";
import GrilleTarifs from "@/components/pricing/GrilleTarifs";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { useSeo } from "@/lib/useSeo";

export default function Pricing() {

  const [comparer, setComparer] = useState(false);

  useSeo({
    title: "Tarifs Zayado — Solo 2 mois pour 1 €, Rêveur 1 mois offert, Pro, Équipe · sans engagement",
    description: "Solo : 2 mois pour 1 €, puis tarif fondateur garanti. Rêveur (Vision et idées) : 1 mois offert, puis 15 €. Pro avec Agent Business à ta marque. Sans engagement, résiliable en 1 clic.",
    path: "/pricing",
  });

  return (
    <MarketingLayout>
      <section className="mx-auto max-w-6xl px-5 pb-24 pt-14 sm:pt-20">
        <div className="text-center">
          <div className="tiret-rouge mx-auto" />
          <h1 className="mt-5 font-display text-3xl font-extrabold sm:text-5xl" data-testid="pricing-h1">
            Un cockpit pro, <span className="font-serif-italic font-normal text-gradient-gold">au prix juste.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-offwhite/65 sm:text-base">
            Vision, priorités, énergie et chiffres de ton activité au même endroit, avec une IA qui connaît ton projet.
            Solo : 2 mois pour 1 € · Rêveur : 1 mois offert. Prix TTC, sans engagement.
          </p>


        </div>

        <div className="mt-8"><GrilleTarifs /></div>

        {/* Confiance */}
        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-offwhite/60" data-testid="pricing-trust">
          {[[ShieldCheck, "Sans engagement · résiliable en 1 clic"], [Server, "Hébergé en Europe · RGPD"], [Lock, "Paiement sécurisé Mollie"], [FileText, "Mises à jour incluses"]].map(([Icon, label]) => (
            <span key={label} className="inline-flex items-center gap-1.5"><Icon size={14} className="text-gold" />{label}</span>
          ))}
        </div>

        {/* Comparatif détaillé */}
        <div className="mx-auto mt-10 max-w-6xl text-center">
          <button onClick={() => setComparer((v) => !v)} className="btn-ghost inline-flex items-center gap-2" data-testid="pricing-compare-toggle">
            {comparer ? "Masquer le comparatif" : "Comparer toutes les fonctionnalités"} <ChevronDown size={15} className={`transition ${comparer ? "rotate-180" : ""}`} />
          </button>
          {comparer && (
            <div className="glass mt-6 overflow-x-auto rounded-2xl p-2 text-left" data-testid="pricing-compare">
              <table className="w-full min-w-[640px] text-[13px]">
                <thead>
                  <tr className="text-offwhite/60">
                    <th className="px-4 py-3 text-left font-medium">Fonctionnalité</th>
                    {PLANS_GRILLE.map((p) => <th key={p.key} className={`px-3 py-3 text-center font-semibold ${p.star ? "text-gold" : "text-offwhite"}`}>{p.nom}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {COMPARATIF.map(([label, ...vals]) => (
                    <tr key={label} className="border-t border-white/8">
                      <td className="px-4 py-2.5 text-offwhite/80">{label}</td>
                      {vals.map((v, i) => <td key={i} className={`px-3 py-2.5 text-center ${v === "—" ? "text-offwhite/30" : v === "✓" ? "text-gold" : "text-offwhite/80"}`}>{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 pb-2 pt-3 text-[11px] text-offwhite/45">* Usage équitable : pensé pour un usage professionnel normal, sans compteur à surveiller.</p>
            </div>
          )}
        </div>


        {/* FAQ pricing */}
        <div className="mx-auto mt-20 max-w-3xl space-y-3">
          <h2 className="mb-6 text-center font-display text-2xl font-bold">Questions sur les tarifs</h2>
          {[
            { q: "Qu'est-ce que la « maintenance incluse » ?", r: "Les mises à jour, l'amélioration continue et la sécurité — sans rien payer en plus, jamais. Tu utilises, on entretient." },
            { q: "Comment marche l'essai à 1 € ?", r: "Tu paies 1 € TTC et tu as l'offre Solo complète pendant 1 mois. Ensuite, l'abonnement continue automatiquement au tarif fondateur réservé pendant ton essai (s'il est encore ouvert). Tu reçois un e-mail 7 jours avant le premier prélèvement et tu peux résilier en 1 clic dans Paramètres. Un essai par compte." },
            { q: "C'est quoi l'offre Rêveur ?", r: "Pour poser ta vision et nourrir tes idées sans tout le cockpit : Vision Boards illimités avec images IA, Idées développées par l'IA et le chat qui connaît ton projet, pour 15 € TTC par mois. Tu passes à Solo quand tu veux passer à l'action." },
            { q: "Pourquoi pas d'offre gratuite ?", r: "Parce que Zayado utilise de vraies sources (IA, prospects, données Google) qui ont un coût. L'essai à 1 € te laisse tout tester pendant 1 mois, sans engagement." },
            { q: "Les prix sont-ils HT ou TTC ?", r: "Tous les prix sont TTC, essai compris : nous ne sommes pas assujettis à la TVA, donc le montant affiché est le montant exact prélevé, sans rien à ajouter." },
            { q: "Quelle différence entre Solo et Pro ?", r: "Solo, c'est ton cockpit complet pour piloter seul. Pro ajoute ce qui sert face à tes clients : ton propre chatbot à ta marque, 90 prospects par mois au lieu de 30, les documents IA et les alertes WhatsApp / Telegram. Séparément, ces outils coûteraient plus de 200 € par mois (bouton « Pourquoi Pro ? »)." },
            { q: "Comment marche l'offre Équipe ?", r: "Tu as tout Pro, et tu invites 2 personnes (associé, assistant, commercial) depuis Paramètres. Chacune reçoit son propre espace Solo : son cockpit, sa Vision, son Radar. Tu peux retirer ou remplacer quelqu'un à tout moment." },
            { q: "Qu'est-ce que le tarif fondateur ?", r: "Une offre de lancement réservée aux 100 premiers clients, jusqu'à la date indiquée. Ton tarif fondateur t'est garanti tant que tu restes abonné, même quand les prix normaux s'appliquent aux nouveaux clients." },
            { q: "Puis-je changer de palier en cours de route ?", r: "Oui : choisis la nouvelle offre sur cette page. Elle démarre dès le paiement validé, le temps qu'il te restait est converti au prorata, et l'ancien prélèvement s'arrête." },
            { q: "Et si j'arrête ?", r: "Un clic dans Paramètres › Abonnement : plus aucun prélèvement, et tu gardes l'accès jusqu'à la fin de la période payée. Ensuite ton espace se met en pause ; tes données sont conservées et exportables, tu les retrouves en reprenant une offre." },
          ].map((f, i) => (
            <details key={i} className="glass rounded-2xl px-6 py-4" data-testid={`pricing-faq-${i}`}>
              <summary className="cursor-pointer text-sm font-semibold">{f.q}</summary>
              <p className="mt-2.5 text-sm leading-relaxed text-offwhite/65">{f.r}</p>
            </details>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}
