import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { Mic, Square, Plus, Loader2, Sparkles } from "lucide-react";
import { createIdee, transcrireAudio } from "@/lib/kairosApi";

export function CaptureBar({ onCreated, autoFocus }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const submit = async () => {
    const titre = value.trim();
    if (!titre) return;
    setSaving(true);
    try {
      const idee = await createIdee({ titre, source: "manuelle" });
      onCreated?.(idee);
      setValue("");
    } catch { toast.error("Capture impossible."); }
    setSaving(false);
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 800) { setTranscribing(false); return; }
        setTranscribing(true);
        try {
          const { texte } = await transcrireAudio(blob);
          if (texte) setValue((v) => (v ? `${v} ${texte}` : texte));
          else toast.info("Rien n'a été capté, réessaie.");
        } catch { toast.error("Transcription indisponible."); }
        setTranscribing(false);
      };
      mr.start();
      recRef.current = mr;
      setRecording(true);
    } catch { toast.error("Micro inaccessible. Autorise l'accès au micro."); }
  };
  const stopRec = () => { recRef.current?.stop(); setRecording(false); };

  return (
    <div className="glass flex items-center gap-2 rounded-2xl p-2" data-testid="idea-capture-bar">
      <Sparkles size={16} className="ml-1.5 shrink-0 text-gold" />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={recording ? "🎙️ Je t'écoute…" : "Capture une idée en moins de 10 secondes…"}
        data-testid="idea-capture-input"
        className="flex-1 bg-transparent px-1 text-sm text-offwhite outline-none placeholder:text-offwhite/40"
      />
      {transcribing && <Loader2 size={16} className="animate-spin text-gold" />}
      <button
        onClick={recording ? stopRec : startRec}
        data-testid="idea-capture-mic"
        title={recording ? "Arrêter" : "Dicter"}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${recording ? "animate-pulse-glow bg-alert text-white" : "bg-white/8 text-offwhite/70 hover:bg-white/15 hover:text-gold"}`}
      >
        {recording ? <Square size={15} /> : <Mic size={16} />}
      </button>
      <button onClick={submit} disabled={saving || !value.trim()} data-testid="idea-capture-add"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold text-navy-900 transition hover:bg-gold-hover disabled:opacity-40">
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={17} />}
      </button>
    </div>
  );
}
