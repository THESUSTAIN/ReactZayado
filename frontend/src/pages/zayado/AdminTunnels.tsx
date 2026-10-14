import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Code2, ExternalLink, Loader2, RotateCcw, Save } from "lucide-react";
import { apiDelete, apiGet, apiPut } from "@/lib/api";
import { messageErreur } from "@/zayado/api";
import { BLOCS_CODE, insererBloc } from "@/pages/zayado/blocsCode";
import type { CodeTunnel, Downsell, EtapeTunnel, Parcours, Tunnel, Upsell } from "@/zayado/types";

/* Admin › Tunnels : corriger les pages des utilisateurs (textes, prix, option, SEO, code complet)
   et paramétrer les modèles de départ. Miroir de backend/routers/admin_tunnels.py. */

export type LigneTunnelAdmin = {
  owner: string; id: string; nom: string; etat: string; parcours: Parcours; slug: string | null; cree_le: string;
  code_perso: boolean; email: string; offre: string;
};
type TunnelAdmin = Tunnel & { code: CodeTunnel; seo: { titre?: string; description?: string; image?: string } };
type ModeleTunnel = { personnalise: boolean; etapes: EtapeTunnel[]; code: CodeTunnel };
type Modeles = Record<Parcours, ModeleTunnel>;

const CODE_VIDE: CodeTunnel = { head: "", css: "", html_haut: "", html_bas: "", js: "" };
const CHAMPS_CODE: [keyof CodeTunnel, string, string][] = [
  ["head", "Balises <head>", "Scripts de suivi (Meta Pixel, Google Tag…), balises meta, polices. HTML complet, <script> exécutés."],
  ["css", "CSS", "Styles ajoutés à la page (ex. .tp-titre { color: #0D1F38 })."],
  ["html_haut", "HTML en haut de page", "Bandeau, vidéo, témoignages… affiché avant le tunnel."],
  ["html_bas", "HTML en bas de page", "Bloc affiché après le tunnel (FAQ, garanties…)."],
  ["js", "JavaScript", "Exécuté après le chargement de la page."],
];
const NOMS_ETAPES: Record<string, string> = { capture: "1 · Capture", remerciement: "2 · Merci + offre de démarrage", vente: "3 · Page de vente", upsell: "4 · Option" };
const OFFRES: Record<string, string> = { essentielle: "Rêveur", reveur: "Rêveur", serenite: "Solo", pro: "Pro", business: "Équipe", entreprise: "Entreprise" };
const champ = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/60 focus:outline-none";
const mono = `${champ} font-mono text-xs leading-relaxed`;
const btn = "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50";

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-[11px] font-semibold uppercase tracking-wide text-offwhite/55">{label}</span>{children}</label>;
}

function EditeurEtapes({ etapes, onChange, prefixe }: { etapes: EtapeTunnel[]; onChange: (e: EtapeTunnel[]) => void; prefixe: string }) {
  const maj = (i: number, k: keyof EtapeTunnel, v: string) =>
    onChange(etapes.map((e, j) => (j === i ? { ...e, [k]: k === "prix" ? (v === "" ? null : Number(v)) : v } : e)));
  return (
    <div className="space-y-4">
      {etapes.map((e, i) => (
        <div key={e.cle} className="rounded-2xl border border-white/10 p-4" data-testid={`${prefixe}-etape-${e.cle}`}>
          <p className="mb-3 text-sm font-semibold text-gold">{NOMS_ETAPES[e.cle] ?? e.cle}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Champ label="Titre"><input className={champ} value={e.titre} onChange={(x) => maj(i, "titre", x.target.value)} data-testid={`${prefixe}-${e.cle}-titre`} /></Champ>
            <Champ label="Bouton"><input className={champ} value={e.bouton} onChange={(x) => maj(i, "bouton", x.target.value)} data-testid={`${prefixe}-${e.cle}-bouton`} /></Champ>
            <div className="md:col-span-2"><Champ label="Accroche"><input className={champ} value={e.accroche} onChange={(x) => maj(i, "accroche", x.target.value)} data-testid={`${prefixe}-${e.cle}-accroche`} /></Champ></div>
            <div className="md:col-span-2"><Champ label="Contenu"><textarea rows={4} className={champ} value={e.contenu} onChange={(x) => maj(i, "contenu", x.target.value)} data-testid={`${prefixe}-${e.cle}-contenu`} /></Champ></div>
            <Champ label="Nom de l'offre"><input className={champ} value={e.offre_nom} onChange={(x) => maj(i, "offre_nom", x.target.value)} data-testid={`${prefixe}-${e.cle}-offre`} /></Champ>
            <Champ label="Prix (€)"><input type="number" min={0} step="0.01" className={champ} value={e.prix ?? ""} onChange={(x) => maj(i, "prix", x.target.value)} data-testid={`${prefixe}-${e.cle}-prix`} /></Champ>
          </div>
        </div>
      ))}
    </div>
  );
}

