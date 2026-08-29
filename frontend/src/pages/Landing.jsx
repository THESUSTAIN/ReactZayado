import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, Compass, TrendingUp, ListChecks, HeartPulse, MessageCircle,
  Check, ArrowRight, ShieldCheck, Zap, Menu, X,
} from "lucide-react";

const FEATURES = [
  { Icon: MessageCircle, title: "Hub IA — Copilote", desc: "Un assistant qui veille sur votre activité, prépare vos décisions et exécute les actions du jour.", tag: "IA" },
  { Icon: Compass, title: "Vision", desc: "Transformez votre vision en axes, jalons et décisions claires — sans perdre le pourquoi.", tag: "Stratégie" },
  { Icon: TrendingUp, title: "Croissance", desc: "Pipeline de prospection, relances et suivi du chiffre d'affaires, au bon moment.", tag: "Revenus" },
  { Icon: ListChecks, title: "Mon Mouvement", desc: "Vos missions et engagements exécutés, reliés à votre vision — jamais une simple to-do.", tag: "Exécution" },
  { Icon: HeartPulse, title: "Bien-être", desc: "Votre énergie et votre focus suivis pour décider quand agir et quand souffler.", tag: "Équilibre" },
  { Icon: ShieldCheck, title: "DAF IA", desc: "Trésorerie, validations de paiements et arbitrages financiers, sous votre contrôle.", tag: "Finance" },
];

