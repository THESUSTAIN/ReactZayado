import React, { useEffect, useState } from "react";
import "@/App.css";
import axios from "axios";
import { BrowserRouter, Routes, Route, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import CockpitChat from "@/components/CockpitChat";
import Onboarding from "@/components/Onboarding";
import InspirationScreen from "@/components/InspirationScreen";
import Dashboard from "@/components/Dashboard";
import Croissance from "@/pages/Croissance";
import BienEtre from "@/pages/BienEtre";
import Travail from "@/pages/Travail";
import SimulationModule from "@/pages/SimulationModule";
import Pilotage from "@/pages/Pilotage";
import VisionBoard from "@/pages/VisionBoardModule";
import MonBureau from "@/pages/MonBureau";
import Settings, { SettingsModal, PageOnboardingModal } from "@/pages/Settings";
import GuidedTour from "@/components/GuidedTour";
import { TOURS, hasSeenTour, resetTour } from "@/constants/tours";
import NotFound from "@/pages/NotFound";
import CockpitChecklist from "@/components/CockpitChecklist";
import PricingScreen from "@/components/PricingScreen";
import Roadmap from "@/pages/Roadmap";
import { currentUser, API, getUid, wellnessApi } from "@/lib/api";
import { PrefsProvider, usePrefs } from "@/context/PrefsContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import { Navigate } from "react-router-dom";
import useIsMobile from "@/hooks/useIsMobile";

// (Navigation par swipe plein écran retirée — voir useSwipeNavigation ci-dessous.)

// Ordre des modules pour les raccourcis clavier 1-6.
const SWIPE_ROUTES = ["/", "/vision-board", "/croissance", "/travail", "/pilotage", "/bureau", "/bien-etre"];

// Détecte un swipe horizontal (mobile) et navigue entre modules.
// DÉSACTIVÉ (bug UX critique) : l'écouteur global sur `document` capturait
// TOUT glissement horizontal (scroll du pipeline Kanban, carrousels, sliders,
// onglets, gestes involontaires) et changeait de page tout seul. La navigation
// passe désormais exclusivement par la BottomNav / Sidebar, plus fiable.
function useSwipeNavigation() {
  // no-op volontaire : swipe-navigation plein écran désactivée.
  React.useEffect(() => {}, []);
}

// Raccourcis clavier 1-6 pour naviguer directement entre les modules —
// ignore les frappes dans un champ de saisie (input/textarea/contenteditable).
function useKeyboardNav() {
  const navigate = useNavigate();
  React.useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = parseInt(e.key, 10);
      if (idx >= 1 && idx <= SWIPE_ROUTES.length) navigate(SWIPE_ROUTES[idx - 1]);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line
}

function AuthCallback() {
  const { completeOAuth } = useAuth();
  const processed = React.useRef(false);
  React.useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const oauthError = params.get("error");
    if (!code || oauthError) {
      window.location.replace("/login?error=google_failed");
      return;
    }
    completeOAuth(code);
  }, []); // eslint-disable-line
  return <div className="loading-screen">Connexion en cours…</div>;
}

function RequireAuth({ children }) {
  const { user, loading, guest } = useAuth();
  if (loading) return <div className="loading-screen">Chargement…</div>;
  if (!user && !guest) return <Navigate to="/login" replace />;
  return children;
}

