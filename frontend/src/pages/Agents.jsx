import React, { useState } from "react";
import MesAgents from "@/components/agents/MesAgents";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import { Bot, Mail, Sparkles, Users, Briefcase, PenTool, Search, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CanauxCopilote from "@/components/kairos/CanauxCopilote";
import AgentParDefaut from "@/components/agents/AgentParDefaut";
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

const ONGLETS = [["mes", "Mes agents"], ["agents", "Agents Zayado"], ["canaux", "Telegram · WhatsApp"]];

export default function Agents() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(() => (new URLSearchParams(window.location.search).get("tab") || "mes")); // mes | agents | canaux

  const changerOnglet = (id) => { setTab(id); window.history.replaceState(null, "", `?tab=${id}`); };

  const ouvrirAgent = (a) => {
    if (a.ouvrir === "chat") openChat();
    else if (a.ouvrir === "actu") openChat("actu");
    else navigate(a.route);
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header title="Agents IA" subtitle="Tes assistants IA, à ta façon." />

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Bandeau compact : une ligne, pas de pavé */}
          <p className="mb-4 max-w-3xl text-[14px] leading-relaxed text-white/75">
            Des assistants IA qui connaissent ton activité. Crée les tiens, confie-leur une mission chaque jour,
            et retrouve-les aussi sur ton <b className="text-white">Telegram</b> ou ton <b className="text-white">WhatsApp</b>.
          </p>

          {/* Onglets : du plus personnel au plus technique */}
          <div className="-mx-1 mb-6 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="inline-flex whitespace-nowrap rounded-full border border-white/15 bg-white/5 p-1" role="tablist">
              {ONGLETS.map(([id, label]) => (
                <button key={id} role="tab" aria-selected={tab === id} onClick={() => changerOnglet(id)} data-testid={`agents-tab-${id}`}
                  className={`rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${tab === id ? "text-navy-900" : "text-white/80 hover:text-white"}`}
                  style={tab === id ? { background: GOLD } : {}}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {tab === "mes" && <MesAgents />}

          {/* Agents intégrés à Zayado */}
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
                      <p className="mt-0.5 text-[12.5px] text-white/75">{a.role}</p>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-3" style={{ marginTop: 18 }}>
                    <span className="text-[12px] text-white/70">{a.offre}</span>
                    <button onClick={() => ouvrirAgent(a)} className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-navy-900" style={{ background: GOLD }} data-testid={`agent-ouvrir-${a.id}`}>
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
                <p className="mb-3 mt-1 text-[13px] text-white/75">Relie Telegram en un clic ou WhatsApp par QR code : tu écris à Zayado comme à un contact.</p>
                <CanauxCopilote />
        <div className="mt-4"><AgentParDefaut /></div>
              </div>
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: `${GOLD}22` }}><Mail size={22} style={{ color: GOLD }} /></div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[16px] font-semibold text-white">E-mail</h3>
                  <p className="mt-1 text-[13px] text-white/75">Point du jour, e-mail du lundi et décisions à valider, à l'adresse de ton profil.</p>
                </div>
                <button onClick={() => navigate("/parametres#notifications")} className="rounded-xl border border-white/20 px-4 py-2.5 text-[12.5px] font-semibold text-white/80 hover:bg-white/5">Régler</button>
              </div>
              <p className="text-[12px] text-white/65">Tous tes branchements (Drive, Qonto, Teams, téléphone) sont aussi dans Paramètres › Connexions.</p>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}
