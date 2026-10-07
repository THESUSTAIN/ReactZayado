import { useEffect, useState } from "react";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { getProducts } from "@/lib/api";
import { Eyebrow, PillLink } from "@/components/Bits";
import { MaskedLine, FadeUp } from "@/components/Reveal";

const U = "https://images.unsplash.com";
const IMG = {
    forest: `${U}/photo-1763713383838-5cd702c13160?q=85&w=1200&auto=format&fit=crop`,
    deskMonitor: `${U}/photo-1570993492881-25240ce854f4?q=85&w=1200&auto=format&fit=crop`,
    archBeige: `${U}/photo-1524228461686-3de5d5289d09?q=85&w=1200&auto=format&fit=crop`,
};

const FAMILIES = [
    { key: "tout", label: "Tout" },
    { key: "pour_moi", label: "Pour moi", image: IMG.forest, blurb: "Ces rayons prennent soin du corps, de l'esprit et du rythme de l'entrepreneur — car une entreprise ne va pas plus loin que celui qui la porte." },
    { key: "pour_entreprise", label: "Pour mon entreprise", image: IMG.deskMonitor, blurb: "Ces rayons équipent l'entreprise, du bureau aux outils de gestion — un bon environnement fait gagner du temps, de l'énergie et de l'argent." },
    { key: "transverse", label: "Transverses & box", image: IMG.archBeige, blurb: "Des entrées par envie ou par moment, qui piochent dans tous les rayons." },
];

const BOXES = [
    ["Box entrepreneur apaisé", "dès le lancement"],
    ["Box reset de rentrée", "dès le lancement"],
    ["Box focus automne", "dès le lancement"],
    ["Box récupération hiver", "dès le lancement"],
];

const slug = (s) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]+/g, "-");

