import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Search, TrendingUp, TrendingDown, Minus, Copy, ExternalLink, MapPin, Users, Home, Printer, Megaphone,
  ShieldCheck, Loader2, Facebook, Info,
} from "lucide-react";
import { GlassCard } from "@/components/kairos/GlassCard";
import { fetchSignaux, saveReglagesRadar } from "@/lib/kairosApi";

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
  const save = async (patch) => {
    setEnvoi(true);
    try { await saveReglagesRadar(patch); toast.success("Radar mis à jour"); onSaved(); }
    catch { toast.error("Enregistrement impossible"); }
    setEnvoi(false);
  };
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

function Recherches({ r }) {
  const reels = r.source === "dataforseo";
  return (
    <GlassCard className="mb-5" data-testid="radar-recherches">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Search size={16} className="text-gold" />
        <p className="font-display text-lg font-semibold">Ce que tes futurs clients tapent sur Google</p>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${reels ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-offwhite/60"}`}>
          {reels ? `Volumes Google réels · ${r.perimetre || "France"}` : "Suggestions IA · volumes non activés"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-sm">
          <thead><tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-offwhite/50">
            <th className="pb-2 font-medium">Recherche</th><th className="pb-2 text-right font-medium">Par mois</th><th className="pb-2 text-right font-medium">Tendance</th><th className="pb-2 text-right font-medium">Coût/clic</th>
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
                <td className="py-2 text-right tabular-nums text-offwhite/65">{m.cpc != null ? `${Number(m.cpc).toFixed(2)} $` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!reels && <p className="mt-3 flex items-start gap-1.5 text-[11.5px] text-offwhite/50"><Info size={13} className="mt-0.5 shrink-0" /> Les volumes réels s'affichent dès que l'équipe Zayado a activé la source de données Google.</p>}
    </GlassCard>
  );
}

function Publier({ c }) {
  const [onglet, setOnglet] = useState("meta");
  const meta = c.meta || {};
  const ann = c.annonce_google || {};
  const cib = meta.ciblage || {};
  const toutMeta = [meta.texte, `Titre : ${meta.titre}`, `Description : ${meta.description}`, `Bouton : ${meta.cta}`,
    `Ciblage : ${c.ville ? c.ville + " + " : ""}${cib.rayon_km || 10} km, ${cib.age_min || 25}-${cib.age_max || 65} ans${(cib.interets || []).length ? ", intérêts : " + cib.interets.join(", ") : ""}`,
    `Budget : ${meta.budget_jour || 5} €/jour pendant ${meta.duree_jours || 7} jours`].join("\n");
  return (
    <GlassCard className="mb-5" data-testid="radar-publier">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Megaphone size={16} className="text-gold" />
        <p className="font-display text-lg font-semibold">Prêt à publier cette semaine</p>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <Onglet actif={onglet === "meta"} onClick={() => setOnglet("meta")} testid="radar-onglet-meta">Pub Facebook / Instagram</Onglet>
          <Onglet actif={onglet === "gbp"} onClick={() => setOnglet("gbp")} testid="radar-onglet-gbp">Post Google</Onglet>
          <Onglet actif={onglet === "ads"} onClick={() => setOnglet("ads")} testid="radar-onglet-ads">Annonce Google</Onglet>
        </div>
      </div>

      {onglet === "meta" && (
        <div className="grid gap-5 md:grid-cols-[minmax(0,340px)_1fr]">
          {/* Aperçu façon publication sponsorisée */}
          <div className="overflow-hidden rounded-2xl bg-white text-[#1c1e21] shadow-lg" data-testid="radar-meta-apercu">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0f1b3a] text-[11px] font-bold text-[#DEC2A3]">Z</span>
              <div className="leading-tight"><p className="text-[13px] font-semibold">Ta page</p><p className="text-[11px] text-[#65676b]">Sponsorisé</p></div>
            </div>
            <p className="whitespace-pre-line px-3 pb-2 text-[13px] leading-snug">{meta.texte}</p>
            <div className="flex aspect-[1.91/1] items-center justify-center bg-[#e9ecf2] px-6 text-center text-[11.5px] text-[#65676b]">{meta.visuel || "Ton visuel"}</div>
            <div className="flex items-center gap-3 bg-[#f0f2f5] px-3 py-2.5">
              <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold">{meta.titre}</p><p className="truncate text-[11.5px] text-[#65676b]">{meta.description}</p></div>
              <span className="shrink-0 rounded-md bg-[#e4e6eb] px-3 py-1.5 text-[12px] font-semibold">{meta.cta || "En savoir plus"}</span>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-offwhite/55">Ciblage conseillé</p>
              <p className="text-offwhite/85">{c.ville ? `${c.ville} + ` : ""}{cib.rayon_km || 10} km · {cib.age_min || 25}–{cib.age_max || 65} ans</p>
              {(cib.interets || []).length > 0 && <p className="mt-1 text-offwhite/65">Intérêts : {cib.interets.join(" · ")}</p>}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-offwhite/55">Budget test</p>
              <p className="text-offwhite/85">{meta.budget_jour || 5} € / jour pendant {meta.duree_jours || 7} jours ≈ {(meta.budget_jour || 5) * (meta.duree_jours || 7)} €</p>
            </div>
            {(meta.formulaire || []).length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-offwhite/55">Formulaire de contact</p>
                <p className="text-offwhite/80">{meta.formulaire.join(" · ")}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={() => copier(toutMeta, "Pub copiée")} className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy-900" data-testid="radar-meta-copier"><Copy size={13} /> Copier la pub</button>
              <a href="https://adsmanager.facebook.com/adsmanager/manage/campaigns" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-4 py-2 text-xs font-medium text-offwhite hover:bg-white/10"><Facebook size={13} /> Ouvrir Meta Ads <ExternalLink size={12} /></a>
            </div>
          </div>
        </div>
      )}

      {onglet === "gbp" && (
        <div>
          <p className="whitespace-pre-line rounded-xl border border-white/10 bg-white/[0.05] p-4 text-[14px] leading-relaxed text-offwhite/85">{c.post_google}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => copier(c.post_google, "Post copié")} className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy-900"><Copy size={13} /> Copier le post</button>
            <a href="https://business.google.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-4 py-2 text-xs font-medium text-offwhite hover:bg-white/10">Ouvrir ma fiche Google <ExternalLink size={12} /></a>
          </div>
          <p className="mt-3 text-[11.5px] text-offwhite/50">Un post par semaine sur ta fiche Google Business aide à remonter dans les résultats « près de moi ».</p>
        </div>
      )}

      {onglet === "ads" && (
        <div>
          <div className="rounded-xl border border-white/10 bg-white p-4 text-[#202124]">
            <p className="text-[12px] font-semibold">Sponsorisé</p>
            <p className="mt-1 text-[18px] leading-snug text-[#1a0dab]">{(ann.titres || []).join(" | ")}</p>
            <p className="mt-1 text-[13px] text-[#4d5156]">{(ann.descriptions || []).join(" ")}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => copier([...(ann.titres || []).map((t, i) => `Titre ${i + 1} : ${t}`), ...(ann.descriptions || []).map((d, i) => `Description ${i + 1} : ${d}`)].join("\n"), "Annonce copiée")}
              className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy-900"><Copy size={13} /> Copier l'annonce</button>
            <a href="https://ads.google.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-4 py-2 text-xs font-medium text-offwhite hover:bg-white/10">Ouvrir Google Ads <ExternalLink size={12} /></a>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function Ventes({ d }) {
  const imprimer = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<pre style="font:15px/1.6 Georgia,serif;white-space:pre-wrap;max-width:640px;margin:48px auto">${(d.courrier || "").replace(/</g, "&lt;")}</pre>`);
    w.document.close(); w.print();
  };
  return (
    <GlassCard className="mb-5" data-testid="radar-dvf">
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

export default function RadarSignaux({ onChange }) {
  const [sig, setSig] = useState(null);
  const charger = () => fetchSignaux().then(setSig).catch(() => setSig({ erreur: true }));
  useEffect(() => { charger(); }, []);
  if (!sig) return <div className="flex items-center gap-2 text-sm text-offwhite/55"><Loader2 size={15} className="animate-spin text-gold" /> Lecture des signaux…</div>;
  if (sig.erreur) return null;
  const apres = () => { setSig(null); charger(); onChange?.(); };
  return (
    <div data-testid="radar-signaux">
      <Reglages sig={sig} onSaved={apres} />
      {sig.manque?.includes("zone") && sig.clientele !== "b2b" && (
        <p className="mb-5 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-[13px] text-offwhite/85">Indique ta ville ci-dessus : les recherches Google, la pub et les ventes seront calculées autour de chez toi.</p>
      )}
      {sig.recherches && <Recherches r={sig.recherches} />}
      {sig.contenus && <Publier c={sig.contenus} />}
      {sig.dvf && <Ventes d={sig.dvf} />}
      {sig.clientele === "b2b" && (
        <p className="text-[13px] text-offwhite/60">Clientèle de professionnels : le Radar te propose chaque jour de vraies personnes à contacter (ci-dessus), avec un message prêt.</p>
      )}
    </div>
  );
}
