import React, { useEffect, useRef, useState } from "react";
import {
  Sparkles, Send, Mic, Lightbulb, BatteryLow, Compass, X, Loader2,
  Sun, ListChecks, Newspaper, Check, Clock, XCircle, ExternalLink, RefreshCw, Mail, Bookmark,
  Maximize2, Minimize2, CloudCheck, Users, Scale, Copy, PenLine, FolderOpen, FileText, FileSpreadsheet,
  FileDown, UploadCloud, ImagePlus, ListPlus,
} from "lucide-react";
import CollaborateurModal from "./CollaborateurModal";
import { prendreOngletEnAttente, prendrePromptEnAttente, discuterAvecIA } from "./GlobalChat";
import CanauxCopilote from "@/components/kairos/CanauxCopilote";
import { useKairos } from "@/context/KairosContext";
import {
  streamChat, fetchPointDuJour, fetchDecisions, suggererDecisions, patchDecision, fetchActualite, enregistrerArticle, fetchEnregistres, validerDecisionEmail,
  saveProfile, creerTache, telechargerDocument, rangerDocumentDrive, ouvrirMesDocuments, reglerDossierDocuments,
  creerImageIA, rangerFichierDrive, fetchContexteCopilote,
} from "@/lib/kairosApi";
import { toast } from "sonner";

// Derniers échanges du chat, joints (si on le souhaite) au message pour un collaborateur.
const contexteChat = { texte: "" };
// La conversation survit au passage petit ⇄ grand format (le composant est remonté).
const memoireChat = { messages: null };

// Ouvre le dossier des documents IA dans le Drive / OneDrive de l'utilisateur.
export async function ouvrirDossierDocuments() {
  try {
    const r = await ouvrirMesDocuments();
    if (r.url) window.open(r.url, "_blank", "noopener");
    else toast("Relie d'abord ton Google Drive ou ton OneDrive", { action: { label: "Relier", onClick: () => window.location.assign("/parametres#connexions") } });
  } catch { toast.error("Impossible d'ouvrir tes documents pour le moment."); }
}

const URL_DOSSIER = /https:\/\/(drive\.google\.com\/drive\/[^\s]*folders\/[\w-]+[^\s]*|[\w-]+\.sharepoint\.com\/[^\s]+|onedrive\.live\.com\/[^\s]+|1drv\.ms\/[^\s]+)/i;
const DEMANDE_IMAGE = /\b(image|logo|visuel|illustration|photo|affiche|banni[eè]re|dessin)\b/i;
const estDocument = (t) => (t || "").length > 450 || /(^|\n)#{1,3} |\n\|.+\|/.test(t || "");
const titreDocument = (t) => ((t || "").split("\n").find((l) => l.trim()) || "Document").replace(/^#+\s*/, "").replace(/[*_`]/g, "").slice(0, 80);
const heure = (d) => (d ? new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "");

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

export function ChatBody({ onClose, estElargi, onToggleTaille, grand = false }) {
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
          <div className={grand ? "flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 ring-1 ring-gold/30" : "flex h-8 w-8 items-center justify-center rounded-xl bg-gold/15 ring-1 ring-gold/30"}>
            <Sparkles className={grand ? "h-5 w-5 text-gold" : "h-4 w-4 text-gold"} />
          </div>
          <div className="leading-tight">
            <div className={`font-display font-bold text-offwhite ${grand ? "text-lg" : "text-sm"}`}>Copilote Zayado</div>
            <div className={`flex items-center gap-1.5 text-offwhite/55 ${grand ? "text-[12.5px]" : "text-[10px]"}`}><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connaît ton activité · Mémoire active</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {cloudSync && (
            <span className="mr-1 inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300" title={`Document transmis dans ${cloudSync.provider === "google" ? "Google Drive" : "OneDrive / SharePoint"}`} data-testid="chat-cloud-sync-status">
              <CloudCheck className="h-3.5 w-3.5" /> Transmis
            </span>
          )}
          <button onClick={ouvrirDossierDocuments} title="Mes documents (Drive / OneDrive)" aria-label="Mes documents"
            className="mr-1 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-offwhite/75 hover:border-gold/40 hover:text-gold" data-testid="chat-mes-documents">
            <FolderOpen className="h-3.5 w-3.5" /> {grand ? "Mes documents" : <span className="sr-only">Mes documents</span>}
          </button>
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
        {tab === "chat" && <ChatTab firstName={user.firstName} grand={grand} />}
        {tab === "decisions" && <DecisionsTab />}
        {tab === "actu" && <ActuTab />}
      </div>
    </div>
  );
}

