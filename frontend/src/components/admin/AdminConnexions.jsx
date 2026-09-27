import React, { useEffect, useState, useCallback } from "react";
import { Link2, Users, Layers, RefreshCw, Search } from "lucide-react";
import { fetchAdminConnexionsStats, fetchAdminConnexionsListe } from "@/lib/kairosApi";

const Carte = ({ children }) => <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">{children}</div>;

const Kpi = ({ icon: Icon, label, valeur }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-3">
    <div className="w-9 h-9 rounded-lg bg-gold/15 flex items-center justify-center shrink-0">
      <Icon size={16} className="text-gold" />
    </div>
    <div>
      <p className="text-lg font-bold leading-none">{valeur}</p>
      <p className="text-[11px] text-offwhite/55 mt-1">{label}</p>
    </div>
  </div>
);

export default function AdminConnexions() {
  const [stats, setStats] = useState(null);
  const [liste, setListe] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [erreur, setErreur] = useState(null);
  const [charge, setCharge] = useState(false);

  const rafraichir = useCallback(() => {
    setCharge(true);
    Promise.all([fetchAdminConnexionsStats(), fetchAdminConnexionsListe()])
      .then(([s, l]) => { setStats(s); setListe(l); setErreur(null); })
      .catch(() => setErreur("Accès refusé ou erreur serveur."))
      .finally(() => setCharge(false));
  }, []);

  useEffect(() => { rafraichir(); }, [rafraichir]);

  if (erreur) return <Carte><p className="text-red-300 text-sm">{erreur}</p></Carte>;
  if (!stats || !liste) return <Carte><p className="text-offwhite/50 text-sm">Chargement…</p></Carte>;

  const filtres = liste.filter((r) => {
    const q = recherche.trim().toLowerCase();
    if (!q) return true;
    return (r.user_email || "").toLowerCase().includes(q) || (r.provider || "").toLowerCase().includes(q);
  });
  const max = stats.per_provider[0]?.total || 1;

  return (
    <div className="space-y-5" data-testid="admin-connexions-tab">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-offwhite/55">
          Quelles intégrations vos utilisateurs connectent réellement à leur coffre-fort personnel
          (Notion, Slack, Brevo, GitHub…). Les identifiants restent chiffrés — jamais affichés ici.
        </p>
        <button onClick={rafraichir} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold shrink-0 ml-4">
          <RefreshCw size={13} className={charge ? "animate-spin" : ""} /> Rafraîchir
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Kpi icon={Link2} label="Connexions actives" valeur={stats.total_connections} />
        <Kpi icon={Users} label="Utilisateurs connectés" valeur={stats.users_with_connections} />
        <Kpi icon={Layers} label="Intégrations distinctes" valeur={stats.per_provider.length} />
      </div>

      <Carte>
        <p className="mb-3 font-semibold text-sm">Classement des intégrations les plus connectées</p>
        {stats.per_provider.length ? (
          <div className="space-y-2">
            {stats.per_provider.map((p) => (
              <div key={p.provider} className="flex items-center gap-3">
                <div className="w-28 shrink-0 text-xs font-semibold text-offwhite/70 capitalize">{p.provider.replace(/_/g, " ")}</div>
                <div className="flex-1 bg-white/5 rounded-full h-5 relative overflow-hidden">
                  <div className="bg-gold/70 h-full rounded-full flex items-center justify-end pr-2 text-[10px] font-bold text-navy" style={{ width: `${Math.max(8, Math.round((p.total / max) * 100))}%` }}>
                    {p.total}
                  </div>
                </div>
                <div className="w-24 text-right text-[11px] text-offwhite/45">{p.verified}/{p.total} actives</div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-offwhite/40">Aucune connexion pour le moment.</p>}
      </Carte>

      <Carte>
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-sm">Connexions récentes</p>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-offwhite/30" />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Email ou fournisseur…"
              className="bg-black/30 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs w-56" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-offwhite/45 text-left">
              <tr><th className="pb-2">Utilisateur</th><th className="pb-2">Fournisseur</th><th className="pb-2">Statut</th><th className="pb-2">Depuis</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtres.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5">{r.user_email}</td>
                  <td className="py-2.5 capitalize">{r.provider.replace(/_/g, " ")}</td>
                  <td className="py-2.5">{r.status === "ready" ? "Active" : r.status}</td>
                  <td className="py-2.5 text-offwhite/50">{r.created_at ? new Date(r.created_at).toLocaleDateString("fr-FR") : "—"}</td>
                </tr>
              ))}
              {!filtres.length && <tr><td colSpan={4} className="py-4 text-center text-offwhite/40">Aucun résultat.</td></tr>}
            </tbody>
          </table>
        </div>
      </Carte>
    </div>
  );
}
