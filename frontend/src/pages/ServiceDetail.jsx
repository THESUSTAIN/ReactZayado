import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { getService } from "@/lib/api";
import { Eyebrow, PillLink } from "@/components/Bits";
import { MaskedLine, FadeUp } from "@/components/Reveal";

function DiagnosticCta({ service, label, dataTestId }) {
    return (
        <PillLink
            to={`/diagnostic?service=${service}`}
            dataTestId={dataTestId}
            className="mt-8"
        >
            {label}
        </PillLink>
    );
}

export default function ServiceDetail() {
    const { slug } = useParams();
    const [service, setService] = useState(undefined);

    useEffect(() => {
        setService(undefined);
        getService(slug)
            .then(setService)
            .catch(() => setService(null));
    }, [slug]);

    if (service === undefined) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-paper pt-24">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink/45">
                    Chargement…
                </p>
            </main>
        );
    }

    if (service === null) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper px-6 pt-24 text-center">
                <p className="font-serif text-4xl text-ink">
                    Ce service n'existe plus.
                </p>
                <PillLink to="/services" variant="outline" dataTestId="detail-back-services">
                    Voir tous les services
                </PillLink>
            </main>
        );
    }

    return (
        <main className="pt-28 md:pt-36">
            <section className="mx-auto max-w-7xl px-6 lg:px-10">
                <Link
                    to="/services"
                    data-testid="detail-back-link"
                    className="group inline-flex items-center gap-2 text-sm text-ink/55 transition-colors duration-300 hover:text-navy"
                >
                    <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                    Tous les services
                </Link>

                <div className="mt-10 grid grid-cols-1 gap-14 lg:grid-cols-12">
                    <div className="lg:col-span-7">
                        <Eyebrow>Service {service.sort}</Eyebrow>
                        <h1 className="mt-6 font-serif text-4xl leading-[1.03] tracking-tight text-ink md:text-6xl">
                            <MaskedLine delay={0.05}>{service.title}</MaskedLine>
                        </h1>
                        <p className="mt-6 max-w-xl font-serif text-xl italic leading-snug text-navy md:text-2xl">
                            {service.tagline}
                        </p>
                        <p className="mt-8 max-w-xl text-sm leading-relaxed text-ink/70 md:text-base">
                            {service.intro}
                        </p>
                        <p className="mt-6 font-serif text-2xl italic text-ink">
                            {service.price_summary}
                        </p>

                        <FadeUp className="mt-10">
                            <ul className="space-y-3">
                                {[
                                    "Premier échange avec la Maison, sans engagement",
                                    "Proposition sur mesure après diagnostic",
                                    "Un interlocuteur de confiance, pas de sous-traitance opaque",
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

                        <DiagnosticCta
                            service={service.slug}
                            label={`${service.cta_label} — ${service.title}`}
                            dataTestId="service-detail-cta"
                        />
                    </div>

                    <div className="lg:col-span-5">
                        <div className="lg:sticky lg:top-28">
                            <FadeUp>
                                <div className="overflow-hidden rounded-b-3xl rounded-t-[999px]">
                                    <img
                                        src={service.image}
                                        alt={service.title}
                                        className="img-editorial aspect-[4/5] w-full object-cover"
                                    />
                                </div>
                            </FadeUp>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 pb-28 lg:px-10">
                {service.features.length > 0 && (
                    <FadeUp>
                        <h2 className="mt-16 font-serif text-3xl text-ink md:text-4xl">
                            Ce que le Cockpit apporte.
                        </h2>
                        <div className="mt-10 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
                            {service.features.map((f) => (
                                <div key={f.name} className="bg-white p-8">
                                    <p className="font-serif text-2xl italic text-navy">
                                        {f.name}
                                    </p>
                                    <p className="mt-3 text-sm leading-relaxed text-ink/65">
                                        {f.desc}
                                    </p>
                                </div>
                            ))}
                            <div className="bg-sand p-8">
                                <p className="font-serif text-2xl italic text-navy">
                                    Tarifs fondateurs
                                </p>
                                <p className="mt-3 text-sm leading-relaxed text-ink/70">
                                    Solo à 24 €/mois, Pro à 49 €/mois — pour
                                    les premiers arrivés.
                                </p>
                            </div>
                        </div>
                    </FadeUp>
                )}

                {service.plans.length > 0 && (
                    <FadeUp>
                        <h2 className="mt-16 font-serif text-3xl text-ink md:text-4xl">
                            {service.kind === "cockpit"
                                ? "Les offres d'abonnement."
                                : "Les forfaits."}
                        </h2>
                        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {service.plans.map((p, i) => (
                                <article
                                    key={p.name}
                                    data-testid={`plan-card-${i + 1}`}
                                    className={`flex h-full flex-col p-8 ${
                                        i === service.plans.length - 1 &&
                                        service.kind === "cockpit"
                                            ? "border border-navy bg-navy text-paper"
                                            : "border border-line bg-white"
                                    }`}
                                >
                                    <h3 className="font-serif text-2xl leading-tight">
                                        {p.name}
                                    </h3>
                                    <p
                                        className={`mt-3 flex-1 text-sm leading-relaxed ${
                                            i === service.plans.length - 1 &&
                                            service.kind === "cockpit"
                                                ? "text-paper/75"
                                                : "text-ink/65"
                                        }`}
                                    >
                                        {p.target}
                                    </p>
                                    <p className="mt-6 font-serif text-2xl italic text-navy">
                                        {p.price}
                                    </p>
                                    {p.special && (
                                        <p className="mt-2 text-xs text-ink/55">
                                            {p.special}
                                        </p>
                                    )}
                                    {service.kind === "cockpit" && (
                                        <PillLink
                                            to={`/diagnostic?service=cockpit-ia`}
                                            variant={
                                                i === service.plans.length - 1
                                                    ? "light"
                                                    : "solid"
                                            }
                                            dataTestId={`plan-cta-${i + 1}`}
                                            className="mt-7 self-start"
                                        >
                                            {service.cta_label}
                                        </PillLink>
                                    )}
                                </article>
                            ))}
                        </div>
                    </FadeUp>
                )}

                {service.rows.length > 0 && (
                    <FadeUp>
                        <h2 className="mt-16 font-serif text-3xl text-ink md:text-4xl">
                            Les services inclus.
                        </h2>
                        <div className="mt-10 border-t border-line">
                            {service.rows.map((r) => (
                                <article
                                    key={r.name}
                                    data-testid={`service-row-${r.name.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                                    className="grid grid-cols-1 gap-4 border-b border-line py-8 md:grid-cols-12"
                                >
                                    <h3 className="font-serif text-2xl text-ink md:col-span-4">
                                        {r.name}
                                    </h3>
                                    <div className="md:col-span-3">
                                        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ink/40">
                                            Pour qui
                                        </p>
                                        <p className="mt-2 text-sm text-ink/70">
                                            {r.target}
                                        </p>
                                    </div>
                                    <div className="md:col-span-5">
                                        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ink/40">
                                            Ce que Zayado fait
                                        </p>
                                        <p className="mt-2 text-sm leading-relaxed text-ink/70">
                                            {r.what}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </FadeUp>
                )}

                {service.steps.length > 0 && (
                    <FadeUp>
                        <h2 className="mt-16 font-serif text-3xl text-ink md:text-4xl">
                            Le parcours, étape par étape.
                        </h2>
                        <div className="mt-10 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
                            {service.steps.map((s) => (
                                <div key={s.n} className="bg-white p-8">
                                    <span className="font-serif text-4xl italic text-navy/40">
                                        {s.n}
                                    </span>
                                    <p className="mt-4 font-serif text-xl text-ink">
                                        {s.label}
                                    </p>
                                    <p className="mt-2 text-sm leading-relaxed text-ink/65">
                                        {s.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </FadeUp>
                )}

                {service.notes.length > 0 && (
                    <FadeUp>
                        <div className="mt-14 border border-line bg-sand p-8 md:p-10">
                            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-navy">
                                Bon à savoir
                            </p>
                            <ul className="mt-5 space-y-3">
                                {service.notes.map((n) => (
                                    <li
                                        key={n}
                                        className="flex gap-3 text-sm leading-relaxed text-ink/70"
                                    >
                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-navy/50" />
                                        {n}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </FadeUp>
                )}
            </section>
        </main>
    );
}
