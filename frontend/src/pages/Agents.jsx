import React, { useState } from "react";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import { Bot, Mail, Sparkles, Users, Briefcase, PenTool, Search, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CanauxCopilote from "@/components/kairos/CanauxCopilote";
import { openChat } from "@/components/kairos/GlobalChat";

const GOLD = "#DEC2A3";


// Chaque « agent » est une fonction réelle de Zayado : on dit où elle se trouve
// et dans quelle offre (avant : interrupteurs sans effet, modèles et offres inventés).
const AI_AGENTS = [
  { id: "copilot", name: "Copilote IA", icon: Bot, role: "Ton co-pilote : questions, décisions à valider, actualité du jour.", offre: "Toutes les offres", ouvrir: "chat", cta: "Ouvrir le chat" },
  { id: "organisateur", name: "L'Organisateur", icon: Sparkles, role: "Tes 3 priorités du jour, adaptées à ton énergie.", offre: "Toutes les offres", route: "/app/actions", cta: "Mes actions" },
  { id: "prospection", name: "Agent Prospection", icon: Search, role: "3 opportunités par jour, avec un message prêt à envoyer.", offre: "Solo et plus", route: "/app/radar", cta: "Ouvrir le Radar" },
  { id: "croissance", name: "Agent Croissance", icon: TrendingUp, role: "Lit ton CA, tes factures et ta trésorerie, et propose des actions.", offre: "Solo et plus", route: "/app", cta: "Pouls business" },
  { id: "redacteur", name: "Agent Rédacteur", icon: PenTool, role: "Brief, plan 30 jours, positionnement, SWOT : des documents à partir de ton projet.", offre: "Pro", route: "/app/vision?view=canvas", cta: "Créer un document" },
  { id: "veille", name: "Agent Veille", icon: Briefcase, role: "Le digest de l'actualité utile à ton activité, chaque matin.", offre: "Toutes les offres", ouvrir: "actu", cta: "Lire l'actualité" },
  { id: "collab", name: "Collaborateur humain", icon: Users, role: "Une personne de l'équipe Zayado pour t'aider sur un sujet important.", offre: "Toutes les offres", route: "/app/collaborateurs", cta: "Écrire à l'équipe" },
];

export default function Agents() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("agents"); // agents | canaux

  const ouvrirAgent = (a) => {
    if (a.ouvrir === "chat") openChat();
    else if (a.ouvrir === "actu") openChat("actu");
    else navigate(a.route);
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
              Zayado n'est pas un seul robot : le <b className="text-white">Copilote IA</b> et des agents spécialisés travaillent chacun dans leur espace de l'app, et tu valides depuis tes canaux (WhatsApp, Telegram, Email) pour rester joignable partout.
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

          {/* Agents */}
          {tab === "agents" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {AI_AGENTS.map((a) => (
                <div key={a.id} className="relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/20" data-testid={`agent-${a.id}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${GOLD}22` }}>
                      <a.icon size={20} style={{ color: GOLD }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-[15.5px] font-semibold text-white">{a.name}</h3>
                      <p className="mt-0.5 text-[12.5px] text-white/60">{a.role}</p>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-3" style={{ marginTop: 18 }}>
                    <span className="text-[11px] text-white/50">{a.offre}</span>
                    <button onClick={() => ouvrirAgent(a)} className="rounded-lg px-3 py-1.5 text-[11.5px] font-semibold text-navy-900" style={{ background: GOLD }} data-testid={`agent-ouvrir-${a.id}`}>
                      {a.cta}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Canaux : le même réglage que Paramètres › Connexions (plus de jeton @BotFather à coller) */}
          {tab === "canaux" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <h3 className="font-display text-[16px] font-semibold text-white">Ton Copilote sur ton téléphone</h3>
                <p className="mb-3 mt-1 text-[13px] text-white/60">Relie Telegram en un clic ou WhatsApp par QR code : tu écris à Zayado comme à un contact.</p>
                <CanauxCopilote />
              </div>
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: `${GOLD}22` }}><Mail size={22} style={{ color: GOLD }} /></div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[16px] font-semibold text-white">E-mail</h3>
                  <p className="mt-1 text-[13px] text-white/60">Point du jour, e-mail du lundi et décisions à valider, à l'adresse de ton profil.</p>
                </div>
                <button onClick={() => navigate("/parametres#notifications")} className="rounded-xl border border-white/20 px-4 py-2.5 text-[12.5px] font-semibold text-white/80 hover:bg-white/5">Régler</button>
              </div>
              <p className="text-[12px] text-white/45">Tous tes branchements (Drive, Qonto, Teams, téléphone) sont aussi dans Paramètres › Connexions.</p>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}
