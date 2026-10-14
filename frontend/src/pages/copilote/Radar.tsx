import { useProfil } from "@/zayado/api";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  ExternalLink,
  Hourglass,
  Lock,
  MoreHorizontal,
  Plus,
  ShieldOff,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiError, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";
import { VerifEntreprise } from "@/components/vision/VerifEntreprise";
import { Carte, PastilleIcone } from "@/components/vision/atomes";
import { BarreHaute, OngletsClients, OngletsMobile, Rail } from "@/components/vision/chrome";
import { BoutonReglages, EnTetePage, EtatVide, MotMain, SectionReglage, ouvrirReglages } from "@/components/vision/EnTete";
import { CATEGORIES_ENTREPRISES, SECTIONS_PARTICULIERS } from "@/types/radar";
import type { EcarterOut, ModeRadar, PrendreOut, Prospect, RadarVue, Signal } from "@/types/radar";

const cle = (mode: ModeRadar) => ["radar", "vue", mode] as const;

export default function RadarPage() {
  const profil = useProfil();
  const qc = useQueryClient();
  const [mode, setMode] = useState<ModeRadar>("entreprises");
  const [categories, setCategories] = useState<string[]>([]);
  const [fraisSeulement, setFraisSeulement] = useState(false);

  const { data, isError } = useQuery({
    queryKey: cle(mode),
    queryFn: () => apiGet<RadarVue>(`/copilote/radar/vue?mode=${mode}`),
  });

  // Clientèle « entreprises » ou « particuliers » : le Radar se règle tout seul.
  const clientele = data?.reglages.clientele;
  useEffect(() => {
    if (clientele && clientele !== "les_deux" && mode !== clientele) setMode(clientele);
  }, [clientele, mode]);

  const rafraichir = () => qc.invalidateQueries({ queryKey: ["radar"] });
  const navigate = useNavigate();

  const prendre = useMutation({
    mutationFn: (id: string) => apiPost<PrendreOut>(`/copilote/radar/signaux/${id}/prendre`),
    onSuccess: (r) => {
      toast.success(r.prospect_id ? "Prospect créé et actions datées dans le Plan d'action" : "Ajouté au Plan d'action", { description: r.action_titre });
      rafraichir();
      qc.invalidateQueries({ queryKey: ["vision"] });
    },
    onError: () => toast.error("Ce signal n'a pas pu être pris"),
  });

  // Un sujet qui monte → un tunnel pré-rédigé sur ce sujet, en un clic (plan/radar.md).
  const versTunnel = useMutation({
    mutationFn: (id: string) => apiPost<{ id: string }>(`/copilote/radar/signaux/${id}/tunnel`),
    onSuccess: (t) => {
      toast.success("Tunnel rédigé — il ne reste qu'à le relire et le publier");
      rafraichir();
      qc.invalidateQueries({ queryKey: ["plan"] });
      navigate(`/tunnels/${t.id}`);
    },
    onError: (e) => toast.error(e instanceof ApiError && typeof (e.body as { detail?: unknown })?.detail === "string" ? String((e.body as { detail: string }).detail) : "Tunnel non créé"),
  });

  const ecarter = useMutation({
    mutationFn: (id: string) => apiPost<EcarterOut>(`/copilote/radar/signaux/${id}/ecarter`),
    onSuccess: () => {
      toast("Signal écarté", { description: "C'est définitif : il ne remontera plus." });
      rafraichir();
    },
    onError: () => toast.error("Signal non écarté — réessaie."),
  });
  const ecarterConfirme = (id: string) => {
    if (window.confirm("Écarter ce signal ? C'est définitif : il ne remontera plus.")) ecarter.mutate(id);
  };
  const oppositionConfirmee = (cible: string) => {
    if (window.confirm(`Inscrire « ${cible} » au registre d'opposition ? Plus aucun signal ne remontera pour cette cible, définitivement.`)) opposition.mutate(cible);
  };

  const changerClientele = useMutation({
    mutationFn: (c: string) => apiPut<unknown>("/copilote/radar/reglages", { clientele: c }),
    onSuccess: (_r, c) => { if (c !== "les_deux") setMode(c as ModeRadar); toast.success("Clientèle mise à jour"); rafraichir(); },
    onError: () => toast.error("Réglage non enregistré"),
  });

  const [saisieOuverte, setSaisieOuverte] = useState(false);
  const [nouveauProspect, setNouveauProspect] = useState("");
  const saisirProspect = useMutation({
    mutationFn: (nom: string) => apiPost<unknown>("/copilote/radar/prospects", { nom, action: true }),
    onSuccess: () => { setNouveauProspect(""); setSaisieOuverte(false); toast.success("Prospect ajouté au pipeline, et une action de premier contact au Plan d'action"); rafraichir(); qc.invalidateQueries({ queryKey: ["plan"] }); },
    onError: () => toast.error("Prospect non enregistré (2 caractères minimum)."),
  });

  const opposition = useMutation({
    mutationFn: (valeur: string) => apiPost<EcarterOut>("/copilote/radar/opposition", { valeur }),
    onSuccess: (r) => {
      toast.success("Inscrit au registre d'opposition", {
        description: `${r.opposition} entrée${r.opposition > 1 ? "s" : ""} — la remontée est bloquée pour toujours.`,
      });
      rafraichir();
    },
    onError: () => toast.error("Inscription impossible pour le moment."),
  });

  const etape = useMutation({
    mutationFn: (v: { id: string; etape: Prospect["etape"] }) =>
      apiPatch<Prospect>(`/copilote/radar/prospects/${v.id}`, { etape: v.etape }),
    onSuccess: () => rafraichir(),
  });

  const signaux = (data?.signaux ?? []).filter((s) => {
    if (categories.length > 0 && !categories.includes(s.categorie)) return false;
    if (fraisSeulement && !/aujourd'hui|hier|jours/.test(s.fraicheur)) return false;
    return true;
  });

  const bascule = (c: string) =>
    setCategories((liste) => (liste.includes(c) ? liste.filter((x) => x !== c) : [...liste, c]));

  const pourcent = data && data.objectif.clients_vises > 0 ? Math.min(100, Math.round((data.objectif.signes / data.objectif.clients_vises) * 100)) : 0;
  const enCours = prendre.isPending || ecarter.isPending || versTunnel.isPending;

  return (
    <div className="fond-nuit min-h-dvh text-[#eceff7]">
      <Rail />
      <OngletsMobile />

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-28 sm:px-6 lg:pb-12 lg:pl-[120px] lg:pr-8">
        <BarreHaute prenom={profil.data?.prenom ?? ""} offre={profil.data?.offre ?? ""} />

        <EnTetePage
          testId="radar"
          onglets={<OngletsClients />}
          titre={<>Tes futurs <MotMain>clients</MotMain></>}
          phrase={data ? (
            <>Les entreprises qui bougent {data.reglages.zone ? <>dans le <strong className="font-semibold">{data.reglages.zone}</strong></> : "près de chez toi"}. Prends celles qui comptent, Zayado prépare la relance.</>
          ) : "Les entreprises qui bougent près de chez toi. Prends celles qui comptent, Zayado prépare la relance."}
          aide={
            <>
              <p>Chaque jour, Zayado lit les registres officiels (BODACC, créations, changements, reprises) dans ton département et avec tes mots-clés.</p>
              <p>Tu choisis : <strong>Prendre</strong> crée le prospect et une action datée dans ton Plan. Rien n'est envoyé à ta place, aucun score n'est inventé, et la source est sur chaque carte.</p>
            </>
          }
          actions={
            <BoutonReglages titre="Réglages" testId="radar-reglages">
              <SectionReglage titre="Où et quoi chercher" aide="Ton département et les mots de ton métier.">
                {data ? <CollecteRadar zone={data.reglages.zone} mots={data.reglages.mots_cles} onFait={rafraichir} /> : null}
              </SectionReglage>
              <SectionReglage titre="Tes clients sont">
                <div className="flex flex-wrap gap-2" data-testid="radar-choix-clientele">
                  {([["entreprises", "Des entreprises"], ["particuliers", "Des particuliers"], ["les_deux", "Les deux"]] as const).map(([v, l]) => (
                    <button key={v} type="button" disabled={changerClientele.isPending} onClick={() => changerClientele.mutate(v)}
                      aria-pressed={data?.reglages.clientele === v} className="puce-filtre" data-testid={`radar-clientele-${v}`}>{l}</button>
                  ))}
                </div>
              </SectionReglage>
              <SectionReglage titre="D'où viennent les signaux">
                <ul data-testid="radar-sources">
                  {(data?.sources ?? []).map((s) => (
                    <li key={s.cle} className="flex items-start gap-2 border-b border-white/[0.07] py-2 last:border-0" data-testid={`radar-source-${s.cle}`}>
                      <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${s.actif ? "bg-emerald-400" : "bg-[#9fb0cf]/50"}`} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 text-sm font-medium">{s.nom}{s.payante && !s.actif ? <Lock className="size-3 opacity-60" /> : null}</p>
                        <p className="text-xs leading-snug opacity-70">{s.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionReglage>
              <SectionReglage titre="Ne plus solliciter" aide="Les personnes qui ont demandé à ne plus être contactées ne remontent plus jamais.">
                <p className="text-sm" data-testid="radar-opposition-compte"><span className="chiffre text-xl font-semibold">{data?.opposition ?? 0}</span> inscrite{(data?.opposition ?? 0) > 1 ? "s" : ""} au registre</p>
              </SectionReglage>
            </BoutonReglages>
          }
        />

        {isError ? (
          <Carte className="mt-6 p-5" testId="radar-indisponible">
            <p className="text-sm text-[#a8b6d1]">La recherche de prospects ne répond pas pour l'instant. Rien n'est inventé en attendant : réessaie dans un moment.</p>
          </Carte>
        ) : null}

        {/* La question du mois, en une ligne */}
        {data ? (
          <Carte haut className="anim-monte mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 p-4 sm:p-5" testId="radar-objectif">
            <div className="min-w-0">
              <p className="etiquette-carte">Ce mois-ci</p>
              <p className="titre-carte mt-1.5" data-testid="radar-objectif-phrase">
                {data.objectif.a_trouver > 0
                  ? <>Encore <span className="chiffre">{data.objectif.a_trouver}</span> client{data.objectif.a_trouver > 1 ? "s" : ""} à trouver</>
                  : data.objectif.clients_vises > 0
                    ? "Objectif du mois atteint"
                    : "Ton objectif du mois arrive avec tes chiffres"}
              </p>
            </div>
            {data.objectif.clients_vises > 0 ? (
            <div className="ml-auto flex items-center gap-3">
              <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10 sm:w-40">
                <div className="h-full rounded-full bg-[#F4EFE6] transition-[width] duration-700" style={{ width: `${pourcent}%` }} />
              </div>
              <span className="chiffre text-sm text-[#a8b6d1]">{data.objectif.signes} / {data.objectif.clients_vises} signés</span>
            </div>
            ) : (
              <Link to="/pilotage" className="ml-auto text-sm font-medium text-[#F4EFE6] underline-offset-4 hover:underline" data-testid="radar-objectif-importer">
                Importer mes chiffres →
              </Link>
            )}
          </Carte>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Le fil : la seule chose à faire ici, trier les signaux */}
          <section className="flex min-w-0 flex-col gap-3" data-testid="radar-fil">
            {(data?.signaux.length ?? 0) > 0 || (data && data.reglages.clientele === "les_deux") ? (
            <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" data-testid="radar-filtres">
              {data && data.reglages.clientele === "les_deux"
                ? (["entreprises", "particuliers"] as ModeRadar[]).map((m) => (
                    <button key={m} type="button" onClick={() => { setMode(m); setCategories([]); }} aria-pressed={mode === m}
                      className="puce-filtre capitalize" data-testid={`radar-onglet-${m}`}>{m}</button>
                  ))
                : null}
              {data && data.reglages.clientele === "les_deux" ? <span className="mx-1 h-5 w-px shrink-0 bg-white/15" /> : null}
              {mode === "entreprises" && (data?.signaux.length ?? 0) > 0 ? (
                <>
                  {Object.entries(CATEGORIES_ENTREPRISES).map(([c, libelle]) => (
                    <button key={c} type="button" onClick={() => bascule(c)} aria-pressed={categories.includes(c)} className="puce-filtre" data-testid={`radar-filtre-${c}`}>{libelle}</button>
                  ))}
                  {(data?.signaux.length ?? 0) > 0 ? <button type="button" onClick={() => setFraisSeulement((v) => !v)} aria-pressed={fraisSeulement} className="puce-filtre" data-testid="radar-filtre-frais">Moins d'un mois</button> : null}
                </>
              ) : null}
            </div>
            ) : null}

            {mode === "particuliers"
              ? SECTIONS_PARTICULIERS.map((section) => {
                  const liste = signaux.filter((s) => s.categorie === section.cle);
                  if (liste.length === 0) return null;
                  return (
                    <section key={section.cle} className="flex flex-col gap-3">
                      <div className="mt-2">
                        <p className="text-sm font-semibold">{section.titre}</p>
                        <p className="mt-0.5 text-xs text-[#9fb0cf]">{section.note}</p>
                      </div>
                      {liste.map((s) => (
                        <CarteSignal key={s.id} signal={s} enCours={enCours} onPrendre={() => prendre.mutate(s.id)}
                          onTunnel={s.categorie === "demande" ? () => versTunnel.mutate(s.id) : undefined}
                          onEcarter={() => ecarterConfirme(s.id)} onOpposition={() => oppositionConfirmee(s.cible)} />
                      ))}
                    </section>
                  );
                })
              : signaux.map((s) => (
                  <CarteSignal key={s.id} signal={s} enCours={enCours} onPrendre={() => prendre.mutate(s.id)}
                    onEcarter={() => ecarterConfirme(s.id)} onOpposition={() => oppositionConfirmee(s.cible)} />
                ))}

            {data && signaux.length === 0 ? (
              <EtatVide
                testId="radar-vide"
                icone={<Target className="size-6" />}
                titre={data.reglages.zone ? "Tes prochains clients bougent déjà. Allons les chercher." : "Tes futurs clients sont à 20 km. Dis à Zayado où regarder."}
                texte={data.reglages.zone
                  ? "La recherche passe chaque nuit. Lance-la maintenant, ou ajoute la personne à qui tu penses depuis une semaine : c'est souvent le contact le plus chaud."
                  : "Ton département et 2 ou 3 mots de ton métier suffisent : les premiers signaux (créations, déménagements, recrutements) arrivent dans la minute."}
                action={
                  saisieOuverte ? (
                    <form className="flex w-full max-w-md gap-2" data-testid="radar-form-prospect"
                      onSubmit={(e) => { e.preventDefault(); if (nouveauProspect.trim().length >= 2) saisirProspect.mutate(nouveauProspect.trim()); }}>
                      <input autoFocus value={nouveauProspect} onChange={(e) => setNouveauProspect(e.target.value)} placeholder="Nom de l'entreprise ou de la personne"
                        className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm outline-none placeholder:text-[#7f90b0] focus:border-[#F4EFE6]/60" />
                      <button type="submit" disabled={saisirProspect.isPending || nouveauProspect.trim().length < 2} className="btn-principal">Ajouter</button>
                    </form>
                  ) : (
                    <>
                      {data.reglages.zone ? <BoutonCollecter onFait={rafraichir} /> : (
                        <button type="button" onClick={ouvrirReglages} className="btn-principal" data-testid="radar-choisir-zone">Choisir mon département</button>
                      )}
                      <button type="button" onClick={() => setSaisieOuverte(true)} data-testid="radar-saisie-manuelle" className="btn-secondaire">
                        <Plus className="size-4" /> Ajouter un prospect
                      </button>
                    </>
                  )
                }
              />
            ) : null}
          </section>

          {/* À droite : où en sont tes prospects */}
          <aside className="flex flex-col gap-4">
            <Carte className="p-4 sm:p-5" testId="radar-prospects">
              <div className="flex items-center justify-between">
                <p className="etiquette-carte">Tes prospects</p>
                <button type="button" onClick={() => setSaisieOuverte(true)} className="text-xs font-medium text-[#a8b6d1] hover:text-[#F4EFE6]" data-testid="radar-ajout-prospect">+ Ajouter</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5" data-testid="radar-pipeline">
                {(data?.pipeline ?? []).map((e) => (
                  <span key={e.cle} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-[#a8b6d1]" data-testid={`radar-etape-${e.cle}`}>
                    {e.libelle} <span className="chiffre font-semibold text-[#eceff7]">{e.nombre}</span>
                  </span>
                ))}
              </div>
              <ul className="mt-3">
                {(data?.prospects ?? []).map((p) => (
                  <li key={p.id} className="flex items-center gap-2 border-t border-white/[0.07] py-2.5" data-testid={`radar-prospect-${p.id}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{p.nom}</p>
                      <p className="truncate text-xs text-[#9fb0cf]">{p.source}</p>
                    </div>
                    <select value={p.etape} onChange={(ev) => etape.mutate({ id: p.id, etape: ev.target.value as Prospect["etape"] })}
                      data-testid={`radar-prospect-etape-${p.id}`} aria-label={`Étape de ${p.nom}`}
                      className="w-[118px] shrink-0 rounded-lg border border-white/10 bg-[#16244a] px-2 py-1.5 text-xs outline-none focus:border-[#F4EFE6]">
                      {(data?.pipeline ?? []).map((e) => <option key={e.cle} value={e.cle}>{e.libelle}</option>)}
                    </select>
                  </li>
                ))}
                {data && data.prospects.length === 0 ? (
                  <li className="border-t border-white/[0.07] py-3 text-sm text-[#9fb0cf]">Ceux que tu prends dans le fil arrivent ici, avec leur étape.</li>
                ) : null}
              </ul>
            </Carte>
          </aside>
        </div>

        {/* Outil à part : vérifier une entreprise avant de l'appeler */}
        <VerifEntreprise />
      </div>
    </div>
  );
}

/** Lancer la recherche maintenant (sinon elle passe chaque nuit). */
function BoutonCollecter({ onFait }: { onFait: () => void }) {
  const collecter = useMutation({
    mutationFn: () => apiPost<{ nouveaux: number; erreurs: string[] }>("/copilote/radar/collecter?mode=entreprises"),
    onSuccess: (r) => { toast.success(r.nouveaux ? `${r.nouveaux} nouveau${r.nouveaux > 1 ? "x" : ""} signal${r.nouveaux > 1 ? "aux" : ""}` : "Aucun nouveau signal aujourd'hui"); onFait(); },
    onError: (e) => toast.error(e instanceof ApiError && typeof (e.body as { detail?: unknown })?.detail === "string" ? String((e.body as { detail: string }).detail) : "Recherche impossible pour l'instant"),
  });
  return (
    <button type="button" onClick={() => collecter.mutate()} disabled={collecter.isPending} className="btn-principal" data-testid="radar-collecter-vide">
      {collecter.isPending ? "Recherche…" : "Chercher maintenant"}
    </button>
  );
}

function CarteSignal({
  signal,
  enCours,
  onPrendre,
  onTunnel,
  onEcarter,
  onOpposition,
}: {
  signal: Signal;
  enCours: boolean;
  onPrendre: () => void;
  onTunnel?: () => void;
  onEcarter: () => void;
  onOpposition: () => void;
}) {
  const pris = signal.statut === "pris";
  return (
    <Carte
      haut={!signal.secondaire}
      className={`anim-monte p-4 sm:p-5 ${signal.secondaire ? "opacity-85" : ""}`}
      testId={`radar-signal-${signal.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="etiquette rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[#c9d3e6]">
          {signal.source}
        </span>
        {signal.secteur ? <span className="etiquette text-[#9fb0cf]">{signal.secteur}</span> : null}
        {signal.secondaire ? (
          <span className="etiquette flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 text-[#9fb0cf]">
            <Hourglass className="size-3" /> info plus ancienne
          </span>
        ) : null}
        <span className="etiquette ml-auto text-[#9fb0cf]">{signal.fraicheur}</span>
      </div>

      <h3 className="titre-serif mt-2 text-lg text-[#eceff7]">{signal.cible}</h3>
      <p className="mt-1 text-sm text-[#dde4f2]" data-testid={`radar-fait-${signal.id}`}>
        {signal.fait}
        {signal.lien ? (
          <a
            href={signal.lien}
            target="_blank"
            rel="noreferrer"
            data-testid={`radar-source-lien-${signal.id}`}
            className="etiquette ml-2 inline-flex items-center gap-1 text-[#9fb0cf] underline decoration-dotted transition-colors hover:text-[#dec2a3]"
          >
            {new Date(signal.date_fait).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
            <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="etiquette ml-2 text-[#9fb0cf]">
            {new Date(signal.date_fait).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
          </span>
        )}
      </p>

      {signal.metrique ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <PastilleIcone>
            <TrendingUp className="size-4" />
          </PastilleIcone>
          <span className="chiffre text-xl text-[#eceff7]">
            {signal.metrique.valeur.toLocaleString("fr-FR")}
          </span>
          <span className="text-xs text-[#a8b6d1]">{signal.metrique.unite}</span>
          {signal.metrique.tendance_pct !== null ? (
            <span className="etiquette rounded-md bg-[#dec2a3]/15 px-1.5 py-0.5 text-[#dec2a3]">
              +{signal.metrique.tendance_pct} % · {signal.metrique.periode}
            </span>
          ) : null}
        </div>
      ) : null}

      <p className="mt-2 text-xs leading-relaxed text-[#a8b6d1]">
        <span className="font-medium text-[#eceff7]">Pourquoi pour toi : </span>
        {signal.pourquoi}
      </p>

      {/* Un seul bouton. Le reste — écarter, ne plus solliciter — est rangé
          dans un menu discret : la carte doit se lire, pas se négocier. */}
      <div className="mt-3 flex items-center gap-2">
        {pris ? (
          <span
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-[#a8b6d1]"
            data-testid={`radar-pris-${signal.id}`}
          >
            <CheckCircle2 className="size-4 text-emerald-300" /> Ajouté — relance dans ton Plan
          </span>
        ) : (
          onTunnel ? (
            <>
              <button
                type="button"
                disabled={enCours}
                onClick={onTunnel}
                data-testid={`radar-tunnel-${signal.id}`}
                className="btn-principal !min-h-10 !px-4 !text-sm"
              >
                Créer une page de vente sur ce sujet
              </button>
              <button type="button" disabled={enCours} onClick={onPrendre} data-testid={`radar-prendre-${signal.id}`}
                className="text-sm text-[#a8b6d1] underline decoration-dotted underline-offset-4 hover:text-[#F4EFE6] disabled:opacity-50">
                ou l'ajouter au Plan
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={enCours}
              onClick={onPrendre}
              data-testid={`radar-prendre-${signal.id}`}
              className="btn-principal !min-h-10 !px-4 !text-sm"
            >
              Ajouter à mes prospects
            </button>
          )
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Autres choix"
            data-testid={`radar-menu-${signal.id}`}
            className="ml-auto grid size-8 place-items-center rounded-full text-[#9fb0cf] transition-colors hover:bg-white/10 hover:text-[#eceff7]"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 border-white/10 bg-[#16244a] text-[#eceff7]">
            <DropdownMenuItem
              onClick={onEcarter}
              disabled={enCours}
              data-testid={`radar-ecarter-${signal.id}`}
              className="gap-2 focus:bg-white/10 focus:text-[#eceff7]"
            >
              <X className="size-3.5" /> Ne plus me le montrer
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onOpposition}
              data-testid={`radar-opposition-${signal.id}`}
              className="gap-2 focus:bg-white/10 focus:text-[#eceff7]"
            >
              <ShieldOff className="size-3.5" /> Cette personne ne veut pas être contactée
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Carte>
  );
}

/* Réglages + collecte réelle (BODACC : créations, changements, redressements, liquidations, radiations). */
function CollecteRadar({ zone, mots, onFait }: { zone: string; mots: string[]; onFait: () => void }) {
  const [z, setZ] = useState(zone);
  const [m, setM] = useState(mots.join(", "));
  const enregistrer = useMutation({
    mutationFn: () => apiPut<unknown>("/copilote/radar/reglages", { zone: z.trim(), mots_cles: m.split(",").map((x) => x.trim()).filter(Boolean) }),
    onSuccess: () => { toast.success("Réglages enregistrés"); onFait(); },
    onError: () => toast.error("Réglages non enregistrés"),
  });
  const collecter = useMutation({
    mutationFn: () => apiPost<{ nouveaux: number; erreurs: string[] }>("/copilote/radar/collecter?mode=entreprises"),
    onSuccess: (r) => { toast.success(`${r.nouveaux} nouveau(x) signal(aux) BODACC`); onFait(); },
    onError: (e) => toast.error(e instanceof ApiError && typeof (e.body as { detail?: unknown })?.detail === "string" ? String((e.body as { detail: string }).detail) : "Collecte impossible"),
  });
  const champ = "min-w-0 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm outline-none placeholder:text-[#7f90b0] focus:border-[#dec2a3]/60";
  return (
    <div className="flex flex-col gap-3" data-testid="radar-collecte">
      <label className="flex flex-col gap-1 text-xs opacity-80">Département
        <input value={z} onChange={(e) => setZ(e.target.value)} placeholder="Ex. 69" className={`${champ} w-32`} data-testid="radar-zone-input" />
      </label>
      <label className="flex flex-col gap-1 text-xs opacity-80">Mots de ton métier (séparés par des virgules)
        <input value={m} onChange={(e) => setM(e.target.value)} placeholder="Ex. conseil, rénovation" className={champ} data-testid="radar-mots-input" />
      </label>
      <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => enregistrer.mutate()} disabled={enregistrer.isPending} className="btn-secondaire" data-testid="radar-reglages-save">Enregistrer</button>
      <button type="button" onClick={() => collecter.mutate()} disabled={collecter.isPending || !z.trim()} className="btn-principal" data-testid="radar-collecter">
        {collecter.isPending ? "Recherche…" : "Chercher maintenant"}
      </button>
      </div>
    </div>
  );
}
