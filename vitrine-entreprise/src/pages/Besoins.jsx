import { Link } from "react-router-dom";
import { ArrowRight, Check, Compass, Handshake, LineChart, Sparkles, Wrench } from "lucide-react";
import { Reveal, Stamp } from "@/components/Reveal";
import usePageMeta from "@/hooks/usePageMeta";

const PILIERS = [
  {
    id: "accompagner", Icon: Handshake, nom: "Accompagner",
    promesse: "Vous conseiller quand la décision compte.",
    besoins: ["Clarté financière et tableaux de bord", "Acquérir, reprendre ou transmettre", "Optimiser la rentabilité"],
    ctas: [
      { label: "Accompagnement", to: "/services" },
      { label: "Reprendre une entreprise", to: "/tunnel/acquisition" },
    ],
  },
  {
    id: "piloter", Icon: LineChart, nom: "Piloter",
    promesse: "Voir clair chaque jour, sans y passer vos soirées.",
    besoins: ["Chiffres et trésorerie en un coup d’œil", "Objectifs 90 jours et revue hebdo", "Énergie suivie comme un indicateur"],
    ctas: [{ label: "Découvrir le Cockpit", to: "/cockpit" }],
  },
  {
    id: "connecter", Icon: Compass, nom: "Connecter",
    promesse: "Le bon pro, la bonne opportunité — sélectionnés par nous.",
    besoins: ["Artisans et spécialistes vérifiés (aménagement, équipement)", "Opportunités de reprise et de transmission", "Un seul interlocuteur, jamais une plateforme anonyme"],
    note: "Sur sélection uniquement — pas d’annonces ouvertes, pas de particuliers.",
    ctas: [{ label: "Nos partenaires", to: "/services" }],
  },
  {
    id: "equiper", Icon: Wrench, nom: "Équiper",
    promesse: "Un environnement qui soutient l’effort, le corps et la tête.",
    besoins: ["Mobilier, éclairage, environnement de travail", "Bien-être, focus, récupération", "Box saisonnières en édition limitée"],
    ctas: [
      { label: "Marketplace", to: "/marketplace" },
      { label: "Les box", to: "/box" },
    ],
  },
];

const NIVEAUX = [
  {
    nom: "Essentiel", pour: "Une réponse ponctuelle",
    contenu: [
      "Une séance de clarification avec un expert",
      "Un plan d’action écrit et priorisé",
      "Le Cockpit pendant un mois pour appliquer",
    ],
  },
  {
    nom: "Pack", star: true, pour: "Un objectif chiffré sur 90 jours",
    contenu: [
      "Un pack dédié à votre besoin : reprise, rentabilité, organisation",
      "Des sessions avec les bons experts du vivier",
      "Cockpit, indicateurs et revue hebdo pendant les 90 jours",
    ],
  },
  {
    nom: "Parcours", pour: "La transformation complète",
    contenu: [
      "Entreprise et entrepreneur — tout le vivier Zayado",
      "Un expert dédié, de la première séance à la passation",
      "Reprise ou transmission pilotée comme un fil continu",
    ],
  },
];

const VOIE = [
  { n: "1", titre: "Dites votre besoin", texte: "De quoi avez-vous besoin maintenant ? Le diagnostic gratuit (2 min) le met en mots." },
  { n: "2", titre: "On cadre ensemble", texte: "Un expert vous rappelle avec votre résultat : le pilier, le niveau, le cap." },
  { n: "3", titre: "Vous choisissez le niveau", texte: "Essentiel, Pack ou Parcours — on vend un objectif, jamais des heures." },
  { n: "4", titre: "Le Cockpit suit tout", texte: "Entre chaque étape, le Cockpit garde votre énergie et vos chiffres en vue." },
];

const eurFree = null;

