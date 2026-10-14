import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Building2, ExternalLink, FileText, Loader2, Search, ShieldCheck } from "lucide-react";
import { Carte } from "@/components/vision/atomes";
import { messageErreur, z } from "@/zayado/api";
import type { FicheDetail, FicheEntreprise } from "@/zayado/types";

/* Vérifier une entreprise avant de la contacter : données officielles et gratuites
   (API Recherche d'entreprises = INSEE Sirene + RNE de l'INPI, BODACC pour les
   procédures collectives, liquidations et radiations). INPI RNE complet en option. */

const euros = (n: number | null) =>
  n === null ? "—" : `${Math.round(n).toLocaleString("fr-FR")} €`;
const dateFr = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

function Statut({ f }: { f: FicheEntreprise | FicheDetail }) {
  const d = f as Partial<FicheDetail>;
  if (f.etat === "cesse" || d.radiee)
    return <span className="rounded-full bg-red-400/15 px-2 py-0.5 text-[0.65rem] font-semibold text-red-300" data-testid={`verif-statut-${f.siren}`}>Radiée / cessée</span>;
  if (d.procedure_collective)
    return <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-300" data-testid={`verif-statut-${f.siren}`}>Procédure collective</span>;
  return <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-300" data-testid={`verif-statut-${f.siren}`}>Active</span>;
}

