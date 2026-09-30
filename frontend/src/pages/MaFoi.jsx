import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import MaFoiApp from "@/features/thesustain/MaFoiApp";
import { MA_FOI_KEY } from "@/features/thesustain/store";
import { useKairos } from "@/context/KairosContext";

// Page « Ma Foi » (par TheSustain) — route /app/ma-foi.
// L'activation est enregistrée sur le COMPTE (contexte_metier.parcours_foi), le même
// réglage que l'onboarding, Paramètres › Mon Copilote et le parcours Foi de Bien-être.
// Avant : un drapeau propre au navigateur → l'écran de choix revenait sur chaque appareil.
export default function MaFoi() {
  const { contexte, loaded, majContexte } = useKairos();
  const navigate = useNavigate();
  const [activation, setActivation] = useState(false);
  const active = contexte?.parcours_foi === true;

  // Reprise unique de l'ancien drapeau navigateur (activé avant cette version).
  useEffect(() => {
    if (!loaded || active) return;
    try {
      if (localStorage.getItem(MA_FOI_KEY) === "1" && contexte?.parcours_foi === undefined) {
        majContexte({ parcours_foi: true }).catch(() => {});
      }
    } catch { /* stockage indisponible */ }
  }, [loaded, active, contexte, majContexte]);

  const activer = async () => {
    setActivation(true);
    try { await majContexte({ parcours_foi: true }); toast.success("Ma Foi est activée."); }
    catch { toast.error("Activation impossible pour le moment."); }
    setActivation(false);
  };
  const refuser = async () => {
    try { await majContexte({ parcours_foi: false }); } catch { /* */ }
    navigate("/app");
  };
  const desactiver = async () => {
    if (!window.confirm("Retirer Ma Foi de ton Zayado ? Tes notes et prières restent enregistrées si tu la réactives plus tard.")) return;
    try { localStorage.setItem(MA_FOI_KEY, "0"); } catch { /* */ }
    try { await majContexte({ parcours_foi: false }); toast.success("Ma Foi est retirée. Tu peux la réactiver dans Paramètres › Mon Copilote."); navigate("/app"); }
    catch { toast.error("Impossible pour le moment."); }
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header />
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          {!loaded
            ? <div className="flex items-center gap-2 py-10 text-sm text-offwhite/55"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>
            : <MaFoiApp key={active ? "hub" : "choice"} initialView={active ? "hub" : "choice"}
                onActiver={activer} onRefuser={refuser} onDesactiver={desactiver} activation={activation} />}
        </main>
      </div>
    </div>
  );
}
