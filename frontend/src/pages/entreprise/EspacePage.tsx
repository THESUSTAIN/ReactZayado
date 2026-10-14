import { useState } from "react";
import { ExternalLink, RefreshCw, SlidersHorizontal } from "lucide-react";
import ConfigEditor from "@/components/ConfigEditor";
import ViewRenderer, { ViewSwitcher } from "@/components/ViewRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { KIND_LABELS, VIEW_LABELS } from "@/lib/format";
import { useEspaceParams, usePageMutations, usePages, useRows, useSource, useSync } from "@/lib/hooks";
import type { Page, ViewConfig, ViewType } from "@/lib/types";

const heure = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/** Une page de l'espace : la vue choisie sur une base du classeur. L'aperçu change à la volée ; « Enregistrer » le garde pour l'équipe. */
export default function EspacePage({ pageId }: { pageId: string }) {
  const pages = usePages();
  const p: Page | undefined = pages.data?.find((x) => x.id === pageId);
  const source = useSource(p?.source_id);
  const rows = useRows(p?.source_id);
  const params = useEspaceParams();
  const sync = useSync(p?.source_id ?? "");
  const { update } = usePageMutations();
  const [apercu, setApercu] = useState<ViewType | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ name: string; view: ViewType; config: ViewConfig } | null>(null);
  const gerer = !!params.data?.peut_gerer;

  if (pages.isLoading) return <p className="text-sm text-slate-500" data-testid="espace-page-loading">Chargement…</p>;
  if (!p) return <p className="text-sm text-slate-500" data-testid="espace-page-introuvable">Cette page n'existe plus.</p>;
  const s = source.data;
  const vue = apercu ?? p.view;

  return (
    <div className="esp-clair space-y-5" data-testid="espace-page">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-[#9a6a2c]">Ton entreprise · {VIEW_LABELS[vue]}</p>
          <h1 className="titre-serif mt-1 text-[32px] leading-tight text-[#1F2A44]" data-testid="espace-page-title">{p.name}</h1>
          {s && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500" data-testid="espace-page-source">
              Source : {KIND_LABELS[s.kind]} · {s.fichier_nom}{s.onglet ? ` › ${s.onglet}` : ""} · {s.row_count} ligne(s) · lu à {heure(s.last_synced)}
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#9a6a2c] hover:underline" data-testid="espace-page-open-file">
                  Ouvrir le fichier <ExternalLink className="size-3" />
                </a>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending} data-testid="espace-page-sync">
            <RefreshCw className={`size-4 ${sync.isPending ? "animate-spin" : ""}`} /> Relire
          </Button>
          {gerer && (
            <Button variant="outline" size="sm" onClick={() => { setDraft({ name: p.name, view: vue, config: p.config }); setOpen(true); }} data-testid="espace-page-configure">
              <SlidersHorizontal className="size-4" /> Paramétrer
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <ViewSwitcher value={vue} onChange={(v) => setApercu(v === p.view ? null : v)} />
        {apercu && (
          <span className="flex items-center gap-2 text-xs text-slate-600" data-testid="espace-page-preview-note">
            Aperçu (pour toi seul)
            {gerer && (
              <Button size="sm" onClick={() => update.mutate({ id: p.id, body: { view: apercu } }, { onSuccess: () => setApercu(null) })} data-testid="espace-page-preview-save">
                Garder pour l'équipe
              </Button>
            )}
          </span>
        )}
      </div>

      {(source.isError || rows.isError) && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" data-testid="espace-page-error">
          Le classeur n'a pas pu être lu. Vérifie que le dirigeant a bien relié son Drive (Paramètres › Connexions), puis clique sur « Relire ».
        </p>
      )}
      {s && rows.data && <ViewRenderer source={s} rows={rows.data} view={vue} config={p.config} />}
      {rows.isLoading && <p className="text-sm text-slate-500">Lecture du classeur…</p>}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="esp-clair w-full overflow-y-auto bg-white sm:max-w-xl" data-testid="espace-page-config-sheet">
          <SheetHeader>
            <SheetTitle className="font-heading">Paramètres de la page</SheetTitle>
            <SheetDescription>L'interface et les colonnes utilisées. Le classeur n'est pas modifié.</SheetDescription>
          </SheetHeader>
          {draft && s && (
            <div className="space-y-6 px-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Nom</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="bg-white" data-testid="espace-page-config-name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Interface</Label>
                <ViewSwitcher value={draft.view} onChange={(v) => setDraft({ ...draft, view: v })} />
              </div>
              <ConfigEditor columns={s.columns} config={draft.config} onChange={(c) => setDraft({ ...draft, config: c })} prefix="espace-page-config" />
            </div>
          )}
          <SheetFooter>
            <Button
              onClick={() => draft && update.mutate({ id: p.id, body: draft }, { onSuccess: () => { setOpen(false); setApercu(null); } })}
              disabled={update.isPending || !draft?.name.trim()}
              data-testid="espace-page-config-save"
            >
              Enregistrer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
