import { useEffect, useRef, useState } from "react";
import {
    motion,
    useScroll,
    useTransform,
    useReducedMotion,
} from "framer-motion";
import { ArrowDown, ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { getProducts, getServices } from "@/lib/api";
import Marquee from "@/components/Marquee";
import { Eyebrow, PillLink } from "@/components/Bits";
import { MaskedLine, FadeUp, EASE } from "@/components/Reveal";

const U = "https://images.unsplash.com";
const IMG = {
    hero: `${U}/photo-1567016376408-0226e4d0c1ea?q=85&w=1200&auto=format&fit=crop`,
    heroSmall: `${U}/photo-1597787427778-5bcd7be5bd37?q=85&w=800&auto=format&fit=crop`,
    forest: `${U}/photo-1763713383838-5cd702c13160?q=85&w=1200&auto=format&fit=crop`,
    deskMain: "https://images.pexels.com/photos/7057/desk-office-computer-imac.jpg?auto=compress&cs=tinysrgb&w=1200",
    deskMonitor: `${U}/photo-1570993492881-25240ce854f4?q=85&w=1200&auto=format&fit=crop`,
    archBeige: `${U}/photo-1524228461686-3de5d5289d09?q=85&w=1200&auto=format&fit=crop`,
};

const COMPETITORS = [
    {
        name: "LegalPlace",
        zone: "Plateforme juridique en ligne",
        does: "Création, domiciliation, compte pro, assurance et comptabilité : l'un des parcours les plus larges du marché, entièrement digitalisé.",
        missing: "L'humain reste à la porte — personne pour prendre soin du dirigeant.",
    },
    {
        name: "Captain Contrat",
        zone: "Juridique accompagné",
        does: "Un juriste dédié et un réseau d'avocats partenaires pour des formalités juridiques très humaines.",
        missing: "Le périmètre s'arrête au droit : ni pilotage quotidien, ni bien-être, ni produits.",
    },
    {
        name: "Indy",
        zone: "Comptabilité automatisée",
        does: "La comptabilité en ligne pensée pour les indépendants : rapide, automatisée, sans friction.",
        missing: "Un outil excellent, mais seul face à l'écran — aucun accompagnement humain.",
    },
];

function Hero() {
    const reduce = useReducedMotion();
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"],
    });
    const yImg = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90]);
    const yBadge = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -70]);

    return (
        <section
            ref={ref}
            data-testid="hero-section"
            className="relative overflow-hidden pb-16 pt-28 md:pt-36 lg:pb-24 lg:pt-44"
        >
            <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-12 lg:gap-8 lg:px-10">
                <div className="lg:col-span-7">
                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: EASE }}
                    >
                        <Eyebrow>
                            Zayado — Maison des entrepreneurs apaisés
                        </Eyebrow>
                    </motion.div>

                    <h1 className="mt-8 font-serif text-[15vw] leading-[0.98] tracking-tight text-ink sm:text-6xl lg:text-7xl xl:text-[5.4rem]">
                        <MaskedLine delay={0.08}>
                            Rentabiliser
                        </MaskedLine>
                        <MaskedLine delay={0.2}>
                            <em className="italic text-navy">son entreprise</em>,
                        </MaskedLine>
                        <MaskedLine delay={0.32}>
                            sans s'y perdre.
                        </MaskedLine>
                    </h1>

                    <motion.p
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: EASE, delay: 0.55 }}
                        className="mt-8 max-w-xl text-base leading-relaxed text-ink/70 md:text-lg"
                    >
                        Vous portez tout : les clients, les chiffres, les
                        décisions, l'organisation — et vous passez en dernier.
                        Zayado réunit les services pour développer et sécuriser
                        votre activité, un Cockpit IA pour piloter le quotidien
                        et des produits sélectionnés pour prendre soin de vous.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: EASE, delay: 0.7 }}
                        className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center"
                    >
                        <PillLink
                            to="/diagnostic"
                            dataTestId="hero-cta-primary"
                        >
                            Demander un diagnostic
                        </PillLink>
                        <PillLink
                            to="/services"
                            variant="outline"
                            dataTestId="hero-cta-secondary"
                        >
                            Découvrir les services
                        </PillLink>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.9 }}
                        className="mt-8 flex items-center gap-2 text-xs text-ink/55"
                    >
                        <Check className="h-3.5 w-3.5 text-navy" />
                        Premier échange avec la Maison — sans engagement.
                    </motion.p>
                </div>

                <div className="relative lg:col-span-5">
                    <motion.div
                        style={{ y: yImg }}
                        className="relative"
                    >
                        <motion.div
                            initial={reduce ? { opacity: 1 } : { clipPath: "inset(100% 0 0 0)" }}
                            animate={{ clipPath: "inset(0% 0 0 0)" }}
                            transition={{ duration: 1.1, ease: EASE, delay: 0.35 }}
                            className="overflow-hidden rounded-b-3xl rounded-t-[999px]"
                        >
                            <img
                                src={IMG.hero}
                                alt="Architecture minimaliste aux tons beige"
                                className="img-editorial aspect-[3/4] w-full object-cover"
                            />
                        </motion.div>

                        <motion.div
                            style={{ y: yBadge }}
                            initial={{ opacity: 0, scale: 0.94 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.7, ease: EASE, delay: 0.9 }}
                            className="absolute -left-6 bottom-12 border border-line bg-white/90 px-6 py-4 backdrop-blur-md md:-left-12"
                        >
                            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-navy">
                                La promesse
                            </p>
                            <p className="mt-1 font-serif text-lg italic text-ink">
                                Plus de clients, moins de charge mentale
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: EASE, delay: 1.05 }}
                            className="absolute -right-4 -top-6 hidden w-36 overflow-hidden rounded-2xl border border-line shadow-lg shadow-navy/10 md:block lg:-right-8"
                        >
                            <img
                                src={IMG.heroSmall}
                                alt="Arches minimalistes"
                                className="img-editorial aspect-square w-full object-cover"
                            />
                        </motion.div>
                    </motion.div>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3, duration: 0.8 }}
                className="absolute bottom-6 left-6 hidden items-center gap-3 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-ink/45 lg:flex lg:left-10"
            >
                <ArrowDown className="h-4 w-4 animate-bounce" />
                Défiler
            </motion.div>
        </section>
    );
}

