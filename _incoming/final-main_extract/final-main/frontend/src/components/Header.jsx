import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Moon, Sun, Mail, LayoutGrid, Bell, ChevronDown,
  Store, Briefcase, Users, Sparkles, Settings as SettingsIcon,
  HelpCircle, LogOut, UserPlus, CreditCard, FileCheck, Globe, Check,
  Rocket, ShoppingBag, Building2, Map, Heart, GraduationCap,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import axios from "axios";
import { usePrefs } from "@/context/PrefsContext";
import { useAuth } from "@/context/AuthContext";
import { API, notificationsApi, messagesApi } from "@/lib/api";
import TrialBadge from "@/components/TrialBadge";
import CockpitBadge from "@/components/CockpitBadge";

const NOTIF_ICONS = { UserPlus, CreditCard, FileCheck, Sparkles, Bell };
const ECO_ICONS = { Store, Briefcase, Users, Sparkles, Rocket, Globe, ShoppingBag, Building2, Map, Heart, GraduationCap };

// Fallback si /api/public/config est indisponible (ex: offline)
const APPS_FALLBACK = [
  { id: "equiper",  label: "S'équiper",             url: "https://zayado.net/boutique",                                          icon: "Store" },
  { id: "espace",   label: "Espace",                url: "https://espace.zayado.net",                                            icon: "Briefcase" },
  { id: "business", label: "Équiper mon business",  url: "/simulation",                                                          icon: "GraduationCap" },
  { id: "roadmap",  label: "Roadmap",               url: "/roadmap",                                                             icon: "Sparkles" },
];

