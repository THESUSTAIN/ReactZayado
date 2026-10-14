import { Link } from "react-router-dom";
import { ArrowRight, Check, Gift, Sparkles } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import usePageMeta from "@/hooks/usePageMeta";
import { BOX_PRECO } from "@/data/catalogue";

const APP_URL = process.env.REACT_APP_APP_URL || "https://app.zayado.net";

// Page de remerciement + offres à durée limitée (tripwire) — une seule fois.
export default function Merci() {
  usePageMeta("Votre plan de clarté arrive · Zayado", "Votre diagnostic a bien été pris en compte. Découvrez vos offres de bienvenue, réservées à cet instant.");

  const ctaEssai = `${APP_URL}/login?next=${encodeURIComponent("/onboarding?plan=serenite&essai=1")}`;

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 md:py-20" data-testid="merci-page">
      <Reveal>
        <div className="text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "var(--gold-soft)" }}>
            <Check size={40} style={{ color: "var(--navy)" }} />
          </span>
          <h1 className="mt-7 text-4xl font-semibold tracking-tight text-[var(--navy)] md:text-5xl">C'est envoyé.</h1>
          <p className="font-hand mt-2 text-3xl" style={{ color: "var(--gold)" }}>bienvenue dans la maison</p>
          <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed opacity-75">
            Votre plan de clarté arrive dans votre boîte mail — pensez aux spams. En attendant, deux cadeaux
            <strong> réservés à cet instant précis</strong>, jamais plus.
          </p>
        </div>
      </Reveal>

      {/* TRIPWIRE 1 — Cockpit 2 mois pour 1 € */}
      <Reveal delay={0.1}>
        <div className="bg-navy-grad mt-10 flex flex-col items-start gap-6 rounded-[26px] p-8 text-[var(--paper-2)] md:flex-row md:items-center" data-testid="merci-tripwire-cockpit">
          <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <Sparkles size={26} style={{ color: "var(--gold-soft)" }} />
          </span>
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--gold-soft)" }}>Offre de bienvenue · maintenant seulement</p>
            <h2 className="font-display mt-2 text-2xl font-semibold leading-snug">Le Cockpit IA — 2 mois pour 1 €</h2>
            <p className="mt-2 text-[14px] leading-relaxed opacity-75">
              Tout votre pilotage : vision, actions, énergie, chiffres. 29 € au lieu de 58 €, sans engagement.
            </p>
          </div>
          <a href={ctaEssai} data-testid="merci-tripwire-cockpit-cta" className="btn btn-gold-light inline-flex flex-none items-center gap-2 px-7 py-3.5 text-[15px]">
            Activer mon essai — 29 € <ArrowRight size={16} />
          </a>
        </div>
      </Reveal>

      {/* TRIPWIRE 2 — Box en précommande, prix de lancement */}
      <Reveal delay={0.18}>
        <div className="card mt-5 flex flex-col items-start gap-6 p-8 md:flex-row md:items-center" data-testid="merci-tripwire-box">
          <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
            <Gift size={26} style={{ color: "var(--navy)" }} />
          </span>
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-60">Prix de lancement · précommande</p>
            <h2 className="font-display mt-2 text-2xl font-semibold leading-snug text-[var(--navy)]">
              La Box entrepreneur apaisé — 49 € <span className="text-[16px] font-normal opacity-50 line-through">59 €</span>
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed opacity-75">
              Carnet « Mon cap 2027 », infusion bio, rituel du soir, micro-pause — {BOX_PRECO.expedition}. Seuil {BOX_PRECO.seuil} box, sinon remboursé·e.
            </p>
          </div>
          <Link to="/box?preco=1" data-testid="merci-tripwire-box-cta" className="btn btn-primary inline-flex flex-none items-center gap-2 px-7 py-3.5 text-[15px]">
            Précommander à 49 € <ArrowRight size={16} />
          </Link>
        </div>
      </Reveal>

      <p className="mt-10 text-center text-[13px] opacity-55">
        Pas maintenant ? Votre plan de clarté reste le premier pas —{" "}
        <Link to="/diagnostic" data-testid="merci-lien-diagnostic" className="underline" style={{ color: "var(--navy)" }}>faites votre diagnostic</Link>.
      </p>
    </div>
  );
}
