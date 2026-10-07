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

      {/* ── Un APERÇU, pas une deuxième page Radar ───────────────────────
             Ce bloc affichait les trois opportunités en entier : le nom de
             l'objectif répété trois fois en capitales, le message complet sur
             deux lignes et un bouton « Copier le message » par ligne. Soit la
             page Radar en plus petit, posée sur l'accueil — 500 px de haut qui
             déséquilibraient la grille et dédoublaient la décision. Deux
             titres suffisent à donner envie d'ouvrir le Radar. ── */}
      {(!data?.opportunities || data.opportunities.length === 0) ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-center text-[12px] text-offwhite/60">
          {data?.phrase_ia || "Pose un objectif (90 jours, 3 ans ou ta Vision) pour activer le Radar."}
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            {data.opportunities.slice(0, 2).map((op, i) => {
              const meta = CANAL_META[op.canal] || CANAL_META.email;
              const Icon = meta.icon;
              return (
                <button key={i} onClick={() => navigate("/app/radar")} data-testid={`radar-op-${i}`}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-white/20 hover:bg-white/[0.06]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${meta.color}22`, color: meta.color }}>
                    <Icon size={14} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-offwhite">{op.titre}</span>
                  {op.score != null && <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">{op.score}</span>}
                </button>
              );
            })}
          </div>
          <button onClick={() => navigate("/app/radar")} data-testid="radar-widget-ouvrir"
            className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gold hover:underline">
            {data.opportunities.length > 2
              ? `Voir les ${data.opportunities.length} opportunités`
              : "Ouvrir mon Radar"} <ArrowRight size={12} />
          </button>
        </>
      )}
    </GlassCard>
  );
}
