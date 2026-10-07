import { useState } from "react";
import { toast } from "sonner";
import { Compass, Plus, Save, X } from "lucide-react";
import { GlassCard, MonoTag, PageHeader, Progress } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCockpit } from "@/lib/store";

export default function Vision() {
  const { state, patch } = useCockpit();
  const { vision } = state;
  const [mission, setMission] = useState(vision.mission);
  const [newAntiGoal, setNewAntiGoal] = useState("");

  const saveMission = () => {
    patch({ vision: { ...vision, mission } });
    toast.success("Vision enregistrée — le Radar s'aligne automatiquement");
  };

  const setProgress = (id: string, progress: number) => {
    patch({
      vision: {
        ...vision,
        objectives: vision.objectives.map((o) => (o.id === id ? { ...o, progress } : o)),
      },
    });
  };

  const addAntiGoal = () => {
    const t = newAntiGoal.trim();
    if (!t) return;
    patch({ vision: { ...vision, antiGoals: [...vision.antiGoals, t] } });
    setNewAntiGoal("");
    toast.success("Élément ajouté à vos refus");
  };

  const removeAntiGoal = (index: number) => {
    patch({ vision: { ...vision, antiGoals: vision.antiGoals.filter((_, i) => i !== index) } });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Module 02"
        title="Vision"
        description="Votre cap stratégique. Plus la vision est précise, plus les opportunités du Radar sont pertinentes."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* North star */}
        <GlassCard className="border border-[#1E3A8A] bg-[#0F172A] p-6 lg:col-span-3" data-testid="card-north-star">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-sky-400" />
            <MonoTag className="border-blue-500/40 bg-blue-500/10 text-blue-300">Étoile du Nord</MonoTag>
          </div>
          <Textarea
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            rows={3}
            data-testid="input-mission"
            className="mt-4 resize-none border-white/10 bg-slate-900/60 text-base leading-relaxed text-slate-100 focus-visible:ring-blue-500"
          />
          <p className="mt-3 text-xs text-slate-400">{vision.cap}</p>
          <Button
            onClick={saveMission}
            data-testid="btn-sauvegarder-vision"
            className="mt-4 bg-blue-800 text-white hover:bg-blue-700"
          >
            <Save className="h-4 w-4" />
            Sauvegarder ma vision
          </Button>
        </GlassCard>

        {/* Anti-goals */}
        <GlassCard className="p-6 lg:col-span-2" data-testid="card-anti-objectifs">
          <MonoTag>Ce que je refuse de faire</MonoTag>
          <ul className="mt-4 space-y-2" data-testid="liste-anti-objectifs">
            {vision.antiGoals.map((g, i) => (
              <li
                key={i}
                className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-300"
              >
                <span>{g}</span>
                <button
                  type="button"
                  onClick={() => removeAntiGoal(i)}
                  data-testid={`btn-retirer-anti-objectif-${i}`}
                  aria-label={`Retirer : ${g}`}
                  className="text-slate-500 transition-colors hover:text-red-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Input
              value={newAntiGoal}
              onChange={(e) => setNewAntiGoal(e.target.value)}
              placeholder="Un refus à graver…"
              data-testid="input-nouveau-anti-objectif"
              className="border-white/10 bg-slate-900/60"
              onKeyDown={(e) => {
                if (e.key === "Enter") addAntiGoal();
              }}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={addAntiGoal}
              data-testid="btn-ajouter-anti-objectif"
              aria-label="Ajouter le refus"
              className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* Quarterly pillars */}
      <div>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          Trois piliers du trimestre
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {vision.objectives.map((o) => (
            <GlassCard key={o.id} className="p-6" data-testid={`card-objectif-${o.id}`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-base font-medium text-slate-100">{o.label}</h3>
                  <span className="font-mono text-sm font-medium text-sky-400" data-testid={`progress-objectif-${o.id}`}>
                    {o.progress}%
                  </span>
                </div>
                <Progress value={o.progress} testid={`barre-objectif-${o.id}`} />
                <p className="min-h-10 text-xs leading-relaxed text-slate-400">{o.detail}</p>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={o.progress}
                  onChange={(e) => setProgress(o.id, Number(e.target.value))}
                  data-testid={`slider-objectif-${o.id}`}
                  aria-label={`Avancement : ${o.label}`}
                  className="w-full accent-sky-400"
                />
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
