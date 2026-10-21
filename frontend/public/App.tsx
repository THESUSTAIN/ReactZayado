import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Link, Navigate, Routes, Route, useLocation, useParams } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TOKEN_KEY } from "@/lib/api";
// Tunnel public Zayado (capture → Kit → Fast-Track → confirmation) — non référencé
const TunnelCapture = lazy(() => import("@/pages/tunnel/TunnelZayado").then((m) => ({ default: m.TunnelCapture })));
const TunnelMerci = lazy(() => import("@/pages/tunnel/TunnelZayado").then((m) => ({ default: m.TunnelMerci })));
const TunnelFastTrack = lazy(() => import("@/pages/tunnel/TunnelZayado").then((m) => ({ default: m.TunnelFastTrack })));
const TunnelConfirmation = lazy(() => import("@/pages/tunnel/TunnelZayado").then((m) => ({ default: m.TunnelConfirmation })));
const TunnelKit = lazy(() => import("@/pages/tunnel/TunnelZayado").then((m) => ({ default: m.TunnelKit })));
// Tunnels publiés par les utilisateurs : /t/:slug (pages publiques, mentions de leur entreprise)
const TunnelPublic = lazy(() => import("@/pages/tunnel/TunnelPublic"));
// Tunnel public « Créer ou reprendre ? » (accompagnement à la reprise d'entreprise)
const RepriseCapture = lazy(() => import("@/pages/tunnel/TunnelReprise").then((m) => ({ default: m.RepriseCapture })));
const RepriseRdv = lazy(() => import("@/pages/tunnel/TunnelReprise").then((m) => ({ default: m.RepriseRdv })));
const RepriseMerci = lazy(() => import("@/pages/tunnel/TunnelReprise").then((m) => ({ default: m.RepriseMerci })));
const TemoignagePublic = lazy(() => import("@/zy/pages/TemoignagePublic"));
// L'appli (zip A — VisionAct) : Accueil, Plan d'action, Radar, Pilotage + Tunnels — API /api/copilote/*
import VisionGlobalePage from "@/pages/copilote/VisionGlobale";
import PlanActionPage from "@/pages/copilote/PlanAction";
import RadarPage from "@/pages/copilote/Radar";
import PilotagePage from "@/pages/copilote/Pilotage";
import { TunnelDetail, TunnelsListe } from "@/pages/zayado/Tunnels";
// Projet déployé (Zayado) — pages reprises telles quelles du zip
import Login from "@/zy/pages/Login";
import Admin from "@/zy/pages/Admin";
import VisionBoard from "@/zy/pages/VisionBoard";
import { KairosProvider } from "@/zy/context/KairosContext";
// Le chat du Copilote (panneau à droite), monté sur toutes les pages privées : il avait disparu à la réorganisation.
const GlobalChat = lazy(() => import("@/zy/components/kairos/GlobalChat"));
// Garde d'accès par offre (sans offre active → onboarding ou /activer ; page au-dessus de l'offre → « Débloquer »).
const AccesGate = lazy(() => import("@/zy/components/kairos/AccesGate"));
// Notifications push (abonnement automatique, clic sur une notification → bonne page) et invitation à installer l'app.
const AutoPush = lazy(() => import("@/zy/components/kairos/AutoPush"));
const InstallBanner = lazy(() => import("@/zy/components/kairos/InstallBanner"));
// Pages vues par des visiteurs sans compte : jamais d'invitation à installer Zayado ni de notifications.
const PUBLIQUES = ["/login", "/public", "/testez-votre-projet", "/t/", "/legal", "/embed", "/v/", "/pricing", "/partenaires", "/connexion-externe", "/diagnostic"];
import { I18nProvider } from "@/zy/i18n";

