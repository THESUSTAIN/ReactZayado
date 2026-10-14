import { Link } from "react-router-dom";
import { ArrowRight, Leaf, MonitorSmartphone } from "lucide-react";
import { Reveal, Stamp } from "@/components/Reveal";
import { IMG } from "@/data/images";
import { VALUES, WELLBEING, POSITIONING, MISSION } from "@/data/content";

export default function Vision() {
  return (
    <div>
      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--line)" }}>
        <div className="ruled pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:py-24 lg:grid-cols-[1.15fr_0.85fr]">
          <Reveal>
            <Stamp>Vision & valeurs</Stamp>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.06] tracking-tight text-[var(--navy)] md:text-6xl">
              Ce que nous défendons.
            </h1>
            <p className="font-hand mt-2 text-3xl" style={{ color: "var(--gold)" }}>
              la maison des entrepreneurs apaisés
            </p>
            <p className="mt-6 max-w-xl text-[16px] leading-relaxed opacity-75">
              {POSITIONING.lead} Ni cabinet M&A, ni marketplace de plus, ni app de bien-être : deux socles —
              l’entrepreneur et l’entreprise — et quatre moyens au service d’un seul équilibre.
            </p>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed opacity-75">
              L’acquisition est un moyen de développement. L’optimisation, le moteur de création de valeur. Le
              cockpit, le système de pilotage. La boutique, le moyen d’équiper et d’accompagner. Et le bien-être, une
              partie intégrante de la performance. En un mot : {MISSION.toLowerCase()}
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="arch relative mx-auto max-w-sm overflow-hidden border" style={{ borderColor: "var(--line)" }}>
              <img src={IMG.hands} alt="Les chiffres qui s’écrivent à la main" className="h-96 w-full object-cover" />
              <span className="tapeline -top-2 right-8" />
            </div>
            <p className="font-hand mt-4 text-center text-2xl" style={{ color: "var(--gold)" }}>
              des chiffres qui parlent, enfin
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="grid gap-6 md:grid-cols-3">
          {VALUES.map((v, i) => (
            <Reveal key={v.num} delay={i * 0.12} className="h-full">
              <div className="card ruled h-full p-7" data-testid={`vision-value-${v.num}`}>
                <span className="text-5xl font-bold leading-none text-grad-navy">{v.num}</span>
                <h2 className="mt-4 text-2xl font-semibold text-[var(--navy)]">{v.title}</h2>
                <p className="mt-3 text-[15px] leading-relaxed opacity-75">{v.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="bien-etre" className="border-y bg-[var(--paper-2)] scroll-mt-20" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto max-w-5xl px-5 py-16 md:py-24">
          <Reveal>
            <div className="text-center">
              <Stamp>Notre base — Bien-être & équilibre</Stamp>
              <blockquote className="mx-auto mt-6 max-w-3xl text-3xl font-medium leading-snug tracking-tight text-[var(--navy)] md:text-4xl">
                « {WELLBEING.principle} »
              </blockquote>
              <p className="font-hand mt-3 text-2xl" style={{ color: "var(--gold)" }}>un socle réel, pas une rubrique</p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {[
              ["L’entrepreneur — bien-être", ["Physique", "Mental (mindset)", "Performance"]],
              ["L’entreprise — finance", ["Clarté financière", "Rentabilité", "Trésorerie"]],
            ].map(([label, arr], i) => (
              <Reveal key={label} delay={i * 0.12} className="h-full">
                <div className="card h-full p-7" data-testid={`vision-foundation-${i}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">{label}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-2.5">
                    {arr.map((s, j) => (
                      <span key={s} className="flex items-center gap-2.5">
                        <span className="rounded-full border px-4 py-2 text-[14px] font-medium text-[var(--navy)]" style={{ borderColor: "var(--line)" }}>
                          {s}
                        </span>
                        {j < arr.length - 1 && <ArrowRight size={14} style={{ color: "var(--gold)" }} />}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal className="h-full">
            <div className="card h-full p-8" data-testid="thesustain-block">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
                <Leaf size={20} style={{ color: "var(--navy)" }} />
              </span>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] opacity-60">Mention secondaire</p>
              <h2 className="mt-1 text-2xl font-semibold text-[var(--navy)]">TheSustain</h2>
              <p className="mt-3 text-[15px] leading-relaxed opacity-75">
                Notre sélection durable — une extension naturelle de Zayado, dédiée aux objets et ressources qui
                durent. Elle nourrit la boutique.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.12} className="h-full">
            <div className="card h-full p-8" data-testid="cockpit-block">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
                <MonitorSmartphone size={20} style={{ color: "var(--navy)" }} />
              </span>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] opacity-60">Moyen 03 — Piloter</p>
              <h2 className="mt-1 text-2xl font-semibold text-[var(--navy)]">Le Cockpit</h2>
              <p className="mt-3 text-[15px] leading-relaxed opacity-75">
                Le système de pilotage : les chiffres de l’entreprise et l’énergie de l’entrepreneur, réunis — avec
                l’IA qui fait le lien.
              </p>
              <Link to="/cockpit" data-testid="vision-cockpit-link" className="btn btn-ghost mt-5 px-5 py-2.5 text-[13px]">
                Découvrir le Cockpit <ArrowRight size={14} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-navy-grad">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center text-[var(--paper-2)] md:py-28" data-testid="vision-final-cta">
          <Reveal>
            <p className="font-hand text-3xl" style={{ color: "var(--gold-soft)" }}>ça résonne ?</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Commencez par y voir clair.</h2>
            <Link to="/diagnostic" data-testid="vision-cta-diagnostic" className="btn btn-gold mt-8 px-9 py-4 text-[16px]">
              Faire mon diagnostic gratuit <ArrowRight size={18} />
            </Link>
            <p className="mt-4 text-sm opacity-70">Gratuit · 2 min · Résultat immédiat</p>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
