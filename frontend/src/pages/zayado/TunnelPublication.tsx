import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, ExternalLink, ImagePlus, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { messageErreur } from "@/zayado/api";
import { Carte, SurTitre } from "@/zayado/ui";
import type { Tunnel } from "@/zayado/types";

/* Publication d'un tunnel : mentions légales de l'entreprise de l'utilisateur (obligatoires
   avant la mise en ligne), référencement (titre, description, image de partage) et adresse publique. */

export type Editeur = {
  raison_sociale: string; forme_juridique: string; siren: string; adresse: string; email: string;
  telephone: string; responsable: string; tva: string; mediateur: string; complet?: boolean;
};

const CHAMPS: [keyof Editeur, string, string, boolean][] = [
  ["raison_sociale", "Raison sociale ou nom", "Ex. Atelier Dupont", true],
  ["forme_juridique", "Forme juridique", "Ex. EI, SASU, SARL", false],
  ["siren", "SIREN / SIRET", "9 ou 14 chiffres", true],
  ["adresse", "Adresse du siège", "Rue, code postal, ville", true],
  ["email", "E-mail de contact", "contact@…", true],
  ["telephone", "Téléphone", "Facultatif", false],
  ["responsable", "Responsable de la publication", "Prénom Nom", false],
  ["tva", "TVA", "N° de TVA, ou « TVA non applicable, art. 293 B du CGI »", false],
  ["mediateur", "Médiateur de la consommation", "Si tu vends à des particuliers", false],
];

export function useEditeur() {
  return useQuery({ queryKey: ["z", "editeur"], queryFn: () => apiGet<Editeur>("/copilote/editeur") });
}

export function MentionsEditeur({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const q = useEditeur();
  const [f, setF] = useState<Editeur | null>(null);
  const v = f ?? q.data ?? null;
  const enregistrer = useMutation({
    mutationFn: (e: Editeur) => apiPut<Editeur>("/copilote/editeur", e),
    onSuccess: () => { setF(null); toast.success("Mentions légales enregistrées"); qc.invalidateQueries({ queryKey: ["z"] }); },
    onError: (e) => toast.error(messageErreur(e)),
  });
  if (!v) return null;
  return (
    <Carte testId="tunnel-mentions">
      <SurTitre className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" /> Les mentions légales de ton entreprise</SurTitre>
      <p className="mt-1 text-xs text-slate-500">
        Elles s'affichent en bas de tes pages publiques (mentions légales et confidentialité). Obligatoires avant de publier un tunnel.
        {v.complet ? " ✓ Complètes." : ""}
      </p>
      {!compact || !v.complet ? (
        <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); enregistrer.mutate(v); }}>
          {CHAMPS.map(([k, l, ph, req]) => (
            <div key={k} className={k === "adresse" || k === "mediateur" || k === "tva" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
              <Label className="text-xs font-semibold text-slate-600">{l}{req ? " *" : ""}</Label>
              <Input value={String(v[k] ?? "")} placeholder={ph} required={req} onChange={(ev) => setF({ ...v, [k]: ev.target.value })} data-testid={`editeur-${k}`} />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={enregistrer.isPending} data-testid="editeur-enregistrer">Enregistrer mes mentions</Button>
          </div>
        </form>
      ) : null}
    </Carte>
  );
}

function lireImage(fichier: File): Promise<string> {
  return new Promise((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result || ""));
    r.onerror = () => ko(new Error("Lecture impossible"));
    r.readAsDataURL(fichier);
  });
}

export function PublicationCarte({ t }: { t: Tunnel }) {
  const qc = useQueryClient();
  const seo0 = t.seo ?? {};
  const [seo, setSeo] = useState({ titre: seo0.titre ?? "", description: seo0.description ?? "", image: seo0.image ?? "" });
  const champImage = useRef<HTMLInputElement>(null);
  const enregistrer = useMutation({
    mutationFn: () => apiPut<Tunnel>(`/copilote/tunnels/${t.id}/seo`, seo),
    onSuccess: () => { toast.success("Référencement enregistré"); qc.invalidateQueries({ queryKey: ["z"] }); },
    onError: (e) => toast.error(messageErreur(e)),
  });
  const envoyer = useMutation({
    mutationFn: async (fichier: File) => apiPost<{ url: string }>("/copilote/tunnels/images", { data: await lireImage(fichier) }),
    onSuccess: (r) => { setSeo((s) => ({ ...s, image: r.url })); toast.success("Image ajoutée — pense à enregistrer"); },
    onError: (e) => toast.error(messageErreur(e)),
  });
  const origine = typeof window !== "undefined" ? window.location.origin : "";
  const url = t.slug ? `${origine}/t/${t.slug}` : "";
  const partage = t.slug ? `${origine}/api/public/t/${t.slug}/partage` : "";
  const copier = (txt: string) => navigator.clipboard?.writeText(txt).then(() => toast.success("Lien copié")).catch(() => toast.error("Copie impossible"));

  return (
    <Carte testId="tunnel-publication">
      <SurTitre>Référencement et partage</SurTitre>
      <p className="mt-1 text-xs text-slate-500">Ce qui s'affiche dans Google et quand tu partages ton lien (WhatsApp, LinkedIn, Facebook).</p>
      <div className="mt-3 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">Titre ({seo.titre.length}/70)</Label>
          <Input maxLength={70} value={seo.titre} placeholder={t.etapes[0]?.titre} onChange={(e) => setSeo({ ...seo, titre: e.target.value })} data-testid="seo-titre" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">Description ({seo.description.length}/170)</Label>
          <Textarea maxLength={170} rows={2} value={seo.description} placeholder={t.etapes[0]?.accroche} onChange={(e) => setSeo({ ...seo, description: e.target.value })} data-testid="seo-description" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {seo.image ? <img src={seo.image} alt="Image de partage" className="h-16 w-28 rounded-lg border border-white/15 object-cover" /> : null}
          <input ref={champImage} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) envoyer.mutate(f); e.target.value = ""; }} data-testid="seo-image-input" />
          <Button type="button" variant="outline" size="sm" onClick={() => champImage.current?.click()} disabled={envoyer.isPending} data-testid="seo-image-bouton">
            {envoyer.isPending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {seo.image ? "Changer l'image" : "Ajouter une image (1200×630 conseillé)"}
          </Button>
        </div>
        <Button size="sm" onClick={() => enregistrer.mutate()} disabled={enregistrer.isPending} data-testid="seo-enregistrer">Enregistrer le référencement</Button>
      </div>
      {t.slug ? (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-3 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Adresse publique</span>
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#dec2a3] underline" data-testid="tunnel-url-publique">{url} <ExternalLink className="size-3.5" /></a>
            <button type="button" onClick={() => copier(url)} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"><Copy className="size-3.5" /> Copier</button>
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Lien à partager sur les réseaux</span>
            <button type="button" onClick={() => copier(partage)} className="inline-flex items-center gap-1 text-xs text-[#dec2a3] hover:underline" data-testid="tunnel-lien-partage"><Copy className="size-3.5" /> Copier le lien avec aperçu</button>
          </p>
        </div>
      ) : null}
    </Carte>
  );
}

export function usePublier(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<{ url: string }>(`/copilote/tunnels/${id}/publier`),
    onSuccess: (r) => { toast.success("Ton tunnel est en ligne", { description: r.url }); qc.invalidateQueries({ queryKey: ["z"] }); qc.invalidateQueries({ queryKey: ["cercle"] }); },
    onError: (e) => toast.error(messageErreur(e)),
  });
}

