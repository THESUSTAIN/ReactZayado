import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock3, ExternalLink, Loader2, XCircle, ShoppingBag, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { call } from "@/lib/part2Api";

const STATUS = {
  paid: ["Payé", "text-emerald-300", CheckCircle2],
  authorized: ["Autorisé", "text-emerald-300", CheckCircle2],
  pending: ["En attente", "text-amber-300", Clock3],
  failed: ["Échec", "text-rose-300", XCircle],
  canceled: ["Annulé", "text-rose-300", XCircle],
  expired: ["Expiré", "text-rose-300", XCircle],
};

export default function MonEspace() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    call("/commerce/orders").then((data) => setOrders(data.items || [])).catch((e) => setError(e.message));
  }, []);

  return (
    <main className="min-h-screen px-4 py-8 text-offwhite sm:px-8">
      <div className="mx-auto max-w-4xl">
        <button onClick={() => navigate("/app")} className="mb-6 inline-flex items-center gap-2 text-xs text-offwhite/60 hover:text-offwhite">
          <ArrowLeft size={14} /> Retour au cockpit
        </button>
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold text-navy-900"><ShoppingBag size={22} /></div>
          <div><p className="text-[11px] uppercase tracking-[0.25em] text-gold">Zayado</p><h1 className="font-display text-3xl font-bold">Mon espace</h1></div>
        </div>
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-offwhite/65">Retrouve ici tes achats, tes services et tes abonnements. Les commandes sont confirmées automatiquement après validation du paiement Mollie.</p>
        {orders === null && !error && <Loader2 className="animate-spin text-gold" />}
        {error && <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-200">{error}</div>}
        {orders && orders.length === 0 && <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-sm text-offwhite/60">Aucun achat pour le moment.</div>}
        <div className="space-y-3">
          {orders?.map((order) => {
            const [label, color, Icon] = STATUS[order.status] || STATUS.pending;
            return <article key={order.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-widest text-offwhite/45">{order.kind}</p><h2 className="mt-1 font-semibold text-offwhite">{order.title}</h2></div><span className={`inline-flex items-center gap-1.5 text-xs ${color}`}><Icon size={14} />{label}</span></div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-offwhite/55"><span>{order.amount} {order.currency}</span><span>{order.created_at ? new Date(order.created_at).toLocaleDateString("fr-FR") : ""}</span>{order.status === "paid" && order.access_url && <a href={order.access_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gold hover:underline">Accéder <ExternalLink size={12} /></a>}</div>
            </article>;
          })}
        </div>
      </div>
    </main>
  );
}
