import React from "react";
import { cn } from "@/lib/utils";

// Carte verre dépoli léger. `gold` ajoute une bordure or subtile.
// Au survol : la carte se soulève légèrement avec un halo doré (façon Okyai).
export function GlassCard({ className, gold = false, children, ...props }) {
  return (
    <div
      className={cn(
        "glass relative min-w-0 overflow-hidden rounded-[18px] p-5 shadow-[0_16px_36px_-24px_rgba(3,10,24,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_54px_-20px_rgba(232,199,126,0.38)] sm:p-6",
        gold && "glass-gold",
        "hover:gold-halo",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
