import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { Reveal, Stamp } from "@/components/Reveal";
import usePageMeta from "@/hooks/usePageMeta";
import { envoyerLead } from "@/lib/api";
import { BOX_PRECO } from "@/data/catalogue";

const ETAPES = [
  { n: "1", t: "Votre diagnostic d'équilibre — gratuit", d: "2 minutes, 16 questions : votre score vie pro / vie perso et vos 2 priorités concrètes." },
  { n: "2", t: "Votre plan de clarté 90 jours", d: "Un objectif chiffré, les bons experts, le bon rythme — pas des heures de conseil, un résultat." },
  { n: "3", t: "Le Cockpit suit tout, entre les étapes", d: "Énergie, chiffres et revue hebdo dans un seul cockpit IA — pour tenir, pas seulement démarrer." },
];

const NIVEAUX = [
  { nom: "Essentiel", pour: "Une réponse ponctuelle", cta: "une séance de clarification + un plan écrit" },
  { nom: "Pack", star: true, pour: "Un objectif chiffré sur 90 jours", cta: "un pack dédié à votre besoin, experts du vivier" },
  { nom: "Parcours", pour: "La transformation complète", cta: "entreprise + entrepreneur, expert dédié" },
];

const TEMOIGNAGES = [
  { q: "Pour la première fois, je sais combien je peux en faire par semaine. Le plan a tenu.", a: "Claire M.", r: "Fondatrice, 3 salariés" },
  { q: "La reprise s'est faite avec un seul interlocuteur. Les chiffres étaient clairs avant de signer.", a: "Thomas D.", r: "Dirigeant, entreprise de travaux" },
  { q: "La box de fin d'année a transformé notre rituel d'équipe. Et le carnet est resté sur chaque bureau.", a: "Sophie L.", r: "Co-fondatrice, agence" },
];

