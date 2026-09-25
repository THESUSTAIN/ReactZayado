import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Store, Plus, Send, Trash2, Pencil, ShieldCheck, Check, X, Package } from "lucide-react";
import { GlassCard } from "@/components/kairos/GlassCard";
import { SideMenuPro } from "@/components/pro/SideMenuPro";
import { useThemePro } from "@/lib/themePro";
import { call } from "@/lib/part2Api";
import { PhotosProduit } from "@/components/pro/PhotosProduit";

const CHAMP = "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-offwhite outline-none focus:border-gold/50";
const BTN = "rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-60";
const STATUT = {
  brouillon: ["Brouillon", "bg-white/10 text-offwhite/70"],
  en_attente: ["En vérification", "bg-amber-400/15 text-amber-300"],
  publie: ["Publié", "bg-emerald-400/15 text-emerald-300"],
  refuse: ["Refusé", "bg-rose-400/15 text-rose-300"],
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
  <div className={`min-h-screen text-offwhite ${theme === "clair" ? "pro-clair" : "pro-sombre"}`} data-testid="vendeur-root">
    {menu}
    <div className="lg:pl-[248px]">
      <header className="entete-navy sticky top-0 z-20 hidden items-center gap-3 lg:flex border-b border-white/10 px-4 py-3 backdrop-blur-2xl sm:px-6" style={{ background: "rgba(15,27,58,0.86)" }}>
        <Store size={18} className="text-gold" />
        <h1 className="font-display text-lg font-bold text-offwhite sm:text-xl">Espace Vendeur</h1>
      </header>
      <main className="mx-auto max-w-4xl space-y-4 px-4 pb-24 pt-5 sm:px-6">{children}</main>
    </div>
  </div>
);
}

export default function Marketplace() {
  const navigate = useNavigate();
  const [etat, setEtat] = useState(null);
  const [produits, setProduits] = useState([]);
  const [attente, setAttente] = useState([]);
  const [onglet, setOnglet] = useState("produits");
  const [profil, setProfil] = useState(null);
  const [form, setForm] = useState(null); // null = fermé ; {id?, ...champs}
  const [busy, setBusy] = useState(false);

  const charger = useCallback(async () => {
    try {
      const e = await call("/vendeur/etat");
      setEtat(e);
      if (!e.connecte || e.vendeur === false) return;
      setProfil(e.profil);
      setProduits((await call("/vendeur/produits")).items);
      if (e.admin) setAttente((await call("/vendeur/moderation/attente")).items);
    } catch (err) { montrerErreur(err); setEtat({ connecte: false }); }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const agir = async (fn, ok) => {
    setBusy(true);
    try { await fn(); if (ok) toast.success(ok); await charger(); } catch (e) { montrerErreur(e); } finally { setBusy(false); }
  };

  const enregistrerProfil = () => agir(() => call("/vendeur/profil", "PUT", profil), "Profil enregistré");

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
          <button className={`${BTN} mt-3 bg-gold text-navy-900`} onClick={() => navigate("/app")}>Retour au cockpit</button>
        </GlassCard>
      </Shell>
    );
  }

  const menuItems = [
    { key: "produits", label: "Mes produits", icon: <Package size={16} /> },
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

      {onglet === "profil" && profil && (
        <GlassCard className="space-y-3" data-testid="market-profil">
          {[["nom_boutique", "Nom de la boutique *"], ["email_contact", "Email de contact *"], ["telephone", "Téléphone"], ["siret", "SIRET"], ["site", "Site web"]].map(([k, l]) => (
            <div key={k}><label className="mb-1 block text-[11px] text-offwhite/70">{l}</label>
              <input className={CHAMP} value={profil[k] || ""} onChange={(e) => setProfil({ ...profil, [k]: e.target.value })} /></div>
          ))}
          <div><label className="mb-1 block text-[11px] text-offwhite/70">Présentation</label>
            <textarea rows={3} className={CHAMP} value={profil.description || ""} onChange={(e) => setProfil({ ...profil, description: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-xs text-offwhite/80">
            <input type="checkbox" checked={!!profil.conditions_acceptees} onChange={(e) => setProfil({ ...profil, conditions_acceptees: e.target.checked })} />
            J'accepte les conditions vendeur de Zayado *
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
                {(p.statut === "brouillon" || p.statut === "refuse") && (
                  <button disabled={busy} className={`${BTN} inline-flex items-center gap-1 bg-gold text-navy-900`}
                    onClick={() => agir(() => call(`/vendeur/produits/${p.id}/soumettre`, "POST"), "Envoyé à la vérification Zayado")}><Send size={12} /> Soumettre</button>
                )}
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