// Sous chaque réponse : copier, créer une tâche, et pour un document : Word / Excel / Markdown /
// ranger dans le Drive ; pour une demande d'image : la créer.
function ActionsMessage({ m, demande, onCopier, onImage, i }) {
  const [envoi, setEnvoi] = useState(null);
  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10.5px] font-medium text-offwhite/60 transition hover:border-gold/40 hover:text-gold disabled:opacity-50";
  const doc = !m.image && estDocument(m.content);
  const faire = async (cle, f) => { setEnvoi(cle); try { await f(); } catch (e) { toast.error(e.detail || e.message || "Impossible pour le moment."); } finally { setEnvoi(null); } };
  const titre = titreDocument(m.content);
  const charge = (cle, Icone) => (envoi === cle ? <Loader2 size={11} className="animate-spin" /> : <Icone size={11} />);
  if (m.image) {
    return (
      <div className="flex flex-wrap gap-1.5">
        <a href={m.image.src} download={m.image.nom} className={btn}><FileDown size={11} /> Télécharger</a>
        <button className={btn} disabled={!!envoi} onClick={() => faire("drive", async () => { const r = await rangerFichierDrive(m.image.nom, m.image.mime, m.image.data); toast.success("Image rangée dans ton Drive.", r.url ? { action: { label: "Ouvrir", onClick: () => window.open(r.url, "_blank", "noopener") } } : undefined); })}>{charge("drive", UploadCloud)} Ranger dans mon Drive</button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5" data-testid={`chat-actions-${i}`}>
      <button onClick={onCopier} data-testid={`chat-copy-${i}`} className={btn}><Copy size={11} /> Copier</button>
      <button className={btn} disabled={!!envoi} onClick={() => faire("tache", async () => { await creerTache(titre.slice(0, 120)); toast.success("Tâche ajoutée à ton Plan d'action."); })} data-testid={`chat-tache-${i}`}>{charge("tache", ListPlus)} Créer une tâche</button>
      {doc && (<>
        <button className={btn} disabled={!!envoi} onClick={() => faire("docx", () => telechargerDocument(titre, m.content, "docx"))} data-testid={`chat-word-${i}`}>{charge("docx", FileText)} Word</button>
        <button className={btn} disabled={!!envoi} onClick={() => faire("xlsx", () => telechargerDocument(titre, m.content, "xlsx"))}>{charge("xlsx", FileSpreadsheet)} Excel</button>
        <button className={btn} disabled={!!envoi} onClick={() => faire("md", () => telechargerDocument(titre, m.content, "md"))}>{charge("md", FileDown)} Markdown</button>
        <button className={btn} disabled={!!envoi} data-testid={`chat-drive-${i}`} onClick={() => faire("drive", async () => {
          const r = await rangerDocumentDrive(titre, m.content, "docx");
          window.dispatchEvent(new CustomEvent("zayado:cloud-sync", { detail: { provider: r.provider } }));
          toast.success(`« ${r.nom} » rangé dans ton Drive.`, r.url ? { action: { label: "Ouvrir", onClick: () => window.open(r.url, "_blank", "noopener") } } : undefined);
        })}>{charge("drive", UploadCloud)} Ranger dans mon Drive</button>
      </>)}
      {DEMANDE_IMAGE.test(demande || "") && (
        <button className={btn} disabled={!!envoi} data-testid={`chat-image-${i}`} onClick={() => faire("image", async () => {
          const r = await creerImageIA(`${demande}\n\nDétails : ${m.content.slice(0, 1200)}`);
          onImage({ src: `data:${r.mime};base64,${r.data}`, data: r.data, mime: r.mime, nom: r.nom, description: demande.slice(0, 120) });
        })}>{charge("image", ImagePlus)} Créer l'image</button>
      )}
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

// Réglages que le Copilote demande lui-même, UN à la fois, au fil des ouvertures
// du chat (avant : seul le rythme des actualités était demandé). Tout est
// enregistré dans le profil et modifiable dans Paramètres.
const OUTILS = ["Trello", "Microsoft Teams", "Slack", "Notion", "Google Agenda", "Outlook", "Excel / Sheets"];
const REGLAGES = [
  { key: "actu_rythme", question: <>Avant de commencer : à quel rythme veux-tu que la cloche te signale <b>l'actualité de ton marché</b> ?</>,
    options: RYTHMES_ACTU.map((r) => ({ valeur: r.key, label: r.label, confirm: r.confirm })) },
  { key: "copilote_ton", question: <>Comment préfères-tu que je te parle ?</>,
    options: [
      { valeur: "doux", label: "Doux et bienveillant", confirm: "Entendu — je reste doux et bienveillant. Tu peux changer ça dans Paramètres → Profil." },
      { valeur: "direct", label: "Direct et concis", confirm: "Entendu — j'irai droit au but, réponses courtes." },
      { valeur: "coach", label: "Coach qui me challenge", confirm: "Entendu — je te challengerai (toujours avec respect)." },
    ] },
  { key: "heure_point", question: <>À quelle heure veux-tu recevoir ton <b>point du jour</b> ?</>,
    options: ["07:30", "08:30", "09:30", "12:00"].map((h) => ({ valeur: h, label: h.replace(":", "h"), confirm: `Noté — ton point du jour arrivera à ${h.replace(":", "h")}.` })) },
  { key: "outils", multi: true, question: <>Quels outils utilises-tu déjà ? Je proposerai des actions qui s'y intègrent.</>, options: OUTILS.map((o) => ({ valeur: o, label: o })) },
  { key: "canaux_vus", canaux: true },
];
const aujourdhuiIso = () => new Date().toISOString().slice(0, 10);

function QuestionReglage({ q, onRepondre, onPlusTard }) {
  const [choix, setChoix] = useState([]);
  if (q.canaux) return <CanauxCopilote compact onFerme={() => onRepondre(q, "vu", "Plus tard")} />;
  return (
    <div className="rounded-2xl border border-gold/25 bg-gold/5 p-4" data-testid={`reglage-${q.key}`}>
      <p className="text-sm leading-relaxed text-offwhite/90">{q.question}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {q.options.map((o) => {
          const pris = choix.includes(o.valeur);
          return (
            <button key={o.valeur} data-testid={`reglage-${q.key}-${o.valeur}`}
              onClick={() => (q.multi ? setChoix((c) => (pris ? c.filter((x) => x !== o.valeur) : [...c, o.valeur])) : onRepondre(q, o.valeur, o.label, o.confirm))}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${pris ? "border-gold bg-gold text-navy-900" : "border-gold/30 bg-gold/10 text-gold hover:bg-gold/20"}`}>
              {o.label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3">
        {q.multi && (
          <button onClick={() => onRepondre(q, choix.length ? choix.join(", ") : "aucun", choix.length ? choix.join(", ") : "Aucun de ces outils",
            choix.length ? `Noté : ${choix.join(", ")}. Je m'en servirai pour te proposer des actions compatibles.` : "Noté — pas d'outil externe pour l'instant.")}
            className="rounded-full bg-gold px-3.5 py-1.5 text-xs font-semibold text-navy-900" data-testid={`reglage-${q.key}-valider`}>Valider</button>
        )}
        <button onClick={() => onPlusTard(q)} className="text-[11.5px] text-offwhite/50 hover:text-offwhite" data-testid={`reglage-${q.key}-plus-tard`}>Plus tard</button>
      </div>
    </div>
  );
}

function ChatTab({ firstName, grand = false }) {
  const { mode, contexte, aCheckin, priorities, loaded } = useKairos();
  // Nouveau compte (aucun check-in, aucune action) : le Copilote se présente et
  // propose les 3 premiers pas, au lieu d'une simple formule de politesse.
  const debutant = loaded && !aCheckin && !(priorities || []).length;
  const accueil = debutant
    ? `Bienvenue${firstName ? ` ${firstName}` : ""} 👋 Je suis ton Copilote Zayado. Pour bien démarrer, trois petits pas :\n1. Ton check-in du jour (30 secondes)\n2. Ton objectif principal\n3. Une première action de 15 minutes\nDis-moi par lequel on commence, je t'accompagne.`
    : `Bonjour${firstName ? ` ${firstName}` : ""}. Je suis le Copilote IA Zayado, là pour t'accompagner en douceur. Par quoi commence-t-on ?`;
  const [messages, setMessages] = useState(() => memoireChat.messages || [{ role: "assistant", content: accueil }]);
  useEffect(() => { memoireChat.messages = messages; }, [messages]);
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

  const [conversationLibre, setConversationLibre] = useState(false);
  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content) return;
    setConversationLibre(true);
    if (streaming) { setInput(content); return; } // réponse en cours : le texte attend dans le champ
    setInput("");
    // Adresse d'un dossier Drive / OneDrive collée : c'est là que seront rangés les documents.
    const dossier = content.match(URL_DOSSIER);
    if (dossier) {
      const maintenant = new Date().toISOString();
      setMessages((m) => [...m, { role: "user", content, le: maintenant }]);
      try {
        await reglerDossierDocuments(dossier[0]);
        setMessages((m) => [...m, { role: "assistant", le: new Date().toISOString(), content: "C'est noté : je rangerai tes documents dans ce dossier. Tu peux le changer à tout moment en me collant une autre adresse." }]);
      } catch (e) {
        setMessages((m) => [...m, { role: "assistant", le: new Date().toISOString(), content: `Je n'ai pas pu enregistrer ce dossier : ${e.detail || "réessaie avec l'adresse complète du dossier."}` }]);
      }
      return;
    }
    const le = new Date().toISOString();
    setMessages((m) => [...m, { role: "user", content, le }, { role: "assistant", content: "", le }]);
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
  const [reponses, setReponses] = useState({});
  const val = (k) => reponses[k] ?? contexte?.[k];
  // Une question par ouverture ; « Plus tard » = plus de question aujourd'hui.
  const reporte = val("reglages_reportes_le") === aujourdhuiIso();
  const questionEnCours = !reporte && contexte ? REGLAGES.find((q) => val(q.key) == null || val(q.key) === "") : null;
  const [questionsPosees, setQuestionsPosees] = useState(0);
  const repondre = (q, valeur, label, confirm) => {
    setReponses((r) => ({ ...r, [q.key]: valeur }));
    setQuestionsPosees((n) => n + 1);
    const patch = { contexte_metier: { [q.key]: valeur } };
    if (q.key === "heure_point") patch.heure_checkin = valeur;
    saveProfile(patch).catch(() => {});
    if (!q.canaux) setMessages((m) => [...m, { role: "user", content: label }, ...(confirm ? [{ role: "assistant", content: confirm }] : [])]);
  };
  const plusTard = (q) => {
    setReponses((r) => ({ ...r, reglages_reportes_le: aujourdhuiIso() }));
    saveProfile({ contexte_metier: { reglages_reportes_le: aujourdhuiIso() } }).catch(() => {});
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`chat-msg-${m.role}`}>
            <div className={`max-w-[85%] ${m.role === "assistant" ? "space-y-2" : ""}`}>
              <div className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? (grand ? "chat-bulle-moi" : "bg-gold text-navy-900") : (grand ? "chat-bulle-ia" : "border border-white/10 bg-white/5 text-offwhite")
              }`}>
                {m.image ? <img src={m.image.src} alt={m.content} className="max-h-80 rounded-xl" /> : (m.content || (streaming && i === messages.length - 1 ? <Loader2 className="h-4 w-4 animate-spin text-gold" /> : null))}
                {grand && m.le && <span className={`mt-1.5 block text-[11px] ${m.role === "user" ? "opacity-60" : "text-offwhite/45"}`}>{heure(m.le)}</span>}
              </div>
              {m.role === "assistant" && m.content && i > 0 && !(streaming && i === messages.length - 1) && (
                <ActionsMessage m={m} demande={messages[i - 1]?.role === "user" ? messages[i - 1].content : ""} onCopier={() => copierReponse(m)}
                  onImage={(img) => setMessages((x) => [...x, { role: "assistant", content: img.description, image: img, le: new Date().toISOString() }])} i={i} />
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
        {/* Réglage demandé par le Copilote : au démarrage d'une conversation, et
            jusqu'à 2 d'affilée (pas plus, pour ne pas transformer le chat en formulaire). */}
        {questionEnCours && !streaming && !conversationLibre && questionsPosees < 2 && (
          <QuestionReglage key={questionEnCours.key} q={questionEnCours} onRepondre={repondre} onPlusTard={plusTard} />
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
  // Filtre : tout / légal (pays du compte) / ma veille (pays, secteurs et mots-clés choisis dans Paramètres).
  const [filtre, setFiltre] = useState(() => { try { return localStorage.getItem("zayado_actu_filtre") || "tout"; } catch { return "tout"; } });
  const load = async (f = filtre) => { setLoading(true); try { setData(await fetchActualite(f)); } catch { setData({ erreur: true, articles: [] }); } setLoading(false); };
  const chargerEnregistres = async () => { try { const d = await fetchEnregistres(); setEnregistres(d?.articles || []); } catch { /* silencieux */ } };
  useEffect(() => { load(); chargerEnregistres(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const changerFiltre = (f) => { setFiltre(f); try { localStorage.setItem("zayado_actu_filtre", f); } catch { /* */ } load(f); };
  const ETIQUETTES = { officiel: "Officiel", legal: "Juridique", secteur: "Secteur", veille: "Ta veille", presse: "" };

  return (
    <div className="h-full overflow-y-auto px-4 py-4" data-testid="actu-tab">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Actualité</p>
        <a href="/parametres#notifications" className="text-[11px] text-offwhite/50 hover:text-gold" data-testid="actu-regler">Choisir mes sources</a>
      </div>
      <div className="mb-3 flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1" data-testid="actu-filtres">
        {[["tout", "Tout"], ["legal", "Légal"], ["perso", "Ma veille"]].map(([k, l]) => (
          <button key={k} onClick={() => changerFiltre(k)} data-testid={`actu-filtre-${k}`}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold transition ${filtre === k ? "bg-gold text-navy-900" : "text-offwhite/65 hover:text-offwhite"}`}>{l}</button>
        ))}
      </div>
      <p className="mb-3 px-1 text-xs text-offwhite/55">{filtre === "legal" ? `Ce qui change pour les entreprises${data?.label ? ` (${data.label})` : ""} : lois, impôts, social.` : filtre === "perso" ? "Tes pays, tes secteurs et tes mots-clés : de quoi publier avant tout le monde." : "Un résumé court, jamais un fil d'actus infini."}</p>
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
              {a.source && a.source !== "presse" && (
                <span className={`mb-1.5 inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] ${a.source === "officiel" || a.source === "legal" ? "bg-gold/15 text-gold" : "bg-sky-400/15 text-sky-200"}`} data-testid={`actu-${a.source === "officiel" ? "officiel" : "etiquette"}-${i}`}>
                  {ETIQUETTES[a.source]}{a.source_label ? ` · ${a.source_label}` : ""}
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
                  {a.source !== "officiel" && a.source !== "legal" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); discuterAvecIA(`Écris-moi un post LinkedIn (150 mots, ton expert et accessible, une accroche forte, mon avis de professionnel et une question pour lancer la discussion) à partir de cette actualité : « ${a.titre} » (${a.lien})`); }}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[10px] text-offwhite/70 hover:border-gold/40 hover:text-gold"
                      data-testid={`actu-post-${i}`}>
                      <PenLine className="h-3 w-3" /> Post
                    </button>
                  )}
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
              {filtre === "perso" ? "Ta veille est vide : choisis des pays, des secteurs ou des mots-clés dans Paramètres › Notifications." : "Toutes les sources sont coupées dans tes réglages. Réactive-en au moins une dans Paramètres › Notifications."}
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
  // Un seul design de chat partout : le panneau marine OPAQUE (.chat-zayado).
  // « Agrandir » ouvre le grand format (chat + réglages + contexte), la conversation est conservée.
  const [estElargi, setEstElargi] = useState(false);
  useEffect(() => {
    document.documentElement.style.setProperty("--chat-w", "360px");
    return () => document.documentElement.style.removeProperty("--chat-w");
  }, []);
  return (
    <>
      <div className="chat-zayado hidden xl:flex fixed right-0 top-0 z-20 h-screen w-[360px] flex-col" data-testid="chat-panel">
        {!estElargi && <ChatBody estElargi={false} onToggleTaille={() => setEstElargi(true)} />}
      </div>
      {estElargi && <ChatGrand onReduire={() => setEstElargi(false)} />}
    </>
  );
}