const WHY = [
    {
        num: "01",
        tag: "Le problème",
        title: "L'entrepreneur porte tout — et passe en dernier.",
        desc: "Les clients, les chiffres, les décisions, l'organisation : tout repose sur vous. Zayado existe pour que rentabiliser votre entreprise ne se fasse jamais au prix de votre santé, de votre famille ou de votre sens.",
        chips: ["Santé", "Famille", "Sens"],
        image: IMG.forest,
        layout: "image",
    },
    {
        num: "02",
        tag: "La sélection",
        title: "La sélection est une promesse.",
        desc: "Zayado n'est ni Amazon, ni une plateforme de freelances au rabais. Chaque produit et chaque partenaire est choisi pour rendre votre vie plus simple, plus saine, plus rentable.",
        chips: ["Qualité", "Fiabilité", "Utilité réelle"],
        layout: "navy",
    },
    {
        num: "03",
        tag: "Le socle",
        title: "Le conseil financier, d'abord.",
        desc: "Comprendre ses chiffres, sécuriser sa trésorerie, acheter ou développer une entreprise : Zayado accompagne les décisions financières importantes avec des partenaires réglementés.",
        chips: ["Trésorerie", "Rentabilité", "Acquisition"],
        image: IMG.deskMonitor,
        layout: "sand",
    },
    {
        num: "04",
        tag: "La confiance",
        title: "Porté par Zayado, pas sous-traité.",
        desc: "Vous savez toujours à qui vous vous adressez. Les services sont portés par Zayado — pas revendus au moindre coût par le dernier arrivé.",
        chips: ["Interlocuteur unique", "Confiance"],
        image: IMG.archBeige,
        layout: "split",
    },
];

