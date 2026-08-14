import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  X, Send, Loader2, Sparkles, Handshake, ExternalLink, Newspaper,
  MessageCircle, Sun, Euro, BatteryCharging, Users, Compass, ArrowRight, RefreshCw,
  ChevronRight, ChevronLeft, ShieldCheck, Check, Clock, CheckCircle2,
} from "lucide-react";
import useIsMobile from "@/hooks/useIsMobile";
import { copiloteApi, dailyBriefApi, visionBrainApi, API } from "@/lib/api";

const SUGGESTIONS = [
  "Quelles sont mes priorités aujourd'hui ?",
  "Aide-moi à relancer un prospect",
  "Comment améliorer ma trésorerie ?",
];

// Formate une date d'actualité (ISO ou RFC822) en JJ mois AAAA (fr), sinon "".
function fmtNewsDate(raw) {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  try {
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

// Découpe le résumé d'actualité en lignes propres (façon Perplexity) et
// repère la ligne "À retenir" pour la mettre en avant.
function parseDigestLines(text) {
  return (text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const clean = l.replace(/^[-•*·\u2022]+\s*/, "");
      const retain = /à\s*retenir/i.test(clean) || clean.startsWith("👉");
      return { text: clean.replace(/^👉\s*/, ""), retain };
    });
}

// ── Rendu Markdown minimal, sans dépendance ─────────────────────────────
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

// ── Carte « Le point du jour » façon Kairos — KPIs réels du dashboard ────
function KairosBriefCard({ data, onGoto }) {
  if (!data) return null;
  const first = data.user?.first_name || "";
  const caMonth = Math.round(data.ca_month || data.pilotage?.ca_month_eur || 0);
  const caObj = Math.round(data.ca_objective || data.pilotage?.objective_eur || 0);
  const caPct = Math.max(0, Math.min(100, data.pilotage?.progress_percent ?? data.ca_delta_pct ?? 0));
  const energy = data.energy_score ?? 0;
  const wellLabel = data.bien_etre_label || "";
  const prospects = data.prospects_total ?? 0;
  const prospectsActive = data.prospects_active ?? 0;
  const align = data.vision?.alignment_percent ?? data.alignment_score ?? 0;
  const nextStep = data.vision?.next_step || data.mission_du_jour || "";
  const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n);
  const hour = new Date().getHours();
  const salut = hour < 12 ? "Bonjour" : hour < 18 ? "Bel après-midi" : "Bonsoir";

  const kpis = [
    { icon: Euro, label: "CA du mois", value: `${fmt(caMonth)} €`, sub: caObj ? `Objectif ${fmt(caObj)} €` : null, pct: caPct },
    { icon: BatteryCharging, label: "Énergie", value: `${energy}%`, sub: wellLabel || null, pct: energy },
    { icon: Users, label: "Prospects", value: prospects, sub: `${prospectsActive} actif${prospectsActive > 1 ? "s" : ""}`, pct: null },
    { icon: Compass, label: "Alignement vision", value: `${align}%`, sub: null, pct: align },
  ];

  return (
    <div className="kairos-card" data-testid="kairos-brief-card">
      <div className="kairos-card-head"><Sun size={13} /> Le point du jour</div>
      <div className="kairos-greeting" data-testid="kairos-greeting">{salut}{first ? ` ${first}` : ""} 👋</div>
      <div className="kairos-sub">Voici l'essentiel de votre cockpit en un coup d'œil.</div>

      <div className="kairos-kpis">
        {kpis.map((k) => (
          <div className="kairos-kpi" key={k.label} data-testid={`kairos-kpi-${k.label.split(" ")[0].toLowerCase()}`}>
            <div className="k-label"><k.icon size={12} /> {k.label}</div>
            <div className="k-value">{k.value}</div>
            {k.sub && <div className="k-sub">{k.sub}</div>}
            {k.pct != null && <div className="kairos-bar"><span style={{ width: `${Math.min(100, k.pct)}%` }} /></div>}
          </div>
        ))}
      </div>

      {nextStep && (
        <div className="kairos-next" data-testid="kairos-next-step">
          <strong>Prochaine étape</strong><br />{nextStep}
        </div>
      )}

      <div className="kairos-actions">
        <button data-testid="kairos-action-cockpit" onClick={() => onGoto("/")}>
          Voir mon cockpit <ArrowRight size={14} />
        </button>
        <button data-testid="kairos-action-vision" onClick={() => onGoto("/vision-board?tab=swot")}>
          Analyser ma vision <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default function CockpitChat({ fullscreen = false }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const HISTORY_KEY = "zayado_bureau_copilote_history";
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false); // PC : déplier/replier (largeur)
  const [tab, setTab] = useState("chat"); // "chat" | "news"
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "null");
      if (saved && saved.length) return saved;
    } catch { /* noop */ }
    return [{ role: "assistant", text: "Bonjour 👋 Je suis votre copilote IA. Comment puis-je vous aider aujourd'hui ?" }];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMsg, setContactMsg] = useState("");
  const [contactSent, setContactSent] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [dash, setDash] = useState(null);
  const [newsText, setNewsText] = useState("");
  const [newsError, setNewsError] = useState("");
  const [newsSources, setNewsSources] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { if (tab === "chat") endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open, contactOpen, tab]);

  // KPIs réels du dashboard pour la carte « Le point du jour »
  useEffect(() => {
    if (open && !dash) {
      axios.get(`${API}/dashboard`).then((r) => setDash(r.data)).catch(() => {});
    }
  }, [open, dash]);

  // Canal WhatsApp de l'équipe (config publique)
  useEffect(() => {
    axios.get(`${API}/public/config`, { timeout: 4000 })
      .then((r) => setWhatsappUrl((r.data?.whatsapp_url || "").trim()))
      .catch(() => {});
  }, []);

  // Ouverture globale (Sidebar/BottomNav + bannière « Le Point du jour »)
  useEffect(() => {
    const handler = (e) => {
      setOpen(true);
      setTab("chat");
      const ask = e?.detail?.ask;
      if (ask) { setTimeout(() => send(ask), 60); }
      const brief = e?.detail?.brief;
      if (brief?.chat_intro) {
        const dayKey = `zayado_brief_shown_${brief.date}`;
        setMessages((m) => {
          if (localStorage.getItem(dayKey) === "1"
              && m.some((x) => x.role === "assistant" && x.brief)) return m;
          localStorage.setItem(dayKey, "1");
          return [...m, { role: "assistant", text: brief.chat_intro, brief: true }];
        });
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-60))); } catch { /* noop */ }
  }, [messages]);

  const goto = (path) => { setOpen(false); navigate(path); };

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setTab("chat");
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setInput("");
    setLoading(true);
    try {
      // Mémoire : on transmet les derniers tours (hors cartes d'action).
      const history = messages
        .filter((m) => !m.card && (m.role === "user" || m.role === "assistant") && m.text)
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.text }));
      const res = await copiloteApi.ask(msg, history);
      setMessages((m) => [...m, { role: "assistant", text: res.reply || "…" }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Désolé, une erreur est survenue. Réessayez." }]);
    } finally {
      setLoading(false);
    }
  };

  // Ouverture effective : plein écran (mobile home) => toujours ouvert.
  const isOpen = fullscreen || open;

  // ── Cartes d'action inline (Approuver / Reporter) — base du 70/30 ──
  const handleAction = (msgIdx, decision) => {
    setMessages((list) =>
      list.map((m, i) => (i === msgIdx ? { ...m, decided: decision } : m))
    );
    const m = messages[msgIdx];
    const follow =
      decision === "approve"
        ? m?.card?.approveReply || "C'est validé ✓ Je m'en occupe et je vous tiens au courant."
        : m?.card?.rejectReply || "Ok, je reporte. Je vous le représenterai plus tard.";
    setTimeout(() => setMessages((x) => [...x, { role: "assistant", text: follow }]), 250);
  };

  // Seed proactif « Validation requise » (façon Kairos) — 1 fois / jour / session.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!isOpen || seededRef.current) return;
    seededRef.current = true;
    const KEY = "zayado_hubia_seed_" + new Date().toISOString().slice(0, 10);
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        card: {
          icon: "shield",
          title: "Validation requise",
          subtitle: "Séquence de relance — 3 prospects tièdes",
          body:
            "J'ai préparé une relance personnalisée pour 3 prospects. Je l'envoie de votre part ?",
          approveReply:
            "Parfait ✓ Les 3 relances partent. Je vous préviens dès qu'il y a une réponse.",
          rejectReply:
            "Ok, je garde la relance en attente — dites-moi quand vous voulez l'envoyer.",
        },
      },
    ]);
  }, [isOpen]);

  const summarizeNews = async () => {
    if (newsLoading) return;
    setNewsLoading(true);
    setNewsError("");
    try {
      const res = await dailyBriefApi.newsDigest();
      const digest = (res?.digest || "").trim();
      // Correctif « l'actualité s'écrase » : on ne remplace JAMAIS une actualité
      // déjà affichée par un résultat vide/erreur. Le backend renvoie ok:false
      // quand il n'a pas pu récupérer les flux/LLM.
      const failed = res?.ok === false || !digest;
      if (failed) {
        if (newsText) {
          setNewsError("Impossible d'actualiser pour le moment — l'actualité précédente est conservée.");
        } else {
          setNewsText(digest || "Aucune actualité pour le moment.");
        }
      } else {
        setNewsText(digest);
        setNewsSources(Array.isArray(res?.sources) ? res.sources : []);
      }
    } catch {
      // Erreur réseau : idem, on préserve l'existant.
      if (newsText) {
        setNewsError("Impossible d'actualiser pour le moment — l'actualité précédente est conservée.");
      } else {
        setNewsText("Impossible de récupérer l'actualité à l'instant. Réessayez.");
      }
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
      {open && !fullscreen && isMobile && <div className="cockpit-overlay" onClick={() => setOpen(false)} data-testid="cockpit-overlay" />}

      <aside
        className={`cockpit-panel ${isOpen ? "open" : ""} ${fullscreen ? "fullscreen" : ""} ${expanded && !fullscreen ? "expanded" : ""}`}
        data-testid="cockpit-panel"
        aria-hidden={!isOpen}
      >
        {/* En-tête */}
        <div className="cockpit-head">
          <div className="cockpit-head-title">
            <span className="cockpit-badge"><Sparkles size={15} /></span>
            <div>
              <strong>Cockpit</strong>
              <span>Votre co-pilote IA</span>
            </div>
          </div>
          <div className="cockpit-actions">
            {!fullscreen && !isMobile && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="cockpit-icon-btn"
                data-testid="cockpit-expand"
                title={expanded ? "Replier le panneau" : "Déplier le panneau"}
                aria-label={expanded ? "Replier" : "Déplier"}
              >
                {expanded ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            )}
            <button
              onClick={() => setContactOpen((v) => !v)}
              className={`cockpit-icon-btn ${contactOpen ? "active" : ""}`}
              data-testid="cockpit-handshake"
              title="Travailler avec l'équipe sur mon projet"
              aria-label="Travailler avec l'équipe"
            >
              <Handshake size={17} />
            </button>
            {!fullscreen && (
              <button onClick={() => setOpen(false)} className="cockpit-icon-btn" data-testid="cockpit-close" aria-label="Fermer">
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Onglets Discussion | Actualité */}
        <div className="cockpit-tabs" data-testid="cockpit-tabs">
          <button
            className={`cockpit-tab ${tab === "chat" ? "active" : ""}`}
            onClick={() => setTab("chat")}
            data-testid="cockpit-tab-chat"
          >
            <MessageCircle size={14} /> Discussion
          </button>
          <button
            className={`cockpit-tab ${tab === "news" ? "active" : ""}`}
            onClick={() => setTab("news")}
            data-testid="cockpit-tab-news"
          >
            <Newspaper size={14} /> Actualité
          </button>
        </div>

        {/* Panneau « Travailler avec l'équipe » (déclenché par l'icône handshake) */}
        {contactOpen && (
          <div data-testid="cockpit-contact-panel" style={{
            margin: "12px 14px 0", padding: 12, borderRadius: 12,
            border: "1px solid rgba(201,164,73,0.35)", background: "rgba(201,164,73,0.1)",
          }}>
            <p style={{ margin: "0 0 8px", fontSize: 12.5 }}>
              Envie qu'on avance <strong>ensemble</strong> sur votre projet ? Choisissez votre canal :
            </p>
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" data-testid="cockpit-contact-whatsapp"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 10,
                  height: 36, padding: "0 14px", borderRadius: 999, textDecoration: "none",
                  background: "#25D366", color: "#0B1F3A", fontSize: 12.5, fontWeight: 700,
                }}>
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
                border: "1px solid rgba(255,255,255,0.15)", background: "rgba(8,15,35,0.55)",
                color: "#e9eefb", fontSize: 12.5, marginBottom: 8, fontFamily: "inherit",
              }}
            />
            <button
              type="button" data-testid="cockpit-contact-send" onClick={sendWorkRequest}
              disabled={!contactMsg.trim() || contactSent}
              style={{
                width: "100%", height: 38, borderRadius: 999, border: "none",
                cursor: contactMsg.trim() ? "pointer" : "not-allowed",
                background: contactSent ? "#5DCAA5" : "linear-gradient(135deg,#C9A449,#b58f38)", color: "#14213d",
                fontSize: 13, fontWeight: 700, opacity: contactMsg.trim() || contactSent ? 1 : 0.6,
              }}>
              {contactSent ? "Demande envoyée ✓" : "Envoyer ma demande à l'équipe"}
            </button>
          </div>
        )}

        {/* ── Onglet Discussion ── */}
        {tab === "chat" && (
          <>
            <div className="cockpit-body">
              <KairosBriefCard data={dash} onGoto={goto} />
              {messages.map((m, i) => (
                m.card ? (
                  <div key={i} data-testid="cockpit-action-card" style={{
                    margin: "8px 0", padding: 12, borderRadius: 14,
                    border: "1px solid rgba(201,164,73,0.35)", background: "rgba(201,164,73,0.08)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ display: "inline-flex", width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", background: "rgba(201,164,73,0.18)", color: "#E5C887" }}>
                        <ShieldCheck size={16} />
                      </span>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#F6F2EA" }}>{m.card.title}</div>
                        {m.card.subtitle && <div style={{ fontSize: 11.5, opacity: .6 }}>{m.card.subtitle}</div>}
                      </div>
                    </div>
                    <div style={{ fontSize: 12.5, opacity: .85, lineHeight: 1.45, marginBottom: 10 }}>{m.card.body}</div>
                    {m.decided ? (
                      <div data-testid="cockpit-action-decided" style={{
                        display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
                        color: m.decided === "approve" ? "#5DCAA5" : "#cbd5e1",
                      }}>
                        {m.decided === "approve" ? <><CheckCircle2 size={14} /> Approuvé</> : <><Clock size={14} /> Reporté</>}
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button data-testid="cockpit-action-approve" onClick={() => handleAction(i, "approve")} style={{
                          flex: 1, height: 38, borderRadius: 10, border: "none", cursor: "pointer",
                          background: "#14213d", color: "#fff", fontSize: 12.5, fontWeight: 700,
                          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}><Check size={14} /> Approuver</button>
                        <button data-testid="cockpit-action-reject" onClick={() => handleAction(i, "reject")} style={{
                          flex: 1, height: 38, borderRadius: 10, cursor: "pointer",
                          border: "1px solid rgba(255,255,255,0.18)", background: "transparent", color: "#cbd5e1",
                          fontSize: 12.5, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}><Clock size={14} /> Reporter</button>
                      </div>
                    )}
                  </div>
                ) : (
                <div key={i} className={`cockpit-msg ${m.role}`} data-testid={`cockpit-msg-${m.role}`} style={{ whiteSpace: "pre-wrap" }}>
                  {m.role === "assistant" ? renderMarkdownLite(m.text) : m.text}
                  {m.sources?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }} data-testid={`cockpit-msg-${i}-sources`}>
                      {m.sources.map((s, j) => (
                        <a key={j} href={s.url} target="_blank" rel="noopener noreferrer" data-testid={`cockpit-source-${j}`}
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
                )
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
          </>
        )}

        {/* ── Onglet Actualité ── */}
        {tab === "news" && (
          <div className="cockpit-news" data-testid="cockpit-news">
            <div className="kairos-card-head"><Newspaper size={13} /> Veille sectorielle</div>
            <p style={{ fontSize: 12.5, opacity: .75, margin: 0 }}>
              Un résumé des actualités clés de votre secteur, généré par votre co-pilote IA.
            </p>
            <button
              type="button" data-testid="cockpit-news-btn" onClick={summarizeNews} disabled={newsLoading}
              style={{
                width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                height: 40, borderRadius: 999, cursor: newsLoading ? "wait" : "pointer",
                border: "1px solid rgba(201,164,73,0.4)", background: "rgba(201,164,73,0.14)",
                color: "#f0dca5", fontSize: 13, fontWeight: 700,
              }}>
              {newsLoading ? <Loader2 size={15} className="spin" /> : (newsText ? <RefreshCw size={15} /> : <Newspaper size={15} />)}
              {newsText ? "Actualiser l'actualité" : "Résumer l'actualité de mon secteur"}
            </button>
            {newsError && (
              <div data-testid="cockpit-news-error" style={{
                marginTop: 8, borderRadius: 10, padding: "8px 10px", fontSize: 12,
                border: "1px solid rgba(201,164,73,0.35)", background: "rgba(201,164,73,0.10)", color: "#f0dca5",
              }}>
                {newsError}
              </div>
            )}
            {newsText ? (
              <div data-testid="cockpit-news-digest" style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 8 }}>
                {parseDigestLines(newsText).map((ln, k) =>
                  ln.retain ? (
                    <div key={k} style={{
                      display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 12,
                      background: "rgba(201,164,73,0.12)", border: "1px solid rgba(201,164,73,0.3)",
                    }}>
                      <Sparkles size={15} style={{ color: "#E5C887", flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 13, lineHeight: 1.5, color: "#F6F2EA", fontWeight: 600 }}>{ln.text}</span>
                    </div>
                  ) : (
                    <div key={k} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: "#C9A449", flexShrink: 0, marginTop: 7 }} />
                      <span style={{ fontSize: 13, lineHeight: 1.55, color: "#e9eefb" }}>{ln.text}</span>
                    </div>
                  )
                )}
              </div>
            ) : (
              !newsLoading && (
                <div style={{ textAlign: "center", opacity: .5, fontSize: 12.5, padding: "24px 0" }} data-testid="cockpit-news-empty">
                  Aucune actualité chargée pour le moment.
                </div>
              )
            )}
            {newsSources.length > 0 && (
              <div data-testid="cockpit-news-sources" style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", opacity: .55 }}>
                  {newsSources.length} sources
                </div>
                {newsSources.map((s, j) => (
                  <div
                    key={j}
                    data-testid={`cockpit-news-source-${j}`}
                    style={{
                      display: "flex", gap: 10, alignItems: "flex-start",
                      padding: "10px 12px", borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <span style={{
                      flexShrink: 0, width: 22, height: 22, borderRadius: 7, fontSize: 11, fontWeight: 800,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(201,164,73,0.18)", color: "#E5C887",
                    }}>{j + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a href={s.link || s.url || "#"} target="_blank" rel="noopener noreferrer"
                        style={{ display: "block", textDecoration: "none", fontSize: 12.5, fontWeight: 600, color: "#e9eefb", lineHeight: 1.35 }}>
                        {s.title || s.label || "Article"}
                      </a>
                      <div style={{ marginTop: 5, fontSize: 11, opacity: .75, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        {s.source && <span>{s.source}</span>}
                        {fmtNewsDate(s.published || s.published_at) && <span>· {fmtNewsDate(s.published || s.published_at)}</span>}
                        <button
                          type="button"
                          data-testid={`cockpit-news-deepen-${j}`}
                          onClick={() => { setTab("chat"); send(`Approfondis cette actualité : ${s.title || s.label || ""}${s.source ? " (" + s.source + ")" : ""}`); }}
                          style={{
                            marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer",
                            border: "1px solid rgba(201,164,73,0.4)", background: "rgba(201,164,73,0.12)", color: "#f0dca5",
                            borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                          }}
                        >
                          <Sparkles size={11} /> Approfondir
                        </button>
                      </div>
                    </div>
                    <ExternalLink size={13} style={{ color: "#f0dca5", flexShrink: 0, marginTop: 2 }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
