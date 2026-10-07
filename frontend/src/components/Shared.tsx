import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnergyLevel } from "@/lib/types";

// Smoked-glass card — the signature Revo surface (see design_guidelines.json).
export function GlassCard({
  className,
  children,
  ...rest
}: { className?: string; children: ReactNode; "data-testid"?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("glass rounded-2xl", className)} {...rest}>
      {children}
    </div>
  );
}

// Micro data-tag in JetBrains Mono — 'SCORE 94/100', 'CANAL : EMAIL'…
export function MonoTag({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string; "data-testid"?: string } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-slate-800/60 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <MonoTag className="text-blue-400">{eyebrow}</MonoTag>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">{description}</p>
      </div>
      {children ? <div className="flex shrink-0 items-center gap-3">{children}</div> : null}
    </header>
  );
}

export function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  testid,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  testid: string;
}) {
  return (
    <GlassCard
      data-testid={testid}
      className="flex items-start gap-4 p-5 transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2.5 text-sky-400">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="mt-1 font-heading text-xl font-semibold text-white">{value}</p>
        {sub ? <p className="mt-0.5 text-xs text-slate-400">{sub}</p> : null}
      </div>
    </GlassCard>
  );
}

export function Progress({ value, testid }: { value: number; testid?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800" data-testid={testid}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-700 via-blue-500 to-sky-400 transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export const eur = (n: number): string =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export const energyChipClass = (level: EnergyLevel): string =>
  level === "Haut"
    ? "border-sky-400/40 bg-sky-400/10 text-sky-300"
    : level === "Moyen"
      ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
      : "border-slate-500/40 bg-slate-500/10 text-slate-300";

export const MOTTO = "L'IA prépare. Vous décidez. Rien n'est envoyé sans votre validation.";
