import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Feather, Heart, Image as ImageIcon, Loader2, X, Zap } from "lucide-react";
import { createIdee, fetchIdees, fetchLettres, transformerIdee } from "@/zy/lib/kairosApi";
import { apiPost } from "@/lib/api";
import { Lettres } from "@/zy/pages/Elan";

/* Élan, rangé dans le Vision Board : un tiroir à droite du canvas, trois volets.
   Idées (capture → validation vers le Plan d'action), Lettres à mon futur moi,
   et le mur d'inspiration (c'est le board « elan » du canvas). */

const EVT = "zayado:elan";
export const ouvrirElan = (onglet = "idees") => window.dispatchEvent(new CustomEvent(EVT, { detail: onglet }));
export const ONGLETS_ELAN = ["idees", "lettres", "mur"];

export function useElanEvenement(onOuvrir) {
  useEffect(() => {
    const f = (e) => onOuvrir(e.detail || "idees");
    window.addEventListener(EVT, f);
    return () => window.removeEventListener(EVT, f);
  }, [onOuvrir]);
}

function Idees() {
  const [idees, setIdees] = useState(null);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [enCours, setEnCours] = useState(null);
  const recharger = () => fetchIdees().then((d) => setIdees(Array.isArray(d) ? d : d?.items || [])).catch(() => setIdees([]));
  useEffect(() => { recharger(); }, []);

  const capturer = async (e) => {
    e.preventDefault();
    if (!texte.trim() || envoi) return;
    setEnvoi(true);
    try { await createIdee({ titre: texte.trim(), source: "manuelle" }); setTexte(""); recharger(); toast.success("Idée capturée."); }
    catch { toast.error("Impossible pour le moment."); }
    setEnvoi(false);
  };
  // Validation explicite : l'idée ne devient une action que sur ce clic.
  const valider = async (i) => {
    setEnCours(i.id);
    try {
      await apiPost("/copilote/plan-action/actions", { titre: i.titre.slice(0, 200), module: "Élan" });
      await transformerIdee(i.id, "action", {});
      recharger();
      toast.success("Ajoutée au Plan d'action.");
    } catch { toast.error("Impossible pour le moment."); }
    setEnCours(null);
  };
  const enAttente = (idees || []).filter((i) => i.statut !== "realisee");

  return (
    <div className="space-y-4" data-testid="elan-panneau-idees">
      <form onSubmit={capturer} className="flex gap-2">
        <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Une idée en tête ? Une ligne suffit."
          data-testid="elan-capture-input"
          className="h-10 min-w-0 flex-1 rounded-xl border border-white/12 bg-white/[0.06] px-3.5 text-[13.5px] text-offwhite placeholder:text-offwhite/35 focus:border-gold/50 focus:outline-none" />
        <button type="submit" disabled={envoi || !texte.trim()} data-testid="elan-capture-btn" className="btn-gold h-10 !px-3.5 disabled:opacity-50">
          {envoi ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Capturer
        </button>
      </form>
      <p className="text-[12px] leading-relaxed text-offwhite/45">Les idées de l'IA du canvas arrivent aussi ici. Aucune ne part dans ton Plan d'action sans ta validation.</p>
      <ul className="space-y-2">
        {enAttente.map((i) => (
          <li key={i.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3" data-testid={`elan-idee-${i.id}`}>
            <p className="text-[13.5px] font-semibold text-offwhite/95">{i.titre}</p>
            <p className="mt-0.5 text-[11.5px] text-offwhite/40">capturée le {new Date(i.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button onClick={() => valider(i)} disabled={enCours === i.id} data-testid={`elan-idee-valider-${i.id}`} className="btn-gold !px-3 !py-1.5 !text-[12px]">
                {enCours === i.id ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />} Valider → Plan d'action
              </button>
              <button onClick={() => toast("Gardée — elle reste dans ton Élan.")} data-testid={`elan-idee-garder-${i.id}`}
                className="inline-flex items-center gap-1 rounded-lg border border-white/12 px-3 py-1.5 text-[12px] font-semibold text-offwhite/65 transition-colors hover:text-offwhite">
                <Heart size={12} /> Garder
              </button>
            </div>
          </li>
        ))}
        {idees === null && <li className="flex items-center gap-2 text-[13px] text-offwhite/45"><Loader2 size={14} className="animate-spin" /> Chargement…</li>}
        {idees !== null && enAttente.length === 0 && (
          <li className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-[13px] text-offwhite/45" data-testid="elan-idees-vide">Rien en attente.</li>
        )}
      </ul>
    </div>
  );
}

function LettresVolet() {
  const [lettres, setLettres] = useState(null);
  const recharger = () => fetchLettres().then((d) => setLettres(d?.items || [])).catch(() => setLettres([]));
  useEffect(() => { recharger(); }, []);
  return <Lettres lettres={lettres} recharger={recharger} compact />;
}

export function ElanPanneau({ onglet, onOnglet, onFermer, onOuvrirMur, murActif }) {
  if (!onglet) return null;
  const VOLETS = [["idees", "Idées", Zap], ["lettres", "Lettres", Feather], ["mur", "Mur", ImageIcon]];
  return (
    <aside className="anim-tiroir absolute inset-y-0 right-0 z-[70] flex w-full max-w-[420px] flex-col border-l border-white/10 bg-navy-900/95 shadow-[-24px_0_48px_rgba(4,10,28,0.45)] backdrop-blur-xl"
      data-testid="elan-panneau">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-gold/30 bg-gold/10 text-gold"><Zap size={15} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-offwhite">Élan</p>
          <p className="text-[11.5px] text-offwhite/45">Ce qui te fait tenir — relié à ton Vision Board.</p>
        </div>
        <button onClick={onFermer} aria-label="Fermer Élan" data-testid="elan-panneau-fermer"
          className="rounded-lg border border-white/12 p-1.5 text-offwhite/60 transition-colors hover:text-offwhite"><X size={15} /></button>
      </div>
      <nav className="flex gap-1 px-4 pt-3" data-testid="elan-panneau-onglets">
        {VOLETS.map(([k, l, I]) => (
          <button key={k} onClick={() => onOnglet(k)} data-testid={`elan-onglet-${k}`}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${onglet === k ? "bg-gold text-navy-900" : "text-offwhite/65 hover:bg-white/10"}`}>
            <I size={13} /> {l}
          </button>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {onglet === "idees" && <Idees />}
        {onglet === "lettres" && <LettresVolet />}
        {onglet === "mur" && (
          <div className="space-y-3" data-testid="elan-panneau-mur">
            <p className="text-[13.5px] leading-relaxed text-offwhite/70">Ton mur d'inspiration est un board du canvas : photos, citations, vidéos, audio — ce qui te rappelle pourquoi tu persévères.</p>
            <button onClick={onOuvrirMur} disabled={murActif} data-testid="elan-ouvrir-mur" className="btn-gold !px-4 !py-2 !text-[12.5px] disabled:opacity-50">
              <ImageIcon size={14} /> {murActif ? "Mur ouvert sur le canvas" : "Ouvrir le mur sur le canvas"}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
