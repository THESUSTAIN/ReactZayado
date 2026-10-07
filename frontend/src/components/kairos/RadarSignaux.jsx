import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Search, TrendingUp, TrendingDown, Minus, Copy, ExternalLink, MapPin, Users, Home, Printer, Megaphone,
  ShieldCheck, Loader2, Facebook, Info, CheckCircle2, CircleDashed, CircleSlash, Linkedin, Mail, ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/kairos/GlassCard";
import { fetchSignaux, saveReglagesRadar, fetchSourcesRadar, fetchProspects, majProspect } from "@/lib/kairosApi";
import ReponseAuSignal from "@/components/kairos/RadarAction";

// Signaux du terrain : ce que les gens tapent sur Google près de chez toi,
// une pub Facebook/Instagram prête à lancer, les ventes réelles (immobilier)
// et le réglage « qui sont mes clients ? ».

const copier = (t, label = "Copié") => { navigator.clipboard?.writeText(t || ""); toast.success(label); };
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("fr-FR"));

function Onglet({ actif, onClick, children, testid }) {
  return (
    <button onClick={onClick} data-testid={testid}
      className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition ${actif ? "bg-gold text-navy-900" : "border border-white/20 text-offwhite/75 hover:bg-white/10"}`}>
      {children}
    </button>
  );
}

function Reglages({ sig, onSaved }) {
  const [zone, setZone] = useState(sig.zone?._saisie || sig.zone?.nom || "");
  const [envoi, setEnvoi] = useState(false);
  // Replié par défaut : deux réglages qu'on pose une fois ne méritent pas le
  // haut de page à chaque visite, devant les signaux qu'on vient vraiment lire.
  const [ouvert, setOuvert] = useState(false);
  const save = async (patch) => {
    setEnvoi(true);
    try { await saveReglagesRadar(patch); toast.success("Radar mis à jour"); onSaved(); }
    catch { toast.error("Enregistrement impossible"); }
    setEnvoi(false);
  };
  const resume = [
    { b2c: "Des particuliers", b2b: "Des professionnels", mixte: "Particuliers et professionnels" }[sig.clientele] || "Clientèle à préciser",
    sig.zone?.nom || sig.zone?._saisie || "zone à indiquer",
  ].join(" · ");
  const incomplet = !sig.clientele || !(sig.zone?.nom || sig.zone?._saisie);

  if (!ouvert) {
    return (
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5"
        data-testid="radar-reglages-resume">
        <MapPin size={14} className="shrink-0 text-gold" />
        <p className="min-w-0 flex-1 truncate text-[13px] text-offwhite/70">
          {resume}
          {incomplet && <span className="ml-2 text-gold">— à compléter pour des signaux plus justes</span>}
        </p>
        <button onClick={() => setOuvert(true)} data-testid="radar-reglages-ouvrir"
          className="shrink-0 text-[12.5px] font-semibold text-gold hover:underline">Modifier</button>
      </div>
    );
  }

  return (
    <GlassCard className="mb-5" data-testid="radar-reglages">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-offwhite/60"><Users size={13} /> Mes clients sont</p>
          <div className="flex flex-wrap gap-1.5">
            {[["b2c", "Des particuliers"], ["b2b", "Des professionnels"], ["mixte", "Les deux"]].map(([k, l]) => (
              <Onglet key={k} actif={sig.clientele === k} onClick={() => save({ clientele: k })} testid={`radar-clientele-${k}`}>{l}</Onglet>
            ))}
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); save({ zone }); }} className="min-w-[220px] flex-1">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-offwhite/60"><MapPin size={13} /> Ma zone</p>
          <div className="flex gap-2">
            <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ville ou code postal" data-testid="radar-zone"
              className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.14] bg-white/[0.08] px-3 text-sm text-offwhite outline-none focus:border-gold/60" />
            <button disabled={envoi} className="h-10 rounded-xl bg-gold px-4 text-xs font-semibold text-navy-900 disabled:opacity-60" data-testid="radar-zone-ok">OK</button>
          </div>
        </form>
      </div>
      {sig.clientele === "b2c" && (
        <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-offwhite/60">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-gold" />
          Avec des particuliers, pas de prospection par e-mail sans leur accord (règle CNIL). Le Radar t'aide donc à être trouvé par ceux qui cherchent déjà, et à te faire recommander par des pros de ta zone.
        </p>
      )}
    </GlassCard>
  );
}

export function Recherches({ r }) {
  const reels = r.source === "dataforseo";
  return (
    <GlassCard data-testid="radar-recherches">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Search size={16} className="text-gold" />
        <p className="font-display text-lg font-semibold">Ce que tes futurs clients tapent sur Google</p>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${reels ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-offwhite/60"}`}>
          {reels ? `Volumes mensuels · ${r.perimetre || "France"}` : "Pistes de recherche"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[340px] text-sm">
          <thead><tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-offwhite/50">
            <th className="pb-2 font-medium">Recherche</th><th className="pb-2 text-right font-medium">Par mois</th><th className="pb-2 text-right font-medium">Tendance</th><th className="hidden pb-2 text-right font-medium 2xl:table-cell">Coût/clic</th>
          </tr></thead>
          <tbody>
            {(r.mots || []).map((m) => (
              <tr key={m.mot} className="border-b border-white/5">
                <td className="py-2 pr-3 text-offwhite/90">{m.mot}</td>
                <td className="py-2 text-right font-semibold tabular-nums text-gold">{fmt(m.volume)}</td>
                <td className="py-2 text-right tabular-nums">
                  {m.tendance == null ? <Minus size={13} className="ml-auto text-offwhite/35" /> : (
                    <span className={`inline-flex items-center gap-1 ${m.tendance >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {m.tendance >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{m.tendance > 0 ? "+" : ""}{m.tendance} %
                    </span>)}
                </td>
                <td className="hidden py-2 text-right tabular-nums text-offwhite/65 2xl:table-cell">{m.cpc != null ? `${Number(m.cpc).toFixed(2).replace(".", ",")} €` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!reels && <p className="mt-3 flex items-start gap-1.5 text-[11.5px] text-offwhite/50"><Info size={13} className="mt-0.5 shrink-0" /> Les expressions que tes clients sont susceptibles de chercher. Utilise-les dans ta fiche Google et tes annonces.</p>}
    </GlassCard>
  );
}

// (« Publier » a fusionné dans RadarAction/ReponseAuSignal : une seule annonce,
//  rattachée à son signal, au lieu d'un bloc d'onglets autonome.)

function Ventes({ d }) {
  const imprimer = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<pre style="font:15px/1.6 Georgia,serif;white-space:pre-wrap;max-width:640px;margin:48px auto">${(d.courrier || "").replace(/</g, "&lt;")}</pre>`);
    w.document.close(); w.print();
  };
  return (
    <GlassCard data-testid="radar-dvf">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Home size={16} className="text-gold" />
        <p className="font-display text-lg font-semibold">Ce qui se vend à {d.commune}</p>
        <span className="ml-auto rounded-full bg-white/10 px-2.5 py-0.5 text-[10.5px] text-offwhite/60">{d.source}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3"><p className="text-[11px] uppercase tracking-wider text-offwhite/55">Ventes depuis {d.depuis}</p><p className="mt-1 font-display text-2xl font-bold text-gold">{fmt(d.ventes)}</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3"><p className="text-[11px] uppercase tracking-wider text-offwhite/55">Maison · prix médian</p><p className="mt-1 font-display text-2xl font-bold">{d.maisons ? `${fmt(d.maisons.prix_m2_median)} €/m²` : "—"}</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3"><p className="text-[11px] uppercase tracking-wider text-offwhite/55">Appartement · prix médian</p><p className="mt-1 font-display text-2xl font-bold">{d.apparts ? `${fmt(d.apparts.prix_m2_median)} €/m²` : "—"}</p></div>
      </div>
      <p className="mt-4 mb-2 text-[11px] font-semibold uppercase tracking-wider text-offwhite/55">Courrier de boîtage prêt</p>
      <p className="whitespace-pre-line rounded-xl border border-white/10 bg-white/[0.05] p-4 text-[13.5px] leading-relaxed text-offwhite/85">{d.courrier}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => copier(d.courrier, "Courrier copié")} className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy-900"><Copy size={13} /> Copier</button>
        <button onClick={imprimer} className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-4 py-2 text-xs font-medium text-offwhite hover:bg-white/10"><Printer size={13} /> Imprimer</button>
      </div>
    </GlassCard>
  );
}

// « Sources du Radar » : état des branchements — réservé aux admins
// (le backend n'envoie `sources` qu'à un compte admin).
export function SourcesRadar({ d }) {
  const navigate = useNavigate();
  const icone = (s) => s.actif ? <CheckCircle2 size={16} className="text-emerald-300" />
    : s.etat === "inutile" ? <CircleSlash size={16} className="text-offwhite/35" />
    : <CircleDashed size={16} className="text-gold" />;
  return (
    <GlassCard className="mb-5" data-testid="radar-sources">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-offwhite/60"><Info size={13} /> Branchements du Radar (visible seulement dans la console admin)</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {d.sources.map((s) => (
          <div key={s.cle} data-testid={`radar-source-${s.cle}`} data-etat={s.etat}
            className={`flex gap-2.5 rounded-xl border p-3 ${s.actif ? "border-emerald-300/25 bg-emerald-300/[0.06]" : s.etat === "inutile" ? "border-white/[0.08] bg-white/[0.03] opacity-70" : "border-gold/25 bg-gold/[0.06]"}`}>
            <span className="mt-0.5 shrink-0">{icone(s)}</span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-offwhite">{s.nom}</p>
              <p className="text-[12px] text-offwhite/60">{s.role}</p>
              <p className={`mt-1 text-[11.5px] font-medium ${s.actif ? "text-emerald-300" : "text-offwhite/55"}`}>{s.detail}</p>
            </div>
          </div>
        ))}
      </div>
      {d.a_faire?.length > 0 && (
        <div className="mt-4 space-y-2">
          {d.a_faire.map((a) => (
            <div key={a.cle} className="flex flex-wrap items-center gap-3 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-[13px] text-offwhite/85" data-testid={`radar-afaire-${a.cle}`}>
              <span className="min-w-0 flex-1">{a.texte}</span>
              {a.lien && <button onClick={() => navigate(a.lien)} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-gold hover:underline">Y aller <ArrowRight size={13} /></button>}
            </div>
          ))}
        </div>
      )}
      {d.admin?.variables_manquantes?.length > 0 && (
        <p className="mt-4 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-2.5 text-[12.5px] text-offwhite/85" data-testid="radar-admin-variables">
          <b>Admin</b> · variables à ajouter sur Railway (service backend) : {d.admin.variables_manquantes.map((v) => <code key={v} className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-[11.5px]">{v}</code>)}
        </p>
      )}
    </GlassCard>
  );
}

// Étapes à faire côté utilisateur (sans aucun détail technique).
function AFaire({ items }) {
  const navigate = useNavigate();
  if (!items?.length) return null;
  return (
    <div className="mb-5 space-y-2" data-testid="radar-afaire">
      {items.map((a) => (
        <div key={a.cle} className="flex flex-wrap items-center gap-3 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-[13px] text-offwhite/85" data-testid={`radar-afaire-${a.cle}`}>
          <span className="min-w-0 flex-1">{a.texte}</span>
          {a.lien && <button onClick={() => navigate(a.lien)} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-gold hover:underline">Y aller <ArrowRight size={13} /></button>}
        </div>
      ))}
    </div>
  );
}

// « Mes contacts » : les personnes trouvées pour l'utilisateur, avec leur suivi.
const STATUTS = [["nouveau", "À contacter"], ["contacte", "Contacté"], ["en_discussion", "En discussion"], ["signe", "Signé"], ["ecarte", "Écarté"]];
function Contacts() {
  const [items, setItems] = useState(null);
  useEffect(() => { fetchProspects().then((d) => setItems(d.items || [])).catch(() => setItems([])); }, []);
  if (!items || items.length === 0) return null;
  const changer = async (id, statut) => {
    try { const p = await majProspect(id, statut); setItems((x) => x.map((e) => (e.id === id ? p : e))); } catch { toast.error("Mise à jour impossible"); }
  };
  return (
    <GlassCard className="mb-5" data-testid="radar-contacts">
      <div className="mb-3 flex items-center gap-2">
        <Users size={16} className="text-gold" />
        <p className="font-display text-lg font-semibold">Mes contacts trouvés</p>
        <span className="ml-auto text-[11.5px] text-offwhite/55">{items.length} au total</span>
      </div>
      <div className="divide-y divide-white/[0.08]">
        {items.slice(0, 30).map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 py-3" data-testid="radar-contact">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-offwhite">{[p.prenom, p.nom].filter(Boolean).join(" ") || "Contact"}{p.role === "partenaire" && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10.5px] font-medium text-offwhite/70">prescripteur</span>}</p>
              <p className="truncate text-[12px] text-offwhite/60">{[p.titre, p.entreprise, p.ville].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {p.message && <button onClick={() => copier(p.message, "Message copié")} aria-label="Copier le message" className="rounded-lg p-2 text-offwhite/60 hover:bg-white/10 hover:text-gold"><Copy size={14} /></button>}
              {p.email && <a href={`mailto:${p.email}`} aria-label="E-mail" className="rounded-lg p-2 text-offwhite/60 hover:bg-white/10 hover:text-gold"><Mail size={14} /></a>}
              {p.linkedin && <a href={p.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="rounded-lg p-2 text-offwhite/60 hover:bg-white/10 hover:text-gold"><Linkedin size={14} /></a>}
              <select value={p.statut} onChange={(e) => changer(p.id, e.target.value)} data-testid="radar-contact-statut"
                className="h-8 rounded-lg border border-white/[0.14] bg-[#1a2a55] px-2 text-[12px] text-offwhite outline-none">
                {STATUTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// Vue « Signaux » : UNIQUEMENT ce que le radar MESURE (réglages, recherches,
// ventes, contacts). Ce qu'on en fait — l'annonce prête à publier — vit dans
// l'onglet « Passer à l'action » : cette fonctionnalité, la plus riche du
// produit, était enterrée au bas d'un onglet au nom vague et personne ne la
// trouvait. Mesure d'un côté, réponse de l'autre, dans cet ordre.
export default function RadarSignaux({ onChange }) {
  const [sig, setSig] = useState(null);
  const [src, setSrc] = useState(null);
  const charger = () => {
    fetchSignaux().then(setSig).catch(() => setSig({ erreur: true }));
    fetchSourcesRadar().then(setSrc).catch(() => setSrc(null));
  };
  useEffect(() => { charger(); }, []);
  if (!sig) return <div className="flex items-center gap-2 text-sm text-offwhite/55"><Loader2 size={15} className="animate-spin text-gold" /> Lecture des signaux…</div>;
  if (sig.erreur) return null;
  const apres = () => { setSig(null); charger(); onChange?.(); };
  return (
    <div data-testid="radar-signaux">
      <Reglages sig={sig} onSaved={apres} />
      {/* Les branchements techniques (clés, variables) ne s'affichent plus ici : Admin › Branchements. */}
      <AFaire items={src?.a_faire} />
      <Contacts />
      {!src && sig.manque?.includes("zone") && sig.clientele !== "b2b" && (
        <p className="mb-5 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-[13px] text-offwhite/85">Indique ta ville ci-dessus : les recherches Google, la pub et les ventes seront calculées autour de chez toi.</p>
      )}
      {(sig.recherches || sig.contenus) && (
        <div className="mb-5 grid items-start gap-5 xl:grid-cols-[1fr_1.12fr]" data-testid="radar-signal-reponse">
          <div className="space-y-5">
            {sig.recherches && <Recherches r={sig.recherches} />}
            {sig.dvf && <Ventes d={sig.dvf} />}
          </div>
          {sig.contenus && <ReponseAuSignal contenus={sig.contenus} recherches={sig.recherches} />}
        </div>
      )}
      {!sig.recherches && !sig.contenus && sig.dvf && <Ventes d={sig.dvf} />}
      {sig.clientele === "b2b" && (
        <p className="text-[13px] text-offwhite/60">Clientèle de professionnels : le Radar te propose chaque jour de vraies personnes à contacter (dans les opportunités ci-dessus et dans « Mes contacts trouvés »), avec un message prêt.</p>
      )}
    </div>
  );
}