// ─── Menu Debug (preview only) ─────────────────────────────────
// Regroupe les outils réservés à la preview / au développeur en un
// petit menu discret en bas d'écran. Trois actions :
//   1. Visite guidée (spotlight sur les vrais boutons de la page) ★ CTA principal
//   2. Revoir l'aide texte (fallback modale)
//   3. Réinitialiser l'app (efface localStorage/session + recharge)
// Ne s'affiche JAMAIS en production (détecté via le hostname).
function DebugMenu({ onStartTour, hasTour, onReplayOnboarding }) {
  const [open, setOpen] = useState(false);

  const startTour = () => { setOpen(false); onStartTour?.(); };
  const replay = () => { setOpen(false); onReplayOnboarding(); };

  const resetAll = () => {
    if (!window.confirm("Réinitialiser l'app ? Ceci efface les préférences locales (onboarding vu, checklist, etc.) puis recharge la page. Ton compte n'est pas supprimé.")) return;
    try {
      // Efface toutes les clés zayado_* du storage local + session, sans toucher au token/uid
      const preserve = new Set(["zayado_token", "zayado_uid", "zayado_guest"]);
      Object.keys(localStorage).forEach((k) => { if (k.startsWith("zayado_") && !preserve.has(k)) localStorage.removeItem(k); });
      Object.keys(sessionStorage).forEach((k) => { if (k.startsWith("zayado_")) sessionStorage.removeItem(k); });
    } catch { /* noop */ }
    window.location.href = "/";
  };

  return (
    <div style={{ position: "fixed", left: 14, bottom: 90, zIndex: 300 }} data-testid="debug-menu">
      {open && (
        <div
          style={{
            marginBottom: 8,
            display: "flex", flexDirection: "column", gap: 6,
            padding: 8, borderRadius: 14,
            background: "rgba(11,31,58,0.95)",
            border: "1px solid rgba(201,164,73,0.45)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            minWidth: 230,
          }}
        >
          <button
            data-testid="debug-guided-tour"
            onClick={startTour}
            disabled={!hasTour}
            style={{
              ..._dbgItem(),
              background: hasTour ? "linear-gradient(180deg, rgba(201,164,73,0.28) 0%, rgba(201,164,73,0.15) 100%)" : "rgba(255,255,255,0.04)",
              borderColor: hasTour ? "rgba(201,164,73,0.55)" : "rgba(201,164,73,0.15)",
              color: hasTour ? "#FBEFC5" : "rgba(229,200,135,0.35)",
              fontWeight: 700,
              cursor: hasTour ? "pointer" : "not-allowed",
            }}
            title={hasTour ? "Spotlight sur les vrais boutons de la page" : "Aucune visite guidée pour cette page"}
          >
            ★ Visite guidée
          </button>
          <button
            data-testid="debug-replay-onboarding"
            onClick={replay}
            style={_dbgItem()}
          >
            ✦ Aide en texte
          </button>
          <button
            data-testid="debug-reset"
            onClick={resetAll}
            style={{ ..._dbgItem(), color: "#F0B091", borderColor: "rgba(240,176,145,0.35)" }}
          >
            ↺ Réinitialiser l'app
          </button>
        </div>
      )}
      <button
        data-testid="debug-menu-toggle"
        onClick={() => setOpen((v) => !v)}
        title="Outils preview / dev"
        aria-label="Outils preview / dev"
        style={{
          /* Version discrète : petit rond icône, sans pill "DEV" — moins
             visible en démo investisseur, plus proche d'un outil dev standard. */
          width: 30, height: 30, borderRadius: 999,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: "transparent",
          color: "rgba(229,200,135,0.55)",
          border: "1px dashed rgba(201,164,73,0.35)",
          cursor: "pointer",
          transition: "color .15s ease, border-color .15s ease, background .15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#E5C887"; e.currentTarget.style.borderColor = "rgba(201,164,73,0.8)"; e.currentTarget.style.background = "rgba(201,164,73,0.08)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(229,200,135,0.55)"; e.currentTarget.style.borderColor = "rgba(201,164,73,0.35)"; e.currentTarget.style.background = "transparent"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
          <circle cx="12" cy="6" r="1.2" fill="currentColor" />
          <circle cx="12" cy="18" r="1.2" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}

function _dbgItem() {
  return {
    display: "block", width: "100%", textAlign: "left",
    padding: "8px 12px", borderRadius: 10,
    background: "rgba(255,255,255,0.04)",
    color: "#E5C887",
    border: "1px solid rgba(201,164,73,0.25)",
    fontSize: 12.5, fontWeight: 600, cursor: "pointer",
    transition: "background .15s ease",
  };
}

// ─── APP SHELL ────────────────────────────────────────────────
function AppShell() {
  const { prefs, ambiance, loaded } = usePrefs();
  const { user, guest } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile(768);
  // Sur mobile, toujours la nav du bas (la sidebar 96px n'a pas de sens sur petit écran)
  const left = prefs.menu_position === "left" && !isMobile;
  useSwipeNavigation();
  useKeyboardNav();

  // Parcours chrétien thesustain.net (SSO simulé) : dès qu'un utilisateur est
  // connecté avec le flag SSO, on seede les habitudes bibliques une seule fois,
  // indépendamment de la navigation (pas besoin d'ouvrir l'onglet Habitudes).
  useEffect(() => {
    if (user && localStorage.getItem("zayado_sso") === "thesustain" && !localStorage.getItem("zayado_sso_seeded")) {
      wellnessApi.seedChristianHabits()
        .then(() => localStorage.setItem("zayado_sso_seeded", "1"))
        .catch(() => {});
    }
  }, [user]);

  // Fréquence de l'écran d'inspiration : quotidien / hebdomadaire / jamais,
  // réglable dans Paramètres. Remplace l'ancien "une fois par jour" fixe.
  const FREQ_DAYS = { daily: 1, weekly: 7, never: Infinity };
  const legacyOff = prefs.show_inspiration_screen === false; // compat anciens comptes
  const frequency = legacyOff ? "never" : (prefs.inspiration_frequency || "daily");
  const [lastShown, setLastShown] = useState(() => localStorage.getItem("zayado_inspired_last"));
  const [forceShow, setForceShow] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboardingModal, setOnboardingModal] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [replayOnboarding, setReplayOnboarding] = useState(false);
  // ── Visite guidée (spotlight sur les vrais boutons de la page) ──
  const [tourOpen, setTourOpen] = useState(false);
  const tourSteps = TOURS[location.pathname] || [];

  // Bouton "Revoir l'onboarding" : disponible en preview uniquement (jamais en production).
  const _host = (typeof window !== "undefined" && window.location.hostname) || "";
  const IS_PRODUCTION = /(^|\.)zayado\.net$/i.test(_host) || /(^|\.)myextension-ai\.com$/i.test(_host);
  const isPreview = !IS_PRODUCTION;

  // Bouton "Revoir l'écran d'inspiration" (Paramètres) → déclenche à la demande,
  // sans attendre le prochain cycle quotidien/hebdo.
  useEffect(() => {
    const onForce = () => setForceShow(true);
    window.addEventListener("zayado:show-inspiration", onForce);
    return () => window.removeEventListener("zayado:show-inspiration", onForce);
  }, []);

  // Réouvre la modale checklist depuis le badge du Header (event global).
  useEffect(() => {
    const onOpen = () => {
      // Récupère les dernières données Dashboard pour recalculer les étapes done.
      axios.get(`${API}/dashboard`)
        .then((res) => { setDashboardData(res.data); setChecklistOpen(true); })
        .catch(() => setChecklistOpen(true));
    };
    window.addEventListener("zayado:open-checklist", onOpen);
    return () => window.removeEventListener("zayado:open-checklist", onOpen);
  }, []);

  // Bouton « ? » du Header — ouvre l'aide contextuelle (PageOnboardingModal)
  // pour la page courante, à la demande, sans marquer la page comme "vue".
  useEffect(() => {
    const onOpenHelp = () => setOnboardingModal(true);
    window.addEventListener("zayado:open-help", onOpenHelp);
    return () => window.removeEventListener("zayado:open-help", onOpenHelp);
  }, []);

  // Paiement Mollie automatique après connexion si un forfait a été choisi (?plan= ou sessionStorage,
  // typiquement depuis la page tarifs publique zayado.net/tarifs).
  useEffect(() => {
    if (!user || guest) return;
    const params = new URLSearchParams(window.location.search);
    const urlPlan = params.get("plan");
    const plan = urlPlan || sessionStorage.getItem("zayado_pending_plan");
    if (!plan) return;
    sessionStorage.removeItem("zayado_pending_plan");
    if (urlPlan) {
      params.delete("plan");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? "?" + qs : ""));
    }
    if ((user.plan || "free") === plan) return; // déjà sur ce forfait
    (async () => {
      try {
        const res = await axios.post(`${API}/payments/subscribe`, { plan });
        const url = res.data?.checkout_url;
        if (url) window.location.href = url;
      } catch (e) { /* silencieux : l'utilisateur pourra choisir depuis Paramètres → Facturation */ }
    })();
  }, [user, guest]);

  // Onboarding = uniquement pour les nouveaux. Source de vérité : le compte (onboarding_done),
  // avec repli sur les prefs pour masquer immédiatement après la complétion.
  const onboarded = !!(user?.onboarding_done) || !!prefs.onboarded;
  const showOnboarding = loaded && !guest && (!onboarded || replayOnboarding);
  const daysSinceShown = lastShown ? (Date.now() - new Date(lastShown).getTime()) / 86400000 : Infinity;
  const dueNaturally = frequency !== "never" && daysSinceShown >= (FREQ_DAYS[frequency] ?? 1);
  const showInspiration = loaded && !guest && onboarded && !showOnboarding && (forceShow || dueNaturally);

  const dismissInspiration = () => {
    const nowIso = new Date().toISOString();
    localStorage.setItem("zayado_inspired_last", nowIso);
    setLastShown(nowIso);
    setForceShow(false);
  };

  // Page tarifs (iframe zayado.net) — présentée une fois à la connexion pour les comptes gratuits,
  // puis accessible depuis Paramètres → Facturation. Toujours fermable.
  const planFree = (user?.plan || "free") === "free";
  const [pricingDismissed, setPricingDismissed] = useState(() => !!localStorage.getItem("zayado_pricing_seen"));
  const showPricing = loaded && !guest && onboarded && !showOnboarding && !showInspiration && planFree && !pricingDismissed;
  const dismissPricing = () => { localStorage.setItem("zayado_pricing_seen", "1"); setPricingDismissed(true); };

  // Modale d'onboarding page — première visite (persistée côté serveur via
  // prefs.page_tours_seen, pour ne pas réapparaître sur un nouvel appareil/session).
  useEffect(() => {
    if (!onboarded || guest) return;
    const seen = prefs.page_tours_seen || [];
    if (seen.includes(location.pathname)) return;
    const key = `zayado_onboarding_seen_${location.pathname.replace(/\//g, "_")}`;
    if (!localStorage.getItem(key)) {
      setOnboardingModal(true);
    }
  }, [location.pathname, onboarded, guest, prefs.page_tours_seen]);

  // ── Modale "Configure ton cockpit X/8" — s'ouvre après connexion (une fois par session)
  //    tant que la checklist n'est pas complétée et que l'utilisateur ne l'a pas dismiss.
  useEffect(() => {
    if (!loaded || !user || guest || !onboarded) return;
    if (prefs.cockpit_checklist_dismissed) return;
    if (showOnboarding || showInspiration) return;
    // Une seule fois par session (localStorage : effacé à la déconnexion via clear)
    const seenKey = `zayado_checklist_seen_${user.id || user.email || ""}`;
    if (sessionStorage.getItem(seenKey)) return;
    // Récupère les données dashboard pour connaître les étapes déjà faites
    axios.get(`${API}/dashboard`)
      .then((res) => {
        setDashboardData(res.data);
        setChecklistOpen(true);
        sessionStorage.setItem(seenKey, "1");
      })
      .catch(() => {
        // Même en cas d'erreur backend on peut ouvrir la modale (elle marchera avec data vide)
        setChecklistOpen(true);
        sessionStorage.setItem(seenKey, "1");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, user, guest, onboarded, prefs.cockpit_checklist_dismissed, showOnboarding, showInspiration]);

  return (
    <div className={`App ambiance-${ambiance} ${left ? "layout-left" : "layout-bottom"}`} data-testid="app-root">
      <div className="sky-bg" />
      {showOnboarding && <Onboarding replay={replayOnboarding} onDone={() => setReplayOnboarding(false)} />}
      {showInspiration && <InspirationScreen onDone={dismissInspiration} />}
      {left && <Sidebar onSettingsOpen={() => setSettingsOpen(true)} />}
      <div className="app-body">
        {!(isMobile && location.pathname.startsWith("/vision-board")) && <Header onSettingsOpen={() => setSettingsOpen(true)} />}
        <Outlet />
        {!left && !(isMobile && location.pathname.startsWith("/vision-board")) && <BottomNav />}
      </div>

      {/* Cockpit — chat co-pilote (panneau à droite) */}
      <CockpitChat />

      {/* Modale Paramètres */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Modale onboarding première visite */}
      {onboardingModal && (
        <PageOnboardingModal path={location.pathname} onClose={() => setOnboardingModal(false)} />
      )}

      {/* Modale "Configure ton cockpit X/8" — après connexion */}
      <CockpitChecklist
        open={checklistOpen}
        onClose={() => setChecklistOpen(false)}
        data={dashboardData || {}}
      />

      {/* Visite guidée : spotlight sur les vrais boutons de la page courante */}
      {tourOpen && tourSteps.length > 0 && (
        <GuidedTour
          steps={tourSteps}
          path={location.pathname}
          onClose={() => setTourOpen(false)}
        />
      )}

      {/* Preview uniquement : menu Debug (visite guidée, revoir aide texte, réinitialiser) */}
      {isPreview && !showOnboarding && (
        <DebugMenu
          onStartTour={() => {
            // Reset le "seen" pour permettre de rejouer la visite à volonté
            resetTour(location.pathname);
            setTourOpen(true);
          }}
          hasTour={tourSteps.length > 0}
          onReplayOnboarding={() => setOnboardingModal(true)}
        />
      )}

      <Toaster position="top-center" />
    </div>
  );
}

function DashboardSkeleton() {
  // Squelette de chargement — évite un écran blanc/vide au premier chargement
  // (mauvaise première impression pour un testeur ou un investisseur pressé).
  const block = (h, extra = {}) => ({
    height: h, borderRadius: 14, background: "var(--surface-2, rgba(255,255,255,0.06))",
    ...extra,
  });
  return (
    <div className="content-wrapper" data-testid="dashboard-skeleton">
      <div className="skeleton-pulse" style={block(64, { marginBottom: 14 })} />
      <div className="skeleton-pulse" style={block(120, { marginBottom: 14 })} />
      <div className="hero-row" style={{ marginBottom: 14 }}>
        <div className="skeleton-pulse" style={block(160)} />
        <div className="skeleton-pulse" style={block(160)} />
      </div>
      <div className="grid-3" style={{ gap: 12 }}>
        <div className="skeleton-pulse" style={block(140)} />
        <div className="skeleton-pulse" style={block(140)} />
        <div className="skeleton-pulse" style={block(140)} />
      </div>
      <style>{`
        .skeleton-pulse { animation: zayado-skeleton-pulse 1.4s ease-in-out infinite; }
        @keyframes zayado-skeleton-pulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}

function DashboardPage() {
  const [data, setData] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [error, setError] = useState(false);

  const load = React.useCallback(() => {
    // user_id n'est plus envoyé en query string : le backend dérive désormais
    // strictement l'utilisateur du JWT (Authorization: Bearer …), attaché par
    // défaut à axios dans lib/api.js. Évite qu'un ?user_id= trafiqué renvoie
    // les données d'un autre compte.
    axios.get(`${API}/dashboard`)
      .then((res) => { setData(res.data); setFetchedAt(new Date()); setError(false); })
      .catch((err) => { console.error("Dashboard fetch error:", err); setError(true); });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data) {
    if (error) {
      return (
        <div className="content-wrapper" data-testid="dashboard-error">
          <p className="muted" style={{ padding: 24, textAlign: "center" }}>
            Impossible de charger ton cockpit pour le moment.{" "}
            <button className="zbtn" onClick={load} style={{ marginLeft: 8 }}>Réessayer</button>
          </p>
        </div>
      );
    }
    return <DashboardSkeleton />;
  }
  return (
    <div className="content-wrapper" data-testid="dashboard-page">
      <Dashboard data={data} setData={setData} lastUpdated={fetchedAt} onRefresh={load} />
    </div>
  );
}

function App() {
  return (
    <PrefsProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </PrefsProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      {/* Admin unifié dans le plugin WordPress cms.zayado.net — /admin ne sert plus l'ancien panneau */}
      <Route path="/admin" element={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0B1F3A", flexDirection: "column", gap: 16, textAlign: "center", padding: 24 }}>
          <p style={{ color: "#F6F2EA", fontSize: 18, fontWeight: 600 }}>L'administration est désormais sur WordPress</p>
          <p style={{ color: "rgba(246,242,234,0.5)", fontSize: 14, maxWidth: 380 }}>Utilisateurs, revenus, emails IA, articles, CRM et affiliation — tout est centralisé dans le plugin MyExtension AI.</p>
          <a href="https://cms.zayado.net/wp-admin" style={{ color: "#D6A85F", fontSize: 15, fontWeight: 600 }}>→ Ouvrir cms.zayado.net/wp-admin</a>
        </div>
      } />
      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/croissance" element={<Croissance />} />        {/* Fusionnées dans Vision Board (onglet Analyse & validation de projet) */}
        <Route path="/validation" element={<Navigate to="/vision-board?tab=swot" replace />} />
        <Route path="/validation/new" element={<Navigate to="/vision-board?tab=swot" replace />} />
        <Route path="/validation/compare" element={<Navigate to="/vision-board?tab=swot" replace />} />
        <Route path="/validation/:id" element={<Navigate to="/vision-board?tab=swot" replace />} />
        <Route path="/bien-etre" element={<BienEtre />} />
        <Route path="/travail" element={<Travail />} />
        <Route path="/simulation" element={<SimulationModule />} />
        <Route path="/pilotage" element={<Pilotage />} />
        <Route path="/vision-board" element={<div className="vision-page-wrapper" data-testid="vision-board-page"><VisionBoard /></div>} />
        <Route path="/bureau" element={<MonBureau />} />
        <Route path="/parametres" element={<Settings />} />
        <Route path="/roadmap" element={<Roadmap />} />
      </Route>
      {/* Route 404 — capture toute URL inconnue (dans ET hors AppShell) */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