function EditeurCode({ code, onChange, prefixe }: { code: CodeTunnel; onChange: (c: CodeTunnel) => void; prefixe: string }) {
  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-gold/10 px-3 py-2 text-xs text-offwhite/80">Code injecté tel quel sur la page publique. Réservé à l'admin : vérifiez-le avant d'enregistrer, un script cassé peut casser la page.</p>
      <div className="rounded-2xl border border-white/10 p-3" data-testid={`${prefixe}-bibliotheque`}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-offwhite/55">Bibliothèque — insérer en un clic</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {BLOCS_CODE.map((b) => (
            <button key={b.cle} type="button" title={b.description} onClick={() => { onChange(insererBloc(code, b)); toast.success(`« ${b.nom} » inséré — ${b.description}`); }}
              className={`${btn} bg-white/5 text-offwhite/85 hover:bg-gold hover:text-navy-900`} data-testid={`${prefixe}-bloc-${b.cle}`}>+ {b.nom}</button>
          ))}
        </div>
      </div>
      {CHAMPS_CODE.map(([k, l, aide]) => (
        <Champ key={k} label={l}>
          <textarea rows={k === "css" || k === "js" ? 8 : 5} spellCheck={false} className={mono} value={code[k]} placeholder={aide}
            onChange={(x) => onChange({ ...code, [k]: x.target.value })} data-testid={`${prefixe}-code-${k}`} />
        </Champ>
      ))}
    </div>
  );
}

function Onglets<T extends string>({ valeur, options, onChange, prefixe }: { valeur: T; options: [T, string][]; onChange: (v: T) => void; prefixe: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)} data-testid={`${prefixe}-onglet-${v}`}
          className={`${btn} ${valeur === v ? "bg-gold text-navy-900" : "bg-white/5 text-offwhite/75 hover:bg-white/10"}`}>{l}</button>
      ))}
    </div>
  );
}

