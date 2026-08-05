import React, { useEffect, useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { wellnessApi } from "@/lib/api";

const CORAL = "#F0808A", GOLD = "#C9A449", SAGE = "#5DCAA5";

function colorForScore(score) {
  if (score == null) return "rgba(255,255,255,.06)"; // pas de check-in ce jour-là
  if (score >= 70) return SAGE;
  if (score >= 45) return GOLD;
  return CORAL;
}

/**
 * Year in Pixels — grille 365 jours (52 semaines x 7), une case par jour,
 * colorée selon le score bien-être du jour. Inspiré Daylio (ticket #3.3).
 */
export default function YearInPixels() {
  const [loading, setLoading] = useState(true);
  const [byDate, setByDate] = useState({});
  const [hover, setHover] = useState(null);

  useEffect(() => {
    wellnessApi.history(365)
      .then((res) => {
        const map = {};
        (res.checkins || []).forEach((c) => {
          const day = (c.date || "").slice(0, 10);
          if (day) map[day] = c;
        });
        setByDate(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const days = useMemo(() => {
    const arr = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      arr.push({ key, checkin: byDate[key] || null });
    }
    // Aligne le début de grille sur un lundi pour des colonnes de 7 jours propres
    const firstDow = (new Date(arr[0].key).getDay() + 6) % 7; // 0=lundi
    const padding = Array.from({ length: firstDow }, () => ({ key: null, checkin: null }));
    return [...padding, ...arr];
  }, [byDate]);

  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < days.length; i += 7) w.push(days.slice(i, i + 7));
    return w;
  }, [days]);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Loader2 className="animate-spin" size={18} /></div>;
  }

  return (
    <div className="glass-card" style={{ marginBottom: 16 }} data-testid="year-in-pixels">
      <div className="card-label" style={{ marginBottom: 12 }}>Year in Pixels · 365 derniers jours</div>
      <div style={{ display: "flex", gap: 3, overflowX: "auto", paddingBottom: 4 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {week.map((d, di) => (
              <div
                key={di}
                onMouseEnter={() => d.key && setHover(d)}
                onMouseLeave={() => setHover(null)}
                title={d.key && d.checkin ? `${d.key} · score ${d.checkin.score}/100` : d.key || ""}
                style={{
                  width: 11, height: 11, borderRadius: 2,
                  background: d.key ? colorForScore(d.checkin?.score) : "transparent",
                  cursor: d.checkin ? "pointer" : "default",
                }}
              />
            ))}
          </div>
        ))}
      </div>
      {hover?.checkin && (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--txt-muted, #888)" }}>
          <strong>{hover.key}</strong> — score {hover.checkin.score}/100 · énergie {hover.checkin.energy}/5 · stress {hover.checkin.stress}/5
        </div>
      )}
      <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 11, color: "var(--txt-muted, #888)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: CORAL, display: "inline-block" }} /> Bas</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: GOLD, display: "inline-block" }} /> Moyen</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: SAGE, display: "inline-block" }} /> Bon</span>
      </div>
    </div>
  );
}
