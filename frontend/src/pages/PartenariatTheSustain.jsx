import React from "react";
import { Link } from "react-router-dom";
import { HandHeart, Ticket, Check, ArrowRight } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { useSeo } from "@/lib/useSeo";

// Page du partenariat Zayado × TheSustain : ce qui était une note en bas de la page tarifs.
export default function PartenariatTheSustain() {
  useSeo({
    title: "Partenariat Zayado × TheSustain : −30 % pour les membres",
    description: "Les membres de TheSustain bénéficient de −30 % sur toutes les offres Zayado avec leur code membre.",
    path: "/partenaires/thesustain",
  });
  const etapes = [
    "Demande ton code membre à TheSustain (il est réservé à ses membres).",
    "Crée ton compte Zayado ou connecte-toi.",
    "Sur la page des offres, touche « J'ai un code » et saisis ton code membre (ou dans Paramètres › Code promo).",
    "La remise s'affiche aussitôt sur toutes les offres et s'applique au paiement.",
  ];
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-3xl px-5 pb-20 pt-14 text-center sm:pt-20" data-testid="partenariat-thesustain">
        <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-gold"><HandHeart size={14} /> Partenariat</p>
        <h1 className="mt-5 font-display text-[34px] font-bold leading-tight text-offwhite sm:text-[44px]">Zayado × TheSustain</h1>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-offwhite/75">
          Zayado et TheSustain sont deux services distincts, liés par un partenariat. Les membres de TheSustain bénéficient de
          <b className="text-gold"> −30 % sur toutes les offres Zayado</b>, tant qu'ils restent abonnés.
        </p>
        <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-white/15 bg-white/[0.05] p-6 text-left">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-offwhite"><Ticket size={17} className="text-gold" /> Comment en profiter</p>
          <ol className="mt-4 space-y-3">
            {etapes.map((x, i) => (
              <li key={x} className="flex gap-3 text-[14.5px] text-offwhite/85"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-[12px] font-bold text-navy-900">{i + 1}</span>{x}</li>
            ))}
          </ol>
          <ul className="mt-5 space-y-2 border-t border-white/10 pt-4">
            {["Valable sur toutes les offres, mensuelles comme annuelles", "Un code par compte, sans engagement"].map((x) => (
              <li key={x} className="flex gap-2 text-[13.5px] text-offwhite/75"><Check size={15} className="mt-0.5 shrink-0 text-gold" />{x}</li>
            ))}
          </ul>
        </div>
        <Link to="/pricing" className="mt-8 inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-gradient-to-br from-[#DEC2A3] to-[#F1E2CC] px-6 text-[15px] font-semibold text-navy-900">Voir les offres <ArrowRight size={16} /></Link>
      </section>
    </MarketingLayout>
  );
}
