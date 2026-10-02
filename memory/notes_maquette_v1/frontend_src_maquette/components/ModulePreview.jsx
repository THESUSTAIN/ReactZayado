import React from "react";
import { Check, CheckCircle2, Sparkles, TrendingUp, ArrowUpRight, Bot } from "lucide-react";

// A small reusable bar chart
const BarChart = ({ values, color = "#DEC2A3" }) => {
  const max = Math.max(...values);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-md transition-all"
          style={{
            height: `${(v / max) * 100}%`,
            background: `linear-gradient(to top, ${color}55, ${color})`,
          }}
        />
      ))}
    </div>
  );
};

const Ring = ({ value, label, color = "#DEC2A3" }) => {
  const r = 34;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90">
          <circle cx="48" cy="48" r={r} stroke="rgba(255,255,255,0.12)" strokeWidth="8" fill="none" />
          <circle
            cx="48" cy="48" r={r} stroke={color} strokeWidth="8" fill="none"
            strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-offwhite">
          {value}
        </span>
      </div>
      <span className="mt-2 text-xs text-offwhite/60">{label}</span>
    </div>
  );
};

const Label = ({ children }) => (
  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">{children}</p>
);

export default function ModulePreview({ feature }) {
  if (!feature) return null;
  const p = feature.preview;

  switch (p.kind) {
    case "today":
      return (
        <div className="space-y-5">
          <div>
            <Label>{p.date}</Label>
            <p className="mt-2 font-display text-xl text-offwhite">{p.greeting}</p>
            <p className="mt-2 text-sm leading-relaxed text-offwhite/65">{p.summary}</p>
          </div>
          <div className="zy-glass rounded-2xl p-4">
            <p className="mb-3 text-sm font-semibold text-offwhite">Vos 3 priorités</p>
            <ul className="space-y-2.5">
              {p.priorities.map((t, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      t.done ? "border-transparent zy-gold-grad" : "border-white/25"
                    }`}
                  >
                    {t.done && <Check className="h-3.5 w-3.5 text-navy-900" strokeWidth={3} />}
                  </span>
                  <span className={t.done ? "text-offwhite/45 line-through" : "text-offwhite/85"}>{t.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="zy-glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-offwhite/70">Énergie du jour</span>
              <span className="text-sm font-semibold text-gold">{p.energy}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full zy-gold-grad" style={{ width: `${p.energy}%` }} />
            </div>
          </div>
        </div>
      );

    case "vision":
      return (
        <div className="space-y-5">
          <div className="zy-glass rounded-2xl p-4">
            <Label>Étoile du Nord</Label>
            <p className="mt-2 font-display text-lg text-offwhite">{p.northStar}</p>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-offwhite">Objectifs</p>
            <div className="space-y-3">
              {p.objectives.map((o, i) => (
                <div key={i}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-offwhite/80">{o.label}</span>
                    <span className="text-gold">{o.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full zy-gold-grad" style={{ width: `${o.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-offwhite">Feuille de route</p>
            <div className="relative space-y-4 pl-5">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-white/15" />
              {p.roadmap.map((r, i) => (
                <div key={i} className="relative">
                  <span className="absolute -left-5 top-1 h-3.5 w-3.5 rounded-full zy-gold-grad" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-gold">{r.phase}</p>
                  <p className="mt-0.5 text-sm text-offwhite/80">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "radar":
      return (
        <div className="space-y-4">
          <p className="text-sm text-offwhite/65">{p.intro}</p>
          {p.opportunities.map((o, i) => (
            <div key={i} className="zy-glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-offwhite">{o.name}</p>
                  <p className="text-xs text-offwhite/55">{o.role}</p>
                </div>
                <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold">
                  {o.match}% match
                </span>
              </div>
              <p className="mt-2 text-sm text-offwhite/75">{o.reason}</p>
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gold">
                  <Sparkles className="h-3 w-3" /> Message préparé
                </p>
                <p className="text-[13px] italic leading-relaxed text-offwhite/70">{o.message}</p>
              </div>
            </div>
          ))}
        </div>
      );

    case "copilot":
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/[0.07] p-3">
            <Bot className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <p className="text-sm text-offwhite/80">{p.note}</p>
          </div>
          <div className="space-y-3">
            {p.thread.map((m, i) => (
              <div key={i} className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.from === "you"
                      ? "zy-gold-grad text-navy-900"
                      : "zy-glass text-offwhite/85"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="flex-1 rounded-full zy-gold-grad py-2.5 text-sm font-semibold text-navy-900 transition hover:brightness-105">
              Valider & copier
            </button>
            <button className="rounded-full border border-white/20 px-4 py-2.5 text-sm text-offwhite/80 transition hover:bg-white/10">
              Reformuler
            </button>
          </div>
        </div>
      );

    case "wellbeing":
      return (
        <div className="space-y-5">
          <div className="flex items-center justify-around">
            <Ring value={p.energy} label="Énergie" color="#DEC2A3" />
            <Ring value={p.mentalLoad} label="Charge mentale" color="#C08497" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="zy-glass rounded-2xl p-4 text-center">
              <p className="font-display text-2xl text-offwhite">{p.mood}</p>
              <p className="text-xs text-offwhite/55">Humeur du jour</p>
            </div>
            <div className="zy-glass rounded-2xl p-4 text-center">
              <p className="font-display text-2xl text-gold">{p.streak} j</p>
              <p className="text-xs text-offwhite/55">Série de check-ins</p>
            </div>
          </div>
          <div className="zy-glass rounded-2xl p-4">
            <p className="mb-2 text-sm font-semibold text-offwhite">Énergie · 7 derniers jours</p>
            <BarChart values={p.week} color="#DEC2A3" />
          </div>
          <ul className="space-y-2">
            {p.insights.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-offwhite/75">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      );

    case "pulse":
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="zy-glass rounded-2xl p-4">
              <p className="text-xs text-offwhite/55">Trésorerie</p>
              <p className="mt-1 font-display text-2xl text-offwhite">{p.cash}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-emerald-300">
                <TrendingUp className="h-3.5 w-3.5" /> {p.cashTrend}
              </p>
            </div>
            <div className="zy-glass rounded-2xl p-4">
              <p className="text-xs text-offwhite/55">Revenu récurrent</p>
              <p className="mt-1 font-display text-2xl text-offwhite">{p.mrr}</p>
              <p className="mt-0.5 text-xs text-offwhite/55">Runway · {p.runway}</p>
            </div>
          </div>
          <div className="zy-glass rounded-2xl p-4">
            <p className="mb-2 text-sm font-semibold text-offwhite">Entrées · 7 semaines</p>
            <BarChart values={p.bars} color="#9B86B0" />
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/[0.07] p-3">
            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <p className="text-sm text-offwhite/80">{p.advice}</p>
          </div>
        </div>
      );

    default:
      return null;
  }
}