export default function Header({ onSettingsOpen }) {
  const navigate = useNavigate();
  const { prefs, setPref, t } = usePrefs();
  const { user, guest, logout } = useAuth();
  const isDark = prefs.theme !== "light";
  const userName = user?.name || prefs.first_name || (guest ? "Invité" : "Vous");
  const userEmail = user?.email || "";
  const initial = userName.charAt(0).toUpperCase();

  const [notifs, setNotifs] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [justArrived, setJustArrived] = useState(false);
  const [ecosystem, setEcosystem] = useState(APPS_FALLBACK);
  const [helpUrl, setHelpUrl] = useState("");
  const [themeJustToggled, setThemeJustToggled] = useState(false);
  const prevNotifCount = React.useRef(0);

  useEffect(() => {
    notificationsApi.list().then((r) => setNotifs(r.items || [])).catch(() => {});
    messagesApi.list().then((r) => setMsgs(r.items || [])).catch(() => {});
    // Charger la config publique (URLs éditables depuis le plugin WP admin)
    axios.get(`${API}/public/config`, { timeout: 4000 }).then((r) => {
      const cfg = r.data || {};
      if (Array.isArray(cfg.header_ecosystem) && cfg.header_ecosystem.length > 0) {
        setEcosystem(cfg.header_ecosystem);
      }
      // Bouton Aide : priorité à header_help_url, sinon fallback sur whatsapp_url
      const help = (cfg.header_help_url || cfg.whatsapp_url || "").trim();
      setHelpUrl(help);
    }).catch(() => {});
  }, []);

  // Animation quand une nouvelle notification arrive (polling léger toutes les 45s)
  useEffect(() => {
    const poll = setInterval(() => {
      // Onglet en arrière-plan : on saute ce cycle pour ne pas cumuler des
      // requêtes inutiles (coût serveur qui croît linéairement avec le
      // nombre d'utilisateurs connectés simultanément).
      if (document.hidden) return;
      notificationsApi.list().then((r) => {
        const items = r.items || [];
        if (items.length > prevNotifCount.current && prevNotifCount.current > 0) {
          setJustArrived(true);
          setTimeout(() => setJustArrived(false), 1600);
        }
        prevNotifCount.current = items.length;
        setNotifs(items);
      }).catch(() => {});
    }, 45000);
    // Au retour au premier plan, on rafraîchit immédiatement plutôt
    // d'attendre le prochain cycle de 45s.
    const onVisible = () => {
      if (!document.hidden) {
        notificationsApi.list().then((r) => {
          const items = r.items || [];
          prevNotifCount.current = items.length;
          setNotifs(items);
        }).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Raccourci clavier Cmd/Ctrl+K — recherche globale
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const SEARCH_TARGETS = [
    { label: "Dashboard", path: "/" }, { label: "Vision Board", path: "/vision-board" },
    { label: "Croissance", path: "/croissance" }, { label: "Cockpit", path: "/bureau" },
    { label: "Pilotage", path: "/pilotage" }, { label: "Moi", path: "/bien-etre" },
    { label: "Paramètres", path: "/parametres" },
  ];
  const [searchQuery, setSearchQuery] = useState("");
  const searchResults = SEARCH_TARGETS.filter((s) => s.label.toLowerCase().includes(searchQuery.toLowerCase()));
  const goToSearchResult = (path) => { navigate(path); setSearchOpen(false); setSearchQuery(""); };

  const unreadNotifs = notifs.filter((n) => n.unread).length;
  const unreadMsgs = msgs.filter((m) => m.unread).length;
  const markNotifsRead = () => { notificationsApi.markRead().then(() => setNotifs((ns) => ns.map((n) => ({ ...n, unread: false })))).catch(() => {}); };

  const openApp = (a) => {
    const url = (a.url || "").trim();
    if (!url) { toast.info(`${a.label} — ${t("soon")}`); return; }
    // Path interne (commence par "/" mais pas "//") → react-router
    if (url.startsWith("/") && !url.startsWith("//")) {
      navigate(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const openHelp = () => {
    const url = (helpUrl || "").trim();
    if (!url) { toast.info(`${t("help")} — ${t("soon")}`); return; }
    if (url.startsWith("mailto:") || url.startsWith("tel:")) {
      window.location.href = url;
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };
  const toggleTheme = () => {
    // Source de vérité = la classe réelle sur <html> (synchronisée par PrefsContext),
    // pour éviter un `isDark` périmé au 1er clic après login.
    const currentlyDark = typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : isDark;
    setPref({ theme: currentlyDark ? "light" : "dark" });
    // Retour visuel bref pour confirmer la prise en compte du clic, même
    // quand les deux thèmes sont visuellement proches (ex: appareil en mode auto).
    setThemeJustToggled(true);
    setTimeout(() => setThemeJustToggled(false), 350);
  };

  return (
    <header className="app-header" data-testid="app-header">
      {/* Logo Zayado — rendu ici pour être visible quand la sidebar n'existe
          pas (mode menu-en-bas / BottomNav sur mobile). Masqué automatiquement
          en CSS via `.layout-left .header-logo { display: none }` quand la
          sidebar est présente (source unique de vérité côté sidebar). */}
      <img
        src="/logo-zayado.png"
        alt="myextension-ai by zayado"
        title="myextension-ai by zayado"
        data-testid="header-logo"
        className="header-logo"
        onClick={() => navigate("/")}
      />
      <div className="header-search" data-testid="header-search" onClick={() => setSearchOpen(true)}>
        <Search size={16} className="header-search-icon" />
        <input type="text" placeholder={`${t("search")} (Cmd+K)`} readOnly data-testid="header-search-input" aria-label={t("search")} style={{ cursor: "pointer" }} />
      </div>

      <div className="header-actions">
        <CockpitBadge />
        <TrialBadge />

        <button
          className={`header-icon-btn${themeJustToggled ? " header-icon-flash" : ""}`}
          title="Theme"
          aria-label="Theme"
          onClick={toggleTheme}
          data-testid="ambiance-toggle-btn"
        >
          {isDark ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="header-icon-btn header-icon-badge" title="Messages" aria-label="Messages" data-testid="header-mail-btn">
              <Mail size={18} />{unreadMsgs > 0 && <span className="header-badge">{unreadMsgs}</span>}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Messages</DropdownMenuLabel><DropdownMenuSeparator />
            {msgs.length === 0 && <div className="px-3 py-6 text-center text-xs text-muted-foreground" data-testid="messages-empty">Aucun message pour le moment.</div>}
            {msgs.map((m) => (
              <DropdownMenuItem key={m.id} className="flex items-start gap-3 py-3 cursor-pointer" data-testid={`message-${m.id}`}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#2952a3] text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">{(m.from || "?").charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{m.from}</p><p className="text-xs text-muted-foreground truncate">{m.text}</p></div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="header-icon-btn" title="Modules Zayado" aria-label="Modules Zayado" data-testid="header-apps-btn"><LayoutGrid size={18} /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-3">
            <DropdownMenuLabel className="text-xs font-semibold tracking-wider uppercase text-muted-foreground pb-2">Écosystème Zayado</DropdownMenuLabel>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {ecosystem.map((a) => {
                const IconComp = ECO_ICONS[a.icon] || Store;
                const url = (a.url || "").trim();
                const isExternal = !(url.startsWith("/") && !url.startsWith("//"));
                return (
                  <button key={a.id} onClick={() => openApp(a)} data-testid={`app-${a.id}`}
                    title={isExternal ? "Ouvre un nouvel onglet" : "Reste dans l'application"}
                    className="relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl text-center border border-border hover:border-[#C9A449]/60 hover:bg-accent transition">
                    {isExternal && (
                      <span className="absolute top-1.5 right-1.5 text-[9px] leading-none text-muted-foreground" aria-hidden="true">↗</span>
                    )}
                    <IconComp className="w-5 h-5 text-[#2952a3]" /><span className="text-[11px] font-medium leading-tight">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu onOpenChange={(o) => { if (o && unreadNotifs > 0) markNotifsRead(); }}>
          <DropdownMenuTrigger asChild>
            <button className="header-icon-btn header-icon-badge" title="Notifications" aria-label="Notifications" data-testid="header-notifications-btn">
              <Bell size={18} className={justArrived ? "header-bell-ring" : ""} />{unreadNotifs > 0 && <span className="header-badge">{unreadNotifs}</span>}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            {/* En-tête de la popup notifications avec bouton d'aide contextuelle
                (icône « ? ») en haut à droite. Un clic ouvre PageOnboardingModal
                (l'aide par page) via l'event global 'zayado:open-help', capté
                dans App.js. onSelect={(e)=>e.preventDefault()} empêche la fermeture
                automatique du menu Radix avant l'ouverture de la modale. */}
            <div className="flex items-center justify-between px-2 pt-1 pb-1">
              <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
              <DropdownMenuItem
                asChild
                onSelect={(e) => {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent("zayado:open-help"));
                }}
                className="p-0 focus:bg-transparent"
              >
                <button
                  type="button"
                  className="header-icon-btn"
                  style={{ width: 30, height: 30, borderRadius: 999 }}
                  title="Aide de cette page"
                  aria-label="Aide de cette page"
                  data-testid="notifs-help-btn"
                >
                  <HelpCircle size={16} />
                </button>
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator />
            {notifs.length === 0 && <div className="px-3 py-6 text-center text-xs text-muted-foreground" data-testid="notifs-empty">Rien de neuf pour l'instant.</div>}
            {notifs.map((n) => {
              const Icon = NOTIF_ICONS[n.icon] || Bell;
              return (
                <DropdownMenuItem key={n.id} className="flex items-start gap-3 py-3 cursor-pointer" data-testid={`notif-${n.id}`}>
                  <div className="w-9 h-9 rounded-lg bg-[#2952a3]/10 flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-[#2952a3]" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium">{n.title}</p><p className="text-xs text-muted-foreground">{n.text} · {n.time}</p></div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="header-profile" data-testid="header-profile-btn">
              <span className="header-avatar" aria-hidden="true">{initial}</span>
              <span className="header-profile-info"><span className="header-profile-name">{userName}</span><span className="header-profile-role">{t("role")}</span></span>
              <ChevronDown size={16} className="header-profile-chevron" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex items-center gap-3 py-1">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#DD2A33] to-[#A81D24] text-white text-sm font-bold flex items-center justify-center">{initial}</div>
                <div className="min-w-0"><p className="text-sm font-semibold truncate">{userName}</p><p className="text-xs text-muted-foreground truncate">{userEmail || "—"}</p></div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" data-testid="profile-parametres" onClick={onSettingsOpen}>
              <SettingsIcon className="w-4 h-4 mr-2" /> {t("settings")}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" data-testid="profile-aide" onClick={openHelp}>
              <HelpCircle className="w-4 h-4 mr-2" /> {t("help")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("language")}</DropdownMenuLabel>
            <DropdownMenuItem className="cursor-pointer" data-testid="profile-lang-fr" onClick={() => setPref({ language: "fr" })}>
              <Globe className="w-4 h-4 mr-2" /> Français {prefs.language === "fr" && <Check className="w-4 h-4 ml-auto text-[#DD2A33]" />}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" data-testid="profile-lang-en" onClick={() => setPref({ language: "en" })}>
              <Globe className="w-4 h-4 mr-2" /> English {prefs.language === "en" && <Check className="w-4 h-4 ml-auto text-[#DD2A33]" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" data-testid="profile-logout" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" /> {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {searchOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 2000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh" }}
          onClick={() => setSearchOpen(false)}>
          <div style={{ width: "100%", maxWidth: 480, background: "var(--glass-bg, #fff)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: 8, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
            onClick={(e) => e.stopPropagation()} data-testid="global-search-modal">
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
              <Search size={16} style={{ color: "var(--muted)" }} />
              <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && searchResults[0]) goToSearchResult(searchResults[0].path); }}
                placeholder="Aller à..." style={{ flex: 1, border: "none", outline: "none", background: "none", fontSize: 15, color: "var(--txt)" }}
                data-testid="global-search-input" />
              <kbd style={{ fontSize: 11, color: "var(--muted)", border: "1px solid var(--glass-border)", borderRadius: 4, padding: "1px 5px" }}>Esc</kbd>
            </div>
            <div style={{ borderTop: "1px solid var(--glass-border)", marginTop: 4, paddingTop: 4 }}>
              {searchResults.map((r) => (
                <button key={r.path} onClick={() => goToSearchResult(r.path)} data-testid={`search-result-${r.path.replace("/", "") || "home"}`}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 8, border: "none", background: "none", cursor: "pointer", fontSize: 14, color: "var(--txt)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--glass-soft)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                  {r.label}
                </button>
              ))}
              {searchResults.length === 0 && <p className="muted" style={{ padding: "10px 12px", fontSize: 13 }}>Aucun résultat.</p>}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
