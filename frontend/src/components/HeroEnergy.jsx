import React from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Briefcase } from "lucide-react";

export default function HeroEnergy({ data, setData }) {
  const navigate = useNavigate();

  // Citation du jour — tolère plusieurs formats backend + fallback si vide (évite l'affichage « » vide).
  const rawCit = data.citation || data.citation_du_jour || {};
  const citation = {
    text: rawCit.text || rawCit.texte || rawCit.quote || data.quote_of_day
      || "Le meilleur moyen de prédire l'avenir, c'est de le créer.",
    author: rawCit.author || rawCit.auteur || "Peter Drucker",
    univers: rawCit.univers || "Univers Sens",
  };

  // Score d'énergie = vrai score bien-être (dashboard) ; sinon état vide honnête.
  const energyScore = data.energy_score ?? data.bien_etre_score ?? data.sante_globale?.score ?? data.sante_globale ?? null;
  const energyLabel = data.energy_label || data.sante_globale?.label
    || (energyScore == null ? "Fais ton check-in" : "Score du jour");

  const businessPct = data.ca_objective
    ? Math.round((data.ca_month / data.ca_objective) * 100)
    : 0;

  // Plus de valeurs inventées : on renvoie vers le vrai check-in bien-être.
  const handleEnergyClick = () => navigate("/bien-etre");

  return (
    <div className="hero-left-block" data-testid="hero-energy">
      <p className="hero-mlk-quote" data-testid="citation-text">
        « {citation.text} »
        {citation.author && (
          <span className="hero-mlk-author" data-testid="citation-author"> — {citation.author}</span>
        )}
      </p>

      <div className="hero-mini-cards">
        <button
          type="button"
          className="hero-mini-card"
          onClick={handleEnergyClick}
          data-testid="hero-energy-btn"
          title="Cliquer pour changer ton check-in énergie"
        >
          <span className="hero-mini-icon" style={{ color: "#C9A449" }}><Zap size={16} strokeWidth={2} /></span>
          <span className="hero-mini-label">Énergie</span>
          <span className="hero-mini-value" data-testid="hero-score">{energyScore != null ? `${energyScore}%` : "—"}</span>
          <span className="hero-mini-sub">{energyLabel}</span>
        </button>

        <div className="hero-mini-card" data-testid="hero-business-card">
          <span className="hero-mini-icon" style={{ color: "#7FB2A6" }}><Briefcase size={16} strokeWidth={2} /></span>
          <span className="hero-mini-label">Business</span>
          <span className="hero-mini-value">{businessPct}%</span>
          <span className="hero-mini-sub">Objectif CA</span>
        </div>
      </div>
    </div>
  );
}
