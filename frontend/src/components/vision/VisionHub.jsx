import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutTemplate, PieChart, CalendarRange,
  Compass, Palette, Network, LayoutGrid, ArrowRight, Lock, Target,
} from "lucide-react";
import { fetchObjectifs } from "@/lib/kairosApi";
import { BoardsGallery } from "@/components/vision/BoardsGallery";


const MODELS = [
  { id: "wheel", icon: PieChart, title: "Roue de l'équilibre", desc: "Tes piliers de vie, branchés sur tes données Bien-être.", live: true },
  { id: "roadmap", icon: CalendarRange, title: "Feuille de route 90 jours", desc: "Trois horizons pour passer de la vision à l'action.", live: true },
  { id: "vmi", icon: Compass, title: "Vision · Mission · Identité", desc: "Clarifie ton cap, ta raison d'être et ton identité de marque.", soon: true },
  { id: "mood", icon: Palette, title: "Moodboard Élan / Refuge", desc: "Deux ambiances pilotées par tes modes d'énergie.", soon: true },
  { id: "mindmap", icon: Network, title: "Carte mentale", desc: "Explore tes idées en arborescence connectée.", soon: true },
  { id: "cockpit", icon: LayoutGrid, title: "Cockpit stratégique", desc: "Un tableau de bord vivant de tes indicateurs clés.", soon: true },
];

function Card({ item, onOpen, delay }) {
  const Icon = item.icon;
  const clickable = !item.soon;
  return (
    <motion.button
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={clickable ? { y: -4 } : {}}
      onClick={() => clickable && onOpen(item.id, { blank: item.blank })}
      disabled={item.soon}
      data-testid={`vision-hub-${item.id}${item.blank ? "-blank" : ""}`}
      className={[
        "glass group relative flex flex-col items-start gap-3 rounded-2xl p-5 text-left transition-all duration-300",
        item.accent ? "glass-gold" : "",
        item.soon ? "cursor-not-allowed opacity-60" : "hover:border-gold/50",
      ].join(" ")}
    >
      {item.soon && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-offwhite/70">
          <Lock size={9} /> Bientôt
        </span>
      )}
      {item.live && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-glow" /> Actif
        </span>
      )}
      <span className={[
        "flex h-11 w-11 items-center justify-center rounded-xl",
        item.accent ? "bg-gradient-to-br from-[#F1E2CC] to-[#DEC2A3] text-navy-900" : "bg-white/10 text-gold",
      ].join(" ")}>
        <Icon size={20} />
      </span>
      <div>
        <h3 className="font-ui text-[15px] font-semibold tracking-[-0.01em] text-offwhite">{item.title}</h3>
        <p className="mt-1 font-ui text-[13px] leading-relaxed text-offwhite/70">{item.desc}</p>
      </div>
      {clickable && (
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-gold opacity-0 transition group-hover:opacity-100">
          Ouvrir <ArrowRight size={13} />
        </span>
      )}
    </motion.button>
  );
}

export function VisionHub({ onOpen, onOpenBoard }) {
  // Corrigé : cette page n'affichait jamais les objectifs réellement saisis
  // à l'onboarding — l'utilisateur arrivait sur une galerie de modèles à
  // choisir, sans jamais voir ce qu'il venait de créer.
  const [objectifs, setObjectifs] = useState(null);
  useEffect(() => { fetchObjectifs().then((d) => setObjectifs(d.items || d || [])).catch(() => setObjectifs([])); }, []);

  return (
    <div className="mx-auto max-w-5xl" data-testid="vision-hub">
      <div className="mb-8 animate-fade-up">
        <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Ma maison stratégique</p>
        <h2 className="mt-1 font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-offwhite sm:text-[38px]">
          De ta vision à l'action
        </h2>
        <p className="mt-2 max-w-xl font-ui text-[14px] leading-relaxed text-offwhite/70">
          Tes boards, tes objectifs et des modèles prêts à l'emploi. Ouvre un board, crée-en un, ou laisse l'IA le composer.
        </p>
      </div>

      <BoardsGallery onOpenBoard={onOpenBoard} onGenerate={() => onOpen("canvas", { ia: true })} />

      {objectifs && objectifs.length > 0 && (
        <section className="mb-9" data-testid="vision-mes-objectifs">
          <h3 className="mb-3 flex items-center gap-2 font-ui text-[13px] font-semibold text-offwhite/85">
            <Target size={15} className="text-gold" /> Tes objectifs 90 jours
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {objectifs.map((o) => (
              <div key={o.id} className="glass rounded-2xl p-4" data-testid={`vision-objectif-${o.id}`}>
                <p className="font-ui text-[13.5px] font-semibold text-offwhite">{o.titre}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${o.progression || 0}%` }} />
                </div>
                <p className="mt-1.5 font-ui text-[11px] tabular-nums text-offwhite/60">{o.progression || 0}% — échéance {o.echeance ? new Date(o.echeance).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "—"}</p>
              </div>
            ))}
          </div>
        </section>
      )}


      <section>
        <h3 className="mb-3 flex items-center gap-2 font-ui text-[13px] font-semibold text-offwhite/85">
          <LayoutTemplate size={15} className="text-gold" /> Modèles
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODELS.map((item, i) => <Card key={item.title} item={item} onOpen={onOpen} delay={0.12 + i * 0.05} />)}
        </div>
      </section>
    </div>
  );
}
