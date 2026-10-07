import { Activity, BedDouble, Coffee, Gauge, HeartPulse, Info } from "lucide-react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { GlassCard, MonoTag, PageHeader, StatTile } from "@/components/Shared";
import { useCockpit } from "@/lib/store";

const tooltipStyle = {
  background: "#0F172A",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  color: "#F8FAFC",
};

export default function Bienetre() {
  const { state } = useCockpit();

  const sorted = [...state.energy].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const data = sorted.map((e) => ({
    day: new Date(`${e.date}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
    level: e.level,
  }));
  const avg = sorted.length === 0 ? 0 : sorted.reduce((s, e) => s + e.level, 0) / sorted.length;

  const charge =
    avg >= 7 ? { label: "Calme", cls: "text-emerald-400" } : avg >= 4 ? { label: "Soutenue", cls: "text-amber-400" } : { label: "Surcharge", cls: "text-red-400" };

  const tips =
    avg >= 7
      ? [
          "Votre énergie est haute depuis plusieurs jours : c'est le moment de réserver un créneau de prospection quotidien.",
          "Capitalisez : lancez maintenant les actions qui demandent le plus d'élan commercial.",
        ]
      : avg >= 4
        ? [
            "Rythme tenable mais fragile : protégez deux pauses complètes avant la fin de semaine.",
            "Regroupez vos tâches à faible énergie (admin, relances) dans une seule plage horaire.",
          ]
        : [
            "Vous avez enchaîné plusieurs jours à basse énergie : prévoyez un après-midi allégé dès demain.",
            "Réduisez le plan du jour à une seule priorité — le cockpit la met déjà en avant.",
          ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Module 10"
        title="Bien-être & Énergie"
        description="Votre rythme est-il tenable dans le temps ? Le cockpit ajuste la charge, pas votre ambition."
      >
        <MonoTag className="border-amber-400/40 bg-amber-400/10 text-amber-300">
          <Info className="h-3 w-3" />
          Outil d'organisation — ne remplace pas un avis médical
        </MonoTag>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={Activity} label="Focus profond" value="14 h" sub="cette semaine" testid="tile-focus" />
        <StatTile icon={Coffee} label="Pauses respectées" value="5 / 6" sub="pauses prévues puis prises" testid="tile-pauses" />
        <StatTile icon={Gauge} label="Charge mentale perçue" value={charge.label} sub={`Énergie moyenne : ${avg.toFixed(1).replace(".", ",")}/10`} testid="tile-charge" />
      </div>

      <GlassCard className="p-6" data-testid="card-courbe-energie">
        <div className="mb-4">
          <h2 className="font-heading text-lg font-medium text-slate-100">Énergie — 7 derniers jours</h2>
          <p className="text-xs text-slate-400">
            Les check-ins du module Aujourd'hui alimentent cette courbe automatiquement.
          </p>
        </div>
        <div className="h-72" data-testid="chart-energie">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-400">Faites votre premier check-in d'énergie pour lancer la courbe.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="day" stroke="#475569" tick={{ fill: "#94A3B8", fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 10]} stroke="#475569" tick={{ fill: "#94A3B8", fontSize: 12 }} tickLine={false} axisLine={false} width={32} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => [`${value}/10`, name === "level" ? "Énergie" : name]}
                  labelFormatter={(label: string) => label}
                />
                <Line
                  type="monotone"
                  dataKey="level"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#38BDF8", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#60A5FA" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </GlassCard>

      <GlassCard className="p-6" data-testid="card-recommandations">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-sky-400" />
          <MonoTag>Recommandations du cockpit</MonoTag>
        </div>
        <ul className="mt-4 space-y-2" data-testid="liste-recommandations">
          {tips.map((tip, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg border border-white/5 bg-slate-900/50 px-4 py-3 text-sm leading-relaxed text-slate-300"
            >
              <BedDouble className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              {tip}
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}
