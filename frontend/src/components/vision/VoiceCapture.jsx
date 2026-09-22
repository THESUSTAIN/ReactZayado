import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { Mic, Square, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { transcrireAudio } from "@/lib/kairosApi";

/**
 * Capture vocale → carte Vision Board.
 * Enregistre via MediaRecorder, transcrit côté backend (/api/transcrire),
 * puis remonte le texte à onTranscribed(texte).
 */
export function VoiceCapture({ onTranscribed, className = "", compact = false }) {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const cleanup = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    setSeconds(0);
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return toast.error(t("vision.voice.micError"));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        cleanup();
        if (blob.size < 800) { setBusy(false); return; }
        setBusy(true);
        try {
          const { texte } = await transcrireAudio(blob);
          const clean = (texte || "").trim();
          if (clean) onTranscribed?.(clean);
          else toast.info(t("vision.voice.empty"));
        } catch {
          toast.error(t("vision.voice.error"));
        } finally {
          setBusy(false);
        }
      };
      mr.start();
      recRef.current = mr;
      setRecording(true);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      toast.error(t("vision.voice.micError"));
    }
  };

  const stop = () => {
    try { recRef.current?.stop(); } catch (_) {}
    setRecording(false);
  };

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  if (compact) {
    return (
      <button
        onClick={recording ? stop : start}
        disabled={busy}
        data-testid="vision-voice-compact"
        title={recording ? t("vision.voice.stop") : t("vision.voice.record")}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
          recording ? "animate-pulse bg-alert text-white" : "bg-white/8 text-offwhite/70 hover:bg-white/15 hover:text-gold"
        } ${className}`}
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : recording ? <Square size={14} /> : <Mic size={16} />}
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="vision-voice-capture">
      <button
        onClick={recording ? stop : start}
        disabled={busy}
        data-testid="vision-voice-btn"
        title={recording ? t("vision.voice.stop") : t("vision.voice.record")}
        className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
          recording
            ? "animate-pulse bg-alert text-white shadow-[0_0_20px_rgba(211,47,47,0.5)]"
            : "text-offwhite/60 hover:bg-gold/15 hover:text-gold"
        }`}
      >
        {busy ? <Loader2 size={17} className="animate-spin" /> : recording ? <Square size={16} /> : <Mic size={17} />}
      </button>
      {(recording || busy) && (
        <span className="whitespace-nowrap text-[11px] font-medium text-offwhite/70">
          {busy ? t("vision.voice.transcribing") : `${t("vision.voice.listening")} ${mmss}`}
        </span>
      )}
    </div>
  );
}

export default VoiceCapture;
