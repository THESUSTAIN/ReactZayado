import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Target, Pencil, Loader2, Check, X } from "lucide-react";
import { useI18n } from "@/i18n";
import { fetchCountdown, saveCountdown } from "@/lib/kairosApi";

const pad = (n) => String(n).padStart(2, "0");

/** Date par défaut : aujourd'hui + 3 ans. */
function defaultDeadline() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 3);
  return d.toISOString().slice(0, 10);
}

function computeLive(data) {
  if (!data?.echeance) return null;
  const end = new Date(`${data.echeance}T23:59:59`);
  const start = data.debut ? new Date(`${data.debut}T00:00:00`) : null;
  const now = new Date();
  const msLeft = end - now;
  const totalDays = Math.max(0, Math.ceil(msLeft / 86400000));
  let percent = 0;
  if (start && end > start) {
    percent = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  }
  return {
    over: msLeft <= 0,
    days: totalDays,
    weeks: Math.floor(totalDays / 7),
    months: Math.floor(totalDays / 30.44),
    percent,
    hours: Math.max(0, Math.floor((msLeft / 3600000) % 24)),
    minutes: Math.max(0, Math.floor((msLeft / 60000) % 60)),
  };
}

/**
 * Widget compte à rebours « Objectif 3 ans ».
 * variant="card" (cockpit) | "strip" (bandeau compact dans le Vision Board)
 */
export function GoalCountdown({ variant = "card", className = "" }) {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ titre: "", echeance: defaultDeadline(), debut: new Date().toISOString().slice(0, 10) });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetchCountdown()
      .then((r) => {
        setData(r);
        setForm({
          titre: r.titre || "",
          echeance: r.echeance || defaultDeadline(),
          debut: r.debut || new Date().toISOString().slice(0, 10),
        });
      })
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, []);

  // rafraîchit chaque minute pour que le compteur reste vivant
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const live = useMemo(() => computeLive(data), [data, tick]);

  const submit = async () => {
    if (!form.titre.trim()) return;
    setSaving(true);
    try {
      const r = await saveCountdown({ titre: form.titre.trim(), echeance: form.echeance, debut: form.debut });
      setData(r);
      setEditing(false);
      toast.success(t("countdown.saved"));
    } catch {
      toast.error(t("countdown.error"));
    } finally {
      setSaving(false);
    }
  };

  const editor = (
    <div className="space-y-2" data-testid="countdown-editor">
      <input
        value={form.titre}
        onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
        placeholder={t("countdown.goalPlaceholder")}
        data-testid="countdown-title-input"
        className="w-full rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-sm text-offwhite outline-none focus:border-gold placeholder:text-offwhite/40"
      />
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-offwhite/50">{t("countdown.start")}</span>
          <input type="date" value={form.debut} onChange={(e) => setForm((f) => ({ ...f, debut: e.target.value }))}
            className="w-full rounded-lg border border-white/12 bg-white/5 px-2 py-1.5 text-xs text-offwhite outline-none focus:border-gold" />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-offwhite/50">{t("countdown.deadline")}</span>
          <input type="date" value={form.echeance} onChange={(e) => setForm((f) => ({ ...f, echeance: e.target.value }))}
            data-testid="countdown-date-input"
            className="w-full rounded-lg border border-white/12 bg-white/5 px-2 py-1.5 text-xs text-offwhite outline-none focus:border-gold" />
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving || !form.titre.trim()} data-testid="countdown-save"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold py-2 text-xs font-bold text-navy-900 transition hover:opacity-90 disabled:opacity-40">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {t("common.save")}
        </button>
        {data?.echeance && (
          <button onClick={() => setEditing(false)}
            className="rounded-lg border border-white/12 px-3 py-2 text-xs text-offwhite/70 transition hover:bg-white/10">
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );

  if (variant === "strip") {
    if (loading || !live || !data?.echeance) return null;
    return (
      <div className={`flex items-center gap-2.5 rounded-xl border border-gold/25 bg-gold/10 px-3 py-1.5 backdrop-blur ${className}`} data-testid="countdown-strip">
        <Target size={14} className="shrink-0 text-gold" />
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-offwhite">{data.titre}</p>
          <p className="text-[10px] text-gold">
            {live.over ? t("countdown.reached") : `${live.days} ${t("common.days")} · ${live.percent}%`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass rounded-2xl p-5 ${className}`} data-testid="countdown-card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold"><Target size={17} /></span>
          <div>
            <p className="font-display text-base font-bold text-offwhite">{t("countdown.title")}</p>
            <p className="text-[11px] text-offwhite/55">{t("countdown.subtitle")}</p>
          </div>
        </div>
        {data?.echeance && !editing && (
          <button onClick={() => setEditing(true)} data-testid="countdown-edit" title={t("countdown.edit")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-offwhite/50 transition hover:bg-white/10 hover:text-gold">
            <Pencil size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-offwhite/55"><Loader2 size={15} className="animate-spin" /> {t("common.loading")}</div>
      ) : editing ? (
        editor
      ) : !data?.echeance ? (
        <button onClick={() => setEditing(true)} data-testid="countdown-setup"
          className="w-full rounded-xl border border-dashed border-gold/40 py-6 text-sm font-medium text-gold transition hover:bg-gold/10">
          {t("countdown.setGoal")}
        </button>
      ) : (
        <>
          <p className="mb-3 font-serif-italic text-[19px] leading-tight text-offwhite">{data.titre}</p>

          {live.over ? (
            <p className="rounded-xl bg-emerald-500/15 px-3 py-3 text-center text-sm font-semibold text-emerald-300">
              {t("countdown.reached")}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2" data-testid="countdown-values">
                {[
                  { v: live.days, l: t("countdown.d") },
                  { v: live.weeks, l: t("countdown.w") },
                  { v: live.months, l: t("countdown.m") },
                ].map((b, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/5 py-3 text-center">
                    <div className="font-display text-2xl font-extrabold tabular-nums text-gold">{b.v}</div>
                    <div className="text-[10px] uppercase tracking-wider text-offwhite/50">{b.l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-offwhite/60">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-gradient-to-r from-[#F1E2CC] to-[#DEC2A3] transition-all duration-700"
                    style={{ width: `${live.percent}%` }} />
                </div>
                <span className="tabular-nums">{t("countdown.elapsed", { n: live.percent })}</span>
              </div>
              <p className="mt-2 text-center text-[10.5px] tabular-nums text-offwhite/35">
                {data.echeance} · {pad(live.hours)}h{pad(live.minutes)}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default GoalCountdown;
