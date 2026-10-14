import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, MessageSquare, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldInput, RowDialog } from "@/components/RowFields";
import StatusPill from "@/components/StatusPill";
import { formatCell } from "@/lib/format";
import { useCommentaires, useRowMutations } from "@/lib/hooks";
import type { CellValue, Column, Row, Source, ViewConfig } from "@/lib/types";

function EditableCell({ column, row, sourceId, amountKey }: { column: Column; row: Row; sourceId: string; amountKey: string | null }) {
  const { update } = useRowMutations(sourceId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");
  const value = row.data[column.key] ?? null;
  const testId = `cell-${row.id}-${column.key}`;

  const commit = () => {
    setEditing(false);
    const original = value === null ? "" : String(value);
    if (draft !== original && !(column.type === "date" && draft === original.slice(0, 10))) {
      update.mutate({ id: row.id, data: { [column.key]: draft } });
    }
  };

  if (editing) {
    return (
      <div
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
      >
        <FieldInput column={column} value={draft} onChange={setDraft} testId={`${testId}-input`} autoFocus />
      </div>
    );
  }
  return (
    <button
      type="button"
      className="w-full min-w-24 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-blue-50/70"
      onClick={() => {
        setDraft(value === null ? "" : String(value));
        setEditing(true);
      }}
      data-testid={testId}
    >
      {column.type === "select" && value ? (
        <StatusPill value={String(value)} />
      ) : (
        <span className={column.type === "number" ? "tabular-nums text-[13px] tabular-nums" : ""}>
          {formatCell(column, value as CellValue, amountKey)}
        </span>
      )}
    </button>
  );
}

export default function TableView({ source, rows, config }: { source: Source; rows: Row[]; config: ViewConfig }) {
  const { remove, update } = useRowMutations(source.id);
  const coms = useCommentaires(source.id);
  const nbCom = (id: string) => (coms.data ?? []).filter((c) => c.row_id === id).length;
  const [open, setOpen] = useState<Row | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = needle
      ? rows.filter((r) => Object.values(r.data).some((v) => String(v ?? "").toLowerCase().includes(needle)))
      : rows;
    if (sort) {
      list = [...list].sort((a, b) => {
        const x = a.data[sort.key];
        const y = b.data[sort.key];
        if (typeof x === "number" && typeof y === "number") return (x - y) * sort.dir;
        return String(x ?? "").localeCompare(String(y ?? ""), "fr") * sort.dir;
      });
    }
    return list;
  }, [rows, q, sort]);

  return (
    <div className="space-y-4 animate-rise">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher dans les lignes…"
          className="bg-white pl-9"
          data-testid="table-search-input"
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="data-table">
            <thead className="bg-slate-50 text-left">
              <tr>
                {source.columns.map((c) => (
                  <th key={c.key} className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900"
                      onClick={() =>
                        setSort((s) => (s?.key === c.key ? (s.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 }))
                      }
                      data-testid={`table-sort-${c.key}`}
                    >
                      {c.label}
                      {sort?.key === c.key && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </button>
                  </th>
                ))}
                <th className="w-20 border-b border-slate-200" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/60" data-testid={`table-row-${r.id}`}>
                  {source.columns.map((c) => (
                    <td key={c.key} className="px-1 py-0.5 align-middle">
                      <EditableCell column={c} row={r} sourceId={source.id} amountKey={config.amount_field} />
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={nbCom(r.id) ? "text-[#9a6a2c]" : "text-slate-400 opacity-60 group-hover:opacity-100"}
                      onClick={() => setOpen(r)}
                      aria-label="Commentaires de la ligne"
                      data-testid={`table-comments-row-${r.id}`}
                    >
                      <MessageSquare className="size-4" />{nbCom(r.id) > 0 && <span className="text-xs">{nbCom(r.id)}</span>}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-slate-400 opacity-0 transition-opacity duration-150 hover:text-red-600 group-hover:opacity-100"
                      onClick={() => remove.mutate(r.id)}
                      aria-label="Supprimer la ligne"
                      data-testid={`table-delete-row-${r.id}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={source.columns.length + 1} className="px-4 py-10 text-center text-slate-500" data-testid="table-empty">
                    Aucune ligne à afficher
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-slate-500" data-testid="table-count">
        {shown.length} ligne{shown.length > 1 ? "s" : ""} · clique sur une cellule pour la modifier, sur la bulle pour commenter
      </p>
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