function Why() {
    return (
        <section id="maison" data-testid="why-section" className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <FadeUp>
                    <Eyebrow>Pourquoi Zayado</Eyebrow>
                    <h2 className="mt-6 max-w-xl font-serif text-4xl leading-[1.05] tracking-tight text-ink md:text-5xl lg:text-6xl">
                        Toutes les dimensions,{" "}
                        <em className="italic text-navy">une seule maison.</em>
                    </h2>
                </FadeUp>
                <FadeUp delay={0.1}>
                    <p className="max-w-md text-sm leading-relaxed text-ink/65 md:text-base">
                        Finances, organisation, corps, esprit, rituels : la
                        réussite de l'entreprise est liée à l'équilibre de
                        celui qui la porte.
                    </p>
                </FadeUp>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-12">
                {WHY.map((p, i) => (
                    <FadeUp
                        key={p.num}
                        delay={i * 0.08}
                        className={
                            p.layout === "image" || p.layout === "split"
                                ? "md:col-span-7"
                                : "md:col-span-5"
                        }
                    >
                        {p.layout === "navy" ? (
                            <article className="relative flex h-full flex-col overflow-hidden border border-navy bg-navy p-8 text-paper md:p-10">
                                <YoriWatermark />
                                <CardHead p={p} dark />
                                <p className="mt-5 max-w-sm text-sm leading-relaxed text-paper/75 md:text-base">
                                    {p.desc}
                                </p>
                                <Chips p={p} dark />
                            </article>
                        ) : p.layout === "sand" ? (
                            <article className="flex h-full flex-col border border-line bg-sand p-8 md:p-10">
                                <CardHead p={p} />
                                <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink/70 md:text-base">
                                    {p.desc}
                                </p>
                                <Chips p={p} />
                                <img
                                    src={p.image}
                                    alt={p.tag}
                                    loading="lazy"
                                    className="img-editorial mt-8 h-40 w-full object-cover"
                                />
                            </article>
                        ) : p.layout === "split" ? (
                            <article className="flex h-full flex-col overflow-hidden border border-line bg-white sm:flex-row">
                                <div className="flex flex-1 flex-col p-8 md:p-10">
                                    <CardHead p={p} />
                                    <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink/70 md:text-base">
                                        {p.desc}
                                    </p>
                                    <Chips p={p} />
                                </div>
                                <img
                                    src={p.image}
                                    alt={p.tag}
                                    loading="lazy"
                                    className="img-editorial h-48 w-full object-cover sm:h-auto sm:w-2/5"
                                />
                            </article>
                        ) : (
                            <article className="flex h-full flex-col overflow-hidden border border-line bg-white">
                                <img
                                    src={p.image}
                                    alt={p.tag}
                                    loading="lazy"
                                    className="img-editorial h-56 w-full object-cover"
                                />
                                <div className="flex flex-1 flex-col p-8 md:p-10">
                                    <CardHead p={p} />
                                    <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink/70 md:text-base">
                                        {p.desc}
                                    </p>
                                    <Chips p={p} />
                                </div>
                            </article>
                        )}
                    </FadeUp>
                ))}
            </div>
        </section>
    );
}

function CardHead({ p, dark = false }) {
    return (
        <div className={`flex items-start justify-between ${dark ? "text-paper" : "text-ink"}`}>
            <div>
                <span
                    className={`text-[0.65rem] font-semibold uppercase tracking-[0.22em] ${
                        dark ? "text-paper/60" : "text-navy"
                    }`}
                >
                    {p.tag}
                </span>
                <h3 className="mt-3 font-serif text-3xl leading-tight md:text-4xl">
                    {p.title}
                </h3>
            </div>
            <span
                className={`font-serif text-4xl italic ${
                    dark ? "text-paper/30" : "text-ink/20"
                }`}
            >
                {p.num}
            </span>
        </div>
    );
}

