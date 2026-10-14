import { useEffect, Component } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Lenis from "lenis";
import { Toaster } from "sonner";
import Nav from "@/components/Nav";
import AppHeader from "@/components/AppHeader";
import FunnelHeader from "@/components/FunnelHeader";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Besoins from "@/pages/Besoins";
import TunnelHome from "@/pages/TunnelHome";
import Merci from "@/pages/Merci";
import FichePage from "@/pages/FichePage";
import BoxPreco from "@/pages/BoxPreco";
import Favoris from "@/pages/Favoris";
import Services from "@/pages/Services";
import Marketplace from "@/pages/Marketplace";
import BoxPage from "@/pages/BoxPage";
import TunnelPage from "@/pages/TunnelPage";
import Journal from "@/pages/Journal";
import JournalArticle from "@/pages/JournalArticle";
import Checkout from "@/pages/Checkout";
import PaymentResult from "@/pages/PaymentResult";
import Vision from "@/pages/Vision";
import MaisonPage from "@/pages/MaisonPage";
import ComingSoon from "@/pages/ComingSoon";
import HeroChoix from "@/pages/HeroChoix";
import Cockpit from "@/pages/Cockpit";
import Diagnostic from "@/pages/Diagnostic";
import Panier from "@/pages/Panier";
import { CartProvider, FavProvider } from "@/context/CartContext";

const BARE_PATHS = ["/coming-soon", "/hero-choix"];
// Zone « appli » : header dédié (juste un bouton qui ramène vers la marketplace)
const APP_PATHS = ["/cockpit", "/diagnostic"];
// Zone « tunnel » : zéro distraction — juste un bouton diagnostic
const FUNNEL_PATHS = ["/tunnel-home", "/merci"];

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        setTimeout(() => {
          window.__lenis ? window.__lenis.scrollTo(el, { offset: -90 }) : el.scrollIntoView({ behavior: "smooth" });
        }, 90);
        return;
      }
    }
    window.__lenis ? window.__lenis.scrollTo(0, { immediate: true }) : window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: "140px 24px", textAlign: "center", fontFamily: "Poppins" }}>
          <h1 className="text-3xl font-semibold">Oups.</h1>
          <p className="mt-3 opacity-70">Une erreur est survenue.{" "}
            <a href="/" style={{ color: "var(--gold)" }}>Retour à l’accueil</a></p>
        </div>
      );
    }
    return this.props.children;
  }
}

function Shell() {
  const { pathname } = useLocation();
  const bare = BARE_PATHS.includes(pathname);
  const appZone = APP_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const funnelZone = FUNNEL_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  return (
    <div className="grain">
      <ScrollManager />
      {!bare && funnelZone && <FunnelHeader />}
      {!bare && appZone && <AppHeader cta={pathname.startsWith("/diagnostic") ? "Explorer la marketplace" : "Faire le diagnostic"} />}
      {!bare && !appZone && !funnelZone && <Nav />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/besoins" element={<Besoins />} />
          <Route path="/maison" element={<MaisonPage />} />
          <Route path="/diagnostic" element={<Diagnostic />} />
          <Route path="/services" element={<Services />} />
          <Route path="/tunnel/:slug" element={<TunnelPage />} />
          <Route path="/cockpit" element={<Cockpit />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/marketplace/:categorie" element={<Marketplace />} />
          <Route path="/panier" element={<Panier />} />
          <Route path="/box" element={<BoxPreco />} />
          <Route path="/box-v1" element={<BoxPage />} />
          <Route path="/tunnel-home" element={<TunnelHome />} />
          <Route path="/merci" element={<Merci />} />
          <Route path="/fiche/:slug" element={<FichePage />} />
          <Route path="/favoris" element={<Favoris />} />
          <Route path="/boutique" element={<Navigate to="/marketplace" replace />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/journal/:slug" element={<JournalArticle />} />
          <Route path="/coming-soon" element={<ComingSoon />} />
          <Route path="/hero-choix" element={<HeroChoix />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/paiement/succes" element={<PaymentResult success />} />
          <Route path="/paiement/annulation" element={<PaymentResult />} />
          <Route path="/vision" element={<Vision />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!bare && <Footer />}
      <Toaster position="bottom-center" richColors />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    window.__lenis = lenis;
    let raf;
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); window.__lenis = null; };
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <CartProvider>
          <FavProvider>
            <Shell />
          </FavProvider>
        </CartProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
