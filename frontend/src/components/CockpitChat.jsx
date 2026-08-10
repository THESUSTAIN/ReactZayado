import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { MessageCircle, X, Send, Loader2, Sparkles, Handshake, ExternalLink, Newspaper } from "lucide-react";
import { copiloteApi, dailyBriefApi, visionBrainApi, API } from "@/lib/api";

const SUGGESTIONS = [
  "Quelles sont mes priorités aujourd'hui ?",
  "Aide-moi à relancer un prospect",
  "Comment améliorer ma trésorerie ?",
];

// ── Rendu Markdown minimal, sans dépendance ─────────────────────────────
// QA a signalé que le chat affichait du Markdown brut ("##", "**texte**")
// non interprété. Pas de lib markdown installée dans ce projet — plutôt que
// d'en ajouter une (risque de build/bundle non testé ici), un petit
// convertisseur ciblé sur les patterns réellement vus dans les réponses IA
// (titres ##/###, **gras**, *italique*, listes à puces -/*). Construit en
// JSX (pas dangerouslySetInnerHTML) pour rester safe même si le texte
// contient du contenu non fiable.
function renderMarkdownLite(text) {
  if (!text) return text;
  const lines = String(text).split("\n");
  const out = [];
  let listBuf = [];
  const flushList = (key) => {
    if (listBuf.length) {
      out.push(<ul key={`ul-${key}`} style={{ margin: "4px 0", paddingLeft: 18 }}>{listBuf}</ul>);
      listBuf = [];
    }
  };
  const inline = (s) => {
    // **gras** puis *italique* — split successif, pas de regex imbriquée risquée
    const parts = s.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => {
      if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
      const sub = p.split(/(\*[^*]+\*)/g);
      return sub.map((q, j) => (/^\*[^*]+\*$/.test(q) ? <em key={`${i}-${j}`}>{q.slice(1, -1)}</em> : q));
    });
  };
  lines.forEach((line, i) => {
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (h) {
      flushList(i);
      const Tag = h[1].length === 1 ? "strong" : "span";
      out.push(<div key={i} style={{ fontWeight: 700, marginTop: i > 0 ? 8 : 0 }}><Tag>{inline(h[2])}</Tag></div>);
    } else if (li) {
      listBuf.push(<li key={i}>{inline(li[1])}</li>);
    } else if (line.trim() === "") {
      flushList(i);
      out.push(<br key={i} />);
    } else {
      flushList(i);
      out.push(<span key={i}>{inline(line)}{i < lines.length - 1 ? <br /> : null}</span>);
    }
  });
  flushList("end");
  return out;
}

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
      // Notification → l'IA explique en langage naturel (sources conditionnelles)
      const notif = e?.detail?.notif;
      if (notif) {
        setMessages((m) => [...m, { role: "user", text: `📣 ${notif.title || "Nouvelle notification"}` }]);
        setLoading(true);
        visionBrainApi.notifyExplain({
          title: notif.title || "", body: notif.body || notif.text || "", kind: notif.kind || notif.type || "",
        })
          .then((res) => {
            setMessages((m) => [...m, {
              role: "assistant", text: res.explanation || "Voici l'explication de cette notification.",
              sources: res.sources || [],
            }]);
          })
          .catch(() => setMessages((m) => [...m, { role: "assistant", text: "Je n'ai pas pu détailler cette notification pour le moment." }]))
          .finally(() => setLoading(false));
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
              {m.role === "assistant" ? renderMarkdownLite(m.text) : m.text}
              {/* Sources (style Perplexity) — uniquement pour les actualités liées à l'état de l'user */}
              {m.sources?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }} data-testid={`cockpit-msg-${i}-sources`}>
                  {m.sources.map((s, j) => (
                    <a key={j} href={s.url} target="_blank" rel="noopener noreferrer"
                      data-testid={`cockpit-source-${j}`}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11,
                        padding: "2px 8px", borderRadius: 8, textDecoration: "none",
                        border: "1px solid rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.12)", color: "#fbbf24",
                      }}>
                      <Newspaper size={11} /> {s.label}
                    </a>
                  ))}
                </div>
              )}
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
