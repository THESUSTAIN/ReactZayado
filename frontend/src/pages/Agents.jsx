import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import {
  Bot, MessageCircle, Send, Mail, Sparkles, Users, Briefcase, PenTool,
  Search, TrendingUp, Shield, ArrowRight, Loader2, QrCode, Unplug, Plus,
  RefreshCw, X, Check, Circle, CheckCircle2, Zap,
} from "lucide-react";
import { toast } from "sonner";

const GOLD = "#DEC2A3";

const CHANNELS = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircle,
    color: "#25D366",
    desc: "Valide tes décisions et cause à Kairos depuis ton WhatsApp perso.",
    status: "not_connected", // not_connected | pending | connected
    action: "Connecter WhatsApp",
    ready: true,
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: Send,
    color: "#2AABEE",
    desc: "Reçois tes brouillons de décisions par Telegram, valide en un tap.",
    status: "not_connected",
    action: "Créer le bot",
    ready: true,
  },
  {
    id: "email",
    name: "Email",
    icon: Mail,
    color: GOLD,
    desc: "Reçois ton point du jour et tes décisions à valider par e-mail.",
    status: "connected",
    action: "Configurer",
    ready: true,
  },
];

const AI_AGENTS = [
  {
    id: "organisateur",
    name: "L'Organisateur",
    icon: Sparkles,
    role: "Trie, range et organise ton cockpit chaque jour",
    model: "Claude Sonnet · Anthropic",
    tone: "Efficace, discret, apaisé",
    default: true,
    active: true,
  },
  {
    id: "copilot",
    name: "Kairos Copilote",
    icon: Bot,
    role: "Ton co-pilote conversationnel principal",
    model: "Claude Sonnet · Anthropic",
    tone: "Doux, humain, structuré",
    default: true,
    active: true,
  },
  {
    id: "prospection",
    name: "Agent Prospection",
    icon: Search,
    role: "Prépare tes emails et messages de prospection",
    model: "Claude + Mammouth",
    tone: "Professionnel, chaleureux",
    active: false,
  },
  {
    id: "redacteur",
    name: "Agent Rédacteur",
    icon: PenTool,
    role: "Écrit tes posts, articles, offres et contrats",
    model: "Claude Sonnet",
    tone: "Adapté à ta voix",
    active: false,
  },
  {
    id: "croissance",
    name: "Agent Croissance",
    icon: TrendingUp,
    role: "Analyse tes KPI et propose des actions",
    model: "Claude + GPT-5",
    tone: "Stratégique, factuel",
    active: false,
    plan: "GROW",
  },
  {
    id: "veille",
    name: "Agent Veille",
    icon: Briefcase,
    role: "Digest éco personnalisé chaque matin",
    model: "Claude + RSS",
    tone: "Concis, filtré par énergie",
    active: false,
  },
  {
    id: "collab",
    name: "Agent Collaborateur",
    icon: Users,
    role: "Coordonne avec le réseau humain Zayado",
    model: "Claude + humain",
    tone: "Facilitateur, transparent",
    active: false,
    plan: "SERENITY",
  },
];

