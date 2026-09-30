import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Lenis from "lenis";
import {
  Radar as RadarGlyph, Loader2, Send, Linkedin, MessageCircle,
  Sparkles, Copy, RefreshCw, Compass, Zap, Search, Megaphone, Mail, Phone,
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import { GlassCard } from "@/components/kairos/GlassCard";
import AiFallbackBanner from "@/components/kairos/AiFallbackBanner";
import RadarSignaux from "@/components/kairos/RadarSignaux";
import { fetchRadar, fetchSourcesRadar, saveReglagesRadar, genererSwot, majProspect } from "@/lib/kairosApi";

const CANAL_META = {
  email: { icon: Send, color: "#DEC2A3", label: "Email" },
  linkedin: { icon: Linkedin, color: "#5B8DEF", label: "LinkedIn" },
  whatsapp: { icon: MessageCircle, color: "#25D366", label: "WhatsApp" },
  google: { icon: Search, color: "#8AB4F8", label: "Google" },
  meta: { icon: Megaphone, color: "#9AA7FF", label: "Facebook / Instagram" },
  courrier: { icon: Mail, color: "#F1E2CC", label: "Courrier" },
  appel: { icon: Phone, color: "#7DD3C0", label: "Appel" },
};

const EASE = [0.22, 1, 0.36, 1];

// Apparition douce au montage (plus de sections grisées tant qu'on n'a pas scrollé).
function Reveal({ children, delay = 0, className = "" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }} className={className}>
      {children}
    </motion.div>
  );
}

function Chapter({ title, sub }) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">{sub}</p>
      <h2 className="mt-1 font-display text-xl font-bold text-offwhite sm:text-2xl">{title}</h2>
    </div>
  );
}

const SWOT_QUADRANTS = [
  { cle: "forces", label: "Forces", couleur: "#7A9E7E" },
  { cle: "faiblesses", label: "Faiblesses", couleur: "#B9524E" },
  { cle: "opportunites", label: "Opportunités", couleur: "#DEC2A3" },
  { cle: "menaces", label: "Menaces", couleur: "#7C93C3" },
];

