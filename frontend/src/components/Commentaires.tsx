import { useState } from "react";
import { CornerDownRight, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCommentaires, useCommenter } from "@/lib/hooks";
import type { Commentaire } from "@/lib/types";

const quand = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Saisie({ onEnvoi, pending, placeholder, testId }: { onEnvoi: (t: string) => void; pending: boolean; placeholder: string; testId: string }) {
  const [t, setT] = useState("");
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (t.trim()) {
          onEnvoi(t.trim());
          setT("");
        }
      }}
    >
      <textarea
        value={t}
        onChange={(e) => setT(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder={placeholder}
        className="min-h-[44px] flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-[border-color] duration-150 focus:border-[#C9A96A]"
        data-testid={`${testId}-input`}
      />
      <Button type="submit" size="sm" disabled={pending || !t.trim()} data-testid={`${testId}-send`} aria-label="Envoyer">
        <Send className="size-4" />
      </Button>
    </form>
  );
}

/** Fil de commentaires d'une ligne (comme dans Google Sheets / Microsoft Lists) : on commente et on répond. */
export default function Commentaires({ sourceId, rowId }: { sourceId: string; rowId: string }) {
  const tous = useCommentaires(sourceId);
  const envoyer = useCommenter(sourceId, rowId);
  const [repondreA, setRepondreA] = useState<string | null>(null);
  const fil = (tous.data ?? []).filter((c) => c.row_id === rowId);
  const racines = fil.filter((c) => !c.parent_id);
  const reponses = (id: string) => fil.filter((c) => c.parent_id === id);

  const Bulle = ({ c, enfant }: { c: Commentaire; enfant?: boolean }) => (
    <div className={`rounded-xl border px-3 py-2 ${enfant ? "ml-6 border-slate-100 bg-slate-50" : "border-slate-200 bg-white"}`} data-testid={`commentaire-${c.id}`}>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {enfant && <CornerDownRight className="size-3" />}
        <span className="font-semibold text-slate-800">{c.de_moi ? "Toi" : c.auteur_nom}</span>
        <span>· {quand(c.le)}</span>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{c.texte}</p>
    </div>
  );

  return (
    <section className="space-y-3 border-t border-slate-200 pt-4" data-testid="commentaires">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <MessageSquare className="size-4 text-[#9a6a2c]" /> Commentaires {fil.length > 0 && <span className="text-slate-500">({fil.length})</span>}
      </h3>
      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {racines.length === 0 && <p className="text-xs text-slate-500" data-testid="commentaires-vide">Aucun commentaire. Pose une question ou laisse une précision à l'équipe.</p>}
        {racines.map((c) => (
          <div key={c.id} className="space-y-1.5">
            <Bulle c={c} />
            {reponses(c.id).map((r) => (
              <Bulle key={r.id} c={r} enfant />
            ))}
            {repondreA === c.id ? (
              <div className="ml-6">
                <Saisie
                  testId={`reponse-${c.id}`}
                  placeholder="Ta réponse…"
                  pending={envoyer.isPending}
                  onEnvoi={(texte) => envoyer.mutate({ texte, parent_id: c.id }, { onSuccess: () => setRepondreA(null) })}
                />
              </div>
            ) : (
              <button type="button" className="ml-6 text-xs font-semibold text-[#9a6a2c] hover:underline" onClick={() => setRepondreA(c.id)} data-testid={`repondre-${c.id}`}>
                Répondre
              </button>
            )}
          </div>
        ))}
      </div>
      <Saisie testId="commentaire-nouveau" placeholder="Écrire un commentaire…" pending={envoyer.isPending} onEnvoi={(texte) => envoyer.mutate({ texte })} />
    </section>
  );
}
