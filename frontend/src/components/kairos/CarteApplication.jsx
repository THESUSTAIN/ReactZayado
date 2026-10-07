import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Check, Download, Share, Smartphone } from "lucide-react";
import { dejaInstalle, estAndroid, estIOS, installer, invitePrete, surChangement } from "@/lib/installPwa";

// Tout en haut de Paramètres : installer Zayado à la main (si la bannière a été fermée ou ratée) et
// comprendre comment envoyer une image / un lien vers son Vision Board depuis le téléphone.
export default function CarteApplication() {
  const [invite, setInvite] = useState(() => !!invitePrete());
  const [installee, setInstallee] = useState(dejaInstalle);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => surChangement(() => { setInvite(!!invitePrete()); setInstallee(dejaInstalle()); }), []);

  const lancer = async () => {
    setOccupe(true);
    const r = await installer();
    setOccupe(false);
    if (r === "installe") { toast.success("Zayado s'installe sur cet appareil."); setInstallee(true); }
  };

  const ios = estIOS();
  const android = estAndroid();

  return (
    <div className="relative mb-4 overflow-hidden rounded-[20px] border border-gold/40 bg-gold/[0.08] px-4 py-4 sm:px-5 sm:py-[18px]" data-testid="carte-application">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/20 text-gold"><Smartphone size={22} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-offwhite">Application Zayado</p>
          <p className="mt-0.5 text-[13.5px] leading-relaxed text-offwhite/75">
            {installee
              ? "Installée sur cet appareil : tu l'ouvres comme n'importe quelle application."
              : "Pas encore installée sur cet appareil : installe-la pour l'ouvrir en un geste et recevoir tes notifications."}
          </p>
        </div>
        {installee && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-1 text-[12.5px] font-semibold text-emerald-300"><Check size={13} /> Installée</span>}
      </div>

      {!installee && (
        <div className="mt-3">
          {invite && (
            <button onClick={lancer} disabled={occupe} data-testid="application-installer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-gradient-to-br from-[#DEC2A3] to-[#F1E2CC] px-5 text-[14px] font-semibold text-navy-900 disabled:opacity-60">
              <Download size={16} /> Installer l'application
            </button>
          )}
          {!invite && ios && (
            <p className="rounded-xl border border-white/20 bg-white/[0.07] px-3.5 py-3 text-[13.5px] leading-relaxed text-offwhite/85" data-testid="application-aide-ios">
              Sur iPhone : ouvre Zayado dans <b>Safari</b>, touche <Share size={14} className="mx-0.5 inline -mt-0.5 text-gold" /> <b>Partager</b>, puis <b>« Sur l'écran d'accueil »</b>.
            </p>
          )}
          {!invite && !ios && (
            <p className="rounded-xl border border-white/20 bg-white/[0.07] px-3.5 py-3 text-[13.5px] leading-relaxed text-offwhite/85" data-testid="application-aide-manuelle">
              {android
                ? "Sur Android (Chrome) : touche le menu ⋮ en haut à droite, puis « Installer l'application » ou « Ajouter à l'écran d'accueil »."
                : "Sur ordinateur (Chrome ou Edge) : clique sur l'icône d'installation à droite de la barre d'adresse, ou sur le menu ⋮ puis « Installer Zayado »."}
            </p>
          )}
        </div>
      )}

    </div>
  );
}
