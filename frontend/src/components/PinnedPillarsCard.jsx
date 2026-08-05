import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { visionExtApi } from "@/lib/api";

const tv = (v) => (typeof v === "object" && v ? (v.fr || v.en || "") : (v || ""));

/**
 * Affiche les piliers stratégiques épinglés depuis le Vision Board
 * (fix #4 — "Objectifs multiples" : l'utilisateur choisit lui-même
 * quel indicateur suivre en live sur le Dashboard, pas que le CA).
 */
export default function PinnedPillarsCard() {
  const [pillars, setPillars] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    visionExtApi.getPillars()
      .then((data) => setPillars(Array.isArray(data) ? data.filter((p) => p.pinned_dashboard) : []))
      .catch(() => setPillars([]));
  }, []);

  if (!pillars || pillars.length === 0) return null;

  return (
    <div className="app-card p-5" data-testid="pinned-pillars-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">
          Ma vision — en direct
        </p>
        <button onClick={() => navigate("/vision-board")} className="text-[11px] font-semibold text-[var(--app-accent)] hover:underline">
          Voir le Vision Board
        </button>
      </div>
      <div className="space-y-3">
        {pillars.map((p) => (
          <div key={p.id}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-[var(--app-text)] font-medium">{tv(p.title)}</span>
              <span className="font-semibold tabular-nums" style={{ color: p.color }}>{p.progress || 0}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--app-surface-2)] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${p.progress || 0}%`, background: p.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
