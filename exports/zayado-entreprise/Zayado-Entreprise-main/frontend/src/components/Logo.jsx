export const LogoMark = ({ size = 38 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <circle cx="24" cy="24" r="23" fill="var(--navy)" />
    <path
      d="M15 16h18L15 32h18"
      stroke="var(--gold-soft)"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const LogoWordmark = ({ light = false }) => (
  <span className={`font-display text-[26px] font-semibold tracking-tight ${light ? "text-[#EDF2FF]" : "text-[var(--navy)]"}`}>
    Zayado
  </span>
);

export const LogoFull = ({ light = false }) => (
  <span className="flex items-center gap-2.5">
    <LogoMark />
    <span className="leading-none">
      <span className={`block text-[20px] font-semibold tracking-tight ${light ? "text-[var(--paper-2)]" : "text-[var(--navy)]"}`}>
        Zayado
      </span>
      <span className="font-hand block text-[15px] leading-none" style={{ color: "var(--gold)" }}>
        clarté · sérénité · équilibre
      </span>
    </span>
  </span>
);
