import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RowDialog } from "@/components/RowFields";
import { Button } from "@/components/ui/button";
import { useRowMutations } from "@/lib/hooks";
import type { Row, Source, ViewConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const TONS = ["bg-[#E8EEF9] text-[#1F3A6B]", "bg-[#F5EBDD] text-[#7A4E16]", "bg-[#E4F2EC] text-[#145C43]", "bg-[#F6E6E6] text-[#8A2B2B]", "bg-[#ECE8F5] text-[#3E3170]"];
const JOURS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

/** Calendrier mensuel : chaque ligne s'affiche de sa date de début à sa date de fin (planning, absences). */
export default function CalendarView({ source, rows, config }: { source: Source; rows: Row[]; config: ViewConfig }) {
  const { update, remove, create } = useRowMutations(source.id);
  const [mois, setMois] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [open, setOpen] = useState<Row | null>(null);
  const df = config.date_field;
  const cat = config.category_field || config.group_by;
  const tons = useMemo(() => {
    const vals = [...new Set(rows.map((r) => String(r.data[cat ?? ""] ?? "")))];
    return Object.fromEntries(vals.map((v, i) => [v, TONS[i % TONS.length]]));
  }, [rows, cat]);

  if (!df) {
    return <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500" data-testid="calendar-no-date">Choisis la colonne « Date » dans les paramètres de la page.</p>;
  }
  const debut = new Date(mois);
  debut.setDate(1 - ((mois.getDay() + 6) % 7));
  const cases = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(debut);
    d.setDate(debut.getDate() + i);
    return d;
  });
  const auj = iso(new Date());
  const duJour = (j: string) =>
    rows.filter((r) => {
      const a = String(r.data[df] ?? "");
      const b = String((config.end_field && r.data[config.end_field]) || a);
      return a && a <= j && j <= b;
    });
  const titre = (r: Row) => String(r.data[config.title_field ?? ""] ?? r.data[config.person_field ?? ""] ?? "Sans titre");

  return (
    <div className="space-y-3 animate-rise" data-testid="calendar-view">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() - 1, 1))} aria-label="Mois précédent" data-testid="calendar-prev">
          <ChevronLeft className="size-4" />
        </Button>
        <p className="min-w-40 text-center font-heading text-base font-semibold capitalize text-slate-900" data-testid="calendar-month">
          {mois.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </p>
        <Button variant="outline" size="icon-sm" onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() + 1, 1))} aria-label="Mois suivant" data-testid="calendar-next">
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setMois(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} data-testid="calendar-today">
          Aujourd'hui
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {JOURS.map((j) => (
            <div key={j} className="py-2">{j}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cases.map((d) => {
            const j = iso(d);
            const items = duJour(j);
            const horsMois = d.getMonth() !== mois.getMonth();
            return (
              <div key={j} className={cn("min-h-24 border-b border-r border-slate-100 p-1.5 sm:min-h-28", horsMois && "bg-slate-50/60")} data-testid={`calendar-day-${j}`}>
                <div className="flex items-center justify-between">
                  <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs", j === auj ? "bg-[#1F2A44] font-semibold text-white" : horsMois ? "text-slate-400" : "text-slate-700")}>
                    {d.getDate()}
                  </span>
                  {!horsMois && (
                    <button type="button" className="text-xs text-slate-300 transition-colors duration-150 hover:text-[#9a6a2c]" onClick={() => create.mutate({ [df]: j })} aria-label={`Ajouter le ${j}`} data-testid={`calendar-add-${j}`}>
                      +
                    </button>
                  )}
                </div>
                <div className="mt-1 space-y-1">
                  {items.slice(0, 3).map((r) => (
                    <button key={r.id} type="button" onClick={() => setOpen(r)} className={cn("block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium transition-transform duration-100 hover:-translate-y-px", tons[String(r.data[cat ?? ""] ?? "")])} data-testid={`calendar-item-${r.id}-${j}`}>
                      {titre(r)}
                    </button>
                  ))}
                  {items.length > 3 && <p className="px-1 text-[10px] text-slate-500">+{items.length - 3} autre(s)</p>}
                </div>
              </div>
            );
          })}
        </div>
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
    </div>
  );
}
