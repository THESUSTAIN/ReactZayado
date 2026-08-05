import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { API } from "@/lib/api";
import { toast } from "sonner";

// URL de la page tarifs. Par défaut : page servie par l'app (/tarifs.html) — fonctionne immédiatement.
// Peut pointer vers la page publique (ex. https://zayado.net/tarifs) via REACT_APP_PRICING_URL.
export const PRICING_URL =
  process.env.REACT_APP_PRICING_URL ||
  (typeof window !== "undefined" ? window.location.origin + "/tarifs.html" : "/tarifs.html");

export default function PricingScreen({ open, onClose }) {
  // Écoute le choix de plan émis par l'iframe (postMessage) → crée l'abonnement Mollie et redirige.
  useEffect(() => {
    if (!open) return;
    // Origine attendue = celle de la page tarifs elle-même (même origine que PRICING_URL).
    // Empêche une page tierce malveillante de forger un message "zayado-choose-plan".
    let expectedOrigin;
    try {
      expectedOrigin = new URL(PRICING_URL, window.location.origin).origin;
    } catch {
      expectedOrigin = window.location.origin;
    }
    const onMsg = async (e) => {
      if (e.origin !== expectedOrigin) return;
      const d = e.data;
      if (!d || d.type !== "zayado-choose-plan" || !d.plan) return;
      try {
        toast.loading("Redirection vers le paiement sécurisé…", { id: "sub" });
        const res = await axios.post(`${API}/payments/subscribe`, { plan: d.plan });
        const url = res.data?.checkout_url;
        if (url) {
          window.location.href = url;
        } else if (res.data?.status === "success") {
          toast.success("Forfait activé !", { id: "sub" });
          onClose && onClose();
          window.location.reload();
        } else {
          toast.error("Paiement indisponible pour le moment.", { id: "sub" });
        }
      } catch (err) {
        toast.error(err?.response?.data?.detail || "Impossible de démarrer le paiement.", { id: "sub" });
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        data-testid="pricing-screen"
        style={{
          position: "fixed", inset: 0, zIndex: 950,
          background: "linear-gradient(160deg, #0B1F3A 0%, #0e2748 100%)",
          display: "flex", flexDirection: "column",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 22px", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg,#e9613f,#C9A449)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 22,
            }}>Z</span>
            <div>
              <b style={{ display: "block", color: "#F6F2EA", fontSize: 15, fontWeight: 700 }}>Choisissez votre forfait</b>
              <span style={{ display: "block", color: "rgba(246,242,234,0.6)", fontSize: 12 }}>Passez à un niveau supérieur à tout moment.</span>
            </div>
          </div>
          <button onClick={onClose} data-testid="pricing-close-btn"
            style={{
              display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
              background: "rgba(246,242,234,0.1)", border: "1px solid rgba(246,242,234,0.2)",
              color: "#F6F2EA", borderRadius: 999, padding: "8px 16px", fontSize: 13, fontWeight: 600,
            }}>
            <X size={15} /> Fermer
          </button>
        </div>

        <iframe
          src={PRICING_URL}
          title="Forfaits Zayado"
          data-testid="pricing-iframe"
          style={{ flex: 1, width: "100%", border: "none", background: "#0B1F3A" }}
        />
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
