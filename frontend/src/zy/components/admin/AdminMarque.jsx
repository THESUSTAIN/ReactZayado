import React, { useEffect, useRef, useState } from "react";
import { apiGet, apiPost, apiPut, errorMessage } from "@/lib/api";
import { rafraichirMarque } from "@/zy/lib/marque";
import { uploadMedia } from "@/zy/lib/kairosApi";
import { toast } from "sonner";
import { Save, RotateCcw, Eye, Building2, Image as ImageIcon, Mail, Type, Upload, Loader2 } from "lucide-react";

/* Admin › Marque & entreprise : nom, logos (appli + e-mails), pieds de page, contact.
   Tout est appliqué sans code ni redéploiement — utile si l'entreprise change un jour.
   Les infos juridiques complètes (siège, SIREN…) restent dans « Pages & Traductions ». */

const CHAMPS = [
  { cle: "nom_marque", label: "Nom de la marque", icone: Type, aide: "Affiché dans l'appli, le site et les e-mails (alt, expéditeur…).", ph: "Zayado" },
  { cle: "nom_expediteur", label: "Nom d'expéditeur des e-mails", icone: Mail, aide: "Le nom que voient tes clients dans leur boîte mail.", ph: "Zayado" },
  { cle: "contact_email", label: "E-mail de contact", icone: Mail, aide: "Adresse publique de contact.", ph: "contact@zayado.net" },
  { cle: "logo_app_url", label: "Logo de l'appli (URL)", icone: ImageIcon, aide: "https://… ou /api/medias/… (upload via Carrousel login). Vide = logo d'origine.", ph: "https://…/logo.png" },
  { cle: "logo_email_url", label: "Logo des e-mails (URL)", icone: ImageIcon, aide: "https absolue (les e-mails ne chargent pas de chemin relatif). Vide = logo d'origine.", ph: "https://…/logo-email.png" },
  { cle: "email_pied", label: "Pied de page des e-mails", icone: Mail, aide: "Une ligne, affichée en bas de chaque e-mail automatique.", ph: "Envoyé par Zayado — …" },
  { cle: "site_pied", label: "Pied de page du site (phrase)", icone: Type, aide: "La phrase sous le nom, en bas des pages publiques.", ph: "La maison des entrepreneurs apaisés…" },
];

