import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { getServices } from "@/lib/api";
import { Eyebrow, PillLink } from "@/components/Bits";
import { MaskedLine, FadeUp } from "@/components/Reveal";

export default function Services() {
    const [services, setServices] = useState(null);

    useEffect(() => {
        getServices()
            .then(setServices)
            .catch(() => setServices([]));
    }, []);

    return (
        <main className="pt-28 md:pt-36">
            <section className="mx-auto max-w-7xl px-6 lg:px-10">
                <Eyebrow>Les services</Eyebrow>
                <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.02] tracking-tight text-ink md:text-6xl lg:text-7xl">
                    <MaskedLine delay={0.05}>
                        Développer, sécuriser,
                    </MaskedLine>
                    <MaskedLine delay={0.17}>
                        <em className="italic text-navy">et respirer.</em>
                    </MaskedLine>
                </h1>
                <FadeUp delay={0.25}>
                    <p className="mt-6 max-w-xl text-sm leading-relaxed text-ink/65 md:text-base">
                        Trois lignes d'accompagnement portées par Zayado.
                        Chaque parcours commence par un diagnostic, puis une
                        proposition sur mesure — jamais de catalogue tout
                        fait.
                    </p>
                </FadeUp>
            </section>

            <section className="mx-auto max-w-7xl px-6 pb-28 pt-12 lg:px-10">
                {services === null ? (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="h-[30rem] animate-pulse border border-line bg-white/60"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {services.map((s, i) => (
                            <FadeUp key={s.slug} delay={i * 0.08} className="h-full">
                                <Link
                                    to={`/services/${s.slug}`}
                                    data-testid={`service-card-${s.slug}`}
                                    className="group flex h-full flex-col border border-line bg-white transition-all duration-300 hover:-translate-y-1 hover:border-navy/40"
                                >
                                    <div className="overflow-hidden">
                                        <img
                                            src={s.image}
                                            alt={s.title}
                                            loading="lazy"
                                            className="img-editorial h-56 w-full object-cover transition-transform duration-700 group-hover:scale-[1.045]"
                                        />
                                    </div>
                                    <div className="flex flex-1 flex-col p-7 md:p-8">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-navy">
                                                Service {s.sort}
                                            </span>
                                            <ArrowUpRight className="h-4 w-4 text-ink/35 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-navy" />
                                        </div>
                                        <h2 className="mt-4 font-serif text-3xl leading-snug text-ink transition-colors duration-300 group-hover:text-navy">
                                            {s.title}
                                        </h2>
                                        <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/60">
                                            {s.tagline}
                                        </p>
                                        <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                                            <span className="font-serif text-lg italic text-navy">
                                                {s.price_summary}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            </FadeUp>
                        ))}
                    </div>
                )}

                <FadeUp>
                    <div className="mt-14 flex flex-col gap-6 border border-line bg-sand p-8 md:flex-row md:items-center md:justify-between md:p-10">
                        <p className="max-w-2xl text-sm leading-relaxed text-ink/70 md:text-base">
                            Pour les actes réglementés — comptabilité certifiée,
                            juridique, fiscal — Zayado travaille avec des
                            partenaires réglementés (expert-comptable, avocat,
                            notaire, conseiller fiscal) et ne se substitue pas
                            à eux.
                        </p>
                        <PillLink
                            to="/diagnostic"
                            dataTestId="services-diagnostic-cta"
                            className="shrink-0"
                        >
                            Demander un diagnostic
                        </PillLink>
                    </div>
                </FadeUp>
            </section>
        </main>
    );
}
