import React from "react";
import { Sparkles, ArrowRight, Target, CheckCircle2, Circle, TrendingUp } from "lucide-react";

/**
 * GrowthInsightPanel — panneau sticky à gauche du hub Croissance.
 * 3 blocs empilés qui répondent à "quoi faire aujourd'hui ?" avant de
 * plonger dans les tables/kanban. Signature Zayado : décision d'abord.
 *
 * Blocs :
 *   1. Insight IA         — l'action prioritaire du moment (dérivée du dashboard)
 *   2. Tâches de croissance — 3-5 items à cocher (relance, RDV, envoi)
 *   3. Suivi des objectifs — 2 barres : CA potentiel + Clients signés
 *
 * Fallbacks : compte neuf → invitations à connecter les sources / ajouter
 * un premier prospect. Jamais de bloc vide silencieux.
 */
export default function GrowthInsightPanel({ data, onOpenPipeline, onOpenLeads }) {
  const dashboard = data?.dashboard;
  const totals = dashboard?.totals || {};
  const hot = Number(totals.hot ?? 0);
  const total = Number(totals.total ?? 0);
  const signed = Number(totals.signed ?? 0);
  const objective = Number(totals.objective_leads ?? 20);
  const revenuePotential = Number(totals.revenue_potential ?? 0);
  const revenueObjective = Number(totals.revenue_objective ?? 20000);
  const tasks = Array.isArray(dashboard?.growth_tasks) ? dashboard.growth_tasks.slice(0, 5)
    : buildFallbackTasks(hot, total);

  // Insight IA — phrase unique, choisie selon l'état des données
  const insightText = buildInsight(hot, total, signed);

  return (
    <div className="growth-insight-inner">
      {/* Bloc 1 — Insight IA */}
      <div className="growth-insight-block growth-insight-primary" data-testid="growth-insight-ia">
        <div className="growth-insight-header">
          <Sparkles size={14} />
          <span>Insight IA</span>
        </div>
        <p className="growth-insight-headline">{insightText.headline}</p>
        {insightText.sub && (
          <p className="growth-insight-sub">{insightText.sub}</p>
        )}
        {insightText.cta && (
          <button
            type="button"
            onClick={insightText.action === "leads" ? onOpenLeads : onOpenPipeline}
            data-testid="growth-insight-cta"
            className="growth-insight-cta"
          >
            {insightText.cta} <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* Bloc 2 — Tâches de croissance */}
      <div className="growth-insight-block" data-testid="growth-tasks">
        <div className="growth-insight-header">
          <CheckCircle2 size={14} />
          <span>Tâches de croissance</span>
        </div>
        <ul className="growth-insight-tasks">
          {tasks.map((t, i) => (
            <li key={t.id || i} className={`growth-task ${t.priority || ""}`} data-testid={`growth-task-${i}`}>
              <Circle size={12} className="growth-task-check" aria-hidden="true" />
              <div className="growth-task-body">
                <span className="growth-task-title">{t.title}</span>
                {t.deadline && <span className="growth-task-deadline">{t.deadline}</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Bloc 3 — Suivi objectifs */}
      <div className="growth-insight-block" data-testid="growth-objectives">
        <div className="growth-insight-header">
          <Target size={14} />
          <span>Suivi des objectifs</span>
        </div>

        <ProgressLine
          label="CA potentiel"
          value={revenuePotential}
          target={revenueObjective}
          format={(v) => `${Math.round(v).toLocaleString("fr-FR")} €`}
          testid="growth-objective-revenue"
        />
        <ProgressLine
          label="Clients signés"
          value={signed}
          target={objective}
          format={(v) => `${v}`}
          testid="growth-objective-signed"
        />

        <div className="growth-insight-footer">
          <TrendingUp size={12} />
          <span>Objectifs de la période — ajustables dans Paramètres.</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Progress bar réutilisable ─── */
function ProgressLine({ label, value, target, format, testid }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div className="growth-progress" data-testid={testid}>
      <div className="growth-progress-top">
        <span className="growth-progress-label">{label}</span>
        <span className="growth-progress-values">
          <strong>{format(value)}</strong> / {format(target)}
        </span>
      </div>
      <div className="growth-progress-bar">
        <div className="growth-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="growth-progress-pct">{pct}%</div>
    </div>
  );
}

/* ─── Choix de l'insight (rules-based, jamais de LLM ici) ─── */
function buildInsight(hot, total, signed) {
  if (hot >= 3) {
    return {
      headline: `Relance ces ${hot} prospects aujourd'hui — ils ont le plus fort potentiel de conversion.`,
      sub: "Un lead sans relance sous 48h perd 40% de sa probabilité de signer.",
      cta: "Ouvrir le pipeline",
      action: "pipeline",
    };
  }
  if (hot === 1 || hot === 2) {
    return {
      headline: `Une opportunité chaude — relance-la avant la fin de la journée.`,
      sub: "Ouvre la fiche pour voir son historique et démarrer la conversation.",
      cta: "Voir la fiche",
      action: "pipeline",
    };
  }
  if (total > 0 && signed === 0) {
    return {
      headline: "Tes leads sont là — c'est le moment de qualifier les 3 plus chauds.",
      sub: "Sans qualification, un pipeline ne convertit jamais. 5 minutes suffisent.",
      cta: "Qualifier",
      action: "leads",
    };
  }
  return {
    headline: "Prospection au point mort — ajoute 3 sources cette semaine.",
    sub: "LinkedIn, recommandations, événements : choisis-en une, le Coach fait le reste.",
    cta: "Ouvrir le pipeline",
    action: "pipeline",
  };
}

/* ─── Tâches par défaut quand le backend n'en fournit pas ─── */
function buildFallbackTasks(hot, total) {
  if (total === 0) {
    return [
      { id: "t1", title: "Ajouter une source d'acquisition (LinkedIn / event)", priority: "high", deadline: "Cette semaine" },
      { id: "t2", title: "Créer ton premier prospect à partir d'un contact existant", priority: "medium", deadline: null },
      { id: "t3", title: "Rédiger un message de prospection type", priority: "low", deadline: null },
    ];
  }
  const tasks = [];
  if (hot >= 1) tasks.push({ id: "t-hot", title: `Relancer ${hot} prospect${hot > 1 ? "s" : ""} chaud${hot > 1 ? "s" : ""}`, priority: "high", deadline: "Aujourd'hui" });
  tasks.push({ id: "t-nurture", title: "Envoyer un contenu de nurturing à 5 tièdes", priority: "medium", deadline: "Cette semaine" });
  tasks.push({ id: "t-content", title: "Publier un post LinkedIn court (< 300 mots)", priority: "low", deadline: "Vendredi" });
  return tasks;
}
