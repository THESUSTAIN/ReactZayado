import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, FolderSync, Sparkles, ShieldCheck, Info, Check, ArrowLeft, Target } from "lucide-react";
import { Sidebar } from "@/components/kairos/Sidebar";
import { STATUTS } from "@/components/ideas/constants";
import { analyserSource, validerSource, fetchObjectifs } from "@/lib/kairosApi";

const TYPES = STATUTS.filter((s) => ["idee", "projet", "action"].includes(s.id));
const engage = (t) => t === "projet" || t === "action";

export default function Sources() {
  const navigate = useNavigate();
  const [contenu, setContenu] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [proposals, setProposals] = useState(null);
  const [note, setNote] = useState(null);
  const [objectifs, setObjectifs] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchObjectifs().then(setObjectifs).catch(() => {}); }, []);

  const analyser = async () => {
    if (contenu.trim().length < 3) return toast.error("Colle une URL ou un texte.");
    setAnalyzing(true);
    setProposals(null);
    try {
      const res = await analyserSource(contenu.trim());
      setProposals((res.proposals || []).map((p) => ({ ...p, keep: true, objectif_id: "" })));
      setNote(res.note || null);
      if (!res.proposals?.length) toast.info("Rien d'exploitable trouvé.");
    } catch { toast.error("Analyse impossible."); }
    setAnalyzing(false);
  };

  const setProp = (i, patch) => setProposals((p) => p.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const valider = async () => {
    const items = proposals.filter((p) => p.keep).map((p) => ({ titre: p.titre, type: p.type, objectif_id: p.objectif_id || null }));
    if (!items.length) return toast.error("Coche au moins un élément.");
    setSaving(true);
    try {
      const res = await validerSource(items);
      toast.success(`${res.crees} élément(s) rangé(s) dans Idées`);
      if (res.note) toast.info(res.note);
      navigate("/app/ideas");
    } catch { toast.error("Validation impossible."); }
    setSaving(false);
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-navy-900/70 px-4 py-3 backdrop-blur-2xl sm:px-6">
          <button onClick={() => navigate("/app/ideas")} data-testid="sources-back" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-offwhite/80 hover:bg-white/10"><ArrowLeft size={17} /></button>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold"><FolderSync size={17} /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Intégrations</p>
            <h1 className="truncate font-display text-lg font-bold text-offwhite sm:text-xl">Sources &amp; synchronisation</h1>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 pb-24 pt-5 sm:px-6" data-testid="sources-page">
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-gold/25 bg-gold/8 p-3.5 text-xs text-offwhite/70" data-testid="sources-rule-note">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-gold" />
            <p><b className="text-offwhite">Tu valides avant que je range.</b> L'IA propose un classement, rien n'est déplacé sans ton accord. Tes données Bien-être ne sont jamais mélangées à ces sources.</p>
          </div>

          <label className="mb-2 block text-sm font-semibold text-offwhite">Coller une source</label>
          <textarea
            value={contenu} onChange={(e) => setContenu(e.target.value)} rows={5}
            placeholder="Colle une URL (SharePoint, OneDrive, Drive, page web) ou directement le texte de tes notes…"
            data-testid="sources-input"
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-offwhite outline-none focus:border-gold/40 placeholder:text-offwhite/40"
          />
          <div className="mt-2 flex items-center gap-2 text-[11px] text-offwhite/45">
            <Info size={13} /> Connexion SharePoint / OneDrive sécurisée (Microsoft) — bientôt (V1.5). En attendant, colle le texte pour un classement fiable.
          </div>

          <button onClick={analyser} disabled={analyzing} data-testid="sources-analyze"
            className="btn-gold mt-4 w-full justify-center disabled:opacity-60">
            {analyzing ? <><Loader2 size={16} className="animate-spin" /> Analyse en cours…</> : <><Sparkles size={16} /> Analyser avec l'IA</>}
          </button>

          {note && <p className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-offwhite/60" data-testid="sources-info-note">{note}</p>}

          {proposals && proposals.length > 0 && (
            <div className="mt-6" data-testid="sources-proposals">
              <h3 className="mb-3 text-sm font-semibold text-offwhite">Classement proposé <span className="text-offwhite/40">— ajuste puis valide</span></h3>
              <div className="space-y-2.5">
                {proposals.map((p, i) => (
                  <div key={i} data-testid={`sources-proposal-${i}`}
                    className={`glass rounded-2xl p-3.5 transition ${p.keep ? "" : "opacity-50"}`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => setProp(i, { keep: !p.keep })} data-testid={`sources-keep-${i}`}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${p.keep ? "border-gold bg-gold text-navy-900" : "border-white/30"}`}>
                        {p.keep && <Check size={13} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-offwhite">{p.titre}</p>
                        {p.raison && <p className="mt-0.5 text-[11px] text-offwhite/45">{p.raison}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <select value={p.type} onChange={(e) => setProp(i, { type: e.target.value })} data-testid={`sources-type-${i}`}
                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-offwhite outline-none focus:border-gold/40">
                            {TYPES.map((t) => <option key={t.id} value={t.id} className="bg-navy-800">{t.label}</option>)}
                          </select>
                          {engage(p.type) && (
                            <select value={p.objectif_id} onChange={(e) => setProp(i, { objectif_id: e.target.value })} data-testid={`sources-objectif-${i}`}
                              className="flex items-center rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-offwhite outline-none focus:border-gold/40">
                              <option value="" className="bg-navy-800">Objectif ?</option>
                              {objectifs.map((o) => <option key={o.id} value={o.id} className="bg-navy-800">{o.titre}</option>)}
                            </select>
                          )}
                          {engage(p.type) && !p.objectif_id && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gold/80"><Target size={10} /> sans objectif → rangé en Idée</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={valider} disabled={saving} data-testid="sources-validate"
                className="btn-gold mt-4 w-full justify-center disabled:opacity-60">
                {saving ? <><Loader2 size={16} className="animate-spin" /> Rangement…</> : <><Check size={16} /> Valider et ranger dans Idées</>}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
