import React, { useEffect, useState } from "react";
import { apiGet, apiPut } from "@/lib/api";
import { toast } from "sonner";
import { Copy, ExternalLink, Download, Code2, Globe, Languages, Scale, PhoneCall } from "lucide-react";
import { DICTS } from "@/zy/i18n/translations";

const ORIGIN = typeof window !== "undefined" ? window.location.origin : "https://app.zayado.net";

// Pages publiques (référençables / à relayer depuis Shopify).
const PAGES_BASE = [
  { label: "Tarifs", path: "/pricing" },
  { label: "Connexion", path: "/login" },
  { label: "Tunnel Zayado (diagnostic → kit)", path: "/public/tunnel" },
  { label: "Tunnel « Créer ou reprendre ? »", path: "/public/reprise" },
  { label: "Partenariat TheSustain", path: "/partenaires/thesustain" },
  { label: "Mentions légales", path: "/legal/mentions-legales" },
  { label: "CGU", path: "/legal/cgu" },
  { label: "CGV", path: "/legal/cgv" },
  { label: "Confidentialité", path: "/legal/confidentialite" },
];

// Liens à partager sur les réseaux (aperçu avec image) : à utiliser dans les publications et les publicités.
export const LIENS_PARTAGE = [
  { label: "Partage · Créer ou reprendre ?", path: "/api/public/partage/reprise" },
  { label: "Partage · Diagnostic gratuit", path: "/api/public/partage/diagnostic" },
];

const PAGES = [...PAGES_BASE, ...LIENS_PARTAGE];

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

const CHAMPS_LEGAL = [
  ["siege", "Adresse du siège"], ["rcs", "RCS et SIREN"], ["capital", "Capital social"],
  ["directeur", "Directeur de la publication"], ["email", "E-mail de contact"],
  ["mediateur", "Médiateur de la consommation (nom et coordonnées)"],
  ["hebergeur_app", "Hébergeur de l'application (nom, pays, adresse)"],
  ["hebergeur_boutique", "Hébergeur de la boutique (nom, pays, adresse)"],
];

const SOURCES = { "tunnel-zayado": "Diagnostic", "tunnel-reprise": "Reprise sans apport" };
const PRIO = { reprendre: "Profil repreneur", creer: "Profil créateur", les_deux: "Les deux", cession: "Cédant" };

// Inscrits des tunnels Zayado : les demandes d'appel (Reprise) sont à rappeler en priorité.
function InscritsTunnels() {
  const [liste, setListe] = useState(null);
  const [filtre, setFiltre] = useState("rdv");
  useEffect(() => { apiGet("/admin/tunnel-zayado/inscrits").then(setListe).catch(() => setListe([])); }, []);
  if (!liste) return null;
  const vus = filtre === "rdv" ? liste.filter((p) => p.rdv) : liste;
  return (
    <Carte>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><PhoneCall size={16} className="text-gold" /><p className="font-semibold">Inscrits des tunnels Zayado</p></div>
        <div className="flex gap-1 text-[12px]">
          {[["rdv", `Appels à rappeler (${liste.filter((p) => p.rdv).length})`], ["tous", `Tous (${liste.length})`]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setFiltre(k)} data-testid={`inscrits-${k}`}
              className={`rounded-full px-3 py-1 ${filtre === k ? "bg-gold text-navy-900" : "bg-white/5 text-offwhite/70"}`}>{l}</button>
          ))}
        </div>
      </div>
      {vus.length === 0 ? <p className="py-3 text-[13px] text-offwhite/55">Rien pour l'instant.</p> : (
        <div className="mt-3 divide-y divide-white/10" data-testid="inscrits-liste">
          {vus.slice(0, 100).map((p) => (
            <div key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-[13px]">
              <div className="min-w-0">
                <p className="font-semibold text-offwhite">{p.prenom || "—"} <span className="font-normal text-offwhite/60">· {p.email}</span></p>
                <p className="text-offwhite/55">{SOURCES[p.source] || p.source}{p.priorite ? ` · ${PRIO[p.priorite] || p.priorite}` : ""}{p.situation && !PRIO[p.priorite] ? ` · ${p.situation}` : ""}</p>
                {p.rdv ? <p className="mt-0.5 text-gold">☎ {p.rdv.telephone || "—"} · {p.rdv.creneau || "créneau libre"}{p.rdv.projet ? ` — « ${p.rdv.projet} »` : ""}</p> : null}
              </div>
              <span className="text-[11.5px] text-offwhite/45">{p.le ? new Date(p.le).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>
            </div>
          ))}
        </div>
      )}
    </Carte>
  );
}

// Informations affichées sur /legal/mentions-legales, /legal/cgu et /legal/cgv. Champ vide = valeur par défaut.
function LegalZayado() {
  const [v, setV] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => { apiGet("/public/legal-zayado").then(setV).catch(() => setV({})); }, []);
  if (!v) return null;
  const enregistrer = async () => {
    setEnvoi(true);
    try { setV(await apiPut("/copilote/admin/legal-zayado", v)); toast.success("Mentions légales mises à jour"); }
    catch (e) { toast.error(e?.message || "Enregistrement impossible"); }
    finally { setEnvoi(false); }
  };
  return (
    <Carte>
      <div className="mb-1 flex items-center gap-2"><Scale size={16} className="text-gold" /><p className="font-semibold">Mentions légales de Zayado</p></div>
      <p className="mb-4 text-[12.5px] text-offwhite/55">S'affichent sur les pages Mentions légales, CGU et CGV. Un champ vide garde le texte par défaut (« à compléter »).</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CHAMPS_LEGAL.map(([k, l]) => (
          <label key={k} className="text-[12.5px] text-offwhite/70">{l}
            <input value={v[k] || ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} data-testid={`legal-${k}`}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-offwhite outline-none focus:border-gold/50" />
          </label>
        ))}
      </div>
      <button type="button" onClick={enregistrer} disabled={envoi} data-testid="legal-enregistrer"
        className="mt-4 rounded-full bg-gold px-4 py-2 text-[13px] font-semibold text-navy-900 disabled:opacity-60">
        {envoi ? "Enregistrement…" : "Enregistrer"}
      </button>
    </Carte>
  );
}

export default function AdminPagesPubliques() {
  const iframe = (url) => `<iframe src="${url}" style="width:100%;min-height:720px;border:0;" loading="lazy" title="Zayado"></iframe>`;
  return (
    <div className="space-y-4" data-testid="admin-pages-publiques">
      <InscritsTunnels />
      <LegalZayado />
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
