import { useState } from "react";
import { toast } from "sonner";
import { Copy, Download, FileText, Sparkles } from "lucide-react";
import { GlassCard, MonoTag, PageHeader } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCockpit } from "@/lib/store";
import { DOC_TYPES, generateDoc } from "@/lib/seed";
import { cn } from "@/lib/utils";
import type { DocTypeId, GeneratedDoc } from "@/lib/types";

export default function Copilote() {
  const { state, patch } = useCockpit();
  const [type, setType] = useState<DocTypeId>("brief");
  const [target, setTarget] = useState("");
  const [goal, setGoal] = useState("");
  const [constraints, setConstraints] = useState("");
  const [generating, setGenerating] = useState(false);
  const [current, setCurrent] = useState<GeneratedDoc | null>(null);

  const generate = () => {
    if (generating) return;
    setGenerating(true);
    window.setTimeout(() => {
      const doc: GeneratedDoc = {
        id: `d-${Date.now()}`,
        type,
        target: target.trim(),
        goal: goal.trim(),
        constraints: constraints.trim(),
        content: generateDoc(type, target, goal, constraints),
        createdAt: new Date().toISOString(),
      };
      patch({ docs: [doc, ...state.docs].slice(0, 20) });
      setCurrent(doc);
      setGenerating(false);
      toast.success("Document généré — relisez-le avant tout envoi");
    }, 1200);
  };

  const copyDoc = () => {
    if (!current) return;
    navigator.clipboard
      .writeText(current.content)
      .then(() => toast.success("Document copié dans le presse-papiers"))
      .catch(() => toast.error("Copie impossible dans ce navigateur"));
  };

  const downloadDoc = () => {
    if (!current) return;
    const label = DOC_TYPES.find((d) => d.id === current.type)?.label ?? "document";
    const blob = new Blob([current.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${current.createdAt.slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Téléchargement lancé");
  };

  const typeLabel = (id: DocTypeId): string => DOC_TYPES.find((d) => d.id === id)?.label ?? id;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Module 07"
        title="Copilote IA"
        description="Qui vous aide à rédiger, clarifier et décider. Des documents structurés, prêts à être relus par vous."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form */}
        <GlassCard className="space-y-5 p-6 lg:col-span-2" data-testid="card-copilote-form">
          <MonoTag className="border-blue-500/40 bg-blue-500/10 text-blue-300">Nouveau document</MonoTag>

          <div className="grid grid-cols-2 gap-2" data-testid="liste-types-doc">
            {DOC_TYPES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setType(d.id)}
                data-testid={`btn-type-doc-${d.id}`}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors",
                  type === d.id
                    ? "border-blue-500/60 bg-blue-950/50 text-blue-100"
                    : "border-white/5 bg-slate-900/50 text-slate-400 hover:border-slate-600/60 hover:text-slate-200",
                )}
              >
                <span className="block text-sm font-medium">{d.label}</span>
                <span className="mt-1 block text-[11px] leading-snug opacity-80">{d.desc}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="doc-target" className="text-slate-300">
                Cible
              </Label>
              <Input
                id="doc-target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Ex : les PME de la métropole nantaise"
                data-testid="input-doc-cible"
                className="border-white/10 bg-slate-900/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-goal" className="text-slate-300">
                Objectif
              </Label>
              <Input
                id="doc-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Ex : signer 2 clients récurrents"
                data-testid="input-doc-objectif"
                className="border-white/10 bg-slate-900/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-constraints" className="text-slate-300">
                Contraintes
              </Label>
              <Textarea
                id="doc-constraints"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                rows={3}
                placeholder="Ex : pas d'appels le mercredi, budget limité"
                data-testid="input-doc-contraintes"
                className="resize-none border-white/10 bg-slate-900/60 text-sm"
              />
            </div>
          </div>

          <Button
            onClick={generate}
            disabled={generating}
            data-testid="btn-generer-doc"
            className="w-full bg-blue-800 text-white hover:bg-blue-700"
          >
            <Sparkles className={cn("h-4 w-4", generating && "animate-pulse")} />
            {generating ? "Le Copilote rédige…" : "Générer le document"}
          </Button>

          {state.docs.length > 0 ? (
            <div className="space-y-2">
              <MonoTag>Historique</MonoTag>
              <div className="space-y-1.5" data-testid="liste-historique-docs">
                {state.docs.slice(0, 6).map((d, i) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setCurrent(d)}
                    data-testid={`btn-doc-historique-${i}`}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                      current?.id === d.id
                        ? "border-blue-500/50 bg-blue-950/40 text-blue-200"
                        : "border-white/5 bg-slate-900/50 text-slate-400 hover:text-slate-200",
                    )}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{typeLabel(d.type)}</span>
                    <span className="font-mono text-[10px]">{d.createdAt.slice(0, 10)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </GlassCard>

        {/* Viewer */}
        <GlassCard className="flex flex-col p-6 lg:col-span-3" data-testid="card-copilote-doc">
          {current ? (
            <div className="flex h-full flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MonoTag className="border-blue-500/40 bg-blue-500/10 text-blue-300">
                    {typeLabel(current.type)}
                  </MonoTag>
                  <MonoTag>{current.createdAt.slice(0, 10)}</MonoTag>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={copyDoc} data-testid="btn-copier-doc" className="border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white">
                    <Copy className="h-4 w-4" />
                    Copier
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadDoc} data-testid="btn-telecharger-doc" className="border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white">
                    <Download className="h-4 w-4" />
                    Télécharger
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/50 p-5" data-testid="contenu-doc">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{current.content}</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 text-center">
              <Sparkles className="h-8 w-8 text-slate-600" />
              <p className="max-w-xs text-sm text-slate-400">
                Choisissez un type de document, donnez vos paramètres, et le Copilote prépare un projet
                que vous validez.
              </p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
