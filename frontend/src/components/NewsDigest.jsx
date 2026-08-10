import React, { useEffect, useState } from "react";
import { Newspaper, ExternalLink, Loader2 } from "lucide-react";
import { newsApi } from "@/lib/api";

/* Digest d'actualité personnalisé par marché (backlog #13). Sélecteur de
 * marché + liste des dernières actualités (lemonde.fr, syndication
 * officielle — voir backend/routes/news_digest.py pour le détail et les
 * limites assumées, notamment l'absence de déclinaison par secteur). */
export default function NewsDigest() {
  const [markets, setMarkets] = useState([]);
  const [market, setMarket] = useState("france");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [mkts, cur] = await Promise.all([newsApi.markets(), newsApi.getMarket()]);
        if (!alive) return;
        setMarkets(mkts.markets || []);
        setMarket(cur.market || mkts.default || "france");
      } catch { /* liste des marchés indisponible : le sélecteur reste vide, pas bloquant */ }
    })();
    return () => { alive = false; };
  }, []);

  const loadDigest = React.useCallback(() => {
    setLoading(true);
    newsApi.digest()
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadDigest(); }, [loadDigest]);

  const changeMarket = async (next) => {
    setMarket(next);
    setSwitching(true);
    try {
      await newsApi.setMarket(next);
      loadDigest();
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div style={{
      borderRadius: 14, padding: 18, marginBottom: 16,
      background: "var(--glass-soft)", border: "1px solid var(--glass-border)",
    }} data-testid="news-digest-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--txt)", fontSize: 13, fontWeight: 700 }}>
          <Newspaper size={15} /> Actualités de votre marché
        </div>
        <select
          value={market}
          disabled={switching || !markets.length}
          onChange={(e) => changeMarket(e.target.value)}
          data-testid="news-digest-market-select"
          style={{
            fontSize: 12.5, padding: "6px 10px", borderRadius: 999,
            border: "1px solid var(--glass-border)", background: "var(--glass-soft)",
            color: "var(--txt)", cursor: switching ? "wait" : "pointer",
          }}
        >
          {markets.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0", color: "var(--txt-muted)", fontSize: 12.5 }}>
          <Loader2 size={14} className="animate-spin" /> Chargement des actualités…
        </div>
      ) : items.length === 0 ? (
        <p style={{ fontSize: 12.5, color: "var(--txt-muted)", margin: 0, lineHeight: 1.5 }}>
          Rien à afficher pour l'instant pour ce marché — réessayez plus tard ou changez de marché.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.slice(0, 8).map((it, i) => (
            <a key={i} href={it.link} target="_blank" rel="noreferrer" data-testid={`news-item-${i}`}
              style={{
                display: "flex", alignItems: "flex-start", gap: 8, textDecoration: "none",
                padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)",
              }}>
              <ExternalLink size={12} style={{ marginTop: 3, flexShrink: 0, color: "var(--txt-muted)" }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12.5, color: "var(--txt)", lineHeight: 1.4 }}>{it.title}</p>
                {it.source && <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "var(--txt-muted)" }}>{it.source}</p>}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
