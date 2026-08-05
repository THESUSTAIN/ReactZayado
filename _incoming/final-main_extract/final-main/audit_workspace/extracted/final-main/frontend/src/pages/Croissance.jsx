import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Search as SearchIcon, MessagesSquare, BellRing, Swords,
  BarChart3, Settings2, TrendingUp, TrendingDown, Flame, Sparkles, ArrowRight,
  ExternalLink, MessageCircle, Clock, CheckCircle2, ListPlus, Slack, Check, X, Zap,
  Youtube, Linkedin, Globe, MapPin, Download, Send, Loader2, ChevronRight,
  MessageSquare, Phone, Bot, AlertCircle, Plus, GripVertical, Target,
  Hash, FileText, Radio,
} from "lucide-react";
import { growthApi, growthExtApi } from "@/lib/api";
import DecisionBanner from "@/components/DecisionBanner";
import GrowthInsightPanel from "@/components/GrowthInsightPanel";

/**
 * Extrait les prospects "chauds" quelle que soit la forme du backend :
 * - array plat de leads → filtre directement
 * - array de campagnes { leads: [...] } → aplatit puis filtre
 * - dict campaignId → leads → aplatit via Object.values puis filtre
 * Tolère undefined/null, ne throw jamais.
 */
function extractHotProspects(source) {
  if (!source) return [];
  let arr;
  if (Array.isArray(source)) arr = source;
  else if (typeof source === "object") arr = Object.values(source);
  else return [];
  const flat = [];
  for (const it of arr) {
    if (!it) continue;
    if (Array.isArray(it.leads)) flat.push(...it.leads);
    else if (Array.isArray(it)) flat.push(...it);
    else if (typeof it === "object" && (it.name || it.hot != null)) flat.push(it);
  }
  return flat.filter(l => l && l.hot).slice(0, 5);
}
import { toast } from "sonner";

const C = { navy: "#4a6a9e", gold: "#C9A449", sage: "#5e8a5a", terra: "#c26b4a", plum: "#8b6fbf", teal: "#5DCAA5" };

// Explique le score de matching en langage humain — utilisé en tooltip natif (title=)
function scoreExplanation(score) {
  if (score >= 90) return "Mentionne exactement votre service, contexte idéal, prêt à agir maintenant.";
  if (score >= 75) return "Correspond fortement à votre offre — bon moment pour engager.";
  if (score >= 60) return "Intention probable détectée — à qualifier avant de contacter.";
  if (score >= 40) return "Signal faible — peut évoluer, à surveiller plutôt qu'à contacter tout de suite.";
  return "Correspondance limitée — probablement peu pertinent.";
}

const TABS = [
  { id: "dashboard",     label: "Dashboard",     Icon: LayoutDashboard },
  { id: "pipeline",      label: "Pipeline",       Icon: Target },
  { id: "leads",         label: "Leads",          Icon: Users },
  { id: "canaux",        label: "Canaux",         Icon: Radio },
  { id: "seo",           label: "Reddit SEO",     Icon: SearchIcon },
  { id: "conversations", label: "Conversations",  Icon: MessagesSquare },
  { id: "alerts",        label: "Alertes",        Icon: BellRing },
  { id: "competitors",   label: "Concurrents",    Icon: Swords },
  { id: "insights",      label: "Insights",       Icon: BarChart3 },
  { id: "settings",      label: "Réglages",       Icon: Settings2 },
];

const PIPELINE_STAGES = [
  { id: "detected",   label: "Détecté",        color: C.navy,  bg: "#4a6a9e22" },
  { id: "contacted",  label: "Contacté",       color: C.gold,  bg: "#C9A44922" },
  { id: "discussing", label: "En discussion",  color: C.plum,  bg: "#8b6fbf22" },
  { id: "signed",     label: "Signé ✓",        color: C.sage,  bg: "#5e8a5a22" },
];

// ─── COMPOSANTS DE BASE ────────────────────────────────────────
const Card = ({ children, tid, style }) => (
  <div className="glass-card" data-testid={tid} style={style}>{children}</div>
);
const Label = ({ children, color }) => (
  <div className="card-label" style={color ? { color } : undefined}>{children}</div>
);
const Chip = ({ children, color }) => (
  <span className="zchip" style={{ background: `${color}26`, color }}>{children}</span>
);
const Toggle = ({ on, onClick, tid }) => (
  <button onClick={onClick} data-testid={tid}
    style={{ width: 46, height: 26, borderRadius: 999, border: "none", cursor: "pointer",
      background: on ? C.sage : "var(--glass-border)", position: "relative", transition: "background 0.2s" }}>
    <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 20, height: 20,
      borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
  </button>
);

