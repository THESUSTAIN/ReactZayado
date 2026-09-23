// 2 maquettes pour la page Bien-être + 2 pour Idées
// Route: /mockup/:page/:variant  (ex: /mockup/bien-etre/1)
import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Heart, Wind, Moon, Sun, Battery, Activity, Sparkles, Zap,
  BookOpen, Music, Coffee, Leaf, Waves, Cloud, Lightbulb, Plus,
  Search, Filter, Grid3x3, List, Tag, Star, Archive, Trash2, MessageSquare,
  ChevronRight, Play, Pause, MoreHorizontal, Mic, Image as ImageIcon,
} from "lucide-react";

const GOLD = "#DEC2A3";
const NAVY = "#0B1F3A";

export default function Mockup() {
  const { page, variant } = useParams();
  const navigate = useNavigate();

  const V = variant || "1";

  return (
    <div className="min-h-screen text-white" style={{ background: NAVY }}>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-900/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <button onClick={() => navigate("/app")} className="flex items-center gap-2 text-white/70 hover:text-white">
            <ArrowLeft size={16} /> <span className="text-sm">Retour app</span>
          </button>
          <div className="font-serif-italic italic text-[16px]" style={{ color: GOLD }}>Maquette · {page} · variante {V}</div>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/mockup/${page}/1`)} className={`rounded-full px-3 py-1 text-[12px] ${V === "1" ? "bg-gold text-navy-900 font-semibold" : "border border-white/20 text-white/70 hover:text-white"}`}>Variante 1</button>
            <button onClick={() => navigate(`/mockup/${page}/2`)} className={`rounded-full px-3 py-1 text-[12px] ${V === "2" ? "bg-gold text-navy-900 font-semibold" : "border border-white/20 text-white/70 hover:text-white"}`}>Variante 2</button>
          </div>
        </div>
      </header>

      {page === "bien-etre" && V === "1" && <BienEtreV1 />}
      {page === "bien-etre" && V === "2" && <BienEtreV2 />}
      {page === "idees" && V === "1" && <IdeesV1 />}
      {page === "idees" && V === "2" && <IdeesV2 />}
    </div>
  );
}

/* ================== BIEN-ÊTRE V1 : Sanctuary / rituels doux ================== */
function BienEtreV1() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>Ton refuge · Sanctuary</p>
        <h1 className="font-display text-[38px] font-semibold">
          Prends soin de toi, <span className="font-serif-italic italic" style={{ color: GOLD }}>doucement.</span>
        </h1>
        <p className="mt-2 font-hand text-[24px] text-white/85">Trois respirations. Un journal. Un rituel du soir.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* Energy state */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <div className="flex items-center gap-2"><Battery size={16} style={{ color: GOLD }} /><span className="text-[11px] uppercase tracking-widest text-white/60">Ton énergie ce matin</span></div>
          <div className="mt-3 flex items-baseline gap-3">
            <div className="font-display text-[72px] font-semibold leading-none" style={{ color: GOLD }}>4</div>
            <div className="text-[16px] text-white/60">/ 5 · <span className="font-serif-italic italic">Élan calme</span></div>
          </div>
          <div className="mt-4 flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={`h-11 flex-1 rounded-xl border transition ${n <= 4 ? "border-transparent bg-[color:var(--g)]/70" : "border-white/15 bg-white/5 hover:bg-white/10"}`} style={{ "--g": GOLD }}>
                <span className="text-[13px] font-semibold">{n}</span>
              </button>
            ))}
          </div>
          <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 font-serif-italic italic text-[15.5px] text-white/85">
            « Tu as l'énergie pour trois choses. Choisis celle qui te fait le plus de bien. »
          </p>
        </div>

        {/* Ambience */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-6">
          <div className="flex items-center gap-2"><Cloud size={16} style={{ color: GOLD }} /><span className="text-[11px] uppercase tracking-widest text-white/60">Ambiance du refuge</span></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { icon: Waves, label: "Vagues", active: true },
              { icon: Cloud, label: "Pluie douce" },
              { icon: Leaf, label: "Forêt" },
              { icon: Music, label: "Piano" },
            ].map((a, i) => (
              <button key={i} className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 transition ${a.active ? "border-[color:var(--g)] bg-[color:var(--g)]/10" : "border-white/10 bg-white/[0.02] hover:border-white/25"}`} style={{ "--g": GOLD }}>
                <a.icon size={18} style={{ color: a.active ? GOLD : "rgba(255,255,255,0.6)" }} />
                <span className="text-[11.5px] text-white/75">{a.label}</span>
              </button>
            ))}
          </div>
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold text-[#0B1F3A]" style={{ background: GOLD }}>
            <Play size={14} fill="currentColor" /> Lancer la séance · 8 min
          </button>
        </div>
      </div>

      {/* Rituels du jour */}
      <h2 className="mt-10 mb-4 font-display text-[22px] font-semibold">Tes 3 rituels doux du jour</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Wind, title: "Respiration 4-7-8", desc: "5 minutes pour poser ton système nerveux.", time: "5\u00a0min", tag: "Matin" },
          { icon: BookOpen, title: "Journal des 3", desc: "3 gratitudes. 3 apprentissages. 3 intentions.", time: "7\u00a0min", tag: "Midi" },
          { icon: Moon, title: "Pensée d'ancrage", desc: "Une phrase pour fermer la journée sans la traîner.", time: "3\u00a0min", tag: "Soir" },
        ].map((r, i) => (
          <div key={i} className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-[color:var(--g)]/40" style={{ "--g": GOLD }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${GOLD}22` }}><r.icon size={18} style={{ color: GOLD }} /></div>
              <span className="text-[10px] uppercase tracking-widest text-white/40">{r.tag}</span>
            </div>
            <h3 className="font-display text-[17px] font-semibold">{r.title}</h3>
            <p className="mt-1 text-[13px] text-white/60">{r.desc}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[11px] text-white/50">{r.time}</span>
              <button className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: GOLD }}><Play size={12} fill="currentColor" /> Commencer</button>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly wellbeing */}
      <h2 className="mt-10 mb-4 font-display text-[22px] font-semibold">Ta semaine</h2>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <div className="flex items-end gap-2 h-32">
          {[3, 4, 2, 3, 5, 4, 4].map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t" style={{ height: `${v * 20}%`, background: `linear-gradient(180deg, ${GOLD}, ${GOLD}66)` }} />
              <span className="text-[10px] text-white/50">{["L", "M", "M", "J", "V", "S", "D"][i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================== BIEN-ÊTRE V2 : Cockpit médical premium ================== */
function BienEtreV2() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>Bien-être · Vitals</p>
          <h1 className="font-display text-[36px] font-semibold">Tes 4 indicateurs clés</h1>
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-[12px] hover:border-[color:var(--g)]/40" style={{ "--g": GOLD }}>
          <Plus size={13} /> Check-in maintenant
        </button>
      </div>

      {/* 4 vitals */}
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { icon: Battery, label: "Énergie", value: 4, color: "#a3e635" },
          { icon: Activity, label: "Stress", value: 2, color: "#f97316", reverse: true },
          { icon: Moon, label: "Sommeil", value: 4, color: "#60a5fa" },
          { icon: Heart, label: "Charge", value: 3, color: "#f472b6", reverse: true },
        ].map((v, i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${v.color}22` }}>
                <v.icon size={16} style={{ color: v.color }} />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-white/50">{v.label}</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-[42px] font-semibold leading-none">{v.value}</span>
              <span className="text-[13px] text-white/50">/ 5</span>
            </div>
            <div className="mt-3 flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-1.5 flex-1 rounded-full" style={{ background: n <= v.value ? v.color : "rgba(255,255,255,0.08)" }} />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] text-white/50">
              {v.reverse
                ? (v.value <= 2 ? <><Sparkles size={11} className="text-emerald-400" /> Bas, c'est bien</> : <>À surveiller</>)
                : (v.value >= 4 ? <><Sparkles size={11} className="text-emerald-400" /> En forme</> : <>À nourrir</>)}
            </div>
          </div>
        ))}
      </div>

      {/* Timeline + insights */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="mb-4 font-display text-[16px] font-semibold">14 derniers jours</h3>
          <div className="relative h-40">
            <svg viewBox="0 0 400 120" className="w-full h-full">
              <defs>
                <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity="0.5" />
                  <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,80 Q30,60 60,70 T120,50 T180,60 T240,40 T300,55 T360,30 T400,40 L400,120 L0,120 Z" fill="url(#g)" />
              <path d="M0,80 Q30,60 60,70 T120,50 T180,60 T240,40 T300,55 T360,30 T400,40" fill="none" stroke={GOLD} strokeWidth="2" />
            </svg>
          </div>
          <div className="mt-4 flex items-center gap-6 text-[11.5px] text-white/60">
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: GOLD }} /> Énergie moyenne 3.7</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-400" /> Stress moyen 2.4</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-center gap-2 mb-3"><Sparkles size={15} style={{ color: GOLD }} /><h3 className="font-display text-[15px] font-semibold">Insight du jour</h3></div>
          <p className="text-[13.5px] leading-relaxed text-white/70">
            Ton énergie est plus haute après tes marches du matin. J'ai bloqué <b className="text-white">20 min lundi</b> pour toi.
          </p>
          <button className="mt-4 w-full rounded-lg border border-[color:var(--g)]/40 py-2 text-[12px] font-semibold" style={{ "--g": GOLD, color: GOLD }}>
            Voir toutes les tendances
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          { icon: Coffee, label: "Pause café consciente", time: "3 min" },
          { icon: Wind, label: "Respiration guidée", time: "5 min" },
          { icon: BookOpen, label: "Journal express", time: "4 min" },
        ].map((a, i) => (
          <button key={i} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-[color:var(--g)]/40" style={{ "--g": GOLD }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${GOLD}22` }}><a.icon size={17} style={{ color: GOLD }} /></div>
            <div className="flex-1">
              <div className="text-[13.5px] font-semibold">{a.label}</div>
              <div className="text-[11.5px] text-white/50">{a.time}</div>
            </div>
            <ChevronRight size={15} className="text-white/40" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================== IDÉES V1 : Mur Post-it ================== */
function IdeesV1() {
  const ideas = [
    { color: "#fdf4d3", tag: "Offre", text: "Programme d'accompagnement 6 semaines\npour freelances sensibles", ago: "2h" },
    { color: "#ffd9d9", tag: "Produit", text: "Créer un pack « retraite entrepreneurs »\navec vraie coach", ago: "1j" },
    { color: "#d7f2df", tag: "Contenu", text: "Série de podcasts « Ne porte pas tout seul »", ago: "2j" },
    { color: "#d7e6f5", tag: "Business", text: "Partenariat avec un cabinet compta apaisé", ago: "3j" },
    { color: "#ffe1c9", tag: "IA", text: "Automatiser le brief hebdo aux clients\navec Claude", ago: "4j" },
    { color: "#ecdcff", tag: "Communauté", text: "Groupe WhatsApp privé par plan", ago: "1sem" },
  ];
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>Idea Wall</p>
          <h1 className="font-display text-[36px] font-semibold">Ton mur d'<span className="font-serif-italic italic" style={{ color: GOLD }}>idées</span></h1>
          <p className="mt-2 font-hand text-[22px] text-white/85">Dépose tout. Range plus tard.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 p-2.5 hover:border-[color:var(--g)]/40" style={{ "--g": GOLD }}><Mic size={15} style={{ color: GOLD }} /></button>
          <button className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 p-2.5 hover:border-[color:var(--g)]/40" style={{ "--g": GOLD }}><ImageIcon size={15} /></button>
          <button className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-[#0B1F3A]" style={{ background: GOLD }}><Plus size={14} /> Nouvelle idée</button>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5">
        <Search size={15} className="text-white/50" />
        <input placeholder="Chercher, taguer, filtrer…" className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-white/40" />
        <button className="flex items-center gap-1 text-[12px] text-white/60 hover:text-white"><Filter size={13} /> Filtres</button>
      </div>

      {/* Wall of stickies */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ideas.map((it, i) => (
          <div key={i} className="paper-note relative p-5" style={{ background: it.color, transform: `rotate(${i % 2 ? -2 : 2}deg)`, minHeight: 190 }}>
            <span className="push-pin" />
            <div className="text-[10px] font-bold uppercase tracking-widest text-black/60">{it.tag}</div>
            <p className="mt-3 whitespace-pre-line font-hand text-[22px] leading-[1.15] text-black/85">{it.text}</p>
            <div className="absolute bottom-3 right-4 text-[10px] text-black/40">il y a {it.ago}</div>
          </div>
        ))}

        <button className="flex min-h-[190px] items-center justify-center rounded-lg border-2 border-dashed border-white/15 bg-white/[0.02] p-5 text-white/50 transition hover:border-[color:var(--g)]/60 hover:bg-white/5 hover:text-white" style={{ "--g": GOLD }}>
          <div className="flex flex-col items-center gap-2">
            <Plus size={22} />
            <span className="text-[13px]">Ajouter</span>
          </div>
        </button>
      </div>
    </div>
  );
}

/* ================== IDÉES V2 : Kanban structuré ================== */
function IdeesV2() {
  const cols = [
    { title: "Capture", tag: "BRUT", color: "#a3e635", items: [
      { title: "Produit nomade pour digital nomads", tag: "Produit", star: false },
      { title: "Série réels Instagram", tag: "Contenu", star: true },
      { title: "Partenariat mutuelle", tag: "Business", star: false },
    ]},
    { title: "À explorer", tag: "WIP", color: "#f4d595", items: [
      { title: "Programme accompagnement 6 sem.", tag: "Offre", star: true },
      { title: "Automatiser brief hebdo Claude", tag: "IA", star: false },
    ]},
    { title: "En roadmap", tag: "PROD", color: "#60a5fa", items: [
      { title: "Podcasts « Ne porte pas tout seul »", tag: "Contenu", star: true },
    ]},
    { title: "Archivé", tag: "COLD", color: "#94a3b8", items: [
      { title: "Newsletter quotidienne", tag: "Contenu", star: false },
    ]},
  ];
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>Idea Board</p>
          <h1 className="font-display text-[36px] font-semibold">Tes idées, <span className="font-serif-italic italic" style={{ color: GOLD }}>en mouvement.</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 p-1">
            <button className="rounded-md bg-white/10 p-1.5"><List size={13} /></button>
            <button className="rounded-md p-1.5 text-white/50 hover:text-white"><Grid3x3 size={13} /></button>
          </div>
          <button className="flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-[#0B1F3A]" style={{ background: GOLD }}><Plus size={14} /> Nouvelle idée</button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5">
        <Search size={15} className="text-white/50" />
        <input placeholder="Chercher…" className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-white/40" />
        <div className="flex gap-1">
          {["Offre", "Produit", "Contenu", "IA", "Business"].map((t) => (
            <span key={t} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10.5px] text-white/75 hover:border-[color:var(--g)]/50 cursor-pointer" style={{ "--g": GOLD }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Kanban */}
      <div className="grid gap-4 lg:grid-cols-4">
        {cols.map((c, i) => (
          <div key={i} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                <h3 className="font-display text-[14px] font-semibold">{c.title}</h3>
                <span className="text-[10px] text-white/50">{c.items.length}</span>
              </div>
              <button className="text-white/40 hover:text-white"><Plus size={14} /></button>
            </div>
            <div className="flex flex-col gap-2">
              {c.items.map((it, k) => (
                <div key={k} className="group rounded-xl border border-white/10 bg-white/[0.04] p-3.5 transition hover:border-[color:var(--g)]/40" style={{ "--g": GOLD }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-medium text-white flex-1">{it.title}</p>
                    {it.star && <Star size={13} fill={GOLD} className="shrink-0" style={{ color: GOLD }} />}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/60">{it.tag}</span>
                    <button className="text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition"><MoreHorizontal size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
