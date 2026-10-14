import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Store, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { call } from "@/zy/lib/part2Api";

/* Déploiement de la boutique Shopify (admin) : les scripts poussent sur le thème
   « Zayado — Préparation » ; rien ne part en ligne sans le bouton « Déployer ».
   Utilisé dans la Console Admin (onglet dédié) et dans l'Espace vendeur › Commandes. */

const BTN = "rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-60";

export function DeploiementBoutique({ compact = false }) {
  const [busy, setBusy] = useState(false);
  const [themes, setThemes] = useState(null);
  const [urlsGroupes, setUrlsGroupes] = useState(null);
  const [urlsThemeId, setUrlsThemeId] = useState(null);

  const erreur = (e) => toast.error(e.message || "Erreur");
  const chargerThemes = async () => {
    setBusy(true);
    try { setThemes((await call("/admin/shopify/themes")).items); } catch (e) { erreur(e); } finally { setBusy(false); }
  };
  const chargerUrls = async (themeId) => {
    setBusy(true);
    try {
      const r = await call(`/admin/shopify/apercu-urls${themeId ? `?theme_id=${themeId}` : ""}`);
      setUrlsGroupes(r.groupes); setUrlsThemeId(r.theme_id || null);
    } catch (e) { erreur(e); } finally { setBusy(false); }
  };
  const deployer = async (t) => {
    if (!window.confirm(`Déployer « ${t.nom} » sur la boutique en ligne ?\nLe thème actuel repassera hors ligne (il reste en secours).`)) return;
    setBusy(true);
    try {
      const r = await call("/admin/shopify/deployer", "POST", { theme_id: t.id });
      r.deja_en_ligne ? toast.success(`« ${r.theme} » est déjà le thème en ligne`) : toast.success(`Boutique déployée : « ${r.theme} » est en ligne${r.remplace ? ` (remplace « ${r.remplace} »)` : ""}`);
      chargerThemes();
    } catch (e) { erreur(e); } finally { setBusy(false); }
  };
  useEffect(() => { if (!compact) chargerThemes(); }, [compact]);

  return (
    <div className={compact ? "mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3" : "space-y-3"} data-testid="shopify-deploiement">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-offwhite">Déploiement du thème — vérifier les pages, puis publier</p>
          {!compact && <p className="mt-0.5 text-xs text-offwhite/60">Les modifications arrivent d'abord sur le thème « Zayado — Préparation ». Prévisualise, vérifie les adresses, puis clique « Déployer la boutique » pour le mettre en ligne. L'ancien thème reste en secours.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} className={`${BTN} inline-flex items-center gap-1 border border-white/20 text-offwhite`} onClick={chargerThemes} data-testid="shopify-themes-charger">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Thèmes
          </button>
          <button disabled={busy} className={`${BTN} border border-white/20 text-offwhite`} onClick={() => chargerUrls(urlsThemeId)} data-testid="shopify-urls-charger">URLs à vérifier</button>
        </div>
      </div>
      {themes && (
        <ul className="mt-2 space-y-1.5 text-xs" data-testid="shopify-themes-liste">
          {themes.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-md border border-white/10 px-2.5 py-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${t.en_ligne ? "bg-emerald-400/20 text-emerald-300" : "bg-white/10 text-offwhite/60"}`}>
                {t.en_ligne ? "En ligne" : "Hors ligne"}
              </span>
              <span className="font-medium text-offwhite">{t.nom}</span>
              <a href={t.apercu} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gold underline" data-testid={`shopify-theme-apercu-${t.id}`}>Prévisualiser <ExternalLink size={10} /></a>
              {!t.en_ligne && (
                <button disabled={busy} className={`${BTN} border border-white/20 text-offwhite`} onClick={() => chargerUrls(t.id)} data-testid={`shopify-theme-urls-${t.id}`}>Ses URLs</button>
              )}
              {!t.en_ligne && (
                <button disabled={busy} className={`${BTN} ml-auto inline-flex items-center gap-1 bg-gold text-navy-900`} onClick={() => deployer(t)} data-testid={`shopify-theme-deployer-${t.id}`}>
                  <Store size={12} /> Déployer la boutique
                </button>
              )}
            </li>
          ))}
          {!themes.length && <li className="text-offwhite/55">Aucun thème renvoyé par Shopify.</li>}
        </ul>
      )}
      {urlsGroupes && (
        <div className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded-md border border-white/10 p-2.5 text-xs" data-testid="shopify-urls-liste">
          <p className="text-[11px] text-offwhite/55">
            {urlsThemeId ? "Ces adresses s'ouvrent en APERÇU du thème hors ligne — vérifie tout avant de déployer." : "Adresses de la boutique en ligne. Charge les thèmes puis choisis « Ses URLs » pour vérifier un thème hors ligne."}
          </p>
          {urlsGroupes.map((g) => (
            <div key={g.nom}>
              <p className="mt-1 font-semibold uppercase tracking-wide text-[10.5px] text-offwhite/50">{g.nom} ({g.urls.length})</p>
              <ul className="mt-0.5 grid gap-0.5 sm:grid-cols-2">
                {g.urls.map((u) => (
                  <li key={u.url}>
                    <a href={u.url} target="_blank" rel="noreferrer" className="text-gold/90 underline decoration-dotted hover:text-gold" data-testid={`shopify-url-${g.nom}-${u.titre}`}>{u.titre}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
