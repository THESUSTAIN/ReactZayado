import React from "react";
import LegacyApp from "./App.jsx";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";

import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

import Landing, { PublicHeader, UnifiedFooter } from "@/pages/LandingHub";
import WPSiteSettings from "@/components/WPSiteSettings";
import MyExtensionAI from "@/pages/MyExtensionAI";
import MyExtensionSeoPage from "@/pages/MyExtensionSeoPage";
import Vision from "@/pages/Vision";
import AntiBurnout from "@/pages/AntiBurnout";
import Echeances from "@/pages/Echeances";
import InstanceDediee from "@/pages/InstanceDediee";
import ExpansionAgent from "@/pages/ExpansionAgent";
import TesterSonProjet from "@/pages/TesterSonProjet";
import ValiderSonProjet from "@/pages/ValiderSonProjet";
import PublicBoutique from "@/pages/PublicBoutique";
import Apropos from "@/pages/Apropos";
import Blog from "@/pages/Blog";
import CreationEntreprise from "@/pages/CreationEntreprise";
import Tarifs from "@/pages/Tarifs";
import Contact from "@/pages/Contact";
import FAQ from "@/pages/FAQ";
import SimulateursHub from "@/pages/SimulateursHub";
import NosServices from "@/pages/NosServices";
import ServiceTunnel from "@/pages/ServiceTunnel";
import Avantages from "@/pages/Avantages";
import Temoignages from "@/pages/Temoignages";
import VisionBoardPublic from "@/pages/VisionBoardPublic";
import WordPressPage from "@/pages/WordPressPage";
import LegacyPreview from "@/components/LegacyPreview";
import CGV from "@/pages/legal/CGV";
import ConditionsUtilisation from "@/pages/legal/ConditionsUtilisation";
import Confidentialite from "@/pages/legal/Confidentialite";
import LivraisonRetours from "@/pages/legal/LivraisonRetours";
import MentionsLegales from "@/pages/legal/MentionsLegales";

// Auto-detect basename so the same build works:
//  - in production (zayado.net) → basename = "/"
//  - in Emergent preview (/api/preview-site/) → basename = "/api/preview-site"
const __preview_prefix = "/api/preview-site";
const __basename = typeof window !== "undefined"
  && window.location.pathname.startsWith(__preview_prefix)
  ? __preview_prefix
  : "/";
