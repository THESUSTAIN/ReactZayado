import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PRODUCTS } from "../data/content";

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = PRODUCTS.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen grid place-items-center grain-bg bg-background px-6 text-center">
        <div>
          <p className="font-serif text-2xl text-navy">Produit introuvable</p>
          <Link to="/" className="text-terracotta underline mt-3 inline-block">Retour à la boutique</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grain-bg bg-background">
      <div className="mx-auto w-full max-w-xl px-4 pb-20">
        <button data-testid="back-button" onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 mt-6 text-navy/80 hover:text-navy font-medium transition-colors">
          <ArrowLeft className="h-4 w-4" /> Boutique
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 bg-card rounded-[1.6rem] overflow-hidden ring-1 ring-black/5 shadow-[0_18px_50px_-24px_rgba(31,58,99,0.5)]">
          <div className="aspect-[4/3] overflow-hidden">
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-serif text-navy text-2xl sm:text-3xl font-semibold" data-testid="product-title">{product.name}</h1>
              <span className="font-serif text-terracotta text-2xl font-semibold whitespace-nowrap" data-testid="product-price">{product.price}</span>
            </div>
            <p className="text-foreground/80 leading-relaxed mt-4">{product.details}</p>
            <button data-testid="add-to-cart-button"
              onClick={() => toast("Bientôt disponible", { description: "Le paiement sera activé prochainement." })}
              className="mt-7 w-full inline-flex items-center justify-center gap-2 bg-navy text-cream font-serif text-lg font-semibold py-3.5 rounded-full hover:bg-navy-deep transition-colors shadow-lg">
              <ShoppingBag className="h-5 w-5" /> Ajouter au panier
            </button>
            <p className="text-center text-xs text-muted-foreground mt-3">Le paiement sera disponible dans une prochaine étape.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
