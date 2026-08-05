import React from "react";
import { MessageCircle, ArrowRight } from "lucide-react";

// Lien communauté — à remplacer par l'URL réelle du Discord / espace TheSustain.
const COMMUNITY_URL = "https://discord.gg/zayado";

export default function CommunityCard() {
  return (
    <div className="glass-card" data-testid="community-card" style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: "rgba(88,101,242,0.15)", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <MessageCircle size={19} style={{ color: "#8b95f5" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--txt)", margin: 0 }}>
            Rejoins la communauté Zayado
          </p>
          <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
            Entraide entre solopreneurs · Espace TheSustain
          </p>
        </div>
      </div>
      <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" data-testid="community-join-btn"
        className="zbtn zbtn-primary" style={{ height: 36, padding: "0 14px", fontSize: 12.5, gap: 6, flexShrink: 0, whiteSpace: "nowrap" }}>
        Rejoindre <ArrowRight size={13} />
      </a>
    </div>
  );
}
