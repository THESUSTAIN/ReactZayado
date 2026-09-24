import React, { useState, useEffect } from "react";
import { planNom } from "@/lib/plans";
import { lancerPaiement } from "@/lib/checkout";
import {
  User, Palette, Bell, Plug, ShieldCheck, CreditCard, Gift, Loader2, Save, Download, Cloud,
  Search, X, Sun, Moon, Compass, Brain, Trash2, Mail, Plus, Receipt, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchState, saveProfile, fetchConnections, fetchMesFilleuls, inviterParrainage, appliquerCodePromo, fetchMoi,
  fetchAbonnement, fetchCommandes, telechargerExport, deleteData, fetchTarifsFondateur,
} from "@/lib/kairosApi";
import { useI18n } from "@/i18n";
import { Link, useNavigate } from "react-router-dom";
import IntegrationsSection from "@/components/kairos/IntegrationsSection";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";

// Paramètres en grande fenêtre modale — structure inspirée de
// ReactZayado/SettingsModal.jsx (v13) : recherche + sections latérales.
// Chaque section n'affiche que ce qui est réellement câblé côté serveur.
const SECTIONS = [
  { id: "general", label: "Général", Icon: Palette, mots: "langue français english thème clair sombre apparence" },
  { id: "profil", label: "Profil & mémoire IA", Icon: User, mots: "prénom email identité heure point du jour mémoire ia pourquoi offre cible approche" },
  { id: "vision", label: "Vision & valeurs", Icon: Compass, mots: "vision phrase valeurs inspiration cap" },
  { id: "notifications", label: "Notifications", Icon: Bell, mots: "alerte rappel email lundi" },
  { id: "integrations", label: "Intégrations", Icon: Plug, mots: "whatsapp telegram qonto connexion drive" },
  { id: "cloud-save", label: "Enregistrement cloud", Icon: Cloud, mots: "drive google onedrive sharepoint document automatique nuage" },
  { id: "parrainage", label: "Parrainage", Icon: Gift, mots: "inviter filleul crédit bonus" },
  { id: "securite", label: "Sécurité & données", Icon: ShieldCheck, mots: "export rgpd données suppression connexion email" },
  { id: "facturation", label: "Offre & factures", Icon: CreditCard, mots: "plan abonnement prix code réduction facture historique fondateur" },
];

