import { Link } from "react-router-dom";
import { Stamp } from "@/components/Reveal";
import usePageMeta from "@/hooks/usePageMeta";
import { IMG } from "@/data/images";

const OPTIONS = [
  { key: "heroDesk", img: IMG.heroDesk, label: "Option 1 — Bureau & dashboard (actuelle)", note: "Laptop avec jauge d’équilibre 78/100, plantes, livres, thé." },
  { key: "heroDeskMountain", img: IMG.heroDeskMountain, label: "Option 2 — Montagne", note: "Bureau face à la montagne — l’apaisement avant tout." },
  { key: "heroDeskHands", img: IMG.heroDeskHands, label: "Option 3 — Mains & carnet", note: "L’écriture, le carnet, le dashboard discret." },
];

export default function HeroChoix() {
  usePageMeta("Choix de l’image hero — Zayado", "Trois propositions d’image hero pour la page d’accueil Zayado.");
  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <Stamp>Choix du hero</Stamp>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[var(--navy)] md:text-4xl">
        Trois propositions — dites-moi votre numéro.
      </h1>
      <p className="mt-3 text-[15px] opacity-70">
        L’option 1 est actuellement en place sur l’accueil. Répondez dans le chat (« image 2 » ou « image 3 ») et je
        bascule.
      </p>
      <div className="mt-10 space-y-12">
        {OPTIONS.map((o, i) => (
          <div key={o.key} data-testid={`hero-option-${i + 1}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold text-[var(--navy)]">{o.label}</h2>
              <p className="text-sm opacity-60">{o.note}</p>
            </div>
            <img src={o.img} alt={o.label} className="mt-4 w-full max-w-md rounded-2xl border object-cover" style={{ borderColor: "var(--line)" }} />
          </div>
        ))}
      </div>
      <Link to="/" className="mt-12 inline-block text-sm font-medium underline opacity-60 hover:opacity-100" data-testid="hero-choix-back">
        Retour à l’accueil
      </Link>
    </div>
  );
}