export default function Agents() {
  const [tab, setTab] = useState("agents"); // agents | canaux
  const [channels, setChannels] = useState(CHANNELS);
  const [agents, setAgents] = useState(AI_AGENTS);
  const [qrOpen, setQrOpen] = useState(false);

  const connect = async (id) => {
    if (id === "whatsapp") {
      setQrOpen(true);
      // Simulate connection after 3s
      setTimeout(() => {
        setChannels((p) => p.map((c) => c.id === id ? { ...c, status: "connected" } : c));
        setQrOpen(false);
        toast.success("WhatsApp connecté (démo). Le vrai QR arrivera quand le service Railway sera déployé.");
      }, 3000);
    } else if (id === "telegram") {
      toast.info("Redirection vers @KairosZayadoBot… (à activer côté Railway)");
    } else {
      toast.success("Email déjà configuré : noreply@zayado.net");
    }
  };

  const toggleAgent = (id) => {
    setAgents((p) => p.map((a) => a.id === id ? { ...a, active: !a.active } : a));
    const a = agents.find((x) => x.id === id);
    toast.success(a?.active ? `${a.name} mis en pause` : `${a.name} activé`);
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header title="Agent Business" subtitle="Ton équipe IA, connectée à toi." />

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Sub-nav Agent Business (Chatbot Client / Agents IA) */}
          <div className="mb-5 inline-flex rounded-full border border-white/15 bg-white/5 p-1" data-testid="agent-business-subnav">
            <button
              onClick={() => window.location.assign("/app/chatbot-b2b")}
              className="rounded-full px-4 py-2 text-[12.5px] font-semibold text-white/70 hover:text-white"
              data-testid="subnav-chatbot"
            >
              Chatbot Client
            </button>
            <button
              className="rounded-full px-4 py-2 text-[12.5px] font-semibold text-navy-900"
              style={{ background: GOLD }}
              data-testid="subnav-agents-ia"
            >
              Agents IA
            </button>
          </div>
          {/* Hero */}
          <div className="mb-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 sm:p-8">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>Ton équipe étendue</p>
            <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight sm:text-[36px]">
              Des <span className="font-serif-italic italic" style={{ color: GOLD }}>agents IA</span>, un ton doux, des canaux <span className="font-serif-italic italic" style={{ color: GOLD }}>humains.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-white/60">
              Kairos n'est pas un seul robot. C'est un <b className="text-white">Copilote</b> et jusqu'à <b className="text-white">5 agents spécialisés</b> que tu actives à la carte, plus 3 canaux (WhatsApp, Telegram, Email) pour rester joignable partout.
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6 inline-flex rounded-full border border-white/15 bg-white/5 p-1">
            <button onClick={() => setTab("agents")}
              className={`rounded-full px-5 py-2 text-[13px] font-semibold transition ${tab === "agents" ? "text-navy-900" : "text-white/70 hover:text-white"}`}
              style={tab === "agents" ? { background: GOLD } : {}}>
              Agents IA
            </button>
            <button onClick={() => setTab("canaux")}
              className={`rounded-full px-5 py-2 text-[13px] font-semibold transition ${tab === "canaux" ? "text-navy-900" : "text-white/70 hover:text-white"}`}
              style={tab === "canaux" ? { background: GOLD } : {}}>
              Canaux
            </button>
          </div>

          {/* Agents grid */}
          {tab === "agents" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((a) => (
                <div key={a.id} className={`relative rounded-2xl border p-5 transition ${a.active ? "border-[color:var(--g)] bg-[color:var(--g)]/[0.06]" : "border-white/10 bg-white/[0.04] hover:border-white/25"}`}
                  style={{ "--g": GOLD }}>
                  {a.default && (
                    <span className="absolute -top-2 right-4 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-navy-900" style={{ background: GOLD }}>
                      Par défaut
                    </span>
                  )}
                  {a.plan && (
                    <span className="absolute -top-2 right-4 rounded-full border border-white/20 bg-navy-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest" style={{ color: GOLD }}>
                      Plan {a.plan}
                    </span>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${GOLD}22` }}>
                      <a.icon size={20} style={{ color: GOLD }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-[15.5px] font-semibold text-white">{a.name}</h3>
                      <p className="mt-0.5 text-[12.5px] text-white/60">{a.role}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5 text-[11.5px] text-white/50">
                    <div><b className="text-white/70">Modèle :</b> {a.model}</div>
                    <div><b className="text-white/70">Ton :</b> {a.tone}</div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                    <div className="flex items-center gap-1.5 text-[11.5px]">
                      {a.active ? (
                        <><CheckCircle2 size={14} className="text-emerald-400" /> <span className="text-emerald-300">Actif</span></>
                      ) : (
                        <><Circle size={14} className="text-white/30" /> <span className="text-white/50">En veille</span></>
                      )}
                    </div>
                    <button onClick={() => toggleAgent(a.id)} disabled={a.default}
                      className={`rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition disabled:opacity-40 ${
                        a.active ? "border border-white/20 text-white/80 hover:bg-white/5" : "text-navy-900"
                      }`}
                      style={a.active ? {} : { background: GOLD }}>
                      {a.default ? "Toujours actif" : a.active ? "Mettre en pause" : "Activer"}
                    </button>
                  </div>
                </div>
              ))}
              <button className="flex min-h-[220px] items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] text-white/50 transition hover:border-[color:var(--g)]/40 hover:text-white"
                style={{ "--g": GOLD }}>
                <div className="flex flex-col items-center gap-2">
                  <Plus size={22} />
                  <span className="text-[13px] font-medium">Créer un agent custom</span>
                  <span className="text-[10.5px] text-white/40">Plan SERENITY</span>
                </div>
              </button>
            </div>
          )}

          {/* Canaux */}
          {tab === "canaux" && (
            <div className="space-y-3">
              {channels.map((c) => {
                const connected = c.status === "connected";
                return (
                  <div key={c.id} className={`flex items-center gap-4 rounded-2xl border p-5 transition ${connected ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-white/10 bg-white/[0.04]"}`}>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: `${c.color}22` }}>
                      <c.icon size={22} style={{ color: c.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-[16px] font-semibold text-white">{c.name}</h3>
                        {connected ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                            <CheckCircle2 size={10} /> Connecté
                          </span>
                        ) : (
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/50">
                            Non connecté
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[13px] text-white/60">{c.desc}</p>
                    </div>
                    <button onClick={() => connect(c.id)}
                      className={`rounded-xl px-4 py-2.5 text-[12.5px] font-semibold transition ${
                        connected ? "border border-white/20 text-white/80 hover:bg-white/5" : "text-navy-900"
                      }`}
                      style={connected ? {} : { background: GOLD }}>
                      {connected ? "Reconfigurer" : c.action}
                    </button>
                  </div>
                );
              })}

              <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
                <div className="flex items-start gap-3">
                  <Shield size={18} className="mt-0.5 shrink-0 text-amber-300" />
                  <div>
                    <h4 className="font-display text-[14px] font-semibold text-amber-100">Notes production</h4>
                    <ul className="mt-2 space-y-1 text-[12.5px] text-amber-100/75">
                      <li>• <b>WhatsApp</b> : le service Node.js est présent dans <code className="text-amber-200">/app/WhatsApp-service</code> — à déployer sur Railway avec {"{WA_SERVICE_URL, WA_SERVICE_SECRET}"} pour activer le QR réel.</li>
                      <li>• <b>Telegram</b> : bot à créer via @BotFather, ajouter TELEGRAM_BOT_TOKEN au backend.</li>
                      <li>• <b>Email</b> : Brevo actif ✓ (test envoi confirmé).</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* QR modal */}
      {qrOpen && (
        <div onClick={() => setQrOpen(false)} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-white/15 p-6 text-center" style={{ background: "#111f38" }}>
            <button onClick={() => setQrOpen(false)} className="absolute right-4 top-4 text-white/60 hover:text-white"><X size={16} /></button>
            <MessageCircle size={28} className="mx-auto" style={{ color: "#25D366" }} />
            <h3 className="mt-3 font-display text-[18px] font-semibold text-white">Scanne le QR avec WhatsApp</h3>
            <p className="mt-1 text-[12.5px] text-white/55">WhatsApp → Paramètres → Appareils liés</p>
            <div className="mx-auto mt-5 grid h-48 w-48 place-items-center rounded-xl bg-white">
              <QrCode size={140} className="text-black" />
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-white/60">
              <Loader2 size={13} className="animate-spin" /> En attente du scan…
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
