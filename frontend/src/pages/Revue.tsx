import { useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, Save, Sparkles, Trophy, Wrench } from "lucide-react";
import { GlassCard, MonoTag, PageHeader } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCockpit } from "@/lib/store";
import { buildWeeklySummary } from "@/lib/seed";

function mondayLabel(): string {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  return monday.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export default function Revue() {
  const { state, patch } = useCockpit();
  const [wins, setWins] = useState<string[]>([...state.review.wins, "", "", ""].slice(0, 3));
  const [blockers, setBlockers] = useState(state.review.blockers);
  const [learnings, setLearnings] = useState(state.review.learnings);
  const [nextPriority, setNextPriority] = useState(state.review.nextPriority);
  const [generating, setGenerating] = useState(false);

  const save = () => {
    patch({ review: { ...state.review, wins: wins.map((w) => w.trim()).filter(Boolean), blockers, learnings, nextPriority } });
    toast.success("Revue hebdo enregistrée");
  };

  const generateSummary = () => {
    setGenerating(true);
    const todayActions = state.actions.filter((a) => a.bucket === "today");
    window.setTimeout(() => {
      const summary = buildWeeklySummary({
        actionsDone: todayActions.filter((a) => a.done).length,
        actionsTotal: todayActions.length,
        radarHandled: state.radar.handledIds.length,
        ideasCount: state.ideas.length,
        nextPriority: nextPriority.trim(),
      });
      patch({ review: { ...state.review, summary } });
      setGenerating(false);
      toast.success("Synthèse générée — générée localement, rien n'est envoyé");
    }, 900);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Module 09"
        title="Revue Hebdo"
        description="Quinze minutes le vendredi : ce qui a marché, ce qui a bloqué, et la priorité de la semaine prochaine."
      >
        <MonoTag className="border-blue-500/40 bg-blue-500/10 text-blue-300">
          <CalendarCheck className="h-3 w-3" />
          Semaine du {mondayLabel()}
        </MonoTag>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Wins */}
        <GlassCard className="p-6" data-testid="card-victoires">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <MonoTag>Trois victoires de la semaine</MonoTag>
          </div>
          <div className="mt-4 space-y-3">
            {wins.map((w, i) => (
              <div key={i} className="space-y-1.5">
                <Label className="text-xs text-slate-400">Victoire {i + 1}</Label>
                <Input
                  value={w}
                  onChange={(e) => setWins(wins.map((v, vi) => (vi === i ? e.target.value : v)))}
                  placeholder={i === 0 ? "Ex : un client signé" : "Ex : une habitude tenue"}
                  data-testid={`input-victoire-${i + 1}`}
                  className="border-white/10 bg-slate-900/60"
                />
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Blockers + learnings */}
        <GlassCard className="p-6" data-testid="card-blocages">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-sky-400" />
            <MonoTag>Blocages & apprentissages</MonoTag>
          </div>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="revue-blocages" className="text-xs text-slate-400">
                Ce qui a bloqué
              </Label>
              <Textarea
                id="revue-blocages"
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                rows={3}
                data-testid="input-revue-blocages"
                className="resize-none border-white/10 bg-slate-900/60 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="revue-apprentissages" className="text-xs text-slate-400">
                Ce que j'en apprends
              </Label>
              <Textarea
                id="revue-apprentissages"
                value={learnings}
                onChange={(e) => setLearnings(e.target.value)}
                rows={3}
                data-testid="input-revue-apprentissages"
                className="resize-none border-white/10 bg-slate-900/60 text-sm"
              />
            </div>
          </div>
        </GlassCard>

        {/* Next focus + save */}
        <GlassCard className="border border-[#1E3A8A] bg-[#0F172A] p-6" data-testid="card-priorite-prochaine">
          <MonoTag className="border-blue-500/40 bg-blue-500/10 text-blue-300">Priorité de la semaine prochaine</MonoTag>
          <Input
            value={nextPriority}
            onChange={(e) => setNextPriority(e.target.value)}
            placeholder="Une seule priorité, la plus grande"
            data-testid="input-priorite-prochaine"
            className="mt-4 border-white/10 bg-slate-900/60"
          />
          <Button onClick={save} data-testid="btn-sauvegarder-revue" className="mt-4 w-full bg-blue-800 text-white hover:bg-blue-700">
            <Save className="h-4 w-4" />
            Enregistrer ma revue
          </Button>
          <Button
            onClick={generateSummary}
            disabled={generating}
            variant="outline"
            data-testid="btn-synthese-ia"
            className="mt-2 w-full border-blue-500/40 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? "L'IA relit votre semaine…" : "Générer la synthèse IA"}
          </Button>
        </GlassCard>
      </div>

      {state.review.summary ? (
        <GlassCard className="border border-blue-500/25 p-6" data-testid="card-synthese">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">Synthèse IA — simulation locale</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-200" data-testid="texte-synthese">
                {state.review.summary}
              </p>
            </div>
          </div>
        </GlassCard>
      ) : null}
    </div>
  );
}
