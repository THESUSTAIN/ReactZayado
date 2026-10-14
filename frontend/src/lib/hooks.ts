import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPatch, apiPost, errorMessage } from "@/lib/api";
import type {
  Aujourdhui, CellValue, ChronoEtat, ChronoStart, Commentaire, CommentaireIn, EspaceParams, Modele, Page, PageCreate,
  PageUpdate, ParamsUpdate, Row, Source,
} from "@/lib/types";

const onError = (e: unknown) => toast.error(errorMessage(e));

export const useSources = () => useQuery({ queryKey: ["sources"], queryFn: () => apiGet<Source[]>("/sources") });
export const usePages = () => useQuery({ queryKey: ["pages"], queryFn: () => apiGet<Page[]>("/pages") });
export const useModeles = () => useQuery({ queryKey: ["modeles"], queryFn: () => apiGet<Modele[]>("/modeles") });
export const useEspaceParams = () => useQuery({ queryKey: ["espace-params"], queryFn: () => apiGet<EspaceParams>("/espace/parametres") });
export const useAujourdhui = () => useQuery({ queryKey: ["espace-aujourdhui"], queryFn: () => apiGet<Aujourdhui>("/espace/aujourdhui") });
export const useChrono = () => useQuery({ queryKey: ["espace-chrono"], queryFn: () => apiGet<ChronoEtat>("/espace/chrono") });

export const useSource = (id: string | undefined) =>
  useQuery({ queryKey: ["source", id], queryFn: () => apiGet<Source>(`/sources/${id}`), enabled: !!id });

export const useRows = (id: string | undefined) =>
  useQuery({ queryKey: ["rows", id], queryFn: () => apiGet<Row[]>(`/sources/${id}/rows`), enabled: !!id });

export const useCommentaires = (sourceId: string | undefined) =>
  useQuery({ queryKey: ["commentaires", sourceId], queryFn: () => apiGet<Commentaire[]>(`/sources/${sourceId}/commentaires`), enabled: !!sourceId });

export function useCommenter(sourceId: string, rowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CommentaireIn) => apiPost<Commentaire>(`/sources/${sourceId}/rows/${rowId}/commentaires`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commentaires", sourceId] }),
    onError,
  });
}

function useInvalidateSource(sourceId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["rows", sourceId] });
    qc.invalidateQueries({ queryKey: ["sources"] });
    qc.invalidateQueries({ queryKey: ["source", sourceId] });
    qc.invalidateQueries({ queryKey: ["espace-aujourdhui"] });
  };
}

export function useRowMutations(sourceId: string) {
  const invalidate = useInvalidateSource(sourceId);
  const create = useMutation({
    mutationFn: (data: Record<string, CellValue>) => apiPost<Row>(`/sources/${sourceId}/rows`, { data }),
    onSuccess: () => {
      invalidate();
      toast.success("Ligne ajoutée dans le classeur");
    },
    onError,
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, CellValue> }) => apiPatch<Row>(`/sources/${sourceId}/rows/${id}`, { data }),
    onSuccess: () => {
      invalidate();
      toast.success("Modification écrite dans le classeur");
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/sources/${sourceId}/rows/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success("Ligne supprimée du classeur");
    },
    onError,
  });
  return { create, update, remove };
}

export function useSync(sourceId: string) {
  const invalidate = useInvalidateSource(sourceId);
  return useMutation({
    mutationFn: () => apiPost<Source>(`/sources/${sourceId}/sync`, {}),
    onSuccess: () => {
      invalidate();
      toast.success("Relu depuis le classeur");
    },
    onError,
  });
}

export function usePageMutations() {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: ["pages"] });
    qc.invalidateQueries({ queryKey: ["modeles"] });
  };
  const create = useMutation({
    mutationFn: (body: PageCreate) => apiPost<Page>("/pages", body),
    onSuccess: () => {
      done();
      toast.success("Page créée");
    },
    onError,
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: PageUpdate }) => apiPatch<Page>(`/pages/${id}`, body),
    onSuccess: () => {
      done();
      toast.success("Page enregistrée");
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/pages/${id}`),
    onSuccess: () => {
      done();
      toast.success("Page retirée (le classeur n'est pas modifié)");
    },
    onError,
  });
  return { create, update, remove };
}

export function useEspaceMutations() {
  const qc = useQueryClient();
  const tout = () => ["sources", "pages", "modeles", "espace-params", "espace-aujourdhui"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const installer = useMutation({
    mutationFn: (id: string) => apiPost<Page>(`/modeles/${id}/installer`, {}),
    onSuccess: (p) => {
      tout();
      toast.success(`Page « ${p.name} » prête, branchée sur le classeur`);
    },
    onError,
  });
  const delier = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/sources/${id}`),
    onSuccess: () => {
      tout();
      toast.success("Source déliée : rien n'a été supprimé dans le classeur");
    },
    onError,
  });
  const reglages = useMutation({
    mutationFn: (body: ParamsUpdate) => apiPatch<EspaceParams>("/espace/parametres", body),
    onSuccess: () => {
      tout();
      toast.success("Réglage enregistré");
    },
    onError,
  });
  return { installer, delier, reglages };
}

export function useChronoMutations(sourceId: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidateSource(sourceId);
  const etat = () => qc.invalidateQueries({ queryKey: ["espace-chrono"] });
  const demarrer = useMutation({ mutationFn: (b: ChronoStart) => apiPost<ChronoEtat>("/espace/chrono/demarrer", b), onSuccess: etat, onError });
  const arreter = useMutation({
    mutationFn: () => apiPost<Row>("/espace/chrono/arreter", {}),
    onSuccess: () => {
      etat();
      invalidate();
      toast.success("Temps enregistré dans le classeur");
    },
    onError,
  });
  const annuler = useMutation({ mutationFn: () => apiDelete<{ ok: boolean }>("/espace/chrono"), onSuccess: etat, onError });
  return { demarrer, arreter, annuler };
}
