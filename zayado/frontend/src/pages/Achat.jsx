import React, { useEffect, useState } from "react";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { call } from "@/lib/part2Api";

export default function Achat() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const kind = params.get("kind") || "produit";
  const offerId = params.get("id") || params.get("product_id") || params.get("service_id") || "";
  const [offer, setOffer] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!offerId) { setError("Cette offre est introuvable."); return; }
    call(`/commerce/offers/${kind}/${encodeURIComponent(offerId)}`).then(setOffer).catch((e) => setError(e.message));
  }, [kind, offerId]);

  const payer = async () => {
    if (!email.includes("@")) { setError("Indique une adresse email valide."); return; }
    setLoading(true); setError("");
    try {
      const body = { kind, title: offer.title, amount: offer.amount, email, ...(kind === "produit" ? { product_id: offerId } : { service_id: offerId }) };
      const result = await call("/commerce/checkout", "POST", body);
      if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      else setError("Mollie n'a pas fourni de lien de paiement.");
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return <main className="min-h-screen bg-navy-900 px-4 py-10 text-offwhite sm:px-8"><div className="mx-auto max-w-lg">
    <button onClick={() => navigate("/mon-espace")} className="mb-8 inline-flex items-center gap-2 text-xs text-offwhite/60 hover:text-offwhite"><ArrowLeft size={14} /> Mon espace</button>
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8"><p className="text-[10px] uppercase tracking-[0.25em] text-gold">Paiement sécurisé Mollie</p>
      {error && <div className="mt-5 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-200">{error}</div>}
      {!offer && !error && <Loader2 className="mt-6 animate-spin text-gold" />}
      {offer && <><h1 className="mt-3 font-display text-2xl font-bold">{offer.title}</h1><p className="mt-3 text-3xl font-bold text-gold">{offer.amount.toFixed(2)} {offer.currency}</p><label className="mt-6 block text-xs text-offwhite/65">Email de réception<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="toi@exemple.fr" className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-sm text-offwhite outline-none focus:border-gold/50" /></label><button disabled={loading} onClick={payer} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 font-semibold text-navy-900 disabled:opacity-60">{loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />} Continuer avec Mollie</button></>}
    </div></div></main>;
}
