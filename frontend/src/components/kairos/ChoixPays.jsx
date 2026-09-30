import React, { useEffect, useState } from "react";
import { MARCHES_PRINCIPAUX, AUTRES_PAYS, estPrincipal, libellePays } from "@/lib/marches";

const LIBRE = "__libre";
const cleLibre = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/* Choix du pays (marché).
   - variante « pastilles » (onboarding) : pays fréquents + « Autre pays » qui ouvre la liste complète,
     avec en dernier recours un champ libre ;
   - variante « liste » (Paramètres) : une seule liste déroulante groupée.
   onChange(cle, libelle) : la clé sert à l'actualité et aux sources juridiques, le libellé à l'affichage. */
export function ChoixPays({ valeur, libelle = "", onChange, variante = "pastilles", className = "", selectClass = "" }) {
  const horsListe = valeur && !estPrincipal(valeur) && !AUTRES_PAYS.some(([k]) => k === valeur);
  const [autreOuvert, setAutreOuvert] = useState(() => !!valeur && !estPrincipal(valeur));
  const [libre, setLibre] = useState(horsListe);
  const [texte, setTexte] = useState(horsListe ? libelle : "");
  // Brouillon repris (onboarding) : un pays hors pastilles rouvre la liste « Autre pays ».
  useEffect(() => { if (valeur && !estPrincipal(valeur)) setAutreOuvert(true); }, [valeur]);

  const choisirDansListe = (k) => {
    if (k === LIBRE) { setLibre(true); return; }
    setLibre(false);
    if (k) onChange(k, libellePays(k));
  };
  const saisir = (t) => { setTexte(t); if (t.trim().length >= 2) onChange(cleLibre(t.trim()), t.trim()); };

  const Liste = ({ avecPrincipaux }) => (
    <select value={libre ? LIBRE : (avecPrincipaux || !estPrincipal(valeur) ? valeur || "" : "")} onChange={(e) => choisirDansListe(e.target.value)}
      className={selectClass || "h-12 w-full rounded-full border border-white/15 bg-navy-800 px-5 text-[15px] text-offwhite focus:border-gold/50 focus:outline-none"}
      data-testid="choix-pays-liste">
      {(!avecPrincipaux || !valeur) && <option value="">Choisis un pays…</option>}
      {avecPrincipaux && <optgroup label="Les plus choisis">{MARCHES_PRINCIPAUX.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</optgroup>}
      <optgroup label={avecPrincipaux ? "Autres pays" : "Tous les pays"}>{AUTRES_PAYS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</optgroup>
      <option value={LIBRE}>Mon pays n'est pas dans la liste…</option>
    </select>
  );

  if (variante === "liste") {
    return (
      <div className={`space-y-2 ${className}`}>
        <Liste avecPrincipaux />
        {libre && <input autoFocus value={texte} onChange={(e) => saisir(e.target.value)} placeholder="Écris ton pays" data-testid="choix-pays-libre"
          className={selectClass || "h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-offwhite"} />}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2" data-testid="choix-pays">
        {MARCHES_PRINCIPAUX.map(([k, l]) => (
          <button key={k} type="button" onClick={() => { setAutreOuvert(false); setLibre(false); onChange(k, l); }} data-testid={`choix-pays-${k}`}
            className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition active:scale-95 ${valeur === k && !autreOuvert ? "border-gold bg-gold text-navy-900" : "border-white/15 bg-white/[0.06] text-offwhite/85 hover:border-white/30"}`}>
            {l}
          </button>
        ))}
        <button type="button" onClick={() => setAutreOuvert(true)} data-testid="choix-pays-autre"
          className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition active:scale-95 ${autreOuvert ? "border-gold bg-gold text-navy-900" : "border-white/15 bg-white/[0.06] text-offwhite/85 hover:border-white/30"}`}>
          {autreOuvert && valeur && !estPrincipal(valeur) ? (libelle || libellePays(valeur)) : "Autre pays"}
        </button>
      </div>
      {autreOuvert && (
        <div className="mt-3 space-y-2">
          <Liste avecPrincipaux={false} />
          {libre && <input autoFocus value={texte} onChange={(e) => saisir(e.target.value)} placeholder="Écris ton pays" data-testid="choix-pays-libre"
            className="h-12 w-full rounded-full border border-white/15 bg-white/[0.06] px-5 text-[15px] text-offwhite placeholder:text-offwhite/35 focus:border-gold/50 focus:outline-none" />}
        </div>
      )}
    </div>
  );
}
