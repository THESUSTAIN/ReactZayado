import React, { useEffect, useMemo, useState } from "react";
import { Brain, Check, ChevronRight, Flame, Gamepad2, Sparkles, Trophy, Wind } from "lucide-react";
import { useMemoire, changerModeJeu } from "./memoireStore";
import { catalogue, construireQuete, niveauJoueur, serieEnCours, nbSus, versetsARevoir } from "./memoireLogic";
import { Atelier, Anneau } from "./MemoireAide";
import { cleDuJour } from "./thesustainData";
import { fetchMindsetJour } from "@/lib/kairosApi";

/* Accueil « Ma Foi », version sobre.
   Avant : un grand verset au centre puis une liste de 8 rubriques ; « Mémoire » était noyée dedans, sans lien avec
   la pause du jour ni rien qui donne envie de revenir.
   Maintenant :
   1. un verset du jour avec deux actions directes (pause, apprendre par cœur) ;
   2. « Aujourd'hui » : 2 à 4 gestes à cocher, avec une progression ;
   3. la mémoire en carte principale (quête du jour, versets à revoir) ;
   4. les autres rubriques rangées en 3 groupes lisibles ;
   5. un MODE JEU (niveau, série de jours, XP) qu'on active ou coupe ici, et qui se retrouve dans Mémoire. */

const GROUPES = [
  { titre: "Chaque jour", ids: ["priere", "lecture"] },
  { titre: "Approfondir", ids: ["parcours", "discernement"] },
  { titre: "Ensemble & repos", ids: ["cercle", "repos"] },
];

