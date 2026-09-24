import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useKairos } from "@/context/KairosContext";
import { BatteryMedium, Brain, Smile } from "lucide-react";

const MOODS = ["épuisé", "fatigué", "neutre", "aligné", "rayonnant"];
const MOOD_FACES = ["😞", "🙁", "😐", "🙂", "😊"];
const MOTS_ENERGIE = ["À plat", "Basse", "Moyenne", "Bonne", "Au top"];
const MOTS_CHARGE = ["Légère", "Calme", "Chargée", "Lourde", "Débordée"];

// Check-in énergie 30 secondes.
export function EnergyCheckin({ open, onClose }) {
  const { energy, submitCheckin } = useKairos();
  const [score, setScore] = useState(energy.score);
  const [mental, setMental] = useState(energy.mental || 3);
  const [mood, setMood] = useState(4);

  const handleSubmit = () => {
    submitCheckin({ score, mental, mood: MOODS[mood - 1] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong border-white/10 text-offwhite sm:max-w-lg" data-testid="energy-checkin-modal">
        <DialogTitle className="sr-only">Check-in énergie</DialogTitle>
        <DialogDescription className="sr-only">Évalue ton énergie, ta charge mentale et ton humeur.</DialogDescription>
        <div className="py-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Check-in · 30 secondes</span>
          <h3 className="mt-2 font-display text-2xl font-bold">Comment te sens-tu, là, maintenant ?</h3>
          <p className="mt-1 text-sm text-offwhite/60">Aucune bonne réponse. On ajuste ta journée à ton énergie réelle.</p>

          <div className="mt-6 space-y-7">
            <CheckSlider
              icon={BatteryMedium} label="Niveau d'énergie" value={score} onChange={setScore}
              hint={MOTS_ENERGIE[score - 1]} testid="checkin-energy-slider"
            />
            <CheckSlider
              icon={Brain} label="Charge mentale" value={mental} onChange={setMental}
              hint={MOTS_CHARGE[mental - 1]} testid="checkin-mental-slider"
            />
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-offwhite">
                  <Smile className="h-4 w-4 text-gold" /> Humeur / alignement
                </span>
                <span className="text-sm font-semibold text-gold capitalize">{MOODS[mood - 1]}</span>
              </div>
              <Slider value={[mood]} onValueChange={(v) => setMood(v[0])} min={1} max={5} step={1} data-testid="checkin-mood-slider" />
              <div className="mt-3 grid grid-cols-5 gap-2" role="group" aria-label="Choisir son humeur">
                {MOOD_FACES.map((face, i) => {
                  const value = i + 1;
                  return <button key={face} type="button" onClick={() => setMood(value)} aria-label={MOODS[i]} aria-pressed={mood === value} data-testid={`checkin-mood-face-${value}`}
                    className={`flex h-11 items-center justify-center rounded-xl border text-2xl transition ${mood === value ? "border-gold/70 bg-gold/15 shadow-[0_0_0_2px_rgba(222,194,163,0.16)]" : "border-white/10 bg-white/[0.04] grayscale hover:border-white/25 hover:grayscale-0"}`}>
                    {face}
                  </button>;
                })}
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-offwhite/45">
                <span>Épuisé</span><span>Rayonnant</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1" data-testid="checkin-cancel-btn">Plus tard</button>
            <button onClick={handleSubmit} className="btn-gold flex-1" data-testid="checkin-submit-btn">Enregistrer mon état</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CheckSlider({ icon: Icon, label, value, onChange, hint, testid }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-offwhite">
          <Icon className="h-4 w-4 text-gold" /> {label}
        </span>
        <span className="text-sm font-semibold text-gold">{hint}</span>
      </div>
      <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={1} max={5} step={1} data-testid={testid} />
    </div>
  );
}
