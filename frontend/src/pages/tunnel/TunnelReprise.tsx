// Tunnel public « Créer ou reprendre ? » — style de la landing (papier, marine, or), tutoiement.
// Parcours prestation haut de gamme : capture + test → résultat + appel stratégique gratuit
// → upsell post-réservation (Kit Diagnostic Flash pré-appel) → l'accompagnement se propose PENDANT l'appel.
// Aucun prix d'accompagnement affiché ici (il se discute pendant l'appel) ; aucun chiffre de marché inventé.
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Download, Loader2, Phone } from "lucide-react";
import { apiGet, apiPost, errorMessage } from "@/lib/api";
import type { CaptureOut, CheckoutOut, Prospect } from "./types";
import { Bouton, Cadre, DEGRADE_BLEU, DEGRADE_CARTE, DISPLAY, Erreur, GOLD, GOLD_SOFT, LINE, NAVY, eur, useOffres, type Seo } from "./TunnelZayado";
import { AimantSortie, GuideOffert } from "./AimantSortie";

const SEO_REPRISE: Seo = {
  titre: "Créer ou reprendre une entreprise ? Fais le test · Zayado",
  description: "Racheter une entreprise qui tourne déjà : des clients dès le premier jour, un financement possible avec peu ou pas d'apport. Test gratuit en 2 minutes et appel stratégique offert.",
  image: "/og/reprise.png",
};
const SEO_CESSION: Seo = {
  titre: "Vendre son entreprise au bon prix · Zayado",
  description: "Prépare ta cession : un prix défendable, le bon repreneur, une transmission sereine. Appel stratégique offert.",
  image: "/og/cession.png",
};

type Choix = { v: string; l: string; r: number; c: number };
const QUESTIONS: { id: string; q: string; choix: Choix[] }[] = [
  { id: "salaire", q: "Combien de temps peux-tu tenir sans te verser de salaire ?", choix: [
    { v: "moins6", l: "Moins de 6 mois", r: 2, c: 0 }, { v: "6a18", l: "6 à 18 mois", r: 1, c: 1 }, { v: "plus18", l: "Plus de 18 mois", r: 0, c: 1 }] },
  { id: "idee", q: "As-tu déjà une idée précise et des premiers clients ?", choix: [
    { v: "oui", l: "Oui, les deux", r: 0, c: 2 }, { v: "idee", l: "Une idée, pas encore de clients", r: 1, c: 1 }, { v: "non", l: "Pas encore", r: 2, c: 0 }] },
  { id: "moteur", q: "Ce qui te motive le plus", choix: [
    { v: "inventer", l: "Inventer quelque chose de nouveau", r: 0, c: 2 }, { v: "developper", l: "Faire grandir une activité qui marche déjà", r: 2, c: 0 }] },
  { id: "secteur", q: "Ton secteur", choix: [
    { v: "rester", l: "Je veux rester dans mon métier", r: 1, c: 0 }, { v: "changer", l: "Je suis prêt·e à changer", r: 0, c: 0 }] },
];

const PROFILS: Record<string, { titre: string; texte: string }> = {
  reprendre: {
    titre: "Ton profil : repreneur.",
    texte: "Tu veux des revenus rapidement et une activité qui a fait ses preuves. Reprendre une entreprise rentable te correspond, et son financement peut s'appuyer sur ses propres résultats.",
  },
  creer: {
    titre: "Ton profil : créateur.",
    texte: "Tu as une idée et du temps devant toi : créer peut te convenir. Avant de te lancer, regarde aussi les entreprises à reprendre dans ton domaine : c'est souvent un raccourci vers tes premiers clients.",
  },
  cession: {
    titre: "Tu veux vendre ton entreprise.",
    texte: "Bonne nouvelle : de plus en plus de repreneurs cherchent une entreprise qui tourne déjà. On t'aide à présenter ton activité, à fixer un prix défendable et à trouver le bon repreneur.",
  },
  les_deux: {
    titre: "Les deux chemins te sont ouverts.",
    texte: "Tes réponses ne tranchent pas. Le plus sûr est de comparer, chiffres en main, une création et une reprise dans ton secteur. C'est exactement ce qu'on fait pendant l'appel.",
  },
};