export default function TunnelHome() {
  usePageMeta(
    "Entreprendre avec clarté, sérénité et équilibre · Zayado",
    "Le diagnostic gratuit qui met des mots sur votre besoin et un plan sur 90 jours : conseil, pilotage, bons contacts, bon équipement."
  );
  const navigate = useNavigate();
  const [f, setF] = useState({ prenom: "", email: "" });
  const [busy, setBusy] = useState(false);
  const valid = /.+@.+\..+/.test(f.email) && f.prenom.trim().length > 1;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    await envoyerLead({ email: f.email, prenom: f.prenom, source: "tunnel-capture" });
    navigate("/merci");
  };

  return (
    <div data-testid="tunnel-home">
      {/* 1 — PAGE DE CAPTURE */}
      <section className="mx-auto max-w-5xl px-5 pt-14 pb-16 md:pt-20" data-testid="tunnel-capture">
        <div className="grid items-center gap-12 md:grid-cols-[1.15fr_0.85fr]">
          <Reveal>
            <Stamp>Pour entrepreneurs qui en portent trop</Stamp>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.07] tracking-tight text-[var(--navy)] sm:text-5xl">
              Votre entreprise avance.<br />
              Et vous, vous tenez encore <span className="font-display italic">le rythme&nbsp;?</span>
            </h1>
            <ul className="mt-7 space-y-3">
              {[
                "Savoir exactement quoi faire cette semaine — et jusqu'où aller",
                "Des chiffres clairs sans y passer vos soirées",
                "Un plan à 90 jours tenu avec de vrais experts, sans décider seul·e",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-[16px] leading-relaxed text-[var(--ink)]">
                  <span className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full" style={{ background: "var(--gold-soft)" }}>
                    <Check size={12} style={{ color: "var(--navy)" }} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="card p-8" data-testid="tunnel-capture-form">
              <p className="font-hand text-3xl" style={{ color: "var(--gold)" }}>le point de départ</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--navy)]">Votre plan de clarté — gratuit</h2>
              <p className="mt-2 text-[14px] leading-relaxed opacity-70">
                Votre diagnostic d'équilibre (2 min) + vos 2 priorités avec le plan associé, remis immédiatement.
              </p>
              <form className="mt-6 space-y-3" onSubmit={submit}>
                <input
                  className="field" placeholder="Votre prénom" value={f.prenom}
                  onChange={(e) => setF({ ...f, prenom: e.target.value })} data-testid="tunnel-capture-prenom"
                />
                <input
                  className="field" type="email" placeholder="Votre email" value={f.email}
                  onChange={(e) => setF({ ...f, email: e.target.value })} data-testid="tunnel-capture-email"
                />
                <button className="btn btn-primary w-full px-6 py-4 text-[16px]" data-testid="tunnel-capture-submit" disabled={busy}>
                  {busy ? "Un instant…" : "Recevoir mon plan de clarté"} {!busy && <ArrowRight size={17} />}
                </button>
              </form>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] opacity-55">
                <ShieldCheck size={13} /> Gratuit · 2 minutes · aucun spam, jamais
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2 — LA MÉTHODE (offre phare) */}
      <section className="border-y py-16" style={{ borderColor: "var(--line)", background: "var(--paper-2)" }} data-testid="tunnel-methode">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <Stamp>La méthode Zayado</Stamp>
            <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-[var(--navy)] md:text-4xl">
              Trois étapes, un fil continu — pas un catalogue.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {ETAPES.map((e, i) => (
              <Reveal key={e.n} delay={i * 0.08} className="h-full">
                <div className="card flex h-full flex-col p-7" data-testid={`tunnel-etape-${e.n}`}>
                  <span className="font-display text-3xl font-bold" style={{ color: "var(--gold)" }}>{e.n}</span>
                  <h3 className="mt-3 text-[17px] font-semibold leading-snug text-[var(--navy)]">{e.t}</h3>
                  <p className="mt-2 flex-1 text-[14px] leading-relaxed opacity-70">{e.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {NIVEAUX.map((n) => (
                <div key={n.nom} className={`card flex items-start gap-3 p-5 ${n.star ? "border-[var(--gold)]" : ""}`} style={n.star ? { borderWidth: 2 } : {}} data-testid={`tunnel-niveau-${n.nom.toLowerCase()}`}>
                  <Sparkles size={17} className="mt-0.5 flex-none" style={{ color: "var(--gold)" }} />
                  <div>
                    <p className="text-[15px] font-semibold text-[var(--navy)]">{n.nom}</p>
                    <p className="text-[13px] opacity-70">{n.pour} — {n.cta}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3 — PREUVE SOCIALE */}
      <section className="mx-auto max-w-6xl px-5 py-16" data-testid="tunnel-preuve">
        <Reveal>
          <h2 className="text-center text-3xl font-semibold tracking-tight text-[var(--navy)] md:text-4xl">
            Ils ont repris le rythme en main.
          </h2>
          <p className="mt-2 text-center text-[13px] opacity-45">Témoignages d'illustration — remplacés par les vôtres dès les premiers parcours.</p>
        </Reveal>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {TEMOIGNAGES.map((t, i) => (
            <Reveal key={t.a} delay={i * 0.08} className="h-full">
              <figure className="card flex h-full flex-col p-7" data-testid={`tunnel-temoignage-${i}`}>
                <blockquote className="flex-1 text-[15px] leading-relaxed text-[var(--ink)]">« {t.q} »</blockquote>
                <figcaption className="mt-4 text-[13px] font-semibold text-[var(--navy)]">{t.a} <span className="font-normal opacity-55">— {t.r}</span></figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 4 — LA BOX (éd. limitée) */}
      <section className="mx-auto max-w-6xl px-5 pb-16" data-testid="tunnel-box">
        <Reveal>
          <div className="bg-navy-grad flex flex-col items-start justify-between gap-6 rounded-[26px] p-8 text-[var(--paper-2)] md:flex-row md:items-center md:p-10">
            <div>
              <p className="font-hand text-2xl" style={{ color: "var(--gold-soft)" }}>édition limitée — précommande</p>
              <h2 className="font-display mt-2 text-2xl font-semibold leading-snug md:text-3xl">
                La Box entrepreneur apaisé, de fin d'année.
              </h2>
              <p className="mt-3 max-w-xl text-[14px] leading-relaxed opacity-75">
                Précommande jusqu'au {BOX_PRECO.deadline} — seuil {BOX_PRECO.seuil} box, sinon intégralement remboursé.
              </p>
            </div>
            <a href="/box" data-testid="tunnel-box-cta" className="btn btn-gold-light inline-flex flex-none items-center gap-2 px-7 py-3.5 text-[15px]">
              Découvrir la box <ArrowRight size={16} />
            </a>
          </div>
        </Reveal>
      </section>

      {/* 5 — CTA FINAL */}
      <section className="mx-auto max-w-3xl px-5 pb-20 text-center">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--navy)] md:text-4xl">
            Commencez par savoir où vous en êtes.
          </h2>
          <button onClick={() => navigate("/diagnostic")} data-testid="tunnel-final-cta" className="btn btn-primary mt-8 inline-flex items-center gap-2 px-8 py-4 text-[16px]">
            Faire mon diagnostic gratuit <ArrowRight size={17} />
          </button>
          <p className="mt-4 text-[13px] opacity-55">Gratuit · 2 minutes · votre plan reste à vous.</p>
        </Reveal>
      </section>
    </div>
  );
}
