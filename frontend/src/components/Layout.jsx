import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Compass, Eye, HeartPulse, MessageCircle, Gem, Search, Bell, Moon, Sun,
  LayoutGrid, ChevronDown, Settings as SettingsIcon, HelpCircle, LogOut, X,
} from "lucide-react";
import { toast } from "sonner";
import ChatPanel from "./ChatPanel";
import SettingsModal from "./SettingsModal";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const ITEMS = [
  { id: "vision", label: "Vision", Icon: Eye, path: "/", exact: true },
  { id: "pilotage", label: "Pilotage", Icon: Compass, path: "/pilotage" },
  { id: "bienetre", label: "Bien-être", Icon: HeartPulse, path: "/bien-etre" },
  { id: "copilote", label: "Copilote", Icon: MessageCircle, action: "open-kairos" },
];

const COLLAPSE_KEY = "mx_sidebar_collapsed";
const SEARCH_TARGETS = [
  { label: "Vision", path: "/" },
  { label: "Pilotage", path: "/pilotage" },
  { label: "Bien-être", path: "/bien-etre" },
];

/* ─────────────── Sidebar (rail 96px, modèle exact) ─────────────── */
function Sidebar({ onSettings, onCopilote }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0"); } catch { /* noop */ }
  }, [collapsed]);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  const isActive = (item) =>
    item.path ? (item.exact ? location.pathname === "/" : location.pathname.startsWith(item.path)) : false;

  const onItemClick = (item) => {
    if (item.action === "open-kairos") return onCopilote();
    if (item.path) navigate(item.path);
  };

  return (
    <aside className={`side-nav ${collapsed ? "is-collapsed" : ""}`} data-testid="side-nav" data-collapsed={collapsed ? "1" : "0"}>
      <button type="button" onClick={toggle} className="side-logo-btn" data-testid="side-logo"
        title={collapsed ? "Ouvrir le menu" : "Replier le menu"} aria-label="Menu">
        <img src="/icon-512.png" alt="MyExtension" className="side-logo-img" />
      </button>

      <button type="button" onClick={toggle} className="side-edge-strip" data-testid="side-edge-strip"
        aria-label="Ouvrir le menu" tabIndex={collapsed ? 0 : -1} />

      <div className="side-inner">
        <div className="menu-island relative w-full rounded-r-3xl py-3 px-2.5 flex items-center justify-center">
          <svg className="menu-scoop-top absolute left-0 top-[-30px] -rotate-90 pointer-events-none" width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
            <path d="M30 0H0V30C0 13.431 13.431 0 30 0Z" />
          </svg>
          <svg className="menu-scoop-bottom absolute left-0 bottom-[-30px] pointer-events-none" width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
            <path d="M30 0H0V30C0 13.431 13.431 0 30 0Z" />
          </svg>
          <ul className="relative z-10 flex flex-col gap-1.5 items-center w-full">
            {ITEMS.map((item) => {
              const active = isActive(item);
              const Icon = item.Icon;
              return (
                <li key={item.id} className="w-full flex justify-center">
                  <button onClick={() => onItemClick(item)} data-testid={`side-${item.id}`}
                    className={`menu-link group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${active ? "active" : ""} ${item.action ? "menu-link-action" : ""}`}>
                    <Icon size={17} strokeWidth={1.9} />
                    <span className="menu-tooltip pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md text-white text-xs px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="w-full flex items-center justify-center pt-1">
          <button onClick={onSettings} data-testid="side-settings" title="Paramètres"
            className="w-9 h-9 rounded-full bg-gradient-to-br from-[#d4b78c] to-[#c4a374] flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
            <Gem className="w-4 h-4 text-[#0a1f4e]" strokeWidth={2} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <button type="button" className="side-collapse-handle" onClick={toggle}
          title="Replier le menu" aria-label="Replier le menu" data-testid="side-collapse-handle">
          <span aria-hidden="true">‹</span>
        </button>
      )}
    </aside>
  );
}

/* ─────────────── Header (transparent, modèle exact) ─────────────── */
function Header({ onSettings }) {
  const navigate = useNavigate();
  const [dark, setDark] = useState(true);
  const [flash, setFlash] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("ambiance-clarte", !next);
    setFlash(true);
    setTimeout(() => setFlash(false), 350);
  };

  const results = SEARCH_TARGETS.filter((s) => s.label.toLowerCase().includes(q.toLowerCase()));
  const go = (path) => { navigate(path); setSearchOpen(false); setQ(""); };

  return (
    <header className="app-header" data-testid="app-header">
      <img src="/logo-myextension.png" alt="MyExtension" className="header-logo" data-testid="header-logo" onClick={() => navigate("/")} />

      <div className="header-search" data-testid="header-search" onClick={() => setSearchOpen(true)}>
        <Search size={16} className="header-search-icon" />
        <input type="text" placeholder="Rechercher (Cmd+K)" readOnly data-testid="header-search-input" style={{ cursor: "pointer" }} />
      </div>

      <div className="header-actions">
        <button className={`header-icon-btn${flash ? " header-icon-flash" : ""}`} title="Thème" onClick={toggleTheme} data-testid="theme-toggle-btn">
          {dark ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button className="header-icon-btn header-icon-badge" title="Notifications" data-testid="header-notifications-btn"
          onClick={() => toast.info("Aucune nouvelle notification pour le moment.")}>
          <Bell size={18} /><span className="header-badge">1</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="header-icon-btn" title="Modules" data-testid="header-apps-btn"><LayoutGrid size={18} /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#0B1F3A] border-white/15 text-white">
            <DropdownMenuLabel className="text-xs uppercase text-white/50">Écosystème</DropdownMenuLabel>
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/")}>Pilotage</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/vision")}>Vision</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/bien-etre")}>Bien-être</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="header-profile" data-testid="header-profile-btn">
              <span className="header-avatar" aria-hidden="true">C</span>
              <span className="header-profile-info">
                <span className="header-profile-name">Cindy Wilson</span>
                <span className="header-profile-role">Solopreneure</span>
              </span>
              <ChevronDown size={16} className="header-profile-chevron" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#0B1F3A] border-white/15 text-white">
            <DropdownMenuLabel>
              <div className="flex items-center gap-3 py-1">
                <div className="w-10 h-10 rounded-lg gold-bg text-[#0a1f4e] text-sm font-bold flex items-center justify-center">C</div>
                <div className="min-w-0"><p className="text-sm font-semibold">Cindy Wilson</p><p className="text-xs text-white/50">Solopreneure</p></div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="cursor-pointer" data-testid="profile-parametres" onClick={onSettings}>
              <SettingsIcon className="w-4 h-4 mr-2" /> Paramètres
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => toast.info("Aide & support bientôt disponible.")}>
              <HelpCircle className="w-4 h-4 mr-2" /> Aide & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="cursor-pointer text-rose-300" onClick={() => toast.info("Déconnexion (démo).")}>
              <LogOut className="w-4 h-4 mr-2" /> Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {searchOpen && (
        <div className="search-overlay" onClick={() => setSearchOpen(false)} data-testid="global-search-modal">
          <div className="search-box" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-2.5 py-2">
              <Search size={16} className="text-white/40" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && results[0] && go(results[0].path)}
                placeholder="Aller à…" data-testid="global-search-input"
                className="flex-1 bg-transparent border-none outline-none text-[15px] text-white placeholder:text-white/40" />
              <kbd className="text-[11px] text-white/40 border border-white/15 rounded px-1.5">Esc</kbd>
            </div>
            <div className="border-t border-white/10 mt-1 pt-1">
              {results.map((r) => (
                <button key={r.path} onClick={() => go(r.path)} data-testid={`search-result-${r.label}`}
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm text-white/85 hover:bg-white/10 transition-colors">
                  {r.label}
                </button>
              ))}
              {results.length === 0 && <p className="px-3 py-2 text-[13px] text-white/40">Aucun résultat.</p>}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ─────────────── Bottom nav (mobile, pill) ─────────────── */
function BottomNav({ onCopilote }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Sur mobile, / est réservé au Copilote d’ouverture ; Vision doit donc
  // pointer vers /vision, sans modifier la navigation desktop.
  const mobileItems = ITEMS.map((item) => item.id === "vision" ? { ...item, path: "/vision", exact: true } : item);
  const isActive = (item) => item.action
    ? location.pathname === "/"
    : (item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path));
  return (
    <nav className="bottom-nav" data-testid="bottom-nav">
      {mobileItems.map((item) => (
        <button key={item.id} className={isActive(item) ? "active" : ""} data-testid={`bottomnav-${item.id}`}
          onClick={() => (item.action ? onCopilote() : navigate(item.path))}>
          <item.Icon size={14} /> {item.label}
        </button>
      ))}
    </nav>
  );
}

