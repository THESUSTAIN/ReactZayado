import { useState } from "react";
import { ArrowRight, BarChart3, Briefcase, Heart, Target, Glasses, Armchair, Anchor, Sprout, Footprints, Coffee, Gift, Package, Settings, CheckCircle2 } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { COMING_SOON, COCKPIT } from "@/data/content";
import { envoyerLead } from "@/lib/api";

const PICONS = { chart: BarChart3, case: Briefcase, heart: Heart, target: Target };
const RICONS = { glasses: Glasses, chair: Armchair, anchor: Anchor, plant: Sprout, move: Footprints, coffee: Coffee, gift: Gift, pack: Package };

export default function ComingSoon() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const valid = /.+@.+\..+/.test(email);

  return (
    <div className="relative min-h-screen overflow-hidden text-[var(--paper-2)]" style={{ background: "linear-gradient(160deg, #0A1B31 0%, #132C49 55%, #2E4A6B 100%)" }} data-testid="coming-soon-page">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(900px 500px at 90% -10%, rgba(228,200,127,0.12), transparent 60%)" }}
      />
      <div className="relative mx-auto max-w-4xl px-5 py-14 md:py-20">
        {/* LOGO */}
        <div className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-bold" style={{ background: "var(--gold-soft)", color: "var(--navy)" }}>Z</span>
          <div>
            <p className="text-xl font-semibold tracking-[0.28em]">ZAYADO</p>
            <p className="font-hand text-lg leading-none" style={{ color: "var(--gold-soft)" }}>la maison des entrepreneurs apaisés</p>
          </div>
        </div>

        {/* HERO */}
        <div className="mt-14 text-center md:mt-20">
          <p className="flex items-center justify-center gap-3 text-[13px] font-semibold uppercase tracking-[0.3em]" data-testid="coming-soon-eyebrow">
            <span className="h-px w-8" style={{ background: "var(--gold)" }} />
            Entreprendre avec clarté
            <span className="h-px w-8" style={{ background: "var(--gold)" }} />
          </p>
          <h1 className="mt-5 text-6xl font-bold tracking-tight md:text-8xl">
            Coming <span className="font-hand font-semibold" style={{ color: "var(--gold-soft)" }}>soon</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed opacity-85">
            {COMING_SOON.sub}
          </p>
          <p className="font-hand mt-4 text-2xl" style={{ color: "var(--gold-soft)" }}>
            « Entreprendre avec clarté financière, sérénité et équilibre. »
          </p>
        </div>

        {/* 4 PILIERS COURTS */}
        <div className="mt-14 grid grid-cols-2 gap-5 sm:grid-cols-4" data-testid="coming-soon-pillars">
          {COMING_SOON.pillars.map((p) => {
            const Icon = PICONS[p.icon];
            return (
              <div key={p.label} className="rounded-2xl border px-4 py-6 text-center" style={{ borderColor: "rgba(253,252,248,0.18)", background: "rgba(253,252,248,0.05)" }}>
                <Icon size={22} className="mx-auto" style={{ color: "var(--gold-soft)" }} />
                <p className="mt-3 text-[14px] font-semibold">{p.label}</p>
              </div>
            );
          })}
        </div>

        {/* RAYONS DU CATALOGUE */}
        <div className="mt-14">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] opacity-60">Nos futurs rayons</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2" data-testid="coming-soon-rays">
            {COMING_SOON.rays.map((r) => {
              const Icon = RICONS[r.icon];
              return (
                <div key={r.label} className="flex items-center gap-3 rounded-2xl border px-4 py-3.5" style={{ borderColor: "rgba(253,252,248,0.14)", background: "rgba(253,252,248,0.04)" }}>
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl" style={{ background: "rgba(228,200,127,0.15)" }}>
                    <Icon size={16} style={{ color: "var(--gold-soft)" }} />
                  </span>
                  <p className="text-[14px] font-medium">{r.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* COCKPIT SECTION */}
        <div className="mt-14 rounded-3xl border p-7 md:p-10" style={{ borderColor: "rgba(253,252,248,0.16)", background: "rgba(253,252,248,0.05)" }} data-testid="coming-soon-cockpit">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--gold-soft)" }}>Et au centre : le Cockpit</p>
          <div className="mt-6 grid items-center gap-8 md:grid-cols-[auto_1fr]">
            <div className="mx-auto flex h-32 w-32 flex-col items-center justify-center rounded-full border-4" style={{ borderColor: "var(--gold)" }}>
              <span className="text-3xl font-bold">78<span className="text-base opacity-70">/100</span></span>
              <span className="text-[11px] uppercase tracking-[0.14em] opacity-70">équilibre</span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold md:text-3xl">Votre cockpit, pas une liste de plus.</h2>
              <p className="mt-2 text-[15px] leading-relaxed opacity-80">
                Il suit l’entreprise — {COCKPIT.entreprise.slice(0, 3).join(", ").toLowerCase()} — et l’entrepreneur —{" "}
                {COCKPIT.entrepreneur.slice(0, 3).join(", ").toLowerCase()}. Et l’IA fait le lien.
              </p>
              <div className="mt-4 space-y-2">
                {[["Clarté financière", 88], ["Énergie", 72], ["Sérénité", 80]].map(([l, v]) => (
                  <div key={l} className="flex items-center gap-3">
                    <span className="w-36 text-[12px] opacity-75">{l}</span>
                    <div className="h-1.5 flex-1 rounded-full" style={{ background: "rgba(253,252,248,0.15)" }}>
                      <div className="h-full rounded-full" style={{ width: `${v}%`, background: "var(--gold)" }} />
                    </div>
                    <span className="w-8 text-right text-[12px] font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* WAITLIST */}
        <div className="mt-14 text-center">
          <span className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ background: "var(--gold)", color: "var(--navy)" }} data-testid="coming-soon-badge">
            <Settings size={13} className="animate-spin-slow" /> Coming soon
          </span>
          {!sent ? (
            <form className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (!valid) return; envoyerLead({ email, source: "coming-soon-boutique" }); setSent(true); }} data-testid="coming-soon-form">
              <input
                className="field flex-1"
                style={{ background: "rgba(253,252,248,0.1)", borderColor: "rgba(253,252,248,0.3)", color: "var(--paper-2)" }}
                placeholder="votre@email.fr"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="coming-soon-email"
              />
              <button className="btn btn-gold px-6 py-3 text-[14px]" data-testid="coming-soon-notify" disabled={!valid}>
                M’avertir à l’ouverture <ArrowRight size={15} />
              </button>
            </form>
          ) : (
            <div className="mt-6" data-testid="coming-soon-confirmation">
              <p className="flex items-center justify-center gap-2 text-[15px] font-medium">
                <CheckCircle2 size={18} style={{ color: "var(--gold)" }} /> Vous serez prévenu à l’ouverture.
              </p>
              <p className="mt-1 text-xs opacity-55">Votre email est enregistré sur la liste d’attente.</p>
            </div>
          )}
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[13px] font-medium opacity-80" style={{ borderColor: "rgba(253,252,248,0.25)" }}>
            {COMING_SOON.domains.map((d, i) => (
              <span key={d} className="flex items-center gap-2">
                {i > 0 && <span style={{ color: "var(--gold)" }}>•</span>} {d}
              </span>
            ))}
          </div>
          <p className="mt-6 text-xs opacity-45">La boutique arrive — page pensée pour être branchée sur Shopify à l’ouverture.</p>
        </div>
      </div>
    </div>
  );
}
