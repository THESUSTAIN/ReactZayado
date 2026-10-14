import type { CellValue, Column, Row, SourceKind, ViewConfig, ViewType } from "@/lib/types";

export const VIEW_LABELS: Record<ViewType, string> = {
  table: "Tableau",
  cards: "Cartes",
  form: "Formulaire",
  kanban: "Kanban",
  dashboard: "Tableau de bord",
  calendar: "Calendrier",
  timeline: "Frise",
  chrono: "Chronomètre",
};
export const VIEW_ORDER: ViewType[] = ["table", "cards", "kanban", "calendar", "timeline", "chrono", "form", "dashboard"];

export const KIND_LABELS: Record<SourceKind, string> = {
  "google-sheets": "Google Sheets",
  excel: "Excel (OneDrive)",
  "ms-lists": "Microsoft Lists",
  test: "Classeur de test",
};

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export const formatEur = (n: number) => eur.format(n);
export const formatNum = (n: number) => num.format(n);

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatCell(col: Column, value: CellValue, amountKey?: string | null): string {
  if (value === null || value === undefined || value === "") return "—";
  if (col.type === "number") {
    const n = Number(value);
    const moneyish = col.key === amountKey || /montant|prix|taux|tarif|total|ca\b/.test(col.key);
    return moneyish ? formatEur(n) : formatNum(n);
  }
  if (col.type === "date") return formatDate(String(value));
  return String(value);
}

const GREEN = /pay|termin|gagn|^oui$|valid|recette|livr/i;
const AMBER = /attente|cours|proposition|n[ée]go|qualifi|faire/i;
const RED = /retard|perdu|^non$|annul|d[ée]pense|bloqu/i;

export function statusTone(value: string): string {
  if (GREEN.test(value)) return "bg-green-50 text-green-700 ring-green-600/20";
  if (RED.test(value)) return "bg-red-50 text-red-700 ring-red-600/20";
  if (AMBER.test(value)) return "bg-amber-50 text-amber-700 ring-amber-600/20";
  return "bg-blue-50 text-blue-700 ring-blue-600/20";
}

export function applyFilter(rows: Row[], config: ViewConfig): Row[] {
  if (!config.filter_field || !config.filter_value) return rows;
  const f = config.filter_field;
  const v = config.filter_value.toLowerCase();
  return rows.filter((r) => String(r.data[f] ?? "").toLowerCase() === v);
}

export const toNumber = (v: CellValue): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function colLabel(columns: Column[], key: string | null): string {
  return columns.find((c) => c.key === key)?.label ?? "";
}
