// Espace vendeur façon Dokan — composants partagés (vendeur + admin).
// Tous les montants viennent de /api/vendeur/* et /api/admin/vendeurs/* (rien d'estimé).
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Banknote, Check, Copy, FileText, Loader2, Pause, Play, Truck, Wallet, X } from "lucide-react";
import { GlassCard } from "@/zy/components/kairos/GlassCard";
import { call } from "@/zy/lib/part2Api";
import { getToken } from "@/zy/lib/kairosApi";

const BTN = "rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50";
const CHAMP_BASE = "rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-offwhite outline-none focus:border-gold";
const CHAMP = `w-full ${CHAMP_BASE}`;
const eur = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n || 0));
const dateFR = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "—");
const erreur = (e) => toast.error(e?.message || "Action impossible");

const STATUT_REV = {
  demande: ["Demandé", "bg-sky-400/15 text-sky-500"],
  valide: ["Validé", "bg-amber-400/15 text-amber-500"],
  paye: ["Payé", "bg-emerald-400/15 text-emerald-500"],
  refuse: ["Refusé", "bg-rose-400/15 text-rose-500"],
};
const ETAPES = [["preparee", "Préparée"], ["expediee", "Expédiée"], ["livree", "Livrée"]];

function Kpi({ label, valeur, sous, testId }) {
  return (
    <GlassCard className="space-y-1" data-testid={testId}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-offwhite/55">{label}</p>
      <p className="font-serif text-2xl font-bold text-gold">{valeur}</p>
      {sous ? <p className="text-[11px] text-offwhite/55">{sous}</p> : null}
    </GlassCard>
  );
}

