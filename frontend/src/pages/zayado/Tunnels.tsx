import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CalendarClock, Check, ChevronRight, Copy, Filter, Gem, Loader2, Megaphone, PauseCircle, Phone, Rocket, Sparkles, Trash2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import ZShell from "@/zayado/Shell";
import { OngletsClients } from "@/components/vision/chrome";
import { MotMain } from "@/components/vision/EnTete";
import { useTunnelAuto } from "@/components/vision/Cercle";
import { MentionsEditeur, PublicationCarte, useEditeur, usePublier } from "@/pages/zayado/TunnelPublication";
import { PaiementsCarte } from "@/pages/zayado/TunnelPaiements";
import { apiGet } from "@/lib/api";
import { messageErreur, useProfil, useZMutation, z } from "@/zayado/api";
import { droitsDe } from "@/zayado/droits";
import { Carte, SurTitre, Verrou, Vide, btnOr } from "@/zayado/ui";
import {
  LIBELLES_ETAPES_TUNNEL,
  LIBELLES_ETAT_TUNNEL,
  LIBELLES_PARCOURS,
  LIBELLES_PLACEMENT,
  type Downsell,
  type EtapeTunnel,
  type EtatTunnel,
  type ModeleDouleur,
  type OffreValeur,
  type Parcours,
  type PlacementUpsell,
  type Tunnel,
  type TunnelIn,
  type TunnelPatch,
  type TypeUpsell,
  type Upsell,
} from "@/zayado/types";

const ETAT_TONE: Record<EtatTunnel, string> = {
  brouillon: "bg-slate-100 text-slate-700",
  en_ligne: "bg-green-50 text-green-700",
  en_veille: "bg-amber-50 text-amber-700",
};
const sel = "h-9 w-full rounded-lg border border-input bg-white px-2 text-sm";
const euros = (n: number | null) => (n === null ? "" : `${n.toLocaleString("fr-FR")} €`);
const nombre = (v: string) => (v === "" ? null : Number(v));

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-600">{label}</Label>
      {children}
    </div>
  );
}

function Entonnoir({ t, actif, onSelect }: { t: Tunnel; actif?: number; onSelect?: (i: number) => void }) {
  return (
    <ol className="flex flex-wrap items-stretch gap-1.5">
      {t.etapes.map((e, i) => (
        <li key={e.cle} className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={!onSelect}
            onClick={() => onSelect?.(i)}
            className={cn(
              "rounded-xl border px-3 py-2 text-left transition-[border-color,background-color] duration-150",
              actif === i ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white",
              onSelect && "hover:border-amber-300",
            )}
            data-testid={`tunnel-etape-${e.cle}`}
          >
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Étape {i + 1}</span>
            <span className="block text-sm font-medium text-slate-900">
              {e.cle === "upsell" && t.upsell.placement === "pendant_appel" ? "Option proposée pendant l'appel" : LIBELLES_ETAPES_TUNNEL[e.cle]}
            </span>
            <span className="block tabular-nums text-xs text-slate-500">{e.cle === "capture" ? `${t.contacts.length} contact(s)` : e.prix !== null ? euros(e.prix) : "prix à choisir"}</span>
          </button>
          {i < t.etapes.length - 1 && <ChevronRight className="size-4 text-slate-300" />}
        </li>
      ))}
    </ol>
  );
}

/** Les trois modèles d'upsell (memory/TUNNELS_INSPIRATION.md), servis par le backend. */
function GuideUpsell({ choisi, onChoisir }: { choisi?: TypeUpsell; onChoisir?: (t: TypeUpsell) => void }) {
  const modeles = useQuery({ queryKey: ["z", "modeles-upsell"], queryFn: () => z.modelesUpsell(), staleTime: Infinity });
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3" data-testid="upsell-modeles">
      {(modeles.data ?? []).map((m) => (
        <button
          key={m.type}
          type="button"
          disabled={!onChoisir}
          onClick={() => onChoisir?.(m.type)}
          className={cn(
            "rounded-xl border p-3 text-left transition-[border-color,box-shadow] duration-150",
            choisi === m.type ? "border-amber-400 shadow-[0_0_0_3px_rgb(222_194_163/0.25)]" : "border-slate-200",
            onChoisir && "hover:border-amber-300",
          )}
          data-testid={`upsell-modele-${m.type}`}
        >
          <span className="block font-heading text-sm font-semibold text-slate-900">{m.nom}</span>
          <span className="mt-1 block text-xs text-slate-600">{m.concept}</span>
          <span className="mt-2 block border-l-2 border-amber-300 pl-2 text-xs italic text-slate-500">{m.exemple}</span>
        </button>
      ))}
    </div>
  );
}

