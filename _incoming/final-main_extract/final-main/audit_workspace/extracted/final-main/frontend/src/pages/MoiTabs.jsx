import React, { useEffect, useState, useCallback } from "react";
import { Plus, Flame, Trash2, Check, Loader2, Sun, Moon, TrendingUp, Cross, Sparkles, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { wellnessApi } from "@/lib/api";

const GOLD = "#C9A449", SAGE = "#5DCAA5", CORAL = "#F0808A", PLUM = "#8b6fbf";

/* ── Rappels doux in-app (contextuels, jamais intrusifs) ──────── */
export function MoiReminders({ today, habitsRemaining, onCheckin, onHabits }) {
  const h = new Date().getHours();
  const noCheckin = today?.score == null;
  const morning = h < 12;
  const evening = h >= 17;

  let r = null;
  if (morning && noCheckin) {
    r = { icon: Sun, color: GOLD, text: "Bonjour ☀️ — 10 secondes pour votre check-in du matin.", cta: "Faire mon check-in", on: onCheckin };
  } else if (evening && habitsRemaining > 0) {
    r = { icon: Moon, color: PLUM, text: `Il vous reste ${habitsRemaining} habitude${habitsRemaining > 1 ? "s" : ""} à valider ce soir.`, cta: "Voir mes habitudes", on: onHabits };
  } else if (noCheckin) {
    r = { icon: Sun, color: GOLD, text: "Pas encore de check-in aujourd'hui.", cta: "Le faire maintenant", on: onCheckin };
  }
  if (!r) return null;
  const Icon = r.icon;
  return (
    <div data-testid="moi-reminder" className="glass-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", marginBottom: 16, borderLeft: `3px solid ${r.color}` }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${r.color}1e`, color: r.color }}><Icon size={17} /></span>
      <span style={{ flex: 1, fontSize: 13.5, color: "var(--txt)", lineHeight: 1.4 }}>{r.text}</span>
      <button onClick={r.on} data-testid="moi-reminder-cta" className="zbtn" style={{ height: 34, fontSize: 12, gap: 5, flexShrink: 0 }}>{r.cta} <ChevronRight size={13} /></button>
    </div>
  );
}

/* ── Onglet Habitudes ─────────────────────────────────────────── */
export function HabitsTab({ activity }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const isThesustain = typeof window !== "undefined" && localStorage.getItem("zayado_sso") === "thesustain";

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await wellnessApi.habits(); setItems(r.items || []); }
    catch { setItems([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      // Parcours chrétien auto si connecté via thesustain.net (SSO simulé)
      if (isThesustain && !localStorage.getItem("zayado_sso_seeded")) {
        try { await wellnessApi.seedChristianHabits(); localStorage.setItem("zayado_sso_seeded", "1"); toast.success("Parcours chrétien activé ✝️"); } catch { /* noop */ }
      }
      load();
    })();
  }, [load, isThesustain]);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await wellnessApi.addHabit(name.trim()); setName(""); await load(); toast.success("Habitude ajoutée ✦"); }
    catch { toast.error("Ajout impossible"); } finally { setBusy(false); }
  };
  const toggle = async (h) => {
    setItems((prev) => prev.map((x) => x.id === h.id ? { ...x, done_today: !x.done_today, streak: x.done_today ? Math.max(0, x.streak - 1) : x.streak + 1 } : x));
    try { await wellnessApi.toggleHabit(h.id); await load(); } catch { toast.error("Erreur"); load(); }
  };
  const remove = async (h) => {
    setItems((prev) => prev.filter((x) => x.id !== h.id));
    try { await wellnessApi.removeHabit(h.id); } catch { load(); }
  };

  if (loading) return <p className="muted"><Loader2 size={14} className="spin" style={{ display: "inline" }} /> Chargement…</p>;

  const doneCount = items.filter((h) => h.done_today).length;

  // ── Corrélation Habitudes × Productivité × Bien-être (données réelles) ──
  const daily = (activity?.daily || []).slice(-14);
  const dayHabits = (d) => items.reduce((n, h) => n + ((h.done_dates || []).includes(d) ? 1 : 0), 0);
  const withHabit = daily.filter((d) => d.score != null && dayHabits(d.date) > 0);
  const withoutHabit = daily.filter((d) => d.score != null && dayHabits(d.date) === 0);
  const avg = (arr) => arr.length ? Math.round(arr.reduce((s, d) => s + d.score, 0) / arr.length) : null;
  const avgWith = avg(withHabit), avgWithout = avg(withoutHabit);
  const uplift = (avgWith != null && avgWithout != null) ? avgWith - avgWithout : null;

  return (
    <div data-testid="moi-tab-habitudes" className="pgrid pgrid-2">
      {/* Liste des habitudes */}
      <div className="glass-card" style={{ alignSelf: "start" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div className="card-label" style={{ color: GOLD }}><Flame size={14} /> Mes habitudes du jour</div>
          {isThesustain && <span className="zchip" data-testid="thesustain-badge" style={{ background: `${GOLD}1e`, color: GOLD, fontSize: 11 }}><Cross size={11} style={{ marginRight: 3 }} /> thesustain.net</span>}
        </div>
        <p className="muted" style={{ fontSize: 12, margin: "6px 0 14px", lineHeight: 1.5 }}>
          {items.length === 0
            ? "Ajoutez vos habitudes clés (sport, lecture, prière, méditation…) et cochez-les chaque jour pour bâtir vos séries."
            : `${doneCount}/${items.length} habitude(s) validée(s) aujourd'hui.`}
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: items.length ? 16 : 0 }}>
          <input className="zinput" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Ex : 20 min de sport, lecture, prière…" style={{ flex: 1 }} data-testid="habit-input" />
          <button className="zbtn zbtn-primary" onClick={add} disabled={busy} data-testid="habit-add-btn" style={{ flexShrink: 0 }}>
            {busy ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Ajouter
          </button>
        </div>
        {items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((h) => {
              const christian = h.source === "thesustain";
              return (
                <div key={h.id} data-testid={`habit-${h.id}`} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12,
                  background: h.done_today ? `${SAGE}14` : "var(--glass-soft)",
                  border: `1px solid ${h.done_today ? SAGE + "55" : christian ? GOLD + "44" : "var(--glass-border)"}`,
                }}>
                  <button onClick={() => toggle(h)} data-testid={`habit-toggle-${h.id}`} title="Valider aujourd'hui" style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `1.5px solid ${h.done_today ? SAGE : "var(--glass-border)"}`,
                    background: h.done_today ? SAGE : "transparent", color: h.done_today ? "#0B1F3A" : "var(--muted)",
                  }}>{h.done_today && <Check size={15} />}</button>
                  {christian && <Cross size={13} style={{ color: GOLD, flexShrink: 0 }} />}
                  <span style={{ flex: 1, fontSize: 14, color: "var(--txt)" }}>{h.name}</span>
                  {h.streak > 0 && (
                    <span className="zchip" style={{ background: `${GOLD}1e`, color: GOLD, fontSize: 12 }}><Flame size={12} style={{ marginRight: 3 }} /> {h.streak}j</span>
                  )}
                  <button onClick={() => remove(h)} data-testid={`habit-remove-${h.id}`} title="Supprimer" style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", flexShrink: 0 }}><Trash2 size={15} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Corrélation Habitudes × Productivité × Bien-être */}
      <div className="glass-card" data-testid="habits-correlation" style={{ alignSelf: "start", borderLeft: `3px solid ${PLUM}` }}>
        <div className="card-label" style={{ color: PLUM }}><TrendingUp size={14} /> Habitudes × Productivité × Bien-être</div>
        <p className="muted" style={{ fontSize: 12, margin: "6px 0 14px", lineHeight: 1.5 }}>L'impact réel de vos habitudes sur votre forme (14 derniers jours).</p>
        {(uplift == null) ? (
          <p className="muted" style={{ fontSize: 13, padding: "18px 0", textAlign: "center", lineHeight: 1.5 }}>
            <Sparkles size={22} style={{ color: PLUM, opacity: 0.6, display: "block", margin: "0 auto 10px" }} />
            Continuez vos check-ins et cochez vos habitudes quelques jours pour révéler la corrélation.
          </p>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 30, fontWeight: 300, color: uplift >= 0 ? SAGE : CORAL }}>{uplift >= 0 ? "+" : ""}{uplift}</span>
              <span className="muted" style={{ fontSize: 12 }}>pts de bien-être les jours avec habitudes</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {[
                { label: "Jours AVEC habitudes", val: avgWith, col: SAGE },
                { label: "Jours SANS habitudes", val: avgWithout, col: "var(--muted)" },
              ].map((row, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "var(--txt)" }}>{row.label}</span>
                    <span style={{ fontWeight: 700, color: row.col }}>{row.val ?? "—"}/100</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 6, background: "var(--glass-soft)", overflow: "hidden" }}>
                    <div style={{ width: `${row.val || 0}%`, height: "100%", background: row.col, borderRadius: 6 }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 11.5, marginTop: 12, fontStyle: "italic", lineHeight: 1.5 }}>
              {uplift > 0 ? "Vos habitudes soutiennent clairement votre énergie — gardez le rythme." : "Peu d'écart pour l'instant — la régularité fera la différence sur la durée."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
