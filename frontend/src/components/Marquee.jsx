const ITEMS = [
    "Plus de clients",
    "Moins de charge mentale",
    "Cockpit IA",
    "Services d'accompagnement",
    "Produits sélectionnés",
    "Sélection stricte",
];

function Row({ hidden = false }) {
    return (
        <div
            className="flex shrink-0 items-center"
            aria-hidden={hidden || undefined}
        >
            {ITEMS.map((item) => (
                <span key={item} className="flex items-center">
                    <span className="whitespace-nowrap px-8 font-serif text-2xl italic text-navy md:text-3xl">
                        {item}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-navy/35" />
                </span>
            ))}
        </div>
    );
}

export default function Marquee() {
    return (
        <section
            data-testid="editorial-marquee"
            className="overflow-hidden border-y border-line bg-sand py-5"
        >
            <div className="marquee-track flex w-max">
                <Row />
                <Row hidden />
            </div>
        </section>
    );
}
