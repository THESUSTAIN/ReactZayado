import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ShieldCheck, Minus, Plus } from "lucide-react";
import { IMG } from "@/data/images";
import { useCart, catalogueComplet } from "@/context/CartContext";
import { apiPost } from "@/lib/api";

const eur = (n) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 });

export default function Checkout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { lignes: lignesPanier, setQty, vider } = useCart();

  // /checkout?items=a,b,c (panier) — fallback /checkout?item=a (historique)
  const ids = (params.get("items") || params.get("item") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const lignes =
    lignesPanier.filter((l) => ids.includes(l.id)).length === ids.length && ids.length
      ? lignesPanier.filter((l) => ids.includes(l.id))
      : ids.map((id) => ({ id, qty: 1, produit: catalogueComplet.find((p) => p.id === id) })).filter((l) => l.produit);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ prenom: "", nom: "", email: "", adresse: "", ville: "", cp: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (!ids.length || !lignes.length) {
    return (
      <div className="mx-auto max-w-lg px-5 py-28 text-center" data-testid="checkout-empty">
        <h1 className="text-3xl font-semibold text-[var(--navy)]">Aucun article sélectionné.</h1>
        <p className="mt-3 opacity-70">Choisissez d’abord votre bonheur dans la boutique.</p>
        <Link to="/marketplace" data-testid="checkout-empty-back" className="btn btn-primary mt-7 px-6 py-3.5 text-[15px]">
          Retour à la marketplace
        </Link>
      </div>
    );
  }

  const total = lignes.reduce((s, l) => s + l.qty * l.produit.price, 0);
  const count = lignes.reduce((s, l) => s + l.qty, 0);

  const simulerPaiement = () => {
    const order = {
      ref: "ZYD-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
      name: lignes.length > 1 ? `${lignes.length} articles` : lignes[0].produit.name,
      qty: count,
      total,
      date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    };
    sessionStorage.setItem("zayado_order", JSON.stringify(order));
    vider();
    navigate("/paiement/succes");
  };

  const submit = async (e) => {
    e.preventDefault();
    const missing = ["prenom", "nom", "email", "adresse", "ville", "cp"].some((k) => !f[k].trim());
    const okMail = /.+@.+\..+/.test(f.email);
    if (missing || !okMail) {
      setErr("Merci de compléter vos coordonnées (email valide requis).");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const data = await apiPost("/api/checkout", {
        items: lignes.map((l) => ({ product_id: l.id, quantity: l.qty })),
        client: { prenom: f.prenom, nom: f.nom, email: f.email, adresse: f.adresse, ville: f.ville, cp: f.cp },
      });
      if (data.checkout_url) {
        // Paiement réel Mollie — redirection vers la page hébergée
        window.location.assign(data.checkout_url);
        return;
      }
      // Mode démo (aucune clé Mollie configurée)
      setTimeout(simulerPaiement, 1400);
    } catch {
      // Backend indisponible — on garde le flux démo
      setTimeout(simulerPaiement, 1400);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-14 md:py-20" data-testid="checkout-page">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--navy)] md:text-4xl">Checkout</h1>
      <p className="font-hand mt-1 text-2xl" style={{ color: "var(--gold)" }}>presque terminé</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <form className="card space-y-4 p-7" onSubmit={submit} data-testid="checkout-form">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">Vos coordonnées</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="field" data-testid="checkout-prenom" placeholder="Prénom" value={f.prenom} onChange={set("prenom")} />
            <input className="field" data-testid="checkout-nom" placeholder="Nom" value={f.nom} onChange={set("nom")} />
          </div>
          <input className="field" data-testid="checkout-email" type="email" placeholder="Email" value={f.email} onChange={set("email")} />
          <input className="field" data-testid="checkout-adresse" placeholder="Adresse" value={f.adresse} onChange={set("adresse")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="field" data-testid="checkout-ville" placeholder="Ville" value={f.ville} onChange={set("ville")} />
            <input className="field" data-testid="checkout-cp" placeholder="Code postal" value={f.cp} onChange={set("cp")} />
          </div>

          {err && <p className="text-sm" style={{ color: "#B4452F" }} data-testid="checkout-error">{err}</p>}

          <button className="btn btn-primary w-full px-6 py-4 text-[16px]" data-testid="checkout-pay-button" disabled={busy}>
            {busy ? (
              <span className="flex items-center gap-2" data-testid="checkout-processing">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--paper-2)] border-t-transparent" />
                Ouverture du paiement sécurisé…
              </span>
            ) : (
              <>Payer {eur(total)}</>
            )}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-xs opacity-55">
            <ShieldCheck size={13} /> Paiement sécurisé via Mollie (carte bancaire) — sans clé configurée, la démo simule le paiement.
          </p>
        </form>

        <aside className="card h-fit p-7" data-testid="checkout-summary">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">Votre commande</p>
          <div className="mt-5 space-y-4">
            {lignes.map((l) => (
              <div key={l.id} className="flex gap-4" data-testid={`checkout-line-${l.id}`}>
                <img src={IMG[l.produit.img]} alt={l.produit.name} className="h-20 w-20 flex-none rounded-2xl object-cover" />
                <div className="flex-1">
                  <p className="font-semibold leading-snug text-[var(--navy)]">{l.produit.name}</p>
                  <p className="mt-1 text-sm" style={{ color: "var(--gold)" }}>{eur(l.produit.price)} / unité</p>
                  <div className="mt-2 inline-flex items-center gap-3 rounded-full border px-3 py-1.5" style={{ borderColor: "var(--line)" }}>
                    <button aria-label="Moins" data-testid={`checkout-qty-minus-${l.id}`} onClick={() => setQty(l.id, l.qty - 1)}><Minus size={13} /></button>
                    <span className="w-4 text-center text-sm font-semibold" data-testid={`checkout-qty-value-${l.id}`}>{l.qty}</span>
                    <button aria-label="Plus" data-testid={`checkout-qty-plus-${l.id}`} onClick={() => setQty(l.id, l.qty + 1)}><Plus size={13} /></button>
                  </div>
                </div>
                <span className="text-sm font-bold text-[var(--navy)]">{eur(l.produit.price * l.qty)}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between border-t pt-5" style={{ borderColor: "var(--line)" }}>
            <span className="text-[15px] font-medium opacity-70">Total</span>
            <span className="text-2xl font-bold text-[var(--navy)]" data-testid="checkout-total">{eur(total)}</span>
          </div>
          <button
            className="mt-4 w-full text-center text-sm font-medium underline opacity-60 hover:opacity-100"
            onClick={() => navigate("/paiement/annulation")}
            data-testid="checkout-cancel-link"
          >
            Annuler et revenir en arrière
          </button>
        </aside>
      </div>
    </div>
  );
}