export default function Produits() {
    const [products, setProducts] = useState(null);
    const [family, setFamily] = useState("tout");

    useEffect(() => {
        getProducts()
            .then(setProducts)
            .catch(() => setProducts([]));
    }, []);

    const visible = FAMILIES.filter((f) => f.key !== "tout");
    const filtered = (products ?? []).filter(
        (p) => family === "tout" || p.family === family,
    );

    return (
        <main className="pt-28 md:pt-36">
            <section className="mx-auto max-w-7xl px-6 lg:px-10">
                <Eyebrow>Les produits</Eyebrow>
                <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.02] tracking-tight text-ink md:text-6xl lg:text-7xl">
                    <MaskedLine delay={0.05}>
                        Une sélection,
                    </MaskedLine>
                    <MaskedLine delay={0.17}>
                        <em className="italic text-navy">pas un catalogue.</em>
                    </MaskedLine>
                </h1>
                <FadeUp delay={0.25}>
                    <p className="mt-6 max-w-xl text-sm leading-relaxed text-ink/65 md:text-base">
                        Chaque rayon est choisi pour rendre la vie de
                        l'entrepreneur plus simple, plus saine, plus rentable.
                        La sélection est une promesse faite aux clients.
                    </p>
                </FadeUp>
            </section>

            <section className="mx-auto max-w-7xl px-6 pb-28 pt-12 lg:px-10">
                <div
                    data-testid="produits-filters"
                    className="flex flex-wrap gap-2.5"
                >
                    {FAMILIES.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            data-testid={`produits-filter-${f.key}`}
                            onClick={() => setFamily(f.key)}
                            className={`rounded-full border px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
                                family === f.key
                                    ? "border-navy bg-navy text-paper"
                                    : "border-ink/15 bg-white text-ink/70 hover:border-navy hover:text-navy"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                    <span className="ml-auto hidden items-center text-xs text-ink/45 sm:flex">
                        {products === null
                            ? "Chargement…"
                            : `${filtered.length} rayon${filtered.length > 1 ? "s" : ""}`}
                    </span>
                </div>

                {visible
                    .filter((f) => family === "tout" || family === f.key)
                    .map((f) => {
                        const rows = (products ?? []).filter(
                            (p) => p.family === f.key,
                        );
                        if (rows.length === 0 && products !== null) return null;
                        return (
                            <div key={f.key} className="mt-16">
                                {family === "tout" && (
                                    <FadeUp>
                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-center">
                                            <img
                                                src={f.image}
                                                alt={f.label}
                                                loading="lazy"
                                                className="img-editorial h-44 w-full object-cover md:col-span-4"
                                            />
                                            <div className="md:col-span-8">
                                                <h2 className="font-serif text-3xl text-ink md:text-4xl">
                                                    {f.label}
                                                </h2>
                                                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/65 md:text-base">
                                                    {f.blurb}
                                                </p>
                                            </div>
                                        </div>
                                    </FadeUp>
                                )}
                                {rows.length === 0 ? (
                                    <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                        {[0, 1, 2].map((i) => (
                                            <div
                                                key={i}
                                                className="h-56 animate-pulse border border-line bg-white/60"
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <FadeUp className={family === "tout" ? "mt-10" : "mt-10"}>
                                        <div className="grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
                                            {rows.map((p) => (
                                                <article
                                                    key={p.name}
                                                    data-testid={`rayon-card-${slug(p.name)}`}
                                                    className="group flex flex-col bg-white p-8 transition-colors duration-300 hover:bg-sand/60"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <h3 className="font-serif text-2xl leading-snug text-ink">
                                                            {p.name}
                                                        </h3>
                                                        {p.proposed && (
                                                            <span
                                                                data-testid={`rayon-proposed-${slug(p.name)}`}
                                                                className="shrink-0 rounded-full border border-navy/30 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-navy"
                                                            >
                                                                Proposé
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/65">
                                                        {p.description}
                                                    </p>
                                                    <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                                                        <span
                                                            className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                                                                p.price_status === "Sur devis"
                                                                    ? "text-navy"
                                                                    : "text-ink/50"
                                                            }`}
                                                        >
                                                            {p.price_status === "Sur devis"
                                                                ? "Sur devis"
                                                                : "Prix en cours"}
                                                        </span>
                                                        {p.price_status === "Sur devis" ? (
                                                            <Link
                                                                to="/diagnostic?service=amenagement"
                                                                data-testid={`rayon-devis-${slug(p.name)}`}
                                                                className="group/btn inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-semibold text-paper transition-colors duration-300 hover:bg-navy-soft"
                                                            >
                                                                Demander un devis
                                                                <ArrowUpRight className="h-3.5 w-3.5" />
                                                            </Link>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                disabled
                                                                data-testid={`rayon-cart-${slug(p.name)}`}
                                                                title="Sélection en préparation — bientôt disponible"
                                                                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-ink/15 px-4 py-2 text-xs font-semibold text-ink/40"
                                                            >
                                                                <ShoppingBag className="h-3.5 w-3.5" />
                                                                Ajouter au panier
                                                            </button>
                                                        )}
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    </FadeUp>
                                )}
                            </div>
                        );
                    })}

                {products !== null && filtered.length === 0 && (
                    <div
                        data-testid="produits-empty"
                        className="mt-12 border border-line bg-sand p-14 text-center"
                    >
                        <p className="font-serif text-3xl text-ink">
                            Rien dans ce rayon.
                        </p>
                    </div>
                )}

                <FadeUp>
                    <section
                        data-testid="boxes-section"
                        className="mt-20 border border-navy bg-navy p-8 text-paper md:p-12"
                    >
                        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <Eyebrow dark>Box saisonnières</Eyebrow>
                                <h2 className="mt-5 font-serif text-3xl md:text-4xl">
                                    Éditions limitées, en précommande.
                                </h2>
                                <p className="mt-4 max-w-xl text-sm leading-relaxed text-paper/75 md:text-base">
                                    Compteur de places à l'ouverture. Box
                                    équipe : plus tard, pour les dirigeants
                                    qui veulent prendre soin de leurs
                                    collaborateurs.
                                </p>
                            </div>
                            <ul className="grid grid-cols-1 gap-px border border-paper/20 bg-paper/20 sm:grid-cols-2">
                                {BOXES.map(([name, when]) => (
                                    <li
                                        key={name}
                                        data-testid={`box-item-${slug(name)}`}
                                        className="bg-navy p-5"
                                    >
                                        <p className="font-serif text-xl italic">
                                            {name}
                                        </p>
                                        <p className="mt-1 text-xs text-paper/60">
                                            {when} · prix en cours
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>
                </FadeUp>
            </section>
        </main>
    );
}
