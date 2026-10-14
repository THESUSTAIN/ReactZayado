import { Link, useSearchParams } from "react-router-dom";
import { SearchX } from "lucide-react";
import { Reveal, Stamp } from "@/components/Reveal";
import usePageMeta from "@/hooks/usePageMeta";
import MarketCard from "@/components/MarketCard";
import { COLLECTIONS, MARKET_ITEMS, collectionDe, estPromo } from "@/data/catalogue";

export default function Marketplace() {
  const [params, setSearchParams] = useSearchParams();
  const collection = params.get("collection");
  const besoin = params.get("besoin");
  const q = (params.get("q") || "").trim().toLowerCase();

  usePageMeta(
    "La maison de l'entrepreneur — sélection, outils, box et accompagnement · Zayado",
    "Tout pour l'entreprise et pour l'entrepreneur : outils Zayado, sélection curée, box saisonnières et accompagnement expert — par besoin."
  );

  let items = MARKET_ITEMS;
  if (collection === "promos") items = items.filter(estPromo);
  else if (collection) items = items.filter((i) => collectionDe(i) === collection);
  if (besoin) items = items.filter((i) => i.besoin === besoin);
  if (q) {
    items = items.filter((i) =>
      [i.nom, i.desc, i.besoin, i.benefice, i.prixMode, i.type].join(" ").toLowerCase().includes(q)
    );
  }

  const besoinsDispo = [...new Set(items.map((i) => i.besoin))];
  const titreCollection = collection === "promos" ? "Promos" : COLLECTIONS.find((c) => c.key === collection)?.label || "Tout voir";

  const chip = (label, active, testid, onClick, gold = false, key = undefined) => (
    <button
      key={key}
      onClick={onClick}
      data-testid={testid}
      className="whitespace-nowrap rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors"
      style={
        active
          ? { background: "var(--navy)", color: "var(--paper-2)" }
          : gold
          ? { color: "var(--gold)", background: "var(--paper-2)", border: "1px solid var(--line)" }
          : { color: "var(--ink)", background: "var(--paper-2)", border: "1px solid var(--line)" }
      }
    >
      {label}
    </button>
  );

  const setParams = (next) => setSearchParams(next, { replace: true });

  return (
    <div data-testid="marketplace-page">
      {/* HERO */}
      <section className="border-b" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
          <Reveal>
            <Stamp>La maison de l'entrepreneur</Stamp>
            <h1 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-[var(--navy)] md:text-4xl">
              {titreCollection}
              <span className="font-display italic"> — {items.length} sélection{items.length > 1 ? "s" : ""}</span>
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed opacity-70">
              Tapez votre besoin dans la barre du haut, comme sur Google — ou parcourez les collections.
              Chaque fiche dit la douleur qu'elle règle, en toute honnêteté.
            </p>
          </Reveal>
        </div>
      </section>

      {/* BARRE DE FILTRES sticky */}
      <div className="sticky top-[60px] z-30 border-b backdrop-blur-md md:top-[142px]" style={{ borderColor: "var(--line)", background: "rgba(253,252,248,0.94)" }}>
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 overflow-x-auto px-5 py-3">
          {chip("Tout voir", !collection, "marketplace-filter-all", () => setParams({}))}
          {COLLECTIONS.map((c) =>
            chip(
              c.label,
              collection === c.key,
              `marketplace-filter-${c.key}`,
              () => setParams({ collection: c.key }),
              false,
              c.key
            )
          )}
          {chip("★ Promos", collection === "promos", "marketplace-filter-promos", () => setParams({ collection: "promos" }), true)}
        </div>
        {besoinsDispo.length > 1 && (
          <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-5 pb-3">
            <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.16em] opacity-50">Par besoin</span>
            {besoinsDispo.map((b) =>
              chip(b, besoin === b, `marketplace-besoin-${b.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, () =>
                setParams({ ...(collection ? { collection } : {}), ...(besoin === b ? {} : { besoin: b }) })
              , false, b)
            )}
            {besoin && chip("× retirer le besoin", false, "marketplace-besoin-reset", () => setParams(collection ? { collection } : {}))}
          </div>
        )}
      </div>

      {/* GRILLE */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        {items.length === 0 ? (
          <div className="mx-auto max-w-md rounded-[26px] p-12 text-center" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }} data-testid="marketplace-empty">
            <SearchX size={34} className="mx-auto" style={{ color: "var(--navy)" }} />
            <p className="mt-4 text-lg font-semibold text-[var(--navy)]">Aucune pièce pour « {q || besoin || titreCollection} ».</p>
            <p className="mt-2 text-[14px] opacity-65">Notre sélection est curée, pas pléthorique — dites-nous le besoin, on le cherche pour vous.</p>
            <button onClick={() => setParams({})} data-testid="marketplace-empty-reset" className="btn btn-primary mt-6 px-6 py-3 text-[14px]">
              Revoir toute la sélection
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((i, k) => (
              <Reveal key={i.id} delay={(k % 3) * 0.06} className="h-full">
                <MarketCard item={i} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
