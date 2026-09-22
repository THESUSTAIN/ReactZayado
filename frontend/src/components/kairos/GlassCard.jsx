import React from "react";
import { cn } from "@/lib/utils";

// Carte verre dépoli léger. `gold` ajoute une bordure or subtile.
export function GlassCard({ className, gold = false, children, ...props }) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-5 sm:p-6",
        gold && "glass-gold",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
