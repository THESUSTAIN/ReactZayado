import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Activity,
  ArrowRight,
  BatteryLow,
  Check,
  Lightbulb,
  ListChecks,
  Radar as RadarIcon,
  Zap,
} from "lucide-react";
import { GlassCard, MonoTag, PageHeader, StatTile } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { useCockpit } from "@/lib/store";
import { todayKey } from "@/lib/seed";
import { cn } from "@/lib/utils";

const MODES = [
  { label: "Focus maximal", icon: Zap },
  { label: "Rythme de croisière", icon: Activity },
  { label: "Mode récupération", icon: BatteryLow },
];

const energyRank: Record<string, number> = { Haut: 3, Moyen: 2, Faible: 1 };

export default function Aujourdhui() {
  const { state, patch } = useCockpit();
  const today = todayKey();
  const savedToday = state.energy.find((e) => e.date === today);
  const [level, setLevel] = useState(savedToday?.level ?? 6);
  const [mode, setMode] = useState(savedToday?.mode ?? MODES[0].label);

  const todayActions = state.actions.filter((a) => a.bucket === "today");
  const priority =
    [...todayActions]
      .filter((a) => !a.done)
      .sort((a, b) => (energyRank[b.energy] ?? 0) - (energyRank[a.energy] ?? 0))[0] ?? null;

  const radarHandled = state.radar.opportunities.filter((o) => state.radar.handledIds.includes(o.id)).length;
  const scansLeft = 5 - state.radar.scansUsed;

  const saveCheckIn = () => {
    const rest = state.energy.filter((e) => e.date !== today);
    patch({ energy: [...rest, { date: today, level, mode }].slice(-30) });
    toast.success(`Check-in enregistré — ${mode}, niveau ${level}/10`);
  };

  const validatePriority = () => {
    if (!priority) return;
    patch({ actions: state.actions.map((a) => (a.id === priority.id ? { ...a, done: true } : a)) });
    toast.success("Priorité n°1 validée — excellente exécution");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Module 01"
        title="Aujourd'hui"
        description="Votre priorité n°1 et votre niveau d'énergie du jour. Le cockpit ajuste le reste en fonction."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Priority hero card */}
        <GlassCard
          data-testid="card-priorite"
          className="border border-[#1E3A8A] bg-[#0F172A] p-6 lg:col-span-2"
        >
          <div className="flex h-full flex-col justify-between gap-6">
            <div className="space-y-3">
              <MonoTag className="border-blue-500/40 bg-blue-500/10 text-blue-300">
                Priorité n°1 — aujourd'hui
              </MonoTag>
              {priority ? (
                <>
                  <h2 className="font-heading text-xl font-semibold text-white sm:text-2xl">{priority.title}</h2>
                  <div className="flex flex-wrap gap-2">
                    <MonoTag>{priority.project}</MonoTag>
                    <MonoTag>Temps : {priority.minutes} min</MonoTag>
                    <MonoTag>Énergie : {priority.energy}</MonoTag>
                    <MonoTag className="border-sky-400/40 bg-sky-400/10 text-sky-300">
                      Objectif : {state.vision.objectives[0]?.label ?? "Vision"}
                    </MonoTag>
                  </div>
                </>
              ) : (
                <div>
                  <h2 className="font-heading text-xl font-semibold text-white sm:text-2xl">
                    Toutes vos priorités du jour sont traitées
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Bravo. Consultez le Radar pour lancer une action de prospection en plus.
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {priority ? (
                <Button
                  data-testid="btn-valider-priorite"
                  onClick={validatePriority}
                  className="bg-blue-800 text-white hover:bg-blue-700"
                >
                  <Check className="h-4 w-4" />
                  Valider cette priorité
                </Button>
              ) : (
                <Link to="/radar">
                  <Button variant="outline" data-testid="btn-aller-radar" className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200">
                    Ouvrir le Radar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <Link
                to="/actions"
                data-testid="link-actions-du-jour"
                className="text-xs text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
              >
                {todayActions.filter((a) => a.done).length}/{todayActions.length} actions du jour traitées
              </Link>
            </div>
          </div>
        </GlassCard>

        {/* Energy check-in */}
        <GlassCard className="p-6" data-testid="card-checkin-energie">
          <div className="flex h-full flex-col gap-5">
            <div className="space-y-1">
              <MonoTag>Check-in énergie</MonoTag>
              <h2 className="font-heading text-lg font-medium text-slate-100">Quel est votre niveau aujourd'hui ?</h2>
            </div>
            <div className="text-center">
              <span className="font-heading text-5xl font-semibold text-sky-400" data-testid="display-niveau-energie">
                {level}
              </span>
              <span className="font-mono text-sm text-slate-500">/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              data-testid="slider-energie"
              aria-label="Niveau d'énergie du jour"
              className="w-full accent-sky-400"
            />
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => setMode(m.label)}
                  data-testid={`btn-mode-${m.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] leading-tight transition-colors",
                    mode === m.label
                      ? "border-blue-500/60 bg-blue-950/50 text-blue-200"
                      : "border-white/5 bg-slate-800/40 text-slate-400 hover:border-slate-600/60 hover:text-slate-200",
                  )}
                >
                  <m.icon className="h-4 w-4" />
                  {m.label}
                </button>
              ))}
            </div>
            <Button
              onClick={saveCheckIn}
              data-testid="btn-enregistrer-checkin"
              className="w-full bg-blue-800 text-white hover:bg-blue-700"
            >
              Enregistrer mon check-in
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* Daily overview */}
      <div>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Vue du jour</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile
            icon={ListChecks}
            label="Actions du jour"
            value={`${todayActions.filter((a) => a.done).length}/${todayActions.length} traitées`}
            sub={`${todayActions.reduce((sum, a) => sum + (a.done ? 0 : a.minutes), 0)} min restantes`}
            testid="tile-actions-jour"
          />
          <StatTile
            icon={RadarIcon}
            label="Radar prospection"
            value={`${radarHandled}/3 exploitées`}
            sub={`${scansLeft} scan${scansLeft > 1 ? "s" : ""} restant${scansLeft > 1 ? "s" : ""} aujourd'hui`}
            testid="tile-radar-jour"
          />
          <StatTile
            icon={Lightbulb}
            label="Boîte à idées"
            value={`${state.ideas.length} capturées`}
            sub="Aucune bonne idée ne s'envole"
            testid="tile-idees-jour"
          />
        </div>
      </div>
    </div>
  );
}
