import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { KairosProvider } from "@/context/KairosContext";
import { I18nProvider } from "@/i18n";
import { AuroraBackground } from "@/components/aurora/AuroraBackground";
import Onboarding from "@/pages/Onboarding";
import Cockpit from "@/pages/Cockpit";
import Radar from "@/pages/Radar";
import Actions from "@/pages/Actions";
import Login from "@/pages/Login";
import VisionBoard from "@/pages/VisionBoard";
import WeeklyReview from "@/pages/WeeklyReview";
import Ideas from "@/pages/Ideas";
import Sources from "@/pages/Sources";
import BienEtre from "@/pages/BienEtre";
import Agents from "@/pages/Agents";
import ChatbotB2B from "@/pages/ChatbotB2B";
import Processus from "@/pages/Processus";
import Collaborateur from "@/pages/Collaborateur";
import Roadmap from "@/pages/Roadmap";
import Pricing from "@/pages/Pricing";
import PricingSuccess from "@/pages/PricingSuccess";
import Mockup from "@/pages/Mockup";
import Parametres from "@/pages/Parametres";
import Marketplace from "@/pages/Marketplace";
import Admin from "@/pages/Admin";
import ConsoleLogin from "@/pages/console/ConsoleLogin";
import PublicVision from "@/pages/PublicVision";
import { getToken } from "@/lib/kairosApi";

// Deux apps séparées issues du même code — la saveur est choisie AU BUILD :
//   REACT_APP_FLAVOR=saas     → Cockpit IA Zayado (app.zayado.net) : cockpit + espace VENDEUR inclus
//                               (un utilisateur peut être vendeur, même compte)
//   REACT_APP_FLAVOR=console  → admin.zayado.net : console admin seule, sa propre porte
const FLAVOR = process.env.REACT_APP_FLAVOR || "saas";

function ProtectedRoute({ children }) {
  const location = useLocation();
  if (!getToken()) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return children;
}

function App() {
  if (FLAVOR === "console") {
    return (
      <div className="App min-h-screen text-offwhite">
        <Toaster position="top-center" theme="dark" richColors />
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

  return (
    <div className="App min-h-screen text-offwhite">
      <AuroraBackground />
      <Toaster position="top-center" theme="dark" richColors />
      <I18nProvider>
        <KairosProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            {/* Lien public en lecture seule d'un Vision Board (sans compte) */}
            <Route path="/v/:token" element={<PublicVision />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/app" element={<ProtectedRoute><Cockpit /></ProtectedRoute>} />
            <Route path="/app/radar" element={<ProtectedRoute><Radar /></ProtectedRoute>} />
            <Route path="/app/actions" element={<ProtectedRoute><Actions /></ProtectedRoute>} />
            <Route path="/app/vision" element={<ProtectedRoute><VisionBoard /></ProtectedRoute>} />
            <Route path="/app/revue" element={<ProtectedRoute><WeeklyReview /></ProtectedRoute>} />
            <Route path="/app/ideas" element={<ProtectedRoute><Ideas /></ProtectedRoute>} />
            <Route path="/app/sources" element={<ProtectedRoute><Sources /></ProtectedRoute>} />
            <Route path="/app/roadmap" element={<ProtectedRoute><Roadmap /></ProtectedRoute>} />
            <Route path="/app/bien-etre" element={<ProtectedRoute><BienEtre /></ProtectedRoute>} />
            <Route path="/app/agents" element={<ProtectedRoute><Agents /></ProtectedRoute>} />
            <Route path="/app/chatbot-b2b" element={<ProtectedRoute><ChatbotB2B /></ProtectedRoute>} />
            <Route path="/app/processus" element={<ProtectedRoute><Processus /></ProtectedRoute>} />
            <Route path="/app/collaborateurs" element={<ProtectedRoute><Collaborateur /></ProtectedRoute>} />
            <Route path="/app/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
            <Route path="/parametres" element={<ProtectedRoute><Parametres /></ProtectedRoute>} />
            <Route path="/pricing" element={<Pricing />} />
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
