import { useState } from "react";
import { CheckCircle2, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RowFields } from "@/components/RowFields";
import { formatCell } from "@/lib/format";
import { useRowMutations } from "@/lib/hooks";
import type { CellValue, Row, Source, ViewConfig } from "@/lib/types";

export default function FormView({ source, rows, config }: { source: Source; rows: Row[]; config: ViewConfig }) {
  const { create } = useRowMutations(source.id);
  const [values, setValues] = useState<Record<string, CellValue>>({});
  const recent = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);
  const titleCol = source.columns.find((c) => c.key === config.title_field) ?? source.columns[0];
  const amountCol = source.columns.find((c) => c.key === config.amount_field);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] animate-rise">
      <form
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(values, { onSuccess: () => setValues({}) });
        }}
        data-testid="entry-form"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FilePlus2 className="size-5" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-semibold text-slate-900">Nouvelle entrée</h2>
            <p className="text-sm text-slate-500">Ajoutée directement dans « {source.name} »</p>
          </div>
        </div>
        <RowFields columns={source.columns} values={values} setValue={(k, v) => setValues((s) => ({ ...s, [k]: v }))} prefix="form" />
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setValues({})} data-testid="form-reset-button">
            Effacer
          </Button>
          <Button type="submit" disabled={create.isPending} className="active:scale-[0.98] transition-transform duration-100" data-testid="form-submit-button">
            {create.isPending ? "Envoi…" : "Ajouter la ligne"}
          </Button>
        </div>
      </form>
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs" data-testid="form-recent-list">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Derniers ajouts</p>
        <ul className="mt-3 space-y-2">
          {recent.map((r) => (
            <li key={r.id} className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <CheckCircle2 className="size-4 shrink-0 text-green-600" />
              <span className="truncate font-medium text-slate-800">{formatCell(titleCol, r.data[titleCol.key] ?? null)}</span>
              {amountCol && (
                <span className="ml-auto shrink-0 tabular-nums text-xs text-slate-500">
                  {formatCell(amountCol, r.data[amountCol.key] ?? null, amountCol.key)}
                </span>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