export function TunnelsListe() {
  const profil = useProfil();
  const droits = droitsDe(profil.data?.offre);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sujetRadar = params.get("sujet") ?? "";
  const [f, setF] = useState<Required<Omit<TunnelIn, "origine" | "douleur">>>({
    nom: sujetRadar ? `Tunnel — ${sujetRadar}` : "",
    sujet: sujetRadar,
    parcours: "produit",
    type_upsell: "complementarite",
  });
  const liste = useQuery({ queryKey: ["z", "tunnels"], queryFn: () => z.tunnels(), enabled: !!profil.data });
  const creer = useZMutation((b: TunnelIn) => z.creerTunnel(b), "Tunnel créé : les 4 pages sont pré-rédigées");
  const auto = useTunnelAuto();
  const douleurs = useQuery({ queryKey: ["z", "tunnels-douleurs"], queryFn: () => apiGet<ModeleDouleur[]>("/copilote/tunnels-douleurs") });
  const [sujetDouleur, setSujetDouleur] = useState(sujetRadar);
  const tunnels = liste.data ?? [];
  const plein = tunnels.length >= droits.tunnels_max;

  return (
    <ZShell
      title={<>Tes tunnels <MotMain>de vente</MotMain></>}
      subtitle="Quatre pages qui transforment un inconnu en client. Zayado les rédige, tu relis, tu mets en ligne."
      onglets={<OngletsClients />}
      aide={<>
        <p>Un tunnel, c'est un chemin en 4 pages : <strong>l'inscription</strong> (on laisse son e-mail), <strong>le merci</strong> (avec une petite offre à prix doux), <strong>l'offre principale</strong>, puis <strong>une option en plus</strong> (ou une version allégée si elle est refusée).</p>
        <p>Chaque inscription arrive dans tes prospects et dans ta cloche, part dans ton outil (Brevo, HubSpot, ton classeur…) si tu l'as choisi dans Paramètres › Connexions, et une relance par jour s'ajoute à ton Plan d'action. Rien n'est publié sans ton accord.</p>
      </>}
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4" data-testid="tunnels-list">
          {tunnels.map((t) => (
            <Carte key={t.id} testId={`tunnel-card-${t.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", ETAT_TONE[t.etat])}>{LIBELLES_ETAT_TUNNEL[t.etat]}</span>
                    <span className="text-xs text-slate-500">{LIBELLES_PARCOURS[t.parcours]}</span>
                  </p>
                  <h3 className="mt-1.5 font-heading text-lg font-semibold text-slate-900">{t.nom}</h3>
                  {t.sujet && <p className="text-sm text-slate-500">Sujet : {t.sujet}</p>}
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600" data-testid={`tunnel-infos-${t.id}`}>
                    <span><b className="chiffre text-slate-900">{t.contacts.length}</b> contact(s)</span>
                    {t.etat === "en_ligne" && t.slug ? <a href={`/t/${t.slug}`} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">{`/t/${t.slug}`} ↗</a> : <span>pas encore publié</span>}
                  </p>
                </div>
                <Link to={`/tunnels/${t.id}`} className={btnOr} data-testid={`tunnel-open-${t.id}`}>
                  Ouvrir <ArrowRight className="size-4" />
                </Link>
              </div>
              <div className="mt-4"><Entonnoir t={t} /></div>
            </Carte>
          ))}
          {liste.isSuccess && tunnels.length === 0 && <Vide testId="tunnels-vide">Pas encore de tunnel. « Créer mon tunnel automatiquement » le rédige pour toi à partir de ce que tu vends.</Vide>}
          <details className="rounded-2xl border border-white/10 bg-white/[0.03] p-4" data-testid="tunnels-guide">
            <summary className="cursor-pointer text-sm font-semibold text-[#eceff7]">Quelle option proposer en plus, et à quel moment ?</summary>
            <p className="mt-2 mb-3 text-xs text-[#9fb0cf]">Pour un accompagnement sur rendez-vous, l'option se propose juste après la réservation, ou pendant l'appel.</p>
            <GuideUpsell />
          </details>
        </div>
        <div className="space-y-6">
          <Carte testId="tunnel-create-card">
            <SurTitre>Nouveau tunnel</SurTitre>
            {!plein ? (
              <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3" data-testid="tunnel-auto-card">
                <p className="text-sm font-semibold text-slate-900">En un clic</p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Zayado part de ce que tu vends, adapte le parcours à ta clientèle, cale les prix sur ton panier moyen et rédige les 4 pages. Tu relis, tu publies.
                </p>
                <Button type="button" className="mt-2 w-full" disabled={auto.isPending} onClick={() => auto.mutate(sujetRadar || undefined)} data-testid="tunnel-auto-button">
                  <Sparkles className="size-4" /> {auto.isPending ? "Rédaction des 4 pages…" : sujetRadar ? `Créer le tunnel « ${sujetRadar} »` : "Créer mon tunnel automatiquement"}
                </Button>
              </div>
            ) : null}
            {!plein && douleurs.data?.length ? (
              <div className="mt-3 rounded-xl border border-white/10 p-3" data-testid="tunnel-douleurs-card">
                <p className="text-sm font-semibold text-slate-900">Partir de la douleur de tes clients</p>
                <p className="mt-0.5 text-xs text-slate-600">Choisis ce que tes clients se disent : les 4 pages sont rédigées autour de cette douleur.</p>
                <Input value={sujetDouleur} onChange={(e) => setSujetDouleur(e.target.value)} placeholder="Ce que tu vends (ex. coaching nutrition)" className="mt-2 bg-white" data-testid="tunnel-douleur-sujet" />
                <div className="mt-2 grid gap-1.5">
                  {douleurs.data.map((m) => (
                    <button key={m.cle} type="button" disabled={creer.isPending || sujetDouleur.trim().length < 2}
                      onClick={() => creer.mutate({ nom: `${sujetDouleur.trim()} — ${m.promesse}`.slice(0, 80), sujet: sujetDouleur.trim(), douleur: m.cle, origine: "modèle douleur client" }, { onSuccess: (t) => navigate(`/tunnels/${t.id}`) })}
                      className="rounded-lg border border-white/10 px-3 py-2 text-left transition-colors hover:border-amber-400 disabled:opacity-50" data-testid={`tunnel-douleur-${m.cle}`}>
                      <span className="block text-sm font-medium text-slate-900">{m.douleur}</span>
                      <span className="block text-xs text-slate-500">{m.promesse}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="mt-1 text-xs text-slate-500" data-testid="tunnels-quota">
              {tunnels.length} / {droits.tunnels_max} avec l'offre {profil.data?.offre}
            </p>
            {plein ? (
              <div className="mt-3"><Verrou texte={`Limite atteinte : ${droits.tunnels_max} tunnel(s) avec l'offre ${profil.data?.offre}.`} testId="tunnels-verrou" /></div>
            ) : (
              <details className="mt-3" data-testid="tunnel-manuel">
              <summary className="cursor-pointer text-xs font-semibold text-amber-700 hover:underline">Ou régler tout toi-même</summary>
              <form
                className="mt-3 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  creer.mutate({ ...f, origine: sujetRadar ? "via Radar" : "saisie manuelle" }, { onSuccess: (t) => navigate(`/tunnels/${t.id}?ia=1`) });
                }}
              >
                <Champ label="Nom">
                  <Input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} required className="bg-white" data-testid="tunnel-nom-input" />
                </Champ>
                <Champ label="Sujet / thème">
                  <Input value={f.sujet} onChange={(e) => setF({ ...f, sujet: e.target.value })} placeholder="Ex. audit de rentabilité" className="bg-white" data-testid="tunnel-sujet-input" />
                </Champ>
                <Champ label="Parcours">
                  <select className={sel} value={f.parcours} onChange={(e) => setF({ ...f, parcours: e.target.value as Parcours })} data-testid="tunnel-parcours-select">
                    {Object.entries(LIBELLES_PARCOURS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </Champ>
                <Champ label="Option proposée en plus">
                  <select className={sel} value={f.type_upsell} onChange={(e) => setF({ ...f, type_upsell: e.target.value as TypeUpsell })} data-testid="tunnel-upsell-select">
                    <option value="acceleration">Aller plus vite (accompagnement express)</option>
                    <option value="complementarite">Un outil en plus (modèle, kit)</option>
                    <option value="delegation">On le fait pour toi</option>
                  </select>
                </Champ>
                <Button type="submit" className="w-full" disabled={creer.isPending} data-testid="tunnel-create-submit-button">
                  <Filter className="size-4" /> Créer le tunnel
                </Button>
              </form>
              </details>
            )}
          </Carte>
          <MentionsEditeur compact />
          <PaiementsCarte />
        </div>
      </div>
    </ZShell>
  );
}

function Apercu({ t, e, onContact }: { t: Tunnel; e: EtapeTunnel; onContact?: (b: { nom: string; email: string }) => void }) {
  const [c, setC] = useState({ nom: "", email: "" });
  const u = t.upsell;
  const o = t.offre;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="tunnel-apercu">
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-300" /><span className="size-2.5 rounded-full bg-amber-300" /><span className="size-2.5 rounded-full bg-green-300" />
        <span className="ml-2 tabular-nums text-[11px] text-slate-400">aperçu — {LIBELLES_ETAPES_TUNNEL[e.cle]}</span>
      </div>
      {e.cle === "upsell" && u.placement === "pendant_appel" ? (
        <div className="space-y-3 px-6 py-8" data-testid="apercu-script-appel">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600"><Phone className="size-3.5" /> Script — pendant l'appel stratégique</p>
          <p className="text-sm text-slate-600">{e.accroche}</p>
          <blockquote className="border-l-2 border-amber-300 pl-3 text-slate-800">{e.contenu}</blockquote>
          <p className="text-sm text-slate-700">{u.nom}{u.prix !== null && <span className="ml-2 tabular-nums">{euros(u.prix)}</span>}</p>
        </div>
      ) : (
        <div className="space-y-3 px-6 py-8 text-center">
          <h3 className="font-heading text-2xl font-bold tracking-tight text-slate-900">{e.titre || "Titre de la page"}</h3>
          <p className="text-slate-600">{e.accroche}</p>
          <p className="mx-auto max-w-md whitespace-pre-line text-sm text-slate-500">{e.contenu}</p>
          {e.cle === "vente" && (o.resultat_reve || o.garantie || o.bonus.length > 0) && (
            <div className="mx-auto max-w-md space-y-1 rounded-xl bg-slate-50 p-3 text-left text-sm text-slate-700" data-testid="apercu-offre-valeur">
              {o.resultat_reve && <p>🎯 {o.resultat_reve}</p>}
              {o.preuve && <p>✅ {o.preuve}</p>}
              {o.delai && <p>⏱ {o.delai}</p>}
              {o.effort && <p>🪶 {o.effort}</p>}
              {o.bonus.map((b) => <p key={b}>🎁 {b}</p>)}
              {o.garantie && <p>🛡 {o.garantie}</p>}
              {o.rarete && <p className="font-medium text-amber-700">{o.rarete}</p>}
            </div>
          )}
          {e.offre_nom && (
            <p className="text-sm font-medium text-slate-800">
              {e.offre_nom}
              {e.prix !== null && <span className="ml-2 tabular-nums">{euros(e.prix)}</span>}
            </p>
          )}
          {e.cle === "capture" && onContact ? (
            <form
              className="mx-auto flex max-w-sm flex-col gap-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                onContact(c);
                setC({ nom: "", email: "" });
              }}
            >
              <Input value={c.nom} onChange={(ev) => setC({ ...c, nom: ev.target.value })} placeholder="Prénom" className="bg-white" data-testid="apercu-nom-input" />
              <Input value={c.email} onChange={(ev) => setC({ ...c, email: ev.target.value })} placeholder="E-mail" type="email" className="bg-white" data-testid="apercu-email-input" />
              <button type="submit" className={btnOr} data-testid="apercu-submit-button">{e.bouton || "Valider"}</button>
            </form>
          ) : e.cle === "upsell" ? (
            <div className="flex flex-col items-center gap-2" data-testid="apercu-upsell-boutons">
              <span className={cn(btnOr, "pointer-events-none")}>
                {u.oui}
                {u.prix !== null && ` — ${euros(u.prix)}`}
                {u.prix_barre !== null && <s className="ml-1 opacity-60">{euros(u.prix_barre)}</s>}
              </span>
              <span className="text-xs text-slate-500 underline">{u.non}</span>
              {t.downsell.nom && (
                <p className="text-xs text-slate-500" data-testid="apercu-downsell">
                  Si refus : {t.downsell.nom}
                  {t.downsell.prix !== null && ` à ${euros(t.downsell.prix)}`}
                  {t.downsell.mensualites > 1 && ` ou en ${t.downsell.mensualites} fois`}
                </p>
              )}
            </div>
          ) : (
            <span className={cn(btnOr, "pointer-events-none")}>{e.bouton || "Valider"}</span>
          )}
        </div>
      )}
    </div>
  );
}

