import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { copiloteApi } from "@/lib/api";

const SUGGESTIONS = [
  "Quelles sont mes priorités aujourd'hui ?",
  "Aide-moi à relancer un prospect",
  "Comment améliorer ma trésorerie ?",
];

export default function CockpitChat() {
  // Historique partagé avec le Co-pilote de Mon Bureau — une seule conversation,
  // peu importe où l'utilisateur l'ouvre (bulle flottante ou onglet dédié).
  const HISTORY_KEY = "zayado_bureau_copilote_history";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "null");
      if (saved && saved.length) return saved;
    } catch { /* noop */ }
    return [{ role: "assistant", text: "Bonjour 👋 Je suis votre Cockpit, votre co-pilote IA. Comment puis-je vous aider aujourd'hui ?" }];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  // Ouverture globale depuis le menu Sidebar/BottomNav (item "Copilote")
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("zayado:open-cockpit-chat", handler);
    return () => window.removeEventListener("zayado:open-cockpit-chat", handler);
  }, []);
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
      setMessages((m) => [...m, { role: "assistant", text: res.reply || "…" }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Désolé, une erreur est survenue. Réessayez." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bouton flottant d'ouverture du cockpit — masqué (accès via Co-pilot dans BottomNav) */}
      {false && !open && (
        <button onClick={() => setOpen(true)} data-testid="cockpit-launcher"
          className="cockpit-launcher" title="Ouvrir le Cockpit (co-pilote IA)" aria-label="Ouvrir le Cockpit">
          <MessageCircle size={22} />
        </button>
      )}

      {/* Overlay */}
      {open && <div className="cockpit-overlay" onClick={() => setOpen(false)} data-testid="cockpit-overlay" />}

      {/* Panneau à droite */}
      <aside className={`cockpit-panel ${open ? "open" : ""}`} data-testid="cockpit-panel" aria-hidden={!open}>
        <div className="cockpit-head">
          <div className="cockpit-head-title">
            <span className="cockpit-badge"><Sparkles size={15} /></span>
            <div>
              <strong>Cockpit</strong>
              <span>Votre co-pilote IA</span>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="cockpit-close" data-testid="cockpit-close" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="cockpit-body">
          {messages.map((m, i) => (
            <div key={i} className={`cockpit-msg ${m.role}`} data-testid={`cockpit-msg-${m.role}`}>
              {m.text}
            </div>
          ))}
          {loading && <div className="cockpit-msg assistant"><Loader2 size={15} className="spin" /> Réflexion…</div>}
          <div ref={endRef} />
        </div>

        {messages.length <= 1 && (
          <div className="cockpit-suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} data-testid="cockpit-suggestion">{s}</button>
            ))}
          </div>
        )}

        <form className="cockpit-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Écrivez à votre cockpit…"
            data-testid="cockpit-input" aria-label="Message au cockpit" />
          <button type="submit" disabled={loading || !input.trim()} data-testid="cockpit-send" aria-label="Envoyer">
            {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
          </button>
        </form>
      </aside>
    </>
  );
}
