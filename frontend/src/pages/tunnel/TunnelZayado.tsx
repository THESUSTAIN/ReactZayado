// Tunnel public Zayado — même style que la page d'accueil du site zayado.net (papier ligné, tampon,
// Poppins + mot manuscrit Caveat, boutons bleu nuit). Capture → Merci + tripwire (Kit) → Fast-Track en un clic
// → Confirmation. Le Kit est livré sur /public/tunnel/kit.
// Règles : aucun témoignage ni prix barré, aucune fausse urgence ; tous les
// chiffres du Kit viennent du FEC du client (source + date affichées).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, CreditCard, Download, FileSpreadsheet, Loader2, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { apiGet, apiPost, apiUpload, errorMessage } from "@/lib/api";
import type { Analyse, CaptureIn, CaptureOut, CheckoutOut, Commande, Offres, Prospect } from "./types";
import "@fontsource-variable/fraunces";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/caveat/600.css";

export const NAVY = "#0D1F38";
export const GOLD = "#D6A64F"; // or du site zayado.net (mots manuscrits, détails)
export const GOLD_SOFT = "#F0DCAC";
/* Dégradés de la marque (identiques au site zayado.net) */
export const DEGRADE_BLEU = "linear-gradient(120deg, #0D1F38 0%, #1E3D63 55%, #2E4A6B 100%)";
export const DEGRADE_CHAMPAGNE = "linear-gradient(120deg, #F1E2CC 0%, #DEC2A3 100%)";
export const DEGRADE_CARTE = "linear-gradient(120deg, #0A1B31 0%, #16304F 38%, #2E4A6B 68%, #466B94 100%)";
const PAPER = "#FDFCF8";
export const PAPER_2 = "#F6F5F2";
export const LINE = "rgba(19,35,62,0.14)";
// Titres : Poppins semi-gras, comme la page d'accueil du site (plus de Fraunces sur les pages publiques).
export const DISPLAY = "'Poppins', sans-serif";

const SITUATIONS = [
  { v: "independant", l: "Indépendant·e" },
  { v: "tpe", l: "Dirigeant·e de TPE (1 à 10 personnes)" },
  { v: "creation", l: "En création ou en reprise" },
];
const PRIORITES = [
  { v: "tresorerie", l: "Trésorerie et chiffres", pas: "Regarder ton autonomie de trésorerie en mois : combien de mois tu tiens sans nouvelle vente. C'est le premier chiffre qui apaise ou qui alerte." },
  { v: "equilibre", l: "Temps et équilibre", pas: "Bloquer cette semaine un créneau sans travail, et le noter comme un rendez-vous client. L'équilibre se pilote comme un chiffre." },
  { v: "clients", l: "Trouver des clients", pas: "Lister 10 entreprises de ta zone qui ont bougé ce mois-ci (création, déménagement, levée) : ce sont les signaux les plus chauds." },
  { v: "organisation", l: "Organisation et équipe", pas: "Écrire les 3 tâches que tu refais chaque semaine : ce sont les premières à documenter ou à déléguer." },
];

export const eur = (v: string | number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: Number(v) % 1 === 0 ? 0 : 2 }).format(Number(v));
const dateFR = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");

export function useOffres() {
  return useQuery({ queryKey: ["tunnel-offres"], queryFn: () => apiGet<Offres>("/tunnel-zayado/offres") });
}

/* Logo du site zayado.net : pastille bleu nuit au Z doré, nom, devise manuscrite. */
export function LogoSite() {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="38" height="38" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="23" fill={NAVY} />
        <path d="M15 16h18L15 32h18" stroke={GOLD_SOFT} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="leading-none">
        <span className="block text-[20px] font-semibold tracking-tight" style={{ color: NAVY }}>Zayado</span>
        <span className="site-hand block text-[15px] leading-none">clarté · sérénité · équilibre</span>
      </span>
    </span>
  );
}

