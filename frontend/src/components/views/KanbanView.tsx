import { useState } from "react";
import { GripVertical } from "lucide-react";
import { RowDialog } from "@/components/RowFields";
import StatusPill from "@/components/StatusPill";
import { formatCell, formatEur, toNumber } from "@/lib/format";
import { useRowMutations } from "@/lib/hooks";
import type { Row, Source, ViewConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

const NONE = "__none";

export default function KanbanView({ source, rows, config }: { source: Source; rows: Row[]; config: ViewConfig }) {
  const { update, remove } = useRowMutations(source.id);
  const [over, setOver] = useState<string | null>(null);
  const [open, setOpen] = useState<Row | null>(null);
  const groupCol = source.columns.find((c) => c.key === config.group_by);
  const amountCol = source.columns.find((c) => c.key === config.amount_field);

  if (!groupCol) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500" data-testid="kanban-no-group">
        Choisissez une colonne de regroupement (type liste) dans les paramètres de la page.
      </p>
    );
  }
  const lanes = [...groupCol.options];
  rows.forEach((r) => {
    const v = r.data[groupCol.key];
    if (v && !lanes.includes(String(v))) lanes.push(String(v));
  });
  const hasNone = rows.some((r) => !r.data[groupCol.key]);
  const allLanes = hasNone ? [...lanes, NONE] : lanes;

  const move = (rowId: string, lane: string) => {
    const row = rows.find((r) => r.id === rowId);
    const target = lane === NONE ? "" : lane;
    if (row && String(row.data[groupCol.key] ?? "") !== target) {
      update.mutate({ id: rowId, data: { [groupCol.key]: target } });
    }
  };

  return (
    <>
      <div className="flex min-h-[540px] items-start gap-5 overflow-x-auto pb-4" data-testid="kanban-board">
        {allLanes.map((lane) => {
          const items = rows.filter((r) => (lane === NONE ? !r.data[groupCol.key] : String(r.data[groupCol.key] ?? "") === lane));
          const total = amountCol ? items.reduce((s, r) => s + toNumber(r.data[amountCol.key] ?? null), 0) : null;
          return (
            <section
              key={lane}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(lane);
              }}
              onDragLeave={() => setOver((o) => (o === lane ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                move(e.dataTransfer.getData("text/plain"), lane);
              }}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-2xl border bg-slate-100/70 p-3 transition-[background-color,border-color] duration-150",
                over === lane ? "border-blue-400 bg-blue-50/80" : "border-slate-200",
              )}
              data-testid={`kanban-lane-${lane}`}
            >
              <header className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  {lane === NONE ? <span className="text-sm font-medium text-slate-500">Sans valeur</span> : <StatusPill value={lane} />}
                  <span className="text-xs font-semibold text-slate-500" data-testid={`kanban-lane-count-${lane}`}>{items.length}</span>
                </div>
                {total !== null && <span className="tabular-nums text-xs font-medium text-slate-600">{formatEur(total)}</span>}
              </header>
              <div className="flex flex-col gap-2.5">
                {items.map((r) => (
                  <article
                    key={r.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", r.id)}
                    onClick={() => setOpen(r)}
                    className="group cursor-grab rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
                    data-testid={`kanban-card-${r.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 size-4 shrink-0 text-slate-300 group-hover:text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug text-slate-900">{String(r.data[config.title_field ?? ""] ?? "Sans titre")}</p>
                        {amountCol && (
                          <p className="mt-1 tabular-nums text-sm text-slate-600">{formatCell(amountCol, r.data[amountCol.key] ?? null, amountCol.key)}</p>
                        )}
                      </div>
                    </div>
                    <select
                      className="mt-2.5 h-7 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-600"
                      value={lane === NONE ? "" : lane}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => move(r.id, e.target.value || NONE)}
                      aria-label="Déplacer vers"
                      data-testid={`kanban-move-select-${r.id}`}
                    >
                      <option value="">Sans valeur</option>
                      {lanes.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
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
