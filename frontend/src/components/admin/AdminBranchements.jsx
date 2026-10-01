import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { fetchSourcesRadar } from "@/lib/kairosApi";
import { SourcesRadar } from "@/components/kairos/RadarSignaux";
import IntegrationsSection from "@/components/kairos/IntegrationsSection";

// Branchements techniques de la plateforme (clés, variables Railway, sources du Radar).
// Avant : affichés aux admins au milieu des pages utilisateur (Radar, Paramètres).
export default function AdminBranchements() {
  const [src, setSrc] = useState(undefined);
  useEffect(() => { fetchSourcesRadar().then(setSrc).catch(() => setSrc(null)); }, []);
  return (
    <div className="space-y-5" data-testid="admin-branchements">
      {src === undefined ? <Loader2 className="h-5 w-5 animate-spin text-gold" />
        : src?.sources ? <SourcesRadar d={src} /> : <p className="text-sm text-offwhite/60">Sources du Radar indisponibles.</p>}
      <IntegrationsSection />
    </div>
  );
}
