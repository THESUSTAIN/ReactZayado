import { ArrowRight, Heart, Leaf, Scale } from "lucide-react";

const pillars = [
  {
    id: "energie",
    icon: Leaf,
    title: "Énergie",
    description: "Des rituels simples pour recharger tes batteries, jour après jour.",
  },
  {
    id: "equilibre",
    icon: Scale,
    title: "Équilibre",
    description: "Le juste milieu entre effort, repos et petits plaisirs du quotidien.",
  },
  {
    id: "pauses",
    icon: Heart,
    title: "Pauses",
    description: "Apprendre à ralentir et savourer de vrais moments rien qu'à toi.",
  },
] as const;

export default function App() {
  return (
    <div
      data-testid="onboarding-screen"
      className="relative min-h-screen overflow-hidden bg-night font-sans"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 95% at 50% 42%, rgba(15,30,51,0) 42%, rgba(4,9,18,0.62) 100%)",
        }}
      />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center px-6 pb-10 pt-10 sm:pt-12">
        <header>
          <p
            data-testid="brand-logo"
            className="font-serif text-2xl tracking-wide text-cream"
          >
            Zayado
          </p>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <span
            data-testid="badge-avant-de-commencer"
            className="rounded-full border border-cream/25 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-cream/80"
          >
            Avant de commencer
          </span>

          <h1
            data-testid="headline"
            className="mt-7 font-serif text-4xl leading-[1.08] text-cream sm:text-5xl lg:text-6xl"
          >
            Ton bien-être
            <br />
            d'abord.
          </h1>

          <p
            data-testid="subheadline"
            className="mt-4 -rotate-1 font-script text-3xl text-gold sm:text-4xl"
          >
            parce que tout part de là
          </p>

          <p
            data-testid="intro-paragraph"
            className="mt-6 max-w-md text-sm leading-relaxed text-mist sm:text-base"
          >
            Prends un instant pour toi. Zayado t'aide à construire des habitudes
            douces, à ton rythme, sans pression.
          </p>

          <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {pillars.map(({ id, icon: Icon, title, description }) => (
              <article
                key={id}
                data-testid={`pillar-card-${id}`}
                className="flex flex-col items-center rounded-2xl border border-cream/10 bg-white/[0.04] px-6 py-7 text-center backdrop-blur-sm"
              >
                <Icon
                  data-testid={`pillar-icon-${id}`}
                  aria-hidden="true"
                  className="h-7 w-7 text-cream/90"
                  strokeWidth={1.5}
                />
                <h2 className="mt-4 font-serif text-lg text-cream">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-mist">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>

        <footer className="flex flex-col items-center gap-5">
          <button
            type="button"
            data-testid="continue-button"
            className="group inline-flex items-center gap-2 rounded-full bg-cream px-9 py-3.5 text-base font-semibold text-night shadow-[0_12px_35px_rgba(244,234,214,0.18)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-cream-bright hover:shadow-[0_16px_42px_rgba(244,234,214,0.26)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-night active:translate-y-0"
          >
            Continuer
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </button>

          <a
            href="#"
            onClick={(event) => event.preventDefault()}
            data-testid="skip-link"
            className="rounded-sm text-sm text-mist/80 underline decoration-mist/40 underline-offset-4 transition-colors duration-200 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/70 focus-visible:ring-offset-4 focus-visible:ring-offset-night"
          >
            Passer cette étape
          </a>
        </footer>
      </main>
    </div>
  );
}
