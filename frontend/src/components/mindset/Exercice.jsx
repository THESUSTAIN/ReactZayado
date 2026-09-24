import React, { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, PenLine } from "lucide-react";
import { envoyerReponses } from "@/lib/kairosApi";

// Bloc commun : une idée, une consigne, des réponses écrites.
// Utilisé par la carte du jour et par chaque jour de parcours.
export default function Exercice({ source, refId, idee, exercice, questions = [], reponses = null, onFait, libelle = "J'ai fait l'exercice", compact = false }) {
  const [valeurs, setValeurs] = useState(() => questions.map((q, i) => reponses?.[i]?.reponse || ""));
  const [envoi, setEnvoi] = useState(false);
  const deja = !!reponses;

  const valider = async () => {
    if (!valeurs.some((v) => v.trim())) { toast.error("Écris au moins une réponse."); return; }
    setEnvoi(true);
    try {
      const r = await envoyerReponses(source, refId, valeurs);
      if (r.victoire) toast.success(`🏆 ${r.victoire} — ajouté à tes victoires`);
      else toast.success(deja ? "Réponses mises à jour" : "Bravo, c'est noté dans ton carnet");
      onFait?.(r);
    } catch (e) { toast.error(e.message || "Enregistrement impossible"); }
    setEnvoi(false);
  };

  return (
    <div data-testid={`exercice-${refId}`}>
      {idee && <p className={`font-serif-italic leading-relaxed text-offwhite/90 ${compact ? "text-[15px]" : "text-[17px]"}`}>{idee}</p>}
      {exercice && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/[0.07] px-4 py-3 text-[13.5px] leading-relaxed text-offwhite/85">
          <PenLine size={15} className="mt-0.5 shrink-0 text-gold" /> <span><b className="font-semibold text-gold">Exercice · 5 min</b> — {exercice}</span>
        </p>
      )}
      <div className="mt-4 space-y-3">
        {questions.map((q, i) => (
          <label key={q} className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-offwhite/75">{q}</span>
            <textarea rows={2} value={valeurs[i]} onChange={(e) => setValeurs((v) => v.map((x, k) => (k === i ? e.target.value : x)))}
              className="w-full resize-y rounded-xl border border-white/[0.14] bg-white/[0.08] px-3.5 py-2.5 text-[14px] leading-relaxed text-offwhite outline-none placeholder:text-offwhite/40 focus:border-gold/60"
              data-testid={`exercice-q-${i}`} />
          </label>
        ))}
      </div>
      <button onClick={valider} disabled={envoi}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-5 text-[13px] font-semibold text-navy-900 disabled:opacity-60"
        data-testid="exercice-valider">
        {envoi ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {deja ? "Mettre à jour" : libelle}
      </button>
    </div>
  );
}