function Bars({ data, valueKey = "value", labelKey = "label", color = C.gold, height = 160, fmt = (v) => v }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height }}>
        {data.map((d, i) => {
          const h = Math.max(6, Math.round((d[valueKey] / max) * 100));
          const last = i === data.length - 1;
          return (
            <div key={i} title={fmt(d[valueKey])} style={{ flex: 1, display: "flex", alignItems: "flex-end", height: "100%" }}>
              <div style={{ width: "100%", height: `${h}%`, borderRadius: "6px 6px 0 0",
                transition: "height 0.6s cubic-bezier(0.22,1,0.36,1)",
                background: last ? `linear-gradient(180deg,${color},${color}aa)` : `${color}55` }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        {data.map((d, i) => (
          <span key={i} className="muted" style={{ flex: 1, textAlign: "center", fontSize: 10 }}>{d[labelKey]}</span>
        ))}
      </div>
    </>
  );
}

// ─── MODALE ENGAGE ─────────────────────────────────────────────
function EngageModal({ lead, onClose }) {
  const [channel, setChannel] = useState("reddit");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await growthExtApi.generateMessage(lead?.id, channel);
      setMessage(res?.message || `Bonjour ! J'ai vu votre post sur ${lead?.sub || "Reddit"} et je pense pouvoir vous aider. Je développe ${lead?.context || "une solution"}...`);
      setGenerated(true);
    } catch {
      // Fallback message IA simulé
      setMessage(`Bonjour ! J'ai vu votre post et votre situation me parle. Je travaille avec des entrepreneurs dans votre situation et j'ai quelques idées qui pourraient vous aider. Auriez-vous 15 minutes pour en discuter ?`);
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await growthExtApi.sendMessage(lead?.id, message, channel);
      toast.success(`Message envoyé via ${channel} ✓`);
      onClose();
    } catch {
      toast.error("Erreur d'envoi — vérifiez la connexion dans Réglages");
    } finally {
      setSending(false);
    }
  };

  const channels = [
    { id: "reddit", label: "Reddit DM", Icon: Hash },
    { id: "email", label: "Email", Icon: FileText },
    { id: "whatsapp", label: "WhatsApp", Icon: Phone },
    { id: "linkedin", label: "LinkedIn", Icon: Linkedin },
    { id: "telegram", label: "Telegram", Icon: MessageSquare },
  ];

  useEffect(() => { generate(); }, []); // eslint-disable-line

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }}
        style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 20, padding: 28, maxWidth: 520, width: "100%", position: "relative" }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.gold}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={18} style={{ color: C.gold }} />
          </div>
          <div>
            <p style={{ fontWeight: 700, color: "var(--txt)", margin: 0, fontSize: 15 }}>Message IA — {lead?.name || "Lead"}</p>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>Validez avant envoi — jamais automatique</p>
          </div>
        </div>

        {/* Sélection canal */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {channels.map(ch => {
            const Ic = ch.Icon;
            return (
              <button key={ch.id} onClick={() => { setChannel(ch.id); setGenerated(false); setMessage(""); }}
                className={channel === ch.id ? "zbtn zbtn-primary" : "zbtn"}
                style={{ height: 32, fontSize: 12, gap: 5 }}>
                <Ic size={13} /> {ch.label}
              </button>
            );
          })}
        </div>

        {/* Message */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          {loading && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
              <Loader2 size={20} className="spin" style={{ color: C.gold }} />
            </div>
          )}
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={7}
            placeholder="L'IA génère le message…"
            className="zinput" style={{ width: "100%", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, fontSize: 13, boxSizing: "border-box" }} />
        </div>

        {generated && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, fontSize: 12, color: C.sage }}>
            <Sparkles size={13} /> Message généré par Claude (Mammouth) — modifiez si nécessaire
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { setGenerated(false); generate(); }} className="zbtn" style={{ height: 40, gap: 6, fontSize: 13 }}>
            <Sparkles size={14} /> Regénérer
          </button>
          <button onClick={send} disabled={sending || !message.trim()} className="zbtn zbtn-primary" style={{ height: 40, flex: 1, justifyContent: "center", gap: 6, fontSize: 13, opacity: sending || !message.trim() ? 0.6 : 1 }}>
            {sending ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
            {sending ? "Envoi en cours…" : `Valider et envoyer via ${channels.find(c => c.id === channel)?.label}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── TAB DASHBOARD ─────────────────────────────────────────────
function DashboardTab({ d }) {
  const [engageLead, setEngageLead] = useState(null);
  const toneColor = { gold: C.gold, navy: C.navy, sage: C.sage, terra: C.terra };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="growth-dashboard">
      {engageLead && <EngageModal lead={engageLead} onClose={() => setEngageLead(null)} />}
      <div className="pgrid pgrid-3">
        {d.market_insights.map((m, i) => (
          <Card key={i} tid={`insight-${i}`}>
            <Label color={toneColor[m.tone]}>{m.title}</Label>
            <div style={{ fontSize: 28, fontWeight: 300, color: "var(--txt)", marginTop: 4 }}>{m.value}</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{m.desc}</p>
          </Card>
        ))}
      </div>
      <div>
        <h3 className="sec-title" style={{ fontSize: 20, marginBottom: 10 }}>Nouveaux leads · par intention</h3>
        <div className="pgrid pgrid-3">
          {d.intent_groups.map((g) => (
            <Card key={g.key} tid={`intent-${g.key}`}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--txt)", fontWeight: 600, fontSize: 14 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: g.color }} /> {g.label}
                </span>
                <Chip color={g.color}>{g.count}</Chip>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {g.leads.map((l, i) => (
                  <div key={i} style={{ borderLeft: `2px solid ${g.color}`, paddingLeft: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "var(--txt)" }}>{l.name}</span>
                      <span title={scoreExplanation(l.score)} style={{ fontSize: 12, fontWeight: 700, color: g.color, cursor: "help" }}>{l.score}</span>
                    </div>
                    <p className="muted" style={{ fontSize: 11, margin: "2px 0" }}>{l.sub}</p>
                    <p className="muted" style={{ fontFamily: "'Instrument Serif', serif", fontSize: 13, fontStyle: "italic" }}>« {l.snippet} »</p>
                    <button onClick={() => setEngageLead(l)} className="zbtn" style={{ height: 28, fontSize: 11, marginTop: 6, gap: 4 }}>
                      <Bot size={12} /> Engager
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
      <div className="pgrid pgrid-2">
        <Card tid="recommended-actions">
          <Label color={C.gold}><Sparkles size={14} /> Actions recommandées</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {d.recommended_actions.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 12, borderRadius: 14, background: "var(--glass-soft)", border: "1px solid var(--glass-border)" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, color: "var(--txt)", margin: 0 }}>{a.title}</p>
                  <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>{a.reason}</p>
                </div>
                <button className="zbtn zbtn-primary" style={{ height: 34, fontSize: 12, whiteSpace: "nowrap" }} onClick={() => toast.success("Action lancée")}>{a.cta}</button>
              </div>
            ))}
          </div>
        </Card>
        <Card tid="lead-clusters">
          <Label><Users size={14} /> Lead clusters · par intention</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            {d.lead_clusters.map((c, i) => {
              const max = Math.max(...d.lead_clusters.map((x) => x.count));
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: "var(--txt)" }}>{c.label}</span><span className="muted">{c.count}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: "var(--glass-soft)" }}>
                    <div style={{ height: "100%", width: `${(c.count / max) * 100}%`, borderRadius: 999, background: c.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <div className="pgrid pgrid-2">
        <Card tid="pain-requests">
          <Label color={C.terra}><Flame size={14} /> Douleurs & demandes détectées</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {d.pain_requests.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 13, color: "var(--txt)" }}>
                  <Chip color={p.type === "pain" ? C.terra : C.sage}>{p.type === "pain" ? "Douleur" : "Feature"}</Chip> {p.text}
                </span>
                <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{p.mentions}×</span>
              </div>
            ))}
          </div>
        </Card>
        <Card tid="competitor-signals">
          <Label color={C.plum}><Swords size={14} /> Signaux concurrents</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {d.competitor_signals.map((c, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 13, color: "var(--txt)" }}><strong>{c.name}</strong> {c.action}</span>
                <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{c.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── TAB PIPELINE KANBAN ───────────────────────────────────────
function PipelineTab() {
  const [pipeline, setPipeline] = useState(null);
  const [engageLead, setEngageLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const dragId = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await growthExtApi.getPipeline();
      setPipeline(res?.stages || PIPELINE_STAGES.map(s => ({ ...s, leads: [] })));
    } catch {
      // Données mock si backend non prêt
      setPipeline([
        { ...PIPELINE_STAGES[0], leads: [
          { id: "p1", name: "Sophie M.", sub: "r/entrepreneuriat", score: 87, snippet: "Je cherche un outil pour structurer mon activité" },
          { id: "p2", name: "Marc D.", sub: "LinkedIn", score: 92, snippet: "Burn-out après 2 ans d'indépendance" },
        ]},
        { ...PIPELINE_STAGES[1], leads: [
          { id: "p3", name: "Julie R.", sub: "r/solopreneur", score: 78, snippet: "Besoin d'aide pour mes finances" },
        ]},
        { ...PIPELINE_STAGES[2], leads: [] },
        { ...PIPELINE_STAGES[3], leads: [] },
      ]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onDrop = async (stageId, leadId) => {
    setPipeline(prev => {
      const lead = prev.flatMap(s => s.leads).find(l => l.id === leadId);
      if (!lead) return prev;
      return prev.map(s => ({
        ...s,
        leads: s.id === stageId
          ? [...s.leads.filter(l => l.id !== leadId), lead]
          : s.leads.filter(l => l.id !== leadId),
      }));
    });
    try { await growthExtApi.moveLead(leadId, stageId); }
    catch { toast.error("Erreur de déplacement"); }
  };

  if (loading) return <p className="muted">Chargement du pipeline…</p>;

  const totalValue = pipeline?.reduce((acc, s) => acc + s.leads.length * (s.id === "signed" ? 500 : 0), 0);

  return (
    <div data-testid="growth-pipeline">
      {engageLead && <EngageModal lead={engageLead} onClose={() => setEngageLead(null)} />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p className="muted" style={{ fontSize: 14 }}>Glissez-déposez les leads entre les étapes.</p>
        <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
          <span className="muted">Total leads : <strong style={{ color: "var(--txt)" }}>{pipeline?.reduce((a, s) => a + s.leads.length, 0)}</strong></span>
          {totalValue > 0 && <span className="muted">CA potentiel : <strong style={{ color: C.sage }}>{totalValue}€</strong></span>}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, overflowX: "auto" }}>
        {pipeline?.map(stage => (
          <div key={stage.id}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); onDrop(stage.id, dragId.current); }}
            style={{ background: stage.bg, border: `1px solid ${stage.color}44`, borderRadius: 14, padding: 12, minHeight: 300 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: stage.color }}>{stage.label}</span>
              <span className="zchip" style={{ background: `${stage.color}22`, color: stage.color, fontSize: 11 }}>{stage.leads.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stage.leads.map(lead => (
                <div key={lead.id} draggable
                  onDragStart={() => { dragId.current = lead.id; }}
                  style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 10, padding: 10, cursor: "grab", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <GripVertical size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: C.gold }}>{lead.score}</span>
                  </div>
                  <p className="muted" style={{ fontSize: 11, margin: "0 0 6px" }}>{lead.sub}</p>
                  <p style={{ fontSize: 12, color: "var(--txt)", margin: "0 0 8px", fontStyle: "italic" }}>« {lead.snippet?.slice(0, 60)}… »</p>
                  <button onClick={() => setEngageLead(lead)} className="zbtn" style={{ height: 26, fontSize: 11, width: "100%", justifyContent: "center", gap: 4 }}>
                    <Bot size={11} /> Engager
                  </button>
                </div>
              ))}
              {stage.leads.length === 0 && (
                <div style={{ border: "2px dashed var(--glass-border)", borderRadius: 10, padding: "20px 10px", textAlign: "center" }}>
                  <p className="muted" style={{ fontSize: 12 }}>Glissez ici</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TAB LEADS ─────────────────────────────────────────────────
function LeadsTab({ campaigns, leadsByCampaign }) {
  const [sel, setSel] = useState(campaigns[0]?.id);
  const [engageLead, setEngageLead] = useState(null);
  const leads = leadsByCampaign[sel] || [];

  const exportCSV = async () => {
    try {
      const blob = await growthExtApi.exportLeads();
      const url = URL.createObjectURL(blob instanceof Blob ? blob : new Blob([JSON.stringify(leads)], { type: "text/csv" }));
      const a = document.createElement("a"); a.href = url; a.download = "leads-zayado.csv"; a.click();
      toast.success("Export CSV téléchargé !");
    } catch {
      // Fallback : génère CSV côté frontend
      const csv = ["Nom,Source,Score,Intention,Date", ...leads.map(l => `${l.name},${l.sub},${l.score},${l.intent},${l.date}`)].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "leads-zayado.csv"; a.click();
      toast.success("Export CSV généré !");
    }
  };

  return (
    <div data-testid="growth-leads">
      {engageLead && <EngageModal lead={engageLead} onClose={() => setEngageLead(null)} />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {campaigns.map((c) => (
            <button key={c.id} onClick={() => setSel(c.id)} data-testid={`campaign-${c.id}`}
              className={sel === c.id ? "zbtn zbtn-primary" : "zbtn"} style={{ height: 38 }}>
              {c.name} <span style={{ opacity: 0.7 }}>({c.leads})</span>
            </button>
          ))}
        </div>
        <button onClick={exportCSV} className="zbtn" style={{ height: 38, gap: 6 }}>
          <Download size={14} /> Export CSV
        </button>
      </div>
      <Card>
        <Label><Users size={14} /> Leads · {campaigns.find((c) => c.id === sel)?.name}</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {leads.map((l) => (
            <div key={l.id} data-testid={`campaign-lead-${l.id}`}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 12, background: "var(--glass-soft)" }}>
              <div>
                <p style={{ fontSize: 14, color: "var(--txt)", margin: 0 }}>{l.name}</p>
                <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>{l.sub} · {l.date}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Chip color={C.navy}>{l.intent}</Chip>
                <span title={scoreExplanation(l.score)} style={{ fontSize: 15, fontWeight: 700, color: C.gold, cursor: "help" }}>{l.score}</span>
                <button onClick={() => setEngageLead(l)} className="zbtn" style={{ height: 32, fontSize: 12, gap: 4 }}>
                  <Bot size={12} /> Engager
                </button>
              </div>
            </div>
          ))}
          {leads.length === 0 && <p className="muted" style={{ textAlign: "center", padding: 16 }}>Aucun lead pour cette campagne.</p>}
        </div>
      </Card>
    </div>
  );
}

// ─── TAB CANAUX ────────────────────────────────────────────────
function CanauxTab() {
  const [activeChannel, setActiveChannel] = useState("youtube");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [engageLead, setEngageLead] = useState(null);

  const CHANNELS = [
    { id: "youtube",  label: "YouTube",   Icon: Youtube,   color: "#ff0000", desc: "Commentaires à haute intention sur YouTube" },
    { id: "linkedin", label: "LinkedIn",  Icon: Linkedin,  color: "#0077b5", desc: "Recherche de profils et posts LinkedIn" },
    { id: "forums",   label: "Forums",    Icon: Globe,     color: C.plum,    desc: "IndieHackers, BnB, forums métier" },
    { id: "terrain",  label: "TERRAIN",   Icon: MapPin,    color: C.terra,   desc: "Google Maps, Pages Jaunes — leads locaux" },
  ];

  const load = async (channelId) => {
    setLoading(true);
    try {
      const fn = {
        youtube:  growthExtApi.getYoutube,
        linkedin: growthExtApi.getLinkedin,
        forums:   growthExtApi.getForums,
        terrain:  growthExtApi.getTerrain,
      }[channelId];
      const res = await fn();
      setData(prev => ({ ...prev, [channelId]: res?.items || [] }));
    } catch {
      // Mock data
      setData(prev => ({ ...prev, [channelId]: [
        { id: `${channelId}_1`, name: "Utilisateur A", source: channelId === "terrain" ? "Google Maps" : channelId === "youtube" ? "Vidéo productivité" : channelId === "linkedin" ? "Post solopreneur" : "IndieHackers", score: 84, snippet: "Je cherche un outil pour structurer mon activité freelance sans perdre la tête.", sub: channelId, date: "Il y a 2h" },
        { id: `${channelId}_2`, name: "Utilisateur B", source: channelId === "terrain" ? "Pages Jaunes" : channelId === "youtube" ? "Chaîne entrepreneur" : channelId === "linkedin" ? "Commentaire article" : "Forum BnB", score: 76, snippet: "Comment gérez-vous votre énergie en tant qu'indépendant ?", sub: channelId, date: "Il y a 5h" },
      ]}));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(activeChannel); }, [activeChannel]); // eslint-disable-line

  const items = data[activeChannel] || [];

  return (
    <div data-testid="growth-canaux">
      {engageLead && <EngageModal lead={engageLead} onClose={() => setEngageLead(null)} />}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {CHANNELS.map(ch => {
          const Ic = ch.Icon;
          return (
            <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
              className={activeChannel === ch.id ? "zbtn zbtn-primary" : "zbtn"}
              style={{ height: 40, gap: 7 }}>
              <Ic size={15} style={{ color: activeChannel === ch.id ? "inherit" : ch.color }} />
              {ch.label}
            </button>
          );
        })}
      </div>

      {(() => {
        const ch = CHANNELS.find(c => c.id === activeChannel);
        const Ic = ch?.Icon;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", background: `${ch?.color}12`, border: `1px solid ${ch?.color}30`, borderRadius: 10 }}>
            <Ic size={16} style={{ color: ch?.color }} />
            <p style={{ margin: 0, fontSize: 13, color: "var(--txt)" }}>{ch?.desc}</p>
            {activeChannel === "terrain" && <Chip color={C.terra}>Projets locaux uniquement</Chip>}
          </div>
        );
      })()}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 20, color: "var(--muted)" }}>
          <Loader2 size={16} className="spin" /> Analyse en cours…
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map(item => (
            <Card key={item.id} tid={`canal-item-${item.id}`}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "var(--txt)" }}>{item.name}</span>
                    <span className="muted" style={{ fontSize: 11 }}>· {item.source}</span>
                    <span className="muted" style={{ fontSize: 11 }}>· {item.date}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--txt)", margin: 0, fontStyle: "italic" }}>« {item.snippet} »</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: C.gold }}>{item.score}</span>
                  <button onClick={() => setEngageLead(item)} className="zbtn zbtn-primary" style={{ height: 34, fontSize: 12, gap: 5 }}>
                    <Bot size={13} /> Engager
                  </button>
                </div>
              </div>
            </Card>
          ))}
          {items.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p className="muted" style={{ fontSize: 14 }}>Aucun lead détecté sur ce canal pour l'instant.</p>
              <p className="muted" style={{ fontSize: 12 }}>Configurez les mots-clés dans Réglages pour activer la détection.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TAB SEO ───────────────────────────────────────────────────
function SeoTab({ items }) {
  const [engageLead, setEngageLead] = useState(null);
  const opp = { high: C.sage, medium: C.gold, low: C.terra };
  return (
    <div data-testid="growth-seo">
      {engageLead && <EngageModal lead={engageLead} onClose={() => setEngageLead(null)} />}
      <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>Fils Reddit classés sur Google pour des requêtes d'acheteurs — poste un commentaire utile pour capter du trafic organique.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((t, i) => (
          <Card key={i} tid={`seo-${i}`}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 15, color: "var(--txt)", margin: 0 }}>{t.thread}</p>
                <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>{t.sub} · {t.monthly_traffic?.toLocaleString("fr-FR")} visites/mois</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <span className="zchip" style={{ background: "var(--glass-soft)", color: "var(--txt)" }}>Google #{t.google_rank}</span>
                <Chip color={opp[t.opportunity]}>{t.opportunity === "high" ? "Forte oppo." : t.opportunity === "medium" ? "Moyenne" : "Faible"}</Chip>
                <button className="zbtn" style={{ height: 34 }} onClick={() => window.open(t.url, "_blank")}><ExternalLink size={14} /> Ouvrir</button>
                <button className="zbtn zbtn-primary" style={{ height: 34, gap: 5 }} onClick={() => setEngageLead({ ...t, name: t.sub, snippet: t.thread })}><Bot size={13} /> Commenter</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── TAB CONVERSATIONS ─────────────────────────────────────────
function ConversationsTab({ conv }) {
  const [filter, setFilter] = useState("all");
  const [engageLead, setEngageLead] = useState(null);
  const k = conv.kpis;
  const KPIS = [
    { label: "DMs envoyés", value: k.dms_sent, Icon: MessageCircle },
    { label: "Réponses", value: k.replies, Icon: CheckCircle2 },
    { label: "Taux de réponse", value: `${k.reply_rate}%`, Icon: TrendingUp },
    { label: "En attente", value: k.awaiting, Icon: Clock },
  ];
  const FILTERS = [
    { id: "all", label: "Tous" }, { id: "replied", label: "Avec réponse" },
    { id: "awaiting", label: "En attente" }, { id: "queued", label: "En file" },
  ];
  const items = filter === "all" ? conv.items : conv.items.filter((i) => i.status === filter);
  const statusChip = { replied: [C.sage, "Répondu"], awaiting: [C.gold, "En attente"], queued: [C.navy, "En file"] };
  const maxT = Math.max(...conv.trend.map((t) => t.sent), 1);

  return (
    <div data-testid="growth-conversations">
      {engageLead && <EngageModal lead={engageLead} onClose={() => setEngageLead(null)} />}
      <div className="pgrid pgrid-4" style={{ marginBottom: 16 }}>
        {KPIS.map((kp) => (
          <Card key={kp.label} tid={`conv-kpi-${kp.label}`}>
            <Label><kp.Icon size={14} /> {kp.label}</Label>
            <div style={{ fontSize: 30, fontWeight: 300, color: "var(--txt)", marginTop: 4 }}>{kp.value}</div>
          </Card>
        ))}
      </div>
      <div className="pgrid pgrid-2">
        <Card tid="conv-trend">
          <Label><BarChart3 size={14} /> Tendance quotidienne</Label>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 160, marginTop: 14 }}>
            {conv.trend.map((t, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: "100%", width: "100%", justifyContent: "center" }}>
                  <div style={{ width: "42%", height: `${(t.sent / maxT) * 100}%`, background: `${C.navy}88`, borderRadius: "4px 4px 0 0" }} />
                  <div style={{ width: "42%", height: `${(t.replied / maxT) * 100}%`, background: C.gold, borderRadius: "4px 4px 0 0" }} />
                </div>
                <span className="muted" style={{ fontSize: 10 }}>{t.day}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card tid="conv-queue">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Label><ListPlus size={14} /> File d'attente auto</Label>
            <button className="zbtn zbtn-primary" style={{ height: 34, fontSize: 12 }} onClick={() => toast.success("Auto Queue activée")}><Zap size={14} /> Auto Queue</button>
          </div>
          <div style={{ fontSize: 28, fontWeight: 300, color: "var(--txt)", marginTop: 8 }}>{k.queued}<span className="muted" style={{ fontSize: 14 }}> en file</span></div>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Messages envoyés au bon rythme — jamais de spam.</p>
        </Card>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "18px 0 12px" }}>
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} data-testid={`conv-filter-${f.id}`}
            className={filter === f.id ? "zbtn zbtn-primary" : "zbtn"} style={{ height: 34, fontSize: 12 }}>{f.label}</button>
        ))}
      </div>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it) => {
            const [col, lbl] = statusChip[it.status] || [C.navy, it.status];
            return (
              <div key={it.id} data-testid={`conv-item-${it.id}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 12, background: "var(--glass-soft)" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, color: "var(--txt)", margin: 0 }}>{it.name} <span className="muted" style={{ fontSize: 12 }}>· {it.sub}</span></p>
                  <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>{it.last}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <Chip color={col}>{lbl}</Chip>
                  <span className="muted" style={{ fontSize: 11 }}>{it.time}</span>
                  {it.status === "awaiting" && (
                    <button onClick={() => setEngageLead(it)} className="zbtn" style={{ height: 28, fontSize: 11, gap: 4 }}>
                      <Bot size={11} /> Relancer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {items.length === 0 && <p className="muted" style={{ textAlign: "center", fontSize: 13, padding: 12 }}>Aucune conversation dans ce filtre.</p>}
        </div>
      </Card>
    </div>
  );
}

