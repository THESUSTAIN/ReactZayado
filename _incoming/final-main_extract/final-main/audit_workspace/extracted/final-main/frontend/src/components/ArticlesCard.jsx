import React from "react";
import { BookOpen, Clock, ChevronRight } from "lucide-react";

export default function ArticlesCard({ articles = [] }) {
  return (
    <div className="glass-card" data-testid="articles-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="card-label" style={{ marginBottom: 0 }}>
          <BookOpen size={13} />
          À lire · pause inspiration
        </div>
        <button style={{
          background: "transparent", border: "none",
          color: "#C9A449", fontSize: 11, fontWeight: 500,
          cursor: "pointer", fontFamily: "inherit",
        }} data-testid="articles-see-all">Tout voir →</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        {articles.slice(0, 3).map((a, i) => (
          <article key={i} data-testid={`article-${i}`}
                   style={{
                     display: "flex", gap: 10, cursor: "pointer",
                     padding: 6, borderRadius: 10,
                     transition: "background 0.2s ease",
                   }}
                   onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                   onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
            <div style={{
              width: 60, height: 60, borderRadius: 8,
              overflow: "hidden", flexShrink: 0,
              border: "1px solid rgba(255,255,255,0.12)",
            }}>
              <img src={a.img} alt={a.title}
                   style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10, color: "var(--txt-muted)",
                display: "flex", alignItems: "center", gap: 4, marginBottom: 3,
              }}>
                <Clock size={10} /> {a.time}
              </div>
              <h4 style={{
                fontSize: 12.5, fontWeight: 500, color: "var(--txt)",
                margin: 0, lineHeight: 1.3,
                display: "-webkit-box", WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>{a.title}</h4>
            </div>
            <ChevronRight size={14} style={{ color: "var(--txt-muted)", flexShrink: 0, alignSelf: "center" }} />
          </article>
        ))}
      </div>
    </div>
  );
}
