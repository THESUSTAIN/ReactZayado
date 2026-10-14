/* Point d'entrée unique des écrans du Copilote — toutes les données passent par le
   backend (préfixe /api/copilote, base SQL du backend déployé). Plus aucun stockage navigateur. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";
import type {
  ActionFaiteOut,
  ActionPlan,
  CheckinEnergieOut,
  CollecteOut,
  ContactTunnel,
  EcarterOut,
  EtapePipeline,
  FicheDetail,
  FicheEntreprise,
  PropositionTunnel,
  ModeRadar,
  ModeleUpsell,
  ObjectifPlan,
  PlacementUpsell,
  PlanVue,
  PrendreOut,
  ProcessusPlan,
  Profil,
  ProfilIn,
  Prospect,
  RadarVue,
  Reglages,
  Signal,
  SignalManuelIn,
  SupprimeOut,
  Tunnel,
  TunnelIn,
  TunnelPatch,
  TypeUpsell,
  Victoire,
  VisionGlobale,
} from "@/zayado/types";

export interface Rituel {
  id: string;
  titre: string;
  fait: boolean;
}

const P = "/copilote";

export const z = {
  profil: () => apiGet<Profil | null>(`${P}/profil`),
  enregistrerProfil: (b: ProfilIn) => apiPut<Profil>(`${P}/profil`, b),
  changerOffre: (offre: Profil["offre"]) => apiPatch<Profil>(`${P}/profil/offre`, { offre }),
  reinitialiser: () => apiDelete<{ ok: boolean }>(`${P}/profil`),
  visionGlobale: () => apiGet<VisionGlobale>(`${P}/vision/globale`),
  checkinEnergie: (niveau: number) => apiPost<CheckinEnergieOut>(`${P}/bien-etre/energie`, { niveau }),
  actionFaite: (id: string) => apiPatch<ActionFaiteOut>(`${P}/plan-action/${id}/fait`),
  definirPriorite: (id: string) => apiPatch<ActionFaiteOut>(`${P}/plan-action/${id}/priorite`),
  ajouterVictoire: (texte: string) => apiPost<Victoire>(`${P}/victoires`, { texte }),
  rituels: () => apiGet<Rituel[]>(`${P}/bien-etre/rituels`),
  ajouterRituel: (titre: string) => apiPost<Rituel>(`${P}/bien-etre/rituels`, { titre }),
  basculerRituel: (id: string) => apiPost<Rituel>(`${P}/bien-etre/rituels/${id}/basculer`),
  planVue: () => apiGet<PlanVue>(`${P}/plan-action/vue`),
  ajouterActionPlan: (titre: string) => apiPost<ActionPlan>(`${P}/plan-action/actions`, { titre }),
  supprimerAction: (id: string) => apiDelete<SupprimeOut>(`${P}/plan-action/actions/${id}`),
  ajouterObjectif: (b: { titre: string; cible: number; unite: string }) => apiPost<ObjectifPlan>(`${P}/plan-action/objectifs`, b),
  avancerObjectif: (id: string, atteint: number) => apiPatch<ObjectifPlan>(`${P}/plan-action/objectifs/${id}`, { atteint }),
  ajouterProcessus: (b: { titre: string; rythme: string }) => apiPost<ProcessusPlan>(`${P}/plan-action/processus`, b),
  basculerProcessus: (id: string) => apiPost<ProcessusPlan>(`${P}/plan-action/processus/${id}/basculer`),
  radarVue: (mode: ModeRadar) => apiGet<RadarVue>(`${P}/radar/vue?mode=${mode}`),
  prendre: (id: string) => apiPost<PrendreOut>(`${P}/radar/signaux/${id}/prendre`),
  ecarter: (id: string) => apiPost<EcarterOut>(`${P}/radar/signaux/${id}/ecarter`),
  opposition: (valeur: string) => apiPost<EcarterOut>(`${P}/radar/opposition`, { valeur }),
  listeOpposition: () => apiGet<{ valeur: string; ajoute_le: string }[]>(`${P}/radar/opposition`),
  changerEtape: (id: string, etape: EtapePipeline) => apiPatch<Prospect>(`${P}/radar/prospects/${id}`, { etape }),
  majReglages: (b: Partial<Reglages>) => apiPut<Reglages>(`${P}/radar/reglages`, b),
  definirObjectifRadar: (clients_vises: number) => apiPut<{ clients_vises: number } | null>(`${P}/pilotage/objectif`, { clients_vises }),
  signalManuel: (b: SignalManuelIn) => apiPost<Signal>(`${P}/radar/signaux`, b),
  collecter: (mode: ModeRadar) => apiPost<CollecteOut>(`${P}/radar/collecter?mode=${mode}`),
  fiche: (q: string) => apiGet<FicheEntreprise[]>(`${P}/radar/fiche?q=${encodeURIComponent(q)}`),
  detailEntreprise: (siren: string) => apiGet<FicheDetail>(`${P}/radar/entreprise/${siren}`),
  propositionTunnel: (id: string) => apiPost<PropositionTunnel>(`${P}/tunnels/${id}/proposition`),
  modelesUpsell: () => apiGet<ModeleUpsell[]>(`${P}/tunnels/modeles`),
  tunnels: () => apiGet<Tunnel[]>(`${P}/tunnels`),
  tunnel: (id: string) => apiGet<Tunnel>(`${P}/tunnels/${id}`),
  creerTunnel: (b: TunnelIn) => apiPost<Tunnel>(`${P}/tunnels`, b),
  majTunnel: (id: string, patch: TunnelPatch) => apiPatch<Tunnel>(`${P}/tunnels/${id}`, patch),
  appliquerModele: (id: string, b: { type: TypeUpsell; placement: PlacementUpsell }) => apiPost<Tunnel>(`${P}/tunnels/${id}/upsell/modele`, b),
  programmerLancement: (id: string, ouverture: string) => apiPost<Tunnel>(`${P}/tunnels/${id}/lancement`, { ouverture }),
  supprimerTunnel: (id: string) => apiDelete<SupprimeOut>(`${P}/tunnels/${id}`),
  contactTunnel: (id: string, b: { nom: string; email: string }) => apiPost<ContactTunnel>(`${P}/tunnels/${id}/contacts`, b),
};

export function messageErreur(e: unknown): string {
  if (e instanceof ApiError) {
    const d = (e.body as { detail?: unknown } | null)?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return "Champs invalides";
  }
  return "Une erreur est survenue";
}

// Toutes les clés commencent par "z" : une écriture rafraîchit tout l'espace (les modules sont liés).
export const useProfil = () => useQuery({ queryKey: ["z", "profil"], queryFn: () => z.profil() });

export function useZMutation<V, R>(fn: (v: V) => Promise<R>, ok?: string | ((r: R) => string)) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["z"] });
      if (ok) toast.success(typeof ok === "function" ? ok(r) : ok);
    },
    onError: (e) => toast.error(messageErreur(e)),
  });
}
