import React from "react";
import { ArrowDown } from "lucide-react";

// Bouton flottant (collé en bas de la zone qui défile) : visible seulement quand on a remonté la conversation.
export function BoutonDernierMessage({ visible, onClick }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none sticky bottom-0 flex justify-center">
      <button type="button" onClick={onClick} data-testid="chat-dernier-message"
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-navy-900/90 px-3.5 py-1.5 text-[12.5px] font-semibold text-gold shadow-lg backdrop-blur hover:bg-navy-900">
        <ArrowDown size={14} /> Dernier message
      </button>
    </div>
  );
}
