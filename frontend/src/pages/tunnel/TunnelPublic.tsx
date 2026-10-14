// Page publique d'un tunnel créé par un utilisateur de Zayado : /t/:slug
// Parcours : capture → remerciement (+ offre de démarrage) → vente → option (upsell) → version allégée (downsell) → fin.
// Les mentions légales sont celles de l'entreprise de l'utilisateur ; Zayado n'apparaît que comme prestataire.
// Paiement en ligne (Mollie) si le créateur l'a activé : chaque « oui » chiffré ouvre le paiement sécurisé,
// sinon il devient une demande dans le Radar de l'utilisateur, qui recontacte la personne.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { BlocHtml, useCodeTunnel } from "@/pages/tunnel/CodeTunnel";
import type { CodeTunnel } from "@/zayado/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Loader2, X } from "lucide-react";
import { apiGet, apiPost, errorMessage } from "@/lib/api";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";

type Etape = { cle: string; titre: string; accroche: string; contenu: string; bouton: string; offre_nom: string; prix: number | null };
type Editeur = { raison_sociale: string; forme_juridique: string; siren: string; adresse: string; email: string; telephone: string; responsable: string; tva: string; mediateur: string };
type Publique = {
  code?: Partial<CodeTunnel>; paiement_en_ligne: boolean; slug: string; nom: string; sujet: string; parcours: string; etapes: Etape[];
  offre: { resultat_reve?: string; preuve?: string; delai?: string; effort?: string; bonus?: string[]; garantie?: string; rarete?: string };
  upsell: { nom?: string; prix?: number | null; prix_barre?: number | null; contenu?: string[]; oui?: string; non?: string; placement?: string };
  downsell: { nom?: string; prix?: number | null; mensualites?: number };
  seo: { titre?: string; description?: string; image?: string }; editeur: Editeur;
};
type EtapePayee = "tripwire" | "commande" | "upsell" | "downsell";
type Paiement = { id: string; statut: "en_attente" | "paye" | "echoue" | "annule" | "expire"; etape: EtapePayee; libelle: string; montant: number; client_nom: string; client_email: string; simulation: boolean };
type Vue = "capture" | "remerciement" | "vente" | "upsell" | "downsell" | "fin";

const INK = "#16263F";
const NAVY = "#0D1F38";
const LINE = "rgba(19,35,62,0.14)";
const eur = (v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: v % 1 === 0 ? 0 : 2 }).format(v);

function useMeta(p?: Publique) {
  useEffect(() => {
    if (!p) return;
    const capture = p.etapes.find((e) => e.cle === "capture");
    document.title = p.seo.titre || capture?.titre || p.nom;
    const poser = (attr: string, cle: string, val?: string) => {
      if (!val) return;
      let m = document.head.querySelector(`meta[${attr}="${cle}"]`) as HTMLMetaElement | null;
      if (!m) { m = document.createElement("meta"); m.setAttribute(attr, cle); document.head.appendChild(m); }
      m.content = val;
    };
    poser("name", "description", p.seo.description || capture?.accroche);
    poser("property", "og:title", p.seo.titre || capture?.titre);
    poser("property", "og:description", p.seo.description || capture?.accroche);
    if (p.seo.image) poser("property", "og:image", p.seo.image.startsWith("/") ? window.location.origin + p.seo.image : p.seo.image);
  }, [p]);
}

function Paragraphes({ texte }: { texte: string }) {
  const lignes = texte.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <>
      {lignes.map((l, i) => /^[•\-–✓]\s*/.test(l) ? (
        <p key={i} className="mt-2 flex gap-2 leading-relaxed"><Check className="mt-1 size-4 flex-none" style={{ color: NAVY }} /><span className="opacity-90">{l.replace(/^[•\-–✓]\s*/, "")}</span></p>
      ) : <p key={i} className="mt-2 leading-relaxed opacity-80">{l}</p>)}
    </>
  );
}

