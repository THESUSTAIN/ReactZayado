import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, TrendingUp, Heart, Target, ArrowRight, Sun, Moon, Compass, Home,
  Users, BarChart3, Sparkles, FolderOpen, ShoppingBag, Quote, CheckCircle2, Download, PartyPopper, Loader2,
} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { visionApi, visionExtApi, onboardingApi, API, getUid } from "@/lib/api";
import { usePrefs } from "@/context/PrefsContext";
import { useAuth } from "@/context/AuthContext";
import { randomCitation } from "@/lib/onboardingData";

const DEFAULT_BG = "https://images.unsplash.com/photo-1560146500-e52ca6764fc0?crop=entropy&cs=srgb&fm=jpg&q=85&w=2400";

// fix : chaque item mène désormais vraiment quelque part (path interne) au lieu
// de se contenter de fermer l'écran — cohérent avec les libellés affichés.
const DOCK = [
  { icon: Home,       label: "Cockpit",           path: "/", center: true },
  { icon: Compass,    label: "Vision",            path: "/vision-board" },
  { icon: TrendingUp, label: "Croissance",        path: "/croissance" },
  { icon: FolderOpen, label: "Espace de travail", path: "/travail" },
  { icon: BarChart3,  label: "DAF IA",            path: "/pilotage" },
  { icon: ShoppingBag,label: "Boutique",          path: "https://zayado.net/boutique" },
];

// Messages finaux professionnels — alternés aléatoirement
const READY_MESSAGES = [
  "Votre cockpit est prêt.",
  "Tout est configuré pour vous.",
  "L'IA est prête. À vous de jouer.",
  "Votre journée commence maintenant.",
  "Le Co-pilote vous attend.",
];

// Séquence d'éléments qui apparaissent un par un
const SEQUENCE = [
  { id: "header",   delay: 0 },
  { id: "time",     delay: 0.4 },
  { id: "vision",   delay: 0.9 },
  { id: "progress", delay: 1.4 },
  { id: "kpis",     delay: 1.8 },
  { id: "quote",    delay: 2.3 },
  { id: "next",     delay: 2.7 },
  { id: "dock",     delay: 3.1 },
  { id: "ready",    delay: 4.5 },  // message final
];

function useSequence() {
  const [visible, setVisible] = useState(new Set());
  useEffect(() => {
    SEQUENCE.forEach(({ id, delay }) => {
      setTimeout(() => setVisible(prev => new Set([...prev, id])), delay * 1000);
    });
  }, []);
  return (id) => visible.has(id);
}

