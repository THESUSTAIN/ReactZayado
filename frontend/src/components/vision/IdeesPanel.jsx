import React, { useEffect, useState } from "react";
import { Lightbulb, Loader2, Plus, ArrowUpRight } from "lucide-react";
import { fetchIdees } from "@/lib/kairosApi";

/**
 * Idées du Plan d'action, dans le Vision Board : on les épingle en un clic,
 * ou on en crée une nouvelle (elle apparaît aussi dans Plan d'action › Idées).
 */
const STATUTS = { idee: "Idée", test: "Test", projet: "Projet", action: "Action" };

export function IdeesPanel({ dejaEpinglees = [], onPin, onCreate, onOpenPlan }) {
  const [liste, setListe] = useState(null);
  const [saisie, setSaisie] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    let vivant = true;
    fetchIdees().then((d) => { if (vivant) setListe(Array.isArray(d) ? d : d?.items || d?.idees || []); }).catch(() => { if (vivant) setListe([]); });
    return () => { vivant = false; };
  }, []);

  const creer = async () => {
    const titre = saisie.trim();
    if (!titre || envoi) return;
    setEnvoi(true);
    try {
      const idee = await onCreate(titre);
      if (idee) setListe((l) => [idee, ...(l || [])]);
      setSaisie("");
    } finally { setEnvoi(false); }
  };

  return (
    <div data-testid="vision-idees-panel">
      <p className="sf-menu-title" style={{ padding: "0 0 8px" }}>Mes idées · reliées au Plan d'action</p>
      <div className="flex gap-2">
        <input value={saisie} onChange={(e) => setSaisie(e.target.value)} onKeyDown={(e) => e.key === "Enter" && creer()}
          placeholder="Nouvelle idée…" className="sf-field min-w-0 flex-1" data-testid="vision-idee-nouvelle" />
        <button type="button" onClick={creer} disabled={!saisie.trim() || envoi} className="sf-btn sf-btn-primary shrink-0" data-testid="vision-idee-ajouter">
          {envoi ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Ajouter
        </button>
      </div>
      <div className="sf-scroll mt-3 max-h-[300px] space-y-1.5 overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
        {liste === null && <p className="sf-small flex items-center gap-2 py-3" style={{ fontSize: 13 }}><Loader2 size={14} className="animate-spin" /> Chargement…</p>}
        {liste && !liste.length && <p className="sf-small py-3" style={{ fontSize: 13 }}>Aucune idée pour l'instant. Écris la première ci-dessus : elle sera aussi dans ton Plan d'action.</p>}
        {(liste || []).map((idee) => {
          const epinglee = dejaEpinglees.includes(idee.id);
          return (
            <div key={idee.id} className="flex items-center gap-2 rounded-xl p-2.5" style={{ background: "var(--sf-card)" }} data-testid={`vision-idee-${idee.id}`}>
              <Lightbulb size={15} style={{ color: "var(--sf-accent)", flexShrink: 0 }} />
              <div className="min-w-0 flex-1">
                <p className="sf-text truncate" style={{ fontSize: 13.5, fontWeight: 600 }}>{idee.titre}</p>
                <p className="sf-small" style={{ fontSize: 11.5 }}>{STATUTS[idee.statut] || "Idée"}{idee.vers_type ? ` → ${idee.vers_type === "objectif" ? "objectif" : "action"}` : ""}</p>
              </div>
              <button type="button" onClick={() => onPin(idee)} disabled={epinglee} className="sf-btn shrink-0" style={{ height: 30, fontSize: 12 }} data-testid={`vision-idee-epingler-${idee.id}`}>
                {epinglee ? "Épinglée" : "Épingler"}
              </button>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={onOpenPlan} className="sf-btn sf-btn-outline mt-3 w-full justify-center" style={{ height: 34 }} data-testid="vision-idees-ouvrir-plan">
        <ArrowUpRight size={14} /> Ouvrir mes idées (Plan d'action)
      </button>
    </div>
  );
}
