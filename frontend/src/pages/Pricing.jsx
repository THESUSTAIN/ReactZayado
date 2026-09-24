import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ShieldCheck, Server, Lock, FileText } from "lucide-react";
import { PLANS_GRILLE, COMPARATIF } from "@/lib/plans";
import GrilleTarifs from "@/components/pricing/GrilleTarifs";
import { toast } from "sonner";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { useSeo } from "@/lib/useSeo";
import { appliquerCodePromo } from "@/lib/kairosApi";

function CodePromo() {
  const [ouvert, setOuvert] = useState(false);
  const [code, setCode] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const navigate = useNavigate();

  const appliquer = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setEnvoi(true);
    try {
      await appliquerCodePromo(code.trim());
      toast.success("Code appliqué ! Connecte-toi pour voir tes crédits.");
      navigate("/login");
    } catch { toast.error("Code invalide, inactif ou déjà utilisé."); }
    finally { setEnvoi(false); }
  };

  if (!ouvert) {
    return (
      <p className="mt-6 text-center">
        <button onClick={() => setOuvert(true)} className="text-xs text-offwhite/50 underline-offset-4 hover:text-offwhite hover:underline" data-testid="pricing-code-promo-open">J'ai un code</button>
      </p>
    );
  }
  return (
    <form onSubmit={appliquer} className="mx-auto mt-6 flex max-w-xs gap-2">
      <input value={code} onChange={(e) => setCode(e.target.value)} autoFocus placeholder="Code de réduction" className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-sm outline-none focus:border-gold" data-testid="pricing-code-promo-input" />
      <button type="submit" disabled={envoi} className="rounded-xl border border-gold/40 px-4 py-2 text-xs font-semibold text-gold" data-testid="pricing-code-promo-btn">Appliquer</button>
    </form>
  );
}

export default function Pricing() {

  const [comparer, setComparer] = useState(false);

  useSeo({
    title: "Tarifs Zayado — essai 2 mois pour 1 €, Solo et Pro, tarif fondateur, sans engagement",
    description: "Essaie Zayado Solo 2 mois pour 1 €, puis le tarif fondateur garanti tant que tu restes abonné. Pro avec Agent Business à ta marque. Sans engagement ni renouvellement automatique.",
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
            Essai Solo : 2 mois pour 1 €. Ensuite, prix hors taxes, sans engagement.
          </p>

        </div>

        <div className="mt-8"><GrilleTarifs /></div>

        {/* Confiance */}
        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-offwhite/60" data-testid="pricing-trust">
          {[[ShieldCheck, "Sans engagement, sans renouvellement automatique"], [Server, "Hébergé en Europe · RGPD"], [Lock, "Paiement sécurisé Mollie"], [FileText, "Mises à jour incluses"]].map(([Icon, label]) => (
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

        <CodePromo />

        {/* FAQ pricing */}
        <div className="mx-auto mt-20 max-w-3xl space-y-3">
          <h2 className="mb-6 text-center font-display text-2xl font-bold">Questions sur les tarifs</h2>
          {[
            { q: "Qu'est-ce que la « maintenance incluse » ?", r: "Les mises à jour, l'amélioration continue et la sécurité — sans rien payer en plus, jamais. Tu utilises, on entretient." },
            { q: "Comment marche l'essai à 1 € ?", r: "Tu paies 1 € TTC une seule fois et tu as l'offre Solo complète pendant 2 mois. Rien ne se renouvelle tout seul : à la fin, tu choisis de continuer (au tarif fondateur réservé pendant ton essai, s'il est encore ouvert) ou d'arrêter. Un essai par compte." },
            { q: "Pourquoi pas d'offre gratuite ?", r: "Parce que Zayado utilise de vraies sources (IA, prospects, données Google) qui ont un coût. L'essai à 1 € te laisse tout tester pendant 2 mois, sans engagement." },
            { q: "Les prix sont-ils HT ou TTC ?", r: "Les prix des offres sont hors taxes : la TVA française (20 %) s'ajoute sur ta facture, que tu peux récupérer si ton entreprise y est assujettie. L'essai est à 1 € TTC." },
            { q: "Quelle différence entre Solo et Pro ?", r: "Solo, c'est ton cockpit complet pour piloter seul. Pro ajoute ce qui sert face à tes clients : ton propre chatbot à ta marque, les documents IA et les alertes WhatsApp / Telegram." },
            { q: "Qu'est-ce que le tarif fondateur ?", r: "Une offre de lancement réservée aux 100 premiers clients, jusqu'à la date indiquée. Ton tarif fondateur t'est garanti tant que tu restes abonné, même quand les prix normaux s'appliquent aux nouveaux clients." },
            { q: "Puis-je changer de palier en cours de route ?", r: "Oui : choisis l'offre supérieure sur cette page. La nouvelle offre démarre dès le paiement validé." },
            { q: "Et si j'arrête ?", r: "Il n'y a pas de renouvellement automatique : tu gardes l'accès jusqu'à la fin de la période payée, puis ton espace se met en pause. Tes données sont conservées et restent exportables : tu les retrouves en reprenant une offre." },
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