const Appear = ({ show, children, from = "bottom", delay = 0 }) => {
  const variants = {
    hidden: {
      opacity: 0,
      y: from === "bottom" ? 20 : from === "top" ? -20 : 0,
      x: from === "left" ? -20 : from === "right" ? 20 : 0,
      scale: from === "scale" ? 0.88 : 1,
    },
    visible: {
      opacity: 1, y: 0, x: 0, scale: 1,
      transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1], delay },
    },
    exit: { opacity: 0, transition: { duration: 0.3 } },
  };
  return (
    <AnimatePresence>
      {show && (
        <motion.div variants={variants} initial="hidden" animate="visible" exit="exit">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function InspirationScreen({ onDone }) {
  const { prefs, setPref } = usePrefs();
  const { user } = useAuth();
  const [board, setBoard] = useState(null);
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState(null);
  const [visionScore, setVisionScore] = useState(null);
  const [milestone, setMilestone] = useState(null);
  const [now] = useState(new Date());
  const [leaving, setLeaving] = useState(false);
  const [citation] = useState(() => randomCitation(prefs.ambiance || "sens"));
  const [readyMsg] = useState(() => READY_MESSAGES[Math.floor(Math.random() * READY_MESSAGES.length)]);
  const [bgLoaded, setBgLoaded] = useState(false);
  const isVisible = useSequence();
  const captureRef = React.useRef(null);
  const [downloading, setDownloading] = useState(false);
  const navigate = useNavigate();
  // fix : période de grâce — évite qu'un simple clic pour repositionner le
  // curseur (ou un tap accidentel) ne ferme tout l'écran dans la première
  // seconde et demie, avant même que l'utilisateur ait pu lire l'écran.
  const [readyToClose, setReadyToClose] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReadyToClose(true), 1500);
    return () => clearTimeout(t);
  }, []);
  // fix : confirmation en deux temps pour "ne plus jamais afficher" — évite
  // de désactiver définitivement l'écran le plus soigné du produit sur un
  // clic irréfléchi.
  const [confirmNeverShow, setConfirmNeverShow] = useState(false);

  const goToDock = useCallback((item) => (e) => {
    e.stopPropagation();
    if (/^https?:\/\//.test(item.path)) { window.open(item.path, "_blank", "noopener,noreferrer"); return; }
    navigate(item.path);
    close();
  }, [navigate]); // eslint-disable-line

  const downloadImage = useCallback(async (e) => {
    e.stopPropagation(); // fix : ne pas fermer l'écran en cliquant sur "Télécharger"
    if (!captureRef.current || downloading) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(captureRef.current, { backgroundColor: "#0B1F3A", useCORS: true, scale: 2, logging: false });
      const link = document.createElement("a");
      link.download = `vision-board-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      /* silencieux — pas bloquant pour l'utilisateur */
    } finally {
      setDownloading(false);
    }
  }, [downloading]);

  useEffect(() => {
    visionApi.getBoard().then(setBoard).catch(() => setBoard({}));
    onboardingApi.get().then(setProfile).catch(() => setProfile({}));
    visionExtApi.getScore().then((s) => {
      setVisionScore(s);
      // Mini-notif de félicitations : palier de complétion nouvellement franchi (50/70/90/100)
      const score = typeof s?.global === "number" ? s.global : 0;
      const reached = [50, 70, 90, 100].filter(t => score >= t).pop() || 0;
      const last = parseInt(localStorage.getItem("zayado_vision_milestone") || "0", 10);
      if (reached > last) {
        setMilestone(reached);
        localStorage.setItem("zayado_vision_milestone", String(reached));
      }
    }).catch(() => setVisionScore(null));
    axios.get(`${API}/dashboard?user_id=${encodeURIComponent(getUid())}`)
      .then(r => setData(r.data)).catch(() => setData({}));
  }, []);

  const close = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => onDone && onDone(), 1200);
  }, [leaving, onDone]);

  // Auto-transition après 9 secondes
  useEffect(() => {
    const t = setTimeout(close, 9000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  // Identité: on privilégie le compte authentifié (user.name) avant les prefs,
  // car les prefs peuvent provenir d'un bucket partagé au tout premier chargement.
  const prenom = (user?.name || "").split(" ")[0] || profile?.profil?.prenom || prefs.first_name || data?.first_name || "";
  const vision = board?.ikigai_citation || board?.mission || data?.vision_phrase || "Quelle entreprise veux-tu construire ?";
  const nextStep = profile?.first_mission || "Définis ta prochaine étape";
  // Score de complétion réel du Vision Board (fix #1) — source unique honnête
  const vbCompletion = (typeof visionScore?.global === "number" ? visionScore.global : (board?.completion_score ?? 0));
  const objectifPct = vbCompletion;
  const heure = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const bg = prefs.inspiration_photo || (prefs.inspiration_photos?.[0]) || board?.photo_url || DEFAULT_BG;

  // KPIs honnêtes : pas de chiffres inventés. Si le backend n'a pas la donnée
  // (compte neuf sans activité), on affiche un état vide "à compléter" au lieu
  // de valeurs par défaut trompeuses (ex: 82% "Excellente").
  const energyKpi = data?.energy_score ?? data?.sante_globale?.score ?? data?.sante_globale ?? null;
  const businessKpi = (typeof data?.project_score === "number") ? data.project_score : null;
  const caDeltaKpi = (typeof data?.ca_delta_pct === "number") ? data.ca_delta_pct : null;
  const equilibreKpi = data?.bien_etre_label ? String(data.bien_etre_label).replace(" équilibre", "") : null;


  // Titre bicolore
  const words = vision.split(" ");
  const cut = Math.ceil(words.length * 0.55);
  const head = words.slice(0, cut).join(" ");
  const tail = words.slice(cut).join(" ");

  return (
    <motion.div
      className="insp2"
      data-testid="inspiration-screen"
      onClick={() => { if (readyToClose) close(); }}
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        pointerEvents: leaving ? "none" : "auto",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: leaving ? 1.1 : 0.8 }}
    >
      {/* Voile sombre qui s'épaissit au départ */}
      <motion.div
        className="insp2-veil"
        initial={{ opacity: 0.3 }}
        animate={{ opacity: leaving ? 1 : 0.55 }}
        transition={{ duration: leaving ? 1 : 1.2 }}
      />

      {/* Blur de sortie */}
      {leaving && (
        <motion.div
          style={{ position: "absolute", inset: 0, zIndex: 10, backdropFilter: "blur(16px)", background: "rgba(11,31,58,0.5)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
        />
      )}

      <div className="insp2-content" ref={captureRef} style={{ opacity: leaving ? 0 : 1, transition: "opacity 0.7s", pointerEvents: leaving ? "none" : "auto" }}>

        {/* ── MINI-NOTIF DE FÉLICITATIONS — palier de complétion franchi ── */}
        <AnimatePresence>
          {milestone && (
            <motion.div
              data-testid="insp-milestone-notif"
              initial={{ opacity: 0, y: -24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 1.2 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute", top: 74, left: "50%", transform: "translateX(-50%)", zIndex: 40,
                display: "flex", alignItems: "center", gap: 10,
                padding: "11px 20px", borderRadius: 999,
                background: "linear-gradient(90deg, rgba(214,168,95,0.95), rgba(93,202,165,0.92))",
                color: "#0B1F3A", fontSize: 14, fontWeight: 700,
                boxShadow: "0 8px 30px rgba(214,168,95,0.4)", whiteSpace: "nowrap",
              }}
            >
              <PartyPopper size={18} />
              {milestone >= 100 ? "Vision complète à 100% — félicitations !"
                : milestone >= 90 ? "90% ! Ta vision est presque complète 🎯"
                : milestone >= 70 ? "70% franchis ! Tu accélères vers ta vision."
                : "Cap franchi : 50% de ta vision est en place !"}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── HEADER ── */}
        <Appear show={isVisible("header")} from="top">
          <div className="insp2-header">
            <div className="insp2-brands">
              <div className="insp2-brand">
                <span className="insp2-logo insp2-logo-m">M</span>
                <div><b>MyExtension AI</b><span>Votre cockpit business</span></div>
              </div>
            </div>
            <div className="insp2-greet" data-testid="insp-greet">
              {now.getHours() >= 18 || now.getHours() < 5
                ? <Moon size={16} className="insp2-sun" />
                : <Sun size={16} className="insp2-sun" />}
              <span>
                {now.getHours() < 5 ? "Bonne nuit" : now.getHours() < 18 ? "Bonjour" : "Bonsoir"} {prenom}
              </span>
              <button
                onClick={downloadImage}
                disabled={downloading}
                data-testid="insp-download-btn"
                title="Télécharger cette image"
                style={{
                  marginLeft: 12, display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)",
                  color: "#fff", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 600,
                  cursor: downloading ? "default" : "pointer", opacity: downloading ? 0.6 : 1,
                }}
              >
                {downloading ? <Loader2 size={13} className="ob-spin" /> : <Download size={13} />}
                {downloading ? "Génération…" : "Télécharger"}
              </button>
              {user?.picture
                ? <img src={user.picture} alt="" className="insp2-avatar" />
                : <span className="insp2-avatar insp2-avatar-fallback">{(prenom || "?").charAt(0)}</span>}
            </div>
          </div>
        </Appear>

        {/* ── CORPS ── */}
        <div className="insp2-body">
          <div className="insp2-left">

            {/* Heure + date */}
            <Appear show={isVisible("time")} from="left">
              <div className="insp2-time" data-testid="insp-time">{heure}</div>
              <div className="insp2-date">{dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}</div>
            </Appear>

            {/* Vision phrase */}
            <Appear show={isVisible("vision")} from="left" delay={0.05}>
              <h1 className="insp2-headline" data-testid="insp-vision">
                {head} <span className="gold">{tail}</span>
              </h1>
            </Appear>

            {/* Score de complétion du Vision Board (fix #1) */}
            <Appear show={isVisible("progress")} from="bottom">
              <div className="insp2-obj" data-testid="insp-vision-completion">
                <span className="insp2-obj-label">VISION BOARD COMPLÉTÉ</span>
                <div className="insp2-obj-row">
                  <span className="insp2-obj-pct" data-testid="insp-completion-pct">{objectifPct}<sup>%</sup></span>
                  <div className="insp2-bar">
                    <motion.span
                      initial={{ width: 0 }}
                      animate={{ width: `${objectifPct}%` }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                    />
                  </div>
                </div>
                <span className="insp2-obj-sub">
                  {objectifPct >= 90 ? "Vision alignée — continue sur ta lancée."
                    : objectifPct >= 50 ? "Belle progression — complète tes piliers pour aller plus loin."
                    : "Complète ta vision (mission, piliers, objectifs) pour avancer."}
                  {visionScore?.pillars_count ? ` · ${visionScore.pillars_count} piliers` : ""}
                </span>
              </div>
            </Appear>

            {/* Prochaine étape */}
            <Appear show={isVisible("next")} from="bottom">
              <button
                className="insp2-next"
                onClick={e => { e.stopPropagation(); close(); }}
                data-testid="insp-next"
              >
                <span className="insp2-next-ic"><Target size={18} /></span>
                <div>
                  <span className="insp2-next-label">Prochaine étape :</span>
                  <p>{nextStep}</p>
                </div>
                <ArrowRight size={18} className="insp2-next-arrow" />
              </button>
            </Appear>

          </div>

          {/* ── KPIs droite ── */}
          <Appear show={isVisible("kpis")} from="right">
            <div className="insp2-kpis" data-testid="insp-kpis">
              {[
                { Icon: Zap,        label: "Énergie",        val: energyKpi != null ? `${energyKpi}%` : "—", note: energyKpi != null ? (data?.energy_label || "") : "Fais ton check-in énergie", color: energyKpi != null ? "green" : "" },
                { Icon: TrendingUp, label: "Score Business", val: businessKpi != null ? `${businessKpi}/100` : "—", note: businessKpi != null ? (caDeltaKpi != null ? `${caDeltaKpi >= 0 ? "+" : ""}${caDeltaKpi}% cette semaine` : "") : "À compléter", color: businessKpi != null ? "green" : "" },
                { Icon: Heart,      label: "Équilibre",      val: equilibreKpi || "—", note: equilibreKpi ? "Continue comme ça !" : "Fais ton check-in bien-être", color: equilibreKpi ? "green" : "" },
              ].map(({ Icon, label, val, note, color }, i) => (
                <motion.div key={label} className="insp2-kpi"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i, duration: 0.5 }}>
                  <span className="insp2-kpi-ic"><Icon size={18} /></span>
                  <div>
                    <span className="insp2-kpi-label">{label}</span>
                    <b className="insp2-kpi-val">{val}</b>
                    <span className={`insp2-kpi-note ${color}`}>{note}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </Appear>
        </div>

        {/* ── CITATION ── */}
        <Appear show={isVisible("quote")} from="bottom">
          <div className="insp2-quote">
            <Quote size={22} className="insp2-quote-mark" />
            <p>{citation}</p>
          </div>
        </Appear>

        {/* fix : indice discret dès que le clic-pour-fermer devient actif —
            avant, l'utilisateur ne savait pas qu'il pouvait cliquer avant 4.5s. */}
        <AnimatePresence>
          {readyToClose && !isVisible("ready") && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              data-testid="insp-early-hint"
              style={{
                position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
                fontSize: 11, color: "rgba(246,242,234,0.3)", margin: 0, zIndex: 15,
              }}
            >
              cliquez n'importe où pour continuer
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── DOCK ── */}
        <Appear show={isVisible("dock")} from="bottom">
          <div className="insp2-dock" data-testid="insp-dock">
            {DOCK.map((it, i) => {
              const Ic = it.icon;
              return (
                <motion.button
                  key={it.label}
                  className={`insp2-dock-item ${it.center ? "center" : ""}`}
                  onClick={goToDock(it)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.4 }}
                  data-testid={it.center ? "insp-start" : `insp-dock-${it.label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <span className="insp2-dock-ic"><Ic size={it.center ? 22 : 18} /></span>
                  <span className="insp2-dock-label">{it.label}</span>
                </motion.button>
              );
            })}
          </div>
        </Appear>

        {/* ── MESSAGE FINAL "Votre cockpit est prêt" ── */}
        <AnimatePresence>
          {isVisible("ready") && (
            <motion.div
              data-testid="insp-ready-msg"
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                bottom: 100,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
              }}
            >
              {/* Icône check animée */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 280, damping: 18 }}
                style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(93,202,165,0.2)", border: "1.5px solid rgba(93,202,165,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <CheckCircle2 size={24} style={{ color: "#5DCAA5" }} />
              </motion.div>

              {/* Message */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                style={{ fontSize: 18, fontWeight: 600, color: "#F6F2EA", margin: 0, textShadow: "0 2px 12px rgba(0,0,0,0.6)", letterSpacing: "0.01em" }}
              >
                {readyMsg}
              </motion.p>

              {/* CTA bouton */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                onClick={e => { e.stopPropagation(); close(); }}
                data-testid="insp-cta-enter"
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "11px 28px",
                  background: "#D6A85F",
                  color: "#0B1F3A",
                  border: "none", borderRadius: 50,
                  fontSize: 15, fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 24px rgba(214,168,95,0.45)",
                  letterSpacing: "0.01em",
                }}
              >
                Commencer ma journée <ArrowRight size={16} />
              </motion.button>

              {/* Sous-texte discret */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                style={{ fontSize: 12, color: "rgba(246,242,234,0.35)", margin: 0 }}
              >
                ou cliquez n'importe où
              </motion.p>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  // fix : premier clic = demande de confirmation, second clic = action réelle.
                  // Évite de désactiver définitivement l'écran le plus soigné du produit
                  // sur un clic irréfléchi.
                  if (!confirmNeverShow) { setConfirmNeverShow(true); return; }
                  setPref({ show_inspiration_screen: false });
                  close();
                }}
                data-testid="insp-never-show-again"
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: confirmNeverShow ? "rgba(246,242,234,0.6)" : "rgba(246,242,234,0.25)", textDecoration: "underline", marginTop: 2 }}
              >
                {confirmNeverShow ? "Confirmer : ne plus jamais afficher" : "Ne plus jamais afficher cet écran"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
}
