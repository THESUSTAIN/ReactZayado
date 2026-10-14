import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, XCircle, CheckCircle2, Zap, Lock, Check, Star } from "lucide-react";
import { Reveal, Stamp, KineticLine } from "@/components/Reveal";
import usePageMeta from "@/hooks/usePageMeta";
import ServiceForm from "@/components/ServiceForm";
import { TUNNELS } from "@/data/content";
import { envoyerLead } from "@/lib/api";

const LEADS = {
  acquisition: {
    title: "Les 4 repères avant d’acheter une entreprise",
    min: 5,
    items: [
      "Repère 1 — La rentabilité réelle, pas la promesse",
      "Repère 2 — La valorisation : ce que vous payez vraiment",
      "Repère 3 — Le financement : la structure avant l’apport",
      "Repère 4 — L’intégration : les 100 jours qui décident",
    ],
  },
  optimisation: {
    title: "Les 5 fuites de marge à traquer ce trimestre",
    min: 5,
    items: [
      "Fuite 1 — Les remises invisibles qui s’accumulent",
      "Fuite 2 — Les charges dormantes",
      "Fuite 3 — Les offres qui coûtent plus qu’elles ne rapportent",
      "Fuite 4 — Les process qui mangent vos heures",
      "Fuite 5 — L’équipement qui fatigue l’énergie",
    ],
  },
};

const PATH = [
  { n: "01", t: "Recevez le plan", d: "Le guide 5 minutes, offert — ci-dessus." },
  { n: "02", t: "Suivez la séquence", d: "7 jours, 7 emails courts : la méthode complète." },
  { n: "03", t: "Faites le diagnostic", d: "2 minutes : votre profil, vos 3 leviers.", link: "/diagnostic" },
  { n: "04", t: "Parlons de vive voix", d: "L’appel de découverte, sans engagement." },
  { n: "05", t: "Lancez l’accompagnement", d: "Acquérir ou Optimiser — et construisez, serein." },
];