// ---------- Tableau de bord vendeur ----------
export function TableauVendeur({ onAller }) {
  const [t, setT] = useState(null);
  const [seuil, setSeuil] = useState("");
  const charger = useCallback(() => call("/vendeur/tableau-de-bord").then((d) => { setT(d); setSeuil(String(d.seuil_stock)); }).catch(erreur), []);
  useEffect(() => { charger(); }, [charger]);
  if (!t) return <Loader2 className="animate-spin text-gold" />;
  const max = Math.max(1, ...t.par_mois.map((m) => m.ca));
  return (
    <div className="space-y-4" data-testid="vendeur-tableau">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi testId="vendeur-kpi-ca" label="Chiffre d'affaires" valeur={eur(t.ca_brut)} sous={`${t.ventes_nb} vente(s) payée(s)`} />
        <Kpi testId="vendeur-kpi-commission" label={`Commission Zayado (${t.commission_taux} %)`} valeur={eur(t.commission_montant)} sous={t.commission_perso ? "Taux négocié" : "Taux standard"} />
        <Kpi testId="vendeur-kpi-net" label="Vos gains nets" valeur={eur(t.net)} sous={`Déjà reversé : ${eur(t.reverse)}`} />
        <Kpi testId="vendeur-kpi-solde" label="Solde disponible" valeur={eur(t.solde_disponible)} sous={t.en_cours > 0 ? `En cours de reversement : ${eur(t.en_cours)}` : "Prêt à être reversé"} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={`${BTN} inline-flex items-center gap-1 bg-gold text-navy-900`} onClick={() => onAller("reversements")} data-testid="vendeur-aller-reversements"><Wallet size={14} /> Demander un reversement</button>
        <button className={`${BTN} inline-flex items-center gap-1 border border-white/15 text-offwhite/80`} onClick={() => onAller("commandes")} data-testid="vendeur-aller-commandes"><Truck size={14} /> Suivre mes commandes</button>
      </div>
      <GlassCard className="space-y-2" data-testid="vendeur-ventes-mois">
        <p className="text-sm font-semibold text-offwhite">Ventes payées par mois</p>
        {t.par_mois.length === 0 ? <p className="text-xs text-offwhite/55">Aucune vente payée pour l'instant. Les ventes Shopify de vos produits apparaîtront ici.</p> : (
          <div className="flex h-32 items-end gap-2">
            {t.par_mois.map((m) => (
              <div key={m.mois} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={eur(m.ca)} data-testid="vendeur-barre-mois">
                <span className="text-[10px] text-gold">{eur(m.ca)}</span>
                <div className="w-full max-w-16 rounded-t-md bg-gold/70 transition-[height] duration-500" style={{ height: `${Math.max(4, (m.ca / max) * 75)}%` }} />
                <span className="text-[10px] text-offwhite/55">{m.mois.slice(5, 7)}/{m.mois.slice(2, 4)}</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
      <GlassCard className="space-y-2" data-testid="vendeur-stock-bas">
        <div className="flex flex-wrap items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          <p className="text-sm font-semibold text-offwhite">Alerte stock bas</p>
          <span className="ml-auto text-[11px] text-offwhite/55">Seuil</span>
          <input className={`${CHAMP_BASE} w-20`} inputMode="numeric" value={seuil} onChange={(e) => setSeuil(e.target.value)} data-testid="vendeur-seuil-input" />
          <button className={`${BTN} border border-white/15 text-offwhite/80`} data-testid="vendeur-seuil-enregistrer"
            onClick={() => call("/vendeur/seuil-stock", "PUT", { seuil: Number(seuil) || 0 }).then(() => { toast.success("Seuil enregistré"); charger(); }).catch(erreur)}>OK</button>
        </div>
        {t.stock_bas.length === 0 ? <p className="text-xs text-offwhite/55">Aucun produit sous le seuil.</p> : (
          <ul className="space-y-1 text-sm">{t.stock_bas.map((p) => <li key={p.id} className="flex justify-between text-offwhite/85"><span>{p.titre}</span><span className="text-amber-500">{p.stock} en stock</span></li>)}</ul>
        )}
      </GlassCard>
    </div>
  );
}

// ---------- Relevé mensuel PDF (téléchargement authentifié) ----------
function ReleveMensuel() {
  const d = new Date();
  const [mois, setMois] = useState(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  const [busy, setBusy] = useState(false);
  const telecharger = async () => {
    setBusy(true);
    try {
      const token = getToken();
      const r = await fetch(`/api/vendeur/releve.pdf?mois=${mois}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.detail || "Relevé indisponible");
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url; a.download = `releve-zayado-${mois}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { erreur(e); } finally { setBusy(false); }
  };
  return (
    <GlassCard className="flex flex-wrap items-center gap-2" data-testid="vendeur-releve">
      <FileText size={16} className="text-gold" />
      <p className="text-sm font-semibold text-offwhite">Relevé mensuel PDF</p>
      <input type="month" className={`${CHAMP_BASE} ml-auto w-44`} value={mois} onChange={(e) => setMois(e.target.value)} data-testid="vendeur-releve-mois" />
      <button disabled={busy || !mois} onClick={telecharger} className={`${BTN} inline-flex items-center gap-1 bg-gold text-navy-900`} data-testid="vendeur-releve-telecharger">
        {busy ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} Télécharger
      </button>
      <p className="w-full text-[11px] text-offwhite/45">Ventes payées du mois (avec le taux de commission figé de chaque vente) et reversements payés.</p>
    </GlassCard>
  );
}

// ---------- Reversements vendeur ----------
export function ReversementsVendeur() {
  const [t, setT] = useState(null);
  const [items, setItems] = useState([]);
  const [iban, setIban] = useState({ titulaire: "", iban: "" });
  const [montant, setMontant] = useState("");
  const [busy, setBusy] = useState(false);
  const charger = useCallback(async () => {
    try {
      const d = await call("/vendeur/tableau-de-bord");
      setT(d); setIban((x) => ({ ...x, titulaire: x.titulaire || d.titulaire }));
      setItems((await call("/vendeur/reversements")).items);
    } catch (e) { erreur(e); }
  }, []);
  useEffect(() => { charger(); }, [charger]);
  const agir = async (fn, ok) => { setBusy(true); try { await fn(); toast.success(ok); await charger(); } catch (e) { erreur(e); } finally { setBusy(false); } };
  if (!t) return <Loader2 className="animate-spin text-gold" />;
  return (
    <div className="space-y-4" data-testid="vendeur-reversements">
      <GlassCard className="space-y-3">
        <p className="text-sm font-semibold text-offwhite">Coordonnées bancaires</p>
        {t.iban_renseigne ? <p className="text-xs text-emerald-500" data-testid="vendeur-iban-masque">IBAN enregistré : {t.iban_masque} ({t.titulaire})</p> : <p className="text-xs text-amber-500">Renseignez votre IBAN pour recevoir vos reversements.</p>}
        <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
          <input className={CHAMP} placeholder="Titulaire du compte" value={iban.titulaire} onChange={(e) => setIban({ ...iban, titulaire: e.target.value })} data-testid="vendeur-iban-titulaire" />
          <input className={CHAMP} placeholder="FR76 …" value={iban.iban} onChange={(e) => setIban({ ...iban, iban: e.target.value })} data-testid="vendeur-iban-input" />
          <button disabled={busy} className={`${BTN} bg-gold text-navy-900`} data-testid="vendeur-iban-enregistrer"
            onClick={() => agir(() => call("/vendeur/iban", "PUT", iban).then(() => setIban((x) => ({ ...x, iban: "" }))), "IBAN enregistré (chiffré)")}>Enregistrer</button>
        </div>
        <p className="text-[11px] text-offwhite/45">L'IBAN est chiffré. Seule l'équipe Zayado le voit en clair, au moment de faire le virement.</p>
      </GlassCard>
      <GlassCard className="space-y-3">
        <p className="text-sm font-semibold text-offwhite">Demander un reversement — solde disponible : <span className="text-gold" data-testid="vendeur-solde">{eur(t.solde_disponible)}</span></p>
        <div className="flex flex-wrap gap-2">
          <input className={`${CHAMP_BASE} w-40`} inputMode="decimal" placeholder="Montant (€)" value={montant} onChange={(e) => setMontant(e.target.value)} data-testid="vendeur-reversement-montant" />
          <button className={`${BTN} border border-white/15 text-offwhite/80`} onClick={() => setMontant(String(t.solde_disponible))} data-testid="vendeur-reversement-tout">Tout le solde</button>
          <button disabled={busy || !t.iban_renseigne || !(Number(montant.replace(",", ".")) > 0)} className={`${BTN} inline-flex items-center gap-1 bg-gold text-navy-900`} data-testid="vendeur-reversement-demander"
            onClick={() => agir(() => call("/vendeur/reversements", "POST", { montant: Number(montant.replace(",", ".")) }).then(() => setMontant("")), "Demande envoyée à Zayado")}><Banknote size={14} /> Demander</button>
        </div>
      </GlassCard>
      <ReleveMensuel />
      <div className="space-y-2">
        {items.length === 0 ? <p className="text-sm text-offwhite/55">Aucune demande de reversement.</p> : items.map((r) => {
          const [l, cls] = STATUT_REV[r.statut] || STATUT_REV.demande;
          return (
            <GlassCard key={r.id} className="flex flex-wrap items-center gap-3" data-testid="vendeur-reversement-ligne">
              <span className="font-semibold text-gold">{eur(r.montant)}</span>
              <span className="text-xs text-offwhite/60">demandé le {dateFR(r.demande_le)} · {r.iban_masque}</span>
              {r.note ? <span className="text-xs text-offwhite/60">· {r.note}</span> : null}
              <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${cls}`}>{l}</span>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Suivi d'une commande (dans la carte commande) ----------
export function SuiviCommande({ commande, suivi, onFait }) {
  const [etape, setEtape] = useState(suivi?.etape || "preparee");
  const [transporteur, setTransporteur] = useState(suivi?.transporteur || "");
  const [numero, setNumero] = useState(suivi?.numero || "");
  const [busy, setBusy] = useState(false);
  const enregistrer = async () => {
    setBusy(true);
    try { await call(`/vendeur/commandes/${commande.id}/suivi`, "PUT", { etape, transporteur, numero }); toast.success("Suivi mis à jour"); onFait(); }
    catch (e) { erreur(e); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2" data-testid="vendeur-suivi">
      <Truck size={14} className="text-gold" />
      {ETAPES.map(([k, l]) => (
        <button key={k} onClick={() => setEtape(k)} data-testid={`vendeur-suivi-${k}`}
          className={`${BTN} ${etape === k ? "bg-gold text-navy-900" : "border border-white/15 text-offwhite/75"}`}>{l}</button>
      ))}
      {etape !== "preparee" && (
        <>
          <input className={`${CHAMP_BASE} w-32`} placeholder="Transporteur" value={transporteur} onChange={(e) => setTransporteur(e.target.value)} data-testid="vendeur-suivi-transporteur" />
          <input className={`${CHAMP_BASE} w-40`} placeholder="N° de suivi" value={numero} onChange={(e) => setNumero(e.target.value)} data-testid="vendeur-suivi-numero" />
        </>
      )}
      <button disabled={busy} onClick={enregistrer} className={`${BTN} border border-gold/40 text-gold`} data-testid="vendeur-suivi-enregistrer">Enregistrer</button>
      {suivi?.maj_le ? <span className="text-[10px] text-offwhite/45">mis à jour le {dateFR(suivi.maj_le)}</span> : null}
    </div>
  );
}

// ---------- Actions produit supplémentaires ----------
export function ActionsProduit({ produit, busy, agir }) {
  return (
    <>
      <button disabled={busy} className={`${BTN} inline-flex items-center gap-1 border border-white/15 text-offwhite/80`} data-testid="market-dupliquer"
        onClick={() => agir(() => call(`/vendeur/produits/${produit.id}/dupliquer`, "POST"), "Produit dupliqué (brouillon)")}><Copy size={12} /> Dupliquer</button>
      {produit.statut === "publie" && (
        <button disabled={busy} className={`${BTN} inline-flex items-center gap-1 border border-amber-300/30 text-amber-500`} data-testid="market-pause"
          onClick={() => agir(() => call(`/vendeur/produits/${produit.id}/pause`, "POST").then((r) => { if (r.message) toast.info(r.message); }), "Produit mis en pause")}><Pause size={12} /> Mettre en pause</button>
      )}
      {produit.statut === "pause" && (
        <button disabled={busy} className={`${BTN} inline-flex items-center gap-1 border border-emerald-300/30 text-emerald-500`} data-testid="market-reprendre"
          onClick={() => agir(() => call(`/vendeur/produits/${produit.id}/reprendre`, "POST").then((r) => { if (r.message) toast.info(r.message); }), "Produit remis en vente")}><Play size={12} /> Remettre en vente</button>
      )}
    </>
  );
}

// ---------- Admin : finances vendeurs ----------
export function AdminVendeursFinances() {
  const [f, setF] = useState(null);
  const [revs, setRevs] = useState([]);
  const [filtre, setFiltre] = useState("demande");
  const [taux, setTaux] = useState("");
  const [busy, setBusy] = useState(false);
  const charger = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([call("/admin/vendeurs/finances"), call(`/admin/vendeurs/reversements?statut=${filtre}`)]);
      setF(d); setTaux(String(d.taux_defaut)); setRevs(r.items);
    } catch (e) { erreur(e); }
  }, [filtre]);
  useEffect(() => { charger(); }, [charger]);
  const agir = async (fn, ok) => { setBusy(true); try { await fn(); toast.success(ok); await charger(); } catch (e) { erreur(e); } finally { setBusy(false); } };
  const action = (r, a) => {
    let note = "";
    if (a === "refuser") { note = window.prompt("Motif du refus (visible par le vendeur) :") || ""; if (!note.trim()) return; }
    if (a === "payer" && !window.confirm(`Confirmer que le virement de ${eur(r.montant)} à ${r.titulaire} a bien été fait ?`)) return;
    agir(() => call(`/admin/vendeurs/reversements/${r.id}/${a}`, "POST", { note }), a === "payer" ? "Marqué payé" : a === "valider" ? "Reversement validé" : "Reversement refusé");
  };
  if (!f) return <Loader2 className="animate-spin text-gold" />;
  return (
    <div className="space-y-4" data-testid="admin-vendeurs-finances">
      <GlassCard className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">Commission plateforme (taux global)</p>
        <input className={`${CHAMP_BASE} w-24`} inputMode="decimal" value={taux} onChange={(e) => setTaux(e.target.value)} data-testid="admin-commission-input" />
        <span className="text-sm">%</span>
        <button disabled={busy} className={`${BTN} bg-gold text-navy-900`} data-testid="admin-commission-enregistrer"
          onClick={() => agir(() => call("/admin/vendeurs/commission", "PUT", { taux: Number(taux.replace(",", ".")) }), "Taux global enregistré")}>Enregistrer</button>
        <span className="text-[11px] opacity-60">Appliqué à tous les vendeurs sans taux négocié.</span>
      </GlassCard>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Vendeurs ({f.vendeurs.length})</p>
        {f.vendeurs.length === 0 ? <p className="text-sm opacity-60">Aucun compte vendeur.</p> : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-xs" data-testid="admin-vendeurs-table">
              <thead><tr className="text-left opacity-60">{["Vendeur", "Ventes", "CA", "Commission", "Net", "Reversé", "En cours", "Solde", "Taux"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {f.vendeurs.map((v) => (
                  <tr key={v.user_id} className="border-t border-white/10">
                    <td className="px-3 py-2">{v.email}</td><td className="px-3 py-2">{v.ventes_nb}</td>
                    <td className="px-3 py-2">{eur(v.ca_brut)}</td><td className="px-3 py-2">{eur(v.commission_montant)}</td>
                    <td className="px-3 py-2">{eur(v.net)}</td><td className="px-3 py-2">{eur(v.reverse)}</td>
                    <td className="px-3 py-2">{eur(v.en_cours)}</td><td className="px-3 py-2 text-gold">{eur(v.solde_disponible)}</td>
                    <td className="px-3 py-2">
                      <button className="underline" data-testid={`admin-taux-vendeur-${v.user_id}`} onClick={() => {
                        const s = window.prompt(`Taux négocié pour ${v.email} (en %, vide = taux global) :`, v.commission_perso ? String(v.commission_taux) : "");
                        if (s === null) return;
                        agir(() => call(`/admin/vendeurs/${v.user_id}/commission`, "PUT", { taux: s.trim() === "" ? null : Number(s.replace(",", ".")) }), "Taux mis à jour");
                      }}>{v.commission_taux} %{v.commission_perso ? " (négocié)" : ""}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUT_REV).map(([k, [l]]) => (
            <button key={k} onClick={() => setFiltre(k)} data-testid={`admin-rev-filtre-${k}`} className={`${BTN} ${filtre === k ? "bg-gold text-navy-900" : "border border-white/15"}`}>{l}</button>
          ))}
        </div>
        {revs.length === 0 ? <p className="text-sm opacity-60">Aucun reversement « {STATUT_REV[filtre][0].toLowerCase()} ».</p> : revs.map((r) => (
          <GlassCard key={r.id} className="flex flex-wrap items-center gap-3" data-testid="admin-reversement-ligne">
            <span className="font-semibold text-gold">{eur(r.montant)}</span>
            <span className="text-xs opacity-75">{r.email} · demandé le {dateFR(r.demande_le)}</span>
            {r.iban ? <span className="rounded-lg bg-white/5 px-2 py-1 font-mono text-[11px]" data-testid="admin-reversement-iban">{r.titulaire} — {r.iban}</span> : <span className="text-xs opacity-60">{r.iban_masque}</span>}
            <div className="ml-auto flex gap-2">
              {r.statut === "demande" && <button disabled={busy} className={`${BTN} inline-flex items-center gap-1 bg-gold text-navy-900`} onClick={() => action(r, "valider")} data-testid="admin-rev-valider"><Check size={12} /> Valider</button>}
              {r.statut === "valide" && <button disabled={busy} className={`${BTN} inline-flex items-center gap-1 bg-emerald-400 text-navy-900`} onClick={() => action(r, "payer")} data-testid="admin-rev-payer"><Banknote size={12} /> Marquer payé</button>}
              {(r.statut === "demande" || r.statut === "valide") && <button disabled={busy} className={`${BTN} inline-flex items-center gap-1 border border-rose-400/30 text-rose-500`} onClick={() => action(r, "refuser")} data-testid="admin-rev-refuser"><X size={12} /> Refuser</button>}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

// Admin — paiements des tunnels des utilisateurs (GET /api/admin/paiements-tunnels) :
// commission Zayado, net à reverser (encaissement centralisé) et bouton « Marquer reversé ».
export function AdminPaiementsTunnels() {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const charger = useCallback(async () => {
    try { setD(await call("/admin/paiements-tunnels")); } catch (e) { erreur(e); }
  }, []);
  useEffect(() => { charger(); }, [charger]);
  const reverser = async (c) => {
    if (!window.confirm(`Confirmer le virement de ${eur(c.solde)} à ${c.titulaire || c.email} (${c.iban || "IBAN manquant"}) ?`)) return;
    setBusy(true);
    try { await call(`/admin/paiements-tunnels/${c.user_id}/reverser`, "POST"); toast.success("Marqué reversé"); await charger(); } catch (e) { erreur(e); } finally { setBusy(false); }
  };
  if (!d) return <Loader2 className="animate-spin text-gold" />;
  const t = d.totaux;
  return (
    <div className="space-y-4" data-testid="admin-paiements-tunnels">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi testId="admin-tunnels-kpi-brut" label="Ventes des tunnels" valeur={eur(t.brut)} sous={`${t.ventes} paiement(s)`} />
        <Kpi testId="admin-tunnels-kpi-commission" label="Commission Zayado" valeur={eur(t.commission)} />
        <Kpi testId="admin-tunnels-kpi-a-reverser" label="Encaissé pour les créateurs" valeur={eur(t.a_reverser)} sous="encaissement centralisé" />
        <Kpi testId="admin-tunnels-kpi-solde" label="Reste à reverser" valeur={eur(t.solde)} />
      </div>
      <GlassCard className="overflow-x-auto">
        <table className="w-full text-xs text-offwhite">
          <thead><tr className="text-left opacity-60">{["Créateur", "Mollie", "Ventes", "Commission", "Net", "Reversé", "Solde", "IBAN", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {d.createurs.map((c) => (
              <tr key={c.user_id} className="border-t border-white/5" data-testid={`admin-tunnels-createur-${c.user_id}`}>
                <td className="px-3 py-2">{c.email || c.user_id}</td><td className="px-3 py-2">{c.connecte ? "Relié" : "—"}</td>
                <td className="px-3 py-2">{eur(c.brut)}</td><td className="px-3 py-2">{eur(c.commission)}</td><td className="px-3 py-2">{eur(c.net)}</td>
                <td className="px-3 py-2">{eur(c.reverse)}</td><td className="px-3 py-2 font-semibold text-gold">{eur(c.solde)}</td>
                <td className="px-3 py-2">{c.iban || "—"}</td>
                <td className="px-3 py-2">{c.solde > 0 ? <button disabled={busy} className={`${BTN} bg-gold text-navy-900`} onClick={() => reverser(c)} data-testid={`admin-tunnels-reverser-${c.user_id}`}><Banknote size={12} className="inline" /> Marquer reversé</button> : null}</td>
              </tr>
            ))}
            {!d.createurs.length ? <tr><td colSpan={9} className="px-3 py-4 text-center opacity-60">Aucune vente de tunnel pour l'instant.</td></tr> : null}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
