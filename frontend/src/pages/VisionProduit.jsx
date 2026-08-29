import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Compass, Flag, GitBranch } from "lucide-react";
import LpShell from "../components/LpShell";

const FLOW = [
  { Icon: Compass, t: "Vision", d: "Clarifiez votre cap : le pourquoi qui guide toutes vos décisions." },
  { Icon: GitBranch, t: "Décision", d: "Transformez la vision en arbitrages clairs, sans surcharge mentale." },
  { Icon: Flag, t: "Action", d: "Chaque décision devient une mission reliée à votre vision." },
];
const BENEFITS = ["Fini les to-do déconnectées du sens", "Un alignement visible à tout moment", "Des jalons concrets et mesurables", "La vision qui éclaire chaque choix"];

export default function VisionProduit() {
  return (
    <LpShell title="Vision — votre cap, en action · MyExtension Business">
      <section className="lp-hero" style={{ paddingBottom: 24 }}>
        <div className="lp-container lp-hero-inner">
          <span className="lp-eyebrow"><span className="lp-dot" /> Stratégie vivante</span>
          <h1 className="lp-h1">Votre <span className="lp-gold">vision</span>, enfin en mouvement</h1>
          <p className="lp-lead">Ne laissez plus votre vision dans un coin. MyExtension la relie à vos décisions et à vos actions, chaque jour.</p>
          <div className="lp-hero-cta"><Link to="/login" className="lp-btn lp-btn-gold lp-btn-lg">Définir ma vision <ArrowRight size={18} /></Link><Link to="/fonctionnalites" className="lp-btn lp-btn-outline lp-btn-lg">Voir les fonctionnalités</Link></div>
        </div>
        <div className="lp-hero-glow" aria-hidden />
      </section>

      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head"><span className="lp-kicker">La trajectoire</span><h2 className="lp-h2">De la vision à l'action</h2></div>
          <div className="lp-steps">{FLOW.map((f, i) => <div className="lp-step" key={f.t}><span className="lp-step-n">0{i + 1}</span><div className="lp-card-icon" style={{ marginBottom: 10 }}><f.Icon size={20} /></div><h3>{f.t}</h3><p>{f.d}</p></div>)}</div>
        </div>
      </section>

      <section className="lp-section lp-section-alt">
        <div className="lp-container lp-final-inner" style={{ textAlign: "center" }}>
          <span className="lp-kicker">Bénéfices</span>
          <h2 className="lp-h2">Ce que vous y gagnez</h2>
          <ul className="lp-feature-list" style={{ maxWidth: 460, margin: "22px auto 0", textAlign: "left" }}>{BENEFITS.map((b) => <li key={b}><Check size={15} className="lp-gold" /> {b}</li>)}</ul>
          <div style={{ marginTop: 28 }}><Link to="/login" className="lp-btn lp-btn-gold lp-btn-lg">Commencer gratuitement <ArrowRight size={18} /></Link></div>
        </div>
      </section>
    </LpShell>
  );
}
