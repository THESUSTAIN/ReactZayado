import React, { useState, useEffect, useRef } from "react";
import { planNom, ESSAI, PLANS, PLAN_ENTREPRISE } from "@/lib/plans";
import { lancerPaiement } from "@/lib/checkout";
import {
  User, Bell, Plug, CreditCard, Loader2, Download, Cloud, Check,
  Search, X, Sun, Moon, Compass, Brain, Trash2, Mail, Plus, Receipt, Sparkles, Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchState, saveProfile, fetchConnections, fetchMesFilleuls, inviterParrainage, appliquerCodePromo, fetchMoi,
  fetchAbonnement, fetchCommandes, telechargerExport, deleteData, fetchTarifsFondateur,
  resilierAbonnement, reprendreAbonnement, changerOffre, fetchEquipe, inviterCoequipier, retirerCoequipier,
  oauthStockage, deconnecterCanal, fetchBoard, saveBoard, fetchActualiteOptions, fetchActualiteStatut, testerActualite, fetchOrganisation, rechercherEntreprise, enregistrerOrganisation,
} from "@/lib/kairosApi";
import { oublierAbonnement } from "@/lib/acces";
import { pushSupporte, pushStatut, activerPush, desactiverPush } from "@/lib/push";
import { useKairos } from "@/context/KairosContext";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import { ChoixPays } from "@/components/kairos/ChoixPays";
import { libellePays } from "@/lib/marches";
import { useI18n } from "@/i18n";
import { Link, useNavigate } from "react-router-dom";
import CanauxCopilote from "@/components/kairos/CanauxCopilote";
import AgentParDefaut from "@/components/agents/AgentParDefaut";
import PoulsQonto from "@/components/kairos/PoulsQonto";
import CarteApplication from "@/components/kairos/CarteApplication";

// Paramètres en grande fenêtre modale — structure inspirée de
// ReactZayado/SettingsModal.jsx (v13) : recherche + sections latérales.
// Chaque section n'affiche que ce qui est réellement câblé côté serveur.
// 5 onglets au lieu de 9 (retour audit) : on sait où chercher.
const SECTIONS = [
  { id: "compte", label: "Compte", Icon: User, mots: "installer télécharger application app pwa écran accueil partager envoyer vision board photo lien langue français english thème clair sombre apparence export rgpd données suppression connexion email sécurité" },
  { id: "copilote", label: "Mon Copilote", Icon: Brain, mots: "prénom email identité heure point du jour mémoire ia pourquoi offre cible approche ton outils marché pays vision phrase valeurs" },
  { id: "notifications", label: "Notifications", Icon: Bell, mots: "alerte rappel email lundi repos actualité cloche" },
  { id: "connexions", label: "Connexions", Icon: Plug, mots: "whatsapp telegram téléphone qonto drive google onedrive sharepoint cloud document teams rh intégrations" },
  { id: "offre", label: "Offre & parrainage", Icon: CreditCard, mots: "plan abonnement prix code réduction facture historique fondateur résilier prélèvement équipe coéquipier parrainage filleul inviter ambassadeur" },
];
// Anciennes adresses (#vision, #facturation…) utilisées ailleurs dans l'app.
const ALIAS = { general: "compte", securite: "compte", profil: "copilote", vision: "copilote", integrations: "connexions",
  "cloud-save": "connexions", facturation: "offre", parrainage: "offre" };
const sectionDepuisHash = () => {
  const h = (window.location.hash || "").replace("#", "");
  const id = ALIAS[h] || h;
  return SECTIONS.some((x) => x.id === id) ? id : "compte";
};

// Complétion du profil : ce qui aide vraiment le Copilote, avec ce qui manque (cliquable).
const CHAMPS_PROFIL = [
  ["prenom", "Ton prénom"], ["email", "Ton e-mail"], ["vision", "Ta phrase de vision"], ["pourquoi", "Ton pourquoi"],
  ["offre", "Ton offre"], ["cible", "Ta cible"], ["approche", "Ce qui te différencie"], ["valeurs", "Tes valeurs"],
];
function useCompletion() {
  const [etat, setEtat] = useState(null);
  const calculer = () => fetchState().then((d) => {
    const p = d.profile || {}, v = d.vision || {}, cm = v.contexte_metier || {};
    const rempli = { prenom: p.prenom, email: p.email, vision: v.texte, pourquoi: v.pourquoi, offre: cm.offre, cible: cm.cible,
      approche: cm.approche, valeurs: (v.valeurs || []).length };
    const manquants = CHAMPS_PROFIL.filter(([k]) => !rempli[k]);
    setEtat({ pct: Math.round(((CHAMPS_PROFIL.length - manquants.length) / CHAMPS_PROFIL.length) * 100), manquants });
  }).catch(() => {});
  useEffect(() => {
    calculer();
    window.addEventListener("zayado:profil-maj", calculer);
    return () => window.removeEventListener("zayado:profil-maj", calculer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return etat;
}
const signalerMaj = () => window.dispatchEvent(new Event("zayado:profil-maj"));
// Amène au champ manquant (onglet Mon Copilote) et le met en évidence.
const allerAuChamp = (cle) => setTimeout(() => {
  const el = document.querySelector(`[data-champ="${cle}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.focus?.();
  el.classList.add("ring-2", "ring-gold/70");
  setTimeout(() => el.classList.remove("ring-2", "ring-gold/70"), 2200);
}, 120);

// Enregistrement automatique : 0,8 s après la dernière frappe, avec un petit « Enregistré ✓ ».
function useAutoSave(payload, pret) {
  const [etat, setEtat] = useState("");
  const premier = useRef(true);
  const cle = JSON.stringify(payload);
  useEffect(() => {
    if (!pret) return undefined;
    if (premier.current) { premier.current = false; return undefined; }
    setEtat("encours");
    const t = setTimeout(async () => {
      try { await saveProfile(payload); setEtat("ok"); signalerMaj(); }
      catch { setEtat("ko"); }
    }, 800);
    return () => clearTimeout(t);
  }, [cle, pret]); // eslint-disable-line react-hooks/exhaustive-deps
  return etat;
}
function EtatSauvegarde({ etat }) {
  if (!etat) return <span className="text-[12px] text-offwhite/40">Enregistrement automatique</span>;
  if (etat === "encours") return <span className="inline-flex items-center gap-1 text-[12px] text-offwhite/55"><Loader2 size={11} className="animate-spin" /> Enregistrement…</span>;
  if (etat === "ko") return <span className="text-[12px] text-red-300">Échec de l'enregistrement — vérifie ta connexion</span>;
  return <span className="inline-flex items-center gap-1 text-[12px] text-emerald-300" data-testid="parametres-enregistre"><Check size={12} /> Enregistré</span>;
}

export default function Parametres() {
  const navigate = useNavigate();
  const fermer = () => navigate(-1);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") fermer(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [active, setActive] = useState(sectionDepuisHash);
  // Retour d'un branchement cloud (Google Drive / OneDrive)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("cloud")) toast.success(q.get("cloud") === "google" ? "Google Drive relié." : "OneDrive / SharePoint relié.");
    if (q.get("cloud_erreur")) {
      const e = q.get("cloud_erreur");
      toast.error(e === "refuse" ? "Autorisation refusée : relance la connexion et accepte les droits demandés."
        : e === "non_configure" ? "Cette connexion n'est pas encore activée par Zayado."
        : e === "echec" ? "La connexion au cloud a échoué (vérifie l'adresse de retour déclarée chez Google / Microsoft)."
        : "Le lien a expiré : relance la connexion depuis Connexions.");
    }
    if (q.get("cloud") || q.get("cloud_erreur")) window.history.replaceState(null, "", `/parametres${window.location.hash}`);
  }, []);
  const completion = useCompletion();
  const [recherche, setRecherche] = useState("");

  const visibles = SECTIONS.filter((s) => {
    if (!recherche.trim()) return true;
    const q = recherche.trim().toLowerCase();
    return s.label.toLowerCase().includes(q) || s.mots.includes(q);
  });

  // Si la recherche masque la section active, basculer sur la 1re visible.
  useEffect(() => {
    if (visibles.length > 0 && !visibles.some((s) => s.id === active)) setActive(visibles[0].id);
  }, [recherche]);  // eslint-disable-line react-hooks/exhaustive-deps

  const nav = (
    <>
      {/* Desktop : colonne latérale (comme final-main) */}
      <nav className="hidden flex-col gap-0.5 px-2.5 pb-4 md:flex" data-testid="parametres-nav">
        {visibles.map((s) => (
          <button key={s.id} onClick={() => setActive(s.id)} data-testid={`parametres-nav-${s.id}`}
            className={`flex items-center gap-2.5 rounded-[10px] px-3 py-[9px] text-left text-[13.5px] font-medium transition ${
              active === s.id ? "bg-gold/[0.14] text-gold" : "text-offwhite/60 hover:bg-white/[0.06] hover:text-offwhite"}`}>
            <s.Icon size={16} className="shrink-0" /><span className="min-w-0 truncate">{s.label}</span>
          </button>
        ))}
        {visibles.length === 0 && (
          <p className="px-3 py-2 text-[12px] text-offwhite/45" data-testid="parametres-recherche-vide">Aucun résultat.</p>
        )}
      </nav>
      {/* Mobile : barre d'onglets défilante (toujours visible : le panneau défile seul) */}
      <nav className="flex gap-1.5 overflow-x-auto border-b border-white/[0.14] px-4 py-3 [scrollbar-width:none] md:hidden" data-testid="parametres-nav-mobile">
        {visibles.map((s) => (
          <button key={s.id} onClick={() => setActive(s.id)} data-testid={`parametres-navm-${s.id}`}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-[7px] text-[12.5px] font-medium transition ${
              active === s.id ? "border-gold bg-gold text-navy-900" : "border-white/[0.14] bg-white/[0.06] text-offwhite/65"}`}>
            <s.Icon size={15} />{s.label}
          </button>
        ))}
      </nav>
    </>
  );

  return (
    <>
    {/* Derrière la fenêtre : l'app (menu + en-tête), floutée — avant, un fond uni foncé donnait l'impression d'une autre page. */}
    <div aria-hidden="true" className="pointer-events-none select-none">
      <Sidebar />
      <div className="lg:pl-[92px]"><Header /></div>
    </div>
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-900/35 p-0 backdrop-blur-xl sm:p-6"
      data-testid="parametres-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) fermer(); }}
    >
      <div
        // Hauteur FIXE : la fenêtre ne « saute » plus d'un onglet à l'autre.
        className="fenetre fenetre-parametres relative flex h-full w-full max-w-[980px] flex-col overflow-hidden sm:h-[85vh] sm:rounded-[22px] md:flex-row"
        data-testid="parametres-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Paramètres"
      >
        <button
          onClick={fermer}
          aria-label="Fermer les paramètres"
          data-testid="parametres-fermer"
          className="absolute right-3 top-3 z-10 rounded-full border border-white/[0.14] bg-white/[0.08] p-1.5 text-offwhite/70 transition hover:bg-white/[0.16] hover:text-offwhite"
        >
          <X size={16} />
        </button>

        {/* Colonne gauche : recherche + complétion + navigation */}
        <div className="flex w-full shrink-0 flex-col md:w-[220px] md:overflow-y-auto md:border-r md:border-white/[0.14]">
          <div className="px-4 pb-1 pt-4 md:px-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-offwhite/60">Réglages</p>
            <h1 className="mt-0.5 font-display text-2xl font-bold">Paramètres</h1>
          </div>
          <div className="mx-4 mb-2 mt-3 hidden items-center gap-2 rounded-[10px] border border-white/[0.14] bg-white/[0.06] px-2.5 py-[7px] md:mx-3 md:flex">
            <Search size={14} className="shrink-0 text-offwhite/50" />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un réglage…"
              data-testid="parametres-recherche" className="w-full bg-transparent text-[13px] text-offwhite outline-none placeholder:text-offwhite/45" />
          </div>
          {completion !== null && (
            <div className="mx-3 mb-3 hidden rounded-[10px] border border-gold/20 bg-gold/[0.06] p-2.5 md:block" data-testid="parametres-completion">
              <button onClick={() => { setActive("copilote"); if (completion.manquants[0]) allerAuChamp(completion.manquants[0][0]); }}
                className="flex w-full items-center gap-2.5 text-left">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `conic-gradient(#DEC2A3 ${completion.pct * 3.6}deg, rgba(255,255,255,0.14) 0deg)` }}>
                  <span className="absolute inset-[3px] rounded-full bg-[#1b2a4d]" />
                  <span className="relative text-[11px] font-bold text-gold">{completion.pct}%</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold text-offwhite">Profil complété</span>
                  <span className="block text-[12px] text-offwhite/55">{completion.pct < 100 ? "Ton Copilote te connaît mieux avec :" : "Profil complet, bravo !"}</span>
                </span>
              </button>
              {completion.manquants.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {completion.manquants.slice(0, 4).map(([k, l]) => (
                    <button key={k} onClick={() => { setActive("copilote"); allerAuChamp(k); }} data-testid={`completion-${k}`}
                      className="rounded-full border border-gold/30 px-2 py-0.5 text-[12px] text-gold hover:bg-gold/10">+ {l}</button>
                  ))}
                  {completion.manquants.length > 4 && <span className="px-1 text-[12px] text-offwhite/45">+{completion.manquants.length - 4}</span>}
                </div>
              )}
            </div>
          )}
          {nav}
        </div>

        {/* Panneau, défilable indépendamment */}
        <div className="min-w-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 md:p-6" data-testid={`parametres-panel-${active}`}>
          {active === "compte" && <><CarteApplication /><SectionEntreprise /><SectionGeneral /><SectionSecurite /></>}
          {active === "copilote" && <><SectionProfil manquants={completion?.manquants || []} /><SectionVision /><SectionMaFoi /></>}
          {active === "notifications" && <SectionNotifications />}
          {active === "connexions" && <SectionConnexions />}
          {active === "offre" && <><SectionFacturation /><SectionParrainage /></>}
        </div>
      </div>
    </div>
    </>
  );
}

