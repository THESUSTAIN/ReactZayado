import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { Column, ViewConfig } from "@/lib/types";

const selectCls =
  "h-9 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-blue-500 focus-visible:ring-3 focus-visible:ring-blue-500/20";

type FieldKey = Exclude<keyof ViewConfig, "filter_value">;

const FIELDS: { key: FieldKey; label: string; types: Column["type"][] }[] = [
  { key: "title_field", label: "Titre des fiches", types: ["text", "select"] },
  { key: "group_by", label: "Regrouper par (Kanban)", types: ["select"] },
  { key: "amount_field", label: "Montant (€)", types: ["number"] },
  { key: "hours_field", label: "Heures (suivi du temps)", types: ["number"] },
  { key: "date_field", label: "Date (ou début)", types: ["date"] },
  { key: "end_field", label: "Date de fin (calendrier, frise)", types: ["date"] },
  { key: "person_field", label: "Personne", types: ["text", "select"] },
  { key: "ref_field", label: "Référence chronométrée (ticket, mission…)", types: ["text", "select"] },
  { key: "category_field", label: "Catégorie (graphique)", types: ["select", "text"] },
  { key: "filter_field", label: "Filtrer sur la colonne", types: ["select", "text"] },
];

export default function ConfigEditor({
  columns,
  config,
  onChange,
  prefix = "config",
}: {
  columns: Column[];
  config: ViewConfig;
  onChange: (c: ViewConfig) => void;
  prefix?: string;
}) {
  const filterCol = columns.find((c) => c.key === config.filter_field);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">{f.label}</Label>
          <select
            className={selectCls}
            value={config[f.key] ?? ""}
            onChange={(e) => onChange({ ...config, [f.key]: e.target.value || null, ...(f.key === "filter_field" ? { filter_value: null } : {}) })}
            data-testid={`${prefix}-${f.key.replace(/_/g, "-")}-select`}
          >
            <option value="">Aucun</option>
            {columns
              .filter((c) => f.types.includes(c.type))
              .map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
          </select>
        </div>
      ))}
      {config.filter_field && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">Valeur du filtre</Label>
          {filterCol?.type === "select" ? (
            <select
              className={selectCls}
              value={config.filter_value ?? ""}
              onChange={(e) => onChange({ ...config, filter_value: e.target.value || null })}
              data-testid={`${prefix}-filter-value-select`}
            >
              <option value="">Toutes</option>
              {filterCol.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <Input
              value={config.filter_value ?? ""}
              onChange={(e) => onChange({ ...config, filter_value: e.target.value || null })}
              className="bg-white"
              data-testid={`${prefix}-filter-value-input`}
            />
          )}
        </div>
      )}
    </div>
  );
}
