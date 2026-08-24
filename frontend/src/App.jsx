import React, { useEffect, useState } from "react";
import "./App.css";
import "./app-cockpit.css";
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
import CampusComingSoon from "./pages/CampusComingSoon";
import { authMe } from "./lib/api";
// ── Pages publiques (site marketing zayado.net) ──────────────────────────
import Landing from "./pages/Landing";
import NosServices from "./pages/NosServices";
import Tarifs from "./pages/Tarifs";
import Apropos from "./pages/Apropos";
import FAQ from "./pages/FAQ";
import Temoignages from "./pages/Temoignages";
import Blog from "./pages/Blog";
import CreationEntreprise from "./pages/CreationEntreprise";
import Contact from "./pages/Contact";
import LegalPage from "./pages/LegalPage";
import PublicBoutique from "./pages/PublicBoutique";
import ShopSelection from "./pages/ShopSelection";
import ShopSeoCategory from "./pages/ShopSeoCategory";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import VisionBoardPublic from "./pages/VisionBoardPublic";
import AntiBurnout from "./pages/AntiBurnout";
import Avantages from "./pages/Avantages";
import TesterSonProjet from "./pages/TesterSonProjet";
import ValiderSonProjet from "./pages/ValiderSonProjet";
import ServiceTunnel from "./pages/ServiceTunnel";
import InstanceDediee from "./pages/InstanceDediee";
import ExpansionAgent from "./pages/ExpansionAgent";
import SimulateursHub from "./pages/SimulateursHub";
import MyExtensionAI from "./pages/MyExtensionAI";
import LoginBoutique from "./pages/LoginBoutique";
import Echeances from "./pages/Echeances";
import Favorites from "./pages/Favorites";
import Account from "./pages/Account";

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
      <div className="fixed inset-0 z-[150] overflow-hidden overscroll-none bg-[#0B1F3A]" data-testid="mobile-copilot-home">
        <ChatPanel
          context="Accueil quotidien Cap Vivant."
          onMenu={() => window.dispatchEvent(new CustomEvent("cours:open-mobile-nav"))}
        />
      </div>
    );
  }
  return <Aujourdhui />;
}

// Racine "/" : le même domaine sert à la fois le site public (zayado.net) et
// l'app connectée (app.zayado.net). On distingue par l'état d'authentification
// plutôt que par domaine, pour que le même build serve les deux correctement.
function Root() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => {
    authMe()
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false))
      .finally(() => setChecking(false));
  }, []);
  if (checking) return <div className="min-h-screen bg-[#0B1F3A]" />;
  return authenticated ? <AppHome /> : <Landing />;
}

// Wrappers legers pour les pages /legal/* qui attendent slug + title en props.
const LegalMentions = () => <LegalPage slug="mentions-legales" title="Mentions légales" />;
const LegalCGV = () => <LegalPage slug="cgv" title="Conditions générales de vente" />;
const LegalCGU = () => <LegalPage slug="conditions-utilisation" title="Conditions générales d'utilisation" />;
const LegalConfidentialite = () => <LegalPage slug="confidentialite" title="Confidentialité" />;
const LegalPolitiqueConfidentialite = () => <LegalPage slug="politique-confidentialite" title="Politique de confidentialité" />;

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
          <Route path="/login" element={<Login />} />
          <Route path="/login-boutique" element={<LoginBoutique />} />
          <Route path="/onboarding" element={<Onboarding />} />

          {/* ── Site public zayado.net — hors Layout authentifié ── */}
          <Route path="/" element={<Root />} />
          <Route path="/nos-services" element={<NosServices />} />
          <Route path="/tarifs" element={<Tarifs />} />
          <Route path="/a-propos" element={<Apropos />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/temoignages" element={<Temoignages />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<Blog />} />
          <Route path="/creation-entreprise" element={<CreationEntreprise />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/myextension-ai" element={<MyExtensionAI />} />
          <Route path="/expansion-agent" element={<ExpansionAgent />} />
          <Route path="/vision-board" element={<VisionBoardPublic />} />
          <Route path="/anti-burnout" element={<AntiBurnout />} />
          <Route path="/avantages" element={<Avantages />} />
          <Route path="/tester-son-projet" element={<TesterSonProjet />} />
          <Route path="/valider-son-projet" element={<ValiderSonProjet />} />
          <Route path="/instance-dediee" element={<InstanceDediee />} />
          <Route path="/simulateurs" element={<SimulateursHub />} />
          <Route path="/echeances" element={<Echeances />} />
          <Route path="/services/finance-pilotage" element={<ServiceTunnel />} />
          <Route path="/services/creation-structuration" element={<ServiceTunnel />} />
          <Route path="/services/gestion-administrative" element={<ServiceTunnel />} />
          <Route path="/services/cession-reprise" element={<ServiceTunnel />} />
          <Route path="/legal/mentions-legales" element={<LegalMentions />} />
          <Route path="/legal/cgv" element={<LegalCGV />} />
          <Route path="/legal/conditions-utilisation" element={<LegalCGU />} />
          <Route path="/legal/confidentialite" element={<LegalConfidentialite />} />
          <Route path="/legal/politique-confidentialite" element={<LegalPolitiqueConfidentialite />} />

          {/* ── Boutique publique — PublicBoutique gère en interne Boutique/
                BoutiqueSearch/BoutiqueProduct selon le chemin exact ── */}
          <Route path="/boutique" element={<PublicBoutique />} />
          <Route path="/boutique/recherche" element={<PublicBoutique />} />
          <Route path="/boutique/:slug" element={<PublicBoutique />} />
          <Route path="/shop/selection" element={<ShopSelection />} />
          <Route path="/shop/:seoSlug" element={<ShopSeoCategory />} />
          <Route path="/panier" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/favoris" element={<Favorites />} />
          <Route path="/compte" element={<Account />} />
          <Route path="/compte/commandes" element={<Account />} />
          <Route path="/compte/profil" element={<Account />} />
          <Route path="/compte/preferences" element={<Account />} />
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" position="top-right" richColors />
    </div></AppErrorBoundary>
  );
}

export default App;