export type Seo = { titre: string; description: string; image: string };
// Pages d'entrée (capture) : référencées avec titre, description et image de partage.
// Pages suivantes (merci, paiement, kit) : jamais indexées.
export function Cadre({ children, testId, seo }: { children: ReactNode; testId: string; seo?: Seo }) {
  const { data } = useOffres();
  useEffect(() => {
    const ajoutes: HTMLMetaElement[] = [];
    const poser = (attr: string, cle: string, val: string) => {
      const m = document.createElement("meta"); m.setAttribute(attr, cle); m.content = val; document.head.appendChild(m); ajoutes.push(m);
    };
    const avant = document.title;
    if (seo) {
      document.title = seo.titre;
      poser("name", "description", seo.description);
      poser("property", "og:title", seo.titre);
      poser("property", "og:description", seo.description);
      poser("property", "og:image", window.location.origin + seo.image);
      poser("property", "og:type", "website");
      poser("name", "twitter:card", "summary_large_image");
    } else {
      poser("name", "robots", "noindex, nofollow");
    }
    return () => { ajoutes.forEach((m) => m.remove()); document.title = avant; };
  }, [seo]);
  return (
    <div className="site relative min-h-svh" data-testid={testId}>
      <div className="site-ruled pointer-events-none absolute inset-0" />
      <div className="site-halo pointer-events-none absolute inset-0" />
      <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ background: "rgba(253,252,248,0.92)", borderColor: LINE }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link to="/public/tunnel" data-testid="tunnel-logo-link" aria-label="Zayado"><LogoSite /></Link>
          {data?.simulation ? (
            <span data-testid="tunnel-simulation-badge" className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ background: "#FDECEC", color: "#B42318" }}>
              Paiement simulé (test local)
            </span>
          ) : null}
        </div>
      </header>
      <main className="relative mx-auto max-w-5xl px-5 pb-20">{children}</main>
      <footer className="relative border-t px-5 py-8 text-center text-[12px]" style={{ borderColor: LINE, background: PAPER_2 }}>
        <p className="site-hand text-[18px]">clarté · sérénité · équilibre</p>
        <p className="mt-2 opacity-60">
          Zayado · <a href="/legal/mentions-legales" className="underline">Mentions légales</a> · <a href="/legal/confidentialite" className="underline">Confidentialité</a> · Paiement sécurisé par Mollie
        </p>
      </footer>
    </div>
  );
}

export function Bouton({ children, onClick, disabled, testId, variante = "navy", type = "button" }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; testId: string; variante?: "navy" | "or" | "texte"; type?: "button" | "submit";
}) {
  const cls = variante === "navy" ? "site-btn site-btn-primary" : variante === "or" ? "site-btn site-btn-secondaire" : "underline underline-offset-4";
  return (
    <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} style={variante === "texte" ? { color: NAVY } : undefined}
      className={`${cls} px-7 py-3.5 text-[15px] disabled:opacity-50`}>
      {children}
    </button>
  );
}

export function Erreur({ message, testId = "tunnel-erreur" }: { message: string; testId?: string }) {
  return <p data-testid={testId} className="mt-3 rounded-xl px-4 py-3 text-sm" style={{ background: "#FDECEC", color: "#B42318" }}>{message}</p>;
}

// ---------------- 1. Capture ----------------
const SEO_DIAGNOSTIC: Seo = {
  titre: "Diagnostic gratuit pour entrepreneurs · Zayado",
  description: "Quatre réponses, et tu repars avec ta priorité du moment et un premier pas concret, pour ton entreprise comme pour toi.",
  image: "/og/diagnostic.png",
};

