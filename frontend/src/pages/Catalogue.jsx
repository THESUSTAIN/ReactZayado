import { useEffect, useState } from "react";
import { getOffers } from "@/lib/api";
import OfferCard from "@/components/OfferCard";
import { Eyebrow } from "@/components/Bits";
import { MaskedLine, FadeUp } from "@/components/Reveal";

const CATEGORIES = ["Toutes", "Juridique", "Comptabilité", "Bien-être", "Croissance"];

const slug = (c) =>
    c
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");

export default function Catalogue() {
    const [offers, setOffers] = useState(null);
    const [category, setCategory] = useState("Toutes");

    useEffect(() => {
        getOffers()
            .then(setOffers)
            .catch(() => setOffers([]));
    }, []);

    const filtered = (offers ?? []).filter(
        (o) => category === "Toutes" || o.category === category,
    );

    return (
        <main className="pt-28 md:pt-36">
            <section className="mx-auto max-w-7xl px-6 lg:px-10">
                <Eyebrow>Le catalogue</Eyebrow>
                <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.02] tracking-tight text-ink md:text-6xl lg:text-7xl">
                    <MaskedLine delay={0.05}>
                        Un catalogue pour
                    </MaskedLine>
                    <MaskedLine delay={0.17}>
                        prendre soin de{" "}
                        <em className="italic text-navy">tout.</em>
                    </MaskedLine>
                </h1>
                <FadeUp delay={0.25}>
                    <p className="mt-6 max-w-xl text-sm leading-relaxed text-ink/65 md:text-base">
                        Chaque offre est animée par un expert de la Maison.
                        Composez votre accompagnement, ou commencez par un
                        rendez-vous et laissez-vous guider.
                    </p>
                </FadeUp>
            </section>

            <section className="mx-auto max-w-7xl px-6 pb-28 pt-12 lg:px-10">
                <div
                    data-testid="catalogue-filters"
                    className="flex flex-wrap gap-2.5"
                >
                    {CATEGORIES.map((c) => (
                        <button
                            key={c}
                            type="button"
                            data-testid={`filter-pill-${slug(c)}`}
                            onClick={() => setCategory(c)}
                            className={`rounded-full border px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
                                category === c
                                    ? "border-navy bg-navy text-paper"
                                    : "border-ink/15 bg-white text-ink/70 hover:border-navy hover:text-navy"
                            }`}
                        >
                            {c}
                        </button>
                    ))}
                    <span className="ml-auto hidden items-center text-xs text-ink/45 sm:flex">
                        {offers === null
                            ? "Chargement…"
                            : `${filtered.length} offre${filtered.length > 1 ? "s" : ""}`}
                    </span>
                </div>

                {offers === null ? (
                    <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="h-[26rem] animate-pulse border border-line bg-white/60"
                            />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div
                        data-testid="catalogue-empty"
                        className="mt-12 border border-line bg-sand p-14 text-center"
                    >
                        <p className="font-serif text-3xl text-ink">
                            Rien dans cette pièce.
                        </p>
                        <p className="mt-3 text-sm text-ink/60">
                            Aucune offre dans cette catégorie pour le moment.
                        </p>
                    </div>
                ) : (
                    <FadeUp className="mt-12">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {filtered.map((o, i) => (
                                <OfferCard key={o.id} offer={o} index={i} />
                            ))}
                        </div>
                    </FadeUp>
                )}
            </section>
        </main>
    );
}
