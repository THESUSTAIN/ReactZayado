import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Star, User, Building2 } from "lucide-react";
import Marquee from "@/components/Marquee";
import { Reveal, KineticLine, GoldUnderline, CountUp, Stamp } from "@/components/Reveal";
import usePageMeta from "@/hooks/usePageMeta";
import { IMG } from "@/data/images";
import { BRAND, MISSION, FOUNDATIONS, MEANS, STATS, TESTIMONIALS, LOGOS, POSITIONING, BOXES, VISION_HUMAINE } from "@/data/content";

const PNode = ({ title, sub, tone = "light", testid }) => (
  <div className="mx-auto w-full max-w-sm">
    <div
      className={`rounded-2xl border px-6 py-4 text-center ${tone === "navy" ? "bg-navy-grad border-transparent text-[var(--paper-2)]" : tone === "gold" ? "border-transparent" : "card"}`}
      style={tone === "gold" ? { background: "var(--gold-soft)" } : {}}
      data-testid={testid}
    >
      <p className={`text-[15px] font-semibold ${tone === "light" || tone === "gold" ? "text-[var(--navy)]" : ""}`}>{title}</p>
      {sub && <p className={`mt-0.5 text-xs ${tone === "navy" ? "opacity-70" : "opacity-60"}`}>{sub}</p>}
    </div>
  </div>
);

const Conn = () => <div className="mx-auto h-8 w-px" style={{ background: "var(--line)" }} />;

const FICONS = { user: User, building: Building2 };

