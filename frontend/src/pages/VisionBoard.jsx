import React from "react";
import { useSearchParams, useNavigate, Navigate } from "react-router-dom";
import { Sidebar } from "@/components/kairos/Sidebar";
import { VisionHub } from "@/components/vision/VisionHub";
import { VisionCanvas } from "@/components/vision/VisionCanvas";
import { BalanceWheel } from "@/components/vision/BalanceWheel";
import { ArrowLeft, Home } from "lucide-react";
import { LanguageSwitcher } from "@/components/kairos/LanguageSwitcher";
import { useI18n } from "@/i18n";

export default function VisionBoard() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const view = params.get("view") || "hub";
  // Même entrée sur PC et mobile (l'ancienne page mobile à photos d'illustration est retirée).
  const goView = (v, opts = {}) => setParams(v === "hub" ? {} : { view: v, ...(opts.ia ? { ia: "1" } : {}) });
  const ouvrirBoard = (b) => {
    try { localStorage.setItem("kairos_board_key", b.key); } catch { /* stockage indisponible */ }
    setParams({ view: "canvas", board: b.key });
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className={view === "canvas" ? "flex h-[100dvh] flex-col overflow-hidden md:block md:h-auto md:overflow-visible lg:pl-[92px]" : "lg:pl-[92px]"}>
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-navy-900/70 px-4 py-3 backdrop-blur-2xl sm:px-6">
          {view !== "hub" && (
            <button
              onClick={() => goView("hub")}
              data-testid="vision-header-back"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-offwhite/80 transition hover:bg-white/10"
              title={t("nav.backToHub")}
            >
              <ArrowLeft size={17} />
            </button>
          )}
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold/90">Zayado · Vision</p>
            <h1 className="truncate font-display text-[19px] font-semibold tracking-[-0.015em] text-offwhite sm:text-[21px]">{t(`vision.${view}`) || "Vision Board"}</h1>
          </div>
          <LanguageSwitcher className="ml-auto" />
          <button onClick={() => navigate("/app")} aria-label={t("nav.backToCockpit")} data-testid="vision-header-cockpit-m"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-offwhite/80 sm:hidden"><Home size={16} /></button>
          <button
            onClick={() => navigate("/app")}
            className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-offwhite/80 transition hover:bg-white/10 sm:inline-flex"
            data-testid="vision-header-cockpit"
          >
            {t("nav.backToCockpit")}
          </button>
        </header>

        <main className={view === "canvas" ? "min-h-0 flex-1 md:px-6 md:pb-24 md:pt-5" : "px-4 pb-24 pt-5 sm:px-6"} data-testid={`vision-view-${view}`}>
          {view === "hub" && <VisionHub onOpen={goView} onOpenBoard={ouvrirBoard} />}
          {view === "canvas" && <VisionCanvas />}
          {view === "wheel" && <BalanceWheel />}
          {view === "roadmap" && <Navigate to="/app/actions?tab=objectifs" replace />}
        </main>
      </div>
    </div>
  );
}
