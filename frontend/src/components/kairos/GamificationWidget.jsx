import React, { useEffect, useState } from "react";
import {
  Flame, Footprints, CalendarCheck, Trophy, Target, Award, CheckCircle2, Sparkles, Lock,
} from "lucide-react";

const API = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
const ICONS = { Footprints, CalendarCheck, Flame, Trophy, Target, Award, CheckCircle2, Sparkles };

// Bandeau de motivation : série de check-ins, progression Vision et badges débloqués.
export default function GamificationWidget() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`${API}/api/gamification`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;
  const { serie_actuelle, serie_record, vision_progression, badges, badges_obtenus } = data;

  return (
    <section className="mb-5 animate-fade-up" data-testid="gamification-widget" style={{ animationDelay: "160ms" }}>
      <div className="glass rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-offwhite">Ta progression</h2>
          <span className="text-sm text-offwhite/50" data-testid="gamification-badges-count">{badges_obtenus}/{badges.length} badges</span>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gold/25 bg-gold/[0.07] p-3.5" data-testid="gamification-serie">
            <div className="flex items-center gap-2 text-gold"><Flame className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-wide">Série en cours</span></div>
            <p className="mt-1 font-display text-2xl font-extrabold text-offwhite">{serie_actuelle} <span className="text-sm font-semibold text-offwhite/60">jour{serie_actuelle > 1 ? "s" : ""}</span></p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5" data-testid="gamification-record">
            <div className="flex items-center gap-2 text-offwhite/70"><Trophy className="h-4 w-4 text-gold" /><span className="text-[11px] font-semibold uppercase tracking-wide">Record</span></div>
            <p className="mt-1 font-display text-2xl font-extrabold text-offwhite">{serie_record} <span className="text-sm font-semibold text-offwhite/60">jour{serie_record > 1 ? "s" : ""}</span></p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5" data-testid="gamification-vision">
            <div className="flex items-center gap-2 text-offwhite/70"><Sparkles className="h-4 w-4 text-gold" /><span className="text-[11px] font-semibold uppercase tracking-wide">Vision</span></div>
            <div className="mt-2 flex items-center gap-2">
              <span className="block h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-gradient-to-r from-[#F1E2CC] to-[#DEC2A3] transition-all" style={{ width: `${vision_progression}%` }} />
              </span>
              <span className="text-sm font-bold text-offwhite">{vision_progression}%</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" data-testid="gamification-badges">
          {badges.map((b) => {
            const Icon = ICONS[b.icon] || Award;
            return (
              <div key={b.cle} title={b.desc} data-testid={`badge-${b.cle}`}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
                  b.obtenu ? "border-gold/40 bg-gold/10 text-gold" : "border-white/10 bg-white/[0.03] text-offwhite/35"
                }`}>
                {b.obtenu ? <Icon className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />} {b.nom}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