// Carte « verre » de final-main : blanc translucide, libellé en petites capitales.
function Carte({ children, titre, desc }) {
  return (
    <div className="relative mb-4 min-w-0 overflow-hidden rounded-[20px] border border-white/[0.14] bg-white/[0.10] px-4 py-4 backdrop-blur-xl sm:px-5 sm:py-[18px]">
      {titre && <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.05em] text-offwhite/65">{titre}</p>}
      {desc && <p className="mb-3 text-[13px] leading-relaxed text-offwhite/60">{desc}</p>}
      {children}
    </div>
  );
}

const INPUT = "h-11 w-full rounded-xl border border-white/[0.14] bg-white/[0.08] px-3.5 text-sm text-offwhite outline-none transition placeholder:text-offwhite/45 focus:border-gold/60 focus:bg-white/[0.12]";
const BTN_OR = "inline-flex h-10 items-center gap-2 rounded-2xl bg-gradient-to-br from-[#DEC2A3] to-[#F1E2CC] px-4 text-sm font-semibold text-navy-900 transition hover:brightness-105 disabled:opacity-60";

function SectionProfil({ manquants = [] }) {
  const [profil, setProfil] = useState(null);
  const [memoire, setMemoire] = useState(null);
  const [cm, setCm] = useState({});

  useEffect(() => {
    fetchState().then(async (d) => {
      const p = { ...(d.profile || {}) };
      // Préremplit l'email avec celui du compte si le profil ne l'a pas encore.
      if (!p.email) {
        try { const moi = await fetchMoi(); if (moi?.email) p.email = moi.email; } catch { /* compte sans email */ }
      }
      const c = d.vision?.contexte_metier || {};
      setCm({ copilote_ton: c.copilote_ton || "", outils: c.outils || "", marche: c.marche || "france", marche_label: c.marche_label || "" });
      setProfil(p);
      setMemoire({ pourquoi: d.vision?.pourquoi || "", offre: c.offre || "", cible: c.cible || "", approche: c.approche || "" });
    }).catch(() => toast.error("Impossible de charger ton profil."));
  }, []);

  // Seules les clés de cette section partent : on n'écrase pas les réglages faits ailleurs.
  const etat = useAutoSave(profil && memoire ? {
    prenom: profil.prenom, email: profil.email, heure_checkin: profil.heure_checkin, pourquoi: memoire.pourquoi,
    contexte_metier: { offre: memoire.offre, cible: memoire.cible, approche: memoire.approche, copilote_ton: cm.copilote_ton,
      outils: cm.outils, marche: cm.marche, marche_label: cm.marche_label || null, heure_point: profil.heure_checkin },
  } : null, !!(profil && memoire));

  const champ = (cle, valeur) => setProfil((p) => ({ ...p, [cle]: valeur }));
  const mem = (cle, valeur) => setMemoire((m) => ({ ...m, [cle]: valeur }));

  if (!profil || !memoire) return <Carte><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;
  const aFaire = manquants.filter(([k]) => ["prenom", "email", "pourquoi", "offre", "cible", "approche"].includes(k));
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 pr-10">
        <p className="text-[13px] text-offwhite/60">Ce que ton Copilote sait de toi. Tout est enregistré au fil de la frappe.</p>
        <EtatSauvegarde etat={etat} />
      </div>
      {aFaire.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-2xl border border-gold/25 bg-gold/[0.07] px-3 py-2.5" data-testid="parametres-a-completer">
          <span className="mr-1 text-[12px] text-offwhite/75">À compléter :</span>
          {aFaire.map(([k, l]) => (
            <button key={k} onClick={() => allerAuChamp(k)} className="rounded-full border border-gold/40 px-2.5 py-0.5 text-[12px] text-gold hover:bg-gold/10">{l}</button>
          ))}
        </div>
      )}
      <Carte titre="Ton identité" desc="Ces informations personnalisent ton cockpit et ton Copilote.">
        <label className="mb-1.5 block text-xs text-offwhite/50">Prénom</label>
        <input value={profil.prenom || ""} onChange={(e) => champ("prenom", e.target.value)} className={`${INPUT} mb-4`} data-testid="parametres-prenom" data-champ="prenom" />
        <label className="mb-1.5 block text-xs text-offwhite/50">E-mail (point du jour, e-mail du lundi)</label>
        <input type="email" value={profil.email || ""} onChange={(e) => champ("email", e.target.value)} className={`${INPUT} mb-4`} data-testid="parametres-email" data-champ="email" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-offwhite/50">Heure du point du jour</label>
            <input type="time" value={profil.heure_checkin || "08:30"} onChange={(e) => champ("heure_checkin", e.target.value)} className={INPUT} data-testid="parametres-heure" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-offwhite/50">Ton marché (actualité, contexte économique)</label>
            <ChoixPays variante="liste" valeur={cm.marche} libelle={cm.marche_label} selectClass={INPUT}
              onChange={(k, l) => setCm((c) => ({ ...c, marche: k, marche_label: l }))} />
          </div>
        </div>
      </Carte>
      <Carte titre="Ton Copilote" desc="Ce que le Copilote t'a demandé au fil de l'eau — modifiable ici.">
        <label className="mb-1.5 block text-xs text-offwhite/50">Ton</label>
        <select value={cm.copilote_ton || ""} onChange={(e) => setCm((c) => ({ ...c, copilote_ton: e.target.value }))} className={`${INPUT} mb-2`} data-testid="parametres-ton">
          <option value="">Par défaut (apaisé)</option>
          <option value="doux">Doux et bienveillant</option>
          <option value="direct">Direct et concis</option>
          <option value="coach">Coach qui me challenge</option>
        </select>
        <p className="mb-4 rounded-xl bg-white/[0.05] px-3 py-2 text-[12.5px] italic text-offwhite/70" data-testid="parametres-ton-exemple">
          « {{ doux: "Prends ton temps : une seule chose importante aujourd'hui, et le reste attendra.",
            direct: "Priorité n°1 : relancer 3 prospects avant 11 h. Le reste, demain.",
            coach: "Tu as dit 5 clients ce trimestre. Il en manque 3 : qui appelles-tu aujourd'hui ?" }[cm.copilote_ton]
            || "Belle journée devant toi. Commençons par ce qui compte le plus." } »
        </p>
        <label className="mb-1.5 block text-xs text-offwhite/50">Outils que tu utilises</label>
        <div className="flex flex-wrap gap-2" data-testid="parametres-outils">
          {["Trello", "Microsoft Teams", "Slack", "Notion", "Google Agenda", "Outlook", "Excel / Sheets"].map((o) => {
            const liste = (cm.outils && cm.outils !== "aucun" ? cm.outils.split(", ") : []);
            const pris = liste.includes(o);
            return (
              <button key={o} type="button" onClick={() => setCm((c) => ({ ...c, outils: (pris ? liste.filter((x) => x !== o) : [...liste, o]).join(", ") || "aucun" }))}
                className={`rounded-full border px-3 py-1.5 text-xs ${pris ? "border-gold bg-gold text-navy-900" : "border-white/15 bg-white/5 text-offwhite/75"}`}>{o}</button>
            );
          })}
        </div>
      </Carte>
      <Carte titre="Mémoire IA" desc="Le Copilote, le Radar et les documents IA s'appuient sur ces réponses. Quelques phrases suffisent.">
        {[
          ["pourquoi", "Pourquoi (ta raison d'être)", "Pourquoi fais-tu ce que tu fais ?"],
          ["offre", "Quoi (ton offre)", "Que proposes-tu concrètement ?"],
          ["cible", "Pour qui (ta cible)", "Qui aides-tu ?"],
          ["approche", "Comment (ce qui te différencie)", "Qu'est-ce qui te rend différent ?"],
        ].map(([k, label, ph]) => (
          <div key={k} className="mb-3">
            <label className="mb-1.5 flex items-center gap-1.5 text-xs text-offwhite/60"><Brain size={12} className="text-gold" />{label}</label>
            <textarea rows={2} value={memoire[k]} onChange={(e) => mem(k, e.target.value)} placeholder={ph} data-champ={k}
              className={`${INPUT} h-auto resize-y py-3 leading-relaxed`} data-testid={`parametres-memoire-${k}`} />
          </div>
        ))}
      </Carte>
    </>
  );
}

