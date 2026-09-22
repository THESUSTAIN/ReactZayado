import React, { useEffect, useRef, useState } from "react";
import {
  Sparkles, Send, Mic, Lightbulb, BatteryLow, Compass, X, Loader2,
  Sun, ListChecks, Newspaper, Check, Clock, XCircle, ExternalLink, RefreshCw, Mail, Bookmark,
  Maximize2, Minimize2,
} from "lucide-react";
import { useKairos } from "@/context/KairosContext";
import {
  streamChat, fetchPointDuJour, fetchDecisions, suggererDecisions, patchDecision, fetchActualite, enregistrerArticle, validerDecisionEmail,
} from "@/lib/kairosApi";
import { toast } from "sonner";

const SHORTCUTS = [
  { key: "capture", icon: Lightbulb, label: "Capturer une idée", prompt: "J'ai une idée à capturer, aide-moi à la clarifier en une phrase." },
  { key: "recuperation", icon: BatteryLow, label: "Je suis à plat", prompt: "Je me sens à plat aujourd'hui. Aide-moi à alléger ma journée." },
  { key: "next", icon: Compass, label: "Que faire maintenant ?", prompt: "Compte tenu de mon énergie, que devrais-je faire maintenant ?" },
];

const TABS = [
  { key: "chat", label: "Assistant", icon: Sparkles },
  { key: "decisions", label: "Décisions", icon: ListChecks },
  { key: "actu", label: "Actualité", icon: Newspaper },
];

function ChatBody({ onClose, estElargi, onToggleTaille }) {
  const { user } = useKairos();
  const [tab, setTab] = useState("chat");

  // Un clic sur « Scoops » (rail gauche) bascule ce panneau sur l'onglet Actualité
  useEffect(() => {
    const ouvrir = () => setTab("actu");
    window.addEventListener("kairos:ouvrir-actu", ouvrir);
    return () => window.removeEventListener("kairos:ouvrir-actu", ouvrir);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/15 ring-1 ring-gold/30">
            <Sparkles className="h-4 w-4 text-gold" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-bold text-offwhite">Assistant Kairos</div>
            <div className="text-[10px] text-offwhite/50">Ton apaisé · IA</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
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
function ChatTab({ firstName }) {
  const { mode } = useKairos();
  const accueil = `Bonjour${firstName ? ` ${firstName}` : ""}. Je suis Kairos, là pour t'accompagner en douceur. Par quoi commence-t-on ?`;
  const [messages, setMessages] = useState([{ role: "assistant", content: accueil }]);
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
    if (!content || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content }, { role: "assistant", content: "" }]);
    setStreaming(true);
    await streamChat({
      message: content, page: `mode:${mode}`,
      onDelta: (delta) => setMessages((m) => {
        const c = [...m]; c[c.length - 1] = { role: "assistant", content: c[c.length - 1].content + delta }; return c;
      }),
      onDone: () => setStreaming(false),
      onError: (err) => { setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: `Désolé, ${err}` }; return c; }); setStreaming(false); },
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`chat-msg-${m.role}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === "user" ? "bg-gold text-navy-900" : "border border-white/10 bg-white/5 text-offwhite"
            }`}>
              {m.content || (streaming && i === messages.length - 1 ? <Loader2 className="h-4 w-4 animate-spin text-gold" /> : null)}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 px-4 py-3">
        <div className="mb-3 flex flex-wrap gap-2">
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
              placeholder="Écris à Kairos…" data-testid="chat-input"
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
  const [marche, setMarche] = useState("france");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = async (m) => { setLoading(true); try { setData(await fetchActualite(m)); } catch { setData({ erreur: true, articles: [] }); } setLoading(false); };
  useEffect(() => { load(marche); }, [marche]);

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
      {data?.marches && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {data.marches.map((m) => (
            <button key={m.cle} onClick={() => setMarche(m.cle)} data-testid={`actu-marche-${m.cle}`}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${marche === m.cle ? "bg-gold/15 text-gold border border-gold/40" : "border border-white/10 bg-white/5 text-offwhite/60"}`}>
              {m.label}
            </button>
          ))}
        </div>
      )}
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-gold" /> : data?.masque ? (
        <div className="rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm leading-relaxed text-offwhite/85" data-testid="actu-masque">
          {data.raison}
        </div>
      ) : data?.erreur ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-offwhite/60">Actualité momentanément indisponible.</div>
      ) : (
        <div className="space-y-2.5">
          {(data?.articles || []).map((a, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:border-gold/30" data-testid={`actu-item-${i}`}>
              <p className="text-sm font-medium leading-snug text-offwhite">{a.titre}</p>
              {a.resume && <p className="mt-1 line-clamp-2 text-xs text-offwhite/55">{a.resume}</p>}
              <div className="mt-2 flex items-center justify-between">
                <a href={a.lien} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-gold">Lire <ExternalLink className="h-3 w-3" /></a>
                <button
                  onClick={async () => { try { await enregistrerArticle(a.titre, a.lien); toast.success("Article enregistré"); } catch { toast.error("Enregistrement impossible."); } }}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[10px] text-offwhite/70 hover:border-gold/40 hover:text-gold"
                  data-testid={`actu-save-${i}`}
                >
                  <Bookmark className="h-3 w-3" /> Enregistrer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatPanel() {
  // Corrigé : le panneau desktop utilisait .glass (dégradé bleu translucide),
  // visuellement différent du fond marine plein du mobile — deux styles
  // pour le même composant. Aligné sur le mobile pour la cohérence.
  // Ajouté aussi le bouton réduire/agrandir demandé.
  const [estElargi, setEstElargi] = useState(false);
  return (
    <div
      className={`hidden xl:flex fixed right-0 top-0 z-20 h-screen flex-col border-l border-white/10 bg-[#0B1F3A]/95 backdrop-blur-2xl transition-[width] duration-200 ${estElargi ? "w-[640px]" : "w-[360px]"}`}
      data-testid="chat-panel"
    >
      <ChatBody estElargi={estElargi} onToggleTaille={() => setEstElargi((v) => !v)} />
    </div>
  );
}

export function ChatBubble({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0B1F3A]/72 backdrop-blur-2xl xl:hidden" data-testid="chat-bubble">
      <ChatBody onClose={onClose} />
    </div>
  );
}