function EditeurTunnel({ ligne, retour }: { ligne: LigneTunnelAdmin; retour: () => void }) {
  const qc = useQueryClient();
  const cle = ["admin", "tunnel", ligne.owner, ligne.id];
  const q = useQuery({ queryKey: cle, queryFn: () => apiGet<TunnelAdmin>(`/admin/tunnels/${ligne.owner}/${ligne.id}`) });
  const [t, setT] = useState<TunnelAdmin | null>(null);
  const [onglet, setOnglet] = useState<"pages" | "option" | "seo" | "code">("pages");
  useEffect(() => { if (q.data) setT(q.data); }, [q.data]);
  const sauver = useMutation({
    mutationFn: (x: TunnelAdmin) => apiPut<TunnelAdmin>(`/admin/tunnels/${ligne.owner}/${ligne.id}`,
      { nom: x.nom, etapes: x.etapes, upsell: x.upsell, downsell: x.downsell, seo: { titre: "", description: "", image: "", ...x.seo }, code: x.code }),
    onSuccess: (d) => { qc.setQueryData(cle, d); qc.invalidateQueries({ queryKey: ["admin", "tunnels"] }); toast.success("Tunnel corrigé et en ligne"); },
    onError: (e) => toast.error(messageErreur(e)),
  });
  if (!t) return <Loader2 className="animate-spin text-gold" />;
  const up = (p: Partial<Upsell>) => setT({ ...t, upsell: { ...t.upsell, ...p } });
  const down = (p: Partial<Downsell>) => setT({ ...t, downsell: { ...t.downsell, ...p } });
  return (
    <div className="space-y-4" data-testid="admin-tunnel-editeur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={retour} className={`${btn} bg-white/5 text-offwhite`} data-testid="admin-tunnel-retour"><ArrowLeft className="size-4" /> Tous les tunnels</button>
        <div className="flex gap-2">
          {t.slug ? <a href={`/t/${t.slug}`} target="_blank" rel="noreferrer" className={`${btn} bg-white/5 text-offwhite`} data-testid="admin-tunnel-voir"><ExternalLink className="size-4" /> Voir la page</a> : null}
          <button type="button" onClick={() => sauver.mutate(t)} disabled={sauver.isPending} className={`${btn} bg-gold text-navy-900`} data-testid="admin-tunnel-enregistrer">
            {sauver.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Enregistrer
          </button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
        <Champ label="Nom du tunnel"><input className={champ} value={t.nom} onChange={(x) => setT({ ...t, nom: x.target.value })} data-testid="admin-tunnel-nom" /></Champ>
        <p className="self-end text-xs text-offwhite/60" data-testid="admin-tunnel-proprietaire">{ligne.email} · offre {OFFRES[ligne.offre] ?? ligne.offre} · {t.etat === "en_ligne" ? `en ligne /t/${t.slug}` : "brouillon"}</p>
      </div>
      <Onglets prefixe="admin-tunnel" valeur={onglet} onChange={setOnglet}
        options={[["pages", "Pages"], ["option", "Option & version allégée"], ["seo", "Référencement"], ["code", "Code"]]} />
      {onglet === "pages" && <EditeurEtapes prefixe="admin-tunnel" etapes={t.etapes} onChange={(etapes) => setT({ ...t, etapes })} />}
      {onglet === "option" && (
        <div className="grid gap-3 md:grid-cols-2">
          <Champ label="Option — nom"><input className={champ} value={t.upsell.nom} onChange={(x) => up({ nom: x.target.value })} data-testid="admin-tunnel-upsell-nom" /></Champ>
          <Champ label="Option — prix (€)"><input type="number" className={champ} value={t.upsell.prix ?? ""} onChange={(x) => up({ prix: x.target.value === "" ? null : Number(x.target.value) })} data-testid="admin-tunnel-upsell-prix" /></Champ>
          <div className="md:col-span-2"><Champ label="Option — contenu (une ligne par avantage)"><textarea rows={4} className={champ} value={t.upsell.contenu.join("\n")} onChange={(x) => up({ contenu: x.target.value.split("\n") })} data-testid="admin-tunnel-upsell-contenu" /></Champ></div>
          <Champ label="Bouton « oui »"><input className={champ} value={t.upsell.oui} onChange={(x) => up({ oui: x.target.value })} data-testid="admin-tunnel-upsell-oui" /></Champ>
          <Champ label="Lien « non »"><input className={champ} value={t.upsell.non} onChange={(x) => up({ non: x.target.value })} data-testid="admin-tunnel-upsell-non" /></Champ>
          <Champ label="Version allégée — nom"><input className={champ} value={t.downsell.nom} onChange={(x) => down({ nom: x.target.value })} data-testid="admin-tunnel-downsell-nom" /></Champ>
          <Champ label="Version allégée — prix (€)"><input type="number" className={champ} value={t.downsell.prix ?? ""} onChange={(x) => down({ prix: x.target.value === "" ? null : Number(x.target.value) })} data-testid="admin-tunnel-downsell-prix" /></Champ>
        </div>
      )}
      {onglet === "seo" && (
        <div className="grid gap-3">
          <Champ label="Titre (Google, partage)"><input className={champ} value={t.seo.titre ?? ""} onChange={(x) => setT({ ...t, seo: { ...t.seo, titre: x.target.value } })} data-testid="admin-tunnel-seo-titre" /></Champ>
          <Champ label="Description"><textarea rows={3} className={champ} value={t.seo.description ?? ""} onChange={(x) => setT({ ...t, seo: { ...t.seo, description: x.target.value } })} data-testid="admin-tunnel-seo-description" /></Champ>
          <Champ label="Image de partage (URL)"><input className={champ} value={t.seo.image ?? ""} onChange={(x) => setT({ ...t, seo: { ...t.seo, image: x.target.value } })} data-testid="admin-tunnel-seo-image" /></Champ>
        </div>
      )}
      {onglet === "code" && <EditeurCode prefixe="admin-tunnel" code={{ ...CODE_VIDE, ...t.code }} onChange={(code) => setT({ ...t, code })} />}
    </div>
  );
}

function ModelesTunnels() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "tunnels-modeles"], queryFn: () => apiGet<Modeles>("/admin/tunnels-modeles") });
  const [parcours, setParcours] = useState<Parcours>("produit");
  const [m, setM] = useState<ModeleTunnel | null>(null);
  const [vue, setVue] = useState<"pages" | "code">("pages");
  useEffect(() => { if (q.data) setM(q.data[parcours]); }, [q.data, parcours]);
  const apres = (d: ModeleTunnel, msg: string) => { qc.setQueryData<Modeles>(["admin", "tunnels-modeles"], (x) => (x ? { ...x, [parcours]: d } : x)); setM(d); toast.success(msg); };
  const sauver = useMutation({
    mutationFn: (x: ModeleTunnel) => apiPut<ModeleTunnel>(`/admin/tunnels-modeles/${parcours}`, { etapes: x.etapes, code: x.code }),
    onSuccess: (d) => apres(d, "Modèle enregistré : les prochains tunnels partiront de celui-ci"), onError: (e) => toast.error(messageErreur(e)),
  });
  const reset = useMutation({
    mutationFn: () => apiDelete<ModeleTunnel>(`/admin/tunnels-modeles/${parcours}`),
    onSuccess: (d) => apres(d, "Modèle d'origine rétabli"), onError: (e) => toast.error(messageErreur(e)),
  });
  if (!m) return <Loader2 className="animate-spin text-gold" />;
  return (
    <div className="space-y-4" data-testid="admin-tunnels-modeles">
      <p className="text-sm text-offwhite/75">Point de départ de chaque nouveau tunnel (toutes offres, Pro compris). Utilisez <code className="text-gold">{"{sujet}"}</code> et <code className="text-gold">{"{metier}"}</code> : ils sont remplacés à la création. Les tunnels existants ne changent pas.</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Onglets prefixe="admin-modele-parcours" valeur={parcours} onChange={setParcours} options={[["produit", "Parcours produit"], ["rendez_vous", "Parcours rendez-vous"]]} />
        <div className="flex gap-2">
          {m.personnalise ? <button type="button" onClick={() => reset.mutate()} disabled={reset.isPending} className={`${btn} bg-white/5 text-offwhite`} data-testid="admin-modele-reinitialiser"><RotateCcw className="size-4" /> Modèle d'origine</button> : null}
          <button type="button" onClick={() => sauver.mutate(m)} disabled={sauver.isPending} className={`${btn} bg-gold text-navy-900`} data-testid="admin-modele-enregistrer"><Save className="size-4" /> Enregistrer le modèle</button>
        </div>
      </div>
      <p className="text-xs text-offwhite/55" data-testid="admin-modele-statut">{m.personnalise ? "Modèle personnalisé par l'admin" : "Modèle d'origine Zayado"}</p>
      <Onglets prefixe="admin-modele" valeur={vue} onChange={setVue} options={[["pages", "Pages"], ["code", "Code par défaut"]]} />
      {vue === "pages" ? <EditeurEtapes prefixe="admin-modele" etapes={m.etapes} onChange={(etapes) => setM({ ...m, etapes })} />
        : <EditeurCode prefixe="admin-modele" code={{ ...CODE_VIDE, ...m.code }} onChange={(code) => setM({ ...m, code })} />}
    </div>
  );
}

