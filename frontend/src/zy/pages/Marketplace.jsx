import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Store, Plus, Send, Trash2, Pencil, ShieldCheck, Check, X, Package, ShoppingBag, RefreshCw, Plug } from "lucide-react";
import { GlassCard } from "@/zy/components/kairos/GlassCard";
import { SideMenuPro } from "@/zy/components/pro/SideMenuPro";
import { useThemePro } from "@/zy/lib/themePro";
import { call } from "@/zy/lib/part2Api";
import { PhotosProduit } from "@/zy/components/pro/PhotosProduit";
import { TableauVendeur, ReversementsVendeur, SuiviCommande, ActionsProduit } from "@/zy/components/vendeur/VendeurDokan";
import { DeploiementBoutique } from "@/zy/components/admin/DeploiementBoutique";
import { LayoutDashboard, Wallet } from "lucide-react";

const CHAMP = "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-offwhite outline-none focus:border-gold/50";
const BTN = "rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-60";
const STATUT = {
  brouillon: ["Brouillon", "bg-white/10 text-offwhite/70"],
  en_attente: ["En vérification", "bg-amber-400/15 text-amber-300"],
  publie: ["Publié", "bg-emerald-400/15 text-emerald-300"],
  refuse: ["Refusé", "bg-rose-400/15 text-rose-300"],
  pause: ["En pause", "bg-sky-400/15 text-sky-500"],
};
const STATUT_CMD = {
  en_attente: ["En attente", "bg-amber-400/15 text-amber-300"],
  autorise: ["Autorisé", "bg-emerald-400/15 text-emerald-300"],
  paye: ["Payé · à préparer", "bg-emerald-400/15 text-emerald-300"],
  expedie: ["Expédié", "bg-sky-400/15 text-sky-300"],
  annule: ["Annulé", "bg-rose-400/15 text-rose-300"],
  rembourse: ["Remboursé", "bg-rose-400/15 text-rose-300"],
};
const VIDE = { titre: "", description: "", prix: "", stock: "", sku: "", categorie: "", images: [] };
const RAYONS = ["Corps", "Âme", "Rituel", "Organisation", "Pack"];

function Statut({ s }) {
  const [label, cls] = STATUT[s] || STATUT.brouillon;
  return <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>;
}

function montrerErreur(e) {
  toast.error(e.message, e.erreurs && e.erreurs.length ? { description: e.erreurs.join(" · ") } : undefined);
}

// Défini hors du composant : sinon il serait recréé à chaque rendu et les champs perdraient le focus à chaque frappe.
function Shell({ children, menu }) {
  const [theme] = useThemePro();
  return (
  <div className={`min-h-screen text-offwhite ${theme === "clair" ? "pro-clair pro-cours" : "pro-sombre"}`} data-testid="vendeur-root">
    {menu}
    <div className="lg:pl-[288px]">
      <header className="entete-navy sticky top-0 z-20 hidden items-center gap-3 lg:flex border-b border-white/5 px-4 py-3 backdrop-blur-xl sm:px-6" style={{ background: "rgba(11,26,61,0.6)" }}>
        <Store size={18} className="text-gold" />
        <h1 className="font-display text-lg font-bold text-offwhite sm:text-xl">Espace Vendeur</h1>
      </header>
      <main className="mx-auto max-w-4xl space-y-4 px-4 pb-24 pt-5 sm:px-6">{children}</main>
    </div>
  </div>
);
}

