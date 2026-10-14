import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function Anneau({ pct, label, size = 112, testId }: { pct: number | null; label: string; size?: number; testId: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const v = pct ?? 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} data-testid={testId}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#E2E8F0" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#DEC2A3"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * v) / 100}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular-nums text-xl font-semibold text-slate-900" data-testid={`${testId}-value`}>
          {pct === null ? "—" : `${pct} %`}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
      </div>
    </div>
  );
}

export function Carte({ children, className, testId }: { children: ReactNode; className?: string; testId?: string }) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-xs animate-rise", className)} data-testid={testId}>
      {children}
    </section>
  );
}

export function SurTitre({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-xs font-semibold uppercase tracking-wider text-amber-600", className)}>{children}</p>;
}

export function Verrou({ texte, testId }: { texte: string; testId: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 px-3 py-2.5 text-sm text-amber-800" data-testid={testId}>
      <Lock className="size-4 shrink-0" /> <span className="min-w-0 flex-1">{texte}</span>
      <a href="/pricing" className="shrink-0 rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700" data-testid={`${testId}-upgrade`}>
        Passer à l'offre supérieure
      </a>
    </div>
  );
}

export function Vide({ children, testId }: { children: ReactNode; testId: string }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-6 text-center text-sm text-slate-500" data-testid={testId}>
      {children}
    </p>
  );
}

/** Bouton d'engagement or #DEC2A3 — un seul par carte. */
export const btnOr =
  "inline-flex items-center justify-center gap-1.5 btn-champagne rounded-lg px-3 py-1.5 text-sm font-semibold text-[#0f1b3a] transition-[filter,transform] duration-150 hover:brightness-105 active:scale-[0.97] disabled:opacity-50";
