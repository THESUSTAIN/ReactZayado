import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";
import { Stamp } from "@/components/Reveal";
import { useCart } from "@/context/CartContext";

const eur = (n) => (n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 });

export default function PaymentResult({ success = false }) {
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const { vider } = useCart();
  const [order] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("zayado_order"));
    } catch {
      return null;
    }
  });
  const [remote, setRemote] = useState(null); // statut vérifié côté serveur (Mollie)

  useEffect(() => {
    if (!orderId) return;
    let stop = false;
    const check = async () => {
      try {
        const r = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/orders/${orderId}/payment-status`);
        const d = await r.json();
        if (stop) return;
        setRemote(d);
        if (d.status === "paid") vider();
      } catch {
        /* backend indisponible : on garde l'affichage par défaut */
      }
    };
    check();
    const t = setInterval(check, 3000);
    const stopAll = setTimeout(() => clearInterval(t), 12000);
    return () => {
      stop = true;
      clearInterval(t);
      clearTimeout(stopAll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const paye = remote ? remote.status === "paid" : success;
  const echec = remote ? ["canceled", "failed", "expired"].includes(remote.status) : false;
  const info = order || (remote && remote.status === "paid" ? { ref: remote.ref, name: "Vos articles", qty: "—", total: remote.total, date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) } : null);

  return (
    <div className="mx-auto max-w-lg px-5 py-20 text-center md:py-28" data-testid={paye ? "payment-success" : "payment-cancel"}>
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: paye ? "var(--gold-soft)" : "rgba(19,35,62,0.08)" }}
      >
        {paye ? <Check size={38} style={{ color: "var(--navy)" }} /> : <X size={38} style={{ color: "var(--navy)" }} />}
      </motion.div>

      {paye ? (
        <>
          <h1 className="mt-7 text-4xl font-semibold tracking-tight text-[var(--navy)]">Paiement confirmé</h1>
          <p className="font-hand mt-2 text-3xl" style={{ color: "var(--gold)" }}>merci, et bon pilotage !</p>
          {info && (
            <div className="card mt-8 p-7 text-left" data-testid="order-recap">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">Récapitulatif</p>
              <dl className="mt-4 space-y-2.5 text-[15px]">
                <div className="flex justify-between"><dt className="opacity-60">Commande</dt><dd className="font-semibold" data-testid="order-ref">{info.ref}</dd></div>
                <div className="flex justify-between gap-4"><dt className="opacity-60">Article</dt><dd className="text-right font-medium">{info.name} × {info.qty}</dd></div>
                <div className="flex justify-between"><dt className="opacity-60">Date</dt><dd className="font-medium">{info.date}</dd></div>
                <div className="flex justify-between border-t pt-3" style={{ borderColor: "var(--line)" }}>
                  <dt className="opacity-60">Total payé</dt>
                  <dd className="text-xl font-bold text-[var(--navy)]" data-testid="order-total">{eur(info.total)}</dd>
                </div>
              </dl>
            </div>
          )}
          <p className="mt-5 text-xs opacity-50">Paiement sécurisé via Mollie{remote ? "" : " — mode démo, aucune transaction réelle"}.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3.5">
            <Link to="/marketplace" data-testid="success-cta-shop" className="btn btn-ghost px-6 py-3.5 text-[14px]">Continuer mes achats</Link>
            <Link to="/diagnostic" data-testid="success-cta-diagnostic" className="btn btn-primary px-6 py-3.5 text-[14px]">
              Faire mon diagnostic gratuit <ArrowRight size={16} />
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-7 text-4xl font-semibold tracking-tight text-[var(--navy)]">
            {echec ? "Paiement non abouti" : "Paiement annulé"}
          </h1>
          <p className="mt-3 opacity-75">Aucun débit effectué. Votre panier vous attend quand vous voulez.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3.5">
            <Link to="/marketplace" data-testid="cancel-cta-shop" className="btn btn-primary px-6 py-3.5 text-[14px]">Retour à la marketplace</Link>
            <Link to="/diagnostic" data-testid="cancel-cta-diagnostic" className="btn btn-ghost px-6 py-3.5 text-[14px]">
              Faire mon diagnostic gratuit
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
