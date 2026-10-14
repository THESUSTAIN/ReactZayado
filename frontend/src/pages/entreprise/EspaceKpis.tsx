import { useAujourdhui } from "@/lib/hooks";

/** Rangée d'indicateurs d'« Aujourd'hui », calculés sur les vraies lignes du classeur (source et heure de lecture affichées). */
export default function EspaceKpis({ ouvrir, versBases }: { ouvrir: (pageId: string) => void; versBases: () => void }) {
  const a = useAujourdhui();
  if (a.isLoading || a.isError) return null;
  const ind = a.data?.indicateurs ?? [];
  if (!ind.length) {
    return (
      <button type="button" onClick={versBases} className="esp-clair mb-4 w-full rounded-2xl border border-dashed border-[#E2D5BE] bg-white/70 p-4 text-left text-sm text-slate-600 transition-[border-color] duration-150 hover:border-[#C9A96A]" data-testid="espace-kpis-vide">
        Relie le classeur de l'entreprise et ajoute les pages Planning, Absences, Temps et Pièces : tes indicateurs du jour s'afficheront ici.
      </button>
    );
  }
  return (
    <div className="esp-clair mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4" data-testid="espace-kpis">
      {ind.map((k) => (
        <button
          key={k.cle}
          type="button"
          onClick={() => k.page_id && ouvrir(k.page_id)}
          className="rounded-2xl border border-[#ECE2D2] bg-white p-4 text-left shadow-[0_2px_14px_-6px_rgba(31,42,68,0.10)] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-md"
          data-testid={`espace-kpi-${k.cle}`}
        >
          <p className="text-xs font-semibold text-slate-500">{k.libelle}</p>
          <p className="mt-1 font-heading text-3xl font-semibold tabular-nums text-[#1F2A44]" data-testid={`espace-kpi-${k.cle}-valeur`}>{k.valeur}</p>
          <p className="mt-1 text-xs text-slate-600">{k.detail}</p>
          <p className="mt-2 truncate text-[10.5px] text-slate-400">Source : {k.source} · {k.lu_le}</p>
        </button>
      ))}
    </div>
  );
}
