import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Gift, Users, Sparkles, Copy, Check, Euro, CalendarClock, Crown } from "lucide-react";
import {
  fetchProgrammes, fetchMonProgramme, demanderProgramme, inviterParrainage,
} from "@/lib/kairosApi";

const ICONE = { parrainage: Gift, ambassadeur: Sparkles, affiliation: Crown };

function Carte({ children, className = "" }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.04] p-5 ${className}`}>{children}</div>;
}

export default function Programmes() {
  const [catalogue, setCatalogue] = useState(null);
  const [mien, setMien] = useState(null);
  const [email, setEmail] = useState("");
  const [copie, setCopie] = useState(false);
  const [chargement, setChargement] = useState(true);

  const charger = async () => {
    try {
      const [cat, moi] = await Promise.all([fetchProgrammes(), fetchMonProgramme()]);
      setCatalogue(cat);
      setMien(moi);
    } catch {
      toast.error("Impossible de charger tes programmes.");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { charger(); }, []);

  const lienPartage = mien?.code_parrainage
    ? `${window.location.origin}/login?ref=${mien.code_parrainage}`
    : "";

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lienPartage);
      setCopie(true);
      setTimeout(() => setCopie(false), 1800);
      toast.success("Lien copié !");
    } catch {
      toast.error("Copie impossible — copie manuellement.");
    }
  };

  const inviter = async (e) => {
    e.preventDefault();
    const val = email.trim().toLowerCase();
    if (!val || !val.includes("@")) { toast.error("Email invalide."); return; }
    try {
      await inviterParrainage(val);
      setEmail("");
      toast.success(`Invitation prête pour ${val}.`);
      charger();
    } catch (err) {
      toast.error(err?.message || "Cette personne est peut-être déjà dans tes filleuls.");
    }
  };

  const demander = async (cle) => {
    try {
      await demanderProgramme(cle);
      toast.success("Demande envoyée — un admin va la valider.");
      charger();
    } catch (err) {
      toast.error(err?.message || "Demande impossible.");
    }
  };

  const progActuel = mien?.programme || "parrainage";
  const estCommission = mien?.programme_infos?.type === "commission";

  return (
    <div className="min-h-screen bg-navy-900 px-4 py-6 text-offwhite sm:px-8" data-testid="programmes-page">
      <div className="mx-auto max-w-4xl">
        <Link to="/app" className="mb-5 inline-flex items-center gap-2 text-sm text-offwhite/60 hover:text-offwhite">
          <ArrowLeft size={16} /> Retour au cockpit
        </Link>

        <h1 className="font-display text-2xl font-bold sm:text-3xl">Programmes partenaires</h1>
        <p className="mt-2 max-w-2xl text-sm text-offwhite/60">
          Recommande Zayado autour de toi. Trois façons d'être récompensé — du simple parrainage entre amis à l'affiliation pour les créateurs et influenceurs.
        </p>

        {chargement && <Carte className="mt-6"><p className="text-sm text-offwhite/50">Chargement…</p></Carte>}

        {!chargement && mien && (
          <>
            {/* Mon espace */}
            <Carte className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-offwhite/50">Ton programme actuel</p>
                  <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-gold">
                    {React.createElement(ICONE[progActuel] || Gift, { size: 18 })}
                    {mien.programme_infos?.label || "Parrainage"}
                  </p>
                  <p className="mt-1 text-sm text-offwhite/60">{mien.programme_infos?.recompense}</p>
                </div>
                {mien.palier && (
                  <div className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-2 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-gold/80">Palier</p>
                    <p className="text-lg font-bold text-gold">{mien.palier.label}</p>
                    <p className="text-[11px] text-offwhite/60">{mien.palier.montant} € / filleul</p>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat icon={Users} label="Filleuls" valeur={mien.nb_filleuls} />
                <Stat icon={Check} label="Actifs" valeur={mien.nb_filleuls_actifs} />
                {estCommission
                  ? <Stat icon={Euro} label="Commission due" valeur={`${mien.solde_commission} €`} />
                  : <Stat icon={CalendarClock} label="Mois offerts" valeur={mien.mois_offerts_dus} />}
                <Stat icon={Gift} label="Code" valeur={mien.code_parrainage} petit />
              </div>

              {/* Lien de partage */}
              <div className="mt-5">
                <p className="text-xs uppercase tracking-wide text-offwhite/50">Ton lien de partage</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input readOnly value={lienPartage} className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-offwhite/80" data-testid="programme-lien" />
                  <button onClick={copier} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-navy-900" data-testid="programme-copier">
                    {copie ? <Check size={16} /> : <Copy size={16} />} {copie ? "Copié" : "Copier"}
                  </button>
                </div>
              </div>

              {/* Inviter par email */}
              <form onSubmit={inviter} className="mt-4 flex flex-wrap gap-2">
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@ami.fr" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm" data-testid="programme-invite-email" />
                <button type="submit" className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/15" data-testid="programme-invite-btn">Inviter</button>
              </form>
            </Carte>

            {/* Filleuls */}
            {mien.filleuls?.length > 0 && (
              <Carte className="mt-5">
                <p className="text-sm font-semibold">Tes filleuls</p>
                <div className="mt-3 space-y-2">
                  {mien.filleuls.map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
                      <span className="truncate text-offwhite/80">{f.email}</span>
                      <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs ${f.statut === "actif" ? "bg-gold/15 text-gold" : "bg-white/10 text-offwhite/60"}`}>{f.statut}</span>
                    </div>
                  ))}
                </div>
              </Carte>
            )}

            {/* Les 3 programmes */}
            <h2 className="mt-8 font-display text-xl font-bold">Les 3 programmes</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {(catalogue?.programmes || []).map((p) => {
                const Icon = ICONE[p.cle] || Gift;
                const actif = progActuel === p.cle;
                const enAttente = mien.programme_demande === p.cle;
                return (
                  <Carte key={p.cle} className={actif ? "border-gold/40 bg-gold/[0.06]" : ""}>
                    <Icon className="text-gold" size={22} />
                    <p className="mt-3 font-display text-lg font-semibold">{p.label}</p>
                    <p className="mt-1 text-xs text-offwhite/50">{p.public}</p>
                    <p className="mt-3 text-sm text-offwhite/70">{p.recompense}</p>
                    <div className="mt-4">
                      {actif ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold"><Check size={13} /> Programme actuel</span>
                      ) : enAttente ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-offwhite/60"><CalendarClock size={13} /> Demande en attente</span>
                      ) : p.sur_demande ? (
                        <button onClick={() => demander(p.cle)} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15" data-testid={`programme-demander-${p.cle}`}>Demander l'accès</button>
                      ) : (
                        <span className="text-xs text-offwhite/45">Ouvert à tous</span>
                      )}
                    </div>
                  </Carte>
                );
              })}
            </div>

            {/* Paliers affiliation */}
            {catalogue?.paliers_affiliation?.length > 0 && (
              <Carte className="mt-6">
                <p className="text-sm font-semibold">Paliers d'affiliation</p>
                <p className="mt-1 text-xs text-offwhite/50">Plus tu apportes de filleuls actifs, plus ta commission par filleul augmente.</p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {catalogue.paliers_affiliation.map((pal) => (
                    <div key={pal.cle} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                      <p className="font-semibold text-gold">{pal.label}</p>
                      <p className="mt-1 text-lg font-bold">{pal.montant} €</p>
                      <p className="text-[11px] text-offwhite/50">dès {pal.min_filleuls} filleuls</p>
                    </div>
                  ))}
                </div>
              </Carte>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, valeur, petit }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-3 py-3">
      <Icon className="text-offwhite/40" size={15} />
      <p className={`mt-1.5 font-bold ${petit ? "text-sm font-mono" : "text-xl"}`}>{valeur ?? 0}</p>
      <p className="text-[11px] text-offwhite/50">{label}</p>
    </div>
  );
}
