import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, ArrowLeft, ArrowRight, Loader2, Target, Trash2, Check, Pause, Play, Link2, Lightbulb, Lock, Zap, Radar, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import { GlassCard } from "@/components/kairos/GlassCard";
import {
  fetchTaches, creerTache, majTacheStatut, relierTache, supprimerTache, questionIntegrations, repondreIntegrations,
  fetchObjectifs, creerObjectif, majObjectif, supprimerObjectif,
  fetchIdees, createIdee, transformerIdee, fetchState,
} from "@/lib/kairosApi";
import { verdictDuJour, vitalsDuJour } from "@/lib/charge";
import { Ok } from "@/components/kairos/Ok";
import { ProcessusContenu } from "@/pages/Processus";
import { IdeesContenu } from "@/pages/Ideas";
import { aDroit, planEffectif } from "@/lib/droits";
import { chargerAbonnement } from "@/lib/acces";

// « Plan d'action » : un seul endroit pour ce qui était éparpillé (Objectifs dans
// Vision, Actions, Processus). Objectif → actions → processus, reliés :
//   • une action peut être reliée à un objectif ; l'avancement de l'objectif
//     se calcule tout seul (part des actions terminées) ;
//   • une étape de processus devient une action en un clic (reliée à l'objectif du processus).

const COLONNES = [
  { key: "a_faire", label: "À faire", accent: "text-gold", dot: "bg-gold" },
  { key: "en_cours", label: "En cours", accent: "text-blue-300", dot: "bg-blue-400" },
  { key: "fait", label: "Terminé", accent: "text-emerald-300", dot: "bg-emerald-400" },
];
const ORDRE = ["a_faire", "en_cours", "fait"];
const TEINTES = ["#DEC2A3", "#60A5FA", "#34D399", "#F472B6", "#A78BFA"];
const CHAMP = "rounded-xl border border-white/[0.14] bg-white/[0.08] px-3.5 text-sm text-offwhite outline-none placeholder:text-offwhite/40 focus:border-gold/60";
const dateFr = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "");

