import React, { useState, useEffect, useCallback } from "react";
import { Mail, RefreshCw, Send, Edit3, Trash2, CheckCircle2, Clock, AlertCircle, Sparkles, ExternalLink, X, RotateCw } from "lucide-react";
import { toast } from "sonner";
import {
  fetchNewsletters, fetchNewsletter, majNewsletter, relancerNewsletter, rejeterNewsletter, pousserNewsletterBrevo,
} from "@/lib/kairosApi";

const Carte = ({ children }) => <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">{children}</div>;
const CHAMP = "w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-offwhite placeholder:text-offwhite/30";

const STATUTS = {
  draft: [Clock, "bg-gold/15 text-gold", "Brouillon"],
  validated: [CheckCircle2, "bg-sky-500/15 text-sky-300", "Validé"],
  pushed_to_brevo: [ExternalLink, "bg-emerald-500/15 text-emerald-300", "Dans Brevo"],
  rejected: [X, "bg-white/10 text-offwhite/40", "Rejeté"],
  failed: [AlertCircle, "bg-red-500/15 text-red-300", "Échec IA"],
};
const Badge = ({ statut }) => {
  const [Icon, cls, lib] = STATUTS[statut] || [Clock, "bg-white/10 text-offwhite/50", statut];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}><Icon size={11} /> {lib}</span>;
};

