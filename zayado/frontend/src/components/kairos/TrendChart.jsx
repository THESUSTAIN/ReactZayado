import React from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs text-offwhite">
      <span className="font-semibold text-gold">{payload[0].value}/5</span> d'énergie
    </div>
  );
}

// Tendance Énergie 14 jours (area chart teal/gold).
export function TrendChart({ data }) {
  return (
    <div className="h-44 min-h-[176px] w-full" data-testid="energy-trend-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.5} />
              <stop offset="60%" stopColor="#3B82F6" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
          <YAxis domain={[0, 5]} hide />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#C9A96A", strokeOpacity: 0.3 }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#C9A96A"
            strokeWidth={2.5}
            fill="url(#trendFill)"
            dot={{ r: 2.5, fill: "#C9A96A", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#C9A96A", stroke: "#0B0F19", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
