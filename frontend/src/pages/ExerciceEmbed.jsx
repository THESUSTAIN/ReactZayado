import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowRight, PenLine, Sparkles } from "lucide-react";

// Mini-exercice intégrable dans les articles du Journal Shopify (iframe) :
//   https://app.zayado.net/embed/exercice/oser-vendre
//   (autres : revenus-irreguliers, dire-non, rebondir)
// Sans compte : les réponses restent dans le navigateur. À la fin, invitation à
// continuer le parcours de 7 jours dans Zayado. La page n'est pas indexée.
const APP = (process.env.REACT_APP_PUBLIC_APP_URL || "https://app.zayado.net").replace(/\/$/, "");

export default function ExerciceEmbed() {
  const { slug } = useParams();
  const racine = useRef(null);
  const [ex, setEx] = useState(null);
  const [rep, setRep] = useState([]);
  const [fini, setFini] = useState(false);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL || ""}/api/public/mindset/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null)).then((d) => { setEx(d || { erreur: true }); setRep((d?.questions || []).map(() => "")); })
      .catch(() => setEx({ erreur: true }));
  }, [slug]);

  useEffect(() => {
    document.title = "Exercice Zayado";
    const envoyer = () => {
      const h = racine.current ? Math.ceil(racine.current.getBoundingClientRect().height) + 8 : 0;
      try { window.parent.postMessage({ type: "zayado-exercice-hauteur", slug, hauteur: h }, "*"); } catch { /* hors iframe */ }
    };
    envoyer();
    const obs = new ResizeObserver(envoyer);
    if (racine.current) obs.observe(racine.current);
    return () => obs.disconnect();
  }, [slug, fini, ex]);

  if (!ex) return <div ref={racine} className="p-6" />;
  if (ex.erreur) return <div ref={racine} className="p-6 text-sm text-offwhite/70">Exercice indisponible.</div>;
  const lien = `${APP}/login?next=${encodeURIComponent(`/app/bien-etre?tab=parcours&p=${slug}`)}`;

  return (
    <div ref={racine} className="bg-navy-900 px-4 py-6 text-offwhite sm:px-6" data-testid="exercice-embed">
      <div className="mx-auto max-w-2xl rounded-[22px] border border-white/[0.16] bg-white/[0.08] p-5 sm:p-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#DEC2A3]"><Sparkles size={14} /> Exercice · 5 minutes</p>
        <h2 className="mt-2 font-display text-[24px] font-semibold leading-tight">{ex.titre}</h2>
        <p className="mt-3 font-serif-italic text-[16px] leading-relaxed text-offwhite/85">{ex.idee}</p>
        {!fini ? (
          <>
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-[#DEC2A3]/30 bg-[#DEC2A3]/[0.08] px-4 py-3 text-[13.5px] leading-relaxed">
              <PenLine size={15} className="mt-0.5 shrink-0 text-[#DEC2A3]" /> {ex.exercice}
            </p>
            <div className="mt-4 space-y-3">
              {ex.questions.map((q, i) => (
                <label key={q} className="block">
                  <span className="mb-1.5 block text-[12.5px] text-offwhite/75">{q}</span>
                  <textarea rows={2} value={rep[i] || ""} onChange={(e) => setRep((r) => r.map((x, k) => (k === i ? e.target.value : x)))}
                    className="w-full resize-y rounded-xl border border-white/[0.14] bg-white/[0.08] px-3.5 py-2.5 text-[14px] text-offwhite outline-none focus:border-[#DEC2A3]/60" />
                </label>
              ))}
            </div>
            <button onClick={() => setFini(true)} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-5 text-[13px] font-semibold text-navy-900" data-testid="exercice-embed-fini">
              J'ai terminé
            </button>
            <p className="mt-3 text-[11px] text-offwhite/45">Tes réponses restent sur ton appareil.</p>
          </>
        ) : (
          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.05] p-5" data-testid="exercice-embed-suite">
            <p className="font-display text-[19px] font-semibold">Bravo, c'était le jour 1.</p>
            <p className="mt-2 text-[14px] leading-relaxed text-offwhite/75">
              Le parcours « {ex.titre} » continue pendant 7 jours, 5 minutes par jour, avec tes réponses gardées dans ton carnet privé et une IA qui connaît ton activité.
            </p>
            <a href={lien} target="_top" rel="noopener" className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-6 text-[14px] font-semibold text-navy-900">
              Continuer dans Zayado · 1 mois pour 1 € <ArrowRight size={16} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
