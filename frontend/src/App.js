import React, { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import CampusLayout from "./components/CampusLayout";
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
import CampusComingSoon from "./pages/CampusComingSoon";
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Fonctionnalites from "./pages/Fonctionnalites";
import Demo from "./pages/Demo";
import CopiloteAgent from "./pages/CopiloteAgent";
import VisionProduit from "./pages/VisionProduit";
import { authMe } from "./lib/api";

// Un utilisateur déjà connecté qui ouvre la page de vente ou l'écran de
// connexion est renvoyé dans son espace. Sans cette garde, un client inscrit
// qui tapait simplement votre domaine retombait sur la page marketing —
// et l'écran de connexion s'affichait à quelqu'un déjà connecté.
function PublicOnly({ children }) {
  const hasSession = typeof window !== "undefined" && localStorage.getItem("cours_auth_token");
  // Exception nécessaire : un retour de lien magique (?token=) ou de
  // Google/Microsoft (?code=) atterrit sur /login. Rediriger à cet instant
  // parce qu'un ancien jeton traîne encore empêcherait la nouvelle session
  // de s'ouvrir — l'utilisateur resterait bloqué sur une session périmée.
  const authCallback = typeof window !== "undefined"
    && /[?&](token|code)=/.test(window.location.search);
  return hasSession && !authCallback ? <Navigate to="/" replace /> : children;
}

// Accueil : « Aujourd'hui », porte d'entrée quotidienne — la MÊME page sur
// mobile et sur PC. Auparavant, sur mobile, "/" affichait le chat en plein
// écran à la place de l'accueil, ce qui masquait aussi le header et la
// navigation basse (d'où « le menu mobile a disparu, et le header ? »).
// Le Copilote reste accessible partout depuis la navigation basse.
const AppHome = Aujourdhui;

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

class AppErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return <div style={{ minHeight: "100vh", background: "#0B1F3A", color: "#fff", padding: 32, fontFamily: "system-ui" }}><h1>Erreur de chargement V1</h1><p>{this.state.error.message}</p><pre style={{ whiteSpace: "pre-wrap", opacity: .7 }}>{this.state.error.stack}</pre></div>;
    return this.props.children;
  }
}

function App() {
  return (
    <AppErrorBoundary><div className="App">
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<AppHome />} />
            <Route path="/vision" element={<VisionBoard />} />
            <Route path="/mouvement" element={<Travail />} />
            <Route path="/taches" element={<Travail initialView="engagements" />} />
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
          <Route element={<Layout />}>
            <Route path="/campus" element={<CampusComingSoon />} />
            <Route path="/campus/entreprise" element={<CampusComingSoon />} />
            <Route path="/campus/missions" element={<CampusComingSoon />} />
            <Route path="/campus/coach" element={<CampusComingSoon />} />
            <Route path="/campus/progression" element={<CampusComingSoon />} />
            <Route path="/campus/portfolio" element={<CampusComingSoon />} />
            <Route path="/campus/alternance" element={<CampusComingSoon />} />
          </Route>
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/bienvenue" element={<PublicOnly><Landing /></PublicOnly>} />
          <Route path="/tarifs" element={<Pricing />} />
          <Route path="/fonctionnalites" element={<Fonctionnalites />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/copilote-agent-ia" element={<CopiloteAgent />} />
          <Route path="/produit-vision" element={<VisionProduit />} />
          <Route path="/onboarding" element={<Onboarding />} />
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" position="top-right" richColors />
    </div></AppErrorBoundary>
  );
}

export default App;
