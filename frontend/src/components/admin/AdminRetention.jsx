import React, { useEffect, useState } from "react";
import { TrendingUp, Users, Repeat, Sparkles } from "lucide-react";
import { fetchAdminRetention } from "@/lib/kairosApi";

function Carte({ children, className = "" }) {
  return <div className={`min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 ${className}`}>{children}</div>;
}
function Kpi({ label, valeur, note, or }) {
  return (
    <Carte>
      <p className="text-offwhite/50 text-xs uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${or ? "text-gold" : ""}`}>{valeur ?? "—"}</p>
      {note && <p className="mt-1 text-[11px] text-offwhite/45">{note}</p>}
    </Carte>
  );
}

// Mini barres (sans dépendance externe) : inscriptions par semaine + rétention.
function Barres({ data }) {
  const max = Math.max(1, ...data.map((d) => d.inscrits));
  return (
    <div className="flex items-end gap-2" style={{ height: 150 }} data-testid="retention-barres">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[11px] font-semibold text-offwhite/80">{d.inscrits}</span>
          <div className="flex w-full items-end justify-center" style={{ height: 96 }}>
            <div className="w-full max-w-[34px] rounded-t-md" title={`${d.inscrits} inscrits · ${d.retention}% retenus`}
              style={{ height: `${(d.inscrits / max) * 100}%`, minHeight: d.inscrits ? 4 : 0, background: "linear-gradient(to top,#DEC2A3aa,#DEC2A3)" }} />
          </div>
          <span className="text-[10px] text-offwhite/45">{d.semaine}</span>
          <span className="text-[10px] font-semibold" style={{ color: d.retention >= 40 ? "#7DD3C0" : d.retention >= 20 ? "#DEC2A3" : "#C08497" }}>{d.retention}%</span>
        </div>
      ))}
    </div>
  );
}

function BarreSource({ label, valeur, total, couleur }) {
  const pct = total ? Math.round((valeur / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-offwhite/80">{label}</span>
        <span className="text-offwhite/55">{valeur} <span className="text-offwhite/35">({pct}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: couleur || "linear-gradient(to right,#DEC2A3,#F1E2CC)" }} />
      </div>
    </div>
  );
}

export default function AdminRetention() {
  const [d, setD] = useState(null);
  const [erreur, setErreur] = useState(null);
  const charger = () => fetchAdminRetention().then((r) => { setD(r); setErreur(null); }).catch(() => setErreur("Accès refusé ou erreur serveur."));
  useEffect(() => { charger(); }, []);
  // Les chiffres se remettent à jour tout seuls quand on revient sur l'onglet du navigateur.
  useEffect(() => {
    const retour = () => { if (document.visibilityState === "visible") charger(); };
    document.addEventListener("visibilitychange", retour);
    return () => document.removeEventListener("visibilitychange", retour);
  }, []);
  if (erreur) return <Carte><p className="text-red-400 text-sm">{erreur}</p></Carte>;
  if (!d) return <Carte><p className="text-offwhite/50 text-sm">Chargement…</p></Carte>;
  const a = d.actifs || {};
  const u = d.usage || {};
  const totalAcq = (d.acquisition || []).reduce((s, x) => s + x.users, 0);
  const maxSrc = Math.max(1, ...(d.sources || []).map((s) => s.leads));
  const COUL = ["linear-gradient(to right,#3E8E86,#7DD3C0)", "linear-gradient(to right,#DEC2A3,#F1E2CC)", "linear-gradient(to right,#7C7FC9,#9B86B0)"];
  return (
    <div className="space-y-4" data-testid="admin-retention">
      {/* Utilisateurs actifs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Kpi label="Actifs aujourd'hui" valeur={a.dau} note="DAU" or />
        <Kpi label="Actifs 7 jours" valeur={a.wau} note="WAU" />
        <Kpi label="Actifs 30 jours" valeur={a.mau} note="MAU" />
        <Kpi label="Taux d'engagement" valeur={`${a.taux_wau ?? 0} %`} note={`${a.wau ?? 0} / ${a.total ?? 0} actifs 7 j`} />
      </div>

      {/* Inscriptions + rétention par cohorte */}
      <Carte>
        <div className="mb-1 flex items-center gap-2"><TrendingUp size={16} className="text-gold" /><p className="font-semibold">Inscriptions & rétention par semaine</p></div>
        <p className="mb-4 text-[12.5px] text-offwhite/55">Hauteur = nouveaux inscrits de la semaine. Le % dessous = part encore active (connectée ces 14 derniers jours).</p>
        <Barres data={d.semaines || []} />
      </Carte>

      {/* Acquisition : d'où viennent les users */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Carte>
          <div className="mb-1 flex items-center gap-2"><Users size={16} className="text-gold" /><p className="font-semibold">D'où viennent les utilisateurs</p></div>
          <p className="mb-4 text-[12.5px] text-offwhite/55">Canal d'acquisition des comptes créés.</p>
          <div className="space-y-3">
            {(d.acquisition || []).map((x, i) => <BarreSource key={x.canal} label={x.canal} valeur={x.users} total={totalAcq} couleur={COUL[i % COUL.length]} />)}
          </div>
        </Carte>
        <Carte>
          <div className="mb-1 flex items-center gap-2"><Sparkles size={16} className="text-gold" /><p className="font-semibold">Leads capturés par source</p></div>
          <p className="mb-4 text-[12.5px] text-offwhite/55">Conversion lead → compte : <b className="text-gold">{d.taux_conversion_lead ?? 0}%</b> ({d.leads_convertis ?? 0} / {d.leads_total ?? 0}).</p>
          {(d.sources || []).length ? (
            <div className="space-y-3">
              {(d.sources || []).map((s) => <BarreSource key={s.source} label={s.source} valeur={s.leads} total={maxSrc} />)}
            </div>
          ) : <p className="text-sm text-offwhite/45">Aucun lead capturé pour l'instant.</p>}
        </Carte>
      </div>

      {/* Usage : l'appli est-elle utile */}
      <Carte>
        <div className="mb-1 flex items-center gap-2"><Repeat size={16} className="text-gold" /><p className="font-semibold">L'appli est-elle utile ?</p></div>
        <p className="mb-4 text-[12.5px] text-offwhite/55">Activation (onboarding terminé) et adhésion de l'écran d'accueil.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Kpi label="Taux d'activation" valeur={`${u.taux_activation ?? 0} %`} note={`${u.onboarded ?? 0} / ${u.total ?? 0} onboardés`} or />
          <Kpi label="Taux d'adhésion" valeur={`${u.taux_adhesion ?? 0} %`} note={`${u.adhesion_oui ?? 0} / ${u.adhesion_total ?? 0} clics « oui »`} />
          <Kpi label="Rétention 7 j" valeur={`${a.taux_wau ?? 0} %`} note="actifs cette semaine" />
        </div>
      </Carte>
    </div>
  );
}
