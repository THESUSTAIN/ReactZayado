import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { MessageCircle, X, Send, Loader2, Sparkles, Handshake, ExternalLink, Newspaper } from "lucide-react";
import { copiloteApi, dailyBriefApi, API } from "@/lib/api";

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
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMsg, setContactMsg] = useState("");
  const [contactSent, setContactSent] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open, contactOpen]);

  // Canal WhatsApp de l'équipe (éditable via la config publique)
  useEffect(() => {
    axios.get(`${API}/public/config`, { timeout: 4000 })
      .then((r) => setWhatsappUrl((r.data?.whatsapp_url || "").trim()))
      .catch(() => {});
  }, []);

  // Ouverture globale (menu Sidebar/BottomNav + bannière « Le Point du jour »)
  useEffect(() => {
    const handler = (e) => {
      setOpen(true);
      const brief = e?.detail?.brief;
      if (brief?.chat_intro) {
        const dayKey = `zayado_brief_shown_${brief.date}`;
        setMessages((m) => {
          // Évite de réinjecter le même brief deux fois dans la même journée
          if (localStorage.getItem(dayKey) === "1"
              && m.some((x) => x.role === "assistant" && x.brief)) return m;
          localStorage.setItem(dayKey, "1");
          return [...m, { role: "assistant", text: brief.chat_intro, brief: true }];
        });
      }
    };
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

  const [newsLoading, setNewsLoading] = useState(false);

  const summarizeNews = async () => {
    if (newsLoading) return;
    setNewsLoading(true);
    setOpen(true);
    setMessages((m) => [...m, { role: "user", text: "Résume-moi l'actualité de mon secteur." }]);
    try {
      const res = await dailyBriefApi.newsDigest();
      setMessages((m) => [...m, { role: "assistant", text: res.digest || "Aucune actualité pour le moment." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Impossible de récupérer l'actualité à l'instant. Réessayez." }]);
    } finally {
      setNewsLoading(false);
    }
  };

  const sendWorkRequest = async () => {
    const msg = contactMsg.trim();
    if (!msg) return;
    try {
      const res = await dailyBriefApi.workRequest({ message: msg, channel: "chat" });
      setContactSent(true);
      setContactMsg("");
      setMessages((m) => [...m, { role: "assistant", text: res.message || "Votre demande est bien partie 🙌 L'équipe vous répond très vite." }]);
      setTimeout(() => { setContactOpen(false); setContactSent(false); }, 1800);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Impossible d'envoyer la demande à l'instant. Réessayez ou passez par WhatsApp." }]);
    }
  };

  return (
    <>
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
            <div key={i} className={`cockpit-msg ${m.role}`} data-testid={`cockpit-msg-${m.role}`}
              style={{ whiteSpace: "pre-wrap" }}>
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

        {/* CTA — Travailler avec l'équipe Zayado */}
        <div style={{ padding: "0 14px 6px" }}>
          <button
            type="button"
            data-testid="cockpit-news-btn"
            onClick={summarizeNews}
            disabled={newsLoading}
            style={{
              width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              height: 38, borderRadius: 999, cursor: newsLoading ? "wait" : "pointer", marginBottom: 8,
              border: "1px solid var(--glass-border)", background: "var(--glass-soft)",
              color: "var(--txt)", fontSize: 13, fontWeight: 600,
            }}
          >
            {newsLoading ? <Loader2 size={15} className="spin" /> : <Newspaper size={15} />} Résumer l'actualité de mon secteur
          </button>
          <button
            type="button"
            data-testid="cockpit-work-toggle"
            onClick={() => setContactOpen((v) => !v)}
            style={{
              width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              height: 40, borderRadius: 999, cursor: "pointer",
              border: "1px solid rgba(201,164,73,0.5)",
              background: contactOpen ? "rgba(201,164,73,0.18)" : "rgba(201,164,73,0.1)",
              color: "var(--gold-strong, #B8860B)", fontSize: 13, fontWeight: 700,
            }}
          >
            <Handshake size={16} /> Travailler avec l'équipe sur mon projet
          </button>

          {contactOpen && (
            <div data-testid="cockpit-contact-panel" style={{
              marginTop: 10, padding: 12, borderRadius: 12,
              border: "1px solid var(--glass-border)", background: "var(--glass-soft)",
            }}>
              <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "var(--txt)" }}>
                Envie qu'on avance <strong>ensemble</strong> sur votre projet ? Choisissez votre canal :
              </p>

              {whatsappUrl && (
                <a
                  href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  data-testid="cockpit-contact-whatsapp"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 10,
                    height: 36, padding: "0 14px", borderRadius: 999, textDecoration: "none",
                    background: "#25D366", color: "#0B1F3A", fontSize: 12.5, fontWeight: 700,
                  }}
                >
                  <ExternalLink size={14} /> Discuter sur WhatsApp
                </a>
              )}

              <textarea
                value={contactMsg}
                onChange={(e) => setContactMsg(e.target.value)}
                data-testid="cockpit-contact-message"
                placeholder="Décrivez votre projet en une phrase…"
                rows={2}
                style={{
                  width: "100%", resize: "vertical", borderRadius: 10, padding: "8px 10px",
                  border: "1px solid var(--glass-border)", background: "var(--app-bg, #fff)",
                  color: "var(--txt)", fontSize: 12.5, marginBottom: 8, fontFamily: "inherit",
                }}
              />
              <button
                type="button"
                data-testid="cockpit-contact-send"
                onClick={sendWorkRequest}
                disabled={!contactMsg.trim() || contactSent}
                style={{
                  width: "100%", height: 38, borderRadius: 999, border: "none",
                  cursor: contactMsg.trim() ? "pointer" : "not-allowed",
                  background: contactSent ? "#5DCAA5" : "#14213d", color: "#fff",
                  fontSize: 13, fontWeight: 700, opacity: contactMsg.trim() || contactSent ? 1 : 0.6,
                }}
              >
                {contactSent ? "Demande envoyée ✓" : "Envoyer ma demande à l'équipe"}
              </button>
            </div>
          )}
        </div>

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
