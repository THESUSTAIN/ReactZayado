import React, { useState, useEffect } from "react";
import { LayoutDashboard, Users, Store, Gift, Ticket, Video, Mail, Newspaper, CheckCircle2, AlertTriangle, CircleDashed, Images, Inbox, UserCog, Link2, ScrollText, ShoppingBag, BadgeCheck, History, Flag, ChevronRight, Info } from "lucide-react";
import CarrouselLoginAdmin from "@/components/admin/CarrouselLoginAdmin";
import { SideMenuPro } from "@/components/pro/SideMenuPro";
import {
  fetchAdminDiagnostics,
  fetchAdminVueEnsemble,
  fetchModerationAttente, publierProduitVendeur, refuserProduitVendeur,
  fetchCodesPromo, creerCodePromo, basculerCodePromo, supprimerCodePromo,
  fetchHeygenAvatars, fetchHeygenVoices, heygenGenerer, heygenStatut,
  fetchAdminCommerceStats, fetchAdminCommerceOrders, changerStatutCommandeAdmin,
  fetchDemandesCollaborateur, fetchCompteDemo, transfererCompteDemo,
  fetchAdminNotifications, fetchAdminATraiter, majDemandeCollaborateur,
} from "@/lib/kairosApi";
import { toast } from "sonner";
import { AdminEquipe, AdminJournal, AdminModerationFoi } from "@/components/admin/AdminEquipe";
import { Bell } from "lucide-react";
import EmailsIA from "@/components/admin/EmailsIA";
import AdminNewsletters from "@/components/admin/AdminNewsletters";
import AdminConnexions from "@/components/admin/AdminConnexions";
import AdminAppLogs from "@/components/admin/AdminAppLogs";
import { Utilisateurs, ComptesVendeurs, CatalogueAdmin, Parrainage } from "@/components/admin/AdminGestion";
import { useThemePro } from "@/lib/themePro";

// Menu inspiré de la structure Sentriq (Vue d'ensemble / Utilisateurs / ...).
// Le Parrainage vient de final-main/affiliate.py, les Codes promo de
// ReactZayado/admin_routes.py (2271 lignes) — vraiment portés cette fois,
// pas juste consultés en référence. "Emails IA" et "Articles SEO" restent
// des onglets à venir — annoncés honnêtement comme tels.
const ONGLETS = [
  { key: "vue", label: "Vue d'ensemble", groupe: "Pilotage" },
  { key: "journal", label: "Journal des actions", groupe: "Pilotage" },
  { key: "utilisateurs", label: "Utilisateurs", groupe: "Utilisateurs" },
  { key: "equipe", label: "Équipe & accès offerts", groupe: "Utilisateurs" },
  { key: "connexions", label: "Connexions utilisateurs", groupe: "Utilisateurs" },
  { key: "demandes", label: "Demandes collaborateurs", groupe: "Utilisateurs" },
  { key: "notifications", label: "Notifications", groupe: "Utilisateurs" },
  { key: "commerce", label: "Commandes Mollie", groupe: "Ventes" },
  { key: "parrainage", label: "Parrainage", groupe: "Ventes" },
  { key: "codes-promo", label: "Codes promo", groupe: "Ventes" },
  { key: "vendeurs", label: "Modération vendeurs", groupe: "Ventes" },
  { key: "catalogue", label: "Catalogue produits", groupe: "Ventes" },
  { key: "comptes-vendeurs", label: "Comptes vendeurs", groupe: "Ventes" },
  { key: "moderation-foi", label: "Modération Ma Foi", groupe: "Contenus" },
  { key: "newsletters", label: "Newsletters", groupe: "Contenus" },
  { key: "emails-ia", label: "Emails IA", groupe: "Contenus" },
  { key: "videos-ia", label: "Vidéos IA", groupe: "Contenus" },
  { key: "carrousel", label: "Carrousel login", groupe: "Contenus" },
  { key: "logs", label: "Logs applicatifs", groupe: "Technique" },
  { key: "compte-demo", label: "Compte démo", groupe: "Technique" },
];

