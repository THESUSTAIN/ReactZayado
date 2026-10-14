import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Minus, Plus, ShoppingBag, X } from "lucide-react";
import usePageMeta from "@/hooks/usePageMeta";
import { useCart } from "@/context/CartContext";
import { IMG } from "@/data/images";

const eur = (n) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 });

export default function Panier() {
  usePageMeta("Mon panier · Zayado", "Votre panier Zayado : produits pour l'entreprise, pour l'entrepreneur et box saisonnières.");
  const navigate = useNavigate();
  const { lignes, count, total, setQty, retirer } = useCart();

  return (
    <div className="mx-auto max-w-4xl px-5 py-14 md:py-20" data-testid="panier-page">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--navy)] md:text-4xl">Mon panier</h1>
      <p className="font-hand mt-1 text-2xl" style={{ color: "var(--gold)" }}>
        {count > 0 ? `${count} article${count > 1 ? "s" : ""} dans votre panier` : "votre panier vous attend"}
      </p>

      {lignes.length === 0 ? (
        <div className="card mt-10 flex flex-col items-center p-12 text-center" data-testid="panier-vide">
          <span className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
            <ShoppingBag size={26} style={{ color: "var(--navy)" }} />
          </span>
          <p className="mt-5 text-lg font-semibold text-[var(--navy)]">Votre panier est vide.</p>
          <p className="mt-2 text-[14px] opacity-65">Mobilier, éclairage, bien-être, box saisonnières — la sélection vous attend.</p>
          <Link to="/marketplace" data-testid="panier-vide-cta" className="btn btn-primary mt-7 px-7 py-3.5 text-[14px]">
            Découvrir la marketplace <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-10 space-y-4">
            {lignes.map((l) => (
              <article key={l.id} className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center" data-testid={`panier-ligne-${l.id}`}>
                <img src={IMG[l.produit.img]} alt={l.produit.name} className="h-24 w-24 flex-none rounded-2xl object-cover" />
                <div className="flex-1">
                  <p className="font-semibold leading-snug text-[var(--navy)]">{l.produit.name}</p>
                  <p className="mt-1 text-sm opacity-60">{eur(l.produit.price)} / unité</p>
                </div>
                <div className="inline-flex items-center gap-3 self-start rounded-full border px-3.5 py-2" style={{ borderColor: "var(--line)" }}>
                  <button aria-label="Moins" data-testid={`panier-qty-minus-${l.id}`} onClick={() => setQty(l.id, l.qty - 1)} className="hover:opacity-60"><Minus size={14} /></button>
                  <span className="w-5 text-center text-sm font-semibold" data-testid={`panier-qty-value-${l.id}`}>{l.qty}</span>
                  <button aria-label="Plus" data-testid={`panier-qty-plus-${l.id}`} onClick={() => setQty(l.id, l.qty + 1)} className="hover:opacity-60"><Plus size={14} /></button>
                </div>
                <div className="flex items-center gap-4 self-start">
                  <span className="text-lg font-bold text-[var(--navy)]" data-testid={`panier-line-total-${l.id}`}>{eur(l.produit.price * l.qty)}</span>
                  <button aria-label="Retirer" data-testid={`panier-remove-${l.id}`} onClick={() => retirer(l.id)} className="opacity-45 hover:opacity-90"><X size={17} /></button>
                </div>
              </article>
            ))}
          </div>

          <div className="card mt-8 flex flex-col items-start justify-between gap-5 p-7 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">Total du panier</p>
              <p className="text-3xl font-bold text-[var(--navy)]" data-testid="panier-total">{eur(total)}</p>
              <p className="mt-1 text-xs opacity-55">Paiement sécurisé via Mollie — carte bancaire.</p>
            </div>
            <button
              onClick={() => navigate(`/checkout?items=${lignes.map((l) => l.id).join(",")}`)}
              data-testid="panier-cta-payer"
              className="btn btn-primary w-full px-8 py-4 text-[15px] sm:w-auto"
            >
              Passer au paiement <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