const ARGUMENTS = [
  ["Des clients dès le premier jour", "Tu reprends une activité qui vend déjà : pas de traversée du désert avant le premier chiffre d'affaires."],
  ["Peu ou pas d'apport, c'est possible", "Des financeurs prêtent sur la rentabilité de l'entreprise que tu rachètes : prêt bancaire, prêt d'honneur, crédit-vendeur. On t'aide à monter le dossier."],
  ["Le bon prix, sans mauvaise surprise", "Lecture des comptes, points d'attention, négociation avec le cédant : tu sais ce que tu achètes, et à quel prix."],
];

function profil(rep: Record<string, string>): string {
  let r = 0, c = 0;
  QUESTIONS.forEach((q) => { const ch = q.choix.find((x) => x.v === rep[q.id]); if (ch) { r += ch.r; c += ch.c; } });
  return r >= c + 2 ? "reprendre" : c >= r + 2 ? "creer" : "les_deux";
}

const champ = "w-full rounded-xl border bg-white px-4 py-3 text-[15px] outline-none transition-colors focus:border-[#DEC2A3]";

// ---------------- 1. Capture + test ----------------
export function RepriseCapture() {
  const navigate = useNavigate();
  const [rep, setRep] = useState<Record<string, string>>({});
  const [f, setF] = useState({ prenom: "", email: "", consentement: false });
  const capture = useMutation({
    mutationFn: () => {
      const p = profil(rep);
      return apiPost<CaptureOut>("/tunnel-zayado/capture", { ...f, situation: "reprise", priorite: p, source: "tunnel-reprise", reponses_test: rep })
        .then((r) => ({ ...r, p }));
    },
    onSuccess: (r) => navigate(`/public/reprise/rdv?p=${r.prospect_id}&r=${r.p}`),
  });
  const complet = QUESTIONS.every((q) => rep[q.id]);

  return (
    <Cadre testId="reprise-capture" seo={SEO_REPRISE}>
      <div className="grid grid-cols-1 gap-10 pt-6 lg:grid-cols-[1.05fr_1fr] lg:items-start">
        <section>
          <p className="site-stamp" style={{ color: NAVY }}>Créer ou reprendre · test gratuit en 2 minutes</p>
          <h1 style={{ fontFamily: DISPLAY, color: NAVY }} className="mt-6 text-[40px] font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            Tu veux lancer ta boîte ? Et si tu rachetais une entreprise <span className="site-hand">qui tourne déjà</span> ?
          </h1>
          <p className="mt-5 max-w-lg text-[16px] leading-relaxed opacity-75">
            Créer, c'est partir de zéro : trouver ses premiers clients, attendre avant de se verser un salaire. Reprendre, c'est démarrer avec des clients, un chiffre d'affaires et souvent une équipe dès le premier jour.
          </p>
          <ul className="mt-8 space-y-5">
            {ARGUMENTS.map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span style={{ backgroundImage: DEGRADE_BLEU, color: GOLD_SOFT, fontFamily: DISPLAY }} className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold">{i + 1}</span>
                <div>
                  <p className="font-semibold" style={{ color: NAVY }}>{t}</p>
                  <p className="text-sm opacity-70">{d}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm opacity-80">
            Tu es de l'autre côté ?{" "}
            <a href="/public/cession" className="font-medium underline underline-offset-4" style={{ color: NAVY }} data-testid="reprise-lien-cession">Tu veux vendre ton entreprise</a>
          </p>
          <AimantSortie aimant="tresorerie" source="tunnel-reprise" accroche="Pas encore prêt·e pour le test ? Commence par lire les chiffres." testId="reprise-capture-aimant" />
        </section>

        <form
          onSubmit={(e) => { e.preventDefault(); capture.mutate(); }}
          className="rounded-[26px] border bg-white p-6 shadow-[0_20px_60px_rgba(13,31,56,0.08)] sm:p-8"
          style={{ borderColor: LINE }}
          data-testid="reprise-form"
        >
          <h2 style={{ fontFamily: DISPLAY, color: NAVY }} className="text-2xl font-semibold">Fais le test</h2>
          <div className="mt-5 space-y-5">
            {QUESTIONS.map((q) => (
              <fieldset key={q.id}>
                <legend className="text-sm font-medium">{q.q}</legend>
                <div className="mt-1.5 grid gap-2">
                  {q.choix.map((c) => (
                    <label key={c.v} className="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors"
                      style={{ borderColor: rep[q.id] === c.v ? GOLD : LINE, background: rep[q.id] === c.v ? "#F6EEE3" : "white" }}>
                      <input type="radio" name={q.id} required checked={rep[q.id] === c.v} onChange={() => setRep({ ...rep, [q.id]: c.v })}
                        data-testid={`reprise-${q.id}-${c.v}`} className="accent-[#0D1F38]" />
                      {c.l}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <label className="block text-sm font-medium">Prénom
              <input className={`${champ} mt-1.5`} style={{ borderColor: LINE }} value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} data-testid="reprise-prenom" autoComplete="given-name" />
            </label>
            <label className="block text-sm font-medium">E-mail
              <input required type="email" className={`${champ} mt-1.5`} style={{ borderColor: LINE }} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} data-testid="reprise-email" autoComplete="email" />
            </label>
            <label className="flex items-start gap-3 text-[13px] leading-relaxed opacity-80">
              <input type="checkbox" required checked={f.consentement} onChange={(e) => setF({ ...f, consentement: e.target.checked })} data-testid="reprise-consentement" className="mt-1 accent-[#0D1F38]" />
              <span>J'accepte que Zayado utilise mes réponses pour me présenter mon résultat et m'écrire à ce sujet. Je peux me désinscrire à tout moment. <a href="/legal/confidentialite" target="_blank" rel="noreferrer" className="underline">Politique de confidentialité</a></span>
            </label>
          </div>
          {capture.isError ? <Erreur message={errorMessage(capture.error)} /> : null}
          <div className="mt-6">
            <Bouton type="submit" disabled={capture.isPending || !complet} testId="reprise-voir-resultat">
              {capture.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Voir mon résultat <ArrowRight className="size-4" />
            </Bouton>
          </div>
        </form>
      </div>
    </Cadre>
  );
}

// ---------------- 2. Résultat + appel stratégique ----------------
export function RepriseRdv() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const pid = params.get("p") ?? "";
  const r = PROFILS[params.get("r") ?? ""] ? (params.get("r") as string) : "les_deux";
  const { data: offres } = useOffres();
  const prospect = useQuery({ queryKey: ["tunnel-prospect", pid], queryFn: () => apiGet<Prospect>(`/tunnel-zayado/prospect/${pid}`), enabled: pid !== "", retry: false });
  const [f, setF] = useState({ telephone: "", creneau: "", projet: "" });
  const demander = useMutation({
    mutationFn: () => apiPost<{ ok: boolean }>("/tunnel-zayado/reprise/rdv", { prospect_id: pid, ...f }),
    onSuccess: () => navigate(`/public/reprise/merci?p=${pid}`),
  });
  const prof = PROFILS[r];

  return (
    <Cadre testId="reprise-rdv">
      <div className="mx-auto max-w-3xl pt-6">
        <h1 style={{ fontFamily: DISPLAY, color: NAVY }} className="text-center text-4xl font-semibold tracking-tight">
          Merci{prospect.data?.prenom ? `, ${prospect.data.prenom}` : ""}.
        </h1>
        <div className="mt-8 rounded-[22px] border bg-white p-6" style={{ borderColor: LINE }} data-testid="reprise-resultat">
          <p className="site-stamp" style={{ color: NAVY }}>Ton résultat</p>
          <p style={{ fontFamily: DISPLAY, color: NAVY }} className="mt-2 text-2xl font-semibold">{prof.titre}</p>
          <p className="mt-2 leading-relaxed opacity-80">{prof.texte}</p>
          {r === "cession" ? null : offres?.guide_reprise_url ? (
            <a href={offres.guide_reprise_url} target="_blank" rel="noreferrer" data-testid="reprise-guide"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4" style={{ color: NAVY }}>
              <Download className="size-4" /> Télécharger le guide « Ton parcours d'acquisition de A à Z »
            </a>
          ) : (
            <p className="mt-4 text-sm opacity-70" data-testid="reprise-guide-email">Le guide « Ton parcours d'acquisition de A à Z » (14 étapes) t'arrive par e-mail.</p>
          )}
        </div>

        <div className="mt-6 rounded-[26px] p-7 md:p-9" style={{ background: DEGRADE_CARTE, color: "#F6F5F2" }} data-testid="reprise-appel">
          <p className="site-stamp" style={{ color: GOLD_SOFT }}>Gratuit · 30 minutes</p>
          <h2 style={{ fontFamily: DISPLAY }} className="mt-2 text-3xl font-semibold">Réserve ton appel stratégique</h2>
          <ul className="mt-5 grid gap-2.5 md:grid-cols-3">
            {["On regarde ton projet, ton secteur et ton budget", "On t'explique comment financer une reprise avec peu ou pas d'apport", "Tu repars avec tes 3 prochaines étapes"].map((l) => (
              <li key={l} className="flex gap-2 text-[14px]"><Check className="mt-0.5 size-4 flex-none" style={{ color: GOLD_SOFT }} />{l}</li>
            ))}
          </ul>
          {offres?.rdv_url ? (
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <a href={offres.rdv_url} target="_blank" rel="noreferrer" data-testid="reprise-rdv-lien"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-medium" style={{ background: GOLD_SOFT, color: NAVY }}>
                Choisir mon créneau <ArrowRight className="size-4" />
              </a>
              <button type="button" onClick={() => navigate(`/public/reprise/merci?p=${pid}`)} className="text-sm underline underline-offset-4" data-testid="reprise-rdv-fait">
                J'ai réservé mon créneau
              </button>
            </div>
          ) : (
            <form className="mt-7 grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); demander.mutate(); }} data-testid="reprise-rdv-form">
              <label className="text-sm">Téléphone
                <input required inputMode="tel" className={`${champ} mt-1.5 text-[#16263F]`} value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} data-testid="reprise-telephone" autoComplete="tel" />
              </label>
              <label className="text-sm">Quand te rappeler ?
                <select required className={`${champ} mt-1.5 text-[#16263F]`} value={f.creneau} onChange={(e) => setF({ ...f, creneau: e.target.value })} data-testid="reprise-creneau">
                  <option value="">Choisir</option>
                  <option>En matinée</option><option>Entre midi et deux</option><option>L'après-midi</option><option>En fin de journée</option>
                </select>
              </label>
              <label className="text-sm md:col-span-2">Ton projet en une phrase (facultatif)
                <input className={`${champ} mt-1.5 text-[#16263F]`} placeholder="Ex. reprendre une boulangerie en Bretagne" value={f.projet} onChange={(e) => setF({ ...f, projet: e.target.value })} data-testid="reprise-projet" />
              </label>
              <div className="md:col-span-2">
                <button type="submit" disabled={demander.isPending} data-testid="reprise-rdv-valider"
                  className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-medium disabled:opacity-50" style={{ background: GOLD_SOFT, color: NAVY }}>
                  <Phone className="size-4" /> Valider ma demande d'appel
                </button>
              </div>
              {demander.isError ? <div className="md:col-span-2"><Erreur message={errorMessage(demander.error)} /></div> : null}
            </form>
          )}
        </div>
      </div>
    </Cadre>
  );
}

// ---------------- 3. Upsell post-réservation ----------------
export function RepriseMerci() {
  const [params] = useSearchParams();
  const pid = params.get("p") ?? "";
  const { data: offres } = useOffres();
  const [refus, setRefus] = useState(false);
  const commander = useMutation({
    mutationFn: () => apiPost<CheckoutOut>("/tunnel-zayado/kit/commande", { prospect_id: pid }),
    onSuccess: (r) => { if (r.checkout_url) window.location.assign(r.checkout_url); },
  });

  return (
    <Cadre testId="reprise-merci">
      <div className="mx-auto max-w-3xl pt-6">
        <p className="text-center"><span className="site-stamp" style={{ color: NAVY }}>Ton appel est demandé</span></p>
        <h1 style={{ fontFamily: DISPLAY, color: NAVY }} className="mt-3 text-center text-4xl font-semibold tracking-tight">Attends ! Lis ceci avant de partir…</h1>
        {refus ? (
          <div className="mt-8 rounded-[22px] border bg-white p-6 text-center" style={{ borderColor: LINE }} data-testid="reprise-fin">
            <p style={{ fontFamily: DISPLAY, color: NAVY }} className="text-xl font-semibold">C'est noté, à très vite.</p>
            <p className="mt-2 opacity-75">On te contacte au créneau choisi. Prépare juste le nom de l'entreprise qui t'intéresse, si tu en as déjà une en tête.</p>
            <GuideOffert aimant="tresorerie" accroche="Pour préparer l'appel, offert" testId="reprise-fin-guide" />
          </div>
        ) : offres ? (
          <div className="mt-8 rounded-[26px] border bg-white p-7 shadow-[0_20px_60px_rgba(13,31,56,0.08)] md:p-9" style={{ borderColor: LINE }} data-testid="reprise-upsell-kit">
            <p className="leading-relaxed opacity-80">
              Tu as une entreprise en vue ? Pour que notre appel aille droit à l'essentiel, ajoute le <b style={{ color: NAVY }}>Kit Diagnostic Flash pré-appel</b> :
              envoie les comptes de l'entreprise que tu vises (son FEC), et tu arrives à l'appel avec l'état des lieux déjà prêt, au lieu d'y passer les vingt premières minutes.
            </p>
            <ul className="mt-5 grid gap-2.5 md:grid-cols-2">
              {offres.kit.livrables.map((l) => (
                <li key={l} className="flex gap-2 text-[14px]"><Check className="mt-0.5 size-4 flex-none" style={{ color: GOLD }} />{l}</li>
              ))}
            </ul>
            {commander.isError ? <Erreur message={errorMessage(commander.error)} /> : null}
            <div className="mt-7 flex flex-col items-start gap-3">
              <Bouton onClick={() => commander.mutate()} disabled={commander.isPending || !pid} testId="reprise-kit-oui">
                {commander.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Oui, j'ajoute le Kit à mon dossier — {eur(offres.kit.prix)}
              </Bouton>
              <Bouton variante="texte" onClick={() => setRefus(true)} testId="reprise-kit-non">Non merci, je garde mon appel de base</Bouton>
            </div>
          </div>
        ) : (
          <Loader2 className="mx-auto mt-10 size-8 animate-spin" style={{ color: GOLD }} />
        )}
        <PartenairesSansApport />
      </div>
    </Cadre>
  );
}

/** Miroir de PartenairePublic (backend/routers/partenaires_financement.py). */
export type PartenaireFinancement = { id: string; nom: string; categorie: string; categorie_libelle: string; description: string; site: string; region: string };

/** Reprendre sans apport : les partenaires actifs (annuaire géré dans l'admin). */
function PartenairesSansApport() {
  const { data } = useQuery({ queryKey: ["public", "partenaires-financement"], queryFn: () => apiGet<PartenaireFinancement[]>("/public/partenaires-financement") });
  if (!data?.length) return null;
  const groupes = data.reduce<Record<string, PartenaireFinancement[]>>((acc, p) => ({ ...acc, [p.categorie_libelle]: [...(acc[p.categorie_libelle] ?? []), p] }), {});
  return (
    <section className="mt-10" data-testid="reprise-partenaires">
      <h2 style={{ fontFamily: DISPLAY, color: NAVY }} className="text-2xl font-semibold">Pas d'apport ? C'est possible.</h2>
      <p className="mt-2 opacity-75">Zayado monte ton financement avec ces partenaires : prêts d'honneur, garanties, crédit vendeur… pour reprendre une entreprise qui tourne déjà, en limitant le risque.</p>
      <div className="mt-5 space-y-5">
        {Object.entries(groupes).map(([g, ps]) => (
          <div key={g}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: GOLD }}>{g}</p>
            <ul className="mt-2 grid gap-2 md:grid-cols-2">
              {ps.map((p) => (
                <li key={p.id} className="rounded-2xl border bg-white p-4" style={{ borderColor: LINE }} data-testid={`reprise-partenaire-${p.id}`}>
                  <p className="font-semibold" style={{ color: NAVY }}>{p.site ? <a href={p.site} target="_blank" rel="noreferrer" className="hover:underline">{p.nom} ↗</a> : p.nom}</p>
                  <p className="mt-1 text-[13px] opacity-75">{p.description}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
