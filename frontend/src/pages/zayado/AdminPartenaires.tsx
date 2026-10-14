import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { messageErreur } from "@/zayado/api";

/* Admin › Partenaires « reprise sans apport ». Miroir de backend/routers/partenaires_financement.py. */

export type CategoriePartenaire = "pret_honneur" | "garantie" | "banque" | "microcredit" | "aide_publique" | "credit_vendeur"
  | "fonds_propres" | "financement_participatif" | "accompagnement";
export type PartenaireIn = {
  nom: string; categorie: CategoriePartenaire; description: string; site: string; contact_nom: string; contact_email: string;
  telephone: string; region: string; notes: string; actif: boolean;
};
export type Partenaire = PartenaireIn & { id: string; cree_le: string };

export const CATEGORIES_PARTENAIRE: Record<CategoriePartenaire, string> = {
  pret_honneur: "Prêt d'honneur", garantie: "Garantie bancaire", banque: "Banque", microcredit: "Microcrédit",
  aide_publique: "Aide publique / apport", credit_vendeur: "Crédit vendeur", fonds_propres: "Fonds propres",
  financement_participatif: "Financement participatif", accompagnement: "Accompagnement",
};
const VIDE: PartenaireIn = { nom: "", categorie: "banque", description: "", site: "", contact_nom: "", contact_email: "", telephone: "", region: "France entière", notes: "", actif: true };
const champ = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/60 focus:outline-none";
const btn = "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50";
const CLE = ["admin", "partenaires-financement"];

function Formulaire({ init, onFermer, id }: { init: PartenaireIn; onFermer: () => void; id?: string }) {
  const qc = useQueryClient();
  const [f, setF] = useState<PartenaireIn>(init);
  const sauver = useMutation({
    mutationFn: (b: PartenaireIn) => (id ? apiPut<Partenaire>(`/admin/partenaires-financement/${id}`, b) : apiPost<Partenaire>("/admin/partenaires-financement", b)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: CLE }); toast.success(id ? "Partenaire mis à jour" : "Partenaire ajouté"); onFermer(); },
    onError: (e) => toast.error(messageErreur(e)),
  });
  const t = (k: keyof PartenaireIn, label: string, ph = "") => (
    <label className="block space-y-1"><span className="text-[11px] font-semibold uppercase tracking-wide text-offwhite/55">{label}</span>
      <input className={champ} value={String(f[k])} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} data-testid={`partenaire-${k}`} /></label>
  );
  return (
    <form className="grid gap-3 rounded-2xl border border-gold/30 p-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); sauver.mutate(f); }} data-testid="partenaire-formulaire">
      {t("nom", "Nom")}
      <label className="block space-y-1"><span className="text-[11px] font-semibold uppercase tracking-wide text-offwhite/55">Catégorie</span>
        <select className={champ} value={f.categorie} onChange={(e) => setF({ ...f, categorie: e.target.value as CategoriePartenaire })} data-testid="partenaire-categorie">
          {Object.entries(CATEGORIES_PARTENAIRE).map(([k, l]) => <option key={k} value={k} className="text-navy-900">{l}</option>)}
        </select></label>
      <div className="md:col-span-2">{t("description", "Ce qu'il apporte au repreneur")}</div>
      {t("site", "Site", "https://")}{t("region", "Région")}
      {t("contact_nom", "Interlocuteur")}{t("contact_email", "E-mail de l'interlocuteur")}
      {t("telephone", "Téléphone")}{t("notes", "Notes internes")}
      <label className="flex items-center gap-2 text-sm text-offwhite"><input type="checkbox" checked={f.actif} onChange={(e) => setF({ ...f, actif: e.target.checked })} data-testid="partenaire-actif" /> Visible sur la page publique « reprise sans apport »</label>
      <div className="flex justify-end gap-2 md:col-span-2">
        <button type="button" onClick={onFermer} className={`${btn} bg-white/5 text-offwhite`} data-testid="partenaire-annuler"><X className="size-4" /> Annuler</button>
        <button type="submit" disabled={sauver.isPending || f.nom.trim().length < 2} className={`${btn} bg-gold text-navy-900`} data-testid="partenaire-enregistrer">
          {sauver.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Enregistrer</button>
      </div>
    </form>
  );
}

export function AdminPartenaires() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: CLE, queryFn: () => apiGet<Partenaire[]>("/admin/partenaires-financement") });
  const [edition, setEdition] = useState<Partenaire | "nouveau" | null>(null);
  const suppr = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/admin/partenaires-financement/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: CLE }); toast.success("Partenaire supprimé"); },
    onError: (e) => toast.error(messageErreur(e)),
  });
  const liste = q.data ?? [];
  return (
    <div className="space-y-4 text-offwhite" data-testid="admin-partenaires">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-offwhite/75" data-testid="admin-partenaires-compte">
          {q.isSuccess ? <><b className="text-gold">{liste.filter((p) => p.actif).length}</b> partenaires actifs sur {liste.length} pour aider vos clients à reprendre une entreprise sans apport.</> : "Chargement des partenaires…"}
        </p>
        <button type="button" onClick={() => setEdition("nouveau")} className={`${btn} bg-gold text-navy-900`} data-testid="admin-partenaires-ajouter"><Plus className="size-4" /> Ajouter un partenaire</button>
      </div>
      {edition === "nouveau" ? <Formulaire init={VIDE} onFermer={() => setEdition(null)} /> : null}
      {q.isLoading ? <Loader2 className="animate-spin text-gold" /> : (
        <ul className="space-y-2">
          {liste.map((p) => edition !== "nouveau" && edition?.id === p.id ? (
            <li key={p.id}><Formulaire id={p.id} init={p} onFermer={() => setEdition(null)} /></li>
          ) : (
            <li key={p.id} className={`flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-white/10 p-4 ${p.actif ? "" : "opacity-55"}`} data-testid={`admin-partenaire-${p.id}`}>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gold">{CATEGORIES_PARTENAIRE[p.categorie]}{p.actif ? "" : " · masqué"}</p>
                <p className="font-semibold">{p.nom}</p>
                <p className="text-xs text-offwhite/70">{p.description}</p>
                <p className="mt-1 text-xs text-offwhite/55">{[p.contact_nom, p.contact_email, p.telephone, p.region].filter(Boolean).join(" · ") || "Interlocuteur à renseigner"}</p>
              </div>
              <div className="flex gap-1.5">
                {p.site ? <a href={p.site} target="_blank" rel="noreferrer" className={`${btn} bg-white/5 text-offwhite`} aria-label="Site"><ExternalLink className="size-4" /></a> : null}
                <button type="button" onClick={() => setEdition(p)} className={`${btn} bg-white/5 text-offwhite`} data-testid={`admin-partenaire-modifier-${p.id}`}><Pencil className="size-4" /></button>
                <button type="button" onClick={() => { if (window.confirm(`Supprimer ${p.nom} ?`)) suppr.mutate(p.id); }} className={`${btn} bg-white/5 text-red-300`} data-testid={`admin-partenaire-supprimer-${p.id}`}><Trash2 className="size-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
