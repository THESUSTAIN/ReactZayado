import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Check, CheckCircle2, Clock, ExternalLink, FileText, Handshake, Loader2,
  MessageCircle, Newspaper, Paperclip, RefreshCw, Send, ShieldCheck,
  Sparkles, Sun, X,
} from "lucide-react";
import {
  applyCopilotDecision, getChatHistory, getCopilotBrief, getCopilotConfig,
  getCopilotDecision, getCopilotNews, sendCopilotWorkRequest, streamChatMessage, uploadChatFile,
} from "../lib/api";

const SUGGESTIONS = [
  "Quelles sont mes priorités aujourd'hui ?",
  "Aide-moi à relancer une facture en retard.",
  "Comment améliorer ma trésorerie ?",
];

function getSessionId() {
  const key = "mx_copilot_session_id";
  let sessionId = localStorage.getItem(key);
  if (!sessionId) {
    sessionId = window.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, sessionId);
  }
  return sessionId;
}

function renderMarkdownLite(text) {
  const lines = String(text || "").split("\n");
  return lines.map((line, index) => {
    const isList = /^[-•]\s+/.test(line);
    const cleanLine = isList ? line.replace(/^[-•]\s+/, "") : line;
    const content = cleanLine.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) => (
      /^\*\*[^*]+\*\*$/.test(part)
        ? <strong key={partIndex}>{part.slice(2, -2)}</strong>
        : part
    ));
    if (isList) {
      return <div className="flex gap-2" key={index}><span className="text-[#D4AF37]">•</span><span>{content}</span></div>;
    }
    return <p className="m-0" key={index}>{content.length ? content : " "}</p>;
  });
}

function compactEuro(value) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value || 0);
}

function BriefCard({ data }) {
  if (!data) return null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bel après-midi" : "Bonsoir";
  const kpis = [
    { label: "CA du mois", value: compactEuro(data.ca_month), detail: data.ca_objective ? `Objectif ${compactEuro(data.ca_objective)}` : "Sans objectif défini", progress: data.pilotage?.progress_percent },
    { label: "Énergie", value: `${data.energy_score || 0}%`, detail: data.bien_etre_label || "À renseigner", progress: data.energy_score || 0 },
    { label: "Alignement", value: `${data.vision?.alignment_percent || 0}%`, detail: "Vision", progress: data.vision?.alignment_percent || 0 },
  ];
  return (
    <div className="glass mb-3 overflow-hidden border-[#D4AF37]/20 p-3" data-testid="copilot-brief-card">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#E8C96A]"><Sun size={13} /> Le point du jour</div>
      <div className="text-[14px] font-semibold text-white">{greeting}{data.user?.first_name ? ` ${data.user.first_name}` : ""}</div>
      <p className="m-0 mt-0.5 text-[11.5px] leading-relaxed text-white/75">Voici l’essentiel de ton cockpit en un coup d’œil.</p>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-white/20 bg-[rgba(66,102,162,0.24)] p-2">
            <div className="text-[9px] uppercase tracking-wide text-white/65">{kpi.label}</div>
            <div className="mt-0.5 truncate text-[12px] font-semibold text-white">{kpi.value}</div>
            <div className="mt-0.5 truncate text-[9px] text-white/65">{kpi.detail}</div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-[#D4AF37]" style={{ width: `${Math.min(100, Math.max(0, kpi.progress || 0))}%` }} /></div>
          </div>
        ))}
      </div>
      {data.vision?.next_step && <div className="mt-2.5 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-2 text-[11.5px] text-white/80"><strong className="text-[#F0DCA5]">Prochaine étape. </strong>{data.vision.next_step}</div>}
    </div>
  );
}

