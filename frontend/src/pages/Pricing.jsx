import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { useSeo } from "@/lib/useSeo";
import { appliquerCodePromo } from "@/lib/kairosApi";

// Fusionné en une seule échelle (plus deux grilles séparées) — un seul
// choix pour l'utilisateur, le chatbot devient une raison de monter dans
// la même échelle plutôt qu'un deuxième produit à comprendre. Style
// épuré façon Claude : 3 cartes visibles au lieu de 5, les paliers
// au-dessus rangés dans une section "Besoin de plus" compacte.
// Mots choisis pour être compris au premier regard (bénéfice concret,
// pas de jargon technique) — meilleure conversion.
const PALIERS = [
  { key: "essentielle", nom: "Essentielle", mensuel: 0, annuel: 0,
    points: ["Ta priorité du jour, chaque matin", "Ta Vision, toujours sous les yeux", "Suis ton énergie sans te forcer", "20 questions à l'IA / mois"] },
  { key: "serenite", nom: "Sérénité", mensuel: 19, annuel: 182.4, star: true,
    points: ["Tout l'Essentiel", "Pose toutes tes questions à l'IA", "3 opportunités repérées pour toi chaque jour", "Ta trésorerie et ta semaine en un coup d'œil"] },
  { key: "pro", nom: "Pro", mensuel: 49, annuel: 470.4,
    points: ["Tout Sérénité", "Ton propre chatbot pour TES clients", "Reçois tes alertes sur WhatsApp & Telegram", "Vends tes produits sur la marketplace"] },
];

const PALIERS_PLUS = [
  { key: "business", nom: "Business", mensuel: 99, annuel: 950.4, points: ["Tout Pro", "3 chatbots pour tes différents clients", "Ton chatbot répond avec TES documents", "Réponse prioritaire de l'équipe"] },
  { key: "entreprise", nom: "Entreprise", devis: true, plancher: 249, points: ["Tout Business", "Chatbots illimités, ton domaine", "Utilise ta propre clé IA si tu préfères", "Accompagnement dédié"] },
];