export function TunnelCapture() {
  const navigate = useNavigate();
  const [f, setF] = useState<CaptureIn>({ email: "", prenom: "", situation: "", priorite: "", consentement: false });
  const capture = useMutation({
    mutationFn: (b: CaptureIn) => apiPost<CaptureOut>("/tunnel-zayado/capture", { ...b }),
    onSuccess: (r) => navigate(`/public/tunnel/merci?p=${r.prospect_id}`),
  });
  const champ = "w-full rounded-xl border bg-white px-4 py-3 text-[15px] outline-none transition-colors focus:border-[#C9A97E]";
  return (
    <Cadre testId="tunnel-capture-page" seo={SEO_DIAGNOSTIC}>
      <section className="grid items-start gap-10 pt-6 md:grid-cols-[1.1fr_1fr] md:pt-12">
        <div>
          <p className="site-stamp" style={{ color: NAVY }}>Diagnostic gratuit · 2 minutes</p>
          <h1 style={{ fontFamily: DISPLAY, color: NAVY }} className="mt-6 text-[40px] font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            Entreprendre avec <span className="site-hand">clarté financière,</span> sérénité et équilibre.
          </h1>
          <p className="mt-5 max-w-lg text-[16px] leading-relaxed opacity-75">
            Quatre réponses, et tu repars avec ta priorité du moment et un premier pas concret, pour ton entreprise comme pour toi.
          </p>
          <ol className="mt-8 space-y-4">
            {[
              ["1", "Ton diagnostic, gratuit", "Ta situation, ta priorité : on part de là où tu en es."],
              ["2", "Ton premier pas, tout de suite", "Une action concrète liée à ta priorité, affichée dès la page suivante."],
              ["3", "Tes chiffres, si tu le veux", "Le Kit Diagnostic Flash lit ton FEC et te remet un rapport chiffré, sourcé et daté."],
            ].map(([n, t, d]) => (
              <li key={n} className="flex gap-4">
                <span style={{ backgroundImage: DEGRADE_BLEU, color: GOLD_SOFT, fontFamily: DISPLAY }} className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold">{n}</span>
                <div>
                  <p className="font-semibold" style={{ color: NAVY }}>{t}</p>
                  <p className="text-sm opacity-70">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <form
          data-testid="tunnel-capture-form"
          onSubmit={(e) => { e.preventDefault(); capture.mutate(f); }}
          className="rounded-[26px] border bg-white p-6 shadow-[0_20px_60px_rgba(13,31,56,0.08)] sm:p-8"
          style={{ borderColor: LINE }}
        >
          <h2 style={{ fontFamily: DISPLAY, color: NAVY }} className="text-2xl font-semibold">Mon diagnostic</h2>
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium">Prénom
              <input className={`${champ} mt-1.5`} style={{ borderColor: LINE }} value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} data-testid="tunnel-prenom-input" autoComplete="given-name" />
            </label>
            <label className="block text-sm font-medium">E-mail professionnel
              <input required type="email" className={`${champ} mt-1.5`} style={{ borderColor: LINE }} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} data-testid="tunnel-email-input" autoComplete="email" />
            </label>
            <fieldset>
              <legend className="text-sm font-medium">Ta situation</legend>
              <div className="mt-1.5 grid gap-2">
                {SITUATIONS.map((s) => (
                  <label key={s.v} className="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors" style={{ borderColor: f.situation === s.v ? GOLD : LINE, background: f.situation === s.v ? "#F6EEE3" : "white" }}>
                    <input type="radio" name="situation" required checked={f.situation === s.v} onChange={() => setF({ ...f, situation: s.v })} data-testid={`tunnel-situation-${s.v}`} className="accent-[#0D1F38]" />
                    {s.l}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium">Ta priorité du moment</legend>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {PRIORITES.map((p) => (
                  <label key={p.v} className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors" style={{ borderColor: f.priorite === p.v ? GOLD : LINE, background: f.priorite === p.v ? "#F6EEE3" : "white" }}>
                    <input type="radio" name="priorite" required checked={f.priorite === p.v} onChange={() => setF({ ...f, priorite: p.v })} data-testid={`tunnel-priorite-${p.v}`} className="accent-[#0D1F38]" />
                    {p.l}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex items-start gap-3 text-[13px] leading-relaxed opacity-80">
              <input type="checkbox" required checked={f.consentement} onChange={(e) => setF({ ...f, consentement: e.target.checked })} data-testid="tunnel-consentement-checkbox" className="mt-1 accent-[#0D1F38]" />
              J'accepte que Zayado utilise mes réponses pour me présenter mon diagnostic et m'écrire à ce sujet. Je peux me désinscrire à tout moment. <a href="/legal/confidentialite" target="_blank" rel="noreferrer" className="underline">Politique de confidentialité</a>
            </label>
          </div>
          {capture.isError ? <Erreur message={errorMessage(capture.error)} /> : null}
          <div className="mt-6">
            <Bouton type="submit" testId="tunnel-capture-submit" disabled={capture.isPending}>
              {capture.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Voir mon diagnostic <ArrowRight className="size-4" />
            </Bouton>
          </div>
        </form>
      </section>
    </Cadre>
  );
}

// ---------------- 2. Merci + tripwire ----------------
export function TunnelMerci() {
  const [params] = useSearchParams();
  const pid = params.get("p") ?? "";
  const { data: offres } = useOffres();
  // Même source que la page Tarifs : le prix affiché ne peut plus diverger.
  const fondateur = useQuery({ queryKey: ["tarifs-fondateur"], queryFn: () => apiGet<{ ouverte: boolean; prix: { serenite: { mensuel: number } } }>("/tarifs/fondateur"), retry: false });
  const prospect = useQuery({ queryKey: ["tunnel-prospect", pid], queryFn: () => apiGet<Prospect>(`/tunnel-zayado/prospect/${pid}`), enabled: pid !== "", retry: false });
  const commander = useMutation({
    mutationFn: () => apiPost<CheckoutOut>("/tunnel-zayado/kit/commande", { prospect_id: pid }),
    onSuccess: (r) => { if (r.checkout_url) window.location.assign(r.checkout_url); },
  });
  const priorite = PRIORITES.find((p) => p.v === prospect.data?.priorite);

  if (!pid || prospect.isError) {
    return (
      <Cadre testId="tunnel-merci-page">
        <div className="mx-auto max-w-xl pt-16 text-center">
          <p className="text-lg">Ce lien n'est plus valide.</p>
          <Link to="/public/tunnel" className="mt-4 inline-block underline" data-testid="tunnel-merci-recommencer">Refaire mon diagnostic</Link>
        </div>
      </Cadre>
    );
  }

  return (
    <Cadre testId="tunnel-merci-page">
      <div className="mx-auto max-w-3xl pt-8">
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: GOLD_SOFT }}>
            <Check className="size-8" style={{ color: NAVY }} />
          </span>
          <h1 style={{ fontFamily: DISPLAY, color: NAVY }} className="mt-6 text-4xl font-semibold tracking-tight" data-testid="tunnel-merci-titre">
            Merci{prospect.data?.prenom ? `, ${prospect.data.prenom}` : ""}.
          </h1>
          <p className="mx-auto mt-3 max-w-md opacity-75">Voici ton diagnostic, tout de suite et sans attendre d'e-mail.</p>
        </div>

        {priorite ? (
          <div className="mt-8 rounded-[22px] border bg-white p-6" style={{ borderColor: LINE }} data-testid="tunnel-premier-pas">
            <p className="site-stamp" style={{ color: NAVY }}>Ta priorité · {priorite.l}</p>
            <p style={{ fontFamily: DISPLAY, color: NAVY }} className="mt-2 text-xl font-semibold">Ton premier pas cette semaine</p>
            <p className="mt-2 leading-relaxed opacity-80">{priorite.pas}</p>
          </div>
        ) : null}

        {offres ? (
          <div className="mt-6 rounded-[26px] p-7 md:p-9" style={{ background: DEGRADE_CARTE, color: PAPER_2 }} data-testid="tunnel-tripwire-kit">
            <p className="site-stamp" style={{ color: GOLD_SOFT }}>Réservé aux nouveaux inscrits</p>
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
              <h2 style={{ fontFamily: DISPLAY }} className="text-3xl font-semibold">{offres.kit.titre}</h2>
              <p style={{ fontFamily: DISPLAY, color: GOLD_SOFT }} className="text-3xl font-semibold" data-testid="tunnel-kit-prix">{eur(offres.kit.prix)}</p>
            </div>
            <p className="mt-2 max-w-xl opacity-80">{offres.kit.description}</p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {offres.kit.livrables.map((l) => (
                <li key={l} className="flex gap-2 text-[14px]"><Check className="mt-0.5 size-4 flex-none" style={{ color: GOLD_SOFT }} />{l}</li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Bouton variante="or" testId="tunnel-kit-acheter" onClick={() => commander.mutate()} disabled={commander.isPending}>
                {commander.isPending ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                Obtenir mon Kit — {eur(offres.kit.prix)}
              </Bouton>
            </div>
            <p className="mt-4 flex max-w-xl gap-2 text-[12px] leading-relaxed opacity-70">
              <ShieldCheck className="mt-0.5 size-4 flex-none" />
              Paiement par carte via Mollie. Ta carte est enregistrée chez Mollie pour te permettre, si tu le souhaites, d'ajouter le Fast-Track en un clic à l'étape suivante. Aucun autre débit sans ton clic.
            </p>
            {commander.isError ? <Erreur message={errorMessage(commander.error)} /> : null}
          </div>
        ) : null}

        {offres ? (
          <div className="mt-5 flex flex-col items-start gap-4 rounded-[22px] border bg-white p-6 sm:flex-row sm:items-center" style={{ borderColor: LINE }} data-testid="tunnel-essai-solo">
            <Sparkles className="size-6 flex-none" style={{ color: GOLD }} />
            <div className="flex-1">
              <p className="font-semibold" style={{ color: NAVY }}>Tu préfères tester le Cockpit Zayado ?</p>
              <p className="text-sm opacity-75">
                Offre Solo : {eur(offres.essai_solo_prix)} pendant {offres.essai_solo_jours % 30 === 0 ? `${offres.essai_solo_jours / 30} mois` : `${offres.essai_solo_jours} jours`}, puis{" "}
                {fondateur.data?.ouverte ? `${eur(fondateur.data.prix.serenite.mensuel)} TTC/mois au tarif fondateur, garanti tant que tu restes abonné` : `${eur(offres.solo_prix_ensuite)} TTC/mois`}. Sans engagement, résiliable en 1 clic.
              </p>
            </div>
            <a href={`/login?next=${encodeURIComponent("/onboarding?plan=serenite&essai=1")}`} data-testid="tunnel-essai-solo-lien" className="text-sm font-medium underline underline-offset-4" style={{ color: NAVY }}>
              Démarrer l'essai
            </a>
          </div>
        ) : null}
      </div>
    </Cadre>
  );
}

// ---------------- 3. Fast-Track (upsell en un clic) ----------------
function useCommande(cid: string, suivre: boolean) {
  return useQuery({
    queryKey: ["tunnel-commande", cid],
    queryFn: () => apiGet<Commande>(`/tunnel-zayado/commande/${cid}`),
    enabled: cid !== "",
    retry: false,
    refetchInterval: (q) => (suivre && q.state.data && ["pending", "authorized"].includes(q.state.data.statut) ? 2500 : false),
  });
}

function AttentePaiement({ statut }: { statut: string }) {
  if (statut === "pending" || statut === "authorized") {
    return (
      <div className="mx-auto max-w-md pt-16 text-center" data-testid="tunnel-paiement-attente">
        <Loader2 className="mx-auto size-8 animate-spin" style={{ color: GOLD }} />
        <p className="mt-4">Confirmation de ton paiement par Mollie…</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-md pt-16 text-center" data-testid="tunnel-paiement-echec">
      <p className="text-lg" style={{ color: NAVY }}>Le paiement n'a pas abouti ({statut}).</p>
      <p className="mt-2 text-sm opacity-70">Rien n'a été débité. Tu peux réessayer.</p>
      <Link to="/public/tunnel" className="mt-4 inline-block underline">Revenir au diagnostic</Link>
    </div>
  );
}

export function TunnelFastTrack() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const cid = params.get("commande") ?? "";
  const { data: offres } = useOffres();
  const commande = useCommande(cid, true);
  const accepter = useMutation({
    mutationFn: () => apiPost<CheckoutOut>(`/tunnel-zayado/fast-track/${cid}/accepter`),
    onSuccess: (r) => (r.checkout_url ? window.location.assign(r.checkout_url) : navigate(`/public/tunnel/confirmation?commande=${cid}`)),
  });
  const refuser = useMutation({
    mutationFn: () => apiPost<{ ok: boolean }>(`/tunnel-zayado/fast-track/${cid}/refuser`),
    onSuccess: () => navigate(`/public/tunnel/confirmation?commande=${cid}`),
  });
  const c = commande.data;

  if (commande.isError) return <Cadre testId="tunnel-fasttrack-page"><Erreur message="Commande introuvable." /></Cadre>;
  if (!c || !offres) return <Cadre testId="tunnel-fasttrack-page"><AttentePaiement statut="pending" /></Cadre>;
  if (c.statut !== "paid") return <Cadre testId="tunnel-fasttrack-page"><AttentePaiement statut={c.statut} /></Cadre>;
  if (c.fast_track || c.fast_track_refuse) {
    navigate(`/public/tunnel/confirmation?commande=${cid}`, { replace: true });
    return null;
  }

  return (
    <Cadre testId="tunnel-fasttrack-page">
      <div className="mx-auto max-w-3xl pt-6">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4" style={{ background: "#EAF5EE", color: "#1E5B3A" }} data-testid="tunnel-kit-confirme">
          <Check className="size-5" />
          <p className="flex-1 text-sm font-medium">Ton {c.titre} est payé ({eur(c.montant)}). Il t'attend juste après cette étape.</p>
        </div>

        <div className="mt-6 rounded-[26px] border bg-white p-7 shadow-[0_20px_60px_rgba(13,31,56,0.08)] md:p-9" style={{ borderColor: LINE }} data-testid="tunnel-upsell-fasttrack">
          <p className="site-stamp" style={{ color: NAVY }}>Proposé à cette étape</p>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
            <h1 style={{ fontFamily: DISPLAY, color: NAVY }} className="text-3xl font-semibold">{offres.fast_track.titre}</h1>
            <p style={{ fontFamily: DISPLAY, color: NAVY }} className="text-3xl font-semibold" data-testid="tunnel-fasttrack-prix">{eur(offres.fast_track.prix)}</p>
          </div>
          <p className="mt-3 max-w-xl leading-relaxed opacity-80">{offres.fast_track.description}</p>
          <ul className="mt-5 space-y-2">
            {offres.fast_track.livrables.map((l) => (
              <li key={l} className="flex gap-2 text-[15px]"><Check className="mt-1 size-4 flex-none" style={{ color: GOLD }} />{l}</li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Bouton testId="tunnel-fasttrack-accepter" onClick={() => accepter.mutate()} disabled={accepter.isPending || refuser.isPending}>
              {accepter.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Oui, ajouter le Fast-Track — {eur(offres.fast_track.prix)} en un clic
            </Bouton>
            <Bouton variante="texte" testId="tunnel-fasttrack-refuser" onClick={() => refuser.mutate()} disabled={accepter.isPending || refuser.isPending}>
              Non merci, accéder à mon Kit
            </Bouton>
          </div>
          <p className="mt-4 text-[12px] opacity-60">Débité sur la carte utilisée pour le Kit, uniquement si tu cliques sur « Oui ».</p>
          {accepter.isError ? <Erreur message={errorMessage(accepter.error)} /> : null}
        </div>
      </div>
    </Cadre>
  );
}

// ---------------- 4. Confirmation ----------------
export function TunnelConfirmation() {
  const [params] = useSearchParams();
  const cid = params.get("commande") ?? "";
  const { data: offres } = useOffres();
  const commande = useCommande(cid, true);
  const c = commande.data;
  const ft = c?.fast_track;
  const ftPaye = ft?.statut === "paid";
  const ftAttente = ft && ["pending", "authorized"].includes(ft.statut);

  return (
    <Cadre testId="tunnel-confirmation-page">
      <div className="mx-auto max-w-3xl pt-8">
        {commande.isError ? <Erreur message="Commande introuvable." /> : null}
        {c ? (
          <>
            <h1 style={{ fontFamily: DISPLAY, color: NAVY }} className="text-center text-4xl font-semibold tracking-tight">C'est confirmé.</h1>
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-4 rounded-[22px] border bg-white p-6" style={{ borderColor: LINE }} data-testid="tunnel-confirmation-kit">
                <FileSpreadsheet className="size-7 flex-none" style={{ color: GOLD }} />
                <div className="flex-1">
                  <p className="font-semibold" style={{ color: NAVY }}>{c.titre} · {eur(c.montant)}</p>
                  <p className="text-sm opacity-70">{c.statut === "paid" ? "Payé — prêt à être utilisé." : `Paiement : ${c.statut}`}</p>
                </div>
                {c.statut === "paid" ? (
                  <Link to={`/public/tunnel/kit?commande=${c.id}`} data-testid="tunnel-ouvrir-kit" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium" style={{ backgroundImage: DEGRADE_BLEU, color: PAPER }}>
                    Ouvrir mon Kit <ArrowRight className="size-4" />
                  </Link>
                ) : null}
              </div>

              {ft ? (
                <div className="rounded-[22px] p-6" style={{ background: DEGRADE_CARTE, color: PAPER_2 }} data-testid="tunnel-confirmation-fasttrack">
                  <p style={{ fontFamily: DISPLAY }} className="text-xl font-semibold">Fast-Track · {eur(ft.montant)}</p>
                  {ftPaye ? (
                    <>
                      <p className="mt-2 text-sm opacity-80">Paiement reçu. Ta visio de 60 minutes est à fixer dans les 48 h ouvrées.</p>
                      {offres?.rdv_url ? (
                        <a href={offres.rdv_url} target="_blank" rel="noreferrer" data-testid="tunnel-rdv-lien" className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium" style={{ background: GOLD_SOFT, color: NAVY }}>
                          Choisir mon créneau <ArrowRight className="size-4" />
                        </a>
                      ) : (
                        <p className="mt-3 text-sm" style={{ color: GOLD_SOFT }} data-testid="tunnel-rdv-message">On t'écrit à {c.email} pour fixer le rendez-vous.</p>
                      )}
                    </>
                  ) : ftAttente ? (
                    <p className="mt-2 flex items-center gap-2 text-sm opacity-80" data-testid="tunnel-fasttrack-attente"><Loader2 className="size-4 animate-spin" /> Confirmation du paiement par Mollie…</p>
                  ) : (
                    <p className="mt-2 text-sm opacity-80" data-testid="tunnel-fasttrack-echec">Le paiement n'a pas abouti ({ft.statut}) : rien n'a été débité.</p>
                  )}
                </div>
              ) : (
                <p className="text-center text-sm opacity-70" data-testid="tunnel-confirmation-sans-fasttrack">
                  Si tu veux en parler à un expert plus tard, réponds simplement à notre e-mail : on fixera un rendez-vous ensemble.
                </p>
              )}
            </div>
          </>
        ) : !commande.isError ? <AttentePaiement statut="pending" /> : null}
      </div>
    </Cadre>
  );
}

// ---------------- 5. Livraison du Kit ----------------
export function TunnelKit() {
  const [params] = useSearchParams();
  const cid = params.get("commande") ?? "";
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const commande = useCommande(cid, true);
  const analyse = useQuery({
    queryKey: ["tunnel-analyse", cid],
    queryFn: () => apiGet<Analyse>(`/tunnel-zayado/kit/${cid}/analyse`),
    enabled: cid !== "" && commande.data?.analyse_disponible === true,
    retry: false,
  });
  const envoyer = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("fichier", file);
      return apiUpload<Analyse>(`/tunnel-zayado/kit/${cid}/analyse`, form);
    },
    onSuccess: (a) => {
      qc.setQueryData(["tunnel-analyse", cid], a);
      void qc.invalidateQueries({ queryKey: ["tunnel-commande", cid] });
    },
  });
  const c = commande.data;
  const a = envoyer.data ?? analyse.data;

  return (
    <Cadre testId="tunnel-kit-page">
      <div className="mx-auto max-w-4xl pt-6">
        {commande.isError ? <Erreur message="Commande introuvable." /> : null}
        {c && c.statut !== "paid" ? <AttentePaiement statut={c.statut} /> : null}
        {c?.statut === "paid" ? (
          <>
            <p className="site-stamp" style={{ color: NAVY }}>Ton Kit Diagnostic Flash</p>
            <h1 style={{ fontFamily: DISPLAY, color: NAVY }} className="mt-2 text-4xl font-semibold tracking-tight">Tes chiffres, sans rien inventer.</h1>

            <div
              data-testid="tunnel-kit-depot"
              onClick={() => input.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) envoyer.mutate(file); }}
              className="mt-6 cursor-pointer rounded-[22px] border-2 border-dashed bg-white p-8 text-center transition-colors hover:border-[#C9A97E]"
              style={{ borderColor: LINE }}
            >
              {envoyer.isPending ? <Loader2 className="mx-auto size-7 animate-spin" style={{ color: GOLD }} /> : <Upload className="mx-auto size-7" style={{ color: GOLD }} />}
              <p className="mt-3 font-semibold" style={{ color: NAVY }}>{a ? "Analyser un autre fichier" : "Dépose ton FEC ici"}</p>
              <p className="mx-auto mt-1 max-w-md text-sm opacity-70">Le fichier des écritures comptables exporté de ton logiciel (.txt ou .csv), ou un tableur date + montant.</p>
              <input ref={input} type="file" accept=".txt,.csv,.xlsx,.xls" className="hidden" data-testid="tunnel-kit-fichier"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) envoyer.mutate(file); e.target.value = ""; }} />
            </div>
            {envoyer.isError ? <Erreur message={errorMessage(envoyer.error)} /> : null}

            {a ? (
              <div className="mt-8 space-y-5" data-testid="tunnel-kit-resultat">
                <p className="text-[12px] opacity-60" data-testid="tunnel-kit-source">
                  Source : « {a.fichier} » ({a.format}, {a.lignes} lignes), analysé le {dateFR(a.analyse_le)} · période du {dateFR(a.periode_debut)} au {dateFR(a.periode_fin)}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Recettes", eur(a.total_revenus), "tunnel-kit-recettes"],
                    ["Charges", eur(a.total_charges), "tunnel-kit-charges"],
                    ["Trésorerie", a.tresorerie === null ? "—" : eur(a.tresorerie), "tunnel-kit-tresorerie"],
                    ["Autonomie", a.autonomie_mois === null ? "—" : `${a.autonomie_mois.toLocaleString("fr-FR")} mois`, "tunnel-kit-autonomie"],
                  ].map(([l, v, id]) => (
                    <div key={id} className="rounded-2xl border bg-white p-4" style={{ borderColor: LINE }} data-testid={id}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-60">{l}</p>
                      <p style={{ fontFamily: DISPLAY, color: NAVY }} className="mt-1 text-2xl font-semibold">{v}</p>
                    </div>
                  ))}
                </div>
                {a.points.length > 0 ? (
                  <div className="rounded-[22px] p-6" style={{ background: PAPER_2 }} data-testid="tunnel-kit-points">
                    <p style={{ fontFamily: DISPLAY, color: NAVY }} className="text-lg font-semibold">Points d'attention</p>
                    <ul className="mt-2 space-y-1.5 text-[15px]">{a.points.map((p) => <li key={p}>• {p}</li>)}</ul>
                  </div>
                ) : null}
                <div className="overflow-x-auto rounded-[22px] border bg-white" style={{ borderColor: LINE }}>
                  <table className="w-full text-sm" data-testid="tunnel-kit-mois">
                    <thead><tr className="text-left opacity-60">{["Mois", "Recettes", "Charges", "Résultat"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
                    <tbody>
                      {a.mois.map((m) => (
                        <tr key={m.mois} className="border-t" style={{ borderColor: LINE }}>
                          <td className="px-4 py-2.5">{m.mois.slice(5, 7)}/{m.mois.slice(0, 4)}</td>
                          <td className="px-4 py-2.5">{eur(m.revenus)}</td>
                          <td className="px-4 py-2.5">{eur(m.charges)}</td>
                          <td className="px-4 py-2.5" style={{ color: m.resultat < 0 ? "#B42318" : NAVY }}>{eur(m.resultat)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <a href={`/api/tunnel-zayado/kit/${cid}/rapport.pdf`} data-testid="tunnel-kit-pdf" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium" style={{ backgroundImage: DEGRADE_BLEU, color: PAPER }}>
                  <Download className="size-4" /> Télécharger mon rapport PDF
                </a>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </Cadre>
  );
}