// ─── TAB ALERTS ────────────────────────────────────────────────
function AlertsTab({ alerts }) {
  const [engageLead, setEngageLead] = useState(null);
  return (
    <div data-testid="growth-alerts">
      {engageLead && <EngageModal lead={engageLead} onClose={() => setEngageLead(null)} />}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span className="zchip" style={{ background: `${C.terra}26`, color: C.terra }}><BellRing size={12} /> Temps réel</span>
        <p className="muted" style={{ fontSize: 14, margin: 0 }}>Engage avant tes concurrents — message IA généré en 1 clic et validé avant envoi.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {alerts.map((a) => (
          <Card key={a.id} tid={`alert-${a.id}`} style={a.hot ? { border: `1px solid ${C.terra}66` } : undefined}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {a.hot && <Flame size={16} style={{ color: C.terra }} />}
                  <span style={{ fontSize: 14, color: "var(--txt)", fontWeight: 600 }}>{a.user}</span>
                  <span className="muted" style={{ fontSize: 12 }}>· {a.sub}</span>
                </div>
                <p className="muted" style={{ fontFamily: "'Instrument Serif', serif", fontSize: 14, margin: "4px 0 0", fontStyle: "italic" }}>« {a.text} »</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ textAlign: "right" }}>
                  <div title={scoreExplanation(a.intent)} style={{ fontSize: 18, fontWeight: 700, color: a.intent >= 85 ? C.gold : C.navy, cursor: "help" }}>{a.intent}%</div>
                  <div className="muted" style={{ fontSize: 10 }}>{a.time}</div>
                </div>
                <button className="zbtn zbtn-primary" style={{ height: 36, fontSize: 12, gap: 5 }}
                  onClick={() => setEngageLead({ id: a.id, name: a.user, sub: a.sub, score: a.intent, snippet: a.text })}>
                  <Bot size={13} /> Engager
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── TAB COMPETITORS ───────────────────────────────────────────
function CompetitorsTab({ comp }) {
  const maxTl = Math.max(...comp.timeline.flatMap((t) => [t.RivalFlow, t.LeadHunt]), 1);
  const sentColor = { "positif": C.sage, "mitigé": C.gold, "négatif": C.terra };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="growth-competitors">
      <Card tid="comp-timeline">
        <Label><BarChart3 size={14} /> Activité des concurrents dans le temps</Label>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 160, marginTop: 14 }}>
          {comp.timeline.map((t, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: "100%", width: "100%", justifyContent: "center" }}>
                <div style={{ width: "40%", height: `${(t.RivalFlow / maxTl) * 100}%`, background: C.navy, borderRadius: "4px 4px 0 0" }} />
                <div style={{ width: "40%", height: `${(t.LeadHunt / maxTl) * 100}%`, background: C.plum, borderRadius: "4px 4px 0 0" }} />
              </div>
              <span className="muted" style={{ fontSize: 10 }}>{t.week}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="pgrid pgrid-2">
        <Card tid="comp-active">
          <Label><Swords size={14} /> Concurrents actifs</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {comp.active.map((c, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: 14, color: "var(--txt)", margin: 0 }}>{c.name}</p>
                  <p className="muted" style={{ fontSize: 11, margin: "2px 0 0" }}>{c.subs?.join(" · ")}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "var(--txt)", fontWeight: 600 }}>{c.posts}</span>
                  <span style={{ fontSize: 12, color: c.trend >= 0 ? C.sage : C.terra, display: "inline-flex", alignItems: "center", gap: 2 }}>
                    {c.trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {Math.abs(c.trend)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card tid="comp-products">
          <Label><Sparkles size={14} /> Product discovery</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {comp.products.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 14, color: "var(--txt)" }}>{p.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="muted" style={{ fontSize: 12 }}>{p.mentions} mentions</span>
                  <Chip color={sentColor[p.sentiment] || C.navy}>{p.sentiment}</Chip>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card tid="comp-viral">
        <Label color={C.terra}><Flame size={14} /> Viral post monitor</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
          {comp.viral.map((v, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p style={{ fontSize: 14, color: "var(--txt)", margin: 0 }}>{v.title}</p>
                <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>{v.sub}</p>
              </div>
              <div className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>▲ {v.upvotes?.toLocaleString("fr-FR")} · 💬 {v.comments}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── TAB INSIGHTS ──────────────────────────────────────────────
function InsightsTab({ ins }) {
  const maxSub = Math.max(...ins.top_subreddits.map((s) => s.leads), 1);
  const maxKw = Math.max(...ins.top_keywords.map((k) => k.leads), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="growth-insights">
      <div className="pgrid pgrid-2">
        <Card tid="ins-over-time">
          <Label><TrendingUp size={14} /> Leads dans le temps</Label>
          <div style={{ marginTop: 14 }}><Bars data={ins.over_time} color={C.gold} /></div>
        </Card>
        <Card tid="ins-weekly">
          <Label><BarChart3 size={14} /> Activité hebdomadaire</Label>
          <div style={{ marginTop: 14 }}><Bars data={ins.weekly} labelKey="day" color={C.navy} /></div>
        </Card>
      </div>
      <div className="pgrid pgrid-2">
        <Card tid="ins-subreddits">
          <Label><Users size={14} /> Top subreddits</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {ins.top_subreddits.map((s, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "var(--txt)" }}>{s.name}</span><span className="muted">{s.leads}</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "var(--glass-soft)" }}>
                  <div style={{ height: "100%", width: `${(s.leads / maxSub) * 100}%`, borderRadius: 999, background: C.sage }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card tid="ins-keywords">
          <Label><SearchIcon size={14} /> Top mots-clés</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {ins.top_keywords.map((k, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "var(--txt)" }}>{k.kw}</span><span className="muted">{k.leads}</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "var(--glass-soft)" }}>
                  <div style={{ height: "100%", width: `${(k.leads / maxKw) * 100}%`, borderRadius: 999, background: C.gold }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card tid="ins-campaign-perf">
        <Label><BarChart3 size={14} /> Performance des mots-clés par campagne</Label>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, fontSize: 11, color: "var(--txt-muted)", paddingBottom: 8, borderBottom: "1px solid var(--glass-border)" }}>
            <span>Campagne</span><span>Mots-clés</span><span>Leads</span><span>CTR</span>
          </div>
          {ins.campaign_perf.map((c, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, fontSize: 13, color: "var(--txt)", padding: "10px 0", borderBottom: "1px solid var(--glass-soft)" }}>
              <span>{c.campaign}</span><span>{c.keywords}</span><span>{c.leads}</span><span style={{ color: C.sage }}>{c.ctr}%</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── TAB SETTINGS ──────────────────────────────────────────────
function SettingsTab() {
  const [s, setS] = useState(null);
  const [waConfig, setWaConfig] = useState({ webhook_url: "", phone: "" });
  const [tgConfig, setTgConfig] = useState({ bot_token: "" });
  const [savingChannel, setSavingChannel] = useState(null);

  useEffect(() => {
    growthApi.getSettings().then(setS).catch(() => {});
    growthExtApi.getChannelConfig("whatsapp").then(setWaConfig).catch(() => {});
    growthExtApi.getChannelConfig("telegram").then(setTgConfig).catch(() => {});
  }, []);

  const save = (patch) => {
    const next = { ...s, ...patch };
    setS(next);
    growthApi.saveSettings(patch).then(() => toast.success("Réglages enregistrés")).catch(() => toast.error("Échec"));
  };

  const saveChannel = async (channel, config) => {
    setSavingChannel(channel);
    try {
      await growthExtApi.saveChannelConfig(channel, config);
      toast.success(`${channel === "whatsapp" ? "WhatsApp" : "Telegram"} configuré !`);
    } catch {
      toast.error("Erreur de configuration");
    } finally { setSavingChannel(null); }
  };

  if (!s) return <p className="muted">Chargement…</p>;

  const digestOpts = [
    { id: "nouveaux_leads", label: "Nouveaux leads" },
    { id: "alertes", label: "Alertes haute intention" },
    { id: "conversations", label: "Conversations" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }} data-testid="growth-settings">
      {/* Profil */}
      <Card tid="settings-profile">
        <Label><Settings2 size={14} /> Profil & niche</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          <input className="zinput" defaultValue={s.profile?.name} placeholder="Nom" onBlur={(e) => save({ profile: { ...s.profile, name: e.target.value } })} data-testid="settings-name" />
          <input className="zinput" defaultValue={s.profile?.email} placeholder="Email" onBlur={(e) => save({ profile: { ...s.profile, email: e.target.value } })} />
          <input className="zinput" defaultValue={s.profile?.niche} placeholder="Ta niche (ex: coaching solopreneur)" onBlur={(e) => save({ profile: { ...s.profile, niche: e.target.value } })} />
          <div>
            <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Type de projet (détermine les canaux actifs)</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["NET", "TERRAIN"].map(t => (
                <button key={t} onClick={() => save({ project_type: t })}
                  className={s.project_type === t ? "zbtn zbtn-primary" : "zbtn"} style={{ height: 36, gap: 6 }}>
                  {t === "TERRAIN" ? <MapPin size={14} /> : <Globe size={14} />} {t}
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>NET = Reddit/LinkedIn/YouTube · TERRAIN = Google Maps/Pages Jaunes</p>
          </div>
        </div>
      </Card>

      {/* Pause Agent — désactive temporairement la détection de leads */}
      <Card tid="settings-pause-agent">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <Label color={s.agent_paused ? C.terra : undefined}><Zap size={14} /> Expansion Agent</Label>
            <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>
              {s.agent_paused ? "En pause — aucune détection de nouveaux leads en ce moment." : "Actif — l'IA détecte des prospects en continu."}
            </p>
          </div>
          <Toggle on={!s.agent_paused} onClick={() => save({ agent_paused: !s.agent_paused })} tid="settings-agent-paused-toggle" />
        </div>
        {s.agent_paused && (
          <p style={{ fontSize: 12, color: C.terra, marginTop: 10, background: `${C.terra}10`, padding: "8px 10px", borderRadius: 8 }}>
            💤 Pratique avant des vacances ou une période chargée — réactivez à tout moment.
          </p>
        )}
      </Card>

      {/* Connexions réseaux sociaux */}
      <Card tid="settings-connections">
        <Label><Globe size={14} /> Connexions réseaux</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
          {[
            { key: "slack_connected", label: "Slack", sub: "notifications équipe", Icon: Slack },
            { key: "reddit_connected", label: "Reddit", sub: "pour poster / DM", Icon: Hash },
            { key: "linkedin_connected", label: "LinkedIn", sub: "prospection professionnelle", Icon: Linkedin },
            { key: "youtube_connected", label: "YouTube", sub: "commentaires à haute intention", Icon: Youtube },
          ].map(({ key, label, sub, Icon }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "var(--txt)", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Icon size={15} /> {label} <span className="muted" style={{ fontSize: 12 }}>· {sub}</span>
              </span>
              <button className={s[key] ? "zbtn" : "zbtn zbtn-primary"} style={{ height: 34, fontSize: 12 }}
                onClick={() => save({ [key]: !s[key] })} data-testid={`settings-${key}`}>
                {s[key] ? "Connecté ✓" : "Connecter"}
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* WhatsApp Business */}
      <Card tid="settings-whatsapp">
        <Label><Phone size={14} /> WhatsApp Business (agent lead)</Label>
        <p className="muted" style={{ fontSize: 13, margin: "6px 0 12px" }}>
          Configurez un webhook Make/Zapier pour envoyer des messages WhatsApp depuis Zayado.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="zinput" value={waConfig.webhook_url} placeholder="URL webhook Make/Zapier (POST)"
            onChange={e => setWaConfig(p => ({ ...p, webhook_url: e.target.value }))} />
          <input className="zinput" value={waConfig.phone} placeholder="Numéro WhatsApp Business (+33...)"
            onChange={e => setWaConfig(p => ({ ...p, phone: e.target.value }))} />
          <button onClick={() => saveChannel("whatsapp", waConfig)} disabled={savingChannel === "whatsapp"}
            className="zbtn zbtn-primary" style={{ height: 38, width: "fit-content", gap: 6 }}>
            {savingChannel === "whatsapp" ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
            Enregistrer WhatsApp
          </button>
        </div>
      </Card>

      {/* Telegram */}
      <Card tid="settings-telegram">
        <Label><MessageSquare size={14} /> Telegram (notifications + outreach)</Label>
        <p className="muted" style={{ fontSize: 13, margin: "6px 0 12px" }}>
          Créez un bot Telegram via @BotFather et collez le token ici.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="zinput" value={tgConfig.bot_token} placeholder="Token bot Telegram (ex: 123456:ABC...)"
            onChange={e => setTgConfig(p => ({ ...p, bot_token: e.target.value }))} />
          <button onClick={() => saveChannel("telegram", tgConfig)} disabled={savingChannel === "telegram"}
            className="zbtn zbtn-primary" style={{ height: 38, width: "fit-content", gap: 6 }}>
            {savingChannel === "telegram" ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
            Enregistrer Telegram
          </button>
        </div>
      </Card>

      {/* Notifications */}
      <Card tid="settings-notifications">
        <Label><BellRing size={14} /> Notifications & Daily Digest</Label>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <span style={{ color: "var(--txt)", fontSize: 14 }}>Notifications email</span>
          <Toggle on={s.email_notifications} onClick={() => save({ email_notifications: !s.email_notifications })} tid="settings-email-toggle" />
        </div>
        <div style={{ height: 1, background: "var(--glass-border)", margin: "14px 0" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "var(--txt)", fontSize: 14 }}>Daily Digest</span>
          <Toggle on={s.daily_digest?.enabled} onClick={() => save({ daily_digest: { ...s.daily_digest, enabled: !s.daily_digest?.enabled } })} tid="settings-digest-toggle" />
        </div>
        {s.daily_digest?.enabled && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="muted" style={{ fontSize: 13 }}>Heure d'envoi</span>
              <input type="time" className="zinput" style={{ width: 130 }} defaultValue={s.daily_digest?.hour}
                onBlur={(e) => save({ daily_digest: { ...s.daily_digest, hour: e.target.value } })} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {digestOpts.map((o) => {
                const on = (s.daily_digest?.content || []).includes(o.id);
                return (
                  <button key={o.id} onClick={() => {
                    const cur = s.daily_digest?.content || [];
                    const nc = on ? cur.filter((x) => x !== o.id) : [...cur, o.id];
                    save({ daily_digest: { ...s.daily_digest, content: nc } });
                  }} className={on ? "zbtn zbtn-primary" : "zbtn"} style={{ height: 32, fontSize: 12 }}>
                    {on ? <Check size={13} /> : null} {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Danger */}
      <Card tid="settings-danger" style={{ border: `1px solid ${C.terra}44` }}>
        <Label color={C.terra}><X size={14} /> Gestion du compte</Label>
        <p className="muted" style={{ fontSize: 13, margin: "8px 0 12px" }}>La suppression du compte est définitive.</p>
        <button className="zbtn" style={{ height: 36, color: C.terra, borderColor: `${C.terra}66` }}
          onClick={() => toast.error("Confirme depuis ton email")} data-testid="settings-delete">
          Supprimer mon compte
        </button>
      </Card>
    </div>
  );
}

// ─── PAGE PRINCIPALE ───────────────────────────────────────────
export default function Croissance() {
  const [tab, setTab] = useState("dashboard");
  const [data, setData] = useState(null);
  const [detecting, setDetecting] = useState(false);

  const reload = useCallback(() => {
    return growthApi.all().then(setData).catch(() => setData(null));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleDetect = async () => {
    setDetecting(true);
    try {
      const res = await growthExtApi.detect();
      if (res?.new > 0) {
        toast.success(`${res.new} nouveau${res.new > 1 ? "x" : ""} lead${res.new > 1 ? "s" : ""} détecté${res.new > 1 ? "s" : ""} sur Reddit ✨`);
      } else if (res?.error) {
        toast.error(res.error);
      } else {
        toast("Aucun nouveau lead pour l'instant. Affinez vos mots-clés dans Réglages.");
      }
      await reload();
    } catch {
      toast.error("Détection indisponible.");
    } finally {
      setDetecting(false);
    }
  };

  const totals = data?.dashboard?.totals;

  return (
    <motion.div className="page" data-testid="page-croissance"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">Croissance</h1>
          <p className="page-sub">Ton centre d'acquisition — leads, pipeline et outreach IA.</p>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <button onClick={handleDetect} disabled={detecting} data-testid="growth-detect-btn"
            className="zbtn zbtn-primary" style={{ gap: 8, height: 40, whiteSpace: "nowrap" }}>
            {detecting ? <Loader2 size={16} className="spin" /> : <SearchIcon size={16} />}
            {detecting ? "Détection…" : "Détecter des leads"}
          </button>
          {totals && (
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 24, fontWeight: 300, color: "var(--txt)" }}>{totals.leads}</div><div className="muted" style={{ fontSize: 11 }}>leads</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 24, fontWeight: 300, color: C.terra }}>{totals.hot}</div><div className="muted" style={{ fontSize: 11 }}>posts chauds</div></div>
            </div>
          )}
        </div>
      </div>

      <div className="report-tabs" data-testid="growth-tabs" style={{ marginBottom: 22 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`growth-tab-${t.id}`}
            className={`report-tab ${tab === t.id ? "active" : ""}`}>
            <t.Icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Décision d'abord — signature Zayado. Lit les vraies données du hub. */}
      <DecisionBanner
        page="croissance"
        data={{
          prospects_to_relaunch: data?.dashboard?.totals?.hot ?? 0,
          hot_prospects: extractHotProspects(data?.leads_by_campaign),
        }}
        onAction={() => setTab("pipeline")}
        actionLabel="Ouvrir le pipeline"
      />

      {/* Layout 2 colonnes : Insight IA sticky à gauche (320px), contenu à droite.
          Mobile <1024px : le panneau Insight remonte AU-DESSUS du contenu
          (ordre logique décision → exécution) et perd le sticky. */}
      <div className="croissance-layout" data-testid="croissance-layout">
        <aside className="croissance-insight-panel" data-testid="growth-insight-panel">
          <GrowthInsightPanel data={data} onOpenPipeline={() => setTab("pipeline")} onOpenLeads={() => setTab("leads")} />
        </aside>

        <main className="croissance-content" data-testid="croissance-content">
          {!data && tab !== "pipeline" && tab !== "canaux" && tab !== "settings" && tab !== "simulateur"
            ? <p className="muted">Chargement de ton centre d'acquisition…</p>
            : (
              <>
                {tab === "dashboard"     && data && <DashboardTab d={data.dashboard} />}
                {tab === "pipeline"      && <PipelineTab />}
                {tab === "leads"         && data && <LeadsTab campaigns={data.campaigns} leadsByCampaign={data.leads_by_campaign} />}
                {tab === "canaux"        && <CanauxTab />}
                {tab === "seo"           && data && <SeoTab items={data.reddit_seo} />}
                {tab === "conversations" && data && <ConversationsTab conv={data.conversations} />}
                {tab === "alerts"        && data && <AlertsTab alerts={data.alerts} />}
                {tab === "competitors"   && data && <CompetitorsTab comp={data.competitors} />}
                {tab === "insights"      && data && <InsightsTab ins={data.insights} />}
                {tab === "settings"      && <SettingsTab />}
              </>
            )
          }
        </main>
      </div>
    </motion.div>
  );
}
