import { Link } from "react-router-dom";
import { Gift, ShoppingBag } from "lucide-react";
import { Reveal, Stamp } from "@/components/Reveal";
import { IMG } from "@/data/images";
import { BOXES } from "@/data/content";

export default function BoxPage() {
  return (
    <div>
      <section className="border-b" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
          <Reveal>
            <Stamp>Édition limitée · Univers séparé</Stamp>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[var(--navy)] md:text-6xl">
              Les box saisonnières.
            </h1>
            <p className="font-hand mt-2 text-3xl" style={{ color: "var(--gold)" }}>
              le rituel, livré chez vous
            </p>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed opacity-75">
              Chaque saison a son rituel : clore l’année, reprendre souffle. Objets, carnets et douceurs curés par
              Zayado — mêmes checkout et univers d’achat que la marketplace, sans jamais se confondre avec
              l’accompagnement.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14 md:py-20">
        <div className="grid gap-8 md:grid-cols-2">
          {BOXES.map((b, i) => (
            <Reveal key={b.id} delay={i * 0.12} className={i === 1 ? "md:mt-14" : ""}>
              <article className="card group overflow-hidden" data-testid={`box-card-${b.id}`}>
                <div className="relative overflow-hidden">
                  <img src={IMG[b.img]} alt={b.name} className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ background: "rgba(253,252,248,0.92)", color: "var(--navy)" }}>
                    {b.season}
                  </span>
                </div>
                <div className="p-7">
                  <h2 className="text-xl font-semibold leading-snug text-[var(--navy)]">{b.name}</h2>
                  <p className="mt-2 text-[14px] leading-relaxed opacity-70">{b.desc}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-xl font-bold text-[var(--navy)]" data-testid={`box-price-${b.id}`}>{b.price} €</span>
                    <Link to={`/checkout?item=${b.id}`} data-testid={`buy-box-${b.id}`} className="btn btn-primary px-5 py-2.5 text-[14px]">
                      <Gift size={15} /> Acheter la box
                    </Link>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="card mt-12 flex flex-col items-center justify-between gap-4 p-7 text-center sm:flex-row sm:text-left">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--gold)" }}>L’univers d’achat complet</p>
              <p className="mt-1 text-lg font-semibold text-[var(--navy)]">Envie de la sélection entière ?</p>
            </div>
            <Link to="/boutique" data-testid="box-link-boutique" className="btn btn-ghost px-6 py-3 text-[14px]">
              <ShoppingBag size={15} /> Retour à la boutique
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
