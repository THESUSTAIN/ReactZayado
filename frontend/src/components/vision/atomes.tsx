import type { ReactNode } from "react";

/* Briques visuelles de VisionAct : une seule matière (verre sombre),
   la hiérarchie se fait par l'élévation. */

export function Carte({
  children,
  haut = false,
  className = "",
  testId,
}: {
  children: ReactNode;
  haut?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={`verre ${haut ? "verre-haut" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function PastilleIcone({ children }: { children: ReactNode }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#dec2a3]/15 text-[#dec2a3] ring-1 ring-[#dec2a3]/25">
      {children}
    </span>
  );
}

/** Jauge en demi-cercle — le score d'équilibre. */
export function Jauge({ valeur, testId }: { valeur: number; testId?: string }) {
  const r = 58;
  const longueur = Math.PI * r;
  const part = Math.max(0, Math.min(100, valeur)) / 100;
  return (
    <div className="relative w-[150px]" data-testid={testId}>
      <svg viewBox="0 0 140 82" className="w-full">
        <path
          d={`M 12 72 A ${r} ${r} 0 0 1 128 72`}
          fill="none"
          stroke="rgba(168,182,209,0.22)"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d={`M 12 72 A ${r} ${r} 0 0 1 128 72`}
          fill="none"
          stroke="#dec2a3"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${longueur * part} ${longueur}`}
          style={{ transition: "stroke-dasharray 700ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <span className="chiffre text-4xl font-medium text-[#eceff7]">{valeur}</span>
        <span className="chiffre text-base text-[#a8b6d1]">/100</span>
      </div>
    </div>
  );
}

/** Anneau circulaire — la capacité du jour. */
export function Anneau({
  valeur,
  taille = 92,
  testId,
}: {
  valeur: number;
  taille?: number;
  testId?: string;
}) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const part = Math.max(0, Math.min(100, valeur)) / 100;
  return (
    <div
      className="relative shrink-0"
      style={{ width: taille, height: taille }}
      data-testid={testId}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(168,182,209,0.22)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#dec2a3"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${c * part} ${c}`}
          style={{ transition: "stroke-dasharray 700ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <span className="chiffre absolute inset-0 grid place-items-center text-base font-medium text-[#eceff7]">
        {valeur > 0 ? `${valeur} %` : "—"}
      </span>
    </div>
  );
}

/** Carte de chiffre clé. */
export function CarteKpi({
  label,
  valeur,
  precision,
  icone,
  testId,
}: {
  label: string;
  valeur: string;
  precision?: string;
  icone: ReactNode;
  testId: string;
}) {
  return (
    <Carte className="p-4 sm:p-5" testId={testId}>
      <div className="flex items-start justify-between gap-3">
        <p className="surtitre !text-[0.62rem] !text-[#a8b6d1]">{label}</p>
        <PastilleIcone>{icone}</PastilleIcone>
      </div>
      <p className="chiffre mt-2 text-2xl font-medium text-[#eceff7] sm:text-3xl" data-testid={`${testId}-valeur`}>
        {valeur}
      </p>
      {precision ? <p className="mt-1 text-xs text-[#a8b6d1]">{precision}</p> : null}
    </Carte>
  );
}

/** Les cinq visages du check-in. Dessinés au trait, comme le reste de l'interface. */
export function Visage({ niveau, className = "" }: { niveau: number; className?: string }) {
  const bouches: Record<number, string> = {
    1: "M 34 62 Q 50 50 66 62",
    2: "M 34 60 Q 50 54 66 60",
    3: "M 35 58 H 65",
    4: "M 34 54 Q 50 66 66 54",
    5: "M 32 52 Q 50 72 68 52",
  };
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
      <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="4" />
      <circle cx="38" cy="40" r="3.4" fill="currentColor" />
      <circle cx="62" cy="40" r="3.4" fill="currentColor" />
      <path
        d={bouches[niveau] ?? bouches[3]}
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const euros = (n: number) =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} €`;
