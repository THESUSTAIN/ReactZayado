import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chargerAbonnement } from "@/zy/lib/acces";
import { BatteryMedium, Search, Moon, Sun, Mail, Bell, MessageCircle, Radio, CheckSquare, HelpCircle, Settings, LogOut, User, ShieldCheck, ChevronDown, CornerDownLeft, Compass, Flame, MailOpen, CalendarCheck, CheckCheck } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuGroup,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/zy/components/ui/dropdown-menu";
import { useKairos } from "@/zy/context/KairosContext";

// Cache des indicateurs de la cloche (partagé entre les montages du Header,
// qui change à chaque page) — évite que le compteur « saute ».
let _notifCache = null;
// Boîte de notifications du serveur (réponses de l'IA, actu du jour, relances) : même principe de cache,
// + mémoire des identifiants déjà vus pour ne sonner qu'une fois par nouvelle notification.
let _inboxCache = null;
let _inboxIds = null;
let _cercleCache = null;
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
import { getToken } from "@/zy/lib/kairosApi";
// ChoixEspace retiré de l en-tête (doublon avec la bascule du rail) — composant conservé si besoin ailleurs.
import { apercuPlan, setApercuPlan, NOMS_OFFRES } from "@/zy/lib/droits";
import { enPro } from "@/zy/lib/espace";
import { useI18n } from "@/zy/i18n";
import { fetchActualite, fetchDecisions, setToken, fetchRituels, fetchLettres, fetchMoi, fetchNotifications, marquerNotifLue, toutMarquerLu } from "@/zy/lib/kairosApi";
import { prechargerActu } from "@/zy/lib/actuCache";
import { signaler, signalRecent, ouvrirAdresse } from "@/zy/lib/alertes";
import NotifsAppareil from "./NotifsAppareil";
import { openChat } from "./GlobalChat";
import { startTour } from "./GuidedTour";
import { apiGet } from "@/lib/api";
import { MenuAvatar, RechercheGlobale, SelecteurEspace } from "@/components/vision/menus";

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
    if (window.location.pathname.startsWith("/entreprise")) { window.dispatchEvent(new CustomEvent("zayado:assistant-entreprise")); return; }
    openChat();
  };
  return (
    <button onClick={ouvrir}
      className="relative rounded-xl border border-gold/30 bg-gold/10 p-2 text-gold transition-colors hover:bg-gold/20"
      title="Collaborateur IA (chat)" aria-label="Ouvrir le Collaborateur IA" data-testid="header-chat">
      <MessageCircle className="h-[18px] w-[18px]" />
    </button>
  );
}


