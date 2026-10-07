import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bot, Loader2, MessageCircle, Send, Smartphone } from "lucide-react";
import { agentDefaut, agentDefautMaj, fetchMesAgents } from "@/lib/kairosApi";

// Quel agent répond, canal par canal : le chat de l'appli, WhatsApp, Telegram. Par défaut : le Copilote standard.
// L'agent choisi garde la mémoire et le contexte du Copilote, mais répond avec son rôle, ses consignes et ses compétences.
const CANAUX = [["chat", "Chat de l'appli", MessageCircle], ["whatsapp", "WhatsApp", Smartphone], ["telegram", "Telegram", Send]];

export default function AgentParDefaut() {
  const [agents, setAgents] = useState(null);
  const [choix, setChoix] = useState({ chat: null, whatsapp: null, telegram: null });
  const [occupe, setOccupe] = useState(null);
  useEffect(() => {
    fetchMesAgents().then((r) => setAgents(r.agents || [])).catch(() => setAgents([]));
    agentDefaut().then(setChoix).catch(() => {});
  }, []);
  const changer = async (canal, id) => {
    setOccupe(canal);
    try {
      const r = await agentDefautMaj({ ...choix, [canal]: id || null });
      setChoix(r);
      const nom = agents.find((a) => a.id === id)?.nom;
      toast.success(nom ? `${nom} répond maintenant sur ${CANAUX.find((c) => c[0] === canal)[1]}.` : "Retour au Copilote standard.");
    } catch (e) { toast.error(e.detail || "Réglage impossible."); }
    setOccupe(null);
  };
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.05] p-4 sm:p-5" data-testid="agent-par-defaut">
      <p className="flex items-center gap-2 font-display text-[16px] font-semibold text-white"><Bot size={17} className="text-gold" /> Agent par défaut</p>
      <p className="mt-1 text-[13px] text-white/70">Choisis qui te répond, canal par canal. Il garde la mémoire de ton Copilote mais parle avec son rôle et ses consignes.</p>
      {agents === null ? <Loader2 size={16} className="mt-3 animate-spin text-white/50" /> : agents.length === 0 ? (
        <p className="mt-3 text-[13px] text-white/60">Crée d'abord un agent dans Agents IA › Mes agents : il apparaîtra ici.</p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {CANAUX.map(([k, l, I]) => (
            <label key={k} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="flex w-40 shrink-0 items-center gap-2 text-[13.5px] text-white/85"><I size={15} className="text-gold" /> {l}</span>
              <select value={choix[k] || ""} disabled={occupe === k} onChange={(e) => changer(k, e.target.value)} data-testid={`agent-defaut-${k}`}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold">
                <option value="">Copilote standard</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}
      <p className="mt-3 text-[12px] text-white/50">WhatsApp et Telegram : relie-les d'abord dans Telegram · WhatsApp. Le chatbot de ton site (Agent Business) reste réservé à tes clients ; tu peux lui brancher un agent dans la fiche de l'agent.</p>
    </div>
  );
}
