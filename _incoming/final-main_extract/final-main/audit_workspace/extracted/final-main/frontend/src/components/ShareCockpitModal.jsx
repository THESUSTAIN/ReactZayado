import React, { useState } from "react";
import { X, Share2, Copy, Check, FileDown } from "lucide-react";
import { toast } from "sonner";
import { getUid } from "@/lib/api";

export default function ShareCockpitModal({ open, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const shareUrl = `https://app.zayado.net/cockpit/${getUid()}`;

  const doShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Mon cockpit Zayado", url: shareUrl });
        return;
      } catch { /* annulé — on retombe sur la copie */ }
    }
    copyLink();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(11,31,58,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose} data-testid="share-cockpit-overlay">
      <div className="glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: "100%", position: "relative" }} data-testid="share-cockpit-modal">
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }} data-testid="share-cockpit-close">
          <X size={18} />
        </button>
        <div className="card-label"><Share2 size={14} /> Partager mon cockpit</div>
        <p className="muted" style={{ fontSize: 13, margin: "8px 0 16px", lineHeight: 1.6 }}>
          Partage une vue publique et en lecture seule de ton cockpit (score d'alignement, vision, progression) — idéal pour un mentor, un associé ou tes réseaux.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input readOnly value={shareUrl} className="zinput" style={{ flex: 1, fontSize: 12.5 }} data-testid="share-cockpit-url" />
          <button onClick={copyLink} className="zbtn" style={{ height: 40, padding: "0 12px", gap: 6 }} data-testid="share-cockpit-copy">
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={doShare} className="zbtn zbtn-primary" style={{ flex: 1, height: 42, gap: 8 }} data-testid="share-cockpit-native">
            <Share2 size={15} /> Partager
          </button>
          <button onClick={() => toast.info("Export Vision Book PDF — voir l'onglet Vision Board")} className="zbtn" style={{ flex: 1, height: 42, gap: 8 }} data-testid="share-cockpit-pdf">
            <FileDown size={15} /> Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}