/* ─────────────── PWA install prompt (notif de téléchargement) ─────────────── */
const INSTALL_DISMISS_KEY = "mx_pwa_prompt_dismissed";

function useInstallPrompt() {
  const deferred = useRef(null);
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      deferred.current = e;
      try { if (localStorage.getItem(INSTALL_DISMISS_KEY) === "1") return; } catch { /* noop */ }
      toast("Installer MyExtension Business", {
        description: "Ajoutez l'app à votre écran d'accueil pour un accès rapide.",
        duration: Infinity,
        closeButton: true,
        onDismiss: () => { try { localStorage.setItem(INSTALL_DISMISS_KEY, "1"); } catch { /* noop */ } },
        action: {
          label: "Installer",
          onClick: async () => {
            if (!deferred.current) return;
            deferred.current.prompt();
            const { outcome } = await deferred.current.userChoice;
            if (outcome === "accepted") toast.success("Installation lancée !");
            deferred.current = null;
          },
        },
      });
    };
    const onInstalled = () => toast.success("MyExtension Business est installée 🎉");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
}

/* ─────────────── App shell ─────────────── */
export default function Layout() {
  const location = useLocation();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotAsk, setCopilotAsk] = useState(null);
  const [visionContext, setVisionContext] = useState({ tab: "accueil", label: "Accueil Vision" });

  // Bug d'audit : Vision (VisionBoard.jsx) et Bien-être émettent déjà
  // "cours:open-copilot" ("Transformer en action", "Parler au copilote")
  // mais rien ne l'écoutait — les boutons ne faisaient rien.
  useEffect(() => {
    const onOpenCopilot = (e) => {
      setCopilotAsk(e.detail?.ask || null);
      setCopilotOpen(true);
    };
    const onVisionContext = (e) => setVisionContext(e.detail || null);
    window.addEventListener("cours:open-copilot", onOpenCopilot);
    window.addEventListener("cours:vision-context", onVisionContext);
    return () => {
      window.removeEventListener("cours:open-copilot", onOpenCopilot);
      window.removeEventListener("cours:vision-context", onVisionContext);
    };
  }, []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useInstallPrompt();

  const openSettings = () => setSettingsOpen(true);
  const baseContext = {
    "/": "Vision de l'entrepreneur: objectifs, alignement, mindset.",
    "/vision": "Vision de l'entrepreneur: objectifs, alignement, mindset.",
    "/pilotage": "Pilotage financier: trésorerie, factures, dépenses.",
    "/bien-etre": "Bien-être et énergie: focus, rituels, mindset anti-abandon.",
  }[location.pathname] || "";
  const context = visionContext?.label && (location.pathname === "/" || location.pathname === "/vision")
    ? `${baseContext} Onglet Vision actif : ${visionContext.label}. Aide l’utilisateur à choisir une seule prochaine action.`
    : baseContext;

  return (
    <div className="App layout-left" data-testid="app-root">
      <div className="sky-bg" />
      <Sidebar onSettings={openSettings} onCopilote={() => setCopilotOpen(true)} />

      <div className="app-body">
        <Header onSettings={openSettings} />
        <div className="flex">
          <main className="flex-1 min-w-0 px-4 sm:px-6 pb-28 xl:pb-8 max-w-[1180px]">
            <Outlet />
          </main>
          <button
            type="button"
            onClick={() => setCopilotOpen((open) => !open)}
            className={`hidden md:flex fixed top-1/2 z-[70] -translate-y-1/2 items-center gap-2 rounded-l-2xl border border-r-0 border-white/20 bg-white/[0.10] px-3 py-3 text-sm font-semibold text-white shadow-2xl backdrop-blur-xl transition-[right] duration-200 ${copilotOpen ? "right-[380px]" : "right-0"}`}
            aria-label={copilotOpen ? "Replier le Copilote" : "Déplier le Copilote"}
            title={copilotOpen ? "Replier le Copilote" : "Déplier le Copilote"}
            data-testid="copilot-drawer-toggle"
          >
            <span className="[writing-mode:vertical-rl] rotate-180 tracking-wide">Copilote</span>
          </button>
          <aside className={`hidden md:flex fixed right-0 top-0 z-[60] h-screen w-[380px] shrink-0 border-l border-white/20 bg-white/[0.08] backdrop-blur-xl shadow-2xl transition-transform duration-300 ${copilotOpen ? "translate-x-0" : "translate-x-full"}`} data-testid="copilot-right-drawer">
            <ChatPanel context={context} initialAsk={copilotAsk} />
          </aside>
        </div>
        <BottomNav onCopilote={() => setCopilotOpen(true)} />
      </div>

      {copilotOpen && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setCopilotOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full sm:w-96 border-l border-white/20 bg-white/[0.10] backdrop-blur-xl">
            <button className="absolute right-3 top-4 z-10 text-white/60" onClick={() => setCopilotOpen(false)} data-testid="close-copilot">
              <X size={22} />
            </button>
            <ChatPanel context={context} initialAsk={copilotAsk} />
          </div>
        </div>
      )}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
