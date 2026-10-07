import "@/App.css";
import GlobalChat from "@/components/kairos/GlobalChat";
import GuidedTour from "@/components/kairos/GuidedTour";
import InstallBanner from "@/components/kairos/InstallBanner";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { KairosProvider } from "@/context/KairosContext";
import { I18nProvider } from "@/i18n";
import { AuroraBackground } from "@/components/aurora/AuroraBackground";
import Onboarding from "@/pages/Onboarding";
import Diagnostic from "@/pages/Diagnostic";
import ConnexionExterne from "@/pages/ConnexionExterne";
import Cockpit from "@/pages/Cockpit";
import Radar from "@/pages/Radar";
import Actions from "@/pages/Actions";
import Login from "@/pages/Login";
import VisionBoard from "@/pages/VisionBoard";
import WeeklyReview from "@/pages/WeeklyReview";
import Ideas from "@/pages/Ideas";
import Sources from "@/pages/Sources";
import BienEtre from "@/pages/BienEtre";
import Debloquer from "@/pages/Debloquer";
import MaFoi from "@/pages/MaFoi";
import Agents from "@/pages/Agents";
// Reprise autonome retirée : la reprise vit dans l espace entreprise (/app/entreprise?vue=reprise). /app/reprise redirige.
import ChatbotB2B from "@/pages/ChatbotB2B";
import Processus from "@/pages/Processus";
import Collaborateur from "@/pages/Collaborateur";
import Pricing from "@/pages/Pricing";
import PartenariatTheSustain from "@/pages/PartenariatTheSustain";
import LiaisonCompte from "@/pages/LiaisonCompte";
import PricingSuccess from "@/pages/PricingSuccess";
import Mockup from "@/pages/Mockup";
import Marketplace from "@/pages/Marketplace";
import MonCompte from "@/pages/MonCompte";
import Achat from "@/pages/Achat";
import Parametres from "@/pages/Parametres";
import Admin from "@/pages/Admin";
import ConsoleLogin from "@/pages/console/ConsoleLogin";
import PublicVision from "@/pages/PublicVision";
import TarifsEmbed from "@/pages/TarifsEmbed";
import ExerciceEmbed from "@/pages/ExerciceEmbed";
import Confidentialite from "@/pages/Confidentialite";
import Partager from "@/pages/Partager";
import Entreprise from "@/pages/Entreprise";
import EntrepriseRejoindre from "@/pages/EntrepriseRejoindre";
import ConfidentialiteEmbed from "@/pages/ConfidentialiteEmbed";
import Landing from "@/pages/Landing";
import Activer from "@/pages/Activer";
import DecouvrirZayado from "@/pages/DecouvrirZayado";
import Programmes from "@/pages/Programmes";
import IaLanding from "@/pages/marketing/IaLanding";
import IaFeature from "@/pages/marketing/IaFeature";
import VisionObjectifs from "@/pages/marketing/VisionObjectifs";
import ProspectionCroissance from "@/pages/marketing/ProspectionCroissance";
import BienEtreDirigeant from "@/pages/marketing/BienEtreDirigeant";
import { useParams } from "react-router-dom";
import AccesGate from "@/components/kairos/AccesGate";
import AutoPush from "@/components/kairos/AutoPush";
import { getToken } from "@/lib/kairosApi";

// Deux apps séparées issues du même code — la saveur est choisie AU BUILD :
//   REACT_APP_FLAVOR=saas     → Cockpit IA Zayado (app.zayado.net)
//   REACT_APP_FLAVOR=console  → admin.zayado.net : console admin seule, sa propre porte
const FLAVOR = process.env.REACT_APP_FLAVOR || "saas";

// Aperçu développeur (preview Emergent / localhost) : le backend retombe alors
// sur le compte démo pour toute requête sans jeton (_mode_apercu côté serveur).
// La même règle côté interface : on ne force PAS la connexion en aperçu —
// c'est ce qui cassait le bouton « Ouvrir le compte test (Thomas) ».
const APERCU = typeof window !== "undefined" && /(preview\.emergentagent\.com|localhost|127\.0\.0\.1)/i.test(window.location.hostname);

function ProtectedRoute({ children }) {
  const location = useLocation();
  if (!getToken() && !APERCU) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return children;
}

// Mappe le slug d'URL (/ia/organisation-entrepreneur) vers la clé de contenu (organisation).
function IaFeatureRoute() {
  const { kind } = useParams();
  return <IaFeature kind={(kind || "organisation").split("-")[0]} />;
}

