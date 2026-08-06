import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Bot, Plus, Send, Trash2, Settings2, Radio, X, Loader2, Bell, MessageCircle,
  CheckCircle2, Copy, QrCode, Inbox, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { agentsApi, getUid } from "@/lib/api";
import { subscribeToPush } from "@/lib/pwa";

const GOLD = "#C9A449";

const CHANNELS = [
  { id: "web",           label: "Widget Web",     desc: "Chat sur votre site",        ready: true },
  { id: "whatsapp",      label: "WhatsApp (API)", desc: "Meta Cloud API",             ready: true },
  { id: "whatsapp_web",  label: "WhatsApp (QR)",  desc: "Scan QR via votre téléphone", ready: true },
  { id: "telegram",      label: "Telegram",       desc: "Bot Telegram",               ready: true },
  { id: "instagram",     label: "Instagram DM",   desc: "Réponses aux messages Insta", ready: false },
  { id: "messenger",     label: "Messenger",      desc: "Réponses Facebook Messenger", ready: false },
];

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatAgent, setChatAgent] = useState(null);
  const [deployAgent, setDeployAgent] = useState(null);
  const [convAgent, setConvAgent] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, t] = await Promise.all([agentsApi.list(), agentsApi.templates()]);
      setAgents(a || []);
      setTemplates(t || []);
    } catch (e) {
      toast.error("Impossible de charger les agents");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createFromTemplate = async (tid) => {
    try {
      await agentsApi.fromTemplate(tid);
      toast.success("Agent créé ✓");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Création impossible (plan requis)");
    }
  };

  const createBlank = async () => {
    try {
      await agentsApi.create({ name: "Nouvel agent", system_prompt: "Tu es un assistant IA utile qui répond aux clients avec le ton de la marque." });
      toast.success("Agent créé ✓");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Création impossible — passez au plan Pro pour créer des agents IA.");
    }
  };

  const toggleActive = async (a) => {
    try { await agentsApi.update(a.id, { is_active: !a.is_active }); load(); }
    catch { toast.error("Échec"); }
  };

  const removeAgent = async (a) => {
    if (!window.confirm(`Supprimer l'agent "${a.name}" ?`)) return;
    try { await agentsApi.remove(a.id); toast.success("Supprimé"); load(); }
    catch { toast.error("Échec"); }
  };

  const enableNotifications = async () => {
    const res = await subscribeToPush();
    if (res?.ok) toast.success("Notifications activées ✓");
    else toast.error(res?.error || "Notifications non activées");
  };

  return (
    <div className="page-container" data-testid="agents-page" style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 4px 80px" }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">Agents IA</h1>
          <p className="page-sub">Créez un agent qui répond à vos clients — sur WhatsApp, Telegram et votre site — avec le ton de votre marque.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={enableNotifications} className="zbtn" data-testid="enable-notifications-btn"><Bell size={16} /> Activer les notifications</button>
          <button onClick={createBlank} className="zbtn zbtn-primary" data-testid="create-agent-btn"><Plus size={16} /> Nouvel agent</button>
        </div>
      </div>

      {/* Templates */}
      <div className="glass-card" style={{ marginBottom: 16 }}>
        <p className="muted" style={{ fontSize: 12, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: ".04em" }}>Démarrer avec un modèle</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {templates.map((t) => (
            <button key={t.id} onClick={() => createFromTemplate(t.id)} className="zbtn" data-testid={`template-${t.id}`} style={{ fontSize: 12 }}>
              <Bot size={14} /> {t.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="muted"><Loader2 size={16} className="spin" /> Chargement…</p>
      ) : agents.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "40px 20px" }} data-testid="agents-empty">
          <Bot size={34} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 15, margin: "0 0 6px" }}>Aucun agent pour le moment</p>
          <p className="muted" style={{ fontSize: 13, maxWidth: 420, margin: "0 auto 14px" }}>Créez votre premier agent depuis un modèle ci-dessus, puis branchez-le sur WhatsApp pour qu'il réponde à vos clients 24/7.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {agents.map((a) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card" data-testid={`agent-card-${a.id}`} style={{ borderTop: `3px solid ${a.color || GOLD}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${a.color || GOLD}22`, display: "flex", alignItems: "center", justifyContent: "center" }}><Bot size={18} style={{ color: a.color || GOLD }} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{a.name}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{a.usage_count || 0} utilisations</div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!a.is_active} onChange={() => toggleActive(a)} data-testid={`agent-active-${a.id}`} />
                  {a.is_active ? "Actif" : "Off"}
                </label>
              </div>
              <p className="muted" style={{ fontSize: 12, minHeight: 32, margin: "0 0 8px" }}>{a.description || "—"}</p>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                {(a.deployed_channels || []).length === 0
                  ? <span className="muted" style={{ fontSize: 11 }}>Aucun canal branché</span>
                  : (a.deployed_channels || []).map((c) => <span key={c} className="zchip" style={{ fontSize: 10 }}>{c}</span>)}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setChatAgent(a)} className="zbtn" style={{ flex: 1, height: 30, fontSize: 12, justifyContent: "center" }} data-testid={`agent-test-${a.id}`}><MessageCircle size={13} /> Tester</button>
                <button onClick={() => setDeployAgent(a)} className="zbtn" style={{ flex: 1, height: 30, fontSize: 12, justifyContent: "center" }} data-testid={`agent-channels-${a.id}`}><Radio size={13} /> Canaux</button>
                <button onClick={() => setConvAgent(a)} className="zbtn" style={{ flex: 1, height: 30, fontSize: 12, justifyContent: "center" }} data-testid={`agent-conversations-${a.id}`}><Inbox size={13} /> Conversations</button>
                <button onClick={() => removeAgent(a)} className="zbtn" style={{ height: 30, fontSize: 12 }} data-testid={`agent-delete-${a.id}`}><Trash2 size={13} /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {chatAgent && <ChatModal agent={chatAgent} onClose={() => setChatAgent(null)} />}
      {deployAgent && <DeployModal agent={deployAgent} onClose={() => { setDeployAgent(null); load(); }} />}
      {convAgent && <ConversationsModal agent={convAgent} onClose={() => setConvAgent(null)} />}
    </div>
  );
}