// Pages du projet déployé chargées à la demande (le zip complet est volumineux).
const ZY = {
  WeeklyReview: lazy(() => import("@/zy/pages/WeeklyReview")),
  Entreprise: lazy(() => import("@/zy/pages/Entreprise")),
  EntrepriseRejoindre: lazy(() => import("@/zy/pages/EntrepriseRejoindre")),
  Partager: lazy(() => import("@/zy/pages/Partager")),
  Ideas: lazy(() => import("@/zy/pages/Ideas")),
  Sources: lazy(() => import("@/zy/pages/Sources")),
  BienEtre: lazy(() => import("@/zy/pages/BienEtre")),
  Debloquer: lazy(() => import("@/zy/pages/Debloquer")),
  MaFoi: lazy(() => import("@/zy/pages/MaFoi")),
  Agents: lazy(() => import("@/zy/pages/Agents")),
  ChatbotB2B: lazy(() => import("@/zy/pages/ChatbotB2B")),
  Processus: lazy(() => import("@/zy/pages/Processus")),
  TestezProjet: lazy(() => import("@/zy/pages/TestezProjet")),
  TestezProjetPublic: lazy(() => import("@/zy/pages/TestezProjetPublic")),
  Collaborateur: lazy(() => import("@/zy/pages/Collaborateur")),
  Diagnostic: lazy(() => import("@/zy/pages/Diagnostic")),
  Onboarding: lazy(() => import("@/zy/pages/Onboarding")),
  Activer: lazy(() => import("@/zy/pages/Activer")),
  MonCompte: lazy(() => import("@/zy/pages/MonCompte")),
  LiaisonCompte: lazy(() => import("@/zy/pages/LiaisonCompte")),
  Achat: lazy(() => import("@/zy/pages/Achat")),
  Parametres: lazy(() => import("@/zy/pages/Parametres")),
  Programmes: lazy(() => import("@/zy/pages/Programmes")),
  Marketplace: lazy(() => import("@/zy/pages/Marketplace")),
  ConnexionExterne: lazy(() => import("@/zy/pages/ConnexionExterne")),
  PublicVision: lazy(() => import("@/zy/pages/PublicVision")),
  Pricing: lazy(() => import("@/zy/pages/Pricing")),
  PricingSuccess: lazy(() => import("@/zy/pages/PricingSuccess")),
  Confidentialite: lazy(() => import("@/zy/pages/Confidentialite")),
  Legal: lazy(() => import("@/zy/pages/Legal")),
  PartenariatTheSustain: lazy(() => import("@/zy/pages/PartenariatTheSustain")),
  TarifsEmbed: lazy(() => import("@/zy/pages/TarifsEmbed")),
  ExerciceEmbed: lazy(() => import("@/zy/pages/ExerciceEmbed")),
  ConfidentialiteEmbed: lazy(() => import("@/zy/pages/ConfidentialiteEmbed")),
};

function connecte() {
  try {
    return !!localStorage.getItem(TOKEN_KEY);
  } catch {
    return false;
  }
}

function Protege({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  if (!connecte()) return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
  return <>{children}</>;
}

/** Thème nuit du Copilote : posé sur <html> pour que les fenêtres (portails) en héritent aussi. */
function Copilote({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("copilote");
    return () => document.documentElement.classList.remove("copilote");
  }, []);
  // Mêmes fournisseurs que les autres pages : l'en-tête (check-in, chat, cloche) et le chat y sont partagés.
  return (
    <Protege>
      <I18nProvider>
        <KairosProvider>
          {children}
          <Suspense fallback={null}><GlobalChat /></Suspense>
        </KairosProvider>
      </I18nProvider>
    </Protege>
  );
}

/** Coque des pages du projet déployé : ses fournisseurs (contexte Kairos, langue) et son thème. */
function Zy({ children, publique = false }: { children: ReactNode; publique?: boolean }) {
  const page = (
    <I18nProvider>
      <KairosProvider>
        <div className="zy-root zy-app min-h-screen text-offwhite">
          <Suspense fallback={<div className="p-10 text-sm text-offwhite/60" data-testid="zy-chargement">Chargement…</div>}>{children}</Suspense>
          {!publique ? <Suspense fallback={null}><GlobalChat /></Suspense> : null}
        </div>
      </KairosProvider>
    </I18nProvider>
  );
  return publique ? page : <Protege>{page}</Protege>;
}

