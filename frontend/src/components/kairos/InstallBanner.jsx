import React, { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { invitePrete, surChangement, installer as installerPwa } from "@/lib/installPwa";

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
// et propose une aide dédiée sur iOS. Masquable, réapparaît après 7 jours.
export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (dejaInstalle()) return;
    try {
      const masqueLe = Number(localStorage.getItem(MASQUE_KEY) || 0);
      if (masqueLe && Date.now() - masqueLe < 7 * 24 * 3600 * 1000) return;
    } catch { /* stockage indisponible */ }

    const verifier = () => { const i = invitePrete(); setPrompt(i); setVisible(!!i); };
    verifier();
    const desabonner = surChangement(verifier);

    if (estIOS()) {
      setIos(true);
      const t = setTimeout(() => setVisible(true), 2500);
      return () => { clearTimeout(t); desabonner(); };
    }
    return desabonner;
  }, []);

  const masquer = () => {
    setVisible(false);
    try { localStorage.setItem(MASQUE_KEY, String(Date.now())); } catch { /* */ }
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
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-md animate-[fade-up_0.4s_ease] rounded-2xl border border-gold/30 bg-[#0d1426]/95 p-4 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl"
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
              Appuie sur <Share className="inline h-3.5 w-3.5 -mt-0.5 text-gold" /> <span className="font-medium text-offwhite/85">Partager</span>,
              puis sur <span className="font-medium text-offwhite/85">« Sur l'écran d'accueil »</span>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-offwhite/65">
              Accède à ton cockpit en un geste et capture tes idées depuis le menu Partager de ton téléphone.
            </p>
          )}
        </div>
      </div>
      {!ios && (
        <button
          onClick={installer}
          data-testid="install-banner-cta"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#F1E2CC] to-[#DEC2A3] px-4 py-2.5 text-sm font-semibold text-navy-900 transition hover:scale-[1.01]"
        >
          <Download className="h-4 w-4" /> Installer l'application
        </button>
      )}
    </div>
  );
}
