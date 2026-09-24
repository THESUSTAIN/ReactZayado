import { useState } from "react";
import { toast } from "sonner";
import { Bot, RotateCcw, Save, Send, UserRound } from "lucide-react";
import { GlassCard, MonoTag, PageHeader } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCockpit } from "@/lib/store";
import { AGENT_TONES, PROSPECT_PRESETS, agentReply } from "@/lib/seed";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

let seq = 0;
const nextId = (): string => `m${Date.now()}-${seq++}`;

export default function Agent() {
  const { state, patch } = useCockpit();
  const [cfg, setCfg] = useState(state.agentConfig);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);

  const setChat = (messages: ChatMessage[]) => patch({ agentChat: messages.slice(-40) });

  const pushMessage = (role: ChatMessage["role"], text: string) => {
    setChat([...state.agentChat, { id: nextId(), role, text }]);
  };

  const saveConfig = () => {
    patch({ agentConfig: cfg });
    toast.success("Configuration de l'agent enregistrée");
  };

  const send = (text: string) => {
    const t = text.trim();
    if (!t || typing) return;
    pushMessage("prospect", t);
    setDraft("");
    setTyping(true);
    window.setTimeout(() => {
      pushMessage("agent", agentReply(state.agentConfig, t));
      setTyping(false);
    }, 750);
  };

  const handoff = () => {
    pushMessage(
      "system",
      "Reprise en main : l'agent a transmis la conversation à Camille avec le moyen de contact du visiteur. Rien n'a été envoyé — c'est une simulation locale.",
    );
    toast.info("Liaison humaine simulée — vous reprenez la main");
  };

  const resetChat = () => {
    setChat([
      {
        id: nextId(),
        role: "system",
        text: "Simulation locale — l'agent ne contacte personne. Testez-le comme un vrai visiteur.",
      },
      { id: nextId(), role: "agent", text: state.agentConfig.welcome },
    ]);
    toast.success("Conversation de test réinitialisée");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Module 04 — Offre Pro"
        title="Agent Business"
        description="Un assistant de marque qui répond à vos clients quand vous êtes occupé. Il ne dit que ce que vous lui avez appris."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Configuration */}
        <GlassCard className="p-6" data-testid="card-agent-config">
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-sky-400" />
              <MonoTag className="border-blue-500/40 bg-blue-500/10 text-blue-300">Configuration</MonoTag>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="agent-name" className="text-slate-300">
                  Nom de l'agent
                </Label>
                <Input
                  id="agent-name"
                  value={cfg.name}
                  onChange={(e) => setCfg({ ...cfg, name: e.target.value })}
                  data-testid="input-agent-nom"
                  className="border-white/10 bg-slate-900/60"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Ton de voix</Label>
                <Select
                  value={cfg.tone}
                  onValueChange={(v: string) => setCfg({ ...cfg, tone: v })}
                >
                  <SelectTrigger data-testid="select-agent-ton" className="w-full border-white/10 bg-slate-900/60">
                    <SelectValue>{cfg.tone}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_TONES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-welcome" className="text-slate-300">
                Message d'accueil
              </Label>
              <Textarea
                id="agent-welcome"
                value={cfg.welcome}
                onChange={(e) => setCfg({ ...cfg, welcome: e.target.value })}
                rows={2}
                data-testid="input-agent-accueil"
                className="resize-none border-white/10 bg-slate-900/60"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-offers" className="text-slate-300">
                Base de connaissances — offres & tarifs
              </Label>
              <Textarea
                id="agent-offers"
                value={cfg.offers}
                onChange={(e) => setCfg({ ...cfg, offers: e.target.value })}
                rows={4}
                data-testid="input-agent-offres"
                className="resize-none border-white/10 bg-slate-900/60 text-sm"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="agent-faq" className="text-slate-300">
                  FAQ & conditions
                </Label>
                <Textarea
                  id="agent-faq"
                  value={cfg.faq}
                  onChange={(e) => setCfg({ ...cfg, faq: e.target.value })}
                  rows={3}
                  data-testid="input-agent-faq"
                  className="resize-none border-white/10 bg-slate-900/60 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-hours" className="text-slate-300">
                  Horaires & disponibilités
                </Label>
                <Textarea
                  id="agent-hours"
                  value={cfg.hours}
                  onChange={(e) => setCfg({ ...cfg, hours: e.target.value })}
                  rows={3}
                  data-testid="input-agent-horaires"
                  className="resize-none border-white/10 bg-slate-900/60 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <MonoTag>Règles infranchissables</MonoTag>
              <div className="space-y-2" data-testid="liste-regles-agent">
                {cfg.rules.map((rule, i) => (
                  <label
                    key={rule.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/5 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-300 transition-colors hover:border-slate-600/60"
                  >
                    <Checkbox
                      checked={rule.active}
                      onCheckedChange={(v: boolean) =>
                        setCfg({
                          ...cfg,
                          rules: cfg.rules.map((r, ri) => (ri === i ? { ...r, active: v } : r)),
                        })
                      }
                      data-testid={`checkbox-regle-${i}`}
                      className="mt-0.5"
                    />
                    <span>{rule.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              onClick={saveConfig}
              data-testid="btn-sauvegarder-agent"
              className="w-full bg-blue-800 text-white hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              Sauvegarder la configuration
            </Button>
          </div>
        </GlassCard>

        {/* Chat simulator */}
        <GlassCard className="flex flex-col p-6" data-testid="card-agent-chat">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-sky-400" />
              <MonoTag className="border-emerald-400/40 bg-emerald-400/10 text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Actif — simulation
              </MonoTag>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={resetChat}
                data-testid="btn-reset-chat"
                aria-label="Réinitialiser la conversation"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handoff}
                data-testid="btn-handoff"
                className="border-amber-400/40 text-amber-300 hover:bg-amber-400/10 hover:text-amber-200"
              >
                <UserRound className="h-4 w-4" />
                Handoff humain
              </Button>
            </div>
          </div>

          <div className="mt-4 flex h-96 flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/50 p-4" data-testid="zone-chat">
            {state.agentChat.map((m) => (
              <div
                key={m.id}
                data-testid={`message-${m.role}`}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  m.role === "prospect" && "self-end rounded-br-sm bg-blue-800 text-white",
                  m.role === "agent" && "self-start rounded-bl-sm border border-white/5 bg-slate-800/80 text-slate-200",
                  m.role === "system" &&
                    "self-center rounded-lg border border-amber-400/30 bg-amber-950/40 px-3 py-1.5 text-center text-xs text-amber-200",
                )}
              >
                {m.text}
              </div>
            ))}
            {typing ? (
              <div className="self-start rounded-2xl rounded-bl-sm border border-white/5 bg-slate-800/80 px-4 py-2.5" data-testid="typing-indicateur">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400 [animation-delay:300ms]" />
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2" data-testid="suggestions-prospect">
            {PROSPECT_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => send(p)}
                data-testid={`btn-prospect-preset-${PROSPECT_PRESETS.indexOf(p)}`}
                className="rounded-full border border-white/10 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-blue-500/50 hover:text-blue-200"
              >
                {p.length > 44 ? `${p.slice(0, 44)}…` : p}
              </button>
            ))}
          </div>

          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Écrivez comme un visiteur de votre site…"
              data-testid="input-chat-prospect"
              className="border-white/10 bg-slate-900/60"
            />
            <Button
              type="submit"
              size="icon"
              data-testid="btn-envoyer-chat"
              aria-label="Envoyer le message"
              className="shrink-0 bg-blue-800 text-white hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
