import { useState } from "react";
import { ArrowRight, Check, ChevronDown, ExternalLink, FileSpreadsheet, LayoutGrid, Sheet as SheetIcon, Users } from "lucide-react";
import ConnectSource from "@/components/ConnectSource";
import { Button } from "@/components/ui/button";
import { KIND_LABELS } from "@/lib/format";
import { useEspaceParams, usePages } from "@/lib/hooks";

/* Démarrage de l'espace entreprise : on relie d'abord la base de l'entreprise (Google Sheets, Excel OneDrive /
   SharePoint ou Microsoft Lists), on ajoute ensuite les pages, puis on invite l'équipe. Les autres sections
   n'apparaissent qu'une fois le démarrage fait (ou si le dirigeant choisit explicitement « sans classeur »). */

const cleSansClasseur = (orgId: string) => `zy-ent-sans-classeur-${orgId}`;
export const sansClasseurChoisi = (orgId?: string) => {
  try { return !!orgId && localStorage.getItem(cleSansClasseur(orgId)) === "1"; } catch { return false; }
};

type Fournisseur = "google" | "excel" | "lists";
const GUIDES: Record<Fournisseur, { titre: string; etapes: string[]; lien: [string, string] }> = {
  google: {
    titre: "Google Sheets",
    etapes: [
      "Ouvre ton classeur dans Google Sheets (ou crée-le : un onglet par sujet, ex. « Équipe », « Planning », « Absences »).",
      "Première ligne = titres des colonnes (Nom, E-mail, Date…). Une ligne = un élément.",
      "Bouton « Partager » › « Tous les utilisateurs disposant du lien » › rôle « Éditeur ».",
      "Copie l'adresse de la barre du navigateur (https://docs.google.com/spreadsheets/d/…) et colle-la dans l'onglet « Google Sheets » ci-dessous.",
    ],
    lien: ["Aide Google : partager un fichier", "https://support.google.com/docs/answer/2494822?hl=fr"],
  },
  excel: {
    titre: "Excel (OneDrive / SharePoint)",
    etapes: [
      "Range ton classeur .xlsx dans OneDrive ou dans la bibliothèque Documents d'un site SharePoint.",
      "Un onglet par sujet, la première ligne contient les titres des colonnes.",
      "Clic droit sur le fichier › « Partager » › « Copier le lien » (personnes de ton organisation, modification autorisée).",
      "Onglet « Excel » ci-dessous : cherche le classeur par son nom, ou colle le lien copié.",
    ],
    lien: ["Aide Microsoft : partager un fichier OneDrive", "https://support.microsoft.com/fr-fr/office/partager-des-fichiers-et-dossiers-onedrive-9fcc2f7d-de0c-4cec-93b0-a82024800c07"],
  },
  lists: {
    titre: "Microsoft Lists (SharePoint)",
    etapes: [
      "Dans Microsoft Lists, crée une liste par sujet (« Nouvelle liste › À partir d'Excel » reprend un tableau existant).",
      "Ouvre la liste dans SharePoint : l'adresse ressemble à https://entreprise.sharepoint.com/sites/site/Lists/liste/AllItems.aspx.",
      "Vérifie que les personnes de l'équipe ont accès au site SharePoint.",
      "Copie cette adresse et colle-la dans l'onglet « Microsoft Lists » ci-dessous. Répète pour chaque liste.",
    ],
    lien: ["Aide Microsoft : créer une liste", "https://support.microsoft.com/fr-fr/office/cr%C3%A9er-une-liste-0d397414-d95f-4ee1-9ec2-dbc4cda1a2dc"],
  },
};