const STEPS = [
  { n: "01", title: "Créez votre compte", desc: "Inscription en un clic. Votre espace est prêt en moins d'une minute." },
  { n: "02", title: "Définissez votre vision", desc: "L'IA structure votre vision en priorités concrètes et rentables." },
  { n: "03", title: "Avancez chaque jour", desc: "Le Copilote vous propose la prochaine action qui compte vraiment." },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { document.title = "MyExtension Business — Votre business, aligné. Chaque jour."; }, []);
  return (
    <div className="lp-root" data-testid="landing-page">
      {/* NAV */}
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <Link to="/bienvenue" className="lp-brand" data-testid="landing-brand">
            <img src="/logo-icon.png" alt="MyExtension Business" className="lp-brand-logo" />
            <span className="lp-brand-text">MyExtension <b>Business</b><span className="lp-brand-by">by Zayado</span></span>
          </Link>
          <nav className="lp-nav-links">
            <Link to="/fonctionnalites">Fonctionnalités</Link>
            <Link to="/copilote-agent-ia">Copilote IA</Link>
            <Link to="/demo">Démo</Link>
            <Link to="/tarifs">Tarifs</Link>
          </nav>
          <div className="lp-nav-actions">
            <Link to="/login" className="lp-btn lp-btn-ghost" data-testid="landing-login-btn">Se connecter</Link>
            <Link to="/login" className="lp-btn lp-btn-gold" data-testid="landing-signup-btn">Essayer gratuitement</Link>
          </div>
          <button className="lp-burger" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <div className="lp-mobile-menu" data-testid="landing-mobile-menu">
            <a href="#fonctionnalites" onClick={() => setMenuOpen(false)}>Fonctionnalités</a>
            <Link to="/copilote-agent-ia" onClick={() => setMenuOpen(false)}>Copilote IA</Link>
            <Link to="/demo" onClick={() => setMenuOpen(false)}>Démo</Link>
            <Link to="/tarifs" onClick={() => setMenuOpen(false)}>Tarifs</Link>
            <Link to="/login" className="lp-btn lp-btn-gold w-full">Essayer gratuitement</Link>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-container lp-hero-inner">
          <span className="lp-eyebrow" data-testid="landing-eyebrow"><span className="lp-dot" /> Nouveau · Copilote IA</span>
          <h1 className="lp-h1">Votre business, <span className="lp-gold">aligné</span>.<br />Chaque jour.</h1>
          <p className="lp-lead">MyExtension Business transforme votre vision en décisions concrètes et rentables. Un copilote IA qui priorise, exécute et veille — pour que vous avanciez sur ce qui compte vraiment.</p>
          <div className="lp-hero-cta">
            <Link to="/login" className="lp-btn lp-btn-gold lp-btn-lg" data-testid="landing-hero-cta">Commencer gratuitement <ArrowRight size={18} /></Link>
            <a href="#fonctionnalites" className="lp-btn lp-btn-outline lp-btn-lg">Découvrir</a>
          </div>
          <p className="lp-hero-note"><Check size={14} className="lp-gold" /> Sans carte bancaire · <Check size={14} className="lp-gold" /> Prêt en 1 minute</p>
        </div>
        <div className="lp-hero-glow" aria-hidden />
      </section>

      {/* STATS */}
      <section className="lp-stats">
        <div className="lp-container lp-stats-grid">
          {[["+38%", "de décisions tenues"], ["-6h", "de charge mentale / semaine"], ["3x", "plus de clarté au quotidien"], ["1", "copilote toujours à vos côtés"]].map(([v, l]) => (
            <div className="lp-stat" key={l}><strong>{v}</strong><span>{l}</span></div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="fonctionnalites" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-kicker">Fonctionnalités</span>
            <h2 className="lp-h2">Tout votre pilotage, dans un seul espace</h2>
            <p className="lp-sub">Chaque module est pensé pour convertir votre intention en résultat.</p>
          </div>
          <div className="lp-features">
            {FEATURES.map(({ Icon, title, desc, tag }) => (
              <article className="lp-card" key={title} data-testid={`landing-feature-${title}`}>
                <div className="lp-card-icon"><Icon size={20} /></div>
                <div className="lp-card-tag">{tag}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
                <Link to="/login" className="lp-card-link">En savoir plus <ArrowRight size={14} /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section id="etapes" className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-kicker">Comment ça marche</span>
            <h2 className="lp-h2">De l'intention au résultat, en 3 étapes</h2>
          </div>
          <div className="lp-steps">
            {STEPS.map((s) => (
              <div className="lp-step" key={s.n}>
                <span className="lp-step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="lp-steps-cta">
            <Link to="/login" className="lp-btn lp-btn-gold lp-btn-lg">Créer mon espace <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="lp-section">
        <div className="lp-container lp-final-inner" style={{ textAlign: "center" }}>
          <span className="lp-kicker">Tarifs</span>
          <h2 className="lp-h2">Des offres simples, dès 0€</h2>
          <p className="lp-sub">Commencez gratuitement. Évoluez quand vous êtes prêt.</p>
          <Link to="/tarifs" className="lp-btn lp-btn-gold lp-btn-lg" data-testid="landing-see-pricing" style={{ marginTop: 24 }}>Voir les tarifs <ArrowRight size={18} /></Link>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="lp-section lp-section-alt">
        <div className="lp-container lp-quote-wrap">
          <Zap size={22} className="lp-gold" />
          <blockquote className="lp-quote">« Je ne subis plus mes journées. Le Copilote me dit exactement quoi faire pour avancer — et mon chiffre d'affaires suit. »</blockquote>
          <div className="lp-quote-author"><span className="lp-quote-avatar">A</span><div><strong>Alexandre M.</strong><small>Fondateur, studio indépendant</small></div></div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="lp-final">
        <div className="lp-container lp-final-inner">
          <h2 className="lp-h2">Prêt à aligner votre business ?</h2>
          <p className="lp-sub">Rejoignez les indépendants qui avancent avec clarté, sens et équilibre.</p>
          <Link to="/login" className="lp-btn lp-btn-gold lp-btn-lg" data-testid="landing-final-cta">Commencer maintenant <ArrowRight size={18} /></Link>
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
          <Link to="/login" className="lp-footer-link">Se connecter</Link>
        </div>
      </footer>
    </div>
  );
}
