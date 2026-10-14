import { CalendarDays, Columns3, FilePlus2, GanttChart, LayoutGrid, PieChart, Table2, Timer } from "lucide-react";
import TableView from "@/components/views/TableView";
import CardsView from "@/components/views/CardsView";
import FormView from "@/components/views/FormView";
import KanbanView from "@/components/views/KanbanView";
import DashboardView from "@/components/views/DashboardView";
import CalendarView from "@/components/views/CalendarView";
import TimelineView from "@/components/views/TimelineView";
import ChronoView from "@/components/views/ChronoView";
import { applyFilter, VIEW_LABELS, VIEW_ORDER } from "@/lib/format";
import type { Row, Source, ViewConfig, ViewType } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<ViewType, typeof Table2> = {
  table: Table2,
  cards: LayoutGrid,
  form: FilePlus2,
  kanban: Columns3,
  dashboard: PieChart,
  calendar: CalendarDays,
  timeline: GanttChart,
  chrono: Timer,
};

export function ViewSwitcher({ value, onChange }: { value: ViewType; onChange: (v: ViewType) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs" role="tablist" data-testid="view-switcher">
      {VIEW_ORDER.map((v) => {
        const Icon = ICONS[v];
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-[background-color,color] duration-150",
              active ? "bg-[#1F2A44] text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
            data-testid={`view-switch-${v}`}
          >
            <Icon className="size-4" /> {VIEW_LABELS[v]}
          </button>
        );
      })}
    </div>
  );
}

export default function ViewRenderer({ source, rows, view, config }: { source: Source; rows: Row[]; view: ViewType; config: ViewConfig }) {
  const filtered = applyFilter(rows, config);
  const props = { source, rows: filtered, config };
  switch (view) {
    case "table":
      return <TableView {...props} />;
    case "cards":
      return <CardsView {...props} />;
    case "form":
      return <FormView {...props} />;
    case "kanban":
      return <KanbanView {...props} />;
    case "dashboard":
      return <DashboardView {...props} />;
    case "calendar":
      return <CalendarView {...props} />;
    case "timeline":
      return <TimelineView {...props} />;
    case "chrono":
      return <ChronoView {...props} />;
  }
}
