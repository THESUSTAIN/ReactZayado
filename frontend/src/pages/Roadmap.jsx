import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Circle, Sparkles } from "lucide-react";
import axios from "axios";
import { API } from "@/lib/api";

// Feuille de route de secours si /api/roadmap n'est pas encore branché côté backend.
const FALLBACK_ROADMAP = {
  shipped: [
    { title: "Vision Board IA avec score d'alignement", date: "Juin 2026" },
    { title: "Co-pilote avec mémoire longue", date: "Mai 2026" },
    { title: "Export Vision Book PDF", date: "Avril 2026" },
  ],
  in_progress: [
    { title: "Publication directe sur LinkedIn / Twitter depuis le Cockpit", eta: "Q3 2026" },
    { title: "Gestures mobiles natives (swipe entre modules)", eta: "Q3 2026" },
    { title: "Communauté Zayado (Discord + espace TheSustain)", eta: "Q3 2026" },
  ],
  planned: [
    { title: "Application mobile native (iOS / Android)" },
    { title: "Marketplace de templates communautaires" },
    { title: "Intégration comptable automatisée" },
  ],
};

function Column({ title, Icon, color, children }) {
  return (
    <div className="glass-card" style={{ flex: 1, minWidth: 260 }}>
      <div className="card-label" style={{ color }}><Icon size={14} /> {title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        {children}
      </div>
    </div>
  );
}

function RoadmapItem({ title, sub }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--glass-soft)", border: "1px solid var(--glass-border)" }}>
      <p style={{ fontSize: 13.5, color: "var(--txt)", margin: 0 }}>{title}</p>
      {sub && <p className="muted" style={{ fontSize: 11.5, margin: "3px 0 0" }}>{sub}</p>}
    </div>
  );
}

// Vote léger côté client (localStorage) — pas d'endpoint backend dédié pour l'instant.
// Clé stable basée sur le titre de la fonctionnalité (pas d'id unique côté data).
function RoadmapVoteItem({ title }) {
  const storageKey = `zayado_roadmap_vote_${title.slice(0, 40)}`;
  const [voted, setVoted] = useState(() => localStorage.getItem(storageKey) === "1");
  // Pas de faux compteur "preuve sociale" : on n'affiche que le vote réel de l'utilisateur.
  const [count, setCount] = useState(() => (localStorage.getItem(storageKey) === "1" ? 1 : 0));

  const vote = () => {
    if (voted) return;
    localStorage.setItem(storageKey, "1");
    setVoted(true);
    setCount((c) => c + 1);
  };

  return (
    <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--glass-soft)", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }} data-testid="roadmap-vote-item">
      <p style={{ fontSize: 13.5, color: "var(--txt)", margin: 0 }}>{title}</p>
      <button onClick={vote} disabled={voted}
        style={{
          flexShrink: 0, display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
          padding: "5px 10px", borderRadius: 20, border: `1px solid ${voted ? "rgba(201,164,73,0.5)" : "var(--glass-border)"}`,
          background: voted ? "rgba(201,164,73,0.14)" : "transparent", color: voted ? "#C9A449" : "var(--muted)",
          cursor: voted ? "default" : "pointer",
        }} data-testid="roadmap-vote-btn">
        ▲ {count}
      </button>
    </div>
  );
}

export default function Roadmap() {
  const navigate = useNavigate();
  const [data, setData] = useState(FALLBACK_ROADMAP);

  useEffect(() => {
    // Route backend attendue : GET /api/roadmap -> { shipped: [], in_progress: [], planned: [] }
    axios.get(`${API}/roadmap`).then((res) => { if (res.data) setData(res.data); }).catch(() => {});
  }, []);

  return (
    <div className="content-wrapper" data-testid="roadmap-page">
      <button onClick={() => navigate(-1)} className="zbtn" style={{ height: 36, gap: 6, marginBottom: 16 }} data-testid="roadmap-back">
        <ArrowLeft size={14} /> Retour
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--txt)", margin: "0 0 6px" }}>Roadmap Zayado</h1>
      <p className="muted" style={{ fontSize: 13.5, margin: "0 0 24px", lineHeight: 1.6 }}>
        Ce qu'on construit, en toute transparence. Une idée, un besoin ? Partage-le dans la communauté.
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }} data-testid="roadmap-columns">
        <div style={{ flex: 1, minWidth: 260 }} data-testid="roadmap-shipped">
          <Column title="Livré" Icon={CheckCircle2} color="#4CAF7C">
            {data.shipped.map((s, i) => <RoadmapItem key={i} title={s.title} sub={s.date} />)}
          </Column>
        </div>
        <div style={{ flex: 1, minWidth: 260 }} data-testid="roadmap-in-progress">
          <Column title="En cours" Icon={Loader2} color="#C9A449">
            {data.in_progress.map((s, i) => <RoadmapItem key={i} title={s.title} sub={s.eta} />)}
          </Column>
        </div>
        <div style={{ flex: 1, minWidth: 260 }} data-testid="roadmap-planned">
          <Column title="Envisagé" Icon={Circle} color="var(--muted)">
            {data.planned.map((s, i) => <RoadmapVoteItem key={i} title={s.title} />)}
          </Column>
        </div>
      </div>

      <div className="glass-card" style={{ marginTop: 20, textAlign: "center" }}>
        <Sparkles size={18} style={{ color: "#C9A449", marginBottom: 6 }} />
        <p style={{ fontSize: 13.5, color: "var(--txt)", margin: 0 }}>Une suggestion de fonctionnalité ?</p>
        <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>Partage-la dans la communauté Zayado — les idées les plus demandées passent en priorité.</p>
      </div>
    </div>
  );
}