function Carte({ o, cycle }) {
  const prix = cycle === "annuel" ? (o.annuel / 12).toFixed(o.annuel % 12 === 0 ? 0 : 2) : o.mensuel;
  const startUrl = `/login?next=${encodeURIComponent(`/onboarding?plan=${o.key}&cycle=${cycle}`)}`;
  return (
    <div className={`glass flex flex-col rounded-2xl p-7 ${o.star ? "border-gold/50 shadow-[0_20px_50px_-20px_rgba(222,194,163,0.25)] scale-[1.02]" : ""}`} data-testid={`pricing-${o.key}`}>
      {o.star && <p className="mb-3 inline-block w-fit rounded-full bg-gold/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Le plus choisi</p>}
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{o.nom}</p>
      <p className="mt-2 font-display text-3xl font-extrabold">
        {prix}€ <span className="text-sm font-normal text-offwhite/50">/ mois</span>
      </p>
      {cycle === "annuel" && o.mensuel > 0 && <p className="mt-1 text-[11px] text-offwhite/45">Facturé {o.annuel.toFixed(2)}€ / an</p>}
      <ul className="mt-5 flex-1 space-y-2.5">
        {o.points.map((pt) => (
          <li key={pt} className="flex items-start gap-2 text-sm text-offwhite/70"><Check size={14} className="mt-0.5 shrink-0 text-gold" />{pt}</li>
        ))}
      </ul>
      <Link to={startUrl} data-testid={`pricing-cta-${o.key}`} className={`mt-6 text-center ${o.star ? "btn-gold justify-center" : "btn-ghost"}`}>
        {o.mensuel === 0 ? "Commencer gratuitement" : "Choisir cette offre"}
      </Link>
    </div>
  );
}

function CodePromo() {
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

  return (
    <form onSubmit={appliquer} className="mx-auto mt-6 flex max-w-xs gap-2">
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code de réduction" className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-sm outline-none focus:border-gold" data-testid="pricing-code-promo-input" />
      <button type="submit" disabled={envoi} className="rounded-xl border border-gold/40 px-4 py-2 text-xs font-semibold text-gold" data-testid="pricing-code-promo-btn">Appliquer</button>
    </form>
  );
}

export default function Pricing() {
  const [cycle, setCycle] = useState("mensuel");

  useSeo({
    title: "Tarifs Zayado — du gratuit à Entreprise, une seule échelle claire",
    description: "Cockpit Zayado gratuit ou Sérénité à 19€/mois. Chatbot marque blanche dès Pro (49€). -20% en facturation annuelle. Sans engagement, maintenance incluse.",
  });

  return (
    <MarketingLayout>
      <section className="mx-auto max-w-6xl px-5 pb-24 pt-14 sm:pt-20">
        <div className="text-center">
          <div className="tiret-rouge mx-auto" />
          <h1 className="mt-5 font-display text-3xl font-extrabold sm:text-5xl" data-testid="pricing-h1">
            Des prix simples, <span className="font-serif-italic font-normal text-gradient-gold">sans surprise.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-offwhite/65 sm:text-base">
            Une seule échelle, du gratuit à l'entreprise. Sans engagement, tu changes ou tu arrêtes quand tu veux.
            La maintenance est incluse dans tous les abonnements.
          </p>

          {/* Bascule mensuel / annuel */}
          <div className="mt-7 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1" data-testid="pricing-cycle-toggle">
            <button onClick={() => setCycle("mensuel")} className={`rounded-full px-4 py-2 text-[12.5px] font-semibold transition ${cycle === "mensuel" ? "bg-gold text-navy-900" : "text-white/70"}`} data-testid="pricing-cycle-mensuel">Mensuel</button>
            <button onClick={() => setCycle("annuel")} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold transition ${cycle === "annuel" ? "bg-gold text-navy-900" : "text-white/70"}`} data-testid="pricing-cycle-annuel">
              Annuel <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${cycle === "annuel" ? "bg-navy-900/15" : "bg-gold/20 text-gold"}`}>-20%</span>
            </button>
          </div>
        </div>

        {/* 3 paliers principaux */}
        <div className="mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-3">
          {PALIERS.map((o) => <Carte key={o.key} o={o} cycle={cycle} />)}
        </div>

        {/* Besoin de plus — Business / Entreprise, présentation compacte */}
        <div className="mx-auto mt-14 max-w-4xl rounded-2xl border border-white/10 bg-white/[0.02] p-7">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">Besoin de plus ?</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {PALIERS_PLUS.map((o) => {
              const prix = o.devis ? `dès ${o.plancher}€` : (cycle === "annuel" ? (o.annuel / 12).toFixed(0) : o.mensuel);
              return (
                <div key={o.key} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4" data-testid={`pricing-plus-${o.key}`}>
                  <div>
                    <p className="text-sm font-semibold text-offwhite">{o.nom} <span className="text-gold">— {prix}{o.devis ? "" : "€"}/mois</span></p>
                    {o.devis && <p className="text-[10.5px] text-offwhite/45">Sur devis, selon ton volume</p>}
                    <p className="mt-0.5 text-xs text-offwhite/55">{o.points.slice(1).join(" · ")}</p>
                  </div>
                  {o.devis ? (
                    <a href="mailto:contact@zayado.net?subject=Palier Entreprise" className="shrink-0 rounded-lg border border-gold/40 px-3 py-1.5 text-xs font-semibold text-gold" data-testid="pricing-plus-cta-entreprise">
                      Nous contacter <ArrowRight size={12} className="ml-1 inline" />
                    </a>
                  ) : (
                    <Link to={`/login?next=${encodeURIComponent(`/onboarding?plan=${o.key}&cycle=${cycle}`)}`} className="shrink-0 rounded-lg border border-gold/40 px-3 py-1.5 text-xs font-semibold text-gold" data-testid={`pricing-plus-cta-${o.key}`}>
                      Choisir <ArrowRight size={12} className="ml-1 inline" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <CodePromo />

        {/* FAQ pricing */}
        <div className="mx-auto mt-20 max-w-3xl space-y-3">
          <h2 className="mb-6 text-center font-display text-2xl font-bold">Questions sur les tarifs</h2>
          {[
            { q: "Qu'est-ce que la « maintenance incluse » ?", r: "Les mises à jour, l'amélioration continue et la sécurité — sans rien payer en plus, jamais. Tu utilises, on entretient." },
            { q: "Pourquoi une seule échelle plutôt que deux offres séparées ?", r: "Pour ne faire qu'un seul choix, pas deux. Le chatbot marque blanche devient une raison de monter dans la même échelle, pas un deuxième produit à comprendre." },
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
