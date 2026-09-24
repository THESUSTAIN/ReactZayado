import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Moon, Sun, Mail, Grid3x3, Bell, MessageCircle, Workflow, Radio, CheckSquare, HelpCircle, Settings, LogOut, User, ChevronDown, CornerDownLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useKairos } from "@/context/KairosContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "@/i18n";
import { fetchActualite, fetchDecisions, setToken } from "@/lib/kairosApi";
import { openChat } from "./GlobalChat";
import { startTour } from "./GuidedTour";

const THEME_KEY = "kairos_theme";

// Pages proposées par la recherche rapide (Ctrl/⌘ + K).
const PAGES = [
  { label: "Aujourd'hui · Cockpit", path: "/app", mots: "accueil cockpit dashboard tableau" },
  { label: "Vision Board", path: "/app/vision", mots: "vision objectifs murs board" },
  { label: "Radar", path: "/app/radar", mots: "marché veille signaux" },
  { label: "Revue hebdo", path: "/app/revue", mots: "semaine bilan review" },
  { label: "Idées", path: "/app/ideas", mots: "idee capture" },
  { label: "Sources", path: "/app/sources", mots: "documents liens" },
  { label: "Feuille de route", path: "/app/roadmap", mots: "roadmap jalons trimestre" },
  { label: "Plan d'action · Actions", path: "/app/actions", mots: "taches missions todo priorités actions" },
  { label: "Plan d'action · Objectifs", path: "/app/actions?tab=objectifs", mots: "objectifs 90 jours cap trimestre" },
  { label: "Bien-être & Mindset", path: "/app/bien-etre", mots: "energie respiration mindset parcours carnet vendre refus" },
  { label: "Collaborateurs", path: "/app/collaborateurs", mots: "expert humain aide" },
  { label: "Agents IA", path: "/app/agents", mots: "ia automatisation" },
  { label: "Agent Business (chatbot)", path: "/app/chatbot-b2b", mots: "clients chatbot" },
  { label: "Plan d'action · Processus", path: "/app/actions?tab=processus", mots: "processus workflow étapes routine" },
  { label: "Mon espace", path: "/mon-espace", mots: "commandes achats compte" },
  { label: "Espace vendeur", path: "/espace-vendeur", mots: "marketplace vendre" },
  { label: "Paramètres", path: "/parametres", mots: "réglages compte profil connexion" },
  { label: "Collaborateur IA (chat)", action: "chat", mots: "copilote assistant chat ia" },
  { label: "Visite guidée", action: "tour", mots: "aide tutoriel découvrir" },
];
const norm = (x) => (x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const MODULES = [
  { name: "Agent Business",      icon: MessageCircle, path: "/app/chatbot-b2b",   badge: "49€" },
  { name: "Processus",           icon: Workflow,     path: "/app/actions?tab=processus" },
];

export function Header() {
  const { user, modeInfo } = useKairos();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");
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
  const modules = MODULES;

  // Thème clair/sombre — persisté en local, classe posée sur <body>.
  const [clair, setClair] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) === "clair"; } catch { return false; }
  });
  useEffect(() => {
    document.body.classList.toggle("theme-clair", clair);
    try { localStorage.setItem(THEME_KEY, clair ? "clair" : "sombre"); } catch { /* stockage indisponible */ }
  }, [clair]);

  // Notifications réelles : actualité du jour non lue + décisions en attente.
  const [actuNonVue, setActuNonVue] = useState(false);
  const [decisionsEnAttente, setDecisionsEnAttente] = useState(0);
  useEffect(() => {
    const aujourdHui = new Date().toISOString().slice(0, 10);
    fetchActualite().then((d) => {
      const aDuContenu = !d?.masque && !d?.erreur && (d?.articles?.length || 0) > 0;
      setActuNonVue(aDuContenu && localStorage.getItem("actualite_vue_le") !== aujourdHui);
    }).catch(() => {});
    fetchDecisions().then((d) => {
      setDecisionsEnAttente((d?.decisions || []).filter((x) => x.statut === "proposee").length);
    }).catch(() => {});
  }, []);
  const notifCount = (actuNonVue ? 1 : 0) + decisionsEnAttente;

  const mobileItems = [
    ["today", "Aujourd'hui", "/app"], ["vision", "Vision", "/app/vision"],
    ["radar", "Radar", "/app/radar"], ["ideas", "Idées", "/app/ideas"],
    ["actions", "Plan d'action", "/app/actions"], ["wellbeing", "Bien-être", "/app/bien-etre"],
  ];

  return (
    <div className="sticky top-0 z-30">
    <header
      className="flex items-center gap-2 border-b border-white/10 bg-[#0f1b3a]/60 px-4 py-3 backdrop-blur-xl sm:gap-3 sm:px-6"
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

      <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-2">
        <button onClick={() => { setRechercheMobile((v) => !v); setTimeout(() => champMobileRef.current?.focus(), 30); }}
          className="rounded-xl border border-white/10 bg-white/5 p-2 text-offwhite/70 transition-colors hover:bg-white/10 md:hidden" aria-label="Rechercher" data-testid="header-search-mobile">
          <Search className="h-[18px] w-[18px]" />
        </button>
        <div className="hidden sm:block"><LanguageSwitcher /></div>

        <button onClick={() => openChat()}
          className={`rounded-xl border border-gold/30 bg-gold/10 p-2 text-gold transition-colors hover:bg-gold/20 ${location.pathname === "/app" ? "xl:hidden" : ""}`}
          title="Collaborateur IA (chat)" aria-label="Ouvrir le Collaborateur IA" data-testid="header-chat">
          <MessageCircle className="h-[18px] w-[18px]" />
        </button>

        <button
          onClick={() => setClair((v) => !v)}
          className="hidden rounded-xl border border-white/10 bg-white/5 p-2 text-offwhite/70 transition-colors hover:bg-white/10 sm:block"
          title={clair ? "Passer en thème sombre" : "Passer en thème clair"}
          aria-label={clair ? "Passer en thème sombre" : "Passer en thème clair"} data-testid="header-darkmode"
        >
          {clair ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative hidden rounded-xl border border-white/10 bg-white/5 p-2 text-offwhite/70 transition-colors hover:bg-white/10 sm:block" title="Messages de tes clients" aria-label="Messages de tes clients" data-testid="header-mail">
              <Mail className="h-[18px] w-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-strong w-80 border-white/10 text-offwhite">
            <DropdownMenuLabel className="text-xs uppercase tracking-[0.2em] text-gold">Messages clients</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <div className="px-3 py-5 text-center" data-testid="messages-empty">
              <p className="text-xs leading-relaxed text-offwhite/60">Aucun message pour le moment. Quand ton Agent Business (chatbot) échangera avec tes clients, leurs réponses arriveront ici.</p>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hidden rounded-xl border border-white/10 bg-white/5 p-2 text-offwhite/70 transition-colors hover:bg-white/10 sm:block" title={t("header.ecosystem")} aria-label={t("header.ecosystem")} data-testid="header-ecosystem">
              <Grid3x3 className="h-[18px] w-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-strong w-64 border-white/10 text-offwhite">
            <DropdownMenuLabel className="text-xs uppercase tracking-[0.2em] text-gold">Modules Zayado</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            {modules.map((e) => (
              <DropdownMenuItem key={e.name} onClick={() => navigate(e.path)}
                className="cursor-pointer gap-2 focus:bg-white/10 focus:text-offwhite" data-testid={`module-${e.name}`}>
                <e.icon className="h-4 w-4 text-gold" />
                <span className="flex-1">{e.name}</span>
                {e.badge && (
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-widest text-gold">{e.badge}</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button onClick={() => startTour()}
          className="hidden rounded-xl border border-white/10 bg-white/5 p-2 text-offwhite/70 transition-colors hover:bg-white/10 sm:block"
          title="Visite guidée" aria-label="Lancer la visite guidée" data-testid="header-help">
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative rounded-xl border border-white/10 bg-white/5 p-2 text-offwhite/70 transition-colors hover:bg-white/10" title={t("header.notifications")} aria-label={t("header.notifications")} data-testid="header-bell">
              <Bell className="h-[18px] w-[18px]" />
              {notifCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-alert px-1 text-[9px] font-bold text-white" data-testid="bell-badge">{notifCount}</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-strong w-80 border-white/10 text-offwhite">
            <DropdownMenuLabel className="text-xs uppercase tracking-[0.2em] text-gold">Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            {actuNonVue && (
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
            {notifCount === 0 && (
              <div className="px-3 py-5 text-center" data-testid="notif-empty">
                <p className="text-xs text-offwhite/60">Aucune notification — tout est à jour.</p>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 py-1 pl-1 pr-2 transition-colors hover:bg-white/10 sm:pr-3" data-testid="header-profile" aria-label="Menu du profil">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-gold-hover font-display text-sm font-bold text-navy-900">
                {(user.firstName || "Z")[0]}
              </div>
              <div className="hidden text-left leading-tight sm:block">
                <div className="text-xs font-semibold text-offwhite">{user.firstName}</div>
                <div className="text-[10px]" style={{ color: modeInfo.color }}>{modeInfo.label}</div>
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-offwhite/50 sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-strong w-56 border-white/10 text-offwhite">
            <DropdownMenuLabel className="text-xs uppercase tracking-[0.2em] text-gold">{user.firstName || "Mon compte"}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem onClick={() => navigate("/parametres")} className="cursor-pointer gap-2 focus:bg-white/10 focus:text-offwhite" data-testid="profile-settings">
              <Settings className="h-4 w-4 text-gold" /> Paramètres
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/mon-espace")} className="cursor-pointer gap-2 focus:bg-white/10 focus:text-offwhite" data-testid="profile-espace">
              <User className="h-4 w-4 text-gold" /> Mon espace
            </DropdownMenuItem>
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
    <nav className="flex gap-1 overflow-x-auto border-b border-white/10 bg-[#0f1b3a]/85 px-3 py-2 backdrop-blur-xl lg:hidden" aria-label="Navigation mobile" data-testid="mobile-nav">
      {mobileItems.map(([key, label, path]) => {
        const active = location.pathname === path || (path !== "/app" && location.pathname.startsWith(path));
        return <button key={key} onClick={() => navigate(path)} data-testid={`mobile-nav-${key}`} aria-current={active ? "page" : undefined} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs ${active ? "bg-gold text-navy-900" : "bg-white/5 text-offwhite/70"}`}>{label}</button>;
      })}
      <button onClick={() => navigate("/app/collaborateurs")} className="shrink-0 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-offwhite/70">Collaborateurs</button>
      <button onClick={() => navigate("/parametres")} className="shrink-0 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-offwhite/70">Paramètres</button>
    </nav>
    </div>
  );
}
