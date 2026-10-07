import React from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Download, Code2, Globe, Languages } from "lucide-react";
import { DICTS } from "@/i18n/translations";

const ORIGIN = typeof window !== "undefined" ? window.location.origin : "https://app.zayado.net";

// Pages publiques (référençables / à relayer depuis Shopify).
const PAGES = [
  { label: "Accueil", path: "/accueil" },
  { label: "Découvrir Zayado", path: "/decouvrir-zayado" },
  { label: "IA (landing)", path: "/ia" },
  { label: "Vision & Objectifs", path: "/fonctionnalites/vision-objectifs" },
  { label: "Prospection & Croissance", path: "/fonctionnalites/prospection-croissance" },
  { label: "Bien-être entrepreneur", path: "/fonctionnalites/bien-etre-dirigeant" },
  { label: "Diagnostic", path: "/diagnostic" },
  { label: "Tarifs", path: "/pricing" },
  { label: "Connexion", path: "/login" },
];

// Blocs à intégrer en iframe sur Shopify.
const EMBEDS = [
  { label: "Tarifs (toutes offres)", path: "/embed/tarifs" },
  { label: "Tarifs (Pro / Agent Business)", path: "/embed/tarifs?offres=pro" },
  { label: "Exercice — Oser vendre", path: "/embed/exercice/oser-vendre" },
];

function copier(texte, msg) {
  try {
    navigator.clipboard.writeText(texte);
    toast.success(msg || "Copié !");
  } catch {
    toast.error("Copie impossible — copie manuellement.");
  }
}

function telechargerJSON(nom, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nom; a.click();
  URL.revokeObjectURL(url);
}

function Carte({ children }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">{children}</div>;
}

function LigneURL({ label, url, snippet }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-offwhite">{label}</p>
        <p className="truncate font-mono text-xs text-offwhite/50">{url}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={() => copier(url, `URL « ${label} » copiée`)} data-testid={`copier-url-${label}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 text-xs text-offwhite/80 transition hover:text-gold">
          <Copy size={13} /> Copier l'URL
        </button>
        {snippet && (
          <button onClick={() => copier(snippet, "Code iframe copié")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 text-xs text-offwhite/80 transition hover:text-gold">
            <Code2 size={13} /> Copier l'iframe
          </button>
        )}
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 text-xs text-offwhite/80 transition hover:text-gold">
          <ExternalLink size={13} /> Ouvrir
        </a>
      </div>
    </div>
  );
}

export default function AdminPagesPubliques() {
  const iframe = (url) => `<iframe src="${url}" style="width:100%;min-height:720px;border:0;" loading="lazy" title="Zayado"></iframe>`;
  return (
    <div className="space-y-4" data-testid="admin-pages-publiques">
      <Carte>
        <div className="mb-1 flex items-center gap-2"><Globe size={16} className="text-gold" /><p className="font-semibold">Pages publiques</p></div>
        <p className="mb-4 text-[12.5px] text-offwhite/55">Les liens à relayer depuis Shopify (menu, boutons, articles). Copie l'URL et colle-la dans Shopify.</p>
        <div className="space-y-2">
          {PAGES.map((p) => <LigneURL key={p.path} label={p.label} url={`${ORIGIN}${p.path}`} />)}
        </div>
      </Carte>

      <Carte>
        <div className="mb-1 flex items-center gap-2"><Code2 size={16} className="text-gold" /><p className="font-semibold">À intégrer dans Shopify (iframe)</p></div>
        <p className="mb-4 text-[12.5px] text-offwhite/55">Blocs légers conçus pour s'insérer dans une page/article Shopify (l'iframe ajuste sa hauteur toute seule).</p>
        <div className="space-y-2">
          {EMBEDS.map((e) => {
            const url = `${ORIGIN}${e.path}`;
            return <LigneURL key={e.path} label={e.label} url={url} snippet={iframe(url)} />;
          })}
        </div>
      </Carte>

      <Carte>
        <div className="mb-1 flex items-center gap-2"><Languages size={16} className="text-gold" /><p className="font-semibold">Traductions des pages</p></div>
        <p className="mb-4 text-[12.5px] text-offwhite/55">Télécharge le dictionnaire d'une langue, corrige-le, et renvoie-le-moi (ou importe-le ensuite) : je l'applique en surcharge sans toucher au code.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => telechargerJSON("zayado-fr.json", DICTS.fr)} data-testid="dl-trad-fr"
            className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-medium text-offwhite/85 transition hover:text-gold">
            <Download size={15} /> Télécharger FR (.json)
          </button>
          <button onClick={() => telechargerJSON("zayado-en.json", DICTS.en)} data-testid="dl-trad-en"
            className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-medium text-offwhite/85 transition hover:text-gold">
            <Download size={15} /> Télécharger EN (.json)
          </button>
        </div>
        <p className="mt-3 text-xs text-offwhite/45">Astuce : garde la même structure de clés (ne change que les textes à droite des deux-points).</p>
      </Carte>
    </div>
  );
}
