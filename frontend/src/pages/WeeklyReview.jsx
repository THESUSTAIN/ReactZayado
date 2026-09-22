import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Sparkles, Loader2, Check, History,
  BatteryMedium, Send, RotateCcw,
} from "lucide-react";
import { Sidebar } from "@/components/kairos/Sidebar";
import { LanguageSwitcher } from "@/components/kairos/LanguageSwitcher";
import { VoiceCapture } from "@/components/vision/VoiceCapture";
import { useI18n } from "@/i18n";
import {
  fetchRevue, postRevueSynthese, fetchRevueHistorique, fetchBoard, saveBoard,
} from "@/lib/kairosApi";

const STEPS = ["q1", "q2", "q3", "q4", "q5"];

export default function WeeklyReview() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [synth, setSynth] = useState(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const taRef = useRef(null);

  useEffect(() => {
    fetchRevue()
      .then((r) => {
        setMeta(r);
        if (r?.derniere?.reponses) setAnswers(r.derniere.reponses);
        if (r?.derniere?.synthese && r?.derniere?.semaine === r?.semaine) setSynth(r.derniere.synthese);
      })
      .catch(() => setMeta({ semaine: new Date().toISOString().slice(0, 10) }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { taRef.current?.focus(); }, [step]);

  const key = STEPS[step];
  const filled = useMemo(() => STEPS.filter((k) => (answers[k] || "").trim()).length, [answers]);
  const isLast = step === STEPS.length - 1;

  const setAnswer = (v) => setAnswers((a) => ({ ...a, [key]: v }));
  const appendVoice = (texte) => setAnswers((a) => ({ ...a, [key]: a[key] ? `${a[key]} ${texte}` : texte }));

  const loadHistory = async () => {
    setShowHistory((v) => !v);
    if (history.length) return;
    try { const r = await fetchRevueHistorique(); setHistory(r.revues || []); } catch { /* silencieux */ }
  };

  const runSynthesis = async () => {
    if (!filled) return toast.error(t("review.placeholder"));
    setBusy(true);
    try {
      const r = await postRevueSynthese({ reponses: answers, langue: lang });
      setSynth(r.synthese);
      toast.success(t("review.saved"));
      setHistory([]);
    } catch {
      toast.error(t("review.error"));
    } finally {
      setBusy(false);
    }
  };

  const sendPriorityToBoard = async () => {
    const priority = (answers.q5 || "").trim();
    if (!priority) return;
    try {
      const { cards } = await fetchBoard("perso");
      const next = [
        ...(cards || []),
        {
          id: `rev_${Date.now()}`, type: "sticky", stickyColor: "green",
          x: 260, y: 300, w: 240, h: 200, rotate: -3,
          label: t("review.title").toUpperCase(), tags: ["elan"],
          body: { fr: priority, en: priority },
        },
      ];
      await saveBoard(next, "perso");
      toast.success(t("review.sentToBoard"));
    } catch {
      toast.error(t("common.unavailable"));
    }
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-navy-900/70 px-4 py-3 backdrop-blur-2xl sm:px-6">
          <button onClick={() => navigate("/app")} data-testid="review-back"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-offwhite/80 transition hover:bg-white/10">
            <ArrowLeft size={17} />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Kairos</p>
            <h1 className="truncate font-display text-lg font-bold text-offwhite sm:text-xl">{t("review.title")}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <button onClick={loadHistory} data-testid="review-history-toggle"
              className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-medium text-offwhite/80 transition hover:bg-white/10">
              <History size={14} /> <span className="hidden sm:inline">{t("review.history")}</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6" data-testid="weekly-review">
          {loading ? (
            <div className="flex items-center gap-2 py-16 text-sm text-offwhite/60">
              <Loader2 size={16} className="animate-spin" /> {t("common.loading")}
            </div>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold text-gold">
                  {t("review.week", { date: meta?.semaine || "" })}
                </span>
                <span className="text-[11px] text-offwhite/50">{t("review.subtitle")}</span>
                {typeof meta?.energie_moyenne === "number" && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-offwhite/60">
                    <BatteryMedium size={13} className="text-gold" />
                    {t("review.energyAvg", { n: meta.energie_moyenne })}
                  </span>
                )}
              </div>

              <p className="mb-6 max-w-xl text-sm leading-relaxed text-offwhite/60">{t("review.intro")}</p>

              {/* Progression */}
              <div className="mb-5 flex gap-1.5" data-testid="review-progress">
                {STEPS.map((s, i) => (
                  <button key={s} onClick={() => setStep(i)}
                    className={`h-1.5 flex-1 rounded-full transition ${
                      i === step ? "bg-gold" : (answers[s] || "").trim() ? "bg-gold/45" : "bg-white/12"
                    }`} />
                ))}
              </div>

              {/* Question courante */}
              <div className="glass rounded-2xl p-5 sm:p-6" data-testid={`review-step-${step + 1}`}>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
                  {t("review.step", { n: step + 1, total: STEPS.length })}
                </p>
                <h2 className="font-display text-xl font-bold leading-snug text-offwhite sm:text-2xl">
                  {t(`review.${key}`)}
                </h2>
                <p className="mt-1.5 text-[13px] text-offwhite/55">{t(`review.${key}h`)}</p>

                <textarea
                  ref={taRef}
                  value={answers[key] || ""}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) isLast ? runSynthesis() : setStep((s) => s + 1); }}
                  rows={5}
                  placeholder={t("review.placeholder")}
                  data-testid={`review-answer-${key}`}
                  className="mt-4 w-full resize-none rounded-xl border border-white/12 bg-white/5 px-3.5 py-3 text-sm leading-relaxed text-offwhite outline-none focus:border-gold placeholder:text-offwhite/35"
                />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <VoiceCapture onTranscribed={appendVoice} compact />
                  <span className="text-[11px] text-offwhite/40">{t("review.micHint")}</span>

                  <div className="ml-auto flex items-center gap-2">
                    {step > 0 && (
                      <button onClick={() => setStep((s) => s - 1)} data-testid="review-prev"
                        className="rounded-xl border border-white/12 px-3 py-2 text-xs font-medium text-offwhite/75 transition hover:bg-white/10">
                        {t("common.back")}
                      </button>
                    )}
                    {!isLast ? (
                      <button onClick={() => setStep((s) => s + 1)} data-testid="review-next"
                        className="flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2 text-xs font-bold text-navy-900 transition hover:opacity-90">
                        {t("common.next")} <ArrowRight size={13} />
                      </button>
                    ) : (
                      <button onClick={runSynthesis} disabled={busy} data-testid="review-synthesis"
                        className="flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2 text-xs font-bold text-navy-900 transition hover:opacity-90 disabled:opacity-50">
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                        {busy ? t("review.synthesizing") : t("review.synth")}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Synthèse Kairos */}
              {synth && (
                <div className="glass-strong mt-5 rounded-2xl border-gold/30 p-5 sm:p-6" data-testid="review-synthesis-card">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/15 text-gold"><Sparkles size={15} /></span>
                    <h3 className="font-display text-base font-bold text-offwhite">{t("review.synthTitle")}</h3>
                    <Check size={15} className="ml-auto text-emerald-400" />
                  </div>
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-offwhite/85">{synth}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(answers.q5 || "").trim() && (
                      <button onClick={sendPriorityToBoard} data-testid="review-to-board"
                        className="flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3.5 py-2 text-xs font-semibold text-gold transition hover:bg-gold/20">
                        <Send size={13} /> {t("review.toBoard")}
                      </button>
                    )}
                    <button onClick={() => { setSynth(null); setStep(0); }} data-testid="review-reopen"
                      className="flex items-center gap-1.5 rounded-xl border border-white/12 px-3.5 py-2 text-xs font-medium text-offwhite/75 transition hover:bg-white/10">
                      <RotateCcw size={13} /> {t("review.reopen")}
                    </button>
                  </div>
                </div>
              )}

              {/* Historique */}
              {showHistory && (
                <section className="mt-6" data-testid="review-history">
                  <h3 className="mb-3 font-display text-base font-bold text-offwhite">{t("review.history")}</h3>
                  {history.length === 0 ? (
                    <p className="text-sm text-offwhite/50">{t("review.noHistory")}</p>
                  ) : (
                    <div className="space-y-3">
                      {history.map((r) => (
                        <div key={r.id} className="glass rounded-xl p-4">
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-gold">{t("review.week", { date: r.semaine })}</span>
                            {typeof r.energie_moyenne === "number" && (
                              <span className="text-[10.5px] text-offwhite/45">{t("review.energyAvg", { n: r.energie_moyenne })}</span>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-offwhite/75">{r.synthese}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
