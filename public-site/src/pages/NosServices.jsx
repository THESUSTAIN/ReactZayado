import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Building2, Shield, MapPin, Calculator, Briefcase, FileText, ArrowRight, Check } from "lucide-react";
import { PublicHeader, UnifiedFooter } from "./LandingHub";

const SERVICES = [
  {
    icon: Building2,
    title: "Banque pro mutualisée",
    desc: "Comptes pros négociés avec nos partenaires (Qonto, Shine). Tarifs préférentiels grâce au groupement.",
    perks: ["Tarifs négociés", "Ouverture en 24h", "Accompagnement"],
    tag: "Partenaire",
  },
  {
    icon: Shield,
    title: "Mutuelle & Prévoyance",
    desc: "Mutuelle santé et prévoyance pour dirigeants — couverture optimisée à coût mutualisé.",
    perks: ["Santé + prévoyance", "Sans questionnaire", "Adapté TNS/SASU"],
    tag: "30% Humain",
  },
  {
    icon: FileText,
    title: "RC Pro",
    desc: "Responsabilité civile professionnelle adaptée à votre activité, négociée pour les membres.",
    perks: ["Devis sous 24h", "Couverture monde", "Sinistre IA"],
    tag: "Partenaire",
  },
  {
    icon: MapPin,
    title: "Adresse de Prestige Paris",
    desc: "Votre siège social au 10 Rue de la Paix, Paris 2e. Une adresse premium qui valorise votre image dirigeante.",
    perks: ["10 Rue de la Paix · Paris 2e", "Réexpédition courrier", "Salle de réunion à la demande"],
    tag: "Service",
  },
  {
    icon: Calculator,
    title: "DAF à la carte",
    desc: "Suivi par un DAF externalisé : reporting mensuel, prévisionnel, optimisation fiscale.",
    perks: ["Reporting mensuel", "Optimisation", "Sur demande"],
    tag: "Service",
  },
  {
    icon: Briefcase,
    title: "Supervision compta",
    desc: "Comptable certifié qui supervise vos exports IA et valide vos déclarations.",
    perks: ["Bilan annuel", "Validation IA", "100% en ligne"],
    tag: "Service",
  },
];

export default function NosServices() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--zayado-cream)" }}>
      <Helmet>
        <title>Nos Services & Mutualisation | Hub Entrepreneur ZAYADO</title>
        <meta name="description" content="Profitez de tarifs négociés sur vos outils partenaires (banque, assurances) et activez vos services à la carte comme la domiciliation à Paris ou le suivi DAF." />
        <meta property="og:title" content="Nos Services & Mutualisation | Hub Entrepreneur ZAYADO" />
        <meta property="og:description" content="Profitez de tarifs négociés sur vos outils partenaires (banque, assurances) et activez vos services à la carte comme la domiciliation à Paris ou le suivi DAF." />
        <link rel="canonical" href="https://zayado.net/nos-services" />
      </Helmet>

      <PublicHeader />
      <main className="flex-1" data-testid="page-nos-services">
        <section className="relative" style={{ background: "var(--zayado-navy-gradient)", color: "#F6F3EE" }}>
          <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] tracking-[0.18em] uppercase font-semibold mb-5"
                 style={{ background: "rgba(255,255,255,0.10)", color: "#F6F3EE", border: "1px solid rgba(255,255,255,0.20)" }}>
              Hub Entrepreneur
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mb-4 max-w-3xl">
              Tout votre <span style={{ color: "#F6F3EE" }}>écosystème</span> entrepreneur, mutualisé.
            </h1>
            <p className="text-lg sm:text-xl opacity-85 max-w-2xl leading-relaxed">
              Banque, mutuelle, RC Pro, domiciliation, DAF, supervision compta : profitez de tarifs négociés et de services à la carte, sans rester seul.
            </p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16 sm:py-20" data-testid="services-grid">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map((s, i) => {
              const Ic = s.icon;
              return (
                <div
                  key={i}
                  data-testid={`service-card-${i}`}
                  className="bg-white rounded-3xl p-7 border border-[var(--zayado-border)] hover:shadow-md transition flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl grid place-items-center shadow-md"
                         style={{
                           background: "linear-gradient(135deg, #1F3B73 0%, #2A4D8F 100%)",
                           color: "#F6F3EE",
                           boxShadow: "0 4px 12px rgba(31, 59, 115, 0.25)",
                         }}>
                      <Ic size={20} />
                    </div>
                    <span className="text-[10.5px] uppercase tracking-[0.18em] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: "var(--zayado-cream)", color: "var(--zayado-navy)" }}>
                      {s.tag}
                    </span>
                  </div>
                  <h2 className="font-display text-xl leading-tight mb-2" style={{ color: "var(--zayado-text)" }}>
                    {s.title}
                  </h2>
                  <p className="text-[14px] opacity-75 leading-relaxed mb-4 flex-1" style={{ color: "var(--zayado-text)" }}>
                    {s.desc}
                  </p>
                  <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--zayado-text)" }}>
                    {s.perks.map((p, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <Check size={14} className="shrink-0 mt-0.5" style={{ color: "var(--zayado-navy)" }} />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 pb-20 text-center" data-testid="services-final-cta">
          <div className="bg-[var(--zayado-navy)] rounded-3xl p-10 sm:p-14" style={{ color: "#F6F3EE" }}>
            <h2 className="font-display text-3xl sm:text-4xl mb-4">
              Démarrez avec votre co-pilote ZAYADO
            </h2>
            <p className="text-base sm:text-lg opacity-85 mb-7 max-w-xl mx-auto">
              Tous nos services sont accessibles dès le plan START. Activez-les depuis votre cockpit MyExtension AI.
            </p>
            <Link to="/myextension-ai"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold transition shadow-lg"
              style={{ background: "#F6F3EE", color: "var(--zayado-navy)" }}
              data-testid="services-cta-start">
              Activer mon compte <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </main>
      <UnifiedFooter />
    </div>
  );
}
