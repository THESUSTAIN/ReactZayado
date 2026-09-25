import React, { useEffect, useRef, useState } from "react";
import { Wind, X, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { jouerAmbiance, arreterAmbiance, volumeAmbiance, AMBIANCES_SON } from "@/lib/ambiance";

const GOLD = "#DEC2A3";

// Breathing cycles
const CYCLES = {
  "4-7-8": { name: "4-7-8 · Calme profond", steps: [{ label: "Inspire", dur: 4000, scale: 1.15 }, { label: "Retiens", dur: 7000, scale: 1.15 }, { label: "Expire", dur: 8000, scale: 0.9 }], desc: "Diminue l'anxiété et prépare au sommeil" },
  "box":   { name: "Box breathing · Focus",   steps: [{ label: "Inspire", dur: 4000, scale: 1.15 }, { label: "Retiens", dur: 4000, scale: 1.15 }, { label: "Expire", dur: 4000, scale: 0.9 }, { label: "Pause", dur: 4000, scale: 0.9 }], desc: "Concentration & clarté (Navy SEAL)" },
  "coherence": { name: "Cohérence cardiaque",  steps: [{ label: "Inspire", dur: 5000, scale: 1.15 }, { label: "Expire", dur: 5000, scale: 0.9 }], desc: "5 min · 6 cycles / min · anti-stress" },
  "refuge": { name: "Refuge · visualisation", steps: [{ label: "Inspire", dur: 6000, scale: 1.12 }, { label: "Expire", dur: 6000, scale: 0.92 }], desc: "Respiration lente et ton lieu-refuge intérieur",
    guide: ["Imagine un lieu où tu te sens en sécurité.", "Regarde les couleurs, la lumière.", "Écoute les sons autour de toi.", "Sens la température de l'air.", "Tu peux revenir ici quand tu veux."] },
};
export const PROTOCOLES = CYCLES;

export default function BreathingSession({ onClose, defaultCycle = "4-7-8", durationMin = 5, ambiance = "aucune", autoStart = false, onTermine }) {
  const [cycleId, setCycleId] = useState(defaultCycle);
  const [running, setRunning] = useState(autoStart);
  const [son, setSon] = useState(ambiance);
  const [volume, setVolume] = useState(0.6);
  const preset = autoStart;
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(durationMin);
  const cycle = CYCLES[cycleId];
  const step = cycle.steps[stepIdx];
  const totalMs = duration * 60 * 1000;
  const timerRef = useRef(null);
  const startRef = useRef(null);

  // Ambiance sonore : joue pendant la séance, se coupe en pause et à la fermeture.
  useEffect(() => {
    if (running && son !== "aucune") jouerAmbiance(son, volume); else arreterAmbiance();
  }, [running, son]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { volumeAmbiance(volume); }, [volume]);
  useEffect(() => () => arreterAmbiance(), []);

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now() - elapsed;
    const tick = () => {
      const now = Date.now();
      const total = now - startRef.current;
      setElapsed(total);
      if (total >= totalMs) {
        setRunning(false);
        toast.success("Séance terminée. Bravo à toi.");
        onTermine?.(cycleId);
        return;
      }
      // Compute current step based on cycle length
      const cycleLen = cycle.steps.reduce((s, x) => s + x.dur, 0);
      const inCycle = total % cycleLen;
      let acc = 0;
      for (let i = 0; i < cycle.steps.length; i++) {
        acc += cycle.steps[i].dur;
        if (inCycle < acc) { setStepIdx(i); break; }
      }
      timerRef.current = requestAnimationFrame(tick);
    };
    timerRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(timerRef.current);
  }, [running, cycleId, duration]);

  const remaining = Math.max(0, totalMs - elapsed);
  const mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-between bg-gradient-to-b from-[#0f1b3a] via-[#16244a] to-[#0f1b3a] px-6 py-8">
      {/* Header */}
      <div className="flex w-full max-w-md items-center justify-between">
        <button onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white"><X size={20} /></button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: GOLD }}>Séance du moment</div>
          <div className="font-display text-[14px] font-semibold text-white">{cycle.name}</div>
        </div>
        <div className="w-9" />
      </div>

      {/* Cycle picker */}
      {!running && !preset && (
        <div className="w-full max-w-md space-y-2">
          {Object.entries(CYCLES).map(([id, c]) => (
            <button key={id} onClick={() => setCycleId(id)}
              className={`w-full rounded-xl border p-3 text-left transition ${cycleId === id ? "border-[color:var(--g)] bg-white/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}
              style={{ "--g": GOLD }}>
              <div className="text-[13.5px] font-semibold text-white">{c.name}</div>
              <div className="text-[11.5px] text-white/55">{c.desc}</div>
            </button>
          ))}
          <div className="mt-3 flex items-center gap-3 text-[12px] text-white/70">
            <span>Durée</span>
            {[3, 5, 8, 12].map((m) => (
              <button key={m} onClick={() => setDuration(m)}
                className={`rounded-full px-3 py-1 text-[11.5px] font-semibold transition ${duration === m ? "text-navy-900" : "border border-white/15 text-white/70"}`}
                style={duration === m ? { background: GOLD } : {}}>{m} min</button>
            ))}
          </div>
        </div>
      )}

      {/* Orb + status */}
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <div className="font-display text-[28px] font-semibold text-white">{running ? step.label : "Prêt(e) ?"}</div>
          <div className="mt-1 font-serif-italic italic text-[15px] text-white/60">
            {running ? `${mm}:${ss} restant` : "Trouve une position confortable"}
          </div>
          {running && cycle.guide && (
            <p className="mx-auto mt-3 max-w-xs text-[14px] leading-relaxed text-white/80" data-testid="seance-guide">{cycle.guide[Math.floor(elapsed / 24000) % cycle.guide.length]}</p>
          )}
        </div>
        <div className="relative flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80">
          {/* Glow */}
          <div className="absolute inset-0 rounded-full transition-transform ease-in-out"
            style={{
              background: "radial-gradient(circle, rgba(147,197,253,0.5) 0%, rgba(96,165,250,0.35) 45%, rgba(56,178,172,0.3) 75%, transparent 100%)",
              transform: `scale(${running ? step.scale : 1})`,
              transitionDuration: running ? `${step.dur}ms` : "600ms",
              filter: "blur(20px)",
            }} />
          {/* Sphere */}
          <div className="relative flex h-56 w-56 items-center justify-center rounded-full sm:h-64 sm:w-64 transition-transform ease-in-out"
            style={{
              background: "radial-gradient(circle at 40% 35%, rgba(255,255,255,0.9), rgba(220,220,235,0.7) 50%, rgba(180,180,220,0.5) 100%)",
              boxShadow: "0 0 60px rgba(147,197,253,0.6), inset 0 0 40px rgba(96,165,250,0.3)",
              transform: `scale(${running ? step.scale : 1})`,
              transitionDuration: running ? `${step.dur}ms` : "600ms",
            }}>
            {!running && <div className="font-display text-[26px] font-bold text-navy-900">Commencer</div>}
            {running && (
              <div className="text-center">
                <div className="font-display text-[36px] font-bold text-navy-900">{step.label}</div>
                <div className="mt-1 text-[13px] text-navy-700">{step.dur / 1000}s</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex w-full max-w-md flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-1.5" data-testid="seance-sons">
          {AMBIANCES_SON.map((a) => (
            <button key={a.id} onClick={() => setSon(a.id)}
              className={`rounded-full px-3 py-1 text-[11.5px] font-medium transition ${son === a.id ? "text-navy-900" : "border border-white/15 text-white/70"}`}
              style={son === a.id ? { background: GOLD } : {}}>{a.label}</button>
          ))}
        </div>
        {son !== "aucune" && (
          <label className="flex items-center gap-2 text-white/60">
            {volume > 0.02 ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-40 accent-[#DEC2A3]" aria-label="Volume" />
          </label>
        )}
      </div>
      <div className="flex w-full max-w-md items-center justify-center gap-3">
        <button onClick={() => { setRunning(!running); if (!running && elapsed >= totalMs) setElapsed(0); }}
          className="flex items-center gap-2 rounded-full px-8 py-3.5 text-[14px] font-semibold text-navy-900 shadow-lg"
          style={{ background: GOLD, boxShadow: `0 10px 30px -6px ${GOLD}` }}>
          {running ? <><Pause size={16} fill="currentColor" /> Pause</> : <><Play size={16} fill="currentColor" /> {elapsed > 0 ? "Reprendre" : "Commencer"}</>}
        </button>
      </div>
    </div>
  );
}
