import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Sidebar } from "@/zy/components/kairos/Sidebar";
import { Header } from "@/zy/components/kairos/Header";
import { ElanMur } from "@/zy/components/vision/ElanMur";
import { PanneauCarte } from "@/zy/components/vision/BoardListe";
import {
  fetchIdees, createIdee, transformerIdee,
  fetchLettres, scellerLettre, marquerLettreLue,
  fetchBoard,
} from "@/zy/lib/kairosApi";
import {
  Zap, Feather, ArrowRight, Lock, Loader2, X, Image as ImageIcon,
} from "lucide-react";

const SOUS = {
  accueil: "Ce qui te fait tenir : tes idées qui arrivent, ton carburant, ta lettre à toi-même.",
  mur: "Photos, citations, vidéos, audio — ce qui te rappelle pourquoi tu persévères.",
  lettres: "Écrite aujourd'hui, scellée jusqu'à une date — ou relue les jours où ça penche.",
  geste: "Les idées naissent ici. Quand tu es prêt, elles deviennent objectifs et actions.",
};

export default function Elan() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const onglet = ["accueil", "mur", "lettres", "geste"].includes(params.get("tab")) ? params.get("tab") : "accueil";
  const setOnglet = (t) => setParams(t === "accueil" ? {} : { tab: t });
  const [idees, setIdees] = useState(null);
  const [lettres, setLettres] = useState(null);
  const [nbMur, setNbMur] = useState(null);

  const recharger = () => {
    fetchIdees().then((d) => setIdees(Array.isArray(d) ? d : d?.items || [])).catch(() => setIdees([]));
    fetchLettres().then((d) => setLettres(d?.items || [])).catch(() => setLettres([]));
    fetchBoard("elan").then((d) => { const c = Array.isArray(d) ? d : d?.cards || []; setNbMur(c.filter((x) => !["wall", "line", "draw", "live"].includes(x.type)).length); }).catch(() => setNbMur(0));
  };
  useEffect(() => { recharger(); }, [onglet]);

  const enAttente = (idees || []).filter((i) => i.statut !== "realisee");
  const scellees = (lettres || []).filter((l) => !l.prete);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[96px]">
        <Header />
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12" data-testid={`elan-view-${onglet}`}>
          <div className="mb-6" data-testid="elan-titre-barre">
            <h1 className="text-2xl font-bold text-offwhite sm:text-3xl">Élan</h1>
            <p className="mt-1 text-sm text-offwhite/50">{SOUS[onglet]}</p>
          </div>

          {/* Onglets pilules — la grammaire du Plan d'action */}
          <nav className="-mx-4 mb-7 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0" data-testid="elan-onglets">
            {[["accueil", "Accueil"], ["mur", `Le mur${nbMur ? ` · ${nbMur}` : ""}`], ["lettres", `Lettres${lettres?.length ? ` · ${lettres.length}` : ""}`], ["geste", `Idées${enAttente.length ? ` · ${enAttente.length}` : ""}`]].map(([k, l], i) => (
              <React.Fragment key={k}>
                {i > 0 && <ArrowRight size={13} className="shrink-0 text-offwhite/25" />}
                <button onClick={() => setOnglet(k)} data-testid={`elan-onglet-${k}`}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold transition sm:px-5 ${onglet === k ? "bg-gold text-navy-900" : "border border-white/20 bg-white/[0.05] text-offwhite/75 hover:bg-white/10"}`}>
                  {l}
                </button>
              </React.Fragment>
            ))}
          </nav>

          {onglet === "accueil" && (
            <Accueil idees={idees} nbMur={nbMur} scellees={scellees} setOnglet={setOnglet} recharger={recharger} />
          )}
          {onglet === "mur" && <ElanMur />}
          {onglet === "lettres" && <Lettres lettres={lettres} recharger={recharger} />}
          {onglet === "geste" && <Geste idees={idees} recharger={recharger} navigate={navigate} />}
        </main>
      </div>
    </div>
  );
}

// ── ACCUEIL : capture d'abord, trois portes ensuite ────────────────────────
function Accueil({ idees, nbMur, scellees, setOnglet, recharger }) {
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const capturer = async (e) => {
    e.preventDefault();
    if (!texte.trim()) return;
    setEnvoi(true);
    try {
      await createIdee({ titre: texte.trim(), source: "manuelle" });
      setTexte(""); recharger();
      toast.success("Capturée — elle t'attend dans « De l'idée à l'action ».");
    } catch { toast.error("Impossible pour le moment."); }
    setEnvoi(false);
  };
  const enAttente = (idees || []).filter((i) => i.statut !== "realisee");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 lg:p-6 md:rounded-3xl" data-testid="elan-capture">
        <p className="text-base font-semibold text-offwhite">⚡ Une idée en tête ?</p>
        <p className="mt-1 text-sm text-offwhite/50">Une ligne, deux secondes — elle ne s'envole pas. Tu décideras plus tard d'en faire quoi.</p>
        <form onSubmit={capturer} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Ex. : et si je proposais un abonnement mensuel…"
            data-testid="elan-capture-input" className="h-11 flex-1 rounded-xl border border-white/12 bg-white/[0.06] px-4 text-[14px] text-offwhite placeholder:text-offwhite/35 focus:border-gold/50 focus:outline-none" />
          <button type="submit" disabled={envoi} data-testid="elan-capture-btn" className="btn-gold h-11">
            {envoi ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />} Capturer
          </button>
        </form>
        {enAttente.length > 0 && (
          <p className="mt-3 text-[12.5px] text-offwhite/45" data-testid="elan-capture-compte">
            {enAttente.length} idée{enAttente.length > 1 ? "s" : ""} en attente · la dernière : « {enAttente[0].titre} »
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="group rounded-2xl border border-white/10 bg-white/[0.05] p-5 transition hover:border-gold/40 md:rounded-3xl cursor-pointer" onClick={() => setOnglet("mur")} data-testid="elan-tuile-mur">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold" aria-hidden><ImageIcon size={18} /></span>
          <p className="mt-3 text-[15px] font-bold text-offwhite">Le mur d'inspiration</p>
          <p className="mt-1 text-[13px] leading-relaxed text-offwhite/55">Photos, citations, vidéos, audio — ce qui te rappelle pourquoi tu persévères.</p>
          <p className="mt-3 text-[12.5px] font-semibold text-gold">{nbMur != null ? `Ouvrir le mur (${nbMur} élément${nbMur > 1 ? "s" : ""})` : "Ouvrir le mur"} →</p>
        </div>

        <div className="group rounded-2xl border border-violet-400/25 bg-violet-400/[0.06] p-5 transition hover:border-violet-400/50 md:rounded-3xl cursor-pointer" onClick={() => setOnglet("lettres")} data-testid="elan-tuile-lettres">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-violet-400/30 bg-violet-400/10 text-violet-300" aria-hidden><Feather size={18} /></span>
          <p className="mt-3 text-[15px] font-bold text-offwhite">Lettres à mon futur moi</p>
          <p className="mt-1 text-[13px] leading-relaxed text-offwhite/55">Écrite aujourd'hui, scellée, relue plus tard — surtout les jours où ça penche.</p>
          <p className="mt-3 text-[12.5px] font-semibold text-violet-300">{scellees.length ? `${scellees.length} scellée${scellees.length > 1 ? "s" : ""} · ouvrir` : "Écrire la première →"}</p>
        </div>

        <div className="group rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-5 transition hover:border-emerald-500/50 md:rounded-3xl cursor-pointer sm:col-span-2 lg:col-span-1" onClick={() => setOnglet("geste")} data-testid="elan-tuile-geste">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400" aria-hidden><Zap size={18} /></span>
          <p className="mt-3 text-[15px] font-bold text-offwhite">De l'idée à l'action</p>
          <p className="mt-1 text-[13px] leading-relaxed text-offwhite/55">Chaque idée peut devenir un objectif 90 jours ou une action — en un geste.</p>
          <p className="mt-3 text-[12.5px] font-semibold text-emerald-400">{enAttente.length ? `Transformer (${enAttente.length} en attente) →` : "Tout est transformé →"}</p>
        </div>
      </div>
    </div>
  );
}

// ── LETTRES À MON FUTUR MOI — le rituel existant du Mindset, réuni dans
//    Élan : une seule lettre scellée à la fois, texte caché jusqu'à sa date,
//    la cloche qui annonce le jour venu.
export function Lettres({ lettres, recharger, compact = false }) {
  const [ecriture, setEcriture] = useState(false);
  const [corps, setCorps] = useState("");
  const [ouverture, setOuverture] = useState("1m");
  const [dateChoisie, setDateChoisie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [lue, setLue] = useState(null);

  const dansJours = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

  const sceller = async () => {
    if (corps.trim().length < 10) { toast.error("Écris au moins quelques mots : cette lettre est pour toi."); return; }
    const ouvre_le = ouverture === "1m" ? dansJours(30) : ouverture === "3m" ? dansJours(90) : dateChoisie;
    if (!ouvre_le) { toast.error("Choisis la date d'ouverture."); return; }
    setEnvoi(true);
    try {
      await scellerLettre(corps.trim(), ouvre_le);
      setCorps(""); setEcriture(false); recharger();
      toast.success("Lettre scellée. La cloche t'annoncera le jour venu.");
    } catch (e) { toast.error(e.detail || "Impossible pour le moment."); }
    setEnvoi(false);
  };
  const relire = async (l) => {
    setLue(l);
    if (l.prete && !l.lue) { try { await marquerLettreLue(l.id); recharger(); } catch { /* le compteur suivra */ } }
  };

  const enCours = (lettres || []).find((l) => !l.prete);
  const passees = (lettres || []).filter((l) => l.prete);
  const joursRestants = (d) => Math.max(0, Math.ceil((new Date(d) - new Date()) / 86400000));

  return (
    <div className={compact ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 gap-6 lg:grid-cols-2"} data-testid="elan-lettres-liste">
      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 lg:p-6 md:rounded-3xl">
        {!ecriture ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-offwhite">✉ Écrire une nouvelle lettre</p>
              <p className="mt-1 text-sm text-offwhite/50">Le rituel qui remonte la pente — une seule à la fois, elle n'en a que plus de poids.</p>
            </div>
            <button onClick={() => setEcriture(true)} disabled={!!enCours} data-testid="elan-lettre-nouvelle" className="btn-gold !px-4 !py-2 !text-[12.5px] disabled:opacity-40"><Feather size={14} /> Écrire</button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-semibold text-offwhite">✉ Ta lettre</p>
              <button onClick={() => setEcriture(false)} aria-label="Fermer" className="rounded-lg border border-white/12 p-1.5 text-offwhite/60 hover:text-offwhite"><X size={14} /></button>
            </div>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/50">Quand s'ouvre-t-elle ?</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[["1m", "Dans 1 mois"], ["3m", "Dans 3 mois"], ["date", "À date choisie"]].map(([k, l]) => (
                <button key={k} onClick={() => setOuverture(k)} data-testid={`elan-lettre-choix-${k}`}
                  className={`rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition ${ouverture === k ? "border-gold/60 bg-gold/15 text-gold" : "border-white/12 bg-white/[0.05] text-offwhite/65 hover:bg-white/10"}`}>
                  {l}
                </button>
              ))}
            </div>
            {ouverture === "date" && (
              <input type="date" value={dateChoisie} min={dansJours(1)} onChange={(e) => setDateChoisie(e.target.value)} data-testid="elan-lettre-date"
                className="mt-3 w-full rounded-xl border border-white/12 bg-white/[0.06] px-3.5 py-2.5 text-[13.5px] text-offwhite focus:border-gold/50 focus:outline-none" />
            )}
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/50">Ta lettre</p>
            <textarea value={corps} onChange={(e) => setCorps(e.target.value)} rows={6} placeholder="Je te rappelle où tu en étais…" data-testid="elan-lettre-corps"
              className="mt-2 w-full resize-none rounded-xl border border-white/12 bg-white/[0.06] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-offwhite placeholder:text-offwhite/35 focus:border-gold/50 focus:outline-none" />
            <button onClick={sceller} disabled={envoi} data-testid="elan-lettre-sceller" className="btn-gold mt-4 !px-4 !py-2 !text-[12.5px]">
              {envoi ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />} Sceller la lettre
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 lg:p-6 md:rounded-3xl">
        <p className="text-base font-semibold text-offwhite">Tes lettres</p>
        <p className="mt-1 text-sm text-offwhite/50">Scellée jusqu'à sa date — la cloche t'annonce le jour venu.</p>
        <div className="mt-4 space-y-2.5">
          {enCours && (
            <div className="flex items-center gap-3 rounded-xl border border-gold/35 bg-gold/[0.06] p-3.5" data-testid={`elan-lettre-${enCours.id}`}>
              <span className="text-xl" aria-hidden>🔒</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-offwhite/95">Lettre scellée</p>
                <p className="mt-0.5 text-[12px] text-offwhite/45">
                  écrite le {new Date(enCours.ecrite_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · à ouvrir le {new Date(enCours.ouvre_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · {joursRestants(enCours.ouvre_le)} j
                </p>
              </div>
            </div>
          )}
          {passees.map((l) => (
            <div key={l.id} className={`flex items-center gap-3 rounded-xl border p-3.5 ${l.lue ? "border-white/10 bg-white/[0.05]" : "border-emerald-500/30 bg-emerald-500/[0.05]"}`} data-testid={`elan-lettre-${l.id}`}>
              <span className="text-xl" aria-hidden>✉</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-offwhite/95">{l.lue ? "Lettre relue" : "Lettre prête"}</p>
                <p className="mt-0.5 text-[12px] text-offwhite/45">
                  écrite le {new Date(l.ecrite_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}{l.lue ? " · déjà relue" : " · arrivée à sa date"}
                </p>
              </div>
              <button onClick={() => relire(l)} data-testid={`elan-lettre-relire-${l.id}`}
                className="shrink-0 rounded-lg border border-white/12 px-3 py-1.5 text-[12px] font-semibold text-offwhite/75 transition hover:border-gold/40 hover:text-gold">
                Relire
              </button>
            </div>
          ))}
          {lettres !== null && lettres.length === 0 && (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-[13px] text-offwhite/45" data-testid="elan-lettres-vide">
              Aucune lettre encore. La première est souvent la plus utile.
            </p>
          )}
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-offwhite/40">
          Lien avec le reste de l'app : le jour où la lettre s'ouvre, la cloche de l'en-tête t'invite à la lire — et les jours où ton énergie penche, Bien-être te rappelle qu'elle t'attend.
        </p>
      </div>

      {lue && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setLue(null)} data-testid="elan-lettre-lecture">
          <div className="w-full max-w-lg rounded-t-2xl border border-gold/25 bg-[#12224a] p-6 shadow-2xl sm:rounded-2xl md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-bold text-offwhite">✉ Ta lettre du {new Date(lue.ecrite_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>
              <button onClick={() => setLue(null)} aria-label="Refermer" className="rounded-lg border border-white/12 p-1.5 text-offwhite/60 hover:text-offwhite"><X size={14} /></button>
            </div>
            <p className="mt-4 whitespace-pre-wrap border-l-2 border-gold/40 pl-4 text-[14.5px] italic leading-relaxed text-offwhite/85">{lue.texte}</p>
            <button onClick={() => setLue(null)} className="btn-gold mt-5 !px-4 !py-2 !text-[12.5px]" data-testid="elan-lettre-refermer">Refermer</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── LE GESTE : idée → objectif ou action ───────────────────────────────────
function Geste({ idees, recharger, navigate }) {
  const enAttente = (idees || []).filter((i) => i.statut !== "realisee");
  const realisees = (idees || []).filter((i) => i.statut === "realisee");

  const vers = async (i, cible) => {
    try {
      await transformerIdee(i.id, cible, {});
      recharger();
      if (cible === "objectif") { toast.success("Devenue un objectif — retrouve-la dans le Plan d'action."); navigate("/app/actions?tab=objectifs"); }
      else { toast.success("Lancée : elle est dans « À faire » du Plan d'action."); navigate("/app/actions?tab=actions"); }
    } catch (e) { toast.error(e.detail || "Impossible pour le moment."); }
  };

  return (
    <div className="space-y-6" data-testid="elan-geste">
      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 lg:p-6 md:rounded-3xl">
        <p className="text-base font-semibold text-offwhite">Idées en attente</p>
        <p className="mt-1 text-sm text-offwhite/50">Capturées ici — transformées dans le Plan d'action. Une seule porte d'entrée.</p>
        <div className="mt-4 space-y-2.5">
          {enAttente.map((i) => (
            <div key={i.id} className="rounded-lg border border-gold/25 bg-gold/[0.05] p-3.5" data-testid={`elan-idee-${i.id}`}>
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-gold/25 bg-gold/10 text-gold" aria-hidden><Zap size={15} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-offwhite/95">{i.titre}</p>
                  <p className="mt-0.5 text-[12px] text-offwhite/45">capturée le {new Date(i.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 pl-[48px]">
                <button onClick={() => vers(i, "objectif")} data-testid={`elan-idee-objectif-${i.id}`} className="btn-gold !px-3.5 !py-1.5 !text-[12px]">
                  🌱 Transformer en objectif 90 j
                </button>
                <button onClick={() => vers(i, "action")} data-testid={`elan-idee-action-${i.id}`} className="rounded-lg border border-white/12 px-3.5 py-1.5 text-[12px] font-semibold text-offwhite/75 transition hover:border-gold/40 hover:text-gold">
                  ☑ Créer une action simple
                </button>
                <button onClick={() => toast("Gardée précieusement — elle reste sur ton élan.")} data-testid={`elan-idee-garder-${i.id}`}
                  className="rounded-lg border border-white/[0.09] px-3.5 py-1.5 text-[12px] font-semibold text-offwhite/55 hover:text-offwhite">
                  ♡ Garder précieusement
                </button>
              </div>
            </div>
          ))}
          {idees !== null && enAttente.length === 0 && (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-[13px] text-offwhite/45" data-testid="elan-geste-vide">
              Rien en attente — capture tes idées depuis l'accueil d'Élan.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 md:rounded-3xl">
        <div className="flux-elan flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:gap-3">
          {[["Élan", "l'idée naît", true], ["Plan d'action", "objectif 90 j"], ["Actions", "3 priorités/jour"], ["Aujourd'hui", "une priorité, calibrée"]].map(([t, s, vif], i) => (
            <React.Fragment key={t}>
              {i > 0 && <ArrowRight size={14} className="hidden -rotate-90 text-gold sm:inline" aria-hidden />}
              <span className={`rounded-xl border px-3.5 py-2 text-[12px] font-bold ${vif ? "border-gold/50 bg-gold/10 text-beige2" : "border-white/12 bg-white/[0.05] text-offwhite/75"}`}>
                {t} <span className="font-normal text-offwhite/45">· {s}</span>
              </span>
            </React.Fragment>
          ))}
        </div>
        {realisees.length > 0 && (
          <p className="mt-3 text-center text-[12px] text-offwhite/40" data-testid="elan-geste-realisees">
            {realisees.length} idée{realisees.length > 1 ? "s" : ""} déjà transformée{realisees.length > 1 ? "s" : ""} — regarde ce qu'elles sont devenues.
          </p>
        )}
      </div>
    </div>
  );
}
