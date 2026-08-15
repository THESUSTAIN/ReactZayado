import React, { useEffect, useMemo, useState } from "react";
import { LayoutTemplate, Network, Target, BarChart3, Sparkles, CheckCircle2, MessageCircle, ArrowRight } from "lucide-react";
import Vision from "./Vision";
import { getObjectifs, getVision } from "../lib/api";

// 4 onglets de la page Vision — mêmes intitulés que final-main, une seule
// page (pas 4 pages séparées), habillés avec le style déjà établi dans
// Cours (glass, gold-text) plutôt que copiés du design de final.
const TABS = [
  { id: "accueil", label: "Accueil Vision", Icon: LayoutTemplate },
  { id: "canvas", label: "Vision Canvas", Icon: Network },
  { id: "pillars", label: "Piliers stratégiques", Icon: Target },
  { id: "analyse", label: "Analyse & validation", Icon: BarChart3 },
];

const CATEGORY_COLOR = { Liberté: "#38bdf8", Impact: "#f472b6", Entreprise: "#D4AF37", Finance: "#34d399" };

function askCopilot(message) {
  window.dispatchEvent(new CustomEvent("cours:open-copilot", { detail: { ask: message } }));
}

function ObjectiveTile({ objectif, compact = false }) {
  const progress = Math.min(100, Math.round((objectif.valeur_actuelle / (objectif.valeur_cible || 1)) * 100));
  const color = CATEGORY_COLOR[objectif.categorie] || "#D4AF37";
  return (
    <article className={`glass ${compact ? "p-4" : "p-5"}`} data-testid={`vision-board-pillar-${objectif.id}`}>
      <p className="text-[10px] font-bold uppercase tracking-[.12em]" style={{ color }}>{objectif.categorie}</p>
      <h3 className="mt-1 font-head text-base font-semibold text-white">{objectif.titre}</h3>
      <p className="mt-1 text-xs text-white/55">{objectif.valeur_actuelle} / {objectif.valeur_cible} {objectif.unite}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full" style={{ width: `${progress}%`, background: color }} />
      </div>
      {!compact && (
        <button onClick={() => askCopilot(`Transforme mon pilier « ${objectif.titre} » en une action précise et mesurable pour aujourd'hui.`)}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#D4AF37] hover:text-[#FFD700]">
          <Sparkles size={13} /> Transformer en action
        </button>
      )}
    </article>
  );
}

export default function VisionBoard() {
  const [activeTab, setActiveTab] = useState("accueil");
  const [objectifs, setObjectifs] = useState([]);
  const [vision, setVision] = useState("");

  const load = async () => {
    try {
      const [items, visionData] = await Promise.all([getObjectifs(), getVision()]);
      setObjectifs(Array.isArray(items) ? items : []);
      setVision(visionData?.value || "");
    } catch {
      setObjectifs([]);
    }
  };
  useEffect(() => { load(); }, []);

  const score = useMemo(() => {
    if (!objectifs.length) return 0;
    return Math.round(objectifs.reduce((sum, item) => sum + Math.min(100, (item.valeur_actuelle / (item.valeur_cible || 1)) * 100), 0) / objectifs.length);
  }, [objectifs]);

  return (
    <div className="space-y-6" data-testid="vision-board">
      <nav className="flex flex-wrap gap-2" role="tablist" aria-label="Onglets Vision">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={activeTab === id} data-testid={`vision-tab-${id}`}
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === id ? "gold-bg text-[#0A1128]" : "bg-white/5 border border-white/15 text-white/70 hover:border-[#D4AF37]/40"
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </nav>

      {/* Accueil Vision — la page Vision de Cours, déjà bonne (SWOT généré par
          IA, Vision Document, pilier→action) : on l'affiche telle quelle,
          on ne duplique rien. */}
      {activeTab === "accueil" && <Vision onChanged={load} />}

      {activeTab === "canvas" && (
        <section className="glass p-6" data-testid="vision-canvas-tab">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><Network className="text-[#D4AF37]" size={19} /><h2 className="font-head text-xl font-semibold">Vision Canvas</h2></div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
                Vos piliers stratégiques, vus comme des cartes de décision. Demandez au copilote de les organiser en plan d'action.
              </p>
            </div>
            <button onClick={() => askCopilot(`Aide-moi à organiser mon Vision Canvas à partir de cette vision : ${vision || "ma vision"}.`)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-4 py-2 text-sm font-semibold text-[#F0DCA5]">
              <Sparkles size={15} /> Organiser avec le copilote
            </button>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {objectifs.map((o) => <ObjectiveTile key={o.id} objectif={o} compact />)}
            {!objectifs.length && <div className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-white/50">Ajoutez un objectif dans "Accueil Vision" pour commencer votre canvas.</div>}
          </div>
        </section>
      )}

      {activeTab === "pillars" && (
        <section data-testid="vision-pillars-tab">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#D4AF37]">Fondations</p><h2 className="font-head text-2xl font-semibold">Piliers stratégiques</h2></div>
            <button onClick={() => askCopilot("Analyse mes piliers stratégiques et identifie celui qui demande le plus d'attention cette semaine.")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:border-[#D4AF37]/50">
              <MessageCircle size={15} /> Prioriser avec le copilote
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {objectifs.map((o) => <ObjectiveTile key={o.id} objectif={o} />)}
            {!objectifs.length && <div className="glass col-span-full p-6 text-sm text-white/55">Aucun pilier défini — créez votre premier objectif depuis "Accueil Vision".</div>}
          </div>
        </section>
      )}

      {activeTab === "analyse" && (
        <section className="grid gap-4 lg:grid-cols-3" data-testid="vision-analysis-tab">
          <article className="glass p-6">
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-white/50">Score d'alignement</p>
            <div className="mt-2 font-head text-5xl font-semibold gold-text">{score}%</div>
            <p className="mt-3 text-sm leading-relaxed text-white/60">{score >= 60 ? "Votre vision est soutenue par des objectifs en progression." : "Choisissez un pilier à faire avancer cette semaine."}</p>
          </article>
          <article className="glass p-6 lg:col-span-2">
            <div className="flex items-center gap-2"><CheckCircle2 className="text-[#D4AF37]" size={19} /><h2 className="font-head text-xl font-semibold">Analyse & validation</h2></div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
              L'analyse SWOT (onglet "Accueil Vision") reste la source de vérité — ici, demandez au copilote une lecture ciblée sur votre score et vos priorités.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => askCopilot(`Analyse mon Vision Board. Mon score global est ${score}%. Donne-moi les trois actions les plus utiles pour la semaine.`)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D4AF37]/45 bg-[#D4AF37]/15 px-4 py-2 text-sm font-semibold text-[#F0DCA5]">
                <Sparkles size={15} /> Lancer l'analyse IA
              </button>
              <button onClick={() => askCopilot("À partir de mon Vision Board, vérifie la cohérence de mon objectif et indique ce que je dois clarifier.")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80">
                Valider mon objectif <ArrowRight size={14} />
              </button>
            </div>
          </article>
        </section>
      )}
    </div>
  );
}