function LeadMagnet({ slug }) {
  const lead = LEADS[slug];
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const valid = /.+@.+\..+/.test(email);
  return (
    <div className="bg-navy-grad rounded-3xl px-7 py-9 text-[var(--paper-2)] md:px-10" data-testid={`tunnel-leadmagnet-${slug}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ background: "var(--gold)", color: "var(--navy)" }}>
          À découvrir
        </span>
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] opacity-70">{lead.min} min · offert</span>
      </div>
      <h3 className="mt-4 text-2xl font-semibold leading-snug md:text-3xl">{lead.title}</h3>
      <ul className="mt-5 space-y-2.5">
        {lead.items.map((it) => (
          <li key={it} className="flex items-start gap-2.5 text-[14.5px] font-medium opacity-90">
            <Check size={17} className="mt-0.5 flex-none" style={{ color: "var(--gold)" }} /> {it}
          </li>
        ))}
      </ul>
      {!sent ? (
        <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (!valid) return; envoyerLead({ email, source: `tunnel-${slug}-plan` }); setSent(true); }} data-testid={`tunnel-leadmagnet-form-${slug}`}>
          <input
            className="field flex-1"
            style={{ background: "rgba(253,252,248,0.1)", borderColor: "rgba(253,252,248,0.3)", color: "var(--paper-2)" }}
            placeholder="votre@email.fr"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid={`tunnel-leadmagnet-email-${slug}`}
          />
          <button className="btn btn-gold px-6 py-3 text-[14px]" data-testid={`tunnel-leadmagnet-submit-${slug}`} disabled={!valid}>
            Recevoir le plan <ArrowRight size={15} />
          </button>
        </form>
      ) : (
        <div className="mt-6" data-testid={`tunnel-leadmagnet-confirmation-${slug}`}>
          <p className="font-hand text-2xl" style={{ color: "var(--gold-soft)" }}>c’est envoyé !</p>
          <p className="mt-1 text-[14px] opacity-80">Le plan arrive dans votre boîte — et la séquence de 7 jours avec lui.</p>
          <p className="mt-1 text-xs opacity-55">Enregistré — pensez à vérifier vos spams.</p>
        </div>
      )}
    </div>
  );
}

function SuiteBlock({ slug }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const valid = /.+@.+\..+/.test(email);
  return (
    <div className="bg-navy-grad rounded-3xl px-7 py-9 text-[var(--paper-2)] md:px-10" data-testid={`tunnel-suite-${slug}`}>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--gold-soft)" }}>
        <Lock size={13} /> Débloquer la suite
      </p>
      <h3 className="mt-3 text-2xl font-semibold md:text-3xl">La séquence complète + la note d’équilibre.</h3>
      <p className="mt-2 max-w-lg text-[14px] leading-relaxed opacity-80">
        Les 7 emails du tunnel, la méthode pas à pas — et chaque semaine, une note courte de la maison. Accès
        réservé aux abonnés.
      </p>
      {!sent ? (
        <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (!valid) return; envoyerLead({ email, source: `tunnel-${slug}-suite` }); setSent(true); }} data-testid={`tunnel-suite-form-${slug}`}>
          <input
            className="field flex-1"
            style={{ background: "rgba(253,252,248,0.1)", borderColor: "rgba(253,252,248,0.3)", color: "var(--paper-2)" }}
            placeholder="votre@email.fr"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid={`tunnel-suite-email-${slug}`}
          />
          <button className="btn btn-gold px-6 py-3 text-[14px]" data-testid={`tunnel-suite-submit-${slug}`} disabled={!valid}>
            Accès réservé <ArrowRight size={15} />
          </button>
        </form>
      ) : (
        <div className="mt-5" data-testid={`tunnel-suite-confirmation-${slug}`}>
          <p className="font-hand text-2xl" style={{ color: "var(--gold-soft)" }}>bienvenue dans la maison !</p>
          <p className="mt-1 text-[14px] opacity-80">La séquence part demain matin. Accès réservé activé.</p>
          <p className="mt-1 text-xs opacity-55">Inscription enregistrée.</p>
        </div>
      )}
    </div>
  );
}

export default function TunnelPage() {
  const { slug } = useParams();
  const t = TUNNELS[slug];
  const [formOpen, setFormOpen] = useState(false);

  usePageMeta(
    t ? `${t.title} | Zayado` : "Zayado",
    t ? t.sub : undefined
  );

  if (!t) return <Navigate to="/" replace />;

  return (
    <div data-testid={`tunnel-page-${slug}`}>
      {/* HERO */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--line)" }}>
        <div className="ruled pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-4xl px-5 py-14 text-center md:py-20">
          <Reveal>
            <Stamp>{t.eyebrow}</Stamp>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-[var(--navy)] md:text-6xl">
              <KineticLine delay={0.15}>{t.title}</KineticLine>
            </h1>
            <p className="font-hand mt-3 text-3xl" style={{ color: "var(--gold)" }}>{t.caveat}</p>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed opacity-75">{t.sub}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/diagnostic" data-testid="tunnel-cta-diagnostic" className="btn btn-primary px-8 py-4 text-[16px]">
                Faire mon diagnostic gratuit <ArrowRight size={18} />
              </Link>
              <button data-testid="tunnel-cta-form" className="btn btn-ghost px-6 py-4 text-[15px]" onClick={() => setFormOpen(true)}>
                <Zap size={16} /> Recevoir une réponse rapide
              </button>
            </div>
            <p className="mt-5 flex items-center justify-center gap-2 text-sm font-medium" style={{ color: "var(--gold)" }}>
              <Star size={14} fill="currentColor" strokeWidth={0} /> Un chemin à suivre, pas une décision à précipiter.
            </p>
          </Reveal>
        </div>
      </section>

      {/* LEAD MAGNET */}
      <section className="mx-auto max-w-3xl px-5 py-14">
        <Reveal><LeadMagnet slug={slug} /></Reveal>
      </section>

      {/* DOULEURS */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <Reveal>
          <div className="text-center">
            <Stamp>Ça vous parle ?</Stamp>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[var(--navy)] md:text-4xl">
              Les douleurs qu’on connaît trop.
            </h2>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {t.douleurs.map((d, i) => (
            <Reveal key={d} delay={i * 0.07} className="h-full">
              <div className="card flex h-full items-start gap-3 p-5" data-testid={`tunnel-${slug}-douleur-${i}`}>
                <XCircle size={20} className="mt-0.5 flex-none" style={{ color: "#B4452F" }} />
                <p className="text-[15px] font-medium leading-relaxed text-[var(--navy)]">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* AVANTAGES */}
      <section className="border-y py-16" style={{ borderColor: "var(--line)", background: "var(--paper-2)" }}>
        <div className="mx-auto max-w-5xl px-5">
          <Reveal>
            <div className="text-center">
              <Stamp>Les avantages Zayado</Stamp>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[var(--navy)] md:text-4xl">
                Ce qui change, concrètement.
              </h2>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {t.avantages.map((a, i) => (
              <Reveal key={a} delay={i * 0.07} className="h-full">
                <div className="card flex h-full items-start gap-3 p-5" data-testid={`tunnel-${slug}-avantage-${i}`}>
                  <CheckCircle2 size={20} className="mt-0.5 flex-none" style={{ color: "var(--gold)" }} />
                  <p className="text-[15px] font-medium leading-relaxed text-[var(--navy)]">{a}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {t.angles.length > 0 && (
            <div className="mt-10 space-y-4">
              {t.angles.map((a, i) => (
                <Reveal key={i} delay={i * 0.1}>
                  <div className="bg-navy-grad rounded-3xl px-7 py-8 text-center text-[var(--paper-2)]" data-testid={`tunnel-${slug}-angle-${i}`}>
                    <p className="font-hand text-2xl" style={{ color: "var(--gold-soft)" }}>{i === 0 ? "l’angle Zayado" : "et le calcul gagnant"}</p>
                    <p className="mt-2 text-xl font-medium leading-snug md:text-2xl">{a}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* PARCOURS — UN CHEMIN À SUIVRE */}
      <section className="mx-auto max-w-5xl px-5 py-16 md:py-20">
        <Reveal>
          <div className="text-center">
            <Stamp>Votre parcours dans ce tunnel</Stamp>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[var(--navy)] md:text-4xl">
              Un chemin à suivre, pas une décision à précipiter.
            </h2>
            <p className="font-hand mt-2 text-2xl" style={{ color: "var(--gold)" }}>cinq étapes, zéro précipitation</p>
          </div>
        </Reveal>
        <div className="relative mt-14">
          <div className="absolute bottom-0 left-1/2 top-0 hidden w-px md:block" style={{ background: "var(--line)" }} />
          <div className="space-y-14 md:space-y-16">
            {PATH.map((s, idx) => (
              <div key={s.n} className="relative md:grid md:grid-cols-2 md:items-center md:gap-20" data-testid={`tunnel-${slug}-path-${s.n}`}>
                <span className="absolute left-1/2 top-1/2 hidden h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] md:block" style={{ background: idx === PATH.length - 1 ? "var(--gold)" : "var(--navy)", borderColor: "var(--white)" }} />
                <div className={idx % 2 ? "md:order-2" : ""}>
                  <div className="card p-7">
                    <p className="font-hand text-xl" style={{ color: "var(--navy-500)" }}>étape {s.n.toLowerCase()}</p>
                    <h3 className="mt-1 text-xl font-semibold text-[var(--navy)]">{s.t}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed opacity-75">{s.d}</p>
                    {s.link && (
                      <Link to={s.link} data-testid={`tunnel-${slug}-path-cta-${s.n}`} className="btn btn-primary mt-4 px-5 py-2.5 text-[13px]">
                        Faire le diagnostic <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
                <div className={`hidden md:block ${idx % 2 ? "md:order-1 md:text-right" : "md:order-2"}`}>
                  <span className="text-7xl font-bold leading-none text-grad-navy">{s.n}</span>
                  <p className="mt-2 text-[15px] font-medium opacity-70">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DÉBLOQUER LA SUITE */}
      <section className="mx-auto max-w-3xl px-5 pb-16">
        <Reveal><SuiteBlock slug={slug} /></Reveal>
      </section>

      {/* PREUVE */}
      <section className="border-t py-14" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto max-w-2xl px-5">
          <Reveal>
            <figure className="text-center">
              <span className="font-hand text-6xl leading-none" style={{ color: "var(--gold)" }}>“</span>
              <blockquote className="mt-1 text-xl font-medium leading-relaxed text-[var(--navy)] md:text-2xl">{t.quote.text}</blockquote>
              <figcaption className="mt-4 text-sm">
                <span className="font-semibold">{t.quote.author}</span>
                <span className="opacity-60"> — {t.quote.role}</span>
              </figcaption>
              <p className="mt-4 text-xs opacity-50">Témoignage et résultats : placeholders réalistes, à affiner avec vos vrais clients.</p>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-navy-grad">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center text-[var(--paper-2)]">
          <Reveal>
            <p className="font-hand text-3xl" style={{ color: "var(--gold-soft)" }}>le premier pas ?</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">2 minutes pour vous situer.</h2>
            <p className="mx-auto mt-4 max-w-md text-[15px] opacity-75">
              Le diagnostic gratuit vous donne votre profil et vos 3 leviers prioritaires — puis le chemin fait le reste.
            </p>
            <Link to="/diagnostic" data-testid="tunnel-final-cta-diagnostic" className="btn btn-gold mt-8 px-9 py-4 text-[16px]">
              Faire mon diagnostic gratuit <ArrowRight size={18} />
            </Link>
          </Reveal>
        </div>
      </section>

      <ServiceForm open={formOpen} onClose={() => setFormOpen(false)} mode="devis" service={{ title: t.formService.title }} />
    </div>
  );
}
