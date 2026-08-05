import React, { useEffect, useState, useCallback } from "react";
import {
  Zap, Sparkles, Loader2, Play, Trash2, Clock, ShieldCheck, HeartPulse, Info, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { automationsApi } from "@/lib/api";

const GOLD = "#C9A449", SAGE = "#5DCAA5", PLUM = "#8b6fbf";

function Toggle({ on, onChange, testid }) {
  return (
    <button onClick={() => onChange(!on)} data-testid={testid} role="switch" aria-checked={on}
      style={{ width: 42, height: 24, borderRadius: 999, border: "none", cursor: "pointer", flexShrink: 0,
        background: on ? SAGE : "var(--glass-border)", position: "relative", transition: "background-color 0.2s" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
    </button>
  );
}

export default function AutomatisationSettings() {
  const [autos, setAutos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, s] = await Promise.all([automationsApi.list(), automationsApi.stats()]);
      setAutos(l.automations || []); setStats(s);
    } catch { /* noop */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (a) => {
    setAutos((prev) => prev.map((x) => x.id === a.id ? { ...x, enabled: !x.enabled } : x));
    try { await automationsApi.toggle(a.id, !a.enabled); automationsApi.stats().then(setStats); } catch { load(); }
  };
  const run = async (a) => {
    setRunning(a.id);
    try { const r = await automationsApi.run(a.id); toast[r.status === "success" ? "success" : "info"](r.message || "Exécuté"); load(); }
    catch { toast.error("Exécution impossible"); } finally { setRunning(null); }
  };
  const create = async () => {
    if (!desc.trim()) return;
    setCreating(true);
    try { await automationsApi.createCustom(desc.trim()); setDesc(""); toast.success("Automatisation créée (brouillon) ✦"); load(); }
    catch { toast.error("Création impossible"); } finally { setCreating(false); }
  };
  const removeCustom = async (a) => {
    setAutos((prev) => prev.filter((x) => x.id !== a.id));
    try { await automationsApi.removeCustom(a.id); } catch { load(); }
  };
  const setConsent = async (enabled) => {
    setStats((s) => ({ ...s, wellbeing_adaptive: enabled }));
    try { await automationsApi.setWellbeingConsent(enabled); toast.success(enabled ? "Adaptation à l'énergie activée" : "Adaptation désactivée"); }
    catch { load(); }
  };

  if (loading) return <p className="muted"><Loader2 size={14} className="spin" style={{ display: "inline" }} /> Chargement…</p>;

  return (
    <div data-testid="settings-automatisation">
      {/* KPI heures récupérées */}
      <div className="glass-card" style={{ marginBottom: 16, borderLeft: `3px solid ${GOLD}` }}>
        <div className="card-label" style={{ color: GOLD }}><Zap size={14} /> Automatisation</div>
        <p className="muted" style={{ fontSize: 13, margin: "6px 0 14px", lineHeight: 1.5 }}>
          Déléguez les tâches répétitives à vos agents IA. Décrivez ce que vous voulez automatiser — comme vous le diriez à un assistant.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
          {[
            { v: `${stats?.hours_saved ?? 0} h`, l: "Temps récupéré (estimation)" },
            { v: stats?.active_count ?? 0, l: "Agents actifs" },
            { v: stats?.total_runs ?? 0, l: "Exécutions" },
          ].map((k, i) => (
            <div key={i} style={{ background: "var(--glass-soft)", borderRadius: 12, padding: "12px 14px" }} data-testid={`auto-kpi-${i}`}>
              <div style={{ fontSize: 22, fontWeight: 300, color: "var(--txt)" }}>{k.v}</div>
              <div className="muted" style={{ fontSize: 11 }}>{k.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Création façon Emergent : langage naturel */}
      <div className="glass-card" style={{ marginBottom: 16 }} data-testid="auto-create-card">
        <div className="card-label" style={{ color: PLUM }}><Sparkles size={14} /> Créer une automatisation</div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <input className="zinput" value={desc} onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="Ex : Chaque vendredi, résume ma semaine et envoie-la par email…"
            style={{ flex: 1, minWidth: 220 }} data-testid="auto-create-input" />
          <button onClick={create} disabled={creating || !desc.trim()} className="zbtn zbtn-primary" data-testid="auto-create-btn" style={{ flexShrink: 0 }}>
            {creating ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Créer
          </button>
        </div>
        <p className="muted" style={{ fontSize: 11.5, marginTop: 8, fontStyle: "italic" }}>
          L'automatisation est créée en brouillon (« à configurer ») — vous connectez ensuite le déclencheur. Aucune action n'est lancée sans votre validation.
        </p>
      </div>

      {/* Garde-fou bien-être (RGPD Art. 9 — consentement explicite) */}
      <div className="glass-card" style={{ marginBottom: 16, borderLeft: `3px solid ${SAGE}` }} data-testid="auto-wellbeing-consent">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${SAGE}1e`, color: SAGE }}><HeartPulse size={17} /></span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--txt)", margin: 0 }}>Adapter mes automatisations à mon énergie</p>
            <p className="muted" style={{ fontSize: 12.5, margin: "4px 0 0", lineHeight: 1.5 }}>
              Quand votre énergie est basse (module « Moi »), l'IA peut <strong>vous suggérer</strong> de mettre en pause certains agents.
              Elle ne décide jamais à votre place. Vos données de bien-être <strong>ne quittent jamais votre espace</strong> et ne sont transmises à aucun service tiers.
            </p>
          </div>
          <Toggle on={!!stats?.wellbeing_adaptive} onChange={setConsent} testid="wellbeing-consent-toggle" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, padding: "8px 10px", background: "var(--glass-soft)", borderRadius: 8 }}>
          <ShieldCheck size={13} style={{ color: SAGE, flexShrink: 0 }} />
          <span className="muted" style={{ fontSize: 11 }}>Conforme RGPD (consentement explicite, révocable) & EU AI Act — privacy by design.</span>
        </div>
      </div>

      {/* Liste des automatisations */}
      <div className="glass-card" data-testid="auto-list">
        <div className="card-label"><Zap size={14} /> Vos automatisations</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {autos.map((a) => (
            <div key={a.id} data-testid={`auto-${a.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "var(--glass-soft)", border: "1px solid var(--glass-border)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--txt)" }}>{a.title}</span>
                  {a.custom && <span className="zchip" style={{ background: `${PLUM}1e`, color: PLUM, fontSize: 10 }}>{a.status || "à configurer"}</span>}
                  {a.run_count > 0 && <span className="muted" style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 3 }}><Clock size={10} /> {a.run_count}×</span>}
                </div>
                <p className="muted" style={{ fontSize: 11.5, margin: "3px 0 0", lineHeight: 1.4 }}>{a.when} → {a.then}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {a.enabled && !a.custom && (
                  <button onClick={() => run(a)} disabled={running === a.id} data-testid={`auto-run-${a.id}`} title="Exécuter maintenant"
                    style={{ background: "none", border: "none", cursor: "pointer", color: GOLD }}>
                    {running === a.id ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
                  </button>
                )}
                {a.custom && (
                  <button onClick={() => removeCustom(a)} data-testid={`auto-del-${a.id}`} title="Supprimer" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><Trash2 size={15} /></button>
                )}
                <Toggle on={a.enabled} onChange={() => toggle(a)} testid={`auto-toggle-${a.id}`} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14 }}>
          <Info size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <span className="muted" style={{ fontSize: 11 }}>Les déclencheurs externes (Stripe, WhatsApp, YouTube…) se connectent dans l'onglet Intégrations.</span>
        </div>
      </div>
    </div>
  );
}