type Brouillon = { etapes: EtapeTunnel[]; offre: OffreValeur; upsell: Upsell; downsell: Downsell };

export function TunnelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const profil = useProfil();
  const droits = droitsDe(profil.data?.offre);
  const q = useQuery({ queryKey: ["z", "tunnel", id], queryFn: () => z.tunnel(id!), enabled: !!id && !!profil.data });
  const [actif, setActif] = useState(0);
  const [b, setB] = useState<Brouillon | null>(null);
  const [placement, setPlacement] = useState<PlacementUpsell | null>(null);
  const [ouverture, setOuverture] = useState("");
  const maj = useZMutation((p: TunnelPatch) => z.majTunnel(id!, p), "Tunnel enregistré");
  const modele = useZMutation((p: { type: TypeUpsell; placement: PlacementUpsell }) => z.appliquerModele(id!, p), "Modèle appliqué : la page de l'étape 4 est réécrite");
  const lancer = useZMutation((d: string) => z.programmerLancement(id!, d), "Séquence programmée dans le Plan d'action");
  const supprimer = useZMutation(() => z.supprimerTunnel(id!), "Tunnel supprimé");
  const contact = useZMutation((c: { nom: string; email: string }) => z.contactTunnel(id!, c), "Contact ajouté à tes prospects");
  const [iaNote, setIaNote] = useState<string | null>(null);
  const [iaEnCours, setIaEnCours] = useState(false);
  const [validation, setValidation] = useState(false);
  const publier = usePublier(id!);
  const editeur = useEditeur();
  const [coches, setCoches] = useState<Record<string, boolean>>({});
  type Onglet = "pages" | "contacts" | "partage" | "paiements" | "lancer";
  const [onglet, setOnglet] = useState<Onglet>("pages");

  const t0 = q.isError ? undefined : q.data;
  const cur: Brouillon | null = b ?? (t0 ? { etapes: t0.etapes, offre: t0.offre, upsell: t0.upsell, downsell: t0.downsell } : null);
  const t = t0 && cur ? { ...t0, ...cur } : undefined;
  const e = cur?.etapes[actif];
  const edit = (p: Partial<Brouillon>) => cur && setB({ ...cur, ...p });
  const setChamp = <K extends keyof EtapeTunnel>(k: K, val: EtapeTunnel[K]) => cur && edit({ etapes: cur.etapes.map((x, i) => (i === actif ? { ...x, [k]: val } : x)) });
  const setOffre = <K extends keyof OffreValeur>(k: K, val: OffreValeur[K]) => cur && edit({ offre: { ...cur.offre, [k]: val } });
  const setUpsell = <K extends keyof Upsell>(k: K, val: Upsell[K]) => cur && edit({ upsell: { ...cur.upsell, [k]: val } });
  const setDownsell = <K extends keyof Downsell>(k: K, val: Downsell[K]) => cur && edit({ downsell: { ...cur.downsell, [k]: val } });
  const capture = cur?.etapes[0];
  const vente = cur?.etapes[2];
  const campagne = t
    ? `${capture?.titre}\n\n${capture?.accroche}\n\n👉 ${capture?.bouton} — lien de ta page de capture\n\n${vente?.offre_nom ? `Ensuite : ${vente.offre_nom}${vente.prix !== null ? ` à ${vente.prix} €` : ""}.` : ""}`.trim()
    : "";
  const placementChoisi = placement ?? t?.upsell.placement ?? "post_reservation";
  const proposer = async () => {
    if (!cur) return;
    setIaEnCours(true);
    try {
      const p = await z.propositionTunnel(id!);
      setB({ ...cur, etapes: p.etapes, offre: p.offre ?? cur.offre, upsell: p.upsell ?? cur.upsell, downsell: p.downsell ?? cur.downsell });
      setIaNote(p.note);
    } catch (err) {
      toast.error(messageErreur(err));
    } finally {
      setIaEnCours(false);
    }
  };
  // Nouveau tunnel : l'IA rédige tout dès l'ouverture (pages, offre, upsell) — l'utilisateur relit au lieu de remplir.
  const [search, setSearch] = useSearchParams();
  const auto = useRef(false);
  useEffect(() => {
    if (search.get("ia") === "1" && cur && !auto.current) {
      auto.current = true;
      setSearch({}, { replace: true });
      void proposer();
    }
  });
  const CONTROLES: [string, string][] = [
    ["pages", "J'ai relu les 4 pages (inscription, merci, offre, option)."],
    ["prix", "Les prix et le contenu de chaque offre sont justes."],
    ["promesses", "Aucune promesse ni témoignage inventé — tout est vérifiable."],
    ["rgpd", "La page de capture mentionne l'usage des e-mails et la désinscription."],
  ];
  const toutCoche = CONTROLES.every(([k]) => coches[k]);

  return (
    <ZShell
      title={t?.nom ?? "Tunnel"}
      subtitle={t ? <>{LIBELLES_PARCOURS[t.parcours]} · Sujet : {t.sujet || "—"} · {t.contacts.length} contact(s) capté(s)</> : undefined}
      actions={
        t && (
          <>
            <Link to="/tunnels" className="hidden items-center gap-1 text-sm text-slate-600 hover:text-slate-900 sm:inline-flex" data-testid="tunnel-back-link">
              <ArrowLeft className="size-4" /> Tunnels
            </Link>
            <Button size="sm" variant="outline" onClick={proposer} disabled={iaEnCours} data-testid="tunnel-ia-button">
              {iaEnCours ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} <span className="hidden sm:inline">Réécrire avec l'IA</span>
            </Button>
            {b && (
              <Button size="sm" variant="outline" onClick={() => maj.mutate(b, { onSuccess: () => { setB(null); setIaNote(null); } })} disabled={maj.isPending} data-testid="tunnel-save-button">
                Enregistrer
              </Button>
            )}
            {t.etat === "en_ligne" ? (
              <Button size="sm" variant="outline" onClick={() => maj.mutate({ etat: "en_veille" })} data-testid="tunnel-veille-button">
                <PauseCircle className="size-4" /> <span className="hidden sm:inline">Mettre en veille</span><span className="sm:hidden">Veille</span>
              </Button>
            ) : (
              <Button size="sm" onClick={() => { setCoches({}); setValidation(true); }} data-testid="tunnel-valider-button">
                <Rocket className="size-4" /> Mettre en ligne
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" className="text-slate-400 hover:text-red-600" aria-label="Supprimer" onClick={() => window.confirm("Supprimer ce tunnel ?") && supprimer.mutate(undefined, { onSuccess: () => navigate("/tunnels") })} data-testid="tunnel-delete-button">
              <Trash2 className="size-4" />
            </Button>
          </>
        )
      }
    >
      {t && e && cur && (
        <div className="space-y-6">
          <ol className="hidden flex-wrap items-center gap-2 text-xs sm:flex" data-testid="tunnel-parcours-validation">
            {[
              ["Rédiger", true],
              ["Relire & enregistrer", !b],
              ["Mettre en ligne", t.etat === "en_ligne"],
            ].map(([l, ok], i) => (
              <li key={String(l)} className="flex items-center gap-2">
                {i > 0 && <span className="h-px w-6 bg-white/15" />}
                <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1", ok ? "border-[#dec2a3]/50 bg-[#dec2a3]/10 text-[#dec2a3]" : "border-white/15 text-[#9fb0cf]")}>
                  {ok ? <Check className="size-3" /> : <span className="chiffre">{i + 1}</span>} {l}
                </span>
              </li>
            ))}
            <li className="ml-auto"><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", ETAT_TONE[t.etat])} data-testid="tunnel-etat-badge">{LIBELLES_ETAT_TUNNEL[t.etat]}</span></li>
          </ol>
          {/* L'essentiel en un coup d'œil, sans descendre : état, adresse publique, contacts. */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3" data-testid="tunnel-resume">
            <button type="button" onClick={() => setOnglet("partage")} className="rounded-xl border border-white/12 bg-white/[0.06] p-3 text-left transition-colors hover:border-[#dec2a3]/40" data-testid="resume-adresse">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9fb0cf]">Page publique</p>
              {t.etat === "en_ligne" && t.slug ? (
                <p className="mt-1 truncate text-sm font-medium text-[#eceff7]">{`${window.location.host}/t/${t.slug}`}</p>
              ) : (
                <p className="mt-1 text-sm text-[#c9d3e6]">Pas encore en ligne</p>
              )}
            </button>
            <button type="button" onClick={() => setOnglet("contacts")} className="rounded-xl border border-white/12 bg-white/[0.06] p-3 text-left transition-colors hover:border-[#dec2a3]/40" data-testid="resume-contacts">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9fb0cf]">Contacts captés</p>
              <p className="mt-1 text-sm font-medium text-[#eceff7]"><span className="chiffre text-lg">{t.contacts.length}</span>{t.contacts.length ? ` · dernier : ${t.contacts[t.contacts.length - 1].nom}` : " · aucun pour l'instant"}</p>
            </button>
            <div className="rounded-xl border border-white/12 bg-white/[0.06] p-3" data-testid="resume-statut">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9fb0cf]">{b ? "Modifications" : "Prochaine étape"}</p>
              <p className="mt-1 text-sm text-[#eceff7]">
                {b ? "Non enregistrées — pense à « Enregistrer »." : t.etat === "en_ligne" ? "Partage ton lien et suis tes contacts." : "Relis les 4 pages, puis « Mettre en ligne »."}
              </p>
            </div>
          </div>
          {iaNote && <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800" data-testid="tunnel-ia-notice"><Sparkles className="size-3.5" /> {iaNote}</p>}

          <div className="flex gap-1 overflow-x-auto border-b border-white/10" role="tablist" data-testid="tunnel-onglets">
            {([
              ["pages", "Les pages"],
              ["contacts", `Contacts (${t.contacts.length})`],
              ["partage", "Lien et partage"],
              ["paiements", "Paiements"],
              ["lancer", "Faire venir du monde"],
            ] as [Onglet, string][]).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={onglet === k} onClick={() => setOnglet(k)} data-testid={`tunnel-onglet-${k}`}
                className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors", onglet === k ? "border-[#dec2a3] font-semibold text-[#eceff7]" : "border-transparent text-[#9fb0cf] hover:text-[#eceff7]")}>
                {l}
              </button>
            ))}
          </div>

          {onglet === "partage" && <PublicationCarte t={t} />}
          {onglet === "paiements" && <PaiementsCarte />}

          {onglet === "pages" && <>
          <Entonnoir t={t} actif={actif} onSelect={setActif} />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Carte testId="tunnel-editeur">
              <SurTitre>Étape {actif + 1} · {LIBELLES_ETAPES_TUNNEL[e.cle]}</SurTitre>
              <p className="mt-1 text-xs text-slate-500">{iaEnCours ? "L'IA rédige ton tunnel…" : "Rédigé par l'IA à partir du sujet : tu relis, tu corriges si besoin, tu publies."}</p>
              <div className="mt-4 space-y-3">
                <Champ label="Titre"><Input value={e.titre} onChange={(ev) => setChamp("titre", ev.target.value)} className="bg-white" data-testid="tunnel-titre-input" /></Champ>
                <Champ label="Accroche"><Input value={e.accroche} onChange={(ev) => setChamp("accroche", ev.target.value)} className="bg-white" data-testid="tunnel-accroche-input" /></Champ>
                <Champ label={e.cle === "upsell" && t.upsell.placement === "pendant_appel" ? "Script d'appel" : "Contenu"}>
                  <Textarea rows={4} value={e.contenu} onChange={(ev) => setChamp("contenu", ev.target.value)} className="bg-white" data-testid="tunnel-contenu-input" />
                </Champ>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Champ label="Bouton"><Input value={e.bouton} onChange={(ev) => setChamp("bouton", ev.target.value)} className="bg-white" data-testid="tunnel-bouton-input" /></Champ>
                  <Champ label="Offre"><Input value={e.offre_nom} onChange={(ev) => setChamp("offre_nom", ev.target.value)} className="bg-white" data-testid="tunnel-offre-input" /></Champ>
                  <Champ label="Prix (€)">
                    <Input type="number" min={0} value={e.prix ?? ""} onChange={(ev) => setChamp("prix", nombre(ev.target.value))} className="bg-white" disabled={e.cle === "capture"} data-testid="tunnel-prix-input" />
                  </Champ>
                </div>
              </div>
            </Carte>
            <div className="space-y-4">
              <Apercu t={t} e={e} onContact={(c) => contact.mutate(c)} />
              {e.cle === "capture" && <p className="text-xs text-slate-500">Fais un essai d'inscription : le contact apparaît dans l'onglet « Contacts » et dans tes prospects.</p>}
            </div>
          </div>

          {e.cle === "vente" && (
            <Carte testId="tunnel-offre-valeur">
              <SurTitre className="flex items-center gap-1.5"><Gem className="size-3.5" /> Ce qui rend ton offre évidente</SurTitre>
              <p className="mt-1 text-xs text-slate-500">Pré-rédigée par l'IA. Ajoute seulement tes preuves réelles (et une rareté si elle est vraie).</p>
              <details className="group mt-3" data-testid="offre-details">
              <summary className="cursor-pointer text-xs font-semibold text-amber-700 hover:underline" data-testid="offre-details-toggle">Ajuster les détails de l'offre</summary>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <Champ label="Résultat rêvé"><Input value={cur.offre.resultat_reve} onChange={(ev) => setOffre("resultat_reve", ev.target.value)} placeholder="Ex. 15 % de charges en moins dès ce trimestre" className="bg-white" data-testid="offre-resultat-input" /></Champ>
                <Champ label="Preuve que ça marche"><Input value={cur.offre.preuve} onChange={(ev) => setOffre("preuve", ev.target.value)} placeholder="Ex. témoignages clients déjà saisis" className="bg-white" data-testid="offre-preuve-input" /></Champ>
                <Champ label="Délai (le plus court possible)"><Input value={cur.offre.delai} onChange={(ev) => setOffre("delai", ev.target.value)} placeholder="Ex. diagnostic livré en 15 jours" className="bg-white" data-testid="offre-delai-input" /></Champ>
                <Champ label="Effort demandé (le plus faible possible)"><Input value={cur.offre.effort} onChange={(ev) => setOffre("effort", ev.target.value)} placeholder="Ex. 2 heures de votre temps au total" className="bg-white" data-testid="offre-effort-input" /></Champ>
                <Champ label="Bonus (un par ligne)"><Textarea rows={2} value={cur.offre.bonus.join("\n")} onChange={(ev) => setOffre("bonus", ev.target.value.split("\n").filter((x) => x.trim()))} className="bg-white" data-testid="offre-bonus-input" /></Champ>
                <div className="space-y-3">
                  <Champ label="Garantie"><Input value={cur.offre.garantie} onChange={(ev) => setOffre("garantie", ev.target.value)} placeholder="Ex. satisfait ou remboursé 30 jours" className="bg-white" data-testid="offre-garantie-input" /></Champ>
                  <Champ label="Rareté / urgence (réelle)"><Input value={cur.offre.rarete} onChange={(ev) => setOffre("rarete", ev.target.value)} placeholder="Ex. 5 places ce mois-ci" className="bg-white" data-testid="offre-rarete-input" /></Champ>
                </div>
              </div>
              </details>
            </Carte>
          )}

          {e.cle === "upsell" && (
            <Carte testId="tunnel-upsell-config">
              <SurTitre className="flex items-center gap-1.5"><Gem className="size-3.5" /> Option en plus : laquelle, et quand</SurTitre>
              <div className="mt-3 flex flex-wrap gap-2" data-testid="upsell-placements">
                {(Object.keys(LIBELLES_PLACEMENT) as PlacementUpsell[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlacement(p)}
                    className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150", placementChoisi === p ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-600 hover:border-amber-300")}
                    data-testid={`upsell-placement-${p}`}
                  >
                    {LIBELLES_PLACEMENT[p]}
                  </button>
                ))}
              </div>
              <p className="mt-3 mb-2 text-xs text-slate-500">Choisir un modèle réécrit l'option et la page de l'étape 4 (tes modifications non enregistrées sont perdues).</p>
              <GuideUpsell choisi={t.upsell.type} onChoisir={(type) => { setB(null); modele.mutate({ type, placement: placementChoisi }); }} />
              <details className="mt-5" data-testid="upsell-details">
              <summary className="cursor-pointer text-xs font-semibold text-amber-700 hover:underline" data-testid="upsell-details-toggle">Ajuster l'option et la version allégée (pré-rédigées par l'IA)</summary>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Champ label="Nom de l'option"><Input value={cur.upsell.nom} onChange={(ev) => setUpsell("nom", ev.target.value)} className="bg-white" data-testid="upsell-nom-input" /></Champ>
                <Champ label="Prix proposé (€)"><Input type="number" min={0} value={cur.upsell.prix ?? ""} onChange={(ev) => setUpsell("prix", nombre(ev.target.value))} className="bg-white" data-testid="upsell-prix-input" /></Champ>
                <Champ label="Au lieu de (€)"><Input type="number" min={0} value={cur.upsell.prix_barre ?? ""} onChange={(ev) => setUpsell("prix_barre", nombre(ev.target.value))} className="bg-white" data-testid="upsell-prix-barre-input" /></Champ>
                <Champ label="Bouton « Oui »"><Input value={cur.upsell.oui} onChange={(ev) => setUpsell("oui", ev.target.value)} className="bg-white" data-testid="upsell-oui-input" /></Champ>
                <Champ label="Lien « Non merci »"><Input value={cur.upsell.non} onChange={(ev) => setUpsell("non", ev.target.value)} className="bg-white" data-testid="upsell-non-input" /></Champ>
                <Champ label="Ce que contient l'option (une ligne par élément)"><Textarea rows={2} value={cur.upsell.contenu.join("\n")} onChange={(ev) => setUpsell("contenu", ev.target.value.split("\n").filter((x) => x.trim()))} className="bg-white" data-testid="upsell-contenu-input" /></Champ>
              </div>
              <SurTitre className="mt-6">Version allégée — si l'option est refusée</SurTitre>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Champ label="Version allégée"><Input value={cur.downsell.nom} onChange={(ev) => setDownsell("nom", ev.target.value)} placeholder="Ex. le kit seul, sans accompagnement" className="bg-white" data-testid="downsell-nom-input" /></Champ>
                <Champ label="Prix (€)"><Input type="number" min={0} value={cur.downsell.prix ?? ""} onChange={(ev) => setDownsell("prix", nombre(ev.target.value))} className="bg-white" data-testid="downsell-prix-input" /></Champ>
                <Champ label="Paiement échelonné (nombre de fois)"><Input type="number" min={0} max={12} value={cur.downsell.mensualites || ""} onChange={(ev) => setDownsell("mensualites", Number(ev.target.value) || 0)} className="bg-white" data-testid="downsell-mensualites-input" /></Champ>
              </div>
              </details>
            </Carte>
          )}

          </>}

          {onglet === "contacts" && (
            <Carte testId="tunnel-contacts">
              <SurTitre className="flex items-center gap-1.5"><Users className="size-3.5" /> Contacts captés</SurTitre>
              <ul className="mt-3 space-y-1.5 text-sm">
                {[...t.contacts].reverse().map((c) => (
                  <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/5 py-1.5"><span className="text-slate-800">{c.nom}</span><a href={`mailto:${c.email}`} className="truncate tabular-nums text-xs text-slate-500 hover:underline">{c.email}</a><span className="text-xs text-slate-500">{c.date}</span></li>
                ))}
              </ul>
              {t.contacts.length === 0 && <p className="mt-2 text-xs text-slate-500">Aucun contact pour l'instant. Chaque inscription arrive aussi dans tes prospects, et tu reçois une notification.</p>}
              {t.contacts.length > 0 && <Link to="/radar" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline">Les retrouver dans mes prospects →</Link>}
              <DestinationContacts />
            </Carte>
          )}

          {onglet === "lancer" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Carte testId="tunnel-campagne">
              <SurTitre className="flex items-center gap-1.5"><Megaphone className="size-3.5" /> Campagne prête à coller</SurTitre>
              {droits.campagne_pub ? (
                <>
                  <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700" data-testid="tunnel-campagne-texte">{campagne}</pre>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => navigator.clipboard.writeText(campagne).then(() => toast.success("Texte copié"))} data-testid="tunnel-campagne-copy-button">
                    <Copy className="size-4" /> Copier
                  </Button>
                </>
              ) : (
                <div className="mt-3"><Verrou texte="Disponible à partir de l'offre Solo." testId="tunnel-campagne-verrou" /></div>
              )}
            </Carte>
            <Carte testId="tunnel-sequence">
              <SurTitre className="flex items-center gap-1.5"><Rocket className="size-3.5" /> Séquence de lancement</SurTitre>
              <ol className="mt-3 space-y-2 text-sm text-slate-700" data-testid="tunnel-sequence-liste">
                {t.lancement.contenus.map((c) => (
                  <li key={c.cle} data-testid={`lancement-${c.cle}`}>
                    <span className="tabular-nums text-xs text-slate-500">{c.date ?? (c.decalage === 0 ? "J0" : `J${c.decalage > 0 ? "+" : ""}${c.decalage}`)}</span>{" "}
                    <b className="text-slate-900">{c.titre}</b>
                    <span className="block text-xs text-slate-500">{c.texte}</span>
                  </li>
                ))}
              </ol>
              {droits.sequences_lancement ? (
                <form
                  className="mt-3 flex items-end gap-2"
                  onSubmit={(ev) => {
                    ev.preventDefault();
                    if (ouverture) lancer.mutate(ouverture);
                  }}
                >
                  <Champ label="Ouverture des portes">
                    <Input type="date" value={ouverture} onChange={(ev) => setOuverture(ev.target.value)} required className="bg-white" data-testid="lancement-date-input" />
                  </Champ>
                  <Button type="submit" size="sm" disabled={lancer.isPending} data-testid="lancement-programmer-button">
                    <CalendarClock className="size-4" /> {t.lancement.programme ? "Reprogrammer" : "Programmer"}
                  </Button>
                </form>
              ) : (
                <div className="mt-3"><Verrou texte="Programmation dans le Plan d'action : offre Pro." testId="tunnel-sequence-verrou" /></div>
              )}
              {t.lancement.programme && <p className="mt-2 text-xs text-slate-500" data-testid="lancement-programme-notice">Portes ouvertes du {t.lancement.ouverture} au {t.lancement.fermeture} — envoyé depuis ta propre messagerie.</p>}
            </Carte>
          </div>
          )}
        </div>
      )}
      {q.isError && <Vide testId="tunnel-introuvable">Tunnel introuvable.</Vide>}
      <Dialog open={validation} onOpenChange={setValidation}>
        <DialogContent data-testid="tunnel-validation-dialog">
          <DialogHeader>
            <DialogTitle>Mettre en ligne « {t?.nom} »</DialogTitle>
            <DialogDescription>Rien ne part sans ton accord. Coche chaque point pour confirmer : ton tunnel aura son adresse publique.</DialogDescription>
          </DialogHeader>
          {b && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Enregistre d'abord tes modifications en cours.</p>}
          {editeur.data && !editeur.data.complet ? <MentionsEditeur /> : null}
          <ul className="space-y-2">
            {CONTROLES.map(([k, l]) => (
              <li key={k}>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                  <input type="checkbox" checked={!!coches[k]} onChange={(ev) => setCoches({ ...coches, [k]: ev.target.checked })} className="mt-0.5 size-4 accent-[#DEC2A3]" data-testid={`validation-${k}`} />
                  {l}
                </label>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidation(false)} data-testid="validation-annuler">Plus tard</Button>
            <Button disabled={!toutCoche || !!b || publier.isPending || !editeur.data?.complet} onClick={() => publier.mutate(undefined, { onSuccess: () => setValidation(false) })} data-testid="validation-confirmer">
              <Rocket className="size-4" /> Publier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ZShell>
  );
}


/** Où partent les inscrits : l'outil de l'utilisateur (Zayado relie, il ne stocke pas). */
const NOMS_CRM: Record<string, string> = {
  brevo: "Brevo", hubspot: "HubSpot", "google-sheets": "ton classeur Google Sheets", excel: "ton classeur Excel", make: "ton scénario Make",
};
function DestinationContacts() {
  const q = useQuery({ queryKey: ["crm-reglages"], queryFn: () => apiGet<{ cible: string; derniere_erreur?: string | null }>("/crm/reglages"), retry: false });
  if (!q.data) return null;
  const nom = NOMS_CRM[q.data.cible];
  return (
    <p className="mt-3 border-t border-white/5 pt-3 text-xs text-slate-500" data-testid="tunnel-destination-contacts">
      {nom ? <>Chaque nouvel inscrit part aussi dans <strong className="text-slate-700">{nom}</strong>.</> : <>Tes inscrits restent dans Zayado.</>}{" "}
      <Link to="/parametres#connexions" className="font-semibold text-amber-700 hover:underline">{nom ? "Changer" : "Les envoyer dans ton CRM"} →</Link>
      {q.data.derniere_erreur ? <span className="mt-1 block text-[#B42318]">Dernier envoi en échec : {q.data.derniere_erreur}</span> : null}
    </p>
  );
}
