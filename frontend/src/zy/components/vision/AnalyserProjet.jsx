import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CalendarCheck, Check, Loader2, Plus, Sparkles } from "lucide-react";
import { apiPost } from "@/lib/api";
import { fetchAnalyseTableau, lancerConseilTableau } from "@/zy/lib/kairosApi";
import { SimulationReprise, ACCENT, eur } from "@/zy/components/reprise/SimulationReprise";

/**
 * Onglet « Analyser ce projet » du tiroir du Vision Board : un tableau = un projet.
 * 1. Les chiffres de la reprise (si c'est un projet de reprise) : calcul sans IA, rendez-vous à 5 €.
 * 2. Le Conseil des 5 (méthode LLM Council de Karpathy) : 5 avis, relecture croisée anonyme, synthèse,
 *    SWOT et panel de 12 acheteurs simulés. Inclus dans Solo, Équipe et Entreprise.
 */
const COULEURS = { contradicteur: "#F2A3A3", fondamentaux: "#BFD3F2", explorateur: "#8FCFA8", regard_neuf: "#E8D9BF", action: "#CBAE7A" };
const POS = { pour: ["Pour", "#8FCFA8"], "réservé": ["Réservé", "#D9C3A0"], contre: ["Contre", "#F2A3A3"] };
const ETAPES_CONSEIL = [
  "Les 5 conseillers donnent chacun leur avis",
  "Relecture croisée, sans savoir qui a écrit quoi",
  "Le président fait la synthèse et le SWOT",
  "12 acheteurs simulés réagissent à votre projet",
];
const champ = "w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-[13.5px] text-offwhite outline-none placeholder:text-offwhite/35 focus:border-[#EADFC0]";

const cleTableauInitiale = () => {
  try { return new URLSearchParams(window.location.search).get("board") || localStorage.getItem("kairos_board_key") || "perso"; }
  catch { return "perso"; }
};

