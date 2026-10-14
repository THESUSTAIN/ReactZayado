import { useState } from "react";
import { RowDialog } from "@/components/RowFields";
import { formatDate } from "@/lib/format";
import { useRowMutations } from "@/lib/hooks";
import type { Row, Source, ViewConfig } from "@/lib/types";

const TONS = ["#3B5B95", "#B07A35", "#2F7A5B", "#9B3B3B", "#5B4A9B"];
const JOUR = 86400000;

/** Frise chronologique : une barre par ligne, de la date de début à la date de fin (projets). */
export default function TimelineView({ source, rows, config }: { source: Source; rows: Row[]; config: ViewConfig }) {
  const { update, remove } = useRowMutations(source.id);
  const [open, setOpen] = useState<Row | null>(null);
  const df = config.date_field;
  if (!df) {
    return <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500" data-testid="timeline-no-date">Choisis les colonnes « Date » (début) et « Fin » dans les paramètres de la page.</p>;
  }
  const items = rows
    .map((r) => {
      const a = String(r.data[df] ?? "");
      const b = String((config.end_field && r.data[config.end_field]) || a);
      return { r, a: Date.parse(a), b: Date.parse(b) };
    })
    .filter((x) => !Number.isNaN(x.a))
    .sort((x, y) => x.a - y.a);
  const sansDate = rows.length - items.length;
  if (!items.length) {
    return <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500" data-testid="timeline-empty">Aucune ligne datée pour l'instant.</p>;
  }
  const min = Math.min(...items.map((x) => x.a));
  const max = Math.max(...items.map((x) => (Number.isNaN(x.b) ? x.a : x.b))) + JOUR;
  const span = Math.max(max - min, JOUR);
  const grp = config.group_by || config.category_field;
  const vals = [...new Set(rows.map((r) => String(r.data[grp ?? ""] ?? "")))];
  const ton = (r: Row) => TONS[vals.indexOf(String(r.data[grp ?? ""] ?? "")) % TONS.length];
  const auj = Date.now();
  const mois: Date[] = [];
  for (let d = new Date(new Date(min).getFullYear(), new Date(min).getMonth(), 1); d.getTime() < max; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) mois.push(d);

  return (
    <div className="space-y-3 animate-rise" data-testid="timeline-view">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="min-w-[720px]">
          <div className="relative ml-48 h-6 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {mois.map((m) => (
              <span key={m.toISOString()} className="absolute top-0" style={{ left: `${Math.max(((m.getTime() - min) / span) * 100, 0)}%` }}>
                {m.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })}
              </span>
            ))}
          </div>
          <div className="relative">
            {auj >= min && auj <= max && <div className="absolute bottom-0 top-0 z-10 ml-48 w-px bg-[#C1272D]/60" style={{ left: `calc(${((auj - min) / span) * 100}% * (100% - 12rem) / 100%)` }} />}
            {items.map(({ r, a, b }) => {
              const fin = Number.isNaN(b) ? a : b;
              return (
                <div key={r.id} className="flex items-center gap-2 border-b border-slate-50 py-1.5">
                  <p className="w-46 shrink-0 truncate pr-2 text-sm text-slate-800" title={String(r.data[config.title_field ?? ""] ?? "")}>
                    {String(r.data[config.title_field ?? ""] ?? "Sans titre")}
                  </p>
                  <div className="relative h-7 flex-1">
                    <button
                      type="button"
                      onClick={() => setOpen(r)}
                      className="absolute top-0 h-7 truncate rounded-md px-2 text-left text-[11px] font-semibold text-white shadow-sm transition-[filter] duration-150 hover:brightness-110"
                      style={{ left: `${((a - min) / span) * 100}%`, width: `${Math.max(((fin + JOUR - a) / span) * 100, 1.5)}%`, background: ton(r) }}
                      title={`${formatDate(new Date(a).toISOString())} → ${formatDate(new Date(fin).toISOString())}`}
                      data-testid={`timeline-bar-${r.id}`}
                    >
                      {config.person_field ? String(r.data[config.person_field] ?? "") : ""}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {sansDate > 0 && <p className="text-xs text-slate-500">{sansDate} ligne(s) sans date de début ne sont pas affichées.</p>}
      <RowDialog
        row={open}
        columns={source.columns}
        sourceId={source.id}
        onClose={() => setOpen(null)}
        saving={update.isPending}
        onSave={(data) => open && update.mutate({ id: open.id, data }, { onSuccess: () => setOpen(null) })}
        onDelete={() => open && remove.mutate(open.id, { onSuccess: () => setOpen(null) })}
      />
    </div>
  );
}
