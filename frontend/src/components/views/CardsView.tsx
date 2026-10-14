import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { RowDialog } from "@/components/RowFields";
import StatusPill from "@/components/StatusPill";
import { formatCell, formatDate } from "@/lib/format";
import { useRowMutations } from "@/lib/hooks";
import type { Row, Source, ViewConfig } from "@/lib/types";

export default function CardsView({ source, rows, config }: { source: Source; rows: Row[]; config: ViewConfig }) {
  const { update, remove } = useRowMutations(source.id);
  const [open, setOpen] = useState<Row | null>(null);
  const shownKeys = new Set([config.title_field, config.group_by, config.amount_field, config.date_field]);
  const extra = source.columns.filter((c) => !shownKeys.has(c.key)).slice(0, 4);
  const amountCol = source.columns.find((c) => c.key === config.amount_field);

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" data-testid="cards-grid">
        {rows.map((r, i) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setOpen(r)}
            style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-xs transition-[transform,box-shadow,border-color] duration-200 ease-out animate-rise hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            data-testid={`card-${r.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-heading text-base font-semibold leading-snug text-slate-900">
                {String(r.data[config.title_field ?? ""] ?? "Sans titre")}
              </h3>
              {config.group_by && r.data[config.group_by] && <StatusPill value={String(r.data[config.group_by])} />}
            </div>
            {amountCol && (
              <p className="mt-3 tabular-nums text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {formatCell(amountCol, r.data[amountCol.key] ?? null, config.amount_field)}
              </p>
            )}
            <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
              {extra.map((c) => (
                <div key={c.key} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{c.label}</dt>
                  <dd className="truncate text-right font-medium text-slate-700">{formatCell(c, r.data[c.key] ?? null)}</dd>
                </div>
              ))}
            </dl>
            {config.date_field && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <CalendarDays className="size-3.5" /> {formatDate(r.data[config.date_field] as string | null)}
              </p>
            )}
          </button>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-500" data-testid="cards-empty">Aucune fiche à afficher</p>}
      </div>
      <RowDialog
        row={open}
        columns={source.columns}
        sourceId={source.id}
        onClose={() => setOpen(null)}
        saving={update.isPending}
        onSave={(data) => open && update.mutate({ id: open.id, data }, { onSuccess: () => setOpen(null) })}
        onDelete={() => open && remove.mutate(open.id, { onSuccess: () => setOpen(null) })}
      />
    </>
  );
}