// Un seul parcours : Idées → Objectifs → Actions → Processus (avant : « Idées » était une page à part).
function Onglets({ onglet, setOnglet, n, verrous }) {
  return (
    <nav className="-mx-4 mb-7 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0" data-testid="plan-onglets">
      {[["idees", `Idées${n.idees ? ` · ${n.idees}` : ""}`], ["objectifs", `Objectifs${n.objectifs ? ` · ${n.objectifs}` : ""}`], ["actions", `Actions${n.actions ? ` · ${n.actions}` : ""}`], ["processus", "Processus"]].map(([k, l], i) => (
        <React.Fragment key={k}>
          {i > 0 && <ArrowRight size={13} className="shrink-0 text-offwhite/25" />}
          <button onClick={() => setOnglet(k)} data-testid={`plan-onglet-${k}`}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-[13.5px] font-semibold transition sm:px-5 ${onglet === k ? "bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] text-navy-900" : "border border-white/20 bg-white/[0.05] text-offwhite/75 hover:bg-white/10"}`}>
            {verrous.includes(k) && <Lock size={12} />}{l}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
}

function Verrou() {
  return (
    <GlassCard className="text-center" data-testid="plan-verrou">
      <Lock size={22} className="mx-auto text-gold" />
      <p className="mt-3 font-display text-lg font-semibold text-offwhite">Les actions et les processus sont inclus à partir de l'offre Solo</p>
      <p className="mx-auto mt-1 max-w-md text-[13.5px] text-offwhite/60">Avec Rêveur, tu gardes tes idées et tes objectifs. Passe à Solo pour les transformer en actions et suivre ton avancement.</p>
      <Link to="/parametres#offre" className="btn-gold mt-4 inline-flex">Voir les offres</Link>
    </GlassCard>
  );
}

function Objectifs({ objectifs, couleur, recharger, voirActions }) {
  const [titre, setTitre] = useState("");
  const [echeance, setEcheance] = useState("");
  const [ajoutAction, setAjoutAction] = useState({});
  const creer = async (e) => {
    e.preventDefault();
    if (titre.trim().length < 2) return;
    try { await creerObjectif(titre.trim(), echeance || null); setTitre(""); setEcheance(""); recharger(); toast.success("Objectif ajouté"); }
    catch (err) { toast.error(err.message || "Ajout impossible"); }
  };
  const ajouterAction = async (o) => {
    const t = (ajoutAction[o.id] || "").trim();
    if (!t) return;
    try { await creerTache(t, 25, o.id); setAjoutAction((x) => ({ ...x, [o.id]: "" })); recharger(); toast.success("Action ajoutée à l'objectif"); }
    catch { toast.error("Ajout impossible"); }
  };
  const statut = async (o, s) => { try { await majObjectif(o.id, { statut: s }); recharger(); } catch (e) { toast.error(e.message || "Impossible"); } };
  const supprimer = async (o) => {
    if (!window.confirm(`Supprimer l'objectif « ${o.titre} » ? Ses actions sont conservées.`)) return;
    try { await supprimerObjectif(o.id); recharger(); } catch { toast.error("Suppression impossible"); }
  };

  return (
    <div data-testid="plan-objectifs">
      <form onSubmit={creer} className="mb-6 flex flex-wrap gap-2">
        <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Nouvel objectif (ex. Signer 3 nouveaux clients)" className={`${CHAMP} h-11 min-w-[220px] flex-1`} data-testid="plan-objectif-titre" />
        <input type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} className={`${CHAMP} h-11 w-[160px]`} title="Échéance (par défaut : dans 90 jours)" />
        <button className="btn-gold h-11" data-testid="plan-objectif-ajouter"><Plus size={15} /> Ajouter</button>
      </form>
      {objectifs.length === 0 && <p className="text-[14px] text-offwhite/60">Aucun objectif pour l'instant. 3 objectifs à 90 jours suffisent : chaque action que tu ajoutes ensuite les fait avancer.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {objectifs.map((o) => (
          <GlassCard key={o.id} className={o.statut !== "actif" ? "opacity-70" : ""} data-testid={`plan-objectif-${o.id}`}>
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: couleur(o.id) }} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[17px] font-semibold leading-snug text-offwhite">{o.titre}</p>
                <p className="mt-0.5 text-[12px] text-offwhite/55">
                  {o.echeance ? `Échéance ${dateFr(o.echeance)}` : "Sans échéance"}{o.statut === "termine" ? " · atteint 🎉" : o.statut === "pause" ? " · en pause" : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {o.statut === "actif"
                  ? <button onClick={() => statut(o, "pause")} title="Mettre en pause" className="rounded-lg p-1.5 text-offwhite/50 hover:bg-white/10"><Pause size={14} /></button>
                  : <button onClick={() => statut(o, "actif")} title="Réactiver" className="rounded-lg p-1.5 text-offwhite/50 hover:bg-white/10"><Play size={14} /></button>}
                <button onClick={() => supprimer(o)} title="Supprimer" className="rounded-lg p-1.5 text-offwhite/50 hover:bg-rose-400/10 hover:text-rose-300"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full transition-all" style={{ width: `${o.progression || 0}%`, background: couleur(o.id) }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[12px] text-offwhite/60">
              <span>{o.progression || 0} %</span>
              <button onClick={() => voirActions(o.id)} className="font-semibold text-gold hover:underline" disabled={!o.nb_actions}>
                {o.nb_actions ? `${o.nb_faites}/${o.nb_actions} actions faites →` : "Aucune action reliée"}
              </button>
            </div>
            {o.statut === "actif" && (
              <form onSubmit={(e) => { e.preventDefault(); ajouterAction(o); }} className="mt-4 flex gap-2">
                <input value={ajoutAction[o.id] || ""} onChange={(e) => setAjoutAction((x) => ({ ...x, [o.id]: e.target.value }))} placeholder="+ Une action pour cet objectif"
                  className={`${CHAMP} h-9 min-w-0 flex-1 text-[13px]`} data-testid={`plan-objectif-action-${o.id}`} />
                <button className="h-9 rounded-xl border border-gold/40 px-3 text-[12px] font-semibold text-gold hover:bg-gold/10">Ajouter</button>
              </form>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

// ── La liaison rendue visible : l'énergie plafonne la charge ──
// Bien-être disait « une seule tâche essentielle aujourd'hui » et le Plan d'action
// affichait les douze mêmes cartes, sans rien en savoir. Le copilote se contredisait
// d'un écran à l'autre. Le verdict vient de la même règle (lib/charge.js) et il AGIT :
// il garde ce que la journée supporte et reporte le reste, visiblement.
function Anneau({ valeur, couleur }) {
  const r = 31, c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0 text-center" style={{ width: 76 }}>
      <svg width="76" height="76" style={{ transform: "rotate(-90deg)" }} aria-hidden>
        <circle cx="38" cy="38" r={r} stroke="rgba(255,255,255,.1)" strokeWidth="7" fill="none" />
        <circle cx="38" cy="38" r={r} stroke={couleur} strokeWidth="7" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, valeur / 100)))} />
      </svg>
      <span className="absolute inset-x-0 top-[26px] font-display text-[21px]">{valeur}</span>
      <p className="mt-1 text-[10.5px] text-offwhite/38">énergie</p>
    </div>
  );
}

function ChargeDuJour({ verdict, aCheckin, gardees, reportees, onTout, tout }) {
  const navigate = useNavigate();
  if (!aCheckin) {
    return (
      <Ok className="mb-5" data-testid="actions-charge-sans-checkin">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13.5px] text-offwhite/62">
            Pas encore de check-in aujourd'hui — 30 secondes, et ton plan s'adapte à ton énergie.
          </p>
          <Link to="/app/bien-etre" className="shrink-0 text-[12.5px] font-semibold text-gold hover:underline">Faire mon check-in</Link>
        </div>
      </Ok>
    );
  }
  if (!verdict) return null;
  const total = gardees + reportees;
  return (
    <div className="ok mb-5" style={{ borderColor: `${verdict.couleur}66` }} data-testid="actions-charge">
      <div className="ok-pad flex flex-wrap items-center gap-6">
        <Anneau valeur={verdict.energie} couleur={verdict.couleur} />
        <div className="min-w-[260px] flex-1">
          <p className="ok-lab" style={{ color: verdict.couleur }}>Ton plan a été ajusté ce matin</p>
          <p className="mt-2 font-display text-[21px] leading-[1.4]">
            Énergie à {verdict.energie}. J'ai gardé{" "}
            <span style={{ color: verdict.couleur }} data-testid="actions-charge-niveau">
              {gardees} action{gardees > 1 ? "s" : ""} sur {total}
            </span>.
          </p>
          <p className="mt-2 max-w-[760px] text-[13.5px] leading-[1.55] text-offwhite/62">
            {reportees > 0
              ? <>{reportees === 1 ? "L'autre t'attend" : `Les ${reportees} autres t'attendent`} demain — {reportees === 1 ? "elle n'est pas perdue, juste décalée" : "elles ne sont pas perdues, juste décalées"}. Tu peux en remettre une si tu te sens mieux que ce que disait ton check-in.</>
              : <>{verdict.phrase}</>}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <button onClick={() => navigate("/app/bien-etre")} data-testid="actions-charge-checkin"
            className="rounded-full border border-white/18 px-4 py-2 text-[12.5px] font-semibold text-offwhite/80 hover:bg-white/10">
            Refaire mon check-in
          </button>
          {reportees > 0 && (
            <button onClick={onTout} data-testid="actions-charge-focus"
              className="rounded-full px-4 py-2 text-[12.5px] font-semibold text-offwhite/45 hover:text-offwhite">
              {tout ? "Revenir à ma journée" : "Voir tout mon plan"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Vue « journée plafonnée » : ce qu'on fait aujourd'hui, et ce que le copilote a
// reporté — avec le droit de le remettre d'un clic. Il reporte, il ne supprime jamais.
function JourneePlafonnee({ gardees, reportees, objectifs, couleur, onRemettre }) {
  const nomObjectif = (id) => objectifs.find((o) => o.id === id)?.titre;
  return (
    <div className="grid gap-5 lg:grid-cols-2" data-testid="actions-journee">
      <Ok>
        <div className="mb-4 flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "#5DCAA5" }} />
          <p className="ok-lab !text-offwhite">Aujourd'hui · {gardees.length} action{gardees.length > 1 ? "s" : ""}</p>
        </div>
        {gardees.length === 0 ? (
          <p className="py-6 text-[13.5px] text-offwhite/45">Rien à faire aujourd'hui. C'est permis.</p>
        ) : gardees.map((t) => (
          <div key={t.id} className="mb-3 rounded-2xl px-5 py-4" data-testid={`actions-aujourdhui-${t.id}`}
            style={{ background: "rgba(222,194,163,.1)", border: "1px solid rgba(222,194,163,.35)" }}>
            <p className="text-[16px] font-semibold">{t.titre}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
              <span className="ok-chip" style={{ background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.62)" }}>{t.duree_min} min</span>
              {t.objectif_id && <span className="ok-chip" style={{ background: "rgba(93,202,165,.15)", color: "#5DCAA5" }}>Reliée à ton objectif</span>}
              {t.origine === "radar" && <span className="ok-chip" style={{ background: "rgba(93,202,165,.12)", color: "#5DCAA5" }}>Repérée par le Radar</span>}
            </div>
            {t.objectif_id && <p className="mt-3 text-[12.5px] leading-[1.5] text-offwhite/62">{nomObjectif(t.objectif_id)}</p>}
            {t.origine_detail && <p className="mt-1.5 text-[12px] leading-[1.5] text-offwhite/38">{t.origine_detail}</p>}
          </div>
        ))}
        <p className="mt-4 text-[12.5px] leading-[1.55] text-offwhite/38">
          {gardees.length <= 1 ? "Une seule action quand l'énergie est basse. C'est la règle, pas une punition."
            : "Le reste attend. Tu n'es pas en retard, tu es à ton rythme."}
        </p>
      </Ok>

      <Ok>
        <div className="mb-4 flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-white/25" />
          <p className="ok-lab">Reportées par le copilote · {reportees.length}</p>
        </div>
        {reportees.length === 0 ? (
          <p className="py-6 text-[13.5px] text-offwhite/45">Rien n'a été mis de côté.</p>
        ) : reportees.map((t) => (
          <div key={t.id} className="mb-2.5 flex items-center gap-3.5 rounded-[14px] border border-dashed border-white/12 bg-white/[0.025] px-4 py-3.5"
            data-testid={`actions-reportee-${t.id}`}>
            <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[10px] bg-white/[0.05] text-offwhite/38"><Undo2 size={13} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] text-offwhite/38">{t.titre}</p>
              <p className="mt-0.5 truncate text-[11.5px] text-offwhite/25">
                {t.duree_min} min{t.origine === "radar" ? " · vient du Radar" : t.objectif_id ? " · reliée à un objectif" : ""}
              </p>
            </div>
            <button onClick={() => onRemettre(t)} data-testid={`actions-remettre-${t.id}`}
              className="shrink-0 text-[12px] font-semibold text-gold hover:underline">Remettre aujourd'hui</button>
          </div>
        ))}
        <p className="mt-4 border-t border-white/[0.07] pt-3.5 text-[12px] leading-[1.55] text-offwhite/38">
          Le copilote reporte, il ne supprime jamais. Tout revient automatiquement demain matin.
        </p>
      </Ok>
    </div>
  );
}

function Actions({ taches, objectifs, couleur, filtre, setFiltre, recharger, idees, versIdees, verdict, aCheckin }) {
  const navigate = useNavigate();
  const [tout, setTout] = useState(false);
  const [remises, setRemises] = useState({});
  const [titre, setTitre] = useState("");
  const [objectif, setObjectif] = useState("");
  const [ajout, setAjout] = useState(false);
  const nomObjectif = (id) => objectifs.find((o) => o.id === id)?.titre;

  const ajouter = async (e) => {
    e.preventDefault();
    if (!titre.trim()) return;
    setAjout(true);
    try { await creerTache(titre.trim(), 15, objectif || (filtre !== "tous" && filtre !== "sans" ? filtre : null)); setTitre(""); recharger(); toast.success("Action ajoutée"); }
    catch { toast.error("Échec de l'ajout"); }
    setAjout(false);
  };
  const rangerEnIdee = async () => {
    if (!titre.trim()) { toast("Écris d'abord ton idée dans le champ."); return; }
    try { await createIdee({ titre: titre.trim(), source: "manuelle" }); setTitre(""); recharger(); toast.success("Rangée dans tes idées : tu décideras plus tard."); }
    catch { toast.error("Impossible pour le moment."); }
  };
  const lancerIdee = async (i) => {
    try { await transformerIdee(i.id, "action", i.objectif_id ? { objectif_id: i.objectif_id } : {}); recharger(); toast.success("Idée lancée : elle est dans « À faire »."); }
    catch (e) { toast.error(e.detail || "Impossible pour le moment."); }
  };
  const meilleures = (idees || []).filter((i) => i.statut !== "realisee").sort((a, b) => b.score - a.score).slice(0, 3);
  const deplacer = async (t, sens) => {
    const cible = ORDRE[ORDRE.indexOf(t.statut) + sens];
    if (!cible) return;
    try { await majTacheStatut(t.id, cible); recharger(); } catch { toast.error("Déplacement impossible"); }
  };
  const relier = async (t, id) => { try { await relierTache(t.id, id); recharger(); } catch { toast.error("Impossible de relier"); } };
  const supprimer = async (t) => { if (!window.confirm("Supprimer cette action ?")) return; try { await supprimerTache(t.id); recharger(); } catch { toast.error("Suppression impossible"); } };

  const visibles = taches.filter((t) => filtre === "tous" || (filtre === "sans" ? !t.objectif_id : t.objectif_id === filtre));
  const parColonne = { a_faire: [], en_cours: [], fait: [] };
  visibles.forEach((t) => (parColonne[t.statut] || parColonne.a_faire).push(t));
  // L'énergie plafonne la charge : on GARDE ce que la journée supporte et on
  // REPORTE le reste — rien n'est supprimé, rien n'est envoyé au serveur, et
  // « Remettre aujourd'hui » rend la main à l'utilisateur en un clic.
  const aFaire = parColonne.a_faire;
  const plafond = verdict ? verdict.actions : null;
  const plafonne = aCheckin && plafond != null && aFaire.length > plafond && !tout;
  const gardees = plafonne ? aFaire.slice(0, plafond) : aFaire;
  const reportees = plafonne ? aFaire.slice(plafond) : [];
  // « Remettre aujourd'hui » : l'action remonte dans la journée sans toucher au
  // serveur — l'utilisateur sait mieux que le check-in de ce matin comment il va.
  const remettre = (t) => setRemises((r) => ({ ...r, [t.id]: true }));
  const gardeesFinal = plafonne ? [...gardees, ...reportees.filter((t) => remises[t.id])] : gardees;
  const reporteesFinal = reportees.filter((t) => !remises[t.id]);

  return (
    <div data-testid="plan-actions">
      <ChargeDuJour verdict={verdict} aCheckin={aCheckin}
        gardees={gardeesFinal.length} reportees={reporteesFinal.length}
        tout={tout} onTout={() => setTout(!tout)} />

      {plafonne ? (
        <JourneePlafonnee gardees={gardeesFinal} reportees={reporteesFinal}
          objectifs={objectifs} couleur={couleur} onRemettre={remettre} />
      ) : (
      <>
      <form onSubmit={ajouter} className="mb-5 flex flex-wrap gap-2">
        <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Nouvelle action… (ex. Envoyer la proposition à Nova Studio)"
          data-testid="actions-add-input" className={`${CHAMP} h-11 min-w-[220px] flex-1`} />
        <select value={objectif} onChange={(e) => setObjectif(e.target.value)} className={`${CHAMP} h-11 max-w-[220px]`} data-testid="actions-add-objectif" title="Objectif relié">
          <option value="" className="bg-navy-800">Sans objectif</option>
          {objectifs.filter((o) => o.statut === "actif").map((o) => <option key={o.id} value={o.id} className="bg-navy-800">{o.titre}</option>)}
        </select>
        <button type="submit" disabled={ajout} data-testid="actions-add-btn" className="btn-gold h-11">
          {ajout ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Ajouter
        </button>
        <button type="button" onClick={rangerEnIdee} data-testid="actions-ranger-idee" className="w-full text-left text-[12px] text-offwhite/50 hover:text-gold sm:w-auto sm:self-center">
          Pas encore sûr ? <span className="underline">Ranger en idée</span>
        </button>
      </form>

      <div className="-mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0" data-testid="actions-filtres">
        {[["tous", "Toutes"], ...objectifs.map((o) => [o.id, o.titre]), ["sans", "Sans objectif"]].map(([k, l]) => (
          <button key={k} onClick={() => setFiltre(k)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] transition ${filtre === k ? "bg-white/15 text-offwhite ring-1 ring-gold/50" : "bg-white/[0.05] text-offwhite/65 hover:bg-white/10"}`}>
            {k !== "tous" && k !== "sans" && <span className="h-2 w-2 rounded-full" style={{ background: couleur(k) }} />}
            <span className="max-w-[200px] truncate">{l}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {COLONNES.map((col) => (
          <div key={col.key} data-testid={`actions-col-${col.key}`}>
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className={`h-2 w-2 rounded-full ${col.dot}`} />
              <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${col.accent}`}>{col.label}</p>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-offwhite/60">{parColonne[col.key].length}</span>
            </div>
            <div className="space-y-3">
              {parColonne[col.key].map((t) => (
                <GlassCard key={t.id} className="group !p-4" data-testid={`actions-card-${t.id}`}>
                  <p className={`text-sm font-medium leading-snug ${t.statut === "fait" ? "text-offwhite/45 line-through" : "text-offwhite"}`}>{t.titre}</p>
                  {/* D'où vient cette action. Une ligne déposée par le Radar sans sa
                      raison d'être n'est qu'une tâche de plus : trois jours après, on
                      ne sait plus pourquoi on l'avait retenue, et on la repousse. */}
                  {t.origine === "radar" && (
                    <button onClick={() => navigate("/app/radar")} title={t.origine_detail || "Repéré par le Radar"}
                      className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-300 hover:bg-emerald-400/20"
                      data-testid={`actions-badge-radar-${t.id}`}>
                      <Radar size={10} className="shrink-0" /> <span className="truncate">{t.origine_detail || "Repéré par le Radar"}</span>
                    </button>
                  )}
                  {t.idee_id && (
                    <button onClick={versIdees} title={t.idee_titre ? `Née de l'idée « ${t.idee_titre} »` : "Née d'une idée"}
                      className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[10.5px] font-semibold text-gold hover:bg-gold/20" data-testid={`actions-badge-idee-${t.id}`}>
                      <Lightbulb size={10} /> Idée
                    </button>
                  )}
                  {t.objectif_id ? (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-offwhite/65"><Target size={11} style={{ color: couleur(t.objectif_id) }} /><span className="truncate">{nomObjectif(t.objectif_id)}</span></p>
                  ) : (
                    <label className="mt-2 flex items-center gap-1.5 text-[11px] text-offwhite/45">
                      <Link2 size={11} />
                      <select value="" onChange={(e) => relier(t, e.target.value)} className="min-w-0 flex-1 bg-transparent text-[11px] text-offwhite/60 outline-none">
                        <option value="" className="bg-navy-800">Relier à un objectif…</option>
                        {objectifs.filter((o) => o.statut === "actif").map((o) => <option key={o.id} value={o.id} className="bg-navy-800">{o.titre}</option>)}
                      </select>
                    </label>
                  )}
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wide text-offwhite/40">{t.duree_min} min{t.micro ? " · micro" : ""}</span>
                    <div className="flex gap-1.5">
                      <button onClick={() => supprimer(t)} className="rounded-lg p-1.5 text-offwhite/30 opacity-0 transition hover:text-rose-300 group-hover:opacity-100" title="Supprimer"><Trash2 size={13} /></button>
                      {col.key !== "a_faire" && (
                        <button onClick={() => deplacer(t, -1)} data-testid={`actions-move-left-${t.id}`} className="rounded-lg border border-white/12 p-1.5 text-offwhite/55 transition-colors hover:border-gold/40 hover:text-gold" title="Reculer"><ArrowLeft size={13} /></button>
                      )}
                      {col.key !== "fait" && (
                        <button onClick={() => deplacer(t, 1)} data-testid={`actions-move-right-${t.id}`} className="rounded-lg border border-white/12 p-1.5 text-offwhite/55 transition-colors hover:border-gold/40 hover:text-gold" title={col.key === "en_cours" ? "Terminer" : "Avancer"}>
                          {col.key === "en_cours" ? <Check size={13} /> : <ArrowRight size={13} />}
                        </button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
              {!parColonne[col.key].length && col.key === "a_faire" && meilleures.length > 0 ? (
                <div className="rounded-2xl border border-dashed border-gold/30 p-4" data-testid="actions-suggestions-idees">
                  <p className="mb-2 text-xs font-semibold text-gold">Tes meilleures idées : on en lance une ?</p>
                  <div className="space-y-2">
                    {meilleures.map((i) => (
                      <div key={i.id} className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
                        <Zap size={12} className="shrink-0 text-gold" />
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-offwhite/85">{i.titre}</span>
                        <button onClick={() => lancerIdee(i)} className="shrink-0 rounded-lg bg-gold px-2.5 py-1 text-[11px] font-semibold text-navy-900">Lancer</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : !parColonne[col.key].length && <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-offwhite/35">Rien ici pour l'instant</p>}
            </div>
          </div>
        ))}
      </div>
      </>
      )}
    </div>
  );
}

// Une seule question, au bon moment (3e action), jamais de clé API : un « non » et on ne redemande plus.
function QuestionIntegrations({ nb }) {
  const [poser, setPoser] = React.useState(false);
  const navigate = useNavigate();
  React.useEffect(() => { if (nb >= 3) questionIntegrations().then((r) => setPoser(!!r.poser)).catch(() => {}); }, [nb]);
  if (!poser) return null;
  const repondre = async (r) => {
    setPoser(false);
    try { await repondreIntegrations(r); } catch { /* sans gravité */ }
    if (r === "oui") navigate("/parametres?section=connexions");
  };
  return (
    <div className="mb-4 rounded-2xl border border-gold/40 bg-gold/[0.07] p-4" data-testid="question-integrations">
      <p className="text-[14.5px] font-semibold text-offwhite">Tu veux retrouver tes actions aussi dans Outlook / To Do, Google Agenda ou Trello ?</p>
      <p className="mt-1 text-[12.5px] text-offwhite/65">C'est facultatif : ton Plan d'action fonctionne très bien tout seul dans Zayado. Si oui, tu te connectes avec ton compte, sans rien à copier.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => repondre("oui")} className="btn-gold h-10 px-4 text-[13px]" data-testid="question-integrations-oui">Oui, relier</button>
        <button onClick={() => repondre("non")} className="h-10 rounded-xl border border-white/20 px-4 text-[13px] text-offwhite/85 hover:bg-white/10">Non merci</button>
        <button onClick={() => repondre("plus_tard")} className="h-10 rounded-xl px-3 text-[13px] text-offwhite/60 hover:text-offwhite">Plus tard</button>
      </div>
    </div>
  );
}

export default function PlanAction() {
  const [params, setParams] = useSearchParams();
  const [plan, setPlan] = useState(null);
  useEffect(() => { chargerAbonnement().then((a) => setPlan(planEffectif(a))).catch(() => {}); }, []);
  const verrous = plan && !aDroit(plan, "actions") ? ["actions", "processus"] : [];
  const onglet = ["idees", "objectifs", "actions", "processus"].includes(params.get("tab")) ? params.get("tab") : (plan && !aDroit(plan, "actions") ? "idees" : "actions");
  const setOnglet = (t, extra = {}) => setParams({ tab: t, ...extra });
  const filtre = params.get("objectif") || "tous";
  const [taches, setTaches] = useState([]);
  const [idees, setIdees] = useState([]);
  const [objectifs, setObjectifs] = useState([]);
  const [chargement, setChargement] = useState(true);
  // Le check-in du jour : c'est lui qui dit quelle charge la journée supporte.
  const [vitals, setVitals] = useState(null);
  useEffect(() => { fetchState().then((d) => setVitals(vitalsDuJour(d))).catch(() => setVitals({})); }, []);
  const verdict = verdictDuJour(vitals);
  const aCheckin = vitals?.energy != null;

  const recharger = () => Promise.all([
    fetchTaches().then((d) => setTaches(d.items || [])),
    fetchObjectifs().then((d) => setObjectifs(Array.isArray(d) ? d : d.items || [])),
    fetchIdees().then((d) => setIdees(Array.isArray(d) ? d : [])),
  ]).catch(() => toast.error("Plan d'action indisponible")).finally(() => setChargement(false));
  useEffect(() => { recharger(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const couleur = useMemo(() => {
    const m = {}; objectifs.forEach((o, i) => { m[o.id] = TEINTES[i % TEINTES.length]; });
    return (id) => m[id] || "#94A3B8";
  }, [objectifs]);

  return (
    <div className="min-h-screen" data-testid="actions-page">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header title="Plan d'action" subtitle="Idées, objectifs, actions et processus, reliés." />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-offwhite/60">Plan d'action</p>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl" data-testid="actions-title">De l'idée à l'action</h1>
          <p className="mt-2 max-w-2xl text-[14px] text-offwhite/65">Tu notes une idée, tu décides d'en faire un objectif ou une action, et l'avancement se calcule tout seul. Tes processus transforment leurs étapes en actions.</p>
          <div className="mt-5">
            <Onglets onglet={onglet} setOnglet={setOnglet} verrous={verrous} n={{ idees: idees.filter((i) => i.statut !== "realisee").length, objectifs: objectifs.filter((o) => o.statut === "actif").length, actions: taches.filter((t) => t.statut !== "fait").length }} />
          </div>
          {chargement ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-gold" /></div> : (
            <>
              {onglet === "idees" && <IdeesContenu onChange={recharger} />}
              {verrous.includes(onglet) && <Verrou />}
              {onglet === "objectifs" && <Objectifs objectifs={objectifs} couleur={couleur} recharger={recharger} voirActions={(id) => setOnglet("actions", { objectif: id })} />}
              {onglet === "actions" && !verrous.includes("actions") && <QuestionIntegrations nb={taches.length} />}
              {onglet === "actions" && !verrous.includes("actions") && <Actions taches={taches} objectifs={objectifs} couleur={couleur} filtre={filtre}
                setFiltre={(f) => setOnglet("actions", f === "tous" ? {} : { objectif: f })} recharger={recharger} idees={idees} versIdees={() => setOnglet("idees")}
                verdict={verdict} aCheckin={aCheckin} />}
              {onglet === "processus" && !verrous.includes("processus") && <ProcessusContenu objectifs={objectifs} onActionCreee={recharger} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