// Complétion du profil (comme final-main) : ce qui aide vraiment le Copilote.
function useCompletion() {
  const [pct, setPct] = useState(null);
  const calculer = () => fetchState().then((d) => {
    const p = d.profile || {}, v = d.vision || {}, cm = v.contexte_metier || {};
    const items = [p.prenom, p.email, v.texte, v.pourquoi, cm.offre, cm.cible, cm.approche, (v.valeurs || []).length];
    setPct(Math.round((items.filter(Boolean).length / items.length) * 100));
  }).catch(() => {});
  useEffect(() => {
    calculer();
    window.addEventListener("zayado:profil-maj", calculer);
    return () => window.removeEventListener("zayado:profil-maj", calculer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return pct;
}
const signalerMaj = () => window.dispatchEvent(new Event("zayado:profil-maj"));

export default function Parametres() {
  const [active, setActive] = useState(() => {
    const h = (window.location.hash || "").replace("#", "");
    return SECTIONS.some((x) => x.id === h) ? h : "general";
  });
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
      {/* Mobile : barre d'onglets défilante */}
      <nav className="-mx-4 flex gap-1.5 overflow-x-auto border-b border-white/[0.14] px-4 py-3 [scrollbar-width:none] md:hidden" data-testid="parametres-nav-mobile">
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
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header title="Paramètres" subtitle="Un seul endroit pour tout régler." />
        <main className="mx-auto max-w-[980px] px-4 py-5 sm:px-6 sm:py-8" data-testid="parametres-page">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-offwhite/60">Réglages</p>
          <h1 className="mb-5 mt-1 font-display text-3xl font-bold sm:mb-6 sm:text-4xl">Paramètres</h1>
          <div className="flex flex-col md:min-h-[70vh] md:flex-row md:overflow-hidden md:rounded-[22px] md:border md:border-white/[0.14] md:bg-white/[0.10] md:shadow-[0_10px_30px_rgba(0,0,0,0.18)] md:backdrop-blur-xl" data-testid="parametres-modal">
            {/* Colonne gauche : recherche + complétion + navigation */}
            <div className="flex w-full shrink-0 flex-col md:w-[210px] md:border-r md:border-white/[0.14]">
              <div className="mb-2 flex items-center gap-2 rounded-[10px] md:mx-3 md:mt-3 border border-white/[0.14] bg-white/[0.06] px-2.5 py-[7px]">
                <Search size={14} className="shrink-0 text-offwhite/50" />
                <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un réglage…"
                  data-testid="parametres-recherche" className="w-full bg-transparent text-[13px] text-offwhite outline-none placeholder:text-offwhite/45" />
              </div>
              {completion !== null && (
                <button onClick={() => setActive("profil")} data-testid="parametres-completion"
                  className="mb-3 flex items-center gap-2.5 rounded-[10px] border border-gold/20 md:mx-3 bg-gold/[0.06] p-2.5 text-left transition hover:bg-gold/[0.12]">
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `conic-gradient(#DEC2A3 ${completion * 3.6}deg, rgba(255,255,255,0.14) 0deg)` }}>
                    <span className="absolute inset-[3px] rounded-full bg-[#1b2a4d]" />
                    <span className="relative text-[10px] font-bold text-gold">{completion}%</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold text-offwhite">Profil complété</span>
                    <span className="block text-[11px] text-offwhite/55">{completion < 100 ? "Complète ton profil" : "Profil complet !"}</span>
                  </span>
                </button>
              )}
              {nav}
            </div>

            {/* Panneau */}
            <div className="min-w-0 flex-1 pt-4 md:p-6" data-testid={`parametres-panel-${active}`}>
              {active === "profil" && <SectionProfil />}
              {active === "general" && <SectionGeneral />}
              {active === "vision" && <SectionVision />}
              {active === "notifications" && <SectionNotifications />}
              {active === "integrations" && <IntegrationsSection />}
              {active === "cloud-save" && <SectionCloudSave />}
              {active === "parrainage" && <SectionParrainage />}
              {active === "securite" && <SectionSecurite />}
              {active === "facturation" && <SectionFacturation />}
            </div>
          </div>
        </main>
      </div>
    </div>
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

function SectionProfil() {
  const [profil, setProfil] = useState(null);
  const [memoire, setMemoire] = useState(null);
  const [cm, setCm] = useState({});
  const [sauvegarde, setSauvegarde] = useState(false);

  useEffect(() => {
    fetchState().then(async (d) => {
      const p = { ...(d.profile || {}) };
      // Préremplit l'email avec celui du compte si le profil ne l'a pas encore.
      if (!p.email) {
        try { const moi = await fetchMoi(); if (moi?.email) p.email = moi.email; } catch { /* compte sans email */ }
      }
      const c = d.vision?.contexte_metier || {};
      setCm(c);
      setProfil(p);
      setMemoire({ pourquoi: d.vision?.pourquoi || "", offre: c.offre || "", cible: c.cible || "", approche: c.approche || "" });
    }).catch(() => toast.error("Impossible de charger ton profil."));
  }, []);

  const champ = (cle, valeur) => setProfil((p) => ({ ...p, [cle]: valeur }));
  const mem = (cle, valeur) => setMemoire((m) => ({ ...m, [cle]: valeur }));
  const enregistrer = async () => {
    setSauvegarde(true);
    try {
      await saveProfile({
        prenom: profil.prenom, email: profil.email, heure_checkin: profil.heure_checkin,
        pourquoi: memoire.pourquoi,
        contexte_metier: { ...cm, offre: memoire.offre, cible: memoire.cible, approche: memoire.approche },
      });
      toast.success("Profil enregistré. Le Copilote s'en sert dès maintenant.");
      signalerMaj();
    } catch { toast.error("Échec de l'enregistrement."); }
    finally { setSauvegarde(false); }
  };

  if (!profil || !memoire) return <Carte><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;
  return (
    <>
      <Carte titre="Ton identité" desc="Ces informations personnalisent ton cockpit et ton Copilote.">
        <label className="mb-1.5 block text-xs text-offwhite/50">Prénom</label>
        <input value={profil.prenom || ""} onChange={(e) => champ("prenom", e.target.value)} className={`${INPUT} mb-4`} data-testid="parametres-prenom" />
        <label className="mb-1.5 block text-xs text-offwhite/50">E-mail (point du jour, e-mail du lundi)</label>
        <input type="email" value={profil.email || ""} onChange={(e) => champ("email", e.target.value)} className={`${INPUT} mb-4`} data-testid="parametres-email" />
        <label className="mb-1.5 block text-xs text-offwhite/50">Heure du point du jour</label>
        <input type="time" value={profil.heure_checkin || "08:30"} onChange={(e) => champ("heure_checkin", e.target.value)} className={INPUT} data-testid="parametres-heure" />
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
            <textarea rows={2} value={memoire[k]} onChange={(e) => mem(k, e.target.value)} placeholder={ph} className={`${INPUT} h-auto resize-y py-3 leading-relaxed`} data-testid={`parametres-memoire-${k}`} />
          </div>
        ))}
      </Carte>
      <button onClick={enregistrer} disabled={sauvegarde} className={BTN_OR} data-testid="parametres-save-profil">
        {sauvegarde ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
      </button>
    </>
  );
}

