import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/kairos/Sidebar";
import { VisionHub } from "@/components/vision/VisionHub";
import { VisionCanvas } from "@/components/vision/VisionCanvas";
import { BalanceWheel } from "@/components/vision/BalanceWheel";
import { RoadmapBoard } from "@/components/vision/RoadmapBoard";
import { ArrowLeft } from "lucide-react";
import { LanguageSwitcher } from "@/components/kairos/LanguageSwitcher";
import { useI18n } from "@/i18n";
import VisionBoardMobileHome from "@/pages/VisionBoardMobileHome";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

export default function VisionBoard() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const view = params.get("view") || "hub";
  const isMobile = useIsMobile();

  // Mobile hub → show gallery of boards instead of desktop hub
  if (isMobile && view === "hub") {
    return <VisionBoardMobileHome />;
  }

  const goView = (v) => setParams(v === "hub" ? {} : { view: v });

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
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
          <button
            onClick={() => navigate("/app")}
            className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-offwhite/80 transition hover:bg-white/10 sm:inline-flex"
            data-testid="vision-header-cockpit"
          >
            {t("nav.backToCockpit")}
          </button>
        </header>

        <main className="px-4 pb-24 pt-5 sm:px-6" data-testid={`vision-view-${view}`}>
          {view === "hub" && <VisionHub onOpen={goView} />}
          {view === "canvas" && <VisionCanvas />}
          {view === "wheel" && <BalanceWheel />}
          {view === "roadmap" && <RoadmapBoard />}
        </main>
      </div>
    </div>
  );
}
