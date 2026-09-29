import React, { useEffect, useRef, useState } from "react";
import {
  Sparkles, Send, Mic, Lightbulb, BatteryLow, Compass, X, Loader2,
  Sun, ListChecks, Newspaper, Check, Clock, XCircle, ExternalLink, RefreshCw, Mail, Bookmark,
  Maximize2, Minimize2, CloudCheck, Users, Scale, Copy,
} from "lucide-react";
import CollaborateurModal from "./CollaborateurModal";
import { prendreOngletEnAttente, prendrePromptEnAttente, discuterAvecIA } from "./GlobalChat";
import { useKairos } from "@/context/KairosContext";
import {
  streamChat, fetchPointDuJour, fetchDecisions, suggererDecisions, patchDecision, fetchActualite, enregistrerArticle, fetchEnregistres, validerDecisionEmail,
  saveProfile,
} from "@/lib/kairosApi";
import { toast } from "sonner";

// Derniers échanges du chat, joints (si on le souhaite) au message pour un collaborateur.
const contexteChat = { texte: "" };

const SHORTCUTS = [
  { key: "capture", icon: Lightbulb, label: "Capturer une idée", prompt: "J'ai une idée à capturer, aide-moi à la clarifier en une phrase." },
  { key: "recuperation", icon: BatteryLow, label: "Je suis à plat", prompt: "Je me sens à plat aujourd'hui. Aide-moi à alléger ma journée." },
  { key: "next", icon: Compass, label: "Que faire maintenant ?", prompt: "Compte tenu de mon énergie, que devrais-je faire maintenant ?" },
  { key: "juridique", icon: Scale, label: "Question juridique", prompt: "J'ai une question juridique. Demande-moi ma situation, les faits utiles, les dates importantes et les documents concernés, puis réponds-moi avec les règles de droit applicables." },
];

const TABS = [
  { key: "chat", label: "Assistant", icon: Sparkles },
  { key: "decisions", label: "Décisions", icon: ListChecks },
  { key: "actu", label: "Actualité", icon: Newspaper },
];

