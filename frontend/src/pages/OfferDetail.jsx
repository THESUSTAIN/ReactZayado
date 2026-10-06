import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Clock, Video } from "lucide-react";
import { getOffer, getOffers } from "@/lib/api";
import OfferCard from "@/components/OfferCard";
import { Eyebrow, PillLink } from "@/components/Bits";
import { MaskedLine, FadeUp } from "@/components/Reveal";

export default function OfferDetail() {
    const { id } = useParams();
    const [offer, setOffer] = useState(undefined);
    const [related, setRelated] = useState([]);

    useEffect(() => {
        setOffer(undefined);
        getOffer(id)
            .then(setOffer)
            .catch(() => setOffer(null));
        getOffers()
            .then((all) =>
                setRelated(all.filter((o) => o.id !== id).slice(0, 3)),
            )
            .catch(() => setRelated([]));
    }, [id]);

    if (offer === undefined) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-paper pt-24">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink/45">
                    Chargement…
                </p>
            </main>
        );
    }

    if (offer === null) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper px-6 pt-24 text-center">
                <p className="font-serif text-4xl text-ink">
                    Cette offre n'existe plus.
                </p>
                <PillLink to="/offres" variant="outline" dataTestId="detail-back-catalogue">
                    Voir toutes les offres
                </PillLink>
            </main>
        );
    }

    const metas = [
        ["Tarif", offer.price],
        ["Durée", offer.duration],
        ["Format", offer.format],
        ["Premier échange", "30 minutes offertes"],
    ];

    return (
        <main className="pt-28 md:pt-36">
            <section className="mx-auto max-w-7xl px-6 lg:px-10">
                <Link
                    to="/offres"
                    data-testid="detail-back-link"
                    className="group inline-flex items-center gap-2 text-sm text-ink/55 transition-colors duration-300 hover:text-navy"
                >
                    <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                    Toutes les offres
                </Link>

                <div className="mt-10 grid grid-cols-1 gap-14 lg:grid-cols-12">
                    <div className="lg:col-span-7">
                        <Eyebrow>{offer.category}</Eyebrow>
                        <h1 className="mt-6 font-serif text-4xl leading-[1.03] tracking-tight text-ink md:text-6xl">
                            <MaskedLine delay={0.05}>{offer.title}</MaskedLine>
                        </h1>
                        <p className="mt-6 max-w-xl font-serif text-xl italic leading-snug text-navy md:text-2xl">
                            {offer.tagline}
                        </p>
                        <p className="mt-8 max-w-xl text-sm leading-relaxed text-ink/70 md:text-base">
                            {offer.description}
                        </p>

                        <FadeUp className="mt-10">
                            <dl className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
                                {metas.map(([label, value]) => (
                                    <div key={label} className="bg-white p-5">
                                        <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ink/45">
                                            {label}
                                        </dt>
                                        <dd className="mt-2 font-serif text-lg italic text-ink">
                                            {value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </FadeUp>

                        <FadeUp className="mt-8">
                            <ul className="space-y-3">
                                {[
                                    "Un expert dédié de la Maison",
                                    "Un suivi sans relance insistante",
                                    "Résiliation en toute liberté",
                                ].map((line) => (
                                    <li
                                        key={line}
                                        className="flex items-center gap-3 text-sm text-ink/70"
                                    >
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sand">
                                            <Check className="h-3 w-3 text-navy" />
                                        </span>
                                        {line}
                                    </li>
                                ))}
                            </ul>
                        </FadeUp>
                    </div>

                    <div className="lg:col-span-5">
                        <div className="lg:sticky lg:top-28">
                            <FadeUp>
                                <div className="overflow-hidden rounded-b-3xl rounded-t-[999px]">
                                    <img
                                        src={offer.image}
                                        alt={offer.title}
                                        className="img-editorial aspect-[4/5] w-full object-cover"
                                    />
                                </div>
                                <div className="mt-8 border border-line bg-white p-8">
                                    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink/45">
                                        À partir de
                                    </p>
                                    <p className="mt-2 font-serif text-4xl italic text-navy">
                                        {offer.price}
                                    </p>
                                    <p className="mt-2 flex items-center gap-2 text-xs text-ink/55">
                                        <Clock className="h-3.5 w-3.5" />
                                        {offer.duration}
                                        <Video className="ml-2 h-3.5 w-3.5" />
                                        {offer.format}
                                    </p>
                                    <PillLink
                                        to={`/rendez-vous?offer=${offer.id}`}
                                        dataTestId="offer-detail-cta"
                                        className="mt-7 w-full justify-center"
                                    >
                                        Prendre rendez-vous pour cette offre
                                    </PillLink>
                                </div>
                            </FadeUp>
                        </div>
                    </div>
                </div>
            </section>

            {related.length > 0 && (
                <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
                    <FadeUp>
                        <h2 className="font-serif text-3xl text-ink md:text-4xl">
                            À découvrir aussi.
                        </h2>
                    </FadeUp>
                    <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {related.map((o, i) => (
                            <OfferCard key={o.id} offer={o} index={i} />
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}
