import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Check, HeartPulse } from "lucide-react";
import { fetchWheel, saveWheel } from "@/lib/kairosApi";

const SIZE = 320;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_MAX = 130;

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function wedgePath(cx, cy, r, a0, a1) {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y} Z`;
}

export function BalanceWheel() {
  const [pillars, setPillars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [energie, setEnergie] = useState(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    fetchWheel()
      .then((r) => {
        if (!alive) return;
        setPillars(Array.isArray(r?.pillars) ? r.pillars : []);
        setEnergie(r?.energie_moyenne ?? null);
      })
      .catch(() => { if (alive) toast.error("Impossible de charger la roue."); })
      .finally(() => { if (alive) { setLoading(false); loadedRef.current = true; } });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    setSaving(true);
    const id = setTimeout(() => {
      saveWheel(pillars).catch(() => {}).finally(() => setSaving(false));
    }, 600);
    return () => clearTimeout(id);
  }, [pillars]);

  const setScore = (idx, value) =>
    setPillars((prev) => prev.map((p, i) => (i === idx ? { ...p, score: value } : p)));

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-offwhite/60" data-testid="wheel-loading">
        <Loader2 size={16} className="animate-spin" /> Chargement de ta roue…
      </div>
    );
  }

  const count = pillars.length || 1;
  const step = 360 / count;
  const globalScore = pillars.length
    ? Math.round(pillars.reduce((s, p) => s + (Number(p.score) || 0), 0) / pillars.length)
    : 0;

  return (
    <div className="mx-auto max-w-4xl" data-testid="balance-wheel">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-sm text-offwhite/60">
          Note chaque pilier de 0 à 100. Le pilier <b className="text-emerald-300">Bien-être</b> se cale sur ta moyenne d'énergie
          {energie != null ? ` (${energie}/5)` : ""}.
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-offwhite/70" data-testid="wheel-save-status">
          {saving ? (<><Loader2 size={12} className="animate-spin text-gold" /> Enregistrement…</>) : (<><Check size={12} className="text-emerald-400" /> Enregistré</>)}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass flex items-center justify-center rounded-2xl p-5">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <circle key={f} cx={CX} cy={CY} r={R_MAX * f} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            ))}
            {pillars.map((p, i) => {
              const a0 = i * step;
              const a1 = (i + 1) * step;
              const r = Math.max(2, (Number(p.score) || 0) / 100 * R_MAX);
              const mid = polar(CX, CY, R_MAX + 18, (a0 + a1) / 2);
              return (
                <g key={p.name || i}>
                  <path d={wedgePath(CX, CY, R_MAX, a0, a1)} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" />
                  <path d={wedgePath(CX, CY, r, a0, a1)} fill={p.color || "#DEC2A3"} fillOpacity="0.7" stroke={p.color || "#DEC2A3"} />
                  <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="middle" fill="#EDF2FF" fontSize="9" fontWeight="600">
                    {p.name}
                  </text>
                </g>
              );
            })}
            <circle cx={CX} cy={CY} r="30" fill="#0B1F3A" stroke="rgba(222,194,163,0.4)" />
            <text x={CX} y={CY - 3} textAnchor="middle" fill="#DEC2A3" fontSize="20" fontWeight="700">{globalScore}</text>
            <text x={CX} y={CY + 13} textAnchor="middle" fill="#EDF2FF" fillOpacity="0.6" fontSize="8">ÉQUILIBRE</text>
          </svg>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-offwhite">
            <HeartPulse size={16} className="text-gold" /> Tes piliers de vie
          </h3>
          <div className="space-y-4">
            {pillars.map((p, i) => (
              <div key={p.name || i} data-testid={`wheel-pillar-${i}`}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-offwhite">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                    {p.name}
                  </span>
                  <span className="font-display font-bold text-gold">{p.score}</span>
                </div>
                <input
                  type="range" min="0" max="100" value={p.score}
                  onChange={(e) => setScore(i, Number(e.target.value))}
                  data-testid={`wheel-slider-${i}`}
                  className="w-full"
                  style={{ accentColor: p.color }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