function Interrupteur({ actif, onChange }) {
  return (
    <button role="switch" aria-checked={actif} onClick={() => onChange(!actif)} data-testid="mafoi-mode-jeu"
      className="inline-flex min-h-[40px] items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-3.5 pr-1.5 text-sm text-offwhite/80 hover:border-gold/30">
      <span className="inline-flex items-center gap-1.5"><Gamepad2 className="h-4 w-4 text-gold" /> Mode jeu</span>
      <span className={`relative h-6 w-11 rounded-full transition-colors ${actif ? "bg-gold" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${actif ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Pastille({ Icone, children, title }) {
  return (
    <span title={title} className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/[0.08] px-3 py-1 text-sm font-semibold text-gold">
      <Icone className="h-4 w-4" /> {children}
    </span>
  );
}

export default function MaFoiHub({ r, go, modules, icons, social }) {
  const { progress, jeu } = useMemoire();
  const [atelier, setAtelier] = useState(null);
  const jour = cleDuJour();
  const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const cat = useMemo(() => catalogue(jeu.perso), [jeu.perso]);
  const parRef = useMemo(() => Object.fromEntries(cat.map((v) => [v.ref, v])), [cat]);
  const quete = useMemo(() => construireQuete(progress, cat, jour), [progress, cat, jour]);
  const faits = quete.filter((q) => q.fait).length;
  const queteFinie = quete.length > 0 && faits === quete.length;
  const prochain = quete.find((q) => !q.fait);
  const nbRevoir = versetsARevoir(progress, jour).length;
  const niv = niveauJoueur(jeu.xp);
  // La série affichée ici est celle du COMPTE, pas celle du jeu de mémoire.
  // Avant, Ma Foi comptait ses propres jours de suite dans le navigateur :
  // quelqu'un qui tenait sa pratique depuis trois semaines dans Bien-être
  // repartait de zéro en ouvrant Ma Foi, comme si rien n'avait compté.
  const [serie, setSerie] = useState(serieEnCours(jeu.jours));
  useEffect(() => {
    fetchMindsetJour()
      .then((d) => { if (typeof d?.serie?.jours === "number") setSerie(d.serie.jours); })
      .catch(() => {});
  }, []);

  const taches = [
    { id: "pause", Icone: Wind, titre: "Pause du jour", detail: r.theme.theme, fait: r.pauseFaite, vue: "sagesse" },
    { id: "memoire", Icone: Brain, titre: "Apprendre par cœur", detail: quete.length ? `${faits} / ${quete.length} versets` : "Choisis un verset", fait: queteFinie, vue: "memoire" },
  ];
  if (r.enCours) taches.push({ id: "parcours", Icone: icons.parcours, titre: r.enCours.p.title, detail: `Jour ${r.enCours.faits + 1} sur ${r.enCours.p.days.length}`, fait: false, vue: "parcours" });
  if (r.aReevaluer.length) taches.push({ id: "decision", Icone: icons.discernement, titre: "Décision à réévaluer", detail: r.aReevaluer[0].decision, fait: false, vue: "discernement" });
  const faites = taches.filter((t) => t.fait).length;

  return (
    <div className="animate-fade-up mx-auto max-w-5xl" data-testid="mafoi-hub-pro">
      {/* ── EN-TÊTE — même grammaire que le reste de l'application : surlignage
             doré daté, titre serif. La série affichée est celle du COMPTE, elle
             n'est plus réservée au mode jeu : tenir sa pratique n'est pas un jeu. ── */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-gold">Ma Foi · {date}</p>
          <h1 className="mt-2 font-display text-[30px] font-semibold leading-tight sm:text-[36px]">
            {faites === taches.length ? "Tout est fait pour aujourd'hui." : r.theme.theme}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {serie > 0 && <Pastille Icone={Flame} title="Jours de suite, dans toute l'application">{serie} j</Pastille>}
          {jeu.mode_jeu && <Pastille Icone={Trophy} title={niv.titre}>Niv. {niv.niveau}</Pastille>}
          <Interrupteur actif={jeu.mode_jeu} onChange={changerModeJeu} />
        </div>
      </div>

      {/* Verset du jour */}
      <section className="ok ok-or p-6 sm:p-8" data-testid="mafoi-verset-du-jour">
        <p className="ok-lab" style={{ color: "#DEC2A3" }}>Le verset du jour</p>
        <p className="mt-3 font-display text-[22px] leading-snug text-offwhite sm:text-[28px]">{r.theme.verse}</p>
        <p className="mt-3 text-sm text-offwhite/55">{r.theme.reference}</p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <button onClick={() => go("sagesse")} data-testid="mafoi-sanctuaire-pause"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gold px-5 text-sm font-semibold text-navy-900 transition hover:bg-gold-hover">
            <Wind className="h-4 w-4" /> {r.pauseFaite ? "Revoir ma pause" : "Pause de 3 min"}
          </button>
          <button onClick={() => setAtelier({ text: r.theme.verse, ref: r.theme.reference })} data-testid="mafoi-hub-apprendre"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-gold/40 bg-gold/[0.08] px-5 text-sm font-semibold text-gold transition hover:bg-gold/[0.16]">
            <Brain className="h-4 w-4" /> Apprendre ce verset
          </button>
        </div>
      </section>

      {/* Les deux moteurs du jour, côte à côte : les gestes à faire, et la
          mémorisation. Avant : empilés pleine largeur, d'où le scroll. */}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
      {/* Aujourd'hui */}
      <section className="ok p-5 sm:p-6" data-testid="mafoi-aujourdhui">
        <div className="flex items-center justify-between gap-3">
          <p className="ok-lab">Tes gestes du jour</p>
          <span className="text-sm font-semibold text-gold">{faites} / {taches.length}</span>
        </div>
        <div className="ok-bar mt-3"><span style={{ width: `${(faites / taches.length) * 100}%`, background: "#DEC2A3" }} /></div>
        {/* Un seul geste suffit à tenir la journée — et il compte dans la même
            série que Bien-être. On le dit, sinon la barre ressemble à une liste
            de devoirs à finir. */}
        <p className="ok-sub">Un seul suffit pour que la journée compte.</p>
        <ul className="mt-3 divide-y divide-white/[0.07]">
          {taches.map((t) => (
            <li key={t.id}>
              <button onClick={() => go(t.vue)} className="flex min-h-[56px] w-full items-center gap-3 py-2.5 text-left" data-testid={`mafoi-tache-${t.id}`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${t.fait ? "border-emerald-300/50 bg-emerald-400/15 text-emerald-200" : "border-white/20 text-offwhite/40"}`}>
                  {t.fait ? <Check className="h-4 w-4" /> : <t.Icone className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${t.fait ? "text-offwhite/55 line-through" : "text-offwhite"}`}>{t.titre}</span>
                  <span className="block truncate text-xs text-offwhite/50">{t.detail}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-offwhite/30" />
              </button>
            </li>
          ))}
        </ul>
        {faites === taches.length && <p className="mt-2 text-sm text-emerald-200">Tout est fait pour aujourd'hui. À demain !</p>}
      </section>

      {/* Mémoire : carte principale */}
      <section className="ok p-5 sm:p-6" data-testid="mafoi-carte-memoire">
        <div className="flex items-center gap-4">
          {jeu.mode_jeu ? (
            <Anneau part={niv.part} taille={64} epaisseur={6}>
              <span className="font-display text-xl font-extrabold text-offwhite">{niv.niveau}</span>
            </Anneau>
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold"><Brain className="h-6 w-6" /></span>
          )}
          <div className="min-w-0 flex-1">
            <p className="ok-lab">Apprendre par cœur</p>
            <p className="mt-1 text-sm text-offwhite/60">
              {jeu.mode_jeu ? `${niv.titre} · ${niv.xpDansNiveau} / ${niv.xpPourSuivant} XP · ` : ""}
              {nbSus(progress)} verset{nbSus(progress) > 1 ? "s" : ""} su{nbSus(progress) > 1 ? "s" : ""}
              {nbRevoir > 0 ? ` · ${nbRevoir} à revoir` : ""}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {prochain && parRef[prochain.ref] ? (
            <button onClick={() => setAtelier(parRef[prochain.ref])} data-testid="mafoi-memoire-reciter"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-sm font-semibold text-navy-900 hover:bg-gold-hover sm:flex-none">
              <Sparkles className="h-4 w-4" /> {jeu.mode_jeu ? "Quête du jour : " : "Réciter "}{prochain.ref}
            </button>
          ) : (
            <span className="inline-flex min-h-[44px] items-center gap-2 text-sm text-emerald-200"><Check className="h-4 w-4" /> Quête du jour terminée</span>
          )}
          <button onClick={() => go("memoire")} data-testid="mafoi-module-memoire"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-5 text-sm text-offwhite hover:bg-white/10">
            Tous mes versets
          </button>
        </div>
      </section>
      </div>

      {social}

      {/* Autres rubriques — en colonnes plutôt qu'empilées. */}
      <div className="mt-6 grid items-start gap-5 sm:grid-cols-2">
        {GROUPES.map((g) => (
          <section key={g.titre} className="ok p-5 sm:p-6">
            <p className="ok-lab mb-1">{g.titre}</p>
            <div>
              {g.ids.map((id) => {
                const m = modules.find((x) => x.id === id);
                if (!m) return null;
                const Icon = icons[id];
                return (
                  <button key={id} onClick={() => go(id)} data-testid={`mafoi-module-${id}`}
                    className="ok-row group w-full text-left">
                    <span className="ok-av shrink-0" style={{ background: "rgba(222,194,163,.12)", color: "#DEC2A3" }}><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="ok-ti block truncate">{m.title}</span>
                      <span className="ok-su block truncate">{m.tagline}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-offwhite/30 transition group-hover:translate-x-0.5 group-hover:text-gold" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {atelier && <Atelier verset={atelier} onClose={() => setAtelier(null)} />}
    </div>
  );
}
