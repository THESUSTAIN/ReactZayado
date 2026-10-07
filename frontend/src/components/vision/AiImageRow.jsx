import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { call, imageIaUrl } from "@/lib/part2Api";
import { fetchIaStatut } from "@/lib/kairosApi";

// Ligne « générer avec l'IA » pour l'éditeur d'image d'une carte du Vision Board.
// onPick(url) reçoit l'adresse de l'image générée (à passer à editImage).
export function AiImageRow({ onPick }) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [dispo, setDispo] = useState(true);

  useEffect(() => {
    fetchIaStatut().then((d) => { if (d && d.images_ia === false) setDispo(false); }).catch(() => {});
  }, []);

  const generer = async () => {
    if (busy || prompt.trim().length < 3) return;
    setBusy(true);
    try {
      const r = await call("/vision/image", "POST", { prompt: prompt.trim() });
      onPick(imageIaUrl(r.id));
      toast.success(`Image générée — ${r.restant} restante(s) aujourd'hui`);
    } catch (e) {
      toast.error(e.message || "Génération impossible");
    } finally {
      setBusy(false);
    }
  };

  if (!dispo) {
    return (
      <p className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[10.5px] text-white/60" data-testid="vision-ai-image-off">
        Images IA bientôt disponibles — ajoute ta propre photo en attendant.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && generer()}
        placeholder="✨ Décris l'image à générer…"
        data-testid="vision-ai-image-prompt"
        className="min-w-0 flex-1 rounded-md border border-gold/40 bg-white/10 px-2 py-1.5 text-[11px] text-white outline-none placeholder:text-white/50"
      />
      <button
        onClick={generer}
        disabled={busy}
        data-testid="vision-ai-image-go"
        title="Générer avec l'IA"
        className="flex h-7 w-7 items-center justify-center rounded-md bg-gold text-navy-900 disabled:opacity-60"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
      </button>
    </div>
  );
}
