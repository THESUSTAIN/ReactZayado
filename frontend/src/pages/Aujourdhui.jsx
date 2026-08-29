import { useEffect, useState } from "react";
import { Compass, ArrowRight, Sparkles, Target, Lightbulb, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getVision, getHumeur, getTaches, getStrategicDecisions, createTache } from "../lib/api";

// Accueil quotidien Cap Vivant.
//
// Structure visuelle reprise de la maquette de design partagee
// (cap-vivant-3002-mouvement-original.zip : carte "hero" + anneau de
// capacite + trajectoire Vision -> Decision -> Action + cartes
// decision/reflexion) - mais entierement rebranchee sur les vraies
// donnees de ce projet plutot que les "-" en dur de la maquette. Aucun
// appel a /auth/*, /settings/profile etc. (routes qui n'existent pas ici)
// n'a ete repris.
//
// Honnetete assumee : il n'existe dans ce projet AUCUN moteur de decision
// cote serveur (verifie a plusieurs reprises) - la carte "Decision a
// clarifier" reste donc un etat vide honnete, jamais une decision
// fabriquee.
export default function Aujourdhui() {
  const navigate = useNavigate();
  const [vision, setVision] = useState(null);
  const [humeur, setHumeur] = useState([]);
  const [taches, setTaches] = useState([]);
  const [pendingDecision, setPendingDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickAdding, setQuickAdding] = useState(false);

  useEffect(() => {
    Promise.all([
      getVision().catch(() => null),
      getHumeur().catch(() => []),
      getTaches().catch(() => []),
      getStrategicDecisions().catch(() => []),
    ]).then(([v, h, t, decisions]) => {
      setVision(v);
      setHumeur(Array.isArray(h) ? h : []);
      setTaches(Array.isArray(t) ? t : []);
      setPendingDecision((Array.isArray(decisions) ? decisions : []).find((d) => d.status === "pending") || null);
    }).finally(() => setLoading(false));
  }, []);

  const dernierHumeur = humeur[0];
  const capaciteValue = dernierHumeur ? dernierHumeur.energie : null;
  const tachesOuvertes = taches.filter((t) => t.statut !== "Terminé");
  const prioritePrincipale = tachesOuvertes
    .slice()
    .sort((a, b) => (a.priorite === "Haute" ? -1 : 1) - (b.priorite === "Haute" ? -1 : 1))[0];

  const addQuickTache = async (event) => {
    event.preventDefault();
    const titre = quickTitle.trim();
    if (!titre) return;
    setQuickAdding(true);
    try {
      const created = await createTache({ titre });
      setTaches((current) => [...current, created]);
      setQuickTitle("");
      toast.success("Tâche ajoutée.");
    } catch {
      toast.error("Impossible d'ajouter la tâche pour le moment.");
    } finally {
      setQuickAdding(false);
    }
  };

  // La "Priorité du jour" est désormais fusionnée dans la carte hero
  // ci-dessous — elle affichait la même tâche en double (hero + ce bloc),
  // sans info propre à part le lien "Ouvrir Mon Mouvement", repris dans le
  // hero.

  return (
    <div className="space-y-6" data-testid="page-aujourdhui">
      {/* En-tête pattern "eyebrow / titre / description", repris de la maquette */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#DEC2A3]">Aujourd'hui aligné</p>
          <h1 className="font-head text-2xl sm:text-3xl font-semibold text-white mt-1">Ce qui compte maintenant.</h1>
          <p className="text-white/55 text-sm mt-1 max-w-xl">Votre Vision devient une décision concrète, sans perdre de vue votre capacité.</p>
        </div>
        <button onClick={() => window.dispatchEvent(new CustomEvent("cours:open-copilot"))}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/10 transition-colors">
          <Sparkles size={15} className="text-[#DEC2A3]" /> Ouvrir le Copilote
        </button>
      </div>

      {/* Priorité du jour désormais fusionnée dans le hero ci-dessous, plus de bloc séparé. */}

      {/* Carte hero : statut + trajectoire + anneau de capacité réel */}
      <div className="glass p-6 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center" data-testid="aujourdhui-hero">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 border border-emerald-400/25 px-3 py-1 text-[11px] font-semibold text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {vision?.value ? "Vision active" : "Vision à définir"}
          </span>
          <h2 className="font-head text-xl font-semibold text-white mt-3">
            {prioritePrincipale ? `Faire avancer « ${prioritePrincipale.titre} ».` : "Faire avancer une action qui mérite votre énergie."}
          </h2>
          <p className="text-white/55 text-sm mt-1 max-w-lg">La Vision vous aide à choisir une action réaliste plutôt qu'à remplir une liste.</p>
          {!loading && prioritePrincipale && tachesOuvertes.length > 1 && (
            <p className="text-xs text-white/40 mt-2">+ {tachesOuvertes.length - 1} autre(s) tâche(s) ouverte(s), secondaires pour l'instant.</p>
          )}
          {!loading && prioritePrincipale && (
            <button onClick={() => navigate("/mouvement")} data-testid="aujourdhui-goto-mouvement"
              className="mt-2 inline-flex items-center gap-1 text-xs text-[#DEC2A3] hover:text-[#FFD700] transition-colors">
              Ouvrir Mon Mouvement <ArrowRight size={11} />
            </button>
          )}
          {!loading && !prioritePrincipale && (
            <button onClick={() => navigate("/taches")} data-testid="aujourdhui-goto-taches"
              className="mt-2 inline-flex items-center gap-1 text-xs text-[#DEC2A3] hover:text-[#FFD700] transition-colors">
              Ouvrir la liste des tâches <ArrowRight size={11} />
            </button>
          )}
          <div className="flex items-center gap-2 mt-4 text-xs text-white/60">
            <button onClick={() => navigate("/vision")} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:border-[#DEC2A3]/50 hover:text-[#F1E2CC] transition-colors">Vision</button>
            <ArrowRight size={13} className="text-white/30" />
            <button onClick={() => navigate("/vision")} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:border-[#DEC2A3]/50 hover:text-[#F1E2CC] transition-colors">Décision</button>
            <ArrowRight size={13} className="text-white/30" />
            <button onClick={() => navigate("/mouvement")} className="px-2.5 py-1 rounded-full gold-bg text-[#0A1128] font-semibold hover:brightness-105 transition">Action</button>
          </div>
          <form onSubmit={addQuickTache} className="mt-4 flex items-center gap-2 max-w-sm" data-testid="aujourdhui-quick-add">
            <input value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} placeholder="Ajouter une tâche…" data-testid="aujourdhui-quick-add-input"
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#DEC2A3]/50" />
            <button type="submit" disabled={quickAdding || !quickTitle.trim()} data-testid="aujourdhui-quick-add-submit"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gold-bg text-[#0A1128] disabled:opacity-50">
              <Plus size={16} />
            </button>
          </form>
        </div>

        {/* Anneau de capacité — vraie donnée (dernier check-in Humeur), même
            pattern visuel que les gauges de Mindset & capacité. */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
              {capaciteValue != null && (
                <circle cx="48" cy="48" r="40" stroke="#DEC2A3" strokeWidth="8" fill="none"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - capaciteValue / 100)}
                  strokeLinecap="round" />
              )}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-head font-semibold text-lg text-white">
              {capaciteValue != null ? capaciteValue : "—"}
            </div>
          </div>
          <span className="text-xs text-white/50">capacité</span>
          {capaciteValue == null && (
            <button onClick={() => navigate("/mindset")} className="text-[11px] text-[#DEC2A3] hover:text-[#FFD700] inline-flex items-center gap-1">
              Faire un check-in <ArrowRight size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Métriques du jour — vraies données */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="aujourdhui-metrics">
        <div className="glass p-4">
          <p className="text-xs text-white/50">Priorité principale</p>
          <p className="font-head text-lg font-semibold text-white mt-1 truncate">{prioritePrincipale ? prioritePrincipale.titre : "À définir"}</p>
          <p className="text-[11px] text-white/40 mt-0.5">{tachesOuvertes.length} tâche(s) ouverte(s)</p>
        </div>
        <div className="glass p-4">
          <p className="text-xs text-white/50">Capacité disponible</p>
          <p className="font-head text-lg font-semibold text-white mt-1">{capaciteValue != null ? `${capaciteValue}/100` : "—"}</p>
          <p className="text-[11px] text-white/40 mt-0.5">{capaciteValue == null ? "Check-in facultatif" : capaciteValue >= 70 ? "Marge disponible" : "À surveiller"}</p>
        </div>
        <div className="glass p-4">
          <p className="text-xs text-white/50">Ma Vision</p>
          <p className="font-head text-lg font-semibold text-white mt-1 truncate">{vision?.value ? "Défini" : "À définir"}</p>
          <p className="text-[11px] text-white/40 mt-0.5">{vision?.value ? "Relié à vos priorités" : "Reliez une action à votre Vision"}</p>
        </div>
      </div>

      {/* Décision à clarifier + Impact sur la Vision — état honnête, pas de décision fabriquée */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass p-5" data-testid="aujourdhui-decisions">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-lg gold-bg flex items-center justify-center shrink-0"><Target size={16} className="text-[#0A1128]" /></span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#DEC2A3]">Décision stratégique</span>
          </div>
          {pendingDecision ? (
            <>
              <h3 className="font-head font-semibold text-white">{pendingDecision.title}</h3>
              {pendingDecision.why_now && <p className="text-[13px] text-white/55 mt-1.5 leading-relaxed line-clamp-2"><b className="font-semibold text-[#DEC2A3]">Pourquoi maintenant :</b> {pendingDecision.why_now}</p>}
              <button onClick={() => navigate("/vision")} data-testid="aujourdhui-goto-decision"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl gold-bg px-4 py-2 text-sm font-semibold text-[#0A1128]">
                Arbitrer dans Vision <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <>
              <h3 className="font-head font-semibold text-white">Aucune décision en attente d'arbitrage.</h3>
              <p className="text-[13px] text-white/55 mt-1.5 leading-relaxed">
                Les décisions stratégiques se préparent et se valident dans Vision — une fois approuvées, elles deviennent des missions dans Mon Mouvement.
              </p>
              <button onClick={() => navigate("/vision")} data-testid="aujourdhui-goto-vision-decisions"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10">
                Préparer une décision <ArrowRight size={14} />
              </button>
            </>
          )}
        </div>

        <div className="glass p-5" data-testid="aujourdhui-cap-link">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-lg bg-blue-400/15 flex items-center justify-center shrink-0"><Lightbulb size={16} className="text-blue-300" /></span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-300">Impact sur la Vision</span>
          </div>
          <h3 className="font-head font-semibold text-white">Le travail avance mieux quand le pourquoi reste visible.</h3>
          {vision?.value ? (
            <p className="text-[13px] text-white/55 mt-1.5 leading-relaxed line-clamp-3">{vision.value}</p>
          ) : (
            <p className="text-[13px] text-white/55 mt-1.5 leading-relaxed">Commencez par structurer votre Vision ; les décisions pourront ensuite être reliées à un résultat attendu.</p>
          )}
          <button onClick={() => navigate("/vision")} className="mt-3 inline-flex items-center gap-1 text-sm text-[#DEC2A3] hover:text-[#FFD700] transition-colors">
            Construire ma Vision <ArrowRight size={14} />
          </button>
        </div>
      </div>

    </div>
  );
}
