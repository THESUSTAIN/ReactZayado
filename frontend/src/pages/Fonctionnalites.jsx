import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Compass, TrendingUp, ListChecks, HeartPulse, ShieldCheck, Check, ArrowRight } from "lucide-react";
import LpShell from "../components/LpShell";

const MODULES = [
  { Icon: MessageCircle, name: "Hub IA — Copilote", tag: "IA", desc: "Un assistant qui veille, priorise et exécute vos actions du jour.", points: ["Point du jour automatique", "Cartes de décision (approuver / reporter)", "Réponses IA en temps réel"] },
  { Icon: Compass, name: "Vision", tag: "Stratégie", desc: "Votre cap devient des axes, jalons et décisions clairs.", points: ["Trajectoire vision → décision → action", "Jalons et alignement", "Toujours relié au pourquoi"] },
  { Icon: TrendingUp, name: "Croissance", tag: "Revenus", desc: "Pipeline de prospection, relances et suivi du chiffre d'affaires.", points: ["Prospects & séquences", "Relances au bon moment", "Suivi du CA"] },
  { Icon: ListChecks, name: "Mon Mouvement", tag: "Exécution", desc: "Vos missions exécutées, reliées à votre vision.", points: ["Missions & engagements", "Capacité du jour", "Preuves d'exécution"] },
  { Icon: HeartPulse, name: "Bien-être", tag: "Équilibre", desc: "Votre énergie et votre focus suivis pour décider quand agir.", points: ["Check-in quotidien", "Tendance d'énergie", "Rituels"] },
  { Icon: ShieldCheck, name: "DAF IA", tag: "Finance", desc: "Trésorerie, validations de paiements et arbitrages financiers.", points: ["Vue trésorerie", "Validations sécurisées", "Arbitrages reliés à la Vision"] },
];

export default function Fonctionnalites() {
  return (
    <LpShell title="Fonctionnalités — MyExtension Business">
      <section className="lp-hero" style={{ paddingBottom: 32 }}>
        <div className="lp-container lp-hero-inner">
          <span className="lp-eyebrow"><span className="lp-dot" /> Le pilotage complet</span>
          <h1 className="lp-h1">Tout ce qu'il faut pour <span className="lp-gold">avancer</span></h1>
          <p className="lp-lead">Six modules connectés, un seul objectif : transformer votre intention en résultat, chaque jour.</p>
          <div className="lp-hero-cta"><Link to="/login" className="lp-btn lp-btn-gold lp-btn-lg">Commencer gratuitement <ArrowRight size={18} /></Link><Link to="/demo" className="lp-btn lp-btn-outline lp-btn-lg">Voir la démo</Link></div>
        </div>
        <div className="lp-hero-glow" aria-hidden />
      </section>

      <section className="lp-section" style={{ paddingTop: 20 }}>
        <div className="lp-container">
          {MODULES.map((m, i) => (
            <div className={`lp-feature-row ${i % 2 ? "is-reverse" : ""}`} key={m.name} data-testid={`feature-row-${m.name}`}>
              <div className="lp-feature-copy">
                <div className="lp-card-icon"><m.Icon size={20} /></div>
                <span className="lp-feature-tag">{m.tag}</span>
                <h2 className="lp-h2">{m.name}</h2>
                <p className="lp-sub">{m.desc}</p>
                <ul className="lp-feature-list">{m.points.map((p) => <li key={p}><Check size={15} className="lp-gold" /> {p}</li>)}</ul>
              </div>
              <div className="lp-capture" aria-hidden>
                <div className="lp-capture-bar"><span /><span /><span /></div>
                <div className="lp-capture-body"><m.Icon size={40} /><p>{m.name}</p></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-final">
        <div className="lp-container lp-final-inner">
          <h2 className="lp-h2">Prêt à tout piloter au même endroit ?</h2>
          <p className="lp-sub">Commencez gratuitement en moins d'une minute.</p>
          <Link to="/login" className="lp-btn lp-btn-gold lp-btn-lg">Commencer maintenant <ArrowRight size={18} /></Link>
        </div>
      </section>
    </LpShell>
  );
}
