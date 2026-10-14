import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Gift, Heart, ShoppingBag, Sparkles, Star, TrendingUp, Wrench, Zap } from "lucide-react";
import { IMG } from "@/data/images";
import { useCart, useFav } from "@/context/CartContext";

const eur = (n) => (n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 });

const TYPE_LABEL = { produit: "Sélection Zayado", digital: "Outil Zayado", box: "Édition limitée", service: "Accompagnement" };

export default function MarketCard({ item }) {
  const navigate = useNavigate();
  const { ajouter } = useCart();
  const { isFav, toggle } = useFav();
  const fav = isFav(item.id);

  const cta = () => {
    if (item.cta === "Activer")
      return (
        <a href={process.env.REACT_APP_APP_URL || "https://app.zayado.net"} data-testid={`market-cta-${item.id}`} className="btn btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-[13.5px]">
          <Zap size={14} /> {item.cta}
        </a>
      );
    if (item.cta === "Commander")
      return (
        <Link to="/box" data-testid={`market-cta-${item.id}`} className="btn btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-[13.5px]">
          <Gift size={14} /> {item.cta}
        </Link>
      );
    if (item.cta === "Se lancer")
      return (
        <Link to={item.to || "/services"} data-testid={`market-cta-${item.id}`} className="btn btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-[13.5px]">
          <Sparkles size={14} /> {item.cta}
        </Link>
      );
    return (
      <button
        onClick={() => { ajouter(item.id); navigate(`/checkout?items=${item.id}`); }}
        data-testid={`market-cta-${item.id}`}
        className="btn btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-[13.5px]"
      >
        <ShoppingBag size={14} /> {item.cta}
      </button>
    );
  };

  return (
    <article className="card flex h-full flex-col overflow-hidden p-0" data-testid={`market-card-${item.id}`}>
      <div className="relative">
        <Link to={`/fiche/${item.id}`}>
          <img src={IMG[item.img]} alt={item.nom} className="h-52 w-full object-cover" />
        </Link>
        <span className="absolute left-4 top-4 rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ background: "rgba(253,252,248,0.95)", color: "var(--navy)" }}>
          {TYPE_LABEL[item.type]}
        </span>
        {item.exclusif && (
          <span className="absolute inset-x-0 top-10 mx-auto w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ background: "var(--navy)", color: "var(--paper-2)" }}>
            Exclusivité Zayado
          </span>
        )}
        {item.note && (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: "rgba(253,252,248,0.95)", color: "var(--navy)" }}>
            <Star size={11} style={{ color: "var(--gold)" }} /> {item.note} / 10
          </span>
        )}
        <button
          onClick={() => toggle(item.id)}
          aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
          data-testid={`market-fav-${item.id}`}
          className="absolute bottom-4 right-4 rounded-full border p-2 backdrop-blur transition-transform hover:scale-110"
          style={{ background: "rgba(253,252,248,0.92)", borderColor: "var(--line)" }}
        >
          <Heart size={15} style={{ color: fav ? "#C0392B" : "var(--navy)" }} fill={fav ? "#C0392B" : "none"} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1.5 text-[12px] opacity-60">
          <Heart size={12} /> {item.avis} avis vérifiés <span className="text-[10.5px] opacity-70">(exemples)</span>
        </p>
        <Link to={`/fiche/${item.id}`} className="font-display mt-1.5 text-[19px] font-semibold leading-snug text-[var(--navy)] hover:opacity-80">
          {item.nom}
        </Link>
        <p className="mt-2 flex-1 text-[13.5px] leading-relaxed opacity-70">{item.desc}</p>

        <div className="mt-3 flex items-center gap-2 rounded-xl px-3.5 py-2.5" style={{ background: "var(--paper-2)" }}>
          <Zap size={14} className="flex-none" style={{ color: "var(--gold)" }} />
          <p className="text-[12.5px] leading-snug">
            <span className="font-bold uppercase tracking-[0.1em]" style={{ color: "var(--gold)" }}>Bénéfice majeur</span>
            <span className="opacity-80"> · {item.benefice}</span>
          </p>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] opacity-55">{item.prixMode}</p>
          <p className="font-display text-2xl font-extrabold text-[var(--navy)]">{item.prixLabel || eur(item.prix)}</p>
        </div>

        <div className="mt-4 flex gap-2.5">
          <Link to={`/fiche/${item.id}`} data-testid={`market-fiche-${item.id}`} className="btn btn-ghost flex-1 justify-center px-4 py-2.5 text-[13px]">
            Voir la fiche
          </Link>
          {cta()}
        </div>
      </div>
    </article>
  );
}
