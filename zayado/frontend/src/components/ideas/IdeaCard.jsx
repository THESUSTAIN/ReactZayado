import React from "react";
import { motion } from "framer-motion";
import { Target, Zap, Gauge, Mic, Link2 } from "lucide-react";
import { statutMeta, scoreLabel } from "./constants";

export function IdeaCard({ idee, onOpen, index }) {
  const meta = statutMeta(idee.statut);
  const sc = scoreLabel(idee.score);
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.3) }}
      whileHover={{ y: -3 }}
      onClick={() => onOpen(idee)}
      data-testid={`idea-card-${idee.id}`}
      className="glass group flex flex-col gap-3 rounded-2xl p-4 text-left transition hover:border-gold/40"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: `${meta.color}22`, color: meta.color }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} /> {meta.label}
        </span>
        {idee.source === "vocale" && <Mic size={13} className="text-offwhite/40" />}
        {idee.source === "sync" && <Link2 size={13} className="text-offwhite/40" />}
      </div>

      <p className="line-clamp-3 text-sm font-medium leading-snug text-offwhite">{idee.titre}</p>

      {idee.objectif_titre && (
        <p className="inline-flex items-center gap-1.5 text-[11px] text-offwhite/50">
          <Target size={12} className="text-gold" /> {idee.objectif_titre}
        </p>
      )}

      <div className="mt-auto flex items-center gap-3 border-t border-white/8 pt-3 text-[11px]">
        <span className="inline-flex items-center gap-1 text-offwhite/60" title="Impact"><Zap size={12} className="text-gold" /> {idee.impact}</span>
        <span className="inline-flex items-center gap-1 text-offwhite/60" title="Effort"><Gauge size={12} className="text-offwhite/40" /> {idee.effort}</span>
        <span className={`ml-auto font-display font-bold ${sc.tone}`} title="Score = impact / effort">
          {idee.score} · {sc.label}
        </span>
      </div>
    </motion.button>
  );
}
