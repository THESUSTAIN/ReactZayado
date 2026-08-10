import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { visionCardsApi } from "@/lib/api";

/* Vue publique en lecture seule d'un board partagé (backlog #23).
 * Rendu volontairement simple — pas d'édition, pas de drag, pas de commentaires,
 * pas d'export PDF/image (limites assumées, cf. suivi de tâches). Réutilise le
 * même vocabulaire visuel de carte que le Canvas (postit/forme/image/carte
 * agrégée), en JSX indépendant de CanvasTab pour ne dépendre d'aucun état
 * d'édition. */
export default function VisionPublic() {
  const { slug } = useParams();
  const [state, setState] = useState({ loading: true, error: null, cards: [] });

  useEffect(() => {
    let alive = true;
    visionCardsApi.getPublicBoard(slug)
      .then((d) => { if (alive) setState({ loading: false, error: null, cards: d.cards || [] }); })
      .catch(() => { if (alive) setState({ loading: false, error: "not_found", cards: [] }); });
    return () => { alive = false; };
  }, [slug]);

  if (state.loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#FAF8F3" }}>
        <Loader2 className="animate-spin" color="#1A3A6E" size={28} />
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "#FAF8F3", padding: 24, textAlign: "center" }}>
        <AlertTriangle color="#C9714E" size={28} />
        <p style={{ fontSize: 16, color: "#1A3A6E", fontWeight: 600 }}>Ce board n'est plus partagé</p>
        <p style={{ fontSize: 13, color: "#6b7280", maxWidth: 340 }}>Le lien n'est plus valide, ou la personne a désactivé le partage.</p>
        <Link to="/" style={{ fontSize: 13, color: "#C9A449", fontWeight: 600, marginTop: 8 }}>← Retour à Zayado</Link>
      </div>
    );
  }

  const maxX = Math.max(900, ...state.cards.map((c) => (c.x || 0) + (c.width || 0) + 40));
  const maxY = Math.max(620, ...state.cards.map((c) => (c.y || 0) + (c.height || 0) + 40));

  return (
    <div style={{ minHeight: "100vh", background: "#FAF8F3" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #EFE8D7" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#1A3A6E", fontWeight: 700, fontSize: 14 }}>
          <Sparkles size={16} color="#C9A449" /> Vision Board — partagé
        </div>
        <span style={{ fontSize: 11.5, color: "#9a9a9a" }}>Lecture seule · via Zayado</span>
      </div>

      <div style={{ padding: 24, overflow: "auto" }}>
        <div style={{ position: "relative", width: maxX, height: maxY, margin: "0 auto" }}>
          {state.cards.length === 0 && (
            <p style={{ color: "#9a9a9a", fontSize: 13, textAlign: "center", marginTop: 60 }}>Ce board est vide pour l'instant.</p>
          )}
          {state.cards.map((c, i) => (
            <div key={i} style={{
              position: "absolute", left: c.x, top: c.y, width: c.width, height: c.height,
              transform: `rotate(${c.rotation || 0}deg)`, zIndex: c.z || 0,
            }}>
              {c.card_type === "image" && c.style?.src && (
                <img src={c.style.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
              )}
              {c.card_type === "text" && (
                <div style={{ width: "100%", height: "100%", fontSize: c.style?.font_size || 18, color: c.style?.color || "#1A3A6E", fontFamily: c.style?.font_family, lineHeight: 1.3 }}>
                  {c.manual_content}
                </div>
              )}
              {c.card_type === "shape" && c.style?.shape === "rect" && (
                <div style={{ width: "100%", height: "100%", borderRadius: 8, background: c.style?.fill, border: `2px solid ${c.style?.stroke}` }} />
              )}
              {c.card_type === "shape" && c.style?.shape === "circle" && (
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: c.style?.fill, border: `2px solid ${c.style?.stroke}` }} />
              )}
              {c.live && (
                <div style={{
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  width: "100%", height: "100%", borderRadius: 12, border: "1px solid rgba(26,58,110,0.15)",
                  background: "rgba(255,255,255,0.95)", padding: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9a9a9a" }}>{c.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1A3A6E" }}>{c.value}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{c.sub}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
