import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, ArrowRight, ChevronDown, ShieldCheck, Server, Lock, FileText } from "lucide-react";
import { PLANS, PLAN_ENTREPRISE, COMPARATIF, prixMois } from "@/lib/plans";
import { toast } from "sonner";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { useSeo } from "@/lib/useSeo";
import { appliquerCodePromo } from "@/lib/kairosApi";

// Grille unique (lib/plans.js) : 4 cartes côte à côte + Entreprise en bandeau,
// prix HT, « pour qui » sous chaque nom, comparatif à déplier.
function Carte({ o, cycle }) {
  const prix = prixMois(o, cycle);
  const startUrl = `/login?next=${encodeURIComponent(`/onboarding?plan=${o.key}&cycle=${cycle}`)}`;
  return (
    <div className={`glass relative flex flex-col rounded-2xl p-6 ${o.star ? "border-gold/50 shadow-[0_20px_50px_-20px_rgba(222,194,163,0.3)] lg:-mt-3 lg:pb-9" : ""}`} data-testid={`pricing-${o.key}`}>
      {o.star && <p className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-navy-900">Le plus choisi</p>}
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{o.nom}</p>
      <p className="mt-1 text-[12.5px] text-offwhite/60">{o.pourQui}</p>
      <p className="mt-4 font-display text-4xl font-extrabold">
        {prix} €<span className="ml-1 text-sm font-normal text-offwhite/50">HT / mois</span>
      </p>
      <p className="mt-1 h-4 text-[11px] text-offwhite/45">
        {o.mensuel > 0 ? (cycle === "annuel" ? `Facturé ${o.annuel.toLocaleString("fr-FR")} € HT / an` : `ou ${prixMois(o, "annuel")} € / mois en annuel`) : "Gratuit, sans carte bancaire"}
      </p>
      <Link to={startUrl} data-testid={`pricing-cta-${o.key}`} className={`mt-5 text-center ${o.star ? "btn-gold justify-center" : "btn-ghost justify-center"}`}>
        {o.mensuel === 0 ? "Commencer gratuitement" : `Choisir ${o.nom}`}
      </Link>
      <ul className="mt-6 flex-1 space-y-2.5 border-t border-white/10 pt-5">
        {o.points.map((pt) => (
          <li key={pt} className="flex items-start gap-2 text-[13.5px] text-offwhite/75"><Check size={14} className="mt-0.5 shrink-0 text-gold" />{pt}</li>
        ))}
      </ul>
    </div>
  );
}

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
  const [cycle, setCycle] = useState("mensuel");

  const [comparer, setComparer] = useState(false);

  useSeo({
    title: "Tarifs Zayado — gratuit, Solo 24 € HT, Pro 69 € HT, sans engagement",
    description: "Zayado Découverte gratuit, Solo à 24 € HT/mois (19 € en annuel), Pro avec chatbot client à ta marque à 69 € HT/mois. 2 mois offerts en annuel. Sans engagement.",
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
            Prix hors taxes, sans engagement.
          </p>

          <div className="mt-7 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1" data-testid="pricing-cycle-toggle">
            <button onClick={() => setCycle("mensuel")} className={`rounded-full px-4 py-2 text-[12.5px] font-semibold transition ${cycle === "mensuel" ? "bg-gold text-navy-900" : "text-white/70"}`} data-testid="pricing-cycle-mensuel">Mensuel</button>
            <button onClick={() => setCycle("annuel")} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold transition ${cycle === "annuel" ? "bg-gold text-navy-900" : "text-white/70"}`} data-testid="pricing-cycle-annuel">
              Annuel <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${cycle === "annuel" ? "bg-navy-900/15" : "bg-gold/20 text-gold"}`}>2 mois offerts</span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((o) => <Carte key={o.key} o={o} cycle={cycle} />)}
        </div>

        {/* Entreprise : bandeau */}
        <div className="mx-auto mt-6 flex max-w-6xl flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:flex-row sm:items-center" data-testid="pricing-plus-entreprise">
          <div>
            <p className="text-sm font-semibold text-offwhite">{PLAN_ENTREPRISE.nom} <span className="text-gold">— sur devis, dès {PLAN_ENTREPRISE.plancher} € HT / mois</span></p>
            <p className="mt-1 text-xs text-offwhite/60">{PLAN_ENTREPRISE.pourQui} · {PLAN_ENTREPRISE.points.slice(1).join(" · ")}</p>
          </div>
          <a href="mailto:contact@zayado.net?subject=Offre Entreprise" className="shrink-0 rounded-xl border border-gold/40 px-4 py-2 text-xs font-semibold text-gold" data-testid="pricing-plus-cta-entreprise">
            Parler à l'équipe <ArrowRight size={12} className="ml-1 inline" />
          </a>
        </div>

        {/* Confiance */}
        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-offwhite/60" data-testid="pricing-trust">
          {[[ShieldCheck, "Sans engagement, résiliable en 1 clic"], [Server, "Hébergé en Europe · RGPD"], [Lock, "Paiement sécurisé Mollie"], [FileText, "Mises à jour incluses"]].map(([Icon, label]) => (
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
                    {PLANS.map((p) => <th key={p.key} className={`px-3 py-3 text-center font-semibold ${p.star ? "text-gold" : "text-offwhite"}`}>{p.nom}</th>)}
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
            { q: "Les prix sont-ils HT ou TTC ?", r: "Tous les prix affichés sont hors taxes. La TVA française (20 %) s'ajoute sur ta facture, que tu peux récupérer si ton entreprise y est assujettie." },
            { q: "Quelle différence entre Solo et Pro ?", r: "Solo, c'est ton cockpit complet pour piloter seul. Pro ajoute ce qui sert face à tes clients : ton propre chatbot à ta marque, les documents IA et les alertes WhatsApp / Telegram." },
            { q: "Puis-je changer de palier en cours de route ?", r: "Oui, en un clic depuis tes paramètres. Le changement est immédiat et le montant au prorata." },
            { q: "Et si j'arrête ?", r: "Tu gardes l'accès jusqu'à la fin de la période en cours, puis tu retombes sur l'offre gratuite. Tes données restent exportables à tout moment." },
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
