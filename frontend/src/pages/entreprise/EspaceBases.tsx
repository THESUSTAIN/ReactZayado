import { useState } from "react";
import { CalendarDays, Check, Columns3, ExternalLink, GanttChart, LayoutGrid, Plus, Table2, Timer, Unlink } from "lucide-react";
import ConnectSource from "@/components/ConnectSource";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KIND_LABELS, VIEW_LABELS, VIEW_ORDER } from "@/lib/format";
import { useEspaceMutations, useEspaceParams, useModeles, usePageMutations, usePages, useSources } from "@/lib/hooks";
import type { ViewType } from "@/lib/types";

const ICONE_VUE: Partial<Record<ViewType, typeof Table2>> = { calendar: CalendarDays, timeline: GanttChart, chrono: Timer, kanban: Columns3, cards: LayoutGrid };
const carte = "rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6";
const heure = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Bases & pages : relier le classeur, ajouter les pages prêtes à l'emploi, créer ses propres pages, régler le chronomètre. */
export default function EspaceBases({ ouvrir }: { ouvrir: (pageId: string) => void }) {
  const params = useEspaceParams();
  const modeles = useModeles();
  const sources = useSources();
  const pages = usePages();
  const { installer, delier, reglages } = useEspaceMutations();
  const { create } = usePageMutations();
  const [lib, setLib] = useState<string | null>(null);
  const [neuve, setNeuve] = useState<{ name: string; source_id: string; view: ViewType }>({ name: "", source_id: "", view: "table" });
  const p = params.data;
  const gerer = !!p?.peut_gerer;
  const classeur = p?.classeur;

  return (
    <div className="esp-clair space-y-5" data-testid="espace-bases">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-[#9a6a2c]">Ton entreprise · Outils</p>
        <h1 className="titre-serif mt-1 text-[32px] leading-tight text-[#1F2A44]">Bases &amp; pages</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">Tes données restent dans ton classeur Google ou Excel, ou dans tes listes Microsoft. Zayado les affiche en pages : calendrier, frise, chronomètre, kanban…</p>
      </header>

      <section className={carte} data-testid="espace-classeur">
        <h2 className="font-heading text-base font-semibold text-slate-900">Classeur de l'entreprise</h2>
        {classeur ? (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-700" data-testid="espace-classeur-nom">
            <Check className="size-4 text-emerald-600" /> {KIND_LABELS[classeur.kind]} · <b>{classeur.nom}</b>
            {classeur.url && (
              <a href={classeur.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#9a6a2c] hover:underline">
                Ouvrir <ExternalLink className="size-3" />
              </a>
            )}
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-600" data-testid="espace-classeur-aucun">Aucun classeur relié. Relie-le ci-dessous : les pages prêtes à l'emploi y créeront leurs onglets.</p>
        )}
      </section>

      {gerer && <ConnectSource test={!!p?.test_disponible} />}

      <section className={carte} data-testid="espace-modeles">
        <h2 className="font-heading text-base font-semibold text-slate-900">Pages prêtes à l'emploi</h2>
        <p className="mt-1 text-sm text-slate-500">Chaque modèle crée son onglet dans le classeur s'il n'existe pas. La première fois, les données déjà saisies dans Zayado y sont envoyées.</p>
        {!classeur && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" data-testid="espace-modeles-sans-classeur">
            Relie d'abord ton classeur ci-dessus pour ajouter ces pages. Sans classeur, Planning, Absences, Temps (chronomètre) et Pièces fonctionnent déjà depuis le menu, avec les données gardées dans Zayado.
          </p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(modeles.data ?? []).map((m) => {
            const Icone = ICONE_VUE[m.vue] ?? Table2;
            return (
              <div key={m.id} className="flex flex-col rounded-xl border border-slate-200 p-4 transition-[border-color,box-shadow] duration-150 hover:border-[#E2D5BE] hover:shadow-sm" data-testid={`modele-${m.id}`}>
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-[#F5EBDD] text-[#7A4E16]"><Icone className="size-4" /></span>
                  <p className="font-semibold text-slate-900">{m.nom}</p>
                  <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{VIEW_LABELS[m.vue]}</span>
                </div>
                <p className="mt-2 flex-1 text-xs text-slate-600">{m.description}</p>
                <p className="mt-2 truncate text-[11px] text-slate-400">Colonnes : {m.colonnes.join(", ")}</p>
                {m.installe && m.page_id ? (
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => ouvrir(m.page_id as string)} data-testid={`modele-${m.id}-ouvrir`}>Ouvrir la page</Button>
                ) : (
                  <Button size="sm" className="mt-3" disabled={!gerer || !classeur || installer.isPending} onClick={() => installer.mutate(m.id)} data-testid={`modele-${m.id}-installer`}>
                    <Plus className="size-4" /> Ajouter
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className={carte} data-testid="espace-sources">
        <h2 className="font-heading text-base font-semibold text-slate-900">Bases reliées</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {(sources.data ?? []).map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm" data-testid={`espace-source-${s.id}`}>
              <span className="min-w-0 flex-1 truncate text-slate-800"><b>{s.onglet || s.name}</b> <span className="text-slate-500">· {s.fichier_nom} · {s.row_count} ligne(s) · lu le {heure(s.last_synced)}</span></span>
              {gerer && (
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-600" onClick={() => delier.mutate(s.id)} data-testid={`espace-source-delier-${s.id}`}>
                  <Unlink className="size-4" /> Délier
                </Button>
              )}
            </li>
          ))}
          {!sources.data?.length && <li className="py-2 text-sm text-slate-500">Aucune base reliée.</li>}
        </ul>
      </section>

      {gerer && !!sources.data?.length && (
        <section className={carte} data-testid="espace-page-nouvelle">
          <h2 className="font-heading text-base font-semibold text-slate-900">Créer ma propre page</h2>
          <form
            className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(neuve, { onSuccess: (pg) => { setNeuve({ name: "", source_id: "", view: "table" }); ouvrir(pg.id); } });
            }}
          >
            <Input value={neuve.name} onChange={(e) => setNeuve({ ...neuve, name: e.target.value })} placeholder="Nom de la page" maxLength={80} className="bg-white" data-testid="espace-page-nouvelle-nom" />
            <select value={neuve.source_id} onChange={(e) => setNeuve({ ...neuve, source_id: e.target.value })} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm" data-testid="espace-page-nouvelle-source">
              <option value="">Base…</option>
              {(sources.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.onglet || s.name}</option>)}
            </select>
            <select value={neuve.view} onChange={(e) => setNeuve({ ...neuve, view: e.target.value as ViewType })} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm" data-testid="espace-page-nouvelle-vue">
              {VIEW_ORDER.map((v) => <option key={v} value={v}>{VIEW_LABELS[v]}</option>)}
            </select>
            <Button type="submit" disabled={!neuve.name.trim() || !neuve.source_id || create.isPending} data-testid="espace-page-nouvelle-creer">Créer</Button>
          </form>
          <p className="mt-2 text-xs text-slate-500">{pages.data?.length ?? 0} page(s) dans le menu.</p>
        </section>
      )}

      <section className={carte} data-testid="espace-reglage-chrono">
        <h2 className="font-heading text-base font-semibold text-slate-900">Chronomètre</h2>
        <p className="mt-1 text-sm text-slate-500">Le nom de ce que l'équipe chronomètre : Ticket, Mission, Prestation, Dossier… Il s'affiche sur la page Temps.</p>
        <form
          className="mt-3 flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (lib?.trim()) reglages.mutate({ libelle_chrono: lib.trim() });
          }}
        >
          <Input value={lib ?? p?.libelle_chrono ?? ""} onChange={(e) => setLib(e.target.value)} maxLength={40} disabled={!gerer} className="bg-white" data-testid="espace-libelle-chrono-input" />
          <Button type="submit" disabled={!gerer || reglages.isPending || !lib?.trim()} data-testid="espace-libelle-chrono-save">Enregistrer</Button>
        </form>
      </section>
    </div>
  );
}