function App() {
  if (FLAVOR === "console") {
    return (
      <div className="App zy-app min-h-screen text-offwhite">
        <Toaster position="top-center" offset={84} theme="dark" richColors />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<ConsoleLogin />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    );
  }

  // Pages intégrées en iframe (Shopify / Instant) : rendu minimal, sans session,
  // sans chat ni visite guidée — rien qui puisse rediriger ou gêner la page hôte.
  if (window.location.pathname.startsWith("/embed/")) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/embed/tarifs" element={<TarifsEmbed />} />
          <Route path="/embed/exercice/:slug" element={<ExerciceEmbed />} />
          <Route path="/embed/confidentialite" element={<ConfidentialiteEmbed />} />
          <Route path="*" element={<TarifsEmbed />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <div className="App zy-app min-h-screen text-offwhite">
      <AuroraBackground />
      <Toaster position="top-center" offset={84} theme="dark" richColors />
      <I18nProvider>
        <KairosProvider>
          <BrowserRouter>
          <GlobalChat />
          <GuidedTour />
          <InstallBanner />
          <AccesGate />
          <AutoPush />
          <Routes>
            <Route path="/" element={getToken() ? <Navigate to="/app" replace /> : <Landing />} />
            <Route path="/accueil" element={<Landing />} />
            <Route path="/decouvrir-zayado" element={<DecouvrirZayado />} />
            <Route path="/ia" element={<IaLanding />} />
            <Route path="/ia/:kind" element={<IaFeatureRoute />} />
            <Route path="/fonctionnalites/vision-objectifs" element={<VisionObjectifs />} />
            <Route path="/fonctionnalites/prospection-croissance" element={<ProspectionCroissance />} />
            <Route path="/fonctionnalites/bien-etre-dirigeant" element={<BienEtreDirigeant />} />
            <Route path="/login" element={<Login />} />
            <Route path="/legal/confidentialite" element={<Confidentialite />} />
            <Route path="/diagnostic" element={<Diagnostic />} />
            <Route path="/connexion-externe" element={<ProtectedRoute><ConnexionExterne /></ProtectedRoute>} />
            <Route path="/app/diagnostic" element={<ProtectedRoute><Diagnostic enApp /></ProtectedRoute>} />
            {/* Lien public en lecture seule d'un Vision Board (sans compte) */}
            <Route path="/v/:token" element={<PublicVision />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/activer" element={<ProtectedRoute><Activer /></ProtectedRoute>} />
            <Route path="/app" element={<ProtectedRoute><Cockpit /></ProtectedRoute>} />
            <Route path="/app/radar" element={<ProtectedRoute><Radar /></ProtectedRoute>} />
            <Route path="/app/actions" element={<ProtectedRoute><Actions /></ProtectedRoute>} />
            <Route path="/app/vision" element={<ProtectedRoute><VisionBoard /></ProtectedRoute>} />
            <Route path="/app/revue" element={<ProtectedRoute><WeeklyReview /></ProtectedRoute>} />
            <Route path="/app/entreprise/rejoindre" element={<EntrepriseRejoindre />} />
            <Route path="/app/entreprise" element={<ProtectedRoute><Entreprise /></ProtectedRoute>} />
            <Route path="/app/partager" element={<ProtectedRoute><Partager /></ProtectedRoute>} />
            <Route path="/app/ideas" element={<ProtectedRoute><Ideas /></ProtectedRoute>} />
            <Route path="/app/sources" element={<ProtectedRoute><Sources /></ProtectedRoute>} />
            {/* L'ancienne Feuille de route est fusionnée dans le Plan d'action (plus de doublon). */}
            <Route path="/app/roadmap" element={<Navigate to="/app/actions?tab=objectifs" replace />} />
            <Route path="/app/bien-etre" element={<ProtectedRoute><BienEtre /></ProtectedRoute>} />
            <Route path="/app/debloquer" element={<ProtectedRoute><Debloquer /></ProtectedRoute>} />
            <Route path="/app/ma-foi" element={<ProtectedRoute><MaFoi /></ProtectedRoute>} />
            <Route path="/app/agents" element={<ProtectedRoute><Agents /></ProtectedRoute>} />
            <Route path="/app/reprise" element={<Navigate to="/app/entreprise?vue=reprise" replace />} />
            <Route path="/app/chatbot-b2b" element={<ProtectedRoute><ChatbotB2B /></ProtectedRoute>} />
            <Route path="/app/processus" element={<ProtectedRoute><Processus /></ProtectedRoute>} />
            <Route path="/app/collaborateurs" element={<ProtectedRoute><Collaborateur /></ProtectedRoute>} />
            {/* L'espace vendeur est privé et distinct de la marketplace publique Shopify. */}
            <Route path="/espace-vendeur" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
            <Route path="/app/marketplace" element={<Navigate to="/espace-vendeur" replace />} />
            <Route path="/mon-espace" element={<Navigate to="/compte?vue=achats" replace />} />
            <Route path="/compte" element={<ProtectedRoute><MonCompte /></ProtectedRoute>} />
            <Route path="/acheter" element={<ProtectedRoute><Achat /></ProtectedRoute>} />
            <Route path="/parametres" element={<ProtectedRoute><Parametres /></ProtectedRoute>} />
            <Route path="/programmes" element={<ProtectedRoute><Programmes /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/partenaires/thesustain" element={<PartenariatTheSustain />} />
            <Route path="/compte/liaison" element={<ProtectedRoute><LiaisonCompte /></ProtectedRoute>} />
            <Route path="/pricing/success" element={<PricingSuccess />} />
            <Route path="/mockup/:page/:variant" element={<Mockup />} />
          </Routes>
          </BrowserRouter>
        </KairosProvider>
      </I18nProvider>
    </div>
  );
}

export default App;