function SectionVision() {
  const [vision, setVision] = useState(null);
  const [valeurs, setValeurs] = useState([]);
  const [nouvelle, setNouvelle] = useState("");
  const [sauvegarde, setSauvegarde] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchState().then((d) => { setVision(d.vision?.texte || ""); setValeurs(d.vision?.valeurs || []); })
      .catch(() => toast.error("Impossible de charger ta vision."));
  }, []);

  const ajouter = (e) => {
    e.preventDefault();
    const v = nouvelle.trim();
    if (!v || valeurs.includes(v) || valeurs.length >= 7) return;
    setValeurs((l) => [...l, v]); setNouvelle("");
  };
  const enregistrer = async () => {
    setSauvegarde(true);
    try { await saveProfile({ texte_vision: vision, valeurs }); toast.success("Vision enregistrée."); signalerMaj(); }
    catch { toast.error("Échec de l'enregistrement."); }
    finally { setSauvegarde(false); }
  };

  if (vision === null) return <Carte><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;
  return (
    <>
      <Carte titre="Ma phrase de vision" desc="Elle s'affiche sur ton Vision Board et guide les priorités proposées par l'IA.">
        <textarea rows={3} value={vision} onChange={(e) => setVision(e.target.value)} placeholder="Dans 3 ans, je…" className={`${INPUT} h-auto resize-y py-3 leading-relaxed`} data-testid="parametres-vision-texte" />
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
          <input value={nouvelle} onChange={(e) => setNouvelle(e.target.value)} placeholder="Ex. Liberté" className={`${INPUT} flex-1`} data-testid="parametres-valeur-input" />
          <button type="submit" className={BTN_OR}><Plus size={14} /> Ajouter</button>
        </form>
      </Carte>
      <div className="flex flex-wrap gap-2">
        <button onClick={enregistrer} disabled={sauvegarde} className={BTN_OR} data-testid="parametres-save-vision">
          {sauvegarde ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
        </button>
        <button onClick={() => navigate("/app/vision")} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5">
          <Compass size={14} /> Ouvrir mon Vision Board
        </button>
      </div>
    </>
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

function Interrupteur({ on, onClick, testid }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on} data-testid={testid}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-gold" : "bg-white/15"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
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
  if (!profil) return <Carte><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;
  return (
    <Carte titre="Rappels et alertes" desc={profil.email ? `Envoyés à ${profil.email}.` : "Ajoute ton e-mail dans Profil pour recevoir les e-mails."}>
      <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div><p className="text-sm font-medium text-offwhite">Toutes les notifications</p><p className="text-xs text-offwhite/50">Interrupteur général : coupe tous les envois.</p></div>
        <Interrupteur on={!!profil.notifications} onClick={toggler} testid="parametres-notif-toggle" />
      </div>
      <div className={`flex items-center justify-between gap-4 pt-4 ${profil.notifications ? "" : "pointer-events-none opacity-40"}`}>
        <div><p className="text-sm font-medium text-offwhite">E-mail du lundi, 7 h</p><p className="text-xs text-offwhite/50">Ton pourquoi, ton score Vision, ton CA et tes 3 actions de la semaine.</p></div>
        <Interrupteur on={lundi} onClick={togglerLundi} testid="parametres-notif-lundi" />
      </div>
      <p className="mt-4 text-xs text-offwhite/45">L'heure de ton point du jour se règle dans Profil. Les décisions à valider arrivent aussi dans la cloche, en haut de l'écran.</p>
    </Carte>
  );
}

function SectionCloudSave() {
  const [state, setState] = useState(null);
  const [connections, setConnections] = useState([]);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState("google");

  useEffect(() => {
    Promise.all([fetchState(), fetchConnections()]).then(([s, c]) => {
      const ctx = s.vision?.contexte_metier || {};
      setState(ctx);
      setEnabled(ctx.auto_save_documents === true);
      setProvider(ctx.document_provider || "google");
      setConnections(c || []);
    }).catch(() => toast.error("Impossible de charger le réglage cloud."));
  }, []);

  const connected = (provider === "google" ? "google_drive" : "microsoft_drive");
  const isConnected = connections.some((c) => c.provider === connected && c.status === "ready");

  const save = async () => {
    setSaving(true);
    try {
      await saveProfile({ contexte_metier: { ...(state || {}), auto_save_documents: enabled, document_provider: provider } });
      toast.success(enabled ? "Enregistrement cloud activé." : "Enregistrement cloud désactivé.");
    } catch { toast.error("Impossible d’enregistrer ce réglage."); }
    finally { setSaving(false); }
  };

  if (!state) return <Carte><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;
  return (
    <>
      <Carte titre="Enregistrer automatiquement mes documents" desc="Quand l’IA crée un document, Zayado l’envoie dans ton espace cloud choisi. Aucun envoi n’est effectué si ce réglage est désactivé.">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-offwhite/50"}`}><Cloud size={18} /></span>
            <div><p className="text-sm font-semibold text-offwhite">Sauvegarde automatique</p><p className="text-xs text-offwhite/50">{enabled ? "Activée pour les nouveaux documents" : "Désactivée"}</p></div>
          </div>
          <button onClick={() => setEnabled((v) => !v)} role="switch" aria-checked={enabled} data-testid="cloud-auto-save-toggle" className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? "bg-gold" : "bg-white/15"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
        <label className="mt-5 block text-xs font-medium text-offwhite/60">Destination</label>
        <select value={provider} onChange={(e) => setProvider(e.target.value)} className={`${INPUT} mt-1`} data-testid="cloud-auto-save-provider">
          <option value="google">Google Drive</option>
          <option value="microsoft">OneDrive / SharePoint</option>
        </select>
        <p className={`mt-2 text-xs ${isConnected ? "text-emerald-300" : "text-amber-300"}`}>
          {isConnected ? "Connexion cloud active : les prochains documents seront transmis automatiquement." : "Connecte d’abord cette destination dans Intégrations."}
        </p>
        <button onClick={save} disabled={saving || (enabled && !isConnected)} className={`${BTN_OR} mt-4`} data-testid="cloud-auto-save-save">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer ce réglage
        </button>
      </Carte>
      <Carte titre="Confidentialité" desc="Chaque fichier est transmis uniquement après ton consentement OAuth. Zayado ne demande pas l’accès global à ton disque : Drive utilise l’accès aux fichiers créés par l’application et Microsoft utilise Files.ReadWrite.">
        <p className="text-xs leading-relaxed text-offwhite/60">Tu peux couper la sauvegarde automatique à tout moment. Les documents déjà transmis restent dans ton espace cloud et ne sont pas supprimés par Zayado.</p>
      </Carte>
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
      <Carte titre="Inviter quelqu'un" desc="50 crédits offerts dès que la personne invitée crée son compte.">
        <form onSubmit={inviter} className="flex gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.fr" className={`${INPUT} flex-1`} data-testid="parametres-parrainage-email" />
          <button type="submit" disabled={envoi} className={BTN_OR} data-testid="parametres-parrainage-inviter">Inviter</button>
        </form>
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
          <button onClick={supprimer} disabled={confirmation !== "SUPPRIMER" || suppression} className="inline-flex items-center gap-2 rounded-xl bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-40" data-testid="parametres-suppr">
            {suppression ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Supprimer
          </button>
        </div>
        <p className="mt-3 text-xs text-offwhite/45">Pour fermer définitivement ton compte, écris à <a className="text-gold underline" href="mailto:contact@zayado.net?subject=Fermeture%20de%20compte">contact@zayado.net</a> : c'est traité sous 30 jours.</p>
      </Carte>
    </>
  );
}

function SectionFacturation() {
  const [abo, setAbo] = useState(null);
  const [commandes, setCommandes] = useState(null);
  const [fondateur, setFondateur] = useState(null);
  const [code, setCode] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    fetchAbonnement().then(setAbo).catch(() => fetchState().then((d) => setAbo({ plan: d.profile?.plan || "essentielle" })).catch(() => setAbo({ plan: "essentielle" })));
    fetchCommandes().then((d) => setCommandes((d.items || []).filter((c) => c.kind === "saas" || c.kind === "service" || c.kind === "produit"))).catch(() => setCommandes([]));
    fetchTarifsFondateur().then(setFondateur).catch(() => {});
  }, []);

  const appliquer = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setEnvoi(true);
    try {
      const r = await appliquerCodePromo(code.trim());
      toast.success(`+${r.credits_ajoutes} crédits ajoutés — total : ${r.credits_total}`);
      setCode("");
    } catch { toast.error("Code invalide, inactif ou déjà utilisé."); }
    finally { setEnvoi(false); }
  };
  const [paiement, setPaiement] = useState(false);
  const finaliser = async () => {
    if (!abo?.plan_en_attente) return;
    setPaiement(true);
    const ok = await lancerPaiement(abo.plan_en_attente, { essai: !!abo.essai?.disponible && abo.plan_en_attente === abo.essai?.plan });
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
                {abo.fondateur ? "Tarif fondateur garanti · " : ""}
                {abo.en_essai ? `Essai 2 mois · jusqu'au ${new Date(abo.fin).toLocaleDateString("fr-FR")}` : abo.acces === "actif" && abo.fin ? `Accès jusqu'au ${new Date(abo.fin).toLocaleDateString("fr-FR")}` : abo.acces === "actif" ? "Offre active" : "Ton espace est en pause : tes données sont conservées"}
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
        {fondateur?.ouverte && !abo?.fondateur && (
          <p className="mt-3 rounded-xl bg-gold/10 px-3 py-2 text-xs text-gold">Tarif fondateur ouvert{fondateur.places_restantes != null ? ` · ${fondateur.places_restantes} places restantes` : ""} : ton prix reste garanti tant que tu restes abonné·e.</p>
        )}
      </Carte>
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

