import React, { useEffect, useState } from "react";
import { useChatScroll } from "@/hooks/useChatScroll";
import MissionsAgent from "@/components/agents/MissionsAgent";
import { BoutonDernierMessage } from "@/components/kairos/BoutonDernierMessage";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { aDroit, usePlanEffectif } from "@/lib/droits";
import {
  ArrowLeft, BellRing, Bot, Briefcase, CalendarClock, Loader2, Lock, MessageCircle, PenTool, Plus, Plug,
  Save, Scale, Search, Settings, Send, Sparkles, Trash2, TrendingUp, Users, RotateCcw,
} from "lucide-react";
import {
  fetchModelesAgents, fetchMesAgents, creerMonAgent, modifierMonAgent, supprimerMonAgent, historiqueMonAgent,
  effacerHistoriqueMonAgent, discuterMonAgent, brancherMonAgent, fetchAgentsBusiness, lireMission,
} from "@/lib/kairosApi";

const GOLD = "#DEC2A3";
const ICONES = { Bot, Briefcase, PenTool, TrendingUp, Scale, MessageCircle, BellRing, Sparkles, Search, Users };
const TONS = [["chaleureux", "Chaleureux"], ["professionnel", "Professionnel"], ["direct", "Direct"]];
const FREQ = [["aucune", "Pas de mission"], ["quotidien", "Chaque jour"], ["hebdo", "Chaque lundi"]];
const champ = "mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold";
const etiquette = "text-[12px] font-semibold uppercase tracking-widest text-white/75";

const Icone = ({ nom, size = 20 }) => { const I = ICONES[nom] || Bot; return <I size={size} style={{ color: GOLD }} />; };

function libelleMission(a) {
  if (!a.mission || a.frequence === "aucune") return null;
  return `${a.frequence === "hebdo" ? "Chaque lundi" : "Chaque jour"} à ${a.heure.replace(":", "h")}`;
}

