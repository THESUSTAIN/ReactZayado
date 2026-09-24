import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Radar, Loader2, Send, Sparkles, MessageCircle, Linkedin, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/kairos/GlassCard";
import { fetchRadar } from "@/lib/kairosApi";

const CANAL_META = {
  email:    { icon: Send,          color: "#DEC2A3" },
  linkedin: { icon: Linkedin,      color: "#4a6a9e" },
  whatsapp: { icon: MessageCircle, color: "#25D366" },
};

export default function RadarWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRadar()
      .then(setData)
      .catch(() => toast.error("Radar indisponible"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <GlassCard className="animate-fade-up">
        <div className="flex items-center gap-2 text-offwhite/60"><Loader2 className="h-4 w-4 animate-spin" /> Radar du jour…</div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="animate-fade-up" data-testid="widget-radar">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/15 text-gold"><Radar size={16} /></span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">Radar du jour · IA</p>
            <p className="text-[11px] italic text-offwhite/60">{data?.phrase_ia}</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/app/radar")}
          data-testid="radar-open-page-btn"
          className="inline-flex items-center gap-1 rounded-full border border-gold/25 bg-gold/10 px-2 py-1 text-[10px] font-semibold text-gold transition-colors hover:bg-gold/20"
        >
          <Sparkles size={11} /> {data?.opportunities?.length || 0} <ArrowRight size={10} />
        </button>
      </div>

      {(!data?.opportunities || data.opportunities.length === 0) ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-center text-[12px] text-offwhite/60">
          Ajoute des objectifs sur ta Vision pour activer le radar.
        </p>
      ) : (
        <div className="space-y-2">
          {data.opportunities.map((op, i) => {
            const meta = CANAL_META[op.canal] || CANAL_META.email;
            const Icon = meta.icon;
            return (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid={`radar-op-${i}`}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${meta.color}22`, color: meta.color }}>
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-widest text-offwhite/50">{op.objectif}</p>
                    <p className="mt-0.5 text-sm font-semibold text-offwhite">{op.titre}</p>
                    <p className="mt-1 line-clamp-2 text-[11.5px] italic text-offwhite/60">{op.message}</p>
                  </div>
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">{op.score}</span>
                </div>
                <div className="mt-2 flex justify-end">
                  <button onClick={() => { navigator.clipboard?.writeText(op.message || ""); toast.success("Message copié"); }}
                    className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] text-offwhite/80 hover:bg-white/10">
                    Copier le message
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
