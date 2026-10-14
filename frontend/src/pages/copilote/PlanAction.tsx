import { useProfil } from "@/zayado/api";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Repeat,
  Target,
  Trash2,
} from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { Carte, PastilleIcone } from "@/components/vision/atomes";
import { BarreHaute, OngletsMobile, Rail } from "@/components/vision/chrome";
import { EnTetePage, MotMain } from "@/components/vision/EnTete";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ActionFaiteOut } from "@/types/vision";
import type { ActionPlan, PlanVue, ProcessusPlan, SupprimeOut } from "@/types/plan";

const CLE = ["plan", "vue"] as const;

export default function PlanActionPage() {
  const profil = useProfil();
  const qc = useQueryClient();
  const [saisie, setSaisie] = useState("");
  const [voirMasquees, setVoirMasquees] = useState(false);

  const { data, isError } = useQuery({
    queryKey: CLE,
    queryFn: () => apiGet<PlanVue>("/copilote/plan-action/vue"),
  });

  const rafraichir = () => {
    qc.invalidateQueries({ queryKey: ["plan"] });
    qc.invalidateQueries({ queryKey: ["vision"] });
  };

  const terminer = useMutation({
    mutationFn: (id: string) => apiPatch<ActionFaiteOut>(`/copilote/plan-action/${id}/fait`),
    onSuccess: rafraichir,
  });

  const ajouter = useMutation({
    mutationFn: (titre: string) => apiPost<ActionPlan>("/copilote/plan-action/actions", { titre }),
    onSuccess: () => {
      setSaisie("");
      toast.success("Ajouté au plan");
      rafraichir();
    },
    onError: () => toast.error("Ajout impossible"),
  });

  const supprimer = useMutation({
    mutationFn: (id: string) => apiDelete<SupprimeOut>(`/copilote/plan-action/actions/${id}`),
    onSuccess: () => {
      toast("Action retirée du plan");
      rafraichir();
    },
    onError: () => toast.error("Retrait impossible pour le moment."),
  });
  const retirer = (id: string) => {
    if (window.confirm("Retirer cette action du plan ? Elle ne pourra pas être récupérée.")) supprimer.mutate(id);
  };


  const basculerProcessus = useMutation({
    mutationFn: (id: string) => apiPost<ProcessusPlan>(`/copilote/plan-action/processus/${id}/basculer`),
    onSuccess: rafraichir,
  });

  const actions = data?.actions ?? [];
  const priorite = actions.find((a) => a.priorite && !a.fait);
  const visibles = actions.filter((a) => !a.fait && !a.priorite && (voirMasquees || !a.masquee));
  const faites = actions.filter((a) => a.fait);

  return (
    <div className="fond-nuit min-h-dvh text-[#eceff7]">
      <Rail />
      <OngletsMobile />

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-28 sm:px-6 lg:pb-12 lg:pl-[120px] lg:pr-8">
        <BarreHaute prenom={profil.data?.prenom ?? ""} offre={profil.data?.offre ?? ""} />

        <EnTetePage
          testId="plan"
          titre={<>Ton <MotMain>plan</MotMain></>}
          phrase="Ta seule liste de choses à faire. Les idées restent sur ta Vision tant que tu ne les envoies pas ici."
          aide={<>
            <p><strong>Actions</strong> : ce que tu fais, une case à cocher. <strong>Objectifs</strong> : où tu vas (posés par tes chiffres). <strong>Processus</strong> : ce que tu refais chaque semaine.</p>
            <p>Les jours de petite énergie, Zayado garde les actions en trop pour plus tard : rien n'est supprimé.</p>
          </>}
        />

        {isError ? (
          <Carte className="mt-6 p-5" testId="plan-indisponible">
            <p className="text-sm text-[#a8b6d1]">Le plan n'est pas joignable pour le moment.</p>
          </Carte>
        ) : null}

        {/* La capacité du jour, annoncée franchement : elle range, elle ne supprime pas */}
        {data ? (
          <Carte
            haut
            className="anim-monte mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 p-4 sm:p-5"
            testId="plan-capacite"
          >
            <div className="min-w-0">
              <p className="etiquette-carte">Aujourd'hui</p>
              <p className="titre-carte mt-1.5" data-testid="plan-capacite-phrase">
                {data.capacite.libelle_energie
                  ? `${data.capacite.libelle_energie} : ${data.capacite.actions_possibles} action${
                      data.capacite.actions_possibles > 1 ? "s" : ""
                    } aujourd'hui`
                  : "Fais ton check-in : le plan s'ajuste à ton énergie"}
              </p>
              <p className="etiquette mt-1 text-[#a8b6d1]">
                {data.capacite.actions_masquees > 0
                  ? `${data.capacite.actions_masquees} action${
                      data.capacite.actions_masquees > 1 ? "s" : ""
                    } gardée${data.capacite.actions_masquees > 1 ? "s" : ""} pour plus tard (rien n'est supprimé)`
                  : actions.some((a) => !a.fait)
                    ? "Tout ce qui est ouvert tient dans ta journée"
                    : "Aucune action ouverte pour l'instant"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {data.capacite.pourcentage > 0 ? (
                <span className="chiffre text-2xl font-semibold">{data.capacite.pourcentage} %</span>
              ) : null}
              {data.capacite.actions_masquees > 0 || voirMasquees ? (
                <button
                  type="button"
                  onClick={() => setVoirMasquees((v) => !v)}
                  data-testid="plan-voir-masquees"
                  className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-sm transition-colors hover:bg-white/5"
                >
                  {voirMasquees ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  {voirMasquees ? "Masquer" : "Tout voir"}
                </button>
              ) : null}
            </div>
          </Carte>
        ) : null}

        {data ? (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.5fr_1fr]" data-testid="plan-colonnes">
            {/* Objectifs */}
            <Carte className="order-2 p-4 sm:p-5 lg:order-none" testId="plan-colonne-objectifs">
              <div className="mb-3 flex items-center gap-3">
                <PastilleIcone>
                  <Target className="size-4" />
                </PastilleIcone>
                <h2 className="etiquette-carte">Objectifs</h2>
                <span className="chiffre ml-auto text-sm text-[#a8b6d1]">{data.objectifs.length}</span>
              </div>
              <ul className="flex flex-col gap-3">
                {data.objectifs.map((o) => (
                  <li
                    key={o.id}
                    className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
                    data-testid={`plan-objectif-${o.id}`}
                  >
                    <p className="text-sm text-[#eceff7]">{o.titre}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#dec2a3] transition-[width] duration-700"
                        style={{ width: `${o.pourcentage}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="chiffre text-xs text-[#a8b6d1]">
                        {o.atteint.toLocaleString("fr-FR")} / {o.cible.toLocaleString("fr-FR")} {o.unite}
                      </span>
                      {o.module ? (
                        <span className="etiquette rounded-md border border-[#dec2a3]/30 px-1.5 py-0.5 text-[#dec2a3]">
                          {o.module}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
                {data.objectifs.length === 0 ? (
                  <li className="text-sm text-[#9fb0cf]">Importe tes chiffres : ton objectif du mois s'écrit tout seul.</li>
                ) : null}
              </ul>
            </Carte>

            {/* Actions */}
            <Carte haut className="order-1 p-4 sm:p-5 lg:order-none" testId="plan-colonne-actions">
              <div className="mb-3 flex items-center gap-3">
                <PastilleIcone>
                  <Flag className="size-4" />
                </PastilleIcone>
                <h2 className="etiquette-carte">Actions</h2>
                <span className="chiffre ml-auto text-sm text-[#a8b6d1]">
                  {actions.filter((a) => !a.fait).length}
                </span>
              </div>

              {/* Un seul geste pour ajouter : on tape, on valide */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (saisie.trim().length > 1) ajouter.mutate(saisie.trim());
                }}
                className="mb-3 flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] py-1.5 pl-3.5 pr-1.5"
              >
                <Plus className="size-4 shrink-0 text-[#a8b6d1]" />
                <input
                  value={saisie}
                  onChange={(e) => setSaisie(e.target.value)}
                  placeholder="Ajouter une action…"
                  data-testid="plan-champ-action"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9fb0cf]"
                />
                <button
                  type="submit"
                  disabled={ajouter.isPending || saisie.trim().length < 2}
                  data-testid="plan-ajouter-action"
                  className="btn-principal !min-h-9 !px-4 !text-sm"
                >
                  Ajouter
                </button>
              </form>

              {priorite ? (
                <LigneAction
                  action={priorite}
                  prioritaire
                  enCours={terminer.isPending}
                  onBasculer={() => terminer.mutate(priorite.id)}
                  onSupprimer={() => retirer(priorite.id)}
                />
              ) : null}

              <ul className="flex flex-col">
                {visibles.map((a) => (
                  <li key={a.id}>
                    <LigneAction
                      action={a}
                      enCours={terminer.isPending}
                      onBasculer={() => terminer.mutate(a.id)}
                      onSupprimer={() => retirer(a.id)}
                    />
                  </li>
                ))}
              </ul>

              {visibles.length === 0 && !priorite ? (
                <p className="py-4 text-sm text-[#9fb0cf]" data-testid="plan-actions-vide">
                  {faites.length > 0
                    ? "Tout est fait pour aujourd'hui. Belle journée."
                    : "Ta première action t'attend : écris-la ci-dessus, ou prends un prospect dans Clients — la relance s'ajoute ici toute seule."}
                </p>
              ) : null}

              {faites.length > 0 ? (
                <details className="mt-3" data-testid="plan-faites">
                  <summary className="cursor-pointer text-sm text-[#a8b6d1] transition-colors hover:text-[#eceff7]">
                    {faites.length} terminée{faites.length > 1 ? "s" : ""}
                  </summary>
                  <ul className="mt-1">
                    {faites.map((a) => (
                      <li key={a.id}>
                        <LigneAction
                          action={a}
                          enCours={terminer.isPending}
                          onBasculer={() => terminer.mutate(a.id)}
                          onSupprimer={() => retirer(a.id)}
                        />
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </Carte>

            {/* Processus */}
            <Carte className="order-3 p-4 sm:p-5 lg:order-none" testId="plan-colonne-processus">
              <div className="mb-3 flex items-center gap-3">
                <PastilleIcone>
                  <Repeat className="size-4" />
                </PastilleIcone>
                <h2 className="etiquette-carte">Processus</h2>
                <span className="chiffre ml-auto text-sm text-[#a8b6d1]">{data.processus.length}</span>
              </div>
              <ul className="flex flex-col gap-2">
                {data.processus.map((p) => (
                  <li key={p.id} data-testid={`plan-processus-${p.id}`}>
                    <button
                      type="button"
                      onClick={() => basculerProcessus.mutate(p.id)}
                      disabled={basculerProcessus.isPending}
                      data-testid={`plan-processus-basculer-${p.id}`}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition-colors hover:border-[#dec2a3]/40 disabled:opacity-50"
                    >
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-full border transition-colors ${
                          p.fait_aujourdhui
                            ? "border-[#DEC2A3] btn-champagne text-[#0f1b3a]"
                            : "border-white/25"
                        }`}
                      >
                        {p.fait_aujourdhui ? <CheckCircle2 className="size-3.5" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-[#eceff7]">{p.titre}</span>
                        <span className="etiquette text-[#9fb0cf]">{p.rythme}</span>
                      </span>
                      {p.serie > 0 ? (
                        <span className="chiffre shrink-0 text-sm text-[#dec2a3]">{p.serie} j</span>
                      ) : null}
                    </button>
                  </li>
                ))}
                {data.processus.length === 0 ? (
                  <li className="text-sm text-[#9fb0cf]">Ce que tu refais chaque semaine (relances, compta, post) : ajoute-le depuis le chat.</li>
                ) : null}
              </ul>
            </Carte>
          </div>
        ) : null}
      </div>

    </div>
  );
}

/** Une ligne d'action : une case à cocher, et c'est tout. Le reste est dans le menu. */
function LigneAction({
  action,
  prioritaire = false,
  enCours,
  onBasculer,
  onSupprimer,
}: {
  action: ActionPlan;
  prioritaire?: boolean;
  enCours: boolean;
  onBasculer: () => void;
  onSupprimer: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 border-b border-white/[0.07] py-3 last:border-0 ${
        prioritaire ? "rounded-xl border-b-0 bg-[#dec2a3]/[0.08] px-3" : ""
      }`}
      data-testid={`plan-action-${action.id}`}
    >
      <button
        type="button"
        onClick={onBasculer}
        disabled={enCours}
        aria-label={action.fait ? `Rouvrir ${action.titre}` : `Terminer ${action.titre}`}
        data-testid={`plan-case-${action.id}`}
        className={`grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-200 disabled:opacity-50 ${
          action.fait
            ? "border-[#DEC2A3] btn-champagne text-[#0f1b3a]"
            : "border-white/25 hover:border-[#dec2a3]"
        }`}
      >
        {action.fait ? <CheckCircle2 className="size-3.5" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        {prioritaire ? <p className="surtitre !text-[0.62rem]">Priorité du jour</p> : null}
        <p className={`truncate text-sm ${action.fait ? "text-[#9fb0cf] line-through" : "text-[#eceff7]"}`}>
          {action.titre}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {action.module ? (
            <span className="etiquette rounded-md border border-[#dec2a3]/30 px-1.5 py-0.5 text-[#dec2a3]">
              {action.module}
            </span>
          ) : null}
          {action.source ? <span className="etiquette hidden truncate text-[#9fb0cf] sm:inline">{action.source}</span> : null}
          {action.masquee ? <span className="etiquette text-[#9fb0cf]">rangée</span> : null}
        </div>
      </div>

      <span className="etiquette shrink-0 text-[#9fb0cf]">{action.echeance}</span>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Autres choix"
          data-testid={`plan-menu-${action.id}`}
          className="grid size-8 shrink-0 place-items-center rounded-full text-[#9fb0cf] transition-colors hover:bg-white/10 hover:text-[#eceff7]"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 border-white/10 bg-[#16244a] text-[#eceff7]">
          <DropdownMenuItem
            onClick={onSupprimer}
            data-testid={`plan-supprimer-${action.id}`}
            className="gap-2 focus:bg-white/10 focus:text-[#eceff7]"
          >
            <Trash2 className="size-3.5" /> Retirer du plan
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
