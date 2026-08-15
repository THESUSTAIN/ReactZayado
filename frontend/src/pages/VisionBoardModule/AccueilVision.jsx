import React, { useEffect, useState } from "react";
import {
  Sparkles, TrendingUp, Target, Wallet, Users, Compass, Zap,
  Plus, BarChart3, Share2, Focus, ArrowRight, Loader2, Mail, Calendar,
  AlertTriangle, Link2, Check, Chrome,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { visionBrainApi, dashboardApi } from "@/lib/api";
import AlignmentCelebration from "@/components/AlignmentCelebration";
import { KeyInsights, QuoteBar } from "@/components/CockpitSections";

const PILLAR_COLOR = {
  "Vision": "#E08A4A", "Exécution": "#3B6FE0", "Finance": "#2FB89A",
  "Impact": "#D4AF37", "Énergie": "#E0669A", "Croissance": "#4AC0E0",
};

function PillarRing({ name, value }) {
  const r = 26, c = 2 * Math.PI * r, off = c - (value / 100) * c;
  const color = PILLAR_COLOR[name] || "#D4AF37";
  return (
    <div className="flex flex-col items-center gap-1" data-testid={`pillar-${name}`}>
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" stroke="rgba(255,255,255,0.10)" />
          <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" stroke={color}
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
            style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)" }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{value}</span>
      </div>
      <span className="text-[11px] text-white/60">{name}</span>
    </div>
  );
}

const CARD_ICON = { Vision: Compass, Objectif: Target, CA: Wallet, Impact: TrendingUp, Client: Users };
const MIRROR_ICON = { compass: Compass, wallet: Wallet, users: Users, mail: Mail, calendar: Calendar };

function LinkedCard({ card }) {
  const Icon = CARD_ICON[card.type] || Sparkles;
  const badgeStyle = card.badge === "Objectif atteint"
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
    : card.badge === "Nouvelle opportunité"
    ? "bg-[#D4AF37]/15 text-amber-100 border-[#D4AF37]/40"
    : "bg-[#D4AF37]/15 text-amber-100 border-[#D4AF37]/40";
  return (
    <div className="relative min-w-[190px] flex-1 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm transition-transform hover:-translate-y-0.5"
      data-testid={`linked-card-${card.key}`}>
      {card.badge && (
        <span className={`absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeStyle}`}>
          <Sparkles size={9} /> {card.badge}
        </span>
      )}
      <div className="flex items-center gap-2 text-white/50">
        <Icon size={15} />
        <span className="text-[11px] uppercase tracking-wide">{card.type}</span>
      </div>
      <div className="mt-1.5 text-sm font-medium text-white/90">{card.title}</div>
      <div className="mt-0.5 text-lg font-bold text-white" data-testid={`linked-card-${card.key}-value`}>{card.value}</div>
      {card.progress != null && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-[#E8C96A] to-[#D4AF37]"
            style={{ width: `${Math.min(100, card.progress)}%` }} />
        </div>
      )}
    </div>
  );
}

