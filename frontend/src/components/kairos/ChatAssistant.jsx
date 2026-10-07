import React, { useEffect, useRef, useState } from "react";
import { useChatScroll } from "@/hooks/useChatScroll";
import { BoutonDernierMessage } from "@/components/kairos/BoutonDernierMessage";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles, Send, Mic, Lightbulb, BatteryLow, Compass, X, Loader2,
  Sun, ListChecks, Newspaper, Check, Clock, XCircle, ExternalLink, RefreshCw, Mail, Bookmark,
  Maximize2, Minimize2, CloudCheck, Users, Scale, Copy, PenLine, FolderOpen, FileText, FileSpreadsheet,
  FileDown, UploadCloud, ImagePlus, ListPlus, Settings, Info, Plus,
} from "lucide-react";
import CollaborateurModal from "./CollaborateurModal";
import { aDroit, usePlanEffectif } from "@/lib/droits";
import { prendreOngletEnAttente, prendrePromptEnAttente, discuterAvecIA } from "./GlobalChat";
import CanauxCopilote from "@/components/kairos/CanauxCopilote";
import { useKairos } from "@/context/KairosContext";
import {
  streamChat, fetchHistoriqueChat, fetchPointDuJour, fetchDecisions, suggererDecisions, patchDecision, enregistrerArticle, fetchEnregistres, validerDecisionEmail,
  saveProfile, creerTache, oauthStockage, relierTrello, choisirListeTrello, telechargerDocument, rangerDocumentDrive, ouvrirMesDocuments, reglerDossierDocuments,
  creerImageIA, rangerFichierDrive, fetchContexteCopilote, fetchDossierDocuments,
} from "@/lib/kairosApi";
import { toast } from "sonner";
import { actuConnue, chargerActu, oublierActu, signatureActu } from "@/lib/actuCache";
import { signaler } from "@/lib/alertes";

// Derniers échanges du chat, joints (si on le souhaite) au message pour un collaborateur.
const contexteChat = { texte: "" };
// La conversation vit HORS du composant. Avant, elle était perdue de plusieurs façons : le panneau se ferme
// et se remonte à chaque changement de page (les réponses données aux questions de mise en route étaient
// oubliées, donc les mêmes questions revenaient), une réponse en cours d'écriture se perdait si on quittait
// la page, et un rechargement complet repartait de zéro. Désormais : le magasin ci-dessous survit aux
// changements de page et au passage petit ⇄ grand format, la réponse en cours continue d'arriver même
// panneau fermé, et après un rechargement l'historique est relu côté serveur.
const memoireChat = { messages: null, streaming: false, libre: false, historiqueCharge: false, abonnes: new Set() };
const diffuserChat = () => memoireChat.abonnes.forEach((f) => f({ messages: memoireChat.messages, streaming: memoireChat.streaming }));
const majMessages = (fn) => { memoireChat.messages = typeof fn === "function" ? fn(memoireChat.messages || []) : fn; diffuserChat(); };
const majStreaming = (v) => { memoireChat.streaming = v; diffuserChat(); };
// Nouvelle connexion (autre compte) : on repart d'une conversation vide, sans voir celle de la personne précédente.
if (typeof window !== "undefined") {
  window.addEventListener("zayado:token", () => { Object.assign(memoireChat, { messages: null, streaming: false, libre: false, historiqueCharge: false }); });
}

