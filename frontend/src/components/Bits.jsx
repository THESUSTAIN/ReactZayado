import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export function Eyebrow({ children, dark = false }) {
    return (
        <p
            className={`flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] ${
                dark ? "text-paper/70" : "text-navy"
            }`}
        >
            <span
                className={`h-px w-9 ${dark ? "bg-paper/40" : "bg-navy/40"}`}
            />
            {children}
        </p>
    );
}

export function PillLink({
    to,
    children,
    variant = "solid",
    className = "",
    dataTestId,
    onClick,
}) {
    const styles =
        variant === "solid"
            ? "bg-navy text-paper hover:bg-navy-soft"
            : variant === "light"
              ? "bg-paper text-ink hover:bg-sand"
              : "border border-ink/20 text-ink hover:border-navy hover:text-navy";
    return (
        <Link
            to={to}
            data-testid={dataTestId}
            onClick={onClick}
            className={`group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-colors duration-300 ${styles} ${className}`}
        >
            {children}
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
    );
}