export default function Besoins() {
  usePageMeta(
    "De quoi avez-vous besoin maintenant ? · Zayado",
    "Accompagner, piloter, connecter, équiper : la maison des entrepreneurs apaisés entre par votre besoin, pas par un catalogue. Diagnostic gratuit en 2 minutes."
  );

  return (
    <div data-testid="besoins-page">
      {/* HERO */}
      <section className="border-b" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[1.25fr_0.75fr] md:py-24">
          <Reveal>
            <Stamp>La maison des entrepreneurs apaisés</Stamp>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.06] tracking-tight text-[var(--navy)] sm:text-5xl lg:text-6xl">
              De quoi avez-vous besoin&nbsp;<span className="font-display italic">maintenant&nbsp;?</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed opacity-75">
              Pas un catalogue. Dites-nous où vous en êtes — on vous montre la voie, puis on la tient avec vous :
              le conseil, le pilotage, les bons contacts et le bon équipement.
            </p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <Link to="/diagnostic" data-testid="besoins-cta-diagnostic" className="btn btn-primary px-7 py-3.5 text-[15px]">
                Faire mon diagnostic gratuit <ArrowRight size={16} />
              </Link>
              <a href="#piliers" data-testid="besoins-cta-piliers" className="btn btn-ghost px-7 py-3.5 text-[15px]">
                Ou parcourir les 4 piliers
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="bg-navy-grad relative overflow-hidden rounded-[26px] p-8 text-[var(--paper-2)]" data-testid="besoins-hero-card">
              <p className="font-hand text-2xl" style={{ color: "var(--gold-soft)" }}>le principe</p>
              <p className="font-display mt-3 text-2xl font-semibold leading-snug">
                Entrer par le besoin,<br />jamais par l’offre.
              </p>
              <p className="mt-4 text-[14px] leading-relaxed opacity-75">
                Une question, quatre piliers, trois niveaux — et un cockpit qui relie tout entre les étapes.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                {[["4", "piliers"], ["3", "niveaux"], ["1", "question"]].map(([n, l]) => (
                  <div key={l} className="rounded-2xl border border-white/10 bg-white/5 px-2 py-4">
                    <p className="font-display text-3xl font-bold" style={{ color: "var(--gold-soft)" }}>{n}</p>
                    <p className="text-[11.5px] uppercase tracking-[0.14em] opacity-70">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* LES 4 PILIERS */}
      <section id="piliers" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 md:py-24" data-testid="besoins-piliers">
        <Reveal>
          <Stamp>Les quatre piliers</Stamp>
          <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-[var(--navy)] md:text-4xl">
            Tout ce dont vous pouvez avoir besoin tient dans quatre mots.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PILIERS.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.07} className="h-full">
              <article className="card flex h-full flex-col p-7" data-testid={`besoins-pilier-${p.id}`}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
                  <p.Icon size={20} style={{ color: "var(--navy)" }} />
                </span>
                <h3 className="font-display mt-5 text-[22px] font-semibold text-[var(--navy)]">{p.nom}</h3>
                <p className="mt-2 text-[14px] leading-relaxed opacity-70">{p.promesse}</p>
                <ul className="mt-4 flex-1 space-y-2">
                  {p.besoins.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[13.5px] leading-relaxed opacity-85">
                      <Check size={14} className="mt-0.5 flex-none" style={{ color: "var(--gold)" }} /> {b}
                    </li>
                  ))}
                </ul>
                {p.note && <p className="font-hand mt-3 text-lg leading-snug" style={{ color: "var(--gold)" }}>{p.note}</p>}
                <div className="mt-5 flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: "var(--line)" }}>
                  {p.ctas.map((c) => (
                    <Link key={c.to + c.label} to={c.to} data-testid={`besoins-pilier-cta-${p.id}-${c.to.split("/")[1] || c.to}`} className="btn btn-ghost px-4 py-2 text-[12.5px]">
                      {c.label} <ArrowRight size={12} />
                    </Link>
                  ))}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* LA VOIE */}
      <section className="border-y py-16 md:py-24" style={{ borderColor: "var(--line)", background: "var(--paper-2)" }} data-testid="besoins-voie">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <Stamp>La voie Zayado</Stamp>
            <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-[var(--navy)] md:text-4xl">
              Quatre étapes, et le diagnostic au centre.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {VOIE.map((v, i) => (
              <Reveal key={v.n} delay={i * 0.07} className="h-full">
                <div className="card flex h-full flex-col p-6" data-testid={`besoins-voie-${v.n}`}>
                  <span className="font-display text-3xl font-bold" style={{ color: "var(--gold)" }}>{v.n}</span>
                  <h3 className="mt-3 text-[16px] font-semibold text-[var(--navy)]">{v.titre}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed opacity-70">{v.texte}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PACKS & PARCOURS — 3 NIVEAUX */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24" data-testid="besoins-niveaux">
        <Reveal>
          <Stamp>Packs & parcours</Stamp>
          <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-[var(--navy)] md:text-4xl">
            On vend « développer mon activité », pas « cinq heures de conseil ».
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed opacity-70">
            Chaque besoin se règle à l’un de ces trois niveaux. Le détail et le budget se cadrent à l’expertise, après votre diagnostic.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {NIVEAUX.map((n, i) => (
            <Reveal key={n.nom} delay={i * 0.08} className="h-full">
              <div
                className={`card relative flex h-full flex-col p-7 ${n.star ? "border-[var(--gold)]" : ""}`}
                style={n.star ? { borderWidth: 2 } : {}}
                data-testid={`besoins-niveau-${n.nom.toLowerCase()}`}
              >
                {n.star && (
                  <p className="absolute -top-3 left-6 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ background: "var(--gold)", color: "var(--navy)" }}>
                    Le plus demandé
                  </p>
                )}
                <h3 className="font-display text-2xl font-semibold text-[var(--navy)]">{n.nom}</h3>
                <p className="font-hand mt-1 text-xl" style={{ color: "var(--gold)" }}>{n.pour}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {n.contenu.map((c) => (
                    <li key={c} className="flex items-start gap-2.5 text-[14px] leading-relaxed opacity-85">
                      <Check size={15} className="mt-0.5 flex-none" style={{ color: "var(--gold)" }} /> {c}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[22px] p-6" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
            <p className="flex items-center gap-2.5 text-[15px] font-medium text-[var(--navy)]">
              <Sparkles size={17} style={{ color: "var(--gold)" }} /> Vous ne savez pas par quel niveau commencer ?
            </p>
            <Link to="/diagnostic" data-testid="besoins-niveaux-cta" className="btn btn-primary px-6 py-3 text-[14px]">
              Le diagnostic vous le dira <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* COCKPIT — LE FIL CONTINU */}
      <section className="border-t" style={{ borderColor: "var(--line)" }} data-testid="besoins-cockpit">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <Reveal>
            <div className="bg-navy-grad flex flex-col items-start justify-between gap-6 rounded-[26px] p-8 text-[var(--paper-2)] md:flex-row md:items-center md:p-10">
              <div>
                <p className="font-hand text-2xl" style={{ color: "var(--gold-soft)" }}>le fil continu</p>
                <h2 className="font-display mt-2 text-2xl font-semibold leading-snug md:text-3xl">
                  Entre chaque étape, le Cockpit garde le cap.
                </h2>
                <p className="mt-3 max-w-xl text-[14px] leading-relaxed opacity-75">
                  Le conseil passe, le pilotage reste : énergie, chiffres, objectifs 90 jours et revue hebdo dans un seul cockpit IA.
                </p>
              </div>
              <Link to="/cockpit" data-testid="besoins-cockpit-cta" className="btn btn-gold-light inline-flex flex-none items-center gap-2 px-7 py-3.5 text-[15px]">
                Découvrir le Cockpit <ArrowRight size={16} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-3xl px-5 pb-20 pt-6 text-center">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--navy)] md:text-4xl">
            Alors — de quoi avez-vous besoin <span className="font-display italic">maintenant&nbsp;?</span>
          </h2>
          <Link to="/diagnostic" data-testid="besoins-final-cta" className="btn btn-primary mt-8 inline-flex items-center gap-2 px-8 py-4 text-[16px]">
            Commencer par le diagnostic <ArrowRight size={17} />
          </Link>
          {eurFree === null && <p className="mt-4 text-[13px] opacity-55">Gratuit, 2 minutes, sans engagement.</p>}
        </Reveal>
      </section>
    </div>
  );
}
