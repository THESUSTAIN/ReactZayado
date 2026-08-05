import React from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";

/**
 * DecisionBanner — signature Zayado.
 * Chaque page commence par UNE décision, pas par des données.
 * Le composant lit les vraies métriques passées en `data` et renvoie
 * la phrase la plus utile aujourd'hui. Fallbacks doux quand la donnée
 * est absente (compte neuf) : on invite à compléter l'info manquante
 * plutôt que d'afficher une phrase vide de sens.
 *
 * Usage :
 *   <DecisionBanner page="cockpit" data={dashboardData} onAction={() => nav("/bureau")} />
 *
 * Pages supportées : cockpit, vision, croissance, pilotage, bienetre.
 */
export default function DecisionBanner({ page, data = {}, onAction, actionLabel }) {
  const decision = buildDecision(page, data);
  if (!decision) return null;

  return (
    <motion.div
      data-testid={`decision-banner-${page}`}
      className="decision-banner"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="decision-banner-icon" aria-hidden="true">
        <Sparkles size={16} />
      </div>
      <div className="decision-banner-text">
        <p className="decision-banner-headline" data-testid={`decision-headline-${page}`}>
          {decision.headline}
        </p>
        {decision.sub && (
          <p className="decision-banner-sub" data-testid={`decision-sub-${page}`}>
            {decision.sub}
          </p>
        )}
      </div>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          data-testid={`decision-cta-${page}`}
          className="decision-banner-cta"
          aria-label={actionLabel || decision.cta || "Voir"}
        >
          {actionLabel || decision.cta || "Voir"} <ArrowRight size={14} />
        </button>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Logique de décision par page.
   Règles simples, aucune LLM appelée ici : la vraie IA du Coach
   parle depuis CoPiloteCard. Ici on veut UNE phrase actionnable
   fiable, lue depuis les données déjà chargées, en < 20 lignes.
   ───────────────────────────────────────────────────────────── */
function buildDecision(page, d) {
  switch (page) {
    case "cockpit":     return decisionCockpit(d);
    case "vision":      return decisionVision(d);
    case "croissance":  return decisionCroissance(d);
    case "pilotage":    return decisionPilotage(d);
    case "bienetre":    return decisionBienEtre(d);
    default:            return null;
  }
}

function decisionCockpit(d) {
  const prio = Array.isArray(d.priorities) ? d.priorities.filter(p => p && !p.done).slice(0, 3) : [];
  if (prio.length >= 1) {
    return {
      headline: `Aujourd'hui, voici ${prio.length === 1 ? "l'action" : `les ${prio.length} actions`} qui ${prio.length === 1 ? "aura" : "auront"} le plus d'impact sur ton entreprise.`,
      sub: prio.length > 0 ? prio.map(p => p.label || p.title || "Action").slice(0, 3).join(" · ") : null,
      cta: "Commencer",
    };
  }
  // Fallback : pas de priorités remontées → invitation à en définir une
  const treasury = Number(d.treasury_30d || 0);
  const prospects = Number(d.prospects_to_relaunch || d.prospects_total || 0);
  if (treasury > 0 || prospects > 0) {
    return {
      headline: "Aujourd'hui, voici les 3 leviers qui feront la différence sur ton entreprise.",
      sub: "Ouvre le Co-pilote — il vient de préparer tes actions du jour.",
      cta: "Voir le Co-pilote",
    };
  }
  return {
    headline: "Bienvenue — définissons ensemble ta première décision du jour.",
    sub: "Commence par compléter ta Vision : c'est la boussole que tout le reste suit.",
    cta: "Ouvrir Vision",
  };
}

function decisionVision(d) {
  const align = Number(d.vision?.alignment_percent ?? d.alignment_score ?? 0);
  const nextStep = d.vision?.next_step || null;
  if (align >= 70) {
    return {
      headline: "Tu es aligné à " + align + "% de ton objectif 90 jours — reste focus sur les 3 piliers en tête.",
      sub: nextStep || "Ton prochain jalon est visible dans le Vision Board.",
      cta: "Voir la trajectoire",
    };
  }
  if (align > 0) {
    return {
      headline: "Tu t'éloignes de ton objectif 90 jours — voici pourquoi et comment corriger.",
      sub: nextStep || `Alignement actuel : ${align}%. Un pilier au moins n'a pas bougé depuis 2 semaines.`,
      cta: "Corriger",
    };
  }
  return {
    headline: "Définis ta vision 90 jours pour que le Cockpit devienne vraiment le tien.",
    sub: "3 champs suffisent : mission, objectif principal, pilier fort. Le reste peut attendre.",
    cta: "Définir ma vision",
  };
}

function decisionCroissance(d) {
  const hot = Number(d.prospects_to_relaunch ?? d.developpement?.prospects ?? 0);
  const opps = Array.isArray(d.hot_prospects) ? d.hot_prospects.slice(0, 5) : [];
  if (hot >= 3 || opps.length >= 3) {
    const n = Math.max(hot, opps.length);
    return {
      headline: `Relance ces ${Math.min(n, 5)} prospects aujourd'hui — ils ont le plus fort potentiel de conversion.`,
      sub: opps.length > 0
        ? opps.map(p => p.name || p.label).filter(Boolean).slice(0, 5).join(" · ")
        : "Ouvre le pipeline pour voir les scores et démarrer les relances.",
      cta: "Ouvrir le pipeline",
    };
  }
  if (hot === 1 || hot === 2) {
    return {
      headline: `Une opportunité chaude t'attend — relance-la avant la fin de la journée.`,
      sub: "Un lead sans relance sous 48h perd 40% de sa probabilité de signer.",
      cta: "Voir la fiche",
    };
  }
  return {
    headline: "Prospection au point mort — ajoute 3 sources cette semaine pour relancer le pipeline.",
    sub: "LinkedIn, recommandations, événements : choisis-en une, le Coach fait le reste.",
    cta: "Ouvrir les sources",
  };
}

function decisionPilotage(d) {
  const runway = Number(d.treasury_runway_days ?? d.pilotage?.runway_days ?? 0);
  const ca = Number(d.ca_month ?? d.pilotage?.ca_month_eur ?? 0);
  const obj = Number(d.ca_objective ?? d.pilotage?.objective_eur ?? 0);
  if (runway > 0 && runway <= 30) {
    return {
      headline: `Ta trésorerie tient ${runway} jours — décide cette semaine quelles dépenses reporter et quels devis accélérer.`,
      sub: "Le seuil critique est franchi. Ouvre le simulateur pour tester 2 scénarios.",
      cta: "Simuler",
    };
  }
  if (runway > 30) {
    return {
      headline: `Ta trésorerie reste saine pendant ${runway} jours — voici les décisions à anticiper.`,
      sub: obj > 0 ? `CA du mois : ${Math.round(ca)}€ / ${Math.round(obj)}€ (${Math.round((ca / obj) * 100)}%).` : "Prépare le prochain trimestre pendant que la marge te le permet.",
      cta: "Voir les alertes",
    };
  }
  if (ca > 0) {
    return {
      headline: obj > 0
        ? `Tu es à ${Math.round((ca / obj) * 100)}% de ton objectif de CA ce mois — accélère les 2 devis chauds.`
        : `Ton CA du mois est de ${Math.round(ca)}€ — fixe un objectif pour piloter vraiment.`,
      sub: "Le pilotage sans objectif, c'est de la comptabilité. Fixe un cap.",
      cta: obj > 0 ? "Voir les devis" : "Fixer l'objectif",
    };
  }
  return {
    headline: "Ajoute ta première entrée financière pour que Pilotage te parle vraiment.",
    sub: "Un devis, une facture, une charge — 30 secondes et le Cockpit prend vie.",
    cta: "Ajouter une entrée",
  };
}

function decisionBienEtre(d) {
  const score = d.bien_etre_score ?? d.energy_today ?? d.wellness?.score;
  const trend = d.energy_trend_days ?? d.wellness?.trend_days;
  if (typeof score === "number" && score < 45) {
    return {
      headline: `Ton niveau d'énergie baisse depuis ${trend || 4} jours — allège ton planning cet après-midi.`,
      sub: "Reporte 2 tâches à demain et bloque 20 minutes pour toi. Ton corps te remerciera.",
      cta: "Voir mes ajustements",
    };
  }
  if (typeof score === "number" && score >= 70) {
    return {
      headline: `Ton énergie est haute (${Math.round(score)}%) — profite-en pour attaquer ta tâche la plus difficile.`,
      sub: "Les décisions stratégiques prises en pleine forme valent 3x mieux que celles prises fatigué.",
      cta: "Ouvrir mes priorités",
    };
  }
  if (typeof score === "number") {
    return {
      headline: `Ton bien-être est stable (${Math.round(score)}%) — maintiens ton rythme, pas de changement à forcer.`,
      sub: "Fais ton check-in du soir pour affiner l'analyse de demain.",
      cta: "Check-in du soir",
    };
  }
  return {
    headline: "Fais ton check-in du matin en 30 secondes — c'est ce qui rend Zayado vraiment utile.",
    sub: "Sans mesure quotidienne, ni ton corps ni ton business ne peuvent être pilotés finement.",
    cta: "Check-in",
  };
}
