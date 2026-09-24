import React from "react";
import { Briefcase, User } from "lucide-react";

// Jauge à aiguille Pro / Perso (identique à la maquette validée).
export function BalanceDial({ pro = 50, perso = 50 }) {
  const total = pro + perso || 1;
  const posPerso = perso / total; // 0 (tout pro) .. 1 (tout perso)
  const rot = (posPerso - 0.5) * 160; // -80° (pro) .. +80° (perso)
  const desequilibre = Math.abs(pro - perso) >= 20;

  const cx = 110;
  const cy = 100;
  const r = 74;

  return (
    <div className="flex w-full flex-col items-center" data-testid="balance-dial">
      <div className="relative">
        <svg width="220" height="120" viewBox="0 0 220 120">
          <defs>
            <linearGradient id="gaugeGold" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#DEC2A3" />
              <stop offset="100%" stopColor="#F1E2CC" />
            </linearGradient>
          </defs>
          {/* Piste */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="11"
            strokeLinecap="round"
          />
          {/* Arc actif or (côté pro) */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy - r}`}
            fill="none"
            stroke="url(#gaugeGold)"
            strokeWidth="11"
            strokeLinecap="round"
            opacity="0.9"
          />
          {/* Aiguille */}
          <g transform={`rotate(${rot} ${cx} ${cy})`} style={{ transition: "transform 0.9s cubic-bezier(0.22,1,0.36,1)" }}>
            <line x1={cx} y1={cy} x2={cx} y2={cy - r * 0.86} stroke="url(#gaugeGold)" strokeWidth="4" strokeLinecap="round" />
            <circle cx={cx} cy={cy - r * 0.86} r="4" fill="#F1E2CC" />
          </g>
          <circle cx={cx} cy={cy} r="8" fill="#DEC2A3" />
          <circle cx={cx} cy={cy} r="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="-mt-1 flex w-full items-end justify-between px-2">
        <div className="flex flex-col items-center gap-0.5">
          <Briefcase className="h-4 w-4 text-gold" />
          <span className="text-xs text-offwhite/60">Pro</span>
          <span className="text-sm font-semibold text-offwhite">{pro}%</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <User className="h-4 w-4 text-[#7FD4CE]" />
          <span className="text-xs text-offwhite/60">Perso</span>
          <span className="text-sm font-semibold text-offwhite">{perso}%</span>
        </div>
      </div>

      <span
        className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
          desequilibre
            ? "border border-gold/40 bg-gold/10 text-gold"
            : "border border-white/12 bg-white/5 text-offwhite/70"
        }`}
        data-testid="balance-status"
      >
        {desequilibre ? "Attention à l'équilibre" : "Bien équilibré"}
      </span>
    </div>
  );
}