function Chips({ p, dark = false }) {
    return (
        <ul className="mt-7 flex flex-wrap gap-2">
            {p.chips.map((c) => (
                <li
                    key={c}
                    className={`rounded-full border px-3.5 py-1.5 text-xs ${
                        dark
                            ? "border-paper/25 text-paper/85"
                            : "border-ink/15 text-ink/70"
                    }`}
                >
                    {c}
                </li>
            ))}
        </ul>
    );
}

function YoriWatermark() {
    return (
        <svg
            viewBox="0 0 48 48"
            className="pointer-events-none absolute -bottom-10 -right-6 h-56 w-56 text-paper/10"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M12 40V25a12 12 0 0 1 24 0v15"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
            />
            <circle cx="40.5" cy="11.5" r="3.4" fill="currentColor" />
        </svg>
    );
}

function Families() {
    return (
        <section data-testid="families-section" className="border-y border-line bg-sand/60">
            <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
                <FadeUp>
                    <Eyebrow>Comment fonctionne la marketplace</Eyebrow>
                    <h2 className="mt-6 max-w-2xl font-serif text-4xl leading-[1.05] tracking-tight text-ink md:text-5xl">
                        Une marketplace,{" "}
                        <em className="italic text-navy">deux familles.</em>
                    </h2>
                </FadeUp>

                <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <FadeUp>
                        <article className="flex h-full flex-col border border-line bg-white">
                            <img
                                src={IMG.deskMain}
                                alt="Services d'accompagnement"
                                loading="lazy"
                                className="img-editorial h-60 w-full object-cover"
                            />
                            <div className="flex flex-1 flex-col p-8 md:p-10">
                                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-navy">
                                    Famille 1 — Services
                                </span>
                                <h3 className="mt-4 font-serif text-3xl leading-tight text-ink md:text-4xl">
                                    Développer et sécuriser l'activité.
                                </h3>
                                <p className="mt-4 text-sm leading-relaxed text-ink/65 md:text-base">
                                    Optimisation d'entreprise, acquisition et
                                    transmission. Chaque parcours commence par
                                    un diagnostic, puis une proposition sur
                                    mesure.
                                </p>
                                <div className="mt-auto flex flex-wrap gap-2 pt-6">
                                    <span className="rounded-full border border-ink/15 px-3.5 py-1.5 text-xs text-ink/70">
                                        Bouton : « Demander un diagnostic »
                                    </span>
                                </div>
                                <PillLink
                                    to="/services"
                                    dataTestId="family-services-cta"
                                    className="mt-8 self-start"
                                >
                                    Voir les services
                                </PillLink>
                            </div>
                        </article>
                    </FadeUp>

                    <FadeUp delay={0.1}>
                        <article className="flex h-full flex-col border border-line bg-white">
                            <img
                                src={IMG.forest}
                                alt="Produits sélectionnés"
                                loading="lazy"
                                className="img-editorial h-60 w-full object-cover"
                            />
                            <div className="flex flex-1 flex-col p-8 md:p-10">
                                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-navy">
                                    Famille 2 — Produits
                                </span>
                                <h3 className="mt-4 font-serif text-3xl leading-tight text-ink md:text-4xl">
                                    Prendre soin du corps, de l'esprit et de
                                    l'espace de travail.
                                </h3>
                                <p className="mt-4 text-sm leading-relaxed text-ink/65 md:text-base">
                                    Des rayons sélectionnés pour l'entrepreneur
                                    et son entreprise — plus l'aménagement et
                                    les travaux réalisés par des partenaires.
                                </p>
                                <div className="mt-auto flex flex-wrap gap-2 pt-6">
                                    <span className="rounded-full border border-ink/15 px-3.5 py-1.5 text-xs text-ink/70">
                                        Bouton : « Ajouter au panier »
                                    </span>
                                    <span className="rounded-full border border-ink/15 px-3.5 py-1.5 text-xs text-ink/70">
                                        « Demander un devis » pour les travaux
                                    </span>
                                </div>
                                <PillLink
                                    to="/produits"
                                    dataTestId="family-products-cta"
                                    className="mt-8 self-start"
                                >
                                    Explorer les rayons
                                </PillLink>
                            </div>
                        </article>
                    </FadeUp>
                </div>
            </div>
        </section>
    );
}

