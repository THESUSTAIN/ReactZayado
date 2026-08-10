import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Rocket, RotateCcw, Loader2 } from "lucide-react";
import { API } from "@/lib/api";

/**
 * Bouton flottant "Démo Investisseur" (bas-gauche).
 * Réservé au compte de démo Thomas et aux admins.
 * Remplit en <1s les cartes du cockpit (Énergie / Score Business / Équilibre + CA)
 * via /api/demo/investor-fill, puis recharge pour que tout s'anime.
 */
export default function InvestorDemoButton({ user }) {
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  const allowed =
    user &&
    (user.email === "thomas@zayado.fr" ||
      ["admin", "super_admin"].includes(user.role));

  useEffect(() => {
    if (!allowed) return;
    axios
      .get(`${API}/demo/investor-status`)
      .then((r) => setActive(!!r.data?.active))
      .catch(() => {});
  }, [allowed]);

  const run = useCallback(
    async (fill) => {
      if (busy) return;
      setBusy(true);
      try {
        await axios.post(`${API}/demo/${fill ? "investor-fill" : "investor-reset"}`);
        // Force le ré-affichage de l'écran "aha" au rechargement
        try { localStorage.removeItem("zayado_inspired_last"); } catch (e) {}
        window.location.href = "/";
      } catch (e) {
        setBusy(false);
      }
    },
    [busy]
  );

  if (!allowed) return null;

  return (
    <div
      style={{ position: "fixed", left: 18, bottom: 300, zIndex: 250, display: "flex", flexDirection: "column", gap: 8 }}
      data-testid="investor-demo-widget"
    >
      <button
        onClick={() => run(true)}
        disabled={busy}
        data-testid="investor-demo-fill-btn"
        title="Peupler le cockpit pour une démo investisseur"
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "linear-gradient(135deg,#F2B93B,#E0A320)", color: "#0F1B3D",
          border: "none", borderRadius: 999, padding: "11px 18px", fontWeight: 700,
          fontSize: 14, cursor: busy ? "wait" : "pointer",
          boxShadow: "0 8px 24px rgba(242,185,59,.35)", transition: "transform .15s, box-shadow .15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
      >
        {busy ? <Loader2 size={16} className="spin" /> : <Rocket size={16} />}
        Démo Investisseur
      </button>
      {active && !busy && (
        <button
          onClick={() => run(false)}
          data-testid="investor-demo-reset-btn"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(15,27,61,.6)", color: "#cbd5e1",
            border: "1px solid rgba(255,255,255,.12)", borderRadius: 999,
            padding: "7px 14px", fontWeight: 600, fontSize: 12.5, cursor: "pointer",
            backdropFilter: "blur(8px)",
          }}
        >
          <RotateCcw size={13} /> Réinitialiser la démo
        </button>
      )}
    </div>
  );
}