export default function MaisonPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yImg = useTransform(scrollYProgress, [0, 1], [0, 70]);

  usePageMeta(
    "La Maison Zayado — deux socles, un équilibre",
    "Zayado, la maison des entrepreneurs apaisés : deux socles (l’entrepreneur et l’entreprise), quatre moyens, un tunnel de vente continu — de l’acquisition à la marketplace."
  );

  return (
    <div>
      {/* ===== HERO ===== */}
      <section ref={heroRef} className="relative overflow-hidden" data-testid="maison-hero">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(900px 500px at 85% -10%, rgba(46,74,107,0.14), transparent 65%)" }}
        />
        <div className="ruled pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-12 md:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28">
          <div>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Stamp>{BRAND.maison}</Stamp>
            </motion.div>
            <h1 className="mt-6 text-[42px] font-semibold leading-[1.05] tracking-tight text-[var(--navy)] sm:text-6xl lg:text-7xl">
              <KineticLine delay={0.15}>L’entreprise performante,</KineticLine>
              <KineticLine delay={0.32}>
                sans vous y{" "}
                <span className="relative inline-block">
                  épuiser.
                  <GoldUnderline className="absolute -bottom-3 left-0 h-[12px] w-full" delay={1.1} />
                </span>
              </KineticLine>
            </h1>
            <motion.p
              className="font-hand mt-5 text-2xl md:text-3xl"
              style={{ color: "var(--gold)" }}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.7 }}
              data-testid="maison-slogan"
            >
              « {BRAND.slogan} »
            </motion.p>
            <motion.p
              className="mt-4 max-w-lg text-lg leading-relaxed"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.7 }}
            >
              Zayado équilibre votre vie personnelle et votre vie professionnelle : la santé financière de
              l’entreprise, le bien-être de l’entrepreneur. Commencez par le diagnostic — 2 minutes, votre profil,
              vos 3 leviers prioritaires.
            </motion.p>
            <motion.div
              className="mt-8 flex flex-wrap items-center gap-4"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.7 }}
            >
              <Link to="/diagnostic" data-testid="maison-cta-diagnostic" className="btn btn-primary px-8 py-4 text-[17px]">
                Faire mon diagnostic gratuit <ArrowRight size={18} />
              </Link>
              <a href="#base" data-testid="maison-cta-base" className="btn btn-ghost px-6 py-4 text-[15px]">
                Découvrir notre base
              </a>
            </motion.div>
            <motion.div
              className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.7 }}
              data-testid="maison-trust-row"
            >
              <span className="flex items-center gap-1.5" style={{ color: "var(--gold)" }}>
                {[...Array(5)].map((_, i) => <Star key={i} size={15} fill="currentColor" strokeWidth={0} />)}
              </span>
              <span className="font-medium text-[var(--navy)]">4,9/5 — +300 dirigeants déjà diagnostiqués</span>
              <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: "var(--line)" }}>
                Sans engagement
              </span>
            </motion.div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <motion.div style={{ y: yImg }} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}>
              <div className="arch relative overflow-hidden border" style={{ borderColor: "var(--line)" }} data-testid="maison-image-frame">
                <img src={IMG.hero} alt="Dirigeant qui relit ses chiffres avec clarté" className="h-[420px] w-full object-cover md:h-[560px]" />
              </div>
              <span className="tapeline -top-2 left-8" />
            </motion.div>
            <motion.div
              className="card absolute -bottom-6 -left-4 w-60 p-4 sm:-left-10"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.7 }}
              data-testid="maison-cockpit-card"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-60">Cockpit — signal IA</p>
              <div className="mt-2 space-y-1.5 text-sm font-medium text-[var(--navy)]">
                <p className="flex justify-between"><span>Chiffre d’affaires</span><span style={{ color: "var(--gold)" }}>▲ +12 %</span></p>
                <p className="flex justify-between"><span>Charge de travail</span><span style={{ color: "#B4452F" }}>▲ +30 %</span></p>
              </div>
              <p className="mt-2 border-t pt-2 text-xs opacity-70" style={{ borderColor: "var(--line)" }}>
                3 actions prioritaires suggérées
              </p>
            </motion.div>
            <span className="font-hand absolute -right-1 top-6 hidden rotate-6 text-2xl sm:block" style={{ color: "var(--gold)" }}>
              c’est toute l’idée →
            </span>
          </div>
        </div>
      </section>

      {/* ===== POSITIONING ===== */}
      <section className="border-y bg-[var(--paper-2)]" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
          <Reveal>
            <div className="flex flex-wrap gap-2.5">
              {POSITIONING.nots.map((t) => (
                <span key={t} className="rounded-full border px-4 py-1.5 text-[13px] font-medium opacity-60 line-through" style={{ borderColor: "var(--line)" }}>
                  {t}
                </span>
              ))}
            </div>
            <h2 className="mt-6 max-w-3xl text-3xl font-semibold leading-snug tracking-tight text-[var(--navy)] md:text-5xl" data-testid="maison-positioning-lead">
              {POSITIONING.lead}
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {POSITIONING.lines.map(([a, b], i) => (
              <Reveal key={a} delay={i * 0.08} className="h-full">
                <div className="card h-full p-5" data-testid={`maison-positioning-line-${i}`}>
                  <p className="font-semibold text-[var(--navy)]">{a}</p>
                  <p className="mt-1.5 text-sm leading-relaxed opacity-70">{b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== VISION HUMAINE ===== */}
      <section id="vision-humaine" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 md:py-24">
        <Reveal>
          <Stamp>Vision humaine</Stamp>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--navy)] md:text-5xl">
            {VISION_HUMAINE.lead}
          </h2>
          <p className="font-hand mt-2 text-2xl" style={{ color: "var(--gold)" }}>
            {VISION_HUMAINE.caveat}
          </p>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {VISION_HUMAINE.values.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.12} className="h-full">
              <div className="card ruled h-full p-7" data-testid={`maison-vision-humaine-${i}`}>
                <span className="text-5xl font-bold leading-none text-grad-navy">0{i + 1}</span>
                <h3 className="mt-4 text-2xl font-semibold text-[var(--navy)]">{v.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed opacity-75">{v.content}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== LA BASE : DEUX SOCLES ===== */}
      <section id="base" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 md:py-28">
        <Reveal>
          <Stamp>La base Zayado</Stamp>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--navy)] md:text-5xl">
            Deux socles, un équilibre.
          </h2>
          <p className="font-hand mt-2 text-2xl" style={{ color: "var(--gold)" }}>
            la vie perso et la vie pro, au même niveau
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {FOUNDATIONS.map((f, i) => {
            const Icon = FICONS[f.icon];
            return (
              <Reveal key={f.key} delay={i * 0.12} className="h-full">
                <div className="card ruled h-full p-8" data-testid={`maison-foundation-card-${f.key}`}>
                  <div className="flex items-center gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
                      <Icon size={22} style={{ color: "var(--navy)" }} />
                    </span>
                    <div>
                      <h3 className="text-2xl font-semibold text-[var(--navy)]">{f.title}</h3>
                      <p className="font-hand text-xl leading-none" style={{ color: "var(--gold)" }}>{f.sub}</p>
                    </div>
                  </div>
                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] opacity-60">Les axes</p>
                  <div className="mt-2.5 flex flex-wrap gap-2.5">
                    {f.axes.map((a) => (
                      <span key={a} className="rounded-full px-4 py-2 text-[14px] font-semibold text-[var(--navy)]" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
                        {a}
                      </span>
                    ))}
                  </div>
                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] opacity-60">{f.pathLabel}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                    {f.path.map((s, j) => (
                      <span key={s} className="flex items-center gap-2.5">
                        <span className="rounded-full border px-4 py-2 text-[14px] font-medium text-[var(--navy)]" style={{ borderColor: "var(--line)" }}>
                          {s}
                        </span>
                        {j < f.path.length - 1 && <ArrowRight size={14} style={{ color: "var(--gold)" }} />}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal>
          <div className="bg-navy-grad mt-6 rounded-3xl px-8 py-10 text-center text-[var(--paper-2)]" data-testid="maison-mission-band">
            <p className="font-hand text-2xl" style={{ color: "var(--gold-soft)" }}>notre métier</p>
            <p className="mt-2 text-2xl font-semibold leading-snug md:text-3xl">{MISSION}</p>
          </div>
        </Reveal>

        <Reveal>
          <p className="mt-14 text-center text-xs font-semibold uppercase tracking-[0.16em] opacity-60">
            Nos moyens pour y arriver
          </p>
        </Reveal>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {MEANS.map((m, i) => (
            <Reveal key={m.num} delay={i * 0.08} className="h-full">
              <Link
                to={m.to}
                data-testid={`maison-mean-card-${m.num}`}
                className="card group flex h-full flex-col p-6 transition-transform duration-300 hover:-translate-y-1.5"
              >
                <span className="text-4xl font-bold leading-none text-grad-navy">{m.num}</span>
                <h3 className="mt-4 text-lg font-semibold leading-snug text-[var(--navy)]">{m.title}</h3>
                <p className="mt-2 flex-1 text-[13.5px] leading-relaxed opacity-70">{m.text}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "var(--gold)" }}>
                  Explorer <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== TUNNEL DE VENTE ===== */}
      <section id="parcours" className="border-y bg-[var(--paper-2)]" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto max-w-3xl px-5 py-20 md:py-28">
          <Reveal>
            <div className="text-center">
              <Stamp>Le tunnel de vente Zayado</Stamp>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--navy)] md:text-5xl">
                Un fil continu, du désir au durable.
              </h2>
              <p className="font-hand mt-2 text-2xl" style={{ color: "var(--gold)" }}>
                chaque étape mène naturellement à la suivante
              </p>
            </div>
          </Reveal>
          <div className="mt-14 flex flex-col items-center">
            <Reveal className="w-full"><PNode title="L’entrepreneur" sub="l’équilibre au centre" testid="maison-parcours-entrepreneur" /></Reveal>
            <Conn />
            <Reveal className="w-full"><PNode tone="navy" title="Diagnostic Zayado" sub="gratuit · 2 min · profil + 3 leviers" testid="maison-parcours-diagnostic" /></Reveal>
            <Conn />
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
              <Reveal className="h-full"><PNode title="Acquérir" sub="sourcing → closing" testid="maison-parcours-acquerir" /></Reveal>
              <Reveal delay={0.08} className="h-full"><PNode title="Optimiser" sub="rentabilité → environnement" testid="maison-parcours-optimiser" /></Reveal>
            </div>
            <Conn />
            <Reveal className="w-full"><PNode tone="navy" title="Cockpit Zayado" sub="le lien permanent — l’IA fait le lien" testid="maison-parcours-cockpit" /></Reveal>
            <Conn />
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
              <Reveal className="h-full"><PNode title="Entreprise" sub="CA · marge · trésorerie · projets" testid="maison-parcours-entreprise" /></Reveal>
              <Reveal delay={0.08} className="h-full"><PNode title="Entrepreneur" sub="énergie · focus · récupération · équilibre" testid="maison-parcours-entrepreneur2" /></Reveal>
            </div>
            <Conn />
            <Reveal className="w-full"><PNode title="Marketplace" sub="produits · équipements · partenaires" testid="maison-parcours-marketplace" /></Reveal>
            <Conn />
            <Reveal className="w-full"><PNode tone="gold" title="Performance durable" testid="maison-parcours-performance" /></Reveal>
          </div>
        </div>
      </section>

      <Marquee />

      {/* ===== TRUST STACK (NAVY) ===== */}
      <section className="bg-navy-grad text-[var(--paper-2)]" data-testid="maison-trust-stack">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
          <Reveal>
            <Stamp dark>Preuve sociale</Stamp>
            <h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
              Des dirigeants qui respirent enfin.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" data-testid="maison-stats-band">
            {STATS.map((st, i) => (
              <Reveal key={st.label} delay={i * 0.1}>
                <div className="border-l-2 pl-5" style={{ borderColor: "var(--gold)" }}>
                  <CountUp to={st.v} suffix={st.s} decimals={st.d || 0} className="text-5xl font-bold text-[var(--gold-soft)]" />
                  <p className="mt-2 text-sm opacity-75">{st.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.author} delay={i * 0.12} className="h-full">
                <figure className="h-full rounded-2xl border p-6" style={{ borderColor: "rgba(253,252,248,0.16)", background: "rgba(253,252,248,0.05)" }} data-testid={`maison-testimonial-${i}`}>
                  <span className="font-hand text-4xl leading-none" style={{ color: "var(--gold-soft)" }}>“</span>
                  <blockquote className="mt-2 text-[15px] leading-relaxed opacity-90">{t.text}</blockquote>
                  <figcaption className="mt-4 text-sm font-semibold text-[var(--gold-soft)]">
                    {t.author} <span className="font-normal opacity-70">— {t.role}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.15}>
            <div className="mt-14 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-60" data-testid="maison-logo-row">
              {LOGOS.map((l) => (
                <span key={l} className="text-[15px] font-semibold uppercase tracking-[0.2em]">{l}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== MARKETPLACE TEASER ===== */}
      <section className="border-y bg-[var(--paper-2)]" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:py-28 lg:grid-cols-2">
          <Reveal>
            <Stamp>La Marketplace · Univers séparé</Stamp>
            <h2 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--navy)] md:text-5xl">
              Équiper l’entreprise et l’entrepreneur.
            </h2>
            <p className="font-hand mt-2 text-2xl" style={{ color: "var(--gold)" }}>
              simple, claire, complète — la maison s’équipe
            </p>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed opacity-75">
              Mobilier, ergonomie, éclairage, végétalisation côté entreprise ; bien-être, concentration, récupération
              côté entrepreneur — et des partenaires spécialisés, dont Trouveton.
            </p>
            <Link to="/marketplace" data-testid="maison-marketplace-cta" className="btn btn-ghost mt-7 px-6 py-3.5 text-[15px]">
              Explorer la marketplace <ArrowRight size={16} />
            </Link>
          </Reveal>
          <div>
            <div className="grid grid-cols-2 gap-5">
              {BOXES.map((b, i) => (
                <Reveal key={b.id} delay={i * 0.14} className={i === 1 ? "mt-10" : ""}>
                  <Link to="/box" data-testid={`maison-box-card-${b.id}`} className="group block">
                    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--line)" }}>
                      <img src={IMG[b.img]} alt={b.name} className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <p className="mt-3 text-[15px] font-semibold text-[var(--navy)]">{b.name}</p>
                    <p className="text-sm font-medium" style={{ color: "var(--gold)" }}>{b.price} €</p>
                  </Link>
                </Reveal>
              ))}
            </div>
            <p className="font-hand mt-4 text-right text-xl" style={{ color: "var(--gold)" }}>les éditions saisonnières</p>
          </div>
        </div>
      </section>

      {/* ===== ECOSYSTEM NOTE (DISCREET) ===== */}
      <section className="mx-auto max-w-6xl px-5 py-10">
        <Reveal>
          <p className="text-center text-sm opacity-55" data-testid="maison-ecosystem-note">
            TheSustain — <span className="font-hand text-base" style={{ color: "var(--gold)" }}>la sélection durable qui nourrit la marketplace</span>
          </p>
        </Reveal>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="bg-navy-grad">
        <div className="mx-auto max-w-4xl px-5 py-24 text-center text-[var(--paper-2)] md:py-32" data-testid="maison-final-cta">
          <Reveal>
            <p className="font-hand text-3xl" style={{ color: "var(--gold-soft)" }}>on s’y met ?</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">Prêt à construire l’équilibre ?</h2>
            <p className="mx-auto mt-5 max-w-md text-[15px] opacity-75">
              Gratuit · 2 min · Résultat immédiat. Votre profil et vos 3 leviers prioritaires, sans engagement.
            </p>
            <Link to="/diagnostic" data-testid="maison-final-cta-diagnostic" className="btn btn-gold mt-9 px-10 py-4 text-[17px]">
              Faire mon diagnostic gratuit <ArrowRight size={18} />
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
