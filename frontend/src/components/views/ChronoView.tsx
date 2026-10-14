import { useEffect, useState } from "react";
import { Play, Square, X } from "lucide-react";
import { RowDialog } from "@/components/RowFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatNum, toNumber } from "@/lib/format";
import { useChrono, useChronoMutations, useEspaceParams, useRowMutations } from "@/lib/hooks";
import type { Row, Source, ViewConfig } from "@/lib/types";

function Ecoule({ debut }: { debut: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(Math.floor((now - Date.parse(debut)) / 1000), 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return <span className="tabular-nums text-4xl font-semibold tabular-nums tracking-tight text-[#1F2A44]" data-testid="chrono-elapsed">{p(Math.floor(s / 3600))}:{p(Math.floor((s % 3600) / 60))}:{p(s % 60)}</span>;
}

/** Chronomètre unique (prestations des partenaires, suivi de tickets…) : à l'arrêt, une ligne est écrite dans le classeur. */
export default function ChronoView({ source, rows, config }: { source: Source; rows: Row[]; config: ViewConfig }) {
  const params = useEspaceParams();
  const chrono = useChrono();
  const { demarrer, arreter, annuler } = useChronoMutations(source.id);
  const { update, remove } = useRowMutations(source.id);
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState<Row | null>(null);
  const libelle = params.data?.libelle_chrono || "Ticket";
  const c = chrono.data;
  const ici = c?.actif && c.source_id === source.id;
  const h = config.hours_field;
  const derniers = [...rows].reverse().slice(0, 12);
  const total = (k: string) => rows.filter((r) => String(r.data[config.ref_field ?? ""] ?? "") === k).reduce((s, r) => s + toNumber(r.data[h ?? ""] ?? 0), 0);
  const refs = [...new Set(rows.map((r) => String(r.data[config.ref_field ?? ""] ?? "")).filter(Boolean))].slice(0, 8);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] animate-rise" data-testid="chrono-view">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9a6a2c]">Chronomètre</p>
        {ici && c?.debut ? (
          <div className="mt-3 space-y-3" data-testid="chrono-running">
            <Ecoule debut={c.debut} />
            <p className="text-sm text-slate-600">{libelle} : <b className="text-slate-900">{c.reference || "—"}</b>{c.note ? ` · ${c.note}` : ""}</p>
            <div className="flex gap-2">
              <Button onClick={() => arreter.mutate()} disabled={arreter.isPending} data-testid="chrono-stop">
                <Square className="size-4" /> Arrêter et enregistrer
              </Button>
              <Button variant="ghost" onClick={() => annuler.mutate()} data-testid="chrono-cancel">
                <X className="size-4" /> Annuler
              </Button>
            </div>
          </div>
        ) : c?.actif ? (
          <p className="mt-3 text-sm text-slate-600" data-testid="chrono-elsewhere">Un chronomètre tourne déjà sur une autre page. Arrête-le d'abord.</p>
        ) : (
          <form
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              demarrer.mutate({ source_id: source.id, reference: ref, note });
            }}
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="chrono-ref">{libelle}</label>
              <Input id="chrono-ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder={`Ex. ${libelle} 42`} maxLength={120} className="bg-white" data-testid="chrono-ref-input" />
              {refs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {refs.map((r) => (
                    <button key={r} type="button" onClick={() => setRef(r)} className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-700 transition-colors duration-150 hover:border-[#C9A96A]" data-testid={`chrono-ref-${r}`}>
                      {r} · {formatNum(total(r))} h
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (facultatif)" maxLength={300} className="bg-white" data-testid="chrono-note-input" />
            <Button type="submit" disabled={demarrer.isPending} data-testid="chrono-start">
              <Play className="size-4" /> Démarrer
            </Button>
          </form>
        )}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <p className="text-sm font-semibold text-slate-900">Derniers relevés</p>
        <ul className="mt-2 divide-y divide-slate-100" data-testid="chrono-history">
          {derniers.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setOpen(r)} className="flex w-full items-center gap-3 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-slate-50" data-testid={`chrono-row-${r.id}`}>
                <span className="w-24 shrink-0 text-slate-500">{formatDate(String(r.data[config.date_field ?? ""] ?? ""))}</span>
                <span className="min-w-0 flex-1 truncate text-slate-800">{String(r.data[config.ref_field ?? ""] ?? "—")} <span className="text-slate-500">· {String(r.data[config.person_field ?? ""] ?? "")}</span></span>
                <span className="tabular-nums tabular-nums text-slate-900">{formatNum(toNumber(r.data[h ?? ""] ?? 0))} h</span>
              </button>
            </li>
          ))}
          {!derniers.length && <li className="py-3 text-sm text-slate-500" data-testid="chrono-history-empty">Aucun temps enregistré. Démarre le chronomètre : la ligne sera écrite dans le classeur à l'arrêt.</li>}
        </ul>
      </section>
      <RowDialog
        row={open}
        columns={source.columns}
        sourceId={source.id}
        onClose={() => setOpen(null)}
        saving={update.isPending}
        onSave={(data) => open && update.mutate({ id: open.id, data }, { onSuccess: () => setOpen(null) })}
        onDelete={() => open && remove.mutate(open.id, { onSuccess: () => setOpen(null) })}
      />
    </div>
  );
}
