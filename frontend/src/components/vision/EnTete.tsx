import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, HelpCircle, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/* En-tête de page — le même partout.
   Une page = une question. Le titre la nomme, une phrase dit à quoi sert l'écran,
   l'explication longue est rangée derrière « Comment ça marche ? », les réglages derrière une roue. */
export function EnTetePage({
  titre,
  phrase,
  onglets,
  aide,
  actions,
  testId,
}: {
  titre: ReactNode;
  phrase?: ReactNode;
  onglets?: ReactNode;
  aide?: ReactNode;
  actions?: ReactNode;
  testId?: string;
}) {
  const [aideOuverte, setAideOuverte] = useState(false);
  return (
    <header className="mt-6 sm:mt-8" data-testid={testId}>
      {onglets ? <div className="mb-4">{onglets}</div> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="titre-page" data-testid={testId ? `${testId}-titre` : undefined}>{titre}</h1>
          {phrase ? <p className="phrase-page mt-1.5">{phrase}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {aide ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setAideOuverte((v) => !v)}
            aria-expanded={aideOuverte}
            className="lien-aide"
            data-testid={testId ? `${testId}-aide` : undefined}
          >
            <HelpCircle className="size-3.5" /> Comment ça marche ?
            <ChevronDown className={`size-3.5 transition-transform ${aideOuverte ? "rotate-180" : ""}`} />
          </button>
          {aideOuverte ? <div className="boite-aide anim-monte mt-2">{aide}</div> : null}
        </div>
      ) : null}
    </header>
  );
}

/** Bouton « Réglages » d'une page (roue) : ouvre un panneau latéral. */
export const ouvrirReglages = () => window.dispatchEvent(new Event("zayado:reglages-page"));

export function BoutonReglages({ titre = "Réglages", children, testId }: { titre?: string; children: ReactNode; testId?: string }) {
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    const f = () => setOuvert(true);
    window.addEventListener("zayado:reglages-page", f);
    return () => window.removeEventListener("zayado:reglages-page", f);
  }, []);
  return (
    <>
      <button type="button" onClick={() => setOuvert(true)} className="bouton-discret" data-testid={testId} aria-label={titre}>
        <SlidersHorizontal className="size-4" /> <span className="hidden sm:inline">{titre}</span>
      </button>
      <Sheet open={ouvert} onOpenChange={setOuvert}>
        <SheetContent side="right" className="panneau-reglages w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-lg">{titre}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-6 px-4 pb-8">{children}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Section d'un panneau de réglages. */
export function SectionReglage({ titre, aide, children }: { titre: string; aide?: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{titre}</h3>
      {aide ? <p className="mt-0.5 text-xs opacity-70">{aide}</p> : null}
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

/** État vide qui guide : ce qui va apparaître ici, et LE geste pour commencer. */
export function EtatVide({ icone, titre, texte, action, testId }: { icone?: ReactNode; titre: string; texte: ReactNode; action?: ReactNode; testId?: string }) {
  return (
    <div className="etat-vide" data-testid={testId}>
      {icone ? <div className="etat-vide-icone">{icone}</div> : null}
      <p className="text-base font-semibold">{titre}</p>
      <p className="mx-auto mt-1 max-w-md text-sm opacity-75">{texte}</p>
      {action ? <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}

/** Le mot manuscrit (Caveat, champagne) dans un titre — comme le site. */
export function MotMain({ children }: { children: ReactNode }) {
  return <span className="mot-main">{children}</span>;
}

/** En-tête de carte : petite étiquette champagne avec icône, puis le titre (avec son mot manuscrit). */
export function TitreCarte({ icone, etiquette, titre, action, testId }: { icone?: ReactNode; etiquette: string; titre?: ReactNode; action?: ReactNode; testId?: string }) {
  return (
    <div className="flex items-start justify-between gap-3" data-testid={testId}>
      <div className="min-w-0">
        <p className="etiquette-carte">{icone}{etiquette}</p>
        {titre ? <h2 className="titre-carte mt-2">{titre}</h2> : null}
      </div>
      {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
    </div>
  );
}
