import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chargerAbonnement } from "@/lib/acces";
import { BatteryMedium, Search, Moon, Sun, Mail, Bell, MessageCircle, Radio, CheckSquare, HelpCircle, Settings, LogOut, User, ShieldCheck, ChevronDown, CornerDownLeft, Compass, Flame, MailOpen, CalendarCheck, CheckCheck } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuGroup,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useKairos } from "@/context/KairosContext";

// Cache des indicateurs de la cloche (partagé entre les montages du Header,
// qui change à chaque page) — évite que le compteur « saute ».
let _notifCache = null;
// Boîte de notifications du serveur (réponses de l'IA, actu du jour, relances) : même principe de cache,
// + mémoire des identifiants déjà vus pour ne sonner qu'une fois par nouvelle notification.
let _inboxCache = null;
let _inboxIds = null;
const ilYa = (iso) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (!Number.isFinite(min)) return "";
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (min < 1440) return `il y a ${Math.round(min / 60)} h`;
  const j = Math.round(min / 1440);
  return j === 1 ? "hier" : `il y a ${j} j`;
};
import { EnergyCheckin } from "./EnergyCheckin";
import { getToken } from "@/lib/kairosApi";
// ChoixEspace retiré de l en-tête (doublon avec la bascule du rail) — composant conservé si besoin ailleurs.
import { apercuPlan, setApercuPlan, NOMS_OFFRES } from "@/lib/droits";
import { enPro } from "@/lib/espace";
import { useI18n } from "@/i18n";
import { fetchActualite, fetchDecisions, setToken, fetchRituels, fetchLettres, fetchMoi, fetchNotifications, marquerNotifLue, toutMarquerLu } from "@/lib/kairosApi";
import { prechargerActu } from "@/lib/actuCache";
import { signaler, signalRecent, ouvrirAdresse } from "@/lib/alertes";
import NotifsAppareil from "./NotifsAppareil";
import { openChat } from "./GlobalChat";
import { startTour } from "./GuidedTour";

const THEME_KEY = "kairos_theme";

// Bouton d'ouverture du chat avec une pastille de notification tant que
// l'utilisateur ne l'a pas ouvert dans la journée (nudge honnête, pas de mock).
function BoutonChat() {
  const aujourdhui = new Date().toDateString();
  const [vu, setVu] = useState(() => { try { return localStorage.getItem("zayado_chat_vu") === aujourdhui; } catch { return false; } });
  const ouvrir = () => {
    try { localStorage.setItem("zayado_chat_vu", aujourdhui); } catch { /* */ }
    setVu(true);
    // Dans « Ton entreprise », le chat est celui de l'entreprise (son chatbot + ses données), pas le Copilote personnel
    if (window.location.pathname.startsWith("/app/entreprise")) { window.dispatchEvent(new CustomEvent("zayado:assistant-entreprise")); return; }
    openChat();
  };
  return (
    <button onClick={ouvrir}
      className="relative rounded-xl border border-gold/30 bg-gold/10 p-2 text-gold transition-colors hover:bg-gold/20"
      title="Collaborateur IA (chat)" aria-label="Ouvrir le Collaborateur IA" data-testid="header-chat">
      <MessageCircle className="h-[18px] w-[18px]" />
      {!vu && (
        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5" data-testid="header-chat-badge">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-navy-900" />
        </span>
      )}
    </button>
  );
}


