import React, { useEffect, useState } from "react";
import { Loader2, RefreshCw, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { apiPost, errorMessage } from "@/lib/api";
import { fetchSourcesRadar } from "@/zy/lib/kairosApi";
import { SourcesRadar } from "@/zy/components/kairos/RadarSignaux";
import IntegrationsSection from "@/zy/components/kairos/IntegrationsSection";

// Branchements techniques de la plateforme (clés, variables Railway, sources du Radar).
// Avant : affichés aux admins au milieu des pages utilisateur (Radar, Paramètres).
export default function AdminBranchements() {
  const [src, setSrc] = useState(undefined);
  const [purge, setPurge] = useState(false);
  useEffect(() => { fetchSourcesRadar().then(setSrc).catch(() => setSrc(null)); }, []);

  async function viderCacheActu() {
    setPurge(true);
    try {
      const r = await apiPost("/admin/actualite/vider-cache");
      toast.success(`Cache d'actualité vidé pour ${r.comptes} compte(s) — chacun reprend un bref frais à l'ouverture.`);
    } catch (e) {
      toast.error(errorMessage(e, "Purge impossible."));
    } finally {
      setPurge(false);
    }
  }

  return (
    <div className="space-y-5" data-testid="admin-branchements">
      {src === undefined ? <Loader2 className="h-5 w-5 animate-spin text-gold" />
        : src?.sources ? <SourcesRadar d={src} /> : <p className="text-sm text-offwhite/60">Sources du Radar indisponibles.</p>}
      <IntegrationsSection />
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5" data-testid="admin-actu-cache">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold"><Newspaper size={16} /> Actualité — cache des brefs</h3>
        <p className="mt-1 text-sm text-offwhite/60">
          Chaque compte garde son bref du jour (et le navigateur le sien). Après un changement de sources ou de
          gabarit, vide le cache : tous les comptes reprennent un bref frais à leur prochaine ouverture.
        </p>
        <button onClick={viderCacheActu} disabled={purge} data-testid="actu-vider-cache"
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm text-gold hover:bg-gold/20 disabled:opacity-50">
          <RefreshCw size={14} className={purge ? "animate-spin" : ""} /> {purge ? "Purge en cours…" : "Vider le cache de tous les comptes"}
        </button>
      </div>
    </div>
  );
}
