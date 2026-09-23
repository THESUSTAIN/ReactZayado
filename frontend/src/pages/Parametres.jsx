import React, { useState, useEffect } from "react";
import {
  User, Palette, Bell, Plug, ShieldCheck, CreditCard, Gift, Loader2, Save, Download, Cloud,
  Search, X, Sun, Moon,
} from "lucide-react";
import { toast } from "sonner";
import { fetchState, saveProfile, fetchConnections, fetchMesFilleuls, inviterParrainage, appliquerCodePromo, fetchMoi } from "@/lib/kairosApi";
import { useI18n } from "@/i18n";
import { Link, useNavigate } from "react-router-dom";
import IntegrationsSection from "@/components/kairos/IntegrationsSection";

// Paramètres en grande fenêtre modale — structure inspirée de
// ReactZayado/SettingsModal.jsx (v13) : recherche + sections latérales.
// Chaque section n'affiche que ce qui est réellement câblé côté serveur.
const SECTIONS = [
  { id: "profil", label: "Profil", Icon: User, mots: "prénom email identité heure point du jour" },
  { id: "general", label: "Général", Icon: Palette, mots: "langue français english thème clair sombre apparence" },
  { id: "notifications", label: "Notifications", Icon: Bell, mots: "alerte rappel email" },
  { id: "integrations", label: "Intégrations", Icon: Plug, mots: "whatsapp telegram qonto connexion" },
  { id: "cloud-save", label: "Enregistrement cloud", Icon: Cloud, mots: "drive google onedrive sharepoint document automatique nuage" },
  { id: "parrainage", label: "Parrainage", Icon: Gift, mots: "inviter filleul crédit bonus" },
  { id: "securite", label: "Sécurité & données", Icon: ShieldCheck, mots: "export rgpd données suppression" },
  { id: "facturation", label: "Forfait & promo", Icon: CreditCard, mots: "plan abonnement prix code réduction" },
];

