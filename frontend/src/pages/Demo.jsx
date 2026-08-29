import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PlayCircle } from "lucide-react";
import LpShell from "../components/LpShell";
import LiveCopiloteDemo from "../components/LiveCopiloteDemo";

const STEPS = [
  { n: "01", t: "Posez une question", d: "Demandez au copilote une action, un résumé ou un conseil." },
  { n: "02", t: "L'IA analyse", d: "Il croise votre contexte business et propose la meilleure réponse." },
  { n: "03", t: "Vous décidez", d: "Approuvez, reportez ou lancez l'action — vous gardez le contrôle." },
];

export default function Demo() {
  return (
    <LpShell title="Démo — MyExtension Business">
      <section className="lp-hero" style={{ paddingBottom: 20 }}>
        <div className="lp-container lp-hero-inner">
          <span className="lp-eyebrow"><span className="lp-dot" /> Démo en direct · IA réelle</span>
          <h1 className="lp-h1">Essayez le <span className="lp-gold">Copilote</span> maintenant</h1>
          <p className="lp-lead">Aucune inscription requise pour tester. Posez une vraie question, obtenez une vraie réponse de l'IA.</p>
        </div>
        <div className="lp-hero-glow" aria-hidden />
      </section>

      <section className="lp-section" style={{ paddingTop: 8 }}>
        <div className="lp-container" style={{ maxWidth: 720 }}>
          <LiveCopiloteDemo />
        </div>
      </section>

      <section className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-head"><span className="lp-kicker">Comment ça marche</span><h2 className="lp-h2">Simple, guidé, sous contrôle</h2></div>
          <div className="lp-steps">{STEPS.map((s) => <div className="lp-step" key={s.n}><span className="lp-step-n">{s.n}</span><h3>{s.t}</h3><p>{s.d}</p></div>)}</div>
        </div>
      </section>

      <section className="lp-final">
        <div className="lp-container lp-final-inner">
          <PlayCircle size={26} className="lp-gold" />
          <h2 className="lp-h2">Envie d'aller plus loin ?</h2>
          <p className="lp-sub">Créez votre espace et laissez le copilote piloter votre quotidien.</p>
          <Link to="/login" className="lp-btn lp-btn-gold lp-btn-lg">Commencer gratuitement <ArrowRight size={18} /></Link>
        </div>
      </section>
    </LpShell>
  );
}
