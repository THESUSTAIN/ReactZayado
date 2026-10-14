import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Tag, Store, RotateCcw, Plus, Trash2, Loader2, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { fetchAdminPrix, enregistrerAdminPrix, prixVersShopify, prixOrigine } from "@/zy/lib/kairosApi";
import { chargerPrix } from "@/zy/lib/plans";

// Admin › Prix : le seul endroit où l'on change un prix.
// Enregistrer = paiement Mollie + grille de l'app + iframe des pages Shopify, tout de suite.
// Option : recopier sur les fiches produits Shopify (prix affiché sur la boutique).

const Carte = ({ children, className = "" }) => <section className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${className}`}>{children}</section>;
const CHAMP = "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-offwhite placeholder:text-offwhite/30 tabular-nums focus:border-[#DEC2A3]/60 focus:outline-none";

function TitreBloc({ icone, titre, texte }) {
  return (
    <div className="mb-4">
      <p className="flex items-center gap-2 text-sm font-semibold">{icone}{titre}</p>
      {texte ? <p className="mt-1 text-xs leading-relaxed text-offwhite/55">{texte}</p> : null}
    </div>
  );
}

function ChampPrix({ value, onChange, label, testid, origine }) {
  const change = origine != null && Number(value) !== Number(origine);
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-offwhite/45">{label}</span>
      <div className="relative">
        <input type="number" inputMode="decimal" min="0" step="0.01" value={value ?? ""} onChange={(e) => onChange(e.target.value)}
          className={`${CHAMP} pr-8 ${change ? "border-[#DEC2A3]/50" : ""}`} data-testid={testid} />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-offwhite/40">€</span>
      </div>
      {change ? <span className="mt-1 block text-[11px] text-[#DEC2A3]">avant : {Number(origine).toLocaleString("fr-FR")} €</span> : null}
    </label>
  );
}

const nombre = (v) => (v === "" || v == null ? null : Number(String(v).replace(",", ".")));
const moisOfferts = (m, a) => (m > 0 && a > 0 ? Math.round((12 - a / m) * 10) / 10 : null);

export default function AdminPrix() {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [plans, setPlans] = useState({});
  const [fondateur, setFondateur] = useState({});
  const [plancher, setPlancher] = useState("");
  const [tunnel, setTunnel] = useState({});
  const [services, setServices] = useState([]);
  const [shopify, setShopify] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [rapport, setRapport] = useState(null);

  const remplir = useCallback((d) => {
    setDonnees(d);
    setPlans(Object.fromEntries(d.plans.map((p) => [p.cle, { mensuel: p.mensuel, annuel: p.annuel }])));
    setFondateur(Object.fromEntries(d.fondateur.map((p) => [p.cle, { mensuel: p.mensuel, annuel: p.annuel }])));
    setPlancher(d.entreprise_plancher ?? "");
    setTunnel(Object.fromEntries((d.tunnel || []).map((t) => [t.cle, t.prix])));
    setServices((d.services || []).map((s) => ({ ...s })));
  }, []);

  const charger = useCallback(() => {
    fetchAdminPrix().then(remplir).catch((e) => setErreur(e?.message || "Accès refusé ou erreur serveur."));
  }, [remplir]);
  useEffect(() => { charger(); }, [charger]);

  const corps = useMemo(() => ({
    plans: Object.fromEntries(Object.entries(plans).map(([k, v]) => [k, { mensuel: nombre(v.mensuel), annuel: nombre(v.annuel) }])),
    fondateur: Object.fromEntries(Object.entries(fondateur).map(([k, v]) => [k, { mensuel: nombre(v.mensuel), annuel: nombre(v.annuel) }])),
    entreprise_plancher: nombre(plancher),
    tunnel: Object.fromEntries(Object.entries(tunnel).map(([k, v]) => [k, nombre(v)])),
    services: Object.fromEntries(services.filter((s) => s.id && s.title).map((s) => [s.id, { title: s.title, amount: nombre(s.amount) }])),
  }), [plans, fondateur, plancher, tunnel, services]);

  const enregistrer = async () => {
    setEnvoi(true); setRapport(null);
    try {
      const r = await enregistrerAdminPrix({ ...corps, shopify });
      toast.success("Prix enregistrés : ils s'appliquent dès maintenant.");
      if (r.shopify) setRapport(r.shopify);
      chargerPrix(true);
      charger();
    } catch (e) { toast.error(e?.message || "Enregistrement impossible."); }
    setEnvoi(false);
  };
  const versShopify = async () => {
    setEnvoi(true); setRapport(null);
    try { const r = await prixVersShopify(); setRapport(r.shopify); toast.success("Fiches Shopify traitées."); }
    catch (e) { toast.error(e?.message || "Shopify indisponible."); }
    setEnvoi(false);
  };
  const origine = async () => {
    if (!window.confirm("Revenir aux prix d'origine (ceux du code) ? Vos réglages seront effacés.")) return;
    setEnvoi(true);
    try { await prixOrigine(); toast.success("Prix d'origine rétablis."); chargerPrix(true); charger(); }
    catch (e) { toast.error(e?.message || "Impossible."); }
    setEnvoi(false);
  };

  if (erreur) return <Carte><p className="text-sm text-red-400">{erreur}</p></Carte>;
  if (!donnees) return <Carte><p className="text-sm text-offwhite/50">Chargement…</p></Carte>;

  const majPlan = (k, champ, v) => setPlans((p) => ({ ...p, [k]: { ...p[k], [champ]: v } }));
  const majFond = (k, champ, v) => setFondateur((p) => ({ ...p, [k]: { ...p[k], [champ]: v } }));

  return (
    <div className="max-w-4xl space-y-4 pb-28" data-testid="admin-prix">
      <Carte className="border-[#DEC2A3]/25 bg-[#DEC2A3]/[0.05]">
        <p className="flex items-start gap-2 text-sm leading-relaxed text-offwhite/85">
          <Info size={16} className="mt-0.5 flex-none text-[#DEC2A3]" />
          <span>
            Un prix changé ici s'applique <strong>tout de suite</strong> : paiement Mollie, grille de l'app et grille des pages Shopify.
            Les abonnés en cours gardent le prix de leur abonnement ; le nouveau prix vaut pour les nouveaux clients.
          </span>
        </p>
      </Carte>

      <Carte>
        <TitreBloc icone={<Tag size={15} className="text-[#DEC2A3]" />} titre="Abonnements" texte="Prix encaissés (Zayado n'applique pas de TVA). L'annuel est en général 10 mois : deux mois offerts." />
        <div className="divide-y divide-white/[0.06]">
          {donnees.plans.map((p) => {
            const v = plans[p.cle] || {};
            const offerts = moisOfferts(nombre(v.mensuel), nombre(v.annuel));
            return (
              <div key={p.cle} className="grid grid-cols-2 gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1.2fr_1fr_1fr] sm:items-start">
                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <p className="font-semibold">{p.nom}</p>
                  <p className="text-xs text-offwhite/45">{offerts != null && offerts > 0 ? `Annuel : ${offerts.toLocaleString("fr-FR")} mois offerts` : "Annuel sans remise"}{p.shopify ? ` · fiche Shopify « ${p.shopify} »` : ""}</p>
                </div>
                <ChampPrix label="Par mois" value={v.mensuel} origine={p.origine?.mensuel} onChange={(x) => majPlan(p.cle, "mensuel", x)} testid={`prix-${p.cle}-mensuel`} />
                <ChampPrix label="Par an" value={v.annuel} origine={p.origine?.annuel} onChange={(x) => majPlan(p.cle, "annuel", x)} testid={`prix-${p.cle}-annuel`} />
              </div>
            );
          })}
          <div className="grid grid-cols-2 gap-3 py-4 last:pb-0 sm:grid-cols-[1.2fr_1fr_1fr] sm:items-start">
            <div className="col-span-2 sm:col-span-1"><p className="font-semibold">Entreprise</p><p className="text-xs text-offwhite/45">Sur devis : prix « à partir de » affiché</p></div>
            <ChampPrix label="À partir de / mois" value={plancher} onChange={setPlancher} testid="prix-entreprise-plancher" />
          </div>
        </div>
      </Carte>

      {donnees.fondateur.length ? (
        <Carte>
          <TitreBloc icone={<Tag size={15} className="text-[#DEC2A3]" />} titre="Tarif fondateur" texte="Garanti à vie aux premiers abonnés. La date de fin et le nombre de places restent réglés sur Railway (FONDATEUR_FIN, FONDATEUR_PLACES)." />
          <div className="divide-y divide-white/[0.06]">
            {donnees.fondateur.map((p) => (
              <div key={p.cle} className="grid grid-cols-2 gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1.2fr_1fr_1fr] sm:items-start">
                <p className="col-span-2 font-semibold sm:col-span-1">{p.nom}</p>
                <ChampPrix label="Par mois" value={fondateur[p.cle]?.mensuel} origine={p.origine?.mensuel} onChange={(x) => majFond(p.cle, "mensuel", x)} testid={`prix-fondateur-${p.cle}-mensuel`} />
                <ChampPrix label="Par an" value={fondateur[p.cle]?.annuel} origine={p.origine?.annuel} onChange={(x) => majFond(p.cle, "annuel", x)} testid={`prix-fondateur-${p.cle}-annuel`} />
              </div>
            ))}
          </div>
        </Carte>
      ) : null}

      <Carte>
        <TitreBloc icone={<Tag size={15} className="text-[#DEC2A3]" />} titre="Tunnel de diagnostic" texte="Les offres proposées après le diagnostic gratuit." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(donnees.tunnel || []).map((t) => (
            <ChampPrix key={t.cle} label={t.nom} value={tunnel[t.cle]} origine={t.origine} onChange={(x) => setTunnel((s) => ({ ...s, [t.cle]: x }))} testid={`prix-tunnel-${t.cle}`} />
          ))}
        </div>
      </Carte>

      <Carte>
        <TitreBloc icone={<Store size={15} className="text-[#DEC2A3]" />} titre="Services à l'unité"
          texte="Accompagnements vendus au prix fixe (payés sur l'app). L'identifiant doit être le même que la fiche Shopify (ex. accompagnement-clarte-financiere). Les offres « sur devis » n'ont pas besoin d'être ici." />
        {services.length === 0 ? <p className="mb-3 text-xs text-offwhite/45">Aucun service à prix fixe pour l'instant.</p> : null}
        <div className="space-y-3">
          {services.map((s, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-xl border border-white/[0.06] p-3 sm:grid-cols-[1fr_1.4fr_0.8fr_auto] sm:items-end">
              <label className="block"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-offwhite/45">Identifiant</span>
                <input className={CHAMP} value={s.id} placeholder="accompagnement-clarte" onChange={(e) => setServices((l) => l.map((x, j) => (j === i ? { ...x, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") } : x)))} /></label>
              <label className="block"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-offwhite/45">Intitulé</span>
                <input className={CHAMP} value={s.title} placeholder="Séance clarté financière" onChange={(e) => setServices((l) => l.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} /></label>
              <ChampPrix label="Prix" value={s.amount} onChange={(x) => setServices((l) => l.map((y, j) => (j === i ? { ...y, amount: x } : y)))} />
              <button type="button" onClick={() => setServices((l) => l.filter((_, j) => j !== i))} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg px-3 text-xs text-offwhite/60 hover:bg-white/5 hover:text-red-300" aria-label="Retirer ce service">
                <Trash2 size={14} /> <span className="sm:hidden">Retirer</span>
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setServices((l) => [...l, { id: "", title: "", amount: "" }])} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold hover:border-[#DEC2A3]/60" data-testid="prix-ajouter-service">
          <Plus size={14} /> Ajouter un service
        </button>
      </Carte>

      {rapport ? (
        <Carte>
          <TitreBloc icone={<Store size={15} className="text-[#DEC2A3]" />} titre="Fiches Shopify" />
          <ul className="space-y-1.5 text-sm">
            {rapport.map((r) => (
              <li key={r.handle} className="flex items-start gap-2">
                {r.ok ? <CheckCircle2 size={15} className="mt-0.5 flex-none text-emerald-300" /> : <AlertTriangle size={15} className="mt-0.5 flex-none text-amber-300" />}
                <span><strong className="font-semibold">{r.nom}</strong> <span className="text-offwhite/50">— {r.detail}</span></span>
              </li>
            ))}
          </ul>
        </Carte>
      ) : null}

      {/* Barre d'action, toujours visible */}
      <div className="fixed inset-x-0 bottom-0 z-30 admin-barre border-t border-white/10 px-4 py-3 backdrop-blur lg:left-[288px]">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className={`flex items-center gap-2 text-xs ${donnees.shopify_pret ? "text-offwhite/80" : "text-offwhite/40"}`}>
            <input type="checkbox" checked={shopify && donnees.shopify_pret} disabled={!donnees.shopify_pret} onChange={(e) => setShopify(e.target.checked)} className="size-4 accent-[#DEC2A3]" data-testid="prix-shopify" />
            {donnees.shopify_pret ? "Recopier aussi sur les fiches Shopify" : "Shopify non relié (SHOPIFY_SHOP_DOMAIN et SHOPIFY_ADMIN_TOKEN sur Railway)"}
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={origine} disabled={envoi || !donnees.modifies} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold disabled:opacity-40">
              <RotateCcw size={13} /> Prix d'origine
            </button>
            {donnees.shopify_pret ? (
              <button type="button" onClick={versShopify} disabled={envoi} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold disabled:opacity-40">
                <Store size={13} /> Recopier sur Shopify
              </button>
            ) : null}
            <button type="button" onClick={enregistrer} disabled={envoi} className="inline-flex items-center gap-1.5 rounded-full admin-btn-plein px-5 py-2 text-xs font-semibold disabled:opacity-60" data-testid="prix-enregistrer">
              {envoi ? <Loader2 size={13} className="animate-spin" /> : null} Enregistrer les prix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