export default function Admin() {
  const [onglet, setOnglet] = useState("vue");
  const [theme] = useThemePro();

  const ICONS = {
    vue: <LayoutDashboard size={16} />, utilisateurs: <Users size={16} />, vendeurs: <Store size={16} />,
    parrainage: <Gift size={16} />, "codes-promo": <Ticket size={16} />, commerce: <ShoppingBag size={16} />, catalogue: <Store size={16} />, "comptes-vendeurs": <Users size={16} />, "videos-ia": <Video size={16} />,
    "emails-ia": <Mail size={16} />, "articles-seo": <Newspaper size={16} />, notifications: <Bell size={16} />, carrousel: <Images size={16} />,
    demandes: <Inbox size={16} />, "compte-demo": <UserCog size={16} />, newsletters: <Newspaper size={16} />, connexions: <Link2 size={16} />, logs: <ScrollText size={16} />,
    equipe: <BadgeCheck size={16} />, journal: <History size={16} />, "moderation-foi": <Flag size={16} />,
  };
  const menuItems = ONGLETS.map((o) => ({ key: o.key, label: o.label, groupe: o.groupe, icon: ICONS[o.key] }));

  return (
    <div className={`min-h-screen text-offwhite ${theme === "clair" ? "pro-clair pro-cours" : "pro-sombre"}`} data-testid="admin-root">
      <SideMenuPro
        titre="Console Admin"
        sousTitre="Zayado — pilotage plateforme"
        items={menuItems}
        actif={onglet}
        onChange={setOnglet}
        retour={null}
      />
      <div className="min-w-0 px-4 py-5 sm:px-6 lg:ml-[288px] lg:px-10 lg:py-8">
      <h1 className="font-serif text-2xl font-bold">{ONGLETS.find((o) => o.key === onglet)?.label || "Admin"}</h1>

      <div className="mt-6">
        {onglet === "vue" && <VueEnsemble allerA={setOnglet} />}
        {onglet === "equipe" && <AdminEquipe />}
        {onglet === "journal" && <AdminJournal />}
        {onglet === "moderation-foi" && <AdminModerationFoi />}
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
        {onglet === "notifications" && <NotificationsAdmin />}
        {onglet === "emails-ia" && <EmailsIA />}
        {onglet === "carrousel" && <CarrouselLoginAdmin />}
        {onglet === "newsletters" && <AdminNewsletters />}
        {onglet === "connexions" && <AdminConnexions />}
        {onglet === "logs" && <AdminAppLogs />}
        {onglet === "articles-seo" && <AVenir label="Articles SEO" description="Génération d'articles SEO par IA — même remarque : référence Sentriq disponible, pas encore de route serveur ici." />}
      </div>
      </div>
    </div>
  );
}

