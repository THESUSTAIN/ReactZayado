import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, Clock } from "lucide-react";

// Modale « Arrive prochainement » pour les modules hors V1.
export function ComingSoonModal({ open, onClose, moduleName }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong border-white/10 text-offwhite sm:max-w-md" data-testid="coming-soon-modal">
        <DialogTitle className="sr-only">{moduleName}</DialogTitle>
        <DialogDescription className="sr-only">Module bientôt disponible.</DialogDescription>
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/15 ring-1 ring-gold/30">
            <Clock className="h-7 w-7 text-gold" />
          </div>
          <span className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Bientôt</span>
          <h3 className="mb-2 font-display text-2xl font-bold">{moduleName}</h3>
          <p className="max-w-sm text-sm leading-relaxed text-offwhite/70">
            Ce module fait partie de la vision complète de Zayado, mais il n'est pas encore ouvert.
            On le prépare avec soin — tu seras prévenu·e dès son arrivée.
          </p>
          <button
            onClick={onClose}
            className="btn-gold mt-6"
            data-testid="coming-soon-close-btn"
          >
            <Sparkles className="h-4 w-4" /> J'ai hâte
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
