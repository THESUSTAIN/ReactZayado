import React, { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { gamificationApi } from "@/lib/api";

/* Passeport / Gamification (backlog #17) — badge compact. Le palier est
 * calculé côté backend directement depuis le Score Business réel (aucune
 * valeur inventée), et débloque un bonus d'agents IA additif au plan
 * (voir routes/gamification.py pour le détail des paliers). */
export default function PassportBadge() {
  const [state, setState] = useState(null);

  useEffect(() => {
    let alive = true;
    gamificationApi.passport().then((d) => { if (alive) setState(d); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!state) return null;

  return (
    <div style={{
      borderRadius: 14, padding: 18, marginBottom: 16,
      background: "var(--glass-soft)", border: "1px solid var(--glass-border)",
    }} data-testid="passport-badge">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "var(--txt)", fontSize: 13, fontWeight: 700 }}>
        <Award size={15} color="#C9A449" /> Passeport — {state.tier_label}
      </div>
      <p style={{ fontSize: 12, color: "var(--txt-muted)", margin: 0 }}>
        Score Business : {state.score}/100
        {state.bonus_agent_slots > 0 && ` · +${state.bonus_agent_slots} agent${state.bonus_agent_slots > 1 ? "s" : ""} IA débloqué${state.bonus_agent_slots > 1 ? "s" : ""}`}
        {state.next_tier && ` · Prochain palier « ${state.next_tier.label} » à ${state.next_tier.min_score}/100`}
      </p>
    </div>
  );
}
