/**
 * ZayadoLayout — corrigé : réutilise le vrai header/footer du site
 * (PublicHeader/UnifiedFooter, LandingHub.jsx) au lieu d'une identité
 * visuelle à part ("aubergine"/"canvas", jamais utilisée ailleurs sur
 * le site) qui rendait 5 pages (Vision, AntiBurnout, Echeances,
 * InstanceDediee, TesterSonProjet) incohérentes visuellement avec le
 * reste du site.
 */
import React from "react";
import { PublicHeader, UnifiedFooter } from "../pages/LandingHub";

export default function ZayadoLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fffdfa" }}>
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <UnifiedFooter />
    </div>
  );
}
