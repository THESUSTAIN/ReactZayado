import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2, Pencil, Search, Trash2, X, Gift, Plus, Check, Download, CalendarPlus, UserRound } from "lucide-react";
import {
  fetchAdminUtilisateurs, changerRoleUtilisateur, changerPlanUtilisateur, passerCompteGratuit,
  fetchAdminCommerceVendors, modifierVendeurAdmin, supprimerVendeurAdmin,
  fetchAdminCommerceProducts, modifierProduitAdmin, supprimerProduitAdmin,
  fetchAdminParrainage, creerParrainageAdmin, modifierParrainageAdmin, supprimerParrainageAdmin,
  fetchAdminProgrammes, validerProgramme, payerCommission, crediterMoisAdmin, refuserProgrammeAdmin,
  inviterEquipe, actionGroupeUtilisateurs, exporterUtilisateursCsv, fetchAdminFiche,
  bloquerUtilisateur, supprimerUtilisateur, supprimerUtilisateursGroupe,
} from "@/lib/kairosApi";

export const MOTIFS_ACCES = { equipe: "Équipe Zayado", partenaire: "Partenaire", testeur: "Testeur", presse: "Presse", autre: "Autre" };

/* Console admin — gestion complète : utilisateurs (paginés, total, dernière
   connexion, compte gratuit), comptes vendeurs, catalogue et parrainage. */

export function Carte({ children, className = "" }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${className}`}>{children}</div>;
}
const SELECT = "bg-navy-800 border border-white/15 rounded-lg text-xs px-2 py-1";
const INPUT = "h-9 rounded-lg border border-white/15 bg-navy-800 px-3 text-sm text-offwhite outline-none focus:border-gold/60";
const BTN = "inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1 text-xs hover:bg-white/10 disabled:opacity-50";
const BTN_OR = "inline-flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-navy-900 disabled:opacity-50";
const NOMS_OFFRES = { essentielle: "Aucune offre", reveur: "Rêveur", serenite: "Solo", pro: "Pro", business: "Équipe", entreprise: "Entreprise" };

const dateFr = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "—");
const depuis = (iso) => {
  if (!iso) return "Jamais";
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (j <= 0) return "Aujourd'hui";
  if (j === 1) return "Hier";
  if (j < 30) return `Il y a ${j} j`;
  return dateFr(iso);
};

function Kpi({ label, valeur, note, or }) {
  return (
    <Carte>
      <p className="text-offwhite/50 text-xs uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${or ? "text-gold" : ""}`}>{valeur ?? "—"}</p>
      {note && <p className="mt-1 text-[11px] text-offwhite/45">{note}</p>}
    </Carte>
  );
}

