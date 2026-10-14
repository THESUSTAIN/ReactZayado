import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Quote, PenLine, Lock, Search } from "lucide-react";
import { Reveal, Stamp } from "@/components/Reveal";
import usePageMeta from "@/hooks/usePageMeta";
import { JOURNAL } from "@/data/content";
import { envoyerLead } from "@/lib/api";

const TICONS = { Article: BookOpen, Témoignage: Quote, Note: PenLine };
const FILTERS = [
  { key: "tout", label: "Tout" },
  { key: "Article", label: "Articles" },
  { key: "Témoignage", label: "Témoignages" },
  { key: "Note", label: "Notes" },
];

function Newsletter() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const valid = /.+@.+\..+/.test(email);
  return (
    <div className="bg-navy-grad rounded-3xl px-7 py-9 text-[var(--paper-2)]" data-testid="journal-newsletter">
      {!sent ? (
        <>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--gold-soft)" }}>
            <Lock size={13} /> Débloquer la suite
          </p>
          <h3 className="mt-3 text-2xl font-semibold md:text-3xl">La note d’équilibre — chaque semaine.</h3>
          <p className="mt-2 max-w-md text-[14px] leading-relaxed opacity-80">
            Une note courte de la maison : un chiffre, une idée, une action. Le fil qui prolonge le journal.
          </p>
          <form
            className="mt-5 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => { e.preventDefault(); if (!valid) return; envoyerLead({ email, source: "journal-newsletter" }); setSent(true); }}
            data-testid="journal-newsletter-form"
          >
            <input
              className="field flex-1"
              style={{ background: "rgba(253,252,248,0.12)", borderColor: "rgba(253,252,248,0.3)", color: "var(--paper-2)" }}
              placeholder="votre@email.fr"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="journal-newsletter-email"
            />
            <button className="btn btn-gold px-6 py-3 text-[14px]" data-testid="journal-newsletter-submit" disabled={!valid}>
              Recevoir la note <ArrowRight size={15} />
            </button>
          </form>
          <p className="mt-3 text-xs opacity-55">Enregistré — la première note d’équilibre arrive jeudi.</p>
        </>
      ) : (
        <div className="py-4 text-center" data-testid="journal-newsletter-confirmation">
          <p className="font-hand text-3xl" style={{ color: "var(--gold-soft)" }}>c’est noté !</p>
          <p className="mt-2 text-[15px] opacity-85">Première note d’équilibre jeudi. À très vite.</p>
          <p className="mt-2 text-xs opacity-55">Inscription enregistrée.</p>
        </div>
      )}
    </div>
  );
}

export default function Journal() {
  const [filter, setFilter] = useState("tout");
  const [q, setQ] = useState("");
  usePageMeta(
    "Le Journal Zayado — articles, témoignages et notes de la maison",
    "Le journal de la maison des entrepreneurs apaisés : articles (0 € d’apport, acheter ou créer), témoignages de dirigeants et notes d’équilibre."
  );

  const ql = q.trim().toLowerCase();
  const counts = FILTERS.map((f) => ({ ...f, n: f.key === "tout" ? JOURNAL.length : JOURNAL.filter((e) => e.type === f.key).length }));
  const featured = JOURNAL[0];
  const list = JOURNAL
    .filter((e) => filter === "tout" || e.type === filter)
    .filter((e) => !ql || `${e.title} ${e.excerpt} ${e.type} ${e.author}`.toLowerCase().includes(ql));

  return (
    <div>
      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--line)" }}>
        <div className="ruled pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-4xl px-5 py-12 text-center md:py-16">
          <Reveal>
            <Stamp>Le journal de la maison</Stamp>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--navy)] md:text-5xl">
              Le Journal Zayado.
            </h1>
            <p className="font-hand mt-2 text-2xl" style={{ color: "var(--gold)" }}>
              articles, témoignages & notes — tout ce qu’il faut pour avancer
            </p>
          </Reveal>
        </div>
      </section>

      {/* RECHERCHE + FILTRES */}
      <div className="sticky top-[60px] z-40 border-b backdrop-blur-md" style={{ background: "rgba(253,252,248,0.94)", borderColor: "var(--line)" }} data-testid="journal-toolbar">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-5 py-2.5">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" style={{ color: "var(--ink)" }} />
            <input
              className="field"
              style={{ borderRadius: 999, paddingLeft: 36, paddingTop: 8, paddingBottom: 8, fontSize: 13.5 }}
              placeholder="Rechercher dans le journal…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              data-testid="journal-search-input"
            />
          </div>
          <div className="flex flex-1 items-center justify-start gap-5 overflow-x-auto">
            {counts.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                data-testid={`journal-filter-${f.key}`}
                className="whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.14em] transition-colors"
                style={{ color: filter === f.key ? "var(--gold)" : "rgba(22,38,63,0.55)", borderBottom: filter === f.key ? "2px solid var(--gold)" : "2px solid transparent", paddingBottom: 4 }}
              >
                {f.label} · {f.n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        {/* À DÉCOUVRIR */}
        {(filter === "tout" || filter === featured.type) && !ql && (
          <Reveal>
            <Link
              to={`/journal/${featured.slug}`}
              data-testid="journal-featured"
              className="bg-navy-grad group relative block overflow-hidden rounded-3xl px-7 py-9 text-[var(--paper-2)] transition-transform duration-300 hover:-translate-y-1 md:px-10"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ background: "var(--gold)", color: "var(--navy)" }}>
                  À découvrir
                </span>
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] opacity-70">{featured.min} min · {featured.date}</span>
              </div>
              <h2 className="mt-5 text-3xl font-semibold leading-snug md:text-4xl">{featured.title}</h2>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed opacity-80">{featured.excerpt}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--gold-soft)" }}>
                Commencer <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          </Reveal>
        )}

        {/* LISTE DU JOURNAL */}
        <div className="mt-10 space-y-5">
          {list.length === 0 && (
            <p className="card p-8 text-center text-[15px] opacity-70" data-testid="journal-no-results">
              Aucun texte trouvé pour « {q} » — essayez un autre mot.
            </p>
          )}
          {list.map((e, i) => {
            const Icon = TICONS[e.type] || BookOpen;
            return (
              <Reveal key={e.slug} delay={i * 0.05}>
                <article className="card p-7 transition-transform duration-300 hover:-translate-y-1" data-testid={`journal-entry-${e.slug}`}>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-hand text-xl" style={{ color: "var(--gold)" }}>{e.date}</span>
                    <span className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ borderColor: "var(--line)" }}>
                      <Icon size={12} /> {e.type}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-50">{e.min} min</span>
                    <span className="text-[12px] opacity-60">— {e.author}</span>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold leading-snug text-[var(--navy)]">{e.title}</h2>
                  <p className="mt-2 text-[15px] leading-relaxed opacity-70">{e.excerpt}</p>
                  <Link to={`/journal/${e.slug}`} data-testid={`journal-read-${e.slug}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--gold)" }}>
                    Lire dans le journal <ArrowRight size={15} />
                  </Link>
                </article>
              </Reveal>
            );
          })}
        </div>

        {/* NEWSLETTER */}
        <div className="mt-14">
          <Newsletter />
        </div>
      </section>
    </div>
  );
}
