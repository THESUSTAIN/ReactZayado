import { useState } from "react";
import { toast } from "sonner";
import { Clock, Plus, Trash2 } from "lucide-react";
import { GlassCard, MonoTag, PageHeader, energyChipClass } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCockpit } from "@/lib/store";
import type { ActionBucket, ActionItem, EnergyLevel } from "@/lib/types";

const BUCKETS: { id: ActionBucket; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "week", label: "Cette semaine" },
  { id: "delegue", label: "Délégué / En attente" },
];

const ENERGIES: EnergyLevel[] = ["Faible", "Moyen", "Haut"];

export default function Actions() {
  const { state, patch } = useCockpit();
  const [bucket, setBucket] = useState<ActionBucket>("today");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [minutes, setMinutes] = useState("25");
  const [energy, setEnergy] = useState<EnergyLevel>("Moyen");
  const [newBucket, setNewBucket] = useState<ActionBucket>("today");

  const filtered = state.actions.filter((a) => a.bucket === bucket);
  const todayItems = state.actions.filter((a) => a.bucket === "today");
  const remainingToday = todayItems.filter((a) => !a.done).reduce((s, a) => s + a.minutes, 0);

  const count = (b: ActionBucket) => state.actions.filter((a) => a.bucket === b && !a.done).length;

  const toggle = (id: string, done: boolean) => {
    patch({ actions: state.actions.map((a) => (a.id === id ? { ...a, done } : a)) });
  };

  const remove = (id: string) => {
    patch({ actions: state.actions.filter((a) => a.id !== id) });
    toast.success("Action supprimée");
  };

  const addAction = () => {
    const t = title.trim();
    if (!t) {
      toast.error("Donnez un titre à l'action");
      return;
    }
    const item: ActionItem = {
      id: `a-${Date.now()}`,
      title: t,
      project: project.trim() || "Interne",
      minutes: Math.max(5, Number(minutes) || 25),
      energy,
      bucket: newBucket,
      done: false,
    };
    patch({ actions: [...state.actions, item] });
    setOpen(false);
    setTitle("");
    setProject("");
    setMinutes("25");
    setEnergy("Moyen");
    toast.success("Action ajoutée à votre plan du jour");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Module 05"
        title="Actions"
        description="Ce qui doit être fait, et combien de temps ça va prendre. Rien de plus."
      >
        <MonoTag data-testid="tag-temps-restant">Reste aujourd'hui : {remainingToday} min</MonoTag>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button data-testid="btn-ajouter-action" className="bg-blue-800 text-white hover:bg-blue-700" />}>
            <Plus className="h-4 w-4" />
            Nouvelle action
          </DialogTrigger>
          <DialogContent className="border-white/10 bg-[#0F172A] sm:max-w-md" data-testid="dialog-nouvelle-action">
            <DialogHeader>
              <DialogTitle className="font-heading text-white">Nouvelle action</DialogTitle>
              <DialogDescription className="text-slate-400">
                Estimez le temps et l'énergie requis — le cockpit préserve votre rythme.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="action-title" className="text-slate-300">
                  Titre
                </Label>
                <Input
                  id="action-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Relancer le devis Comptoir Sud"
                  data-testid="input-action-titre"
                  className="border-white/10 bg-slate-900/60"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="action-project" className="text-slate-300">
                    Projet
                  </Label>
                  <Input
                    id="action-project"
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    placeholder="Interne"
                    data-testid="input-action-projet"
                    className="border-white/10 bg-slate-900/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="action-minutes" className="text-slate-300">
                    Temps estimé (min)
                  </Label>
                  <Input
                    id="action-minutes"
                    type="number"
                    min={5}
                    step={5}
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    data-testid="input-action-minutes"
                    className="border-white/10 bg-slate-900/60"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Énergie requise</Label>
                  <Select value={energy} onValueChange={(v: string) => setEnergy(v as EnergyLevel)}>
                    <SelectTrigger data-testid="select-action-energie" className="border-white/10 bg-slate-900/60">
                      <SelectValue>{energy}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ENERGIES.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Horizon</Label>
                  <Select value={newBucket} onValueChange={(v: string) => setNewBucket(v as ActionBucket)}>
                    <SelectTrigger data-testid="select-action-horizon" className="border-white/10 bg-slate-900/60">
                      <SelectValue>{BUCKETS.find((b) => b.id === newBucket)?.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {BUCKETS.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} data-testid="btn-annuler-action">
                Annuler
              </Button>
              <Button onClick={addAction} data-testid="btn-confirmer-action" className="bg-blue-800 text-white hover:bg-blue-700">
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Tabs value={bucket} onValueChange={(v: string) => setBucket(v as ActionBucket)}>
        <TabsList data-testid="tabs-actions">
          {BUCKETS.map((b) => (
            <TabsTrigger key={b.id} value={b.id} data-testid={`tab-actions-${b.id}`}>
              {b.label} ({count(b.id)})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-3" data-testid="liste-actions">
        {filtered.length === 0 ? (
          <GlassCard className="p-10 text-center">
            <p className="text-sm text-slate-400">Rien dans cette vue — respirez, c'est voulu.</p>
          </GlassCard>
        ) : (
          filtered.map((a) => {
            const index = state.actions.indexOf(a) + 1;
            return (
              <GlassCard
                key={a.id}
                data-testid={`card-action-${index}`}
                className="flex items-center gap-4 p-4 transition-transform duration-200 hover:-translate-y-0.5"
              >
                <Checkbox
                  checked={a.done}
                  onCheckedChange={(v: boolean) => toggle(a.id, v)}
                  data-testid={`checkbox-action-${index}`}
                  aria-label={a.done ? `Rouvrir : ${a.title}` : `Terminer : ${a.title}`}
                />
                <div className="min-w-0 flex-1">
                  <p className={a.done ? "text-sm text-slate-500 line-through" : "text-sm font-medium text-slate-100"}>
                    {a.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <MonoTag>{a.project}</MonoTag>
                    <MonoTag>
                      <Clock className="h-3 w-3" />
                      {a.minutes} min
                    </MonoTag>
                    <MonoTag className={energyChipClass(a.energy)}>Énergie : {a.energy}</MonoTag>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(a.id)}
                  data-testid={`btn-supprimer-action-${index}`}
                  aria-label={`Supprimer : ${a.title}`}
                  className="shrink-0 text-slate-500 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
}