function SectionVision() {
  const [vision, setVision] = useState(null);
  const [valeurs, setValeurs] = useState([]);
  const [nouvelle, setNouvelle] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchState().then((d) => { setVision(d.vision?.texte || ""); setValeurs(d.vision?.valeurs || []); })
      .catch(() => toast.error("Impossible de charger ta vision."));
  }, []);
  const etat = useAutoSave({ texte_vision: vision ?? "", valeurs }, vision !== null);

  const ajouter = (e) => {
    e.preventDefault();
    const v = nouvelle.trim();
    if (!v || valeurs.includes(v) || valeurs.length >= 7) return;
    setValeurs((l) => [...l, v]); setNouvelle("");
  };

  if (vision === null) return <Carte><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;
  return (
    <>
      <Carte titre="Ma phrase de vision" desc="Elle s'affiche sur ton Vision Board et guide les priorités proposées par l'IA.">
        <textarea rows={3} value={vision} onChange={(e) => setVision(e.target.value)} placeholder="Dans 3 ans, je…" data-champ="vision"
          className={`${INPUT} h-auto resize-y py-3 leading-relaxed`} data-testid="parametres-vision-texte" />
      </Carte>
      <Carte titre="Mes valeurs" desc="Jusqu'à 7 valeurs : elles colorent le ton du Copilote et tes cartes Vision.">
        <div className="mb-3 flex flex-wrap gap-2">
          {valeurs.map((v) => (
            <span key={v} className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-xs text-gold">
              {v}<button onClick={() => setValeurs((l) => l.filter((x) => x !== v))} aria-label={`Retirer ${v}`}><X size={12} /></button>
            </span>
          ))}
          {!valeurs.length && <span className="text-xs text-offwhite/45">Aucune valeur pour l'instant.</span>}
        </div>
        <form onSubmit={ajouter} className="flex gap-2">
          <input value={nouvelle} onChange={(e) => setNouvelle(e.target.value)} placeholder="Ex. Liberté" data-champ="valeurs"
            className={`${INPUT} flex-1`} data-testid="parametres-valeur-input" />
          <button type="submit" className={BTN_OR}><Plus size={14} /> Ajouter</button>
        </form>
      </Carte>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={() => navigate("/app/vision")} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5">
          <Compass size={14} /> Ouvrir mon Vision Board
        </button>
        <EtatSauvegarde etat={etat} />
      </div>
    </>
  );
}