// Personne ne regarde le chat (panneau fermé, onglet en arrière-plan, fenêtre inactive) ?
const chatNonVu = () => memoireChat.abonnes.size === 0 || document.visibilityState !== "visible" || !document.hasFocus();
// Alerte « ton Copilote t'a répondu » (son + bandeau, ou notification système si l'app est en arrière-plan).
const alerterReponse = () => {
  if (!chatNonVu()) return;
  const m = memoireChat.messages || [];
  const texte = String(m[m.length - 1]?.content || "").replace(/[#*_`>]+/g, "").replace(/\s+/g, " ").trim();
  signaler({ titre: "Ton Copilote t'a répondu 💬", corps: texte.length > 140 ? `${texte.slice(0, 140).replace(/\s\S*$/, "")}…` : texte, url: "/app?tab=chat", tag: "chat-reponse" });
};
// La réponse de l'IA s'écrit côté SERVEUR, même si la page est fermée ou la connexion coupée. On la retrouve
// dans l'historique : « prete » (texte), « attente » (le serveur écrit encore) ou « absent » (message jamais arrivé).
async function lireReponseServeur(contenu, depuisMs) {
  let h;
  try { h = await fetchHistoriqueChat(); } catch { return { etat: "attente" }; }
  const liste = Array.isArray(h) ? h : [];
  let idx = -1;
  liste.forEach((x, i) => { if (x.role === "user" && x.contenu === contenu && new Date(x.le).getTime() >= depuisMs - 60000) idx = i; });
  if (idx < 0) return { etat: "absent" };
  const suite = liste[idx + 1];
  return suite && suite.role !== "user" && suite.contenu ? { etat: "prete", texte: suite.contenu } : { etat: "attente" };
}
async function reprendreDepuisServeur(contenu, depuisMs) {
  for (let essai = 0; essai < 30; essai++) {
    await new Promise((r) => setTimeout(r, 3000));
    const r = await lireReponseServeur(contenu, depuisMs);
    if (r.etat === "prete") return r.texte;
    if (r.etat === "absent" && essai >= 1) return null;   // le message n'est jamais arrivé jusqu'au serveur
  }
  return null;
}

// Ouvre le dossier des documents IA dans le Drive / OneDrive de l'utilisateur.
export async function ouvrirDossierDocuments() {
  try {
    const r = await ouvrirMesDocuments();
    if (r.url) window.open(r.url, "_blank", "noopener");
    else toast("Relie d'abord ton Google Drive ou ton OneDrive", { action: { label: "Relier", onClick: () => window.location.assign("/parametres#connexions") } });
  } catch { toast.error("Impossible d'ouvrir tes documents pour le moment."); }
}

const URL_DOSSIER = /https:\/\/(drive\.google\.com\/drive\/[^\s]*folders\/[\w-]+[^\s]*|[\w-]+\.sharepoint\.com\/[^\s]+|onedrive\.live\.com\/[^\s]+|1drv\.ms\/[^\s]+)/i;
// Le chat sert aussi de menu : quand on parle d'une page, un bouton l'ouvre (moins d'entrées dans le menu).
const PAGES_CHAT = [
  [/revue|hebdo|bilan de (la )?semaine/i, "Ouvrir ma revue de la semaine", "/app/revue"],
  [/bien-?être|respiration|médit|rituel|stress|mindset/i, "Ouvrir Bien-être & Mindset", "/app/bien-etre"],
  [/radar|prospect/i, "Ouvrir le Radar", "/app/radar"],
  [/plan d'action|mes actions|tâches?|objectifs?|idées?/i, "Ouvrir le Plan d'action", "/app/actions"],
  [/vision( board)?\b/i, "Ouvrir ma Vision", "/app/vision"],
  [/agents?( ia)?|chatbot/i, "Ouvrir les Agents IA", "/app/agents"],
  [/paramètres|réglages|connexions?|drive|onedrive|trello|teams/i, "Ouvrir les Paramètres", "/parametres"],
  [/mon compte|factures?|abonnement|offre|fidélité|parrain/i, "Ouvrir Mon compte", "/compte"],
  [/ma foi|prière|verset/i, "Ouvrir Ma Foi", "/app/ma-foi"],
];
const pagesCitees = (t) => PAGES_CHAT.filter(([re]) => re.test(t || "")).slice(0, 2);
const DEMANDE_IMAGE = /\b(image|logo|visuel|illustration|photo|affiche|banni[eè]re|dessin)\b/i;
const estDocument = (t) => (t || "").length > 450 || /(^|\n)#{1,3} |\n\|.+\|/.test(t || "");
const titreDocument = (t) => ((t || "").split("\n").find((l) => l.trim()) || "Document").replace(/^#+\s*/, "").replace(/[*_`]/g, "").slice(0, 80);
const heure = (d) => (d ? new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "");

// Mise en forme légère des réponses IA : gras, titres, listes à puces et numérotées.
// Évite d'afficher les symboles Markdown bruts (#, **, -) dans les bulles du Copilote.
const rendreInline = (texte) =>
  (texte || "").split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    /^\*\*[^*]+\*\*$/.test(p)
      ? <strong key={i} className="font-semibold text-offwhite">{p.slice(2, -2)}</strong>
      : <span key={i}>{p.replace(/\*\*/g, "")}</span>,
  );

function TexteRiche({ texte }) {
  const lignes = (texte || "").split("\n");
  const blocs = [];
  let puces = null;
  const vider = () => { if (puces) { blocs.push({ type: "ul", items: puces }); puces = null; } };
  lignes.forEach((brut) => {
    const l = brut.replace(/\s+$/, "");
    const h = l.match(/^(#{1,3})\s+(.*)$/);
    const b = l.match(/^\s*[-*•]\s+(.*)$/);
    const ol = l.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (h) { vider(); blocs.push({ type: "h", text: h[2] }); }
    else if (b) { (puces = puces || []).push(b[1]); }
    else if (ol) { vider(); blocs.push({ type: "ol", num: ol[1], text: ol[2] }); }
    else if (l.trim() === "") { vider(); blocs.push({ type: "br" }); }
    else { vider(); blocs.push({ type: "p", text: l }); }
  });
  vider();
  return (
    <>
      {blocs.map((bk, i) => {
        if (bk.type === "h") return <p key={i} className="mb-1 mt-2 font-semibold text-offwhite first:mt-0">{rendreInline(bk.text)}</p>;
        if (bk.type === "ul") return <ul key={i} className="my-1 space-y-1">{bk.items.map((it, k) => <li key={k} className="flex gap-2"><span className="mt-[3px] text-gold">•</span><span className="min-w-0 flex-1">{rendreInline(it)}</span></li>)}</ul>;
        if (bk.type === "ol") return <p key={i} className="my-1 flex gap-2"><span className="font-semibold text-gold">{bk.num}.</span><span className="min-w-0 flex-1">{rendreInline(bk.text)}</span></p>;
        if (bk.type === "br") return <div key={i} className="h-2" />;
        return <p key={i} className="my-1 first:mt-0 last:mb-0">{rendreInline(bk.text)}</p>;
      })}
    </>
  );
}


const SHORTCUTS = [
  { key: "capture", icon: Lightbulb, label: "Capturer une idée", prompt: "J'ai une idée à capturer, aide-moi à la clarifier en une phrase." },
  { key: "recuperation", icon: BatteryLow, label: "Je suis à plat", prompt: "Je me sens à plat aujourd'hui. Aide-moi à alléger ma journée." },
  { key: "next", icon: Compass, label: "Que faire maintenant ?", prompt: "Compte tenu de mon énergie, que devrais-je faire maintenant ?" },
  { key: "revue", icon: ListChecks, label: "Ma revue de la semaine", prompt: "Je veux faire ma revue de la semaine." },
  { key: "juridique", icon: Scale, label: "Question juridique", prompt: "J'ai une question juridique. Demande-moi ma situation, les faits utiles, les dates importantes et les documents concernés, puis réponds-moi avec les règles de droit applicables." },
];

const TABS = [
  { key: "chat", label: "Assistant", icon: Sparkles },
  { key: "decisions", label: "Décisions", icon: ListChecks },
  { key: "actu", label: "Actualité", icon: Newspaper },
];

export function ChatBody({ onClose, estElargi, onToggleTaille, grand = false, surReglages, sansEnTete = false }) {
  const { user } = useKairos();
  // Onglet initial : celui demandé par openChat("actu" | "decisions" | "chat"),
  // consommé ici — fiable même si le panneau vient tout juste de se monter.
  const [tab, setTab] = useState(() => prendreOngletEnAttente() || (() => { try { return new URLSearchParams(window.location.search).get("tab") === "actu" ? "actu" : null; } catch { return null; } })() || "chat");
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
    const chat = () => setTab("chat");
    window.addEventListener("kairos:ouvrir-chat", chat);
    // « En parler à l'IA » depuis un article : bascule sur l'Assistant —
    // le texte est consommé par ChatTab au montage (ou via l'événement si déjà monté).
    const prompt = () => setTab("chat");
    window.addEventListener("kairos:ouvrir-actu", ouvrir);
    window.addEventListener("kairos:ouvrir-decisions", decisions);
    window.addEventListener("kairos:prompt-chat", prompt);
    return () => { window.removeEventListener("kairos:ouvrir-chat", chat); window.removeEventListener("kairos:ouvrir-actu", ouvrir); window.removeEventListener("kairos:ouvrir-decisions", decisions); window.removeEventListener("kairos:prompt-chat", prompt); };
  }, []);

  useEffect(() => {
    const onSync = (event) => setCloudSync(event.detail || { provider: "cloud" });
    window.addEventListener("zayado:cloud-sync", onSync);
    return () => window.removeEventListener("zayado:cloud-sync", onSync);
  }, []);

  return (
    <div className="relative flex h-full flex-col">
      <CollaborateurModal open={!!collab} contexte={collab?.contexte || ""} onClose={() => setCollab(null)} />
      {!sansEnTete && (
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className={grand ? "flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 ring-1 ring-gold/30" : "flex h-8 w-8 items-center justify-center rounded-xl bg-gold/15 ring-1 ring-gold/30"}>
            <Sparkles className={grand ? "h-5 w-5 text-gold" : "h-4 w-4 text-gold"} />
          </div>
          <div className="leading-tight">
            <div className={`whitespace-nowrap font-display font-bold text-offwhite ${grand ? "text-lg" : "text-sm"}`}>Copilote Zayado</div>
            <div className={`flex items-center gap-1.5 whitespace-nowrap text-offwhite/55 ${grand ? "text-[12.5px]" : "text-[10px]"}`}><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {grand ? "Connaît ton activité · Mémoire active" : "Mémoire active"}</div>
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
            <Users className="h-3.5 w-3.5" /> {grand ? "Collaborateur" : <span className="sr-only">Collaborateur</span>}
          </button>
          {grand && surReglages && (
            <button onClick={surReglages} className="rounded-lg p-1.5 text-offwhite/50 hover:bg-white/5 hover:text-gold" data-testid="chat-grand-reglages" title="Réglages du Copilote">
              <Settings className="h-4 w-4" />
            </button>
          )}
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
      )}

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
function ItemExport({ icon: Icone, label, onClick, testid }) {
  return (
    <button onClick={onClick} data-testid={testid}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] text-offwhite/80 transition hover:bg-white/8 hover:text-gold">
      <Icone size={13} /> {label}
    </button>
  );
}

function ActionsMessage({ m, demande, onCopier, onImage, i }) {
  const [envoi, setEnvoi] = useState(null);
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const plan = usePlanEffectif();
  const docsOk = !plan || aDroit(plan, "documents");
  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10.5px] font-medium text-offwhite/60 transition hover:border-gold/40 hover:text-gold disabled:opacity-50";
  const doc = docsOk && !m.image && estDocument(m.content);
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
      {doc && (
        <div className="relative">
          <button className={btn} disabled={!!envoi} onClick={() => setMenu((v) => !v)} data-testid={`chat-export-${i}`} aria-expanded={menu}>
            {charge("docx", FileDown)} Exporter <span className="opacity-60">▾</span>
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setMenu(false)} />
              <div className="absolute left-0 z-[61] mt-1 w-52 overflow-hidden rounded-xl border border-white/12 bg-[#0b1430] p-1 shadow-xl" data-testid={`chat-export-menu-${i}`}>
                <ItemExport icon={FileText} label="Word (.docx)" testid={`chat-word-${i}`} onClick={() => { setMenu(false); faire("docx", () => telechargerDocument(titre, m.content, "docx")); }} />
                <ItemExport icon={FileSpreadsheet} label="Excel (.xlsx)" onClick={() => { setMenu(false); faire("xlsx", () => telechargerDocument(titre, m.content, "xlsx")); }} />
                <ItemExport icon={FileDown} label="Markdown (.md)" onClick={() => { setMenu(false); faire("md", () => telechargerDocument(titre, m.content, "md")); }} />
                <div className="my-1 h-px bg-white/10" />
                <ItemExport icon={UploadCloud} label="Ranger dans mon Drive" testid={`chat-drive-${i}`} onClick={() => { setMenu(false); faire("drive", async () => {
                  const r = await rangerDocumentDrive(titre, m.content, "docx");
                  window.dispatchEvent(new CustomEvent("zayado:cloud-sync", { detail: { provider: r.provider } }));
                  toast.success(`« ${r.nom} » rangé dans ton Drive.`, r.url ? { action: { label: "Ouvrir", onClick: () => window.open(r.url, "_blank", "noopener") } } : undefined);
                }); }} />
              </div>
            </>
          )}
        </div>
      )}
      {pagesCitees(demande).map(([, label, chemin]) => (
        <button key={chemin} className={`${btn} !border-gold/40 !text-gold`} onClick={() => navigate(chemin)} data-testid={`chat-page-${chemin.replace(/\//g, "-")}`}>
          <ExternalLink size={11} /> {label}
        </button>
      ))}
      {docsOk && DEMANDE_IMAGE.test(demande || "") && (
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
// Mise en route : le Copilote pose ses questions UNE par UNE, comme dans une vraie
// conversation (il « écrit », pose la question, attend la réponse, confirme, puis passe
// à la suivante). « Plus tard » arrête jusqu'au lendemain. Tout reste modifiable dans Paramètres.
const contient = (v, x) => String(v || "").includes(x);
const REGLAGES = [
  { key: "copilote_ton", texte: "Pour commencer : comment préfères-tu que je te parle ?",
    options: [
      { valeur: "doux", label: "Doux et bienveillant", confirm: "Entendu, je reste doux et bienveillant." },
      { valeur: "direct", label: "Direct et concis", confirm: "Entendu, j'irai droit au but." },
      { valeur: "coach", label: "Coach qui me challenge", confirm: "Entendu, je te challengerai, toujours avec respect." },
    ] },
  { key: "documents_choix", type: "dossier", texte: "Je peux te créer des documents (devis, courriers, tableaux Word ou Excel). Où veux-tu que je les range ?",
    fait: (val) => val("documents_dossier") || val("documents_dossier_auto") || val("documents_choix") },
  { key: "outils", multi: true, texte: "Quels outils utilises-tu déjà ? Je relierai ton Plan d'action à ceux qui le permettent.",
    options: OUTILS.map((o) => ({ valeur: o, label: o })) },
  { key: "trello_vu", type: "trello", texte: "Tu utilises Trello : je peux envoyer chaque action de ton Plan d'action dans une liste Trello. On le relie ?",
    si: (val) => contient(val("outils"), "Trello") },
  { key: "teams_vu", type: "teams", texte: "Tu utilises Microsoft Teams : si tu as une équipe dans Zayado, ajoute l'onglet Équipe dans Teams pour voir présence, absences et planning. Ton cockpit personnel reste privé, il n'y apparaît pas.",
    si: (val) => contient(val("outils"), "Teams") },
  { key: "heure_point", texte: "À quelle heure veux-tu recevoir ton point du jour ?",
    options: ["07:30", "08:30", "09:30", "12:00"].map((h) => ({ valeur: h, label: h.replace(":", "h"), confirm: `Noté, ton point du jour arrivera à ${h.replace(":", "h")}.` })) },
  { key: "actu_rythme", texte: "À quel rythme veux-tu que je te signale l'actualité de ton marché ?",
    options: RYTHMES_ACTU.map((r) => ({ valeur: r.key, label: r.label, confirm: r.confirm })) },
  { key: "canaux_vus", type: "canaux", texte: "Dernière chose : veux-tu aussi me parler depuis ton téléphone (Telegram ou WhatsApp) ?" },
];
const aujourdhuiIso = () => new Date().toISOString().slice(0, 10);
const puce = "rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/20";

function ChoixDossier({ onFini }) {
  const [etat, setEtat] = useState(null);
  const [saisie, setSaisie] = useState(false);
  const [url, setUrl] = useState("");
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => { fetchDossierDocuments().then(setEtat).catch(() => setEtat({})); }, []);
  const relie = etat && (etat.google || etat.microsoft);
  const relier = async (p) => {
    try { const r = await oauthStockage(p); if (r.configured && r.authorization_url) { window.location.href = r.authorization_url; return; } toast("Cette connexion n'est pas encore activée."); }
    catch { toast.error("Connexion impossible pour le moment."); }
  };
  const enregistrer = async () => {
    setEnvoi(true);
    try { await reglerDossierDocuments(url.trim()); onFini("url", "Voici l'adresse de mon dossier", "C'est noté, je rangerai tes documents dans ce dossier."); }
    catch (e) { toast.error(e.detail || "Adresse non reconnue."); } finally { setEnvoi(false); }
  };
  if (!etat) return <Loader2 className="h-4 w-4 animate-spin text-gold" />;
  return (
    <div className="space-y-2" data-testid="reglage-dossier">
      <div className="flex flex-wrap gap-2">
        {relie ? (
          <button className={puce} onClick={() => onFini("auto", "Un dossier Zayado dans mon Drive", "Parfait, je créerai un dossier « Zayado » dans ton Drive au premier document.")} data-testid="reglage-dossier-auto">Un dossier « Zayado » dans mon Drive</button>
        ) : (<>
          <button className={puce} onClick={() => relier("google")} data-testid="reglage-dossier-google">Relier Google Drive</button>
          <button className={puce} onClick={() => relier("microsoft")} data-testid="reglage-dossier-onedrive">Relier OneDrive</button>
        </>)}
        <button className={puce} onClick={() => setSaisie(true)} data-testid="reglage-dossier-url">Je colle l'adresse d'un dossier</button>
        <button className={puce} onClick={() => onFini("telecharger", "Je les télécharge moi-même", "D'accord, je te proposerai de télécharger chaque document en Word, Excel ou Markdown.")}>Je les télécharge</button>
      </div>
      {saisie && (
        <div className="flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/drive/folders/…" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-offwhite" data-testid="reglage-dossier-input" />
          <button disabled={!url.trim() || envoi} onClick={enregistrer} className="rounded-xl bg-gold px-3 py-2 text-xs font-semibold text-navy-900 disabled:opacity-50">Enregistrer</button>
        </div>
      )}
    </div>
  );
}

function RelierTrello({ onFini }) {
  const [cle, setCle] = useState("");
  const [jeton, setJeton] = useState("");
  const [tableaux, setTableaux] = useState(null);
  const [liste, setListe] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const champ = "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-offwhite";
  const verifier = async () => {
    setEnvoi(true);
    try { const r = await relierTrello(cle.trim(), jeton.trim()); setTableaux(r.tableaux); }
    catch (e) { toast.error(e.detail || "Trello refuse ces identifiants."); } finally { setEnvoi(false); }
  };
  const choisir = async () => {
    setEnvoi(true);
    try { const r = await choisirListeTrello(liste); onFini("relie", `Liste « ${r.liste} »`, `C'est relié : chaque nouvelle action ira dans la liste « ${r.liste} » de ton tableau « ${r.tableau} ».`); }
    catch (e) { toast.error(e.detail || "Impossible."); } finally { setEnvoi(false); }
  };
  if (tableaux) {
    return (
      <div className="flex gap-2" data-testid="reglage-trello-liste">
        <select value={liste} onChange={(e) => setListe(e.target.value)} className={`${champ} min-w-0 flex-1`}>
          <option value="" className="text-navy-900">Choisis la liste…</option>
          {tableaux.map((b) => <optgroup key={b.id} label={b.nom} className="text-navy-900">{b.listes.map((l) => <option key={l.id} value={l.id} className="text-navy-900">{l.nom}</option>)}</optgroup>)}
        </select>
        <button disabled={!liste || envoi} onClick={choisir} className="rounded-xl bg-gold px-3 py-2 text-xs font-semibold text-navy-900 disabled:opacity-50">Valider</button>
      </div>
    );
  }
  return (
    <div className="space-y-2" data-testid="reglage-trello">
      <p className="text-[11.5px] text-offwhite/60">Ta clé et ton jeton se trouvent sur trello.com/power-ups/admin (onglet « Clé API »). Ils sont chiffrés chez Zayado.</p>
      <input value={cle} onChange={(e) => setCle(e.target.value)} placeholder="Clé API Trello" className={champ} />
      <input value={jeton} onChange={(e) => setJeton(e.target.value)} placeholder="Jeton Trello" type="password" className={champ} />
      <div className="flex gap-2">
        <button disabled={cle.length < 10 || jeton.length < 10 || envoi} onClick={verifier} className="rounded-xl bg-gold px-3 py-1.5 text-xs font-semibold text-navy-900 disabled:opacity-50">{envoi ? "Vérification…" : "Relier Trello"}</button>
        <button className={puce} onClick={() => onFini("non", "Pas maintenant", "Pas de souci, tu pourras le faire plus tard en me le demandant.")}>Pas maintenant</button>
      </div>
    </div>
  );
}

function ControlesReglage({ q, onRepondre, onPlusTard }) {
  const [choix, setChoix] = useState([]);
  const [canaux, setCanaux] = useState(false);
  const navigate = useNavigate();
  const fini = (valeur, label, confirm) => onRepondre(q, valeur, label, confirm);
  let corps = null;
  if (q.type === "dossier") corps = <ChoixDossier onFini={fini} />;
  else if (q.type === "trello") corps = <RelierTrello onFini={fini} />;
  else if (q.type === "teams") corps = (
    <div className="flex flex-wrap gap-2">
      <button className={puce} onClick={() => { fini("vu", "Je regarde le pack Teams", "Le pack Teams est dans Paramètres › Connexions : télécharge-le puis ajoute-le dans Teams (Applications › Gérer vos applications › Charger une application). Il affiche ton équipe, pas ton cockpit personnel."); navigate("/parametres#connexions"); }}>Voir le pack Teams</button>
      <button className={puce} onClick={() => fini("plus_tard", "Plus tard", "D'accord, demande-le-moi quand tu veux.")}>Plus tard</button>
    </div>);
  else if (q.type === "canaux") corps = canaux ? <CanauxCopilote compact onFerme={() => fini("vu", "C'est bon", "Parfait. On est prêts : dis-moi par quoi on commence.")} /> : (
    <div className="flex flex-wrap gap-2">
      <button className={puce} onClick={() => setCanaux(true)} data-testid="reglage-canaux-oui">Oui, montre-moi</button>
      <button className={puce} onClick={() => fini("non", "Non merci", "Très bien. On est prêts : dis-moi par quoi on commence.")} data-testid="reglage-canaux-non">Non merci</button>
    </div>);
  else corps = (
    <>
      <div className="flex flex-wrap gap-2">
        {q.options.map((o) => {
          const pris = choix.includes(o.valeur);
          return (
            <button key={o.valeur} data-testid={`reglage-${q.key}-${o.valeur}`}
              onClick={() => (q.multi ? setChoix((c) => (pris ? c.filter((x) => x !== o.valeur) : [...c, o.valeur])) : fini(o.valeur, o.label, o.confirm))}
              className={pris ? "rounded-full border border-gold bg-gold px-3 py-1.5 text-xs font-medium text-navy-900" : puce}>{o.label}</button>
          );
        })}
      </div>
      {q.multi && (
        <button onClick={() => fini(choix.length ? choix.join(", ") : "aucun", choix.length ? choix.join(", ") : "Aucun de ces outils",
          choix.length ? `Noté : ${choix.join(", ")}.` : "Noté, pas d'outil externe pour l'instant.")}
          className="mt-2 rounded-full bg-gold px-3.5 py-1.5 text-xs font-semibold text-navy-900" data-testid={`reglage-${q.key}-valider`}>Valider</button>
      )}
    </>);
  return (
    <div className="space-y-2" data-testid={`reglage-${q.key}`}>
      {corps}
      <button onClick={onPlusTard} className="block text-[11.5px] text-offwhite/45 hover:text-offwhite" data-testid={`reglage-${q.key}-plus-tard`}>Plus tard (je te redemanderai demain)</button>
    </div>
  );
}

function ChatTab({ firstName, grand = false }) {
  const { mode, contexte, aCheckin, priorities, loaded, majContexte } = useKairos();
  // Nouveau compte (aucun check-in, aucune action) : le Copilote se présente et
  // propose les 3 premiers pas, au lieu d'une simple formule de politesse.
  const debutant = loaded && !aCheckin && !(priorities || []).length;
  const accueil = debutant
    ? `Bienvenue${firstName ? ` ${firstName}` : ""} 👋 Je suis ton Copilote Zayado. Je vais te poser quelques questions rapides, une à la fois, pour me régler sur toi. Ensuite on fera ton premier check-in et ta première action.`
    : `Bonjour${firstName ? ` ${firstName}` : ""}. Je suis le Copilote IA Zayado, là pour t'accompagner en douceur. Par quoi commence-t-on ?`;
  // Source de vérité = le magasin ; ce composant n'en est que l'affichage (il s'y abonne tant qu'il est monté).
  const [messages, setMessagesLocal] = useState(() => {
    if (!memoireChat.messages) memoireChat.messages = [{ role: "assistant", content: accueil }];
    return memoireChat.messages;
  });
  const [streaming, setStreamingLocal] = useState(memoireChat.streaming);
  const setMessages = majMessages;
  const setStreaming = majStreaming;
  useEffect(() => {
    const f = (e) => { setMessagesLocal(e.messages); setStreamingLocal(e.streaming); };
    memoireChat.abonnes.add(f);
    f({ messages: memoireChat.messages, streaming: memoireChat.streaming }); // rattrape ce qui est arrivé entre le rendu et l'abonnement
    return () => { memoireChat.abonnes.delete(f); };
  }, []);

  // Après un rechargement complet (ou une nouvelle session), on relit les derniers messages gardés côté serveur.
  const [historiqueOk, setHistoriqueOk] = useState(memoireChat.historiqueCharge);
  useEffect(() => {
    if (memoireChat.historiqueCharge) return undefined;
    let annule = false;
    fetchHistoriqueChat()
      .then((h) => {
        if (annule) return;
        memoireChat.historiqueCharge = true;
        const passe = (Array.isArray(h) ? h : []).filter((x) => x && x.contenu)
          .map((x) => ({ role: x.role === "user" ? "user" : "assistant", content: x.contenu, le: x.le || undefined }));
        // Seulement si rien n'a encore été dit dans cette session (sinon on risquerait des doublons).
        if (passe.length) majMessages((cur) => (cur.length === 1 ? [cur[0], ...passe] : cur));
        setHistoriqueOk(true);
        // Dernier message = le tien, envoyé il y a moins de 3 min, sans réponse : l'IA écrit encore côté serveur
        // (tu as fermé la page entre-temps). On le montre au lieu de laisser croire que rien ne se passe.
        const dernier = passe[passe.length - 1];
        const depuis = dernier?.le ? new Date(dernier.le).getTime() : 0;
        if (dernier && dernier.role === "user" && depuis && Date.now() - depuis < 180000 && !memoireChat.streaming) {
          majMessages((cur) => [...cur, { role: "assistant", content: "", le: new Date().toISOString() }]);
          majStreaming(true);
          reprendreDepuisServeur(dernier.content, depuis).then((texte) => {
            if (texte) {
              majMessages((cur) => { const c = [...cur]; c[c.length - 1] = { role: "assistant", content: texte, le: new Date().toISOString() }; return c; });
              majStreaming(false);
              alerterReponse();
            } else {
              majMessages((cur) => (cur.length && cur[cur.length - 1].role === "assistant" && !cur[cur.length - 1].content ? cur.slice(0, -1) : cur));
              majStreaming(false);
            }
          });
        }
      })
      .catch(() => { if (!annule) { memoireChat.historiqueCharge = true; setHistoriqueOk(true); } });
    return () => { annule = true; };
  }, []);
  useEffect(() => {
    contexteChat.texte = messages.slice(1).slice(-8)
      .map((m) => `${m.role === "user" ? "Moi" : "Copilote"} : ${String(m.content || "").slice(0, 600)}`).join("\n");
  }, [messages]);
  const [input, setInput] = useState("");

  // Le profil arrive souvent après le 1er rendu : tant que la conversation
  // n'a pas démarré, on met à jour le message d'accueil avec le prénom.
  useEffect(() => {
    setMessages((m) => (m.length === 1 && m[0].role === "assistant" && m[0].content !== accueil ? [{ role: "assistant", content: accueil }] : m));
  }, [accueil]);

  const { ref: scrollRef, onScroll: surDefilement, decolle, versLeBas } = useChatScroll(
    [messages, streaming], { dernierEstMoi: messages[messages.length - 1]?.role === "user" });

  const [conversationLibre, setConversationLibre] = useState(memoireChat.libre);
  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content) return;
    memoireChat.libre = true;
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
      onDone: () => { setStreaming(false); alerterReponse(); },
      onError: async (err, info) => {
        if (info?.coupee) {
          // Connexion coupée en cours de route : le serveur continue ; on va chercher la réponse complète.
          const texte = await reprendreDepuisServeur(content, Date.parse(le));
          if (texte) {
            setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: texte, le: new Date().toISOString() }; return c; });
            setStreaming(false);
            alerterReponse();
            return;
          }
        }
        setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: `Désolé, ${err}` }; return c; });
        setStreaming(false);
      },
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

  // « Nouvelle conversation » (rail gauche) : on repart d'une page blanche, sans recharger l'historique.
  useEffect(() => {
    const f = () => majMessages(() => [{ role: "assistant", content: accueil }]);
    window.addEventListener("kairos:chat-nouveau", f);
    return () => window.removeEventListener("kairos:chat-nouveau", f);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // Mise en route conversationnelle : une question à la fois.
  const [reponses, setReponses] = useState({});
  const val = (k) => reponses[k] ?? contexte?.[k];
  const reporte = val("reglages_reportes_le") === aujourdhuiIso();
  const faite = (q) => (q.si && !q.si(val)) || (q.fait ? !!q.fait(val) : !(val(q.key) == null || val(q.key) === ""));
  const [ecrit, setEcrit] = useState(false);
  // Les questions attendent la fin (ou le refus) de la visite guidée : une chose à la fois.
  const [tourFini, setTourFini] = useState(() => { try { return localStorage.getItem("zayado_visite_guidee_v1") === "1"; } catch { return true; } });
  useEffect(() => {
    const f = () => setTourFini(true);
    window.addEventListener("zayado:tour-fini", f);
    return () => window.removeEventListener("zayado:tour-fini", f);
  }, []);
  const enAttente = messages.some((m) => m.reglage && !m.repondu);
  useEffect(() => {
    if (!tourFini || !historiqueOk || !contexte || reporte || conversationLibre || streaming || ecrit || enAttente) return undefined;
    const q = REGLAGES.find((x) => !faite(x));
    if (!q) return undefined;
    setEcrit(true);
    const t = setTimeout(() => {
      setEcrit(false);
      setMessages((m) => [...m, { role: "assistant", content: q.texte, reglage: q.key, le: new Date().toISOString() }]);
    }, messages.length <= 1 ? 1400 : 1000);
    return () => { clearTimeout(t); setEcrit(false); };
  }, [tourFini, historiqueOk, contexte, reporte, conversationLibre, streaming, enAttente, reponses]); // eslint-disable-line react-hooks/exhaustive-deps

  const repondre = (q, valeur, label, confirm) => {
    setReponses((r) => ({ ...r, [q.key]: valeur }));
    // majContexte met à jour le contexte de TOUTE l'app tout de suite. Avant, seul l'état local de ce composant
    // était mis à jour : après un changement de page, la réponse était oubliée et la même question revenait.
    majContexte({ [q.key]: valeur }).catch(() => {});
    if (q.key === "heure_point") saveProfile({ heure_checkin: valeur }).catch(() => {});
    const le = new Date().toISOString();
    setMessages((m) => [...m.map((x) => (x.reglage === q.key ? { ...x, repondu: true } : x)), { role: "user", content: label, le },
      ...(confirm ? [{ role: "assistant", content: confirm, le, info: true }] : [])]);
  };
  const plusTard = () => {
    setReponses((r) => ({ ...r, reglages_reportes_le: aujourdhuiIso() }));
    setMessages((m) => [...m.map((x) => (x.reglage && !x.repondu ? { ...x, repondu: true } : x)),
      { role: "assistant", content: "D'accord, on verra ça demain. Je suis là si tu as besoin.", info: true, le: new Date().toISOString() }]);
    majContexte({ reglages_reportes_le: aujourdhuiIso() }).catch(() => {});
  };

  return (
    <div className="relative flex h-full flex-col">
      {grand && messages.length > 1 && !streaming && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/4 z-0 flex justify-center opacity-[0.14]">
          <div className="chat-orb scale-[3]"><span /><span /><span /><i /></div>
        </div>
      )}
      <div ref={scrollRef} onScroll={surDefilement} className={`relative z-10 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5 ${messages.length <= 1 && !streaming ? "flex flex-col justify-center" : ""}`}>
        {messages.length <= 1 && !streaming && (
          <div className="chat-accueil flex flex-col items-center gap-3 pb-2 text-center" data-testid="chat-accueil">
            <div className="chat-orb" aria-hidden="true"><span /><span /><span /><i /></div>
            <p className={`font-display font-bold text-offwhite ${grand ? "text-2xl" : "text-lg"}`}>Ton Copilote t'écoute.</p>
            <p className={`leading-relaxed text-offwhite/55 ${grand ? "max-w-sm text-sm" : "max-w-[280px] text-xs"}`}>Commence par un raccourci, ou pose ta question librement — il connaît ton activité.</p>
            {!grand && <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {SHORTCUTS.slice(0, 3).map((s) => (
                <button key={s.key} onClick={() => send(s.prompt)} data-testid={`chat-suggestion-${s.key}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/[0.07] px-3 py-1.5 text-[11px] font-medium text-offwhite/85 transition-all duration-200 hover:border-gold/50 hover:bg-gold/15 hover:text-gold">
                  <s.icon className="h-3 w-3 text-gold" /> {s.label}
                </button>
              ))}
            </div>}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`group/msg flex items-start gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`} data-testid={`chat-msg-${m.role}`}>
            {m.role === "user" ? (
              <div aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F1E2CC] to-[#C9973B] text-[10px] font-bold text-[#0f1b3a] ring-1 ring-gold/40">
                {(firstName || "M").slice(0, 1).toUpperCase()}
              </div>
            ) : (
              <div aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy ring-1 ring-gold/30">
                <Sparkles className="h-3.5 w-3.5 text-gold" />
              </div>
            )}
            <div className={`max-w-[85%] ${m.role === "assistant" ? "space-y-2" : ""}`}>
              <div className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-md bg-gradient-to-br from-[#F1E2CC] to-[#DEC2A3] text-[#0f1b3a] shadow-[0_2px_14px_rgba(232,199,126,0.16)]"
                  : "rounded-bl-md border border-white/10 bg-white/[0.06] text-offwhite backdrop-blur-sm"
              }`}>
                {m.image ? <img src={m.image.src} alt={m.content} className="max-h-80 rounded-xl" /> : (m.content ? (m.role === "assistant" ? <TexteRiche texte={m.content} /> : m.content) : (streaming && i === messages.length - 1 ? <span className="inline-flex items-center gap-2 text-xs text-offwhite/60" data-testid="chat-reflechit">l'IA réfléchit<span className="ia-points"><i /><i /><i /></span></span> : null))}
                {(grand || i > 0) && m.le && m.content && !(streaming && i === messages.length - 1) && <span className={`mt-1.5 block text-[10.5px] ${m.role === "user" ? "opacity-55" : "text-offwhite/40"}`}>{heure(m.le)}</span>}
              </div>
              {m.reglage && !m.repondu && <ControlesReglage q={REGLAGES.find((q) => q.key === m.reglage)} onRepondre={repondre} onPlusTard={plusTard} />}
              {m.role === "assistant" && m.content && i > 0 && !m.reglage && !m.info && !(streaming && i === messages.length - 1) && (
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
        {ecrit && (
          <div className="flex items-start justify-start gap-2.5" data-testid="chat-ecrit">
            <div aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy ring-1 ring-gold/30">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
            </div>
            <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3">
              <span className="chat-points text-offwhite/70" aria-label="Le Copilote écrit"><i /><i /><i /></span>
            </div>
          </div>
        )}
        <BoutonDernierMessage visible={decolle} onClick={versLeBas} />
      </div>
      <div className="border-t border-white/10 px-4 py-3">
        <div className={grand ? "mx-auto w-full max-w-[900px]" : ""}>
          {!(grand && messages.length <= 1 && !streaming) && (
            <div className="mb-2 -mx-1 flex flex-nowrap gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              data-testid="ai-shortcuts"
              onWheel={(e) => { if (e.deltaY && !e.deltaX) e.currentTarget.scrollLeft += e.deltaY; }}>
              {SHORTCUTS.map((s) => (
                <button key={s.key} onClick={() => send(s.prompt)} disabled={streaming} data-testid={`ai-shortcut-${s.key}`}
                  className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-offwhite/80 transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50">
                  <s.icon className="h-3 w-3 text-gold" /> {s.label}
                </button>
              ))}
            </div>
          )}
          <div className="chat-input-card rounded-3xl border border-gold/25 bg-white/[0.04] px-3 pb-2 pt-2 shadow-[0_10px_34px_rgba(232,199,126,0.07)] transition-colors duration-300 focus-within:border-gold/55 focus-within:bg-white/[0.06]">
            <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Écris au Copilote IA…" data-testid="chat-input"
              className="max-h-28 w-full resize-none border-0 bg-transparent px-1 py-1.5 text-sm text-offwhite placeholder:text-offwhite/40 focus:outline-none" />
            <div className="flex items-center justify-between pt-0.5">
              <span className="hidden pl-1 text-[10px] text-offwhite/35 sm:inline">Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne</span>
              <span className="inline pl-1 text-[10px] text-offwhite/35 sm:hidden" />
              <div className="flex items-center gap-1.5">
                <button className="flex h-8 w-8 items-center justify-center rounded-full text-offwhite/50 transition-colors hover:bg-white/5 hover:text-gold" title="Vocal (bientôt)" data-testid="chat-mic-btn">
                  <Mic className="h-4 w-4" />
                </button>
                <button onClick={() => send()} disabled={streaming || !input.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#E8C77E] to-[#C9973B] text-[#0f1b3a] shadow-lg shadow-gold/20 transition-all duration-200 hover:scale-105 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                  data-testid="chat-send-btn" title="Envoyer">
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          {grand && messages.length <= 1 && !streaming && (
            <div className="mt-4 flex flex-col items-center gap-2.5" data-testid="chat-suggestions-bas">
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-offwhite/60">
                <Sparkles className="h-3.5 w-3.5 text-gold" /> Essaie de demander :
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {SHORTCUTS.slice(0, 4).map((s) => (
                  <button key={s.key} onClick={() => send(s.prompt)} disabled={streaming} data-testid={`chat-suggestion-${s.key}`}
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[12px] text-offwhite/80 transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50">
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {grand && (
            <p className="mt-3 text-center text-[11px] text-offwhite/40" data-testid="chat-grand-astuce">
              Range tes fichiers avec « Mes documents » · Survole un message pour le copier · Le Copilote propose, tu décides.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
function PointTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = async (refresh = false) => { setLoading(true); try { setData(await fetchPointDuJour(refresh)); } catch { setData({ texte: "Indisponible pour le moment." }); } setLoading(false); };
  useEffect(() => { load(); }, []);
  return (
    <div className="h-full overflow-y-auto px-5 py-5" data-testid="point-du-jour">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Ton point du jour</p>
        <button onClick={() => load(true)} className="rounded-lg p-1.5 text-offwhite/50 hover:text-gold" data-testid="point-refresh" title="Réécrire mon point du jour"><RefreshCw className="h-4 w-4" /></button>
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

// ── Actualité : 3 questions en boutons (rythme, canal, nombre), enregistrées tout de suite ──
const QUESTIONS_ACTU = [
  { cle: "actu_rythme", texte: "À quel rythme veux-tu recevoir ton actualité ?",
    options: [{ v: "quotidien", l: "Chaque matin", c: "C'est noté : une actu chaque matin." }, { v: "lundi", l: "Chaque semaine (lundi)", c: "C'est noté : ton actu arrivera chaque lundi." }, { v: "jamais", l: "À la demande", c: "C'est noté : rien ne sera envoyé, tu viens la chercher ici." }] },
  { cle: "actu_canaux", texte: "Par quel canal ?",
    options: [{ v: ["push"], l: "Notification (conseillé)", c: "Parfait : dans l'appli et sur ton téléphone, sans remplir ta boîte mail." }, { v: ["email"], l: "E-mail (2 par semaine max)", c: "Parfait, par e-mail : le lundi et le jeudi au plus." }, { v: ["email", "push"], l: "Les deux", c: "Parfait : notification chaque jour, e-mail 2 fois par semaine au plus." }] },
  { cle: "actu_nb", texte: "Combien d'actus à chaque fois ?",
    options: [{ v: 1, l: "1", c: "Une seule actu, la plus utile." }, { v: 2, l: "2", c: "Deux actus." }, { v: 3, l: "3", c: "Trois actus." }] },
];

function ActuSetup({ onFini }) {
  const [etape, setEtape] = useState(0);
  const [confirm, setConfirm] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const q = QUESTIONS_ACTU[etape];
  const choisir = async (o) => {
    setEnvoi(true);
    try {
      await saveProfile({ contexte_metier: { [q.cle]: o.v } });
      setConfirm(o.c);
      if (etape + 1 >= QUESTIONS_ACTU.length) { onFini(); } else { setEtape(etape + 1); }
    } catch { toast.error("Enregistrement impossible, réessaie."); }
    setEnvoi(false);
  };
  return (
    <div className="space-y-3 rounded-xl border border-gold/20 bg-gold/5 p-4" data-testid="actu-setup">
      {confirm && <p className="text-xs text-offwhite/60" data-testid="actu-setup-confirm">{confirm}</p>}
      <p className="text-sm font-medium text-offwhite">{q.texte}</p>
      <div className="flex flex-wrap gap-2">
        {q.options.map((o) => (
          <button key={o.l} disabled={envoi} onClick={() => choisir(o)} className={puce} data-testid={`actu-setup-${q.cle}-${o.l}`}>{o.l}</button>
        ))}
      </div>
      <p className="text-[11px] text-offwhite/40">Question {etape + 1} sur {QUESTIONS_ACTU.length} · modifiable dans Paramètres › Notifications</p>
    </div>
  );
}

// ── Onglet Actualité (digest piloté par l'énergie) ──
// Le bref est préparé dès l'ouverture de l'app (Header → prechargerActu) et gardé par lib/actuCache :
// ici on affiche TOUJOURS ce qu'on a déjà, tout de suite, puis on rafraîchit discrètement si c'est vieux.
// Le serveur, lui, garde le même bref toute la journée (prochaine actualisation = demain à l'heure choisie).
const heureCourte = (iso) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const quand = (iso) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? `à ${heureCourte(iso)}` : `le ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} à ${heureCourte(iso)}`;
};
const quandFutur = (iso) => {
  const d = new Date();
  const cible = new Date(iso);
  const demain = new Date(); demain.setDate(d.getDate() + 1);
  const jour = cible.toDateString() === d.toDateString() ? "aujourd'hui" : cible.toDateString() === demain.toDateString() ? "demain" : cible.toLocaleDateString("fr-FR", { weekday: "long" });
  return `${jour} à ${heureCourte(iso)}`;
};

function ActuTab() {
  const { contexte } = useKairos();
  const signature = signatureActu(contexte);
  const [filtre, setFiltre] = useState(() => { try { return localStorage.getItem("zayado_actu_filtre") || "tout"; } catch { return "tout"; } });
  const [data, setData] = useState(() => actuConnue(filtre, signature)?.data || null);
  const [loading, setLoading] = useState(() => !actuConnue(filtre, signature));
  const [actualisation, setActualisation] = useState(false);
  const [enregistres, setEnregistres] = useState([]);
  // Filtre : tout / légal (pays du compte) / ma veille (pays, secteurs et mots-clés choisis dans Paramètres).
  const load = async (f = filtre, { force = false } = {}) => {
    const c = actuConnue(f, signature);
    if (c) {
      setData(c.data); setLoading(false);
      if (!force && !c.perime) return;      // déjà à jour : aucune requête
      setActualisation(true);               // sinon : mise à jour discrète, sans effacer ce qui est affiché
    } else {
      setLoading(true);
    }
    try {
      setData(await chargerActu(f, { signature, force }));
    } catch { if (!c) setData({ erreur: true, articles: [] }); }
    setLoading(false); setActualisation(false);
  };
  const chargerEnregistres = async () => { try { const d = await fetchEnregistres(); setEnregistres(d?.articles || []); } catch { /* silencieux */ } };
  useEffect(() => { load(); chargerEnregistres(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const changerFiltre = (f) => { setFiltre(f); try { localStorage.setItem("zayado_actu_filtre", f); } catch { /* */ } load(f); };
  const ETIQUETTES = { officiel: "Officiel", legal: "Juridique", secteur: "Secteur", veille: "Ta veille", presse: "" };

  return (
    <div className="h-full overflow-y-auto px-4 py-4" data-testid="actu-tab">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Actualité</p>
        <Link to="/parametres#notifications" className="text-[11px] text-offwhite/50 hover:text-gold" data-testid="actu-regler">Choisir mes sources</Link>
      </div>
      <div className="mb-3 flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1" data-testid="actu-filtres">
        {[["tout", "Tout"], ["legal", "Légal"], ["perso", "Ma veille"]].map(([k, l]) => (
          <button key={k} onClick={() => changerFiltre(k)} data-testid={`actu-filtre-${k}`}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold transition ${filtre === k ? "bg-gold text-navy-900" : "text-offwhite/65 hover:text-offwhite"}`}>{l}</button>
        ))}
      </div>
      <p className="mb-3 px-1 text-xs text-offwhite/55">{filtre === "legal" ? `Ce qui change pour les entreprises${data?.label ? ` (${data.label})` : ""} : lois, impôts, social.` : filtre === "perso" ? "Tes pays, tes secteurs et tes mots-clés : de quoi publier avant tout le monde." : "Un résumé court, jamais un fil d'actus infini."}</p>
      {data?.genere_a && !data?.masque && !data?.erreur && (
        <p className="mb-3 flex items-center justify-between gap-2 px-1 text-[11px] text-offwhite/45" data-testid="actu-dates">
          <span>Mis à jour {quand(data.genere_a)}{data.prochaine_maj && <> · prochaine actu {quandFutur(data.prochaine_maj)}</>}</span>
          <button onClick={() => load(filtre, { force: true })} disabled={actualisation} data-testid="actu-actualiser"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-offwhite/65 hover:border-gold/40 hover:text-gold disabled:opacity-60">
            <RefreshCw className={`h-3 w-3 ${actualisation ? "animate-spin" : ""}`} /> {actualisation ? "Mise à jour…" : "Actualiser"}
          </button>
        </p>
      )}
      {!loading && data && !data.erreur && !data.masque && data.configure === false ? (
        <ActuSetup onFini={() => { oublierActu(); load(); }} />
      ) : loading ? (
        <div className="flex items-center gap-2 text-xs text-offwhite/60" data-testid="actu-chargement"><Loader2 className="h-4 w-4 animate-spin text-gold" /> Je prépare ton bref du jour (c'est instantané ensuite)…</div>
      ) : data?.masque ? (
        <div className="rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm leading-relaxed text-offwhite/85" data-testid="actu-masque">
          {data.raison}
        </div>
      ) : data?.erreur ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-offwhite/60">Actualité momentanément indisponible.</div>
      ) : (
        <div className="space-y-2.5">
          {(data?.articles || []).map((a, i) => {
            const dejaSauve = enregistres.some((e) => e.titre === a.titre);
            const dateTxt = (() => { try { return a.date ? new Date(a.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : ""; } catch { return ""; } })();
            return (
            <div key={i} className="actu-carte rounded-xl border border-white/10 bg-white/5 p-3" style={{ animationDelay: `${i * 140}ms` }} data-testid={`actu-item-${i}`}>
              {a.source && a.source !== "presse" && (
                <span className={`mb-1.5 inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] ${a.source === "officiel" || a.source === "legal" ? "bg-gold/15 text-gold" : "bg-sky-400/15 text-sky-200"}`} data-testid={`actu-${a.source === "officiel" ? "officiel" : "etiquette"}-${i}`}>
                  {ETIQUETTES[a.source]}{a.source_label ? ` · ${a.source_label}` : ""}
                </span>
              )}
              <p className="text-sm font-medium leading-snug text-offwhite">{a.titre}</p>
              {a.description && a.description_origine !== "titre" && <p className="mt-1.5 text-[12.5px] leading-relaxed text-offwhite/70" data-testid={`actu-description-${i}`}>{a.description}</p>}
              <p className="mt-1.5 text-[10.5px] text-offwhite/40">{[a.source_label, dateTxt].filter(Boolean).join(" · ")}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  onClick={() => discuterAvecIA(`Parle-moi de cette actualité et de ce qu'elle change concrètement pour mon activité : « ${a.titre} » (${a.lien})`)}
                  className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold hover:bg-gold/20"
                  data-testid={`actu-discuter-${i}`}
                >
                  <Sparkles className="h-3 w-3" /> Discuter avec l'IA
                </button>
                <div className="flex items-center gap-1.5">
                  <a href={a.lien} target="_blank" rel="noopener noreferrer" title="Ouvrir la source dans un nouvel onglet" aria-label="Ouvrir la source"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-offwhite/70 hover:border-gold/40 hover:text-gold" data-testid={`actu-info-${i}`}>
                    <Info className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={async () => { if (dejaSauve) return; try { await enregistrerArticle(a.titre, a.lien); toast.success("Article enregistré."); chargerEnregistres(); } catch { toast.error("Enregistrement impossible."); } }}
                    disabled={dejaSauve} title={dejaSauve ? "Enregistré" : "Enregistrer"} aria-label="Enregistrer l'article"
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${dejaSauve ? "border-emerald-500/40 text-emerald-300" : "border-white/10 text-offwhite/70 hover:border-gold/40 hover:text-gold"}`}
                    data-testid={`actu-save-${i}`}
                  >
                    {dejaSauve ? <Check className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
            );
          })}
          {(data?.articles || []).length > 0 && data?.ia === false && (
            <p className="px-1 text-[10.5px] leading-snug text-offwhite/40" data-testid="actu-ia-indispo">
              Le bref IA est momentanément indisponible : tu vois la description fournie par la source.
            </p>
          )}
          {(data?.articles || []).length === 0 && data?.vide_pref && (
            <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-offwhite/60">
              {filtre === "perso" ? "Ta veille est vide : choisis des pays, des secteurs ou des mots-clés dans Paramètres › Notifications." : "Toutes les sources sont coupées dans tes réglages. Réactive-en au moins une dans Paramètres › Notifications."}
            </p>
          )}
          {(data?.articles || []).length === 0 && !data?.vide_pref && !data?.masque && !data?.erreur && (
            <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-offwhite/60" data-testid="actu-aucune">
              Aucune actualité récente ne correspond à tes sujets aujourd'hui. Je n'en invente pas : ajuste tes secteurs ou tes mots-clés dans Paramètres › Notifications, ou reviens plus tard.
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
  // Panneau du Copilote sur le cockpit (grand écran) : agrandissable ET masquable.
  // Le choix « masqué » est retenu sur cet appareil ; un bouton flottant le rouvre.
  const [estElargi, setEstElargi] = useState(false);
  const [masque, setMasque] = useState(() => { try { return localStorage.getItem("zayado_chat_masque") !== "0"; } catch { return true; } });
  const basculer = (v) => { setMasque(v); try { localStorage.setItem("zayado_chat_masque", v ? "1" : "0"); } catch { /* */ } };
  useEffect(() => {
    // Le bouton « chat » de l'en-tête rouvre le panneau s'il était masqué.
    const ouvrir = () => basculer(false);
    window.addEventListener("zayado:open-chat", ouvrir);
    return () => window.removeEventListener("zayado:open-chat", ouvrir);
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty("--chat-w", masque ? "0px" : "360px");
    return () => document.documentElement.style.removeProperty("--chat-w");
  }, [masque]);
  return (
    <>
      {!masque && (
        <div className="chat-zayado hidden xl:flex fixed right-0 top-0 z-20 h-screen w-[360px] flex-col" data-testid="chat-panel">
          {!estElargi && <ChatBody estElargi={false} onToggleTaille={() => setEstElargi(true)} onClose={() => basculer(true)} />}
        </div>
      )}
      {masque && (
        <button onClick={() => basculer(false)} data-testid="chat-rouvrir"
          className="fixed bottom-6 right-6 z-20 hidden items-center gap-2 rounded-full bg-gold px-4 py-3 text-sm font-semibold text-navy-900 shadow-lg xl:inline-flex">
          <Sparkles className="h-4 w-4" /> Copilote
        </button>
      )}
      {estElargi && <ChatGrand onReduire={() => setEstElargi(false)} onClose={() => { setEstElargi(false); basculer(true); }} />}
    </>
  );
}

// Grand format (inspiré de la maquette) : la conversation à gauche, à droite les réglages
// du Copilote (ton, format) et ce qu'il sait de ton activité.
export function ChatGrand({ onReduire, onClose }) {
  const [reglages, setReglages] = useState(false);
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") (reglages ? setReglages(false) : onReduire()); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onReduire, reglages]);
  return (
    <div className={`${typeof document !== "undefined" && document.body.classList.contains("theme-clair") ? "theme-creme chat-grand-clair" : ""} chat-grand fixed inset-0 z-[70]`} data-testid="chat-grand">
      {/* Halos d'arrière-plan animés, façon OkyAi. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="chat-halo absolute left-1/2 top-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.07] blur-[110px]" />
        <div className="absolute -right-24 top-0 h-[420px] w-[420px] rounded-full bg-navy/50 blur-[110px]" />
        <div className="absolute -left-24 bottom-0 h-[380px] w-[380px] rounded-full bg-gold/[0.05] blur-[100px]" />
      </div>

      {/* Le menu gauche EXISTANT de l'application reste affiché (desktop). */}
      <Sidebar />

      <div className="relative z-10 flex h-full flex-col lg:pl-[96px]">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 ring-1 ring-gold/30">
              <Sparkles className="h-5 w-5 text-gold" />
            </div>
            <div className="leading-tight">
              <h1 className="font-display text-xl font-bold text-offwhite sm:text-2xl" data-testid="chat-grand-titre">Copilote IA</h1>
              <p className="mt-0.5 text-[12.5px] text-offwhite/55">Il connaît ton activité · mémoire active · il propose, tu décides</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => setReglages(true)} data-testid="chat-grand-reglages"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-[13px] font-medium text-offwhite/80 transition hover:border-gold/40 hover:text-gold"
              title="Réglages du Copilote">
              <Settings className="h-4 w-4" /> <span className="hidden sm:inline">Réglages</span>
            </button>
            <button onClick={onReduire} data-testid="chat-grand-reduire" title="Réduire le chat"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-[13px] font-medium text-offwhite/80 transition hover:border-gold/40 hover:text-gold">
              <Minimize2 className="h-4 w-4" /> <span className="hidden sm:inline">Réduire</span>
            </button>
            <button onClick={onClose} data-testid="chat-grand-fermer" title="Fermer"
              className="rounded-xl border border-white/12 bg-white/5 p-2 text-offwhite/80 transition hover:text-gold sm:hidden">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>
        <div className="relative flex min-h-0 flex-1 flex-col">
          <ChatBody grand sansEnTete estElargi onToggleTaille={onReduire} onClose={onClose} />
        </div>
      </div>
      {reglages && (
        <div className="fixed inset-0 z-[71] flex justify-end bg-[#0b1a3d]/60 backdrop-blur-sm" onClick={() => setReglages(false)} data-testid="chat-grand-reglages-tiroir">
          <div className="chat-zayado h-full w-full max-w-sm overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex justify-end"><button onClick={() => setReglages(false)} className="rounded-lg p-1.5 text-offwhite/60 hover:text-offwhite" aria-label="Fermer"><Minimize2 className="h-4 w-4" /></button></div>
            <PanneauCopilote />
          </div>
        </div>
      )}
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