// Démarrage vendeur (façon Dokan) : 4 étapes pour ouvrir sa boutique, et comment l'argent arrive.
// Pas de compte Mollie à créer : le client paie Zayado, Zayado reverse le net sur l'IBAN du vendeur.
function DemarrageVendeur({ profil, produits, onAller }) {
  const [iban, setIban] = useState(null);
  useEffect(() => { call("/vendeur/tableau-de-bord").then((t) => setIban(!!t.iban_renseigne)).catch(() => setIban(false)); }, []);
  const etapes = [
    { cle: "profil", fait: !!(profil?.nom_boutique && profil?.email_contact && profil?.conditions_acceptees), titre: "Présente ta boutique", sous: "Nom, e-mail de contact, présentation, conditions vendeur.", onglet: "profil", bouton: "Remplir mon profil" },
    { cle: "iban", fait: !!iban, titre: "Indique ton IBAN", sous: "C'est là que Zayado te reverse tes ventes. Aucun compte Mollie à créer.", onglet: "reversements", bouton: "Ajouter mon IBAN" },
    { cle: "produit", fait: produits.length > 0, titre: "Ajoute ton premier produit", sous: "Photos, prix, stock : une fiche complète, prête à être mise en ligne.", onglet: "produits", bouton: "Ajouter un produit" },
    { cle: "publie", fait: produits.some((x) => x.statut === "publie"), titre: "Ton produit est en ligne", sous: "Clique « Mettre en ligne » sur ta fiche : elle est publiée sur zayado.net immédiatement. Tu peux aussi demander une relecture à Zayado.", onglet: "produits", bouton: "Mettre en ligne" },
  ];
  const faits = etapes.filter((e) => e.fait).length;
  if (iban === null) return null;
  return (
    <GlassCard className="mb-4 space-y-4" data-testid="vendeur-demarrage">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">{faits === 4 ? "Ta boutique est prête" : "Ouvre ta boutique en 4 étapes"}</p>
          <p className="mt-1 text-sm text-offwhite/75">Tu vends sur la marketplace Zayado : on s'occupe du site, du paiement et du client. Toi, tu prépares et tu expédies.</p>
        </div>
        <span className="text-sm font-semibold text-offwhite" data-testid="vendeur-demarrage-progression">{faits}/4</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gold/20"><div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${(faits / 4) * 100}%` }} /></div>
      <ol className="grid gap-2 sm:grid-cols-2">
        {etapes.map((e, i) => (
          <li key={e.cle} className={`flex items-start gap-3 rounded-xl border p-3 ${e.fait ? "border-emerald-400/25 bg-emerald-400/5" : "border-white/10"}`} data-testid={`vendeur-etape-${e.cle}`}>
            <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${e.fait ? "bg-emerald-500 text-white" : "bg-white/10 text-offwhite"}`}>{e.fait ? <Check size={14} /> : i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-offwhite">{e.titre}</p>
              <p className="text-xs text-offwhite/60">{e.sous}</p>
              {!e.fait ? <button className={`${BTN} mt-2 bg-gold text-navy-900`} onClick={() => onAller(e.onglet)} data-testid={`vendeur-etape-${e.cle}-bouton`}>{e.bouton}</button> : null}
            </div>
          </li>
        ))}
      </ol>
      <details className="rounded-xl bg-white/5 p-3 text-sm text-offwhite/80" data-testid="vendeur-comment-ca-marche">
        <summary className="cursor-pointer font-semibold text-offwhite">Comment je suis payé ?</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed">
          <li>Le client achète ton produit sur zayado.net et paie Zayado (carte, Apple Pay…).</li>
          <li>Tu reçois la commande dans « Commandes » : tu prépares, tu expédies, tu ajoutes le numéro de suivi.</li>
          <li>Zayado retient sa commission et ton net s'ajoute à ton solde.</li>
          <li>Dans « Reversements », tu demandes le virement de ton solde sur ton IBAN. Rien d'autre à installer.</li>
        </ol>
      </details>
    </GlassCard>
  );
}

export default function Marketplace() {
  const navigate = useNavigate();
  const [etat, setEtat] = useState(null);
  const [produits, setProduits] = useState([]);
  const [attente, setAttente] = useState([]);
  const [onglet, setOnglet] = useState("tableau");
  const [suivis, setSuivis] = useState({});
  const [profil, setProfil] = useState(null);
  const [form, setForm] = useState(null); // null = fermé ; {id?, ...champs}
  const [busy, setBusy] = useState(false);
  const [cmd, setCmd] = useState({ items: [], compteurs: {} });
  const [filtre, setFiltre] = useState("");
  const [shop, setShop] = useState(null); // état de la connexion Shopify (détails réservés à l'admin côté serveur)
  const [diag, setDiag] = useState(null);
  const [installation, setInstallation] = useState(null);

  const charger = useCallback(async () => {
    try {
      const e = await call("/vendeur/etat");
      setEtat(e);
      if (!e.connecte || e.vendeur === false) return;
      setProfil(e.profil);
      setProduits((await call("/vendeur/produits")).items);
      if (e.admin) setAttente((await call("/vendeur/moderation/attente")).items);
      call("/vendeur/commandes").then(setCmd).catch(() => {});
      call("/vendeur/suivis").then((s) => setSuivis(s.items || {})).catch(() => {});
      call("/shopify/etat").then(setShop).catch(() => {});
    } catch (err) { montrerErreur(err); setEtat({ connecte: false }); }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const agir = async (fn, ok) => {
    setBusy(true);
    try { await fn(); if (ok) toast.success(ok); await charger(); } catch (e) { montrerErreur(e); } finally { setBusy(false); }
  };

  // Après le profil, retour au tableau de bord : on voit l'étape cochée et la suivante.
  const enregistrerProfil = () => agir(async () => { await call("/vendeur/profil", "PUT", profil); setOnglet("tableau"); }, "Profil enregistré");

  const enregistrerProduit = () => agir(async () => {
    const corps = {
      titre: form.titre, description: form.description, prix: String(form.prix || "0"),
      stock: form.stock === "" ? null : Number(form.stock), sku: form.sku || null, categorie: form.categorie || null,
      images: form.images || [],
    };
    if (form.id) await call(`/vendeur/produits/${form.id}`, "PUT", corps);
    else await call("/vendeur/produits", "POST", corps);
    setForm(null);
  }, "Produit enregistré");

  const synchroniser = () => agir(async () => {
    const r = await call("/admin/shopify/synchroniser?jours=60", "POST");
    toast.success(`${r.commandes} commande(s) relue(s) depuis Shopify`);
  });
  const brancherWebhooks = () => agir(async () => {
    const r = await call("/admin/shopify/webhooks/enregistrer", "POST");
    r.ok ? toast.success("Webhooks Shopify enregistrés") : toast.error("Certains webhooks ont été refusés", { description: Object.entries(r.topics).map(([k, v]) => `${k} : ${v}`).join(" · ") });
  });
  // Crée en un clic tout ce que le thème Zayado attend : produits, collections, pages, Journal, menus.
  const installerBoutique = async () => {
    setBusy(true); setInstallation({ enCours: true });
    try {
      const r = await call("/admin/shopify/installer-boutique", "POST");
      setInstallation(r);
      r.ok ? toast.success("Boutique installée sur Shopify") : toast.error("Installation incomplète : voir le détail");
    } catch (e) { setInstallation(null); montrerErreur(e); } finally { setBusy(false); }
  };
  const verifierShopify = async () => {
    setBusy(true);
    try { setDiag(await call("/admin/shopify/verifier")); } catch (e) { setDiag(null); montrerErreur(e); } finally { setBusy(false); }
  };

  const modifier = (p) => setForm({ ...p, stock: p.stock ?? "", sku: p.sku || "", categorie: p.categorie || "", images: [...(p.images || [])] });

  const refuser = (p) => {
    const motif = window.prompt("Motif du refus (obligatoire, visible par le vendeur) :");
    if (motif && motif.trim()) agir(() => call(`/vendeur/moderation/${p.id}/refuser`, "POST", { motif }), "Produit refusé");
  };

  if (!etat) return <Shell><Loader2 className="animate-spin text-gold" /></Shell>;
  if (!etat.connecte) {
    return (
      <Shell>
        <GlassCard>
          <p className="text-sm text-offwhite/80">Connecte-toi avec un compte (lien magique, Google ou Microsoft) pour ouvrir ton espace vendeur.</p>
          <button className={`${BTN} mt-3 bg-gold text-navy-900`} onClick={() => navigate("/login")}>Se connecter</button>
        </GlassCard>
      </Shell>
    );
  }
  if (etat.vendeur === false) {
    return (
      <Shell>
        <GlassCard>
          <p className="text-sm text-offwhite/80">L'espace vendeur est réservé aux comptes vendeur. Demande la promotion de ton compte à l'équipe Zayado pour ouvrir ta boutique.</p>
          <button className={`${BTN} mt-3 bg-gold text-navy-900`} onClick={() => navigate("/")}>Retour au cockpit</button>
        </GlassCard>
      </Shell>
    );
  }

  const menuItems = [
    { key: "tableau", label: "Tableau de bord", icon: <LayoutDashboard size={16} /> },
    { key: "produits", label: "Mes produits", icon: <Package size={16} /> },
    { key: "commandes", label: "Commandes", icon: <ShoppingBag size={16} />, badge: (cmd.compteurs?.paye || 0) },
    { key: "reversements", label: "Reversements", icon: <Wallet size={16} /> },
    { key: "profil", label: "Profil vendeur", icon: <Store size={16} /> },
    ...(etat.admin ? [{ key: "moderation", label: "Modération", icon: <ShieldCheck size={16} />, badge: attente.length }] : []),
  ];

  return (
    <Shell menu={
      <SideMenuPro
        titre="Espace Vendeur"
        sousTitre="Marketplace Zayado"
        items={menuItems}
        actif={onglet}
        onChange={setOnglet}
        retour={{ to: "/app", label: "Retour au cockpit" }}
      />
    }>

      {onglet !== "tableau" && (
        <button onClick={() => setOnglet("tableau")} className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-offwhite/70 hover:text-offwhite" data-testid="vendeur-retour-tableau">← Tableau de bord</button>
      )}
      {onglet === "tableau" && <DemarrageVendeur profil={profil} produits={produits} onAller={setOnglet} />}
      {onglet === "tableau" && <TableauVendeur onAller={setOnglet} />}
      {onglet === "reversements" && <ReversementsVendeur />}

      {onglet === "commandes" && (
        <>
          {etat.admin && (
            <GlassCard className="space-y-2" data-testid="shopify-branchement">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-offwhite"><Plug size={14} className="text-gold" /> Branchement Shopify</p>
              <p className="text-xs text-offwhite/65">
                {shop?.configure ? `Boutique : ${shop.boutique}` : "Boutique non configurée"} · Webhooks : {shop?.webhooks_prets ? "clé présente" : "clé manquante"} · {shop?.commandes_en_base ?? 0} commande(s) en base
              </p>
              {shop?.manquants?.length > 0 && <p className="text-xs text-amber-300">Variables Railway manquantes : {shop.manquants.join(", ")}</p>}
              {shop?.webhook_url && <p className="break-all text-[11px] text-offwhite/50">Adresse de réception : {shop.webhook_url}</p>}
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} className={`${BTN} inline-flex items-center gap-1 border border-white/30 bg-white/10 font-semibold text-offwhite`} onClick={installerBoutique} data-testid="shopify-installer-boutique">
                  {installation?.enCours ? <Loader2 size={12} className="animate-spin" /> : <Store size={12} />} Installer la boutique
                </button>
                <button disabled={busy} className={`${BTN} border border-white/20 text-offwhite`} onClick={verifierShopify}>Vérifier la connexion</button>
                <button disabled={busy} className={`${BTN} border border-white/20 text-offwhite`} onClick={brancherWebhooks}>Enregistrer les webhooks</button>
                <button disabled={busy} className={`${BTN} inline-flex items-center gap-1 bg-gold text-navy-900`} onClick={synchroniser}><RefreshCw size={12} /> Synchroniser (60 j)</button>
              </div>
              {installation && !installation.enCours && (
                <ul className="space-y-1 rounded-lg border border-white/10 bg-white/[0.04] p-2.5 text-xs" data-testid="shopify-installation-rapport">
                  {installation.etapes.map((e) => (
                    <li key={e.etape} className={e.ok ? "text-offwhite/80" : "text-amber-200"}>
                      <strong>{e.ok ? "✓" : "!"} {e.etape}</strong> · {e.detail}
                      {e.erreurs?.length ? <span className="block pl-4 text-[11px] text-amber-200/90">{e.erreurs.join(" · ")}</span> : null}
                    </li>
                  ))}
                  <li className="pt-1 text-[11px] text-offwhite/55">Tu peux relancer sans risque : rien n'est créé en double.</li>
                </ul>
              )}
              {diag && (
                <p className="text-xs text-offwhite/70">
                  {diag.boutique} ({diag.domaine}) · droits manquants : {diag.droits_manquants.length ? diag.droits_manquants.join(", ") : "aucun"}
                </p>
              )}

              {/* ── Déploiement : rien ne part en ligne sans ton clic (composant partagé avec la Console Admin) ── */}
              <DeploiementBoutique compact />
            </GlassCard>
          )}
          <div className="flex flex-wrap gap-2" data-testid="commandes-filtres">
            <button className={`${BTN} ${filtre === "" ? "bg-gold text-navy-900" : "border border-white/20 text-offwhite/80"}`} onClick={() => setFiltre("")}>Toutes</button>
            {Object.entries(STATUT_CMD).map(([k, [label]]) => (
              <button key={k} className={`${BTN} ${filtre === k ? "bg-gold text-navy-900" : "border border-white/20 text-offwhite/80"}`} onClick={() => setFiltre(k)}>
                {label} ({cmd.compteurs?.[k] || 0})
              </button>
            ))}
          </div>
          {cmd.items.filter((o) => !filtre || o.statut === filtre).length === 0 && <p className="text-sm text-offwhite/55">Aucune commande pour ce filtre.</p>}
          {cmd.items.filter((o) => !filtre || o.statut === filtre).map((o) => {
            const [label, cls] = STATUT_CMD[o.statut] || STATUT_CMD.en_attente;
            return (
              <GlassCard key={o.id} className="space-y-1.5" data-testid="vendeur-commande">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-offwhite">{o.commande}</p>
                  <span className="text-xs text-offwhite/55">{o.boutique}{o.client ? ` · ${o.client}` : ""}</span>
                  <span className="ml-auto text-sm text-gold">{o.montant} {o.devise}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>
                </div>
                <ul className="text-xs text-offwhite/70">{(o.lignes || []).map((l, i) => <li key={i}>{l.quantite} × {l.titre}</li>)}</ul>
                <p className="text-[11px] text-offwhite/45">{o.passee_le ? new Date(o.passee_le).toLocaleString("fr-FR") : ""}{(o.suivi || []).map((t) => ` · ${t.transporteur} ${t.numero}`).join("")}</p>
                <SuiviCommande commande={o} suivi={suivis[o.id]} onFait={() => call("/vendeur/suivis").then((s) => setSuivis(s.items || {})).catch(() => {})} />
              </GlassCard>
            );
          })}
          <p className="text-[11px] text-offwhite/45">Paiement et remboursement : dans Shopify. Le suivi (préparée, expédiée, livrée) se met à jour ici, sur chaque commande.</p>
        </>
      )}

      {onglet === "profil" && profil && (
        <GlassCard className="space-y-3" data-testid="market-profil">
          {[["nom_boutique", "Nom de la boutique *"], ["email_contact", "Email de contact *"], ["telephone", "Téléphone"], ["siret", "SIRET"], ["site", "Site web"], ["lien_contrat", "Lien du contrat de partenariat (PDF, Drive…)"]].map(([k, l]) => (
            <div key={k}><label className="mb-1 block text-[11px] text-offwhite/70">{l}</label>
              <input className={CHAMP} value={profil[k] || ""} onChange={(e) => setProfil({ ...profil, [k]: e.target.value })} /></div>
          ))}
          <div><label className="mb-1 block text-[11px] text-offwhite/70">Présentation</label>
            <textarea rows={3} className={CHAMP} value={profil.description || ""} onChange={(e) => setProfil({ ...profil, description: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-xs text-offwhite/80">
            <input type="checkbox" checked={!!profil.conditions_acceptees} onChange={(e) => setProfil({ ...profil, conditions_acceptees: e.target.checked })} />
            <span>J'accepte les <a href="/legal/contrat-partenariat" target="_blank" rel="noreferrer" className="text-gold underline" data-testid="profil-lien-contrat">conditions du contrat de partenariat</a> de Zayado *</span>
          </label>
          <button disabled={busy} onClick={enregistrerProfil} className={`${BTN} bg-gold text-navy-900`}>Enregistrer le profil</button>
        </GlassCard>
      )}

      {onglet === "produits" && (
        <>
          {!etat.profil_complet && <GlassCard gold><p className="text-xs text-offwhite/80">Complète ton profil vendeur (nom, email, conditions) avant de soumettre des produits.</p></GlassCard>}
          {!etat.shopify?.configure && <p className="text-[11px] text-offwhite/50">Shopify n'est pas encore configuré côté serveur : la publication est désactivée pour l'équipe Zayado.</p>}
          {!form && <button onClick={() => setForm({ ...VIDE })} className={`${BTN} inline-flex items-center gap-1.5 bg-gold text-navy-900`} data-testid="market-nouveau"><Plus size={14} /> Nouveau produit</button>}

          {form && (
            <GlassCard className="space-y-3" data-testid="market-form">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className="mb-1 block text-[11px] text-offwhite/70">Nom du produit *</label>
                  <input className={CHAMP} value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} /></div>
                <div className="sm:col-span-2"><label className="mb-1 block text-[11px] text-offwhite/70">Description * (30 caractères min.)</label>
                  <textarea rows={4} className={CHAMP} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                {[["prix", "Prix TTC (€) *"], ["stock", "Stock"], ["sku", "Référence (SKU)"]].map(([k, l]) => (
                  <div key={k}><label className="mb-1 block text-[11px] text-offwhite/70">{l}</label>
                    <input className={CHAMP} inputMode={k === "sku" ? "text" : "decimal"} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
                ))}
                <div><label className="mb-1 block text-[11px] text-offwhite/70">Rayon de la boutique</label>
                  <select className={CHAMP} value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} data-testid="market-rayon">
                    <option value="" className="bg-navy-800">Choisir…</option>
                    {(etat.rayons || RAYONS).map((r) => <option key={r} value={r} className="bg-navy-800">{r}</option>)}
                  </select></div>
                <div className="sm:col-span-2"><label className="mb-1 block text-[11px] text-offwhite/70">Photos * (au moins une)</label>
                  <PhotosProduit images={form.images || []} onChange={(images) => setForm((f) => ({ ...f, images }))} max={etat.limites?.images_max || 6} /></div>
              </div>
              <div className="flex gap-2">
                <button disabled={busy} onClick={enregistrerProduit} className={`${BTN} bg-gold text-navy-900`}>Enregistrer</button>
                <button onClick={() => setForm(null)} className={`${BTN} border border-white/15 text-offwhite/80`}>Annuler</button>
              </div>
            </GlassCard>
          )}

          {produits.length === 0 && !form && <p className="text-sm text-offwhite/55">Aucun produit pour l'instant.</p>}
          {produits.map((p) => (
            <GlassCard key={p.id} className="space-y-2" data-testid="market-produit">
              <div className="flex flex-wrap items-center gap-2">
                {p.images?.[0]
                  ? <img src={p.images[0]} alt="" className="h-12 w-12 rounded-lg bg-white object-cover" />
                  : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5 text-offwhite/40"><Package size={16} /></span>}
                <p className="font-semibold text-offwhite">{p.titre}</p><Statut s={p.statut} />
                <span className="ml-auto text-sm text-gold">{p.prix} €</span>
              </div>
              {p.statut === "refuse" && p.motif_refus && <p className="rounded-lg bg-rose-400/10 p-2 text-xs text-rose-200">Motif du refus : {p.motif_refus}</p>}
              <div className="flex flex-wrap gap-2">
                {p.statut !== "en_attente" && <button className={`${BTN} inline-flex items-center gap-1 border border-white/15 text-offwhite/80`} onClick={() => modifier(p)}><Pencil size={12} /> Modifier</button>}
                {(p.statut === "brouillon" || p.statut === "en_attente") && (
                  <button disabled={busy} className={`${BTN} inline-flex items-center gap-1 bg-gold text-navy-900`} data-testid={`market-produit-mettre-en-ligne-${p.id}`}
                    onClick={() => window.confirm(`Mettre « ${p.titre} » en ligne sur zayado.net maintenant ?`) && agir(() => call(`/vendeur/produits/${p.id}/mettre-en-ligne`, "POST"), "Fiche en ligne sur zayado.net")}><Store size={12} /> Mettre en ligne</button>
                )}
                {(p.statut === "brouillon" || p.statut === "refuse") && (
                  <button disabled={busy} className={`${BTN} inline-flex items-center gap-1 border border-white/15 text-offwhite/80`} data-testid={`market-produit-soumettre-${p.id}`}
                    onClick={() => agir(() => call(`/vendeur/produits/${p.id}/soumettre`, "POST"), "Envoyé à la vérification Zayado")}><Send size={12} /> Demander une relecture</button>
                )}
                <ActionsProduit produit={p} busy={busy} agir={agir} />
                <button disabled={busy} className={`${BTN} inline-flex items-center gap-1 border border-rose-400/30 text-rose-300`}
                  onClick={() => window.confirm("Supprimer ce produit ?") && agir(() => call(`/vendeur/produits/${p.id}`, "DELETE"), "Produit supprimé")}><Trash2 size={12} /></button>
              </div>
            </GlassCard>
          ))}
        </>
      )}

      {onglet === "moderation" && etat.admin && (
        <>
          <p className="flex items-center gap-1.5 text-xs text-offwhite/60"><ShieldCheck size={14} className="text-gold" /> Publier crée la fiche dans la boutique Shopify zayado.net (avec photos, rayon et SEO) et la met en vitrine.</p>
          {attente.length === 0 && <p className="text-sm text-offwhite/55">Rien en attente.</p>}
          {attente.map((p) => (
            <GlassCard key={p.id} className="space-y-2" data-testid="market-moderation-item">
              <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-offwhite">{p.titre}</p>
                <span className="text-xs text-offwhite/55">par {p.vendeur}</span><span className="ml-auto text-sm text-gold">{p.prix} €</span></div>
              <p className="whitespace-pre-line text-xs text-offwhite/70">{(p.description || "").replace(/<[^>]+>/g, "").slice(0, 400)}</p>
              <div className="flex gap-2 overflow-x-auto">{(p.images || []).map((u) => <img key={u} src={u} alt="" className="h-16 w-16 rounded-lg object-cover" />)}</div>
              <div className="flex gap-2">
                <button disabled={busy} className={`${BTN} inline-flex items-center gap-1 bg-emerald-400 text-navy-900`}
                  onClick={() => agir(() => call(`/vendeur/moderation/${p.id}/publier`, "POST"), "Publié dans Shopify")}><Check size={12} /> Publier</button>
                <button disabled={busy} className={`${BTN} inline-flex items-center gap-1 border border-rose-400/30 text-rose-300`} onClick={() => refuser(p)}><X size={12} /> Refuser</button>
              </div>
            </GlassCard>
          ))}
        </>
      )}
    </Shell>
  );
}
