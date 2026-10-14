import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { Reveal, Stamp } from "@/components/Reveal";
import usePageMeta from "@/hooks/usePageMeta";
import { useFav } from "@/context/CartContext";
import { MARKET_ITEMS } from "@/data/catalogue";
import MarketCard from "@/components/MarketCard";

export default function Favoris() {
  usePageMeta("Mes favoris · Zayado", "Les pièces et outils que vous avez gardés de côté, dans la maison de l'entrepreneur.");
  const { ids } = useFav();
  const items = MARKET_ITEMS.filter((i) => ids.includes(i.id));

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:py-20" data-testid="favoris-page">
      <Stamp>Votre sélection</Stamp>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[var(--navy)] md:text-4xl">Mes favoris</h1>
      <p className="font-hand mt-1 text-2xl" style={{ color: "var(--gold)" }}>
        {items.length ? `${items.length} pièce${items.length > 1 ? "s" : ""} gardée${items.length > 1 ? "s" : ""} de côté` : "votre liste vous attend"}
      </p>

      {items.length === 0 ? (
        <div className="card mt-10 flex flex-col items-center p-12 text-center" data-testid="favoris-vide">
          <span className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
            <Heart size={26} style={{ color: "var(--navy)" }} />
          </span>
          <p className="mt-5 text-lg font-semibold text-[var(--navy)]">Aucun favori pour l'instant.</p>
          <p className="mt-2 text-[14px] opacity-65">Le petit cœur sur une pièce la garde ici, tout simplement.</p>
          <Link to="/marketplace" data-testid="favoris-vide-cta" className="btn btn-primary mt-7 px-7 py-3.5 text-[14px]">
            Parcourir la sélection
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i, k) => (
            <Reveal key={i.id} delay={(k % 3) * 0.06} className="h-full">
              <MarketCard item={i} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
