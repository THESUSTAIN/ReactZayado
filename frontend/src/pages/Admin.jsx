import React, { useState, useEffect } from "react";
import { LayoutDashboard, Users, Store, Gift, Ticket, Video, Mail, Newspaper } from "lucide-react";
import { SideMenuPro } from "@/components/pro/SideMenuPro";
import {
  fetchAdminVueEnsemble, fetchAdminUtilisateurs, changerRoleUtilisateur, changerPlanUtilisateur,
  fetchModerationAttente, publierProduitVendeur, refuserProduitVendeur,
  fetchAdminParrainage, fetchCodesPromo, creerCodePromo, basculerCodePromo, supprimerCodePromo,
  fetchHeygenAvatars, fetchHeygenVoices, heygenGenerer, heygenStatut,
  fetchAdminCommerceStats, fetchAdminCommerceOrders, changerStatutCommandeAdmin,
  fetchAdminCommerceProducts, fetchAdminCommerceVendors,
  fetchDemandesCollaborateur, fetchCompteDemo, transfererCompteDemo,
} from "@/lib/kairosApi";

// Menu inspiré de la structure Sentriq (Vue d'ensemble / Utilisateurs / ...).
// Le Parrainage vient de final-main/affiliate.py, les Codes promo de
// ReactZayado/admin_routes.py (2271 lignes) — vraiment portés cette fois,
// pas juste consultés en référence. "Emails IA" et "Articles SEO" restent
// des onglets à venir — annoncés honnêtement comme tels.
const ONGLETS = [
  { key: "vue", label: "Vue d'ensemble" },
  { key: "utilisateurs", label: "Utilisateurs" },
  { key: "vendeurs", label: "Modération vendeurs" },
  { key: "commerce", label: "Commandes Mollie" },
  { key: "catalogue", label: "Catalogue produits" },
  { key: "comptes-vendeurs", label: "Comptes vendeurs" },
  { key: "parrainage", label: "Parrainage" },
  { key: "codes-promo", label: "Codes promo" },
  { key: "demandes", label: "Demandes collaborateurs" },
  { key: "compte-demo", label: "Compte démo" },
  { key: "videos-ia", label: "Vidéos IA" },
  { key: "emails-ia", label: "Emails IA" },
  { key: "articles-seo", label: "Articles SEO" },
];

export default function Admin() {
  const [onglet, setOnglet] = useState("vue");

  const ICONS = {
    vue: <LayoutDashboard size={16} />, utilisateurs: <Users size={16} />, vendeurs: <Store size={16} />,
    parrainage: <Gift size={16} />, "codes-promo": <Ticket size={16} />, commerce: <Ticket size={16} />, catalogue: <Store size={16} />, "comptes-vendeurs": <Users size={16} />, "videos-ia": <Video size={16} />,
    "emails-ia": <Mail size={16} />, "articles-seo": <Newspaper size={16} />,
  };
  const menuItems = ONGLETS.map((o) => ({ key: o.key, label: o.label, icon: ICONS[o.key] }));

  return (
    <div className="min-h-screen bg-navy-900 text-offwhite">
      <SideMenuPro
        titre="Console Admin"
        sousTitre="Zayado — pilotage plateforme"
        items={menuItems}
        actif={onglet}
        onChange={setOnglet}
        retour={null}
      />
      <div className="min-w-0 px-4 py-5 sm:px-6 lg:ml-[248px] lg:px-10 lg:py-8">
      <h1 className="font-serif text-2xl font-bold">{ONGLETS.find((o) => o.key === onglet)?.label || "Admin"}</h1>
      <p className="text-offwhite/55 text-sm mt-1">Réservé aux comptes avec le rôle admin — vérifié côté serveur.</p>

      <div className="mt-6">
        {onglet === "vue" && <VueEnsemble />}
        {onglet === "utilisateurs" && <Utilisateurs />}
        {onglet === "vendeurs" && <ModerationVendeurs />}
        {onglet === "commerce" && <CommandesMollie />}
        {onglet === "catalogue" && <CatalogueAdmin />}
        {onglet === "comptes-vendeurs" && <ComptesVendeurs />}
        {onglet === "parrainage" && <Parrainage />}
        {onglet === "codes-promo" && <CodesPromo />}
        {onglet === "demandes" && <DemandesCollaborateur />}
        {onglet === "compte-demo" && <CompteDemo />}
        {onglet === "videos-ia" && <VideosIA />}
        {onglet === "emails-ia" && <AVenir label="Emails IA" description="Génération de séquences email par IA — pas encore construit côté serveur ici. Existe en référence chez Sentriq (onglet « Emails IA ») ; à porter si tu confirmes le périmètre exact voulu." />}
        {onglet === "articles-seo" && <AVenir label="Articles SEO" description="Génération d'articles SEO par IA — même remarque : référence Sentriq disponible, pas encore de route serveur ici." />}
      </div>
      </div>
    </div>
  );
}