// Branché sur POST /radar/swot — prêt côté serveur depuis un moment,
// jamais relié à l'écran avant (retour Marie Esther : « le SWOT utile ? »).
function SwotSection({ manque, onReglages }) {
  const navigate = useNavigate();
  const [swot, setSwot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);

  const generer = () => {
    setLoading(true);
    setErreur(null);
    genererSwot()
      .then(setSwot)
      .catch(() => setErreur("Analyse indisponible pour l'instant — réessaie dans un instant."))
      .finally(() => setLoading(false));
  };

  return (
    <section className="pt-14" data-testid="radar-chapter-swot">
      <Chapter sub="Vue d'ensemble" title="Ton SWOT, généré par l'IA" />
      {manque && manque.length > 0 && !swot && (
        <GlassCard className="p-6" data-testid="radar-swot-manque">
          <p className="text-sm text-offwhite/75">Pour un SWOT utile (et pas un modèle générique), il manque encore :</p>
          <ul className="mt-3 space-y-2">
            {manque.map((m) => (
              <li key={m.cle} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
                <span className="text-sm text-offwhite/80">{m.texte}</span>
                <button onClick={() => (m.lien ? navigate(m.lien) : onReglages())}
                  className="shrink-0 text-xs font-semibold text-gold hover:underline">Compléter</button>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
      {(!manque || manque.length === 0) && !swot && !loading && (
        <GlassCard className="p-6 text-center">
          <p className="text-sm text-offwhite/65">Une analyse forces / faiblesses / opportunités / menaces à partir de ton vrai contexte — pas un modèle générique.</p>
          <button onClick={generer} data-testid="radar-swot-generer" className="btn-gold mt-4 inline-flex items-center gap-2 !px-6 !py-2.5">
            <Sparkles size={15} /> Générer mon SWOT
          </button>
          {erreur && <p className="mt-3 text-xs text-rose-300">{erreur}</p>}
        </GlassCard>
      )}
      {loading && (
        <GlassCard className="flex items-center justify-center gap-2 p-8 text-sm text-offwhite/60">
          <Loader2 size={16} className="animate-spin" /> Analyse en cours…
        </GlassCard>
      )}
      {swot && !loading && (
        <div data-testid="radar-swot-resultat">
          <div className="grid gap-4 sm:grid-cols-2">
            {SWOT_QUADRANTS.map((q) => (
              <GlassCard key={q.cle} className="p-5" data-testid={`radar-swot-${q.cle}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: q.couleur }}>{q.label}</p>
                <ul className="mt-2.5 space-y-1.5">
                  {(swot[q.cle] || []).length === 0 && <li className="text-sm text-offwhite/45">Rien de notable identifié.</li>}
                  {(swot[q.cle] || []).map((item, i) => (
                    <li key={i} className="text-sm leading-relaxed text-offwhite/75">• {item}</li>
                  ))}
                </ul>
              </GlassCard>
            ))}
          </div>
          {swot.synthese && (
            <GlassCard className="mt-4 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Synthèse</p>
              <p className="mt-1.5 text-sm leading-relaxed text-offwhite/80">{swot.synthese}</p>
            </GlassCard>
          )}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] text-offwhite/40">Généré le {new Date(swot.genere_a).toLocaleString("fr-FR")}</p>
            <button onClick={generer} data-testid="radar-swot-regenerer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:underline">
              <RefreshCw size={12} /> Régénérer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// Vrai prospect : identité, liens directs et suivi du contact.
function FicheProspect({ p, message }) {
  const [statut, setStatut] = useState(p.statut || "nouveau");
  const changer = async (v) => {
    setStatut(v);
    try {
      await majProspect(p.id, v);
      if (v === "ecarte") {
        toast("Un refus fait partie du jeu.", { description: "5 minutes pour rebondir : parcours « Rebondir après un refus ».",
          action: { label: "Ouvrir", onClick: () => { window.location.href = "/app/bien-etre?tab=parcours&p=rebondir"; } } });
      } else toast.success(v === "contacte" ? "Noté comme contacté" : "Statut mis à jour");
    }
    catch { toast.error("Mise à jour impossible"); }
  };
  const nom = [p.prenom, p.nom].filter(Boolean).join(" ");
  const sujet = encodeURIComponent("Prise de contact");
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3" data-testid="radar-prospect">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] font-display text-sm font-bold text-navy-900">
        {(p.prenom || "?").slice(0, 1)}{(p.nom || "").slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold text-offwhite">{nom || "Contact"}{p.role === "partenaire" && <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 align-middle text-[10px] font-semibold text-gold">Prescripteur</span>}</p>
        <p className="truncate text-[12.5px] text-offwhite/60">{[p.titre, p.entreprise, p.ville].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {p.linkedin && <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/20 px-3 py-1.5 text-[12px] font-medium text-offwhite hover:bg-white/10">LinkedIn</a>}
        {p.email && <a href={`mailto:${p.email}?subject=${sujet}&body=${encodeURIComponent(message || "")}`} className="rounded-full border border-white/20 px-3 py-1.5 text-[12px] font-medium text-offwhite hover:bg-white/10">E-mail</a>}
        {p.domaine && <a href={p.domaine.startsWith("http") ? p.domaine : `https://${p.domaine}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/20 px-3 py-1.5 text-[12px] font-medium text-offwhite hover:bg-white/10">Site</a>}
        <select value={statut} onChange={(e) => changer(e.target.value)} className="rounded-full border border-white/20 bg-transparent px-2.5 py-1.5 text-[12px] text-offwhite" data-testid="radar-prospect-statut">
          <option value="nouveau" className="bg-navy-800">À contacter</option>
          <option value="contacte" className="bg-navy-800">Contacté</option>
          <option value="en_discussion" className="bg-navy-800">En discussion</option>
          <option value="signe" className="bg-navy-800">Signé</option>
          <option value="ecarte" className="bg-navy-800">Écarté</option>
        </select>
      </div>
    </div>
  );
}

const CLIENTELES = [
  { cle: "b2c", label: "Des particuliers" },
  { cle: "b2b", label: "Des professionnels" },
  { cle: "mixte", label: "Les deux" },
];

// Premier accès : ville + clientèle, un seul bouton.
function PremierScan({ src, onLance }) {
  const [clientele, setClientele] = useState(src?.clientele_choisie ? src.clientele : "");
  const [zone, setZone] = useState(src?.zone || "");
  const [envoi, setEnvoi] = useState(false);
  const pret = clientele && zone.trim().length >= 2;
  const lancer = async (e) => {
    e.preventDefault();
    if (!pret) return;
    setEnvoi(true);
    try { await saveReglagesRadar({ clientele, zone: zone.trim() }); await onLance(); }
    catch { toast.error("Enregistrement impossible, réessaie."); }
    finally { setEnvoi(false); }
  };
  return (
    <GlassCard gold className="p-6 sm:p-8" data-testid="radar-premier-scan">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">Premier scan</p>
      <h2 className="mt-1 font-display text-xl font-bold text-offwhite sm:text-2xl">Deux infos et ton Radar démarre</h2>
      <form onSubmit={lancer} className="mt-5 space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-offwhite/80">Tu vends surtout à…</p>
          <div className="flex flex-wrap gap-2">
            {CLIENTELES.map((c) => (
              <button type="button" key={c.cle} onClick={() => setClientele(c.cle)} data-testid={`radar-premier-${c.cle}`}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${clientele === c.cle
                  ? "border-gold/60 bg-gold/15 text-gold" : "border-white/15 bg-white/5 text-offwhite/75 hover:border-white/30"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-offwhite/80">Ta ville ou ta zone</span>
          <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ex. Lyon, 69003, Île-de-France…"
            data-testid="radar-premier-zone"
            className="h-11 w-full max-w-sm rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/50 focus:outline-none" />
        </label>
        <button disabled={!pret || envoi} data-testid="radar-premier-lancer" className="btn-gold disabled:opacity-50">
          {envoi ? <Loader2 size={15} className="animate-spin" /> : <RadarGlyph size={15} />} Lancer mon premier scan
        </button>
      </form>
    </GlassCard>
  );
}

export default function Radar() {
  const [data, setData] = useState(null);
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("tous");
  const navigate = useNavigate();
  const lenisRef = useRef(null);
  const reglagesRef = useRef(null);

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenisRef.current = lenis;
    let raf;
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);

  const chargerSources = () => fetchSourcesRadar().then(setSrc).catch(() => setSrc({}));
  const load = (refresh = false) => {
    setLoading(true);
    return fetchRadar(refresh)
      .then((d) => {
        setData(d);
        if (refresh && d.limite_relances) toast.info("Tu as déjà relancé le scan 5 fois aujourd'hui : voici les dernières opportunités.");
      })
      .catch(() => toast.error("Radar indisponible"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); chargerSources(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const opportunities = useMemo(() => data?.opportunities || [], [data]);
  const counts = useMemo(() => {
    const c = { tous: opportunities.length };
    opportunities.forEach((op) => { c[op.canal] = (c[op.canal] || 0) + 1; });
    return c;
  }, [opportunities]);
  const filtered = filter === "tous" ? opportunities : opportunities.filter((op) => op.canal === filter);
  const canaux = Object.keys(CANAL_META).filter((k) => counts[k]);

  const premierAcces = src && src.clientele_choisie === false && !src.zone;
  const sansObjectif = src ? src.objectifs === 0 : data?.manque_objectif;

  const copyMessage = (op) => {
    navigator.clipboard?.writeText(op.message || "");
    toast.success("Message copié — prêt à envoyer");
  };
  const versReglages = () => {
    const el = reglagesRef.current;
    if (el && lenisRef.current) lenisRef.current.scrollTo(el, { offset: -90, duration: 1 });
  };

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen" data-testid="radar-page">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header />

        <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-8 lg:px-14">
          <AiFallbackBanner />

          {/* ── BANDEAU ── */}
          <section className="relative mt-2 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-5 sm:px-7" data-testid="radar-bandeau">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gold/[0.08] blur-3xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                  <RadarGlyph size={22} />
                </span>
                <div className="min-w-0">
                  <h1 className="font-display text-2xl font-extrabold text-offwhite sm:text-3xl" data-testid="radar-hero-title">
                    Radar <span className="font-serif-italic font-normal text-offwhite/75">du jour</span>
                  </h1>
                  <p className="mt-0.5 text-xs capitalize text-offwhite/55">Scan · {today}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!premierAcces && (
                  <button onClick={() => load(true)} disabled={loading} data-testid="radar-refresh-btn" className="btn-gold !py-2 disabled:opacity-50">
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Relancer le scan
                  </button>
                )}
                <button onClick={() => navigate("/app/vision")} data-testid="radar-vision-btn" className="btn-ghost !py-2">
                  <Compass size={15} className="text-gold" /> Ma Vision
                </button>
              </div>
            </div>
            {!premierAcces && !sansObjectif && data?.phrase_ia && (
              <p className="relative mt-4 font-serif-italic text-base leading-relaxed text-offwhite/80" data-testid="radar-phrase-card">« {data.phrase_ia} »</p>
            )}
            {!premierAcces && (data?.objectifs_utilises || []).length > 0 && (
              <div className="relative mt-3 flex flex-wrap gap-2">
                {data.objectifs_utilises.map((o, i) => (
                  <span key={i} data-testid={`radar-objectif-${i}`}
                    className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] text-offwhite/75">
                    <Zap size={11} className="shrink-0 text-gold" /> <span className="truncate">{o}</span>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* ── PREMIER ÉCRAN : premier scan, étape manquante ou opportunités ── */}
          <section className="pt-8" data-testid="radar-chapter-opportunites">
            {premierAcces ? (
              <PremierScan src={src} onLance={async () => { await chargerSources(); await load(true); }} />
            ) : loading && !data ? (
              <div className="grid gap-4" data-testid="radar-loading">
                {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/[0.05]" />)}
              </div>
            ) : sansObjectif && opportunities.length === 0 ? (
              <GlassCard gold className="p-6 sm:p-8" data-testid="radar-empty-state">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">Étape manquante</p>
                <h2 className="mt-1 font-display text-xl font-bold text-offwhite">Donne un cap à ton Radar</h2>
                <p className="mt-2 max-w-xl text-sm text-offwhite/65">
                  N'importe quel objectif suffit : un objectif à 90 jours, ton objectif à 3 ans ou quelques lignes de Vision.
                  Le Radar s'en sert pour choisir tes 3 opportunités du jour.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button onClick={() => navigate("/app/actions?tab=objectifs")} data-testid="radar-empty-vision-btn" className="btn-gold">
                    <Zap size={15} /> Poser un objectif
                  </button>
                  <button onClick={() => navigate("/parametres#vision")} className="btn-ghost">
                    <Compass size={15} className="text-gold" /> Écrire ma Vision
                  </button>
                </div>
              </GlassCard>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <Chapter sub="Aujourd'hui" title={`${opportunities.length || "Aucune"} opportunité${opportunities.length > 1 ? "s" : ""} pour toi`} />
                  {canaux.length > 1 && (
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                      {["tous", ...canaux].map((c) => {
                        const meta = CANAL_META[c];
                        const active = filter === c;
                        return (
                          <button key={c} onClick={() => setFilter(c)} data-testid={`radar-filter-${c}`}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${active
                              ? "border-gold/60 bg-gold/15 text-gold" : "border-white/12 bg-white/5 text-offwhite/60 hover:text-offwhite"}`}>
                            {meta && React.createElement(meta.icon, { size: 12, style: { color: meta.color } })}
                            {c === "tous" ? "Tous" : meta.label}
                            <span className="rounded-full bg-white/10 px-1.5 text-[10px]">{counts[c] || 0}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {filtered.length === 0 ? (
                  <GlassCard className="py-10 text-center" data-testid="radar-empty-filtre">
                    <p className="text-sm text-offwhite/65">Rien sur ce canal aujourd'hui.</p>
                    <button onClick={() => setFilter("tous")} className="mt-3 text-xs font-semibold text-gold hover:underline">Tout afficher</button>
                  </GlassCard>
                ) : (
                  <div className="space-y-4">
                    {filtered.map((op) => {
                      const i = opportunities.indexOf(op);
                      const meta = CANAL_META[op.canal] || CANAL_META.email;
                      return (
                        <Reveal key={i} delay={i * 0.06}>
                          <GlassCard id={`radar-op-${i}`} className="group relative overflow-hidden transition-colors duration-300 hover:border-gold/35" data-testid={`radar-op-card-${i}`}>
                            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                              <div className="flex items-center gap-3 sm:flex-col sm:items-center">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl"
                                  style={{ background: `${meta.color}1c`, color: meta.color, border: `1px solid ${meta.color}44` }}>
                                  {React.createElement(meta.icon, { size: 19 })}
                                </span>
                                {op.score != null ? (
                                  <div className="text-center">
                                    <p className="font-display text-xl font-extrabold text-gold" data-testid={`radar-op-score-${i}`}>{op.score}</p>
                                    <p className="text-[9px] uppercase tracking-[0.2em] text-offwhite/45">score</p>
                                  </div>
                                ) : (
                                  <p className="text-center text-[9px] uppercase tracking-[0.2em] text-offwhite/45" data-testid={`radar-op-piste-${i}`}>piste</p>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-offwhite/50">
                                  {meta.label}{op.objectif ? <> · relié à « {op.objectif} »</> : null}
                                </p>
                                <h3 className="mt-1 font-display text-lg font-bold text-offwhite sm:text-xl">{op.titre}</h3>
                                {op.prospect && <FicheProspect p={op.prospect} message={op.message} />}
                                <p className="mt-3 max-w-2xl border-l-2 border-gold/30 pl-4 font-serif-italic text-[15px] leading-relaxed text-offwhite/75">{op.message}</p>
                              </div>
                              <div className="flex shrink-0 sm:flex-col sm:items-end">
                                <button onClick={() => copyMessage(op)} data-testid={`radar-copy-btn-${i}`}
                                  className="inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold transition-colors hover:bg-gold hover:text-navy-900">
                                  <Copy size={12} /> Copier le message
                                </button>
                              </div>
                            </div>
                          </GlassCard>
                        </Reveal>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>

          {/* ── SIGNAUX DU TERRAIN + réglages ── */}
          {!premierAcces && (
            <section ref={reglagesRef} className="pt-14" data-testid="radar-chapter-signaux">
              <Chapter sub="Le terrain" title="Signaux autour de toi" />
              <RadarSignaux onChange={() => { load(); chargerSources(); }} />
            </section>
          )}

          {/* ── SWOT (seulement s'il y a assez de données) ── */}
          {!premierAcces && <SwotSection manque={src?.swot_manque} onReglages={versReglages} />}
        </div>
      </div>
    </div>
  );
}
