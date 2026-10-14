import { Link } from "react-router-dom";
import type React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { Carte, PastilleIcone, euros } from "@/components/vision/atomes";
import type { AxeRoue, MoisFinance } from "@/types/vision";

/* Les deux graphiques de la page. Or pour les revenus, ardoise pour les dépenses :
   une seule couleur d'accent, le reste en gris bleuté. */

const styleInfobulle = {
  backgroundColor: "rgba(10,18,40,0.95)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  fontSize: 12,
  color: "#eceff7",
} as const;

export function GraphiqueFinances({ evolution, nu = false }: { evolution: MoisFinance[]; nu?: boolean }) {
  const Cadre = nu
    ? ({ children }: { children: React.ReactNode }) => <div data-testid="carte-evolution-financiere">{children}</div>
    : ({ children }: { children: React.ReactNode }) => <Carte className="p-4 sm:p-5" testId="carte-evolution-financiere">{children}</Carte>;
  return (
    <Cadre>
      <div className={nu ? "hidden" : "mb-3 flex items-center gap-3"}>
        <PastilleIcone>
          <BarChart3 className="size-4" />
        </PastilleIcone>
        <h2 className="text-lg font-semibold text-[#eceff7]">Évolution sur 6 mois</h2>
        <span className="chiffre ml-auto rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-[#a8b6d1]">
          6 mois
        </span>
      </div>
      <div className="h-[200px] w-full sm:h-[230px]">
        {evolution.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolution} margin={{ top: 6, right: 18, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="degradeOr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dec2a3" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#dec2a3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(168,182,209,0.12)" vertical={false} />
              <XAxis
                dataKey="mois"
                tick={{ fill: "#9fb0cf", fontSize: 11, fontFamily: "IBM Plex Mono" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#9fb0cf", fontSize: 11, fontFamily: "IBM Plex Mono" }}
                axisLine={false}
                tickLine={false}
                width={38}
                tickFormatter={(v: number) => (v === 0 ? "0" : `${Math.round(v / 1000)}k`)}
              />
              <Tooltip
                contentStyle={styleInfobulle}
                formatter={(value: number, name: string) => [
                  euros(value),
                  name === "revenus" ? "Revenus" : "Dépenses",
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenus"
                stroke="#dec2a3"
                strokeWidth={2}
                fill="url(#degradeOr)"
              />
              <Area
                type="monotone"
                dataKey="depenses"
                stroke="#a8b6d1"
                strokeWidth={1.6}
                fill="transparent"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="grid h-full place-items-center text-sm text-[#9fb0cf]">
            Aucune écriture importée — rien n'est inventé ici.
          </p>
        )}
      </div>
    </Cadre>
  );
}

export function RoueEquilibre({ roue }: { roue: AxeRoue[] }) {
  if (roue.length === 0) {
    return (
      <Carte className="p-5 sm:p-6" testId="carte-roue-equilibre">
        <p className="etiquette-carte">Ton équilibre</p>
        <h2 className="titre-carte mt-2">Ta roue, <span className="mot-main">en 3 minutes</span></h2>
        <p className="mt-1 text-sm text-[#a8b6d1]">Six domaines de ta vie, notés en 3 minutes : tu vois tout de suite où mettre ton énergie.</p>
        <Link to="/app/diagnostic" className="btn-secondaire mt-4" data-testid="roue-diagnostic">Faire mon diagnostic d'équilibre</Link>
      </Carte>
    );
  }
  return (
    <Carte className="p-4 sm:p-5" testId="carte-roue-equilibre">
      <p className="etiquette-carte mb-1">Ton équilibre</p>
      <div className="h-[230px] w-full">
        {roue.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={roue} outerRadius="72%">
              <PolarGrid stroke="rgba(168,182,209,0.18)" />
              <PolarAngleAxis
                dataKey="axe"
                tick={{ fill: "#a8b6d1", fontSize: 11 }}
              />
              <Radar
                dataKey="score"
                stroke="#dec2a3"
                strokeWidth={2}
                fill="#dec2a3"
                fillOpacity={0.08}
                dot={{ r: 3, fill: "#dec2a3", stroke: "none" }}
              />
              <Tooltip
                contentStyle={styleInfobulle}
                formatter={(value: number) => [`${value} / 100`, "Score"]}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <p className="grid h-full place-items-center text-sm text-[#9fb0cf]">
            Roue non renseignée.
          </p>
        )}
      </div>
    </Carte>
  );
}
