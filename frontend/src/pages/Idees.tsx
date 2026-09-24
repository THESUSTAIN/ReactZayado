import { useState } from "react";
import { toast } from "sonner";
import { Lightbulb, Plus, Sparkles, Trash2 } from "lucide-react";
import { GlassCard, MonoTag, PageHeader } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCockpit } from "@/lib/store";
import { refineIdea } from "@/lib/seed";
import type { Idea, IdeaCategory } from "@/lib/types";

const CATEGORIES: IdeaCategory[] = ["Offre", "Marketing / Contenu", "Optimisation interne", "À creuser plus tard"];

const catSlug = (c: string): string => c.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

export default function Idees() {
  const { state, patch } = useCockpit();
  const [text, setText] = useState("");
  const [category, setCategory] = useState<IdeaCategory>(CATEGORIES[0]);
  const [refiningId, setRefiningId] = useState<string | null>(null);

  const capture = () => {
    const t = text.trim();
    if (!t) {
      toast.error("Écrivez au moins un mot — les idées volent vite");
      return;
    }
    const idea: Idea = {
      id: `i-${Date.now()}`,
      text: t,
      category,
      refined: null,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    patch({ ideas: [idea, ...state.ideas] });
    setText("");
    toast.success("Idée capturée avant qu'elle ne s'envole");
  };

  const refine = (idea: Idea) => {
    setRefiningId(idea.id);
    window.setTimeout(() => {
      patch({
        ideas: state.ideas.map((i) => (i.id === idea.id ? { ...i, refined: refineIdea(i.text, i.category) } : i)),
      });
      setRefiningId(null);
      toast.success("Idée structurée par l'IA (simulation)");
    }, 800);
  };

  const remove = (id: string) => {
    patch({ ideas: state.ideas.filter((i) => i.id !== id) });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Module 06"
        title="Boîte à Idées"
        description="Capture rapide, maturation lente. Une idée notée vaut dix idées brillantes oubliées."
      />

      <GlassCard className="p-4" data-testid="card-capture-idee">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") capture();
            }}
            placeholder="Capturer une idée avant qu'elle ne s'envole…"
            data-testid="input-capture-idee"
            className="flex-1 border-white/10 bg-slate-900/60"
          />
          <Select value={category} onValueChange={(v: string) => setCategory(v as IdeaCategory)}>
            <SelectTrigger data-testid="select-categorie-idee" className="border-white/10 bg-slate-900/60 sm:w-56">
              <SelectValue>{category}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={capture} data-testid="btn-capturer-idee" className="bg-blue-800 text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Capturer
          </Button>
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {CATEGORIES.map((cat) => {
          const items = state.ideas.filter((i) => i.category === cat);
          return (
            <div key={cat} className="space-y-3" data-testid={`colonne-idees-${catSlug(cat)}`}>
              <div className="flex items-center justify-between px-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">{cat}</p>
                <span className="font-mono text-[10px] text-slate-600">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <GlassCard className="p-4 text-center">
                  <p className="text-xs text-slate-600">Vide — pour l'instant</p>
                </GlassCard>
              ) : (
                items.map((idea) => {
                  const index = state.ideas.indexOf(idea) + 1;
                  return (
                    <GlassCard
                      key={idea.id}
                      data-testid={`card-idee-${index}`}
                      className="space-y-3 p-4 transition-transform duration-200 hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm leading-relaxed text-slate-200">{idea.text}</p>
                        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
                      </div>
                      {idea.refined ? (
                        <div
                          className="rounded-lg border border-blue-500/25 bg-blue-950/40 p-3 text-xs leading-relaxed whitespace-pre-wrap text-blue-100"
                          data-testid={`idee-affinee-${index}`}
                        >
                          <span className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-sky-400">
                            <Sparkles className="h-3 w-3" />
                            Structurée par l'IA
                          </span>
                          {idea.refined}
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between gap-2">
                        <MonoTag>{idea.createdAt}</MonoTag>
                        <div className="flex gap-1">
                          {!idea.refined ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => refine(idea)}
                              disabled={refiningId === idea.id}
                              data-testid={`btn-affiner-idee-${index}`}
                              className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              {refiningId === idea.id ? "L'IA réfléchit…" : "Affiner avec l'IA"}
                            </Button>
                          ) : null}
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => remove(idea.id)}
                            data-testid={`btn-supprimer-idee-${index}`}
                            aria-label="Supprimer l'idée"
                            className="text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </GlassCard>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