function ExecutionJourney({ decision, onOpenMission }) {
  const approved = decision?.status === "approved";
  const deferred = decision?.status === "deferred";
  const state = approved ? "Mission prête" : deferred ? "Décision reportée" : "Décision à valider";
  return (
    <div className="overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-[linear-gradient(135deg,rgba(53,87,148,0.48),rgba(18,34,75,0.72))] p-3.5 shadow-[0_12px_28px_rgba(4,9,28,0.22)]" data-testid="copilot-execution-journey">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#F0DCA5]"><Sparkles size={14} /> Votre boucle d’exécution</div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${approved ? "border-emerald-300/35 bg-emerald-300/15 text-emerald-100" : deferred ? "border-white/25 bg-white/10 text-white/80" : "border-[#D4AF37]/35 bg-[#D4AF37]/15 text-[#F6DEA0]"}`}>{state}</span>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1 text-center">
        <div><div className="text-[10px] font-bold text-white">Vision</div><div className="mt-0.5 text-[9px] text-white/70">cap</div></div>
        <ArrowRight size={13} className="text-[#D4AF37]" />
        <div><div className="text-[10px] font-bold text-white">Décision</div><div className="mt-0.5 text-[9px] text-white/70">aujourd’hui</div></div>
        <ArrowRight size={13} className="text-[#D4AF37]" />
        <div><div className="text-[10px] font-bold text-white">Mission</div><div className="mt-0.5 text-[9px] text-white/70">Bien-être</div></div>
      </div>
      {approved && <button onClick={onOpenMission} className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-300/35 bg-emerald-300/15 text-[11px] font-bold text-emerald-50 transition-colors hover:bg-emerald-300/25" data-testid="copilot-journey-open-mission"><CheckCircle2 size={13} /> Voir la mission créée dans Bien-être <ArrowRight size={13} /></button>}
      {!approved && !deferred && <p className="mb-0 mt-3 text-center text-[11px] font-medium text-white/85">Validez ou reportez la décision juste ci-dessous.</p>}
      {deferred && <p className="mb-0 mt-3 text-center text-[11px] font-medium text-white/85">Votre rappel reste enregistré pour le prochain point du jour.</p>}
    </div>
  );
}

function ActionCard({ card, onDecision, busy }) {
  if (!card) return null;
  const decided = card.status && card.status !== "pending";
  const approved = card.status === "approved";
  return (
    <div className="rounded-2xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 p-3.5" data-testid="copilot-action-card">
      <div className="mb-2 flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#D4AF37]/20 text-[#E8C96A]"><ShieldCheck size={16} /></span>
        <div className="min-w-0"><div className="text-[13px] font-semibold text-white">Décision du jour — validation requise</div><div className="text-[11px] text-white/75">Choisissez : créer la mission ou la reporter.</div></div>
      </div>
      <p className="m-0 text-[12.5px] font-medium leading-relaxed text-white">{card.title}</p>
      <p className="m-0 mb-3 mt-1 text-[11.5px] leading-relaxed text-white/75">{card.detail}</p>
      {decided ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${approved ? "text-emerald-300" : "text-white/65"}`}>
            {approved ? <CheckCircle2 size={14} /> : <Clock size={14} />}{approved ? "Approuvé — mission créée" : "Reporté — à revoir dans le prochain point du jour"}
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => onDecision("approve")} disabled={busy} className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#D4AF37] text-[12px] font-semibold text-[#0A1128] transition-opacity hover:opacity-90 disabled:opacity-60" data-testid="copilot-action-approve">{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approuver</button>
          <button onClick={() => onDecision("defer")} disabled={busy} className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 text-[12px] font-semibold text-white/75 transition-colors hover:bg-white/10 disabled:opacity-60" data-testid="copilot-action-defer"><Clock size={14} /> Reporter</button>
        </div>
      )}
    </div>
  );
}

export default function ChatPanel({ context, initialAsk }) {
  const sessionId = useMemo(getSessionId, []);
  const visionContextLabel = String(context || "").match(/Onglet Vision actif : ([^.]+)/)?.[1] || null;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [tab, setTab] = useState("chat");
  const [brief, setBrief] = useState(null);
  const [dailyDecision, setDailyDecision] = useState(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [newsText, setNewsText] = useState("");
  const [newsSources, setNewsSources] = useState([]);
  const [newsError, setNewsError] = useState("");
  const [newsLoading, setNewsLoading] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactSent, setContactSent] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const initialChatPositionedRef = useRef(false);
  const keepChatAtBottomRef = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.all([getChatHistory(sessionId), getCopilotBrief(sessionId), getCopilotConfig(), getCopilotDecision(sessionId)])
      .then(([history, dailyBrief, config, decision]) => {
        if (!active) return;
        setMessages(history);
        setBrief(dailyBrief);
        setWhatsappUrl(config?.whatsapp_url || "");
        setDailyDecision(decision);
      })
      .catch(() => { if (active) setMessages([]); })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [sessionId]);

  useEffect(() => {
    if (!scrollRef.current || tab !== "chat") return;
    // À l’ouverture, la priorité est la boucle Vision → Décision → Mission,
    // notamment sur téléphone. On ne la masque donc jamais sous le fil de discussion.
    if (!initialChatPositionedRef.current) {
      scrollRef.current.scrollTop = 0;
      initialChatPositionedRef.current = true;
      return;
    }
    // Ensuite seulement, une vraie interaction de l’utilisateur suit naturellement le dernier message.
    if (keepChatAtBottomRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, attachments, tab]);

  useEffect(() => {
    const openFromApp = (event) => {
      const question = event?.detail?.ask;
      if (question) setTimeout(() => send(question), 50);
    };
    window.addEventListener("cours:open-copilot", openFromApp);
    return () => window.removeEventListener("cours:open-copilot", openFromApp);
  });

  const send = async (rawMessage) => {
    const message = (rawMessage ?? input).trim();
    if ((!message && attachments.length === 0) || loading || uploading) return;
    keepChatAtBottomRef.current = true;
    const attachmentLabels = attachments.map((file) => `📎 ${file.name}`);
    const visibleMessage = [message, ...attachmentLabels].filter(Boolean).join("\n");
    const requestAttachments = attachments;
    setInput(""); setAttachments([]); setTab("chat"); setLoading(true);
    setMessages((current) => [...current, { role: "user", content: visibleMessage }, { role: "assistant", content: "", pending: true }]);
    try {
      await streamChatMessage({
        message: message || "Analyse les pièces jointes et indique-moi la prochaine action utile.",
        session: sessionId, context, uploadIds: requestAttachments.map((file) => file.id),
        onToken: (full) => setMessages((current) => {
          const next = [...current]; next[next.length - 1] = { role: "assistant", content: full }; return next;
        }),
      });
    } catch (error) {
      setMessages((current) => {
        const next = [...current]; next[next.length - 1] = { role: "assistant", content: error?.message || "Désolé, le copilote est indisponible pour le moment. Réessaie dans un instant." }; return next;
      });
    } finally { setLoading(false); }
  };

  // Ouvert depuis un autre écran (bouton "Transformer en action" sur Vision,
  // "Parler au copilote" sur Bien-être) — voir Layout.jsx qui écoute
  // "cours:open-copilot" et transmet la question ici.
  useEffect(() => {
    if (!initialAsk || initialAsk === lastAutoAskRef.current) return;
    lastAutoAskRef.current = initialAsk;
    send(initialAsk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAsk]);

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || []); event.target.value = "";
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files.slice(0, Math.max(0, 5 - attachments.length))) uploaded.push(await uploadChatFile(file, sessionId));
      setAttachments((current) => [...current, ...uploaded]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error?.response?.data?.detail || "Impossible d’ajouter ce fichier. Vérifie son format et sa taille." }]);
    } finally { setUploading(false); }
  };

  const decideCard = async (decision) => {
    if (!dailyDecision?.id || decisionLoading) return;
    setDecisionLoading(true);
    try {
      const result = await applyCopilotDecision({ id: dailyDecision.id, session: sessionId, decision });
      setDailyDecision(result);
      setMessages((current) => [...current, { role: "assistant", content: result.message }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error?.response?.data?.detail || "Impossible d’enregistrer cette décision pour le moment." }]);
    } finally {
      setDecisionLoading(false);
    }
  };

  const loadNews = async () => {
    if (newsLoading) return;
    setNewsLoading(true); setNewsError("");
    try {
      const result = await getCopilotNews(sessionId);
      if (!result?.ok || !result?.digest) {
        if (newsText) setNewsError("Impossible d’actualiser pour le moment : la veille précédente est conservée.");
        else setNewsText(result?.digest || "Aucune actualité disponible pour le moment.");
      } else {
        setNewsText(result.digest); setNewsSources(Array.isArray(result.sources) ? result.sources : []);
      }
    } catch {
      if (newsText) setNewsError("Impossible d’actualiser pour le moment : la veille précédente est conservée.");
      else setNewsText("Impossible de récupérer l’actualité à l’instant. Réessaie plus tard.");
    } finally { setNewsLoading(false); }
  };

  const sendWorkRequest = async () => {
    const message = contactMessage.trim();
    if (!message || contactSent) return;
    try {
      const result = await sendCopilotWorkRequest({ session: sessionId, message, channel: "chat" });
      setContactSent(true); setContactMessage("");
      setMessages((current) => [...current, { role: "assistant", content: result.message || "Votre demande est bien enregistrée." }]);
      setTimeout(() => { setContactOpen(false); setContactSent(false); }, 1800);
    } catch { setMessages((current) => [...current, { role: "assistant", content: "Impossible d’envoyer la demande pour le moment. Réessaie plus tard." }]); }
  };

  return (
    <div className="flex h-full w-full flex-col" data-testid="copilot-panel">
      <div className="border-b border-white/10 px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5"><div className="gold-bg flex h-9 w-9 items-center justify-center rounded-xl"><Sparkles size={18} className="text-[#0A1128]" /></div><div><div className="font-head text-[15px] font-semibold">Copilote IA</div><div className="flex items-center gap-1.5 text-[11px] text-emerald-400"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> En ligne</div>{visionContextLabel && <div className="mt-1 inline-flex rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-2 py-0.5 text-[10px] font-medium text-[#F0DCA5]">Vision · {visionContextLabel}</div>}</div></div>
          <button onClick={() => setContactOpen((value) => !value)} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${contactOpen ? "border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#E8C96A]" : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"}`} title="Travailler avec l’équipe" aria-label="Travailler avec l’équipe" data-testid="copilot-contact"><Handshake size={16} /></button>
        </div>
        <div className="mt-3 grid grid-cols-2 rounded-xl border border-white/10 bg-white/[0.035] p-1" data-testid="copilot-tabs">
          <button onClick={() => setTab("chat")} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg text-[11.5px] font-medium transition-colors ${tab === "chat" ? "bg-[#D4AF37]/20 text-[#F0DCA5]" : "text-white/50 hover:text-white/75"}`}><MessageCircle size={14} /> Discussion</button>
          <button onClick={() => setTab("news")} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg text-[11.5px] font-medium transition-colors ${tab === "news" ? "bg-[#D4AF37]/20 text-[#F0DCA5]" : "text-white/50 hover:text-white/75"}`}><Newspaper size={14} /> Actualité</button>
        </div>
      </div>

      {contactOpen && <div className="mx-4 mt-3 rounded-2xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 p-3" data-testid="copilot-contact-panel"><div className="mb-2 text-[12.5px] text-white/80">Envie d’avancer <strong>avec l’équipe</strong> sur ton projet ?</div>{whatsappUrl && <a className="mb-2 inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-400 px-3 text-[11.5px] font-semibold text-[#0A1128]" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Discuter sur WhatsApp</a>}<textarea value={contactMessage} onChange={(event) => setContactMessage(event.target.value)} rows={2} placeholder="Décris ton besoin en une phrase…" className="mb-2 block w-full resize-y rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-[12px] text-white placeholder:text-white/35 focus:border-[#D4AF37]/50 focus:outline-none" data-testid="copilot-contact-message" /><button onClick={sendWorkRequest} disabled={!contactMessage.trim() || contactSent} className="h-8 w-full rounded-xl bg-[#D4AF37] text-[11.5px] font-semibold text-[#0A1128] disabled:opacity-50" data-testid="copilot-contact-send">{contactSent ? "Demande envoyée" : "Envoyer ma demande"}</button></div>}

      {tab === "chat" && <>
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" data-testid="copilot-messages">
          {!historyLoading && <ExecutionJourney decision={dailyDecision} onOpenMission={() => { window.location.href = "/bien-etre"; }} />}
          {!historyLoading && <ActionCard card={dailyDecision} onDecision={decideCard} busy={decisionLoading} />}
          <BriefCard data={brief} />
          {!historyLoading && messages.length === 0 && <div className="space-y-3"><div className="glass p-4"><div className="mb-1 text-sm font-medium">Bonjour</div><p className="m-0 text-[13px] leading-relaxed text-white/60">Je garde le fil de nos échanges, peux lire tes documents et t’aider à décider de la prochaine action.</p></div><div className="space-y-2">{SUGGESTIONS.map((suggestion) => <button key={suggestion} onClick={() => send(suggestion)} className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-left text-[13px] text-white/75 transition-colors hover:border-[#D4AF37]/40 hover:bg-white/10" data-testid="copilot-suggestion">{suggestion}</button>)}</div></div>}
          {messages.map((message, index) => {
            return <div key={message.id || index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[87%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${message.role === "user" ? "border border-[#D4AF37]/30 bg-[#D4AF37]/20 text-white" : "glass text-white/85"}`}>{message.pending && loading && !message.content ? <Loader2 size={16} className="animate-spin text-[#D4AF37]" /> : renderMarkdownLite(message.content)}</div></div>;
          })}
        </div>
        <div className="border-t border-white/10 p-4">
          {attachments.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{attachments.map((file) => <span key={file.id} className="inline-flex max-w-full items-center gap-1 rounded-lg border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-2 py-1 text-[11px] text-[#F0DCA5]"><FileText size={12} /><span className="max-w-[150px] truncate">{file.name}</span><button onClick={() => setAttachments((current) => current.filter((item) => item.id !== file.id))} aria-label={`Retirer ${file.name}`}><X size={12} /></button></span>)}</div>}
          <div className="flex items-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 py-1.5 pl-2 pr-1.5 transition-colors focus-within:border-[#D4AF37]/50"><input ref={fileRef} type="file" className="hidden" multiple onChange={handleUpload} accept=".txt,.md,.csv,.json,.pdf,.docx,.png,.jpg,.jpeg,.webp" /><button onClick={() => fileRef.current?.click()} disabled={uploading || attachments.length >= 5} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-[#E8C96A] disabled:opacity-40" aria-label="Ajouter un fichier" data-testid="copilot-upload">{uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}</button><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="Écrivez à votre copilote…" className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none" data-testid="copilot-input" /><button onClick={() => send()} disabled={loading || uploading || (!input.trim() && attachments.length === 0)} className="gold-bg flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-50" aria-label="Envoyer" data-testid="copilot-send">{loading ? <Loader2 size={16} className="animate-spin text-[#0A1128]" /> : <Send size={16} className="text-[#0A1128]" />}</button></div>
          <p className="m-0 mt-2 text-center text-[10px] text-white/35">Mémoire locale · Documents · Cartes d’action</p>
        </div>
      </>}

      {tab === "news" && <div className="flex-1 overflow-y-auto px-4 py-4" data-testid="copilot-news"><div className="glass p-4"><div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#F0DCA5]"><Newspaper size={14} /> Veille sectorielle</div><p className="m-0 text-[12.5px] leading-relaxed text-white/60">Une synthèse des actualités utiles aux entrepreneurs, avec ses sources.</p><button onClick={loadNews} disabled={newsLoading} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[12px] font-semibold text-[#F0DCA5] disabled:opacity-50" data-testid="copilot-news-btn">{newsLoading ? <Loader2 size={15} className="animate-spin" /> : newsText ? <RefreshCw size={15} /> : <Newspaper size={15} />}{newsText ? "Actualiser l’actualité" : "Résumer l’actualité"}</button>{newsError && <p className="mb-0 mt-2 rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 p-2 text-[11px] text-[#F0DCA5]">{newsError}</p>}{newsText && <div className="mt-4 space-y-2 text-[12.5px] leading-relaxed text-white/80">{renderMarkdownLite(newsText)}</div>}{!newsText && !newsLoading && <p className="mb-0 mt-5 text-center text-[12px] text-white/40">Aucune actualité chargée pour le moment.</p>}{newsSources.length > 0 && <div className="mt-5 border-t border-white/10 pt-3"><div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">Sources</div><div className="space-y-2">{newsSources.map((source, index) => <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-white/10 bg-white/[0.035] p-2.5 transition-colors hover:bg-white/[0.07]"><div className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#D4AF37]/15 text-[10px] font-semibold text-[#E8C96A]">{index + 1}</span><span className="min-w-0 flex-1 text-[11.5px] font-medium leading-snug text-white/80">{source.title}</span><ExternalLink size={13} className="shrink-0 text-[#E8C96A]" /></div>{source.source && <div className="ml-7 mt-1 text-[10px] text-white/40">{source.source}</div>}</a>)}</div></div>}</div></div>}
    </div>
  );
}
