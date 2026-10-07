export function YoriMark({
    className = "h-8 w-8",
    stroke = "#355C7D",
    dot = "#355C7D",
}) {
    return (
        <svg
            viewBox="0 0 48 48"
            fill="none"
            className={className}
            aria-hidden="true"
        >
            <path
                d="M12 40V25a12 12 0 0 1 24 0v15"
                stroke={stroke}
                strokeWidth="3.2"
                strokeLinecap="round"
            />
            <circle cx="40.5" cy="11.5" r="3.4" fill={dot} />
        </svg>
    );
}

export default function Logo({ dark = false, compact = false }) {
    const color = dark ? "#F4F0E8" : "#355C7D";
    return (
        <span
            className={`inline-flex items-center gap-3 ${
                dark ? "text-paper" : "text-ink"
            }`}
        >
            <YoriMark className="h-9 w-9" stroke={color} dot={color} />
            <span className="flex flex-col leading-none">
                <span className="font-serif text-[1.55rem] font-semibold tracking-tight">
                    Zayado
                </span>
                {!compact && (
                    <span className="mt-1 text-[0.5rem] font-semibold uppercase tracking-[0.3em] opacity-60">
                        Maison des entrepreneurs
                    </span>
                )}
            </span>
        </span>
    );
}
