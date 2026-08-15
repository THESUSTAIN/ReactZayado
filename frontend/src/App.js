import { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import ChatPanel from "./components/ChatPanel";
import Pilotage from "./pages/Pilotage";
import VisionBoard from "./pages/VisionBoard";
import BienEtre from "./pages/BienEtre";
import { seed, getFactures } from "./lib/api";

// Accueil : Vision Board (4 onglets) sur desktop — le copilote est déjà dans
// le panneau de droite (Layout.jsx). Sur mobile, pas de panneau latéral
// possible à cette largeur : c'est le copilote qui EST l'accueil, en plein
// écran (demande explicite : le chat doit être en mode accueil sur mobile).
function AppHome() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 769);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 769);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-10 bg-transparent" data-testid="mobile-copilot-home">
        <ChatPanel context="Vision de l'entrepreneur: objectifs, alignement, mindset." />
      </div>
    );
  }
  return <VisionBoard />;
}

function App() {
  useEffect(() => {
    // Seed demo data on first run if empty
    getFactures().then((f) => {
      if (!f || f.length === 0) seed().catch(() => {});
    }).catch(() => {});
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<AppHome />} />
            <Route path="/pilotage" element={<Pilotage />} />
            <Route path="/vision" element={<VisionBoard />} />
            <Route path="/bien-etre" element={<BienEtre />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}

export default App;
