import React, { useEffect, useState } from "react";
import { CheckSquare, Trophy, HeartPulse, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/kairos/GlassCard";
import { fetchImpact } from "@/lib/kairosApi";

export default function ImpactBanner() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImpact().then(setData).catch(() => toast.error("Impact indisponible")).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <GlassCard className="animate-fade-up">
        <div className="flex items-center gap-2 text-offwhite/60"><Loader2 className="h-4 w-4 animate-spin" /> Ton impact…</div>
      </GlassCard>
    );
  }

  const total = (data?.actions_bouclees || 0) + (data?.checkins || 0) + (data?.victoires || 0);
  const isZero = total === 0;

  return (
    <GlassCard className="animate-fade-up" data-testid="widget-impact">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">Ton impact · 7 jours</p>
          <p className="mt-0.5 text-[12.5px] italic text-offwhite/60">
            {isZero
              ? "Un check-in ou une action bouclée cette semaine et le bandeau s'illumine."
              : `Tu as bougé ${total} fois cette semaine. Continue le mouvement.`}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Cell icon={CheckSquare} label="Actions bouclées" value={data?.actions_bouclees || 0} />
        <Cell icon={HeartPulse}  label="Check-ins"        value={data?.checkins || 0} />
        <Cell icon={Trophy}      label="Victoires"         value={data?.victoires || 0} />
      </div>
    </GlassCard>
  );
}

function Cell({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-1.5 text-offwhite/60">
        <Icon size={12} className="text-gold" />
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      <p className="mt-1 font-display text-xl font-bold text-offwhite">{value}</p>
    </div>
  );
}
