import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { lireInvitation, urlRejoindre } from "@/lib/invitationEquipe";
import { toast } from "sonner";
import {
  Building2, Check, ChevronDown, Copy, Download, ExternalLink, FileSpreadsheet, FolderOpen, Loader2, Mail,
  MessageCircle, Phone, Plus, Send, Trash2, Upload, UserPlus, X,
  Bot, CalendarDays, Calculator, FileText, Handshake, Home, Palmtree, Play, Settings2, Square, Timer, UserRound, Users, TrendingUp,
  Radar, Compass,
} from "lucide-react";
import { Sidebar } from "@/components/kairos/Sidebar";
import TexteIA from "@/components/ui/TexteIA";
import { SECTIONS_ENTREPRISE, oublierEspaceEntreprise } from "@/lib/sectionsEntreprise";
import { Header } from "@/components/kairos/Header";
import {
  entMoi, entActiver, entMembres, entInviter, entLienInvitation, entModifierMembre, entSupprimerMembre, entQuitter, entExporter,
  entPresence, entPresenceMaj, entAbsences, entAbsenceCreer, entAbsenceDecider, entAbsenceAnnuler, entPlanning, entPlanningCreer,
  entPlanningSupprimer, entTemps, entTempsCreer, entTempsSupprimer, entPieces, entPieceCreer, entPieceMaj, entContrats, entContratCreer,
  entParametres, entJournal, entSecuLire, entSecuEcrire, entApercu,
  entPieceSupprimer, entTypesPieces, entTypePieceCreer, entTypePieceSupprimer, entTypePieceDemander, entMonDrive, entFiche, entFicheMaj,
  entDecompte, entDecompteExport, entRemuneration, entRemunerationMaj, entVersement,
  entChrono, entChronoDemarrer, entChronoArreter, entAssistant, entReprise,
  entInstaller, entInstallation, entSourceFichiers, entSourceAnalyser, entSourceEnregistrer, entSourceSynchroniser, entSource, entSourceDelier, entRadar, fetchBoardsPartages, entLiaison, entLiaisonDemander, entLiaisonNotifs, entLiaisonDelier, entSuiviTemps, entSuiviTempsMaj, entDecompteDossiers, entDecompteDossiersExport, entDecompteDossiersEnvoyer,
  entAnnuaire, entPlanningARegarder, entPlanningVu, entCommentaires, entCommenter, entExcelModele, entExcelExport, entExcelImport,
  cessionDossiers, cessionCreer,
} from "@/lib/kairosApi";
import { Ok, OkTuile, OkBarre } from "@/components/kairos/Ok";

// « Ton entreprise » : l'espace de l'entreprise CLIENTE. Zayado n'est que la coquille (« by Zayado ») :
// le nom et le logo sont ceux de l'entreprise, les fichiers restent dans SON Drive (Microsoft ou Google), la base se prépare en Excel.
// Les onglets dépendent du rôle ; un partenaire ne voit que présence et planning, en lecture seule.
// Cette page ne montre JAMAIS de donnée personnelle du cockpit (énergie, Vision, Ma Foi…) : elle est faite pour être ouverte dans Teams.

const ROLES = { proprietaire: "Propriétaire", manager: "Manager", membre: "Membre", prestataire: "Prestataire", partenaire: "Partenaire" };
const PRESENCES = [["bureau", "🏢 Bureau"], ["teletravail", "🏠 Télétravail"], ["deplacement", "🚆 Déplacement"], ["absent", "🌴 Absent"]];
const ABSENCES = [["conges", "Congés payés (CP)"], ["maladie", "Maladie"], ["recuperation", "Récupération"], ["ecole", "Temps école"], ["sans_solde", "Sans solde"], ["autre", "Autre"]];
const CRENEAUX = [["matin", "Matin"], ["apres_midi", "Après-midi"], ["journee", "Journée"]];
const DRIVES = { microsoft: "OneDrive / SharePoint", google: "Google Drive", aucun: "Drive" };
const iso = (d) => d.toISOString().slice(0, 10);
const lundi = (d) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const plus = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const jourCourt = (s) => new Date(`${s}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
const msg = (e) => e?.detail || e?.message || "Action impossible pour le moment.";

const champ = "w-full rounded-xl border border-white/20 bg-white/[0.07] px-3.5 py-2.5 text-[15px] text-white outline-none placeholder:text-white/45 focus:border-gold";
const bouton = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#DEC2A3] to-[#F1E2CC] px-5 text-[14px] font-semibold text-navy-900 disabled:opacity-50";
const bouton2 = "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-white/25 px-3.5 text-[13px] font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50";
// Toutes les cartes de l'espace entreprise reprennent la grammaire validée
// (fond dégradé, bord clair, halo champagne) : c'était la seule page qui gardait
// son propre style de carte.
const carte = "ok p-4 sm:p-5";
const titreCarte = "text-[15px] font-semibold text-white";
const aide = "mt-1 text-[12.5px] leading-relaxed text-white/60";

function Pastille({ actif, children, ...p }) {
  return <button type="button" {...p} className={`inline-flex min-h-[40px] shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-[13.5px] font-medium transition ${actif ? "border-gold bg-gold text-navy-900" : "border-white/20 bg-white/[0.06] text-white/85 hover:border-white/40"}`}>{children}</button>;
}

function Interrupteur({ actif, onClick, label, testid }) {
  return (
    <button type="button" role="switch" aria-checked={actif} aria-label={label} onClick={onClick} data-testid={testid}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${actif ? "bg-gold" : "bg-white/25"}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${actif ? "left-6" : "left-1"}`} />
    </button>
  );
}

// Le logo et le nom de l'entreprise cliente ; Zayado signe en petit.
// Titre de la section ouverte (le menu, lui, est dans la navigation de l'appli)
function TitreSection({ onglet }) {
  const s = SECTIONS_ENTREPRISE.find((x) => x.key === onglet);
  const titre = onglet === "assistant" ? "Assistant de l'entreprise" : s?.nom;
  // Aujourd'hui et Reprise ont leur propre en-tête riche (nom + titre serif) :
  // on n'ajoute pas un second titre de section au-dessus.
  if (!titre || onglet === "aujourdhui" || onglet === "reprise") return null;
  // Même en-tête que le reste de l'application : surlignage daté, titre serif.
  return (
    <div className="mb-5" data-testid="ent-titre-section">
      <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-gold">
        Ton entreprise · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <h2 className="mt-2 font-display text-[26px] font-semibold leading-tight sm:text-[32px]">{titre}</h2>
    </div>
  );
}