function DemandesCollaborateur() {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [reponses, setReponses] = useState({});
  const charger = () => fetchDemandesCollaborateur().then(setDonnees).catch(() => setErreur("Accès refusé ou erreur serveur."));
  useEffect(() => { charger(); }, []);
  const maj = async (d, patch, msg) => {
    try { const r = await majDemandeCollaborateur(d.id, patch); toast.success(msg + (r.email_envoye ? " · e-mail envoyé" : "")); charger(); }
    catch { toast.error("Mise à jour impossible."); }
  };
  if (erreur) return <Carte><p className="text-red-400 text-sm">{erreur}</p></Carte>;
  if (!donnees) return <Carte><p className="text-offwhite/50 text-sm">Chargement…</p></Carte>;
  if (!donnees.demandes.length) return <Carte><p className="text-offwhite/50 text-sm">Aucune demande pour l'instant.</p></Carte>;
  const STATUTS = { nouvelle: "Nouvelle", en_cours: "En cours", traitee: "Traitée" };
  return (
    <div className="space-y-3" data-testid="admin-demandes">
      {donnees.demandes.map((d) => (
        <Carte key={d.id}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-offwhite/50">
            <span>{d.created_at ? new Date(d.created_at).toLocaleString("fr-FR") : ""} · {d.email || "compte inconnu"}{d.contact && d.contact !== d.email ? ` · répondre à ${d.contact}` : ""}</span>
            <select value={d.statut} onChange={(e) => maj(d, { statut: e.target.value, prevenir: false }, "Statut mis à jour")}
              className={`rounded-lg border border-white/15 bg-navy-800 px-2 py-1 text-xs ${d.statut === "nouvelle" ? "text-amber-200" : d.statut === "traitee" ? "text-emerald-300" : "text-gold"}`}>
              {Object.entries(STATUTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm">{d.message}</p>
          {d.reponse && <p className="mt-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">Ta réponse : {d.reponse}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <textarea rows={2} value={reponses[d.id] ?? ""} onChange={(e) => setReponses({ ...reponses, [d.id]: e.target.value })}
              placeholder={d.reponse ? "Modifier la réponse…" : "Répondre (visible dans son espace + e-mail)…"}
              className="min-w-[240px] flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm" />
            <button disabled={!(reponses[d.id] || "").trim()} onClick={() => { maj(d, { reponse: reponses[d.id], statut: d.statut === "nouvelle" ? "en_cours" : d.statut }, "Réponse envoyée"); setReponses({ ...reponses, [d.id]: "" }); }}
              className="self-start rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-navy-900 disabled:opacity-40">Répondre</button>
          </div>
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
  return <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">{children}</div>;
}

const NOMS_OFFRES = { reveur: "Rêveur", serenite: "Solo", pro: "Pro", business: "Équipe", entreprise: "Entreprise" };
const eur = (v) => `${Number(v || 0).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;

function Kpi({ label, valeur, note, or }) {
  return (
    <Carte>
      <p className="text-offwhite/50 text-xs uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${or ? "text-gold" : ""}`}>{valeur}</p>
      {note && <p className="mt-1 text-[11px] text-offwhite/45">{note}</p>}
    </Carte>
  );
}

function Branchements() {
  const [d, setD] = useState(null);
  useEffect(() => { fetchAdminDiagnostics().then(setD).catch(() => setD({ erreur: true })); }, []);
  if (!d) return <Carte><p className="text-sm text-offwhite/50">Vérification des branchements…</p></Carte>;
  if (d.erreur || !d.branchements) return <Carte><p className="text-sm text-red-400">Diagnostic indisponible.</p></Carte>;
  const manquants = d.branchements.filter((x) => !x.ok);
  return (
    <Carte>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="font-semibold">Branchements</p>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${manquants.some((x) => x.critique) ? "bg-red-400/15 text-red-300" : manquants.length ? "bg-amber-300/15 text-amber-200" : "bg-emerald-400/15 text-emerald-300"}`} data-testid="admin-branchements-statut">
          {manquants.some((x) => x.critique) ? "À corriger avant la mise en vente" : manquants.length ? `${manquants.length} option(s) non branchée(s)` : "Tout est branché"}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2" data-testid="admin-branchements">
        {/* Les urgences d'abord : critiques manquants, puis options, puis ce qui est branché. */}
        {[...d.branchements].sort((a, b) => (a.ok - b.ok) || ((b.critique ? 1 : 0) - (a.critique ? 1 : 0))).map((x) => (
          <div key={x.cle} className={`flex min-w-0 gap-2.5 rounded-xl border p-3 ${x.ok ? "border-emerald-300/20 bg-emerald-300/[0.05]" : x.critique ? "border-red-300/30 bg-red-300/[0.07]" : "border-white/10 bg-white/[0.03]"}`}>
            <span className="mt-0.5 shrink-0">{x.ok ? <CheckCircle2 size={16} className="text-emerald-300" /> : x.critique ? <AlertTriangle size={16} className="text-red-300" /> : <CircleDashed size={16} className="text-offwhite/50" />}</span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold">{x.nom}</p>
              {!x.ok && <p className="text-[12px] text-offwhite/60">{x.effet}</p>}
              {!x.ok && <p className="mt-1 text-[11px] text-offwhite/45">Railway (service backend) : {x.variables.map((v) => <code key={v} className="mr-1 break-all rounded bg-white/10 px-1">{v}</code>)}</p>}
            </div>
          </div>
        ))}
      </div>
    </Carte>
  );
}

function ATraiter({ allerA }) {
  const [items, setItems] = useState(null);
  useEffect(() => { fetchAdminATraiter().then((d) => setItems(d.items)).catch(() => setItems([])); }, []);
  const STYLE = { urgent: "border-red-300/30 bg-red-300/[0.07]", a_voir: "border-amber-300/25 bg-amber-300/[0.06]", info: "border-white/10 bg-white/[0.03]" };
  const ICONE = { urgent: <AlertTriangle size={15} className="text-red-300" />, a_voir: <CircleDashed size={15} className="text-amber-200" />, info: <Info size={15} className="text-offwhite/60" /> };
  return (
    <Carte>
      <p className="mb-3 font-semibold">À traiter aujourd'hui</p>
      {!items && <p className="text-sm text-offwhite/50">Chargement…</p>}
      {items?.length === 0 && <p className="flex items-center gap-2 text-sm text-emerald-300" data-testid="admin-a-traiter-vide"><CheckCircle2 size={16} /> Rien d'urgent : tout est à jour.</p>}
      <div className="grid gap-2 sm:grid-cols-2" data-testid="admin-a-traiter">
        {items?.map((x) => (
          <button key={x.cle} onClick={() => allerA(x.onglet)} className={`flex min-w-0 items-center gap-2.5 rounded-xl border p-3 text-left text-sm transition hover:brightness-125 ${STYLE[x.niveau]}`}>
            <span className="shrink-0">{ICONE[x.niveau]}</span><span className="min-w-0 flex-1">{x.texte}</span><ChevronRight size={14} className="shrink-0 text-offwhite/40" />
          </button>
        ))}
      </div>
    </Carte>
  );
}

function VueEnsemble({ allerA }) {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    fetchAdminVueEnsemble().then(setDonnees).catch(() => setErreur("Accès refusé ou erreur serveur — vérifie que ton compte a bien le rôle admin (déconnecte-toi puis reconnecte-toi après un changement de rôle)."));
  }, []);
  if (erreur) return <Carte><p className="text-red-400 text-sm">{erreur}</p></Carte>;
  if (!donnees) return <Carte><p className="text-offwhite/50 text-sm">Chargement…</p></Carte>;
  const ab = donnees.abonnements || { par_offre: {} };
  return (
    <div className="space-y-4" data-testid="admin-vue">
      <ATraiter allerA={allerA} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
        <Kpi label="Revenu mensuel" valeur={eur(ab.mrr_ttc)} note="TTC prélevés — pas de TVA collectée" or />
        <Kpi label="Clients payants" valeur={ab.payants ?? 0} />
        <Kpi label="Essais en cours" valeur={ab.essais_en_cours ?? 0} note="1 € · 1 mois" />
        <Kpi label="Résiliations" valeur={ab.resilies_en_cours ?? 0} note="accès jusqu'à fin de période" />
        <Kpi label="Fondateurs" valeur={ab.fondateurs ?? 0} />
        <Kpi label="Inscrits (7 j)" valeur={donnees.inscrits_7j ?? 0} note={`${donnees.utilisateurs_total} au total`} />
      </div>
      <Carte>
        <p className="mb-3 font-semibold">Abonnés par offre</p>
        <div className="flex flex-wrap gap-2" data-testid="admin-par-offre">
          {["reveur", "serenite", "pro", "business", "entreprise"].map((k) => (
            <span key={k} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm">{NOMS_OFFRES[k]} <b className="ml-1 text-gold">{ab.par_offre?.[k] || 0}</b></span>
          ))}
          <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-offwhite/60">Vendeurs {donnees.par_role.vendeur} · Admins {donnees.par_role.admin}</span>
        </div>
      </Carte>
      <Carte>
        <p className="mb-1 font-semibold">Accueil — écran de présentation</p>
        <p className="mb-3 text-[12.5px] text-offwhite/55">Combien de nouveaux visiteurs cliquent « Oui, je veux ça » plutôt que « Pas encore ».</p>
        <div className="grid grid-cols-3 gap-3" data-testid="admin-accueil">
          <Kpi label="« Oui, je veux ça »" valeur={donnees.accueil?.oui ?? 0} />
          <Kpi label="« Pas encore »" valeur={donnees.accueil?.pas_encore ?? 0} />
          <Kpi label="Taux d'adhésion" valeur={`${donnees.accueil?.taux_oui ?? 0} %`} note={`${donnees.accueil?.total ?? 0} clics`} or />
        </div>
      </Carte>
      <Branchements />
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

function NotificationsAdmin() {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    fetchAdminNotifications().then(setDonnees).catch(() => setErreur("Accès refusé ou erreur serveur."));
  }, []);
  if (erreur) return <Carte><p className="text-red-400 text-sm">{erreur}</p></Carte>;
  if (!donnees) return <Carte><p className="text-offwhite/50 text-sm">Chargement…</p></Carte>;
  const actifs = donnees.comptes.filter((c) => c.notifications).length;
  return (
    <div className="space-y-4">
      <Carte>
        <p className="text-offwhite/50 text-xs uppercase tracking-wide mb-3">Types de notifications envoyées par l'appli</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {donnees.catalogue.map((n) => (
            <div key={n.cle} className="rounded-lg border border-white/10 px-3 py-2">
              <p className="text-sm font-semibold text-offwhite">{n.label}</p>
              <p className="text-xs text-offwhite/50 mt-0.5">{n.desc}</p>
            </div>
          ))}
        </div>
      </Carte>
      <div className="grid grid-cols-2 gap-4">
        <Carte><p className="text-offwhite/50 text-xs uppercase tracking-wide">Comptes avec notifications actives</p><p className="text-3xl font-bold mt-1">{actifs} / {donnees.comptes.length}</p></Carte>
        <Carte><p className="text-offwhite/50 text-xs uppercase tracking-wide">Types catalogués</p><p className="text-3xl font-bold mt-1">{donnees.catalogue.length}</p></Carte>
      </div>
      <Carte>
        <p className="text-offwhite/50 text-xs uppercase tracking-wide mb-2">Qui reçoit quoi</p>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-offwhite/50 border-b border-white/10">
              <th className="pb-2">Compte</th><th className="pb-2">Notifications</th><th className="pb-2">Heure check-in</th><th className="pb-2">Fuseau</th><th className="pb-2">Marché</th>
            </tr>
          </thead>
          <tbody>
            {donnees.comptes.map((c) => (
              <tr key={c.email} className="border-b border-white/5">
                <td className="py-2.5">{c.prenom ? `${c.prenom} · ` : ""}{c.email}</td>
                <td className="py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs ${c.notifications ? "bg-gold/15 text-gold" : "bg-white/10 text-offwhite/50"}`}>{c.notifications ? "Actives" : "Coupées"}</span></td>
                <td className="py-2.5 text-offwhite/70">{c.heure_checkin || "—"}</td>
                <td className="py-2.5 text-offwhite/50">{c.fuseau || "—"}</td>
                <td className="py-2.5 text-offwhite/50">{c.marche}</td>
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
          <input value={nouveauCode.value} onChange={(e) => setNouveauCode((c) => ({ ...c, value: e.target.value }))} placeholder="Mois offerts" type="number" className="bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm w-28" data-testid="promo-value-input" />
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
                  <td className="py-2.5">{p.value} mois</td>
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
