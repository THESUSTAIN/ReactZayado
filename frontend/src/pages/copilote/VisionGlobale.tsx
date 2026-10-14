import { useState } from "react";
import { Link } from "react-router-dom";
import { CercleZayado } from "@/components/vision/Cercle";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  Hourglass,
  ListChecks,
  MessageCircle,
  Moon,
  PiggyBank,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  Wallet,
} from "lucide-react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { Anneau, Carte, CarteKpi, Jauge, PastilleIcone, Visage, euros } from "@/components/vision/atomes";
import { BarreHaute, OngletsMobile, Rail } from "@/components/vision/chrome";
import { EnTetePage, EtatVide, MotMain, TitreCarte } from "@/components/vision/EnTete";
import { CarrouselBoard } from "@/components/vision/CarrouselBoard";
import { GraphiqueFinances, RoueEquilibre } from "@/components/vision/graphiques";
import { LIBELLES_ENERGIE } from "@/types/vision";
import type { ActionFaiteOut, CheckinEnergieOut, Victoire, VisionGlobale } from "@/types/vision";

const CLE = ["vision", "globale"] as const;

export default function VisionGlobalePage() {
  const qc = useQueryClient();
  const { data, isError, isLoading } = useQuery({
    queryKey: CLE,
    queryFn: () => apiGet<VisionGlobale>("/copilote/vision/globale"),
  });

  const checkin = useMutation({
    mutationFn: (niveau: number) =>
      apiPost<CheckinEnergieOut>("/copilote/bien-etre/energie", { niveau }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLE }),
    onError: () => toast.error("Énergie non enregistrée — réessaie."),
  });

  const [victoire, setVictoire] = useState("");
  const noter = useMutation({
    mutationFn: (texte: string) => apiPost<Victoire>("/copilote/victoires", { texte }),
    onSuccess: () => {
      setVictoire("");
      toast.success("Victoire notée — bravo.");
      qc.invalidateQueries({ queryKey: CLE });
    },
    onError: () => toast.error("Trois caractères minimum."),
  });

  const terminer = useMutation({
    mutationFn: (id: string) => apiPatch<ActionFaiteOut>(`/copilote/plan-action/${id}/fait`),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLE }),
    onError: () => toast.error("Action non mise à jour — réessaie."),
  });

  const reporter = useMutation({
    mutationFn: (id: string) => apiPatch<ActionFaiteOut>(`/copilote/plan-action/${id}/reporter`),
    onSuccess: () => {
      toast("Reportée à demain — la prochaine action prend le relais.");
      qc.invalidateQueries({ queryKey: CLE });
    },
    onError: () => toast.error("Report impossible pour le moment."),
  });

  // La coquille, le rail et les titres se rendent toujours : une page ne dépend
  // jamais d'un appel réussi, seules les zones de données s'affichent vides.
  const indispo = isError || (!isLoading && !data);

  return (
    <div className="fond-nuit min-h-dvh text-[#eceff7]">
      <Rail />
      <OngletsMobile />

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-28 sm:px-6 lg:pb-12 lg:pl-[120px] lg:pr-8">
        <BarreHaute prenom={data?.prenom ?? "—"} offre={data?.offre ?? "—"} />

        <EnTetePage
          testId="accueil"
          titre={<span data-testid="titre-page">{data ? <>Bonjour <MotMain>{data.prenom}</MotMain></> : "Aujourd'hui"}</span>}
          phrase={<span data-testid="date-du-jour">{data?.date_label ? `${data.date_label.charAt(0).toUpperCase()}${data.date_label.slice(1).toLowerCase()}. ` : ""}Voici ce qui compte aujourd'hui.</span>}
        />

        <CercleZayado />

        {isLoading ? (
          <Carte className="mt-6 p-5" testId="message-chargement">
            <p className="animate-pulse text-sm text-[#a8b6d1]">Chargement de ta journée…</p>
          </Carte>
        ) : null}

        {indispo ? (
          <Carte className="mt-6 p-5" testId="message-indisponible">
            <p className="text-sm text-[#a8b6d1]">
              Les données ne sont pas accessibles pour le moment. La page reste consultable, aucun
              chiffre n'est inventé.
            </p>
          </Carte>
        ) : null}

        {data ? (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            {/* 1 — Ta journée : la priorité, puis le reste du plan */}
            <Carte haut className="anim-monte p-5 sm:p-6" testId="carte-priorites-du-jour">
              <TitreCarte icone={<ListChecks />} etiquette="Ta journée" titre={<>Ce qui compte <MotMain>aujourd'hui</MotMain></>}
                action={<Link to="/plan-action" data-testid="lien-plan-action" className="text-sm text-[#a8b6d1] hover:text-[#F4EFE6]">Tout le plan →</Link>} />

              {data.priorite ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4" data-testid="carte-priorite">
                  <p className="text-xs font-medium text-[#a8b6d1]">D'abord</p>
                  <p className="mt-1 text-lg font-semibold leading-snug sm:text-xl" data-testid="priorite-titre">{data.priorite.titre}</p>
                  <p className="mt-1 text-xs text-[#9fb0cf]" data-testid="priorite-source">{data.priorite.source} · {data.priorite.objectif}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" disabled={terminer.isPending || data.priorite.fait} onClick={() => data.priorite && terminer.mutate(data.priorite.id)}
                      data-testid="bouton-priorite-faite" className="btn-principal">
                      <CheckCircle2 className="size-4" /> {data.priorite.fait ? "Terminée" : "C'est fait"}
                    </button>
                    <button type="button" disabled={reporter.isPending || data.priorite.fait} onClick={() => data.priorite && reporter.mutate(data.priorite.id)}
                      data-testid="bouton-priorite-reporter" className="btn-secondaire">Demain</button>
                  </div>
                </div>
              ) : null}

              <ul className="mt-3">
                {data.priorites.filter((a) => a.id !== data.priorite?.id).map((a) => (
                  <li key={a.id} className="flex items-center gap-3 border-b border-white/[0.07] py-3 last:border-0" data-testid={`action-${a.id}`}>
                    <button type="button" onClick={() => terminer.mutate(a.id)} disabled={terminer.isPending}
                      aria-label={a.fait ? `Rouvrir ${a.titre}` : `Terminer ${a.titre}`} data-testid={`action-case-${a.id}`}
                      className={`grid size-6 shrink-0 place-items-center rounded-full border transition-colors duration-200 ${a.fait ? "border-transparent bg-[#F4EFE6] text-[#0D1F38]" : "border-white/30 hover:border-[#F4EFE6]"}`}>
                      {a.fait ? <CheckCircle2 className="size-4" /> : null}
                    </button>
                    <p className={`min-w-0 flex-1 truncate text-sm ${a.fait ? "text-[#9fb0cf] line-through" : ""}`}>{a.titre}</p>
                    <span className="shrink-0 text-xs text-[#9fb0cf]">{a.echeance}</span>
                  </li>
                ))}
              </ul>
              {data.priorites.length === 0 && !data.priorite ? (
                <EtatVide titre="Rien de prévu aujourd'hui" texte="Ajoute une action à ton plan, ou suis la prochaine étape proposée plus haut."
                  action={<Link to="/plan-action" className="btn-secondaire">Ouvrir mon plan</Link>} />
              ) : null}
              {data.capacite.actions_masquees > 0 ? (
                <p className="mt-2 text-xs text-[#a8b6d1]" data-testid="actions-masquees">
                  {data.capacite.actions_masquees} autre{data.capacite.actions_masquees > 1 ? "s" : ""} action{data.capacite.actions_masquees > 1 ? "s" : ""} gardée{data.capacite.actions_masquees > 1 ? "s" : ""} pour demain : ton énergie du jour compte.
                </p>
              ) : null}
            </Carte>

            {/* 2 — Pourquoi tu fais tout ça : la vision passe avant le check-in du jour */}
            <CarrouselBoard board={data.board} className={data.board.images.length ? "min-h-[260px]" : ""} />

            {/* 3 — Ton énergie : un geste, et ce que ça change */}
            <Carte haut className="p-5 sm:p-6" testId="carte-score-equilibre">
              <TitreCarte icone={<Sparkles />} etiquette="Ton énergie" titre={<>Comment tu <MotMain>te sens ?</MotMain></>}
                action={<div className="text-right" data-testid="jauge-score">
                  {data.energie.niveau ? (
                    <>
                      <p className="chiffre text-2xl font-semibold leading-none">{data.score.valeur}<span className="text-sm font-normal text-[#9fb0cf]">/100</span></p>
                      <p className="mt-1 text-[11px] text-[#9fb0cf]">équilibre</p>
                    </>
                  ) : (
                    <p className="max-w-[9rem] text-[11px] leading-snug text-[#9fb0cf]">Ton score s'affiche après ton 1er check-in</p>
                  )}
                </div>} />
              <p className="mt-1 text-sm text-[#a8b6d1]">Ton plan du jour s'adapte à ta réponse.</p>
              <div className="mt-4 grid grid-cols-5 gap-1.5" data-testid="checkin-energie">
                {LIBELLES_ENERGIE.map((libelle, i) => {
                  const niveau = i + 1;
                  const actif = data.energie.niveau === niveau;
                  return (
                    <button key={libelle} type="button" disabled={checkin.isPending} onClick={() => checkin.mutate(niveau)} aria-pressed={actif}
                      data-testid={`energie-niveau-${niveau}`}
                      className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 transition-colors duration-200 ${actif ? "border-transparent bg-[#F4EFE6] text-[#0D1F38]" : "border-white/10 bg-white/[0.04] text-[#a8b6d1] hover:border-white/30 hover:text-[#eceff7]"}`}>
                      <Visage niveau={niveau} className="size-7" />
                      <span className="text-[0.66rem] font-medium leading-tight">{libelle}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 flex items-center gap-2 text-sm text-[#a8b6d1]" data-testid="consequence-energie">
                <Sparkles className="size-4 shrink-0 text-[#F4EFE6]" />
                {data.energie.libelle
                  ? `${data.energie.libelle} : environ ${data.capacite.actions_possibles} action${data.capacite.actions_possibles > 1 ? "s" : ""} aujourd'hui.`
                  : "Dis-nous comment tu vas : on garde l'essentiel si tu es fatigué."}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.08] pt-4">
                {[
                  { label: "Pro", valeur: `${data.score.pro_pct} %`, icone: <Briefcase className="size-3.5" /> },
                  { label: "Perso", valeur: `${data.score.perso_pct} %`, icone: <User className="size-3.5" /> },
                  { label: "Rituels", valeur: `${data.score.rituels_faits} / ${data.score.rituels_total}`, icone: <Moon className="size-3.5" /> },
                ].map((t) => (
                  <div key={t.label} data-testid={`tuile-${t.label.toLowerCase()}`}>
                    <p className="flex items-center gap-1 text-[11px] text-[#9fb0cf]">{t.icone} {t.label}</p>
                    <p className="chiffre mt-0.5 text-base font-semibold">{t.valeur}</p>
                  </div>
                ))}
              </div>
            </Carte>

            {/* 3 — Tes chiffres, en une ligne (le détail est dans « Chiffres ») */}
            <Carte className="p-5 sm:p-6" testId="bande-chiffres">
              <TitreCarte icone={<Wallet />} etiquette="Tes chiffres" titre={<>Ce mois-ci, <MotMain>en clair</MotMain></>}
                action={<Link to="/pilotage" data-testid="bouton-rapport-financier" className="text-sm text-[#a8b6d1] hover:text-[#F4EFE6]">Détail →</Link>} />
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
                {[
                  { cle: "kpi-revenus", label: "Rentré", valeur: euros(data.finances.revenus_mois), icone: <TrendingUp className="size-3.5" /> },
                  { cle: "kpi-depenses", label: "Sorti", valeur: euros(data.finances.depenses_mois), icone: <TrendingDown className="size-3.5" /> },
                  { cle: "kpi-tresorerie", label: "En banque", valeur: euros(data.finances.tresorerie), icone: <PiggyBank className="size-3.5" /> },
                  { cle: "kpi-autonomie", label: "Tu tiens", valeur: `${data.finances.autonomie_mois.toLocaleString("fr-FR")} mois`, icone: <Hourglass className="size-3.5" /> },
                ].map((k) => (
                  <div key={k.cle} data-testid={k.cle}>
                    <p className="flex items-center gap-1 text-xs text-[#9fb0cf]">{k.icone} {k.label}</p>
                    <p className="chiffre mt-1 text-xl font-semibold">{k.valeur}</p>
                  </div>
                ))}
              </div>
              {data.finances.evolution.length > 0 ? (
                <div className="mt-5"><GraphiqueFinances nu evolution={data.finances.evolution} /></div>
              ) : (
                <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/[0.08] pt-4 text-sm text-[#a8b6d1]" data-testid="chiffres-vides">
                  Importe tes chiffres pour voir ton évolution.
                  <Link to="/pilotage" className="font-medium text-[#eceff7] underline decoration-white/30 underline-offset-4">Importer</Link>
                </p>
              )}
            </Carte>

            {/* 5 — Prendre soin : la roue, et ce qui a marché */}
            <RoueEquilibre roue={data.roue} />

            <Carte className="p-5 sm:p-6" testId="carte-victoires">
              <TitreCarte icone={<Trophy />} etiquette="Tes victoires" titre={<>Ce qui a <MotMain>marché</MotMain></>} />
              <ul className="mt-2">
                {data.victoires.map((v) => (
                  <li key={v.id} className="flex items-start gap-3 border-b border-white/[0.07] py-3 last:border-0" data-testid={`victoire-${v.id}`}>
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{v.texte}</p>
                      <p className="mt-0.5 text-xs text-[#a8b6d1]">{v.date_label}</p>
                    </div>
                  </li>
                ))}
                {data.victoires.length === 0 ? (
                  <li className="py-3 text-sm text-[#9fb0cf]" data-testid="victoires-vide">Une vente, un client content, une tâche enfin bouclée : ça compte. Note-la.</li>
                ) : null}
              </ul>
              <form className="mt-2 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (victoire.trim().length >= 3) noter.mutate(victoire.trim()); }}>
                <input value={victoire} onChange={(e) => setVictoire(e.target.value)} placeholder="Ma victoire du jour…" maxLength={300} data-testid="victoire-input"
                  className="min-h-11 min-w-0 flex-1 rounded-full border border-white/15 bg-white/[0.05] px-4 text-sm outline-none transition-colors placeholder:text-[#9fb0cf] focus:border-[#F4EFE6]/60" />
                <button type="submit" disabled={noter.isPending || victoire.trim().length < 3} data-testid="victoire-submit" className="btn-principal !min-h-11 !px-4">Noter</button>
              </form>
            </Carte>
          </div>
        ) : null}
      </div>
    </div>
  );
}