// ─── CONVERSATIONS (WhatsApp / Telegram / Web) ──────────────────
const CHANNEL_DOT = { whatsapp: "#25D366", whatsapp_web: "#25D366", telegram: "#229ED9", web: "#8B5CF6" };

function ConversationsModal({ agent, onClose }) {
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try { setList(await agentsApi.conversations(agent.id)); }
    catch { toast.error("Impossible de charger les conversations"); setList([]); }
    setLoading(false);
  }, [agent.id]);

  useEffect(() => { loadList(); }, [loadList]);

  const openThread = async (conv) => {
    setThreadLoading(true);
    setThread({ contact: conv.contact, channel: conv.channel, messages: [] });
    try {
      const res = await agentsApi.conversationThread(agent.id, conv.contact);
      setThread({ contact: conv.contact, channel: conv.channel, messages: res.messages || [] });
    } catch { toast.error("Impossible de charger ce fil"); }
    setThreadLoading(false);
  };

  const sendReply = async () => {
    const m = reply.trim();
    if (!m || !thread) return;
    setSending(true);
    try {
      const res = await agentsApi.replyConversation(agent.id, thread.contact, m);
      setThread((t) => ({ ...t, messages: [...t.messages, { role: "assistant", content: m, created_at: new Date().toISOString() }] }));
      setReply("");
      if (res?.sent) toast.success("Message envoyé ✓");
      else toast.error(res?.error || "Message enregistré mais pas envoyé (vérifiez la connexion du canal)");
    } catch {
      toast.error("Échec de l'envoi");
    }
    setSending(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={overlay}>
      <div className="glass-card" onClick={(e) => e.stopPropagation()} style={{ ...modal, maxWidth: 560, maxHeight: "86vh", display: "flex", flexDirection: "column" }} data-testid="agent-conversations-modal">
        <div style={modalHead}>
          <b>{thread ? <><button onClick={() => setThread(null)} className="zbtn" style={{ height: 26, marginRight: 6 }}><ArrowLeft size={13} /></button>{thread.contact}</> : `Conversations : ${agent.name}`}</b>
          <button onClick={onClose} className="zbtn" style={{ height: 28 }}><X size={14} /></button>
        </div>

        {!thread && (
          <>
            <p className="muted" style={{ fontSize: 12, margin: "0 0 10px" }}>Échanges réels avec vos clients sur WhatsApp, Telegram et le widget web — séparés de votre fil de test.</p>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {loading ? (
                <p className="muted" style={{ fontSize: 13 }}><Loader2 size={14} className="spin" /> Chargement…</p>
              ) : list && list.length > 0 ? (
                list.map((c) => (
                  <button key={`${c.channel}-${c.contact}`} onClick={() => openThread(c)} data-testid={`conv-item-${c.contact}`}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--glass-border)", background: "var(--glass-bg)", textAlign: "left", cursor: "pointer" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: CHANNEL_DOT[c.channel] || GOLD, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{c.contact}</span>
                        <span className="zchip" style={{ fontSize: 9 }}>{c.channel_label}</span>
                      </div>
                      <p className="muted" style={{ fontSize: 12, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.last_role === "assistant" ? "Vous/Agent : " : ""}{c.last_message || "—"}
                      </p>
                    </div>
                    <span className="muted" style={{ fontSize: 10, flexShrink: 0 }}>{c.message_count} msg</span>
                  </button>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "30px 10px" }}>
                  <Inbox size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p className="muted" style={{ fontSize: 13 }}>Aucune conversation client pour le moment.</p>
                  <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>Déployez cet agent sur un canal (bouton « Canaux ») pour que vos clients puissent lui écrire.</p>
                </div>
              )}
            </div>
          </>
        )}

        {thread && (
          <>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
              {threadLoading ? (
                <p className="muted" style={{ fontSize: 13 }}><Loader2 size={14} className="spin" /> Chargement…</p>
              ) : thread.messages.length === 0 ? (
                <p className="muted" style={{ fontSize: 13 }}>Aucun message dans ce fil.</p>
              ) : thread.messages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === "user" ? "flex-start" : "flex-end", maxWidth: "80%", background: m.role === "user" ? "var(--glass-bg)" : `${GOLD}22`, padding: "8px 12px", borderRadius: 12, fontSize: 13, whiteSpace: "pre-wrap" }}>
                  {m.content}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()}
                placeholder="Répondre manuellement au client…" data-testid="conv-reply-input"
                style={{ flex: 1, border: "1px solid var(--glass-border)", borderRadius: 10, padding: "9px 12px", fontSize: 13, background: "var(--glass-bg)", color: "var(--txt)" }} />
              <button onClick={sendReply} disabled={sending} className="zbtn zbtn-primary" data-testid="conv-reply-send"><Send size={15} /></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChatModal({ agent, onClose }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const m = input.trim();
    if (!m) return;
    setMsgs((p) => [...p, { role: "user", content: m }]);
    setInput("");
    setBusy(true);
    try {
      const res = await agentsApi.chat(agent.id, m);
      setMsgs((p) => [...p, { role: "assistant", content: res.response || res.error || "…" }]);
    } catch (e) {
      setMsgs((p) => [...p, { role: "assistant", content: e?.response?.data?.detail || "Erreur IA" }]);
    }
    setBusy(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={overlay}>
      <div className="glass-card" onClick={(e) => e.stopPropagation()} style={{ ...modal, display: "flex", flexDirection: "column", height: 520 }} data-testid="agent-chat-modal">
        <div style={modalHead}><b>Tester : {agent.name}</b><button onClick={onClose} className="zbtn" style={{ height: 28 }}><X size={14} /></button></div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
          {msgs.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Écrivez un message comme le ferait un client…</p>}
          {msgs.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%", background: m.role === "user" ? `${GOLD}22` : "var(--glass-bg)", padding: "8px 12px", borderRadius: 12, fontSize: 13, whiteSpace: "pre-wrap" }}>{m.content}</div>
          ))}
          {busy && <div className="muted" style={{ fontSize: 12 }}><Loader2 size={14} className="spin" /> L'agent réfléchit…</div>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Votre message…" data-testid="agent-chat-input" style={{ flex: 1, border: "1px solid var(--glass-border)", borderRadius: 10, padding: "9px 12px", fontSize: 13, background: "var(--glass-bg)", color: "var(--txt)" }} />
          <button onClick={send} disabled={busy} className="zbtn zbtn-primary" data-testid="agent-chat-send"><Send size={15} /></button>
        </div>
      </div>
    </div>
  );
}

function DeployModal({ agent, onClose }) {
  const [selected, setSelected] = useState(new Set(agent.deployed_channels || []));
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState(null);

  const toggle = (id) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await agentsApi.deploy(agent.id, Array.from(selected));
      setInfo(res);
      toast.success("Canaux enregistrés ✓");
    } catch (e) { toast.error("Échec du déploiement"); }
    setBusy(false);
  };

  const connectWaQr = async () => {
    setBusy(true);
    try {
      const res = await agentsApi.waConnect(agent.id);
      if (res.qr) setQr(res.qr);
      else toast(res.message || res.status || "Service WhatsApp non configuré localement (OK en production).");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Service WhatsApp indisponible");
    }
    setBusy(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={overlay}>
      <div className="glass-card" onClick={(e) => e.stopPropagation()} style={{ ...modal, maxHeight: "86vh", overflowY: "auto" }} data-testid="agent-deploy-modal">
        <div style={modalHead}><b>Canaux : {agent.name}</b><button onClick={onClose} className="zbtn" style={{ height: 28 }}><X size={14} /></button></div>
        <p className="muted" style={{ fontSize: 12, margin: "0 0 12px" }}>Choisissez où votre agent répondra aux clients.</p>
        <div style={{ display: "grid", gap: 8 }}>
          {CHANNELS.map((c) => (
            <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, border: "1px solid var(--glass-border)", opacity: c.ready ? 1 : 0.55, cursor: c.ready ? "pointer" : "not-allowed" }} data-testid={`channel-${c.id}`}>
              <input type="checkbox" disabled={!c.ready} checked={selected.has(c.id)} onChange={() => c.ready && toggle(c.id)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.label} {!c.ready && <span className="zchip" style={{ fontSize: 10, marginLeft: 6 }}>Bientôt</span>}</div>
                <div className="muted" style={{ fontSize: 11 }}>{c.desc}</div>
              </div>
              {c.id === "whatsapp_web" && selected.has(c.id) && (
                <button onClick={(e) => { e.preventDefault(); connectWaQr(); }} className="zbtn" style={{ height: 28, fontSize: 11 }} data-testid="wa-qr-btn"><QrCode size={13} /> QR</button>
              )}
            </label>
          ))}
        </div>

        {qr && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <img src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`} alt="QR WhatsApp" style={{ width: 200, height: 200 }} />
            <p className="muted" style={{ fontSize: 12 }}>Scannez ce QR dans WhatsApp → Appareils connectés.</p>
          </div>
        )}

        {info?.webhook_url && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "var(--glass-bg)" }}>
            <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Webhook (WhatsApp API / site) :</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <code style={{ fontSize: 11, wordBreak: "break-all", flex: 1 }}>{info.webhook_url}</code>
              <button onClick={() => { navigator.clipboard?.writeText(info.webhook_url); toast.success("Copié"); }} className="zbtn" style={{ height: 26 }}><Copy size={12} /></button>
            </div>
          </div>
        )}

        <button onClick={save} disabled={busy} className="zbtn zbtn-primary" style={{ width: "100%", marginTop: 12, justifyContent: "center" }} data-testid="deploy-save-btn">
          {busy ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />} Enregistrer les canaux
        </button>
      </div>
    </div>
  );
}

const overlay = { position: "fixed", inset: 0, background: "rgba(4,10,22,.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 };
const modal = { width: "100%", maxWidth: 460 };
const modalHead = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 };
