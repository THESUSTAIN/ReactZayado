import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Lenis from "lenis";
import {
  Radar as RadarGlyph, Loader2, Send, Linkedin, MessageCircle, Target, Antenna, LayoutGrid, ArrowRight, MapPin,
  Sparkles, Copy, RefreshCw, Compass, Zap, Search, Megaphone, Mail, Phone, ListPlus, Check,
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import { GlassCard } from "@/components/kairos/GlassCard";
import AiFallbackBanner from "@/components/kairos/AiFallbackBanner";
import RadarSignaux from "@/components/kairos/RadarSignaux";
import { fetchRadar, fetchSourcesRadar, saveReglagesRadar, genererSwot, lireSwot, majProspect, creerTache, creerObjectif } from "@/lib/kairosApi";
import { Ok, OkTuile, OkLigne, OkOnglets, OkBarre } from "@/components/kairos/Ok";

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

/* Quand le Radar n'a pas de cap exploitable, ce n'est pas une note de bas de page :
 * c'est la seule chose à faire sur cet écran. Avant, le message vivait dans un
 * encadré gris sous un bouton doré « Relancer le scan » qui ne pouvait rien donner —
 * l'utilisateur cliquait sur le bouton doré. Ici il n'y a plus de faux choix, et
 * l'état des sources transforme un écran vide en écran de progression. */
function CapManquant({ data, src, onEnregistre, onNaviguer, onVoirSignaux }) {
  const flou = Boolean(data?.objectif_flou);
  const actuel = (data?.objectifs_flous || [])[0] || "";
  // Pré-rempli avec le cap actuel : on vient le compléter, pas le réécrire de zéro.
  const [texte, setTexte] = useState(actuel || "");
  const [envoi, setEnvoi] = useState(false);
  const sources = Array.isArray(src?.sources) ? src.sources : [];
  const pretes = sources.filter((o) => o.actif).length;

  // Le cap se répare ICI. Avant, cet écran renvoyait vers une autre page :
  // l'utilisateur partait chercher où écrire, et ne revenait pas. Une phrase,
  // un bouton, le radar démarre — c'est tout ce que ça devait être.
  const enregistrer = async (e) => {
    e.preventDefault();
    const t = texte.trim();
    if (t.length < 8 || envoi) return;
    setEnvoi(true);
    try { await onEnregistre(t); }
    finally { setEnvoi(false); }
  };

  // Ce qui dépend vraiment du cap, et ce qui marche déjà. Tout marquer
  // « en attente » était faux : les signaux et l'annonce n'ont jamais eu
  // besoin du cap, et les présenter comme verrouillés enfermait la personne.
  const aVenir = [
    [Target, "Opportunités", "Les affaires qui collent à ton cap", null],
    [Antenna, "Signaux du terrain", "Ce que tes futurs clients cherchent près de toi", "signaux"],
    [Sparkles, "L'annonce prête à publier", "Sous le mot-clé qui la justifie", "signaux"],
  ];

  return (
    <div data-testid="radar-cap-manquant">
      <Ok or className="mt-6">
        <div className="flex flex-col gap-7 p-2 sm:flex-row sm:gap-8 sm:p-4">
          <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[17px] text-gold" style={{ background: "rgba(226,176,87,.16)" }}>
            <Compass size={23} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[25px] font-semibold leading-[1.35]">
              {flou && actuel
                ? (actuel.length <= 12
                    ? <>Ton cap tient en « <span style={{ color: "#E2B057" }}>{actuel}</span> » — c'est trop court pour chercher.</>
                    : <>Il manque une précision à « <span style={{ color: "#E2B057" }}>{actuel}</span> ».</>)
                : "Le radar attend ton cap."}
            </h2>
            <p className="mt-3 max-w-[720px] text-[14.5px] leading-[1.65] text-offwhite/62">
              {flou && actuel && actuel.length > 12
                ? "Je comprends la direction, mais pas où m'arrêter : sans nombre ni échéance, je ne sais pas ce qui compte comme une bonne opportunité. Ajoute-les et je m'y mets."
                : flou
                ? "Je ne peux pas chercher des opportunités à partir de ça — je te sortirais du bruit, et tu cesserais de me faire confiance. Donne-moi une phrase, et le radar se met en marche."
                : "Je ne sais pas encore ce que tu cherches. Donne-moi une phrase, et le radar se met en marche."}
            </p>

            <form onSubmit={enregistrer} className="mt-6 max-w-[720px]">
              <label htmlFor="radar-cap-champ" className="ok-lab">Reformule en une phrase</label>
              <div className="mt-2.5 flex flex-wrap gap-3">
                <input id="radar-cap-champ" value={texte} onChange={(e) => setTexte(e.target.value)}
                  placeholder="Signer 5 nouveaux clients d'ici 90 jours" data-testid="radar-cap-champ"
                  className="h-[50px] min-w-[240px] flex-1 rounded-[13px] px-4 text-[14.5px] text-offwhite outline-none placeholder:text-offwhite/38"
                  style={{ border: "1px solid rgba(222,194,163,.45)", background: "rgba(255,255,255,.045)" }} />
                <button type="submit" disabled={texte.trim().length < 8 || envoi} data-testid="radar-cap-enregistrer"
                  className="btn-gold !h-[50px] !rounded-[13px] !px-6 disabled:opacity-50">
                  {envoi ? <Loader2 size={15} className="animate-spin" /> : null} Enregistrer
                </button>
              </div>
              <p className="mt-3 text-[12.5px] text-offwhite/38">
                {actuel && actuel.length > 12
                  ? <>Exemple : « {actuel} — 5 dossiers d'ici 90 jours ».</>
                  : "Un verbe, un nombre, une échéance. C'est tout ce qu'il me faut."}
              </p>
              <p className="mt-4 border-t border-white/[0.08] pt-4 text-[13px] text-offwhite/55">
                En attendant, le reste du Radar fonctionne :{" "}
                <button type="button" onClick={() => onVoirSignaux("signaux")} data-testid="radar-cap-vers-signaux"
                  className="font-semibold text-gold hover:underline">voir mes signaux du terrain</button>
                {" "}— ils dépendent de ta zone, pas de ton cap.
              </p>
            </form>
          </div>
        </div>
      </Ok>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Ok data-testid="radar-cap-debloque">
          <p className="ok-lab">Ce qui se débloquera</p>
          <div className="mt-3">
            {aVenir.map(([Ic, t, d, onglet]) => (
              <OkLigne key={t} Icone={Ic} fond={onglet ? "rgba(93,202,165,.14)" : undefined}
                couleur={onglet ? "#5DCAA5" : undefined}
                titre={<span className={onglet ? "text-offwhite" : "text-offwhite/62"}>{t}</span>} sous={d}>
                {onglet ? (
                  <button onClick={() => onVoirSignaux(onglet)} data-testid={`radar-cap-ouvrir-${onglet}`}
                    className="shrink-0 text-[12.5px] font-semibold text-gold hover:underline">Déjà dispo →</button>
                ) : <span className="ok-me">en attente du cap</span>}
              </OkLigne>
            ))}
          </div>
        </Ok>

        <Ok data-testid="radar-cap-sources">
          <p className="ok-lab">Tes sources de détection</p>
          {sources.length === 0 ? (
            <p className="mt-4 text-[13px] text-offwhite/38">État des sources indisponible pour l'instant.</p>
          ) : (
            <>
              <div className="mt-3">
                {sources.map((o) => {
                  const inutile = o.etat === "inutile";
                  const fond = o.actif ? "rgba(93,202,165,.15)" : inutile ? "rgba(255,255,255,.06)" : "rgba(226,176,87,.16)";
                  const coul = o.actif ? "#5DCAA5" : inutile ? "rgba(255,255,255,.4)" : "#E2B057";
                  return (
                    <OkLigne key={o.cle} pastille={o.actif ? "●" : inutile ? "–" : "!"} fond={fond} couleur={coul}
                      titre={o.nom} sous={o.detail} chip={o.actif ? "Prête" : inutile ? "Sans objet" : "À brancher"}
                      chipFond={fond} chipCouleur={coul} />
                  );
                })}
              </div>
              <p className="mt-4 border-t border-white/[0.07] pt-3.5 text-[12px] leading-relaxed text-offwhite/38">
                {pretes} source{pretes > 1 ? "s" : ""} sur {sources.length} {pretes > 1 ? "sont prêtes" : "est prête"}.
                Le radar fonctionnera dès ton cap écrit.
              </p>
            </>
          )}
        </Ok>
      </div>
    </div>
  );
}

function Chapter({ title, sub }) {
  return (
    <div className="mb-5">
      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-gold">{sub}</p>
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

  // Le SWOT enregistré s'affiche tout de suite. Avant, chaque passage sur cet
  // onglet relançait 45 s d'analyse IA et rendait un texte différent sur les
  // mêmes données : une analyse stratégique qui change toute seule n'inspire
  // aucune confiance — et elle coûtait un appel à chaque visite.
  useEffect(() => {
    lireSwot().then((d) => { if (d && !d.vide) setSwot(d); }).catch(() => {});
  }, []);

  const generer = () => {
    setLoading(true);
    setErreur(null);
    genererSwot()
      .then(setSwot)
      .catch(() => setErreur("Analyse indisponible pour l'instant — réessaie dans un instant."))
      .finally(() => setLoading(false));
  };

  return (
    <section className="pt-6" data-testid="radar-chapter-swot">
      {manque && manque.length > 0 && !swot && (
        <GlassCard className="p-6" data-testid="radar-swot-manque">
          <p className="text-sm text-offwhite/85">Pour un SWOT utile (et pas un modèle générique), il manque encore :</p>
          <ul className="mt-3 space-y-2">
            {manque.map((m) => (
              <li key={m.cle} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
                <span className="text-sm text-offwhite/90">{m.texte}</span>
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
                <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: q.couleur }}>{q.label}</p>
                <ul className="mt-2.5 space-y-1.5">
                  {(swot[q.cle] || []).length === 0 && <li className="text-sm text-offwhite/70">Rien de notable identifié.</li>}
                  {(swot[q.cle] || []).map((item, i) => (
                    <li key={i} className="text-sm leading-relaxed text-offwhite/85">• {item}</li>
                  ))}
                </ul>
              </GlassCard>
            ))}
          </div>
          {swot.synthese && (
            <GlassCard className="mt-4 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gold">Synthèse</p>
              <p className="mt-1.5 text-sm leading-relaxed text-offwhite/90">{swot.synthese}</p>
            </GlassCard>
          )}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[12px] text-offwhite/65">Généré le {new Date(swot.genere_a).toLocaleString("fr-FR")}</p>
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
        <p className="truncate text-[14.5px] font-semibold text-offwhite">{nom || "Contact"}{p.role === "partenaire" && <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 align-middle text-[12px] font-semibold text-gold">Prescripteur</span>}</p>
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
      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-gold">Premier scan</p>
      <h2 className="mt-1 font-display text-xl font-bold text-offwhite sm:text-2xl">Deux infos et ton Radar démarre</h2>
      <form onSubmit={lancer} className="mt-5 space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-offwhite/90">Tu vends surtout à…</p>
          <div className="flex flex-wrap gap-2">
            {CLIENTELES.map((c) => (
              <button type="button" key={c.cle} onClick={() => setClientele(c.cle)} data-testid={`radar-premier-${c.cle}`}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${clientele === c.cle
                  ? "border-gold/60 bg-gold/15 text-gold" : "border-white/15 bg-white/5 text-offwhite/85 hover:border-white/30"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-offwhite/90">Ta ville ou ta zone</span>
          <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ex. Lyon, 69003, Île-de-France…"
            data-testid="radar-premier-zone"
            className="h-11 w-full max-w-sm rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-offwhite placeholder:text-offwhite/65 focus:border-gold/50 focus:outline-none" />
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
  // Tant qu'il n'y a pas de cap exploitable, le Radar ne peut rien chercher :
  // on remplace toute la page plutôt que d'afficher des onglets vides et un
  // bouton de scan qui ne peut pas aboutir.
  // Le cap manque : ça empêche de PROPOSER des opportunités, rien d'autre.
  const capBloque = Boolean(data?.objectif_flou) || Boolean(sansObjectif && opportunities.length === 0);

  const copyMessage = (op) => {
    navigator.clipboard?.writeText(op.message || "");
    toast.success("Message copié — prêt à envoyer");
  };
  // Une opportunité du Radar ne vaut que si elle survit à la journée. « Copier le
  // message » ne laissait aucune trace : le lendemain, le scan repartait de zéro et
  // le travail de la veille avait disparu. Elle devient une action du Plan d'action,
  // rattachée à l'objectif qui l'a fait naître (donc son avancement bouge).
  const [posees, setPosees] = useState({});
  const [enCours, setEnCours] = useState(null);
  const poserAction = async (op, i) => {
    if (posees[i] || enCours === i) return;
    setEnCours(i);
    try {
      await creerTache(op.titre, 15, op.objectif_id || null, "radar",
        op.source_libelle ? `Repéré par le Radar · ${op.source_libelle}` : "Repéré par le Radar");
      setPosees((p) => ({ ...p, [i]: true }));
      toast.success("Ajoutée à ton Plan d'action", {
        description: op.objectif ? `Reliée à « ${op.objectif} »` : undefined,
        action: { label: "Ouvrir", onClick: () => navigate("/app/actions?tab=actions") },
      });
    } catch {
      toast.error("Impossible de l'ajouter pour l'instant.");
    } finally {
      setEnCours(null);
    }
  };
  const versReglages = () => {
    setVue("signaux");
    const el = reglagesRef.current;
    if (el && lenisRef.current) lenisRef.current.scrollTo(el, { offset: -90, duration: 1 });
  };

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  // Le cap écrit depuis l'écran bloqué devient un vrai objectif, puis le radar
  // relance son scan immédiatement : l'utilisateur voit le résultat de sa phrase
  // dans la seconde, au lieu d'être renvoyé ailleurs et de devoir revenir.
  const enregistrerCap = async (titre) => {
    try {
      await creerObjectif(titre);
      toast.success("C'est noté — je relance le scan.");
      await chargerSources();
      await load(true);
    } catch (e) {
      toast.error(e?.detail || "Enregistrement impossible pour l'instant.");
    }
  };
  // Une seule chose à la fois : opportunités, terrain ou SWOT (avant : tout sur une page).
  // Trois onglets, pas quatre. Un onglet « Passer à l'action » séparait la pub
  // du signal qui la justifie, alors que c'est leur voisinage qui fait la valeur :
  // le compositeur vit dans « Signaux », sous son mot-clé.
  const VUES = ["opportunites", "signaux", "swot"];
  const [vue, setVue] = useState(() => {
    const h = window.location.hash.replace("#", "");
    // « terrain » : ancien nom de l'onglet, on continue de l'accepter pour que
    // les liens déjà envoyés (toasts, e-mails) ne tombent pas dans le vide.
    if (h === "terrain") return "signaux";
    return VUES.includes(h) ? h : "opportunites";
  });
  const [ouverts, setOuverts] = useState({});

  const notes = opportunities.map((o) => o.score).filter((n) => typeof n === "number");
  const scoreMoyen = notes.length ? Math.round(notes.reduce((a, b) => a + b, 0) / notes.length) : null;
  const nbReliees = opportunities.filter((o) => o.objectif_id).length;
  const sourcesListe = Array.isArray(src?.sources) ? src.sources : [];
  const sourcesTotal = sourcesListe.length;
  const sourcesPretes = sourcesListe.filter((o) => o.actif).length;
  const capUtilise = (data?.objectifs_utilises || [])[0] || null;

  // Les raisons affichées sont DÉDUITES du scan, jamais écrites d'avance : on ne
  // dit « un contact direct existe » que s'il y a réellement un contact.
  const raisons = [
    data?.phrase_ia && [Sparkles, "Lecture du jour", data.phrase_ia, "#DEC2A3"],
    nbReliees > 0 && [Target, "Rattachées à ton objectif", "Les boucler fera monter ton avancement", "#5DCAA5"],
    opportunities.some((o) => o.prospect) && [Phone, "Joignabilité", "Un contact direct existe pour au moins une d'entre elles", "#5DCAA5"],
    opportunities.some((o) => o.signal) && src?.zone && [MapPin, "Proximité", `Demande mesurée autour de ${src.zone}`, "#5DCAA5"],
    scoreMoyen != null && [Compass, "Classement", "Par proximité avec ton cap, pas par date d'arrivée", "rgba(255,255,255,.45)"],
  ].filter(Boolean).slice(0, 4);

  const titrePage = premierAcces ? "Règle ton radar."
    : capBloque && vue === "opportunites" ? "Le radar attend ton cap."
    : vue === "signaux" ? "Ce qu'ils cherchent près de toi."
    : vue === "swot" ? "Où tu en es vraiment."
    : `${opportunities.length || "Aucune"} opportunité${opportunities.length > 1 ? "s" : ""} pour toi.`;

  return (
    <div className="min-h-screen" data-testid="radar-page">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header />

        <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-8 lg:px-14">
          <AiFallbackBanner />

          {/* ── EN-TÊTE — surlignage, titre serif qui dit l'état, actions à droite.
                 Les maquettes validées n'ont pas de « bandeau » décoratif : le titre
                 EST l'information (« 4 opportunités pour toi. », « Le radar attend
                 ton cap. »), et il change avec l'onglet. ── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4" data-testid="radar-entete">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-gold">Radar · {today}</p>
              <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight sm:text-[36px]" data-testid="radar-hero-title">{titrePage}</h1>
            </div>
            {!premierAcces && (
              <div className="flex flex-wrap items-center gap-2.5">
                {!(capBloque && vue === "opportunites") && (
                  <button onClick={() => load(true)} disabled={loading} data-testid="radar-refresh-btn"
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.07] px-5 py-2.5 text-sm font-semibold text-offwhite/62 hover:text-offwhite disabled:opacity-50">
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Relancer le scan
                  </button>
                )}
                <button onClick={() => navigate("/app/actions?tab=objectifs")} data-testid="radar-vision-btn"
                  className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-navy-900 hover:bg-gold-hover">
                  <Compass size={14} /> Mon cap
                </button>
              </div>
            )}
          </div>

          {!premierAcces && (
            <div className="mt-5">
              <OkOnglets testid="radar-onglets" actif={vue} onChange={setVue}
                onglets={[
                  ["opportunites", "Opportunités", Target, opportunities.length],
                  ["signaux", "Signaux du terrain", Antenna, null],
                  ["swot", "SWOT", LayoutGrid, null],
                ]} />
            </div>
          )}

          {/* ── PREMIER ÉCRAN : premier scan, étape manquante ou opportunités ── */}
          {(premierAcces || vue === "opportunites") && <section className="pt-6" data-testid="radar-chapter-opportunites">
            {premierAcces ? (
              <PremierScan src={src} onLance={async () => { await chargerSources(); await load(true); }} />
            ) : loading && !data ? (
              <div className="grid gap-4" data-testid="radar-loading">
                {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/[0.05]" />)}
              </div>
            ) : capBloque ? (
              <CapManquant data={data} src={src} onEnregistre={enregistrerCap} onNaviguer={navigate} onVoirSignaux={setVue} />
            ) : (
              <>
                {/* Tuiles de chiffres — tous calculés depuis les vraies données du scan.
                    Aucune n'est décorative : si la valeur n'existe pas, elle affiche « — »
                    et dit pourquoi, au lieu d'inventer un nombre crédible. */}
                {/* La ligne qui manquait : sur quoi le radar a cherché ce matin.
                    Sans elle, les chiffres flottent et « non notées » reste une
                    énigme. On nomme le cap, la zone et la clientèle — les trois
                    seules entrées du scan. */}
                <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-offwhite/55" data-testid="radar-base">
                  <Search size={14} className="text-gold" />
                  <span>Recherché ce matin sur :</span>
                  {capUtilise
                    ? <b className="font-semibold text-offwhite">« {capUtilise} »</b>
                    : <button onClick={() => navigate("/app/actions?tab=objectifs")} className="font-semibold text-gold hover:underline">aucun cap — en poser un</button>}
                  {src?.zone && <>· <b className="font-semibold text-offwhite">{src.zone}</b></>}
                  {src?.clientele && <>· <b className="font-semibold text-offwhite">{{ b2c: "clientèle de particuliers", b2b: "clientèle de professionnels", mixte: "particuliers et professionnels" }[src.clientele]}</b></>}
                  <button onClick={() => setVue("signaux")} className="text-gold hover:underline">modifier</button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="radar-tuiles">
                  <OkTuile Icone={Target} label="Opportunités du jour" valeur={opportunities.length}
                    sous={canaux.length > 1 ? `sur ${canaux.length} canaux` : "sur un seul canal"} />
                  <OkTuile Icone={Compass} label="Score moyen" valeur={scoreMoyen ?? "—"}
                    sous={scoreMoyen != null
                      ? "sur 100, selon la proximité avec ton cap"
                      : "pas de note : ces pistes viennent de modèles, pas d'une analyse de ton contexte"} />
                  <OkTuile Icone={Zap} label="Reliées à ton cap" valeur={`${nbReliees}/${opportunities.length}`}
                    sous={nbReliees ? "elles feront avancer ton objectif" : "aucune n'est rattachée pour l'instant"}
                    variation={nbReliees === opportunities.length && opportunities.length > 0 ? { fort: "✓ toutes", reste: "rattachées" } : null}
                    couleur="#5DCAA5" />
                  <OkTuile Icone={Antenna} label="Sources actives" valeur={`${sourcesPretes}/${sourcesTotal || "—"}`}
                    sous={sourcesTotal ? (sourcesPretes === sourcesTotal ? "tout est branché" : "les autres attendent un réglage") : "état indisponible"}
                    variation={sourcesTotal && sourcesPretes < sourcesTotal ? { fort: `↘ ${sourcesTotal - sourcesPretes}`, reste: "en attente" } : null}
                    couleur="#E2B057" />
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
                  <Ok data-testid="radar-trouve">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="font-display text-[17px] font-semibold">Ce que le radar a trouvé</h2>
                        <p className="ok-sub !mt-1">Classé par ce que ça a à voir avec ton cap, pas par date</p>
                      </div>
                      {canaux.length > 1 && (
                        <div className="flex flex-wrap gap-1.5">
                          {["tous", ...canaux].map((c) => {
                            const meta = CANAL_META[c];
                            const active = filter === c;
                            return (
                              <button key={c} onClick={() => setFilter(c)} data-testid={`radar-filter-${c}`}
                                className={`ok-chip px-3 py-1.5 ${active ? "" : "hover:text-offwhite"}`}
                                style={active ? { background: "rgba(222,194,163,.18)", color: "#DEC2A3" } : { background: "rgba(255,255,255,.055)", color: "rgba(255,255,255,.55)" }}>
                                {c === "tous" ? "Tous" : meta.label} {counts[c] || 0}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {filtered.length === 0 ? (
                      <div className="py-10 text-center" data-testid="radar-empty-filtre">
                        <p className="text-sm text-offwhite/62">Rien sur ce canal aujourd'hui.</p>
                        <button onClick={() => setFilter("tous")} className="mt-3 text-xs font-semibold text-gold hover:underline">Tout afficher</button>
                      </div>
                    ) : filtered.map((op) => {
                      const i = opportunities.indexOf(op);
                      const meta = CANAL_META[op.canal] || CANAL_META.email;
                      const n = op.score;
                      const chaud = n != null && n >= 85;
                      const coul = chaud ? "#5DCAA5" : n != null && n >= 55 ? "#DEC2A3" : "rgba(255,255,255,.45)";
                      const fond = chaud ? "rgba(93,202,165,.15)" : n != null && n >= 55 ? "rgba(222,194,163,.16)" : "rgba(255,255,255,.07)";
                      const ouvert = ouverts[i];
                      return (
                        <div key={i} id={`radar-op-${i}`} className="ok-prow" data-testid={`radar-op-card-${i}`}
                          style={i === 0 ? { borderColor: "rgba(222,194,163,.42)" } : undefined}>
                          <button onClick={() => setOuverts((o) => ({ ...o, [i]: !o[i] }))} data-testid={`radar-op-voir-${i}`}
                            className="flex w-full items-center gap-3.5 text-left">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: fond, color: coul }}>
                              {React.createElement(meta.icon, { size: 14 })}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="ok-ti block truncate">{op.titre}</span>
                              <span className="ok-su block">{meta.label}{op.source_libelle ? ` · ${op.source_libelle}` : ""}</span>
                            </span>
                            <span className="ok-chip hidden shrink-0 sm:inline" style={{ background: fond, color: coul }}>
                              {n != null ? (chaud ? "Chaud" : n >= 55 ? "Tiède" : "Veille") : "Piste"}
                            </span>
                            <span className="w-9 shrink-0 text-right font-display text-[19px]" style={{ color: coul }} data-testid={`radar-op-score-${i}`}>{n ?? "·"}</span>
                          </button>
                          <OkBarre className="mt-3" valeur={n ?? 20} couleur={coul} />

                          {ouvert && (
                            <div className="mt-4 border-t border-white/[0.07] pt-4">
                              {op.prospect && <FicheProspect p={op.prospect} message={op.message} />}
                              <p className="mt-3 border-l-2 border-gold/30 pl-4 text-[14px] leading-relaxed text-offwhite/85">{op.message}</p>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button onClick={() => poserAction(op, i)} disabled={posees[i] || enCours === i} data-testid={`radar-action-btn-${i}`}
                                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${posees[i]
                                    ? "cursor-default border border-emerald-400/35 bg-emerald-400/10 text-emerald-300"
                                    : "bg-gold text-navy-900 hover:bg-gold-hover disabled:opacity-60"}`}>
                                  {posees[i] ? <><Check size={12} /> Dans ton plan</>
                                    : enCours === i ? <><Loader2 size={12} className="animate-spin" /> Ajout…</>
                                    : <><ListPlus size={12} /> En faire une action</>}
                                </button>
                                <button onClick={() => copyMessage(op)} data-testid={`radar-copy-btn-${i}`}
                                  className="inline-flex items-center gap-2 rounded-full border border-white/18 px-4 py-2 text-xs font-semibold text-offwhite/80 hover:bg-white/10">
                                  <Copy size={12} /> Copier le message
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </Ok>

                  <Ok data-testid="radar-pourquoi">
                    <p className="ok-lab">Pourquoi {opportunities.length > 1 ? `ces ${opportunities.length}` : "celle-ci"}</p>
                    {capUtilise && <p className="mt-2.5 font-display text-[17px] leading-[1.45]">Ton cap : {capUtilise}</p>}
                    <div className="mt-4">
                      {raisons.map(([Ic, t, d, c]) => (
                        <OkLigne key={t} Icone={Ic} fond={`${c}22`} couleur={c} titre={t} sous={d} />
                      ))}
                    </div>
                    <div className="mt-4 border-t border-white/[0.07] pt-4">
                      <p className="ok-lab">Et après</p>
                      <p className="mt-2 text-[13px] leading-relaxed text-offwhite/62">
                        Le Radar décide, le Plan d'action fait. Une opportunité retenue y devient une action,
                        avec le signal qui l'a justifiée — elle ne disparaît pas au prochain scan.
                      </p>
                      <button onClick={() => navigate("/app/actions?tab=actions")} data-testid="radar-vers-plan"
                        className="mt-3.5 inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-[13px] font-semibold text-navy-900 hover:bg-gold-hover">
                        Ouvrir mon Plan d'action <ArrowRight size={14} />
                      </button>
                    </div>
                  </Ok>
                </div>
              </>
            )}
          </section>}

          {/* ── SIGNAUX DU TERRAIN + réglages ── */}
          {!premierAcces && vue === "signaux" && (
            <section ref={reglagesRef} className="pt-6" data-testid="radar-chapter-signaux">
              <RadarSignaux onChange={() => { load(); chargerSources(); }} />
            </section>
          )}


          {/* ── SWOT (seulement s'il y a assez de données) ── */}
          {!premierAcces && vue === "swot" && <SwotSection manque={src?.swot_manque} onReglages={versReglages} />}
        </div>
      </div>
    </div>
  );
}
