import { useState } from "react";
import { Check, CalendarClock, Zap, ArrowRight } from "lucide-react";
import { Reveal, Stamp } from "@/components/Reveal";
import ServiceForm from "@/components/ServiceForm";
import { SERVICES } from "@/data/content";

function ItemList({ items }) {
  return (
    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
      {items.map((b) => (
        <li key={b} className="flex items-start gap-2 text-[14px] font-medium text-[var(--navy)]">
          <Check size={16} className="mt-0.5 flex-none" style={{ color: "var(--gold)" }} /> {b}
        </li>
      ))}
    </ul>
  );
}

export default function Services() {
  const [modal, setModal] = useState(null);

  return (
    <div>
      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--line)" }}>
        <div className="ruled pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-5xl px-5 py-16 text-center md:py-24">
          <Reveal>
            <Stamp>Accompagnement — Acquérir & Optimiser</Stamp>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[var(--navy)] md:text-6xl">
              Acquérir. Optimiser.
            </h1>
            <p className="font-hand mt-2 text-3xl" style={{ color: "var(--gold)" }}>
              pas sûr par où commencer ? le diagnostic pointe votre pilier
            </p>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed opacity-75">
              L’acquisition est un moyen de développement, l’optimisation le moteur de création de valeur. Deux façons
              d’avancer : une réponse rapide, ou un appel pour en parler de vive voix.
            </p>
          </Reveal>
        </div>
      </section>

      {SERVICES.map((s, idx) => (
        <section
          key={s.id}
          id={`service-${s.id}`}
          className="scroll-mt-24 border-b py-16 md:py-20"
          style={{ borderColor: "var(--line)", background: idx % 2 ? "var(--paper-2)" : "transparent" }}
          data-testid={`service-section-${s.id}`}
        >
          <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-2">
            <Reveal>
              <div className="flex items-baseline gap-4">
                <span className="text-7xl font-bold leading-none text-grad-navy">{s.num}</span>
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-[var(--navy)] md:text-4xl">{s.title}</h2>
                  <p className="font-hand mt-1 text-2xl" style={{ color: "var(--gold)" }}>{s.accent}</p>
                </div>
              </div>
              <p className="mt-6 text-xl font-medium text-[var(--navy)]">{s.promise}</p>
              <p className="mt-3 text-[15px] leading-relaxed opacity-75">{s.short}</p>

              <p className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] opacity-60">Pour qui</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {s.forWho.map((w) => (
                  <span key={w} className="rounded-full border px-4 py-1.5 text-[13px] font-medium" style={{ borderColor: "var(--line)" }}>
                    {w}
                  </span>
                ))}
              </div>

              {s.groups ? (
                s.groups.map((g) => (
                  <div key={g.label} className="mt-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">{g.label}</p>
                    <ItemList items={g.items} />
                  </div>
                ))
              ) : (
                <div className="mt-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">Ce que nous couvrons</p>
                  <ItemList items={s.items} />
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3.5">
                <button className="btn btn-primary px-6 py-3.5 text-[15px]" data-testid={`service-${s.id}-cta-devis`} onClick={() => setModal({ mode: "devis", service: s })}>
                  <Zap size={16} /> Recevoir une réponse rapide
                </button>
                <button className="btn btn-ghost px-6 py-3.5 text-[15px]" data-testid={`service-${s.id}-cta-appel`} onClick={() => setModal({ mode: "appel", service: s })}>
                  <CalendarClock size={16} /> Réserver un appel
                </button>
              </div>
              <p className="mt-3 text-xs opacity-50">Confirmation à l’écran — démo V1, rien n’est envoyé ni stocké.</p>
              <a
                href={s.id === "acquerir" ? "/tunnel/acquisition" : "/tunnel/optimisation"}
                data-testid={`service-${s.id}-tunnel-link`}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: "var(--gold)" }}
              >
                Voir le tunnel dédié <ArrowRight size={14} />
              </a>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="card p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">Déroulé</p>
                <ol className="relative mt-5 space-y-7 border-l-2 pl-6" style={{ borderColor: "var(--gold-soft)" }}>
                  {s.steps.map((st, i) => (
                    <li key={st.t} className="relative">
                      <span className="absolute -left-[33px] top-1 h-4 w-4 rounded-full border-2" style={{ borderColor: "var(--gold)", background: "var(--white)" }} />
                      <p className="font-hand text-xl" style={{ color: "var(--navy-500)" }}>étape {i + 1}</p>
                      <p className="text-[16px] font-semibold text-[var(--navy)]">{st.t}</p>
                      <p className="mt-1 text-[14px] leading-relaxed opacity-75">{st.d}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <figure className="card mt-5 p-7" data-testid={`service-quote-${s.id}`}>
                <span className="font-hand text-5xl leading-none" style={{ color: "var(--gold)" }}>“</span>
                <blockquote className="mt-1 text-[16px] font-medium leading-relaxed text-[var(--navy)]">{s.quote.text}</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold">{s.quote.author}</span>
                  <span className="opacity-60"> — {s.quote.role}</span>
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </section>
      ))}

      <ServiceForm
        open={!!modal}
        onClose={() => setModal(null)}
        mode={modal?.mode}
        service={modal?.service}
      />
    </div>
  );
}
