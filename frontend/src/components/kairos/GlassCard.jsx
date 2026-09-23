import React from "react";
import { cn } from "@/lib/utils";

// Carte verre dépoli léger. `gold` ajoute une bordure or subtile.
export function GlassCard({ className, gold = false, children, ...props }) {
  return (
    <div
      className={cn(
        "glass relative min-w-0 overflow-hidden rounded-[18px] p-5 shadow-[0_16px_36px_-24px_rgba(3,10,24,0.95)] transition duration-200 sm:p-6",
        gold && "glass-gold",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
