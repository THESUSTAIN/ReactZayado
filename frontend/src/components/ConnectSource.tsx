import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSpreadsheet, FlaskConical, ListOrdered, Lock, Search, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet, apiPost, errorMessage } from "@/lib/api";
import type { Source, SourceConnect } from "@/lib/types";

interface FichierDrive {
  id: string;
  nom: string;
  url: string | null;
}

const AIDE: Record<string, string> = {
  "google-sheets": "https://docs.google.com/spreadsheets/d/…",
  "ms-lists": "https://<entreprise>.sharepoint.com/sites/<site>/Lists/<liste>/AllItems.aspx",
  excel: "Lien de partage OneDrive / SharePoint du classeur .xlsx",
  test: "test://atelier",
};

function UrlForm({ kind, pending, onConnect }: { kind: SourceConnect["kind"]; pending: boolean; onConnect: (b: SourceConnect) => void }) {
  const [url, setUrl] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onConnect({ kind, url: url.trim() });
      }}
      data-testid={`connect-${kind}-form`}
    >
      <Label className="text-xs font-semibold text-slate-600">Adresse</Label>
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={AIDE[kind]} className="bg-white font-mono text-xs" required data-testid={`connect-${kind}-url-input`} />
      <Button type="submit" disabled={pending || !url.trim()} className="w-full" data-testid={`connect-${kind}-submit-button`}>
        {pending ? "Connexion…" : "Relier"}
      </Button>
    </form>
  );
}

function ExcelPicker({ pending, onConnect }: { pending: boolean; onConnect: (b: SourceConnect) => void }) {
  const [q, setQ] = useState("");
  const chercher = useMutation({
    mutationFn: () => apiGet<{ fichiers: FichierDrive[] }>(`/entreprise/source/fichiers?fournisseur=microsoft&q=${encodeURIComponent(q)}`),
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom du classeur (facultatif)" className="bg-white" data-testid="connect-excel-search-input" />
        <Button variant="outline" onClick={() => chercher.mutate()} disabled={chercher.isPending} data-testid="connect-excel-search-button">
          <Search className="size-4" /> Chercher
        </Button>
      </div>
      {chercher.data && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200" data-testid="connect-excel-results">
          {chercher.data.fichiers.map((f) => (
            <li key={f.id}>
              <button type="button" disabled={pending} onClick={() => onConnect({ kind: "excel", fichier_id: f.id })} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-800 hover:bg-slate-50" data-testid={`connect-excel-file-${f.id}`}>
                <FileSpreadsheet className="size-4 text-[#107C41]" /> {f.nom}
              </button>
            </li>
          ))}
          {!chercher.data.fichiers.length && <li className="px-3 py-2.5 text-sm text-slate-500">Aucun classeur Excel trouvé dans le OneDrive du dirigeant.</li>}
        </ul>
      )}
      <p className="text-xs text-slate-500">Ou colle le lien de partage du classeur :</p>
      <UrlForm kind="excel" pending={pending} onConnect={onConnect} />
    </div>
  );
}

/** Relier les vraies bases de l'entreprise. Lecture ET écriture se font dans le fichier du client : rien n'est simulé. */
export default function ConnectSource({ test, onglet, sansOnglets = false }: { test: boolean; onglet?: "google" | "excel" | "mslists"; sansOnglets?: boolean }) {
  const qc = useQueryClient();
  const connect = useMutation({
    mutationFn: (body: SourceConnect) => apiPost<Source[]>("/sources/connect", body),
    onSuccess: (list) => {
      ["sources", "espace-params", "modeles"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`${list.length} base(s) reliée(s) : ${list.map((s) => s.onglet || s.name).join(", ")}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const go = (b: SourceConnect) => connect.mutate(b);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6" data-testid="connect-source-panel">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-base font-semibold text-slate-900">Relier une base de l'entreprise</h2>
          <p className="text-sm text-slate-500">Chaque onglet (ou liste) devient une base. Les modifications faites dans Zayado sont écrites dans ton fichier.</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          <Lock className="size-3" /> Avec le compte du dirigeant
        </span>
      </div>
      <Tabs key={onglet ?? "google"} defaultValue={onglet ?? "google"}>
        <TabsList className={sansOnglets ? "hidden" : "mb-4 flex-wrap"}>
          <TabsTrigger value="google" data-testid="connect-tab-google"><Table2 className="size-4 text-[#0F9D58]" /> Google Sheets</TabsTrigger>
          <TabsTrigger value="excel" data-testid="connect-tab-excel"><FileSpreadsheet className="size-4 text-[#107C41]" /> Excel (OneDrive)</TabsTrigger>
          <TabsTrigger value="mslists" data-testid="connect-tab-mslists"><ListOrdered className="size-4 text-[#008272]" /> Microsoft Lists</TabsTrigger>
          {test && <TabsTrigger value="test" data-testid="connect-tab-test"><FlaskConical className="size-4 text-slate-500" /> Test</TabsTrigger>}
        </TabsList>
        <TabsContent value="google">
          <UrlForm kind="google-sheets" pending={connect.isPending} onConnect={go} />
          <p className="mt-3 text-xs text-slate-500">Le classeur doit avoir été créé par Zayado (installation de la base) ou ouvert une fois avec Zayado depuis Google Drive.</p>
        </TabsContent>
        <TabsContent value="excel">
          <ExcelPicker pending={connect.isPending} onConnect={go} />
        </TabsContent>
        <TabsContent value="mslists">
          <UrlForm kind="ms-lists" pending={connect.isPending} onConnect={go} />
          <p className="mt-3 text-xs text-slate-500">Microsoft Lists demande l'autorisation « Sites » (SharePoint), accordée par l'administrateur Microsoft 365 de l'entreprise.</p>
        </TabsContent>
        {test && (
          <TabsContent value="test">
            <UrlForm kind="test" pending={connect.isPending} onConnect={go} />
            <p className="mt-3 text-xs text-amber-700">Environnement de test uniquement : classeur rangé dans la base locale, jamais disponible en production.</p>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