// Mon entreprise : nom + SIRET (recherche dans le répertoire officiel), pays.
// Sert au légal de l'actualité, aux secteurs de veille et, à terme, à l'équipe et aux factures.
function SectionEntreprise() {
  const [org, setOrg] = useState(undefined);
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [cherche, setCherche] = useState(false);
  const [manuel, setManuel] = useState(false);
  const [form, setForm] = useState({ nom: "", pays: "france", pays_label: "France" });
  useEffect(() => { fetchOrganisation().then((d) => setOrg(d.organisation)).catch(() => setOrg(null)); }, []);
  const chercher = async (e) => {
    e?.preventDefault();
    if (q.trim().length < 3) return;
    setCherche(true);
    try { setRes((await rechercherEntreprise(q.trim())).resultats || []); } catch { toast.error("Le répertoire des entreprises ne répond pas. Tu peux la saisir à la main."); setRes([]); }
    setCherche(false);
  };
  const choisir = async (r) => {
    try { const d = await enregistrerOrganisation({ nom: r.nom, siret: r.siret, pays: "france", pays_label: "France", details: r }); setOrg(d.organisation); setRes(null); setQ(""); toast.success("Entreprise enregistrée."); }
    catch (e) { toast.error(e.message || "Enregistrement impossible."); }
  };
  const saisir = async () => {
    if (form.nom.trim().length < 2) { toast.error("Indique le nom de l'entreprise."); return; }
    try { const d = await enregistrerOrganisation(form); setOrg(d.organisation); setManuel(false); toast.success("Entreprise enregistrée."); }
    catch (e) { toast.error(e.message || "Enregistrement impossible."); }
  };
  const eur = (v) => (v == null ? "—" : `${Math.round(v).toLocaleString("fr-FR")} €`);
  if (org === undefined) return <Carte titre="Mon entreprise"><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;
  if (org && !manuel) {
    const d = org.details || {};
    return (
      <Carte titre="Mon entreprise" desc="Utilisée pour ton actualité légale (pays de l'entreprise), tes secteurs de veille et ton équipe.">
        <div className="rounded-xl border border-white/15 bg-white/5 p-4" data-testid="parametres-entreprise">
          <p className="font-display text-lg font-semibold text-offwhite">{org.nom}</p>
          <p className="mt-0.5 text-xs text-offwhite/55">{[org.siret && `SIRET ${org.siret}`, org.pays_label || libellePays(org.pays), d.naf_libelle].filter(Boolean).join(" · ")}</p>
          {(d.adresse || d.finances) && (
            <div className="mt-3 grid gap-2 text-xs text-offwhite/70 sm:grid-cols-2">
              {d.adresse && <p>{d.adresse}</p>}
              {d.effectif && <p>Effectif : {d.effectif}</p>}
              {d.finances && <p>CA {d.finances.annee} : {eur(d.finances.ca)} · résultat {eur(d.finances.resultat)}</p>}
              {d.dirigeants?.length > 0 && <p>Dirigeants : {d.dirigeants.join(", ")}</p>}
            </div>
          )}
        </div>
        {org.modifiable ? (
          <div className="mt-3 flex gap-3 text-xs">
            <button onClick={() => { setOrg(null); }} className="text-gold hover:underline">Changer d'entreprise</button>
            <button onClick={() => { setForm({ nom: org.nom, pays: org.pays, pays_label: org.pays_label || "" }); setManuel(true); }} className="text-offwhite/60 hover:underline">Modifier à la main</button>
          </div>
        ) : <p className="mt-3 text-xs text-offwhite/50">Gérée par le titulaire de ton équipe.</p>}
      </Carte>
    );
  }
  return (
    <Carte titre="Mon entreprise" desc="Retrouve ton entreprise par son nom ou son SIRET : on complète le reste (activité, adresse, chiffres publiés).">
      {!manuel ? (
        <>
          <form onSubmit={chercher} className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom de l'entreprise ou SIRET" className={`${INPUT} flex-1`} data-testid="entreprise-recherche" />
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 text-sm font-semibold text-navy-900" disabled={cherche}>{cherche ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Chercher</button>
          </form>
          {res && (
            <div className="mt-3 space-y-2" data-testid="entreprise-resultats">
              {res.length === 0 && <p className="text-sm text-offwhite/55">Aucun résultat.</p>}
              {res.map((r) => (
                <button key={r.siren} onClick={() => choisir(r)} className="w-full rounded-xl border border-white/15 bg-white/5 p-3 text-left hover:border-gold/50">
                  <p className="text-sm font-semibold text-offwhite">{r.nom}</p>
                  <p className="text-xs text-offwhite/55">{[r.siret && `SIRET ${r.siret}`, r.ville, r.naf_libelle].filter(Boolean).join(" · ")}</p>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setManuel(true)} className="mt-3 text-xs text-offwhite/60 hover:text-gold hover:underline">Entreprise hors de France ou pas encore immatriculée ? Saisis-la à la main</button>
        </>
      ) : (
        <div className="space-y-3">
          <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom de l'entreprise" className={`${INPUT} w-full`} />
          <ChoixPays variante="liste" valeur={form.pays} libelle={form.pays_label} selectClass={INPUT} onChange={(k, l) => setForm({ ...form, pays: k, pays_label: l })} />
          <div className="flex gap-2">
            <button onClick={saisir} className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-navy-900">Enregistrer</button>
            <button onClick={() => setManuel(false)} className="rounded-xl border border-white/15 px-4 py-2 text-sm">Annuler</button>
          </div>
        </div>
      )}
    </Carte>
  );
}

function SectionGeneral() {
  const { lang, setLang } = useI18n();
  const [clair, setClair] = useState(() => {
    try { return localStorage.getItem("kairos_theme") === "clair"; } catch { return false; }
  });
  const changerTheme = (versClair) => {
    setClair(versClair);
    document.body.classList.toggle("theme-clair", versClair);
    try { localStorage.setItem("kairos_theme", versClair ? "clair" : "sombre"); } catch { /* stockage indisponible */ }
  };

  return (
    <>
      <Carte titre="Apparence" desc="Le thème s'applique immédiatement, sur tout l'espace.">
        <div className="flex gap-2">
          <button onClick={() => changerTheme(false)} data-testid="parametres-theme-sombre"
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${!clair ? "border-gold/50 bg-gold/10 text-gold" : "border-white/15 bg-white/5 text-offwhite/70 hover:bg-white/10"}`}>
            <Moon size={15} /> Sombre (nuit)
          </button>
          <button onClick={() => changerTheme(true)} data-testid="parametres-theme-clair"
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${clair ? "border-gold/50 bg-gold/10 text-gold" : "border-white/15 bg-white/5 text-offwhite/70 hover:bg-white/10"}`}>
            <Sun size={15} /> Clair (jour)
          </button>
        </div>
      </Carte>
      <Carte titre="Langue" desc="Réglage local à cet appareil — pas encore synchronisé côté serveur.">
        <select value={lang} onChange={(e) => setLang(e.target.value)} className={INPUT} data-testid="parametres-langue">
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </Carte>
    </>
  );
}

// Ma Foi (TheSustain) : optionnelle, un seul réglage pour tout le compte
// (menu, page Ma Foi, parcours Foi de Bien-être, vie spirituelle du diagnostic).
function SectionMaFoi() {
  const { contexte, majContexte, loaded } = useKairos();
  const on = contexte?.parcours_foi === true;
  const [motivation, setMotivation] = useState(null); // null = pas encore initialisé depuis le profil
  const [etat, setEtat] = useState("");
  const [epingle, setEpingle] = useState(false);
  const derniere = useRef("");
  const basculer = async () => {
    try { await majContexte({ parcours_foi: !on }); toast.success(on ? "Ma Foi est retirée de ton menu." : "Ma Foi est activée : elle apparaît dans ton menu."); }
    catch { toast.error("Échec de l'enregistrement."); }
  };

  useEffect(() => {
    if (motivation === null && loaded) { const v = contexte?.foi_motivation || ""; derniere.current = v; setMotivation(v); }
  }, [contexte, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enregistrement automatique 0,8 s après la dernière frappe (comme le reste de la page).
  useEffect(() => {
    if (motivation === null || motivation === derniere.current) return undefined;
    setEtat("encours");
    const t = setTimeout(async () => {
      try { await saveProfile({ contexte_metier: { foi_motivation: motivation.trim() ? motivation.trim().slice(0, 600) : null } }); derniere.current = motivation; setEtat("ok"); signalerMaj(); }
      catch { setEtat("ko"); }
    }, 800);
    return () => clearTimeout(t);
  }, [motivation]);

  // Épingle (ou met à jour) UNE carte sur le board « perso » : on n'écrit sur le board que sur demande, jamais en tâche de fond.
  const epingler = async () => {
    const texte = (motivation || "").trim().slice(0, 600);
    if (!texte) return;
    setEpingle(true);
    try {
      const b = await fetchBoard("perso");
      const cartes = b.cards || [];
      const existe = cartes.some((c) => c.source === "foi_motivation");
      const bas = cartes.reduce((m, c) => (typeof c.y === "number" ? Math.max(m, c.y + (c.h || 240)) : m), 0);
      const suite = existe
        ? cartes.map((c) => (c.source === "foi_motivation" ? { ...c, body: { fr: texte, en: texte } } : c))
        : [...cartes, { id: `foi_${Date.now()}`, type: "sticky", source: "foi_motivation", w: 300, h: 240, x: 40, y: bas + 40, rotate: -2,
            stickyColor: "cream", label: "MA FOI & MON ACTIVITÉ", tags: [], body: { fr: texte, en: texte } }];
      await saveBoard(suite, "perso");
      toast.success(existe ? "Carte mise à jour sur ton Vision Board." : "Carte ajoutée à ton Vision Board.");
    } catch { toast.error("Impossible d'écrire sur ton Vision Board pour le moment."); }
    finally { setEpingle(false); }
  };

  return (
    <Carte titre="Ma Foi (par TheSustain)" desc="Dimension chrétienne optionnelle : verset et pause du jour, prière, parcours, journal de décisions et communauté. Tes notes restent enregistrées si tu la retires.">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-offwhite/80">{on ? "Activée : visible dans ton menu" : "Désactivée"}</p>
        <Interrupteur on={on} onClick={basculer} testid="parametres-mafoi" />
      </div>
      {on && (
        <div className="mt-4 border-t border-white/15 pt-4" data-testid="parametres-foi-motivation">
          <label htmlFor="parametres-foi-motivation-champ" className="mb-1.5 block text-[14px] font-semibold text-offwhite">
            Qu'est-ce qui te motive à relier ta foi chrétienne et ton activité ?
          </label>
          <p className="mb-2 text-[13px] text-offwhite/65">Tes mots reviennent dans tes notifications d'encouragement et nourrissent les conseils du Copilote.</p>
          <textarea id="parametres-foi-motivation-champ" value={motivation ?? ""} onChange={(e) => setMotivation(e.target.value)} rows={4} maxLength={600}
            placeholder="Ex. Servir mes clients avec intégrité, et faire de mon travail une réponse à ma vocation."
            className={`${INPUT} h-auto resize-y py-3 leading-relaxed`} data-testid="parametres-foi-motivation-champ" data-champ="foi_motivation" />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <EtatSauvegarde etat={etat} />
            <button onClick={epingler} disabled={epingle || !(motivation || "").trim()} data-testid="parametres-foi-epingler"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-gold/50 px-4 text-[13px] font-semibold text-gold hover:bg-gold/10 disabled:opacity-50">
              {epingle ? <Loader2 size={14} className="animate-spin" /> : null} Épingler sur mon Vision Board
            </button>
          </div>
        </div>
      )}
    </Carte>
  );
}

function Interrupteur({ on, onClick, testid }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on} data-testid={testid}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-gold" : "bg-white/15"}`}>
      <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function CartePush() {
  const [st, setSt] = useState({ actif: false, disponible: false, supporte: true, loading: true });
  const [busy, setBusy] = useState(false);
  useEffect(() => { pushStatut().then((d) => setSt({ ...d, loading: false })).catch(() => setSt((s) => ({ ...s, loading: false }))); }, []);
  const activer = async () => {
    setBusy(true);
    try { await activerPush(); setSt((s) => ({ ...s, actif: true })); toast.success("Notifications push activées sur cet appareil."); }
    catch (e) { toast.error(e.message || "Activation impossible."); }
    finally { setBusy(false); }
  };
  const couper = async () => {
    setBusy(true);
    try { await desactiverPush(); setSt((s) => ({ ...s, actif: false })); toast.success("Notifications push coupées sur cet appareil."); }
    finally { setBusy(false); }
  };
  return (
    <Carte titre="Notifications push (mobile & bureau)" desc="Activées par défaut sur ton téléphone (app installée) et ton ordinateur : rappels de check-in, actualité et opportunités du Radar, même l'app fermée. Tu peux les couper ici.">
      {!st.supporte ? (
        <p className="text-sm text-offwhite/50" data-testid="push-non-supporte">Ton navigateur ne supporte pas les notifications push.</p>
      ) : !st.disponible && !st.loading ? (
        <p className="text-sm text-offwhite/50" data-testid="push-indispo">Les notifications sont momentanément indisponibles. Tu retrouves tout dans la cloche.</p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-offwhite">Sur cet appareil</p>
            <p className="text-xs text-offwhite/50">{st.actif ? "Activées sur cet appareil." : "Pas encore autorisées sur cet appareil : clique sur Activer, ou accepte la demande du navigateur."}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={st.actif ? couper : activer} disabled={busy} data-testid="push-toggle-btn"
              className={`rounded-xl px-4 py-2 text-[12.5px] font-semibold transition disabled:opacity-60 ${st.actif ? "border border-white/15 text-offwhite/80 hover:bg-white/10" : "bg-gold text-navy-900 hover:scale-[1.02]"}`}>
              {busy ? "…" : st.actif ? "Désactiver" : "Activer les notifications"}
            </button>
          </div>
        </div>
      )}
    </Carte>
  );
}

function SectionNotifications() {
  const [profil, setProfil] = useState(null);
  const [cm, setCm] = useState({});
  useEffect(() => {
    fetchState().then((d) => { setProfil(d.profile); setCm(d.vision?.contexte_metier || {}); })
      .catch(() => toast.error("Impossible de charger tes préférences."));
  }, []);
  const toggler = async () => {
    const nouveau = !profil.notifications;
    setProfil((p) => ({ ...p, notifications: nouveau }));
    try { await saveProfile({ notifications: nouveau }); toast.success(nouveau ? "Notifications activées." : "Notifications coupées."); }
    catch { toast.error("Échec."); setProfil((p) => ({ ...p, notifications: !nouveau })); }
  };
  const lundi = cm.notif_email_lundi !== false;
  const togglerLundi = async () => {
    const suivant = { ...cm, notif_email_lundi: !lundi };
    setCm(suivant);
    try { await saveProfile({ contexte_metier: suivant }); toast.success(!lundi ? "E-mail du lundi activé." : "E-mail du lundi coupé."); }
    catch { toast.error("Échec."); setCm(cm); }
  };
  // Jour de repos (sabbat) : ce jour-là, les rappels doux de la cloche se taisent.
  const jourRepos = typeof cm.jour_repos === "number" ? cm.jour_repos : -1;
  const changerJourRepos = async (v) => {
    const suivant = { ...cm, jour_repos: v };
    setCm(suivant);
    try { await saveProfile({ contexte_metier: suivant }); toast.success(v >= 0 ? "Jour de repos réglé — les rappels se tairont ce jour-là." : "Jour de repos retiré."); }
    catch { toast.error("Échec."); setCm(cm); }
  };
  // Sources d'actualité : tout est activé par défaut, l'utilisateur choisit.
  const srcOn = (k) => cm[k] !== false;
  const togglerSrc = async (k) => {
    const suivant = { ...cm, [k]: !srcOn(k) };
    setCm(suivant);
    try { await saveProfile({ contexte_metier: suivant }); toast.success("Réglage d'actualité enregistré."); }
    catch { toast.error("Échec."); setCm(cm); }
  };
  // (Le contenu Foi n'est plus réglé ici : l'activation se fait dans
  //  Bien-être → Parcours, là où vivent les parcours.)
  // Rythme de l'alerte actualité dans la cloche (demandé par le Copilote au 1er login, modifiable ici).
  const rythme = cm.actu_rythme || "quotidien";
  const changerRythme = async (v) => {
    const suivant = { ...cm, actu_rythme: v };
    setCm(suivant);
    try { await saveProfile({ contexte_metier: suivant }); toast.success("Rythme d'alerte enregistré."); }
    catch { toast.error("Échec."); setCm(cm); }
  };
  const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  if (!profil) return <Carte><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;
  return (
    <>
    <Carte titre="Rappels et alertes" desc={profil.email ? `Envoyés à ${profil.email}.` : "Ajoute ton e-mail dans Profil pour recevoir les e-mails."}>
      <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div><p className="text-sm font-medium text-offwhite">Toutes les notifications</p><p className="text-xs text-offwhite/50">Interrupteur général : coupe tous les envois.</p></div>
        <Interrupteur on={!!profil.notifications} onClick={toggler} testid="parametres-notif-toggle" />
      </div>
      <div className={`flex items-center justify-between gap-4 pt-4 ${profil.notifications ? "" : "pointer-events-none opacity-60"}`}>
        <div><p className="text-sm font-medium text-offwhite">E-mail du lundi, 7 h</p><p className="text-xs text-offwhite/50">Ton pourquoi, ton score Vision, ton CA et tes 3 actions de la semaine.</p></div>
        <Interrupteur on={lundi} onClick={togglerLundi} testid="parametres-notif-lundi" />
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-4 mt-4">
        <div>
          <p className="text-sm font-medium text-offwhite">Jour de repos hebdomadaire</p>
          <p className="text-xs text-offwhite/50">Ce jour-là, les rappels doux (check-in, vision, revue, série de rituels) se taisent. Tu gardes la main, l'app se tait.</p>
        </div>
        <select value={jourRepos} onChange={(e) => changerJourRepos(parseInt(e.target.value, 10))}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-offwhite focus:border-gold/50 focus:outline-none"
          data-testid="parametres-jour-repos">
          <option value={-1}>Aucun</option>
          {JOURS.map((j, i) => <option key={j} value={(i + 1) % 7}>{j}</option>)}
        </select>
      </div>
      <p className="mt-4 text-xs text-offwhite/45">L'heure de ton point du jour se règle dans Mon Copilote. Telegram et WhatsApp se relient dans Connexions. Les décisions à valider arrivent aussi dans la cloche, en haut de l'écran.</p>
    </Carte>

    <CartePush />
    <CarteVeille cm={cm} setCm={setCm} rythme={rythme} changerRythme={changerRythme} srcOn={srcOn} togglerSrc={togglerSrc} />
    <CarteActuEnvoi cm={cm} setCm={setCm} rythme={rythme} changerRythme={changerRythme} />
    </>
  );
}

// Actualité envoyée : rythme, canal, nombre d'actus, heure + bouton « Envoyer un test maintenant »
// (le test dit, canal par canal, pourquoi rien n'arrive : clé absente, aucun appareil abonné…).
function CarteActuEnvoi({ cm, setCm, rythme, changerRythme }) {
  const canaux = Array.isArray(cm.actu_canaux) ? cm.actu_canaux : ["email", "push"];
  const nb = Math.max(1, Math.min(3, Number(cm.actu_nb) || 3));
  const heure = cm.actu_heure || "08:00";
  const [statut, setStatut] = useState(null);
  const [test, setTest] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const charger = () => fetchActualiteStatut().then(setStatut).catch(() => setStatut(null));
  useEffect(() => { charger(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const maj = async (patch) => {
    const suivant = { ...cm, ...patch };
    setCm(suivant);
    try { await saveProfile({ contexte_metier: patch }); toast.success("Réglage enregistré."); charger(); }
    catch { toast.error("Échec."); setCm(cm); }
  };
  const basculerCanal = (c) => {
    const suivant = canaux.includes(c) ? canaux.filter((x) => x !== c) : [...canaux, c];
    maj({ actu_canaux: suivant });
  };
  const lancerTest = async () => {
    setEnvoi(true); setTest(null);
    try { setTest(await testerActualite()); charger(); }
    catch (e) { setTest({ erreur: e?.detail || "Test impossible pour le moment." }); }
    setEnvoi(false);
  };
  const bouton = (actif) => `rounded-full border px-3 py-1.5 text-xs font-medium transition ${actif ? "border-gold bg-gold text-navy-900" : "border-white/15 text-offwhite/70 hover:border-gold/40"}`;
  const NOMS = { email: "E-mail", push: "Notification" };
  return (
    <Carte titre="Actualité envoyée" desc="Reçois 1 à 3 actus, avec un résumé court, à l'heure que tu choisis.">
      <div className="space-y-4" data-testid="parametres-actu-envoi">
        <div>
          <p className="mb-2 text-sm font-medium text-offwhite">Rythme</p>
          <div className="flex flex-wrap gap-2">
            {[["quotidien", "Chaque matin"], ["lundi", "Chaque lundi"], ["jamais", "À la demande"]].map(([k, l]) => (
              <button key={k} onClick={() => changerRythme(k)} className={bouton(rythme === k)} data-testid={`actu-rythme-${k}`}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-offwhite">Canal</p>
          <div className="flex flex-wrap gap-2">
            {["email", "push"].map((c) => (
              <button key={c} onClick={() => basculerCanal(c)} className={bouton(canaux.includes(c))} data-testid={`actu-canal-${c}`}>{canaux.includes(c) ? "✓ " : ""}{NOMS[c]}</button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-offwhite/50" data-testid="actu-canal-aide">
            Pour ne pas te saturer : l'<strong className="font-medium text-offwhite/70">e-mail</strong> part 2 fois par semaine au plus. Le reste arrive dans l'app (cloche) et en <strong className="font-medium text-offwhite/70">notification</strong>, une par jour maximum.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="mb-2 text-sm font-medium text-offwhite">Nombre d'actus</p>
            <div className="flex gap-2">{[1, 2, 3].map((n) => <button key={n} onClick={() => maj({ actu_nb: n })} className={bouton(nb === n)} data-testid={`actu-nb-${n}`}>{n}</button>)}</div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-offwhite">Heure d'envoi</p>
            <input type="time" value={heure} onChange={(e) => e.target.value && maj({ actu_heure: e.target.value })}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-offwhite focus:border-gold/50 focus:outline-none" data-testid="actu-heure" />
          </div>
        </div>
        {statut && !statut.pret && (
          <ul className="space-y-1 rounded-lg border border-amber-400/25 bg-amber-400/5 p-3 text-xs text-amber-200" data-testid="actu-manque">
            {statut.manque.map((m) => <li key={m}>• {m}</li>)}
          </ul>
        )}
        {statut?.pret && <p className="text-xs text-emerald-300">Tout est prêt : l'envoi du matin peut partir.</p>}
        <div>
          <button onClick={lancerTest} disabled={envoi} className="btn-gold px-4 py-2 text-sm disabled:opacity-60" data-testid="actu-test">
            {envoi ? "Envoi…" : "Envoyer un test maintenant"}
          </button>
          {test?.erreur && <p className="mt-2 text-xs text-red-300">{test.erreur}</p>}
          {test?.canaux && (
            <ul className="mt-2 space-y-1 text-xs" data-testid="actu-test-resultat">
              {Object.entries(test.canaux).map(([c, r]) => (
                <li key={c} className={r.ok ? "text-emerald-300" : "text-red-300"}>{r.ok ? "✓" : "✗"} {NOMS[c] || c} : {r.detail}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Carte>
  );
}

// Actualité : le légal suit le pays du compte (modifiable), la veille est choisie par l'utilisateur
// (pays suivis, secteurs, mots-clés). Le chat filtre ensuite « Légal » / « Ma veille ».
function CarteVeille({ cm, setCm, rythme, changerRythme, srcOn, togglerSrc }) {
  const [opts, setOpts] = useState(null);
  const [mot, setMot] = useState("");
  const [ajoutPays, setAjoutPays] = useState(false);
  useEffect(() => { fetchActualiteOptions().then(setOpts).catch(() => setOpts({ secteurs: [] })); }, []);
  const pays = cm.actu_pays_suivis?.length ? cm.actu_pays_suivis : [cm.marche || "france"];
  // Par défaut : les secteurs de ton activité (entreprise déclarée ou onboarding) ; tu peux en choisir d'autres.
  const secteurs = cm.actu_secteurs?.length ? cm.actu_secteurs : (opts?.secteurs_suivis || []);
  const mots = cm.actu_mots_cles || [];
  const enregistrer = async (patch, msg = "Veille enregistrée.") => {
    const suivant = { ...cm, ...patch };
    setCm(suivant);
    try { await saveProfile({ contexte_metier: patch }); toast.success(msg); } catch { toast.error("Échec de l'enregistrement."); setCm(cm); }
  };
  const basculerSecteur = (k) => {
    if (!secteurs.includes(k) && secteurs.length >= 6) { toast("6 secteurs au maximum."); return; }
    enregistrer({ actu_secteurs: secteurs.includes(k) ? secteurs.filter((x) => x !== k) : [...secteurs, k] });
  };
  const ajouterMot = () => {
    const m = mot.trim();
    if (m.length < 2) return;
    if (mots.length >= 5) { toast("5 mots-clés au maximum."); return; }
    if (!mots.includes(m)) enregistrer({ actu_mots_cles: [...mots, m] });
    setMot("");
  };
  const paysDefautLegal = opts?.entreprise?.pays || cm.marche || "france";
  const legalPays = cm.actu_legal_pays || paysDefautLegal;
  return (
    <Carte titre="Ton actualité" desc="Le légal suit ton pays ; ta veille, c'est toi qui la choisis. Dans le chat, filtre « Légal » ou « Ma veille ».">
      <div className="space-y-5" data-testid="parametres-veille">
        <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div><p className="text-sm font-medium text-offwhite">Alerte dans la cloche</p><p className="text-xs text-offwhite/50">À quel rythme la cloche te signale une nouvelle actualité.</p></div>
          <select value={rythme} onChange={(e) => changerRythme(e.target.value)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-offwhite focus:border-gold/50 focus:outline-none" data-testid="parametres-actu-rythme">
            <option value="quotidien">Chaque jour</option><option value="lundi">Le lundi uniquement</option><option value="jamais">Jamais</option>
          </select>
        </div>

        <div className="border-b border-white/5 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-sm font-medium text-offwhite">Légal & officiel</p>
              <p className="text-xs text-offwhite/50">Impôts, social, baux, lois : ce qui change pour les entreprises de ton pays{opts?.legal_officiel ? " (source officielle)" : " (presse juridique)"}.</p></div>
            <Interrupteur on={srcOn("actu_legal")} onClick={() => togglerSrc("actu_legal")} testid="parametres-actu-legal" />
          </div>
          <div className="mt-3 max-w-xs">
            <p className="mb-1 text-[12px] text-offwhite/45">Pays du légal {!cm.actu_legal_pays ? (opts?.entreprise ? `· celui de ton entreprise (${opts.entreprise.nom})` : "· celui de ton compte (déclare ton entreprise dans Compte pour l'affiner)") : "· choisi par toi"}</p>
            <ChoixPays variante="liste" valeur={legalPays} libelle={cm.actu_legal_pays ? "" : cm.marche_label}
              selectClass="h-9 w-full rounded-lg border border-white/15 bg-navy-800 px-2 text-sm text-offwhite"
              onChange={(k) => enregistrer({ actu_legal_pays: k === paysDefautLegal ? null : k }, "Pays du légal enregistré.")} />
          </div>
        </div>

        <div className="border-b border-white/5 pb-4">
          <p className="text-sm font-medium text-offwhite">Ma veille · pays suivis</p>
          <p className="mb-2 text-xs text-offwhite/50">Jusqu'à 4 pays : l'actualité économique de chacun.</p>
          <div className="flex flex-wrap items-center gap-2">
            {pays.map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs text-gold">
                {libellePays(k, k === cm.marche ? cm.marche_label : "")}
                {pays.length > 1 && <button onClick={() => enregistrer({ actu_pays_suivis: pays.filter((x) => x !== k) })} aria-label="Retirer"><X size={12} /></button>}
              </span>
            ))}
            {pays.length < 4 && !ajoutPays && <button onClick={() => setAjoutPays(true)} className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-xs text-offwhite/70 hover:bg-white/5" data-testid="veille-ajouter-pays"><Plus size={12} /> Pays</button>}
          </div>
          {ajoutPays && (
            <div className="mt-2 max-w-xs">
              <ChoixPays variante="liste" valeur="" selectClass="h-9 w-full rounded-lg border border-white/15 bg-navy-800 px-2 text-sm text-offwhite"
                onChange={(k) => { if (!pays.includes(k)) enregistrer({ actu_pays_suivis: [...pays, k] }); setAjoutPays(false); }} />
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-offwhite/60">
            <label className="inline-flex items-center gap-2"><Interrupteur on={srcOn("actu_pays")} onClick={() => togglerSrc("actu_pays")} testid="parametres-actu-pays" /> Actualité générale</label>
            <label className="inline-flex items-center gap-2"><Interrupteur on={srcOn("actu_eco")} onClick={() => togglerSrc("actu_eco")} testid="parametres-actu-eco" /> Économie</label>
          </div>
        </div>

        <div className="border-b border-white/5 pb-4">
          <p className="text-sm font-medium text-offwhite">Ma veille · secteurs</p>
          <p className="mb-2 text-xs text-offwhite/50">Ceux de ton activité sont choisis d'office ; ajoute-en d'autres (6 au maximum). « Reprise, cession & fusions » est un secteur comme un autre : utile si tu achètes, vends ou conseilles des entreprises.</p>
          <div className="flex flex-wrap gap-2" data-testid="veille-secteurs">
            {(opts?.secteurs || []).map((sct) => (
              <button key={sct.cle} onClick={() => basculerSecteur(sct.cle)} data-testid={`veille-secteur-${sct.cle}`}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${secteurs.includes(sct.cle) ? "border-gold bg-gold text-navy-900" : "border-white/15 text-offwhite/75 hover:bg-white/5"}`}>{sct.label}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-offwhite">Ma veille · mots-clés</p>
          <p className="mb-2 text-xs text-offwhite/50">Jusqu'à 5 sujets précis (ex. « cession PME », « loi Pinel », un concurrent) : pour publier avant tout le monde.</p>
          <div className="flex flex-wrap items-center gap-2">
            {mots.map((m) => (
              <span key={m} className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/40 bg-sky-400/10 px-3 py-1 text-xs text-sky-100">
                {m}<button onClick={() => enregistrer({ actu_mots_cles: mots.filter((x) => x !== m) })} aria-label="Retirer"><X size={12} /></button>
              </span>
            ))}
            {mots.length < 5 && (
              <form onSubmit={(e) => { e.preventDefault(); ajouterMot(); }} className="flex gap-1.5">
                <input value={mot} onChange={(e) => setMot(e.target.value)} placeholder="Ajouter un mot-clé" className="h-8 w-44 rounded-lg border border-white/15 bg-white/5 px-2.5 text-xs text-offwhite" data-testid="veille-mot" />
                <button className="h-8 rounded-lg bg-gold px-2.5 text-xs font-semibold text-navy-900"><Plus size={13} /></button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Carte>
  );
}

// Connexions : tout ce que Zayado relie, au même endroit, avec son état.
function SectionConnexions() {
  const [conns, setConns] = useState(null);
  const [cm, setCm] = useState(null);
  const [abo, setAbo] = useState(null);
  const [envoi, setEnvoi] = useState("");

  const charger = () => Promise.all([fetchConnections(), fetchState()]).then(([c, s]) => {
    setConns(c || []);
    const x = s.vision?.contexte_metier || {};
    setCm({ auto_save_documents: x.auto_save_documents === true, document_provider: x.document_provider || "google" });
  }).catch(() => { setConns([]); setCm({ auto_save_documents: false, document_provider: "google" }); });
  useEffect(() => { charger(); fetchAbonnement().then(setAbo).catch(() => setAbo({})); }, []);

  const relie = (p) => (conns || []).some((c) => c.provider === p && c.status === "ready");
  const relier = async (provider) => {
    setEnvoi(provider);
    try {
      const r = await oauthStockage(provider);
      if (r.configured && r.authorization_url) { window.location.href = r.authorization_url; return; }
      toast("Cette connexion n'est pas encore activée par Zayado.");
    } catch { toast.error("Connexion impossible pour le moment."); }
    setEnvoi("");
  };
  const couper = async (cle, nom) => {
    if (!window.confirm(`Déconnecter ${nom} ? Les documents déjà envoyés restent dans ton espace.`)) return;
    try { await deconnecterCanal(cle); toast.success(`${nom} déconnecté.`); charger(); } catch { toast.error("Déconnexion impossible."); }
  };
  const reglerAuto = async (patch) => {
    const suivant = { ...cm, ...patch };
    if (suivant.auto_save_documents && !relie(`${suivant.document_provider}_drive`)) {
      toast("Relie d'abord cette destination juste au-dessus.");
      return;
    }
    setCm(suivant);
    try { await saveProfile({ contexte_metier: suivant }); toast.success(suivant.auto_save_documents ? "Enregistrement automatique activé." : "Enregistrement automatique coupé."); }
    catch { toast.error("Échec de l'enregistrement."); }
  };

  const equipe = ["business", "entreprise"].includes(abo?.plan) && abo?.acces === "actif";
  const Ligne = ({ Icone, nom, sous, ok, action }) => (
    <div className="flex items-center gap-3 border-b border-white/[0.07] py-3 last:border-0">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ok ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.06] text-offwhite/60"}`}><Icone size={17} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-offwhite">{nom}</p>
        <p className="truncate text-[12px] text-offwhite/55">{sous}</p>
      </div>
      {action}
    </div>
  );
  const bouton = (ok, cle, nom, onRelier) => ok
    ? <button onClick={() => couper(cle, nom)} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1 text-[12px] text-offwhite/75 hover:bg-white/10" data-testid={`connexion-${cle}-couper`}><Check size={12} className="text-emerald-300" /> Relié</button>
    : <button onClick={onRelier} disabled={envoi === cle.split("_")[0]} className="rounded-lg bg-gold px-3 py-1.5 text-[12px] font-semibold text-navy-900 disabled:opacity-60" data-testid={`connexion-${cle}-relier`}>
        {envoi === cle.split("_")[0] ? <Loader2 size={13} className="animate-spin" /> : "Relier"}
      </button>;

  if (!conns || !cm) return <Carte><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;
  return (
    <>
      <Carte titre="Tes espaces cloud" desc="Les documents créés par l'IA (brief, plan 30 jours, SWOT…) peuvent partir tout seuls dans ton Drive. Zayado n'accède qu'aux fichiers qu'il crée.">
        <div data-testid="parametres-connexions">
          <Ligne Icone={Cloud} nom="Google Drive" ok={relie("google_drive")} sous={relie("google_drive") ? "Relié à ton compte Zayado" : "Pas relié"}
            action={bouton(relie("google_drive"), "google_drive", "Google Drive", () => relier("google"))} />
          <Ligne Icone={Cloud} nom="OneDrive / SharePoint" ok={relie("microsoft_drive")} sous={relie("microsoft_drive") ? "Relié à ton compte Zayado" : "Pas relié"}
            action={bouton(relie("microsoft_drive"), "microsoft_drive", "OneDrive", () => relier("microsoft"))} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-offwhite">Enregistrer automatiquement mes documents</p>
            <select value={cm.document_provider} onChange={(e) => reglerAuto({ document_provider: e.target.value })}
              className="mt-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-offwhite" data-testid="cloud-auto-save-provider">
              <option value="google">dans Google Drive</option>
              <option value="microsoft">dans OneDrive / SharePoint</option>
            </select>
          </div>
          <Interrupteur on={cm.auto_save_documents} onClick={() => reglerAuto({ auto_save_documents: !cm.auto_save_documents })} testid="cloud-auto-save-toggle" />
        </div>
      </Carte>

      <Carte titre="Ton Copilote sur ton téléphone" desc="Écris à Zayado comme à un contact : idées, priorités, « c'est fait ». Tout se retrouve dans ton app.">
        <CanauxCopilote />
        <div className="mt-4"><AgentParDefaut /></div>
      </Carte>

      <Carte titre="Ta banque (Pouls Business)" desc="Qonto : ton CA et ta trésorerie se mettent à jour tout seuls dans le Pouls Business.">
        <PoulsQonto />
      </Carte>

      <CarteTeams />
      {equipe && <CarteZayadoRH equipe={equipe} />}
    </>
  );
}

function SectionParrainage() {
  const [filleuls, setFilleuls] = useState(null);
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = () => fetchMesFilleuls().then((d) => setFilleuls(d.items));
  useEffect(() => { charger(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const inviter = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEnvoi(true);
    try { await inviterParrainage(email.trim()); setEmail(""); toast.success("Invitation enregistrée."); charger(); }
    catch (err) { toast.error(err?.message?.includes("409") ? "Déjà invité." : "Échec de l'invitation."); }
    finally { setEnvoi(false); }
  };

  return (
    <>
      <Carte titre="Inviter quelqu'un" desc="1 mois d'abonnement offert dès que la personne invitée s'abonne. Programmes avancés (ambassadeur, affiliation) dans l'espace Programmes.">
        <form onSubmit={inviter} className="flex gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.fr" className={`${INPUT} flex-1`} data-testid="parametres-parrainage-email" />
          <button type="submit" disabled={envoi} className={BTN_OR} data-testid="parametres-parrainage-inviter">Inviter</button>
        </form>
        <Link to="/programmes" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline" data-testid="lien-programmes">Voir les 3 programmes (parrainage · ambassadeur · affiliation) →</Link>
      </Carte>
      <Carte titre="Mes filleuls">
        {!filleuls?.length && <p className="text-sm text-offwhite/50">Aucun filleul pour l'instant.</p>}
        {filleuls?.map((f) => (
          <div key={f.email} className="flex items-center justify-between border-b border-white/5 py-1.5 text-sm">
            <span>{f.email}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${f.statut === "actif" ? "bg-gold/15 text-gold" : "bg-white/10"}`}>{f.statut}</span>
          </div>
        ))}
      </Carte>
    </>
  );
}

function SectionSecurite() {
  const [moi, setMoi] = useState(null);
  const [export_, setExport] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [suppression, setSuppression] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { fetchMoi().then(setMoi).catch(() => setMoi({})); }, []);

  const exporter = async () => {
    setExport(true);
    try { await telechargerExport(); toast.success("Export téléchargé."); }
    catch { toast.error("Export impossible pour le moment."); }
    finally { setExport(false); }
  };
  const supprimer = async () => {
    if (confirmation !== "SUPPRIMER") return;
    setSuppression(true);
    try { await deleteData(); toast.success("Tes données ont été supprimées."); navigate("/onboarding"); }
    catch { toast.error("Suppression impossible pour le moment."); }
    finally { setSuppression(false); }
  };

  return (
    <>
      <Carte titre="Connexion" desc="Pas de mot de passe à retenir : Google, Microsoft ou lien magique envoyé par e-mail.">
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <Mail size={16} className="text-gold" />
          <div><p className="text-xs text-offwhite/50">E-mail de connexion</p><p className="text-sm font-medium" data-testid="parametres-email-connexion">{moi === null ? "…" : (moi.email || "Compte de démonstration")}</p></div>
        </div>
      </Carte>
      <Carte titre="Tes données" desc="Tes données t'appartiennent : elles sont hébergées en Europe et exportables à tout moment (RGPD).">
        <button onClick={exporter} disabled={export_} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5" data-testid="parametres-export">
          {export_ ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Exporter mes données (JSON)
        </button>
      </Carte>
      <Carte titre="Supprimer mes données" desc="Efface ta vision, tes objectifs, tes actions, tes check-ins, tes boards et ton historique de chat. Irréversible.">
        <label className="mb-1.5 block text-xs text-offwhite/50">Tape SUPPRIMER pour confirmer</label>
        <div className="flex gap-2">
          <input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="SUPPRIMER" className={`${INPUT} flex-1`} data-testid="parametres-suppr-confirm" />
          <button onClick={supprimer} disabled={confirmation !== "SUPPRIMER" || suppression} className="inline-flex items-center gap-2 rounded-xl bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-60" data-testid="parametres-suppr">
            {suppression ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Supprimer
          </button>
        </div>
        <p className="mt-3 text-xs text-offwhite/45">Pour fermer définitivement ton compte, écris à <a className="text-gold underline" href="mailto:contact@zayado.net?subject=Fermeture%20de%20compte">contact@zayado.net</a> : c'est traité sous 30 jours.</p>
      </Carte>
    </>
  );
}

// Équipe : « Ton entreprise » vit dans Zayado (SQL). L'app RH séparée (rh.zayado.net) ne sert plus que pour le mode
// Microsoft 365 / SharePoint de l'offre Entreprise.
const RH_URL = process.env.REACT_APP_RH_URL || "https://rh.zayado.net";
function CarteZayadoRH({ equipe }) {
  return (
    <Carte titre="Ton entreprise by Zayado" desc="Présence, absences, planning, temps et pièces de tes salariés, prestataires et freelances. On invite par e-mail ou par lien : aucun Microsoft 365 nécessaire.">
      {equipe ? (
        <>
          <Link to="/app/entreprise" className={`${BTN_OR} mt-1`} data-testid="parametres-entreprise">
            <Users size={14} /> Ouvrir Ton entreprise
          </Link>
          <p className="mt-3 text-[12px] leading-relaxed text-offwhite/50">
            Offre Entreprise : si tes données doivent rester dans ton propre Microsoft 365 (SharePoint, Lists), l'
            <a href={`${RH_URL}/login`} target="_blank" rel="noopener noreferrer" className="text-gold underline" data-testid="parametres-zayado-rh">app Zayado RH en mode Microsoft 365</a> reste disponible.
          </p>
        </>
      ) : (
        <Link to="/pricing" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gold hover:underline" data-testid="parametres-zayado-rh-offre">
          Inclus dans les offres Business et Entreprise →
        </Link>
      )}
    </Carte>
  );
}

function CarteTeams() {
  return (
    <Carte titre="Ton équipe dans Microsoft Teams" desc="Présence, absences et planning de ton équipe dans Teams, à côté de vos conversations. Ton cockpit personnel (énergie, Vision, Radar, Ma Foi) n'apparaît jamais dans Teams.">
      <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-offwhite/75" data-testid="parametres-teams">
        <li>Télécharge le pack Zayado pour Teams (fichier .zip, ne pas le décompresser).</li>
        <li>Dans Teams : <b>Applications</b> › <b>Gérer vos applications</b> › <b>Charger une application</b> › <b>Charger une application personnalisée</b>.</li>
        <li>Pour que toute l'équipe voie l'onglet : dans un canal ou un chat, <b>+</b> › <b>Zayado</b> › « Équipe ». Chacun se connecte avec son compte Zayado et ne voit que ce que son rôle permet.</li>
      </ol>
      <p className="mt-2 text-[12px] text-offwhite/50">Si le chargement est bloqué, ton administrateur Microsoft 365 peut l'ajouter pour toute l'entreprise (Centre d'administration Teams › Gérer les applications › Charger).</p>
      <a href="/api/public/teams/zayado-teams.zip" download="zayado-teams.zip" className={`${BTN_OR} mt-3`} data-testid="parametres-teams-telecharger"><Download size={14} /> Télécharger le pack Teams</a>
    </Carte>
  );
}

const dateFr = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");

function Renouvellement({ abo, onChange }) {
  const [envoi, setEnvoi] = useState(false);
  const [depart, setDepart] = useState(false);
  const r = abo?.renouvellement;
  if (!r) return null;
  const reveurPossible = r.automatique && abo.plan !== "reveur" && r.plan_suivant !== "reveur";
  const action = async (fn, ok, ko) => {
    setEnvoi(true);
    try { await fn(); toast.success(ok); oublierAbonnement(); setDepart(false); onChange(); } catch { toast.error(ko); }
    setEnvoi(false);
  };
  const resilier = () => action(resilierAbonnement, "Abonnement résilié : aucun autre prélèvement.", "Résiliation impossible pour le moment. Écris-nous à contact@zayado.net.");
  const reprendre = () => action(reprendreAbonnement, "C'est reparti : ton abonnement continue.", "Impossible de reprendre : choisis une offre sur la page Tarifs.");
  const passerReveur = () => action(() => changerOffre("reveur"), `Tu passeras à Rêveur le ${dateFr(r.date)} (15 € TTC / mois).`, "Changement impossible pour le moment.");
  return (
    <div className="mt-4 space-y-3" data-testid="parametres-renouvellement">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
        <p className="text-xs leading-relaxed text-offwhite/70">
          {r.automatique
            ? <>Prochain prélèvement le <b className="text-offwhite">{dateFr(r.date)}</b>{r.montant_ttc ? <> : <b className="text-offwhite">{Number(r.montant_ttc).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € TTC</b></> : null}{r.plan_suivant === "reveur" ? <> (offre <b className="text-offwhite">Rêveur</b> à partir de cette date)</> : null}. Sans engagement.</>
            : r.resilie ? <>Résilié : plus aucun prélèvement. Accès jusqu'au <b className="text-offwhite">{dateFr(r.date)}</b>.</>
            : <>Accès jusqu'au <b className="text-offwhite">{dateFr(r.date)}</b>.</>}
        </p>
        {r.automatique && !depart && <button onClick={() => setDepart(true)} disabled={envoi} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-offwhite/80 hover:bg-white/10 disabled:opacity-60" data-testid="parametres-resilier">Résilier</button>}
        {r.resilie && <button onClick={reprendre} disabled={envoi} className="rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-navy-900 disabled:opacity-60" data-testid="parametres-reprendre">Reprendre mon abonnement</button>}
      </div>
      {depart && (
        <div className="rounded-xl border border-gold/35 bg-gold/[0.08] p-4" data-testid="parametres-avant-depart">
          {reveurPossible ? (
            <>
              <p className="text-sm font-semibold text-offwhite">Tu ne prospectes pas en ce moment ?</p>
              <p className="mt-1 text-xs leading-relaxed text-offwhite/70">Garde ta Vision, tes objectifs et tes idées au lieu de tout mettre en pause : l'offre <b>Rêveur</b> à 15 € TTC / mois, à partir du {dateFr(r.date)}. Ton tarif fondateur reste acquis si tu reviens à Solo ou Pro.</p>
            </>
          ) : <p className="text-sm text-offwhite/80">Plus aucun prélèvement ; tu gardes l'accès jusqu'au {dateFr(r.date)} et tes données restent exportables.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {reveurPossible && <button onClick={passerReveur} disabled={envoi} className="rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-navy-900 disabled:opacity-60" data-testid="parametres-passer-reveur">Passer à Rêveur</button>}
            <button onClick={resilier} disabled={envoi} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-offwhite/80 hover:bg-white/10 disabled:opacity-60" data-testid="parametres-resilier-confirmer">Résilier quand même</button>
            <button onClick={() => setDepart(false)} className="px-2 text-xs text-offwhite/55 hover:text-offwhite">Annuler</button>
          </div>
        </div>
      )}
      {abo.en_essai && reveurPossible && !depart && (
        <p className="text-[12px] text-offwhite/50">Tu veux juste garder ta Vision et tes idées après l'essai ? <button onClick={passerReveur} disabled={envoi} className="font-semibold text-gold hover:underline" data-testid="parametres-essai-reveur">Passer à Rêveur (15 € TTC) à la fin de l'essai</button></p>
      )}
    </div>
  );
}

function GestionEquipe() {
  const [eq, setEq] = useState(null);
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const charger = () => fetchEquipe().then(setEq).catch(() => setEq(null));
  useEffect(() => { charger(); }, []);
  if (!eq || eq.places <= 0) return null;
  const inviter = async (e) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setEnvoi(true);
    try { await inviterCoequipier(email.trim()); toast.success("Invitation envoyée"); setEmail(""); charger(); }
    catch (err) { toast.error(String(err.message).includes("409") ? "Déjà dans l'équipe, ou plus de place disponible." : "Invitation impossible pour le moment."); }
    setEnvoi(false);
  };
  const retirer = async (id) => {
    if (!window.confirm("Retirer cette personne ? Son espace se met en pause (ses données sont conservées).")) return;
    try { await retirerCoequipier(id); charger(); } catch { toast.error("Suppression impossible"); }
  };
  return (
    <Carte titre="Mon équipe" desc={`Ton offre comprend ${eq.places} coéquipier(s). Chacun a son propre espace Solo : cockpit, Vision, Radar et Plan d'action.`}>
      <div className="space-y-2" data-testid="parametres-equipe">
        {eq.membres.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm">
            <Mail size={14} className="shrink-0 text-gold" />
            <span className="min-w-0 flex-1 truncate">{m.email}</span>
            <span className={`text-xs ${m.inscrit ? "text-emerald-300" : "text-offwhite/50"}`}>{m.inscrit ? "Espace créé" : "Invitation envoyée"}</span>
            <button onClick={() => retirer(m.id)} aria-label="Retirer" className="rounded-lg p-1.5 text-offwhite/50 hover:bg-white/10 hover:text-rose-300"><Trash2 size={14} /></button>
          </div>
        ))}
        {eq.membres.length < eq.places && (
          <form onSubmit={inviter} className="flex gap-2 pt-1">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@coequipier.fr" className={`${INPUT} flex-1`} data-testid="parametres-equipe-email" />
            <button type="submit" disabled={envoi} className={BTN_OR} data-testid="parametres-equipe-inviter"><Plus size={14} className="mr-1 inline" />Inviter</button>
          </form>
        )}
      </div>
    </Carte>
  );
}

// Ce que l'offre comprend, et ce que l'offre au-dessus ajouterait.
const ORDRE_OFFRES = ["reveur", "serenite", "pro", "business", "entreprise"];
function ContenuOffre({ plan }) {
  const toutes = [...PLANS, PLAN_ENTREPRISE];
  const actuelle = toutes.find((p) => p.key === plan);
  const suivante = toutes.find((p) => p.key === ORDRE_OFFRES[ORDRE_OFFRES.indexOf(plan) + 1]);
  if (!actuelle || !actuelle.points?.length) return null;
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="parametres-contenu-offre">
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-offwhite/55">Inclus dans {actuelle.nom}</p>
        <ul className="space-y-1.5">
          {actuelle.points.map((p) => <li key={p} className="flex gap-2 text-[12.5px] text-offwhite/80"><Check size={13} className="mt-0.5 shrink-0 text-emerald-300" />{p}</li>)}
        </ul>
      </div>
      {suivante && (
        <div className="rounded-xl border border-gold/25 bg-gold/[0.06] p-3.5">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-gold">Avec {suivante.nom}, en plus</p>
          <ul className="space-y-1.5">
            {suivante.points.filter((p) => !p.startsWith("Tout ")).map((p) => <li key={p} className="flex gap-2 text-[12.5px] text-offwhite/80"><Plus size={13} className="mt-0.5 shrink-0 text-gold" />{p}</li>)}
          </ul>
          <Link to="/pricing" className="mt-2 inline-block text-[12px] font-semibold text-gold hover:underline">Comparer les offres →</Link>
        </div>
      )}
    </div>
  );
}

function SectionFacturation() {
  const [abo, setAbo] = useState(null);
  const [commandes, setCommandes] = useState(null);
  const [fondateur, setFondateur] = useState(null);
  const [code, setCode] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const chargerAbo = () => fetchAbonnement().then(setAbo).catch(() => fetchState().then((d) => setAbo({ plan: d.profile?.plan || "essentielle" })).catch(() => setAbo({ plan: "essentielle" })));
  useEffect(() => {
    chargerAbo();
    fetchCommandes().then((d) => setCommandes((d.items || []).filter((c) => c.kind === "saas" || c.kind === "service" || c.kind === "produit"))).catch(() => setCommandes([]));
    fetchTarifsFondateur().then(setFondateur).catch(() => {});
  }, []);

  const appliquer = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setEnvoi(true);
    try {
      const r = await appliquerCodePromo(code.trim());
      if (r.type === "thesustain") {
        oublierAbonnement();
        toast.success(`Code membre TheSustain reconnu : −${Math.round((Number(r.remise) || 0) * 100)} % sur toutes les offres, visible dans la grille.`);
      } else {
        toast.success(`+${r.mois_offerts} mois offert${r.mois_offerts > 1 ? "s" : ""} — total : ${r.mois_offerts_total}`);
      }
      setCode("");
    } catch { toast.error("Code invalide, inactif ou déjà utilisé."); }
    finally { setEnvoi(false); }
  };
  const [paiement, setPaiement] = useState(false);
  const finaliser = async () => {
    if (!abo?.plan_en_attente) return;
    setPaiement(true);
    const ok = await lancerPaiement(abo.plan_en_attente, { essai: !!abo.essai?.disponible && (abo.essai?.plans || [abo.essai?.plan]).includes(abo.plan_en_attente) });
    if (!ok) setPaiement(false);
  };
  const STATUT = { paid: ["Payée", "text-emerald-300"], pending: ["En attente", "text-amber-300"], open: ["En attente", "text-amber-300"], failed: ["Échouée", "text-red-300"], canceled: ["Annulée", "text-offwhite/50"], expired: ["Expirée", "text-offwhite/50"] };

  return (
    <>
      <Carte titre="Ton offre">
        {abo === null ? <p className="text-sm text-offwhite/50">Chargement…</p> : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-gold" data-testid="parametres-plan">{planNom(abo.plan || "essentielle")}</p>
              <p className="text-xs text-offwhite/55">
                {abo.cycle === "offert" ? "Offert par Zayado · aucun prélèvement" : <>
                  {abo.fondateur ? "Tarif fondateur garanti · " : ""}
                  {abo.en_essai ? `Essai ${ESSAI.mois} mois · jusqu'au ${new Date(abo.fin).toLocaleDateString("fr-FR")}` : abo.acces === "actif" && abo.fin ? `Accès jusqu'au ${new Date(abo.fin).toLocaleDateString("fr-FR")}` : abo.acces === "actif" ? "Offre active" : "Ton espace est en pause : tes données sont conservées"}
                </>}
              </p>
            </div>
            {abo.acces !== "actif" && abo.essai?.disponible ? (
              <button onClick={() => { setPaiement(true); lancerPaiement("serenite", { essai: true }).then((ok) => !ok && setPaiement(false)); }} disabled={paiement}
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-xs font-semibold text-navy-900 disabled:opacity-60" data-testid="parametres-essai"><Sparkles size={13} /> Essayer 2 mois pour 1 €</button>
            ) : (
              <Link to="/pricing" className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-xs font-semibold text-navy-900"><Sparkles size={13} /> {abo.acces === "actif" ? "Voir les offres" : "Reprendre une offre"}</Link>
            )}
          </div>
        )}
        {abo?.plan_en_attente && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2.5" data-testid="parametres-plan-attente">
            <p className="text-xs text-amber-100">Tu as choisi <b>{planNom(abo.plan_en_attente)}</b> : l'offre s'active dès que le paiement est validé.</p>
            <button onClick={finaliser} disabled={paiement} className="rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-navy-900 disabled:opacity-60" data-testid="parametres-finaliser-paiement">
              {paiement ? "Redirection…" : "Finaliser le paiement"}
            </button>
          </div>
        )}
        {abo?.cycle !== "offert" && <Renouvellement abo={abo} onChange={chargerAbo} />}
        {abo && <ContenuOffre plan={abo.acces === "actif" ? abo.plan : null} />}
        {abo?.equipe && (
          <p className="mt-3 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-offwhite/80" data-testid="parametres-membre-equipe">
            Espace Solo offert par l'équipe de <b>{abo.equipe.titulaire}</b>.
          </p>
        )}
        {fondateur?.ouverte && !abo?.fondateur && abo?.cycle !== "offert" && !abo?.equipe && ["serenite", "pro", "essentielle", "reveur", undefined].includes(abo?.plan) && (
          <p className="mt-3 rounded-xl bg-gold/10 px-3 py-2 text-xs text-gold">Tarif fondateur ouvert{fondateur.places_restantes != null ? ` · ${fondateur.places_restantes} places restantes` : ""} : ton prix reste garanti tant que tu restes abonné·e.</p>
        )}
      </Carte>
      <GestionEquipe />
      <Carte titre="Historique & factures" desc="Tes paiements Mollie. Le reçu détaillé est envoyé par e-mail à chaque paiement.">
        {commandes === null && <p className="text-sm text-offwhite/50">Chargement…</p>}
        {commandes?.length === 0 && <p className="text-sm text-offwhite/50">Aucun paiement pour l'instant.</p>}
        {commandes?.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 border-b border-white/5 py-2 text-sm" data-testid={`parametres-commande-${c.id}`}>
            <span className="flex min-w-0 items-center gap-2"><Receipt size={14} className="shrink-0 text-gold" /><span className="truncate">{c.title}</span></span>
            <span className="shrink-0 text-xs text-offwhite/55">{c.created_at ? new Date(c.created_at).toLocaleDateString("fr-FR") : ""}</span>
            <span className="shrink-0 font-medium">{Number(c.amount).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
            <span className={`shrink-0 text-xs ${(STATUT[c.status] || ["", ""])[1]}`}>{(STATUT[c.status] || [c.status])[0]}</span>
          </div>
        ))}
      </Carte>
      <Carte titre="Code de réduction">
        <form onSubmit={appliquer} className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CODE" className={`${INPUT} flex-1`} data-testid="parametres-promo-input" />
          <button type="submit" disabled={envoi} className={BTN_OR} data-testid="parametres-promo-appliquer">Appliquer</button>
        </form>
      </Carte>
    </>
  );
}

