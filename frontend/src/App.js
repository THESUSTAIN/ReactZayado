import { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import CampusLayout from "./components/CampusLayout";
import ChatPanel from "./components/ChatPanel";
import Pilotage from "./pages/Pilotage";
import Croissance from "./pages/Croissance";
import Travail from "./pages/Travail";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import VisionBoard from "./pages/VisionBoard";
import BienEtre from "./pages/BienEtre";
import Aujourdhui from "./pages/Aujourdhui";
import Contexte from "./pages/Contexte";
import Collaborateur from "./pages/Collaborateur";
import TheSustain from "./pages/TheSustain";
import Campus from "./pages/Campus";
import { authMe } from "./lib/api";

// Accueil : "Aujourd'hui", porte d'entree quotidienne Cap Vivant (tache #21 —
// avant : le Vision Board abstrait etait l'accueil direct, remplace ici par
// un vrai point de depart quotidien). Sur mobile, pas de panneau lateral
// possible a cette largeur : c'est le copilote qui EST l'accueil mobile,
// en plein ecran (demande explicite conservee).
function AppHome() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 769);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 769);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  useEffect(() => {
    if (!isMobile) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overscrollBehavior = previousOverscroll;
    };
  }, [isMobile]);
  if (isMobile) {
    return (
      <div className="fixed inset-x-0 top-[58px] bottom-[72px] z-10 overflow-hidden overscroll-none bg-[#0B1F3A]" data-testid="mobile-copilot-home">
        <ChatPanel context="Accueil quotidien Cap Vivant." />
      </div>
    );
  }
  return <Aujourdhui />;
}

// TheSustain est une entrée volontaire réservée aux comptes liés à
// l’association. Une valeur absente ou une session inconnue vaut toujours
// « non-membre » : le module n’est pas exposé par un lien direct.
function TheSustainAccess() {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    authMe()
      .then((user) => setAllowed(Boolean(user?.thesustain_member)))
      .catch(() => setAllowed(false))
      .finally(() => setChecking(false));
  }, []);
  if (checking) return <div className="glass flex min-h-48 items-center justify-center text-sm text-white/60">Vérification de l’accès…</div>;
  return allowed ? <TheSustain /> : <Navigate to="/contexte" replace />;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<AppHome />} />
            <Route path="/vision" element={<VisionBoard />} />
            <Route path="/mouvement" element={<Travail />} />
            <Route path="/mindset" element={<BienEtre />} />
            <Route path="/contexte" element={<Contexte />} />
            <Route path="/collaborateur" element={<Collaborateur />} />
            <Route path="/thesustain" element={<TheSustainAccess />} />
            {/* Anciennes routes conservees comme alias — evite un 404 si un
                lien/favori pointe encore vers l'ancien chemin (tache #40). */}
            <Route path="/travail" element={<Travail />} />
            <Route path="/bien-etre" element={<BienEtre />} />
            <Route path="/pilotage" element={<Pilotage />} />
            <Route path="/croissance" element={<Croissance />} />
          </Route>
          <Route element={<CampusLayout />}>
            <Route path="/campus" element={<Campus activeSection="today" />} />
            <Route path="/campus/entreprise" element={<Campus activeSection="enterprise" />} />
            <Route path="/campus/missions" element={<Campus activeSection="missions" />} />
            <Route path="/campus/coach" element={<Campus activeSection="coach" />} />
            <Route path="/campus/progression" element={<Campus activeSection="progress" />} />
            <Route path="/campus/portfolio" element={<Campus activeSection="portfolio" />} />
            <Route path="/campus/alternance" element={<Campus activeSection="alternance" />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}

export default App;
