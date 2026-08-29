import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Star, ChevronDown, ShieldCheck } from "lucide-react";

const PLANS = [
  { name: "Starter", monthly: 0, desc: "Pour démarrer et tester la méthode.", features: ["Hub IA (limité)", "Vision & priorités", "1 espace de travail"], cta: "Commencer gratuitement", highlight: false },
  { name: "Pro", monthly: 29, desc: "Pour les indépendants qui veulent avancer vite.", features: ["Copilote IA illimité", "Croissance & pipeline", "Bien-être & focus", "Support prioritaire"], cta: "Essayer 14 jours", highlight: true },
  { name: "Business", monthly: 79, desc: "Pour les petites structures ambitieuses.", features: ["Tout Pro", "DAF IA & trésorerie", "Multi-collaborateurs", "Accompagnement dédié"], cta: "Parler à l'équipe", highlight: false },
];

const FAQ = [
  { q: "Puis-je essayer gratuitement ?", a: "Oui. L'offre Starter est gratuite à vie, et l'offre Pro est testable 14 jours sans carte bancaire." },
  { q: "Puis-je changer d'offre à tout moment ?", a: "Absolument. Vous pouvez passer d'une offre à l'autre, mensuel ou annuel, quand vous le souhaitez — sans frais." },
  { q: "Y a-t-il un engagement ?", a: "Aucun engagement. Vous résiliez en un clic depuis vos paramètres, l'accès reste actif jusqu'à la fin de la période payée." },
  { q: "Mes données sont-elles sécurisées ?", a: "Vos données sont chiffrées et ne sont jamais revendues. Vous gardez le contrôle et pouvez tout exporter ou supprimer." },
  { q: "Le paiement annuel est-il vraiment moins cher ?", a: "Oui : en choisissant l'annuel vous économisez l'équivalent de ~2 mois (−20 %) par rapport au mensuel." },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`lp-faq-item ${open ? "is-open" : ""}`} data-testid="pricing-faq-item">
      <button className="lp-faq-q" onClick={() => setOpen((v) => !v)}>
        <span>{q}</span><ChevronDown size={18} className="lp-faq-chevron" />
      </button>
      {open && <p className="lp-faq-a">{a}</p>}
    </div>
  );
}

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  useEffect(() => { document.title = "Tarifs — MyExtension Business"; }, []);

  const priceFor = (m) => {
    if (m === 0) return { value: "0", sub: "/mois" };
    if (annual) return { value: Math.round(m * 0.8), sub: "/mois", note: "facturé annuellement" };
    return { value: m, sub: "/mois" };
  };

  return (
    <div className="lp-root" data-testid="pricing-page">
      {/* NAV */}
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <Link to="/bienvenue" className="lp-brand">
            <img src="/logo-icon.png" alt="MyExtension Business" className="lp-brand-logo" />
            <span className="lp-brand-text">MyExtension <b>Business</b><span className="lp-brand-by">by Zayado</span></span>
          </Link>
          <nav className="lp-nav-links">
            <Link to="/bienvenue">Accueil</Link>
            <Link to="/bienvenue#fonctionnalites">Fonctionnalités</Link>
          </nav>
          <div className="lp-nav-actions">
            <Link to="/login" className="lp-btn lp-btn-ghost" data-testid="pricing-login-btn">Se connecter</Link>
            <Link to="/login" className="lp-btn lp-btn-gold">Essayer gratuitement</Link>
          </div>
        </div>
      </header>

      {/* HEADER */}
      <section className="lp-section" style={{ paddingBottom: 24 }}>
        <div className="lp-section-head">
          <span className="lp-kicker">Tarifs</span>
          <h1 className="lp-h2">Un plan pour chaque étape de votre croissance</h1>
          <p className="lp-sub">Commencez gratuitement. Évoluez quand vous êtes prêt.</p>
        </div>

        {/* TOGGLE mensuel / annuel */}
        <div className="lp-billing-toggle" data-testid="pricing-billing-toggle">
          <button className={!annual ? "is-active" : ""} onClick={() => setAnnual(false)} data-testid="pricing-toggle-monthly">Mensuel</button>
          <button className={annual ? "is-active" : ""} onClick={() => setAnnual(true)} data-testid="pricing-toggle-annual">
            Annuel <span className="lp-save-badge">−20%</span>
          </button>
        </div>

        {/* PLANS */}
        <div className="lp-container">
          <div className="lp-plans" style={{ marginTop: 34 }}>
            {PLANS.map((p) => {
              const pr = priceFor(p.monthly);
              return (
                <article className={`lp-plan ${p.highlight ? "is-featured" : ""}`} key={p.name} data-testid={`pricing-plan-${p.name}`}>
                  {p.highlight && <span className="lp-plan-badge"><Star size={12} /> Populaire</span>}
                  <h3 className="lp-plan-name">{p.name}</h3>
                  <p className="lp-plan-desc">{p.desc}</p>
                  <div className="lp-plan-price"><span className="lp-plan-cur">€</span>{pr.value}<span className="lp-plan-period">{pr.sub}</span></div>
                  <p className="lp-plan-note">{pr.note || "\u00A0"}</p>
                  <ul className="lp-plan-features">
                    {p.features.map((f) => <li key={f}><Check size={15} className="lp-gold" /> {f}</li>)}
                  </ul>
                  <Link to="/login" className={`lp-btn ${p.highlight ? "lp-btn-gold" : "lp-btn-outline"} w-full`}>{p.cta}</Link>
                </article>
              );
            })}
          </div>
          <p className="lp-guarantee"><ShieldCheck size={15} className="lp-gold" /> 14 jours satisfait ou remboursé · sans engagement</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-section lp-section-alt">
        <div className="lp-container" style={{ maxWidth: 760 }}>
          <div className="lp-section-head">
            <span className="lp-kicker">FAQ</span>
            <h2 className="lp-h2">Questions fréquentes</h2>
          </div>
          <div className="lp-faq" data-testid="pricing-faq">
            {FAQ.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="lp-final">
        <div className="lp-container lp-final-inner">
          <h2 className="lp-h2">Prêt à aligner votre business ?</h2>
          <p className="lp-sub">Commencez gratuitement en moins d'une minute.</p>
          <Link to="/login" className="lp-btn lp-btn-gold lp-btn-lg" data-testid="pricing-final-cta">Commencer maintenant <ArrowRight size={18} /></Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-brand">
            <img src="/logo-icon.png" alt="" className="lp-brand-logo" />
            <span className="lp-brand-text">MyExtension <b>Business</b></span>
          </div>
          <p className="lp-footer-copy">© {new Date().getFullYear()} Zayado · Entreprendre avec sens, clarté et équilibre.</p>
          <Link to="/bienvenue" className="lp-footer-link">Retour à l'accueil</Link>
        </div>
      </footer>
    </div>
  );
}
