import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Check, ChevronRight, Compass, Loader2, Sparkles } from "lucide-react";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { Carte } from "@/components/vision/atomes";

/* « Ton cercle » : Pilotage dit combien → Radar dit qui → Plan d'action engage → Tunnel convertit
   → clients signés, qui font avancer l'objectif du mois. L'utilisateur ne saisit rien : il voit où il en est
   et lance la prochaine étape d'un clic. */

type EtapeCercle = { cle: string; titre: string; etat: "fait" | "en_cours" | "a_faire"; detail: string; lien: string };
type Proposition = { cle: string; titre: string; texte: string; bouton: string; action: "lien" | "tunnel_auto" | "fec_exemple"; lien?: string | null };
type CercleVue = { etapes: EtapeCercle[]; proposition: Proposition | null; secondaires: Proposition[] };

export function useTunnelAuto() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (sujet?: string) => apiPost<{ id: string }>("/copilote/tunnels/auto", sujet ? { sujet } : {}),
    onSuccess: (t) => {
      toast.success("Ton tunnel est rédigé", { description: "Relis-le, ajoute tes preuves réelles, puis publie." });
      qc.invalidateQueries({ queryKey: ["cercle"] });
      qc.invalidateQueries({ queryKey: ["plan"] });
      qc.invalidateQueries({ queryKey: ["z", "tunnels"] });
      navigate(`/tunnels/${t.id}`);
    },
    onError: (e) => {
      const detail = e instanceof ApiError ? (e.body as { detail?: string } | null)?.detail : null;
      toast.error(detail ?? "Tunnel non créé pour le moment", {
        action: detail?.includes("Paramètres") ? { label: "Compléter", onClick: () => navigate("/parametres") } : undefined,
      });
    },
  });
}

const PASTILLE = {
  fait: "bg-emerald-400/90 text-[#0D1F38]",
  en_cours: "border-2 border-[#F4EFE6] text-[#F4EFE6]",
  a_faire: "border border-white/20 text-[#9fb0cf]",
} as const;

export function CercleZayado() {
  const { data } = useQuery({ queryKey: ["cercle"], queryFn: () => apiGet<CercleVue>("/copilote/cercle"), staleTime: 30_000 });
  const tunnel = useTunnelAuto();
  if (!data) return null;
  const p = data.proposition;

  const Bouton = ({ prop, principal }: { prop: Proposition; principal?: boolean }) => {
    const cls = principal
      ? "btn-principal"
      : "inline-flex items-center gap-1 text-sm text-[#a8b6d1] underline decoration-white/25 underline-offset-4 hover:text-[#F4EFE6]";
    if (prop.action === "tunnel_auto") {
      return (
        <button type="button" className={cls} disabled={tunnel.isPending} onClick={() => tunnel.mutate(undefined)} data-testid={`cercle-${prop.cle}`}>
          {tunnel.isPending ? <Loader2 className="size-4 animate-spin" /> : principal ? <Sparkles className="size-4" /> : null}
          {tunnel.isPending ? "Rédaction des 4 pages…" : prop.bouton}
          {!tunnel.isPending ? <ArrowRight className="size-4" /> : null}
        </button>
      );
    }
    return (
      <Link to={prop.lien || "/"} className={cls} data-testid={`cercle-${prop.cle}`}>
        {prop.bouton} <ArrowRight className="size-4" />
      </Link>
    );
  };

  return (
    <Carte haut className="anim-monte mt-6 p-5 sm:p-6" testId="carte-cercle">
      {/* La prochaine étape d'abord : une phrase, un bouton. */}
      {p ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center" data-testid="cercle-proposition">
          <div className="min-w-0 flex-1">
            <p className="etiquette-carte"><Compass />Ta prochaine étape</p>
            <p className="titre-carte mt-2 sm:!text-[1.75rem]">{p.titre}</p>
            <p className="mt-1 max-w-2xl text-sm text-[#a8b6d1]">{p.texte}</p>
          </div>
          <div className="shrink-0"><Bouton prop={p} principal /></div>
        </div>
      ) : (
        <div data-testid="cercle-proposition-vide">
          <p className="etiquette-carte"><Compass />Ta prochaine étape</p>
          <p className="titre-carte mt-2">Tout tourne. <span className="mot-main">Concentre-toi</span> sur ta journée.</p>
        </div>
      )}

      {/* Où tu en es : chiffres → prospects → plan → tunnel → clients */}
      <ol className="-mx-1 mt-5 flex snap-x gap-2 overflow-x-auto border-t border-white/[0.08] px-1 pb-1 pt-4 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0" data-testid="cercle-etapes">
        {data.etapes.map((e, i) => (
          <li key={e.cle} className="w-[42%] flex-none snap-start sm:w-auto">
            <Link to={e.lien} title={e.detail} className="group flex h-full items-start gap-2 rounded-xl p-2 transition-colors hover:bg-white/[0.06]" data-testid={`cercle-etape-${e.cle}`}>
              <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${PASTILLE[e.etat]}`}>
                {e.etat === "fait" ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold">{e.titre}</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-[#a8b6d1]">{e.detail}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {data.secondaires.length ? (
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1" data-testid="cercle-secondaires">
          {data.secondaires.map((s) => <Bouton key={s.cle} prop={s} />)}
        </div>
      ) : null}
    </Carte>
  );
}
