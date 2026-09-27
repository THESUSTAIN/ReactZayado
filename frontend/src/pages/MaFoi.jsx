import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import MaFoiApp from "@/features/thesustain/MaFoiApp";
import { getMaFoiActive } from "@/features/thesustain/store";

// Page « Ma Foi » (par TheSustain) — route /app/ma-foi.
// Reprend la coquille Zayado (Sidebar + Header) comme les autres pages du cockpit.
// À la 1re visite (flag localStorage absent), MaFoiApp affiche l'écran de choix
// « Qu'aimeriez-vous intégrer ? » — sans jamais toucher à l'onboarding existant.
export default function MaFoi() {
  const [start, setStart] = useState("hub");
  useEffect(() => { if (!getMaFoiActive()) setStart("choice"); }, []);
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header />
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          <MaFoiInner start={start} />
        </main>
      </div>
    </div>
  );
}

// Petit wrapper pour injecter la vue initiale (choice vs hub) une fois monté.
function MaFoiInner({ start }) {
  return <MaFoiApp key={start} initialView={start} />;
}
