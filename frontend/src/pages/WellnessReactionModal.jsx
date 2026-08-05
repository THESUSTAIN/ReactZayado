import React, { useState, useEffect, useRef } from "react";
import { X, Play, Pause, RotateCcw } from "lucide-react";

const CORAL = "#F0808A", GOLD = "#C9A449", SAGE = "#5DCAA5";
const ICON_BY_TYPE = { breathing: "🧘", movement: "🚶", tip: "🌙", gratitude: "💛", boundary: "🎯", leverage: "⚡" };

function parseMinutes(duration) {
  const m = /(\d+)\s*min/.exec(duration || "");
  return m ? parseInt(m[1], 10) : null;
}

function InlineTimer({ minutes }) {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, secondsLeft]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
      <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 22, fontWeight: 600, color: "var(--txt)" }}>{mm}:{ss}</span>
      <button
        onClick={() => setRunning((r) => !r)}
        className="zbtn"
        style={{ height: 30, width: 30, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {running ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button
        onClick={() => { setRunning(false); setSecondsLeft(minutes * 60); }}
        className="zbtn"
        style={{ height: 30, width: 30, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <RotateCcw size={13} />
      </button>
    </div>
  );
}

/**
 * Modale affichée juste après un check-in dont le score révèle un signal
 * bas (énergie faible, stress élevé...). Réutilise `micro_actions` déjà
 * retournées par POST /wellness/checkin — pas de nouvel appel IA nécessaire,
 * la logique de sélection des actions vit déjà dans get_micro_actions()
 * côté backend (routes/wellness.py).
 */
export default function WellnessReactionModal({ open, onClose, actions = [] }) {
  const [selected, setSelected] = useState(0);
  useEffect(() => { if (open) setSelected(0); }, [open]);

  if (!open || actions.length === 0) return null;
  const current = actions[selected];
  const minutes = parseMinutes(current?.duration);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{ maxWidth: 480, width: "100%", position: "relative" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "var(--txt-muted,#888)" }}>
          <X size={16} />
        </button>
        <p className="card-label" style={{ marginBottom: 4 }}>Un petit signal aujourd'hui</p>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Voici {actions.length > 1 ? "quelques actions courtes" : "une action courte"} pour vous aider maintenant.
        </p>

        {actions.length > 1 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {actions.map((a, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className="zbtn"
                style={{
                  fontSize: 12, height: 28, padding: "0 10px",
                  background: i === selected ? "var(--accent, #C9A449)" : undefined,
                  color: i === selected ? "#101E3D" : undefined,
                }}
              >
                {ICON_BY_TYPE[a.type] || "✦"} {a.title}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: 28 }}>{ICON_BY_TYPE[current.type] || "✦"}</span>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--txt)", margin: "0 0 4px" }}>{current.title}</p>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>{current.desc}</p>
          </div>
        </div>

        {minutes ? <InlineTimer minutes={minutes} /> : (
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Conseil — pas de minuteur pour celui-ci.</p>
        )}

        <button onClick={onClose} className="zbtn" style={{ marginTop: 18, width: "100%", justifyContent: "center" }}>
          Terminé pour l'instant
        </button>
      </div>
    </div>
  );
}
