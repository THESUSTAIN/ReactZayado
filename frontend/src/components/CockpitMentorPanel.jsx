import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, Bot } from "lucide-react";
import { copiloteApi } from "@/lib/api";

/**
 * CockpitMentorPanel — panneau inline "Mon mentor IA" (colonne droite du Cockpit).
 * Reprend le meme historique que le tiroir CockpitChat (HISTORY_KEY partage) :
 * une seule conversation, quel que soit l'endroit d'ouverture.
 */
const SUGGESTIONS = [
  "Quelles sont mes priorites aujourd'hui ?",
  "Aide-moi a relancer un prospect",
  "Comment ameliorer ma tresorerie ?",
];
const HISTORY_KEY = "zayado_bureau_copilote_history";

export default function CockpitMentorPanel() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "null");
      if (saved && saved.length) return saved;
    } catch { /* noop */ }
    return [{ role: "assistant", text: "Bonjour \uD83D\uDC4B Je suis votre mentor IA. Posez-moi une question ou choisissez une suggestion ci-dessous." }];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-60))); } catch { /* noop */ }
  }, [messages]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await copiloteApi.ask(msg);
      setMessages((m) => [...m, { role: "assistant", text: res.reply || "\u2026" }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Desole, une erreur est survenue. Reessayez." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mentor-panel glass-card" data-testid="cockpit-mentor-panel"
      style={{ display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #C9A449, #D6A85F)", color: "#0B1F3A", flexShrink: 0 }}>
          <Bot size={18} />
        </span>
        <div style={{ lineHeight: 1.2 }}>
          <strong style={{ display: "block", fontSize: 14, color: "var(--txt)" }}>Mon mentor IA</strong>
          <span style={{ fontSize: 11.5, color: "var(--txt-muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5DCAA5", display: "inline-block" }} /> Actif
          </span>
        </div>
      </div>

      <div className="mentor-body" data-testid="mentor-body"
        style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, minHeight: 260 }}>
        {messages.map((m, i) => (
          <div key={i} data-testid={`mentor-msg-${m.role}`}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%", fontSize: 13, lineHeight: 1.5,
              padding: "9px 12px", borderRadius: 12,
              background: m.role === "user" ? "#C9A449" : "rgba(255,255,255,0.06)",
              color: m.role === "user" ? "#0B1F3A" : "var(--txt)",
              border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.08)",
              whiteSpace: "pre-wrap",
            }}>
            {m.text}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", fontSize: 13, color: "var(--txt-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <Loader2 size={14} className="spin" /> Reflexion...
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 16px 10px" }}>
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => send(s)} data-testid="mentor-suggestion"
              style={{ textAlign: "left", fontSize: 12.5, color: "var(--txt)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={13} style={{ color: "#C9A449", flexShrink: 0 }} /> {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(); }}
        style={{ display: "flex", gap: 8, padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ecrivez a votre mentor\u2026"
          data-testid="mentor-input" aria-label="Message au mentor IA"
          style={{ flex: 1, height: 40, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "var(--txt)", padding: "0 12px", fontSize: 13, outline: "none" }} />
        <button type="submit" disabled={loading || !input.trim()} data-testid="mentor-send" aria-label="Envoyer"
          style={{ width: 40, height: 40, borderRadius: 10, border: "none", cursor: "pointer", background: "#C9A449", color: "#0B1F3A", display: "flex", alignItems: "center", justifyContent: "center", opacity: loading || !input.trim() ? 0.6 : 1 }}>
          {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}
