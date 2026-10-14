import React, { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { invitePrete, surChangement, installer as installerPwa } from "@/zy/lib/installPwa";

const MASQUE_KEY = "zayado_install_masque";

// Détecte iOS (Safari) : pas de beforeinstallprompt, on guide « Partager → Sur l'écran d'accueil ».
const estIOS = () =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !window.matchMedia("(display-mode: standalone)").matches &&
  !window.navigator.standalone;

const dejaInstalle = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone);

// Bannière d'installation « Installer l'app » : capte beforeinstallprompt (Android/Chrome)
// et propose une aide dédiée sur iOS. Masquable, réapparaît après 7 jours (3 fois au plus).
export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (dejaInstalle()) return;
    try {
      const masqueLe = Number(localStorage.getItem(MASQUE_KEY) || 0);
      if (masqueLe && Date.now() - masqueLe < 7 * 24 * 3600 * 1000) return;
      if (Number(localStorage.getItem(MASQUE_KEY + "_n") || 0) >= 3) return; // 3 refus : on n'insiste plus (Paramètres › Application)
    } catch { /* stockage indisponible */ }

    let pret = false;
    const verifier = () => { const i = invitePrete(); setPrompt(i); setVisible(!!i && pret); };
    const attente = setTimeout(() => { pret = true; verifier(); }, 20000); // pas dès l'arrivée
    verifier();
    const desabonner = surChangement(verifier);

    if (estIOS()) {
      setIos(true);
      const t = setTimeout(() => setVisible(true), 20000);
      return () => { clearTimeout(t); clearTimeout(attente); desabonner(); };
    }
    return () => { clearTimeout(attente); desabonner(); };
  }, []);

  const masquer = () => {
    setVisible(false);
    try {
      localStorage.setItem(MASQUE_KEY, String(Date.now()));
      localStorage.setItem(MASQUE_KEY + "_n", String(Number(localStorage.getItem(MASQUE_KEY + "_n") || 0) + 1));
    } catch { /* */ }
  };

  const installer = async () => {
    if (!prompt) return;
    await installerPwa();
    setPrompt(null);
    masquer();
  };

  if (!visible) return null;

  return (
    <div
      data-testid="install-banner"
      className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[70] mx-auto max-w-md rounded-2xl border border-white/15 bg-[#12224a] p-4 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)] lg:bottom-4"
    >
      <button
        onClick={masquer}
        data-testid="install-banner-close"
        aria-label="Fermer"
        className="absolute right-2.5 top-2.5 rounded-lg p-1 text-offwhite/50 transition hover:bg-white/10 hover:text-offwhite"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-offwhite">Installer Zayado</p>
          {ios ? (
            <p className="mt-0.5 text-xs leading-relaxed text-offwhite/65">
              Sur iPhone, les notifications n'arrivent qu'avec l'app installée. Appuie sur <Share className="inline h-3.5 w-3.5 -mt-0.5 text-gold" /> <span className="font-medium text-offwhite/85">Partager</span>,
              puis sur <span className="font-medium text-offwhite/85">« Sur l'écran d'accueil »</span>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-offwhite/65">
              Ton cockpit en un geste, tes rappels en notification (même app fermée), et tes idées capturées depuis le menu Partager.
            </p>
          )}
        </div>
      </div>
      {!ios && (
        <button
          onClick={installer}
          data-testid="install-banner-cta"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F4EFE6] px-4 py-2.5 text-sm font-semibold text-navy-900 transition hover:bg-white"
        >
          <Download className="h-4 w-4" /> Installer l'application
        </button>
      )}
    </div>
  );
}