function Cockpit() {
    return (
        <section data-testid="cockpit-section" className="bg-ink text-paper">
            <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
                <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
                    <div className="lg:col-span-5">
                        <FadeUp>
                            <Eyebrow dark>Service phare</Eyebrow>
                            <h2 className="mt-6 font-serif text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                                Cockpit IA{" "}
                                <em className="italic text-paper/75">
                                    Zayado.
                                </em>
                            </h2>
                            <p className="mt-6 max-w-md text-sm leading-relaxed text-paper/70 md:text-base">
                                Votre vision, vos priorités, vos prospects et
                                votre énergie, rassemblés dans un seul espace.
                                L'IA prépare, l'entrepreneur décide.
                            </p>
                            <p className="mt-8 font-serif text-2xl italic text-paper/90">
                                dès 15 € / mois — 1 mois d'essai offert, sans
                                carte.
                            </p>
                            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                                <PillLink
                                    to="/services/cockpit-ia"
                                    variant="light"
                                    dataTestId="cockpit-discover-cta"
                                >
                                    Voir les offres
                                </PillLink>
                                <PillLink
                                    to="/diagnostic?service=cockpit-ia"
                                    variant="outline"
                                    dataTestId="cockpit-subscribe-cta"
                                    className="!border-paper/30 !text-paper hover:!border-paper"
                                >
                                    S'abonner
                                </PillLink>
                            </div>
                        </FadeUp>
                    </div>
                    <div className="grid grid-cols-1 gap-px border border-paper/15 bg-paper/15 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-2">
                        {[
                            ["Clarté", "Vision Board, plan d'action, priorité du jour."],
                            ["Clients", "Le Radar trouve des prospects et prescripteurs, avec des messages prêts."],
                            ["Sérénité", "Suivi de l'énergie et de la charge mentale, exercices de mindset."],
                            ["Rentabilité", "Pouls business (trésorerie, chiffre d'affaires), revue hebdomadaire."],
                            ["Disponibilité", "Agent Business (assistant à votre marque) pour répondre aux clients."],
                        ].map(([name, desc], i) => (
                            <FadeUp
                                key={name}
                                delay={i * 0.06}
                                className="bg-ink p-8"
                            >
                                <p className="font-serif text-2xl italic text-paper">
                                    {name}
                                </p>
                                <p className="mt-3 text-sm leading-relaxed text-paper/65">
                                    {desc}
                                </p>
                            </FadeUp>
                        ))}
                        <FadeUp delay={0.3} className="bg-navy p-8">
                            <p className="font-serif text-2xl italic text-paper">
                                Tarifs fondateurs
                            </p>
                            <p className="mt-3 text-sm leading-relaxed text-paper/80">
                                Solo à 24 €/mois, Pro à 49 €/mois — pour les
                                premiers arrivés. Membres TheSustain : -30 %.
                            </p>
                        </FadeUp>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Competitors() {
    return (
        <section id="marche" data-testid="competitors-section" className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
            <FadeUp>
                <Eyebrow>Le marché</Eyebrow>
                <h2 className="mt-6 max-w-2xl font-serif text-4xl leading-[1.05] tracking-tight text-ink md:text-5xl lg:text-6xl">
                    Trois acteurs, chacun{" "}
                    <em className="italic text-navy">pour soi.</em>
                </h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-ink/65 md:text-base">
                    Zayado se compare aux références du marché. Elles
                    excellent toutes dans leur métier. Aucune ne prend soin de
                    l'entrepreneur <em>et</em> de son entreprise, au même
                    endroit.
                </p>
            </FadeUp>

            <div className="mt-14">
                {COMPETITORS.map((c, i) => (
                    <FadeUp
                        key={c.name}
                        delay={i * 0.07}
                    >
                        <article
                            data-testid={`competitor-card-${c.name.toLowerCase().replace(/\s/g, "-")}`}
                            className="grid grid-cols-1 gap-6 border-t border-line py-10 md:grid-cols-12 md:items-start"
                        >
                            <div className="md:col-span-3">
                                <h3 className="font-serif text-3xl text-ink">
                                    {c.name}
                                </h3>
                                <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-navy">
                                    {c.zone}
                                </p>
                            </div>
                            <div className="md:col-span-5">
                                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/40">
                                    Ce qu'ils font bien
                                </p>
                                <p className="mt-3 text-sm leading-relaxed text-ink/70 md:text-base">
                                    {c.does}
                                </p>
                            </div>
                            <div className="md:col-span-4">
                                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/40">
                                    Ce qui manque
                                </p>
                                <p className="mt-3 font-serif text-lg italic leading-snug text-navy md:text-xl">
                                    {c.missing}
                                </p>
                            </div>
                        </article>
                    </FadeUp>
                ))}

                <FadeUp>
                    <article
                        data-testid="zayado-positioning-card"
                        className="mt-4 flex flex-col gap-8 border border-navy bg-navy p-8 text-paper md:flex-row md:items-center md:justify-between md:p-12"
                    >
                        <div>
                            <h3 className="font-serif text-3xl md:text-4xl">
                                Zayado, la Maison qui réunit les deux.
                            </h3>
                            <p className="mt-4 max-w-xl text-sm leading-relaxed text-paper/80 md:text-base">
                                Services d'accompagnement, Cockpit IA et
                                produits sélectionnés : une seule marketplace,
                                pour l'entrepreneur et son entreprise.
                            </p>
                        </div>
                        <PillLink
                            to="/diagnostic"
                            variant="light"
                            dataTestId="competitors-cta"
                            className="shrink-0"
                        >
                            Demander un diagnostic
                        </PillLink>
                    </article>
                </FadeUp>

                <FadeUp>
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-line bg-sand px-6 py-5 md:px-8">
                        <p className="flex items-center gap-3 text-sm text-ink/70">
                            <ShieldCheck className="h-4 w-4 shrink-0 text-navy" />
                            Ni catalogue infini, ni freelances au rabais : la
                            sélection est une promesse faite aux clients.
                        </p>
                        <Link
                            to="/produits"
                            data-testid="anti-amazon-link"
                            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-navy"
                        >
                            Voir la sélection
                            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                </FadeUp>
            </div>
        </section>
    );
}

function Philosophy() {
    const [services, setServices] = useState([]);
    const [products, setProducts] = useState([]);

    useEffect(() => {
        getServices()
            .then(setServices)
            .catch(() => {});
        getProducts()
            .then(setProducts)
            .catch(() => {});
    }, []);

    const rayons = products.length;

    return (
        <section data-testid="philosophy-section" className="border-t border-line bg-sand">
            <div className="mx-auto max-w-5xl px-6 py-24 text-center lg:px-10 lg:py-32">
                <FadeUp>
                    <p className="font-serif text-3xl italic leading-snug text-ink md:text-4xl lg:text-5xl">
                        «&nbsp;La réussite de l'entreprise est liée à
                        l'équilibre de celui qui la porte.&nbsp;»
                    </p>
                    <p className="mt-8 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-navy">
                        Zayado — Maison des entrepreneurs apaisés
                    </p>
                </FadeUp>
                <FadeUp delay={0.15}>
                    <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 divide-x divide-ink/10 border-y border-ink/10 py-6">
                        {[
                            [String(services.length || "3"), "services d'accompagnement"],
                            [rayons ? String(rayons) : "—", "rayons de produits"],
                            ["dès 15 €", "le Cockpit IA par mois"],
                        ].map(([n, label]) => (
                            <div key={label} className="px-2">
                                <p className="font-serif text-3xl text-navy md:text-4xl">
                                    {n}
                                </p>
                                <p className="mt-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ink/50">
                                    {label}
                                </p>
                            </div>
                        ))}
                    </div>
                </FadeUp>
            </div>
        </section>
    );
}

export default function Home() {
    return (
        <main>
            <Hero />
            <Marquee />
            <Why />
            <Families />
            <Cockpit />
            <Competitors />
            <Philosophy />
        </main>
    );
}
