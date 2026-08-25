import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { wp } from "../lib/api.js";

export default function LegalPage({ slug, title }) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    wp.pageBySlug(slug)
      .then(setPage)
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="mx-auto max-w-[800px] px-6 lg:px-10 py-14" data-testid={`pub-legal-${slug}`}>
      <h1 className="font-display text-4xl text-navy mb-8">{title}</h1>
      {loading ? (
        <div className="py-12 text-center text-ink-soft"><Loader2 className="inline animate-spin mr-2" /> Chargement…</div>
      ) : page ? (
        <article className="prose prose-sm max-w-none text-ink-soft" dangerouslySetInnerHTML={{ __html: page.content?.rendered || "" }} />
      ) : (
        <p className="text-ink-soft">Ce contenu sera bientôt disponible.</p>
      )}
    </div>
  );
}