export default function AccueilVision({ onGoCanvas }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mirror, setMirror] = useState(null);
  const [dash, setDash] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    visionBrainApi.panel().then(setData).catch(() => {}).finally(() => setLoading(false));
    visionBrainApi.connections().then(setMirror).catch(() => {});
    // Point du jour / valeur générée / citation — même source que l'ancien
    // Dashboard (retiré), migrées ici puisque Vision est maintenant l'accueil.
    dashboardApi.get().then(setDash).catch(() => {});
  }, []);

  if (loading) {
    return <div className="flex items-center gap-2 p-8 text-white/60" data-testid="accueil-loading"><Loader2 className="animate-spin" size={16} /> Chargement du cockpit…</div>;
  }
  if (!data) return null;

  const opps = data.opportunities?.length || 0;
  const quickActions = [
    { icon: Plus, label: "Créer", onClick: onGoCanvas },
    { icon: BarChart3, label: "Analyser", onClick: onGoCanvas },
    { icon: Share2, label: "Partager", onClick: () => {} },
    { icon: Focus, label: "Mode Focus", onClick: onGoCanvas },
  ];

  return (
    <div className="space-y-5" data-testid="accueil-vision">
      {/* Hero */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#D4AF37]/15 via-white/[0.02] to-[#D4AF37]/10 p-6" data-testid="accueil-hero">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-head text-3xl font-bold text-white sm:text-4xl">
              Votre vision est alignée à <span className="text-[#D4AF37]">{data.alignment_score}%</span>.
            </h2>
            <p className="mt-1 text-white/60">
              {data.delta_week === null || data.delta_week === undefined ? (
                <span className="text-white/50">Premier calcul — pas encore d'historique</span>
              ) : (
                <span className={data.delta_week >= 0 ? "text-emerald-300" : "text-red-300"}>
                  {data.delta_week >= 0 ? "+" : ""}{data.delta_week} cette semaine
                </span>
              )}
              {" · "}{opps} opportunité{opps > 1 ? "s" : ""} détectée{opps > 1 ? "s" : ""}.
            </p>
          </div>
          <button onClick={onGoCanvas} data-testid="accueil-open-canvas"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#E8C96A] to-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95 transition-opacity">
            <Zap size={15} /> Ouvrir mon board vivant
          </button>
        </div>
      </div>

      {/* Score Business circulaire (6 piliers) */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" data-testid="accueil-score-business">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-head text-lg font-semibold text-white">Score Business</h3>
          <span className="text-2xl font-bold text-[#D4AF37]">{data.score_business?.overall}/100</span>
        </div>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {data.score_business?.pillars?.map((p) => (
            <PillarRing key={p.name} name={p.name} value={p.value} />
          ))}
        </div>
      </div>

      {/* Cartes intelligentes reliées */}
      <div data-testid="accueil-linked-cards">
        <h3 className="mb-2 font-head text-lg font-semibold text-white">Cartes intelligentes reliées</h3>
        <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
          {data.linked_cards?.map((c, i) => (
            <React.Fragment key={c.key}>
              <LinkedCard card={c} />
              {i < data.linked_cards.length - 1 && (
                <div className="flex items-center text-white/25"><ArrowRight size={18} /></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="flex flex-wrap gap-2" data-testid="accueil-quick-actions">
        {quickActions.map((a, i) => (
          <button key={i} onClick={a.onClick} data-testid={`accueil-action-${a.label}`}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/90 hover:border-[#D4AF37]/50 hover:bg-white/[0.07] transition-colors">
            <a.icon size={15} className="text-[#D4AF37]" /> {a.label}
          </button>
        ))}
      </div>

      {/* Extension navigateur — CTA découvrable */}
      <button onClick={() => navigate("/extension")} data-testid="accueil-extension-cta"
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-r from-[#D4AF37]/12 to-[#D4AF37]/10 p-4 text-left hover:border-[#D4AF37]/60 transition-colors">
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/25 text-amber-100"><Chrome size={18} /></span>
          <span>
            <span className="block text-sm font-semibold text-white">Nouveau — Extension navigateur</span>
            <span className="block text-xs text-white/60">Zayado Copilot : capturez le web et créez des actions sans quitter votre onglet.</span>
          </span>
        </span>
        <ArrowRight size={18} className="shrink-0 text-white/50" />
      </button>

      {/* Miroir dynamique — les connexions alimentent la Vision */}
      {mirror?.chain?.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" data-testid="accueil-mirror">
          <div className="mb-1 flex items-center gap-2">
            <Link2 size={16} className="text-[#D4AF37]" />
            <h3 className="font-head text-lg font-semibold text-white">Miroir dynamique</h3>
          </div>
          <p className="mb-4 text-xs text-white/50">Vos connexions (Finance, CRM, Email, Agenda) alimentent la Vision en temps réel.</p>
          <div className="space-y-0">
            {mirror.chain.map((node, i) => {
              const Icon = MIRROR_ICON[node.icon] || Compass;
              return (
                <div key={node.key} data-testid={`mirror-node-${node.key}`}>
                  <div className={`flex items-center gap-3 rounded-2xl border p-3 ${node.connected ? "border-white/10 bg-white/[0.03]" : "border-dashed border-white/15 bg-transparent"}`}>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${node.connected ? "bg-[#D4AF37]/20 text-amber-100" : "bg-white/5 text-white/40"}`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{node.provider}</span>
                        {node.connected && node.simulated ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300" title="Donnée estimée en attendant une vraie connexion">estimation</span>
                        ) : node.connected ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300"><Check size={9} /> connecté</span>
                        ) : (
                          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">non connecté</span>
                        )}
                      </div>
                      <div className="text-sm text-white/70">{node.value}</div>
                    </div>
                  </div>
                  {i < mirror.chain.length - 1 && (
                    <div className="flex justify-start pl-[26px] py-0.5 text-white/20">↓</div>
                  )}
                </div>
              );
            })}
          </div>
          {mirror.ia_warning && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3" data-testid="mirror-ia-warning">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" />
              <p className="text-sm text-amber-100/90">{mirror.ia_warning}</p>
            </div>
          )}
        </div>
      )}

      {/* Fil d'activité IA */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" data-testid="accueil-activity">
        <h3 className="mb-3 font-head text-lg font-semibold text-white">L'IA explique</h3>
        <div className="space-y-2.5">
          {data.activity?.map((a, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4AF37]" />
              <p className="text-sm text-white/75 leading-snug">{a.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Migrés depuis l'ancien Dashboard (retiré) — Vision est maintenant
          l'accueil, ces 3 blocs y trouvent naturellement leur place. */}
      {/* Ressources & Inspiration — pas de contenu externe inventé (pas de
          fausses citations/images "curées") : des déclencheurs vers le
          copilote, sur des angles utiles pour la vision. */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" data-testid="accueil-inspiration">
        <h3 className="mb-3 font-head text-lg font-semibold text-white">Ressources & Inspiration</h3>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { label: "Design de vie", prompt: "Aide-moi à repenser mon organisation quotidienne pour qu'elle serve vraiment ma vision." },
            { label: "Entrepreneurs qui inspirent", prompt: "Partage-moi des parcours d'entrepreneurs dans mon secteur dont je pourrais m'inspirer." },
            { label: "Stratégies gagnantes", prompt: "Quelles stratégies de croissance seraient les plus pertinentes pour mon activité actuelle ?" },
            { label: "Outils & méthodes", prompt: "Quels outils ou méthodes pourraient m'aider à avancer plus vite sur ma vision ?" },
          ].map((r) => (
            <button key={r.label}
              onClick={() => window.dispatchEvent(new CustomEvent("zayado:open-cockpit-chat", { detail: { ask: r.prompt } }))}
              data-testid={`inspiration-${r.label}`}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-left text-sm font-medium text-white/85 transition-colors hover:border-[#D4AF37]/50 hover:bg-white/[0.07]">
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <AlignmentCelebration score={dash?.vision?.alignment_percent ?? dash?.alignment_score ?? 0} />
      {dash && <KeyInsights data={dash} />}
      {dash && <QuoteBar data={dash} />}
    </div>
  );
}
