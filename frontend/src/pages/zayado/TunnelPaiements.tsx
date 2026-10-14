import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Link2, Loader2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiDelete, apiGet, apiPut } from "@/lib/api";
import { messageErreur } from "@/zayado/api";
import { Carte, SurTitre } from "@/zayado/ui";

/* Paiement en ligne des tunnels (Mollie) : miroir de GET /api/copilote/paiements (routers/paiements_tunnels.py). */

export type ModePaiement = "connect" | "centralise" | "simulation" | "aucun";
export type VenteTunnel = {
  id: string; tunnel_nom: string; etape: string; libelle: string; montant: number; commission: number; net: number;
  mode: ModePaiement; statut: "en_attente" | "paye" | "echoue" | "annule" | "expire"; client_nom: string; client_email: string;
  cree_le: string; paye_le: string | null; reverse: boolean;
};
export type TotauxPaiements = { ventes: number; brut: number; commission: number; net: number; a_reverser: number; reverse: number; solde: number };
export type EtatPaiements = {
  mode: ModePaiement; connect_disponible: boolean; connecte: boolean; organisation: string; en_ligne: boolean;
  iban: string; titulaire: string; offre: string; taux: number; plafond: number | null; totaux: TotauxPaiements; ventes: VenteTunnel[];
};

const eur = (v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v || 0);
const STATUT: Record<VenteTunnel["statut"], string> = { en_attente: "En attente", paye: "Payé", echoue: "Échoué", annule: "Annulé", expire: "Expiré" };
const MODE: Record<ModePaiement, string> = {
  connect: "Sur ton compte Mollie : l'argent arrive chez toi, la commission est retenue automatiquement.",
  centralise: "Encaissé par Zayado puis reversé sur ton IBAN (commission déduite).",
  simulation: "Mode test : les paiements sont simulés (aucun argent réel).",
  aucun: "Paiement indisponible pour l'instant : les « oui » restent des demandes à recontacter.",
};