function Pagination({ page, pages, total, onPage, unite = "résultat" }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-offwhite/60" data-testid="admin-pagination">
      <span>{total} {unite}{total > 1 ? "s" : ""} · page {page} / {pages}</span>
      <div className="flex items-center gap-1.5">
        <button className={BTN} disabled={page <= 1} onClick={() => onPage(page - 1)} data-testid="admin-page-prec"><ChevronLeft size={14} /> Précédent</button>
        <button className={BTN} disabled={page >= pages} onClick={() => onPage(page + 1)} data-testid="admin-page-suiv">Suivant <ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

/* ───────────────────────── Utilisateurs ───────────────────────── */
export function Utilisateurs() {
  const [d, setD] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [page, setPage] = useState(1);
  const [parPage, setParPage] = useState(25);
  const [q, setQ] = useState("");
  const [recherche, setRecherche] = useState("");
  const [role, setRole] = useState("");
  const [offre, setOffre] = useState("");
  const [tri, setTri] = useState("inscription");
  const [gratuitPour, setGratuitPour] = useState(null);
  const [selection, setSelection] = useState([]);
  const [fiche, setFiche] = useState(null);

  const charger = useCallback(() => {
    fetchAdminUtilisateurs({ page, par_page: parPage, q: recherche, role, offre, tri })
      .then((r) => { setD(r); setErreur(null); })
      .catch(() => setErreur("Accès refusé ou erreur serveur."));
  }, [page, parPage, recherche, role, offre, tri]);
  useEffect(() => { charger(); }, [charger]);
  // Après tout rechargement, on retire de la sélection les comptes qui n'existent plus (supprimés ici ou ailleurs).
  useEffect(() => { if (d?.items) setSelection((l) => (l.length ? l.filter((id) => d.items.some((u) => u.id === id)) : l)); }, [d]);
  // Recherche : on attend la fin de la frappe.
  useEffect(() => { const t = setTimeout(() => { setPage(1); setRecherche(q.trim()); }, 350); return () => clearTimeout(t); }, [q]);

  const changerRole = async (id, r, email) => {
    const libelle = { admin: "ADMINISTRATEUR (accès à toute la console)", vendeur: "vendeur", client: "client" }[r] || r;
    if (!window.confirm(`Passer ${email || "ce compte"} en ${libelle} ?`)) return;
    try { await changerRoleUtilisateur(id, r); toast.success("Rôle mis à jour"); charger(); } catch { toast.error("Échec du changement de rôle."); }
  };
  const changerPlan = async (u, plan) => {
    if (plan === u.plan) return;
    let fondateur = false;
    let jours = 31;
    if (plan !== "essentielle") {
      const saisie = window.prompt(`Accès ${NOMS_OFFRES[plan]} pour ${u.email} : combien de jours ?`, "31");
      if (saisie === null) return;
      jours = parseInt(saisie, 10) || 31;
      fondateur = window.confirm("Lui garantir le tarif fondateur à ses renouvellements ?");
    }
    try { await changerPlanUtilisateur(u.id, plan, jours, fondateur); toast.success("Offre mise à jour"); charger(); } catch { toast.error("Échec du changement d'offre."); }
  };
  const retirerGratuit = async (u) => {
    if (!window.confirm(`Retirer le compte gratuit de ${u.email} ? Son accès s'arrête immédiatement.`)) return;
    try { await passerCompteGratuit(u.id, false); toast.success("Compte gratuit retiré"); charger(); } catch (e) { toast.error(e.message); }
  };

  const groupe = async (action) => {
    const n = selection.length;
    let extra = {};
    if (action === "offrir") {
      const plan = window.prompt(`Offrir quelle offre aux ${n} comptes ? (reveur, serenite, pro, business, entreprise)`, "pro");
      if (!plan) return;
      extra = { plan: plan.trim().toLowerCase(), motif: "autre" };
    } else if (action === "prolonger") {
      const j = window.prompt(`Prolonger l'accès payant de ${n} compte(s) de combien de jours ?`, "30");
      if (!j) return;
      extra = { jours: parseInt(j, 10) || 30 };
    } else if (!window.confirm(`Retirer l'accès offert de ${n} compte(s) ? Leur accès s'arrête immédiatement.`)) return;
    try {
      const r = await actionGroupeUtilisateurs({ ids: selection, action, ...extra });
      toast.success(`${r.faits} compte(s) mis à jour${r.ignores?.length ? ` · ${r.ignores.length} ignoré(s) (${r.ignores.slice(0, 3).join(", ")})` : ""}.`);
      setSelection([]); charger();
    } catch (e) { toast.error(e.message || "Action impossible."); }
  };
  const supprimerSelection = async () => {
    const n = selection.length;
    const saisie = window.prompt(`SUPPRESSION DÉFINITIVE de ${n} compte${n > 1 ? "s" : ""} : toutes leurs données seront effacées (sauf les factures, gardées pour la comptabilité). Les comptes admin, ton propre compte et ceux qui ont un prélèvement Mollie actif seront ignorés.\nPréfère « Suspendre » si tu n'es pas sûr.\n\nTape SUPPRIMER pour confirmer :`);
    if (saisie === null) return;
    try {
      const r = await supprimerUtilisateursGroupe(selection, saisie.trim());
      const ign = r.ignores || [];
      if (r.supprimes) toast.success(`${r.supprimes} compte${r.supprimes > 1 ? "s" : ""} supprimé${r.supprimes > 1 ? "s" : ""}.`);
      if (ign.length) toast.error(`${ign.length} ignoré${ign.length > 1 ? "s" : ""} : ${ign.slice(0, 3).map((x) => `${x.email} (${x.raison})`).join(" ; ")}`);
      setSelection([]);
      // Si la page courante est vidée, on recule d'une page ; sinon on recharge tout de suite.
      if (page > 1 && r.supprimes >= (d?.items?.length || 0)) setPage(page - 1); else charger();
    } catch (e) { toast.error(e.detail || e.message || "Suppression impossible."); charger(); }
  };
  const exporter = async () => {
    try { await exporterUtilisateursCsv({ q: recherche, role, offre }); } catch { toast.error("Export impossible."); }
  };
  const basculer = (id) => setSelection((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  if (erreur) return <Carte><p className="text-red-400 text-sm">{erreur}</p></Carte>;
  if (!d) return <Carte><p className="text-offwhite/50 text-sm">Chargement…</p></Carte>;
  const st = d.stats || {};
  const tousCoches = d.items.length > 0 && d.items.every((u) => selection.includes(u.id));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="admin-users-stats">
        <Kpi label="Utilisateurs au total" valeur={st.total} or />
        <Kpi label="Clients payants" valeur={st.payants} />
        <Kpi label="Comptes gratuits" valeur={st.offerts} note="collaborateurs Zayado" />
        <Kpi label="Actifs (7 j)" valeur={st.actifs_7j} note="connectés cette semaine" />
      </div>
      <Carte>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-offwhite/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un e-mail…" className={`${INPUT} w-full pl-8`} data-testid="admin-users-recherche" />
          </div>
          <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className={SELECT} data-testid="admin-users-filtre-role">
            <option value="">Tous les rôles</option><option value="client">Clients</option><option value="vendeur">Vendeurs</option><option value="admin">Admins</option>
          </select>
          <select value={offre} onChange={(e) => { setOffre(e.target.value); setPage(1); }} className={SELECT} data-testid="admin-users-filtre-offre">
            <option value="">Toutes les offres</option><option value="payant">Payants</option><option value="offert">Gratuits (offerts)</option><option value="aucune">Sans offre</option>
            {["reveur", "serenite", "pro", "business", "entreprise"].map((k) => <option key={k} value={k}>{NOMS_OFFRES[k]}</option>)}
          </select>
          <select value={tri} onChange={(e) => { setTri(e.target.value); setPage(1); }} className={SELECT} data-testid="admin-users-tri">
            <option value="inscription">Plus récents inscrits</option><option value="connexion">Dernière connexion</option>
          </select>
          <select value={parPage} onChange={(e) => { setParPage(Number(e.target.value)); setPage(1); }} className={SELECT} aria-label="Par page">
            {[25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <button className={BTN} onClick={charger} data-testid="admin-users-actualiser">Actualiser</button>
          <button className={BTN} onClick={exporter} data-testid="admin-users-export"><Download size={12} /> Export CSV</button>
        </div>
        {selection.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-gold/30 bg-gold/[0.07] px-3 py-2 text-xs" data-testid="admin-users-groupe">
            <b>{selection.length} sélectionné{selection.length > 1 ? "s" : ""}</b>
            <button className={BTN} onClick={() => groupe("offrir")}><Gift size={12} /> Offrir une offre</button>
            <button className={BTN} onClick={() => groupe("prolonger")}><CalendarPlus size={12} /> Prolonger</button>
            <button className={BTN} onClick={() => groupe("retirer_offert")}><X size={12} /> Retirer l'offert</button>
            <button className={`${BTN} text-red-300`} onClick={supprimerSelection} data-testid="admin-users-supprimer-groupe"><Trash2 size={12} /> Supprimer</button>
            <button className="ml-auto text-offwhite/60 hover:text-offwhite" onClick={() => setSelection([])}>Désélectionner</button>
          </div>
        )}
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="text-left text-offwhite/50 border-b border-white/10">
              <th className="w-8 pb-2"><input type="checkbox" aria-label="Tout sélectionner" checked={tousCoches} onChange={() => setSelection(tousCoches ? [] : d.items.map((u) => u.id))} /></th>
              <th className="pb-2">Email</th><th className="pb-2">Offre</th><th className="pb-2">Abonnement</th><th className="pb-2">Inscrit le</th><th className="pb-2">Dernière connexion</th><th className="pb-2">Rôle</th><th className="pb-2">Compte gratuit</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((u) => {
              const offert = u.abonnement?.etat === "offert";
              return (
                <tr key={u.id} className="border-b border-white/5" data-testid={`admin-user-${u.id}`}>
                  <td className="py-2.5"><input type="checkbox" aria-label={`Sélectionner ${u.email}`} checked={selection.includes(u.id)} onChange={() => basculer(u.id)} /></td>
                  <td className="py-2.5 pr-2"><button className="text-left hover:text-gold hover:underline" onClick={() => setFiche(u.id)} data-testid={`admin-user-fiche-${u.id}`}>{u.email}</button>{u.bloque && <span className="ml-1.5 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-200">Suspendu</span>}</td>
                  <td className="py-2.5">
                    <select value={u.plan || "essentielle"} onChange={(e) => changerPlan(u, e.target.value)} disabled={offert}
                      data-testid={`admin-plan-select-${u.id}`} className={SELECT} title={offert ? "Compte gratuit : retire-le d'abord pour changer l'offre" : ""}>
                      {Object.entries(NOMS_OFFRES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </td>
                  <td className="py-2.5 text-xs" data-testid={`admin-abo-${u.id}`}>
                    {u.abonnement && u.abonnement.etat !== "aucun" ? (
                      <>
                        <span className={`rounded-full px-2 py-0.5 ${{ actif: "bg-emerald-400/15 text-emerald-300", essai: "bg-gold/15 text-gold", offert: "bg-sky-400/15 text-sky-300", resilie: "bg-amber-300/15 text-amber-200", expire: "bg-white/10 text-offwhite/50" }[u.abonnement.etat]}`}>
                          {{ actif: "Actif", essai: "Essai", offert: "Offert", resilie: "Résilié", expire: "Expiré" }[u.abonnement.etat]}
                        </span>
                        {!offert && <span className="ml-1.5 text-offwhite/55">{u.abonnement.fin ? `→ ${dateFr(u.abonnement.fin)}` : ""}{u.abonnement.prelevement_auto ? " · auto" : ""}{u.abonnement.fondateur ? " · fondateur" : ""}</span>}
                      </>
                    ) : <span className="text-offwhite/35">—</span>}
                  </td>
                  <td className="py-2.5 text-offwhite/55">{dateFr(u.inscrit_le)}</td>
                  <td className="py-2.5 text-offwhite/70" title={u.derniere_connexion ? new Date(u.derniere_connexion).toLocaleString("fr-FR") : ""} data-testid={`admin-derniere-connexion-${u.id}`}>{depuis(u.derniere_connexion)}{u.derniere_connexion && <span className="block text-[10.5px] text-offwhite/40">{new Date(u.derniere_connexion).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}</td>
                  <td className="py-2.5">
                    <select value={u.role} onChange={(e) => changerRole(u.id, e.target.value, u.email)} data-testid={`admin-role-select-${u.id}`} className={SELECT}>
                      <option value="client">client</option><option value="vendeur">vendeur</option><option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="py-2.5">
                    {offert
                      ? <button className={BTN} onClick={() => retirerGratuit(u)} data-testid={`admin-gratuit-retirer-${u.id}`}><X size={12} /> Retirer ({NOMS_OFFRES[u.abonnement.plan]})</button>
                      : <button className={BTN} onClick={() => setGratuitPour(u)} data-testid={`admin-gratuit-${u.id}`}><Gift size={12} /> Offrir</button>}
                  </td>
                </tr>
              );
            })}
            {!d.items.length && <tr><td colSpan={8} className="py-6 text-center text-offwhite/50">Aucun utilisateur ne correspond.</td></tr>}
          </tbody>
        </table></div>
        <Pagination page={d.page} pages={d.pages} total={d.total} onPage={setPage} unite="utilisateur" />
      </Carte>
      {gratuitPour && <FenetreGratuit u={gratuitPour} onClose={() => setGratuitPour(null)} onOk={() => { setGratuitPour(null); charger(); }} />}
      {fiche && <FicheUtilisateur id={fiche} onClose={() => setFiche(null)} onChange={charger} />}
    </div>
  );
}

function FenetreGratuit({ u, onClose, onOk }) {
  const [plan, setPlan] = useState("pro");
  const [motif, setMotif] = useState("equipe");
  const [envoi, setEnvoi] = useState(false);
  const valider = async () => {
    setEnvoi(true);
    try { await inviterEquipe({ email: u.email, plan, motif, envoyer_email: false }); toast.success(`${u.email} a maintenant un compte gratuit ${NOMS_OFFRES[plan]}.`); onOk(); }
    catch (e) { toast.error(e.message); setEnvoi(false); }
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-navy-900 p-6 text-offwhite" onClick={(e) => e.stopPropagation()} data-testid="admin-gratuit-fenetre">
        <p className="font-display text-lg font-semibold">Compte gratuit</p>
        <p className="mt-1 text-sm text-offwhite/65">Pour <b>{u.email}</b> — réservé aux collaborateurs et partenaires Zayado. Accès complet, sans date de fin ni prélèvement. Visible uniquement ici ; tu peux le retirer à tout moment.</p>
        <label className="mt-4 block text-xs text-offwhite/60">Offre accordée</label>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className={`${SELECT} mt-1 w-full py-2 text-sm`} data-testid="admin-gratuit-plan">
          {["reveur", "serenite", "pro", "business", "entreprise"].map((k) => <option key={k} value={k}>{NOMS_OFFRES[k]}</option>)}
        </select>
        <label className="mt-3 block text-xs text-offwhite/60">Pourquoi ?</label>
        <select value={motif} onChange={(e) => setMotif(e.target.value)} className={`${SELECT} mt-1 w-full py-2 text-sm`} data-testid="admin-gratuit-motif">
          {Object.entries(MOTIFS_ACCES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <div className="mt-5 flex justify-end gap-2">
          <button className={BTN} onClick={onClose}>Annuler</button>
          <button className={BTN_OR} onClick={valider} disabled={envoi} data-testid="admin-gratuit-valider">{envoi ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Activer</button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Fiche 360° ───────────────────────── */
const ETATS_ABO = { actif: "Actif", essai: "Essai", offert: "Offert", resilie: "Résilié", expire: "Expiré", aucun: "Aucun" };
function ActionsCompte({ f, onFait }) {
  const [envoi, setEnvoi] = useState(false);
  if (f.role === "admin") return <p className="mt-6 text-[12px] text-offwhite/45">Compte administrateur : retire d'abord le rôle admin pour le suspendre ou le supprimer.</p>;
  const suspendre = async () => {
    const bloque = !f.bloque;
    const motif = bloque ? window.prompt(`Suspendre ${f.email} ? Il ne pourra plus se connecter (ses données sont conservées, c'est réversible).\nMotif (facultatif) :`, "") : null;
    if (bloque && motif === null) return;
    if (!bloque && !window.confirm(`Réactiver le compte de ${f.email} ?`)) return;
    setEnvoi(true);
    try { await bloquerUtilisateur(f.id, bloque, motif || undefined); toast.success(bloque ? "Compte suspendu." : "Compte réactivé."); onFait(); }
    catch (e) { toast.error(e.detail || "Action impossible."); } finally { setEnvoi(false); }
  };
  const supprimer = async () => {
    const saisie = window.prompt(`SUPPRESSION DÉFINITIVE de ${f.email} : toutes ses données seront effacées (sauf ses factures, gardées pour la comptabilité).\nPréfère « Suspendre » si tu n'es pas sûr.\n\nRecopie son adresse e-mail pour confirmer :`);
    if (saisie === null) return;
    setEnvoi(true);
    try { await supprimerUtilisateur(f.id, saisie.trim()); toast.success("Compte supprimé."); onFait(); }
    catch (e) { toast.error(e.detail || "Suppression impossible."); } finally { setEnvoi(false); }
  };
  return (
    <div className="mt-6 border-t border-white/10 pt-4" data-testid="fiche-actions-compte">
      <p className="mb-2 text-[11px] uppercase tracking-wide text-offwhite/45">Compte</p>
      {f.bloque && <p className="mb-2 rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-200">Suspendu{f.bloque_le ? ` depuis le ${new Date(f.bloque_le).toLocaleDateString("fr-FR")}` : ""}{f.bloque_motif ? ` · ${f.bloque_motif}` : ""}</p>}
      <div className="flex flex-wrap gap-2">
        <button disabled={envoi} onClick={suspendre} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/10 disabled:opacity-50" data-testid="fiche-suspendre">{f.bloque ? "Réactiver le compte" : "Suspendre le compte"}</button>
        <button disabled={envoi} onClick={supprimer} className="rounded-lg bg-red-500/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50" data-testid="fiche-supprimer">Supprimer définitivement</button>
      </div>
    </div>
  );
}

export function FicheUtilisateur({ id, onClose, onChange }) {
  const [f, setF] = useState(null);
  useEffect(() => { fetchAdminFiche(id).then(setF).catch(() => setF({ erreur: true })); }, [id]);
  const Ligne = ({ label, children }) => <div className="flex justify-between gap-3 border-b border-white/[0.06] py-2 text-sm"><span className="text-offwhite/55">{label}</span><span className="text-right">{children}</span></div>;
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/50" onClick={onClose}>
      <aside className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-navy-900 p-6 text-offwhite" onClick={(e) => e.stopPropagation()} data-testid="admin-fiche">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/20 text-gold"><UserRound size={18} /></span>
            <div className="min-w-0"><p className="font-display text-lg font-semibold">{f?.prenom || "Fiche utilisateur"}</p><p className="break-all text-xs text-offwhite/55">{f?.email}</p></div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-offwhite/60 hover:bg-white/10"><X size={18} /></button>
        </div>
        {!f && <p className="text-sm text-offwhite/50">Chargement…</p>}
        {f?.erreur && <p className="text-sm text-red-400">Fiche indisponible.</p>}
        {f && !f.erreur && (
          <>
            <p className="mb-1 mt-2 text-[11px] uppercase tracking-wide text-offwhite/45">Compte</p>
            <Ligne label="Rôle">{f.role}</Ligne>
            <Ligne label="Inscrit le">{dateFr(f.inscrit_le)}</Ligne>
            <Ligne label="Dernière connexion">{f.derniere_connexion ? `${new Date(f.derniere_connexion).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} (${depuis(f.derniere_connexion)})` : "jamais"}</Ligne>
            <Ligne label="Métier">{f.metier || "—"}</Ligne>
            <Ligne label="Ma Foi">{f.ma_foi ? "Activé" : "Non"}</Ligne>
            <p className="mb-1 mt-4 text-[11px] uppercase tracking-wide text-offwhite/45">Offre</p>
            <Ligne label="Offre">{NOMS_OFFRES[f.abonnement?.plan] || "Aucune"}</Ligne>
            <Ligne label="État">{ETATS_ABO[f.abonnement?.etat] || "—"}{f.abonnement?.prelevement_auto ? " · prélèvement auto" : ""}</Ligne>
            {f.abonnement?.etat !== "offert" && <Ligne label="Fin">{dateFr(f.abonnement?.fin)}</Ligne>}
            {f.acces_equipe && <Ligne label="Accès offert">{f.acces_equipe.motif}{f.acces_equipe.note ? ` · ${f.acces_equipe.note}` : ""}{f.acces_equipe.invite_par ? ` (par ${f.acces_equipe.invite_par})` : ""}</Ligne>}
            <p className="mb-1 mt-4 text-[11px] uppercase tracking-wide text-offwhite/45">Connexions</p>
            {f.connexions.length ? f.connexions.map((c, i) => <Ligne key={i} label={c.provider}>{c.status} · {dateFr(c.depuis)}</Ligne>) : <p className="py-2 text-sm text-offwhite/45">Aucune</p>}
            <p className="mb-1 mt-4 text-[11px] uppercase tracking-wide text-offwhite/45">Parrainage & communauté</p>
            <Ligne label="Filleuls">{f.parrainage?.filleuls ?? 0}</Ligne>
            <Ligne label="Parrain">{f.parrainage?.parrain || "—"}</Ligne>
            <Ligne label="Publications Ma Foi">{f.foi?.publications ?? 0}</Ligne>
            <p className="mb-1 mt-4 text-[11px] uppercase tracking-wide text-offwhite/45">Dernières erreurs</p>
            {f.erreurs.length ? f.erreurs.map((e, i) => <div key={i} className="border-b border-white/[0.06] py-2 text-xs"><span className="text-offwhite/45">{new Date(e.le).toLocaleString("fr-FR")} · {e.feature}</span><p className="text-red-300/90">{e.message}</p></div>) : <p className="py-2 text-sm text-offwhite/45">Aucune erreur récente</p>}
            <ActionsCompte f={f} onFait={() => { onClose(); onChange?.(); }} />
          </>
        )}
      </aside>
    </div>
  );
}

/* ───────────────────────── Comptes vendeurs ───────────────────────── */
const CHAMPS_VENDEUR = [["nom_boutique", "Nom de la boutique"], ["email_contact", "E-mail de contact"], ["telephone", "Téléphone"], ["siret", "SIRET"], ["site", "Site web"], ["description", "Description"]];

export function ComptesVendeurs() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [edition, setEdition] = useState(null);
  const charger = () => fetchAdminCommerceVendors().then((d) => setItems(d.items)).catch((e) => setError(e.message));
  useEffect(() => { charger(); }, []);

  const suspendre = async (v, suspendu) => {
    const msg = suspendu
      ? `Suspendre la boutique de ${v.email} ? Il perd l'accès à l'espace vendeur et ses produits en ligne repassent en brouillon.`
      : `Réactiver la boutique de ${v.email} ?`;
    if (!window.confirm(msg)) return;
    try { await modifierVendeurAdmin(v.id, { suspendu }); toast.success(suspendu ? "Boutique suspendue" : "Boutique réactivée"); charger(); } catch (e) { toast.error(e.message); }
  };
  const supprimer = async (v) => {
    if (!window.confirm(`Supprimer DÉFINITIVEMENT le compte vendeur de ${v.email} (boutique + ${v.products} produit(s)) ?\nSon compte utilisateur est conservé (redevient client). Les commandes passées restent en comptabilité.`)) return;
    try {
      const r = await supprimerVendeurAdmin(v.id);
      toast.success("Compte vendeur supprimé");
      if (r.a_retirer_de_shopify?.length) toast.warning(`À retirer aussi de Shopify : ${r.a_retirer_de_shopify.join(", ")}`, { duration: 12000 });
      charger();
    } catch (e) { toast.error(e.message); }
  };

  if (error) return <Carte><p className="text-sm text-red-400">{error}</p></Carte>;
  if (!items) return <Carte><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;
  return (
    <>
      <Carte>
        <p className="mb-3 text-xs text-offwhite/55">{items.length} compte{items.length > 1 ? "s" : ""} vendeur{items.length > 1 ? "s" : ""}. Pour créer un vendeur : onglet Utilisateurs → rôle « vendeur ».</p>
        <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-sm">
          <thead><tr className="border-b border-white/10 text-left text-offwhite/50"><th className="pb-2">Email</th><th className="pb-2">Boutique</th><th className="pb-2">Statut</th><th className="pb-2">Produits</th><th className="pb-2 text-right">Actions</th></tr></thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id} className="border-b border-white/5" data-testid={`admin-vendeur-${v.id}`}>
                <td className="py-2.5">{v.email}</td>
                <td className="py-2.5">{v.shop || <span className="text-offwhite/40">Profil incomplet</span>}</td>
                <td className="py-2.5">
                  <span className={`rounded-full px-2 py-1 text-xs ${v.role === "admin" ? "bg-white/10" : v.suspendu ? "bg-amber-300/15 text-amber-200" : "bg-emerald-400/15 text-emerald-300"}`}>
                    {v.role === "admin" ? "admin" : v.suspendu ? "suspendu" : "actif"}
                  </span>
                </td>
                <td className="py-2.5">{v.products} <span className="text-xs text-offwhite/45">({v.publies} en ligne)</span></td>
                <td className="py-2.5">
                  <div className="flex justify-end gap-1.5">
                    <button className={BTN} onClick={() => setEdition(v)} data-testid={`admin-vendeur-modifier-${v.id}`}><Pencil size={12} /> Modifier</button>
                    {v.role !== "admin" && (v.suspendu
                      ? <button className={BTN} onClick={() => suspendre(v, false)} data-testid={`admin-vendeur-reactiver-${v.id}`}>Réactiver</button>
                      : <button className={BTN} onClick={() => suspendre(v, true)} data-testid={`admin-vendeur-suspendre-${v.id}`}>Suspendre</button>)}
                    <button className={`${BTN} text-red-300`} onClick={() => supprimer(v)} data-testid={`admin-vendeur-supprimer-${v.id}`}><Trash2 size={12} /> Supprimer</button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={5} className="py-6 text-center text-offwhite/50">Aucun compte vendeur.</td></tr>}
          </tbody>
        </table></div>
      </Carte>
      {edition && <FenetreVendeur v={edition} onClose={() => setEdition(null)} onOk={() => { setEdition(null); charger(); }} />}
    </>
  );
}

function FenetreVendeur({ v, onClose, onOk }) {
  const [profil, setProfil] = useState(() => ({ ...(v.profil || {}) }));
  const [envoi, setEnvoi] = useState(false);
  const enregistrer = async () => {
    setEnvoi(true);
    try { await modifierVendeurAdmin(v.id, { profil }); toast.success("Boutique mise à jour"); onOk(); }
    catch (e) { toast.error(e.message); setEnvoi(false); }
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-navy-900 p-6 text-offwhite" onClick={(e) => e.stopPropagation()} data-testid="admin-vendeur-fenetre">
        <p className="font-display text-lg font-semibold">Boutique de {v.email}</p>
        <div className="mt-4 space-y-3">
          {CHAMPS_VENDEUR.map(([k, l]) => (
            <label key={k} className="block">
              <span className="text-xs text-offwhite/60">{l}</span>
              {k === "description"
                ? <textarea value={profil[k] || ""} onChange={(e) => setProfil({ ...profil, [k]: e.target.value })} rows={3} className={`${INPUT} mt-1 h-auto w-full py-2`} />
                : <input value={profil[k] || ""} onChange={(e) => setProfil({ ...profil, [k]: e.target.value })} className={`${INPUT} mt-1 w-full`} data-testid={`admin-vendeur-champ-${k}`} />}
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className={BTN} onClick={onClose}>Annuler</button>
          <button className={BTN_OR} onClick={enregistrer} disabled={envoi} data-testid="admin-vendeur-enregistrer">{envoi ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Catalogue produits ───────────────────────── */
const STATUTS_PRODUIT = { brouillon: "Brouillon", en_attente: "En attente", publie: "Publié", refuse: "Refusé" };

export function CatalogueAdmin() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [edition, setEdition] = useState(null);
  const charger = () => fetchAdminCommerceProducts().then((d) => setItems(d.items)).catch((e) => setError(e.message));
  useEffect(() => { charger(); }, []);
  const changerStatut = async (p, statut) => {
    try { await modifierProduitAdmin(p.id, { statut }); toast.success("Statut mis à jour"); charger(); } catch (e) { toast.error(e.message); }
  };
  const supprimer = async (p) => {
    if (!window.confirm(`Supprimer définitivement « ${p.title} » ?`)) return;
    try {
      const r = await supprimerProduitAdmin(p.id);
      toast.success("Produit supprimé");
      if (r.a_retirer_de_shopify) toast.warning("Ce produit était synchronisé : pense à le retirer aussi de Shopify.", { duration: 10000 });
      charger();
    } catch (e) { toast.error(e.message); }
  };
  if (error) return <Carte><p className="text-sm text-red-400">{error}</p></Carte>;
  if (!items) return <Carte><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;
  return (
    <>
      <Carte>
        <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-sm">
          <thead><tr className="border-b border-white/10 text-left text-offwhite/50"><th className="pb-2">Produit</th><th className="pb-2">Vendeur</th><th className="pb-2">Prix</th><th className="pb-2">Statut</th><th className="pb-2">Shopify</th><th className="pb-2 text-right">Actions</th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b border-white/5" data-testid={`admin-produit-${p.id}`}>
                <td className="py-2.5">{p.title}</td>
                <td className="py-2.5">{p.vendor}<br /><span className="text-xs text-offwhite/45">{p.vendor_email || "—"}</span></td>
                <td className="py-2.5">{p.price} €</td>
                <td className="py-2.5">
                  <select value={p.status} onChange={(e) => changerStatut(p, e.target.value)} className={SELECT} data-testid={`admin-produit-statut-${p.id}`}>
                    {Object.entries(STATUTS_PRODUIT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </td>
                <td className="py-2.5 text-xs text-offwhite/55">{p.shopify_id ? "Synchronisé" : "Non synchronisé"}</td>
                <td className="py-2.5">
                  <div className="flex justify-end gap-1.5">
                    <button className={BTN} onClick={() => setEdition(p)} data-testid={`admin-produit-modifier-${p.id}`}><Pencil size={12} /> Modifier</button>
                    <button className={`${BTN} text-red-300`} onClick={() => supprimer(p)} data-testid={`admin-produit-supprimer-${p.id}`}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={6} className="py-6 text-center text-offwhite/50">Aucun produit.</td></tr>}
          </tbody>
        </table></div>
      </Carte>
      {edition && <FenetreProduit p={edition} onClose={() => setEdition(null)} onOk={() => { setEdition(null); charger(); }} />}
    </>
  );
}

function FenetreProduit({ p, onClose, onOk }) {
  const [f, setF] = useState({ titre: p.title || "", prix: String(p.price ?? "") });
  const [envoi, setEnvoi] = useState(false);
  const enregistrer = async () => {
    setEnvoi(true);
    try { await modifierProduitAdmin(p.id, { titre: f.titre, prix: f.prix }); toast.success("Produit mis à jour"); onOk(); }
    catch (e) { toast.error(e.message); setEnvoi(false); }
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-navy-900 p-6 text-offwhite" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-lg font-semibold">Modifier le produit</p>
        <label className="mt-4 block"><span className="text-xs text-offwhite/60">Titre</span><input value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} className={`${INPUT} mt-1 w-full`} /></label>
        <label className="mt-3 block"><span className="text-xs text-offwhite/60">Prix (€)</span><input value={f.prix} onChange={(e) => setF({ ...f, prix: e.target.value })} className={`${INPUT} mt-1 w-full`} /></label>
        {p.shopify_id && <p className="mt-3 text-[11.5px] text-amber-200/80">Produit déjà sur Shopify : la modification s'applique ici ; republie-le pour mettre Shopify à jour.</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button className={BTN} onClick={onClose}>Annuler</button>
          <button className={BTN_OR} onClick={enregistrer} disabled={envoi}>{envoi ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Parrainage ───────────────────────── */
const eur = (v) => `${Number(v || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;
const NOMS_PROGRAMMES = { parrainage: "Parrainage", ambassadeur: "Ambassadeur", affiliation: "Affiliation" };

export function Parrainage() {
  const [d, setD] = useState(null);
  const [prog, setProg] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState("");
  const [q, setQ] = useState("");
  const [recherche, setRecherche] = useState("");
  const [ajout, setAjout] = useState({ parrain: "", filleul: "" });

  const charger = useCallback(() => {
    fetchAdminParrainage({ page, statut, q: recherche }).then(setD).catch(() => setErreur("Accès refusé ou erreur serveur."));
    fetchAdminProgrammes().then(setProg).catch(() => setProg({ partenaires: [], demandes: [], a_crediter: [] }));
  }, [page, statut, recherche]);
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); setRecherche(q.trim()); }, 350); return () => clearTimeout(t); }, [q]);

  const action = async (fn, ok) => { try { await fn(); if (ok) toast.success(ok); charger(); return true; } catch (e) { toast.error(e.message || "Action impossible."); return false; } };
  const ajouter = (e) => {
    e.preventDefault();
    if (!ajout.parrain.includes("@") || !ajout.filleul.includes("@")) { toast.error("Deux e-mails valides sont nécessaires."); return; }
    action(() => creerParrainageAdmin(ajout.parrain.trim(), ajout.filleul.trim()), "Parrainage ajouté").then((ok) => ok && setAjout({ parrain: "", filleul: "" }));
  };
  const modifierRecompense = (r) => {
    const v = window.prompt(r.recompense_type === "commission" ? "Commission (€) :" : "Mois offerts :", String(r.recompense_valeur ?? 0));
    if (v === null) return;
    const n = Number(String(v).replace(",", "."));
    if (Number.isNaN(n) || n < 0) { toast.error("Valeur invalide."); return; }
    action(() => modifierParrainageAdmin(r.id, { recompense_valeur: n }), "Récompense ajustée");
  };

  if (erreur) return <Carte><p className="text-red-400 text-sm">{erreur}</p></Carte>;
  if (!d) return <Carte><p className="text-offwhite/50 text-sm">Chargement…</p></Carte>;
  return (
    <div className="space-y-4" data-testid="admin-parrainage">
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Parrainages" valeur={d.total} />
        <Kpi label="Actifs (récompensés)" valeur={d.actifs} or />
        <Kpi label="En attente" valeur={d.en_attente} note="filleul pas encore inscrit" />
      </div>

      {prog?.demandes?.length > 0 && (
        <Carte>
          <p className="mb-3 font-semibold">Demandes de programme à valider</p>
          {prog.demandes.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-2 border-b border-white/5 py-2 text-sm">
              <span className="flex-1">{u.email} → <b className="text-gold">{NOMS_PROGRAMMES[u.programme_demande]}</b> <span className="text-xs text-offwhite/45">(actuel : {NOMS_PROGRAMMES[u.programme]})</span></span>
              <button className={BTN_OR} onClick={() => action(() => validerProgramme(u.id, u.programme_demande), "Programme validé")}><Check size={12} /> Valider</button>
              <button className={BTN} onClick={() => action(() => refuserProgrammeAdmin(u.id), "Demande refusée")}>Refuser</button>
            </div>
          ))}
        </Carte>
      )}

      {(prog?.partenaires?.length > 0 || prog?.a_crediter?.length > 0) && (
        <Carte>
          <p className="mb-3 font-semibold">Récompenses à verser</p>
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-white/10 text-left text-offwhite/50"><th className="pb-2">Parrain</th><th className="pb-2">Programme</th><th className="pb-2">Filleuls actifs</th><th className="pb-2">Commission due</th><th className="pb-2">Mois offerts dus</th><th className="pb-2 text-right">Actions</th></tr></thead>
            <tbody>
              {[...new Map([...(prog.partenaires || []), ...(prog.a_crediter || [])].map((u) => [u.id, u])).values()].map((u) => (
                <tr key={u.id} className="border-b border-white/5">
                  <td className="py-2.5">{u.email}</td>
                  <td className="py-2.5">
                    <select value={u.programme} onChange={(e) => action(() => validerProgramme(u.id, e.target.value), "Programme modifié")} className={SELECT}>
                      {Object.entries(NOMS_PROGRAMMES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </td>
                  <td className="py-2.5">{u.filleuls_actifs}</td>
                  <td className="py-2.5">{eur(u.solde_commission)}</td>
                  <td className="py-2.5">{u.mois_offerts_dus}</td>
                  <td className="py-2.5">
                    <div className="flex justify-end gap-1.5">
                      {u.solde_commission > 0 && <button className={BTN} onClick={() => window.confirm(`Marquer ${eur(u.solde_commission)} comme versés à ${u.email} ?`) && action(() => payerCommission(u.id), "Commission marquée versée")}>Marquer payé</button>}
                      {u.mois_offerts_dus > 0 && <button className={BTN_OR} onClick={() => action(() => crediterMoisAdmin(u.id), "Mois offerts appliqués à l'abonnement")} data-testid={`admin-crediter-${u.id}`}><Gift size={12} /> Appliquer {u.mois_offerts_dus} mois</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Carte>
      )}

      <Carte>
        <form onSubmit={ajouter} className="mb-4 flex flex-wrap items-end gap-2">
          <label className="min-w-[180px] flex-1"><span className="text-xs text-offwhite/60">E-mail du parrain</span><input value={ajout.parrain} onChange={(e) => setAjout({ ...ajout, parrain: e.target.value })} className={`${INPUT} mt-1 w-full`} data-testid="admin-parrainage-parrain" /></label>
          <label className="min-w-[180px] flex-1"><span className="text-xs text-offwhite/60">E-mail du filleul</span><input value={ajout.filleul} onChange={(e) => setAjout({ ...ajout, filleul: e.target.value })} className={`${INPUT} mt-1 w-full`} data-testid="admin-parrainage-filleul" /></label>
          <button type="submit" className={`${BTN_OR} h-9`} data-testid="admin-parrainage-ajouter"><Plus size={13} /> Ajouter un parrainage</button>
        </form>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-offwhite/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un parrain ou un filleul…" className={`${INPUT} w-full pl-8`} />
          </div>
          <select value={statut} onChange={(e) => { setStatut(e.target.value); setPage(1); }} className={SELECT}>
            <option value="">Tous les statuts</option><option value="en_attente">En attente</option><option value="actif">Actif</option><option value="expire">Expiré</option>
          </select>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="text-left text-offwhite/50 border-b border-white/10">
              <th className="pb-2">Parrain</th><th className="pb-2">Filleul</th><th className="pb-2">Statut</th><th className="pb-2">Récompense</th><th className="pb-2">Depuis</th><th className="pb-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((r) => (
              <tr key={r.id} className="border-b border-white/5" data-testid={`admin-parrainage-${r.id}`}>
                <td className="py-2.5">{r.parrain_email || "—"}</td>
                <td className="py-2.5">{r.email_filleul}</td>
                <td className="py-2.5">
                  <select value={r.statut} onChange={(e) => action(() => modifierParrainageAdmin(r.id, { statut: e.target.value }), "Statut mis à jour")} className={SELECT} data-testid={`admin-parrainage-statut-${r.id}`}>
                    <option value="en_attente">en attente</option><option value="actif">actif</option><option value="expire">expiré</option>
                  </select>
                </td>
                <td className="py-2.5">
                  <button onClick={() => modifierRecompense(r)} className="inline-flex items-center gap-1 hover:text-gold" title="Ajuster">
                    {r.recompense_type === "commission" ? eur(r.recompense_valeur) : `${r.recompense_valeur} mois offert${r.recompense_valeur > 1 ? "s" : ""}`} <Pencil size={11} className="opacity-60" />
                  </button>
                </td>
                <td className="py-2.5 text-offwhite/50">{dateFr(r.depuis)}</td>
                <td className="py-2.5 text-right">
                  <button className={`${BTN} text-red-300`} onClick={() => window.confirm(`Supprimer le parrainage ${r.parrain_email || ""} → ${r.email_filleul} ?${r.statut === "actif" ? " La récompense créditée sera retirée." : ""}`) && action(() => supprimerParrainageAdmin(r.id), "Parrainage supprimé")} data-testid={`admin-parrainage-supprimer-${r.id}`}><Trash2 size={12} /></button>
                </td>
              </tr>
            ))}
            {!d.items.length && <tr><td colSpan={6} className="py-6 text-center text-offwhite/50">Aucun parrainage.</td></tr>}
          </tbody>
        </table></div>
        <Pagination page={d.page} pages={d.pages} total={d.filtre_total} onPage={setPage} unite="parrainage" />
      </Carte>
    </div>
  );
}
