import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { KairosProvider } from "@/context/KairosContext";
import { I18nProvider } from "@/i18n";
import { AuroraBackground } from "@/components/aurora/AuroraBackground";
import Landing from "@/pages/Landing";
import VisionObjectifs from "@/pages/marketing/VisionObjectifs";
import ProspectionCroissance from "@/pages/marketing/ProspectionCroissance";
import BienEtreDirigeant from "@/pages/marketing/BienEtreDirigeant";
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

// Deux apps séparées issues du même code — la saveur est choisie AU BUILD :
//   REACT_APP_FLAVOR=saas     → Kairos (app.zayado.net) : cockpit + espace VENDEUR inclus
//                               (un utilisateur peut être vendeur, même compte)
//   REACT_APP_FLAVOR=console  → admin.zayado.net : console admin seule, sa propre porte
const FLAVOR = process.env.REACT_APP_FLAVOR || "saas";

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
            <Route path="/" element={<Landing />} />
            <Route path="/fonctionnalites/vision-objectifs" element={<VisionObjectifs />} />
            <Route path="/fonctionnalites/prospection-croissance" element={<ProspectionCroissance />} />
            <Route path="/fonctionnalites/bien-etre-dirigeant" element={<BienEtreDirigeant />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/app" element={<Cockpit />} />
            <Route path="/app/radar" element={<Radar />} />
            <Route path="/app/actions" element={<Actions />} />
            <Route path="/app/vision" element={<VisionBoard />} />
            <Route path="/app/revue" element={<WeeklyReview />} />
            <Route path="/app/ideas" element={<Ideas />} />
            <Route path="/app/sources" element={<Sources />} />
            <Route path="/app/roadmap" element={<Roadmap />} />
            <Route path="/app/bien-etre" element={<BienEtre />} />
            <Route path="/app/agents" element={<Agents />} />
            <Route path="/app/chatbot-b2b" element={<ChatbotB2B />} />
            <Route path="/app/processus" element={<Processus />} />
            <Route path="/app/collaborateurs" element={<Collaborateur />} />
            <Route path="/app/marketplace" element={<Marketplace />} />
            <Route path="/parametres" element={<Parametres />} />
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
