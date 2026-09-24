import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, ArrowLeft, ArrowRight, Loader2, Target, Trash2, Check, Pause, Play, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import { GlassCard } from "@/components/kairos/GlassCard";
import {
  fetchTaches, creerTache, majTacheStatut, relierTache, supprimerTache,
  fetchObjectifs, creerObjectif, majObjectif, supprimerObjectif,
} from "@/lib/kairosApi";
import { ProcessusContenu } from "@/pages/Processus";

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

function Onglets({ onglet, setOnglet, n }) {
  return (
    <nav className="-mx-4 mb-7 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0" data-testid="plan-onglets">
      {[["objectifs", `Objectifs${n.objectifs ? ` · ${n.objectifs}` : ""}`], ["actions", `Actions${n.actions ? ` · ${n.actions}` : ""}`], ["processus", "Processus"]].map(([k, l]) => (
        <button key={k} onClick={() => setOnglet(k)} data-testid={`plan-onglet-${k}`}
          className={`shrink-0 rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition ${onglet === k ? "bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] text-navy-900" : "border border-white/20 bg-white/[0.05] text-offwhite/75 hover:bg-white/10"}`}>
          {l}
        </button>
      ))}
    </nav>
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

function Actions({ taches, objectifs, couleur, filtre, setFiltre, recharger }) {
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

  return (
    <div data-testid="plan-actions">
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
              {!parColonne[col.key].length && <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-offwhite/35">Rien ici pour l'instant</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlanAction() {
  const [params, setParams] = useSearchParams();
  const onglet = ["objectifs", "actions", "processus"].includes(params.get("tab")) ? params.get("tab") : "actions";
  const setOnglet = (t, extra = {}) => setParams({ tab: t, ...extra });
  const filtre = params.get("objectif") || "tous";
  const [taches, setTaches] = useState([]);
  const [objectifs, setObjectifs] = useState([]);
  const [chargement, setChargement] = useState(true);

  const recharger = () => Promise.all([
    fetchTaches().then((d) => setTaches(d.items || [])),
    fetchObjectifs().then((d) => setObjectifs(Array.isArray(d) ? d : d.items || [])),
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
        <Header title="Plan d'action" subtitle="Objectifs, actions et processus, reliés." />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-offwhite/60">Plan d'action</p>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl" data-testid="actions-title">De l'objectif à l'action</h1>
          <p className="mt-2 max-w-2xl text-[14px] text-offwhite/65">Chaque action fait avancer un objectif, et tes processus transforment leurs étapes en actions. L'avancement se calcule tout seul.</p>
          <div className="mt-5">
            <Onglets onglet={onglet} setOnglet={setOnglet} n={{ objectifs: objectifs.filter((o) => o.statut === "actif").length, actions: taches.filter((t) => t.statut !== "fait").length }} />
          </div>
          {chargement ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-gold" /></div> : (
            <>
              {onglet === "objectifs" && <Objectifs objectifs={objectifs} couleur={couleur} recharger={recharger} voirActions={(id) => setOnglet("actions", { objectif: id })} />}
              {onglet === "actions" && <Actions taches={taches} objectifs={objectifs} couleur={couleur} filtre={filtre}
                setFiltre={(f) => setOnglet("actions", f === "tous" ? {} : { objectif: f })} recharger={recharger} />}
              {onglet === "processus" && <ProcessusContenu objectifs={objectifs} onActionCreee={recharger} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