export default function MesAgents() {
  const plan = usePlanEffectif();
  const [d, setD] = useState(null); // { agents, quota, modeles, competences }
  const [chatbots, setChatbots] = useState([]);
  const [ouvert, setOuvert] = useState(null);
  const [ongletInitial, setOngletInitial] = useState("mission");
  const ouvrir = (a, onglet) => { setOngletInitial(onglet); setOuvert(a); };
  const [creation, setCreation] = useState(false);
  const [envoi, setEnvoi] = useState(null);

  const charger = async () => {
    const [m, l] = await Promise.all([fetchModelesAgents(), fetchMesAgents()]);
    setD({ ...m, agents: l.agents, quota: l.quota });
    return l.agents;
  };
  useEffect(() => {
    // Arrivée depuis une notification « mission terminée » : on rouvre directement le bon agent
    const idMission = new URLSearchParams(window.location.search).get("mission");
    charger().then(async (agents) => {
      if (!idMission) return;
      try { const m = await lireMission(idMission); const a = agents.find((x) => x.id === m.agent_id); if (a) { setOngletInitial("mission"); setOuvert(a); } } catch { /* mission introuvable */ }
    }).catch(() => toast.error("Impossible de charger tes agents."));
    fetchAgentsBusiness().then((r) => setChatbots(r.agents || [])).catch(() => {});
  }, []);

  if (!d) return <div className="flex items-center gap-2 text-white/75"><Loader2 size={16} className="animate-spin" /> Chargement…</div>;

  const plein = d.quota !== -1 && d.agents.length >= d.quota;
  const creer = async (modele) => {
    setEnvoi(modele || "vide");
    try {
      const a = await creerMonAgent(modele ? { modele } : { nom: "Mon agent", description: "Mon agent sur mesure", instructions: "" });
      await charger();
      setCreation(false);
      setOuvert(a);
      toast.success(`${a.nom} est prêt. Ajuste ses consignes si tu veux.`);
    } catch (e) { toast.error(e.detail || "Création impossible."); }
    finally { setEnvoi(null); }
  };

  if (ouvert) {
    return <FicheAgent agent={ouvert} ongletInitial={ongletInitial} competences={d.competences} chatbots={chatbots}
      onRetour={() => { setOuvert(null); charger().catch(() => {}); }}
      onMaj={(a) => setOuvert(a)}
      onSupprime={async () => { setOuvert(null); await charger().catch(() => {}); }} />;
  }

  if (d.quota === 0 || (plan && !aDroit(plan, "agents"))) {
    return (
      <div className="rounded-2xl border border-gold/30 bg-gold/[0.06] p-6" data-testid="mes-agents-verrou">
        <Lock size={20} style={{ color: GOLD }} />
        <h3 className="mt-3 font-display text-[18px] font-semibold text-white">Tes propres agents IA, dès l'offre Solo</h3>
        <p className="mt-1 max-w-xl text-[13.5px] text-white/65">Un assistant commercial, un rédacteur, un analyste financier… qui connaissent ton activité et travaillent pour toi chaque jour.</p>
        <Link to="/pricing" className="mt-4 inline-flex rounded-xl bg-gold px-4 py-2.5 text-[13px] font-semibold text-navy-900">Voir les offres</Link>
      </div>
    );
  }

  const montrerModeles = creation || d.agents.length === 0;

  return (
    <div className="space-y-6" data-testid="mes-agents">
      <Link to={plan && !aDroit(plan, "agent_business") ? "/pricing" : "/app/chatbot-b2b"} className="flex items-center gap-4 rounded-2xl border border-gold/30 bg-gold/[0.07] p-4 transition hover:border-gold/60" data-testid="mes-agents-business">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${GOLD}22` }}><MessageCircle size={20} style={{ color: GOLD }} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] font-semibold text-white">Agent Business : ton chatbot client</span>
          <span className="block text-[12.5px] text-white/75">{chatbots.length ? `${chatbots[0].nom_marque || "Ton assistant"} répond à tes clients. Configure-le, teste-le, mets-le en ligne.` : "Un assistant à ta marque qui répond à tes clients sur ton site. Inclus dès l'offre Pro."}</span>
        </span>
        {plan && !aDroit(plan, "agent_business")
          ? <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-[12.5px] font-semibold text-gold" data-testid="mes-agents-business-verrou"><Lock size={12} /> Inclus dès Pro</span>
          : <span className="text-[12.5px] font-semibold text-gold">Ouvrir →</span>}
      </Link>
      {d.agents.length > 0 && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12.5px] text-white/70">{d.agents.length}{d.quota === -1 ? "" : ` / ${d.quota}`} agent{d.agents.length > 1 ? "s" : ""}</p>
            {!creation && (
              <button onClick={() => (plein ? toast.info("Tu as atteint le nombre d'agents de ton offre.") : setCreation(true))}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2 text-[12.5px] font-semibold text-navy-900" data-testid="mes-agents-nouveau">
                <Plus size={14} /> Nouvel agent
              </button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {d.agents.map((a) => (
              <div key={a.id} className="flex flex-col rounded-2xl border border-white/12 bg-white/[0.06] p-5 text-left transition hover:border-gold/40" data-testid={`mon-agent-${a.id}`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${GOLD}22` }}><Icone nom={a.icone} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[15.5px] font-semibold text-white">{a.nom}</span>
                    <span className="mt-0.5 block text-[12.5px] text-white/75">{a.description || "Agent sur mesure"}</span>
                  </span>
                </div>
                <span className="mt-3 flex flex-wrap gap-1.5">
                  {libelleMission(a) && <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-[12px] font-semibold text-gold"><CalendarClock size={12} /> {libelleMission(a)}</span>}
                  {a.chatbot_id && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[12px] font-semibold text-emerald-300"><Plug size={12} /> Branché sur l'Agent Business</span>}
                </span>
                <span className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={() => ouvrir(a, "discuter")} data-testid={`mon-agent-discuter-${a.id}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-navy-900" style={{ background: GOLD }}>
                    <MessageCircle size={14} /> Discuter
                  </button>
                  <button onClick={() => ouvrir(a, "regler")} data-testid={`mon-agent-regler-${a.id}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/25 px-3 py-2.5 text-[13px] font-semibold text-white/90 hover:bg-white/10">
                    <Settings size={14} /> Réglages
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {montrerModeles && (
        <div data-testid="mes-agents-modeles">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-[17px] font-semibold text-white">{d.agents.length ? "Créer un agent" : "Crée ton premier agent"}</h3>
            {creation && d.agents.length > 0 && <button onClick={() => setCreation(false)} className="text-[12.5px] text-white/70 hover:text-white">Annuler</button>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {d.modeles.map((m) => (
              <button key={m.id} onClick={() => creer(m.id)} disabled={!!envoi} data-testid={`modele-${m.id}`}
                className="flex items-start gap-3 rounded-2xl border border-white/12 bg-white/[0.05] p-4 text-left transition hover:border-gold/40 disabled:opacity-60">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${GOLD}22` }}>
                  {envoi === m.id ? <Loader2 size={18} className="animate-spin text-gold" /> : <Icone nom={m.icone} size={18} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-white">{m.nom}</span>
                  <span className="mt-0.5 block text-[12px] text-white/70">{m.description}</span>
                  {m.mission && <span className="mt-1.5 block text-[12px] text-gold/80">Mission proposée incluse</span>}
                </span>
              </button>
            ))}
            <button onClick={() => creer(null)} disabled={!!envoi} data-testid="modele-vide"
              className="flex items-center gap-3 rounded-2xl border border-dashed border-white/25 p-4 text-left text-white/70 hover:border-gold/50 hover:text-white disabled:opacity-60">
              {envoi === "vide" ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              <span><span className="block text-[14px] font-semibold">Partir de zéro</span><span className="block text-[12px] text-white/70">Tu écris toi-même ses consignes</span></span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FicheAgent({ agent, ongletInitial = "mission", competences, chatbots, onRetour, onMaj, onSupprime }) {
  const [f, setF] = useState(agent);
  const [onglet, setOnglet] = useState(ongletInitial);
  const [sauve, setSauve] = useState(false);
  const modifie = JSON.stringify(f) !== JSON.stringify(agent);

  const enregistrer = async () => {
    setSauve(true);
    try {
      const champs = ["nom", "description", "instructions", "competences", "connaissances", "ton", "contexte", "mission", "frequence", "heure"];
      const a = await modifierMonAgent(agent.id, Object.fromEntries(champs.map((k) => [k, f[k]])));
      onMaj(a); setF(a);
      toast.success("Agent enregistré.");
    } catch (e) { toast.error(e.detail || "Enregistrement impossible."); }
    finally { setSauve(false); }
  };

  const brancher = async (chatbotId) => {
    try { const a = await brancherMonAgent(agent.id, chatbotId || null); onMaj(a); setF((x) => ({ ...x, chatbot_id: a.chatbot_id })); toast.success(chatbotId ? "Branché : ton Agent Business suit maintenant les consignes de cet agent." : "Débranché."); }
    catch (e) { toast.error(e.detail || "Impossible."); }
  };

  const supprimer = async () => {
    if (!window.confirm(`Supprimer ${agent.nom} et son historique ?`)) return;
    try { await supprimerMonAgent(agent.id); toast.success("Agent supprimé."); onSupprime(); }
    catch { toast.error("Suppression impossible."); }
  };

  const basculer = (id) => setF((x) => ({ ...x, competences: x.competences.includes(id) ? x.competences.filter((c) => c !== id) : [...x.competences, id] }));

  return (
    <div data-testid="fiche-agent">
      <button onClick={onRetour} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-white/75 hover:text-white" data-testid="fiche-agent-retour"><ArrowLeft size={14} /> Mes agents</button>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${GOLD}22` }}><Icone nom={agent.icone} size={22} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[22px] font-semibold text-white">{agent.nom}</h2>
          <p className="text-[13px] text-white/70">{agent.description}</p>
        </div>
        <div className="inline-flex rounded-full border border-white/15 bg-white/5 p-1">
          {[["mission", "Missions"], ["discuter", "Discuter"], ["regler", "Réglages"]].map(([id, l]) => (
            <button key={id} onClick={() => setOnglet(id)} data-testid={`fiche-onglet-${id}`}
              className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold ${onglet === id ? "text-navy-900" : "text-white/70"}`} style={onglet === id ? { background: GOLD } : {}}>{l}</button>
          ))}
        </div>
      </div>

      {onglet === "mission" ? <MissionsAgent agent={agent} /> : onglet === "discuter" ? <Discussion agent={agent} /> : (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="space-y-4 rounded-2xl border border-white/12 bg-white/[0.06] p-6 lg:col-span-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={etiquette}>Nom</label><input value={f.nom} maxLength={80} onChange={(e) => setF({ ...f, nom: e.target.value })} className={champ} data-testid="agent-nom" /></div>
              <div><label className={etiquette}>En une phrase</label><input value={f.description} maxLength={200} onChange={(e) => setF({ ...f, description: e.target.value })} className={champ} /></div>
            </div>
            <div>
              <label className={etiquette}>Ses consignes</label>
              <textarea rows={5} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} className={`${champ} resize-y`} data-testid="agent-instructions"
                placeholder="Ex. Tu es mon assistant commercial. Tu connais mes offres, tu écris court, tu proposes toujours un rendez-vous." />
            </div>
            <div>
              <label className={etiquette}>Compétences</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {competences.map((c) => (
                  <button key={c.id} onClick={() => basculer(c.id)} data-testid={`competence-${c.id}`}
                    className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold ${f.competences.includes(c.id) ? "text-navy-900" : "border border-white/20 text-white/70"}`}
                    style={f.competences.includes(c.id) ? { background: GOLD } : {}}>{c.nom}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={etiquette}>Ton</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {TONS.map(([id, l]) => (
                  <button key={id} onClick={() => setF({ ...f, ton: id })} className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold ${f.ton === id ? "text-navy-900" : "border border-white/20 text-white/70"}`} style={f.ton === id ? { background: GOLD } : {}}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={etiquette}>Ce qu'il doit savoir</label>
              <textarea rows={5} value={f.connaissances} onChange={(e) => setF({ ...f, connaissances: e.target.value })} className={`${champ} resize-y`}
                placeholder="Tes offres, tarifs, clients types, arguments, objections fréquentes…" />
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-[13px] text-white/75">
              <input type="checkbox" checked={f.contexte} onChange={(e) => setF({ ...f, contexte: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#DEC2A3]" data-testid="agent-contexte" />
              <span>Il peut lire mon cockpit (vision, objectifs, actions, entreprise) pour des réponses sur mesure.</span>
            </label>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-gold/30 bg-gold/[0.06] p-5" data-testid="agent-mission">
              <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold text-white"><CalendarClock size={16} style={{ color: GOLD }} /> Mission récurrente</h3>
              <p className="mt-1 text-[12px] text-white/70">Le résultat arrive dans la discussion et sur Telegram si ton Copilote y est relié.</p>
              <textarea rows={3} value={f.mission} onChange={(e) => setF({ ...f, mission: e.target.value })} className={`${champ} resize-y`} placeholder="Ex. Propose-moi 3 actions commerciales pour aujourd'hui." />
              <div className="mt-2 flex flex-wrap gap-2">
                <select value={f.frequence} onChange={(e) => setF({ ...f, frequence: e.target.value })} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[13px] text-white" data-testid="agent-frequence">
                  {FREQ.map(([id, l]) => <option key={id} value={id} className="text-navy-900">{l}</option>)}
                </select>
                {f.frequence !== "aucune" && <input type="time" value={f.heure} onChange={(e) => setF({ ...f, heure: e.target.value })} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[13px] text-white" />}
              </div>
              {modifie && <p className="mt-2 text-[12.5px] text-gold">Pense à enregistrer.</p>}
            </div>

            <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-5" data-testid="agent-canaux">
              <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold text-white"><MessageCircle size={16} style={{ color: GOLD }} /> Sur mon Telegram / WhatsApp</h3>
              <p className="mt-1 text-[12.5px] text-white/75">Les missions de cet agent arrivent sur TON Telegram et TON WhatsApp, reliés à ton compte. Tu peux lui répondre depuis ton téléphone.</p>
              <Link to="/app/agents?tab=canaux" className="mt-3 inline-flex text-[13px] font-semibold text-gold hover:underline" data-testid="agent-canaux-lien">Relier ou vérifier mes canaux →</Link>
            </div>

            <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-5" data-testid="agent-brancher">
              <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold text-white"><Plug size={16} style={{ color: GOLD }} /> Brancher sur mon Agent Business</h3>
              <p className="mt-1 text-[12px] text-white/70">Le chatbot de ton site suit alors les consignes et le savoir-faire de cet agent, en plus des infos de ton entreprise. Il n'invente toujours rien.</p>
              {chatbots.length ? (
                <select value={f.chatbot_id || ""} onChange={(e) => brancher(e.target.value)} className="mt-3 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-[13px] text-white" data-testid="agent-chatbot">
                  <option value="" className="text-navy-900">Non branché</option>
                  {chatbots.map((c) => <option key={c.id} value={c.id} className="text-navy-900">{c.nom_marque || "Mon Agent Business"}</option>)}
                </select>
              ) : (
                <Link to="/app/chatbot-b2b" className="mt-3 inline-flex text-[12.5px] font-semibold text-gold hover:underline">Créer mon Agent Business (dès l'offre Pro) →</Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barre d'enregistrement toujours visible (au-dessus de la barre du bas sur mobile) */}
      {onglet === "regler" && (
          <div className="sticky bottom-20 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-navy-900/95 p-3 shadow-xl backdrop-blur lg:bottom-4" data-testid="agent-barre-enregistrer">
            <button onClick={enregistrer} disabled={!modifie || sauve} className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-[13.5px] font-semibold text-navy-900 disabled:opacity-50" data-testid="agent-enregistrer">
              {sauve ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {modifie ? "Enregistrer" : "Enregistré"}
            </button>
            {modifie && <span className="text-[12.5px] text-gold">Modifications non enregistrées</span>}
            <button onClick={supprimer} className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2.5 text-[12.5px] text-white/75 hover:text-red-300" data-testid="agent-supprimer"><Trash2 size={14} /> Supprimer</button>
          </div>
      )}
    </div>
  );
}

function Discussion({ agent }) {
  const [msgs, setMsgs] = useState(null);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => { historiqueMonAgent(agent.id).then((r) => setMsgs(r.messages)).catch(() => setMsgs([])); }, [agent.id]);
  const { ref: zoneRef, onScroll: surDefilement, decolle, versLeBas } = useChatScroll(
    [msgs, envoi], { pret: msgs !== null, dernierEstMoi: msgs?.[msgs.length - 1]?.role === "moi" });

  const envoyer = async (t = texte) => {
    const m = t.trim();
    if (!m || envoi) return;
    setTexte(""); setEnvoi(true);
    setMsgs((x) => [...(x || []), { id: `tmp-${Date.now()}`, role: "moi", texte: m }]);
    try {
      const r = await discuterMonAgent(agent.id, m);
      setMsgs((x) => [...x, { id: `rep-${Date.now()}`, role: "agent", texte: r.reponse }]);
    } catch (e) {
      toast.error(e.detail || "L'agent n'a pas pu répondre.");
      setMsgs((x) => x.slice(0, -1)); setTexte(m);
    } finally { setEnvoi(false); }
  };

  const effacer = async () => {
    if (!window.confirm("Effacer toute la discussion ?")) return;
    await effacerHistoriqueMonAgent(agent.id).catch(() => {});
    setMsgs([]);
  };

  const idees = [agent.mission, "Qu'est-ce que tu peux faire pour moi ?", "Aide-moi sur ma priorité de la semaine."].filter(Boolean).slice(0, 3);

  return (
    <div className="flex h-[min(68vh,640px)] flex-col rounded-2xl border border-white/12 bg-white/[0.05]" data-testid="agent-discussion">
      <div ref={zoneRef} onScroll={surDefilement} className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
        {msgs === null && <Loader2 size={16} className="animate-spin text-white/70" />}
        {msgs?.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-[14px] text-white/70">Demande ce que tu veux à {agent.nom}.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {idees.map((t) => <button key={t} onClick={() => envoyer(t)} className="rounded-full border border-white/20 px-3.5 py-1.5 text-[12.5px] text-white/75 hover:border-gold/50">{t.length > 70 ? `${t.slice(0, 70)}…` : t}</button>)}
            </div>
          </div>
        )}
        {msgs?.map((m) => (
          <div key={m.id} className={`flex ${m.role === "moi" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${m.role === "moi" ? "bg-gold text-navy-900" : "border border-white/12 bg-white/[0.07] text-white/90"}`}>
              {m.role === "mission" && <span className="mb-1 flex items-center gap-1 text-[12px] font-semibold uppercase tracking-widest text-gold"><CalendarClock size={11} /> Mission du jour</span>}
              {m.texte}
            </div>
          </div>
        ))}
        {envoi && <div className="flex items-center gap-2 text-[12.5px] text-white/70"><Loader2 size={14} className="animate-spin" /> {agent.nom} réfléchit…</div>}
        <BoutonDernierMessage visible={decolle} onClick={versLeBas} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); envoyer(); }} className="flex items-end gap-2 border-t border-white/10 p-3">
        {msgs?.length > 0 && <button type="button" onClick={effacer} title="Effacer la discussion" className="rounded-xl p-2.5 text-white/65 hover:bg-white/10 hover:text-white"><RotateCcw size={16} /></button>}
        <textarea rows={1} value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={4000} data-testid="agent-message"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }}
          placeholder={`Écris à ${agent.nom}…`} className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-[14px] text-white outline-none focus:border-gold" />
        <button type="submit" disabled={!texte.trim() || envoi} className="rounded-xl bg-gold p-3 text-navy-900 disabled:opacity-40" data-testid="agent-envoyer"><Send size={16} /></button>
      </form>
    </div>
  );
}