export function AdminTunnels() {
  const q = useQuery({ queryKey: ["admin", "tunnels"], queryFn: () => apiGet<LigneTunnelAdmin[]>("/admin/tunnels") });
  const [choix, setChoix] = useState<LigneTunnelAdmin | null>(null);
  const [vue, setVue] = useState<"tunnels" | "modeles">("tunnels");
  const [filtre, setFiltre] = useState("");
  const lignes = useMemo(() => {
    const f = filtre.trim().toLowerCase();
    return (q.data ?? []).filter((l) => !f || `${l.nom} ${l.email} ${l.slug ?? ""}`.toLowerCase().includes(f));
  }, [q.data, filtre]);
  if (choix) return <EditeurTunnel ligne={choix} retour={() => setChoix(null)} />;
  return (
    <div className="space-y-4 text-offwhite" data-testid="admin-tunnels">
      <Onglets prefixe="admin-tunnels" valeur={vue} onChange={setVue} options={[["tunnels", "Tunnels des utilisateurs"], ["modeles", "Modèles préparamétrés"]]} />
      {vue === "modeles" ? <ModelesTunnels /> : (
        <>
          <input className={champ} placeholder="Rechercher un tunnel, un e-mail, une adresse…" value={filtre} onChange={(e) => setFiltre(e.target.value)} data-testid="admin-tunnels-recherche" />
          {q.isLoading ? <Loader2 className="animate-spin text-gold" /> : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-offwhite/55">{["Tunnel", "Utilisateur", "Offre", "État", "Code", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {lignes.map((l) => (
                    <tr key={`${l.owner}-${l.id}`} className="border-t border-white/5" data-testid={`admin-tunnels-ligne-${l.id}`}>
                      <td className="px-3 py-2 font-semibold">{l.nom}<span className="block font-normal text-offwhite/50">{l.slug ? `/t/${l.slug}` : "non publié"}</span></td>
                      <td className="px-3 py-2">{l.email}</td>
                      <td className="px-3 py-2">{OFFRES[l.offre] ?? l.offre}</td>
                      <td className="px-3 py-2">{l.etat === "en_ligne" ? "En ligne" : "Brouillon"}</td>
                      <td className="px-3 py-2">{l.code_perso ? <Code2 className="size-4 text-gold" /> : "—"}</td>
                      <td className="px-3 py-2 text-right"><button type="button" onClick={() => setChoix(l)} className={`${btn} bg-gold text-navy-900`} data-testid={`admin-tunnels-modifier-${l.id}`}>Personnaliser</button></td>
                    </tr>
                  ))}
                  {!lignes.length ? <tr><td colSpan={6} className="px-3 py-6 text-center text-offwhite/55">Aucun tunnel.</td></tr> : null}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