export default function Parametres() {
  const [active, setActive] = useState("profil");
  const [recherche, setRecherche] = useState("");
  const navigate = useNavigate();

  const visibles = SECTIONS.filter((s) => {
    if (!recherche.trim()) return true;
    const q = recherche.trim().toLowerCase();
    return s.label.toLowerCase().includes(q) || s.mots.includes(q);
  });

  // Si la recherche masque la section active, basculer sur la 1re visible.
  useEffect(() => {
    if (visibles.length > 0 && !visibles.some((s) => s.id === active)) setActive(visibles[0].id);
  }, [recherche]);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-3 backdrop-blur-md sm:p-6" data-testid="parametres-overlay">
      <div className="glass-strong flex h-full max-h-[860px] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-white/10 text-offwhite" data-testid="parametres-modal">
        {/* Barre haute : titre + recherche + fermer */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold">Paramètres</h1>
            <p className="text-[11px] text-offwhite/50">Un seul endroit pour tout régler.</p>
          </div>
          <div className="relative ml-auto w-40 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-offwhite/40" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un réglage…"
              data-testid="parametres-recherche"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-xs text-offwhite placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none"
            />
          </div>
          <button
            onClick={() => navigate(-1)}
            aria-label="Fermer les paramètres"
            data-testid="parametres-fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-offwhite/70 transition-colors hover:bg-white/10 hover:text-offwhite"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Nav latérale */}
          <nav className="w-16 shrink-0 space-y-1 overflow-y-auto border-r border-white/10 p-3 sm:w-52" data-testid="parametres-nav">
            {visibles.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                data-testid={`parametres-nav-${s.id}`}
                title={s.label}
                className={`flex w-full items-center justify-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors sm:justify-start ${
                  active === s.id ? "bg-gold/15 font-semibold text-gold" : "text-offwhite/60 hover:bg-white/5 hover:text-offwhite"
                }`}
              >
                <s.Icon size={16} className="shrink-0" /> <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
            {visibles.length === 0 && (
              <p className="px-2 py-4 text-center text-[11px] text-offwhite/45" data-testid="parametres-recherche-vide">Aucun réglage ne correspond à « {recherche} ».</p>
            )}
          </nav>

          {/* Contenu */}
          <div className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="mx-auto max-w-xl">
              {active === "profil" && <SectionProfil />}
              {active === "general" && <SectionGeneral />}
              {active === "notifications" && <SectionNotifications />}
              {active === "integrations" && <IntegrationsSection />}
              {active === "cloud-save" && <SectionCloudSave />}
              {active === "parrainage" && <SectionParrainage />}
              {active === "securite" && <SectionSecurite />}
              {active === "facturation" && <SectionFacturation />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Carte({ children, titre, desc }) {
  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      {titre && <p className="mb-1 text-sm font-semibold text-offwhite">{titre}</p>}
      {desc && <p className="mb-3 text-xs leading-relaxed text-offwhite/55">{desc}</p>}
      {children}
    </div>
  );
}

const INPUT = "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-offwhite outline-none focus:border-gold/50";
const BTN_OR = "inline-flex items-center gap-2 rounded-xl bg-gold/15 px-4 py-2 text-sm font-semibold text-gold hover:bg-gold/25 disabled:opacity-60";

function SectionProfil() {
  const [profil, setProfil] = useState(null);
  const [sauvegarde, setSauvegarde] = useState(false);

  useEffect(() => {
    fetchState().then(async (d) => {
      const p = d.profile;
      // Préremplit l'email avec celui du compte si le profil ne l'a pas encore.
      if (!p?.email) {
        try {
          const moi = await fetchMoi();
          if (moi?.email) p.email = moi.email;
        } catch { /* compte démo sans email */ }
      }
      setProfil(p);
    });
  }, []);

  const champ = (cle, valeur) => setProfil((p) => ({ ...p, [cle]: valeur }));
  const enregistrer = async () => {
    setSauvegarde(true);
    try { await saveProfile(profil); toast.success("Profil enregistré."); }
    catch { toast.error("Échec de l'enregistrement."); }
    finally { setSauvegarde(false); }
  };

  if (!profil) return <Carte><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;
  return (
    <Carte titre="Ton identité" desc="Ces informations personnalisent ton cockpit et ton Copilote.">
      <label className="mb-1.5 block text-xs text-offwhite/50">Prénom</label>
      <input value={profil.prenom} onChange={(e) => champ("prenom", e.target.value)} className={`${INPUT} mb-4`} data-testid="parametres-prenom" />

      <label className="mb-1.5 block text-xs text-offwhite/50">Email</label>
      <input value={profil.email} onChange={(e) => champ("email", e.target.value)} className={`${INPUT} mb-4`} data-testid="parametres-email" />

      <label className="mb-1.5 block text-xs text-offwhite/50">Heure du point du jour</label>
      <input type="time" value={profil.heure_checkin} onChange={(e) => champ("heure_checkin", e.target.value)} className={`${INPUT} mb-4`} data-testid="parametres-heure" />

      <button onClick={enregistrer} disabled={sauvegarde} className={BTN_OR} data-testid="parametres-save-profil">
        {sauvegarde ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
      </button>
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

function SectionNotifications() {
  const [profil, setProfil] = useState(null);
  useEffect(() => { fetchState().then((d) => setProfil(d.profile)); }, []);
  const toggler = async () => {
    const nouveau = !profil.notifications;
    setProfil((p) => ({ ...p, notifications: nouveau }));
    try { await saveProfile({ notifications: nouveau }); toast.success(nouveau ? "Notifications activées." : "Notifications coupées."); }
    catch { toast.error("Échec."); setProfil((p) => ({ ...p, notifications: !nouveau })); }
  };
  if (!profil) return <Carte><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;
  return (
    <Carte titre="Rappels et alertes" desc="Point du jour, actualité, alertes importantes.">
      <div className="flex items-center justify-between">
        <p className="text-sm text-offwhite/80">{profil.notifications ? "Activées" : "Coupées"}</p>
        <button onClick={toggler} data-testid="parametres-notif-toggle" className={`relative h-6 w-11 rounded-full transition-colors ${profil.notifications ? "bg-gold" : "bg-white/15"}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${profil.notifications ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
    </Carte>
  );
}

function SectionIntegrations() {
  const [connexions, setConnexions] = useState(null);
  useEffect(() => { fetchConnections().then(setConnexions).catch(() => setConnexions([])); }, []);
  const DISPONIBLES = ["google_drive", "microsoft_drive", "whatsapp", "telegram", "qonto"];
  if (connexions === null) return <Carte><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;
  return (
    <Carte titre="Tes connexions" desc="Google Drive et OneDrive/SharePoint peuvent recevoir automatiquement tes documents IA. Connecte-les dans la carte Intégrations.">
      <p className="text-sm text-offwhite/70">Connexions actives : {connexions.length}</p>
      {connexions.map((c) => (
        <div key={c.provider} className="mt-2 flex items-center justify-between text-sm">
          <span>{c.provider}</span>
          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold">Connecté</span>
        </div>
      ))}
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
  useEffect(charger, []);

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
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
  return (
    <Carte titre="Tes données" desc="Tes données t'appartiennent — toujours exportables.">
      <a href={`${BACKEND_URL}/api/export`} download className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5" data-testid="parametres-export">
        <Download size={14} /> Exporter mes données (CSV)
      </a>
      <p className="mt-3 text-xs text-offwhite/45">Suppression de compte — pas encore de route serveur ici. Existe en référence chez ReactZayado ; à porter si tu confirmes le besoin.</p>
    </Carte>
  );
}

function SectionFacturation() {
  const [profil, setProfil] = useState(null);
  const [code, setCode] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => { fetchState().then((d) => setProfil(d.profile)); }, []);

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

  return (
    <>
      <Carte titre="Ton forfait">
        <p className="text-sm">Forfait actuel : <span className="font-semibold text-gold">{profil?.plan || "Essentielle (gratuit)"}</span></p>
        <Link to="/pricing" className="mt-3 inline-block rounded-xl bg-gold px-4 py-2 text-xs font-semibold text-navy-900">
          Voir les forfaits & changer
        </Link>
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