export function AnalyserProjet() {
  const navigate = useNavigate();
  const [cle, setCle] = useState(cleTableauInitiale);
  const [d, setD] = useState(null);
  const [saisieReprise, setSaisieReprise] = useState(false);
  const [pourQui, setPourQui] = useState("");
  const [prix, setPrix] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [etape, setEtape] = useState(0);
  const [ouvert, setOuvert] = useState("");
  const minuteur = useRef(null);

  // Le tableau affiché sur le canvas peut changer : on suit le sélecteur (événement émis par VisionCanvas).
  useEffect(() => {
    const f = (e) => setCle(e.detail || "perso");
    window.addEventListener("zayado:board", f);
    return () => window.removeEventListener("zayado:board", f);
  }, []);
  const charger = () => fetchAnalyseTableau(cle).then(setD).catch(() => setD({ erreur: true }));
  useEffect(() => { setD(null); setSaisieReprise(false); charger(); }, [cle]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearInterval(minuteur.current), []);

  const lancer = async () => {
    setEnCours(true); setEtape(0);
    clearInterval(minuteur.current);
    minuteur.current = setInterval(() => setEtape((e) => Math.min(e + 1, ETAPES_CONSEIL.length - 1)), 28000);
    try {
      const r = await lancerConseilTableau(cle, { pour_qui: pourQui, prix, avec_panel: true });
      setD((x) => ({ ...x, conseil: { ...x.conseil, resultat: r, utilises: (x.conseil?.utilises || 0) + 1 } }));
    } catch (err) {
      toast.error(typeof err.detail === "string" ? err.detail : "Le Conseil n'a pas pu se réunir. Réessayez dans un instant.");
    } finally { clearInterval(minuteur.current); setEnCours(false); }
  };

  const ajouterAuPlan = async (texte) => {
    try { await apiPost("/copilote/plan-action/actions", { titre: texte.slice(0, 200), module: "Vision" }); toast.success("Ajouté à votre Plan d'action."); }
    catch { toast.error("Ajout impossible pour le moment."); }
  };

  if (!d) return <p className="flex items-center gap-2 text-[13px] text-offwhite/70"><Loader2 size={14} className="animate-spin" /> Chargement du projet…</p>;
  if (d.erreur) return <p className="text-[13.5px] text-offwhite/70">Ce tableau n'a pas pu être chargé. Rouvrez le Vision Board.</p>;

  const c = d.conseil || {};
  const r = c.resultat;
  const restant = Math.max((c.quota || 0) - (c.utilises || 0), 0);
  return (
    <div className="space-y-4" data-testid="analyser-projet">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: ACCENT }}>Ce tableau est votre projet</p>
        <h3 className="mt-1 text-[18px] font-normal">{d.tableau?.emoji} {d.tableau?.nom}</h3>
      </div>

      {/* 1. Les chiffres de la reprise */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="mb-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: ACCENT }}>Les chiffres de la reprise</p>
        {saisieReprise ? (
          <SimulationReprise compact board={cle} initial={null}
            onResultat={(res) => { setD((x) => ({ ...x, reprise: res })); setSaisieReprise(false); }} />
        ) : d.reprise ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Mini v={eur(d.reprise.ebe_retraite)} l="EBE retraité" />
              <Mini v={`${String(d.reprise.multiple_ebe ?? "—").replace(".", ",")} ×`} l="prix / EBE" />
              <Mini v={`${String(d.reprise.ratio_echeances_ebe ?? "—").replace(".", ",")} %`} l="échéances / EBE" />
            </div>
            <p className="mt-2 text-[12px] text-offwhite/55">{d.reprise.mention || "Calcul indicatif. Aucun financement n'est garanti."}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => navigate(`/app/testez-votre-projet?sim=${encodeURIComponent(d.reprise.id)}`)} data-testid="analyser-rdv"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF7F1] px-3.5 py-2 text-[12.5px] font-medium text-[#1A2B57]">
                <CalendarCheck size={13} /> Voir le rapport · 20 min avec Marie-Esther
              </button>
              <button onClick={() => setSaisieReprise(true)} className="rounded-full border border-white/15 px-3.5 py-2 text-[12.5px]">Mettre à jour les chiffres</button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[13px] text-offwhite/70">C'est un projet de reprise d'entreprise&nbsp;? Saisissez ses chiffres en 3 étapes : le calcul se fait sans IA.</p>
            <button onClick={() => setSaisieReprise(true)} data-testid="analyser-saisir-reprise" className="mt-3 rounded-full border border-[#EADFC0] px-3.5 py-2 text-[12.5px]">Saisir les chiffres de la reprise</button>
          </>
        )}
      </section>

      {/* 2. Le Conseil des 5 */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="mb-1 text-[11px] uppercase tracking-[0.18em]" style={{ color: ACCENT }}>Le Conseil des 5</p>
        <p className="mb-3 text-[12.5px] text-offwhite/60">Cinq conseillers lisent les cartes de ce tableau, chacun sous un angle, se relisent sans savoir qui a écrit quoi, puis un président tranche.</p>

        {!c.autorise ? (
          <button onClick={() => navigate("/parametres")} className="w-full rounded-full border border-[#EADFC0] py-2.5 text-[13px]">Inclus dans Solo, Équipe et Entreprise</button>
        ) : enCours ? (
          <div data-testid="conseil-deliberation">
            {ETAPES_CONSEIL.map((t, i) => (
              <div key={t} className={`flex items-center gap-2.5 border-b border-white/[0.07] py-2.5 text-[13px] ${i > etape ? "text-offwhite/40" : ""}`}>
                <span className="grid h-5 w-5 flex-none place-items-center rounded-full" style={i < etape ? { background: "#8FCFA8", color: "#0B1A3D" } : { border: "1px solid rgba(255,255,255,.2)" }}>
                  {i < etape ? <Check size={12} /> : i === etape ? <Loader2 size={12} className="animate-spin" style={{ color: ACCENT }} /> : null}
                </span>{t}
              </div>
            ))}
            <p className="mt-2 text-[12px] text-offwhite/55">Environ 2 minutes. Vous pouvez continuer à travailler sur votre tableau.</p>
          </div>
        ) : (
          <>
            {!r ? (
              <div className="space-y-2">
                <input className={champ} placeholder="Pour qui ? (facultatif)" value={pourQui} onChange={(e) => setPourQui(e.target.value)} />
                <input className={champ} placeholder="Prix envisagé (facultatif)" value={prix} onChange={(e) => setPrix(e.target.value)} />
              </div>
            ) : null}
            <button onClick={lancer} disabled={restant <= 0} data-testid="conseil-lancer"
              className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[13.5px] font-medium disabled:opacity-50 ${r ? "border border-white/15" : "bg-[#FAF7F1] text-[#1A2B57]"}`}>
              <Sparkles size={14} /> {r ? "Relancer l'analyse" : "Analyser ce projet"}
            </button>
            <p className="mt-1.5 text-[11.5px] text-offwhite/50">{restant} analyse(s) restante(s) ce mois-ci.</p>
          </>
        )}

        {r && !enCours ? (
          <div className="mt-4 space-y-3" data-testid="conseil-resultat">
            <div className="divide-y divide-white/[0.07] rounded-xl bg-white/[0.04]">
              {(r.conseillers || []).map((x) => {
                const [lib, coul] = POS[x.position] || POS["réservé"];
                return (
                  <button key={x.cle} onClick={() => setOuvert(ouvert === x.cle ? "" : x.cle)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px]">
                    <span className="grid h-6 w-6 flex-none place-items-center rounded-full text-[11px] text-[#0B1A3D]" style={{ background: COULEURS[x.cle] }}>{x.nom.replace(/^(Le |La |Les |L')/, "").charAt(0)}</span>
                    <span className="flex-1">{x.nom}</span>
                    <span className="text-[11.5px]" style={{ color: coul }}>{lib}</span>
                  </button>
                );
              })}
            </div>
            {ouvert ? <div className="whitespace-pre-line rounded-xl bg-white/[0.06] p-3 text-[12.5px]">{(r.conseillers || []).find((x) => x.cle === ouvert)?.avis}</div> : null}
            <Bloc t="Ce sur quoi ils s'accordent" v={r.accord} />
            <Bloc t="Ce qui les divise" v={r.desaccord} />
            <Bloc t="L'angle mort repéré" v={r.angle_mort} />
            <Bloc t="Votre point de vigilance" v={r.vigilance} />
            {r.recommandation ? (
              <div className="rounded-xl border border-[#EADFC0]/50 bg-[#EADFC0]/10 p-3">
                <p className="text-[10.5px] uppercase tracking-[0.16em]" style={{ color: ACCENT }}>La recommandation</p>
                <p className="mt-1 text-[13.5px]">{r.recommandation}</p>
              </div>
            ) : null}
            {r.swot && Object.keys(r.swot).length ? (
              <div>
                <p className="mb-1.5 text-[10.5px] uppercase tracking-[0.16em]" style={{ color: ACCENT }}>SWOT du projet</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[["forces", "Forces", "#8FCFA8"], ["faiblesses", "Faiblesses", "#D9C3A0"], ["opportunites", "Opportunités", ACCENT], ["menaces", "Menaces", "#F2A3A3"]].map(([k, l, coul]) => (
                    <div key={k} className="rounded-xl bg-white/[0.05] p-2.5 text-[12px]">
                      <span className="block text-[10px] uppercase tracking-wider" style={{ color: coul }}>{l}</span>
                      {(r.swot[k] || []).map((x) => <p key={x}>{x}</p>)}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {r.panel ? (
              <div>
                <p className="mb-1.5 text-[10.5px] uppercase tracking-[0.16em]" style={{ color: ACCENT }}>Le panel d'acheteurs</p>
                <div className="grid grid-cols-12 gap-0.5">{Array.from({ length: r.panel.total || 12 }).map((_, i) => <span key={i} className="h-4 rounded" style={{ background: i < r.panel.acheteurs ? ACCENT : "rgba(255,255,255,.12)" }} />)}</div>
                <p className="mt-1.5 text-[12.5px]">{r.panel.acheteurs} sur {r.panel.total} achèteraient.
                  {r.panel.prix_cher_median ? <> Prix jugé cher à partir de {Math.round(r.panel.prix_cher_median)}&nbsp;€.</> : null}
                  {r.panel.frein_principal ? <> Frein n°&nbsp;1 : « {r.panel.frein_principal} »</> : null}</p>
              </div>
            ) : null}
            {r.premiere_action ? (
              <div className="rounded-xl bg-[#FAF7F1] p-3 text-[#1A2B57]">
                <p className="text-[10.5px] uppercase tracking-[0.16em] text-[#7A5C3E]">La première chose à faire</p>
                <p className="mt-1 text-[13px] text-[#4B5568]">{r.premiere_action}</p>
                <button onClick={() => ajouterAuPlan(r.premiere_action)} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#1A2B57] px-3.5 py-2 text-[12.5px] font-medium text-white">
                  <Plus size={13} /> Ajouter à mon Plan d'action
                </button>
              </div>
            ) : null}
            <p className="text-[11.5px] text-offwhite/50">{r.avertissement}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Mini({ v, l }) {
  return <div className="rounded-xl bg-white/[0.06] p-2"><span className="block whitespace-nowrap text-[15px]">{v}</span><span className="text-[10.5px] text-offwhite/55">{l}</span></div>;
}

function Bloc({ t, v }) {
  if (!v) return null;
  return (
    <div className="rounded-xl bg-white/[0.05] p-3 text-[12.5px]">
      <p className="mb-0.5 text-[10.5px] uppercase tracking-[0.16em]" style={{ color: ACCENT }}>{t}</p>{v}
    </div>
  );
}
