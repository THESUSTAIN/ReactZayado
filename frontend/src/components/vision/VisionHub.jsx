import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutTemplate, PieChart, CalendarRange,
  Network, LayoutGrid, ArrowRight, Lock, Target, Compass,
} from "lucide-react";
import { toast } from "sonner";
import { fetchObjectifs, fetchRadar } from "@/lib/kairosApi";
import { Ok, OkBarre } from "@/components/kairos/Ok";
import { creerCarteMentale, creerCockpitStrategique } from "@/lib/carteMentale";
import { BoardsGallery } from "@/components/vision/BoardsGallery";


const MODELS = [
  { id: "wheel", icon: PieChart, title: "Roue de l'équilibre", desc: "Tes piliers de vie, branchés sur tes données Bien-être.", live: true },
  { id: "mindmap", icon: Network, title: "Carte mentale", desc: "Ta vision au centre, tes clients, ton offre, tes chiffres et ton énergie en branches reliées.", live: true },
  { id: "cockpit", icon: LayoutGrid, title: "Cockpit stratégique", desc: "6 murs reliés en direct : objectifs, finances, actions, énergie, idées et victoires.", live: true },
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
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-gold opacity-80 transition group-hover:opacity-100">
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
  // Le cap tel que le RADAR le lit. On ne recalcule rien ici : le serveur sait
  // déjà s'il est exploitable, d'où il vient et où aller le corriger. Deux règles
  // qui divergent, c'est une page qui dit « tout va bien » pendant qu'une autre
  // refuse de chercher.
  const [cap, setCap] = useState(null);
  useEffect(() => { fetchRadar().then(setCap).catch(() => setCap({})); }, []);
  // Carte mentale : crée un board pré-rempli (vision au centre + 4 branches reliées) puis l'ouvre.
  const creerDepuisModele = async (fn, attente, pret) => {
    const t = toast.loading(attente);
    try { const b = await fn(); toast.success(pret, { id: t }); onOpenBoard(b); }
    catch { toast.error("Création impossible pour le moment. Réessaie.", { id: t }); }
  };
  const ouvrirModele = (id, opts) => {
    if (id === "mindmap") return creerDepuisModele(creerCarteMentale, "Création de ta carte mentale…", "Ta carte mentale est prête");
    if (id === "cockpit") return creerDepuisModele(creerCockpitStrategique, "Création de ton cockpit stratégique…", "Ton cockpit stratégique est prêt");
    return onOpen(id, opts);
  };

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

      {/* ── TON CAP — la seule chose de cette page dont dépend le reste de
             l'application. Le Radar ne cherche rien sans elle ; elle n'était
             affichée nulle part. ── */}
      {cap && (
        <Ok or={!cap.objectif_flou && (cap.objectifs_utilises || []).length > 0} className="mb-7" data-testid="vision-cap">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
            <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-2xl text-gold" style={{ background: "rgba(222,194,163,.14)" }}>
              <Compass size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="ok-lab">Ton cap · celui que le Radar suit</p>
              {(cap.objectifs_utilises || []).length > 0 && !cap.objectif_flou ? (
                <>
                  <p className="mt-2 font-display text-[21px] leading-[1.35]">{cap.objectifs_utilises[0]}</p>
                  <p className="mt-2 text-[13px] text-offwhite/55">
                    Le Radar s'en sert chaque matin pour choisir ce qu'il te propose.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 font-display text-[21px] leading-[1.35]">
                    {cap.objectif_flou ? "Ton cap est trop court pour être suivi." : "Aucun cap posé."}
                  </p>
                  <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-offwhite/55">
                    Tant qu'il manque, le Radar ne cherche rien — il préfère ne rien te proposer plutôt que du bruit.
                  </p>
                </>
              )}
            </div>
            <a href={cap.objectif_lien || "/app/radar"} data-testid="vision-cap-lien"
              className="shrink-0 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-[12.5px] font-semibold text-offwhite/80 hover:text-offwhite">
              {(cap.objectifs_utilises || []).length > 0 && !cap.objectif_flou ? "Ouvrir mon Radar" : (cap.objectif_lien_libelle || "Poser mon cap")}
            </a>
          </div>
        </Ok>
      )}

      <BoardsGallery onOpenBoard={onOpenBoard} onGenerate={() => onOpen("canvas", { ia: true })} />

      {objectifs && objectifs.length > 0 && (
        <section className="mb-8" data-testid="vision-mes-objectifs">
          <h3 className="mb-3 flex items-center gap-2 font-ui text-[13px] font-semibold text-offwhite/85">
            <Target size={15} className="text-gold" /> Tes objectifs 90 jours
            <a href="/app/actions?tab=objectifs" className="ml-auto text-[12px] font-semibold text-gold hover:underline" data-testid="vision-gerer-objectifs">Gérer dans le Plan d'action →</a>
          </h3>
          {/* En colonnes, plus en lignes pleine largeur empilées : on lit en
              travers et la page scrolle moins. */}
          <div className="grid gap-3 sm:grid-cols-2">
            {objectifs.map((o) => {
              const p = o.progression || 0;
              const c = p >= 70 ? "#5DCAA5" : p > 0 ? "#DEC2A3" : "rgba(255,255,255,.3)";
              return (
                <div key={o.id} className="ok-prow !mb-0" data-testid={`vision-objectif-${o.id}`}>
                  <div className="flex items-center gap-3">
                    <span className="ok-ti min-w-0 flex-1 truncate">{o.titre}</span>
                    <span className="w-11 shrink-0 text-right font-display text-[17px] tabular-nums" style={{ color: c }}>{p}%</span>
                  </div>
                  <p className="mt-1 text-[12px] text-offwhite/45">
                    {o.echeance ? `échéance ${new Date(o.echeance).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : "sans échéance"}
                  </p>
                  <OkBarre className="mt-2.5" valeur={p} couleur={c} />
                </div>
              );
            })}
          </div>
        </section>
      )}


      <section>
        <h3 className="mb-3 flex items-center gap-2 font-ui text-[13px] font-semibold text-offwhite/85">
          <LayoutTemplate size={15} className="text-gold" /> Modèles
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODELS.map((item, i) => <Card key={item.title} item={item} onOpen={ouvrirModele} delay={0.12 + i * 0.05} />)}
          {/* Modèles en préparation : regroupés en une seule carte discrète (avant : 2 cartes « Bientôt » cliquables sans effet). */}
          <div className="flex flex-col justify-center rounded-2xl border border-dashed border-white/15 p-5 text-left" data-testid="vision-hub-a-venir">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-offwhite/50">À venir</p>
            <p className="mt-2 text-[13px] leading-relaxed text-offwhite/65">Vision · Mission · Identité, et Moodboard Élan / Refuge.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