function DemandesCollaborateur() {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    fetchDemandesCollaborateur().then(setDonnees).catch(() => setErreur("Accès refusé ou erreur serveur."));
  }, []);
  if (erreur) return <Carte><p className="text-red-400 text-sm">{erreur}</p></Carte>;
  if (!donnees) return <Carte><p className="text-offwhite/50 text-sm">Chargement…</p></Carte>;
  if (!donnees.demandes.length) return <Carte><p className="text-offwhite/50 text-sm">Aucune demande pour l'instant.</p></Carte>;
  return (
    <div className="space-y-3">
      {donnees.demandes.map((d) => (
        <Carte key={d.id}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-offwhite/50">
            <span>{d.created_at ? new Date(d.created_at).toLocaleString("fr-FR") : ""}</span>
            <span>Contact : {d.contact || "—"}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm">{d.message}</p>
        </Carte>
      ))}
    </div>
  );
}

function CompteDemo() {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [email, setEmail] = useState("");
  const [choix, setChoix] = useState({});
  const [resultat, setResultat] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const charger = () => {
    fetchCompteDemo()
      .then((d) => { setDonnees(d); setChoix(Object.fromEntries(d.tables.map((t) => [t.table, true]))); })
      .catch(() => setErreur("Accès refusé ou erreur serveur."));
  };
  useEffect(() => { charger(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const transferer = async () => {
    const tables = Object.keys(choix).filter((k) => choix[k]);
    if (!email.includes("@") || !tables.length) return;
    if (!window.confirm(`Transférer ${tables.length} table(s) du compte démo vers ${email} ? Action définitive.`)) return;
    setEnvoi(true);
    try { setResultat(await transfererCompteDemo(email, tables)); charger(); }
    catch { setResultat({ erreur: "Transfert impossible (e-mail inconnu ou erreur serveur)." }); }
    finally { setEnvoi(false); }
  };
  if (erreur) return <Carte><p className="text-red-400 text-sm">{erreur}</p></Carte>;
  if (!donnees) return <Carte><p className="text-offwhite/50 text-sm">Chargement…</p></Carte>;
  return (
    <div className="space-y-4">
      <Carte>
        <p className="text-sm text-offwhite/70">
          Avant le verrou de connexion, certaines données étaient enregistrées dans le compte démo commun.
          Coche les tables à rattacher, indique l'e-mail du compte réel, puis transfère.
        </p>
      </Carte>
      {!donnees.tables.length && <Carte><p className="text-sm text-offwhite/50">Le compte démo est vide. Rien à récupérer.</p></Carte>}
      {donnees.tables.map((t) => (
        <Carte key={t.table}>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" checked={!!choix[t.table]} onChange={(e) => setChoix({ ...choix, [t.table]: e.target.checked })} />
            {t.table} — {t.lignes} ligne(s){t.unique_par_utilisateur ? " · 1 par utilisateur" : ""}
          </label>
          <div className="mt-2 space-y-1 text-xs text-offwhite/50">
            {t.apercu.map((r, i) => <p key={i} className="truncate">{Object.values(r).filter(Boolean).slice(1, 4).join(" · ")}</p>)}
          </div>
        </Carte>
      ))}
      {!!donnees.tables.length && (
        <Carte>
          <div className="flex flex-wrap gap-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email du compte réel"
              className="min-w-[240px] flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm" />
            <button onClick={transferer} disabled={envoi}
              className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-navy-900 disabled:opacity-50">
              {envoi ? "Transfert…" : "Transférer"}
            </button>
          </div>
        </Carte>
      )}
      {resultat && (
        <Carte>
          {resultat.erreur ? <p className="text-sm text-red-400">{resultat.erreur}</p> : (
            <div className="text-sm">
              <p className="font-semibold text-gold">Transféré vers {resultat.vers.email}</p>
              {Object.entries(resultat.transferes).map(([k, v]) => <p key={k}>{k} : {v} ligne(s)</p>)}
              {Object.entries(resultat.ignores).map(([k, v]) => <p key={k} className="text-offwhite/50">{k} ignorée : {v}</p>)}
            </div>
          )}
        </Carte>
      )}
    </div>
  );
}

function Carte({ children }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">{children}</div>;
}

function VueEnsemble() {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    fetchAdminVueEnsemble().then(setDonnees).catch(() => setErreur("Accès refusé ou erreur serveur — vérifie que ton compte a bien le rôle admin."));
  }, []);
  if (erreur) return <Carte><p className="text-red-400 text-sm">{erreur}</p></Carte>;
  if (!donnees) return <Carte><p className="text-offwhite/50 text-sm">Chargement…</p></Carte>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      <Carte><p className="text-offwhite/50 text-xs uppercase tracking-wide">Utilisateurs</p><p className="text-3xl font-bold mt-1">{donnees.utilisateurs_total}</p></Carte>
      <Carte><p className="text-offwhite/50 text-xs uppercase tracking-wide">Clients</p><p className="text-3xl font-bold mt-1">{donnees.par_role.client}</p></Carte>
      <Carte><p className="text-offwhite/50 text-xs uppercase tracking-wide">Vendeurs</p><p className="text-3xl font-bold mt-1">{donnees.par_role.vendeur}</p></Carte>
      <Carte><p className="text-offwhite/50 text-xs uppercase tracking-wide">Admins</p><p className="text-3xl font-bold mt-1">{donnees.par_role.admin}</p></Carte>
    </div>
  );
}