function Etape({ n, titre, fait, actif, children, testId }: { n: number; titre: string; fait: boolean; actif: boolean; children: React.ReactNode; testId: string }) {
  return (
    <section className={`rounded-2xl border bg-white p-5 shadow-xs transition-[border-color,opacity] duration-200 sm:p-6 ${actif ? "border-[#C9A96A]" : "border-slate-200"} ${!actif && !fait ? "opacity-60" : ""}`} data-testid={testId}>
      <div className="flex items-center gap-3">
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${fait ? "bg-emerald-600 text-white" : actif ? "bg-[#1F2A44] text-white" : "bg-slate-100 text-slate-500"}`}>
          {fait ? <Check className="size-4" /> : n}
        </span>
        <h2 className="font-heading text-base font-semibold text-slate-900">{titre}</h2>
        {fait ? <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Fait</span> : null}
      </div>
      <div className="mt-3 pl-11">{children}</div>
    </section>
  );
}

export default function DemarrageEntreprise({ orgId, nbMembres, aller, onSansClasseur }: {
  orgId: string; nbMembres: number; aller: (onglet: string) => void; onSansClasseur: () => void;
}) {
  const params = useEspaceParams();
  const pages = usePages();
  const [f, setF] = useState<Fournisseur>("google");
  const [guide, setGuide] = useState(true);
  const p = params.data;
  const classeur = p?.classeur;
  const nbPages = pages.data?.length ?? 0;
  const g = GUIDES[f];
  const etape = !classeur ? 1 : !nbPages ? 2 : 3;

  return (
    <div className="esp-clair space-y-4" data-testid="ent-demarrage">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-[#9a6a2c]">Ton entreprise · Démarrage</p>
        <h1 className="titre-serif mt-1 text-[32px] leading-tight text-[#1F2A44]">Mettons ton espace en place</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Tes données restent chez toi, dans ton classeur Google ou Excel, ou dans tes listes Microsoft. VisionAct les lit et les affiche en pages
          claires (planning, absences, temps…) pour toi et ton équipe. Trois étapes, environ 10 minutes.
        </p>
        <ol className="mt-3 flex flex-wrap gap-2 text-xs" data-testid="ent-demarrage-progression">
          {["Relier ta base", "Ajouter tes pages", "Inviter ton équipe"].map((l, i) => (
            <li key={l} className={`rounded-full px-3 py-1 font-medium ${i + 1 < etape ? "bg-emerald-50 text-emerald-700" : i + 1 === etape ? "bg-[#1F2A44] text-white" : "bg-slate-100 text-slate-500"}`}>{i + 1}. {l}</li>
          ))}
        </ol>
      </header>

      <Etape n={1} titre="Relier la base de ton entreprise" fait={!!classeur} actif={etape === 1} testId="ent-demarrage-etape-1">
        {classeur ? (
          <p className="text-sm text-slate-700" data-testid="ent-demarrage-classeur">
            {KIND_LABELS[classeur.kind]} · <b>{classeur.nom}</b>
            {classeur.url ? <a href={classeur.url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-[#9a6a2c] hover:underline">Ouvrir <ExternalLink className="size-3" /></a> : null}
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Où sont les informations de ton entreprise aujourd'hui ?</p>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Où est ta base">
              {([["google", "Google Sheets", SheetIcon], ["excel", "Excel (OneDrive / SharePoint)", FileSpreadsheet], ["lists", "Microsoft Lists", LayoutGrid]] as const).map(([k, l, I]) => (
                <button key={k} type="button" role="radio" aria-checked={f === k} onClick={() => { setF(k); setGuide(true); }}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-medium transition-[border-color,background-color] duration-150 ${f === k ? "border-[#C9A96A] bg-[#FBF6EE] text-slate-900" : "border-slate-200 text-slate-700 hover:border-[#E2D5BE]"}`}
                  data-testid={`ent-demarrage-choix-${k}`}>
                  <I className="size-4 shrink-0 text-[#7A4E16]" /> {l}
                </button>
              ))}
            </div>
            <div className="rounded-xl bg-[#FBF6EE] p-4" data-testid="ent-demarrage-guide">
              <button type="button" onClick={() => setGuide(!guide)} aria-expanded={guide} className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-900">
                Guide : préparer {g.titre} <ChevronDown className={`size-4 transition-transform duration-150 ${guide ? "rotate-180" : ""}`} />
              </button>
              {guide ? (
                <>
                  <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-700">{g.etapes.map((e) => <li key={e}>{e}</li>)}</ol>
                  <a href={g.lien[1]} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#9a6a2c] hover:underline">{g.lien[0]} <ExternalLink className="size-3" /></a>
                  <p className="mt-2 text-xs text-slate-500">Pas encore de classeur ? Ajoute les pages prêtes à l'emploi à l'étape 2 : elles créent elles-mêmes leurs onglets.</p>
                </>
              ) : null}
            </div>
            {p?.peut_gerer ? <ConnectSource test={!!p?.test_disponible} onglet={f === "lists" ? "mslists" : f} sansOnglets /> : <p className="text-sm text-slate-500">Seule la personne qui gère l'entreprise peut relier la base.</p>}
            <button type="button" onClick={() => { try { localStorage.setItem(cleSansClasseur(orgId), "1"); } catch { /* */ } onSansClasseur(); }}
              className="text-xs font-medium text-slate-500 underline-offset-2 hover:underline" data-testid="ent-demarrage-sans-classeur">
              Je n'ai pas de classeur : utiliser l'espace sans base reliée
            </button>
          </div>
        )}
      </Etape>

      <Etape n={2} titre="Ajouter tes pages (planning, absences, temps, pièces…)" fait={nbPages > 0} actif={etape === 2} testId="ent-demarrage-etape-2">
        <p className="text-sm text-slate-600">Chaque page prête à l'emploi crée son onglet dans ton classeur et s'affiche dans le menu. Tu peux aussi créer ta propre page à partir d'un onglet existant.</p>
        <Button size="sm" className="mt-3" disabled={!classeur} onClick={() => aller("bases")} data-testid="ent-demarrage-vers-bases">
          {nbPages ? `${nbPages} page(s) — en ajouter` : "Choisir mes pages"} <ArrowRight className="size-4" />
        </Button>
      </Etape>

      <Etape n={3} titre="Inviter ton équipe" fait={nbMembres > 1} actif={etape === 3} testId="ent-demarrage-etape-3">
        <p className="text-sm text-slate-600">Invite tes salariés, prestataires ou freelances par e-mail ou par lien. Chacun ne voit que ce que tu lui ouvres.</p>
        <Button size="sm" variant={etape === 3 ? "default" : "outline"} className="mt-3" onClick={() => aller("equipe")} data-testid="ent-demarrage-vers-equipe">
          <Users className="size-4" /> {nbMembres > 1 ? `${nbMembres} personnes — gérer` : "Inviter mon équipe"}
        </Button>
      </Etape>
    </div>
  );
}