function Detail({ siren }: { siren: string }) {
  const q = useQuery({ queryKey: ["z", "entreprise", siren], queryFn: () => z.detailEntreprise(siren), staleTime: 300_000 });
  if (q.isPending)
    return <p className="flex items-center gap-2 py-4 text-sm text-[#a8b6d1]"><Loader2 className="size-4 animate-spin" /> Lecture des registres officiels…</p>;
  if (q.isError) return <p className="py-4 text-sm text-red-300">{messageErreur(q.error)}</p>;
  const f = q.data;
  return (
    <div className="anim-monte mt-3 grid grid-cols-1 gap-4 border-t border-white/[0.08] pt-4 lg:grid-cols-[1fr_1.2fr]" data-testid="verif-detail">
      <div className="space-y-3 text-sm">
        {(f.radiee || f.procedure_collective) && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200" data-testid="verif-alerte">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {f.radiee ? "Entreprise radiée ou cessée — inutile de la démarcher." : `Procédure en cours : ${f.procedure_collective}. Prudence avant de travailler avec elle.`}
          </p>
        )}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
          <dt className="text-[#9fb0cf]">SIREN</dt><dd className="chiffre text-[#eceff7]">{f.siren}</dd>
          <dt className="text-[#9fb0cf]">Siège</dt><dd className="text-[#eceff7]">{f.adresse || f.commune || "—"}</dd>
          <dt className="text-[#9fb0cf]">Activité (NAF)</dt><dd className="chiffre text-[#eceff7]">{f.activite || "—"}</dd>
          <dt className="text-[#9fb0cf]">Création</dt><dd className="text-[#eceff7]">{dateFr(f.date_creation)}</dd>
          {f.date_fermeture && (<><dt className="text-[#9fb0cf]">Fermeture</dt><dd className="text-red-300">{dateFr(f.date_fermeture)}</dd></>)}
          <dt className="text-[#9fb0cf]">Taille</dt><dd className="text-[#eceff7]">{[f.categorie, f.effectif].filter(Boolean).join(" · ") || "—"}</dd>
          <dt className="text-[#9fb0cf]">Établissements</dt><dd className="text-[#eceff7]">{f.etablissements_ouverts ?? "—"} ouvert(s)</dd>
        </dl>
        {f.dirigeants.length > 0 && (
          <div>
            <p className="surtitre">Dirigeants</p>
            <ul className="mt-1 space-y-0.5 text-xs text-[#eceff7]">{f.dirigeants.map((d) => <li key={d}>{d}</li>)}</ul>
          </div>
        )}
        {f.finances.length > 0 && (
          <div data-testid="verif-finances">
            <p className="surtitre">Comptes publiés</p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {f.finances.slice(0, 3).map((x) => (
                <li key={x.annee} className="flex justify-between gap-3">
                  <span className="text-[#9fb0cf]">{x.annee}</span>
                  <span className="chiffre text-[#eceff7]">CA {euros(x.ca)} · résultat {euros(x.resultat_net)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <a href={f.lien} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-xs text-[#eceff7] transition-colors hover:bg-white/5" data-testid="verif-lien-annuaire">
            Annuaire des entreprises <ExternalLink className="size-3" />
          </a>
          <a href={f.inpi.lien} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-xs text-[#eceff7] transition-colors hover:bg-white/5" data-testid="verif-lien-inpi">
            <FileText className="size-3" /> INPI{f.inpi.connecte ? ` · ${f.inpi.actes ?? 0} actes · ${f.inpi.bilans ?? 0} bilans` : ""} <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
      <div>
        <p className="surtitre">Annonces BODACC</p>
        <ul className="mt-1 max-h-64 overflow-y-auto pr-1" data-testid="verif-annonces">
          {f.annonces.map((a) => (
            <li key={a.id} className="border-b border-white/[0.07] py-2 last:border-0">
              <a href={a.lien} target="_blank" rel="noreferrer" className="group block">
                <p className={`text-xs font-medium ${a.alerte ? "text-amber-300" : "text-[#eceff7]"} group-hover:underline`}>
                  {a.alerte ? "⚠ " : ""}{a.famille}{a.nature ? ` — ${a.nature}` : ""}
                </p>
                <p className="etiquette text-[#9fb0cf]">{dateFr(a.date)} · {a.tribunal}</p>
              </a>
            </li>
          ))}
          {f.annonces.length === 0 && <li className="py-2 text-xs text-[#9fb0cf]">Aucune annonce publiée au BODACC.</li>}
        </ul>
      </div>
    </div>
  );
}

export function VerifEntreprise() {
  const [saisie, setSaisie] = useState("");
  const [q, setQ] = useState("");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const res = useQuery({ queryKey: ["z", "fiche", q], queryFn: () => z.fiche(q), enabled: q.length >= 2, staleTime: 300_000 });

  return (
    <Carte className="mt-5 p-5" testId="radar-verif-entreprise">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl border border-[#dec2a3]/30 bg-[#dec2a3]/10 text-[#dec2a3]"><ShieldCheck className="size-4" /></span>
        <div className="min-w-0">
          <p className="titre-serif text-lg text-[#eceff7]">Vérifier une entreprise</p>
          <p className="text-xs text-[#a8b6d1]">Registres officiels et gratuits : Sirene, RNE (INPI), BODACC — liquidations, redressements, radiations.</p>
        </div>
        <form
          className="ml-auto flex w-full min-w-0 items-center gap-2 sm:w-auto"
          onSubmit={(e) => { e.preventDefault(); setOuverte(null); setQ(saisie.trim()); }}
        >
          <div className="verre flex min-w-0 flex-1 items-center gap-2 px-3 py-2 sm:w-72">
            <Search className="size-4 shrink-0 text-[#9fb0cf]" />
            <input value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="Nom ou SIREN" data-testid="verif-input"
              className="min-w-0 flex-1 bg-transparent text-sm text-[#eceff7] outline-none placeholder:text-[#9fb0cf]" />
          </div>
          <button type="submit" disabled={saisie.trim().length < 2} data-testid="verif-submit"
            className="rounded-full bg-[#dec2a3] px-4 py-2 text-sm font-semibold text-[#0f1b3a] transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-50">
            Vérifier
          </button>
        </form>
      </div>

      {res.isFetching && <p className="mt-3 flex items-center gap-2 text-sm text-[#a8b6d1]"><Loader2 className="size-4 animate-spin" /> Recherche…</p>}
      {res.isError && <p className="mt-3 text-sm text-red-300">{messageErreur(res.error)}</p>}
      {res.data && (
        <ul className="mt-4 space-y-2" data-testid="verif-resultats">
          {res.data.map((f) => (
            <li key={f.siren} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
              <button type="button" onClick={() => setOuverte(ouverte === f.siren ? null : f.siren)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left" data-testid={`verif-resultat-${f.siren}`}>
                <Building2 className="size-4 shrink-0 text-[#9fb0cf]" />
                <span className="text-sm font-medium text-[#eceff7]">{f.nom}</span>
                <Statut f={f} />
                <span className="chiffre text-xs text-[#9fb0cf]">{f.siren} · {f.commune || "—"}</span>
                <span className="ml-auto text-xs text-[#dec2a3]">{ouverte === f.siren ? "Replier" : "Voir la fiche"}</span>
              </button>
              {ouverte === f.siren && <Detail siren={f.siren} />}
            </li>
          ))}
          {res.data.length === 0 && <li className="text-sm text-[#9fb0cf]">Aucune entreprise trouvée.</li>}
        </ul>
      )}
    </Carte>
  );
}