// Pages proposées par la recherche rapide (Ctrl/⌘ + K).
const PAGES = [
  { label: "Aujourd'hui · Cockpit", path: "/app", mots: "accueil cockpit dashboard tableau" },
  { label: "Vision Board", path: "/app/vision", mots: "vision murs board" },
  { label: "Radar", path: "/app/radar", mots: "marché veille signaux prospects" },
  { label: "Revue hebdo", path: "/app/revue", mots: "semaine bilan review" },
  { label: "Plan d'action · Idées", path: "/app/actions?tab=idees", mots: "idee idées capture boîte" },
  { label: "Plan d'action · Objectifs", path: "/app/actions?tab=objectifs", mots: "objectifs 90 jours cap trimestre feuille de route roadmap jalons" },
  { label: "Plan d'action · Actions", path: "/app/actions", mots: "taches missions todo priorités actions" },
  { label: "Plan d'action · Processus", path: "/app/actions?tab=processus", mots: "processus workflow étapes routine" },
  { label: "Trier un document", path: "/app/sources", mots: "sources documents liens notes" },
  { label: "Bien-être & Mindset", path: "/app/bien-etre", mots: "energie respiration mindset parcours carnet vendre refus" },
  { label: "Collaborateurs", path: "/app/collaborateurs", mots: "expert humain aide équipe zayado" },
  { label: "Agents IA", path: "/app/agents", mots: "ia automatisation" },
  { label: "Agent Business (chatbot)", path: "/app/chatbot-b2b", mots: "clients chatbot" },
  { label: "Mon compte", path: "/compte", mots: "commandes achats compte espace factures fidélité" },
  { label: "Paramètres", path: "/parametres", mots: "réglages compte profil connexion" },
  { label: "Collaborateur IA (chat)", action: "chat", mots: "copilote assistant chat ia" },
  { label: "Visite guidée", action: "tour", mots: "aide tutoriel découvrir" },
];
const norm = (x) => (x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();


export function Header() {
  const { user, modeInfo, aCheckin, loaded, contexte } = useKairos();
  // Jour de repos (sabbat) : ce jour-là, les rappels doux se taisent —
  // l'app respecte le repos au lieu de réclamer de l'attention.
  const enRepos = typeof contexte?.jour_repos === "number" && contexte.jour_repos === new Date().getDay();
  // Rappel doré tant que le check-in du jour n'est pas fait : c'est la donnée qui alimente tout le cockpit.
  const [checkinOuvert, setCheckinOuvert] = useState(false);
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  // Raccourci vers la console admin, en haut à côté des notifications (admins seulement).
  const [estAdmin, setEstAdmin] = useState(false);
  useEffect(() => { fetchMoi().then((m) => setEstAdmin(m?.role === "admin")).catch(() => {}); }, []);
  const rappelCheckin = loaded && !aCheckin && !!getToken() && (location.pathname.startsWith("/app") || location.pathname === "/parametres")
    // Sur « Aujourd'hui », la carte Énergie porte déjà le bouton : une seule entrée.
    && location.pathname !== "/app";
  const [q, setQ] = useState("");
  // En-tête transparent en haut de page. Il se MASQUE quand on défile vers le
  // bas (le contenu respire) et réapparaît dès qu'on remonte, avec un léger
  // voile navy flouté pour rester lisible au-dessus du contenu.
  const [cache, setCache] = useState(false);
  const [defile, setDefile] = useState(false);
  const [planHeader, setPlanHeader] = useState(null);
  useEffect(() => { chargerAbonnement().then((a) => setPlanHeader(a.plan)).catch(() => {}); }, []);
  useEffect(() => {
    let dernierY = window.scrollY;
    const f = () => {
      const y = window.scrollY;
      setCache(y > 90 && y > dernierY + 4);
      if (y < dernierY - 4) setCache(false);
      setDefile(y > 8);
      dernierY = y;
    };
    f(); window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [sel, setSel] = useState(0);
  const [rechercheMobile, setRechercheMobile] = useState(false);
  const champRef = useRef(null);
  const champMobileRef = useRef(null);
  const resultats = useMemo(() => {
    const n = norm(q.trim());
    return (n ? PAGES.filter((p) => norm(p.label + " " + p.mots).includes(n)) : PAGES).slice(0, 8);
  }, [q]);
  useEffect(() => { setSel(0); }, [q]);
  const lancer = (p) => {
    if (!p) return;
    setQ(""); setRechercheOuverte(false); setRechercheMobile(false);
    champRef.current?.blur();
    if (p.action === "chat") openChat();
    else if (p.action === "tour") startTour();
    else navigate(p.path);
  };
  const onToucheRecherche = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((v) => Math.min(v + 1, resultats.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((v) => Math.max(v - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); lancer(resultats[sel]); }
    else if (e.key === "Escape") { setRechercheOuverte(false); setRechercheMobile(false); e.currentTarget.blur(); }
  };
  // Ctrl/⌘ + K : la recherche promise dans le champ fonctionne vraiment.
  useEffect(() => {
    const k = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (window.innerWidth >= 768) { champRef.current?.focus(); setRechercheOuverte(true); }
        else { setRechercheMobile(true); setTimeout(() => champMobileRef.current?.focus(), 30); }
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  const listeResultats = (
    <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl fenetre py-1" data-testid="header-search-results">
      {resultats.length === 0 && <p className="px-3 py-3 text-xs text-offwhite/60">Aucune page ne correspond.</p>}
      {resultats.map((p, idx) => (
        <button key={p.label} onMouseDown={(e) => { e.preventDefault(); lancer(p); }} onMouseEnter={() => setSel(idx)}
          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${idx === sel ? "bg-white/10 text-offwhite" : "text-offwhite/75"}`}>
          <span>{p.label}</span>
          {idx === sel && <CornerDownLeft className="h-3.5 w-3.5 text-offwhite/40" />}
        </button>
      ))}
    </div>
  );
  // La marketplace publique est gérée par Shopify, pas dans le cockpit privé.

  // Thème clair/sombre — persisté en local, classe posée sur <body>.
  const [clair, setClair] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) === "clair"; } catch { return false; }
  });
  useEffect(() => {
    document.body.classList.toggle("theme-clair", clair);
    try { localStorage.setItem(THEME_KEY, clair ? "clair" : "sombre"); } catch { /* stockage indisponible */ }
  }, [clair]);

  // Notifications réelles : actualité du jour non lue, décisions en attente,
  // check-in manquant, rappel Vision Board, revue hebdo, série de rituels en
  // danger, lettre au futur moi arrivée à sa date.
  // Cache module : le Header se remonte à chaque page — sans lui, le compteur
  // repartait de zéro et « sautait ». Le badge ne s'affiche qu'une fois les
  // sources chargées (ou depuis le cache).
  const [actuNonVue, setActuNonVue] = useState(() => _notifCache?.actuNonVue ?? false);
  const [decisionsEnAttente, setDecisionsEnAttente] = useState(() => _notifCache?.decisionsEnAttente ?? 0);
  const [lettrePrete, setLettrePrete] = useState(() => _notifCache?.lettrePrete ?? null);
  const [serieEnDanger, setSerieEnDanger] = useState(() => _notifCache?.serieEnDanger ?? false);
  const [visionDue, setVisionDue] = useState(() => _notifCache?.visionDue ?? false);
  const [revueDue, setRevueDue] = useState(() => _notifCache?.revueDue ?? false);
  const [notifChargees, setNotifChargees] = useState(() => !!_notifCache);
  useEffect(() => {
    let on = true;
    const aujourdHui = new Date().toISOString().slice(0, 10);
    Promise.allSettled([fetchActualite("", { bref: false }), fetchDecisions(), fetchLettres(), fetchRituels()]).then(([actu, dec, lettres, rituels]) => {
      if (!on) return;
      const d1 = actu.status === "fulfilled" ? actu.value : null;
      const aDuContenu = !!(d1 && !d1.masque && !d1.erreur && (d1.articles?.length || 0) > 0);
      const visionVue = localStorage.getItem("vision_vue_le");
      const jour = new Date().getDay();
      const d = new Date();
      const t = new Date(d.getFullYear(), 0, 1);
      const semaine = `${d.getFullYear()}-S${Math.ceil((((d - t) / 86400000) + 1) / 7)}`;
      const rythmeActu = d1?.rythme || "quotidien";
      const actuJourOk = rythmeActu === "jamais" ? false : rythmeActu === "lundi" ? jour === 1 : true;
      const nouvelles = {
        actuNonVue: actuJourOk && aDuContenu && localStorage.getItem("actualite_vue_le") !== aujourdHui,
        decisionsEnAttente: dec.status === "fulfilled" ? (dec.value?.decisions || []).filter((x) => x.statut === "proposee").length : 0,
        lettrePrete: lettres.status === "fulfilled" ? (lettres.value?.items || []).find((l) => l.prete && !l.lue) || null : null,
        serieEnDanger: rituels.status === "fulfilled" ? (rituels.value?.serie?.jours || 0) > 1 && (rituels.value?.faits || []).length === 0 : false,
        visionDue: !visionVue || (Date.now() - new Date(visionVue).getTime()) > 3 * 24 * 3600 * 1000,
        revueDue: jour >= 5 && localStorage.getItem("revue_faite_semaine") !== semaine,
      };
      _notifCache = nouvelles;
      setActuNonVue(nouvelles.actuNonVue);
      setDecisionsEnAttente(nouvelles.decisionsEnAttente);
      setLettrePrete(nouvelles.lettrePrete);
      setSerieEnDanger(nouvelles.serieEnDanger);
      setVisionDue(nouvelles.visionDue);
      setRevueDue(nouvelles.revueDue);
      setNotifChargees(true);
    });
    return () => { on = false; };
  }, []);
  // Notifications du serveur. Sondage toutes les 45 s tant que l'onglet est visible, et au retour sur l'onglet :
  // une nouvelle notification fait un petit son + un bandeau (c'est ce qui manquait quand l'app est ouverte sur PC).
  const [inbox, setInbox] = useState(() => _inboxCache ?? { items: [], non_lues: 0 });
  const rafraichirInbox = useCallback(async () => {
    if (!getToken()) return;
    try {
      const d = await fetchNotifications();
      const items = d?.items || [];
      const premiere = _inboxIds === null;
      const nouvelles = items.filter((i) => !i.lu && !(_inboxIds && _inboxIds.has(i.id)));
      _inboxIds = new Set([...(_inboxIds || []), ...items.map((i) => i.id)]);
      if (!premiere && nouvelles.length && !signalRecent()) {
        const n = nouvelles[0];
        signaler({ titre: n.titre, corps: n.corps, url: n.url, tag: n.kind });
      }
      _inboxCache = { items, non_lues: d?.non_lues || 0 };
      setInbox(_inboxCache);
    } catch { /* réseau coupé : on réessaiera */ }
  }, []);
  useEffect(() => {
    if (!getToken()) return undefined;
    rafraichirInbox();
    const id = setInterval(() => { if (document.visibilityState === "visible") rafraichirInbox(); }, 45000);
    const retour = () => { if (document.visibilityState === "visible") rafraichirInbox(); };
    document.addEventListener("visibilitychange", retour);
    window.addEventListener("focus", retour);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", retour); window.removeEventListener("focus", retour); };
  }, [rafraichirInbox]);
  // Le bref du jour est préparé dès l'ouverture de l'app : le chat l'affiche tout de suite, sans attente.
  useEffect(() => { if (loaded && getToken()) prechargerActu(contexte); }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps
  const inboxNonLues = inbox.items.filter((n) => !n.lu);
  const actuDansInbox = inboxNonLues.some((n) => n.kind === "actu");
  // La lettre du futur arrive aussi dans la boîte (serveur + push) : on n'affiche pas la même ligne deux fois.
  const lettreDansInbox = inboxNonLues.some((n) => /lettre/i.test(n.titre || "") && String(n.url || "").includes("tab=carnet"));
  const ouvrirNotif = (n) => {
    if (!n.lu) {
      marquerNotifLue(n.id).catch(() => {});
      const maj = { items: inbox.items.map((x) => (x.id === n.id ? { ...x, lu: true } : x)), non_lues: Math.max(0, inbox.non_lues - 1) };
      _inboxCache = maj; setInbox(maj);
    }
    if (n.kind === "actu") { localStorage.setItem("actualite_vue_le", new Date().toISOString().slice(0, 10)); setActuNonVue(false); }
    ouvrirAdresse(n.url);
  };
  const toutLu = () => {
    toutMarquerLu().catch(() => {});
    const maj = { items: inbox.items.map((x) => ({ ...x, lu: true })), non_lues: 0 };
    _inboxCache = maj; setInbox(maj);
  };
  const notifCount = inboxNonLues.length + (actuNonVue && actuDansInbox ? -1 : 0) + (enRepos
    ? (actuNonVue ? 1 : 0) + decisionsEnAttente + (lettrePrete && !lettreDansInbox ? 1 : 0)
    : (actuNonVue ? 1 : 0) + decisionsEnAttente + (rappelCheckin ? 1 : 0)
      + (lettrePrete && !lettreDansInbox ? 1 : 0) + (serieEnDanger ? 1 : 0) + (visionDue ? 1 : 0) + (revueDue ? 1 : 0));

  const mobileItems = [
    ["today", "Aujourd'hui", "/app"], ["vision", "Vision", "/app/vision"],
    ["radar", "Radar", "/app/radar"],
    ["actions", "Plan d'action", "/app/actions"], ["wellbeing", "Bien-être", "/app/bien-etre"],
  ];

  return (
    <div className={`sticky top-0 z-30 transition-all duration-300 ${cache ? "pointer-events-none -translate-y-full opacity-0" : "translate-y-0 opacity-100"} ${defile && !cache ? "zy-header-defile bg-[#0b1a3d]/90 backdrop-blur-xl shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]" : "bg-transparent"}`}>
    <header
      className="flex items-center gap-2 bg-transparent px-4 py-3 sm:gap-3 sm:px-6"
      data-testid="app-header"
    >
      <button onClick={() => navigate("/app")} className="shrink-0 lg:hidden" aria-label="Accueil">
        <img src="/logo.png" alt="Zayado" className="h-9 w-9 object-contain" />
      </button>
      <div className="relative hidden flex-1 max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite/40" />
        <input
          ref={champRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setRechercheOuverte(true); }}
          onFocus={() => setRechercheOuverte(true)}
          onBlur={() => setTimeout(() => setRechercheOuverte(false), 120)}
          onKeyDown={onToucheRecherche}
          placeholder={t("header.search")}
          data-testid="header-search"
          aria-label="Rechercher une page"
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
        />
        {rechercheOuverte && listeResultats}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
        <button onClick={() => { setRechercheMobile((v) => !v); setTimeout(() => champMobileRef.current?.focus(), 30); }}
          className="rounded-xl border border-white/10 bg-white/5 p-2 text-offwhite/70 transition-colors hover:bg-white/10 md:hidden" aria-label="Rechercher" data-testid="header-search-mobile">
          <Search className="h-[18px] w-[18px]" />
        </button>
        
        {/* Le sélecteur Perso/Entreprise de l'en-tête a été retiré : il faisait
            doublon avec la bascule du rail (« Ton entreprise » ⇄ « Mon espace
            perso »), et son option « entreprise » menait à /app/actions en mode
            pro — pas à l'espace équipe — d'où l'impression qu'on ne pouvait pas
            « passer à l'entreprise ». Une seule porte, celle du rail, qui mène
            vraiment à /app/entreprise. */}

        {rappelCheckin && !enPro() && !location.pathname.startsWith("/app/entreprise") && (  /* check-in énergie = perso, pas dans l'espace entreprise */
          <button onClick={() => setCheckinOuvert(true)} data-testid="header-rappel-checkin"
            className="relative inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gold/50 bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-2.5 py-2 text-[12px] font-semibold text-navy-900 shadow-[0_6px_18px_-6px_rgba(222,194,163,0.7)] transition hover:brightness-105"
            title="Ton check-in du jour n'est pas encore fait">
            <BatteryMedium className="h-4 w-4" /><span className="hidden md:inline">Check-in du jour</span>
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-gold ring-2 ring-navy-900" />
          </button>
        )}

        <BoutonChat />

        <button
          onClick={() => setClair((v) => !v)}
          className="hidden rounded-xl border border-white/10 bg-white/5 p-2 text-offwhite/70 transition-colors hover:bg-white/10 sm:block"
          title={clair ? "Passer en thème sombre" : "Passer en thème clair"}
          aria-label={clair ? "Passer en thème sombre" : "Passer en thème clair"} data-testid="header-darkmode"
        >
          {clair ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </button>

        {/* (Messages clients : retiré, c'était un panneau vide. Les échanges de l'Agent Business arrivent dans la cloche.) */}



        {estAdmin && apercuPlan() && (
          <button onClick={() => { setApercuPlan(null); window.location.reload(); }} data-testid="apercu-banniere"
            className="rounded-xl border border-amber-300/50 bg-amber-300/15 px-2.5 py-2 text-[11.5px] font-semibold text-amber-200" title="Revenir à mon accès admin">
            Aperçu {NOMS_OFFRES[apercuPlan()]} ✕
          </button>
        )}
        {estAdmin && (
          <button onClick={() => navigate("/admin")} title="Console admin" aria-label="Console admin" data-testid="header-admin"
            className="rounded-xl border border-gold/30 bg-gold/10 p-2 text-gold transition-colors hover:bg-gold/20">
            <ShieldCheck className="h-[18px] w-[18px]" />
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative rounded-xl border border-white/10 bg-white/5 p-2 text-offwhite/70 transition-colors hover:bg-white/10" title={t("header.notifications")} aria-label={t("header.notifications")} data-testid="header-bell">
            <Bell className="h-[18px] w-[18px]" />
            {notifChargees && notifCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-alert px-1 text-[9px] font-bold text-white" data-testid="bell-badge">{notifCount}</span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-strong max-h-[75vh] w-[calc(100vw-16px)] overflow-y-auto border-white/10 text-offwhite sm:w-80">
            <DropdownMenuGroup className="flex items-center justify-between gap-2">
              <DropdownMenuLabel className="text-xs uppercase tracking-[0.2em] text-gold">
                Notifications{notifChargees && notifCount > 0 ? ` · ${notifCount}` : ""}
              </DropdownMenuLabel>
              {inboxNonLues.length > 0 && (
                <button onClick={toutLu} data-testid="notif-tout-lu"
                  className="mr-1 flex items-center gap-1 px-2 py-1 text-[11px] text-offwhite/55 hover:text-gold">
                  <CheckCheck className="h-3 w-3" /> Tout lu
                </button>
              )}
            </DropdownMenuGroup>
            {enRepos && (
              <p className="px-2 py-1.5 text-[11px] italic text-gold/80" data-testid="notif-jour-repos">
                Jour de repos : les rappels doux se taisent aujourd'hui. Bonne pause.
              </p>
            )}
            <DropdownMenuSeparator className="bg-white/10" />
            {inbox.items.length > 0 && (
              <>
                {inboxNonLues.length > 1 && (
                  <button onClick={toutLu} data-testid="notif-tout-lu-bas"
                    className="ml-auto flex items-center gap-1 px-3 pb-1 pt-0.5 text-[11px] text-offwhite/55 hover:text-gold">
                    <CheckCheck className="h-3 w-3" /> Tout marquer comme lu
                  </button>
                )}
                {inbox.items.slice(0, 8).map((n) => {
                  const Icone = n.kind === "chat" ? MessageCircle : n.kind === "actu" ? Radio : Bell;
                  return (
                    <DropdownMenuItem key={n.id} className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid={`notif-inbox-${n.kind}`}
                      onClick={() => ouvrirNotif(n)}>
                      <Icone className={`mt-0.5 h-4 w-4 shrink-0 ${n.lu ? "text-offwhite/40" : "text-gold"}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${n.lu ? "text-offwhite/65" : "font-semibold text-offwhite"}`}>{n.titre}</p>
                        {n.corps && <p className="line-clamp-2 text-xs text-offwhite/60">{n.corps}</p>}
                        <p className="mt-0.5 text-[10.5px] text-offwhite/40">{ilYa(n.le)}</p>
                      </div>
                      {!n.lu && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="Non lue" />}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator className="bg-white/10" />
              </>
            )}
            {actuNonVue && !actuDansInbox && (
              <DropdownMenuItem className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid="notif-actu"
                onClick={() => { localStorage.setItem("actualite_vue_le", new Date().toISOString().slice(0, 10)); setActuNonVue(false); openChat("actu"); }}>
                <Radio className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-offwhite">Actualité du jour disponible</p>
                  <p className="text-xs text-offwhite/60">Ton digest est prêt — un clic pour le lire.</p>
                </div>
              </DropdownMenuItem>
            )}
            {decisionsEnAttente > 0 && (
              <DropdownMenuItem className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid="notif-decisions"
                onClick={() => openChat("decisions")}>
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-offwhite">{decisionsEnAttente} décision{decisionsEnAttente > 1 ? "s" : ""} en attente</p>
                  <p className="text-xs text-offwhite/60">Ton Copilote attend ton feu vert (onglet Décisions).</p>
                </div>
              </DropdownMenuItem>
            )}
            {!enRepos && rappelCheckin && !location.pathname.startsWith("/app/entreprise") && (
              <DropdownMenuItem className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid="notif-checkin"
                onClick={() => setCheckinOuvert(true)}>
                <BatteryMedium className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-offwhite">Check-in du jour à faire</p>
                  <p className="text-xs text-offwhite/60">30 secondes pour mesurer ton énergie — tout le cockpit s'en sert.</p>
                </div>
              </DropdownMenuItem>
            )}
            {lettrePrete && !lettreDansInbox && (
              <DropdownMenuItem className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid="notif-lettre"
                onClick={() => navigate("/app/bien-etre?tab=carnet")}>
                <MailOpen className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-offwhite">Ta lettre du futur est arrivée</p>
                  <p className="text-xs text-offwhite/60">Écrite le {lettrePrete.ecrite_le} — elle t'attend dans ton carnet.</p>
                </div>
              </DropdownMenuItem>
            )}
            {!enRepos && visionDue && (
              <DropdownMenuItem className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid="notif-vision"
                onClick={() => { localStorage.setItem("vision_vue_le", new Date().toISOString()); setVisionDue(false); navigate("/app/vision"); }}>
                <Compass className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-offwhite">Revois ta vision</p>
                  <p className="text-xs text-offwhite/60">30 secondes devant ton Vision Board pour ne pas lâcher le cap.</p>
                </div>
              </DropdownMenuItem>
            )}
            {!enRepos && serieEnDanger && (
              <DropdownMenuItem className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid="notif-serie"
                onClick={() => navigate("/app/bien-etre")}>
                <Flame className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-offwhite">Ta série de rituels tient encore</p>
                  <p className="text-xs text-offwhite/60">Un seul petit rituel aujourd'hui et la flamme continue.</p>
                </div>
              </DropdownMenuItem>
            )}
            {!enRepos && revueDue && (
              <DropdownMenuItem className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid="notif-revue"
                onClick={() => {
                  const d = new Date(); const t = new Date(d.getFullYear(), 0, 1);
                  localStorage.setItem("revue_faite_semaine", `${d.getFullYear()}-S${Math.ceil((((d - t) / 86400000) + 1) / 7)}`);
                  setRevueDue(false); navigate("/app/revue");
                }}>
                <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-offwhite">Boucle ta semaine</p>
                  <p className="text-xs text-offwhite/60">Revue hebdo : 5 questions guidées, 5 minutes.</p>
                </div>
              </DropdownMenuItem>
            )}
            {notifCount === 0 && inbox.items.length === 0 && (
              <div className="px-3 py-5 text-center" data-testid="notif-empty">
                <p className="text-xs text-offwhite/60">Rien de nouveau pour l'instant. Tu seras prévenu ici dès que ton Copilote répond ou qu'une actu arrive.</p>
              </div>
            )}
            <NotifsAppareil />
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="ml-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 py-1 pl-1 pr-2 transition-colors hover:bg-white/10 sm:pr-3" data-testid="header-profile" aria-label="Menu du profil">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-gold-hover font-display text-sm font-bold text-navy-900">
              {(user.firstName || "Z")[0]}
            </div>
            <div className="hidden text-left leading-tight sm:block">
              <div className="text-xs font-semibold text-offwhite">{user.firstName}</div>
              {aCheckin ? <div className="text-[10px]" style={{ color: modeInfo.color }}>{modeInfo.label}</div> : <div className="text-[10px] text-offwhite/45">Check-in à faire</div>}
            </div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-offwhite/50 sm:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-strong w-56 border-white/10 text-offwhite">
            <DropdownMenuGroup><DropdownMenuLabel className="text-xs uppercase tracking-[0.2em] text-gold">{user.firstName || "Mon compte"}</DropdownMenuLabel></DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem onClick={() => navigate("/compte")} className="cursor-pointer gap-2 focus:bg-white/10 focus:text-offwhite" data-testid="profile-compte">
              <User className="h-4 w-4" /> Mon compte
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/parametres")} className="cursor-pointer gap-2 focus:bg-white/10 focus:text-offwhite" data-testid="profile-settings">
              <Settings className="h-4 w-4 text-gold" /> Paramètres
            </DropdownMenuItem>
            {estAdmin && (
              <div className="px-2 py-1.5" data-testid="apercu-offre">
                <p className="px-1 pb-1 text-[10.5px] uppercase tracking-[0.16em] text-offwhite/45">Voir l'app comme</p>
                <select value={apercuPlan() || ""} onChange={(e) => { setApercuPlan(e.target.value || null); window.location.reload(); }}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-offwhite" data-testid="apercu-offre-select">
                  <option value="" className="text-navy-900">Mon accès admin (tout)</option>
                  {["reveur", "serenite", "pro", "business", "entreprise"].map((k) => <option key={k} value={k} className="text-navy-900">Offre {NOMS_OFFRES[k]}</option>)}
                </select>
              </div>
            )}
            <DropdownMenuItem onClick={() => startTour()} className="cursor-pointer gap-2 focus:bg-white/10 focus:text-offwhite" data-testid="profile-tour">
              <HelpCircle className="h-4 w-4 text-gold" /> Visite guidée
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setClair((v) => !v)} className="cursor-pointer gap-2 focus:bg-white/10 focus:text-offwhite sm:hidden">
              {clair ? <Moon className="h-4 w-4 text-gold" /> : <Sun className="h-4 w-4 text-gold" />} {clair ? "Thème sombre" : "Thème clair"}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem onClick={() => { setToken(null); navigate("/login"); }} className="cursor-pointer gap-2 text-offwhite/80 focus:bg-white/10 focus:text-offwhite" data-testid="profile-logout">
              <LogOut className="h-4 w-4" /> Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    {rechercheMobile && (
      <div className="relative border-b border-white/10 bg-white/[0.06] px-4 py-2 backdrop-blur-xl md:hidden">
        <input ref={champMobileRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onToucheRecherche}
          placeholder="Rechercher une page…" aria-label="Rechercher une page" data-testid="header-search-mobile-input"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none" />
        <div className="relative">{listeResultats}</div>
      </div>
    )}
    {/* Navigation mobile : barre du bas (BottomNav), plus de doublon en haut. */}
      {checkinOuvert && <EnergyCheckin open={checkinOuvert} onClose={() => setCheckinOuvert(false)} />}
    </div>
  );
}
