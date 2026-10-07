import React from "react";

// Affiche proprement un texte d'IA au format simple (## titres, - puces, **gras**, *italique*) sans jamais injecter de HTML.
function enLigne(t, cle) {
  const morceaux = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let dernier = 0;
  let m;
  let i = 0;
  while ((m = re.exec(t))) {
    if (m.index > dernier) morceaux.push(t.slice(dernier, m.index));
    const x = m[0];
    morceaux.push(x.startsWith("**") ? <strong key={`${cle}-${i++}`} className="font-semibold text-white">{x.slice(2, -2)}</strong> : <em key={`${cle}-${i++}`}>{x.slice(1, -1)}</em>);
    dernier = m.index + x.length;
  }
  if (dernier < t.length) morceaux.push(t.slice(dernier));
  return morceaux;
}

export default function TexteIA({ texte, className = "" }) {
  const lignes = String(texte || "").replace(/\r/g, "").split("\n");
  const blocs = [];
  let puces = [];
  const vider = () => { if (puces.length) { blocs.push(<ul key={`u${blocs.length}`} className="mt-1.5 space-y-1.5 pl-1">{puces}</ul>); puces = []; } };
  lignes.forEach((brut, n) => {
    const l = brut.trim();
    if (!l || /^-{3,}$/.test(l) || /^\*{3,}$/.test(l)) { vider(); return; }
    const titre = l.match(/^#{1,4}\s+(.*)$/);
    if (titre) {
      vider();
      blocs.push(<p key={n} className="mt-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-gold first:mt-0">{enLigne(titre[1].replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\uFE0F?/gu, "").trim(), n)}</p>);
      return;
    }
    const puce = l.match(/^(?:[-•*]|\d+[.)])\s+(.*)$/);
    if (puce) { puces.push(<li key={n} className="flex gap-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold/80" /><span>{enLigne(puce[1], n)}</span></li>); return; }
    vider();
    blocs.push(<p key={n} className="mt-2 first:mt-0">{enLigne(l, n)}</p>);
  });
  vider();
  return <div className={`text-[13.5px] leading-relaxed text-white/85 ${className}`} data-testid="texte-ia">{blocs}</div>;
}