const __host = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
const __isAppHost = /^(app\.)?myextension-ai\.com$/.test(__host) || /^app\.zayado\.net$/.test(__host);
const __isAppPath = typeof window !== "undefined" && window.location.pathname === "/app" || typeof window !== "undefined" && window.location.pathname.startsWith("/app/");
const __isAppMode = __isAppHost || __isAppPath;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {__isAppMode ? (
      <LegacyApp basename={__isAppPath && !__isAppHost ? "/app" : "/"} />
    ) : (
    <HelmetProvider>
      <WPSiteSettings />
      <BrowserRouter basename={__basename}>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Landing />} />

              {/* SaaS landings + conversion tunnels */}
              <Route path="/myextension-ai" element={<MyExtensionAI />} />
              <Route path="/myextension-ai/vision" element={<MyExtensionSeoPage type="vision" />} />
              <Route path="/myextension-ai/pilotage-financier" element={<MyExtensionSeoPage type="finance" />} />
              <Route path="/myextension-ai/espace-travail" element={<MyExtensionSeoPage type="work" />} />
              <Route path="/myextension-ai/energie" element={<MyExtensionSeoPage type="energy" />} />
              <Route path="/vision" element={<Vision />} />
              <Route path="/anti-burnout" element={<AntiBurnout />} />
              <Route path="/echeances" element={<Echeances />} />
              <Route path="/instance-dediee" element={<InstanceDediee />} />
              <Route path="/expansion-agent" element={<ExpansionAgent />} />
              <Route path="/valider-son-projet" element={<ValiderSonProjet />} />
              <Route path="/tester-son-projet" element={<TesterSonProjet />} />

              {/* SEO public pages — Création (custom React) + Simulators (legacy HTML iframed from app-main) */}
              <Route path="/creation-entreprise" element={<CreationEntreprise />} />
              <Route path="/simulateurs" element={<SimulateursHub />} />
              <Route path="/nos-services" element={<NosServices />} />
              <Route path="/avantages" element={<Avantages />} />
              <Route path="/services/finance-pilotage" element={<ServiceTunnel />} />
              <Route path="/services/gestion-administrative" element={<ServiceTunnel />} />
              <Route path="/services/creation-structuration" element={<ServiceTunnel />} />
              <Route path="/services/cession-reprise" element={<ServiceTunnel />} />
              <Route path="/simulateur-rentabilite" element={
                <LegacyPreview
                  src={`${__basename === "/" ? "" : __basename}/preview/simulateur-rentabilite.html`}
                  title="Simulateur de Rentabilité Gratuit pour Entreprise | ZAYADO"
                  description="Testez la viabilité financière de votre projet en 2 minutes. Calculez vos marges, vos prévisions de croissance et validez la rentabilité de votre future activité."
                />
              } />
              <Route path="/simulateur-statut-juridique" element={
                <LegacyPreview
                  src={`${__basename === "/" ? "" : __basename}/preview/simulateur-statut-juridique.html`}
                  title="Quel Statut Juridique Choisir ? Simulateur Gratuit | ZAYADO"
                  description="SASU, EURL, Auto-entrepreneur ? Répondez à quelques questions et découvrez instantanément le statut idéal pour optimiser vos impôts et protéger votre patrimoine."
                />
              } />
              <Route path="/analyse-sante-financiere" element={
                <LegacyPreview
                  src={`${__basename === "/" ? "" : __basename}/preview/analyse-financiere.html`}
                  title="Analyse Santé Financière Gratuite pour Entreprise | ZAYADO"
                  description="Diagnostiquez la santé financière de votre activité : rentabilité, endettement, solvabilité. Recevez votre rapport gratuit en 2 minutes."
                />
              } />

              {/* Aliases /fr/... → same components for FR-prefixed SEO URLs */}
              <Route path="/fr/creation-entreprise" element={<CreationEntreprise />} />
              <Route path="/fr/simulateurs" element={<SimulateursHub />} />
              <Route path="/fr/nos-services" element={<NosServices />} />
              <Route path="/fr/avantages" element={<Avantages />} />
              <Route path="/fr/simulateur-rentabilite" element={
                <LegacyPreview
                  src={`${__basename === "/" ? "" : __basename}/preview/simulateur-rentabilite.html`}
                  title="Simulateur de Rentabilité Gratuit pour Entreprise | ZAYADO"
                  description="Testez la viabilité financière de votre projet en 2 minutes. Calculez vos marges, vos prévisions de croissance et validez la rentabilité de votre future activité."
                />
              } />
              <Route path="/fr/simulateur-statut-juridique" element={
                <LegacyPreview
                  src={`${__basename === "/" ? "" : __basename}/preview/simulateur-statut-juridique.html`}
                  title="Quel Statut Juridique Choisir ? Simulateur Gratuit | ZAYADO"
                  description="SASU, EURL, Auto-entrepreneur ? Répondez à quelques questions et découvrez instantanément le statut idéal pour optimiser vos impôts et protéger votre patrimoine."
                />
              } />
              <Route path="/fr/analyse-sante-financiere" element={
                <LegacyPreview
                  src={`${__basename === "/" ? "" : __basename}/preview/analyse-financiere.html`}
                  title="Analyse Santé Financière Gratuite pour Entreprise | ZAYADO"
                  description="Diagnostiquez la santé financière de votre activité : rentabilité, endettement, solvabilité. Recevez votre rapport gratuit en 2 minutes."
                />
              } />

              {/* Pages publiques avec le header/footer de LandingHub */}
              <Route path="/a-propos" element={
                <div className="min-h-screen flex flex-col" style={{ background: "var(--zayado-cream)" }}>
                  <PublicHeader />
                  <main className="flex-1"><Apropos /></main>
                  <UnifiedFooter />
                </div>
              } />
              <Route path="/blog" element={
                <div className="min-h-screen flex flex-col" style={{ background: "var(--zayado-cream)" }}>
                  <PublicHeader />
                  <main className="flex-1"><Blog /></main>
                  <UnifiedFooter />
                </div>
              } />
              <Route path="/blog/:slug" element={
                <div className="min-h-screen flex flex-col" style={{ background: "var(--zayado-cream)" }}>
                  <PublicHeader />
                  <main className="flex-1"><Blog /></main>
                  <UnifiedFooter />
                </div>
              } />

              {/* PublicBoutique is the Kiabi-style shop wrapper (header + nav + footer) */}
              <Route path="/boutique" element={<PublicBoutique />} />
              <Route path="/boutique/recherche" element={<PublicBoutique />} />
              <Route path="/boutique/:slug" element={<PublicBoutique />} />
              <Route path="/shop" element={<PublicBoutique />} />
              <Route path="/shop/recherche" element={<PublicBoutique />} />
              <Route path="/shop/selection" element={<PublicBoutique />} />
              <Route path="/shop/:slug" element={<PublicBoutique />} />
              <Route path="/favoris" element={<PublicBoutique />} />
              <Route path="/panier" element={<PublicBoutique />} />
              <Route path="/checkout" element={<PublicBoutique />} />
              <Route path="/contact" element={
                <div className="min-h-screen flex flex-col" style={{ background: "var(--zayado-cream)" }}>
                  <PublicHeader />
                  <main className="flex-1"><Contact /></main>
                  <UnifiedFooter />
                </div>
              } />
              <Route path="/faq" element={
                <div className="min-h-screen flex flex-col" style={{ background: "var(--zayado-cream)" }}>
                  <PublicHeader />
                  <main className="flex-1"><FAQ /></main>
                  <UnifiedFooter />
                </div>
              } />
              <Route path="/login" element={<Navigate to="/app/login" replace />} />
              <Route path="/tarifs" element={<Tarifs />} />
              <Route path="/fr/tarifs" element={<Tarifs />} />
              <Route path="/compte" element={<PublicBoutique />} />
              <Route path="/compte/commandes" element={<PublicBoutique />} />
              <Route path="/compte/profil" element={<PublicBoutique />} />
              <Route path="/compte/preferences" element={<PublicBoutique />} />

              {/* Legacy pages — same wrapper, distinct page content */}
              <Route path="/roadmap" element={<PublicBoutique />} />
              <Route path="/services-pro" element={<PublicBoutique />} />
              <Route path="/partenaires" element={<PublicBoutique />} />
              <Route path="/partenaires/recherche" element={<PublicBoutique />} />
              <Route path="/devenir-partenaire" element={<PublicBoutique />} />
              <Route path="/equipe" element={<PublicBoutique />} />
              <Route path="/groupement" element={<PublicBoutique />} />

              {/* Legal pages — own layout */}
              <Route path="/legal/cgv" element={<CGV />} />
              <Route path="/legal/conditions-utilisation" element={<ConditionsUtilisation />} />
              <Route path="/legal/confidentialite" element={<Confidentialite />} />
              <Route path="/legal/livraison-retours" element={<LivraisonRetours />} />
              <Route path="/legal/mentions-legales" element={<MentionsLegales />} />

              {/* WordPress catch-all — n'importe quelle page WP publiée */}
              <Route path="/wp/:slug" element={<WordPressPage />} />
              <Route path="/page/:slug" element={<WordPressPage />} />
              <Route path="/vision-board" element={<VisionBoardPublic />} />
              {/* Témoignages page CACHÉE (demande user) — pas de route publique */}

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
    )}
  </React.StrictMode>
);