// Grand format (inspiré de la maquette) : la conversation à gauche, à droite les réglages
// du Copilote (ton, format) et ce qu'il sait de ton activité.
export function ChatGrand({ onReduire, onClose }) {
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onReduire(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onReduire]);
  return (
    <div className={`${typeof document !== "undefined" && document.body.classList.contains("theme-clair") ? "theme-creme chat-grand-clair" : ""} chat-grand fixed inset-0 z-[70] overflow-y-auto p-3 sm:p-6`} data-testid="chat-grand">
      <div className="mx-auto grid h-full max-w-[1400px] gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="chat-grand-carte flex min-h-[70vh] flex-col overflow-hidden rounded-[28px] lg:h-[calc(100vh-48px)]">
          <ChatBody grand estElargi onToggleTaille={onReduire} onClose={onClose} />
        </div>
        <PanneauCopilote />
      </div>
    </div>
  );
}

function PanneauCopilote() {
  const [ctx, setCtx] = useState(null);
  const [ton, setTon] = useState("doux");
  const [format, setFormat] = useState("concis");
  const [sauve, setSauve] = useState(false);
  useEffect(() => { fetchContexteCopilote().then((c) => { setCtx(c); setTon(c.ton); setFormat(c.format); }).catch(() => setCtx({ lignes: [] })); }, []);
  const choix = (liste, val, set, testid) => (
    <div className="mt-2 grid gap-1 rounded-full bg-white/10 p-1" style={{ gridTemplateColumns: `repeat(${liste.length}, minmax(0, 1fr))` }} data-testid={testid}>
      {liste.map(([k, l]) => (
        <button key={k} onClick={() => set(k)} className={`rounded-full py-2 text-[13px] font-medium transition ${val === k ? "bg-gold text-navy-900 shadow" : "text-offwhite/60 hover:text-offwhite"}`}>{l}</button>
      ))}
    </div>
  );
  const sauvegarder = async () => {
    setSauve(true);
    try { await saveProfile({ contexte_metier: { copilote_ton: ton, copilote_format: format } }); toast.success("Réglages du Copilote enregistrés."); }
    catch { toast.error("Enregistrement impossible."); } finally { setSauve(false); }
  };
  return (
    <div className="space-y-5 lg:h-[calc(100vh-48px)] lg:overflow-y-auto">
      <div className="chat-grand-carte rounded-[28px] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-offwhite/55">Réglages du Copilote</p>
        <p className="mt-4 text-[14px] font-medium text-offwhite">Ton</p>
        {choix([["doux", "Soutien"], ["direct", "Direct"], ["coach", "Challenger"]], ton, setTon, "copilote-ton")}
        <p className="mt-4 text-[14px] font-medium text-offwhite">Format</p>
        {choix([["concis", "Concis"], ["detaille", "Détaillé"]], format, setFormat, "copilote-format")}
        <button onClick={sauvegarder} disabled={sauve} className="mt-5 h-12 w-full rounded-full bg-gold text-[15px] font-semibold text-navy-900 disabled:opacity-60" data-testid="copilote-sauvegarder">
          {sauve ? "Enregistrement…" : "Sauvegarder"}
        </button>
      </div>
      <div className="chat-grand-carte rounded-[28px] p-6" data-testid="copilote-contexte">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-offwhite/55">Contexte chargé</p>
        {!ctx ? <Loader2 className="mt-3 h-4 w-4 animate-spin text-offwhite/40" /> : ctx.lignes.length ? (
          <ul className="mt-3 space-y-2">
            {ctx.lignes.map((l) => <li key={l} className="text-[14px] leading-snug text-offwhite">· {l}</li>)}
          </ul>
        ) : <p className="mt-3 text-[14px] text-offwhite/60">Rien encore : remplis ta vision, tes objectifs et ton check-in, le Copilote s'en servira.</p>}
        <p className="mt-4 text-[13px] italic text-offwhite/60">Le Copilote propose, tu décides. Jamais d'action sans ton accord.</p>
      </div>
      <button onClick={ouvrirDossierDocuments} className="chat-grand-carte flex w-full items-center gap-3 rounded-[28px] p-5 text-left" data-testid="copilote-documents">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15"><FolderOpen className="h-5 w-5 text-gold" /></span>
        <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold text-offwhite">Mes documents</span><span className="block text-[12.5px] text-offwhite/60">Ouvrir le dossier où l'IA range tes fichiers</span></span>
      </button>
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
