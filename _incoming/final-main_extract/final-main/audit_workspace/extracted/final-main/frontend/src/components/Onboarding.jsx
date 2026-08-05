import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, Check, Loader2, Compass, Zap, Palette, PanelLeft, PanelBottom, Sun, Moon, Info } from "lucide-react";
import { usePrefs } from "@/context/PrefsContext";
import { onboardingApi } from "@/lib/api";
import BusinessIdentityCard from "@/components/BusinessIdentityCard";
import {
  STATUTS, SECTEURS, OBJECTIFS, FREINS, WORKSPACES, AI_LOADING_MESSAGES, SLIDES,
  CITATIONS_CLARTE, CITATIONS_SENS,
} from "@/lib/onboardingData";

const fade = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -24 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
};

// fix : rendu "carte" pour l'écran de synthèse — cohérent avec le glassmorphism
// utilisé partout ailleurs dans le parcours (voir bloc "Personnalisez votre cockpit").
const SUMMARY_ROW_STYLE = {
  display: "flex", flexDirection: "column", gap: 4,
  padding: "12px 14px", borderRadius: 12,
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
};
const SUMMARY_LABEL_STYLE = { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(246,242,234,0.5)" };
const SUMMARY_VALUE_STYLE = { fontSize: 14, color: "#F6F2EA" };

function Field({ label, children }) {
  return (
    <label className="ob-field">
      <span className="ob-field-label">{label}</span>
      {children}
    </label>
  );
}

export default function Onboarding({ onDone, replay = false }) {
  const { prefs, setPref } = usePrefs();
  const [screen, setScreen] = useState(0); // 0..3 slides, 4..9 étapes, 10 synthèse, 11 mémoire
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [justSaved, setJustSaved] = useState(false); // fix : petit indicateur "Brouillon enregistré" visible pour l'utilisateur
  const [form, setForm] = useState({
    prenom: "", entreprise: "", statut: "", secteur: "", projet_description: "", objectif_90j: "",
    priorites: [], ambiance: "sens", workspace_type: "none", workspace_url: "",
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  // Détection NET/TERRAIN corrigible : l'IA propose, l'utilisateur confirme ou change.
  const [typeOverride, setTypeOverride] = useState(null); // null = suit la détection auto, sinon "NET" | "TERRAIN"

  // Reprendre le questionnaire là où l'utilisateur l'a laissé (rafraîchissement de page).
  // En mode "replay" (revoir l'expérience), on repart toujours de zéro.
  useEffect(() => {
    if (replay) { setDraftLoaded(true); return; }
    onboardingApi.getDraft().then((d) => {
      if (d?.form && Object.keys(d.form).length > 0) {
        setForm((f) => ({ ...f, ...d.form }));
        if (d.screen && d.screen < 6) setScreen(d.screen); // ne reprend jamais en plein écran de chargement/révélation
      }
    }).catch(() => {}).finally(() => setDraftLoaded(true));
  }, []); // eslint-disable-line

  // Autosave débounced à chaque changement de formulaire ou d'écran (après le chargement initial)
  useEffect(() => {
    if (!draftLoaded) return;
    const t = setTimeout(() => {
      onboardingApi.saveDraft({ form, screen })
        .then(() => { setJustSaved(true); setTimeout(() => setJustSaved(false), 1800); })
        .catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [form, screen, draftLoaded]);

  // Écran de chargement IA (screen 6) — 4.5s puis révélation spectaculaire (screen 65),
  // le "aha moment" : l'utilisateur voit le résultat concret AVANT les étapes secondaires.
  useEffect(() => {
    if (screen !== 6) return;
    const timer = setTimeout(() => setScreen(65), 4600);
    return () => clearTimeout(timer);
  }, [screen]);

  const togglePriorite = (p) => {
    setForm((f) => {
      const has = f.priorites.includes(p);
      if (has) return { ...f, priorites: f.priorites.filter((x) => x !== p) };
      if (f.priorites.length >= 3) return f;
      return { ...f, priorites: [...f.priorites, p] };
    });
  };

  const autoDetectedType = (() => {
    const t = (form.projet_description || "").toLowerCase();
    const net = [
      "en ligne", "site", "saas", "app", "application", "digital", "numérique", "web",
      "plateforme", "internet", "abonnement", "logiciel", "e-commerce", "ecommerce",
      "marketplace", "réseaux sociaux", "influenceur", "coaching en ligne", "formation en ligne",
    ].some((k) => t.includes(k));
    return net ? "NET" : "TERRAIN";
  })();
  // Détection finale = celle choisie manuellement si l'utilisateur l'a corrigée, sinon l'auto-détection.
  const detectedType = typeOverride || autoDetectedType;

  const doSave = async () => {
    setSaving(true);
    try {
      const r = await onboardingApi.save({ ...form, project_type: detectedType });
      setResult(r);
    } catch {
      setResult({ type: detectedType, summary: `${form.prenom}, votre cockpit est prêt.`, first_mission: "Définir votre prochaine étape." });
    } finally {
      setSaving(false);
      setScreen(11);
    }
  };

  const finish = () => {
    setPref({ onboarded: true, ambiance: form.ambiance, first_name: form.prenom, show_inspiration_screen: true });
    onDone && onDone();
  };

  // ---------- PHASE 1 — Slides éditoriales ----------
  if (screen <= 3) {
    const s = SLIDES[screen];
    const isDark = (prefs.theme || "dark") !== "light";
    return (
      <div className="ob-overlay ob-editorial" data-testid="onboarding-overlay">
        {replay && <button onClick={() => onDone && onDone()} data-testid="ob-replay-close" className="ob-replay-close" aria-label="Fermer">✕</button>}

        {/* Toggle thème rapide dès l'intro — le choix complet (+ position du menu)
            reste disponible et détaillé à l'écran "Mémoire IA" en fin de parcours. */}
        <button
          type="button"
          onClick={() => setPref({ theme: isDark ? "light" : "dark" })}
          data-testid="ob-early-theme-toggle"
          aria-label="Aperçu rapide du thème — réglage complet disponible à la fin"
          title="Aperçu rapide — le réglage complet arrive à la fin du parcours"
          style={{
            position: "absolute", top: 18, right: 18, zIndex: 5,
            width: 38, height: 38, borderRadius: 999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(26,34,51,0.06)", border: "1px solid rgba(26,34,51,0.15)",
            color: "#1a2233", cursor: "pointer",
          }}
        >
          {isDark ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <AnimatePresence mode="wait">
          <motion.div key={screen} className="ob-slide" {...fade}>
            <span className="ob-tag" data-testid="ob-slide-tag">{s.tag}</span>
            <h1 className="ob-title ob-title-lg" data-testid="ob-slide-title">{s.title}</h1>
            <p className="ob-editorial-sub">{s.sub}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {screen > 0 && (
                <button className="ob-btn-back" onClick={() => setScreen(screen - 1)} data-testid="ob-slide-back" aria-label="Précédent">
                  <ArrowLeft size={16} />
                </button>
              )}
              <button className="ob-cta" onClick={() => setScreen(screen + 1)} data-testid="ob-slide-next">
                {s.cta} <ArrowRight size={18} />
              </button>
            </div>
            <div className="ob-dots">
              {SLIDES.map((_, i) => <span key={i} className={i === screen ? "on" : ""} />)}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ---------- Écran de chargement IA (screen 6) ----------
  if (screen === 6) {
    return (
      <div className="ob-overlay ob-loading" data-testid="onboarding-overlay">
        <motion.div className="ob-loading-inner" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <span className="ob-tag ob-tag-gold" data-testid="ob-loading-tag">L'IA CONFIGURE VOTRE COCKPIT</span>
          <div className="ob-loading-icon"><Loader2 size={40} className="ob-spin" /></div>
          <ul className="ob-loading-list" data-testid="ob-loading-list">
            {AI_LOADING_MESSAGES.map((m, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 * i }}>
                {i === AI_LOADING_MESSAGES.length - 1
                  ? <Check size={15} className="ob-msg-check" />
                  : <span className="ob-msg-dot" />}
                {m}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    );
  }

  // ---------- AHA MOMENT (screen 65) — révélation spectaculaire ----------
  // Arrive juste après la description du projet + l'écran IA — avant toute étape secondaire.
  if (screen === 65) {
    return (
      <div className="ob-overlay ob-loading" data-testid="onboarding-overlay">
        <motion.div className="ob-loading-inner" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} data-testid="ob-aha-reveal">
          <motion.span className="ob-tag ob-tag-gold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            C'EST PRÊT
          </motion.span>
          <motion.h1 className="ob-title ob-title-lg" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            {form.prenom ? `${form.prenom}, ` : ""}ton cockpit est prêt.
          </motion.h1>
          <motion.p className="ob-editorial-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
            L'IA a analysé un projet <b>{detectedType}</b> et préparé ta première mission :
            {" "}{detectedType === "TERRAIN" ? "définir ton offre principale." : "publier ta page de présentation."}
            {" "}Il ne reste plus qu'à personnaliser ta Vision Board.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
            style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", margin: "18px 0" }}>
            <span className="zchip" style={{ background: "rgba(201,164,73,0.15)", color: "#C9A449", border: "1px solid rgba(201,164,73,0.3)" }}>Profil analysé</span>
            <span className="zchip" style={{ background: "rgba(201,164,73,0.15)", color: "#C9A449", border: "1px solid rgba(201,164,73,0.3)" }}>1ère mission définie</span>
            <span className="zchip" style={{ background: "rgba(201,164,73,0.15)", color: "#C9A449", border: "1px solid rgba(201,164,73,0.3)" }}>Vision Board à personnaliser</span>
          </motion.div>
          <motion.button className="ob-cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
            onClick={() => setScreen(7)} data-testid="ob-aha-continue">
            Voir mon cockpit <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ---------- PHASE 2 & 3 — cartes glassmorphism ----------
  const stepMeta = {
    4: { tag: "VOTRE PROFIL", n: 1 },
    5: { tag: "VOTRE PROJET", n: 2 },
    7: { tag: "VOS PRIORITÉS", n: 3 },
    8: { tag: "VOTRE INSPIRATION", n: 4 },
    9: { tag: "VOS OUTILS", n: 5 },
    10: { tag: "SYNTHÈSE", n: 6 },
    11: { tag: "MÉMOIRE IA", n: 7 },
  }[screen];

  const ws = WORKSPACES.find((w) => w.id === form.workspace_type) || {};

  return (
    <div className="ob-overlay" data-testid="onboarding-overlay">
      {replay && <button onClick={() => onDone && onDone()} data-testid="ob-replay-close" className="ob-replay-close" aria-label="Fermer">✕</button>}
      <AnimatePresence mode="wait">
        <motion.div key={screen} className="ob-modal" {...fade}>
          <div className="ob-modal-head">
            <span className="ob-modal-badge"><Sparkles size={16} /></span>
            <span className="ob-modal-step">{stepMeta.tag}{stepMeta.n <= 5 ? ` · ÉTAPE ${stepMeta.n}/5` : ""}</span>
            {/* fix : indicateur de sauvegarde discret — rassure sans être intrusif */}
            <span aria-live="polite" style={{
              marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.4)",
              opacity: justSaved ? 1 : 0, transition: "opacity .3s ease",
            }}>
              <Check size={11} style={{ verticalAlign: "-1px", marginRight: 3 }} />
              Brouillon enregistré
            </span>
          </div>
          {/* fix : barre de progression globale persistante (étapes 1 à 5 seulement — synthèse/mémoire sont hors compte) */}
          {stepMeta.n <= 5 && (
            <div aria-hidden="true" style={{ height: 3, borderRadius: 999, background: "rgba(255,255,255,0.08)", margin: "2px 0 16px", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 999, background: "#C9A449",
                width: `${(stepMeta.n / 5) * 100}%`, transition: "width .4s ease",
              }} />
            </div>
          )}

          {/* Étape 1 — Profil */}
          {screen === 4 && (
            <>
              <h2 className="ob-title" data-testid="ob-step-title">Votre profil</h2>
              <p className="ob-sub">Quelques infos pour personnaliser votre cockpit.</p>
              <Field label="Prénom *">
                <input className="ob-input" value={form.prenom} data-testid="ob-prenom"
                  onChange={(e) => set({ prenom: e.target.value })} placeholder="Votre prénom" />
              </Field>
              <Field label="Nom de votre entreprise / projet">
                <input className="ob-input" value={form.entreprise} data-testid="ob-entreprise"
                  onChange={(e) => set({ entreprise: e.target.value })} placeholder="Ex : Boulangerie Croix-Rousse" />
              </Field>
              <Field label="Statut juridique">
                <input className="ob-input" list="ob-statuts-list" value={form.statut} data-testid="ob-statut"
                  onChange={(e) => set({ statut: e.target.value })} placeholder="Rechercher ou choisir…" />
                <datalist id="ob-statuts-list">
                  {STATUTS.map((o) => <option key={o} value={o} />)}
                </datalist>
              </Field>
              <Field label="Secteur d'activité">
                <input className="ob-input" list="ob-secteurs-list" value={form.secteur} data-testid="ob-secteur"
                  onChange={(e) => set({ secteur: e.target.value })} placeholder="Rechercher ou choisir…" />
                <datalist id="ob-secteurs-list">
                  {SECTEURS.map((o) => <option key={o} value={o} />)}
                </datalist>
              </Field>
              <Nav onBack={() => setScreen(3)} onNext={() => setScreen(5)} nextDisabled={!form.prenom.trim()} />
              <SkipLink onClick={() => setScreen(10)} testid="ob-skip-to-cockpit-4"
                note="Sans votre profil, le cockpit s'affichera sans personnalisation. Vous pourrez l'ajouter vous-même plus tard dans Paramètres." />
            </>
          )}

          {/* Étape 2 — Projet */}
          {screen === 5 && (
            <>
              <h2 className="ob-title" data-testid="ob-step-title">Votre projet</h2>
              <p className="ob-sub">Décrivez votre projet en 2 phrases — l'IA s'occupe du reste.</p>
              <textarea className="ob-input ob-textarea" rows={3} value={form.projet_description}
                data-testid="ob-projet"
                onChange={(e) => set({ projet_description: e.target.value })}
                placeholder="Ex : Je lance une boulangerie artisanale à Lyon. Ma cible c'est le quartier de la Croix-Rousse." />
              <Field label="Objectif principal · 90 jours">
                <select className="ob-input" value={form.objectif_90j} data-testid="ob-objectif"
                  onChange={(e) => set({ objectif_90j: e.target.value })}>
                  <option value="">Choisir…</option>
                  {OBJECTIFS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Nav onBack={() => setScreen(4)} onNext={() => setScreen(6)} nextDisabled={!form.projet_description.trim()} nextLabel="Analyser" />
              {/* fix : le lien de sortie rapide était absent sur cette étape alors qu'il existe
                  sur les étapes voisines — présence incohérente corrigée en le rendant systématique. */}
              <SkipLink onClick={() => setScreen(10)} testid="ob-skip-to-cockpit-5"
                note="Sans description de projet, l'IA ne pourra pas générer vos 3 priorités du jour. Vous pourrez la renseigner vous-même ensuite dans Paramètres." />
            </>
          )}

          {/* Étape 3 — Priorités */}
          {screen === 7 && (
            <>
              <h2 className="ob-title" data-testid="ob-step-title">Vos priorités</h2>
              <p className="ob-sub">Qu'est-ce qui freine le plus votre progression ? (max 3)</p>
              <div className="ob-chips" data-testid="ob-freins">
                {FREINS.map((p) => {
                  const active = form.priorites.includes(p);
                  return (
                    <button key={p} type="button" data-testid={`ob-frein-${FREINS.indexOf(p)}`}
                      className={`ob-chip ${active ? "on" : ""}`} onClick={() => togglePriorite(p)}>
                      {active && <Check size={13} />} {p}
                    </button>
                  );
                })}
              </div>
              <Nav onBack={() => setScreen(5)} onNext={() => setScreen(8)} nextDisabled={form.priorites.length === 0} />
              <SkipLink onClick={() => setScreen(10)} testid="ob-skip-to-cockpit-7"
                note="Vos freins aident l'IA à mieux prioriser. Si vous passez, cette info restera vide — à compléter quand vous voudrez dans Paramètres." />
            </>
          )}

          {/* Étape 4 — Ambiance */}
          {screen === 8 && (
            <>
              <h2 className="ob-title" data-testid="ob-step-title">Votre inspiration</h2>
              <p className="ob-sub">Comment voulez-vous que Zayado vous accompagne au quotidien ?</p>
              <div className="ob-ambiance">
                <button type="button" data-testid="ob-ambiance-clarte"
                  className={`ob-ambiance-card ${form.ambiance === "clarte" ? "on" : ""}`}
                  onClick={() => set({ ambiance: "clarte" })}>
                  {/* Mini-aperçu visuel réel de l'univers, pas juste une citation abstraite */}
                  <div aria-hidden="true" style={{
                    height: 46, borderRadius: 8, marginBottom: 10, overflow: "hidden",
                    background: "linear-gradient(135deg, #1a2233 0%, #2b3550 100%)",
                    border: "1px solid rgba(201,164,73,0.25)", position: "relative",
                  }}>
                    <div style={{ position: "absolute", top: 8, left: 8, right: 8, height: 4, borderRadius: 2, background: "#C9A449" }} />
                    <div style={{ position: "absolute", top: 18, left: 8, width: "55%", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.55)" }} />
                    <div style={{ position: "absolute", top: 28, left: 8, width: "30%", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.3)" }} />
                  </div>
                  <span className="ob-ambiance-name"><Zap size={15} /> Univers Clarté</span>
                  <span className="ob-ambiance-quote">« {CITATIONS_CLARTE[0]} »</span>
                  <span className="ob-ambiance-desc">Universel, motivant, orienté action et performance.</span>
                </button>
                <button type="button" data-testid="ob-ambiance-sens"
                  className={`ob-ambiance-card ${form.ambiance === "sens" ? "on" : ""}`}
                  onClick={() => set({ ambiance: "sens" })}>
                  <div aria-hidden="true" style={{
                    height: 46, borderRadius: 8, marginBottom: 10, overflow: "hidden",
                    background: "linear-gradient(135deg, #0B1F3A 0%, #14335c 100%)",
                    border: "1px solid rgba(93,202,165,0.25)", position: "relative",
                  }}>
                    <div style={{ position: "absolute", top: 8, left: 8, right: 8, height: 4, borderRadius: 2, background: "#8b6fbf" }} />
                    <div style={{ position: "absolute", top: 18, left: 8, width: "60%", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.5)" }} />
                    <div style={{ position: "absolute", top: 28, left: 8, width: "40%", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.28)" }} />
                  </div>
                  <span className="ob-ambiance-name"><Compass size={15} /> Univers Sens</span>
                  <span className="ob-ambiance-quote">« {CITATIONS_SENS[0]} »</span>
                  <span className="ob-ambiance-desc">Sagesse, intériorité, sens profond.</span>
                </button>
              </div>
              <Nav onBack={() => setScreen(7)} onNext={() => setScreen(9)} />
              <SkipLink onClick={() => setScreen(10)} testid="ob-skip-to-cockpit-8"
                note="Sans choix d'ambiance, l'univers « Clarté » sera appliqué par défaut. Vous pourrez le changer vous-même dans Paramètres." />
            </>
          )}

          {/* Étape 5 — Espace de travail */}
          {screen === 9 && (
            <>
              <h2 className="ob-title" data-testid="ob-step-title">Votre espace de travail</h2>
              <p className="ob-sub">Votre Co-pilote synchronisera les tâches validées dans votre outil.</p>
              <div className="ob-ws-list" data-testid="ob-workspaces">
                {WORKSPACES.map((w) => (
                  <button key={w.id} type="button" data-testid={`ob-ws-${w.id}`}
                    className={`ob-ws ${form.workspace_type === w.id ? "on" : ""}`}
                    onClick={() => set({ workspace_type: w.id })}>
                    {form.workspace_type === w.id ? <Check size={14} /> : <span className="ob-ws-dot" />}
                    {w.label}
                  </button>
                ))}
              </div>
              {ws.needsUrl && (
                <input className="ob-input" style={{ marginTop: 12 }} value={form.workspace_url}
                  data-testid="ob-ws-url" onChange={(e) => set({ workspace_url: e.target.value })}
                  placeholder={ws.ph} />
              )}
              <Nav onBack={() => setScreen(8)} onNext={() => setScreen(10)} nextLabel="Voir la synthèse" />
              <SkipLink onClick={() => setScreen(10)} testid="ob-skip-to-cockpit-9"
                note="Sans outil connecté, la synchro des tâches restera désactivée. Vous pourrez connecter un outil vous-même plus tard dans Paramètres." />
            </>
          )}

          {/* Synthèse */}
          {screen === 10 && (
            <>
              <h2 className="ob-title" data-testid="ob-step-title">Voici ce que l'IA a préparé pour vous, {form.prenom}.</h2>
              <ul className="ob-summary" data-testid="ob-summary" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {form.entreprise && (
                  <li style={SUMMARY_ROW_STYLE}><b style={SUMMARY_LABEL_STYLE}>Entreprise / projet</b><span style={SUMMARY_VALUE_STYLE}>{form.entreprise}</span></li>
                )}
                <li style={SUMMARY_ROW_STYLE}><b style={SUMMARY_LABEL_STYLE}>Votre projet</b><span style={SUMMARY_VALUE_STYLE}>{form.projet_description || "—"}</span></li>
                <li style={SUMMARY_ROW_STYLE}>
                  <b style={SUMMARY_LABEL_STYLE}>Type détecté</b>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className="ob-badge-type">Projet {detectedType}</span>
                    {/* Correction manuelle : l'auto-détection par mots-clés peut se tromper,
                        l'utilisateur peut la corriger avant qu'elle ne conditionne toute la suite. */}
                    <span style={{ display: "inline-flex", gap: 4 }}>
                      {["TERRAIN", "NET"].map((opt) => (
                        <button key={opt} type="button" data-testid={`ob-type-override-${opt.toLowerCase()}`}
                          onClick={() => setTypeOverride(opt)}
                          style={{
                            fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.18)", cursor: "pointer",
                            background: detectedType === opt ? "rgba(201,164,73,0.22)" : "transparent",
                            color: detectedType === opt ? "#E5C887" : "rgba(255,255,255,0.55)",
                          }}>
                          {opt}
                        </button>
                      ))}
                    </span>
                  </span>
                </li>
                <li style={SUMMARY_ROW_STYLE}><b style={SUMMARY_LABEL_STYLE}>Ambiance</b><span style={SUMMARY_VALUE_STYLE}>{form.ambiance === "clarte" ? "Univers Clarté" : "Univers Sens"}</span></li>
                <li style={SUMMARY_ROW_STYLE}><b style={SUMMARY_LABEL_STYLE}>Espace de travail</b><span style={SUMMARY_VALUE_STYLE}>{form.workspace_type === "none" ? "Non connecté" : (WORKSPACES.find((w) => w.id === form.workspace_type)?.label)}</span></li>
                <li style={SUMMARY_ROW_STYLE}><b style={SUMMARY_LABEL_STYLE}>Vos 3 priorités</b><span style={SUMMARY_VALUE_STYLE}>{form.priorites.join(" · ") || "—"}</span></li>
                <li style={SUMMARY_ROW_STYLE}><b style={SUMMARY_LABEL_STYLE}>1ère mission</b><span style={SUMMARY_VALUE_STYLE}>{detectedType === "TERRAIN" ? "Définir votre offre principale." : "Publier votre page de présentation."}</span></li>
              </ul>
              <div className="ob-nav">
                <button className="ob-btn-ghost" onClick={() => setScreen(4)} data-testid="ob-edit">Modifier mes réponses</button>
                <button className="ob-cta" onClick={doSave} disabled={saving} data-testid="ob-save">
                  {saving ? <Loader2 size={16} className="ob-spin" /> : <>Continuer <ArrowRight size={16} /></>}
                </button>
              </div>
            </>
          )}

          {/* Mémoire IA */}
          {screen === 11 && (
            <>
              <h2 className="ob-title" data-testid="ob-step-title">Plus l'IA vous connaît, plus elle vous aide.</h2>
              <p className="ob-sub">Voici la mémoire structurée extraite automatiquement — tu pourras l'ajuster à tout moment dans les Paramètres.</p>
              <BusinessIdentityCard
                prenom={form.prenom}
                vision={{
                  why: form.objectif_90j || "",
                  what: form.projet_description || "",
                  who: form.secteur || "",
                  how: form.priorites.join(" · ") || "",
                }}
              />

              {/* Fix : choix visible du thème + position du menu, avec renvoi vers Paramètres */}
              <div className="ob-appearance" data-testid="ob-appearance-block" style={{
                marginTop: 20, padding: "16px 18px", borderRadius: 14,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#F6F2EA", margin: "0 0 10px" }}>
                  <Palette size={15} /> Personnalisez votre cockpit
                </p>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  <div>
                    <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(246,242,234,0.5)", margin: "0 0 6px" }}>Thème</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[["dark", "Sombre"], ["light", "Clair"]].map(([id, label]) => (
                        <button key={id} type="button" onClick={() => setPref({ theme: id })} data-testid={`ob-theme-${id}`}
                          style={{
                            fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.15)",
                            background: (prefs.theme || "dark") === id ? "#D6A85F" : "transparent",
                            color: (prefs.theme || "dark") === id ? "#1A1408" : "#F6F2EA",
                          }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(246,242,234,0.5)", margin: "0 0 6px" }}>Position du menu</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => setPref({ menu_position: "bottom" })} data-testid="ob-menu-bottom"
                        style={{
                          display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.15)",
                          background: (prefs.menu_position || "bottom") === "bottom" ? "#D6A85F" : "transparent",
                          color: (prefs.menu_position || "bottom") === "bottom" ? "#1A1408" : "#F6F2EA",
                        }}>
                        <PanelBottom size={13} /> Bas
                      </button>
                      <button type="button" onClick={() => setPref({ menu_position: "left" })} data-testid="ob-menu-left"
                        style={{
                          display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.15)",
                          background: prefs.menu_position === "left" ? "#D6A85F" : "transparent",
                          color: prefs.menu_position === "left" ? "#1A1408" : "#F6F2EA",
                        }}>
                        <PanelLeft size={13} /> Gauche
                      </button>
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 11.5, color: "rgba(246,242,234,0.55)", marginTop: 12, marginBottom: 0 }}>
                  Modifiable à tout moment dans <b>Paramètres → Général</b>.
                </p>
              </div>

              <div className="ob-nav">
                {/* Les deux boutons faisaient auparavant exactement la même action.
                    "Vérifier ma mémoire" renvoie maintenant vers la synthèse éditable
                    (écran 10) au lieu de terminer l'onboarding par erreur. */}
                <button className="ob-btn-ghost" onClick={() => setScreen(10)} data-testid="ob-verify">Vérifier ma mémoire</button>
                <button className="ob-cta" onClick={finish} data-testid="ob-continue">C'est bon, on continue <ArrowRight size={16} /></button>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SkipLink({ onClick, testid, note }) {
  return (
    <div style={{ margin: "14px auto 0", maxWidth: 380, textAlign: "center" }}>
      <p style={{
        fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5, margin: "0 0 6px",
        display: "flex", gap: 6, alignItems: "flex-start", justifyContent: "center", textAlign: "left",
      }}>
        <Info size={13} style={{ flexShrink: 0, marginTop: 1, opacity: 0.7 }} />
        <span>{note || "Vous pouvez passer cette étape : ces infos resteront vides, mais vous pourrez les compléter vous-même à tout moment dans les Paramètres."}</span>
      </p>
      <button type="button" onClick={onClick} data-testid={testid}
        style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, textDecoration: "underline", cursor: "pointer", display: "block", margin: "0 auto" }}>
        Passer cette étape pour l'instant
      </button>
    </div>
  );
}

function Nav({ onBack, onNext, nextDisabled, nextLabel }) {
  return (
    <div className="ob-nav">
      <button className="ob-btn-back" onClick={onBack} data-testid="ob-back"><ArrowLeft size={16} /></button>
      <button className="ob-cta" onClick={onNext} disabled={nextDisabled} data-testid="ob-next">
        {nextLabel || "Continuer"} <ArrowRight size={16} />
      </button>
    </div>
  );
}