function BandeauMarque({ marque }) {
  const nom = marque?.nom || "Ton entreprise";
  const initiales = nom.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
  return (
    <div className="mb-4 flex items-center gap-3.5" data-testid="ent-marque">
      {marque?.logo
        ? <img src={marque.logo} alt={`Logo ${nom}`} className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain p-1" />
        : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[17px] font-bold text-white" style={{ background: marque?.couleur || "#2f6f5e" }} aria-hidden>{initiales || "?"}</span>}
      <div className="min-w-0">
        <h1 className="truncate text-[20px] font-semibold leading-tight text-white sm:text-[22px]">{nom}</h1>
        <p className="text-[12px] text-white/55">Ton entreprise · by Zayado</p>
      </div>
    </div>
  );
}

const STATUT_PIECE = {
  a_fournir: ["À fournir", "border-white/25 text-white/80"],
  fournie: ["Déposée, en vérification", "border-sky-300/40 text-sky-200"],
  validee: ["Validée", "border-emerald-300/50 text-emerald-200"],
  refusee: ["À refaire", "border-rose-300/50 text-rose-200"],
};
function Statut({ s }) {
  const [l, c] = STATUT_PIECE[s] || [s, "border-white/25 text-white/80"];
  return <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${c}`}>{l}</span>;
}

export default function Entreprise() {
  const [params, setParams] = useSearchParams();
  const [moi, setMoi] = useState(undefined); // undefined = chargement
  const [membres, setMembres] = useState([]);
  const [reprises, setReprises] = useState([]);
  const brut = params.get("vue") || "aujourdhui";
  const onglet = brut === "temps" ? "chrono" : brut;
  const aller = useCallback((v) => setParams({ vue: v }, { replace: true }), [setParams]);

  const charger = useCallback(async () => {
    try {
      const m = await entMoi();
      setMoi(m);
      if (m.actif) {
        setMembres((await entMembres()).membres || []);
        oublierEspaceEntreprise();  // le menu (rail, barre du bas) relira les compteurs
        entReprise().then((r) => setReprises(r.dossiers || [])).catch(() => {});
      }
    } catch (e) { setMoi({ actif: false, erreur: true }); }
  }, []);
  useEffect(() => { charger(); }, [charger]);
  // La bulle de chat de l'en-tête ouvre ici l'assistant DE L'ENTREPRISE
  useEffect(() => {
    const ouvrir = () => aller("assistant");
    window.addEventListener("zayado:assistant-entreprise", ouvrir);
    return () => window.removeEventListener("zayado:assistant-entreprise", ouvrir);
  }, [aller]);

  const noms = useMemo(() => Object.fromEntries(membres.map((m) => [m.id, m.nom || m.email || "—"])), [membres]);
  const d = moi?.droits || {};
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-5 pb-28 sm:px-6" data-testid="entreprise">
          {moi === undefined && <Loader2 className="mx-auto mt-10 animate-spin text-white/60" />}
          {moi && !moi.actif && <div className="mx-auto max-w-3xl"><Activer moi={moi} onFait={charger} /></div>}
          {/* Les écrans « tableau de bord » (aujourd'hui, équipe, décompte,
              reprise…) prennent deux colonnes comme le Radar et la maquette
              reprise : on lit en travers, on scrolle moins. Les écrans de
              saisie (réglages, mes infos) gardent une colonne lisible — un
              formulaire large n'est pas plus agréable, juste plus fatigant. */}
          {moi?.actif && (() => {
            const large = ["aujourdhui", "equipe", "decompte", "reprise", "dossier", "chrono", "planning", "absences"].includes(onglet);
            return (
            <div className={`mx-auto ${large ? "max-w-5xl" : "max-w-3xl"}`}>
              {/* Les sections sont dans le menu principal (rail à gauche sur PC, barre du bas sur téléphone) */}
              <BandeauMarque marque={moi.marque || { nom: moi.org?.nom }} />
              <TitreSection onglet={onglet} />
              <section className="min-w-0">
                {onglet === "aujourdhui" && <Aujourdhui moi={moi} membres={membres} noms={noms} aller={aller} />}
                {onglet === "assistant" && <Assistant moi={moi} />}
                {onglet === "equipe" && <Equipe moi={moi} membres={membres} recharger={charger} />}
                {onglet === "absences" && <Absences moi={moi} noms={noms} membres={membres} />}
                {onglet === "planning" && <Planning moi={moi} noms={noms} membres={membres} />}
                {onglet === "chrono" && <div className="space-y-4"><Chrono /><DecompteDossiers /><Temps moi={moi} noms={noms} /></div>}
                {onglet === "decompte" && (d.saisir_soi
                  ? <Decompte moi={moi} membres={membres} noms={noms} />
                  : <SectionReservee titre="Le décompte du mois" texte="Cette section n'est pas ouverte sur ton compte." aller={aller} />)}
                {onglet === "pieces" && <Pieces moi={moi} noms={noms} membres={membres} />}
                {onglet === "dossier" && <Dossier moi={moi} />}
                {/* Conseiller Zayado : l'outil complet (créer, chiffrer, suivre les
                     dossiers de ses clients sous mandat). Client accompagné : la vue
                     de SON dossier, sans les notes internes. Un seul endroit, deux
                     lectures — au lieu d'un outil caché dans un menu personnel. */}
                {onglet === "reprise" && (moi.conseiller
                  ? <RepriseConseiller />
                  : <ReprisePartenaire dossiers={reprises} />)}
                {onglet === "radar" && <RadarEntreprise />}
                {onglet === "vision" && <VisionPartagee />}
                {onglet === "reglages" && (d.parametres
                  ? <Reglages moi={moi} membres={membres} noms={noms} recharger={charger} />
                  : <SectionReservee titre="Les réglages de l'entreprise"
                      texte="Le logo, le Drive commun et les règles de l'équipe sont posés par la personne qui gère l'entreprise. Tu n'as rien à renseigner ici."
                      aller={aller} />)}
              </section>
            </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
}

function Activer({ moi, onFait }) {
  const [nom, setNom] = useState("");
  const [occupe, setOccupe] = useState(false);
  const go = async () => {
    setOccupe(true);
    try { await entActiver(nom.trim()); toast.success("Ton entreprise est activée."); onFait(); } catch (e) { toast.error(msg(e)); }
    setOccupe(false);
  };
  const invitation = lireInvitation();
  if (moi.erreur) {
    return (
      <div className={carte} data-testid="ent-erreur">
        <h2 className="text-[17px] font-semibold text-white">Équipe introuvable</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-white/75">Ton compte n'est rattaché à aucune équipe pour l'instant, ou la connexion a échoué.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {invitation && <Link to={urlRejoindre(invitation)} className={bouton} data-testid="ent-reprendre-invitation">Rejoindre l'équipe qui m'a invité</Link>}
          <button className={bouton2} onClick={onFait}>Réessayer</button>
        </div>
      </div>
    );
  }
  return (
    <div className={carte} data-testid="ent-activer">
      <h2 className="text-[17px] font-semibold text-white">Ton équipe dans Zayado</h2>
      <p className="mt-1 text-[14px] leading-relaxed text-white/75">
        Présence, absences, planning, temps et pièces de tes salariés, prestataires et freelances. On invite par e-mail ou par lien : aucun Microsoft 365 n'est nécessaire.
      </p>
      {moi.peut_activer ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom de ton entreprise" className={champ} data-testid="ent-nom" maxLength={120} />
          <button className={bouton} disabled={nom.trim().length < 2 || occupe} onClick={go} data-testid="ent-activer-go">{occupe ? <Loader2 size={16} className="animate-spin" /> : <Building2 size={16} />} Activer</button>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-white/20 bg-white/[0.06] px-3.5 py-3 text-[13.5px] text-white/80">
          Inclus dans l'offre Équipe (jusqu'à 5 personnes, toi compris) et dans l'offre Entreprise. Si on t'a invité, ouvre le lien d'invitation reçu : tu rejoindras l'équipe directement.
        </p>
      )}
    </div>
  );
}

function Aujourdhui({ moi, membres, noms, aller }) {
  const auj = iso(new Date());
  const [pres, setPres] = useState([]);
  const [note, setNote] = useState("");
  const [ap, setAp] = useState(null);
  // Radar et Vision partagée ne sont plus des entrées de menu : on en affiche un
  // aperçu ici, avec un lien vers le détail. On ne charge les boards que si la
  // personne peut en voir (évite un appel inutile pour un partenaire).
  const [boardsPartages, setBoardsPartages] = useState(null);
  const radarPartage = Boolean(moi.marque?.partage_radar) && moi.role !== "partenaire";
  const charger = useCallback(() => entPresence(auj, auj).then((r) => setPres(r.presence || [])).catch(() => {}), [auj]);
  useEffect(() => { charger(); entApercu().then(setAp).catch(() => {}); }, [charger]);
  useEffect(() => { fetchBoardsPartages().then((r) => setBoardsPartages(r.boards || [])).catch(() => setBoardsPartages([])); }, []);
  const maPres = pres.find((p) => p.membre_id === moi.membre_id)?.statut;
  const choisir = async (statut) => {
    try { await entPresenceMaj({ jour: auj, statut, note }); toast.success("Présence enregistrée."); charger(); } catch (e) { toast.error(msg(e)); }
  };
  const equipe = membres.filter((m) => m.statut === "actif" && m.role !== "partenaire");
  // Ce qui attend la personne : une ligne = une action, qui mène au bon onglet
  const aFaire = [
    ap?.pieces_a_fournir > 0 && [`${ap.pieces_a_fournir} pièce(s) à déposer dans ton Drive pro`, "pieces"],
    ap?.pieces_a_verifier > 0 && [`${ap.pieces_a_verifier} pièce(s) déposée(s) à vérifier`, "pieces"],
    ap?.plannings_a_regarder > 0 && [`${ap.plannings_a_regarder} planning(s) indiqué(s) par l'équipe à regarder`, "planning"],
    ap?.absences_a_decider > 0 && [`${ap.absences_a_decider} demande(s) d'absence à décider`, "absences"],
  ].filter(Boolean);
  // Deux colonnes, comme le Radar : à gauche ce que TU fais (ce qui t'attend +
  // ta présence) ; à droite l'état de l'équipe. Avant : trois cartes empilées
  // pleine largeur, qui faisaient scroller pour un écran qui tient en un coup
  // d'œil. Sur une seule colonne (mobile, ou pas de présence à saisir), ça
  // retombe naturellement en pile.
  const colGauche = (
    <div className="space-y-4">
      {aFaire.length > 0 && (
        <section className={`${carte} border-gold/40`} data-testid="ent-a-faire">
          <h2 className={titreCarte}>À faire</h2>
          <ul className="mt-2 divide-y divide-white/10">
            {aFaire.map(([t, v]) => (
              <li key={t}><button type="button" onClick={() => aller(v)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-[14px] text-white hover:text-gold">{t}<ChevronDown size={16} className="-rotate-90 text-white/50" /></button></li>
            ))}
          </ul>
        </section>
      )}
      {d_saisie(moi) && (
        <section className={carte}>
          <h2 className={titreCarte}>Où travailles-tu aujourd'hui ?</h2>
          <div className="mt-3 flex flex-wrap gap-2">{PRESENCES.map(([k, l]) => <Pastille key={k} actif={maPres === k} onClick={() => choisir(k)} data-testid={`ent-presence-${k}`}>{l}</Pastille>)}</div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Un mot pour l'équipe (facultatif)" maxLength={200} className={`${champ} mt-3`} />
        </section>
      )}
    </div>
  );
  const nbBoards = (boardsPartages || []).length;
  const partageVisible = radarPartage || nbBoards > 0;
  const colDroite = (
    <div className="space-y-4">
      <section className={carte} data-testid="ent-equipe-auj">
        <h2 className={titreCarte}>L'équipe aujourd'hui</h2>
        <ul className="mt-3 divide-y divide-white/10">
          {equipe.map((m) => {
            const p = pres.find((x) => x.membre_id === m.id);
            const lib = PRESENCES.find(([k]) => k === p?.statut)?.[1];
            return <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-[14px]"><span className="truncate text-white">{noms[m.id]}{m.poste ? <span className="text-white/55"> · {m.poste}</span> : null}</span><span className={lib ? "text-white/85" : "text-white/40"}>{lib || "pas renseigné"}</span></li>;
          })}
          {!equipe.length && <li className="py-2 text-[14px] text-white/60">Personne n'a encore rejoint l'équipe.</li>}
        </ul>
      </section>

      {/* Ce que l'entreprise partage (Radar, Vision) : ici, en aperçu, plutôt
          qu'en deux entrées de menu de plus. On n'affiche la carte que s'il y a
          vraiment quelque chose de partagé. */}
      {partageVisible && (
        <section className={carte} data-testid="ent-partage">
          <h2 className={titreCarte}>Partagé par l'entreprise</h2>
          <div className="mt-3 space-y-2">
            {radarPartage && (
              <button type="button" onClick={() => aller("radar")} data-testid="ent-partage-radar"
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-left transition hover:border-white/25 hover:bg-white/[0.07]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold"><Radar size={16} /></span>
                <span className="min-w-0 flex-1"><span className="block text-[14px] font-semibold text-white">Radar de l'entreprise</span><span className="block text-[12.5px] text-white/55">Les prospects partagés, en lecture seule</span></span>
                <ChevronDown size={16} className="-rotate-90 shrink-0 text-white/40" />
              </button>
            )}
            {nbBoards > 0 && (
              <button type="button" onClick={() => aller("vision")} data-testid="ent-partage-vision"
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-left transition hover:border-white/25 hover:bg-white/[0.07]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold"><Compass size={16} /></span>
                <span className="min-w-0 flex-1"><span className="block text-[14px] font-semibold text-white">Vision partagée</span><span className="block text-[12.5px] text-white/55">{nbBoards} board{nbBoards > 1 ? "s" : ""} partagé{nbBoards > 1 ? "s" : ""} avec toi</span></span>
                <ChevronDown size={16} className="-rotate-90 shrink-0 text-white/40" />
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
  // Si la colonne de gauche est vide (rien à faire, pas de présence à saisir),
  // l'équipe prend toute la largeur plutôt que de laisser un trou.
  const gaucheVide = aFaire.length === 0 && !d_saisie(moi);
  if (gaucheVide) return <div className="min-w-0">{colDroite}</div>;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="min-w-0">{colGauche}</div>
      <div className="min-w-0">{colDroite}</div>
    </div>
  );
}
const d_saisie = (moi) => Boolean(moi.droits?.saisir_soi);

function Equipe({ moi, membres, recharger }) {
  const d = moi.droits;
  const [f, setF] = useState({ email: "", nom: "", role: "membre", poste: "", type_contrat: "salarie" });
  const [lien, setLien] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [ouvert, setOuvert] = useState(null);
  const [annuaire, setAnnuaire] = useState([]);
  useEffect(() => { entAnnuaire().then((r) => setAnnuaire(r.annuaire || [])).catch(() => {}); }, [membres]);
  const roles = moi.role === "proprietaire" ? ["manager", "membre", "prestataire", "partenaire"] : ["membre", "prestataire", "partenaire"];
  const inviter = async (e) => {
    e.preventDefault();
    setOccupe(true);
    try {
      const r = await entInviter({ ...f, email: f.email.trim() || null });
      setLien(r.lien);
      toast.success(r.email_envoye ? "Invitation envoyée par e-mail." : "Lien d'invitation créé : copie-le et envoie-le.");
      setF({ ...f, email: "", nom: "", poste: "" });
      recharger();
    } catch (err) { toast.error(msg(err)); }
    setOccupe(false);
  };
  const copier = async (t) => { try { await navigator.clipboard.writeText(t); toast.success("Lien copié."); } catch { toast.error("Copie impossible : sélectionne le lien à la main."); } };
  const relancer = async (id) => { try { const r = await entLienInvitation(id); setLien(r.lien); } catch (e) { toast.error(msg(e)); } };
  const contact = Object.fromEntries(annuaire.map((a) => [a.id, a]));
  return (
    <div className="space-y-4">
      {d.gerer_equipe && (
        <form onSubmit={inviter} className={carte} data-testid="ent-inviter">
          <h2 className={`flex items-center gap-2 ${titreCarte}`}><UserPlus size={16} className="text-gold" /> Inviter quelqu'un</h2>
          <p className={aide}>Toute une équipe d'un coup ? Prépare-la dans l'Excel (Réglages › Base Excel) et importe-la.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} placeholder="Prénom Nom" className={champ} maxLength={120} />
            <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="E-mail (vide = juste un lien)" type="email" className={champ} data-testid="ent-inviter-email" />
            <input value={f.poste} onChange={(e) => setF({ ...f, poste: e.target.value })} placeholder="Poste" className={champ} maxLength={120} />
            <select value={f.type_contrat} onChange={(e) => setF({ ...f, type_contrat: e.target.value })} className={champ} aria-label="Statut">
              <option value="salarie">Salarié</option><option value="prestataire">Prestataire</option><option value="freelance">Freelance</option><option value="stagiaire">Stagiaire</option><option value="autre">Autre</option>
            </select>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Rôle">{roles.map((r) => <Pastille key={r} actif={f.role === r} onClick={() => setF({ ...f, role: r })}>{ROLES[r]}</Pastille>)}</div>
          <p className="mt-2 text-[12.5px] text-white/55">Partenaire : lecture seule de la présence et du planning, rien d'autre.</p>
          <button className={`${bouton} mt-3`} disabled={occupe} data-testid="ent-inviter-go">{occupe ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Inviter</button>
          {lien && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2" data-testid="ent-lien">
              <span className="min-w-0 flex-1 truncate text-[13px] text-white/90">{lien}</span>
              <button type="button" onClick={() => copier(lien)} className={bouton2} aria-label="Copier le lien"><Copy size={14} /></button>
            </div>
          )}
        </form>
      )}
      <section className={carte}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className={titreCarte}>Équipe ({membres.length})</h2>
          {moi.places?.limite != null && (
            <span className={`text-[12.5px] ${moi.places.utilisees >= moi.places.limite ? "text-amber-200" : "text-white/60"}`} data-testid="ent-places">
              {moi.places.utilisees} / {moi.places.limite} personnes (offre Équipe){moi.places.utilisees >= moi.places.limite ? " · au-delà : offre Entreprise" : ""}
            </span>
          )}
        </div>
        <ul className="mt-2 divide-y divide-white/10">
          {membres.map((m) => {
            const c = contact[m.id];
            return (
              <li key={m.id} className="py-2.5 text-[14px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 basis-[55%]"><span className="block truncate text-white">{m.nom || m.email}</span><span className="block truncate text-[12.5px] text-white/55">{ROLES[m.role]}{m.poste ? ` · ${m.poste}` : ""}{m.statut === "invite" ? " · invitation en attente" : ""}</span></span>
                  {c?.tel_pro || c?.tel ? <a href={`tel:${(c.tel_pro || c.tel).replace(/\s/g, "")}`} className={bouton2} aria-label={`Appeler ${m.nom}`}><Phone size={14} /></a> : null}
                  {c?.email_pro || c?.email ? <a href={`mailto:${c.email_pro || c.email}`} className={bouton2} aria-label={`Écrire à ${m.nom}`}><Mail size={14} /></a> : null}
                  {d.gerer_equipe && m.statut === "invite" && <button className={bouton2} onClick={() => relancer(m.id)}><Copy size={14} /> Lien</button>}
                  {moi.role === "proprietaire" && m.role !== "proprietaire" && (
                    <select value={m.role} onChange={async (e) => { try { await entModifierMembre(m.id, { role: e.target.value }); recharger(); } catch (er) { toast.error(msg(er)); } }} className="rounded-lg border border-white/20 bg-white/[0.07] px-2 py-1.5 text-[13px] text-white" aria-label={`Rôle de ${m.nom || m.email}`}>
                      {["manager", "membre", "prestataire", "partenaire"].map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}
                    </select>
                  )}
                  {d.gerer_equipe && m.role !== "proprietaire" && (
                    <button className={bouton2} onClick={() => setOuvert(ouvert === m.id ? null : m.id)} aria-expanded={ouvert === m.id} data-testid={`ent-fiche-${m.id}`}>
                      Fiche <ChevronDown size={14} className={ouvert === m.id ? "rotate-180" : ""} />
                    </button>
                  )}
                </div>
                {ouvert === m.id && <FicheGerant membre={m} moi={moi} recharger={recharger} />}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

// Ce que le gérant voit et règle pour une personne : ses coordonnées (lecture), ses infos pro et son dossier Drive (écriture).
function FicheGerant({ membre, moi, recharger }) {
  const [f, setF] = useState(null);
  useEffect(() => { entFiche(membre.id).then(setF).catch((e) => toast.error(msg(e))); }, [membre.id]);
  if (!f) return <Loader2 size={16} className="mt-2 animate-spin text-white/50" />;
  const enregistrer = async () => {
    try { await entFicheMaj(membre.id, { tel_pro: f.tel_pro, email_pro: f.email_pro, lien_drive: f.lien_drive }); toast.success("Fiche enregistrée."); recharger(); } catch (e) { toast.error(msg(e)); }
  };
  const adresse = [f.adresse, [f.code_postal, f.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-white/15 bg-white/[0.04] p-3.5">
      <dl className="grid gap-x-4 gap-y-1.5 text-[13.5px] sm:grid-cols-2">
        <div><dt className="text-white/50">Adresse</dt><dd className="text-white">{adresse || "—"}</dd></div>
        <div><dt className="text-white/50">Téléphone perso</dt><dd className="text-white">{f.tel_perso || "—"}</dd></div>
        <div><dt className="text-white/50">E-mail perso</dt><dd className="break-all text-white">{f.email_perso || "—"}</dd></div>
        <div><dt className="text-white/50">En cas d'urgence</dt><dd className="text-white">{[f.urgence_nom, f.urgence_tel].filter(Boolean).join(" · ") || "—"}</dd></div>
      </dl>
      <p className="text-[12px] text-white/50">Saisi par {membre.nom || "la personne"} elle-même. Ta consultation est notée dans le journal des accès.</p>
      <SuiviTempsMembre membre={membre} />
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={f.tel_pro} onChange={(e) => setF({ ...f, tel_pro: e.target.value })} placeholder="Téléphone pro" className={champ} maxLength={30} />
        <input value={f.email_pro} onChange={(e) => setF({ ...f, email_pro: e.target.value })} placeholder="E-mail pro" className={champ} maxLength={255} />
        <input value={f.lien_drive} onChange={(e) => setF({ ...f, lien_drive: e.target.value })} placeholder="Lien de son dossier dans le Drive de l'entreprise (https://…)" className={`${champ} sm:col-span-2`} maxLength={1000} data-testid="ent-fiche-lien-drive" />
      </div>
      <p className="text-[12px] text-white/50">Son bouton « Accéder à mon Drive pro » ouvrira ce dossier. Partage-le avec son adresse dans {DRIVES[moi.marque?.drive_fournisseur] || "ton Drive"}, sinon il ne pourra pas l'ouvrir.</p>
      <button className={bouton} onClick={enregistrer}>Enregistrer</button>
    </div>
  );
}

// Fil de commentaires sous une entrée de planning ou une pièce.
function Commentaires({ type, id, noms, onNouveau }) {
  const [liste, setListe] = useState(null);
  const [texte, setTexte] = useState("");
  const charger = useCallback(() => entCommentaires(type, id).then((r) => setListe(r.commentaires || [])).catch(() => setListe([])), [type, id]);
  useEffect(() => { charger(); }, [charger]);
  const envoyer = async (e) => {
    e.preventDefault();
    if (!texte.trim()) return;
    try { await entCommenter(type, id, texte.trim()); setTexte(""); charger(); onNouveau?.(); } catch (er) { toast.error(msg(er)); }
  };
  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      {liste === null ? <Loader2 size={14} className="animate-spin text-white/50" /> : (
        <ul className="space-y-2">
          {liste.map((c) => <li key={c.id} className="text-[13.5px]"><span className="font-semibold text-white">{noms[c.auteur_id] || "—"}</span> <span className="text-white/80">{c.texte}</span></li>)}
          {!liste.length && <li className="text-[13px] text-white/50">Pas encore de commentaire.</li>}
        </ul>
      )}
      <form onSubmit={envoyer} className="mt-2 flex gap-2">
        <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Écrire un commentaire" maxLength={600} className={champ} />
        <button className={bouton2} aria-label="Envoyer le commentaire" disabled={!texte.trim()}><Send size={14} /></button>
      </form>
    </div>
  );
}

function Planning({ moi, noms, membres }) {
  const gerant = moi.droits.gerer_equipe;
  const [debut, setDebut] = useState(lundi(new Date()));
  const [pres, setPres] = useState([]);
  const [plan, setPlan] = useState([]);
  const [aRegarder, setARegarder] = useState([]);
  const [ouvert, setOuvert] = useState(null);
  const [f, setF] = useState({ titre: "", debut: iso(new Date()), fin: "", membre_id: "", creneau: "journee", note: "" });
  const fin = plus(debut, 6);
  const charger = useCallback(() => {
    entPresence(iso(debut), iso(fin)).then((r) => setPres(r.presence || [])).catch(() => {});
    entPlanning(iso(debut), iso(fin)).then((r) => setPlan(r.planning || [])).catch(() => {});
    if (gerant) entPlanningARegarder().then((r) => setARegarder(r.planning || [])).catch(() => {});
  }, [debut, gerant]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { charger(); }, [charger]);
  const jours = Array.from({ length: 5 }, (_, i) => iso(plus(debut, i)));
  const actifs = membres.filter((m) => m.statut === "actif" && m.role !== "partenaire");
  const ajouter = async (e) => {
    e.preventDefault();
    try {
      await entPlanningCreer({ ...f, membre_id: gerant ? (f.membre_id || null) : null, fin: f.fin || null });
      setF({ ...f, titre: "", note: "" }); charger();
      toast.success(gerant ? "Ajouté au planning." : "Planning envoyé : ton responsable est prévenu.");
    } catch (er) { toast.error(msg(er)); }
  };
  const vu = async (id) => { try { await entPlanningVu(id); charger(); } catch (e) { toast.error(msg(e)); } };
  const ligne = (p, avecVu) => (
    <li key={p.id} className="py-2.5 text-[14px]" data-testid="ent-planning-ligne">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-white">{p.titre}
          <span className="block text-[12.5px] text-white/55">{jourCourt(p.debut)}{p.fin && p.fin !== p.debut ? ` → ${jourCourt(p.fin)}` : ""} · {CRENEAUX.find(([k]) => k === p.creneau)?.[1] || "Journée"} · {p.membre_id ? noms[p.membre_id] : "toute l'équipe"}</span>
          {p.note && <span className="block text-[12.5px] text-white/70">{p.note}</span>}
        </span>
        {p.statut === "propose" && <span className="shrink-0 rounded-full border border-gold/50 px-2.5 py-0.5 text-[12px] font-semibold text-gold">À regarder</span>}
        {p.statut === "vu" && <span className="shrink-0 rounded-full border border-emerald-300/50 px-2.5 py-0.5 text-[12px] font-semibold text-emerald-200">Vu</span>}
      </div>
      {moi.role !== "partenaire" && (
        <div className="mt-1.5 flex flex-wrap gap-2">
          <button className={bouton2} onClick={() => setOuvert(ouvert === p.id ? null : p.id)} aria-expanded={ouvert === p.id}><MessageCircle size={14} /> {p.commentaires ? `${p.commentaires} commentaire(s)` : "Commenter"}</button>
          {avecVu && p.statut === "propose" && <button className={bouton2} onClick={() => vu(p.id)} data-testid="ent-planning-vu"><Check size={14} /> Vu</button>}
          {(gerant || p.auteur_id === moi.membre_id) && <button className={bouton2} onClick={async () => { try { await entPlanningSupprimer(p.id); charger(); } catch (e) { toast.error(msg(e)); } }} aria-label="Supprimer"><Trash2 size={14} /></button>}
        </div>
      )}
      {ouvert === p.id && <Commentaires type="planning" id={p.id} noms={noms} onNouveau={charger} />}
    </li>
  );
  return (
    <div className="space-y-4">
      {gerant && aRegarder.length > 0 && (
        <section className={`${carte} border-gold/40`} data-testid="ent-planning-a-regarder">
          <h2 className={titreCarte}>Plannings indiqués par l'équipe</h2>
          <p className={aide}>Regarde, laisse un commentaire si besoin : la personne est prévenue.</p>
          <ul className="mt-1 divide-y divide-white/10">{aRegarder.map((p) => ligne(p, true))}</ul>
        </section>
      )}
      {d_saisie(moi) && (
        <form onSubmit={ajouter} className={carte} data-testid="ent-planning-form">
          <h2 className={titreCarte}>{gerant ? "Ajouter au planning" : "Indiquer mon planning"}</h2>
          {!gerant && <p className={aide}>Ce que tu prévois de faire et quand. Ton responsable reçoit une notification et peut te laisser un commentaire.</p>}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} placeholder="Quoi ? (prospection, livraison, réunion…)" className={`${champ} sm:col-span-2`} maxLength={160} required />
            <label className="text-[12.5px] text-white/65">Le<input type="date" value={f.debut} onChange={(e) => setF({ ...f, debut: e.target.value })} className={`${champ} mt-1`} /></label>
            <label className="text-[12.5px] text-white/65">Jusqu'au (facultatif)<input type="date" value={f.fin} min={f.debut} onChange={(e) => setF({ ...f, fin: e.target.value })} className={`${champ} mt-1`} /></label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Créneau">{CRENEAUX.map(([k, l]) => <Pastille key={k} actif={f.creneau === k} onClick={() => setF({ ...f, creneau: k })}>{l}</Pastille>)}</div>
          {gerant && <select value={f.membre_id} onChange={(e) => setF({ ...f, membre_id: e.target.value })} className={`${champ} mt-3`} aria-label="Pour qui"><option value="">Toute l'équipe</option>{actifs.map((m) => <option key={m.id} value={m.id}>{noms[m.id]}</option>)}</select>}
          <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Précision, livrable attendu (facultatif)" maxLength={400} className={`${champ} mt-3`} />
          <button className={`${bouton} mt-3`} data-testid="ent-planning-go">{gerant ? <Plus size={16} /> : <Send size={16} />} {gerant ? "Ajouter" : "Envoyer mon planning"}</button>
        </form>
      )}
      <div className="flex items-center justify-between gap-2">
        <button className={bouton2} onClick={() => setDebut(plus(debut, -7))} aria-label="Semaine précédente">←</button>
        <span className="text-[14px] font-semibold text-white">Semaine du {jourCourt(iso(debut))}</span>
        <button className={bouton2} onClick={() => setDebut(plus(debut, 7))} aria-label="Semaine suivante">→</button>
      </div>
      <section className={carte}>
        <h2 className={titreCarte}>Cette semaine</h2>
        <ul className="mt-1 divide-y divide-white/10">
          {plan.map((p) => ligne(p, gerant))}
          {!plan.length && <li className="py-2 text-[14px] text-white/60">Rien de planifié.</li>}
        </ul>
      </section>
      <section className={`${carte} overflow-x-auto`}>
        <h2 className={titreCarte}>Présence</h2>
        <table className="mt-2 w-full min-w-[460px] text-[13.5px]" data-testid="ent-grille">
          <thead><tr><th className="pb-2 text-left font-medium text-white/60" />{jours.map((j) => <th key={j} className="pb-2 text-center font-medium text-white/60">{jourCourt(j)}</th>)}</tr></thead>
          <tbody>
            {actifs.map((m) => (
              <tr key={m.id} className="border-t border-white/10">
                <td className="py-2 pr-2 text-white">{noms[m.id]}</td>
                {jours.map((j) => { const s = pres.find((p) => p.membre_id === m.id && p.jour === j)?.statut; return <td key={j} className="py-2 text-center">{PRESENCES.find(([k]) => k === s)?.[1].split(" ")[0] || <span className="text-white/25">·</span>}</td>; })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Absences({ moi, noms, membres }) {
  const [liste, setListe] = useState([]);
  const [f, setF] = useState({ type: "conges", debut: iso(new Date()), fin: iso(new Date()), motif: "", membre_id: "" });
  const charger = useCallback(() => entAbsences().then((r) => setListe(r.absences || [])).catch(() => {}), []);
  useEffect(() => { charger(); }, [charger]);
  const gerant = moi.droits.decider_absence;
  const envoyer = async (e) => {
    e.preventDefault();
    try { await entAbsenceCreer({ ...f, membre_id: f.membre_id || null }); toast.success(gerant && moi.role === "proprietaire" ? "Absence enregistrée." : "Demande envoyée."); charger(); } catch (er) { toast.error(msg(er)); }
  };
  const decider = async (id, s) => { try { await entAbsenceDecider(id, s); charger(); } catch (e) { toast.error(msg(e)); } };
  const annuler = async (id) => { try { await entAbsenceAnnuler(id); charger(); } catch (e) { toast.error(msg(e)); } };
  const couleur = { demandee: "text-gold", acceptee: "text-emerald-300", refusee: "text-rose-300" };
  const lib = { demandee: "en attente", acceptee: "acceptée", refusee: "refusée" };
  return (
    <div className="space-y-4">
      <form onSubmit={envoyer} className={carte} data-testid="ent-absence-form">
        <h2 className="text-[15px] font-semibold text-white">{gerant ? "Poser ou saisir une absence" : "Demander une absence"}</h2>
        <div className="mt-3 flex flex-wrap gap-2">{ABSENCES.map(([k, l]) => <Pastille key={k} actif={f.type === k} onClick={() => setF({ ...f, type: k })}>{l}</Pastille>)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-[12.5px] text-white/65">Du<input type="date" value={f.debut} onChange={(e) => setF({ ...f, debut: e.target.value, fin: e.target.value > f.fin ? e.target.value : f.fin })} className={`${champ} mt-1`} /></label>
          <label className="text-[12.5px] text-white/65">Au<input type="date" value={f.fin} min={f.debut} onChange={(e) => setF({ ...f, fin: e.target.value })} className={`${champ} mt-1`} /></label>
        </div>
        {gerant && (
          <select value={f.membre_id} onChange={(e) => setF({ ...f, membre_id: e.target.value })} className={`${champ} mt-3`} aria-label="Pour qui">
            <option value="">Pour moi</option>
            {membres.filter((m) => m.statut === "actif" && m.id !== moi.membre_id && m.role !== "partenaire").map((m) => <option key={m.id} value={m.id}>{noms[m.id]}</option>)}
          </select>
        )}
        <input value={f.motif} onChange={(e) => setF({ ...f, motif: e.target.value })} placeholder="Motif (facultatif)" maxLength={300} className={`${champ} mt-3`} />
        <button className={`${bouton} mt-3`} data-testid="ent-absence-go">Envoyer</button>
      </form>
      <section className={carte}>
        <h2 className="text-[15px] font-semibold text-white">{gerant ? "Absences de l'équipe" : "Mes absences"}</h2>
        <ul className="mt-2 divide-y divide-white/10">
          {liste.map((a) => (
            <li key={a.id} className="py-2.5 text-[14px]" data-testid="ent-absence">
              <div className="flex items-center justify-between gap-2"><span className="text-white">{gerant ? `${noms[a.membre_id] || "—"} · ` : ""}{ABSENCES.find(([k]) => k === a.type)?.[1]}, {jourCourt(a.debut)} → {jourCourt(a.fin)}</span><span className={`text-[12.5px] font-semibold ${couleur[a.statut]}`}>{lib[a.statut]}</span></div>
              {a.motif && <p className="text-[12.5px] text-white/55">{a.motif}</p>}
              <div className="mt-1.5 flex gap-2">
                {gerant && a.statut === "demandee" && a.membre_id !== moi.membre_id && (<><button className={bouton2} onClick={() => decider(a.id, "acceptee")} data-testid="ent-absence-accepter"><Check size={14} /> Accepter</button><button className={bouton2} onClick={() => decider(a.id, "refusee")}><X size={14} /> Refuser</button></>)}
                {(a.membre_id === moi.membre_id && a.statut !== "acceptee") || gerant ? <button className={bouton2} onClick={() => annuler(a.id)} aria-label="Supprimer"><Trash2 size={14} /></button> : null}
              </div>
            </li>
          ))}
          {!liste.length && <li className="py-2 text-[14px] text-white/60">Rien pour l'instant.</li>}
        </ul>
      </section>
    </div>
  );
}

function Temps({ moi, noms }) {
  const [liste, setListe] = useState([]);
  const [f, setF] = useState({ jour: iso(new Date()), heures: "", projet: "", note: "" });
  const debut = iso(plus(new Date(), -30));
  const charger = useCallback(() => entTemps(debut, iso(plus(new Date(), 1))).then((r) => setListe(r.temps || [])).catch(() => {}), [debut]);
  useEffect(() => { charger(); const f = () => charger(); window.addEventListener("zayado:temps-maj", f); return () => window.removeEventListener("zayado:temps-maj", f); }, [charger]);
  const total = liste.reduce((n, t) => n + t.heures, 0);
  const ajouter = async (e) => {
    e.preventDefault();
    try { await entTempsCreer({ ...f, heures: parseFloat(String(f.heures).replace(",", ".")) }); setF({ ...f, heures: "", note: "" }); charger(); } catch (er) { toast.error(msg(er)); }
  };
  return (
    <div className="space-y-4">
      <form onSubmit={ajouter} className={carte} data-testid="ent-temps-form">
        <h2 className="text-[15px] font-semibold text-white">Ajouter du temps à la main</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input type="date" value={f.jour} onChange={(e) => setF({ ...f, jour: e.target.value })} className={champ} aria-label="Jour" />
          <input value={f.heures} onChange={(e) => setF({ ...f, heures: e.target.value })} inputMode="decimal" placeholder="Heures (ex. 7,5)" className={champ} required />
          <input value={f.projet} onChange={(e) => setF({ ...f, projet: e.target.value })} placeholder="Projet" className={`${champ} col-span-2`} maxLength={120} />
        </div>
        <button className={`${bouton} mt-3`}>Enregistrer</button>
      </form>
      <section className={carte}>
        <h2 className="text-[15px] font-semibold text-white">30 derniers jours · {total.toLocaleString("fr-FR")} h</h2>
        <ul className="mt-2 divide-y divide-white/10">
          {liste.map((t) => <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-[14px]"><span className="text-white">{jourCourt(t.jour)} · {t.heures} h{t.projet ? ` · ${t.projet}` : ""}{moi.droits.lire_temps_equipe ? <span className="text-white/55"> · {noms[t.membre_id]}</span> : null}</span>
            {(t.membre_id === moi.membre_id || moi.droits.gerer_equipe) && <button className={bouton2} onClick={async () => { try { await entTempsSupprimer(t.id); charger(); } catch (e) { toast.error(msg(e)); } }} aria-label="Supprimer"><Trash2 size={14} /></button>}</li>)}
          {!liste.length && <li className="py-2 text-[14px] text-white/60">Aucune saisie.</li>}
        </ul>
      </section>
    </div>
  );
}

// Le gros bouton qui ouvre le dossier de la personne dans le Drive de l'entreprise.
function BoutonDrive() {
  const [d, setD] = useState(undefined);
  useEffect(() => { entMonDrive().then(setD).catch(() => setD(null)); }, []);
  if (d === undefined) return null;
  return (
    <section className={`${carte} border-gold/40`} data-testid="ent-mon-drive">
      <h2 className={titreCarte}>Mon Drive pro</h2>
      {d?.url ? (
        <>
          <p className={aide}>Dépose tes documents dans {d.source === "personnel" ? "ton dossier" : "le dossier de l'entreprise"} ({DRIVES[d.fournisseur] || "Drive"}), puis reviens ici et appuie sur « C'est déposé ».</p>
          <a href={d.url} target="_blank" rel="noopener noreferrer" className={`${bouton} mt-3 w-full sm:w-auto`} data-testid="ent-mon-drive-ouvrir"><FolderOpen size={17} /> Accéder à mon Drive pro <ExternalLink size={14} /></a>
        </>
      ) : <p className={aide}>Ton entreprise n'a pas encore indiqué ton dossier. Tu peux préparer tes documents : le bouton apparaîtra ici dès qu'il sera prêt.</p>}
      {d?.consignes && <p className="mt-3 whitespace-pre-wrap rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2.5 text-[13.5px] text-white/85">{d.consignes}</p>}
    </section>
  );
}

// Le salarié ne colle pas de lien : il dépose dans le dossier que l'entreprise a préparé pour lui (« Mon Drive pro »)
// puis indique « C'est déposé ». Le responsable vérifie dans ce même dossier.
function MaPiece({ p, maj }) {
  const aDeposer = p.statut === "a_fournir" || p.statut === "refusee";
  return (
    <li className="py-3 text-[14px]" data-testid="ent-ma-piece">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0"><span className="block font-medium text-white">{p.titre}</span>{p.consigne && <span className="block text-[12.5px] text-white/60">{p.consigne}</span>}</span>
        <Statut s={p.statut} />
      </div>
      {p.statut === "refusee" && p.commentaire && <p className="mt-1.5 rounded-lg bg-rose-400/10 px-3 py-2 text-[13px] text-rose-100">{p.commentaire}</p>}
      {aDeposer && <button className={`${bouton} mt-2`} onClick={() => maj(p.id, { statut: "fournie" })} data-testid="ent-piece-deposee"><Check size={16} /> C'est déposé dans mon Drive pro</button>}
    </li>
  );
}

function Pieces({ moi, noms, membres }) {
  const gerant = moi.droits.gerer_equipe;
  const [liste, setListe] = useState([]);
  const [types, setTypes] = useState([]);
  const [refus, setRefus] = useState({});
  const [nv, setNv] = useState({ titre: "", consigne: "", par_defaut: true });
  const [unique, setUnique] = useState({ titre: "", membre_id: "" });
  const charger = useCallback(() => {
    entPieces().then((r) => setListe(r.pieces || [])).catch(() => {});
    if (gerant) entTypesPieces().then((r) => setTypes(r.types || [])).catch(() => {});
  }, [gerant]);
  useEffect(() => { charger(); }, [charger]);
  const maj = async (id, patch, ok) => { try { await entPieceMaj(id, patch); if (ok) toast.success(ok); charger(); } catch (e) { toast.error(msg(e)); } };
  const deposer = (id, patch) => maj(id, patch, "C'est noté : ton responsable est prévenu.");
  const mes = liste.filter((p) => p.membre_id === moi.membre_id);
  const lienDe = Object.fromEntries(membres.map((m) => [m.id, m.lien_drive]));
  const aVerifier = gerant ? liste.filter((p) => p.statut === "fournie" && p.membre_id !== moi.membre_id) : [];
  const parPersonne = gerant ? membres.filter((m) => m.role !== "partenaire" && m.role !== "proprietaire").map((m) => {
    const ps = liste.filter((p) => p.membre_id === m.id);
    return { m, ps, ok: ps.filter((p) => p.statut === "validee").length };
  }) : [];
  const ajouterType = async (e) => {
    e.preventDefault();
    try { await entTypePieceCreer({ ...nv, titre: nv.titre.trim(), consigne: nv.consigne.trim() }); setNv({ titre: "", consigne: "", par_defaut: nv.par_defaut }); charger(); } catch (er) { toast.error(msg(er)); }
  };
  const demander = async (t) => {
    try { const r = await entTypePieceDemander(t.id); toast.success(r.crees ? `« ${t.titre} » demandée à ${r.crees} personne(s).` : "Déjà demandée à tout le monde."); charger(); } catch (e) { toast.error(msg(e)); }
  };
  const demanderUne = async (e) => {
    e.preventDefault();
    try { await entPieceCreer({ titre: unique.titre, membre_id: unique.membre_id, statut: "a_fournir" }); setUnique({ ...unique, titre: "" }); toast.success("Pièce demandée."); charger(); } catch (er) { toast.error(msg(er)); }
  };
  const valides = mes.filter((p) => p.statut === "validee").length;
  return (
    <div className="space-y-4">
      {(!gerant || mes.length > 0) && (
        <>
          <BoutonDrive />
          <section className={carte}>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className={titreCarte}>Mes pièces</h2>
              {mes.length > 0 && <span className="text-[13px] text-white/65">{valides} sur {mes.length} validée(s)</span>}
            </div>
            {mes.length > 0 && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${Math.round((valides / mes.length) * 100)}%` }} /></div>}
            <ul className="mt-1 divide-y divide-white/10">
              {mes.map((p) => <MaPiece key={p.id} p={p} maj={deposer} />)}
              {!mes.length && <li className="py-2 text-[14px] text-white/60">Aucune pièce demandée pour l'instant.</li>}
            </ul>
          </section>
        </>
      )}

      {gerant && (
        <>
          <section className={`${carte} ${aVerifier.length ? "border-gold/40" : ""}`} data-testid="ent-pieces-a-verifier">
            <h2 className={titreCarte}>À vérifier ({aVerifier.length})</h2>
            <p className={aide}>Ouvre le dossier de la personne, vérifie le document, puis valide ou demande de le refaire.</p>
            <ul className="mt-1 divide-y divide-white/10">
              {aVerifier.map((p) => (
                <li key={p.id} className="py-3 text-[14px]">
                  <div className="flex items-start justify-between gap-2"><span className="text-white"><b className="font-semibold">{p.titre}</b> · {noms[p.membre_id]}</span><Statut s={p.statut} /></div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(p.reference || lienDe[p.membre_id]) && <a href={p.reference || lienDe[p.membre_id]} target="_blank" rel="noopener noreferrer" className={bouton2}><FolderOpen size={14} /> {p.reference ? "Ouvrir le fichier" : "Ouvrir son dossier"}</a>}
                    <button className={bouton2} onClick={() => maj(p.id, { statut: "validee" }, "Pièce validée.")} data-testid="ent-piece-valider"><Check size={14} /> Valider</button>
                    <button className={bouton2} onClick={() => setRefus({ ...refus, [p.id]: refus[p.id] ?? "" })}><X size={14} /> À refaire</button>
                  </div>
                  {refus[p.id] !== undefined && (
                    <div className="mt-2 flex gap-2">
                      <input value={refus[p.id]} onChange={(e) => setRefus({ ...refus, [p.id]: e.target.value })} placeholder="Pourquoi ? (illisible, périmé…)" maxLength={300} className={champ} autoFocus />
                      <button className={bouton2} disabled={!refus[p.id].trim()} onClick={() => { maj(p.id, { statut: "refusee", commentaire: refus[p.id].trim() }, "La personne est prévenue."); setRefus({ ...refus, [p.id]: undefined }); }}>Envoyer</button>
                    </div>
                  )}
                </li>
              ))}
              {!aVerifier.length && <li className="py-2 text-[14px] text-white/60">Rien à vérifier.</li>}
            </ul>
          </section>

          <section className={carte} data-testid="ent-types-pieces">
            <h2 className={titreCarte}>La liste des pièces de l'entreprise</h2>
            <p className={aide}>Ce que chaque personne doit fournir. Les pièces « à l'arrivée » sont demandées automatiquement à chaque nouvelle personne.</p>
            <ul className="mt-2 divide-y divide-white/10">
              {types.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2 py-2.5 text-[14px]">
                  <span className="min-w-0 basis-full sm:basis-0 sm:flex-1"><span className="block text-white">{t.titre}{t.par_defaut && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[11.5px] text-white/70">à l'arrivée</span>}</span>{t.consigne && <span className="block text-[12.5px] text-white/55">{t.consigne}</span>}</span>
                  <button className={bouton2} onClick={() => demander(t)}><Send size={14} /> Demander à tous</button>
                  <button className={bouton2} onClick={async () => { try { await entTypePieceSupprimer(t.id); charger(); } catch (e) { toast.error(msg(e)); } }} aria-label={`Retirer ${t.titre} de la liste`}><Trash2 size={14} /></button>
                </li>
              ))}
              {!types.length && <li className="py-2 text-[14px] text-white/60">La liste est vide : ajoute RIB, carte d'identité, carte vitale…</li>}
            </ul>
            <form onSubmit={ajouterType} className="mt-3 grid gap-2 sm:grid-cols-2">
              <input value={nv.titre} onChange={(e) => setNv({ ...nv, titre: e.target.value })} placeholder="Nom de la pièce" className={champ} maxLength={160} required data-testid="ent-type-titre" />
              <input value={nv.consigne} onChange={(e) => setNv({ ...nv, consigne: e.target.value })} placeholder="Indication (facultatif)" className={champ} maxLength={400} />
              <label className="flex items-center gap-3 text-[13.5px] text-white/85 sm:col-span-2"><Interrupteur actif={nv.par_defaut} onClick={() => setNv({ ...nv, par_defaut: !nv.par_defaut })} label="Demander à chaque nouvelle personne" /> Demander à chaque nouvelle personne</label>
              <button className={`${bouton} sm:w-fit`}><Plus size={16} /> Ajouter à la liste</button>
            </form>
          </section>

          <section className={carte}>
            <h2 className={titreCarte}>Suivi par personne</h2>
            <ul className="mt-1 divide-y divide-white/10">
              {parPersonne.map(({ m, ps, ok }) => (
                <li key={m.id} className="py-2.5 text-[14px]">
                  <div className="flex items-center justify-between gap-2"><span className="text-white">{noms[m.id]}</span><span className={`text-[13px] ${ps.length && ok === ps.length ? "text-emerald-200" : "text-white/65"}`}>{ps.length ? `${ok}/${ps.length} validée(s)` : "rien de demandé"}</span></div>
                  {ps.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{ps.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1"><Statut s={p.statut} /><span className="text-[12.5px] text-white/70">{p.titre}</span>
                      <button onClick={async () => { if (!window.confirm(`Ne plus demander « ${p.titre} » à ${noms[m.id]} ?`)) return; try { await entPieceSupprimer(p.id); charger(); } catch (e) { toast.error(msg(e)); } }} className="rounded p-1 text-white/40 hover:text-rose-200" aria-label={`Retirer ${p.titre}`}><X size={12} /></button></span>
                  ))}</div>}
                </li>
              ))}
            </ul>
            <form onSubmit={demanderUne} className="mt-3 grid gap-2 sm:grid-cols-2">
              <input value={unique.titre} onChange={(e) => setUnique({ ...unique, titre: e.target.value })} placeholder="Une pièce pour une seule personne" className={champ} required maxLength={160} />
              <select value={unique.membre_id} onChange={(e) => setUnique({ ...unique, membre_id: e.target.value })} className={champ} required aria-label="Pour qui"><option value="">Pour qui ?</option>{membres.filter((m) => m.id !== moi.membre_id && m.role !== "partenaire").map((m) => <option key={m.id} value={m.id}>{noms[m.id]}</option>)}</select>
              <button className={`${bouton2} sm:w-fit`}><Plus size={14} /> Demander</button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}

// Mes infos : mes coordonnées, mon contrat (moi + propriétaire), mon N° de sécu si l'entreprise l'a activé, mes droits RGPD.
function MesCoordonnees() {
  const [f, setF] = useState(null);
  const [occupe, setOccupe] = useState(false);
  useEffect(() => { entFiche("moi").then(setF).catch(() => setF(false)); }, []);
  if (f === null) return <Loader2 className="animate-spin text-white/50" />;
  if (f === false) return null;
  const enregistrer = async (e) => {
    e.preventDefault();
    setOccupe(true);
    const champs = ["adresse", "code_postal", "ville", "tel_perso", "email_perso", "urgence_nom", "urgence_tel", "partage_tel", "partage_email"];
    try { const r = await entFicheMaj("moi", Object.fromEntries(champs.map((k) => [k, f[k]]))); setF(r); toast.success("Tes infos sont enregistrées."); } catch (er) { toast.error(msg(er)); }
    setOccupe(false);
  };
  const c = (k, ph, extra = {}) => <input value={f[k] || ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={ph} className={champ} {...extra} />;
  return (
    <form onSubmit={enregistrer} className={carte} data-testid="ent-coordonnees">
      <h2 className={titreCarte}>Mes coordonnées</h2>
      <p className={aide}>Visibles de toi et de tes responsables. Tu choisis ce que l'équipe voit.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-6">
        <div className="sm:col-span-6">{c("adresse", "Adresse", { autoComplete: "street-address", maxLength: 255 })}</div>
        <div className="sm:col-span-2">{c("code_postal", "Code postal", { autoComplete: "postal-code", inputMode: "numeric", maxLength: 12 })}</div>
        <div className="sm:col-span-4">{c("ville", "Ville", { autoComplete: "address-level2", maxLength: 120 })}</div>
        <div className="sm:col-span-3">{c("tel_perso", "Téléphone", { type: "tel", autoComplete: "tel", maxLength: 30 })}</div>
        <div className="sm:col-span-3">{c("email_perso", "E-mail personnel", { type: "email", autoComplete: "email", maxLength: 255 })}</div>
        <div className="sm:col-span-3">{c("urgence_nom", "Personne à prévenir en cas d'urgence", { maxLength: 120 })}</div>
        <div className="sm:col-span-3">{c("urgence_tel", "Son téléphone", { type: "tel", maxLength: 30 })}</div>
      </div>
      <div className="mt-3 space-y-2">
        <label className="flex items-center gap-3 text-[13.5px] text-white/85"><Interrupteur actif={!!f.partage_tel} onClick={() => setF({ ...f, partage_tel: !f.partage_tel })} label="Montrer mon téléphone à l'équipe" /> Montrer mon téléphone à l'équipe</label>
        <label className="flex items-center gap-3 text-[13.5px] text-white/85"><Interrupteur actif={!!f.partage_email} onClick={() => setF({ ...f, partage_email: !f.partage_email })} label="Montrer mon e-mail personnel à l'équipe" /> Montrer mon e-mail personnel à l'équipe</label>
      </div>
      {(f.tel_pro || f.email_pro) && <p className="mt-3 text-[13px] text-white/70">Pro (donné par l'entreprise) : {[f.tel_pro, f.email_pro].filter(Boolean).join(" · ")}</p>}
      <button className={`${bouton} mt-3`} disabled={occupe}>{occupe ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Enregistrer</button>
    </form>
  );
}

function Dossier({ moi }) {
  const navigate = useNavigate();
  const [contrats, setContrats] = useState([]);
  const [secu, setSecu] = useState(null);
  const [saisie, setSaisie] = useState("");
  useEffect(() => {
    entContrats().then((r) => setContrats((r.contrats || []).filter((c) => c.membre_id === moi.membre_id))).catch(() => {});
    if (moi.secu_actif) entSecuLire(moi.membre_id).then(setSecu).catch(() => {});
  }, [moi.membre_id, moi.secu_actif]);
  const exporter = async () => {
    try {
      const data = await entExporter(moi.membre_id);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      a.download = "mes-donnees-equipe.json"; a.click();
    } catch (e) { toast.error(msg(e)); }
  };
  const quitter = async () => {
    if (!window.confirm("Quitter l'équipe supprime ta fiche et toutes tes données d'équipe (coordonnées, présence, absences, temps, pièces, contrat). C'est définitif.")) return;
    try { await entQuitter(); toast.success("Tu as quitté l'équipe."); navigate("/app"); } catch (e) { toast.error(msg(e)); }
  };
  const enregistrer = async () => {
    try { const r = await entSecuEcrire(moi.membre_id, saisie); setSecu({ masque: r.masque, numero: saisie }); setSaisie(""); toast.success("Enregistré, chiffré."); } catch (e) { toast.error(msg(e)); }
  };
  return (
    <div className="space-y-4">
      <MesCoordonnees />
      <CompteRelie />
      <section className={carte} data-testid="ent-contrat">
        <h2 className={titreCarte}>Mon contrat</h2>
        <p className={aide}>Visible de toi et du propriétaire de l'entreprise, pas des managers. Chaque consultation par un autre que toi est journalisée.</p>
        {contrats.map((c) => <div key={c.id} className="mt-3 rounded-xl border border-white/15 px-3.5 py-3 text-[14px]"><b className="text-white">{c.titre}</b>{c.type ? ` · ${c.type}` : ""}{c.debut ? ` · depuis le ${jourCourt(c.debut)}` : ""}{c.detail && <p className="mt-1 whitespace-pre-wrap text-white/75">{c.detail}</p>}</div>)}
        {!contrats.length && <p className="mt-2 text-[14px] text-white/60">Aucun contrat enregistré.</p>}
      </section>
      {moi.secu_actif && (
        <section className={carte} data-testid="ent-secu">
          <h2 className={titreCarte}>N° de sécurité sociale (facultatif)</h2>
          <p className={aide}>Chiffré. Visible de toi et du propriétaire. Tu peux ne rien renseigner.</p>
          {secu?.masque ? <p className="mt-2 text-[14px] text-white">{secu.masque}</p> : null}
          <div className="mt-2 flex gap-2"><input value={saisie} onChange={(e) => setSaisie(e.target.value)} inputMode="numeric" placeholder="15 chiffres" className={champ} autoComplete="off" /><button className={bouton} disabled={saisie.replace(/\D/g, "").length !== 15} onClick={enregistrer}>Enregistrer</button></div>
        </section>
      )}
      <section className={carte}>
        <h2 className={titreCarte}>Mes données</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={bouton2} onClick={exporter}>Télécharger mes données</button>
          {moi.role !== "proprietaire" && <button className={`${bouton2} !border-rose-300/40 !text-rose-200`} onClick={quitter} data-testid="ent-quitter">Quitter l'équipe et tout supprimer</button>}
        </div>
      </section>
    </div>
  );
}

// Réduit le logo dans le navigateur (256 px max, PNG) : jamais un fichier de 5 Mo en base.
function reduireLogo(fichier) {
  return new Promise((ok, ko) => {
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(fichier.type)) { ko(new Error("Choisis une image PNG, JPEG, WebP ou SVG.")); return; }
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, 256 / Math.max(img.width || 256, img.height || 256));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round((img.width || 256) * r)); c.height = Math.max(1, Math.round((img.height || 256) * r));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL("image/png"));
    };
    img.onerror = () => ko(new Error("Image illisible."));
    img.src = URL.createObjectURL(fichier);
  });
}

const GUIDE_DRIVE = {
  microsoft: [
    "Dans SharePoint (ou OneDrive), crée un dossier « RH – nom de l'entreprise ». Le kit Microsoft 365 ci-dessous le prépare pour toi (bibliothèque Documents-RH).",
    "Dans ce dossier, crée un sous-dossier par personne (Prénom Nom).",
    "Partage chaque sous-dossier avec la seule personne concernée, en « Peut modifier ». Tu gardes l'accès à tout.",
    "Copie le lien du sous-dossier (Partager › Copier le lien) et colle-le dans Équipe › Fiche de la personne. Ou mets tous les liens dans l'Excel (onglet DossierSalarie) et importe-le.",
    "Colle ci-dessus le lien du dossier commun : il sert à ceux qui n'ont pas encore de dossier à eux.",
  ],
  google: [
    "Dans Google Drive (de préférence un Drive partagé de l'entreprise), crée un dossier « RH – nom de l'entreprise ».",
    "Dans ce dossier, crée un sous-dossier par personne (Prénom Nom).",
    "Clic droit sur chaque sous-dossier › Partager › ajoute l'adresse de la personne en « Éditeur ». Laisse l'accès général sur « Limité ».",
    "Copie le lien du sous-dossier et colle-le dans Équipe › Fiche de la personne, ou dans l'Excel (onglet DossierSalarie) puis importe-le.",
    "Colle ci-dessus le lien du dossier commun : il sert à ceux qui n'ont pas encore de dossier à eux.",
  ],
};

function Reglages({ moi, membres, noms, recharger }) {
  const [journal, setJournal] = useState([]);
  const [contrat, setContrat] = useState({ membre_id: "", titre: "", type: "", detail: "" });
  const mq = moi.marque || {};
  const [marque, setMarque] = useState({ nom_affiche: mq.nom || "", logo: mq.logo || "", couleur: mq.couleur || "#2f6f5e" });
  const [drive, setDrive] = useState({ drive_fournisseur: mq.drive_fournisseur || "aucun", drive_url: mq.drive_url || "", consignes: mq.consignes || "" });
  const [guide, setGuide] = useState(false);
  const [rapport, setRapport] = useState(null);
  const [importEnCours, setImportEnCours] = useState(false);
  const fichierRef = useRef(null);
  useEffect(() => { entJournal().then((r) => setJournal(r.journal || [])).catch(() => {}); }, []);
  const basculerSecu = async () => { try { await entParametres({ secu_actif: !moi.secu_actif }); recharger(); } catch (e) { toast.error(msg(e)); } };
  const sauver = async (patch, ok) => { try { await entParametres(patch); toast.success(ok); recharger(); } catch (e) { toast.error(msg(e)); } };
  const choisirLogo = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try { setMarque({ ...marque, logo: await reduireLogo(f) }); } catch (er) { toast.error(er.message); }
  };
  const importer = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setImportEnCours(true); setRapport(null);
    try { const r = await entExcelImport(f); setRapport(r); toast.success("Import terminé."); recharger(); } catch (er) { toast.error(msg(er)); }
    setImportEnCours(false);
  };
  const creer = async (e) => {
    e.preventDefault();
    try { await entContratCreer(contrat); toast.success("Contrat enregistré."); setContrat({ ...contrat, titre: "", detail: "" }); } catch (er) { toast.error(msg(er)); }
  };
  const supprimer = async (m) => {
    if (!window.confirm(`Supprimer ${noms[m.id]} et toutes ses données ? C'est définitif.`)) return;
    try { await entSupprimerMembre(m.id); toast.success("Supprimé."); recharger(); } catch (e) { toast.error(msg(e)); }
  };
  const fournisseur = drive.drive_fournisseur;
  return (
    <div className="space-y-4">
      <section className={carte} data-testid="ent-reglages-marque">
        <h2 className={titreCarte}>L'identité de ton entreprise</h2>
        <p className={aide}>Ton nom et ton logo en haut de l'espace de ton équipe. Zayado reste discret (« by Zayado »).</p>
        <div className="mt-3 flex items-center gap-3">
          {marque.logo ? <img src={marque.logo} alt="Aperçu du logo" className="h-14 w-14 rounded-xl bg-white object-contain p-1" /> : <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-white/30 text-[12px] text-white/50">Logo</span>}
          <div className="flex flex-wrap gap-2">
            <label className={`${bouton2} cursor-pointer`}><Upload size={14} /> Choisir un logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={choisirLogo} /></label>
            {marque.logo && <button className={bouton2} onClick={() => setMarque({ ...marque, logo: "" })}>Retirer</button>}
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input value={marque.nom_affiche} onChange={(e) => setMarque({ ...marque, nom_affiche: e.target.value })} placeholder="Nom affiché" className={champ} maxLength={120} />
          <label className="flex items-center gap-2 text-[13px] text-white/75">Couleur<input type="color" value={marque.couleur} onChange={(e) => setMarque({ ...marque, couleur: e.target.value })} className="h-11 w-14 cursor-pointer rounded-lg border border-white/20 bg-transparent" /></label>
        </div>
        <button className={`${bouton} mt-3`} onClick={() => sauver(marque, "Identité enregistrée.")}>Enregistrer</button>
      </section>

      <PartagesEntreprise moi={moi} recharger={recharger} />

      <BaseEntreprise />

      <ReglagesPaie moi={moi} membres={membres} noms={noms} recharger={recharger} />

      <section className={carte} data-testid="ent-reglages-drive">
        <h2 className={titreCarte}>Le Drive de l'entreprise</h2>
        <p className={aide}>Les documents de ton équipe restent dans TON Drive. Zayado garde seulement la liste, les statuts et les liens.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[["microsoft", "Microsoft (OneDrive / SharePoint)"], ["google", "Google Drive"], ["aucun", "Pas encore"]].map(([k, l]) => <Pastille key={k} actif={fournisseur === k} onClick={() => setDrive({ ...drive, drive_fournisseur: k })}>{l}</Pastille>)}
        </div>
        <input value={drive.drive_url} onChange={(e) => setDrive({ ...drive, drive_url: e.target.value })} placeholder="Lien du dossier commun (https://…)" className={`${champ} mt-3`} maxLength={1000} />
        <textarea value={drive.consignes} onChange={(e) => setDrive({ ...drive, consignes: e.target.value })} rows={3} maxLength={3000} placeholder="Consignes pour l'équipe (ex. un PDF par pièce, nommé « RIB – Prénom Nom »)" className={`${champ} mt-2`} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={bouton} onClick={() => sauver(drive, "Drive enregistré.")}>Enregistrer</button>
          {fournisseur !== "aucun" && <button className={bouton2} onClick={() => setGuide(!guide)} aria-expanded={guide}>Comment préparer les dossiers <ChevronDown size={14} className={guide ? "rotate-180" : ""} /></button>}
        </div>
        {guide && fournisseur !== "aucun" && (
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13.5px] leading-relaxed text-white/85">{GUIDE_DRIVE[fournisseur].map((x) => <li key={x}>{x}</li>)}</ol>
        )}
        {fournisseur === "microsoft" && (
          <a href="/kits/Kit-installation-ZayadoRH.zip" download className={`${bouton2} mt-3`} data-testid="ent-kit-microsoft"><Download size={14} /> Kit Microsoft 365 (listes, droits, script)</a>
        )}
      </section>

      <section className={carte} data-testid="ent-reglages-excel">
        <h2 className={`flex items-center gap-2 ${titreCarte}`}><FileSpreadsheet size={16} className="text-gold" /> Base Excel</h2>
        <p className={aide}>Prépare ton équipe dans Excel (personnes, pièces demandées, planning, liens des dossiers), puis importe le fichier. Les fichiers du kit Microsoft Lists sont acceptés tels quels.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={bouton2} onClick={() => entExcelModele().catch((e) => toast.error(msg(e)))}><Download size={14} /> Télécharger le modèle</button>
          <button className={bouton} onClick={() => fichierRef.current?.click()} disabled={importEnCours} data-testid="ent-excel-importer">{importEnCours ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Importer l'Excel</button>
          <input ref={fichierRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={importer} />
          <button className={bouton2} onClick={() => entExcelExport().catch((e) => toast.error(msg(e)))}><Download size={14} /> Exporter la base</button>
        </div>
        {rapport && (
          <div className="mt-3 rounded-xl border border-white/15 bg-white/[0.04] p-3.5 text-[13.5px] text-white/85" data-testid="ent-excel-rapport">
            <p>{rapport.invites} invitation(s) créée(s) · {rapport.mis_a_jour} personne(s) mise(s) à jour · {rapport.types} pièce(s) ajoutée(s) à la liste · {rapport.pieces} pièce(s) demandée(s) · {rapport.planning} entrée(s) de planning</p>
            {rapport.invites > 0 && <p className="mt-1 text-white/65">Envoie les liens d'invitation depuis l'onglet Équipe (bouton « Lien »).</p>}
            {rapport.ignores?.length > 0 && <ul className="mt-2 list-disc pl-5 text-[12.5px] text-amber-200">{rapport.ignores.slice(0, 12).map((x) => <li key={x}>{x}</li>)}</ul>}
          </div>
        )}
      </section>

      <section className={carte}>
        <div className="flex items-center justify-between gap-3">
          <div><h2 className={titreCarte}>N° de sécurité sociale</h2><p className="text-[12.5px] text-white/55">Désactivé par défaut. Activé, chaque personne peut le renseigner (chiffré, journalisé).</p></div>
          <Interrupteur actif={moi.secu_actif} onClick={basculerSecu} label="N° de sécurité sociale" testid="ent-secu-switch" />
        </div>
      </section>
      <form onSubmit={creer} className={carte}>
        <h2 className={titreCarte}>Ajouter un contrat</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select value={contrat.membre_id} onChange={(e) => setContrat({ ...contrat, membre_id: e.target.value })} className={champ} required aria-label="Pour qui"><option value="">Pour qui ?</option>{membres.filter((m) => m.statut === "actif").map((m) => <option key={m.id} value={m.id}>{noms[m.id]}</option>)}</select>
          <input value={contrat.titre} onChange={(e) => setContrat({ ...contrat, titre: e.target.value })} placeholder="Titre (CDI, mission…)" className={champ} required maxLength={160} />
          <textarea value={contrat.detail} onChange={(e) => setContrat({ ...contrat, detail: e.target.value })} rows={3} placeholder="Détails visibles de la personne" className={`${champ} sm:col-span-2`} maxLength={4000} />
        </div>
        <button className={`${bouton} mt-3`}>Enregistrer le contrat</button>
      </form>
      <section className={carte}>
        <h2 className={titreCarte}>Supprimer une personne (RGPD)</h2>
        <ul className="mt-2 divide-y divide-white/10">{membres.filter((m) => m.role !== "proprietaire").map((m) => <li key={m.id} className="flex items-center justify-between gap-2 py-2 text-[14px] text-white"><span className="truncate">{noms[m.id]}</span><button className={`${bouton2} !border-rose-300/40 !text-rose-200`} onClick={() => supprimer(m)}><Trash2 size={14} /> Supprimer</button></li>)}</ul>
      </section>
      <section className={carte}>
        <h2 className={titreCarte}>Journal des accès</h2>
        <ul className="mt-2 max-h-64 divide-y divide-white/10 overflow-y-auto text-[13px]">{journal.map((j) => <li key={j.id} className="py-1.5 text-white/80">{new Date(j.le).toLocaleString("fr-FR")} · {noms[j.acteur_id] || "—"} · {j.action.replace(/_/g, " ")}{j.cible_id ? ` · ${noms[j.cible_id] || "—"}` : ""}</li>)}{!journal.length && <li className="py-1.5 text-white/55">Rien à signaler.</li>}</ul>
      </section>
    </div>
  );
}

// ── Décompte du mois : jours, absences (dont congés payés), temps école, planning, paie estimée, compte rendu à télécharger ──
const LIB_ABS = Object.fromEntries(ABSENCES);
const CONTRATS = { salarie: "Salarié", prestataire: "Prestataire", freelance: "Freelance", stagiaire: "Stagiaire", alternant: "Alternant", dirigeant: "Dirigeant", autre: "Autre" };
const JOURS_SEMAINE = [[0, "Lun"], [1, "Mar"], [2, "Mer"], [3, "Jeu"], [4, "Ven"]];
const moisCourant = () => iso(new Date()).slice(0, 7);
const moisLong = (m) => new Date(`${m}-15T12:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
const decaler = (m, n) => { const d = new Date(`${m}-15T12:00:00`); d.setMonth(d.getMonth() + n); return iso(d).slice(0, 7); };
const euros = (n) => `${Number(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const jrs = (n) => `${String(n).replace(".", ",")} j`;

function Chiffre({ v, l, accent }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"><p className={`text-[20px] font-semibold ${accent || "text-white"}`}>{v}</p><p className="text-[12px] text-white/60">{l}</p></div>;
}

function FicheDecompte({ d, moi, mois, recharger }) {
  const [verse, setVerse] = useState("");
  const p = d.paie;
  const enregistrerVerse = async () => {
    try { await entVersement(d.membre_id, mois, Number(String(verse).replace(",", ".")) || 0); setVerse(""); toast.success("Versement enregistré."); recharger(); } catch (e) { toast.error(msg(e)); }
  };
  const lignes = ABSENCES.map(([k, l]) => [k, l, d.absences?.[k] || 0]);
  return (
    <div className="space-y-3" data-testid="ent-decompte-fiche">
      <div className="grid grid-cols-3 gap-2">
        <Chiffre v={d.jours_ouvres} l="jours ouvrés" />
        <Chiffre v={d.jours_travailles} l="travaillés" accent="text-emerald-200" />
        <Chiffre v={d.planning_nb} l="au planning" />
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-[13.5px]" data-testid="ent-decompte-absences">
          <thead><tr className="bg-white/[0.06] text-left text-[12px] text-white/60"><th className="px-3 py-2 font-medium">Absences du mois</th><th className="px-3 py-2 text-right font-medium">Jours</th></tr></thead>
          <tbody>
            {lignes.map(([k, l, n]) => <tr key={k} className="border-t border-white/10"><td className="px-3 py-2 text-white/85">{l}</td><td className={`px-3 py-2 text-right ${n ? "font-semibold text-white" : "text-white/35"}`}>{n}</td></tr>)}
          </tbody>
        </table>
      </div>
      {d.cp ? (
        <div className="rounded-xl border border-gold/30 bg-gold/[0.06] p-3" data-testid="ent-decompte-cp">
          <p className="text-[13px] font-semibold text-white">Congés payés (CP)</p>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[12px] text-white/60">
            <div><p className="text-[16px] font-semibold text-white">{jrs(d.cp.acquis)}</p>acquis</div>
            <div><p className="text-[16px] font-semibold text-white">{jrs(d.cp.pris)}</p>pris</div>
            <div><p className="text-[16px] font-semibold text-white">{jrs(d.cp.pris_ce_mois)}</p>ce mois</div>
            <div><p className={`text-[16px] font-semibold ${d.cp.solde < 0 ? "text-rose-200" : "text-gold"}`}>{jrs(d.cp.solde)}</p>restants</div>
          </div>
        </div>
      ) : <p className="text-[12.5px] text-white/50">Le compteur de congés payés n'est pas encore réglé{moi.role === "proprietaire" ? " (Réglages › Congés payés et rémunération)." : " par l'entreprise."}</p>}
      {d.heures_saisies > 0 && <p className="text-[13px] text-white/75">Heures saisies : <b className="text-white">{String(d.heures_saisies).replace(".", ",")} h</b></p>}
      {p && (
        <div className="overflow-hidden rounded-xl border border-white/10" data-testid="ent-decompte-paie">
          <table className="w-full text-[13.5px]">
            <tbody>
              <tr><td className="px-3 py-2 text-white/70">Base ({p.unite === "h" ? "heures" : "jours payés"} × {euros(p.taux)})</td><td className="px-3 py-2 text-right text-white">{String(p.quantite).replace(".", ",")} {p.unite}</td></tr>
              <tr className="border-t border-white/10"><td className="px-3 py-2 font-semibold text-white">Total à payer</td><td className="px-3 py-2 text-right font-semibold text-white">{euros(p.total_a_payer)}</td></tr>
              <tr className="border-t border-white/10"><td className="px-3 py-2 text-white/70">Déjà versé</td><td className="px-3 py-2 text-right text-white/85">{euros(p.deja_verse)}</td></tr>
              <tr className="border-t border-white/10 bg-white/[0.04]"><td className="px-3 py-2 font-semibold text-gold">Reste à verser</td><td className="px-3 py-2 text-right font-semibold text-gold">{euros(p.reste_a_verser)}</td></tr>
            </tbody>
          </table>
          {moi.role === "proprietaire" && (
            <div className="flex gap-2 border-t border-white/10 p-2.5">
              <input value={verse} onChange={(e) => setVerse(e.target.value)} inputMode="decimal" placeholder="Montant versé ce mois (€)" className={champ} />
              <button className={bouton2} onClick={enregistrerVerse} disabled={!String(verse).trim()}>Enregistrer</button>
            </div>
          )}
          <p className="border-t border-white/10 px-3 py-2 text-[11.5px] text-white/50">Estimation pour préparer la paie : ne remplace pas le bulletin (cotisations, maladie indemnisée à part).</p>
        </div>
      )}
    </div>
  );
}

function Decompte({ moi, membres, noms }) {
  const gerant = moi.droits.gerer_equipe;
  const [mois, setMois] = useState(moisCourant());
  const [qui, setQui] = useState(gerant ? "" : "moi");  // "" = toute l'équipe (gérant)
  const [data, setData] = useState(null);
  const [ouvert, setOuvert] = useState(null);
  const charger = useCallback(() => { setData(null); entDecompte(mois, qui || null).then(setData).catch((e) => { toast.error(msg(e)); setData({ decomptes: [] }); }); }, [mois, qui]);
  useEffect(() => { charger(); }, [charger]);
  const telecharger = () => entDecompteExport(mois, qui || null, qui === "moi" ? (noms[moi.membre_id] || "").replace(/[^\p{L}\d-]+/gu, "-") : "").catch((e) => toast.error(msg(e)));
  const liste = data?.decomptes || [];
  return (
    <div className="space-y-4">
      <section className={carte}>
        <div className="flex items-center justify-between gap-2">
          <button className={bouton2} onClick={() => setMois(decaler(mois, -1))} aria-label="Mois précédent">←</button>
          <span className="text-[15px] font-semibold capitalize text-white">{moisLong(mois)}</span>
          <button className={bouton2} onClick={() => setMois(decaler(mois, 1))} aria-label="Mois suivant" disabled={mois >= moisCourant()}>→</button>
        </div>
        {gerant && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Pastille actif={qui === ""} onClick={() => setQui("")}>Toute l'équipe</Pastille>
            <Pastille actif={qui === "moi"} onClick={() => setQui("moi")}>Moi</Pastille>
          </div>
        )}
        <button className={`${bouton} mt-3 w-full sm:w-auto`} onClick={telecharger} data-testid="ent-decompte-telecharger"><Download size={16} /> Télécharger le compte rendu du mois</button>
      </section>
      {data === null && <Loader2 className="mx-auto animate-spin text-white/50" />}
      {liste.length === 1 && <section className={carte}><FicheDecompte d={liste[0]} moi={moi} mois={mois} recharger={charger} /></section>}
      {liste.length > 1 && (
        <section className={carte}>
          <h2 className={titreCarte}>L'équipe en {moisLong(mois)}</h2>
          <ul className="mt-1 divide-y divide-white/10">
            {liste.map((d) => (
              <li key={d.membre_id} className="py-2.5">
                <button className="flex w-full items-center gap-2 text-left text-[14px]" onClick={() => setOuvert(ouvert === d.membre_id ? null : d.membre_id)} aria-expanded={ouvert === d.membre_id}>
                  <span className="min-w-0 flex-1 truncate text-white">{d.nom}</span>
                  <span className="shrink-0 text-[12.5px] text-white/60">{d.jours_travailles} j · CP {d.cp ? jrs(d.cp.solde) : "—"}{d.paie ? ` · reste ${euros(d.paie.reste_a_verser)}` : ""}</span>
                  <ChevronDown size={15} className={`shrink-0 text-white/50 ${ouvert === d.membre_id ? "rotate-180" : ""}`} />
                </button>
                {ouvert === d.membre_id && <div className="mt-3"><FicheDecompte d={d} moi={moi} mois={mois} recharger={charger} /></div>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// Réglages (propriétaire) : congés payés de l'entreprise + base de calcul de chaque personne.
function ReglagesPaie({ moi, membres, noms, recharger }) {
  const [cp, setCp] = useState(String(moi.marque?.cp_par_mois ?? 2.08).replace(".", ","));
  const [qui, setQui] = useState("");
  const [r, setR] = useState(null);
  useEffect(() => { if (!qui) { setR(null); return; } entRemuneration(qui).then(setR).catch((e) => toast.error(msg(e))); }, [qui]);
  const num = (v) => Number(String(v).replace(",", ".")) || 0;
  const enregistrer = async () => {
    try {
      await entRemunerationMaj(qui, { ...r, taux: num(r.taux), heures_jour: num(r.heures_jour), cp_initial: num(r.cp_initial), cp_depuis: r.cp_depuis || null });
      toast.success("Enregistré : le décompte de " + (noms[qui] || "la personne") + " est à jour.");
    } catch (e) { toast.error(msg(e)); }
  };
  const basculerJour = (j) => setR({ ...r, ecole_jours: r.ecole_jours.includes(j) ? r.ecole_jours.filter((x) => x !== j) : [...r.ecole_jours, j].sort() });
  return (
    <section className={carte} data-testid="ent-reglages-paie">
      <h2 className={titreCarte}>Congés payés et rémunération</h2>
      <p className={aide}>Sert au décompte du mois de chacun. Visible de la personne et de toi seulement (pas des managers).</p>
      <label className="mt-3 flex items-center gap-3 text-[13.5px] text-white/85">
        Congés payés acquis par mois
        <input value={cp} onChange={(e) => setCp(e.target.value)} inputMode="decimal" className={`${champ} !w-24`} aria-label="Jours de CP acquis par mois" />
        <span className="text-white/55">jours</span>
      </label>
      <p className="mt-1 text-[12px] text-white/50">2,08 jours ouvrés par mois = 25 jours par an (2,5 en jours ouvrables).</p>
      <button className={`${bouton2} mt-2`} onClick={async () => { try { await entParametres({ cp_par_mois: num(cp) }); toast.success("Enregistré."); recharger(); } catch (e) { toast.error(msg(e)); } }}>Enregistrer</button>
      <select value={qui} onChange={(e) => setQui(e.target.value)} className={`${champ} mt-4`} aria-label="Personne" data-testid="ent-paie-personne">
        <option value="">Choisir une personne…</option>
        {membres.filter((m) => m.statut === "actif" && m.role !== "partenaire").map((m) => <option key={m.id} value={m.id}>{noms[m.id]}{CONTRATS[m.type_contrat] ? ` · ${CONTRATS[m.type_contrat]}` : ""}</option>)}
      </select>
      {qui && !r && <Loader2 size={16} className="mt-3 animate-spin text-white/50" />}
      {r && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Mode de rémunération">
            {[["aucun", "Pas de calcul"], ["horaire", "Taux horaire"], ["forfait_jour", "Forfait jour"]].map(([k, l]) => <Pastille key={k} actif={r.mode === k} onClick={() => setR({ ...r, mode: k })}>{l}</Pastille>)}
          </div>
          {r.mode !== "aucun" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[12.5px] text-white/65">{r.mode === "horaire" ? "€ par heure" : "€ par jour"}<input value={r.taux} onChange={(e) => setR({ ...r, taux: e.target.value })} inputMode="decimal" className={`${champ} mt-1`} /></label>
              <label className="text-[12.5px] text-white/65">Heures par jour<input value={r.heures_jour} onChange={(e) => setR({ ...r, heures_jour: e.target.value })} inputMode="decimal" className={`${champ} mt-1`} /></label>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12.5px] text-white/65">Compteur CP à partir du<input type="date" value={r.cp_depuis || ""} onChange={(e) => setR({ ...r, cp_depuis: e.target.value })} className={`${champ} mt-1`} /></label>
            <label className="text-[12.5px] text-white/65">Solde CP à cette date<input value={r.cp_initial} onChange={(e) => setR({ ...r, cp_initial: e.target.value })} inputMode="decimal" className={`${champ} mt-1`} /></label>
          </div>
          <div>
            <p className="text-[13px] text-white/85">Temps école (étudiant, stagiaire, alternant) : jours de cours chaque semaine</p>
            <div className="mt-2 flex flex-wrap gap-2">{JOURS_SEMAINE.map(([j, l]) => <Pastille key={j} actif={r.ecole_jours.includes(j)} onClick={() => basculerJour(j)}>{l}</Pastille>)}</div>
            <label className="mt-2 flex items-center gap-3 text-[13px] text-white/85"><Interrupteur actif={r.ecole_payee} onClick={() => setR({ ...r, ecole_payee: !r.ecole_payee })} label="Temps école payé" /> Temps école payé (alternance : oui ; stage : en général non)</label>
            <p className="mt-1 text-[12px] text-white/50">Pour des périodes d'école ponctuelles, pose une absence « Temps école » dans l'onglet Absences.</p>
          </div>
          <button className={bouton} onClick={enregistrer}>Enregistrer pour {noms[qui]}</button>
        </div>
      )}
    </section>
  );
}

// ── Chronomètre : un bouton, ou une phrase au chat (« je commence la compta » / « j'ai fini ») ──────────────────────
function Chrono() {
  const [c, setC] = useState(null);
  const [projet, setProjet] = useState("");
  const [dos, setDos] = useState({ dossier: "", ticket: "", referent: "", libelle: "" });
  const [maintenant, setMaintenant] = useState(Date.now());
  const charger = useCallback(() => entChrono().then(setC).catch(() => setC({ en_cours: false })), []);
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { if (!c?.en_cours) return undefined; const t = setInterval(() => setMaintenant(Date.now()), 1000); return () => clearInterval(t); }, [c]);
  const ecoule = c?.en_cours ? Math.max(0, Math.floor((maintenant - Date.parse(c.debut)) / 1000)) : 0;
  const hms = `${String(Math.floor(ecoule / 3600)).padStart(2, "0")}:${String(Math.floor((ecoule % 3600) / 60)).padStart(2, "0")}:${String(ecoule % 60).padStart(2, "0")}`;
  const demarrer = async () => { try { await entChronoDemarrer(projet.trim(), dos); setProjet(""); setDos({ dossier: "", ticket: "", referent: "", libelle: "" }); charger(); } catch (e) { toast.error(msg(e)); } };
  const arreter = async () => {
    try { const r = await entChronoArreter(); toast.success(`${String(r.heures).replace(".", ",")} h enregistrée(s)${r.projet ? ` sur « ${r.projet} »` : ""}.`); charger(); window.dispatchEvent(new Event("zayado:temps-maj")); }
    catch (e) { toast.error(msg(e)); }
  };
  if (!c) return <Loader2 className="animate-spin text-white/50" />;
  if (c.mode === "aucun" && !c.en_cours) {
    return <section className={carte} data-testid="ent-chrono-off"><p className={titreCarte}>Chronomètre</p><p className={aide}>Il n'est pas activé pour toi. C'est ton entreprise qui l'active (Équipe › Fiche › Suivi du temps).</p></section>;
  }
  const parDossier = c.mode === "dossier";
  return (
    <section className={`${carte} ${c.en_cours ? "border-gold/50" : ""}`} data-testid="ent-chrono">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/55">{c.en_cours ? "En cours" : "Chronomètre"}</p>
          <p className={`font-mono text-[34px] font-semibold tabular-nums ${c.en_cours ? "text-gold" : "text-white/80"}`} aria-live="polite">{hms}</p>
          {c.en_cours && c.dossier && <p className="text-[13.5px] font-semibold text-white">Dossier {c.dossier}{c.ticket ? ` · ticket ${c.ticket}` : ""}{c.libelle ? ` · ${c.libelle}` : ""}</p>}
          {c.en_cours && c.projet && <p className="text-[13.5px] text-white/80">{c.dossier ? c.projet : `sur « ${c.projet} »`}</p>}
        </div>
        {c.en_cours ? (
          <button className={`${bouton} !bg-none !bg-rose-300`} onClick={arreter} data-testid="ent-chrono-stop"><Square size={16} /> J'ai fini</button>
        ) : (
          parDossier ? (
            <div className="grid w-full gap-2 sm:grid-cols-2">
              <input value={dos.dossier} onChange={(e) => setDos({ ...dos, dossier: e.target.value })} placeholder="N° de dossier *" maxLength={60} className={champ} data-testid="ent-chrono-dossier" />
              <input value={dos.ticket} onChange={(e) => setDos({ ...dos, ticket: e.target.value })} placeholder="Ticket (facultatif)" maxLength={60} className={champ} />
              <input value={dos.libelle} onChange={(e) => setDos({ ...dos, libelle: e.target.value })} placeholder="Libellé (ligne de facture)" maxLength={120} className={champ} data-testid="ent-chrono-libelle" />
              <input value={projet} onChange={(e) => setProjet(e.target.value)} placeholder="Description (détail)" maxLength={120} className={`${champ} sm:col-span-2`} />
              <input value={dos.referent} onChange={(e) => setDos({ ...dos, referent: e.target.value })} placeholder="Référent (facultatif)" maxLength={120} className={champ} />
              <button className={`${bouton} sm:col-span-2`} onClick={demarrer} disabled={!dos.dossier.trim()} data-testid="ent-chrono-go"><Play size={16} /> Démarrer sur ce dossier</button>
            </div>
          ) : (
          <div className="flex w-full gap-2 sm:w-auto">
            <input value={projet} onChange={(e) => setProjet(e.target.value)} placeholder="Sur quoi ? (facultatif)" maxLength={120} className={`${champ} sm:w-56`} />
            <button className={bouton} onClick={demarrer} data-testid="ent-chrono-go"><Play size={16} /> Démarrer</button>
          </div>
          )
        )}
      </div>
      <p className="mt-3 rounded-xl bg-white/[0.05] px-3.5 py-2.5 text-[12.5px] text-white/65">
        Plus simple : écris à l'assistant (bulle en haut), sur WhatsApp ou Telegram : « <b className="text-white/85">{parDossier ? "je commence le dossier 2024-15 ticket 88 relecture" : "je commence l'inventaire"}</b> », puis « <b className="text-white/85">j'ai fini</b> ». Le temps s'enregistre tout seul{parDossier ? " dans le décompte du dossier." : " et compte dans ton décompte du mois."}
      </p>
    </section>
  );
}

// ── Assistant de l'entreprise : le chatbot de l'entreprise, relié à ses connaissances et à TES données d'équipe ─────
function Assistant({ moi }) {
  const [fil, setFil] = useState([]);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const bas = useRef(null);
  useEffect(() => { bas.current?.scrollIntoView({ block: "end" }); }, [fil, envoi]);
  const envoyer = async (t) => {
    const m = (t ?? texte).trim();
    if (!m || envoi) return;
    const historique = fil.map((x) => ({ role: x.de === "moi" ? "user" : "assistant", texte: x.texte }));
    setFil((f) => [...f, { de: "moi", texte: m }]); setTexte(""); setEnvoi(true);
    try { const r = await entAssistant(m, historique); setFil((f) => [...f, { de: "ia", texte: r.reponse, chrono: r.action === "chrono" }]); }
    catch (e) { setFil((f) => [...f, { de: "ia", texte: msg(e), erreur: true }]); }
    setEnvoi(false);
  };
  const nom = moi.marque?.nom || "l'entreprise";
  const idees = ["Je commence ma journée", "Quelles pièces me manquent ?", "Qu'est-ce que j'ai au planning ?", "Combien de congés il me reste ?"];
  return (
    <section className={`${carte} flex h-[min(72vh,640px)] flex-col !p-0`} data-testid="ent-assistant">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
        <Bot size={18} className="text-gold" />
        <div className="min-w-0"><p className="truncate text-[14.5px] font-semibold text-white">Assistant de {nom}</p><p className="text-[11.5px] text-white/50">Répond avec les infos de l'entreprise et les tiennes · pilote ton chronomètre</p></div>
      </div>
      <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {!fil.length && (
          <div className="py-4 text-center">
            <p className="text-[13.5px] text-white/70">Pose une question sur ton travail dans l'entreprise, ou lance ton chronomètre.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">{idees.map((x) => <button key={x} onClick={() => envoyer(x)} className="rounded-full border border-white/20 px-3 py-1.5 text-[12.5px] text-white/80 hover:border-white/40">{x}</button>)}</div>
          </div>
        )}
        {fil.map((x, i) => (
          <div key={i} className={`flex ${x.de === "moi" ? "justify-end" : "justify-start"}`}>
            <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[14px] ${x.de === "moi" ? "bg-gold text-navy-900" : x.erreur ? "bg-rose-400/15 text-rose-100" : x.chrono ? "border border-gold/40 bg-gold/10 text-white" : "bg-white/[0.08] text-white"}`}>{x.texte}</p>
          </div>
        ))}
        {envoi && <Loader2 size={16} className="animate-spin text-white/50" />}
        <div ref={bas} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); envoyer(); }} className="flex gap-2 border-t border-white/10 p-3">
        <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Écris à l'assistant…" maxLength={2000} className={champ} data-testid="ent-assistant-champ" />
        <button className={bouton} disabled={envoi || !texte.trim()} aria-label="Envoyer"><Send size={16} /></button>
      </form>
    </section>
  );
}

// ── Reprise & cession : le dossier que Zayado suit pour l'entreprise cliente (mandat signé), en lecture ─────────────
// Une section qu'on a atteinte par l'URL sans y avoir droit : on explique, on ne
// laisse pas un formulaire vide ni un écran blanc.
function SectionReservee({ titre, texte, aller }) {
  return (
    <section className="ok p-5 sm:p-6" data-testid="ent-section-reservee">
      <p className="ok-lab">Pas pour toi</p>
      <h2 className="mt-1.5 font-display text-[20px] font-semibold text-white">{titre}</h2>
      <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-white/60">{texte}</p>
      <button onClick={() => aller("aujourdhui")} className={`${bouton2} mt-4`}>Retour à ma journée</button>
    </section>
  );
}

// L'outil du conseiller Zayado : les dossiers de reprise de SES clients sous
// mandat. Il vivait sur une page personnelle séparée, hors de l'espace
// entreprise — alors que c'est exactement là qu'on gère des dossiers de société.
function RepriseConseiller() {
  const [liste, setListe] = useState(null);
  const [nv, setNv] = useState({ sens: "achat", nom: "" });
  const [occupe, setOccupe] = useState(false);
  const charger = useCallback(() => cessionDossiers().then((r) => setListe(r.dossiers || [])).catch(() => setListe([])), []);
  useEffect(() => { charger(); }, [charger]);
  const eur = (n) => (n == null ? "—" : `${Math.round(Number(n)).toLocaleString("fr-FR")} €`);
  const creer = async (e) => {
    e.preventDefault();
    if (!nv.nom.trim() || occupe) return;
    setOccupe(true);
    try { const dd = await cessionCreer({ ...nv, nom: nv.nom.trim() }); window.location.assign(`/app/reprise?dossier=${dd.id}`); }
    catch (er) { toast.error(msg(er)); setOccupe(false); }
  };
  const achats = (liste || []).filter((x) => x.sens === "achat");
  const cessions = (liste || []).filter((x) => x.sens !== "achat");
  return (
    <div className="space-y-5" data-testid="ent-reprise-conseiller">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-gold">Acquisition &amp; transmission</p>
        <h2 className="mt-2 font-display text-[26px] font-semibold leading-tight sm:text-[32px]">Les dossiers de tes clients.</h2>
        <p className="mt-2 text-[14px] text-white/60">Les entreprises que tu accompagnes sous mandat, côté acheteur comme côté cédant.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <OkTuile Icone={Handshake} label="Dossiers suivis" valeur={liste ? liste.length : "—"}
          sous={liste && liste.length ? "clients sous mandat" : "aucun dossier pour l'instant"} />
        <OkTuile Icone={TrendingUp} label="Côté acheteur" valeur={achats.length} sous="repreneurs accompagnés" />
        <OkTuile Icone={Handshake} label="Côté cédant" valeur={cessions.length} sous="cessions accompagnées" />
      </div>

      <form onSubmit={creer} className="ok p-5" data-testid="ent-reprise-nouveau">
        <p className="ok-lab">Ouvrir un dossier client</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pastille actif={nv.sens === "achat"} onClick={() => setNv({ ...nv, sens: "achat" })}>Mon client reprend</Pastille>
          <Pastille actif={nv.sens === "cession"} onClick={() => setNv({ ...nv, sens: "cession" })}>Mon client cède</Pastille>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={nv.nom} onChange={(e) => setNv({ ...nv, nom: e.target.value })}
            placeholder="Nom de l'entreprise cible" className={`${champ} min-w-[220px] flex-1`} maxLength={160} />
          <button className={bouton} disabled={occupe || !nv.nom.trim()}>{occupe ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Créer</button>
        </div>
      </form>

      {liste === null ? <Loader2 className="mx-auto animate-spin text-white/50" /> : liste.length === 0 ? (
        <section className="ok p-5"><p className="text-[13.5px] text-white/60">Aucun dossier ouvert. Crée le premier ci-dessus : chiffres, valorisation, financement, étapes et documents suivront.</p></section>
      ) : (
        <section className="ok p-5">
          <p className="ok-lab mb-1">Les dossiers de tes clients</p>
          {liste.map((dd) => (
            <a key={dd.id} href={`/app/reprise?dossier=${dd.id}`} className="ok-prow block hover:border-white/30" data-testid={`ent-reprise-dossier-${dd.id}`}>
              <div className="flex items-center gap-3">
                <span className="ok-ti min-w-0 flex-1 truncate">{dd.nom}</span>
                <span className="ok-chip shrink-0" style={{ background: "rgba(222,194,163,.16)", color: "#DEC2A3" }}>{dd.sens === "achat" ? "Reprise" : "Cession"}</span>
                <span className="ok-me hidden sm:inline">{dd.prix_final || dd.prix_affiche ? eur(dd.prix_final || dd.prix_affiche) : "prix à poser"}</span>
                <span className="w-11 shrink-0 text-right font-display text-[17px] tabular-nums" style={{ color: dd.avancement >= 70 ? "#5DCAA5" : "#DEC2A3" }}>{dd.avancement}%</span>
              </div>
              <OkBarre className="mt-3" valeur={dd.avancement} couleur={dd.avancement >= 70 ? "#5DCAA5" : "#DEC2A3"} />
            </a>
          ))}
        </section>
      )}
    </div>
  );
}

/* Le parcours en étapes, horizontal — repris exactement de la maquette validée
   « Où en est votre reprise » : pastille cochée pour les étapes faites, pastille
   champagne cerclée pour l'étape en cours, pastille grise numérotée pour la
   suite, reliées par un trait. Scroll horizontal sur mobile plutôt que de casser
   la ligne. */
function StepperReprise({ etapes, faites }) {
  const encours = etapes.findIndex((_, n) => !faites.includes(n));
  return (
    <div className="ok" data-testid="reprise-stepper">
      <div className="ok-pad overflow-x-auto">
        <div className="flex min-w-[560px] items-start">
          {etapes.map((t, n) => {
            const fait = faites.includes(n);
            const ici = n === encours;
            return (
              <React.Fragment key={t}>
                <div className="shrink-0 text-center" style={{ width: 104 }}>
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-full text-[14px] font-bold"
                    style={fait
                      ? { background: "#DEC2A3", color: "#0A1128" }
                      : ici
                        ? { background: "#DEC2A3", color: "#0A1128", boxShadow: "0 0 0 7px rgba(222,194,163,.2)" }
                        : { background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.38)", border: "1px solid rgba(255,255,255,.12)" }}>
                    {fait ? <Check size={15} /> : n + 1}
                  </div>
                  <div className={`mt-2.5 text-[12px] ${fait || ici ? "text-white" : "text-white/40"}`}>{t}</div>
                </div>
                {n < etapes.length - 1 && <div className="mt-5 h-0.5 flex-1" style={{ background: "rgba(255,255,255,.13)", margin: "0 -4px" }} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Vue CLIENT accompagné : « Où en est ta reprise » — exactement la maquette
// validée (parcours en étapes + deux colonnes : les étapes à gauche, les
// chiffres de la cible à droite). Avant : une pile de cartes pleine largeur.
function ReprisePartenaire({ dossiers }) {
  const eur = (n) => (n == null ? "—" : `${Math.round(Number(n)).toLocaleString("fr-FR")} €`);
  if (!dossiers.length) {
    return <section className="ok p-5" data-testid="ent-reprise"><p className="text-[13.5px] text-white/60">Aucun dossier d'accompagnement en cours. Dès qu'un mandat est signé avec Zayado, ton parcours s'affiche ici.</p></section>;
  }
  return (
    <div className="space-y-8" data-testid="ent-reprise">
      {dossiers.map((d) => {
        const i = d.indicateurs || {};
        const etapes = d.etapes || [];
        const faites = d.etapes_faites || [];
        const encours = etapes.findIndex((_, n) => !faites.includes(n));
        const nomEtape = encours >= 0 ? etapes[encours] : (etapes.length ? "Terminé" : null);
        const chiffres = [
          i.prix_retenu != null && { v: eur(i.prix_retenu), l: "Prix retenu" },
          i.valorisation && { v: `${eur(i.valorisation.basse)} – ${eur(i.valorisation.haute)}`, l: "Valorisation indicative" },
          i.financement && { v: eur(i.financement.mensualite), l: "Mensualité estimée" },
        ].filter(Boolean);
        return (
          <div key={d.id}>
            <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-gold">
              {d.sens === "achat" ? "Reprise d'entreprise" : "Cession d'entreprise"} · accompagnée par Zayado
            </p>
            <h2 className="mt-2 font-display text-[26px] font-semibold leading-tight sm:text-[32px]">
              {d.sens === "achat" ? "Où en est ta reprise." : "Où en est ta cession."}
            </h2>
            <p className="mt-2 text-[14px] text-white/60">{etapes.length} étapes, dans l'ordre. Tu vois d'un coup d'œil celle qui t'attend.</p>

            {etapes.length > 0 && <div className="mt-6"><StepperReprise etapes={etapes} faites={faites} /></div>}

            <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.45fr_1fr]">
              {/* Gauche : les étapes, avec leur état */}
              <section className="ok p-6 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-[20px] font-semibold text-white">{d.nom}</h3>
                  {nomEtape && <span className="shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold" style={{ background: "rgba(222,194,163,.16)", color: "#DEC2A3" }}>{encours >= 0 ? `Étape ${encours + 1} · ${nomEtape}` : nomEtape}</span>}
                </div>
                <div className="mt-5">
                  {etapes.map((t, n) => {
                    const fait = faites.includes(n);
                    const ici = n === encours;
                    return (
                      <div key={t} className="flex items-center gap-3.5 border-b border-white/[0.07] py-3.5 last:border-0">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[12px]"
                          style={fait ? { background: "rgba(93,202,165,.18)", color: "#5DCAA5" } : { background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.38)" }}>
                          {fait ? <Check size={12} /> : "·"}
                        </span>
                        <span className={`flex-1 text-[14.5px] ${fait ? "text-white/60" : ici ? "text-white" : "text-white/80"}`}>{t}</span>
                        <span className="text-[12.5px] text-white/38">{fait ? "fait" : ici ? "en cours" : "à venir"}</span>
                      </div>
                    );
                  })}
                </div>
                {d.documents?.length > 0 && (
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="ok-lab mb-2">Documents partagés</p>
                    <ul className="space-y-1.5">{d.documents.map((x) => <li key={x.id}><a href={x.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13.5px] text-gold hover:underline"><FileText size={13} /> {x.titre}</a></li>)}</ul>
                  </div>
                )}
                {d.analyse_ia && <div className="mt-4 rounded-xl bg-white/[0.04] p-3"><TexteIA texte={d.analyse_ia} /></div>}
              </section>

              {/* Droite : les chiffres de la cible, en gros, comme la maquette */}
              <section className="ok p-6 sm:p-7">
                <p className="ok-lab">Les chiffres de la cible</p>
                {chiffres.length > 0 ? (
                  <div className="mt-4 space-y-5">
                    {chiffres.map((c) => (
                      <div key={c.l}>
                        <div className="font-display text-[28px] font-semibold leading-none">{c.v}</div>
                        <div className="mt-1.5 text-[12.5px] text-white/60">{c.l}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-[13.5px] leading-relaxed text-white/55">Les chiffres (CA, résultat, valorisation) s'afficheront ici dès l'étape « Chiffres ».</p>
                )}
                <div className="mt-6 border-t border-white/10 pt-4">
                  <p className="ok-lab mb-1">Avancement</p>
                  <div className="flex items-center gap-3">
                    <OkBarre className="flex-1" valeur={d.avancement} couleur={d.avancement >= 70 ? "#5DCAA5" : "#DEC2A3"} />
                    <span className="font-display text-[17px] tabular-nums" style={{ color: d.avancement >= 70 ? "#5DCAA5" : "#DEC2A3" }}>{d.avancement}%</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Le dirigeant décide, personne par personne : pas de chronomètre, temps de travail (salarié), ou temps par dossier (partenaire)
function SuiviTempsMembre({ membre }) {
  const [mode, setMode] = useState(null);
  useEffect(() => { entSuiviTemps().then((r) => setMode(r.equipe?.[membre.id] || "aucun")).catch(() => setMode("aucun")); }, [membre.id]);
  if (mode === null) return null;
  const changer = async (m) => { try { setMode((await entSuiviTempsMaj(membre.id, m)).mode); toast.success("Suivi du temps enregistré."); } catch (e) { toast.error(msg(e)); } };
  return (
    <div data-testid="ent-suivi-temps">
      <p className="text-[13px] font-semibold text-white">Suivi du temps</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {[["aucun", "Pas de chronomètre"], ["travail", "Temps de travail"], ["dossier", "Par dossier (partenaire)"]].map(([k, l]) => <Pastille key={k} actif={mode === k} onClick={() => changer(k)}>{l}</Pastille>)}
      </div>
      <p className="mt-1 text-[12px] text-white/50">Par dossier : n° de dossier, ticket, libellé, description et référent à chaque démarrage ; décompte exportable pour facturer.</p>
    </div>
  );
}

// Décompte du temps PAR DOSSIER (ce n'est pas une facture) : export CSV / Excel ou envoi par e-mail
function DecompteDossiers() {
  const auj = new Date();
  const [debut, setDebut] = useState(iso(new Date(auj.getFullYear(), auj.getMonth(), 1)));
  const [fin, setFin] = useState(iso(auj));
  const [d, setD] = useState(null);
  const [email, setEmail] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const charger = useCallback(() => entDecompteDossiers(debut, fin).then(setD).catch(() => setD({ dossiers: [], total: 0 })), [debut, fin]);
  useEffect(() => { charger(); const f = () => charger(); window.addEventListener("zayado:temps-maj", f); return () => window.removeEventListener("zayado:temps-maj", f); }, [charger]);
  const h = (n) => `${String(n).replace(".", ",")} h`;
  const envoyer = async () => { try { await entDecompteDossiersEnvoyer(debut, fin, email.trim()); toast.success(`Décompte envoyé à ${email.trim()}.`); setOuvert(false); } catch (e) { toast.error(msg(e)); } };
  return (
    <section className={carte} data-testid="ent-decompte-dossiers">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className={titreCarte}>Décompte du temps</h2>
        <div className="flex gap-2">
          <input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} className={`${champ} !w-auto !py-2 text-[13px]`} aria-label="Du" />
          <input type="date" value={fin} min={debut} onChange={(e) => setFin(e.target.value)} className={`${champ} !w-auto !py-2 text-[13px]`} aria-label="Au" />
        </div>
      </div>
      {!d ? <Loader2 size={16} className="mt-3 animate-spin text-white/50" /> : (
        <>
          <ul className="mt-3 divide-y divide-white/10">
            {d.dossiers.map((x) => (
              <li key={x.dossier} className="py-2.5">
                <div className="flex items-center justify-between gap-2 text-[14px]"><b className="text-white">{x.dossier === "(sans dossier)" ? "Sans dossier" : `Dossier ${x.dossier}`}</b><span className="font-semibold text-gold">{h(x.heures)}</span></div>
                <ul className="mt-1 space-y-0.5">{x.lignes.map((l, i) => <li key={i} className="text-[12.5px] text-white/65">{jourCourt(l.date)}{l.ticket ? ` · ticket ${l.ticket}` : ""}{l.libelle ? ` · ${l.libelle}` : ""}{l.description && l.description !== l.libelle ? ` (${l.description})` : ""}{l.referent ? ` · réf. ${l.referent}` : ""} · {h(l.heures)}</li>)}</ul>
              </li>
            ))}
            {!d.dossiers.length && <li className="py-2 text-[13.5px] text-white/55">Rien sur cette période.</li>}
          </ul>
          {d.dossiers.length > 0 && (
            <>
              <p className="mt-2 text-right text-[13.5px] text-white">Total : <b>{h(d.total)}</b></p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={bouton2} onClick={() => entDecompteDossiersExport(debut, fin, "csv").catch((e) => toast.error(msg(e)))} data-testid="ent-decompte-csv"><Download size={14} /> CSV</button>
                <button className={bouton2} onClick={() => entDecompteDossiersExport(debut, fin, "xlsx").catch((e) => toast.error(msg(e)))}><FileSpreadsheet size={14} /> Excel</button>
                <button className={bouton2} onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert}><Mail size={14} /> Envoyer par e-mail</button>
              </div>
              {ouvert && (
                <div className="mt-2 flex gap-2">
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="compta@… ou ton e-mail" className={champ} />
                  <button className={bouton2} disabled={!email.includes("@")} onClick={envoyer}><Send size={14} /> Envoyer</button>
                </div>
              )}
              <p className="mt-2 text-[11.5px] text-white/45">Un décompte, pas une facture : récupère-le dans ton outil de facturation.</p>
            </>
          )}
        </>
      )}
    </section>
  );
}

// Installer la base de l'entreprise chez le client : SharePoint (Microsoft 365) ou Google Drive + Sheets.
// Mêmes listes, mêmes colonnes des deux côtés ; l'import Excel de Zayado lit les deux.
const KITS = {
  microsoft: {
    titre: "Microsoft 365 (SharePoint + Lists)",
    etapes: [
      "Crée un site SharePoint (ex. « RH – ton entreprise »).",
      "Lance Install-ZayadoRH.ps1 (PowerShell, module PnP) : il crée les groupes Employeurs / Salariés, les 14 listes, la bibliothèque Documents-RH et les droits. Relançable sans risque.",
      "Ou, sans script : dans Microsoft Lists, « Nouvelle liste › À partir d'Excel » avec chaque fichier de Listes-import.",
      "Suis les onglets « Permissions » puis « Checklist » du guide Excel.",
    ],
    fichiers: [["Kit complet (zip)", "/kits/Kit-installation-ZayadoRH.zip"], ["Script PowerShell", "/kits/microsoft/Install-ZayadoRH.ps1"],
      ["Guide d'installation (Excel)", "/kits/microsoft/Installation-ZayadoRH.xlsx"], ["Listes à importer (zip)", "/kits/microsoft/Listes-import.zip"]],
  },
  google: {
    titre: "Google Workspace (Drive + Sheets)",
    etapes: [
      "Importe le classeur dans Google Drive et ouvre-le avec Google Sheets.",
      "Extensions › Apps Script › colle le script › Exécuter « installer » : dossier Zayado RH, Documents-RH, un dossier partagé par personne, données privées à part, onglets de référence protégés.",
      "Remplis les onglets, puis menu « Zayado RH › Installer / mettre à jour » à chaque nouvelle personne.",
    ],
    fichiers: [["Kit complet (zip)", "/kits/Kit-installation-ZayadoRH-Google.zip"], ["Classeur (14 onglets)", "/kits/google/Installation-ZayadoRH-Google.xlsx"],
      ["Script Apps Script", "/kits/google/Installer-ZayadoRH-Google.gs"]],
  },
};

function InstallationBase() {
  const [k, setK] = useState("google");
  const [etat, setEtat] = useState(null);
  const [occupe, setOccupe] = useState(false);
  const [bilan, setBilan] = useState(null);
  const [avance, setAvance] = useState(false);
  useEffect(() => { entInstallation().then((e) => { setEtat(e); if (e.fournisseur) setK(e.fournisseur); }).catch(() => setEtat({ installe: false })); }, []);
  const kit = KITS[k];
  const nomDrive = k === "google" ? "Google Drive" : "OneDrive";
  const installer = async () => {
    setOccupe(true); setBilan(null);
    try { const r = await entInstaller(k); setBilan(r); setEtat(await entInstallation()); toast.success("Base installée dans ton " + nomDrive + "."); }
    catch (e) { toast.error(msg(e)); }
    setOccupe(false);
  };
  return (
    <section className={carte} data-testid="ent-installation">
      <h2 className={titreCarte}>Installer la base de ton entreprise</h2>
      <p className={aide}>En un clic, dans TON {k === "google" ? "Google Drive" : "OneDrive"} : classeurs de l'équipe, dossier Documents-RH avec un dossier partagé par personne (branché sur son bouton « Mon Drive pro »). Tes données restent chez toi.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Pastille actif={k === "google"} onClick={() => setK("google")}>Google</Pastille>
        <Pastille actif={k === "microsoft"} onClick={() => setK("microsoft")}>Microsoft 365</Pastille>
      </div>
      {etat?.installe && etat.fournisseur === k && (
        <div className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-[13.5px] text-white/85" data-testid="ent-installation-ok">
          <p className="font-semibold text-white">Installée ({etat.personnes} dossier(s) de personne)</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {etat.racine && <a href={etat.racine} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-gold hover:underline"><FolderOpen size={14} /> Dossier Zayado RH</a>}
            {etat.reference && <a href={etat.reference} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-gold hover:underline"><FileSpreadsheet size={14} /> Classeur de l'équipe</a>}
            {etat.prive && <a href={etat.prive} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-gold hover:underline"><FileSpreadsheet size={14} /> Données privées</a>}
          </div>
        </div>
      )}
      <button className={`${bouton} mt-3`} onClick={installer} disabled={occupe} data-testid="ent-installer">
        {occupe ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} {etat?.installe && etat.fournisseur === k ? "Mettre à jour (nouvelles personnes)" : `Installer dans mon ${nomDrive}`}
      </button>
      <p className="mt-2 text-[12px] text-white/50">Il faut avoir relié ton {nomDrive} (Paramètres › Connexions). Relançable : ce qui existe déjà est gardé.</p>
      {bilan?.erreurs?.length > 0 && <ul className="mt-2 list-disc pl-5 text-[12.5px] text-amber-200">{bilan.erreurs.map((x) => <li key={x}>{x}</li>)}</ul>}
      <button className="mt-4 text-[12.5px] text-white/60 underline-offset-2 hover:text-white hover:underline" onClick={() => setAvance(!avance)} aria-expanded={avance}>
        Méthode avancée {k === "microsoft" ? "(listes SharePoint, droits par personne)" : "(script Google)"}
      </button>
      {avance && (
        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-white/80">{kit.etapes.map((x) => <li key={x}>{x}</li>)}</ol>
          <div className="mt-3 flex flex-wrap gap-2">{kit.fichiers.map(([l, url], i) => <a key={url} href={url} download className={bouton2} data-testid={`ent-kit-${k}-${i}`}><Download size={14} /> {l}</a>)}</div>
        </div>
      )}
    </section>
  );
}

// Ce que le dirigeant partage avec son équipe. Le reste de son espace perso (Vision perso, Bien-être, Ma Foi…) reste privé.
function PartagesEntreprise({ moi, recharger }) {
  const actif = Boolean(moi.marque?.partage_radar);
  const basculer = async () => { try { await entParametres({ partage_radar: !actif }); oublierEspaceEntreprise(); toast.success(!actif ? "Ton Radar est visible de l'équipe." : "Ton Radar n'est plus partagé."); recharger(); } catch (e) { toast.error(msg(e)); } };
  return (
    <section className={carte} data-testid="ent-partages">
      <h2 className={titreCarte}>Ce que tu partages avec l'équipe</h2>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div><p className="text-[14px] text-white">Radar de l'entreprise</p><p className="text-[12.5px] text-white/55">Tes prospects, en lecture, pour toute l'équipe (pas les partenaires).</p></div>
        <Interrupteur actif={actif} onClick={basculer} label="Partager mon Radar" testid="ent-partage-radar" />
      </div>
      <p className="mt-3 text-[12.5px] text-white/55">Vision Board : partage board par board, avec les personnes choisies, avec le bouton « Partager » du Vision Board.</p>
    </section>
  );
}

function RadarEntreprise() {
  const [d, setD] = useState(null);
  useEffect(() => { entRadar().then(setD).catch(() => setD({ partage: false, prospects: [] })); }, []);
  if (!d) return <Loader2 className="animate-spin text-white/50" />;
  if (!d.partage) return <p className="text-[14px] text-white/60">Le Radar n'est pas partagé avec l'équipe.</p>;
  return (
    <section className={carte} data-testid="ent-radar">
      <p className={aide}>Les prospects de l'entreprise, en lecture seule.</p>
      <ul className="mt-2 divide-y divide-white/10">
        {d.prospects.map((p) => (
          <li key={p.id} className="py-2.5 text-[14px]">
            <p className="text-white"><b className="font-semibold">{p.entreprise || "—"}</b>{p.ville ? <span className="text-white/55"> · {p.ville}</span> : null}</p>
            <p className="text-[12.5px] text-white/65">{[p.prenom, p.nom].filter(Boolean).join(" ")}{p.titre ? ` · ${p.titre}` : ""}</p>
            <div className="mt-1 flex flex-wrap gap-3 text-[12.5px]">
              {p.email && <a href={`mailto:${p.email}`} className="text-gold hover:underline">{p.email}</a>}
              {p.domaine && <a href={`https://${p.domaine}`} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">{p.domaine}</a>}
            </div>
          </li>
        ))}
        {!d.prospects.length && <li className="py-2 text-[13.5px] text-white/55">Aucun prospect pour l'instant.</li>}
      </ul>
    </section>
  );
}

function VisionPartagee() {
  const [boards, setBoards] = useState(null);
  useEffect(() => { fetchBoardsPartages().then((r) => setBoards(r.boards || [])).catch(() => setBoards([])); }, []);
  if (!boards) return <Loader2 className="animate-spin text-white/50" />;
  return (
    <section className={carte} data-testid="ent-vision">
      <p className={aide}>Les Vision Boards que des membres de l'équipe ont choisi de partager avec toi.</p>
      <ul className="mt-2 divide-y divide-white/10">
        {boards.map((b) => (
          <li key={`${b.owner || ""}-${b.key}`}>
            <Link to={`/app/vision?view=canvas&board=${encodeURIComponent(b.key)}&partage=1${b.owner ? `&owner=${encodeURIComponent(b.owner)}` : ""}`} className="flex items-center gap-2 py-3 text-[14px] text-white hover:text-gold">
              <span aria-hidden>{b.emoji || "🧭"}</span><span className="min-w-0 flex-1 truncate">{b.nom}</span><span className="shrink-0 text-[12px] text-white/55">par {b.proprietaire || "un membre"}</span>
            </Link>
          </li>
        ))}
        {!boards.length && <li className="py-2 text-[13.5px] text-white/55">Aucun board partagé avec toi.</li>}
      </ul>
    </section>
  );
}

// Un compte perso ET un compte pro (invité par le dirigeant) : on peut les relier, et choisir où arrivent les notifications
function CompteRelie() {
  const [l, setL] = useState(null);
  const [email, setEmail] = useState("");
  const [occupe, setOccupe] = useState(false);
  useEffect(() => { entLiaison().then(setL).catch(() => setL(false)); }, []);
  if (l === null || l === false) return null;
  const faire = async (f, ok) => { setOccupe(true); try { setL(await f()); if (ok) toast.success(ok); } catch (e) { toast.error(msg(e)); } setOccupe(false); };
  return (
    <section className={carte} data-testid="ent-compte-relie">
      <h2 className={titreCarte}>Mon compte perso Zayado</h2>
      <p className={aide}>Tu as aussi un compte Zayado perso ? Relie-le : tu choisis si les notifications de l'équipe y arrivent aussi. Tes données perso restent séparées.</p>
      {l.confirme ? (
        <>
          <p className="mt-3 text-[14px] text-white">Relié à <b>{l.email_perso}</b> <Check size={15} className="inline text-emerald-300" /></p>
          <label className="mt-3 flex items-center gap-3 text-[13.5px] text-white/85">
            <Interrupteur actif={l.notif_perso} onClick={() => faire(() => entLiaisonNotifs(!l.notif_perso), !l.notif_perso ? "Les notifications de l'équipe arrivent aussi sur ton compte perso." : "Notifications de l'équipe : compte pro seulement.")} label="Notifications de l'équipe aussi sur mon compte perso" testid="ent-notif-perso" />
            Recevoir aussi les notifications de l'équipe sur mon compte perso
          </label>
          <button className={`${bouton2} mt-3`} disabled={occupe} onClick={() => faire(entLiaisonDelier, "Comptes déliés.")}>Délier</button>
        </>
      ) : (
        <>
          {l.en_attente && <p className="mt-3 rounded-xl bg-gold/10 px-3 py-2 text-[13px] text-white/85">En attente : connecte-toi à ton compte perso <b>{l.email_perso}</b> et confirme (notification ou e-mail reçu).</p>}
          <div className="mt-3 flex gap-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="E-mail de ton compte perso" className={champ} />
            <button className={bouton2} disabled={occupe || !email.includes("@")} onClick={() => faire(() => entLiaisonDemander(email.trim()), "Demande envoyée : confirme depuis ton compte perso.")}>Relier</button>
          </div>
        </>
      )}
    </section>
  );
}

// Deux portes, au choix du dirigeant : « Je pars de zéro » (Zayado crée tout chez lui) ou « J'ai déjà mes fichiers »
function BaseEntreprise() {
  const [porte, setPorte] = useState(null);
  useEffect(() => { entSource().then((r) => setPorte(r.source ? "existant" : "zero")).catch(() => setPorte("zero")); }, []);
  if (!porte) return null;
  return (
    <div className="space-y-3" data-testid="ent-base">
      <div className="grid gap-2 sm:grid-cols-2">
        {[["zero", "Je pars de zéro", "Zayado crée les classeurs et les dossiers dans ton Drive."], ["existant", "J'ai déjà mes fichiers", "Tu relies ton classeur actuel : Zayado s'adapte à tes colonnes."]].map(([k, t, d]) => (
          <button key={k} type="button" onClick={() => setPorte(k)} aria-pressed={porte === k} data-testid={`ent-porte-${k}`}
            className={`rounded-2xl border p-4 text-left transition ${porte === k ? "border-gold bg-gold/10" : "border-white/15 bg-white/[0.04] hover:border-white/30"}`}>
            <p className="text-[14.5px] font-semibold text-white">{t}</p><p className="mt-1 text-[12.5px] text-white/65">{d}</p>
          </button>
        ))}
      </div>
      {porte === "zero" ? <InstallationBase /> : <MesFichiers />}
    </div>
  );
}

function MesFichiers() {
  const [src, setSrc] = useState(undefined);
  const [f4, setF4] = useState("microsoft");
  const [q, setQ] = useState("");
  const [fichiers, setFichiers] = useState(null);
  const [choisi, setChoisi] = useState(null);
  const [an, setAn] = useState(null);
  const [corr, setCorr] = useState({});
  const [occupe, setOccupe] = useState(false);
  const [rapport, setRapport] = useState(null);
  const recharger = () => entSource().then((r) => setSrc(r.source || null)).catch(() => setSrc(null));
  useEffect(() => { recharger(); }, []);
  const chercher = async () => { setFichiers(null); try { setFichiers((await entSourceFichiers(f4, q)).fichiers); } catch (e) { toast.error(msg(e)); setFichiers([]); } };
  const analyser = async (f) => {
    setChoisi(f); setAn(null); setOccupe(true);
    try { const r = await entSourceAnalyser(f4, f.id); setAn(r); setCorr(r.proposition || {}); } catch (e) { toast.error(msg(e)); }
    setOccupe(false);
  };
  const champ2 = (cible, ch, col) => setCorr({ ...corr, [cible]: { ...(corr[cible] || {}), colonnes: { ...((corr[cible] || {}).colonnes || {}), [ch]: col || undefined } } });
  const valider = async () => {
    setOccupe(true);
    try {
      await entSourceEnregistrer({ fournisseur: f4, fichier: choisi, correspondance: corr });
      const r = await entSourceSynchroniser(); setRapport(r); toast.success("Fichier relié et lu."); setAn(null); setChoisi(null); recharger();
    } catch (e) { toast.error(msg(e)); }
    setOccupe(false);
  };
  const synchro = async () => { setOccupe(true); try { setRapport(await entSourceSynchroniser()); recharger(); toast.success("Mis à jour depuis ton fichier."); } catch (e) { toast.error(msg(e)); } setOccupe(false); };
  if (src === undefined) return <Loader2 className="animate-spin text-white/50" />;
  return (
    <section className={carte} data-testid="ent-mes-fichiers">
      <h2 className={titreCarte}>J'ai déjà mes fichiers</h2>
      {src && !an && (
        <div className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-[13.5px] text-white/85">
          <p>Relié à <a href={src.fichier?.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-gold hover:underline">{src.fichier?.nom}</a> ({src.fournisseur === "google" ? "Google" : "Microsoft"})</p>
          <p className="mt-0.5 text-[12px] text-white/60">{src.derniere_synchro ? `Dernière lecture : ${new Date(src.derniere_synchro).toLocaleString("fr-FR")}` : "Jamais lu"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className={bouton} onClick={synchro} disabled={occupe} data-testid="ent-source-synchro">{occupe ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Mettre à jour depuis mon fichier</button>
            <button className={bouton2} onClick={async () => { await entSourceDelier(); recharger(); }}>Délier</button>
          </div>
        </div>
      )}
      {!an && (
        <>
          <p className={aide}>{src ? "Ou relie un autre fichier :" : "Choisis ton classeur : Zayado lit ses colonnes et te propose la correspondance. Ton fichier reste la référence."}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pastille actif={f4 === "microsoft"} onClick={() => { setF4("microsoft"); setFichiers(null); }}>Excel (OneDrive / SharePoint)</Pastille>
            <Pastille actif={f4 === "google"} onClick={() => { setF4("google"); setFichiers(null); }}>Google Sheets</Pastille>
          </div>
          <div className="mt-3 flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom du fichier (facultatif)" className={champ} />
            <button className={bouton2} onClick={chercher} data-testid="ent-source-chercher">Chercher</button>
          </div>
          {fichiers && (
            <ul className="mt-2 divide-y divide-white/10">
              {fichiers.map((x) => <li key={x.id}><button onClick={() => analyser(x)} className="flex w-full items-center gap-2 py-2.5 text-left text-[14px] text-white hover:text-gold"><FileSpreadsheet size={15} className="text-gold" />{x.nom}</button></li>)}
              {!fichiers.length && <li className="py-2 text-[13px] text-white/55">{f4 === "google" ? "Aucun classeur Google accessible à Zayado. Ouvre ton classeur une fois avec Zayado, ou fais-en une copie depuis Zayado." : "Aucun classeur Excel trouvé dans ton OneDrive."}</li>}
            </ul>
          )}
          {occupe && <Loader2 size={16} className="mt-2 animate-spin text-white/50" />}
        </>
      )}
      {an && (
        <div className="mt-3 space-y-4" data-testid="ent-correspondance">
          <p className="text-[13.5px] text-white/80">Dans <b className="text-white">{choisi?.nom}</b>, voici ce que Zayado a reconnu. Vérifie, corrige si besoin, puis valide.</p>
          {Object.entries(an.cibles).map(([cible, c]) => {
            const v = corr[cible];
            const cols = v?.onglet ? an.onglets[v.onglet]?.colonnes || [] : [];
            return (
              <div key={cible} className="rounded-xl border border-white/12 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[14px] font-semibold text-white">{c.titre}</p>
                  <select value={v?.onglet || ""} onChange={(e) => setCorr({ ...corr, [cible]: e.target.value ? { onglet: e.target.value, colonnes: {} } : null })} className={`${champ} !w-auto !py-1.5 text-[13px]`} aria-label={`Onglet pour ${c.titre}`}>
                    <option value="">Pas dans mon fichier</option>
                    {Object.keys(an.onglets).map((o) => <option key={o} value={o}>Onglet « {o} »</option>)}
                  </select>
                </div>
                {v?.onglet && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {Object.entries(c.champs).map(([ch, d]) => (
                      <label key={ch} className="text-[12.5px] text-white/70">{d.libelle}{d.obligatoire ? " *" : ""}
                        <select value={(v.colonnes || {})[ch] || ""} onChange={(e) => champ2(cible, ch, e.target.value)} className={`${champ} mt-1 !py-2 text-[13px]`}>
                          <option value="">—</option>{cols.filter(Boolean).map((col) => <option key={col} value={col}>Ta colonne « {col} »</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                )}
                {v?.onglet && an.onglets[v.onglet]?.exemples?.[0] && <p className="mt-2 truncate text-[11.5px] text-white/45">Exemple : {an.onglets[v.onglet].exemples[0].filter(Boolean).join(" · ")} ({an.onglets[v.onglet].lignes} ligne(s))</p>}
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2">
            <button className={bouton} onClick={valider} disabled={occupe} data-testid="ent-source-valider">{occupe ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Valider et lire mon fichier</button>
            <button className={bouton2} onClick={() => { setAn(null); setChoisi(null); }}>Annuler</button>
          </div>
        </div>
      )}
      {rapport && <p className="mt-3 text-[13px] text-white/80" data-testid="ent-source-rapport">{rapport.invites} invitation(s) · {rapport.mis_a_jour} personne(s) mise(s) à jour · {rapport.types} pièce(s) · {rapport.planning} entrée(s) de planning{rapport.ignores?.length ? ` · ${rapport.ignores.length} ligne(s) ignorée(s)` : ""}</p>}
    </section>
  );
}
