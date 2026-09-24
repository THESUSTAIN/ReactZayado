import { toast } from "sonner";
import { MailWarning, ReceiptText, TrendingUp, Wallet } from "lucide-react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { GlassCard, MonoTag, PageHeader, Progress, StatTile, eur } from "@/components/Shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCockpit } from "@/lib/store";
import type { InvoiceStatus } from "@/lib/types";

const STATUSES: InvoiceStatus[] = ["Payée", "En attente", "Relance"];

const tooltipStyle = {
  background: "#0F172A",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  color: "#F8FAFC",
};

export default function Pouls() {
  const { state, patch } = useCockpit();
  const { finance } = state;

  const ca = finance.revenue[finance.revenue.length - 1]?.value ?? 0;
  const pending = finance.invoices.filter((i) => i.status !== "Payée");
  const pendingSum = pending.reduce((s, i) => s + i.amount, 0);
  const runway = finance.monthlyCharges > 0 ? finance.treasury / finance.monthlyCharges : 0;

  const setStatus = (id: string, status: InvoiceStatus) => {
    patch({
      finance: {
        ...finance,
        invoices: finance.invoices.map((i) => (i.id === id ? { ...i, status } : i)),
      },
    });
    if (status === "Payée") toast.success("Facture marquée payée — le pouls se met à jour");
  };

  const relaunch = (id: string) => {
    patch({
      finance: {
        ...finance,
        invoices: finance.invoices.map((i) => (i.id === id ? { ...i, status: "Relance" } : i)),
      },
    });
    toast.success("Relance prête — à valider depuis votre messagerie");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Module 08"
        title="Pouls Business"
        description="Où en sont vos revenus et votre trésorerie, en un coup d'œil. Vous pouvez tout ressaisir à la main."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GlassCard className="border border-[#1E3A8A] bg-[#0F172A] p-5" data-testid="kpi-ca">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <MonoTag className="border-blue-500/40 bg-blue-500/10 text-blue-300">CA du mois</MonoTag>
              <TrendingUp className="h-4 w-4 text-sky-400" />
            </div>
            <p className="font-heading text-3xl font-semibold text-white">{eur(ca)}</p>
            <div className="space-y-1.5">
              <Progress value={Math.round((ca / finance.objective) * 100)} testid="barre-ca-objectif" />
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
                Objectif : {eur(finance.objective)} — {Math.round((ca / finance.objective) * 100)} %
              </p>
            </div>
          </div>
        </GlassCard>
        <StatTile
          icon={ReceiptText}
          label="Factures en attente"
          value={eur(pendingSum)}
          sub={`${pending.length} facture${pending.length > 1 ? "s" : ""} non payée${pending.length > 1 ? "s" : ""}`}
          testid="kpi-factures"
        />
        <StatTile
          icon={Wallet}
          label="Trésorerie disponible"
          value={eur(finance.treasury)}
          sub={`Charges mensuelles : ${eur(finance.monthlyCharges)}`}
          testid="kpi-tresorerie"
        />
        <StatTile
          icon={MailWarning}
          label="Runway estimé"
          value={`≈ ${runway.toFixed(1).replace(".", ",")} mois`}
          sub="À votre rythme de charges actuel"
          testid="kpi-runway"
        />
      </div>

      <GlassCard className="p-6" data-testid="card-chart-ca">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-medium text-slate-100">Chiffre d'affaires — 6 derniers mois</h2>
            <p className="text-xs text-slate-400">Barres : CA réalisé. Courbe pointillée : prévision du mois en cours.</p>
          </div>
        </div>
        <div className="h-72" data-testid="chart-ca">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={finance.revenue} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="month" stroke="#475569" tick={{ fill: "#94A3B8", fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" tick={{ fill: "#94A3B8", fontSize: 12 }} tickLine={false} axisLine={false} width={48} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [
                  eur(value),
                  name === "prevision" ? "Prévision" : "CA réalisé",
                ]}
                labelFormatter={(label: string) => `Mois de ${label}`}
              />
              <Bar dataKey="value" fill="#1E40AF" radius={[6, 6, 0, 0]} maxBarSize={44} />
              <Line type="monotone" dataKey="prevision" stroke="#38BDF8" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: "#38BDF8" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard className="p-6" data-testid="card-factures">
        <div className="mb-4">
          <h2 className="font-heading text-lg font-medium text-slate-100">Dernières factures</h2>
          <p className="text-xs text-slate-400">Le pouls réagit en direct quand vous mettez une facture en relance.</p>
        </div>
        <Table data-testid="table-factures">
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-slate-400">Client</TableHead>
              <TableHead className="text-slate-400">Montant</TableHead>
              <TableHead className="text-slate-400">Échéance</TableHead>
              <TableHead className="text-slate-400">Statut</TableHead>
              <TableHead className="text-right text-slate-400">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {finance.invoices.map((inv, i) => {
              const due = new Date(`${inv.due}T00:00:00`);
              const overdue = inv.status !== "Payée" && due.getTime() < Date.now();
              return (
                <TableRow key={inv.id} className="border-white/5" data-testid={`ligne-facture-${i + 1}`}>
                  <TableCell className="font-medium text-slate-200">{inv.client}</TableCell>
                  <TableCell className="font-mono text-slate-300">{eur(inv.amount)}</TableCell>
                  <TableCell className={overdue ? "text-red-400" : "text-slate-400"}>
                    {due.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    {overdue ? " — en retard" : ""}
                  </TableCell>
                  <TableCell>
                    <Select value={inv.status} onValueChange={(v: string) => setStatus(inv.id, v as InvoiceStatus)}>
                      <SelectTrigger
                        size="sm"
                        data-testid={`select-statut-facture-${i + 1}`}
                        className="w-36 border-white/10 bg-slate-900/60 text-xs"
                      >
                        <SelectValue>{inv.status}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    {inv.status !== "Payée" ? (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => relaunch(inv.id)}
                        data-testid={`btn-relancer-facture-${i + 1}`}
                        className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200"
                      >
                        Relancer
                      </Button>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">Réglée</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </GlassCard>
    </div>
  );
}