// Pages proposées par la recherche rapide (Ctrl/⌘ + K).
const PAGES = [
  { label: "Aujourd'hui · Cockpit", path: "/app", mots: "accueil cockpit dashboard tableau" },
  { label: "Vision Board", path: "/vision-board", mots: "vision murs board" },
  { label: "Radar", path: "/app/radar", mots: "marché veille signaux prospects" },
  { label: "Revue hebdo", path: "/app/revue", mots: "semaine bilan review" },
  { label: "Élan · Idées", path: "/app/ideas", mots: "idee idées capture boîte élan geste" },
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


export function Header({ variante = "complet" } = {}) {
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
  const rappelCheckin = loaded && !aCheckin && !!getToken() && (variante === "actions" || location.pathname.startsWith("/app") || location.pathname === "/parametres")
    // Sur « Aujourd'hui », la carte Énergie porte déjà le bouton : une seule entrée.
    && location.pathname !== "/app" && location.pathname !== "/";
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
  const lettreDansInbox = inboxNonLues.some((n) => /lettre/i.test(n.titre || "") && /(tab=carnet|tab=lettres)/.test(String(n.url || "")));
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
  // « À faire » vient aussi du cercle (tunnel à publier, signaux à trier, chiffres à importer…).
  const [cercleAFaire, setCercleAFaire] = useState(() => _cercleCache ?? []);
  useEffect(() => {
    if (!getToken()) return;
    apiGet("/copilote/cercle").then((c) => { const l = [c?.proposition, ...(c?.secondaires || [])].filter(Boolean); _cercleCache = l; setCercleAFaire(l); }).catch(() => {});
  }, [location.pathname]);
  const inboxNouveau = inbox.items.filter((n) => n.kind !== "actu");
  const inboxActus = inbox.items.filter((n) => n.kind === "actu");
  const aFaireCount = cercleAFaire.length + decisionsEnAttente + (enRepos ? 0 : (rappelCheckin ? 1 : 0) + (revueDue ? 1 : 0) + (serieEnDanger ? 1 : 0) + (visionDue ? 1 : 0));
  const nouveauCount = inboxNouveau.filter((n) => !n.lu).length + (lettrePrete && !lettreDansInbox ? 1 : 0);
  const actusCount = inboxActus.filter((n) => !n.lu).length + (actuNonVue && !actuDansInbox ? 1 : 0);
  const [ongletNotif, setOngletNotif] = useState(null);
  useEffect(() => {
    if (ongletNotif) return;
    setOngletNotif(aFaireCount ? "a_faire" : nouveauCount ? "nouveau" : actusCount ? "actus" : "a_faire");
  }, [aFaireCount, nouveauCount, actusCount]); // eslint-disable-line react-hooks/exhaustive-deps
  // Le chiffre rouge = ce qui est NOUVEAU (non lu). Les « à faire » restent dans l'onglet, sans pastille qui stresse.
  const notifCount = nouveauCount + actusCount;

  const mobileItems = [
    ["today", "Aujourd'hui", "/app"], ["vision", "Vision", "/vision-board"],
    ["radar", "Radar", "/app/radar"],
    ["actions", "Plan d'action", "/app/actions"], ["wellbeing", "Bien-être", "/app/bien-etre"],
  ];

  const blocActions = (
    <>
        {rappelCheckin && !enPro() && !location.pathname.startsWith("/entreprise") && (  /* check-in énergie = perso, pas dans l'espace entreprise */
          <button onClick={() => setCheckinOuvert(true)} data-testid="header-rappel-checkin"
            className="relative hidden shrink-0 items-center gap-1.5 rounded-xl border border-white/20 bg-gold px-2.5 py-2 text-[12px] font-semibold text-navy-900 transition hover:brightness-105 sm:inline-flex"
            title="Ton check-in du jour n'est pas encore fait">
            <BatteryMedium className="h-4 w-4" /><span className="hidden md:inline">Check-in du jour</span>
          </button>
        )}

        <BoutonChat />

        {/* Thème, console admin et « voir l'app comme » : dans le menu du compte (avatar), une seule fois. */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative rounded-xl border border-white/10 bg-white/5 p-2 text-offwhite/70 transition-colors hover:bg-white/10" title={t("header.notifications")} aria-label={t("header.notifications")} data-testid="header-bell">
            <Bell className="h-[18px] w-[18px]" />
            {notifChargees && notifCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-alert px-1 text-[9px] font-bold text-white" data-testid="bell-badge">{notifCount}</span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-strong max-h-[75vh] w-[calc(100vw-16px)] overflow-y-auto border-white/10 text-offwhite sm:w-[22rem]">
            <DropdownMenuGroup className="flex items-center justify-between gap-2">
              <DropdownMenuLabel className="text-xs uppercase tracking-[0.2em] text-gold">Notifications</DropdownMenuLabel>
              {inboxNonLues.length > 0 && (
                <button onClick={toutLu} data-testid="notif-tout-lu" className="mr-1 flex items-center gap-1 px-2 py-1 text-[11px] text-offwhite/55 hover:text-gold">
                  <CheckCheck className="h-3 w-3" /> Tout lu
                </button>
              )}
            </DropdownMenuGroup>
            {/* Trois onglets : ce que le cercle attend de toi, ce qui vient d'arriver, l'actualité. */}
            <div className="mx-2 mb-1 grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1" role="tablist" data-testid="notif-onglets">
              {[["a_faire", "À faire", aFaireCount], ["nouveau", "Nouveau", nouveauCount], ["actus", "Actualités", actusCount]].map(([k, l, n]) => (
                <button key={k} type="button" role="tab" aria-selected={ongletNotif === k}
                  onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); setOngletNotif(k); }} data-testid={`notif-onglet-${k}`}
                  className={`rounded-lg px-2 py-1.5 text-[12px] font-semibold transition ${ongletNotif === k ? "bg-gold text-navy-900" : "text-offwhite/65 hover:text-offwhite"}`}>
                  {l}{n > 0 ? ` · ${n}` : ""}
                </button>
              ))}
            </div>
            {enRepos && ongletNotif === "a_faire" && (
              <p className="px-3 py-1.5 text-[11px] italic text-gold/80" data-testid="notif-jour-repos">Jour de repos : les rappels doux se taisent aujourd'hui. Bonne pause.</p>
            )}

            {ongletNotif === "a_faire" && (<>
              {cercleAFaire.map((p) => (
                <DropdownMenuItem key={p.cle} className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid={`notif-cercle-${p.cle}`}
                  onClick={() => navigate(p.action === "lien" && p.lien ? p.lien : p.action === "tunnel_auto" ? "/tunnels" : "/")}>
                  <Compass className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <div className="min-w-0"><p className="text-sm font-medium text-offwhite">{p.titre}</p><p className="line-clamp-2 text-xs text-offwhite/60">{p.texte}</p></div>
                </DropdownMenuItem>
              ))}
              {decisionsEnAttente > 0 && (
                <DropdownMenuItem className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid="notif-decisions" onClick={() => openChat("decisions")}>
                  <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <div className="min-w-0"><p className="text-sm font-medium text-offwhite">{decisionsEnAttente} décision{decisionsEnAttente > 1 ? "s" : ""} en attente</p><p className="text-xs text-offwhite/60">Ton Copilote attend ton feu vert.</p></div>
                </DropdownMenuItem>
              )}
              {!enRepos && rappelCheckin && !location.pathname.startsWith("/entreprise") && (
                <DropdownMenuItem className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid="notif-checkin" onClick={() => setCheckinOuvert(true)}>
                  <BatteryMedium className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <div className="min-w-0"><p className="text-sm font-medium text-offwhite">Check-in du jour à faire</p><p className="text-xs text-offwhite/60">30 secondes pour mesurer ton énergie : ton plan du jour s'y adapte.</p></div>
                </DropdownMenuItem>
              )}
              {!enRepos && revueDue && (
                <DropdownMenuItem className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid="notif-revue"
                  onClick={() => { const d = new Date(); const t0 = new Date(d.getFullYear(), 0, 1); localStorage.setItem("revue_faite_semaine", `${d.getFullYear()}-S${Math.ceil((((d - t0) / 86400000) + 1) / 7)}`); setRevueDue(false); navigate("/app/revue"); }}>
                  <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <div className="min-w-0"><p className="text-sm font-medium text-offwhite">Boucle ta semaine</p><p className="text-xs text-offwhite/60">Revue hebdo : 5 questions, 5 minutes.</p></div>
                </DropdownMenuItem>
              )}
              {!enRepos && serieEnDanger && (
                <DropdownMenuItem className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid="notif-serie" onClick={() => navigate("/app/bien-etre")}>
                  <Flame className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <div className="min-w-0"><p className="text-sm font-medium text-offwhite">Ta série de rituels tient encore</p><p className="text-xs text-offwhite/60">Un seul petit rituel aujourd'hui et la flamme continue.</p></div>
                </DropdownMenuItem>
              )}
              {!enRepos && visionDue && (
                <DropdownMenuItem className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid="notif-vision"
                  onClick={() => { localStorage.setItem("vision_vue_le", new Date().toISOString()); setVisionDue(false); navigate("/vision-board"); }}>
                  <Compass className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <div className="min-w-0"><p className="text-sm font-medium text-offwhite">Revois ta vision</p><p className="text-xs text-offwhite/60">30 secondes devant ton Vision Board pour garder le cap.</p></div>
                </DropdownMenuItem>
              )}
              {aFaireCount === 0 && <p className="px-3 py-5 text-center text-xs text-offwhite/60" data-testid="notif-afaire-vide">Rien qui t'attend. Profite.</p>}
            </>)}

            {ongletNotif === "nouveau" && (<>
              {lettrePrete && !lettreDansInbox && (
                <DropdownMenuItem className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid="notif-lettre" onClick={() => navigate("/vision-board?elan=lettres")}>
                  <MailOpen className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <div className="min-w-0"><p className="text-sm font-medium text-offwhite">Ta lettre du futur est arrivée</p><p className="text-xs text-offwhite/60">Écrite le {lettrePrete.ecrite_le}.</p></div>
                </DropdownMenuItem>
              )}
              {inboxNouveau.slice(0, 10).map((n) => (
                <DropdownMenuItem key={n.id} className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid={`notif-inbox-${n.kind}`} onClick={() => ouvrirNotif(n)}>
                  {n.kind === "chat" ? <MessageCircle className={`mt-0.5 h-4 w-4 shrink-0 ${n.lu ? "text-offwhite/40" : "text-gold"}`} /> : <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${n.lu ? "text-offwhite/40" : "text-gold"}`} />}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${n.lu ? "text-offwhite/65" : "font-semibold text-offwhite"}`}>{n.titre}</p>
                    {n.corps && <p className="line-clamp-2 text-xs text-offwhite/60">{n.corps}</p>}
                    <p className="mt-0.5 text-[10.5px] text-offwhite/40">{ilYa(n.le)}</p>
                  </div>
                  {!n.lu && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="Non lue" />}
                </DropdownMenuItem>
              ))}
              {nouveauCount === 0 && inboxNouveau.length === 0 && <p className="px-3 py-5 text-center text-xs text-offwhite/60" data-testid="notif-nouveau-vide">Rien de nouveau. Les contacts captés, clients signés et réponses du Copilote arrivent ici.</p>}
            </>)}

            {ongletNotif === "actus" && (<>
              {actuNonVue && !actuDansInbox && (
                <DropdownMenuItem className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid="notif-actu"
                  onClick={() => { localStorage.setItem("actualite_vue_le", new Date().toISOString().slice(0, 10)); setActuNonVue(false); openChat("actu"); }}>
                  <Radio className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <div className="min-w-0"><p className="text-sm font-medium text-offwhite">Ton point du matin est prêt</p><p className="text-xs text-offwhite/60">Les actualités de ton secteur, une opportunité du Radar et ta priorité.</p></div>
                </DropdownMenuItem>
              )}
              {inboxActus.slice(0, 10).map((n) => (
                <DropdownMenuItem key={n.id} className="flex cursor-pointer items-start gap-3 py-3 focus:bg-white/10" data-testid="notif-inbox-actu" onClick={() => ouvrirNotif(n)}>
                  <Radio className={`mt-0.5 h-4 w-4 shrink-0 ${n.lu ? "text-offwhite/40" : "text-gold"}`} />
                  <div className="min-w-0 flex-1"><p className={`text-sm ${n.lu ? "text-offwhite/65" : "font-semibold text-offwhite"}`}>{n.titre}</p>{n.corps && <p className="line-clamp-2 text-xs text-offwhite/60">{n.corps}</p>}</div>
                </DropdownMenuItem>
              ))}
              {actusCount === 0 && inboxActus.length === 0 && (
                <div className="px-3 py-5 text-center text-xs text-offwhite/60" data-testid="notif-actus-vide">
                  Pas d'actualité aujourd'hui.{" "}
                  <button type="button" className="text-gold underline" onClick={() => navigate("/parametres#notifications")}>Choisir mes sujets et l'heure</button>
                </div>
              )}
            </>)}
            <DropdownMenuSeparator className="bg-white/10" />
            <NotifsAppareil />
          </DropdownMenuContent>
        </DropdownMenu>
    </>
  );
  // Variante « actions » : utilisée par l'en-tête des pages Accueil / Plan / Radar / Pilotage / Tunnels,
  // qui ont leur propre recherche et leur menu de compte : on n'affiche que check-in, chat et cloche.
  if (variante === "actions") {
    return (
      <div className="ml-auto flex items-center gap-1 sm:gap-2 md:ml-0" data-testid="header-actions">
        {blocActions}
        {checkinOuvert && <EnergyCheckin open={checkinOuvert} onClose={() => setCheckinOuvert(false)} />}
      </div>
    );
  }

  // Variante « complet » (pages historiques) : EXACTEMENT la même barre que les autres pages —
  // logo (téléphone), recherche, check-in · chat · cloche, compte.
  return (
    <div className="px-4 sm:px-6" data-testid="app-header">
      <div className="flex items-center gap-2 pt-4 sm:gap-3">
        <button onClick={() => navigate("/")} className="shrink-0 lg:hidden" aria-label="Accueil Zayado">
          <img src="/logo-app.png" alt="" className="h-9 w-9 object-contain" />
        </button>
        <RechercheGlobale />
        <SelecteurEspace className="ml-auto hidden md:inline-flex" />
        <div className="ml-auto flex items-center gap-1 sm:gap-2 md:ml-0" data-testid="header-actions">{blocActions}</div>
        <MenuAvatar prenom={user.firstName || ""} offre={planHeader ? NOMS_OFFRES[planHeader] || "" : ""} />
      </div>
      {checkinOuvert && <EnergyCheckin open={checkinOuvert} onClose={() => setCheckinOuvert(false)} />}
    </div>
  );
}
