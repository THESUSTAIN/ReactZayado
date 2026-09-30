import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send, Trash2, Search, Flag, Check, ShieldAlert } from "lucide-react";
import {
  fetchAdminEquipe, inviterEquipe, retirerEquipe, changerRoleUtilisateur,
  fetchAdminJournal, fetchAdminFoiSignalements, deciderFoiSignalement,
} from "@/lib/kairosApi";
import { Carte, MOTIFS_ACCES } from "./AdminGestion";

const NOMS = { reveur: "Rêveur", serenite: "Solo", pro: "Pro", business: "Équipe", entreprise: "Entreprise" };
const INPUT = "h-9 rounded-lg border border-white/15 bg-navy-800 px-3 text-sm text-offwhite outline-none focus:border-gold/60";
const SELECT = "h-9 rounded-lg border border-white/15 bg-navy-800 px-2 text-sm";
const BTN = "inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1 text-xs hover:bg-white/10 disabled:opacity-50";
const dateFr = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "—");

/* Équipe Zayado & accès offerts : inviter un collaborateur, même sans compte. */
export function AdminEquipe() {
  const [d, setD] = useState(null);
  const [form, setForm] = useState({ email: "", plan: "pro", motif: "equipe", note: "", envoyer_email: true });
  const [envoi, setEnvoi] = useState(false);
  const charger = () => fetchAdminEquipe().then(setD).catch(() => setD({ items: [], erreur: true }));
  useEffect(() => { charger(); }, []);

  const inviter = async (e) => {
    e.preventDefault();
    if (!form.email.includes("@")) { toast.error("Indique une adresse e-mail."); return; }
    setEnvoi(true);
    try { const r = await inviterEquipe(form); toast.success(r.message || "C'est fait."); setForm({ ...form, email: "", note: "" }); charger(); }
    catch (err) { toast.error(err.message || "Invitation impossible."); }
    setEnvoi(false);
  };
  const retirer = async (x) => {
    if (!window.confirm(`Retirer l'accès de ${x.email} ? ${x.statut === "actif" ? "Son offre gratuite s'arrête immédiatement" : "L'invitation est annulée"}${x.role === "admin" ? " et il perd l'accès à la console" : ""}.`)) return;
    try { await retirerEquipe(x.email); toast.success("Accès retiré."); charger(); } catch (err) { toast.error(err.message); }
  };
  const basculerAdmin = async (x) => {
    const devient = x.role === "admin" ? "client" : "admin";
    if (!window.confirm(devient === "admin" ? `Donner à ${x.email} l'accès à TOUTE la console admin (utilisateurs, paiements, contenus) ?` : `Retirer à ${x.email} l'accès à la console admin ?`)) return;
    try { await changerRoleUtilisateur(x.user_id, devient); toast.success(devient === "admin" ? "Accès console donné." : "Accès console retiré."); charger(); } catch { toast.error("Changement impossible."); }
  };

  return (
    <div className="space-y-4" data-testid="admin-equipe">
      <Carte>
        <p className="font-semibold">Donner accès à quelqu'un</p>
        <p className="mt-1 text-[12.5px] text-offwhite/60">Collaborateur, partenaire, testeur : il reçoit l'offre choisie, gratuite et sans carte bancaire. S'il n'a pas encore de compte, l'accès s'active tout seul quand il s'inscrit avec cette adresse. L'accès à la console admin se donne ensuite, séparément, dans la liste ci-dessous.</p>
        <form onSubmit={inviter} className="mt-4 grid gap-2 sm:grid-cols-[1.4fr_0.8fr_0.9fr_1fr_auto]">
          <input className={INPUT} type="email" placeholder="prenom@zayado.net" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="equipe-email" />
          <select className={SELECT} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} data-testid="equipe-plan">
            {Object.entries(NOMS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <select className={SELECT} value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} data-testid="equipe-motif">
            {Object.entries(MOTIFS_ACCES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input className={INPUT} placeholder="Note (poste, raison…)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <button className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gold px-4 text-sm font-semibold text-navy-900 disabled:opacity-50" disabled={envoi} data-testid="equipe-inviter">
            {envoi ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Donner l'accès
          </button>
        </form>
        <label className="mt-2 inline-flex items-center gap-2 text-xs text-offwhite/60"><input type="checkbox" checked={form.envoyer_email} onChange={(e) => setForm({ ...form, envoyer_email: e.target.checked })} /> Lui envoyer l'e-mail d'invitation (s'il n'a pas de compte)</label>
      </Carte>

      <Carte>
        <p className="mb-3 font-semibold">Accès offerts {d?.items ? <span className="text-offwhite/50">· {d.items.length}</span> : null}</p>
        {!d && <p className="text-sm text-offwhite/50">Chargement…</p>}
        {d?.items?.length === 0 && <p className="text-sm text-offwhite/50">Personne pour l'instant.</p>}
        {!!d?.items?.length && (
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b border-white/10 text-left text-offwhite/50"><th className="pb-2">Personne</th><th className="pb-2">Offre</th><th className="pb-2">Motif</th><th className="pb-2">État</th><th className="pb-2">Console admin</th><th className="pb-2 text-right">Action</th></tr></thead>
            <tbody>
              {d.items.map((x) => (
                <tr key={x.email} className="border-b border-white/5" data-testid={`equipe-ligne-${x.email}`}>
                  <td className="py-2.5 pr-2"><p>{x.email}</p>{x.note && <p className="text-[11px] text-offwhite/45">{x.note}</p>}</td>
                  <td className="py-2.5">{NOMS[x.plan] || x.plan}</td>
                  <td className="py-2.5 text-offwhite/70">{x.motif_label}</td>
                  <td className="py-2.5 text-xs">{x.statut === "invite"
                    ? <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-amber-200">Invité · pas encore inscrit</span>
                    : <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-emerald-300">Actif{x.derniere_connexion ? ` · vu le ${dateFr(x.derniere_connexion)}` : ""}</span>}</td>
                  <td className="py-2.5">{x.user_id
                    ? <button className={BTN} onClick={() => basculerAdmin(x)} data-testid={`equipe-admin-${x.email}`}>{x.role === "admin" ? <><Check size={12} className="text-emerald-300" /> Oui · retirer</> : "Donner l'accès"}</button>
                    : <span className="text-xs text-offwhite/40">après inscription</span>}</td>
                  <td className="py-2.5 text-right"><button className={BTN} onClick={() => retirer(x)} data-testid={`equipe-retirer-${x.email}`}><Trash2 size={12} /> Retirer</button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </Carte>
    </div>
  );
}

/* Journal : qui a fait quoi dans la console. */
export function AdminJournal() {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => fetchAdminJournal(q.trim()).then((d) => setItems(d.items)).catch(() => setItems([])), 300);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <Carte>
      <div className="relative mb-3 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-offwhite/40" />
        <input className={`${INPUT} w-full pl-8`} placeholder="Filtrer par e-mail ou action…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!items && <p className="text-sm text-offwhite/50">Chargement…</p>}
      {items?.length === 0 && <p className="text-sm text-offwhite/50">Aucune action enregistrée.</p>}
      <div className="space-y-1.5" data-testid="admin-journal">
        {items?.map((a) => (
          <div key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-white/[0.06] py-2 text-sm">
            <span className="w-32 shrink-0 text-[12px] text-offwhite/45">{new Date(a.le).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            <span className="font-medium">{a.action}</span>
            {a.cible && <span className="text-gold">{a.cible}</span>}
            <span className="ml-auto text-[12px] text-offwhite/50">par {a.admin || "?"}</span>
            {a.details && <span className="w-full break-all pl-0 text-[11px] text-offwhite/40 sm:pl-[140px]">{JSON.stringify(a.details.parametres || a.details.donnees)}</span>}
          </div>
        ))}
      </div>
    </Carte>
  );
}

/* Modération Ma Foi : publications signalées. */
const MOTIFS_SIG = { inapproprie: "Inapproprié", haineux: "Haineux", spam: "Spam / pub", donnees_perso: "Données personnelles", autre: "Autre" };
export function AdminModerationFoi() {
  const [items, setItems] = useState(null);
  const charger = () => fetchAdminFoiSignalements().then((d) => setItems(d.items)).catch(() => setItems([]));
  useEffect(() => { charger(); }, []);
  const decider = async (id, decision) => {
    if (decision === "supprimer" && !window.confirm("Supprimer définitivement cette publication et ses réponses ?")) return;
    try { await deciderFoiSignalement(id, decision); toast.success(decision === "garder" ? "Publication conservée." : "Publication supprimée."); charger(); } catch { toast.error("Action impossible."); }
  };
  if (!items) return <Carte><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;
  if (!items.length) return <Carte><p className="text-sm text-offwhite/60">Aucun signalement en attente. Une publication signalée 3 fois est masquée automatiquement en attendant ta décision.</p></Carte>;
  return (
    <div className="space-y-3" data-testid="admin-moderation-foi">
      {items.map((x) => (
        <Carte key={x.post_id}>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-400/15 px-2 py-0.5 text-red-300"><Flag size={11} /> {x.nombre} signalement{x.nombre > 1 ? "s" : ""}</span>
            {x.masque && <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/15 px-2 py-0.5 text-amber-200"><ShieldAlert size={11} /> masquée</span>}
            <span className="text-offwhite/50">{x.espace === "mur" ? "Mur de prière" : "Cercle"} · {x.auteur_affiche} ({x.auteur_email}) · {dateFr(x.publie_le)}</span>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm">{x.texte}</p>
          <p className="mt-2 text-xs text-offwhite/55">Motifs : {x.motifs.map((m) => MOTIFS_SIG[m] || m).join(", ")}{x.commentaires.length ? ` · « ${x.commentaires.join(" » · « ")} »` : ""}</p>
          <div className="mt-3 flex gap-2">
            <button className={BTN} onClick={() => decider(x.post_id, "garder")}><Check size={12} /> Garder</button>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/80 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-500" onClick={() => decider(x.post_id, "supprimer")}><Trash2 size={12} /> Supprimer</button>
          </div>
        </Carte>
      ))}
    </div>
  );
}