function Fenetre({ titre, onFermer, children }: { titre: string; onFermer: () => void; children: ReactNode }) {
  useEffect(() => {
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, [onFermer]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={titre} onClick={onFermer}>
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 text-[14px]" style={{ color: INK }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{titre}</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="rounded-full p-1 hover:bg-black/5"><X className="size-5" /></button>
        </div>
        <div className="mt-3 space-y-2 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export default function TunnelPublic() {
  const { slug = "" } = useParams();
  const q = useQuery({ queryKey: ["tunnel-public", slug], queryFn: () => apiGet<Publique>(`/public/t/${slug}`), retry: false });
  const p = q.data;
  useMeta(p);
  const [vue, setVue] = useState<Vue>("capture");
  const [f, setF] = useState({ nom: "", email: "", consentement: false });
  const [fenetre, setFenetre] = useState<"mentions" | "confidentialite" | null>(null);
  const etape = useMemo(() => Object.fromEntries((p?.etapes ?? []).map((e) => [e.cle, e])) as Record<string, Etape>, [p]);
  const envoyer = useMutation({
    mutationFn: (intention: string) => apiPost<{ ok: boolean }>(`/public/t/${slug}/contact`, { ...f, intention }),
  });
  // Paiement Mollie : on garde prénom + e-mail le temps de l'aller-retour vers la page de paiement.
  const [params, setParams] = useSearchParams();
  const pid = params.get("paiement");
  const payer = useMutation({
    mutationFn: (etape: EtapePayee) => apiPost<{ id: string; checkout_url: string; simulation: boolean }>(`/public/t/${slug}/payer`, { ...f, etape }),
    onSuccess: (r) => { sessionStorage.setItem(`tp-${slug}`, JSON.stringify(f)); window.location.href = r.checkout_url; },
  });
  const statut = useQuery({
    queryKey: ["tunnel-paiement", slug, pid], enabled: !!pid, retry: false,
    queryFn: () => apiGet<Paiement>(`/public/t/${slug}/paiement/${pid}`),
    refetchInterval: (qq) => (qq.state.data?.statut === "en_attente" ? 2500 : false),
  });
  const suite = (intention: string | null, prochaine: Vue) => {
    if (!intention) { setVue(prochaine); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    envoyer.mutate(intention, { onSuccess: () => { setVue(prochaine); window.scrollTo({ top: 0, behavior: "smooth" }); } });
  };
  const apresUpsell: Vue = p?.downsell?.nom ? "downsell" : "fin";
  // L'option « pendant l'appel » est un script pour le vendeur : elle ne s'affiche pas au prospect.
  const apresVente: Vue = p?.upsell?.nom && p.upsell.placement !== "pendant_appel" ? "upsell" : apresUpsell;
  const prixDe = (k: EtapePayee): number | null | undefined =>
    k === "tripwire" ? etape.remerciement?.prix : k === "commande" ? etape.vente?.prix : k === "upsell" ? p?.upsell?.prix : p?.downsell?.prix;
  const enLigne = (k: EtapePayee) => !!p?.paiement_en_ligne && !!prixDe(k);
  // « Oui » : paiement en ligne si le créateur l'a activé et que l'offre a un prix, sinon simple demande.
  const oui = (k: EtapePayee, prochaine: Vue) => (enLigne(k) ? payer.mutate(k) : suite(k, prochaine));
  const sp = statut.data;
  useEffect(() => {
    if (!sp || !p) return;
    const garde = sessionStorage.getItem(`tp-${slug}`);
    if (garde) { try { setF(JSON.parse(garde)); } catch { /* ignoré */ } } else setF((x) => ({ ...x, nom: sp.client_nom, email: sp.client_email, consentement: true }));
    const apres: Record<EtapePayee, Vue> = { tripwire: "vente", commande: apresVente, upsell: "fin", downsell: "fin" };
    const avant: Record<EtapePayee, Vue> = { tripwire: "remerciement", commande: "vente", upsell: "upsell", downsell: "downsell" };
    if (sp.statut === "paye") setVue(apres[sp.etape]);
    else if (sp.statut !== "en_attente") setVue(avant[sp.etape]);
  }, [sp?.statut, sp?.etape, p?.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  const fermerBandeau = () => { params.delete("paiement"); setParams(params, { replace: true }); };
  const occupe = envoyer.isPending || payer.isPending;
  useCodeTunnel(p?.code);

  if (q.isLoading) return <div className="flex min-h-svh items-center justify-center bg-[#FDFCF8]"><Loader2 className="size-8 animate-spin" style={{ color: NAVY }} /></div>;
  if (!p) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#FDFCF8] px-6 text-center" style={{ color: INK }}>
        <div><p className="text-2xl font-semibold">Cette page n'est pas disponible.</p><p className="mt-2 opacity-70">Elle a peut-être été mise en pause par son auteur.</p></div>
      </div>
    );
  }
  const e = p.editeur;
  const carte = "rounded-[22px] border bg-white p-6 sm:p-8 shadow-[0_20px_60px_rgba(13,31,56,0.06)]";
  const bouton = "site-btn site-btn-primary px-7 py-3.5 text-[15px] disabled:opacity-50";
  const lienNon = "text-sm underline underline-offset-4 opacity-75 hover:opacity-100";
  const Prix = ({ v }: { v?: number | null }) => (v ? <p className="mt-4 text-3xl font-semibold" style={{ color: NAVY }}>{eur(v)}</p> : null);

  return (
    <div className="site relative min-h-svh" style={{ color: INK }} data-testid="tunnel-public">
      <div className="site-ruled pointer-events-none absolute inset-0" />
      <div className="site-halo pointer-events-none absolute inset-0" />
      <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ background: "rgba(253,252,248,0.92)", borderColor: LINE }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <span className="text-lg font-semibold tracking-tight" style={{ color: NAVY }}>{e.raison_sociale}</span>
        </div>
      </header>
      <main className="relative mx-auto max-w-3xl px-5 pb-16 pt-8">
        <BlocHtml html={p.code?.html_haut ?? ""} testId="tp-code-haut" />
        {pid && sp ? (
          <div className={`mb-5 flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm ${sp.statut === "paye" ? "bg-[#E8F3EC] text-[#1E5B3A]" : sp.statut === "en_attente" ? "bg-[#F4EFE6]" : "bg-[#FDECEC] text-[#B42318]"}`} data-testid="tp-paiement-statut">
            <span>
              {sp.statut === "paye" ? `Paiement confirmé : ${sp.libelle} — ${eur(sp.montant)}.` : sp.statut === "en_attente" ? "Nous attendons la confirmation de votre paiement…" : "Le paiement n'a pas abouti. Vous pouvez réessayer."}
              {sp.simulation ? " (paiement simulé — environnement de test)" : ""}
            </span>
            <button type="button" onClick={fermerBandeau} aria-label="Fermer" data-testid="tp-paiement-fermer"><X className="size-4" /></button>
          </div>
        ) : null}
        {vue === "capture" && etape.capture ? (
          <section className={carte} style={{ borderColor: LINE }} data-testid="tp-capture">
            {p.seo.image ? <img src={p.seo.image} alt="" className="mb-6 aspect-[1200/630] w-full rounded-xl object-cover" /> : null}
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl" style={{ color: NAVY }}>{etape.capture.titre}</h1>
            <p className="mt-3 text-lg opacity-80">{etape.capture.accroche}</p>
            <Paragraphes texte={etape.capture.contenu} />
            <form className="mt-6 grid gap-3" onSubmit={(ev) => { ev.preventDefault(); suite("capture", "remerciement"); }}>
              <input required minLength={2} placeholder="Votre prénom" className="w-full min-w-0 rounded-xl border bg-white px-4 py-3" style={{ borderColor: LINE }} value={f.nom} onChange={(ev) => setF({ ...f, nom: ev.target.value })} data-testid="tp-nom" autoComplete="given-name" />
              <input required type="email" placeholder="Votre e-mail" className="w-full min-w-0 rounded-xl border bg-white px-4 py-3" style={{ borderColor: LINE }} value={f.email} onChange={(ev) => setF({ ...f, email: ev.target.value })} data-testid="tp-email" autoComplete="email" />
              <label className="flex items-start gap-3 text-[13px] leading-relaxed opacity-80">
                <input type="checkbox" required checked={f.consentement} onChange={(ev) => setF({ ...f, consentement: ev.target.checked })} className="mt-1" data-testid="tp-consentement" />
                <span>J'accepte que {e.raison_sociale} utilise mon e-mail pour m'envoyer ce que je demande et me recontacter à ce sujet. Désinscription à tout moment. <button type="button" className="underline" onClick={() => setFenetre("confidentialite")}>Confidentialité</button></span>
              </label>
              <button type="submit" className={bouton}  disabled={occupe} data-testid="tp-capture-ok">
                {envoyer.isPending ? <Loader2 className="size-4 animate-spin" /> : null} {etape.capture.bouton || "Je m'inscris"} <ArrowRight className="size-4" />
              </button>
            </form>
          </section>
        ) : null}

        {vue === "remerciement" && etape.remerciement ? (
          <section className={carte} style={{ borderColor: LINE }} data-testid="tp-remerciement">
            <h1 className="text-3xl font-semibold" style={{ color: NAVY }}>{etape.remerciement.titre}</h1>
            <p className="mt-3 text-lg opacity-80">{etape.remerciement.accroche}</p>
            <Paragraphes texte={etape.remerciement.contenu} />
            {etape.remerciement.offre_nom ? <p className="mt-5 font-semibold">{etape.remerciement.offre_nom}</p> : null}
            <Prix v={etape.remerciement.prix} />
            <div className="mt-6 flex flex-col items-start gap-3">
              <button type="button" className={bouton}  disabled={occupe}
                onClick={() => (p.parcours === "rendez_vous" ? suite("rendez_vous", "vente") : oui("tripwire", "vente"))} data-testid="tp-remerciement-oui">
                {etape.remerciement.bouton || "Oui, je veux"} <ArrowRight className="size-4" />
              </button>
              <button type="button" className={lienNon} onClick={() => suite(null, "vente")} data-testid="tp-remerciement-non">Non merci, voir l'offre complète</button>
            </div>
          </section>
        ) : null}

        {vue === "vente" && etape.vente ? (
          <section className={carte} style={{ borderColor: LINE }} data-testid="tp-vente">
            <h1 className="text-3xl font-semibold" style={{ color: NAVY }}>{etape.vente.titre}</h1>
            <p className="mt-3 text-lg opacity-80">{etape.vente.accroche}</p>
            <Paragraphes texte={etape.vente.contenu} />
            {p.offre.resultat_reve || p.offre.delai || p.offre.garantie ? (
              <ul className="mt-5 grid gap-2">
                {[p.offre.resultat_reve, p.offre.delai && `Délai : ${p.offre.delai}`, p.offre.effort && `Ce que cela vous demande : ${p.offre.effort}`, ...(p.offre.bonus ?? []), p.offre.garantie && `Garantie : ${p.offre.garantie}`]
                  .filter(Boolean).map((l) => <li key={String(l)} className="flex gap-2"><Check className="mt-1 size-4 flex-none" style={{ color: NAVY }} />{l}</li>)}
              </ul>
            ) : null}
            {p.offre.preuve ? <blockquote className="mt-5 rounded-xl border-l-4 bg-[#F6EEE3] px-4 py-3 text-[15px] italic" style={{ borderColor: "#A8835A" }}>{p.offre.preuve}</blockquote> : null}
            <Prix v={etape.vente.prix} />
            {p.offre.rarete ? <p className="mt-2 text-sm font-medium" style={{ color: "#8A6A45" }}>{p.offre.rarete}</p> : null}
            <div className="mt-6">
              <button type="button" className={bouton}  disabled={occupe} onClick={() => oui("commande", apresVente)} data-testid="tp-vente-oui">
                {etape.vente.bouton || "Je le veux"} <ArrowRight className="size-4" />
              </button>
              <p className="mt-3 text-[13px] opacity-65" data-testid="tp-reassurance">{enLigne("commande") ? "Paiement sécurisé par Mollie (carte, Apple Pay, virement…). Vous recevez la confirmation par e-mail." : `Aucun paiement maintenant : ${e.raison_sociale} vous recontacte pour confirmer les détails avec vous.`}</p>
            </div>
          </section>
        ) : null}

        {vue === "upsell" ? (
          <section className={carte} style={{ borderColor: LINE }} data-testid="tp-upsell">
            <p className="text-sm font-semibold" style={{ color: NAVY }}>{sp?.statut === "paye" ? "Votre paiement est confirmé." : `C'est noté : ${e.raison_sociale} vous recontacte pour finaliser.`}</p>
            <h1 className="mt-3 text-3xl font-semibold" style={{ color: NAVY }}>{etape.upsell?.titre || "Attendez, lisez ceci…"}</h1>
            <p className="mt-3 text-lg opacity-80">{etape.upsell?.accroche}</p>
            {p.upsell.nom ? <p className="mt-5 font-semibold">{p.upsell.nom}</p> : null}
            <ul className="mt-3 grid gap-2">{(p.upsell.contenu ?? []).map((l) => <li key={l} className="flex gap-2"><Check className="mt-1 size-4 flex-none" style={{ color: NAVY }} />{l}</li>)}</ul>
            {p.upsell.prix ? (
              <p className="mt-4 flex items-baseline gap-3">
                <span className="text-3xl font-semibold" style={{ color: NAVY }}>{eur(p.upsell.prix)}</span>
                {p.upsell.prix_barre && p.upsell.prix_barre > p.upsell.prix ? <span className="text-lg line-through opacity-50">{eur(p.upsell.prix_barre)}</span> : null}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col items-start gap-3">
              <button type="button" className={bouton}  disabled={occupe} onClick={() => oui("upsell", "fin")} data-testid="tp-upsell-oui">
                {p.upsell.oui || "Oui, j'ajoute cette option"}
              </button>
              <button type="button" className={lienNon} onClick={() => suite(null, apresUpsell)} data-testid="tp-upsell-non">{p.upsell.non || "Non merci"}</button>
            </div>
          </section>
        ) : null}

        {vue === "downsell" ? (
          <section className={carte} style={{ borderColor: LINE }} data-testid="tp-downsell">
            <h1 className="text-3xl font-semibold" style={{ color: NAVY }}>Une version plus légère ?</h1>
            <p className="mt-3 text-lg opacity-80">{p.downsell.nom}</p>
            <Prix v={p.downsell.prix} />
            {p.downsell.mensualites && p.downsell.mensualites > 1 && p.downsell.prix ? (
              <p className="mt-1 text-sm opacity-70">ou {p.downsell.mensualites} fois {eur(Math.round((p.downsell.prix / p.downsell.mensualites) * 100) / 100)}</p>
            ) : null}
            <div className="mt-6 flex flex-col items-start gap-3">
              <button type="button" className={bouton}  disabled={occupe} onClick={() => oui("downsell", "fin")} data-testid="tp-downsell-oui">Oui, je prends cette version</button>
              <button type="button" className={lienNon} onClick={() => suite(null, "fin")} data-testid="tp-downsell-non">Non merci</button>
            </div>
          </section>
        ) : null}

        {vue === "fin" ? (
          <section className={`${carte} text-center`} style={{ borderColor: LINE }} data-testid="tp-fin">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "#F1E2CC" }}><Check className="size-7" style={{ color: NAVY }} /></span>
            <h1 className="mt-4 text-3xl font-semibold" style={{ color: NAVY }}>Merci{f.nom ? `, ${f.nom}` : ""} !</h1>
            <p className="mt-2 opacity-80">{sp?.statut === "paye" ? `Votre paiement est confirmé. ${e.raison_sociale} vous écrit à ${f.email || "votre adresse e-mail"} pour la suite.` : `${e.raison_sociale} vous recontacte très vite à ${f.email || "votre adresse e-mail"}.`}</p>
          </section>
        ) : null}

        {payer.isError ? <p className="mt-3 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm text-[#B42318]" data-testid="tp-paiement-erreur">{errorMessage(payer.error)}</p> : null}
        {envoyer.isError ? <p className="mt-3 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm text-[#B42318]">{errorMessage(envoyer.error)}</p> : null}
        <BlocHtml html={p.code?.html_bas ?? ""} testId="tp-code-bas" />
      </main>
      <footer className="relative border-t px-5 py-6 text-center text-[12px]" style={{ borderColor: LINE, background: "#F6F5F2", color: "rgba(22,38,63,0.7)" }}>
        {e.raison_sociale} ·{" "}
        <button type="button" className="underline" onClick={() => setFenetre("mentions")} data-testid="tp-mentions">Mentions légales</button> ·{" "}
        <button type="button" className="underline" onClick={() => setFenetre("confidentialite")} data-testid="tp-confidentialite">Confidentialité</button>
        <span className="block pt-1 opacity-70">Page réalisée avec Zayado</span>
      </footer>

      {fenetre === "mentions" ? (
        <Fenetre titre="Mentions légales" onFermer={() => setFenetre(null)}>
          <p><b>Éditeur :</b> {e.raison_sociale}{e.forme_juridique ? `, ${e.forme_juridique}` : ""} — SIREN/SIRET {e.siren}</p>
          <p><b>Adresse :</b> {e.adresse}</p>
          <p><b>Contact :</b> {e.email}{e.telephone ? ` · ${e.telephone}` : ""}</p>
          {e.responsable ? <p><b>Responsable de la publication :</b> {e.responsable}</p> : null}
          {e.tva ? <p><b>TVA :</b> {e.tva}</p> : null}
          <p><b>Réalisation et hébergement de la page :</b> plateforme Zayado (SAS TheSustain), app.zayado.net.</p>
          {e.mediateur ? <p><b>Médiateur de la consommation :</b> {e.mediateur}</p> : null}
        </Fenetre>
      ) : null}
      {fenetre === "confidentialite" ? (
        <Fenetre titre="Confidentialité" onFermer={() => setFenetre(null)}>
          <p><b>Responsable du traitement :</b> {e.raison_sociale}, {e.adresse} ({e.email}).</p>
          <p><b>Données collectées :</b> votre prénom, votre e-mail et les choix faits sur ces pages.</p>
          <p><b>Pourquoi :</b> vous envoyer ce que vous avez demandé et vous recontacter au sujet de cette offre. Base légale : votre consentement.</p>
          <p><b>Durée :</b> 3 ans après votre dernier échange, puis suppression.</p>
          <p><b>Sous-traitant :</b> Zayado (SAS TheSustain), qui héberge ces pages et les données pour le compte de {e.raison_sociale}. Aucune revente.</p>
          <p><b>Vos droits :</b> accès, rectification, suppression, opposition : écrivez à {e.email}. Vous pouvez aussi saisir la CNIL (cnil.fr).</p>
        </Fenetre>
      ) : null}
    </div>
  );
}