export function PaiementsCarte() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const q = useQuery({ queryKey: ["z", "paiements"], queryFn: () => apiGet<EtatPaiements>("/copilote/paiements") });
  const [iban, setIban] = useState("");
  const [titulaire, setTitulaire] = useState("");
  const maj = (d: EtatPaiements) => qc.setQueryData(["z", "paiements"], d);
  const reglages = useMutation({
    mutationFn: (b: { en_ligne: boolean; iban?: string; titulaire?: string }) => apiPut<EtatPaiements>("/copilote/paiements/reglages", b),
    onSuccess: (d) => { maj(d); setIban(""); toast.success("Paiements enregistrés"); },
    onError: (e) => toast.error(messageErreur(e)),
  });
  const connecter = useMutation({
    mutationFn: () => apiGet<{ url: string }>("/copilote/paiements/connect"),
    onSuccess: (r) => { window.location.href = r.url; },
    onError: (e) => toast.error(messageErreur(e)),
  });
  const deconnecter = useMutation({
    mutationFn: () => apiDelete<EtatPaiements>("/copilote/paiements/connect"),
    onSuccess: (d) => { maj(d); toast.success("Compte Mollie délié"); },
    onError: (e) => toast.error(messageErreur(e)),
  });
  const retour = params.get("mollie");
  useEffect(() => {
    if (!retour) return;
    if (retour === "connecte") toast.success("Ton compte Mollie est relié : tes ventes arrivent directement chez toi.");
    else toast.error(retour === "sans-profil" ? "Ton compte Mollie n'a pas encore de profil de paiement." : "Connexion Mollie annulée.");
    params.delete("mollie"); setParams(params, { replace: true });
  }, [retour]); // eslint-disable-line react-hooks/exhaustive-deps

  const d = q.data;
  if (!d) return <Carte testId="tunnels-paiements"><Loader2 className="size-5 animate-spin" /></Carte>;
  const t = d.totaux;
  return (
    <Carte testId="tunnels-paiements">
      <SurTitre className="flex items-center gap-1.5"><CreditCard className="size-3.5" /> Paiement en ligne de tes tunnels</SurTitre>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Encaisser directement dans le tunnel</p>
          <p className="text-xs text-slate-500">Les boutons « Oui » ouvrent le paiement sécurisé Mollie quand l'offre a un prix.</p>
        </div>
        <button type="button" role="switch" aria-checked={d.en_ligne} disabled={reglages.isPending || d.mode === "aucun"} onClick={() => reglages.mutate({ en_ligne: !d.en_ligne })} data-testid="paiements-en-ligne-switch"
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${d.en_ligne ? "bg-[#dec2a3]" : "bg-slate-300"}`}>
          <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${d.en_ligne ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600" data-testid="paiements-mode">{MODE[d.mode]}</p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center" data-testid="paiements-totaux">
        <div><p className="text-[11px] text-slate-500">Ventes</p><p className="tabular-nums font-semibold text-slate-900" data-testid="paiements-brut">{eur(t.brut)}</p></div>
        <div><p className="text-[11px] text-slate-500">Commission ({d.taux} %{d.plafond ? `, max ${d.plafond} €` : ""})</p><p className="tabular-nums font-semibold text-slate-900" data-testid="paiements-commission">{eur(t.commission)}</p></div>
        <div><p className="text-[11px] text-slate-500">Pour toi</p><p className="tabular-nums font-semibold text-slate-900" data-testid="paiements-net">{eur(t.net)}</p></div>
      </div>
      <p className="mt-1 text-[11px] text-slate-500" data-testid="paiements-bareme">Offre {d.offre} · Rêveur 10 % (max 49 €) · Solo 5 % (max 29 €) · Pro, Équipe, Entreprise 0 %.</p>
      {t.a_reverser > 0 ? <p className="mt-1 text-xs text-slate-600" data-testid="paiements-solde">Reversé : {eur(t.reverse)} · reste à recevoir : <b>{eur(t.solde)}</b></p> : null}

      <div className="mt-4 border-t border-white/10 pt-3">
        {d.connecte ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-700" data-testid="paiements-mollie-relie">Compte Mollie relié{d.organisation ? ` : ${d.organisation}` : ""} ✓</p>
            <Button size="sm" variant="outline" onClick={() => deconnecter.mutate()} disabled={deconnecter.isPending} data-testid="paiements-mollie-delier"><Unlink className="size-4" /> Délier</Button>
          </div>
        ) : d.connect_disponible ? (
          <Button size="sm" onClick={() => connecter.mutate()} disabled={connecter.isPending} data-testid="paiements-mollie-relier">
            {connecter.isPending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Relier mon compte Mollie (recommandé)
          </Button>
        ) : null}
        {!d.connecte ? (
          <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); reglages.mutate({ en_ligne: d.en_ligne, iban, titulaire }); }}>
            <p className="text-xs text-slate-500 sm:col-span-2">IBAN de reversement {d.iban ? `(actuel : ${d.iban})` : "(pour recevoir tes ventes encaissées par Zayado)"}</p>
            <div className="space-y-1"><Label className="text-xs">Titulaire</Label><Input value={titulaire || d.titulaire} onChange={(e) => setTitulaire(e.target.value)} placeholder="Nom du titulaire" data-testid="paiements-titulaire" /></div>
            <div className="space-y-1"><Label className="text-xs">IBAN</Label><Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="FR76 …" data-testid="paiements-iban" /></div>
            <Button size="sm" type="submit" variant="outline" className="sm:col-span-2 sm:justify-self-start" disabled={reglages.isPending || !iban} data-testid="paiements-iban-enregistrer">Enregistrer l'IBAN</Button>
          </form>
        ) : null}
      </div>

      {d.ventes.length ? (
        <ul className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-xs" data-testid="paiements-ventes">
          {d.ventes.slice(0, 8).map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2" data-testid={`paiements-vente-${v.id}`}>
              <span className="truncate text-slate-700">{v.client_nom} · {v.libelle}</span>
              <span className="shrink-0 tabular-nums text-slate-900">{eur(v.montant)} <span className="text-slate-500">· {STATUT[v.statut]}</span></span>
            </li>
          ))}
        </ul>
      ) : null}
    </Carte>
  );
}
