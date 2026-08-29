import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Brain, ShieldCheck, Zap, Clock, Target } from "lucide-react";
import LpShell from "../components/LpShell";
import LiveCopiloteDemo from "../components/LiveCopiloteDemo";

const CAPS = [
  { Icon: Brain, t: "Comprend votre contexte", d: "Il lit votre vision, vos priorités et votre énergie pour décider avec vous." },
  { Icon: Zap, t: "Agit, pas seulement répond", d: "Crée des missions, prépare des relances, propose des décisions concrètes." },
  { Icon: ShieldCheck, t: "Vous gardez le contrôle", d: "Chaque action sensible passe par une validation : approuver ou reporter." },
  { Icon: Clock, t: "Veille pendant la nuit", d: "Il prépare votre point du jour pour démarrer aligné dès le matin." },
  { Icon: Target, t: "Priorise ce qui compte", d: "Fini la to-do infinie : la prochaine action utile, au bon moment." },
];

export default function CopiloteAgent() {
  return (
    <LpShell title="Copilote IA — votre agent business · MyExtension Business">
      <section className="lp-hero" style={{ paddingBottom: 20 }}>
        <div className="lp-container lp-hero-inner">
          <span className="lp-eyebrow"><span className="lp-dot" /> Agent IA</span>
          <h1 className="lp-h1">Un <span className="lp-gold">copilote</span> qui travaille pour vous</h1>
          <p className="lp-lead">Plus qu'un chatbot : un agent qui veille, priorise et exécute — pendant que vous vous concentrez sur l'essentiel.</p>
          <div className="lp-hero-cta"><Link to="/login" className="lp-btn lp-btn-gold lp-btn-lg">Activer mon copilote <ArrowRight size={18} /></Link><Link to="/demo" className="lp-btn lp-btn-outline lp-btn-lg">Tester en direct</Link></div>
        </div>
        <div className="lp-hero-glow" aria-hidden />
      </section>

      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head"><span className="lp-kicker">Capacités</span><h2 className="lp-h2">Ce que votre agent sait faire</h2></div>
          <div className="lp-features">
            {CAPS.map((c) => (
              <article className="lp-card" key={c.t}>
                <div className="lp-card-icon"><c.Icon size={20} /></div>
                <h3>{c.t}</h3><p>{c.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section lp-section-alt">
        <div className="lp-container" style={{ maxWidth: 720 }}>
          <div className="lp-section-head"><span className="lp-kicker">Essai</span><h2 className="lp-h2">Parlez-lui, il répond vraiment</h2></div>
          <LiveCopiloteDemo />
        </div>
      </section>

      <section className="lp-final">
        <div className="lp-container lp-final-inner">
          <h2 className="lp-h2">Votre agent, prêt en 1 minute</h2>
          <p className="lp-sub">Commencez gratuitement, sans carte bancaire.</p>
          <Link to="/login" className="lp-btn lp-btn-gold lp-btn-lg">Activer maintenant <ArrowRight size={18} /></Link>
        </div>
      </section>
    </LpShell>
  );
}
