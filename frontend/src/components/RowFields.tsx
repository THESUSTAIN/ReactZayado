import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Commentaires from "@/components/Commentaires";
import type { CellValue, Column, Row } from "@/lib/types";

const selectCls =
  "h-9 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-blue-500 focus-visible:ring-3 focus-visible:ring-blue-500/20";

export function FieldInput({
  column,
  value,
  onChange,
  testId,
  autoFocus,
}: {
  column: Column;
  value: CellValue;
  onChange: (v: string) => void;
  testId: string;
  autoFocus?: boolean;
}) {
  const str = value === null || value === undefined ? "" : String(value);
  if (column.type === "select") {
    return (
      <select
        className={selectCls}
        value={str}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        autoFocus={autoFocus}
      >
        <option value="">—</option>
        {column.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        {str && !column.options.includes(str) && <option value={str}>{str}</option>}
      </select>
    );
  }
  return (
    <Input
      type={column.type === "number" ? "number" : column.type === "date" ? "date" : "text"}
      step={column.type === "number" ? "any" : undefined}
      value={column.type === "date" ? str.slice(0, 10) : str}
      onChange={(e) => onChange(e.target.value)}
      data-testid={testId}
      autoFocus={autoFocus}
      className="bg-white"
    />
  );
}

export function RowFields({
  columns,
  values,
  setValue,
  prefix,
}: {
  columns: Column[];
  values: Record<string, CellValue>;
  setValue: (key: string, v: string) => void;
  prefix: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {columns.map((c) => (
        <div key={c.key} className="space-y-1.5">
          <Label htmlFor={`${prefix}-${c.key}`} className="text-xs font-semibold text-slate-600">
            {c.label}
          </Label>
          <FieldInput
            column={c}
            value={values[c.key] ?? null}
            onChange={(v) => setValue(c.key, v)}
            testId={`${prefix}-field-${c.key}`}
          />
        </div>
      ))}
    </div>
  );
}

export function RowDialog({
  row,
  columns,
  onClose,
  onSave,
  onDelete,
  saving,
  sourceId,
}: {
  sourceId?: string;
  row: Row | null;
  columns: Column[];
  onClose: () => void;
  onSave: (data: Record<string, CellValue>) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [values, setValues] = useState<Record<string, CellValue>>(row?.data ?? {});
  const [lastId, setLastId] = useState<string | null>(row?.id ?? null);
  if ((row?.id ?? null) !== lastId) {
    setLastId(row?.id ?? null);
    setValues(row?.data ?? {});
  }
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="esp-clair max-h-[90vh] overflow-y-auto bg-white sm:max-w-2xl" data-testid="row-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">Modifier la fiche</DialogTitle>
          <DialogDescription>Les changements sont écrits directement dans le classeur de l'entreprise.</DialogDescription>
        </DialogHeader>
        <RowFields columns={columns} values={values} setValue={(k, v) => setValues((s) => ({ ...s, [k]: v }))} prefix="row-dialog" />
        <DialogFooter className="gap-2">
          <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={onDelete} data-testid="row-dialog-delete-button">
            Supprimer
          </Button>
          <Button onClick={() => onSave(values)} disabled={saving} data-testid="row-dialog-save-button">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
        {sourceId && row && <Commentaires sourceId={sourceId} rowId={row.id} />}
      </DialogContent>
    </Dialog>
  );
}
