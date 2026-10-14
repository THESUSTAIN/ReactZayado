import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Leaf, BarChart3, Users2, Flower2, CheckCircle2 } from "lucide-react";
import { KineticLine, Stamp } from "@/components/Reveal";
import { IMG } from "@/data/images";
import { LANDING, BRAND } from "@/data/content";

const BICONS = { leaf: Leaf, chart: BarChart3, users: Users2, flower: Flower2 };

export default function Home() {
  const { hero, needs } = LANDING;

  return (
    <div>
      {/* ===== SECTION 1 — HERO ===== */}
      <section className="relative overflow-hidden" data-testid="landing-hero">
        <div className="ruled pointer-events-none absolute inset-0 opacity-40" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(900px 500px at 85% -10%, rgba(46,74,107,0.13), transparent 65%)" }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 md:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:pb-20">
          <div>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Stamp>{BRAND.maison}</Stamp>
            </motion.div>
            <h1 className="mt-6 text-[40px] font-semibold leading-[1.08] tracking-tight text-[var(--navy)] sm:text-5xl lg:text-6xl">
              <KineticLine delay={0.15}>Entreprendre avec</KineticLine>
              <KineticLine delay={0.3}>
                <span className="font-hand font-semibold" style={{ color: "var(--gold)" }}>clarté financière,</span>
              </KineticLine>
              <KineticLine delay={0.45}>sérénité et équilibre.</KineticLine>
            </h1>
            <motion.p
              className="mt-6 max-w-lg text-[17px] leading-relaxed"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.7 }}
            >
              {hero.sub}
            </motion.p>
            <motion.div
              className="mt-8 flex flex-wrap items-center gap-4"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.7 }}
            >
              <Link to="/diagnostic" data-testid="cta-hero-diagnostic" className="btn btn-primary px-8 py-4 text-[17px]">
                Faire mon diagnostic <ArrowRight size={18} />
              </Link>
              <Link to="/marketplace" data-testid="cta-hero-marketplace" className="btn btn-ghost px-6 py-4 text-[15px]">
                Explorer la marketplace
              </Link>
            </motion.div>
            <motion.div
              className="mt-10 grid gap-5 sm:grid-cols-2"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.7 }}
              data-testid="hero-benefits"
            >
              {hero.benefits.map((b) => {
                const Icon = BICONS[b.icon];
                return (
                  <div key={b.t} className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
                      <Icon size={18} style={{ color: "var(--navy)" }} />
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold text-[var(--navy)]">{b.t}</p>
                      <p className="text-[13px] leading-snug opacity-65">{b.d}</p>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="relative overflow-hidden rounded-[28px] border" style={{ borderColor: "var(--line)" }} data-testid="hero-image-frame">
                <img src={IMG.heroDesk} alt="Bureau apaisé : dashboard d’équilibre, plantes et carnet" className="h-[460px] w-full object-cover md:h-[560px]" />
              </div>
              <span className="tapeline -top-2 left-10" />
            </motion.div>

            <motion.div
              className="card absolute -top-6 right-0 w-60 p-4 sm:-right-6"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15, duration: 0.7 }}
              data-testid="hero-equilibre-card"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-60">Mon équilibre</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full border-2 text-[13px] font-bold" style={{ borderColor: "var(--gold)", color: "var(--navy)" }}>
                  {hero.equilibre.score}
                </span>
                <p className="text-xs font-medium opacity-70">score global /100</p>
              </div>
              <div className="mt-3 space-y-2">
                {hero.equilibre.items.map(([label, v]) => (
                  <div key={label}>
                    <div className="flex justify-between text-[11px] font-medium opacity-75"><span>{label}</span><span>{v}</span></div>
                    <div className="mt-0.5 h-1.5 rounded-full" style={{ background: "rgba(19,35,62,0.1)" }}>
                      <motion.div className="h-full rounded-full" style={{ background: "var(--gold)" }} initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ delay: 1.4, duration: 0.9 }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="card absolute -bottom-5 left-4 flex w-60 items-center gap-3 p-4"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.35, duration: 0.7 }}
              data-testid="hero-action-card"
            >
              <CheckCircle2 size={20} className="flex-none" style={{ color: "var(--gold)" }} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-60">{hero.action.label}</p>
                <p className="text-[13px] font-semibold text-[var(--navy)]">{hero.action.text} →</p>
              </div>
            </motion.div>

            <span className="font-hand absolute -bottom-5 right-0 hidden rotate-6 text-2xl sm:block" style={{ color: "var(--gold)" }}>
              {hero.caveat} →
            </span>
          </div>
        </div>
      </section>

      {/* ===== SECTION 2 — VOTRE BESOIN ===== */}
      <section className="border-t bg-[var(--paper-2)]" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto max-w-6xl px-5 py-12 md:py-14">
          <div className="text-center" data-testid="needs-header">
            <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--gold)" }}>{needs.eyebrow}</p>
            <h2 className="mt-2.5 text-3xl font-semibold tracking-tight text-[var(--navy)] md:text-5xl">
              Quel est votre besoin <span className="font-hand" style={{ color: "var(--gold)" }}>aujourd’hui ?</span>
            </h2>
            <p className="mt-2.5 text-[15px] opacity-70">{needs.sub}</p>
          </div>

          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {/* Pour moi */}
            <motion.div
              initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="card flex flex-col p-6"
              data-testid="need-card-moi"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
                <Leaf size={20} style={{ color: "var(--navy)" }} />
              </span>
              <h3 className="mt-4 text-2xl font-semibold text-[var(--navy)]">{needs.moi.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed opacity-70">{needs.moi.text}</p>
              <div className="mt-3 flex flex-1 flex-wrap content-start gap-2">
                {needs.moi.tags.map((t) => (
                  <span key={t} className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--navy)]" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
                    {t}
                  </span>
                ))}
              </div>
              <Link to={needs.moi.cta.to} data-testid="need-moi-cta" className="btn btn-ghost mt-5 w-full px-5 py-3 text-[14px]">
                {needs.moi.cta.label} <ArrowRight size={15} />
              </Link>
            </motion.div>

            {/* Diagnostic — centre */}
            <motion.div
              initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-navy-grad relative flex flex-col items-center rounded-[22px] px-7 py-8 text-center text-[var(--paper-2)]"
              data-testid="need-card-diagnostic"
            >
              <span className="absolute -top-5 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border-4 border-[var(--paper-2)]" style={{ background: "var(--gold)" }}>
                <Leaf size={17} style={{ color: "var(--navy)" }} />
              </span>
              <h3 className="mt-3 text-3xl font-semibold leading-tight">{needs.diag.title}</h3>
              <p className="mt-3 flex-1 text-[14px] leading-relaxed opacity-85">{needs.diag.text}</p>
              <Link to={needs.diag.cta.to} data-testid="need-diagnostic-cta" className="btn btn-gold mt-6 w-full px-5 py-3.5 text-[15px]">
                {needs.diag.cta.label} <ArrowRight size={16} />
              </Link>
            </motion.div>

            {/* Pour mon entreprise */}
            <motion.div
              initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="card flex flex-col p-6"
              data-testid="need-card-entreprise"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
                <BarChart3 size={20} style={{ color: "var(--navy)" }} />
              </span>
              <h3 className="mt-4 text-2xl font-semibold text-[var(--navy)]">{needs.entreprise.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed opacity-70">{needs.entreprise.text}</p>
              <div className="mt-3 flex flex-1 flex-wrap content-start gap-2">
                {needs.entreprise.tags.map((t) => (
                  <span key={t} className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--navy)]" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
                    {t}
                  </span>
                ))}
              </div>
              <Link to={needs.entreprise.cta.to} data-testid="need-entreprise-cta" className="btn btn-ghost mt-5 w-full px-5 py-3 text-[14px]">
                {needs.entreprise.cta.label} <ArrowRight size={15} />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
