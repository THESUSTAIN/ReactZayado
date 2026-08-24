import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import WPSiteSettings from "./components/WPSiteSettings";
import { PublicHeader, UnifiedFooter } from "./pages/LandingHub";
import Landing from "./pages/LandingHub";
import MyExtensionAI from "./pages/MyExtensionAI";
import Vision from "./pages/Vision";
import AntiBurnout from "./pages/AntiBurnout";
import Echeances from "./pages/Echeances";
import InstanceDediee from "./pages/InstanceDediee";
import ExpansionAgent from "./pages/ExpansionAgent";
import TesterSonProjet from "./pages/TesterSonProjet";
import ValiderSonProjet from "./pages/ValiderSonProjet";
import PublicBoutique from "./pages/PublicBoutique";
import LoginBoutique from "./pages/LoginBoutique";
import Apropos from "./pages/Apropos";
import Blog from "./pages/Blog";
import CreationEntreprise from "./pages/CreationEntreprise";
import Tarifs from "./pages/Tarifs";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import SimulateursHub from "./pages/SimulateursHub";
import NosServices from "./pages/NosServices";
import Avantages from "./pages/Avantages";
import ServiceDetail from "./pages/ServiceDetail";
import VisionBoardPublic from "./pages/VisionBoardPublic";
import WordPressPage from "./pages/WordPressPage";
import LegacyPreview from "./components/LegacyPreview";
import LegalLayout from "./components/LegalLayout";
import CGV from "./pages/legal/CGV";
import ConditionsUtilisation from "./pages/legal/ConditionsUtilisation";
import Confidentialite from "./pages/legal/Confidentialite";
import LivraisonRetours from "./pages/legal/LivraisonRetours";
import MentionsLegales from "./pages/legal/MentionsLegales";

const SITE = "https://zayado.net";
const PublicFrame = ({ children }) => (
  <div className="public-page min-h-screen flex flex-col" style={{ background: "var(--zayado-cream)" }}>
    <PublicHeader />
    <main className="flex-1">{children}</main>
    <UnifiedFooter />
  </div>
);

const SEO = ({ title, description, path }) => (
  <>
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={`${SITE}${path}`} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="ZAYADO" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={`${SITE}${path}`} />
    <meta property="og:image" content={`${SITE}/zayado-og.jpg`} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={`${SITE}/zayado-og.jpg`} />
  </>
);

function PageWithSeo({ title, description, path, children }) {
  return <PublicFrame><Helmet><SEO title={title} description={description} path={path} /></Helmet>{children}</PublicFrame>;
}

export default function PublicSiteRoutes() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <WPSiteSettings />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/myextension-ai" element={<MyExtensionAI />} />
            <Route path="/vision" element={<PageWithSeo title="Vision Board entrepreneur | ZAYADO" description="Construisez une vision claire de votre trajectoire entrepreneuriale et transformez-la en priorités concrètes." path="/vision"><Vision /></PageWithSeo>} />
            <Route path="/vision-board" element={<PageWithSeo title="Vision Board IA pour entrepreneurs | ZAYADO" description="Créez un Vision Board personnalisé et structurez votre trajectoire entrepreneuriale avec ZAYADO." path="/vision-board"><VisionBoardPublic /></PageWithSeo>} />
            <Route path="/anti-burnout" element={<AntiBurnout />} />
            <Route path="/echeances" element={<Echeances />} />
            <Route path="/instance-dediee" element={<InstanceDediee />} />
            <Route path="/expansion-agent" element={<ExpansionAgent />} />
            <Route path="/valider-son-projet" element={<ValiderSonProjet />} />
            <Route path="/tester-son-projet" element={<TesterSonProjet />} />
            <Route path="/creation-entreprise" element={<CreationEntreprise />} />
            <Route path="/nos-services" element={<NosServices />} />
            <Route path="/avantages" element={<Avantages />} />
            <Route path="/services/:slug" element={<ServiceDetail />} />
            <Route path="/services-pro" element={<NosServices />} />
            <Route path="/simulateurs" element={<SimulateursHub />} />
            <Route path="/simulateur-rentabilite" element={<LegacyPreview src="/public-site-preview/simulateur-rentabilite.html" title="Simulateur de rentabilité gratuit | ZAYADO" description="Calculez la rentabilité de votre projet, vos marges et votre point mort en quelques minutes." />} />
            <Route path="/simulateur-statut-juridique" element={<LegacyPreview src="/public-site-preview/simulateur-statut-juridique.html" title="Quel statut juridique choisir ? | ZAYADO" description="Comparez micro-entreprise, SASU et EURL avec notre simulateur gratuit." />} />
            <Route path="/analyse-sante-financiere" element={<LegacyPreview src="/public-site-preview/analyse-financiere.html" title="Analyse de santé financière | ZAYADO" description="Analysez rentabilité, trésorerie et solvabilité de votre activité." />} />
            <Route path="/tarifs" element={<Tarifs />} />
            <Route path="/a-propos" element={<PageWithSeo title="À propos de ZAYADO | Marketplace pour indépendants" description="Découvrez ZAYADO, une marketplace pensée pour les indépendants et petites structures qui veulent entreprendre avec sens, clarté et équilibre." path="/a-propos"><Apropos /></PageWithSeo>} />
            <Route path="/blog" element={<PageWithSeo title="Actualités & conseils pour entrepreneurs | ZAYADO" description="Conseils pratiques sur le pilotage, la finance, la croissance, l'organisation et le bien-être des indépendants et petites structures." path="/blog"><Blog /></PageWithSeo>} />
            <Route path="/blog/:slug" element={<Blog />} />
            <Route path="/contact" element={<PageWithSeo title="Contact ZAYADO | Une question sur nos services ?" description="Contactez ZAYADO pour une question sur nos services, notre marketplace, nos avantages ou MyExtension AI." path="/contact"><Contact /></PageWithSeo>} />
            <Route path="/faq" element={<PageWithSeo title="FAQ ZAYADO | Questions fréquentes" description="Retrouvez les réponses aux questions fréquentes sur ZAYADO, MyExtension AI, la boutique, les services et les avantages." path="/faq"><FAQ /></PageWithSeo>} />
            <Route path="/boutique/connexion" element={<LoginBoutique />} />
            <Route path="/boutique/*" element={<PublicBoutique />} />
            <Route path="/shop/*" element={<PublicBoutique />} />
            <Route path="/favoris" element={<PublicBoutique />} />
            <Route path="/panier" element={<PublicBoutique />} />
            <Route path="/checkout" element={<PublicBoutique />} />
            <Route path="/compte/*" element={<PublicBoutique />} />
            <Route path="/partenaires" element={<PublicBoutique />} />
            <Route path="/devenir-partenaire" element={<PublicBoutique />} />
            <Route path="/groupement" element={<PublicBoutique />} />
            <Route path="/equipe" element={<PublicBoutique />} />
            <Route path="/legal/cgv" element={<CGV />} />
            <Route path="/legal/conditions-utilisation" element={<ConditionsUtilisation />} />
            <Route path="/legal/confidentialite" element={<Confidentialite />} />
            <Route path="/legal/livraison-retours" element={<LivraisonRetours />} />
            <Route path="/legal/mentions-legales" element={<MentionsLegales />} />
            <Route path="/wp/:slug" element={<WordPressPage />} />
            <Route path="/page/:slug" element={<WordPressPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}
