import React from "react";
import { Brain } from "lucide-react";

// Rend la mémoire de l'IA visible et impressionnante — une "carte d'identité business"
// que l'utilisateur peut consulter et corriger. Utilisée dans Settings (Mémoire IA)
// et à la fin de l'onboarding (écran "Mémoire IA").
export default function BusinessIdentityCard({ vision, prenom }) {
  const fields = [
    { key: "why", label: "Pourquoi" }, { key: "what", label: "Quoi" },
    { key: "who", label: "Pour qui" }, { key: "how", label: "Comment" },
  ];
  const filled = fields.filter((f) => (vision?.[f.key] || "").trim()).length;

  return (
    <div style={{
      borderRadius: 14, padding: 18, marginBottom: 16,
      background: "linear-gradient(135deg, rgba(30,60,130,0.45), rgba(201,164,73,0.12))",
      border: "1px solid rgba(201,164,73,0.35)",
    }} data-testid="business-identity-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#E5C887", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
          <Brain size={14} /> Carte d'identité business
        </div>
        <span className="zchip" style={{ background: "rgba(201,164,73,0.15)", color: "#C9A449", border: "1px solid rgba(201,164,73,0.3)" }}>
          {filled}/{fields.length} complété
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 10 }}>
        {fields.map((f) => (
          <div key={f.key} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px" }}>
            <p style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "#E5C887", margin: "0 0 4px" }}>{f.label}</p>
            <p style={{ fontSize: 13, color: "var(--txt)", margin: 0, lineHeight: 1.4 }}>{vision?.[f.key]?.trim() || "—"}</p>
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 11.5, margin: "12px 0 0" }}>
        C'est ce que ton Co-pilote sait de {prenom ? prenom : "toi"} — corrige-le à tout moment ci-dessous.
      </p>
    </div>
  );
}
