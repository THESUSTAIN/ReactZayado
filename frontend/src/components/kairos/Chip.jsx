import React from "react";
import { Clock } from "lucide-react";

// Chip de durée or.
export function DurationChip({ minutes, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold ${className}`}
      data-testid="duration-chip"
    >
      <Clock className="h-3 w-3" />
      {minutes} min
    </span>
  );
}

export function Chip({ children, active = false, className = "", ...props }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? "border border-gold/40 bg-gold/15 text-gold"
          : "border border-white/10 bg-white/5 text-offwhite/70"
      } ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
