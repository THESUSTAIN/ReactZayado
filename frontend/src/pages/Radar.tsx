import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Linkedin, Mail, MessageCircle, Pencil, Phone, RefreshCw, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GlassCard, MonoTag, PageHeader, MOTTO } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCockpit } from "@/lib/store";
import { pickOpportunities, todayKey } from "@/lib/seed";
import { cn } from "@/lib/utils";
import type { Channel, RadarOpportunity } from "@/lib/types";

const CHANNEL_ICONS: Record<Channel, LucideIcon> = {
  Email: Mail,
  LinkedIn: Linkedin,
  Appel: Phone,
  WhatsApp: MessageCircle,
};

function scoreClass(score: number): string {
  if (score >= 90) return "border-sky-400/50 bg-sky-400/10 text-sky-300";
  if (score >= 75) return "border-blue-500/50 bg-blue-500/10 text-blue-300";
  return "border-slate-500/40 bg-slate-500/10 text-slate-300";
}

function ChannelChip({ channel }: { channel: Channel }) {
  const Icon = CHANNEL_ICONS[channel];
  return (
    <MonoTag>
      <Icon className="h-3 w-3" />
      Canal : {channel}
    </MonoTag>
  );
}

export default function Radar() {
  const { state, patch } = useCockpit();
  const { radar } = state;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [scanning, setScanning] = useState(false);

  const scansLeft = 5 - radar.scansUsed;

  const copyMessage = (opp: RadarOpportunity) => {
    navigator.clipboard
      .writeText(opp.message)
      .then(() => toast.success("Message copié — collez-le dans votre canal d'envoi"))
      .catch(() => toast.error("Copie impossible dans ce navigateur"));
  };

  const rescan = () => {
    if (scansLeft <= 0) {
      toast.error("Limite de 5 scans par jour atteinte — de nouvelles opportunités arrivent demain");
      return;
    }
    setScanning(true);
    const next = radar.scansUsed + 1;
    const day = todayKey();
    window.setTimeout(() => {
      patch({
        radar: { day, scansUsed: next, opportunities: pickOpportunities(day, next), handledIds: [] },
      });
      setScanning(false);
      toast.success("Re-scan terminé — 3 nouvelles opportunités proposées");
    }, 900);
  };

  const toggleHandled = (id: string) => {
    const handled = radar.handledIds.includes(id)
      ? radar.handledIds.filter((h) => h !== id)
      : [...radar.handledIds, id];
    patch({ radar: { ...radar, handledIds: handled } });
  };

  const startEdit = (opp: RadarOpportunity) => {
    setEditingId(opp.id);
    setDraft(opp.message);
  };

  const saveEdit = (id: string) => {
    patch({
      radar: {
        ...radar,
        opportunities: radar.opportunities.map((o) => (o.id === id ? { ...o, message: draft } : o)),
      },
    });
    setEditingId(null);
    toast.success("Message personnalisé — vous gardez la main");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Module 03"
        title="Radar Prospection"
        description="Trois opportunités concrètes sélectionnées chaque jour par l'IA, avec un message prêt à envoyer."
      >
        <MonoTag data-testid="tag-scans-restants" className="border-blue-500/40 bg-blue-500/10 text-blue-300">
          Scans : {radar.scansUsed}/5
        </MonoTag>
        <Button
          onClick={rescan}
          disabled={scanning}
          data-testid="btn-rescan-radar"
          className="bg-blue-800 text-white hover:bg-blue-700"
        >
          <RefreshCw className={cn("h-4 w-4", scanning && "animate-spin")} />
          {scanning ? "Scan en cours…" : "Lancer un re-scan IA"}
        </Button>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-3">
        {radar.opportunities.map((opp, index) => {
          const handled = radar.handledIds.includes(opp.id);
          return (
            <GlassCard
              key={opp.id}
              data-testid={`card-opportunite-${index + 1}`}
              className={cn(
                "flex flex-col gap-4 p-6 transition-transform duration-200 hover:-translate-y-0.5",
                handled && "opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  data-testid={`score-opportunite-${index + 1}`}
                  className={cn(
                    "rounded-full border px-3 py-1 font-mono text-xs font-semibold tracking-wider",
                    scoreClass(opp.score),
                  )}
                >
                  {opp.score}/100
                </span>
                {handled ? (
                  <MonoTag className="border-emerald-400/40 bg-emerald-400/10 text-emerald-300">Traité</MonoTag>
                ) : (
                  <MonoTag>Opportunité {index + 1}</MonoTag>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-heading text-lg font-medium leading-snug text-white">{opp.action}</h3>
                <div className="flex flex-wrap gap-2">
                  <ChannelChip channel={opp.channel} />
                  <MonoTag className="text-slate-400">Objectif : {opp.objective}</MonoTag>
                </div>
              </div>

              {editingId === opp.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={8}
                    data-testid={`textarea-personnaliser-${index + 1}`}
                    className="resize-none border-blue-500/30 bg-slate-900/70 text-sm leading-relaxed"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveEdit(opp.id)}
                      data-testid={`btn-enregistrer-message-${index + 1}`}
                      className="bg-blue-800 text-white hover:bg-blue-700"
                    >
                      <Check className="h-4 w-4" />
                      Enregistrer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      data-testid={`btn-annuler-message-${index + 1}`}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 rounded-xl border border-white/5 bg-slate-900/60 p-4">
                  <p
                    className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300"
                    data-testid={`message-opportunite-${index + 1}`}
                  >
                    {opp.message}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => copyMessage(opp)}
                  data-testid={`btn-copier-message-${index + 1}`}
                  className="bg-blue-800 text-white hover:bg-blue-700"
                >
                  <Copy className="h-4 w-4" />
                  Copier le message
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEdit(opp)}
                  data-testid={`btn-personnaliser-${index + 1}`}
                  className="border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <Pencil className="h-4 w-4" />
                  Personnaliser
                </Button>
                <Button
                  size="sm"
                  variant={handled ? "secondary" : "outline"}
                  onClick={() => toggleHandled(opp.id)}
                  data-testid={`btn-traiter-${index + 1}`}
                  className={
                    handled
                      ? "bg-emerald-400/10 text-emerald-300"
                      : "border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white"
                  }
                >
                  <Check className="h-4 w-4" />
                  {handled ? "Traité" : "Marquer comme traité"}
                </Button>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <GlassCard className="flex items-center gap-3 p-4" data-testid="bandeau-validation">
        <ShieldCheck className="h-5 w-5 shrink-0 text-sky-400" />
        <p className="text-sm text-slate-300">{MOTTO}</p>
      </GlassCard>
    </div>
  );
}