export default function AdminMarque() {
  const [form, setForm] = useState(null);
  const [apercu, setApercu] = useState("");
  const [chargement, setChargement] = useState(false);
  const [uploadEnCours, setUploadEnCours] = useState("");
  const fileRefs = { logo_app_url: useRef(null), logo_email_url: useRef(null) };

  async function televerserLogo(cle, fichier) {
    if (!fichier) return;
    setUploadEnCours(cle);
    try {
      const r = await uploadMedia(fichier);
      // Les e-mails exigent une URL absolue ; l'appli accepte le chemin local /api/medias/…
      const url = cle === "logo_email_url" ? `${window.location.origin}${r.url}` : r.url;
      setForm((f) => ({ ...f, [cle]: url }));
      toast.success("Logo téléversé — pense à enregistrer.");
    } catch (e) {
      toast.error(errorMessage(e, "Téléversement impossible."));
    } finally {
      setUploadEnCours("");
    }
  }

  useEffect(() => {
    apiGet("/marque").then((d) => setForm({
      nom_marque: "", nom_expediteur: "", contact_email: "",
      logo_app_url: "", logo_email_url: "", email_pied: "", site_pied: "",
      _actuel: d,
    })).catch((e) => toast.error(errorMessage(e)));
    rafraichirApercu();
  }, []);

  function rafraichirApercu() {
    apiGet("/admin/marque/apercu-email").then((d) => setApercu(d.html)).catch(() => setApercu(""));
  }

  async function enregistrer() {
    setChargement(true);
    try {
      const corps = Object.fromEntries(Object.entries(form).filter(([k, v]) => !k.startsWith("_") && v !== ""));
      await apiPut("/admin/marque", corps);
      await rafraichirMarque();
      rafraichirApercu();
      toast.success("Marque enregistrée — appliquée partout immédiatement.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setChargement(false);
    }
  }

  async function reinit() {
    if (!window.confirm("Revenir aux valeurs d'origine (Zayado) ?")) return;
    setChargement(true);
    try {
      await apiPost("/admin/marque/origine");
      setForm({ nom_marque: "", nom_expediteur: "", contact_email: "", logo_app_url: "", logo_email_url: "", email_pied: "", site_pied: "", _actuel: null });
      await rafraichirMarque();
      rafraichirApercu();
      toast.success("Valeurs d'origine restaurées.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setChargement(false);
    }
  }

  if (!form) return <p className="text-offwhite/60" data-testid="marque-chargement">Chargement…</p>;

  return (
    <div className="space-y-5" data-testid="admin-marque">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Building2 size={18} /> Marque & entreprise</h2>
        <p className="mt-1 text-sm text-offwhite/60">
          Un seul endroit pour changer de nom, de logo ou de pied de page — les e-mails, l'appli et le site suivent
          immédiatement. Champ vide = valeur d'origine. Les infos juridiques (siège, SIREN…) se modifient dans
          l'onglet « Pages & Traductions ».
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {CHAMPS.map(({ cle, label, icone: Icone, aide, ph }) => (
            <div key={cle} className={cle.startsWith("logo_") || cle.includes("pied") ? "md:col-span-2" : ""}>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-offwhite/55">
                <Icone size={13} /> {label}
              </label>
              <input
                data-testid={`marque-champ-${cle}`}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-offwhite placeholder:text-offwhite/30 focus:border-gold focus:outline-none"
                value={form[cle]}
                placeholder={ph}
                onChange={(e) => setForm({ ...form, [cle]: e.target.value })}
              />
              {cle.startsWith("logo_") && (
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    ref={fileRefs[cle]}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    data-testid={`marque-fichier-${cle}`}
                    onChange={(e) => { televerserLogo(cle, e.target.files?.[0]); e.target.value = ""; }}
                  />
                  <button
                    type="button"
                    data-testid={`marque-upload-${cle}`}
                    onClick={() => fileRefs[cle].current?.click()}
                    disabled={!!uploadEnCours}
                    className="inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs text-gold hover:bg-gold/20 disabled:opacity-50"
                  >
                    {uploadEnCours === cle ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    {uploadEnCours === cle ? "Téléversement…" : "Téléverser un fichier"}
                  </button>
                </div>
              )}
              <p className="mt-1 text-xs text-offwhite/40">{aide}</p>
            </div>
          ))}
        </div>
        {(form.logo_app_url || form.logo_email_url) && (
          <div className="mt-4 flex flex-wrap items-center gap-6 rounded-xl border border-white/10 bg-white/[0.02] p-4" data-testid="marque-apercu-logos">
            {form.logo_app_url && (
              <div className="text-center">
                <img src={form.logo_app_url} alt="Logo appli" className="mx-auto h-12 w-auto object-contain" />
                <p className="mt-1 text-[11px] text-offwhite/45">Logo appli</p>
              </div>
            )}
            {form.logo_email_url && (
              <div className="text-center">
                <img src={form.logo_email_url} alt="Logo e-mail" className="mx-auto h-12 w-auto object-contain" />
                <p className="mt-1 text-[11px] text-offwhite/45">Logo e-mails</p>
              </div>
            )}
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <button data-testid="marque-enregistrer" onClick={enregistrer} disabled={chargement}
            className="btn-gold inline-flex items-center gap-2 !px-5 !py-2.5 text-sm disabled:opacity-50">
            <Save size={15} /> Enregistrer
          </button>
          <button data-testid="marque-reinitialiser" onClick={reinit} disabled={chargement}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm text-offwhite/70 hover:border-white/30 disabled:opacity-50">
            <RotateCcw size={15} /> Valeurs d'origine
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold"><Eye size={16} /> Aperçu e-mail réel</h3>
        <p className="mt-1 text-sm text-offwhite/60">En-tête et pied de page exacts des e-mails automatiques, avec les réglages enregistrés.</p>
        {apercu ? (
          <iframe data-testid="marque-apercu-email" title="Aperçu e-mail" sandbox=""
            className="mt-3 h-[420px] w-full rounded-xl border border-white/10 bg-white"
            srcDoc={apercu} />
        ) : (
          <p className="mt-3 text-sm text-offwhite/40" data-testid="marque-apercu-vide">Aperçu indisponible.</p>
        )}
      </div>
    </div>
  );
}
