import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { HeartHandshake, ArrowUpRight, Check, Link2 } from "lucide-react";

// URL de l'écosystème « Sens » (TheSustain). Le dev la configure via
// REACT_APP_THESUSTAIN_URL ; défaut raisonnable en attendant.
export const THESUSTAIN_URL = process.env.REACT_APP_THESUSTAIN_URL || "https://thesustain.net";

// Modale « Aller plus loin sur le sens » — passerelle douce, par invitation,
// vers l'espace spirituel TheSustain (jamais imposée dans Zayado).
export default function TheSustainInfo({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="fenetre text-offwhite sm:max-w-lg" data-testid="thesustain-info">
        <DialogTitle className="sr-only">Sens & spiritualité — TheSustain</DialogTitle>
        <DialogDescription className="sr-only">Aller plus loin sur le sens et les valeurs avec l'espace TheSustain.</DialogDescription>
        <div className="py-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] font-semibold text-gold">
            <HeartHandshake size={13} /> Aller plus loin sur le sens
          </span>
          <h3 className="mt-3 font-display text-2xl font-bold">Un espace pour le sens, les valeurs et la foi</h3>
          <p className="mt-2 text-sm leading-relaxed text-offwhite/70">
            Zayado t'accompagne dans ton <b className="text-offwhite">travail</b> et ton équilibre.
            Quand tu ressens le besoin d'aller plus loin — sur le sens, l'espérance,
            la gratitude ou la foi — <b className="text-offwhite">TheSustain</b> est l'espace
            partenaire qui prolonge cette réflexion, dans une perspective chrétienne, à ton rythme.
          </p>
          <ul className="mt-4 space-y-2">
            {[
              "Réflexions, prière et méditation pour nourrir ta vie intérieure",
              "Une communauté fraternelle d'entrepreneurs qui partagent tes valeurs",
              "Connecte ton espace : tu retrouves ton parcours d'un univers à l'autre",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-offwhite/85">
                <Check size={15} className="mt-0.5 shrink-0 text-gold" /> {t}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <a href={THESUSTAIN_URL} target="_blank" rel="noopener noreferrer" data-testid="thesustain-discover"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-5 py-3 text-sm font-bold text-navy-900 transition hover:brightness-105">
              Découvrir TheSustain <ArrowUpRight size={16} />
            </a>
            <a href={`${THESUSTAIN_URL}/connexion?from=zayado`} target="_blank" rel="noopener noreferrer" data-testid="thesustain-connect"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gold/40 px-5 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10">
              <Link2 size={15} /> Connecter mon espace
            </a>
          </div>
          <p className="mt-3 text-[11px] text-offwhite/45">
            Zayado et TheSustain sont deux services distincts, liés par un partenariat. Zayado reste ouvert à tous : TheSustain est une invitation, jamais une obligation.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
