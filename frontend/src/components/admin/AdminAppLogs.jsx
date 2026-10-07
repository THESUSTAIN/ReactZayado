import React, { useEffect, useState, useCallback } from "react";
import { ScrollText, AlertTriangle, Info, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetchAppLogs, fetchAppLogsSummary, purgerAppLogs } from "@/lib/kairosApi";

const Carte = ({ children }) => <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">{children}</div>;

const NIVEAU_STYLE = {
  INFO: "bg-white/10 text-offwhite/70",
  WARNING: "bg-amber-500/15 text-amber-300",
  ERROR: "bg-red-500/15 text-red-300",
  CRITICAL: "bg-red-600/25 text-red-200",
};

const Kpi = ({ icon: Icon, label, valeur, alerte }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-3">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${alerte ? "bg-red-500/15" : "bg-gold/15"}`}>
      <Icon size={16} className={alerte ? "text-red-300" : "text-gold"} />
    </div>
    <div>
      <p className="text-lg font-bold leading-none">{valeur}</p>
      <p className="text-[11px] text-offwhite/55 mt-1">{label}</p>
    </div>
  </div>
);

export default function AdminAppLogs() {
  const [resume, setResume] = useState(null);
  const [logs, setLogs] = useState(null);
  const [niveau, setNiveau] = useState("");
  const [feature, setFeature] = useState("");
  const [recherche, setRecherche] = useState("");
  const [erreur, setErreur] = useState(null);
  const [charge, setCharge] = useState(false);
  const [purge, setPurge] = useState(false);

  const rafraichir = useCallback(() => {
    setCharge(true);
    Promise.all([
      fetchAppLogsSummary(),
      fetchAppLogs({ level: niveau, feature, search: recherche, limit: 100 }),
    ])
      .then(([r, l]) => { setResume(r); setLogs(l); setErreur(null); })
      .catch(() => setErreur("Accès refusé ou erreur serveur."))
      .finally(() => setCharge(false));
  }, [niveau, feature, recherche]);

  useEffect(() => { rafraichir(); }, [rafraichir]);

  const purgerAnciens = async () => {
    setPurge(true);
    try {
      const r = await purgerAppLogs(30);
      toast.success(`${r.deleted} log(s) de plus de 30 jours supprimé(s).`);
      rafraichir();
    } catch (e) {
      toast.error(e.message || "Purge impossible.");
    } finally {
      setPurge(false);
    }
  };

  if (erreur) return <Carte><p className="text-red-300 text-sm">{erreur}</p></Carte>;
  if (!resume || !logs) return <Carte><p className="text-offwhite/50 text-sm">Chargement…</p></Carte>;

  const totalErreurs24h = (resume.by_level.ERROR || 0) + (resume.by_level.CRITICAL || 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={Info} label="Événements (24h)" valeur={Object.values(resume.by_level).reduce((a, b) => a + b, 0)} />
        <Kpi icon={AlertTriangle} label="Erreurs / critiques (24h)" valeur={totalErreurs24h} alerte={totalErreurs24h > 0} />
        <Kpi icon={ScrollText} label="Total affiché" valeur={logs.total} />
        <button onClick={rafraichir} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-center gap-2 text-sm text-offwhite/70 hover:bg-white/10">
          <RefreshCw size={15} className={charge ? "animate-spin" : ""} /> Actualiser
        </button>
      </div>

      {totalErreurs24h > 0 && (
        <Carte>
          <p className="text-offwhite/50 text-xs uppercase tracking-wide mb-3">Dernières erreurs (24h)</p>
          <div className="space-y-1.5">
            {resume.last_errors.map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-sm">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${NIVEAU_STYLE[e.level]}`}>{e.level}</span>
                <span className="text-offwhite/50 text-xs shrink-0">{e.feature}</span>
                <span className="truncate text-offwhite/80">{e.message}</span>
              </div>
            ))}
          </div>
        </Carte>
      )}

      <Carte>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 flex-1 min-w-[180px]">
            <Search size={13} className="text-offwhite/40 shrink-0" />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher dans les messages…"
              className="bg-transparent text-sm outline-none w-full placeholder:text-offwhite/40" />
          </div>
          <select value={niveau} onChange={(e) => setNiveau(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm">
            <option value="">Tous niveaux</option>
            {["INFO", "WARNING", "ERROR", "CRITICAL"].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={feature} onChange={(e) => setFeature(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm">
            <option value="">Toutes fonctionnalités</option>
            {Object.keys(resume.by_feature).map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <button onClick={purgerAnciens} disabled={purge}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-offwhite/60 hover:bg-white/10 disabled:opacity-50">
            <Trash2 size={13} /> Purger &gt; 30j
          </button>
        </div>

        {logs.logs.length === 0 && <p className="text-sm text-offwhite/50">Aucun log pour ces filtres.</p>}
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-offwhite/50 border-b border-white/10">
              <th className="pb-2">Niveau</th><th className="pb-2">Fonctionnalité</th><th className="pb-2">Message</th><th className="pb-2">Utilisateur</th><th className="pb-2">Quand</th>
            </tr>
          </thead>
          <tbody>
            {logs.logs.map((l) => (
              <tr key={l.id} className="border-b border-white/5 align-top">
                <td className="py-2.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${NIVEAU_STYLE[l.level] || "bg-white/10"}`}>{l.level}</span></td>
                <td className="py-2.5 text-offwhite/70">{l.feature}</td>
                <td className="py-2.5 max-w-[420px] truncate" title={l.message}>{l.message}</td>
                <td className="py-2.5 text-offwhite/50 text-xs">{l.user_email || "—"}</td>
                <td className="py-2.5 text-offwhite/50 text-xs whitespace-nowrap">{l.created_at ? new Date(l.created_at).toLocaleString("fr-FR") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </Carte>
    </div>
  );
}
