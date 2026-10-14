import type { ReactNode } from "react";
import { Clock, Euro, Rows3, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { colLabel, formatEur, formatNum, toNumber } from "@/lib/format";
import type { Row, Source, ViewConfig } from "@/lib/types";

const COLORS = ["#2563EB", "#0F9D58", "#D97706", "#008272", "#DC2626", "#7C3AED", "#0EA5E9", "#64748B"];
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function Kpi({ label, value, icon, tone = "text-slate-900", testId }: { label: string; value: string; icon: ReactNode; tone?: string; testId: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs animate-rise" data-testid={testId}>
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <p className={`mt-3 tabular-nums text-2xl font-semibold tracking-tight tabular-nums ${tone}`} data-testid={`${testId}-value`}>{value}</p>
    </div>
  );
}

function Panel({ title, children, className = "", testId }: { title: string; children: ReactNode; className?: string; testId: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-xs animate-rise ${className}`} data-testid={testId}>
      <h3 className="mb-4 font-heading text-sm font-semibold text-slate-800">{title}</h3>
      {children}
    </section>
  );
}

export default function DashboardView({ source, rows, config }: { source: Source; rows: Row[]; config: ViewConfig }) {
  const amount = config.amount_field;
  const hours = config.hours_field;
  const rateCol = source.columns.find((c) => c.type === "number" && /taux|rate|tarif/.test(c.key) && c.key !== hours);
  const flowCol = source.columns.find((c) => c.type === "select" && c.options.some((o) => /d[ée]pense/i.test(o)));
  const isExpense = (r: Row) => (flowCol ? /d[ée]pense/i.test(String(r.data[flowCol.key] ?? "")) : false);

  const sum = (key: string | null, pred: (r: Row) => boolean = () => true) =>
    key ? rows.filter(pred).reduce((s, r) => s + toNumber(r.data[key] ?? null), 0) : 0;

  const income = sum(amount, (r) => !isExpense(r));
  const expense = sum(amount, isExpense);
  const totalHours = sum(hours);
  const billed = hours && rateCol ? rows.reduce((s, r) => s + toNumber(r.data[hours] ?? null) * toNumber(r.data[rateCol.key] ?? null), 0) : 0;

  // monthly series
  const metric = amount ?? hours;
  const byMonth = new Map<string, { month: string; recettes: number; depenses: number; heures: number }>();
  if (config.date_field) {
    [...rows]
      .filter((r) => r.data[config.date_field!])
      .sort((a, b) => String(a.data[config.date_field!]).localeCompare(String(b.data[config.date_field!])))
      .forEach((r) => {
        const iso = String(r.data[config.date_field!]).slice(0, 7);
        const [y, m] = iso.split("-");
        const label = `${MONTHS[Number(m) - 1] ?? m} ${y?.slice(2) ?? ""}`;
        const cur = byMonth.get(iso) ?? { month: label, recettes: 0, depenses: 0, heures: 0 };
        if (amount) {
          if (isExpense(r)) cur.depenses += toNumber(r.data[amount] ?? null);
          else cur.recettes += toNumber(r.data[amount] ?? null);
        }
        if (hours) cur.heures += toNumber(r.data[hours] ?? null);
        byMonth.set(iso, cur);
      });
  }
  const monthly = [...byMonth.values()];

  const groupSum = (field: string | null, key: string | null, pred: (r: Row) => boolean = () => true) => {
    if (!field) return [];
    const m = new Map<string, number>();
    rows.filter(pred).forEach((r) => {
      const k = String(r.data[field] ?? "Sans valeur") || "Sans valeur";
      m.set(k, (m.get(k) ?? 0) + (key ? toNumber(r.data[key] ?? null) : 1));
    });
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };
  const byCategory = groupSum(config.category_field, metric);
  const byGroup = groupSum(config.group_by, metric);
  const metricIsMoney = !!amount;
  const fmt = (n: number) => (metricIsMoney ? formatEur(n) : `${formatNum(n)} h`);

  return (
    <div className="space-y-5" data-testid="dashboard-view">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Lignes" value={formatNum(rows.length)} icon={<Rows3 className="size-4" />} testId="kpi-rows" />
        {amount && flowCol && (
          <>
            <Kpi label="Recettes" value={formatEur(income)} tone="text-green-700" icon={<TrendingUp className="size-4" />} testId="kpi-income" />
            <Kpi label="Dépenses" value={formatEur(expense)} tone="text-red-600" icon={<TrendingDown className="size-4" />} testId="kpi-expense" />
            <Kpi label="Solde" value={formatEur(income - expense)} icon={<Wallet className="size-4" />} testId="kpi-balance" />
          </>
        )}
        {amount && !flowCol && (
          <Kpi label={`Total ${colLabel(source.columns, amount)}`} value={formatEur(income)} icon={<Euro className="size-4" />} testId="kpi-total" />
        )}
        {hours && <Kpi label="Heures pointées" value={`${formatNum(totalHours)} h`} icon={<Clock className="size-4" />} testId="kpi-hours" />}
        {hours && rateCol && <Kpi label="Valeur facturable" value={formatEur(billed)} tone="text-blue-700" icon={<Euro className="size-4" />} testId="kpi-billable" />}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {monthly.length > 0 && (
          <Panel title={amount ? "Évolution mensuelle" : "Heures par mois"} className="xl:col-span-2" testId="chart-monthly">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ left: 0, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} width={56} />
                  <Tooltip formatter={(value: number, name: string) => [name === "heures" ? `${formatNum(value)} h` : formatEur(value), name]} />
                  {amount && <Bar dataKey="recettes" fill="#2563EB" radius={[6, 6, 0, 0]} />}
                  {amount && flowCol && <Bar dataKey="depenses" fill="#F87171" radius={[6, 6, 0, 0]} />}
                  {!amount && hours && <Bar dataKey="heures" fill="#008272" radius={[6, 6, 0, 0]} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        )}
        {byCategory.length > 0 && (
          <Panel title={`Répartition par ${colLabel(source.columns, config.category_field).toLowerCase()}`} testId="chart-category">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2}>
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => fmt(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {byCategory.map((c, i) => (
                <li key={c.name} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600">{c.name}</span>
                  <span className="ml-auto tabular-nums text-xs text-slate-800">{fmt(c.value)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      {byGroup.length > 0 && config.group_by !== config.category_field && (
        <Panel title={`Total par ${colLabel(source.columns, config.group_by).toLowerCase()}`} testId="chart-group">
          <div className="space-y-3">
            {byGroup.map((g, i) => {
              const max = byGroup[0]?.value || 1;
              return (
                <div key={g.name} className="grid grid-cols-[140px_1fr_110px] items-center gap-3 text-sm">
                  <span className="truncate text-slate-600">{g.name}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(g.value / max) * 100}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                  <span className="text-right tabular-nums text-xs text-slate-800">{fmt(g.value)}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}
