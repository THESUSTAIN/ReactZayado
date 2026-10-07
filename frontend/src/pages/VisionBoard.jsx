import React, { useEffect, useState } from "react";
import { fetchBoards } from "@/lib/kairosApi";
import { useSearchParams, useNavigate, Navigate } from "react-router-dom";
import { Sidebar } from "@/components/kairos/Sidebar";
import { VisionHub } from "@/components/vision/VisionHub";
import { VisionCanvas } from "@/components/vision/VisionCanvas";
import { BalanceWheel } from "@/components/vision/BalanceWheel";
import PartageBoards from "@/components/vision/PartageBoards";
import { ArrowLeft, Home } from "lucide-react";
import { LanguageSwitcher } from "@/components/kairos/LanguageSwitcher";
import { useI18n } from "@/i18n";

export default function VisionBoard() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const view = params.get("view") || "hub";
  // Même entrée sur PC et mobile (l'ancienne page mobile à photos d'illustration est retirée).
  // Vue canvas : PLEIN ÉCRAN partout (comme sur mobile) — rail latéral masqué,
  // le board occupe tout le viewport sous l'en-tête.
  const pleinEcran = view === "canvas";
  const goView = (v, opts = {}) => setParams(v === "hub" ? {} : { view: v, ...(opts.ia ? { ia: "1" } : {}) });
  // Premier accès : directement le board Perso, pré-rempli avec les vraies
  // données (au lieu d'une galerie puis d'une fenêtre d'accueil).
  useEffect(() => {
    if (params.get("view")) return;
    let deja = true;
    try { deja = localStorage.getItem("zayado_vision_premier_acces") === "1"; localStorage.setItem("zayado_vision_premier_acces", "1"); } catch { /* */ }
    if (!deja) setParams({ view: "canvas", board: "perso" }, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Nom du board ouvert dans l'en-tête (avant : « Mon Vision Board » partout).
  const [nomBoard, setNomBoard] = useState("");
  const cleBoard = params.get("board");
  useEffect(() => {
    if (view !== "canvas") return;
    if (params.get("partage") === "1") { setNomBoard("Board partagé"); return; }
    fetchBoards().then((d) => {
      const cle = cleBoard || (() => { try { return localStorage.getItem("kairos_board_key"); } catch { return null; } })() || "perso";
      setNomBoard((d.boards || []).find((b) => b.key === cle)?.nom || "");
    }).catch(() => {});
  }, [view, cleBoard]); // eslint-disable-line react-hooks/exhaustive-deps
  // Date du jour en toutes lettres : le surlignage du Radar ancre l'écran dans
  // « aujourd'hui ». Sur le Vision Board, l'utilisateur ouvrait un board sans
  // jamais savoir de quand datait ce qu'il regardait.
  const aujourdhui = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const surlignage = view === "canvas" ? `Vision · ${aujourdhui}` : "Zayado · Vision";
  const titrePage = (view === "canvas" && nomBoard) || (view === "partage" && "Partager mes boards") || t(`vision.${view}`) || "Vision Board";

  const ouvrirBoard = (b) => {
    if (!b.partage) {
      try { localStorage.setItem("kairos_board_key", b.key); } catch { /* stockage indisponible */ }
    }
    setParams({ view: "canvas", board: b.key, ...(b.partage ? { partage: "1", ...(b.owner ? { owner: b.owner } : {}) } : {}) });
  };

  return (
    <div className={pleinEcran ? "vision-plein-ecran min-h-screen" : "min-h-screen"}>
      <Sidebar />
      <div className={pleinEcran ? "flex h-[100dvh] flex-col overflow-hidden" : "lg:pl-[92px]"}>
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/5 bg-[#0b1a3d]/60 px-4 py-3 backdrop-blur-xl sm:px-6">
          {view !== "hub" && (
            <button
              onClick={() => goView("hub")}
              data-testid="vision-header-back"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.07] text-offwhite/80 transition hover:bg-white/10 hover:text-offwhite"
              title={t("nav.backToHub")}
            >
              <ArrowLeft size={17} />
            </button>
          )}
          {/* En-tête à la grammaire du Radar : le titre n'était qu'une étiquette de
              19 px perdue dans une barre, impossible à distinguer des boutons autour.
              Surlignage doré en capitales + titre serif : on sait d'un coup d'œil
              quel board est ouvert et de quand il date. */}
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase tracking-[0.19em] text-gold">{surlignage}</p>
            <h1 className="mt-1 truncate font-display text-[26px] font-semibold leading-tight tracking-[-0.015em] text-offwhite sm:text-[32px]" data-testid="vision-header-title">{titrePage}</h1>
          </div>
          <LanguageSwitcher className="ml-auto" />
          <button onClick={() => navigate("/app")} aria-label={t("nav.backToCockpit")} data-testid="vision-header-cockpit-m"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.07] text-offwhite/80 sm:hidden"><Home size={16} /></button>
          <button
            onClick={() => navigate("/app")}
            className="hidden shrink-0 rounded-full border border-white/12 bg-white/[0.07] px-5 py-2.5 text-sm font-semibold text-offwhite/62 transition hover:bg-white/10 hover:text-offwhite sm:inline-flex"
            data-testid="vision-header-cockpit"
          >
            {t("nav.backToCockpit")}
          </button>
        </header>

        <main className={pleinEcran ? "min-h-0 flex-1" : "px-4 pb-24 pt-5 sm:px-6"} data-testid={`vision-view-${view}`}>
          {view === "hub" && <VisionHub onOpen={goView} onOpenBoard={ouvrirBoard} />}
          {view === "canvas" && <VisionCanvas partage={params.get("partage") === "1"} owner={params.get("owner") || undefined} />}
          {view === "wheel" && <BalanceWheel />}
          {view === "partage" && <PartageBoards onOpenBoard={ouvrirBoard} />}
          {view === "roadmap" && <Navigate to="/app/actions?tab=objectifs" replace />}
        </main>
      </div>
    </div>
  );
}
