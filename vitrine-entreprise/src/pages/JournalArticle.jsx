import { Link, Navigate, useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Reveal, Stamp } from "@/components/Reveal";
import usePageMeta from "@/hooks/usePageMeta";
import { JOURNAL } from "@/data/content";

const TYPE_LABELS = { Article: "Article", Témoignage: "Témoignage", Note: "Note" };

export default function JournalArticle() {
  const { slug } = useParams();
  const entry = JOURNAL.find((e) => e.slug === slug);
  const navigate = useNavigate();

  usePageMeta(
    entry ? `${entry.title} | Le Journal Zayado` : "Journal Zayado",
    entry ? entry.excerpt : undefined
  );

  if (!entry) return <Navigate to="/journal" replace />;

  const copyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Lien copié — partagez-le !");
    } catch {
      toast.info(window.location.href);
    }
  };

  const related = JOURNAL.filter((e) => e.slug !== entry.slug).slice(0, 2);

  return (
    <div className="relative min-h-[70vh] overflow-hidden" data-testid={`journal-article-${entry.slug}`}>
      <div className="ruled pointer-events-none absolute inset-0 opacity-40" />
      <article className="relative mx-auto max-w-2xl px-5 py-14 md:py-20">
        <Reveal>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-hand text-2xl" style={{ color: "var(--gold)" }}>{entry.date}</span>
            <span className="stamp text-[11px]">{TYPE_LABELS[entry.type]}</span>
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] opacity-50">{entry.min} min</span>
          </div>
          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-[var(--navy)] md:text-5xl">{entry.title}</h1>
          <p className="font-hand mt-3 text-2xl" style={{ color: "var(--gold)" }}>{entry.excerpt}</p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b pb-5" style={{ borderColor: "var(--line)" }}>
            <p className="text-sm font-medium opacity-70">Par {entry.author}</p>
            <button
              onClick={copyLink}
              data-testid="journal-share-button"
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors"
              style={{ borderColor: "var(--line)", color: "var(--navy)" }}
            >
              <Link2 size={14} /> Copier le lien
            </button>
          </div>
        </Reveal>

        <div className="mt-8 space-y-5">
          {entry.body.map((p, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <p className="text-[16px] leading-relaxed opacity-85">{p}</p>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="bg-navy-grad mt-12 rounded-3xl px-7 py-9 text-center text-[var(--paper-2)]" data-testid="journal-article-cta">
            <p className="font-hand text-2xl" style={{ color: "var(--gold-soft)" }}>et vous, où en êtes-vous ?</p>
            <p className="mt-2 text-[15px] opacity-80">Le diagnostic gratuit situe votre équilibre en 2 minutes.</p>
            <Link to="/diagnostic" data-testid="journal-cta-diagnostic" className="btn btn-gold mt-5 px-7 py-3.5 text-[15px]">
              Faire mon diagnostic <ArrowRight size={17} />
            </Link>
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">Lire aussi dans le journal</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/journal/${r.slug}`}
                  data-testid={`journal-related-${r.slug}`}
                  className="card block p-5 transition-transform duration-300 hover:-translate-y-1"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-50">{r.type} · {r.min} min</p>
                  <p className="mt-2 text-[15px] font-semibold leading-snug text-[var(--navy)]">{r.title}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "var(--gold)" }}>
                    Lire <ArrowRight size={13} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="mt-10 text-center">
          <button
            onClick={() => navigate("/journal")}
            data-testid="journal-back-link"
            className="text-sm font-medium underline opacity-60 hover:opacity-100"
          >
            Retour au journal
          </button>
        </div>
      </article>
    </div>
  );
}
