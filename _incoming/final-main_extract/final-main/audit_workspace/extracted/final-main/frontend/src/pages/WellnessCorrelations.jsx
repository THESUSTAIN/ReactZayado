import React, { useEffect, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { wellnessApi } from "@/lib/api";

const SAGE = "#5DCAA5", CORAL = "#F0808A", GOLD = "#C9A449";

/**
 * #3.1 — Corrélations Cockpit × Bien-être.
 * Relie le score bien-être quotidien à la productivité (minutes de focus).
 * USP Zayado : l'état intérieur expliqué par les résultats business.
 */
export default function WellnessCorrelations() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    wellnessApi.correlations(60).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="glass-card" style={{ marginBottom: 16 }} data-testid="wellness-correlations-loading">
        <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><Loader2 className="animate-spin" size={18} /></div>
      </div>
    );
  }
  if (!data) return null;

  const insufficient = data.status !== "ok";
  const corr = data.correlation ?? 0;
  const positive = corr >= 0.15;
  const negative = corr <= -0.15;
  const accent = negative ? CORAL : positive ? SAGE : GOLD;

  return (
    <div className="glass-card" style={{ marginBottom: 16 }} data-testid="wellness-correlations">
      <div className="card-label" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <Activity size={15} /> Corrélation Bien-être × Productivité
      </div>

      {insufficient ? (
        <p className="muted" style={{ fontSize: 13, margin: 0 }} data-testid="wellness-correlations-empty">
          {data.message}
        </p>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: accent, fontVariantNumeric: "tabular-nums" }}
                    data-testid="wellness-correlations-value">
                {corr > 0 ? "+" : ""}{corr}
              </span>
              <span className="muted" style={{ fontSize: 11 }}>coefficient (-1 à +1)</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: "var(--txt)", margin: 0, lineHeight: 1.5 }}
                 data-testid="wellness-correlations-insight">
                {positive ? <TrendingUp size={14} style={{ color: SAGE, verticalAlign: "middle", marginRight: 4 }} />
                          : negative ? <TrendingDown size={14} style={{ color: CORAL, verticalAlign: "middle", marginRight: 4 }} />
                          : null}
                {data.insight}
              </p>
            </div>
          </div>

          {data.uplift_percent != null && (
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <div style={{ flex: 1, textAlign: "center", padding: "10px 6px", borderRadius: 10, background: "rgba(93,202,165,.10)" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: SAGE }}>{data.avg_focus_minutes_high_wellness ?? "—"} min</div>
                <div className="muted" style={{ fontSize: 11 }}>Jours à haut bien-être</div>
              </div>
              <div style={{ flex: 1, textAlign: "center", padding: "10px 6px", borderRadius: 10, background: "rgba(240,128,138,.10)" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: CORAL }}>{data.avg_focus_minutes_low_wellness ?? "—"} min</div>
                <div className="muted" style={{ fontSize: 11 }}>Jours à bas bien-être</div>
              </div>
            </div>
          )}
          <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
            Basé sur {data.days_collected} jours de check-ins et de sessions de focus.
          </p>
        </>
      )}
    </div>
  );
}