export function ChatBody({ onClose, estElargi, onToggleTaille }) {
  const { user } = useKairos();
  // Onglet initial : celui demandé par openChat("actu" | "decisions" | "chat"),
  // consommé ici — fiable même si le panneau vient tout juste de se monter.
  const [tab, setTab] = useState(() => prendreOngletEnAttente() || "chat");
  const [cloudSync, setCloudSync] = useState(null);
  // Bouton « Collaborateur » : message important à l'équipe humaine, avec le contexte du chat.
  const [collab, setCollab] = useState(null); // null = fermé, sinon { contexte }
  useEffect(() => {
    const ouvrir = (e) => setCollab({ contexte: e?.detail?.contexte || "" });
    window.addEventListener("zayado:ouvrir-collaborateur", ouvrir);
    return () => window.removeEventListener("zayado:ouvrir-collaborateur", ouvrir);
  }, []);

  // Un clic sur « Scoops » (rail gauche) bascule ce panneau sur l'onglet Actualité
  useEffect(() => {
    const ouvrir = () => setTab("actu");
    const decisions = () => setTab("decisions");
    // « En parler à l'IA » depuis un article : bascule sur l'Assistant —
    // le texte est consommé par ChatTab au montage (ou via l'événement si déjà monté).
    const prompt = () => setTab("chat");
    window.addEventListener("kairos:ouvrir-actu", ouvrir);
    window.addEventListener("kairos:ouvrir-decisions", decisions);
    window.addEventListener("kairos:prompt-chat", prompt);
    return () => { window.removeEventListener("kairos:ouvrir-actu", ouvrir); window.removeEventListener("kairos:ouvrir-decisions", decisions); window.removeEventListener("kairos:prompt-chat", prompt); };
  }, []);

  useEffect(() => {
    const onSync = (event) => setCloudSync(event.detail || { provider: "cloud" });
    window.addEventListener("zayado:cloud-sync", onSync);
    return () => window.removeEventListener("zayado:cloud-sync", onSync);
  }, []);

  return (
    <div className="relative flex h-full flex-col">
      <CollaborateurModal open={!!collab} contexte={collab?.contexte || ""} onClose={() => setCollab(null)} />
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/15 ring-1 ring-gold/30">
            <Sparkles className="h-4 w-4 text-gold" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-bold text-offwhite">Copilote IA Zayado</div>
            <div className="text-[10px] text-offwhite/50">Ton apaisé · IA</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {cloudSync && (
            <span className="mr-1 inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300" title={`Document transmis dans ${cloudSync.provider === "google" ? "Google Drive" : "OneDrive / SharePoint"}`} data-testid="chat-cloud-sync-status">
              <CloudCheck className="h-3.5 w-3.5" /> Transmis
            </span>
          )}
          <button onClick={() => setCollab({ contexte: contexteChat.texte })}
            className="mr-1 inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1.5 text-[11px] font-semibold text-gold hover:bg-gold/20"
            title="Écrire à un collaborateur de l'équipe Zayado" data-testid="chat-collaborateur-btn">
            <Users className="h-3.5 w-3.5" /> Collaborateur
          </button>
          {onToggleTaille && (
            <button onClick={onToggleTaille} className="rounded-lg p-1.5 text-offwhite/50 hover:bg-white/5 hover:text-offwhite" data-testid="chat-toggle-taille-btn" title={estElargi ? "Réduire" : "Agrandir"}>
              {estElargi ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="rounded-lg p-1.5 text-offwhite/50 hover:bg-white/5 hover:text-offwhite" data-testid="chat-close-btn">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-white/10 px-3 py-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={`assistant-tab-${t.key}`}
            className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
              tab === t.key ? "bg-gold/15 text-gold" : "text-offwhite/55 hover:text-offwhite"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "chat" && <ChatTab firstName={user.firstName} />}
        {tab === "decisions" && <DecisionsTab />}
        {tab === "actu" && <ActuTab />}
      </div>
    </div>
  );
}

// ── Onglet Assistant (chat streaming + raccourcis) ──
// Question de 1ère connexion : rythme de l'alerte Actualité (cloche).
const RYTHMES_ACTU = [
  { key: "quotidien", label: "Chaque matin", confirm: "Parfait — la cloche te signalera l'actualité chaque matin. Tu peux changer ça à tout moment dans Paramètres → Notifications." },
  { key: "lundi", label: "Le lundi uniquement", confirm: "C'est noté — l'alerte Actualité n'arrivera que le lundi, pour démarrer la semaine. Ton briefing reste disponible ici à tout moment." },
  { key: "jamais", label: "Jamais, je la consulterai moi-même", confirm: "Très bien — pas d'alerte. Ton briefing t'attend dans l'onglet Actualité quand tu en as envie." },
];

function ChatTab({ firstName }) {
  const { mode, contexte } = useKairos();
  const accueil = `Bonjour${firstName ? ` ${firstName}` : ""}. Je suis le Copilote IA Zayado, là pour t'accompagner en douceur. Par quoi commence-t-on ?`;
  const [messages, setMessages] = useState([{ role: "assistant", content: accueil }]);
  useEffect(() => {
    contexteChat.texte = messages.slice(1).slice(-8)
      .map((m) => `${m.role === "user" ? "Moi" : "Copilote"} : ${String(m.content || "").slice(0, 600)}`).join("\n");
  }, [messages]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef(null);

  // Le profil arrive souvent après le 1er rendu : tant que la conversation
  // n'a pas démarré, on met à jour le message d'accueil avec le prénom.
  useEffect(() => {
    setMessages((m) => (m.length === 1 && m[0].role === "assistant" && m[0].content !== accueil ? [{ role: "assistant", content: accueil }] : m));
  }, [accueil]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content) return;
    if (streaming) { setInput(content); return; } // réponse en cours : le texte attend dans le champ
    setInput("");
    setMessages((m) => [...m, { role: "user", content }, { role: "assistant", content: "" }]);
    setStreaming(true);
    await streamChat({
      message: content, page: `mode:${mode}`,
      onDelta: (delta) => setMessages((m) => {
        const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], content: c[c.length - 1].content + delta }; return c;
      }),
      onSources: (sources, juridique) => setMessages((m) => {
        const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], sources, juridique }; return c;
      }),
      onDone: () => setStreaming(false),
      onError: (err) => { setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: `Désolé, ${err}` }; return c; }); setStreaming(false); },
    });
  };

  // « Copier la réponse » (façon Kandbaz) : texte + liens des sources.
  const copierReponse = (m) => {
    const lignes = [m.content, ...(m.sources || []).map((s) => `• ${s.titre} — ${s.url}`)];
    navigator.clipboard?.writeText(lignes.join("\n\n"))
      .then(() => toast.success("Réponse copiée."))
      .catch(() => toast.error("Copie impossible pour le moment."));
  };

  // Clic sur une actualité (« résumé IA » / « En parler à l'IA ») : la question
  // est ENVOYÉE directement — le résumé s'affiche sans avoir à appuyer sur
  // envoyer. Anti-doublon : au montage le prompt en attente est consommé ET
  // l'événement « kairos:prompt-chat » arrive ~80 ms après avec le même texte.
  const sendRef = useRef(null);
  sendRef.current = send;
  const dernierPromptRef = useRef(null);
  const accueillirPrompt = (q) => {
    if (!q) return;
    const d = dernierPromptRef.current;
    if (d && d.q === q && Date.now() - d.ts < 3000) return;
    dernierPromptRef.current = { q, ts: Date.now() };
    sendRef.current?.(q);
  };
  useEffect(() => {
    accueillirPrompt(prendrePromptEnAttente());
    const injecter = (e) => { prendrePromptEnAttente(); accueillirPrompt(e?.detail); };
    window.addEventListener("kairos:prompt-chat", injecter);
    return () => window.removeEventListener("kairos:prompt-chat", injecter);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 1ère connexion : le Copilote demande le rythme de l'alerte Actualité et
  // l'enregistre lui-même (au lieu du défaut « tous les jours » silencieux).
  const [rythmeActu, setRythmeActu] = useState(() => contexte?.actu_rythme || null);
  useEffect(() => { if (!rythmeActu && contexte?.actu_rythme) setRythmeActu(contexte.actu_rythme); }, [contexte]); // eslint-disable-line react-hooks/exhaustive-deps
  const choisirRythme = (r) => {
    setRythmeActu(r.key);
    saveProfile({ contexte_metier: { actu_rythme: r.key } }).catch(() => {});
    setMessages((m) => [...m, { role: "user", content: r.label }, { role: "assistant", content: r.confirm }]);
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`chat-msg-${m.role}`}>
            <div className={`max-w-[85%] ${m.role === "assistant" ? "space-y-2" : ""}`}>
              <div className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "bg-gold text-navy-900" : "border border-white/10 bg-white/5 text-offwhite"
              }`}>
                {m.content || (streaming && i === messages.length - 1 ? <Loader2 className="h-4 w-4 animate-spin text-gold" /> : null)}
              </div>
              {m.role === "assistant" && m.content && !(streaming && i === messages.length - 1) && (
                <button onClick={() => copierReponse(m)} data-testid={`chat-copy-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10.5px] font-medium text-offwhite/55 transition hover:border-gold/40 hover:text-gold">
                  <Copy size={11} /> Copier la réponse
                </button>
              )}
              {m.juridique && (
                <p className="rounded-xl border border-amber-300/25 bg-amber-300/5 px-3 py-2 text-[10.5px] italic leading-relaxed text-offwhite/60" data-testid="chat-juridique-mention">
                  IA juridique : informations générales, qui ne constituent pas une consultation juridique et peuvent être inexactes. En cas de doute, rapproche-toi d'un professionnel du droit (avocat, notaire).
                </p>
              )}
              {m.sources?.length > 0 && (
                <div className="space-y-1.5" data-testid="chat-sources">
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold/80">Sources officielles</p>
                  {m.sources.map((s, k) => (
                    <a key={k} href={s.url} target="_blank" rel="noreferrer" data-testid={`chat-source-${k}`}
                      className="flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/5 px-3 py-2 text-xs text-offwhite/85 transition hover:border-gold/50 hover:bg-gold/10">
                      <Scale size={13} className="shrink-0 text-gold" />
                      <span className="min-w-0 flex-1 truncate">{s.titre}</span>
                      <span className="hidden shrink-0 text-[10px] text-offwhite/45 sm:inline">{s.organisme}</span>
                      <ExternalLink size={12} className="shrink-0 text-gold" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {messages.length === 1 && !streaming && !rythmeActu && (
          <div className="rounded-2xl border border-gold/25 bg-gold/5 p-4" data-testid="actu-rythme-question">
            <p className="text-sm leading-relaxed text-offwhite/90">Avant de commencer : à quel rythme veux-tu que la cloche te signale <b>l'actualité de ton marché</b> ?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {RYTHMES_ACTU.map((r) => (
                <button key={r.key} onClick={() => choisirRythme(r)} data-testid={`actu-rythme-${r.key}`}
                  className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/20">
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-white/10 px-4 py-3">
        <div className="mb-3 flex flex-wrap gap-2">
          {/* Bouton « Écrire à un collaborateur » retiré ici : doublon exact du bouton
              « Collaborateur » déjà présent en permanence dans l'en-tête du chat
              (même action, même modale — data-testid="chat-collaborateur-btn"). */}
          {SHORTCUTS.map((s) => (
            <button key={s.key} onClick={() => send(s.prompt)} disabled={streaming} data-testid={`ai-shortcut-${s.key}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-offwhite/80 transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50">
              <s.icon className="h-3.5 w-3.5 text-gold" /> {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Écris au Copilote IA…" data-testid="chat-input"
              className="max-h-32 w-full resize-none rounded-xl border border-white/10 bg-white/5 py-2.5 pl-3 pr-10 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30" />
            <button className="absolute right-2 top-2 rounded-lg p-1 text-offwhite/50 hover:text-gold" title="Vocal (bientôt)" data-testid="chat-mic-btn">
              <Mic className="h-4 w-4" />
            </button>
          </div>
          <button onClick={() => send()} disabled={streaming || !input.trim()} className="btn-gold h-11 px-3.5 disabled:opacity-50" data-testid="chat-send-btn">
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Onglet Point du jour ──
function PointTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { setData(await fetchPointDuJour()); } catch { setData({ texte: "Indisponible pour le moment." }); } setLoading(false); };
  useEffect(() => { load(); }, []);
  return (
    <div className="h-full overflow-y-auto px-5 py-5" data-testid="point-du-jour">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Ton point du jour</p>
        <button onClick={load} className="rounded-lg p-1.5 text-offwhite/50 hover:text-gold" data-testid="point-refresh"><RefreshCw className="h-4 w-4" /></button>
      </div>
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-gold" /> : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-offwhite/90 whitespace-pre-wrap">{data?.texte}</div>
      )}
    </div>
  );
}

// ── Onglet Décisions ──
function DecisionsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { const r = await fetchDecisions(); setItems(r.decisions || []); } catch {} setLoading(false); };
  useEffect(() => { load(); }, []);

  const decide = async (id, statut, canal) => {
    try {
      await patchDecision(id, statut, canal);
      const label = { approuvee: "Approuvée", reportee: "Reportée", refusee: "Refusée" }[statut];
      toast.success(canal === "email" ? `${label} · validée par email` : canal === "telegram" ? `${label} · via Telegram (bientôt)` : label);
      load();
    } catch { toast.error("Action impossible."); }
  };
  const suggest = async () => { try { await suggererDecisions(); load(); } catch {} };

  const enAttente = items.filter((d) => d.statut === "proposee");
  const STAT = { approuvee: { t: "Approuvée", c: "text-emerald-300" }, reportee: { t: "Reportée", c: "text-offwhite/60" }, refusee: { t: "Refusée", c: "text-offwhite/40" } };

  return (
    <div className="h-full overflow-y-auto px-4 py-4" data-testid="decisions-tab">
      <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Il prépare, tu décides</p>
      <p className="mb-3 px-1 text-xs text-offwhite/55">Rien n'est envoyé sans ta validation.</p>
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-gold" /> : (
        <div className="space-y-3">
          {items.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-offwhite/70">
              Aucune décision pour l'instant.
              <button onClick={suggest} className="btn-ghost mt-3 w-full text-sm" data-testid="decisions-suggest">Demander des propositions</button>
            </div>
          )}
          {items.map((d) => (
            <div key={d.id} className="rounded-xl border border-white/10 bg-white/5 p-3.5" data-testid={`decision-${d.id}`}>
              <p className="text-sm font-medium text-offwhite">{d.titre}</p>
              {d.note && <p className="mt-1 text-xs leading-relaxed text-offwhite/60">{d.note}</p>}
              {d.statut === "proposee" ? (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <button onClick={() => decide(d.id, "approuvee", "in-app")} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold px-2 py-1.5 text-xs font-semibold text-navy-900" data-testid={`decision-approve-${d.id}`}><Check className="h-3.5 w-3.5" /> Approuver</button>
                    <button onClick={() => decide(d.id, "reportee")} className="rounded-lg border border-white/12 bg-white/5 px-2.5 py-1.5 text-xs text-offwhite/80" data-testid={`decision-postpone-${d.id}`}><Clock className="h-3.5 w-3.5" /></button>
                    <button onClick={() => decide(d.id, "refusee")} className="rounded-lg border border-white/12 bg-white/5 px-2.5 py-1.5 text-xs text-offwhite/80" data-testid={`decision-refuse-${d.id}`}><XCircle className="h-3.5 w-3.5" /></button>
                  </div>
                  <button onClick={async () => { try { await validerDecisionEmail(d.id); toast.success("Approuvée · email de confirmation envoyé"); load(); } catch (e) { toast.error("Ajoute ton email dans Paramètres pour valider par email."); } }} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] text-offwhite/60 hover:text-gold" data-testid={`decision-email-${d.id}`}>
                    <Mail className="h-3.5 w-3.5" /> Valider par email (envoi réel)
                  </button>
                </div>
              ) : (
                <p className={`mt-2 text-xs font-semibold ${STAT[d.statut]?.c}`}>{STAT[d.statut]?.t}{d.canal === "email" ? " · par email" : ""}</p>
              )}
            </div>
          ))}
          {items.length > 0 && enAttente.length === 0 && (
            <button onClick={suggest} className="btn-ghost w-full text-sm" data-testid="decisions-suggest">Proposer d'autres décisions</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Onglet Actualité (digest piloté par l'énergie) ──
function ActuTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enregistres, setEnregistres] = useState([]);
  // Corrigé : le pays/marché n'a plus à être choisi ici via des boutons —
  // c'est réglé une fois dans Paramètres (ou à l'onboarding), le chat lit
  // simplement le réglage du profil, comme le fait déjà le serveur.
  const load = async () => { setLoading(true); try { setData(await fetchActualite()); } catch { setData({ erreur: true, articles: [] }); } setLoading(false); };
  const chargerEnregistres = async () => { try { const d = await fetchEnregistres(); setEnregistres(d?.articles || []); } catch { /* silencieux */ } };
  useEffect(() => { load(); chargerEnregistres(); }, []);

  return (
    <div className="h-full overflow-y-auto px-4 py-4" data-testid="actu-tab">
      <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Actualité de ton marché</p>
      <p className="mb-3 px-1 text-xs text-offwhite/55">Un résumé court, jamais un fil d'actus infini.</p>
      {data?.genere_a && !data?.masque && !data?.erreur && (
        <p className="mb-3 px-1 text-[10.5px] text-offwhite/40" data-testid="actu-dates">
          Généré le {new Date(data.genere_a).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          {data.prochaine_maj && <> · prochaine actualisation vers {new Date(data.prochaine_maj).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</>}
        </p>
      )}
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-gold" /> : data?.masque ? (
        <div className="rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm leading-relaxed text-offwhite/85" data-testid="actu-masque">
          {data.raison}
        </div>
      ) : data?.erreur ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-offwhite/60">Actualité momentanément indisponible.</div>
      ) : (
        <div className="space-y-2.5">
          {(data?.articles || []).map((a, i) => {
            const dejaSauve = enregistres.some((e) => e.titre === a.titre);
            return (
            <div key={i}
              onClick={() => discuterAvecIA(`Fais-moi un résumé clair et actionnable de cette actualité, en 4 points : ce qui se passe, pourquoi c'est important, ce que ça change pour un indépendant, et ce que je devrais faire : « ${a.titre} » (${a.lien})`)}
              className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:border-gold/30 hover:bg-white/[0.07]"
              title="Cliquer pour ouvrir le résumé IA"
              data-testid={`actu-item-${i}`}>
              {a.source === "officiel" && (
                <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-gold" data-testid={`actu-officiel-${i}`}>
                  Officiel · {a.source_label || "source officielle"}
                </span>
              )}
              <p className="text-sm font-medium leading-snug text-offwhite">{a.titre}</p>
              {a.resume && <p className="mt-1 line-clamp-2 text-xs text-offwhite/55">{a.resume}</p>}
              <div className="mt-2 flex items-center justify-between">
                <a href={a.lien} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[10px] text-gold" data-testid={`actu-lire-${i}`}>Lire <ExternalLink className="h-3 w-3" /></a>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); discuterAvecIA(`Parle-moi de cette actualité et de ce qu'elle change concrètement pour mon activité : « ${a.titre} » (${a.lien})`); }}
                    className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-1 text-[10px] font-medium text-gold hover:bg-gold/20"
                    data-testid={`actu-discuter-${i}`}
                  >
                    <Sparkles className="h-3 w-3" /> En parler à l'IA
                  </button>
                  <button
                    onClick={async (e) => { e.stopPropagation(); if (dejaSauve) return; try { await enregistrerArticle(a.titre, a.lien); toast.success("Article enregistré — retrouve-le dans « Tes articles enregistrés » ci-dessous."); chargerEnregistres(); } catch { toast.error("Enregistrement impossible."); } }}
                    disabled={dejaSauve}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] ${dejaSauve ? "border-emerald-500/40 text-emerald-300" : "border-white/10 text-offwhite/70 hover:border-gold/40 hover:text-gold"}`}
                    data-testid={`actu-save-${i}`}
                  >
                    {dejaSauve ? <Check className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />} {dejaSauve ? "Enregistré" : "Enregistrer"}
                  </button>
                </div>
              </div>
            </div>
            );
          })}
          {(data?.articles || []).length === 0 && data?.vide_pref && (
            <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-offwhite/60">
              Toutes les sources sont coupées dans tes réglages. Réactive-en au moins une dans Paramètres → Notifications.
            </p>
          )}
          {enregistres.length > 0 && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid="actu-enregistres">
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-offwhite/50">Tes articles enregistrés</p>
              {enregistres.map((e) => (
                <a key={e.id} href={e.lien} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-1 text-xs text-offwhite/75 hover:text-gold" data-testid={`actu-enregistre-${e.id}`}>
                  <Bookmark className="h-3 w-3 shrink-0 text-gold" /> <span className="truncate">{e.titre}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatPanel() {
  // Un seul design de chat partout : le panneau marine OPAQUE (.chat-zayado),
  // comme le chat global. L'ancien fond « verre » translucide (.fenetre)
  // laissait voir la page derrière — retiré à la demande.
  // Ajouté aussi le bouton réduire/agrandir demandé.
  const [estElargi, setEstElargi] = useState(false);
  return (
    <div
      className={`chat-zayado hidden xl:flex fixed right-0 top-0 z-20 h-screen flex-col transition-[width] duration-200 ${estElargi ? "w-[640px]" : "w-[360px]"}`}
      data-testid="chat-panel"
    >
      <ChatBody estElargi={estElargi} onToggleTaille={() => setEstElargi((v) => !v)} />
    </div>
  );
}

export function ChatBubble({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="chat-zayado fixed inset-0 z-50 flex flex-col xl:hidden" data-testid="chat-bubble">
      <ChatBody onClose={onClose} />
    </div>
  );
}
