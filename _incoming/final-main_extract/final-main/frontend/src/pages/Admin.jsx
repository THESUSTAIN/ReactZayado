import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, Mail, KeyRound, Loader2, LogOut, Users, TrendingUp,
  FileEdit, Send, CheckCircle2, AlertCircle, Eye, MessageCircle,
  Inbox, Reply, Sparkles, RefreshCcw, Check, X, ChevronDown,
  Save, Wand2, Calendar, MailQuestion, MailCheck, Clock, Hourglass,
  Globe, FileText, BarChart3, Zap,
} from "lucide-react";
import axios from "axios";
import { API } from "@/lib/api";
import { toast } from "sonner";

const TOKEN_KEY = "zayado_admin_token";

const adminApi = {
  setToken: (t) => localStorage.setItem(TOKEN_KEY, t),
  getToken: () => localStorage.getItem(TOKEN_KEY),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
  request: async (method, url, body) => {
    const tok = localStorage.getItem(TOKEN_KEY);
    const cfg = { headers: tok ? { Authorization: `Bearer ${tok}` } : {} };
    const res = method === "GET"
      ? await axios.get(`${API}${url}`, cfg)
      : await axios[method](`${API}${url}`, body, cfg);
    return res.data;
  },
};

// ─── LOGIN ─────────────────────────────────────────────────────
function AdminLogin({ onLogged }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const requestCode = async (e) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      await adminApi.request("post", "/admin/auth/request-code", { email: email.trim().toLowerCase() });
      toast.success("Si cet email est admin, le code est envoyé.");
      setStep(2);
    } catch (err) { toast.error(err?.response?.data?.detail || "Erreur"); }
    finally { setBusy(false); }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await adminApi.request("post", "/admin/auth/verify-code", { email: email.trim().toLowerCase(), code });
      adminApi.setToken(data.token);
      toast.success("Connecté !");
      onLogged(data.email);
    } catch (err) { toast.error(err?.response?.data?.detail || "Code incorrect"); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B1F3A", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(214,168,95,0.3)", borderRadius: 24, padding: 36, boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(214,168,95,0.12)", border: "1px solid rgba(214,168,95,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Shield size={28} style={{ color: "#D6A85F" }} />
          </div>
          <p style={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.15em", color: "#D6A85F", marginBottom: 6 }}>Console Admin</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#F6F2EA", margin: "0 0 6px" }}>Zayado Admin</h1>
          <p style={{ fontSize: 13, color: "rgba(246,242,234,0.45)" }}>Connexion par code email — sans mot de passe</p>
        </div>

        {step === 1 ? (
          <form onSubmit={requestCode} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(246,242,234,0.45)", display: "block", marginBottom: 6 }}>Email administrateur</label>
              <div style={{ position: "relative" }}>
                <Mail size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(246,242,234,0.3)" }} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@zayado.net"
                  style={{ width: "100%", paddingLeft: 38, paddingRight: 14, height: 46, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#F6F2EA", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  data-testid="admin-email-input" />
              </div>
            </div>
            <button type="submit" disabled={busy || !email}
              style={{ height: 46, background: "#D6A85F", color: "#0B1F3A", border: "none", borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy || !email ? 0.6 : 1 }}
              data-testid="admin-request-code-btn">
              {busy ? <Loader2 size={16} className="spin" /> : <KeyRound size={16} />} Recevoir mon code
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "rgba(93,202,165,0.1)", border: "1px solid rgba(93,202,165,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "rgba(93,202,165,0.9)" }}>
              Code envoyé à <strong>{email}</strong>. Vérifiez votre boîte (et les spams).
            </div>
            <input type="text" inputMode="numeric" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000"
              style={{ width: "100%", height: 64, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#F6F2EA", fontSize: 32, textAlign: "center", letterSpacing: "0.5em", fontFamily: "monospace", outline: "none", boxSizing: "border-box" }}
              data-testid="admin-code-input" />
            <button type="submit" disabled={busy || code.length !== 6}
              style={{ height: 46, background: "#D6A85F", color: "#0B1F3A", border: "none", borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy || code.length !== 6 ? 0.6 : 1 }}
              data-testid="admin-verify-code-btn">
              {busy ? <Loader2 size={16} className="spin" /> : null} Se connecter
            </button>
            <button type="button" onClick={() => { setStep(1); setCode(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "rgba(246,242,234,0.4)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              ← Changer d'email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── STAT CARD ─────────────────────────────────────────────────
function StatsCard({ icon: Icon, label, value, color = "#D6A85F", suffix = "" }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon size={15} style={{ color }} />
        <p style={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(246,242,234,0.4)", margin: 0 }}>{label}</p>
      </div>
      <p style={{ fontSize: 30, fontWeight: 700, color, margin: 0 }}>{value}<span style={{ fontSize: 14, color: "rgba(246,242,234,0.3)", marginLeft: 2 }}>{suffix}</span></p>
    </div>
  );
}

// ─── ARTICLES SEO ──────────────────────────────────────────────
function AdminArticles() {
  const [topics, setTopics] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(null);
  const [editing, setEditing] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [d] = await Promise.all([adminApi.request("GET", "/admin/articles")]);
      setDrafts(d || []);
    } catch { toast.error("Erreur de chargement articles"); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const proposeTopics = async () => {
    setBusy(true); setTopics([]);
    try {
      const { topics: t } = await adminApi.request("post", "/admin/articles/propose", {});
      setTopics(t || []); toast.success(`${(t || []).length} sujets proposés`);
    } catch (err) { toast.error(err?.response?.data?.detail || "Erreur IA"); }
    finally { setBusy(false); }
  };

  const generate = async (t) => {
    setGenBusy(t.topic);
    try {
      await adminApi.request("post", "/admin/articles/generate", { topic: t.topic, category: t.category });
      toast.success("Article généré !"); setTopics(s => s.filter(x => x.topic !== t.topic)); refresh();
    } catch (err) { toast.error(err?.response?.data?.detail || "Erreur génération"); }
    finally { setGenBusy(null); }
  };

  const approve = async (a) => {
    try { await adminApi.request("post", `/admin/articles/${a.id}/approve`); toast.success("Publié !"); refresh(); }
    catch (err) { toast.error(err?.response?.data?.detail || "Erreur"); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await adminApi.request("post", `/admin/articles/${editing.id}/edit`, { title: editing.title, content: editing.content });
      toast.success("Article mis à jour !"); setEditing(null); refresh();
    } catch (err) { toast.error(err?.response?.data?.detail || "Erreur"); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#F6F2EA", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Globe size={20} style={{ color: "#D6A85F" }} /> Articles SEO
        </h2>
        <button onClick={proposeTopics} disabled={busy}
          style={{ height: 40, padding: "0 18px", background: "#D6A85F", color: "#0B1F3A", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: busy ? 0.6 : 1 }}>
          {busy ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} Proposer 3 sujets IA
        </button>
      </div>

      {topics.length > 0 && (
        <div style={{ background: "rgba(214,168,95,0.06)", border: "1px solid rgba(214,168,95,0.2)", borderRadius: 14, padding: 16 }}>
          <p style={{ fontSize: 12, color: "#D6A85F", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "monospace" }}>Sujets proposés — choisissez-en un</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {topics.map(t => (
              <div key={t.topic} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 14px" }}>
                <div>
                  <p style={{ fontSize: 14, color: "#F6F2EA", margin: 0 }}>{t.topic}</p>
                  <p style={{ fontSize: 11, color: "rgba(246,242,234,0.4)", margin: "3px 0 0", fontFamily: "monospace" }}>{t.category}</p>
                </div>
                <button onClick={() => generate(t)} disabled={genBusy === t.topic}
                  style={{ height: 34, padding: "0 14px", background: "rgba(93,202,165,0.15)", color: "#5DCAA5", border: "1px solid rgba(93,202,165,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, flexShrink: 0, opacity: genBusy === t.topic ? 0.6 : 1 }}>
                  {genBusy === t.topic ? <Loader2 size={13} className="spin" /> : <Wand2 size={13} />} Générer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(214,168,95,0.3)", borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ color: "#F6F2EA", margin: 0, fontSize: 16 }}>Éditer l'article</h3>
            <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(246,242,234,0.4)" }}><X size={16} /></button>
          </div>
          <input value={editing.title} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))}
            style={{ width: "100%", marginBottom: 12, padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#F6F2EA", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          <textarea value={editing.content} onChange={e => setEditing(p => ({ ...p, content: e.target.value }))} rows={12}
            style={{ width: "100%", marginBottom: 12, padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#F6F2EA", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={saveEdit} style={{ height: 38, padding: "0 16px", background: "#D6A85F", color: "#0B1F3A", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Save size={13} /> Sauvegarder</button>
            <button onClick={() => setEditing(null)} style={{ height: 38, padding: "0 14px", background: "rgba(255,255,255,0.06)", color: "rgba(246,242,234,0.6)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Annuler</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {drafts.map(a => (
          <div key={a.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 }} data-testid={`admin-article-${a.id}`}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, fontFamily: "monospace", padding: "2px 8px", borderRadius: 6, background: a.status === "published" ? "rgba(93,202,165,0.15)" : "rgba(214,168,95,0.15)", color: a.status === "published" ? "#5DCAA5" : "#D6A85F", border: `1px solid ${a.status === "published" ? "rgba(93,202,165,0.3)" : "rgba(214,168,95,0.3)"}` }}>{a.status}</span>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(246,242,234,0.3)" }}>{a.category}</span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#F6F2EA", margin: 0 }}>{a.title}</p>
                <p style={{ fontSize: 11, color: "rgba(246,242,234,0.35)", margin: "4px 0 0", fontFamily: "monospace" }}>{a.created_at?.slice(0, 10)}</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => setEditing(a)} style={{ height: 32, padding: "0 12px", background: "rgba(255,255,255,0.06)", color: "rgba(246,242,234,0.7)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}><FileEdit size={12} /> Éditer</button>
                {a.status !== "published" && (
                  <button onClick={() => approve(a)} style={{ height: 32, padding: "0 12px", background: "rgba(93,202,165,0.15)", color: "#5DCAA5", border: "1px solid rgba(93,202,165,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}><Check size={12} /> Approuver</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {drafts.length === 0 && <p style={{ textAlign: "center", color: "rgba(246,242,234,0.3)", fontSize: 14, padding: "40px 0" }}>Aucun article pour le moment. Proposez des sujets avec l'IA.</p>}
      </div>
    </div>
  );
}

// ─── RELANCES ──────────────────────────────────────────────────
function AdminReminders() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    try { const res = await adminApi.request("GET", "/admin/pending-users"); setData(res); }
    catch (e) { toast.error(e.response?.data?.detail || "Erreur de chargement."); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const openPreview = async (email) => {
    try { const res = await adminApi.request("GET", `/admin/pending-users/preview?email=${encodeURIComponent(email)}`); setPreview({ email, ...res }); }
    catch (e) { toast.error(e.response?.data?.detail || "Erreur preview."); }
  };

  const sendReminder = async (email, force = false) => {
    setSendingEmail(email);
    try { await adminApi.request("post", "/admin/pending-users/send-reminder", { email, force }); toast.success(`Relance envoyée à ${email}`); setPreview(null); await refresh(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Erreur d'envoi."); }
    finally { setSendingEmail(null); }
  };

  const STATUS_META = {
    eligible: { color: "#D6A85F", label: "Relançable" },
    reminded: { color: "#5DCAA5", label: "Relancé" },
    recent:   { color: "#60a5fa", label: "Trop récent" },
    stale:    { color: "rgba(246,242,234,0.4)", label: "Trop ancien" },
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#F6F2EA", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Mail size={20} style={{ color: "#D6A85F" }} /> Relances utilisateurs
        </h2>
        <button onClick={refresh} disabled={busy} style={{ height: 36, padding: "0 14px", background: "rgba(255,255,255,0.06)", color: "rgba(246,242,234,0.7)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          {busy ? <Loader2 size={13} className="spin" /> : <RefreshCcw size={13} />} Actualiser
        </button>
      </div>
      {data?.users?.map(u => {
        const meta = STATUS_META[u.status] || STATUS_META.stale;
        return (
          <div key={u.email} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, border: `1px solid ${meta.color}40`, color: meta.color, background: `${meta.color}15`, fontFamily: "monospace" }}>{meta.label}</span>
                  <span style={{ fontSize: 13, fontFamily: "monospace", color: "#F6F2EA" }}>{u.email}</span>
                </div>
                <p style={{ fontSize: 12, color: "rgba(246,242,234,0.4)", margin: 0 }}>Inscrit {u.created_at?.slice(0, 10)} · {u.status}</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => openPreview(u.email)} style={{ height: 32, padding: "0 12px", background: "rgba(255,255,255,0.06)", color: "rgba(246,242,234,0.7)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}><Eye size={12} /> Voir</button>
                {u.status === "eligible" && (
                  <button onClick={() => sendReminder(u.email)} disabled={sendingEmail === u.email} style={{ height: 32, padding: "0 12px", background: "rgba(214,168,95,0.15)", color: "#D6A85F", border: "1px solid rgba(214,168,95,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, opacity: sendingEmail === u.email ? 0.6 : 1 }}>
                    {sendingEmail === u.email ? <Loader2 size={12} className="spin" /> : <Send size={12} />} Relancer
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setPreview(null)}>
          <div style={{ background: "#0d2244", border: "1px solid rgba(214,168,95,0.3)", borderRadius: 20, padding: 28, maxWidth: 480, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ color: "#F6F2EA", margin: 0 }}>Aperçu relance — {preview.email}</h3>
              <button onClick={() => setPreview(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(246,242,234,0.4)" }}><X size={16} /></button>
            </div>
            {preview.subject && <p style={{ color: "#D6A85F", fontSize: 14, marginBottom: 12, fontWeight: 600 }}>Objet : {preview.subject}</p>}
            {preview.body && <pre style={{ color: "rgba(246,242,234,0.7)", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 14 }}>{preview.body}</pre>}
            <button onClick={() => sendReminder(preview.email)} style={{ marginTop: 16, height: 40, width: "100%", background: "#D6A85F", color: "#0B1F3A", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Send size={14} /> Envoyer cette relance</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── COMPOSEUR EMAIL IA ─────────────────────────────────────────
function AdminEmails({ adminEmail, emails, onRefresh }) {
  const [draftTo, setDraftTo] = useState("");
  const [draftIntent, setDraftIntent] = useState("");
  const [draftAuto, setDraftAuto] = useState(false);
  const [busy, setBusy] = useState(false);

  const sendDraft = async (e) => {
    e.preventDefault();
    if (!draftTo || !draftIntent) return;
    setBusy(true);
    try {
      await adminApi.request("post", "/admin/email/draft", { to: draftTo, intent: draftIntent, auto_send: draftAuto });
      toast.success(draftAuto ? "Email envoyé via Brevo !" : "Brouillon envoyé pour validation.");
      setDraftIntent(""); onRefresh();
    } catch (err) { toast.error(err?.response?.data?.detail || "Erreur"); }
    finally { setBusy(false); }
  };

  const approve = async (id) => {
    try { await adminApi.request("post", "/admin/email/approve", { draft_id: id }); toast.success("Email envoyé !"); onRefresh(); }
    catch (err) { toast.error(err?.response?.data?.detail || "Erreur"); }
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "#F6F2EA", margin: "0 0 20px", display: "flex", alignItems: "center", gap: 8 }}>
        <FileText size={20} style={{ color: "#D6A85F" }} /> Composeur Email IA
      </h2>
      <form onSubmit={sendDraft} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, marginBottom: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "rgba(93,202,165,0.08)", border: "1px solid rgba(93,202,165,0.2)", borderRadius: 10, padding: 12, fontSize: 13, color: "rgba(93,202,165,0.9)", lineHeight: 1.5 }}>
          💡 <strong>Mode brouillon</strong> : écrivez en langage naturel. L'IA rédige et vous envoie le brouillon sur <strong>{adminEmail}</strong> pour validation. <strong>Mode auto</strong> : envoie directement.
        </div>
        <div>
          <label style={{ fontSize: 11, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(246,242,234,0.45)", display: "block", marginBottom: 6 }}>Destinataire</label>
          <input type="email" required value={draftTo} onChange={e => setDraftTo(e.target.value)} placeholder="user@exemple.com" style={{ width: "100%", height: 42, padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#F6F2EA", fontSize: 14, outline: "none", boxSizing: "border-box" }} data-testid="admin-draft-to-input" />
        </div>
        <div>
          <label style={{ fontSize: 11, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(246,242,234,0.45)", display: "block", marginBottom: 6 }}>Intention (langage naturel)</label>
          <textarea required value={draftIntent} onChange={e => setDraftIntent(e.target.value)} rows={4} placeholder="Ex: Remercier ce nouveau client GROW, lui rappeler qu'il peut connecter son Drive dans Paramètres" style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#F6F2EA", fontSize: 13, outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} data-testid="admin-draft-intent-input" />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={draftAuto} onChange={e => setDraftAuto(e.target.checked)} style={{ width: 16, height: 16 }} data-testid="admin-draft-auto-checkbox" />
          <span style={{ color: "rgba(246,242,234,0.7)" }}>Envoyer directement (sans validation manuelle)</span>
        </label>
        <button type="submit" disabled={busy || !draftTo || !draftIntent} style={{ height: 44, background: "#D6A85F", color: "#0B1F3A", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy || !draftTo || !draftIntent ? 0.5 : 1 }} data-testid="admin-draft-submit-btn">
          {busy ? <Loader2 size={15} className="spin" /> : <FileEdit size={15} />} {draftAuto ? "Générer + envoyer" : "Générer le brouillon"}
        </button>
      </form>
      <h3 style={{ color: "#F6F2EA", fontSize: 16, margin: "0 0 14px" }}>Historique ({emails.length})</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {emails.map(m => (
          <div key={m.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14 }} data-testid={`admin-email-${m.id}`}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, fontFamily: "monospace", padding: "2px 8px", borderRadius: 6, background: m.status === "sent" ? "rgba(93,202,165,0.15)" : m.status === "draft" ? "rgba(214,168,95,0.15)" : "rgba(220,80,80,0.15)", color: m.status === "sent" ? "#5DCAA5" : m.status === "draft" ? "#D6A85F" : "#e05050", border: `1px solid ${m.status === "sent" ? "rgba(93,202,165,0.3)" : m.status === "draft" ? "rgba(214,168,95,0.3)" : "rgba(220,80,80,0.3)"}` }}>{m.status}</span>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(246,242,234,0.4)" }}>→ {m.to}</span>
                </div>
                <p style={{ fontWeight: 600, fontSize: 14, color: "#F6F2EA", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.subject}</p>
                <p style={{ fontSize: 12, color: "rgba(246,242,234,0.4)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.intent}</p>
              </div>
              {m.status === "draft" && (
                <button onClick={() => approve(m.id)} style={{ height: 32, padding: "0 12px", background: "rgba(93,202,165,0.15)", color: "#5DCAA5", border: "1px solid rgba(93,202,165,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }} data-testid={`admin-approve-${m.id}`}><Send size={12} /> Approuver</button>
              )}
            </div>
          </div>
        ))}
        {emails.length === 0 && <p style={{ textAlign: "center", color: "rgba(246,242,234,0.3)", fontSize: 14, padding: "30px 0" }}>Aucun email pour le moment.</p>}
      </div>
    </div>
  );
}

// ─── INTÉGRATION WORDPRESS ─────────────────────────────────────
function AdminWordPress() {
  const [wpUrl, setWpUrl] = useState("");
  const [wpUser, setWpUser] = useState("");
  const [wpPass, setWpPass] = useState("");
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [genBusy, setGenBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await adminApi.request("post", "/admin/wordpress/connect", { url: wpUrl, username: wpUser, app_password: wpPass });
      toast.success("WordPress connecté !"); setConnected(true);
    } catch (err) { toast.error(err?.response?.data?.detail || "Erreur de connexion"); }
    finally { setBusy(false); }
  };

  const generateAndPublish = async () => {
    if (!aiTopic) return;
    setGenBusy(true); setAiResult(null);
    try {
      const res = await adminApi.request("post", "/admin/wordpress/ai-publish", { topic: aiTopic });
      setAiResult(res); toast.success("Article publié sur WordPress !");
    } catch (err) { toast.error(err?.response?.data?.detail || "Erreur publication"); }
    finally { setGenBusy(false); }
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "#F6F2EA", margin: "0 0 20px", display: "flex", alignItems: "center", gap: 8 }}>
        <Globe size={20} style={{ color: "#D6A85F" }} /> Intégration WordPress
      </h2>
      {!connected ? (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <p style={{ color: "#F6F2EA", fontSize: 14, marginBottom: 16 }}>Connectez votre site WordPress pour publier des articles directement depuis la console admin Zayado.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "URL du site WordPress", val: wpUrl, set: setWpUrl, placeholder: "https://zayado.net" },
              { label: "Nom d'utilisateur admin", val: wpUser, set: setWpUser, placeholder: "admin" },
              { label: "Mot de passe d'application (WordPress)", val: wpPass, set: setWpPass, placeholder: "xxxx xxxx xxxx xxxx", type: "password" },
            ].map(f => (
              <div key={f.label}>
                <label style={{ fontSize: 11, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(246,242,234,0.45)", display: "block", marginBottom: 6 }}>{f.label}</label>
                <input type={f.type || "text"} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                  style={{ width: "100%", height: 42, padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#F6F2EA", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <p style={{ fontSize: 12, color: "rgba(246,242,234,0.35)", margin: 0, lineHeight: 1.5 }}>
              Pour créer un mot de passe d'application WordPress : Tableau de bord → Utilisateurs → Votre profil → Mots de passe d'application.
            </p>
            <button onClick={save} disabled={busy || !wpUrl || !wpUser || !wpPass}
              style={{ height: 42, background: "#D6A85F", color: "#0B1F3A", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy || !wpUrl || !wpUser || !wpPass ? 0.5 : 1 }}>
              {busy ? <Loader2 size={15} className="spin" /> : <Check size={15} />} Connecter WordPress
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ background: "rgba(93,202,165,0.08)", border: "1px solid rgba(93,202,165,0.3)", borderRadius: 12, padding: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle2 size={18} style={{ color: "#5DCAA5", flexShrink: 0 }} />
            <p style={{ color: "#5DCAA5", fontSize: 14, margin: 0 }}>WordPress connecté — {wpUrl}</p>
            <button onClick={() => setConnected(false)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "rgba(246,242,234,0.4)", fontSize: 12 }}>Déconnecter</button>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(214,168,95,0.2)", borderRadius: 16, padding: 20 }}>
            <h3 style={{ color: "#F6F2EA", fontSize: 15, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}><Sparkles size={15} style={{ color: "#D6A85F" }} /> Générer + publier un article IA</h3>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <input value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="Ex: Comment prévenir le burn-out en tant que solopreneur"
                style={{ flex: 1, height: 42, padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#F6F2EA", fontSize: 13, outline: "none" }} />
              <button onClick={generateAndPublish} disabled={genBusy || !aiTopic}
                style={{ height: 42, padding: "0 18px", background: "#D6A85F", color: "#0B1F3A", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, opacity: genBusy || !aiTopic ? 0.5 : 1 }}>
                {genBusy ? <Loader2 size={14} className="spin" /> : <Zap size={14} />} Générer & publier
              </button>
            </div>
            {aiResult && (
              <div style={{ background: "rgba(93,202,165,0.08)", border: "1px solid rgba(93,202,165,0.2)", borderRadius: 10, padding: 14 }}>
                <p style={{ color: "#5DCAA5", fontWeight: 600, fontSize: 14, margin: "0 0 6px" }}>✓ Publié avec succès</p>
                {aiResult.url && <a href={aiResult.url} target="_blank" rel="noopener noreferrer" style={{ color: "#D6A85F", fontSize: 13 }}>{aiResult.url}</a>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── DASHBOARD ADMIN ───────────────────────────────────────────
function AdminDashboard({ adminEmail, onLogout }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [emails, setEmails] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messagesCounts, setMessagesCounts] = useState({ new: 0, read: 0, replied: 0 });
  const [tab, setTab] = useState("overview");

  const refresh = useCallback(async () => {
    try {
      const [s, u, e, m] = await Promise.all([
        adminApi.request("GET", "/admin/stats"),
        adminApi.request("GET", "/admin/users"),
        adminApi.request("GET", "/admin/emails"),
        adminApi.request("GET", "/admin/messages"),
      ]);
      setStats(s); setUsers(u); setEmails(e);
      setMessages(m.items || []);
      setMessagesCounts(m.counts || { new: 0, read: 0, replied: 0 });
    } catch (err) {
      if (err?.response?.status === 401) onLogout();
      else toast.error("Erreur de chargement");
    }
  }, [onLogout]);

  useEffect(() => { refresh(); }, [refresh]);

  const setMessageStatus = async (id, status) => {
    try { await adminApi.request("post", `/admin/messages/${id}/status`, { status }); refresh(); }
    catch { toast.error("Erreur"); }
  };

  const TABS = [
    { id: "overview",  label: "Vue d'ensemble" },
    { id: "messages",  label: `Messages${messagesCounts.new > 0 ? ` (${messagesCounts.new})` : ""}` },
    { id: "reminders", label: "Relances" },
    { id: "users",     label: "Utilisateurs" },
    { id: "emails",    label: "Emails IA" },
    { id: "articles",  label: "Articles SEO" },
    { id: "wordpress", label: "WordPress" },
    { id: "ia",        label: "IA" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0B1F3A", color: "#F6F2EA" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(11,31,58,0.95)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(214,168,95,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={16} style={{ color: "#D6A85F" }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#F6F2EA", margin: 0 }}>Admin Zayado</p>
              <p style={{ fontSize: 11, color: "rgba(246,242,234,0.4)", fontFamily: "monospace", margin: 0 }}>{adminEmail}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer", transition: "all 0.15s", background: tab === t.id ? "#D6A85F" : "rgba(255,255,255,0.06)", color: tab === t.id ? "#0B1F3A" : "rgba(246,242,234,0.6)" }}
                data-testid={`admin-tab-${t.id}`}>{t.label}</button>
            ))}
            <button onClick={onLogout} style={{ marginLeft: 8, padding: 8, background: "none", border: "none", cursor: "pointer", color: "rgba(246,242,234,0.4)" }} title="Déconnexion" data-testid="admin-logout-btn">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 80px" }}>

        {tab === "overview" && stats && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }} data-testid="admin-overview">
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#F6F2EA", margin: 0 }}>Vue d'ensemble · Zayado MyExtension AI</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              <StatsCard icon={Users} label="Utilisateurs total" value={stats.users?.total || 0} />
              <StatsCard icon={Users} label="Plan GROW" value={stats.users?.pro || 0} color="#5DCAA5" />
              <StatsCard icon={Users} label="Plan SERENITY" value={stats.users?.serenity || 0} color="#D6A85F" />
              <StatsCard icon={TrendingUp} label="Inscrits 30j" value={stats.users?.signups_30d || 0} color="#60a5fa" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "rgba(93,202,165,0.08)", border: "1px solid rgba(93,202,165,0.25)", borderRadius: 18, padding: 24 }}>
                <p style={{ fontSize: 11, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "#5DCAA5", marginBottom: 8 }}>Revenus mensuels (MRR)</p>
                <p style={{ fontSize: 44, fontWeight: 700, color: "#5DCAA5", margin: "0 0 8px" }}>{(stats.revenue?.mrr_eur || 0).toFixed(2)}<span style={{ fontSize: 20, color: "rgba(93,202,165,0.5)", marginLeft: 4 }}>€</span></p>
                <p style={{ fontSize: 12, color: "rgba(93,202,165,0.6)", margin: 0 }}>ARPU : {stats.revenue?.arpu_pro_eur || 0}€ · {stats.users?.pro || 0} abonnés actifs</p>
              </div>
              <div style={{ background: stats.profit?.is_profitable ? "rgba(93,202,165,0.08)" : "rgba(220,80,80,0.08)", border: `1px solid ${stats.profit?.is_profitable ? "rgba(93,202,165,0.25)" : "rgba(220,80,80,0.25)"}`, borderRadius: 18, padding: 24 }}>
                <p style={{ fontSize: 11, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: stats.profit?.is_profitable ? "#5DCAA5" : "#e05050", marginBottom: 8 }}>
                  {stats.profit?.is_profitable ? "Profit mensuel" : "Perte mensuelle"}
                </p>
                <p style={{ fontSize: 44, fontWeight: 700, color: stats.profit?.is_profitable ? "#5DCAA5" : "#e05050", margin: "0 0 8px" }}>
                  {stats.profit?.monthly_eur >= 0 ? "+" : ""}{(stats.profit?.monthly_eur || 0).toFixed(2)}<span style={{ fontSize: 20, marginLeft: 4, opacity: 0.5 }}>€</span>
                </p>
                <div style={{ fontSize: 12, color: "rgba(246,242,234,0.4)", display: "flex", flexDirection: "column", gap: 2 }}>
                  <span>LLM : −{stats.costs?.llm_eur || 0}€</span>
                  <span>Infra : −{stats.costs?.infra_eur || 0}€</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "messages" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="admin-messages-list">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#F6F2EA", margin: 0, display: "flex", alignItems: "center", gap: 8 }}><Inbox size={20} style={{ color: "#D6A85F" }} /> Messages support</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {[{ label: `Nouveaux : ${messagesCounts.new}`, color: "#D6A85F" }, { label: `Lus : ${messagesCounts.read}`, color: "#60a5fa" }, { label: `Répondus : ${messagesCounts.replied}`, color: "#5DCAA5" }].map(b => (
                  <span key={b.label} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, background: `${b.color}15`, color: b.color, border: `1px solid ${b.color}30` }}>{b.label}</span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map(m => (
                <div key={m.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18 }} data-testid={`admin-message-${m.id}`}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, fontFamily: "monospace", padding: "2px 8px", borderRadius: 6, background: m.status === "new" ? "rgba(214,168,95,0.15)" : m.status === "replied" ? "rgba(93,202,165,0.15)" : "rgba(96,165,250,0.15)", color: m.status === "new" ? "#D6A85F" : m.status === "replied" ? "#5DCAA5" : "#60a5fa", border: `1px solid ${m.status === "new" ? "rgba(214,168,95,0.3)" : m.status === "replied" ? "rgba(93,202,165,0.3)" : "rgba(96,165,250,0.3)"}` }}>{m.status}</span>
                        <span style={{ fontWeight: 600, color: "#F6F2EA", fontSize: 14 }}>{m.name || "Anonyme"}</span>
                        <a href={`mailto:${m.email}`} style={{ fontSize: 12, fontFamily: "monospace", color: "#D6A85F" }}>{m.email}</a>
                      </div>
                      <p style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(246,242,234,0.35)", margin: 0 }}>{m.created_at?.replace("T", " ").slice(0, 16)}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {m.status !== "read" && <button onClick={() => setMessageStatus(m.id, "read")} style={{ height: 32, padding: "0 12px", background: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)", borderRadius: 8, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }} data-testid={`admin-msg-read-${m.id}`}><Eye size={12} /> Lire</button>}
                      {m.status !== "replied" && <button onClick={() => setMessageStatus(m.id, "replied")} style={{ height: 32, padding: "0 12px", background: "rgba(93,202,165,0.15)", color: "#5DCAA5", border: "1px solid rgba(93,202,165,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }} data-testid={`admin-msg-replied-${m.id}`}><Reply size={12} /> Répondu</button>}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(246,242,234,0.8)", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 14, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{m.message}</div>
                </div>
              ))}
              {messages.length === 0 && <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(246,242,234,0.3)" }}><MessageCircle size={36} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} /><p style={{ fontSize: 14, margin: 0 }}>Aucun message pour le moment.</p></div>}
            </div>
          </div>
        )}

        {tab === "reminders" && <AdminReminders />}

        {tab === "users" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="admin-users-list">
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#F6F2EA", margin: 0 }}>Utilisateurs ({users.length})</h2>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.25)" }}>
                    {["Email", "Plan", "Analyses", "Provider", "Inscrit"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(246,242,234,0.4)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "monospace", color: "#F6F2EA" }}>{u.email}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: 10, fontFamily: "monospace", padding: "2px 8px", borderRadius: 6, background: u.plan === "grow" || u.plan === "pro" ? "rgba(93,202,165,0.15)" : u.plan === "serenity" ? "rgba(214,168,95,0.15)" : "rgba(150,150,150,0.12)", color: u.plan === "grow" || u.plan === "pro" ? "#5DCAA5" : u.plan === "serenity" ? "#D6A85F" : "rgba(246,242,234,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>{u.plan}</span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: "rgba(246,242,234,0.6)" }}>{u.analyses_used}/{u.quota_month >= 9999 ? "∞" : u.quota_month}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "rgba(246,242,234,0.4)" }}>{u.provider}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "rgba(246,242,234,0.4)", fontFamily: "monospace" }}>{u.created_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "rgba(246,242,234,0.3)", fontSize: 14 }}>Aucun utilisateur</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "emails" && <AdminEmails adminEmail={adminEmail} emails={emails} onRefresh={refresh} />}
        {tab === "articles" && <AdminArticles />}
        {tab === "wordpress" && <AdminWordPress />}
        {tab === "ia" && <AdminAI />}
      </main>
    </div>
  );
}

// ─── ADMIN IA — Bascule fournisseur IA (Mammouth / Emergent) ────
function AdminAI() {
  const [provider, setProvider] = useState(null);
  const [info, setInfo] = useState({ mammouth_configured: false, emergent_configured: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.request("GET", "/admin/ai-provider")
      .then((d) => { setProvider(d.provider); setInfo(d); })
      .catch(() => toast.error("Erreur de chargement"));
  }, []);

  const save = async (p) => {
    setSaving(true);
    try {
      await adminApi.request("put", "/admin/ai-provider", { provider: p });
      setProvider(p);
      toast.success(`Fournisseur IA : ${p === "auto" ? "Automatique" : p === "mammouth" ? "Mammouth" : "Emergent"}`);
    } catch {
      toast.error("Impossible d'enregistrer");
    } finally {
      setSaving(false);
    }
  };

  const OPTIONS = [
    { id: "auto", title: "Automatique", desc: "Mammouth en priorité, bascule sur Emergent en cas d'échec (recommandé)." },
    { id: "mammouth", title: "Mammouth", desc: "Utilise uniquement votre clé Mammouth. Aucun repli." },
    { id: "emergent", title: "Emergent", desc: "Utilise uniquement la clé universelle Emergent." },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }} data-testid="admin-ai-panel">
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#F6F2EA", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={20} style={{ color: "#D6A85F" }} /> Fournisseur IA
        </h2>
        <p style={{ fontSize: 13, color: "rgba(246,242,234,0.5)", margin: "8px 0 0" }}>
          Choisissez le moteur IA utilisé pour la génération d'images, les analyses et le simulateur. Le changement est immédiat, sans redéploiement.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: info.mammouth_configured ? "rgba(93,202,165,0.15)" : "rgba(220,80,80,0.12)", color: info.mammouth_configured ? "#5DCAA5" : "#e05050", border: "1px solid rgba(255,255,255,0.08)" }}>
          Mammouth {info.mammouth_configured ? "configuré" : "absent"}
        </span>
        <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: info.emergent_configured ? "rgba(93,202,165,0.15)" : "rgba(220,80,80,0.12)", color: info.emergent_configured ? "#5DCAA5" : "#e05050", border: "1px solid rgba(255,255,255,0.08)" }}>
          Emergent {info.emergent_configured ? "configuré" : "absent"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {OPTIONS.map((o) => {
          const active = provider === o.id;
          return (
            <button
              key={o.id}
              disabled={saving}
              onClick={() => save(o.id)}
              data-testid={`admin-ai-provider-${o.id}`}
              style={{
                textAlign: "left", cursor: saving ? "wait" : "pointer",
                background: active ? "rgba(214,168,95,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${active ? "#D6A85F" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 14, padding: "16px 18px", transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
              }}
            >
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: active ? "#D6A85F" : "#F6F2EA", margin: 0 }}>{o.title}</p>
                <p style={{ fontSize: 12, color: "rgba(246,242,234,0.5)", margin: "4px 0 0", lineHeight: 1.5 }}>{o.desc}</p>
              </div>
              <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, border: `2px solid ${active ? "#D6A85F" : "rgba(255,255,255,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {active && <Check size={14} style={{ color: "#D6A85F" }} />}
              </div>
            </button>
          );
        })}
      </div>
      {provider === null && <p style={{ fontSize: 13, color: "rgba(246,242,234,0.4)" }}>Chargement…</p>}
    </div>
  );
}

// ─── EXPORT PRINCIPAL ─────────────────────────────────────────
export default function Admin() {
  const [adminEmail, setAdminEmail] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const tok = adminApi.getToken();
    if (!tok) { setChecking(false); return; }
    adminApi.request("GET", "/admin/me")
      .then(data => setAdminEmail(data.email))
      .catch(() => adminApi.clearToken())
      .finally(() => setChecking(false));
  }, []);

  if (checking) return (
    <div style={{ minHeight: "100vh", background: "#0B1F3A", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={28} className="spin" style={{ color: "#D6A85F" }} />
    </div>
  );

  return adminEmail
    ? <AdminDashboard adminEmail={adminEmail} onLogout={() => { adminApi.clearToken(); setAdminEmail(null); }} />
    : <AdminLogin onLogged={e => setAdminEmail(e)} />;
}