function AncienCopilote() {
  const { pathname, search } = useLocation();
  return <Navigate to={pathname.replace(/^\/copilote/, "") + search} replace />;
}

/** /app/entreprise[/…]?… → /entreprise[/…]?… (liens, e-mails et notifications déjà envoyés). */
function AncienneEntreprise() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={pathname.replace(/^\/app\/entreprise/, "/entreprise") + search + hash} replace />;
}

/** Redirection qui garde les paramètres (?board=…, ?view=…) des liens déjà envoyés. */
function Vers({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={to + search + hash} replace />;
}

/** Élan (dont les Idées) vit dans le Vision Board (tiroir) : /app/elan?tab=… → /vision-board?elan=… */
function ElanVersVision() {
  const tab = new URLSearchParams(useLocation().search).get("tab");
  const volet = tab === "lettres" ? "lettres" : tab === "mur" ? "mur" : "idees";
  return <Navigate to={`/vision-board?elan=${volet}`} replace />;
}

/** Pages intégrées en iframe (Shopify, Instant) : publiques, sans menu. */
function Embed({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <div className="zy-root zy-app min-h-0 text-offwhite">
        <Suspense fallback={null}>{children}</Suspense>
      </div>
    </I18nProvider>
  );
}

function PageIntrouvable() {
  return (
    <div className="zy-root flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center" data-testid="page-404">
      <p className="tabular-nums text-sm text-[#DEC2A3]">404</p>
      <h1 className="titre-serif text-4xl text-[#eceff7]">Cette page n'existe pas.</h1>
      <p className="max-w-md text-sm text-[#a8b6d1]">Le lien est peut-être ancien ou mal recopié. Rien n'a été perdu.</p>
      <div className="flex gap-3">
        <Link to="/" className="rounded-full bg-[#DEC2A3] px-4 py-2 text-sm font-semibold text-[#11223f]" data-testid="page-404-home-link">Retour à l'accueil</Link>
        <Link to="/login" className="rounded-full border border-white/15 px-4 py-2 text-sm text-[#eceff7]" data-testid="page-404-login-link">Connexion</Link>
      </div>
    </div>
  );
}

/** Monte la garde d'accès dès qu'un compte est connecté (relu à chaque changement de page, donc juste après la connexion). */
function GardeAcces() {
  const { pathname } = useLocation();
  if (!connecte()) return null;
  const publique = PUBLIQUES.some((p) => pathname.startsWith(p));
  return (
    <Suspense fallback={null}>
      <AccesGate />
      {!publique ? <><AutoPush /><InstallBanner /></> : null}
    </Suspense>
  );
}

// Pages publiques = boutique Shopify. L'appli ne garde que connexion, espace client, paiement Mollie, /admin et /espace-vendeur.
// Domaine public de la boutique (marque) : la variable Railway VITE_SHOP_URL peut le remplacer.
const BOUTIQUE = (import.meta.env.VITE_SHOP_URL as string | undefined) || "https://zayado.net";
const LEGAL: Record<string, string> = { cgu: "cgu", cgv: "cgv", mentions: "mentions-legales", "mentions-legales": "mentions-legales", confidentialite: "confidentialite" };
function VersBoutique({ chemin, legal = false }: { chemin?: string; legal?: boolean }) {
  const { page = "" } = useParams();
  const cible = legal ? `/pages/${LEGAL[page] ?? page}` : chemin;
  useEffect(() => { window.location.replace(`${BOUTIQUE}${cible}`); }, [cible]);
  return null;
}

export default function App() {
  return (
    <>
      <GardeAcces />
      <Routes>
        <Route path="/login" element={<div className="zy-root"><Login /></div>} />
        <Route path="/public/tunnel" element={<VersBoutique chemin="/pages/diagnostic" />} />
        <Route path="/public/tunnel/merci" element={<VersBoutique chemin="/pages/diagnostic" />} />
        <Route path="/public/tunnel/fast-track" element={<Suspense fallback={null}><TunnelFastTrack /></Suspense>} />
        <Route path="/public/tunnel/confirmation" element={<Suspense fallback={null}><TunnelConfirmation /></Suspense>} />
        <Route path="/t/:slug" element={<Suspense fallback={null}><TunnelPublic /></Suspense>} />
        <Route path="/public/reprise" element={<VersBoutique chemin="/pages/reprise" />} />
        <Route path="/public/reprise/rdv" element={<VersBoutique chemin="/pages/reprise" />} />
        {/* Zayado ne fait pas de cession : l'ancienne adresse renvoie vers la reprise sans apport */}
        <Route path="/public/cession" element={<VersBoutique chemin="/pages/reprise" />} />
        <Route path="/public/reprise/merci" element={<VersBoutique chemin="/pages/reprise" />} />
        {/* Lien personnel envoyé au client (e-mail / WhatsApp) pour écrire son témoignage */}
        <Route path="/temoignage/:jeton" element={<Suspense fallback={null}><TemoignagePublic /></Suspense>} />
        <Route path="/public/tunnel/kit" element={<Suspense fallback={null}><TunnelKit /></Suspense>} />
        {/* L'appli, à la racine — menu « scoops » (les pages publiques viendront sous /public) */}
        <Route path="/" element={<Copilote><VisionGlobalePage /></Copilote>} />
        <Route path="/plan-action" element={<Copilote><PlanActionPage /></Copilote>} />
        <Route path="/radar" element={<Copilote><RadarPage /></Copilote>} />
        <Route path="/pilotage" element={<Copilote><PilotagePage /></Copilote>} />
        <Route path="/tunnels" element={<Copilote><TunnelsListe /></Copilote>} />
        <Route path="/tunnels/:id" element={<Copilote><TunnelDetail /></Copilote>} />
        <Route path="/vision-board" element={<Zy><VisionBoard /></Zy>} />
        {/* Anciennes adresses /copilote/* → racine */}
        <Route path="/copilote" element={<Navigate to="/" replace />} />
        <Route path="/copilote/*" element={<AncienCopilote />} />

        {/* Console admin + SheetFlow — même menu droit, même fond */}
        <Route path="/admin" element={<Protege><Admin /></Protege>} />
        {/* SheetFlow est désormais intégré à l'espace Entreprise (Bases & pages) */}
        <Route path="/entreprise/sheetflow/*" element={<Navigate to="/entreprise?vue=bases" replace />} />

        {/* Pages du projet déployé (zip), à leurs adresses d'origine */}
        {/* Doublons de l'ancien zip : une seule version de chaque page, à la racine */}
        <Route path="/app" element={<Navigate to="/" replace />} />
        <Route path="/app/radar" element={<Navigate to="/radar" replace />} />
        <Route path="/app/actions" element={<Navigate to="/plan-action" replace />} />
        <Route path="/app/vision" element={<Vers to="/vision-board" />} />
        <Route path="/app/elan" element={<ElanVersVision />} />
        <Route path="/app/revue" element={<Zy><ZY.WeeklyReview /></Zy>} />
        {/* Espace entreprise : /entreprise (anciennes adresses /app/entreprise* redirigées) */}
        <Route path="/entreprise/rejoindre" element={<Zy publique><ZY.EntrepriseRejoindre /></Zy>} />
        <Route path="/entreprise" element={<Zy><ZY.Entreprise /></Zy>} />
        <Route path="/app/entreprise/*" element={<AncienneEntreprise />} />
        <Route path="/app/partager" element={<Zy><ZY.Partager /></Zy>} />
        <Route path="/app/ideas" element={<Zy><ZY.Ideas /></Zy>} />
        <Route path="/app/sources" element={<Zy><ZY.Sources /></Zy>} />
        <Route path="/app/roadmap" element={<Navigate to="/app/actions?tab=objectifs" replace />} />
        <Route path="/app/bien-etre" element={<Zy><ZY.BienEtre /></Zy>} />
        <Route path="/app/debloquer" element={<Zy><ZY.Debloquer /></Zy>} />
        <Route path="/app/ma-foi" element={<Zy><ZY.MaFoi /></Zy>} />
        <Route path="/app/agents" element={<Zy><ZY.Agents /></Zy>} />
        <Route path="/app/reprise" element={<Navigate to="/entreprise?vue=reprise" replace />} />
        <Route path="/app/chatbot-b2b" element={<Zy><ZY.ChatbotB2B /></Zy>} />
        <Route path="/app/processus" element={<Zy><ZY.Processus /></Zy>} />
        <Route path="/app/testez-votre-projet" element={<Zy><ZY.TestezProjet /></Zy>} />
        <Route path="/testez-votre-projet" element={<Embed><ZY.TestezProjetPublic /></Embed>} />
        <Route path="/app/collaborateurs" element={<Zy><ZY.Collaborateur /></Zy>} />
        <Route path="/app/diagnostic" element={<Zy><ZY.Diagnostic enApp /></Zy>} />
        <Route path="/app/marketplace" element={<Navigate to="/espace-vendeur" replace />} />
        {/* Un seul diagnostic public : le tunnel (capture → Kit → Fast-Track). Le diagnostic d'équilibre reste dans l'appli. */}
        <Route path="/diagnostic" element={<VersBoutique chemin="/pages/diagnostic" />} />
        <Route path="/onboarding" element={<Zy><ZY.Onboarding /></Zy>} />
        <Route path="/activer" element={<Zy><ZY.Activer /></Zy>} />
        <Route path="/compte" element={<Zy><ZY.MonCompte /></Zy>} />
        <Route path="/compte/liaison" element={<Zy><ZY.LiaisonCompte /></Zy>} />
        <Route path="/mon-espace" element={<Navigate to="/compte?vue=achats" replace />} />
        <Route path="/acheter" element={<Zy><ZY.Achat /></Zy>} />
        <Route path="/parametres" element={<Zy><ZY.Parametres /></Zy>} />
        <Route path="/programmes" element={<Zy><ZY.Programmes /></Zy>} />
        <Route path="/espace-vendeur" element={<Zy><ZY.Marketplace /></Zy>} />
        <Route path="/connexion-externe" element={<Zy><ZY.ConnexionExterne /></Zy>} />
        <Route path="/v/:token" element={<Zy publique><ZY.PublicVision /></Zy>} />
        <Route path="/pricing" element={<Zy publique><ZY.Pricing /></Zy>} />
        <Route path="/pricing/success" element={<Zy publique><ZY.PricingSuccess /></Zy>} />
        <Route path="/legal/confidentialite" element={<VersBoutique chemin="/pages/confidentialite" />} />
        <Route path="/partenaires/thesustain" element={<VersBoutique chemin="/pages/maison" />} />
        <Route path="/legal/:page" element={<VersBoutique legal />} />
        <Route path="/embed/tarifs" element={<Embed><ZY.TarifsEmbed /></Embed>} />
        <Route path="/embed/exercice/:slug" element={<Embed><ZY.ExerciceEmbed /></Embed>} />
        <Route path="/embed/confidentialite" element={<Embed><ZY.ConfidentialiteEmbed /></Embed>} />

        <Route path="*" element={<PageIntrouvable />} />
      </Routes>
      {/* Toasts aux couleurs de Zayado (bleu nuit, icône colorée) — styles dans index.css (.zy-toast) */}
      <Toaster mobileOffset={{ bottom: "calc(84px + env(safe-area-inset-bottom))" }} toastOptions={{ className: "zy-toast" }} />
    </>
  );
}