export default function AdminNewsletters() {
  const [liste, setListe] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [edition, setEdition] = useState(null);
  const [busy, setBusy] = useState(false);

  const charger = useCallback(() => {
    fetchNewsletters().then(setListe).catch(() => setErreur("Accès refusé ou erreur serveur."));
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const ouvrir = async (id) => {
    try { setEdition(await fetchNewsletter(id)); } catch { toast.error("Impossible d'ouvrir ce brouillon."); }
  };
  const sauver = async () => {
    if (!edition) return;
    setBusy(true);
    try {
      await majNewsletter(edition.id, {
        rewritten_subject: edition.rewritten_subject, rewritten_html: edition.rewritten_html,
        rewritten_text: edition.rewritten_text, summary: edition.summary,
      });
      toast.success("Brouillon sauvegardé.");
      charger();
    } catch (e) { toast.error(e?.message || "Échec de la sauvegarde."); }
    setBusy(false);
  };
  const pousser = async () => {
    if (!edition) return;
    setBusy(true);
    try {
      const r = await pousserNewsletterBrevo(edition.id);
      toast.success("Brouillon créé dans Brevo — validation finale et envoi à faire là-bas.");
      window.open(r.brevo_url, "_blank");
      setEdition(null);
      charger();
    } catch (e) { toast.error(e?.message || "Échec Brevo."); }
    setBusy(false);
  };
  const relancer = async (id) => {
    try { await relancerNewsletter(id); toast.success("Reformulation relancée (~10 s)."); setTimeout(charger, 8000); }
    catch (e) { toast.error(e?.message || "Impossible de relancer."); }
  };
  const rejeter = async (id) => {
    try { await rejeterNewsletter(id); toast.success("Rejeté."); charger(); }
    catch (e) { toast.error(e?.message || "Impossible de rejeter."); }
  };

  if (erreur) return <Carte><p className="text-red-400 text-sm">{erreur}</p></Carte>;
  if (!liste) return <Carte><p className="text-offwhite/50 text-sm">Chargement…</p></Carte>;

  return (
    <div className="space-y-4">
      <Carte>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} className="text-gold" /> Newsletters préparées</p>
            <p className="text-xs text-offwhite/50 mt-0.5">Versions reformulées au ton Zayado — prêtes à valider et pousser en brouillon Brevo.</p>
          </div>
          <button className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-offwhite/70 hover:bg-white/10" onClick={charger}>
            <RefreshCw size={13} className="inline mr-1.5 -mt-0.5" /> Rafraîchir
          </button>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-gold/20 bg-gold/[0.06] p-3 text-xs text-offwhite/70">
          <Mail size={14} className="mt-0.5 shrink-0 text-gold" />
          <p>
            Abonne-toi à des newsletters externes avec l'email de veille configuré sur Brevo Inbound Parse.
            Chaque email reçu est automatiquement reformulé par l'IA au ton Zayado et apparaît ici en brouillon —
            valide, corrige si besoin, puis pousse vers Brevo pour l'envoi final (l'envoi se fait dans Brevo, pas ici).
          </p>
        </div>
      </Carte>

      <Carte>
        <div className="space-y-2">
          {liste.length === 0 && <p className="text-sm text-offwhite/40">Aucune newsletter préparée pour le moment.</p>}
          {liste.map((r) => (
            <div key={r.id} className="rounded-lg border border-white/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <button className="min-w-0 flex-1 text-left" onClick={() => ouvrir(r.id)}>
                  <span className="text-sm font-medium">{r.rewritten_subject || <span className="italic text-offwhite/40">(en attente)</span>}</span>
                  {r.summary && <p className="truncate text-xs text-offwhite/45 mt-0.5">{r.summary}</p>}
                  <p className="truncate text-[11px] text-offwhite/35 mt-0.5">Source : {r.source_subject || "—"} · {r.source_sender}</p>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge statut={r.status} />
                  <button className="rounded p-1.5 text-offwhite/50 hover:bg-white/10 hover:text-offwhite" title="Ouvrir" onClick={() => ouvrir(r.id)}><Edit3 size={15} /></button>
                  <button className="rounded p-1.5 text-offwhite/50 hover:bg-white/10 hover:text-offwhite" title="Reformuler à nouveau" onClick={() => relancer(r.id)}><RotateCw size={15} /></button>
                  <button className="rounded p-1.5 text-red-400/70 hover:bg-red-500/10 hover:text-red-400" title="Rejeter" onClick={() => rejeter(r.id)}><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Carte>

      {edition && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-900/70 p-3 backdrop-blur-md sm:p-6"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setEdition(null); }}>
          <div className="flex w-full max-w-2xl max-h-[88vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101c38]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div>
                <p className="text-sm font-bold">Modifier le brouillon</p>
                <p className="text-[11px] text-offwhite/45">Source : {edition.source_subject || "—"}</p>
              </div>
              <button className="rounded-full border border-white/10 bg-white/5 p-1.5 text-offwhite/60 hover:text-offwhite" onClick={() => setEdition(null)}><X size={15} /></button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-offwhite/50">Sujet (60 caractères idéal)</label>
                <input className={CHAMP} value={edition.rewritten_subject || ""} onChange={(e) => setEdition({ ...edition, rewritten_subject: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-offwhite/50">Résumé court (liste admin)</label>
                <textarea className={CHAMP} rows={2} value={edition.summary || ""} onChange={(e) => setEdition({ ...edition, summary: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-offwhite/50">Corps HTML</label>
                <textarea className={`${CHAMP} font-mono text-xs`} rows={9} value={edition.rewritten_html || ""} onChange={(e) => setEdition({ ...edition, rewritten_html: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-offwhite/50">Prévisualisation</label>
                <div className="rounded-lg bg-white p-3 text-sm text-black" dangerouslySetInnerHTML={{ __html: edition.rewritten_html || "" }} />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-5 py-3">
              <span className="flex items-center gap-1.5 text-xs text-offwhite/50"><Clock size={13} /> <Badge statut={edition.status} /></span>
              <div className="flex gap-2">
                <button className="rounded-lg px-4 py-2 text-sm text-offwhite/70 hover:bg-white/10" onClick={() => setEdition(null)}>Annuler</button>
                <button className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-offwhite disabled:opacity-50" disabled={busy} onClick={sauver}>Sauvegarder</button>
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy disabled:opacity-50" disabled={busy} onClick={pousser}>
                  <Send size={14} /> Pousser dans Brevo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