function CommandesMollie() {
  const [data, setData] = useState(null); const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const load = () => Promise.all([fetchAdminCommerceOrders(status), fetchAdminCommerceStats()]).then(([orders, summary]) => { setData(orders); setStats(summary); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  const update = async (id, next) => { try { await changerStatutCommandeAdmin(id, next); load(); } catch (e) { setError(e.message); } };
  return <div className="space-y-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"><Carte><p className="text-xs uppercase tracking-wide text-offwhite/50">Commandes</p><p className="mt-1 text-3xl font-bold">{stats?.total ?? "—"}</p></Carte><Carte><p className="text-xs uppercase tracking-wide text-offwhite/50">Payées</p><p className="mt-1 text-3xl font-bold text-gold">{stats?.paid ?? "—"}</p></Carte><Carte><p className="text-xs uppercase tracking-wide text-offwhite/50">Filtre</p><select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-2 rounded-lg border border-white/15 bg-navy-800 px-2 py-1 text-sm"><option value="">Tous les statuts</option>{["pending", "paid", "failed", "canceled", "expired", "refunded"].map((s) => <option key={s}>{s}</option>)}</select></Carte></div>{error && <Carte><p className="text-sm text-red-400">{error}</p></Carte>}<Carte><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-white/10 text-left text-offwhite/50"><th className="pb-2">Date</th><th className="pb-2">Client</th><th className="pb-2">Commande</th><th className="pb-2">Montant</th><th className="pb-2">Statut</th><th className="pb-2">Action</th></tr></thead><tbody>{data?.items?.map((o) => <tr key={o.id} className="border-b border-white/5"><td className="py-2.5 text-offwhite/55">{o.created_at ? new Date(o.created_at).toLocaleDateString("fr-FR") : "—"}</td><td className="py-2.5">{o.email}</td><td className="py-2.5"><span className="text-xs text-offwhite/50">{o.kind}</span><br />{o.title}</td><td className="py-2.5">{o.amount} {o.currency}</td><td className="py-2.5"><span className="rounded-full bg-white/10 px-2 py-1 text-xs">{o.status}</span></td><td className="py-2.5"><select value={o.status} onChange={(e) => update(o.id, e.target.value)} className="rounded-lg border border-white/15 bg-navy-800 px-2 py-1 text-xs">{["pending", "paid", "failed", "canceled", "expired", "refunded"].map((s) => <option key={s}>{s}</option>)}</select></td></tr>)}{data && !data.items.length && <tr><td colSpan={6} className="py-6 text-center text-offwhite/50">Aucune commande.</td></tr>}</tbody></table></div></Carte></div>;
}

function CatalogueAdmin() {
  const [items, setItems] = useState(null); const [error, setError] = useState("");
  useEffect(() => { fetchAdminCommerceProducts().then((d) => setItems(d.items)).catch((e) => setError(e.message)); }, []);
  if (error) return <Carte><p className="text-sm text-red-400">{error}</p></Carte>;
  if (!items) return <Carte><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;
  return <Carte><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b border-white/10 text-left text-offwhite/50"><th className="pb-2">Produit</th><th className="pb-2">Vendeur</th><th className="pb-2">Prix</th><th className="pb-2">Statut</th><th className="pb-2">Shopify</th></tr></thead><tbody>{items.map((p) => <tr key={p.id} className="border-b border-white/5"><td className="py-2.5">{p.title}<br /><span className="text-[10px] text-offwhite/40">{p.id}</span></td><td className="py-2.5">{p.vendor}<br /><span className="text-xs text-offwhite/45">{p.vendor_email || "—"}</span></td><td className="py-2.5">{p.price} €</td><td className="py-2.5"><span className="rounded-full bg-white/10 px-2 py-1 text-xs">{p.status}</span></td><td className="py-2.5 text-xs text-offwhite/55">{p.shopify_id || "Non synchronisé"}</td></tr>)}{!items.length && <tr><td colSpan={5} className="py-6 text-center text-offwhite/50">Aucun produit.</td></tr>}</tbody></table></div></Carte>;
}

function ComptesVendeurs() {
  const [items, setItems] = useState(null); const [error, setError] = useState("");
  useEffect(() => { fetchAdminCommerceVendors().then((d) => setItems(d.items)).catch((e) => setError(e.message)); }, []);
  if (error) return <Carte><p className="text-sm text-red-400">{error}</p></Carte>;
  if (!items) return <Carte><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;
  return <Carte><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b border-white/10 text-left text-offwhite/50"><th className="pb-2">Email</th><th className="pb-2">Boutique</th><th className="pb-2">Rôle</th><th className="pb-2">Produits</th></tr></thead><tbody>{items.map((v) => <tr key={v.id} className="border-b border-white/5"><td className="py-2.5">{v.email}</td><td className="py-2.5">{v.shop || "—"}</td><td className="py-2.5"><span className="rounded-full bg-white/10 px-2 py-1 text-xs">{v.role}</span></td><td className="py-2.5">{v.products}</td></tr>)}</tbody></table></div></Carte>;
}

function Utilisateurs() {
  const [items, setItems] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const charger = () => {
    setChargement(true);
    fetchAdminUtilisateurs().then((d) => setItems(d.items)).catch(() => setErreur("Accès refusé ou erreur serveur.")).finally(() => setChargement(false));
  };
  useEffect(() => { charger(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changerRole = async (id, role) => {
    try { await changerRoleUtilisateur(id, role); charger(); }
    catch { setErreur("Échec du changement de rôle."); }
  };
  const changerPlan = async (u, plan) => {
    if (plan === u.plan) return;
    let fondateur = false;
    let jours = 31;
    if (plan !== "essentielle") {
      const saisie = window.prompt(`Accès ${plan} pour ${u.email} : combien de jours ?`, "31");
      if (saisie === null) return;
      jours = parseInt(saisie, 10) || 31;
      fondateur = window.confirm("Lui garantir le tarif fondateur à ses renouvellements ?");
    }
    try { await changerPlanUtilisateur(u.id, plan, jours, fondateur); charger(); }
    catch { setErreur("Échec du changement d'offre."); }
  };

  if (erreur) return <Carte><p className="text-red-400 text-sm">{erreur}</p></Carte>;
  if (chargement) return <Carte><p className="text-offwhite/50 text-sm">Chargement…</p></Carte>;

  return (
    <Carte>
      <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="text-left text-offwhite/50 border-b border-white/10">
            <th className="pb-2">Email</th><th className="pb-2">Rôle</th><th className="pb-2">Offre</th><th className="pb-2">Inscrit le</th><th className="pb-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((u) => (
            <tr key={u.id} className="border-b border-white/5">
              <td className="py-2.5">{u.email}</td>
              <td className="py-2.5"><span className="px-2 py-0.5 rounded-full bg-white/10 text-xs">{u.role}</span></td>
              <td className="py-2.5">
                <select value={u.plan || "essentielle"} onChange={(e) => changerPlan(u, e.target.value)}
                  data-testid={`admin-plan-select-${u.id}`}
                  className="bg-navy-800 border border-white/15 rounded-lg text-xs px-2 py-1">
                  <option value="essentielle">Découverte</option>
                  <option value="serenite">Solo</option>
                  <option value="pro">Pro</option>
                  <option value="business">Équipe</option>
                  <option value="entreprise">Entreprise</option>
                </select>
              </td>
              <td className="py-2.5 text-offwhite/50">{new Date(u.inscrit_le).toLocaleDateString("fr-FR")}</td>
              <td className="py-2.5">
                <select
                  value={u.role}
                  onChange={(e) => changerRole(u.id, e.target.value)}
                  data-testid={`admin-role-select-${u.id}`}
                  className="bg-navy-800 border border-white/15 rounded-lg text-xs px-2 py-1"
                >
                  <option value="client">client</option>
                  <option value="vendeur">vendeur</option>
                  <option value="admin">admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </Carte>
  );
}

function ModerationVendeurs() {
  const [items, setItems] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const charger = () => {
    setChargement(true);
    fetchModerationAttente().then((d) => setItems(d.items)).catch(() => setErreur("Accès refusé ou erreur serveur.")).finally(() => setChargement(false));
  };
  useEffect(() => { charger(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const publier = async (pid) => { try { await publierProduitVendeur(pid); charger(); } catch { setErreur("Échec de la publication."); } };
  const refuser = async (pid) => {
    const motif = window.prompt("Motif du refus (visible par le vendeur) :", "");
    if (motif === null) return;
    try { await refuserProduitVendeur(pid, motif); charger(); } catch { setErreur("Échec du refus."); }
  };

  if (erreur) return <Carte><p className="text-red-400 text-sm">{erreur}</p></Carte>;
  if (chargement) return <Carte><p className="text-offwhite/50 text-sm">Chargement…</p></Carte>;
  if (!items.length) return <Carte><p className="text-offwhite/50 text-sm">Aucun produit en attente de modération.</p></Carte>;

  return (
    <div className="space-y-3">
      {items.map((p) => (
        <Carte key={p.id}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">{p.nom || p.titre || "Produit sans nom"}</p>
              <p className="text-offwhite/50 text-xs mt-0.5">{p.id}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => publier(p.id)} data-testid={`admin-publier-${p.id}`} className="px-3 py-1.5 rounded-lg bg-gold/15 text-gold text-xs font-semibold hover:bg-gold/25">Publier</button>
              <button onClick={() => refuser(p.id)} data-testid={`admin-refuser-${p.id}`} className="px-3 py-1.5 rounded-lg border border-white/15 text-xs hover:bg-white/10">Refuser</button>
            </div>
          </div>
        </Carte>
      ))}
    </div>
  );
}

function Parrainage() {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    fetchAdminParrainage().then(setDonnees).catch(() => setErreur("Accès refusé ou erreur serveur."));
  }, []);
  if (erreur) return <Carte><p className="text-red-400 text-sm">{erreur}</p></Carte>;
  if (!donnees) return <Carte><p className="text-offwhite/50 text-sm">Chargement…</p></Carte>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Carte><p className="text-offwhite/50 text-xs uppercase tracking-wide">Parrainages totaux</p><p className="text-3xl font-bold mt-1">{donnees.total}</p></Carte>
        <Carte><p className="text-offwhite/50 text-xs uppercase tracking-wide">Actifs (bonus versé)</p><p className="text-3xl font-bold mt-1">{donnees.actifs}</p></Carte>
      </div>
      <Carte>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-offwhite/50 border-b border-white/10">
              <th className="pb-2">Filleul</th><th className="pb-2">Statut</th><th className="pb-2">Bonus</th><th className="pb-2">Depuis</th>
            </tr>
          </thead>
          <tbody>
            {donnees.items.map((r) => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="py-2.5">{r.email_filleul}</td>
                <td className="py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs ${r.statut === "actif" ? "bg-gold/15 text-gold" : "bg-white/10"}`}>{r.statut}</span></td>
                <td className="py-2.5">{r.bonus_credits} crédits</td>
                <td className="py-2.5 text-offwhite/50">{new Date(r.depuis).toLocaleDateString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </Carte>
    </div>
  );
}

function CodesPromo() {
  const [items, setItems] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [nouveauCode, setNouveauCode] = useState({ code: "", value: "", max_uses: "100" });

  const charger = () => { setChargement(true); fetchCodesPromo().then((d) => setItems(d.items)).finally(() => setChargement(false)); };
  useEffect(() => { charger(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const creer = async (e) => {
    e.preventDefault();
    try {
      await creerCodePromo({ code: nouveauCode.code, value: Number(nouveauCode.value), max_uses: Number(nouveauCode.max_uses) });
      setNouveauCode({ code: "", value: "", max_uses: "100" });
      charger();
    } catch { /* toast déjà géré par l'appel si besoin */ }
  };
  const basculer = async (p) => { await basculerCodePromo(p.id, !p.active); charger(); };
  const supprimer = async (p) => { if (window.confirm(`Supprimer le code ${p.code} ?`)) { await supprimerCodePromo(p.id); charger(); } };

  return (
    <>
      <Carte>
        <form onSubmit={creer} className="flex gap-2 flex-wrap">
          <input value={nouveauCode.code} onChange={(e) => setNouveauCode((c) => ({ ...c, code: e.target.value }))} placeholder="CODE" className="bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm w-32" data-testid="promo-code-input" />
          <input value={nouveauCode.value} onChange={(e) => setNouveauCode((c) => ({ ...c, value: e.target.value }))} placeholder="Crédits" type="number" className="bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm w-28" data-testid="promo-value-input" />
          <input value={nouveauCode.max_uses} onChange={(e) => setNouveauCode((c) => ({ ...c, max_uses: e.target.value }))} placeholder="Max usages" type="number" className="bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm w-28" data-testid="promo-maxuses-input" />
          <button type="submit" className="px-4 py-2 rounded-xl bg-gold/15 text-gold text-sm font-semibold" data-testid="promo-create-btn">Créer</button>
        </form>
      </Carte>
      {chargement ? <Carte><p className="text-offwhite/50 text-sm">Chargement…</p></Carte> : (
        <Carte>
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-left text-offwhite/50 border-b border-white/10"><th className="pb-2">Code</th><th className="pb-2">Valeur</th><th className="pb-2">Usages</th><th className="pb-2">Statut</th><th className="pb-2">Action</th></tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="py-2.5 font-mono">{p.code}</td>
                  <td className="py-2.5">{p.value} crédits</td>
                  <td className="py-2.5">{p.current_uses}/{p.max_uses}</td>
                  <td className="py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs ${p.active ? "bg-gold/15 text-gold" : "bg-white/10"}`}>{p.active ? "actif" : "inactif"}</span></td>
                  <td className="py-2.5 flex gap-2">
                    <button onClick={() => basculer(p)} className="text-xs underline text-offwhite/60 hover:text-offwhite">{p.active ? "désactiver" : "activer"}</button>
                    <button onClick={() => supprimer(p)} className="text-xs underline text-red-400/70 hover:text-red-400">supprimer</button>
                  </td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={5} className="py-3 text-offwhite/50">Aucun code promo créé.</td></tr>}
            </tbody>
          </table></div>
        </Carte>
      )}
    </>
  );
}

function VideosIA() {
  // HeyGen piloté ici (console admin) — plus de dépendance WordPress.
  const [avatars, setAvatars] = useState([]);
  const [voix, setVoix] = useState([]);
  const [form, setForm] = useState({ avatar_id: "", voice_id: "", titre: "", script: "" });
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [video, setVideo] = useState(null);

  useEffect(() => {
    Promise.all([fetchHeygenAvatars(), fetchHeygenVoices()])
      .then(([a, v]) => {
        const la = a.avatars || [];
        const lv = v.voices || [];
        setAvatars(la);
        setVoix(lv);
        if (la[0]) setForm((f) => ({ ...f, avatar_id: la[0].avatar_id }));
        if (lv[0]) setForm((f) => ({ ...f, voice_id: lv[0].voice_id }));
      })
      .catch(() => setErreur("Impossible de joindre HeyGen — la clé HEYGEN_API_KEY n'est probablement pas configurée côté serveur (à ajouter dans les variables d'environnement)."))
      .finally(() => setChargement(false));
  }, []);

  const generer = async (e) => {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await heygenGenerer({ avatar_id: form.avatar_id, voice_id: form.voice_id, script: form.script, title: form.titre || "Zayado" });
      setVideo(r);
    } catch {
      setErreur("Échec de la génération — vérifie le script et la clé HeyGen.");
    } finally {
      setEnvoi(false);
    }
  };

  const rafraichir = async () => {
    if (!video?.video_id) return;
    try { setVideo(await heygenStatut(video.video_id)); } catch { setErreur("Statut indisponible."); }
  };

  if (chargement) return <Carte><p className="text-offwhite/50 text-sm">Chargement des avatars HeyGen…</p></Carte>;

  return (
    <div className="space-y-4">
      {erreur && <Carte><p className="text-red-400 text-sm">{erreur}</p></Carte>}
      <Carte>
        <form onSubmit={generer} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs text-offwhite/60">
              Avatar
              <select value={form.avatar_id} onChange={(e) => setForm((f) => ({ ...f, avatar_id: e.target.value }))} data-testid="admin-avatar-select" className="mt-1 w-full bg-navy-800 border border-white/15 rounded-xl text-sm px-3 py-2">
                {avatars.map((a) => <option key={a.avatar_id} value={a.avatar_id}>{a.avatar_name || a.avatar_id}</option>)}
              </select>
            </label>
            <label className="text-xs text-offwhite/60">
              Voix
              <select value={form.voice_id} onChange={(e) => setForm((f) => ({ ...f, voice_id: e.target.value }))} data-testid="admin-voice-select" className="mt-1 w-full bg-navy-800 border border-white/15 rounded-xl text-sm px-3 py-2">
                {voix.map((v) => <option key={v.voice_id} value={v.voice_id}>{v.name || v.voice_id}{v.language ? ` — ${v.language}` : ""}</option>)}
              </select>
            </label>
          </div>
          <input value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} placeholder="Titre de la vidéo (optionnel)" data-testid="admin-video-titre-input" className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm" />
          <textarea value={form.script} onChange={(e) => setForm((f) => ({ ...f, script: e.target.value }))} placeholder="Script que l'avatar va dire (max 1500 caractères)…" rows={5} maxLength={1500} data-testid="admin-script-input" className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm" />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={envoi || !form.script.trim()} data-testid="admin-generate-video-btn" className="px-4 py-2 rounded-xl bg-gold/15 text-gold text-sm font-semibold hover:bg-gold/25 disabled:opacity-40">
              {envoi ? "Génération…" : "Générer la vidéo"}
            </button>
            <span className="text-[11px] text-offwhite/40">{form.script.length}/1500 caractères</span>
          </div>
        </form>
      </Carte>
      {video && (
        <Carte>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Vidéo <span className="font-mono text-xs text-offwhite/50">{video.video_id}</span></p>
              <p className="text-xs mt-1" data-testid="admin-video-status">Statut : <span className="text-gold">{video.status}</span></p>
              {video.video_url && <a href={video.video_url} target="_blank" rel="noreferrer" className="text-xs text-gold underline">Voir la vidéo</a>}
            </div>
            <button onClick={rafraichir} data-testid="admin-video-refresh-btn" className="px-3 py-1.5 rounded-lg border border-white/15 text-xs hover:bg-white/10">Rafraîchir le statut</button>
          </div>
        </Carte>
      )}
    </div>
  );
}

function AVenir({ label, description }) {
  return (
    <Carte>
      <p className="font-medium text-offwhite">{label} — pas encore construit</p>
      <p className="text-offwhite/55 text-sm mt-1.5">{description}</p>
    </Carte>
  );
}
