import React from "react";

/* ═══════════════════════════════════════════════════════════════════
   Le kit de cartes des maquettes validées, en composants.

   Pourquoi des composants et pas juste des classes : une tuile KPI, ce
   n'est pas « une div avec un fond ». C'est un libellé en capitales, un
   nombre en serif, une sous-ligne, une variation colorée et une pastille
   d'icône en haut à droite — cinq éléments dont l'ordre et les tailles
   font la reconnaissance. Écrits une fois ici, les écrans ne peuvent plus
   dériver chacun de leur côté, ce qui est exactement ce qui s'était passé
   entre les maquettes et le produit.
   ═══════════════════════════════════════════════════════════════════ */

export function Ok({ or = false, className = "", pad = true, children, ...rest }) {
  return (
    <div className={`ok ${or ? "ok-or" : ""} ${className}`} {...rest}>
      {pad ? <div className="ok-pad">{children}</div> : children}
    </div>
  );
}

/** Tuile de chiffre : libellé, nombre, sous-ligne, variation, icône. */
export function OkTuile({ label, valeur, sous, variation, couleur, Icone, ...rest }) {
  return (
    <div className="ok" {...rest}>
      <div className="ok-pad">
        {Icone && <span className="ok-ic"><Icone size={18} /></span>}
        <p className="ok-lab">{label}</p>
        <p className="ok-num">{valeur}</p>
        {sous && <p className="ok-sub">{sous}</p>}
        {variation && (
          <p className="ok-var" style={{ color: couleur || "rgba(255,255,255,.45)" }}>
            {variation.fort} <span style={{ color: "rgba(255,255,255,.42)", fontWeight: 500 }}>{variation.reste}</span>
          </p>
        )}
      </div>
    </div>
  );
}

/** Ligne de liste : pastille, titre + sous-titre, méta à droite. */
export function OkLigne({ Icone, pastille, fond, couleur, titre, sous, meta, chip, chipFond, chipCouleur, children, ...rest }) {
  return (
    <div className="ok-row" {...rest}>
      {(Icone || pastille) && (
        <span className="ok-av" style={{ background: fond || "rgba(255,255,255,.06)", color: couleur || "rgba(255,255,255,.38)" }}>
          {Icone ? <Icone size={15} /> : pastille}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="ok-ti truncate">{titre}</p>
        {sous && <p className="ok-su">{sous}</p>}
      </div>
      {children}
      {meta && <span className="ok-me">{meta}</span>}
      {chip && <span className="ok-chip" style={{ background: chipFond, color: chipCouleur }}>{chip}</span>}
    </div>
  );
}

/** Barre d'onglets pilule. `onglets` = [[clé, libellé, Icône, compteur?]] */
export function OkOnglets({ onglets, actif, onChange, testid }) {
  return (
    <div className="ok-tabs" role="tablist" data-testid={testid}>
      {onglets.map(([cle, libelle, Icone, n]) => (
        <button key={cle} role="tab" aria-selected={actif === cle} onClick={() => onChange(cle)}
          data-testid={`${testid}-${cle}`} className={`ok-tab ${actif === cle ? "on" : ""}`}>
          {Icone && <Icone size={14} className={actif === cle ? "" : "opacity-60"} />}
          {libelle}{n ? ` · ${n}` : ""}
        </button>
      ))}
    </div>
  );
}

/** Barre de progression fine, aux couleurs passées. */
export function OkBarre({ valeur, couleur, className = "" }) {
  return (
    <div className={`ok-bar ${className}`}>
      <span style={{ width: `${Math.max(0, Math.min(100, valeur))}%`, background: couleur }} />
    </div>
  );
}
