import React, { useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import AiFallbackBanner from "@/components/kairos/AiFallbackBanner";
import {
  MessageCircle, Check, ArrowRight, Palette, Bot, ShieldCheck, Settings, TrendingUp,
  Play, Loader2, Save, Upload, UserRound, BookOpen, RotateCcw, Send,
} from "lucide-react";
import { toast } from "sonner";
import { PLANS, prixFondateurMois, dateFinFr } from "@/lib/plans";
import {
  fetchAgentsBusiness, creerAgentBusiness, modifierAgentBusiness, testerAgentBusiness, fetchTarifsFondateur,
} from "@/lib/kairosApi";

const GOLD = "#DEC2A3";
const VIDE = {
  nom_marque: "", couleur: "#DEC2A3", message_accueil: "Bonjour ! Comment puis-je vous aider ?",
  ton: "chaleureux", connaissances: "", contact_humain: "",
};
const TONS = [
  { id: "chaleureux", label: "Chaleureux" },
  { id: "professionnel", label: "Professionnel" },
  { id: "direct", label: "Direct" },
];
const EXEMPLES = ["Quels sont vos horaires ?", "Combien coûte votre offre ?", "Je voudrais être rappelé."];

// Offres qui incluent l'Agent Business — même source que la page Tarifs.
const OFFRE_PRO = PLANS.find((p) => p.key === "pro");

const champ = "mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold";
const etiquette = "text-[11px] font-semibold uppercase tracking-widest text-white/60";

export default function ChatbotB2B() {
  const [tab, setTab] = useState("config");
  const [chargement, setChargement] = useState(true);
  const [agent, setAgent] = useState(null); // agent enregistré
  const [quota, setQuota] = useState(0);
  const [config, setConfig] = useState(VIDE);
  const [enregistrement, setEnregistrement] = useState(false);
  const [paiement, setPaiement] = useState(false);
  const [fondateur, setFondateur] = useState(null);
  useEffect(() => { fetchTarifsFondateur().then(setFondateur).catch(() => setFondateur(null)); }, []);

  useEffect(() => {
    fetchAgentsBusiness()
      .then((d) => {
        setQuota(d.quota);
        if (d.agents?.length) { setAgent(d.agents[0]); setConfig({ ...VIDE, ...d.agents[0] }); }
      })
      .catch(() => toast.error("Impossible de charger ton Agent Business."))
      .finally(() => setChargement(false));
  }, []);

  const modifie = agent && JSON.stringify(Object.keys(VIDE).map((k) => config[k])) !== JSON.stringify(Object.keys(VIDE).map((k) => agent[k]));

  const enregistrer = async () => {
    setEnregistrement(true);
    try {
      const donnees = Object.fromEntries(Object.keys(VIDE).map((k) => [k, config[k]]));
      const a = agent ? await modifierAgentBusiness(agent.id, donnees) : await creerAgentBusiness(donnees);
      setAgent(a); setConfig({ ...VIDE, ...a });
      toast.success("Agent enregistré. Tu peux le tester.");
      return a;
    } catch (e) {
      if (String(e).includes("403")) {
        toast.error("L'Agent Business est inclus dès l'offre Pro.");
        setTab("plan");
      } else toast.error("Enregistrement impossible, réessaie.");
      return null;
    } finally { setEnregistrement(false); }
  };

  const importerFichier = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/\.(txt|md|csv)$/i.test(f.name)) { toast.error("Formats acceptés : .txt, .md ou .csv. Pour un PDF, copie-colle son texte."); return; }
    const r = new FileReader();
    r.onload = () => {
      const texte = String(r.result || "");
      setConfig((c) => ({ ...c, connaissances: (c.connaissances ? c.connaissances + "\n\n" : "") + texte }));
      toast.success(`${f.name} ajouté à la base de connaissance.`);
    };
    r.readAsText(f);
  };

  const payer = async (key) => {
    setPaiement(true);
    try {
      const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
      const r = await fetch(`${BACKEND}/api/checkout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: key, cycle: "mensuel" }),
      });
      const j = await r.json();
      if (j.checkoutUrl) window.location.href = j.checkoutUrl;
      else toast.error("Impossible de créer le paiement.");
    } catch { toast.error("Paiement indisponible pour le moment."); }
    finally { setPaiement(false); }
  };

  const couleur = /^#[0-9A-Fa-f]{6}$/.test(config.couleur) ? config.couleur : GOLD;

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header title="Agent Business" subtitle="Ton assistant IA, à ta marque, qui répond à tes clients." />

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-5 inline-flex rounded-full border border-white/15 bg-white/5 p-1" data-testid="agent-business-subnav">
            <button className="rounded-full px-4 py-2 text-[12.5px] font-semibold text-navy-900" style={{ background: GOLD }} data-testid="subnav-chatbot">
              Agent client
            </button>
            <button onClick={() => window.location.assign("/app/agents")} className="rounded-full px-4 py-2 text-[12.5px] font-semibold text-white/70 hover:text-white" data-testid="subnav-agents-ia">
              Agents IA
            </button>
          </div>

          {/* Bandeau d'alerte si l'IA tourne en repli */}
          <div className="mb-5">
            <AiFallbackBanner />
          </div>

          {/* Présentation */}
          <div className="mb-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${GOLD}22` }}>
                <MessageCircle size={26} style={{ color: GOLD }} />
              </div>
              <div className="flex-1">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>Agent Business · Inclus dès l'offre Pro</p>
                <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight sm:text-[34px]">
                  Vos clients ont une réponse, <span className="font-serif-italic italic" style={{ color: GOLD }}>même quand vous êtes occupé.</span>
                </h1>
                <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-white/60">
                  Un assistant à vos couleurs qui répond à vos clients et prospects à partir de vos propres informations,
                  n'invente jamais un prix ni un délai, et vous transmet les demandes qui méritent un échange humain.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[
                { icon: Palette, label: "À votre marque" },
                { icon: BookOpen, label: "Répond avec vos infos" },
                { icon: ShieldCheck, label: "N'invente jamais" },
                { icon: UserRound, label: "Relais vers un humain" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
                  <f.icon size={14} style={{ color: GOLD }} />
                  <span className="text-[12.5px] text-white/85">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Onglets */}
          <div className="mb-5 inline-flex rounded-full border border-white/15 bg-white/5 p-1">
            {[{ id: "config", label: "Configuration", Icon: Settings }, { id: "test", label: "Tester", Icon: Play }, { id: "plan", label: "Offres", Icon: TrendingUp }].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold transition ${tab === t.id ? "text-navy-900" : "text-white/70 hover:text-white"}`}
                style={tab === t.id ? { background: GOLD } : {}}>
                <t.Icon size={13} /> {t.label}
              </button>
            ))}
          </div>

          {chargement ? (
            <div className="flex items-center gap-2 text-white/60"><Loader2 size={16} className="animate-spin" /> Chargement…</div>
          ) : (
            <>
              {tab === "config" && (
                <div className="grid gap-4 lg:grid-cols-5">
                  <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 lg:col-span-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={etiquette}>Nom de la marque</label>
                        <input value={config.nom_marque} onChange={(e) => setConfig({ ...config, nom_marque: e.target.value })} placeholder="Ex. Atelier Martin" className={champ} />
                      </div>
                      <div>
                        <label className={etiquette}>Couleur principale</label>
                        <div className="mt-1.5 flex items-center gap-2">
                          <input type="color" value={couleur} onChange={(e) => setConfig({ ...config, couleur: e.target.value })} className="h-10 w-10 cursor-pointer rounded-lg border border-white/15 bg-transparent" />
                          <input value={config.couleur} onChange={(e) => setConfig({ ...config, couleur: e.target.value })} className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className={etiquette}>Message d'accueil</label>
                      <input value={config.message_accueil} onChange={(e) => setConfig({ ...config, message_accueil: e.target.value })} className={champ} />
                    </div>
                    <div>
                      <label className={etiquette}>Ton des réponses</label>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {TONS.map((t) => (
                          <button key={t.id} onClick={() => setConfig({ ...config, ton: t.id })}
                            className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold ${config.ton === t.id ? "text-navy-900" : "border border-white/20 text-white/70"}`}
                            style={config.ton === t.id ? { background: GOLD } : {}}>{t.label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className={etiquette}>Base de connaissance</label>
                        <label className="inline-flex cursor-pointer items-center gap-1 text-[11.5px] font-semibold" style={{ color: GOLD }}>
                          <Upload size={12} /> Importer un fichier
                          <input type="file" accept=".txt,.md,.csv" onChange={importerFichier} className="hidden" />
                        </label>
                      </div>
                      <textarea value={config.connaissances} onChange={(e) => setConfig({ ...config, connaissances: e.target.value })} rows={9}
                        placeholder={"Colle ici tout ce que l'agent doit savoir :\n- tes offres et tes tarifs\n- tes horaires et ta zone d'intervention\n- tes conditions (délais, paiement, annulation)\n- les questions que tes clients posent le plus, avec tes réponses"}
                        className={`${champ} resize-y`} />
                      <p className="mt-1 text-[11px] text-white/40">{config.connaissances.length.toLocaleString("fr-FR")} / 30 000 caractères. L'agent ne répond qu'à partir de ces informations.</p>
                    </div>
                    <div>
                      <label className={etiquette}>Qui prévenir quand un humain doit répondre ?</label>
                      <input value={config.contact_humain} onChange={(e) => setConfig({ ...config, contact_humain: e.target.value })} placeholder="Ex. Julie, au 06 00 00 00 00 ou contact@atelier-martin.fr" className={champ} />
                    </div>
                    <button onClick={enregistrer} disabled={enregistrement || (agent && !modifie)}
                      className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-[13px] font-semibold text-navy-900 disabled:opacity-50">
                      {enregistrement ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {agent ? (modifie ? "Enregistrer les modifications" : "Enregistré") : "Créer mon agent"}
                    </button>
                  </div>

                  <div className="space-y-4 lg:col-span-2">
                    <div className="rounded-2xl border border-gold/30 bg-gold/[0.06] p-6">
                      <h3 className="font-display text-[15px] font-semibold text-white">Comment ça marche</h3>
                      <ol className="mt-3 space-y-2.5 text-[12.5px] text-white/70">
                        {["Donne à l'agent tes informations : offres, tarifs, horaires, FAQ.",
                          "Teste-le dans l'onglet « Tester » avec les vraies questions de tes clients.",
                          "Ajuste tes informations jusqu'à ce que les réponses te conviennent.",
                          "Zayado l'installe sur ton site à ta marque."].map((t, i) => (
                          <li key={t} className="flex gap-2.5">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold text-navy-900" style={{ background: GOLD }}>{i + 1}</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[12px] text-white/60">
                      <ShieldCheck size={14} className="mt-0.5 shrink-0" style={{ color: GOLD }} />
                      <span>Si une information manque, l'agent le dit honnêtement et propose de transmettre la demande à la personne indiquée. Il n'invente ni prix, ni délai, ni disponibilité.</span>
                    </div>
                  </div>
                </div>
              )}

              {tab === "test" && (
                agent
                  ? <TestConversation agent={agent} modifie={modifie} couleur={couleur} onEnregistrer={enregistrer} />
                  : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
                      <Bot size={28} className="mx-auto" style={{ color: GOLD }} />
                      <p className="mt-3 text-[14px] text-white/75">Crée d'abord ton agent dans l'onglet Configuration, puis teste-le ici.</p>
                      <button onClick={() => setTab("config")} className="mt-4 rounded-xl bg-gold px-5 py-2.5 text-[13px] font-semibold text-navy-900">Configurer mon agent</button>
                    </div>
                  )
              )}

              {tab === "plan" && (
                <div>
                  {quota === 0 && (
                    <p className="mb-4 rounded-xl border border-gold/30 bg-gold/[0.06] px-4 py-3 text-[13px] text-white/80">
                      L'Agent Business est inclus dans les offres ci-dessous. Choisis celle qui correspond à ton activité.
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    {(() => {
                      const o = OFFRE_PRO;
                      const fonda = fondateur?.ouverte ? prixFondateurMois(o, "mensuel") : null;
                      return (
                        <div className="relative flex flex-col rounded-2xl border border-gold bg-gold/[0.08] p-6">
                          <span className="absolute -top-3 left-6 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-navy-900" style={{ background: GOLD }}>
                            {fonda != null ? "Tarif fondateur" : "Agent Business inclus"}
                          </span>
                          <div className="font-display text-[16px] font-bold" style={{ color: GOLD }}>{o.nom}</div>
                          <p className="mt-1 text-[12px] text-white/50">{o.pourQui}</p>
                          <div className="mt-3 flex items-baseline gap-2">
                            {fonda != null && <span className="text-[18px] font-semibold text-white/40 line-through">{o.mensuel} €</span>}
                            <span className="font-display text-[34px] font-semibold">{fonda ?? o.mensuel}</span>
                            <span className="text-[13px] text-white/50">€ HT / mois</span>
                          </div>
                          {fonda != null && (
                            <p className="mt-1 text-[11.5px] text-white/60">
                              Garanti tant que tu restes abonné · {fondateur.places} premières places, jusqu'au {dateFinFr(fondateur.fin)}
                            </p>
                          )}
                          <p className="mt-3 flex items-start gap-2 text-[12.5px] font-semibold text-white">
                            <Bot size={13} className="mt-0.5 shrink-0" style={{ color: GOLD }} /> 1 agent à ta marque, inclus avec tout le Cockpit
                          </p>
                          <ul className="mt-2 flex-1 space-y-2">
                            {o.points.map((f) => (
                              <li key={f} className="flex items-start gap-2 text-[12.5px] text-white/75">
                                <Check size={13} className="mt-0.5 shrink-0" style={{ color: GOLD }} /><span>{f}</span>
                              </li>
                            ))}
                          </ul>
                          <button onClick={() => payer("pro")} disabled={paiement}
                            className="mt-5 flex items-center justify-center gap-1.5 rounded-lg bg-gold py-2.5 text-[12.5px] font-semibold text-navy-900 disabled:opacity-60">
                            Choisir Pro <ArrowRight size={13} />
                          </button>
                        </div>
                      );
                    })()}
                    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                      <div className="font-display text-[16px] font-bold" style={{ color: GOLD }}>Équipe et Entreprise</div>
                      <p className="mt-1 text-[12px] text-white/50">Pour les TPE et les structures plus grandes</p>
                      <div className="mt-3 font-display text-[26px] font-semibold">Nous contacter</div>
                      <ul className="mt-4 flex-1 space-y-2">
                        {["Plusieurs agents clients", "Agent qui répond à partir de vos documents", "Plusieurs comptes utilisateurs", "Votre domaine, accompagnement dédié"].map((f) => (
                          <li key={f} className="flex items-start gap-2 text-[12.5px] text-white/75">
                            <Check size={13} className="mt-0.5 shrink-0" style={{ color: GOLD }} /><span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <a href="mailto:contact@zayado.net?subject=Agent Business – offre Équipe ou Entreprise"
                        className="mt-5 flex items-center justify-center gap-1.5 rounded-lg border border-white/20 py-2.5 text-[12.5px] font-semibold text-white/80">
                        Nous contacter <ArrowRight size={13} />
                      </a>
                    </div>
                  </div>
                  <p className="mt-4 text-center text-[11.5px] text-white/40">Prix HT, sans engagement, résiliable en 1 clic. Paiement sécurisé par Mollie.</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function TestConversation({ agent, modifie, couleur, onEnregistrer }) {
  const [messages, setMessages] = useState([{ role: "agent", texte: agent.message_accueil }]);
  const [saisie, setSaisie] = useState("");
  const [attente, setAttente] = useState(false);
  const bas = useRef(null);
  useEffect(() => { bas.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, attente]);

  const envoyer = async (texte) => {
    const q = (texte ?? saisie).trim();
    if (!q || attente) return;
    const historique = messages.slice(1);
    setMessages((m) => [...m, { role: "client", texte: q }]);
    setSaisie("");
    setAttente(true);
    try {
      const r = await testerAgentBusiness(agent.id, q, historique);
      setMessages((m) => [...m, { role: "agent", texte: r.reponse }]);
      if (r.ia === false) toast.warning("Réponse automatique : la clé Mammouth AI (MAMMOTH_API_KEY) n'est pas configurée sur le serveur.");
    } catch {
      setMessages((m) => [...m, { role: "agent", texte: "(L'IA n'a pas répondu. Réessaie dans un instant.)", erreur: true }]);
    } finally { setAttente(false); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3">
        {modifie && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/30 bg-gold/[0.06] px-4 py-2.5 text-[12.5px] text-white/80">
            <span>Tu as des modifications non enregistrées : le test utilise la dernière version enregistrée.</span>
            <button onClick={onEnregistrer} className="rounded-lg bg-gold px-3 py-1.5 text-[12px] font-semibold text-navy-900">Enregistrer</button>
          </div>
        )}
        <div className="mx-auto flex h-[520px] max-w-md flex-col overflow-hidden rounded-3xl border border-white/15 bg-navy-800 shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-3" style={{ background: couleur }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25"><Bot size={17} className="text-white" /></div>
            <div className="flex-1">
              <div className="text-[13px] font-bold text-white">{agent.nom_marque || "Ma marque"}</div>
              <div className="flex items-center gap-1 text-[10px] text-white/90"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> En ligne</div>
            </div>
            <button onClick={() => setMessages([{ role: "agent", texte: agent.message_accueil }])} title="Recommencer" className="text-white/80 hover:text-white"><RotateCcw size={15} /></button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[12.5px] ${m.role === "client" ? "ml-auto rounded-br-md font-medium text-navy-900" : `rounded-bl-md bg-white/10 ${m.erreur ? "text-white/50" : "text-white"}`}`}
                style={m.role === "client" ? { background: couleur } : {}}>
                {m.texte}
              </div>
            ))}
            {attente && <div className="flex w-16 items-center justify-center rounded-2xl rounded-bl-md bg-white/10 py-2.5"><Loader2 size={14} className="animate-spin text-white/70" /></div>}
            <div ref={bas} />
          </div>
          <div className="flex items-center gap-2 border-t border-white/10 p-3">
            <input value={saisie} onChange={(e) => setSaisie(e.target.value)} onKeyDown={(e) => e.key === "Enter" && envoyer()}
              placeholder="Écrivez votre question…" className="flex-1 rounded-full bg-white/5 px-3.5 py-2 text-[12.5px] text-white outline-none" />
            <button onClick={() => envoyer()} disabled={attente || !saisie.trim()} className="flex h-9 w-9 items-center justify-center rounded-full text-navy-900 disabled:opacity-50" style={{ background: couleur }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
      <div className="space-y-3 lg:col-span-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h3 className="font-display text-[14px] font-semibold">Questions à essayer</h3>
          <div className="mt-3 flex flex-col gap-2">
            {EXEMPLES.map((q) => (
              <button key={q} onClick={() => envoyer(q)} disabled={attente} className="rounded-xl border border-white/15 px-3 py-2 text-left text-[12.5px] text-white/80 hover:border-gold disabled:opacity-50">{q}</button>
            ))}
          </div>
        </div>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[12px] text-white/55">
          C'est une vraie conversation avec l'IA, à partir de ta base de connaissance. Pose aussi une question dont la réponse n'y figure pas : l'agent doit le reconnaître et proposer de transmettre la demande.
        </p>
      </div>
    </div>
  );
}
