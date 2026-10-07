import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Check, CheckCircle2, Copy, ExternalLink, FileText, Globe, Lightbulb, ListTodo, Loader2, Mail, Monitor, Search,
  Send, Square, UserPlus, X, XCircle,
} from "lucide-react";
import { capacitesAgents, lancerMission, missionsAgent, lireMission, validerMission, arreterMission } from "@/lib/kairosApi";

// Un agent ne fait pas que discuter : on lui confie une MISSION, il enchaîne les actions (web, navigateur, cockpit),
// on suit chaque étape en direct, et rien d'engageant (e-mail) ne part sans ton accord.
const GOLD = "#DEC2A3";
const OUTIL = {
  recherche_web: [Search, "Recherche sur le web"], lire_page: [Globe, "Lecture d'une page"], creer_action: [ListTodo, "Action ajoutée"],
  noter_idee: [Lightbulb, "Idée notée"], ajouter_prospect: [UserPlus, "Prospect ajouté"], rediger_document: [FileText, "Livrable rédigé"],
  envoyer_email: [Mail, "E-mail"],
};
const EXEMPLES = {
  commercial: ["Trouve 5 entreprises de ma région qui pourraient avoir besoin de mes services, ajoute-les à mes prospects et prépare un premier message pour chacune.",
    "Analyse le site de mon concurrent principal et dis-moi comment me démarquer."],
  contenu: ["Regarde ce qui se dit en ce moment dans mon secteur et rédige 3 posts LinkedIn à partir de ça."],
  finances: ["Cherche les aides et subventions pour une petite entreprise comme la mienne cette année et fais-moi une liste avec les liens."],
  relances: ["Prépare les relances de la semaine et ajoute-les à mon Plan d'action."],
  juridique: ["Trouve les mentions obligatoires de mes CGV et rédige-moi un modèle adapté à mon activité."],
};
const DEFAUT = ["Fais une veille sur mon marché : 5 informations utiles cette semaine, avec les sources.", "Trouve 3 idées pour gagner de nouveaux clients ce mois-ci et ajoute-les à mes actions."];
const carte = "rounded-2xl border border-white/12 bg-white/[0.06] p-4 sm:p-5";
const champ = "w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold";
const bouton = "inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-4 text-[13.5px] font-semibold text-navy-900 disabled:opacity-50";
const bouton2 = "inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-white/20 px-3 text-[12.5px] font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50";
const STATUT = { en_cours: "En cours", a_valider: "Attend ton accord", terminee: "Terminée", echec: "Échec", arretee: "Arrêtée" };

function Etape({ e, n }) {
  const [ouvert, setOuvert] = useState(false);
  const [Icone, libelle] = OUTIL[e.outil] || [CheckCircle2, e.outil];
  const titre = e.outil === "recherche_web" ? `« ${e.args?.requete || ""} »` : e.outil === "lire_page" ? e.args?.url : e.args?.titre || e.args?.entreprise || e.args?.a || "";
  return (
    <li className="relative pl-9" data-testid="mission-etape">
      <span className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/[0.06]"><Icone size={14} style={{ color: GOLD }} /></span>
      <p className="text-[13.5px] text-white"><b className="font-semibold">{n}. {libelle}</b>{titre ? <span className="text-white/70"> · {titre}</span> : null}
        {e.navigateur && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/75"><Monitor size={11} /> navigateur</span>}
        {e.statut === "refusee" && <span className="ml-2 text-[12px] text-rose-200">refusé</span>}
        {e.ok === false && e.statut === "faite" && <span className="ml-2 text-[12px] text-amber-200">sans résultat</span>}
      </p>
      {e.pensee && <p className="mt-0.5 text-[12.5px] italic text-white/55">{e.pensee}</p>}
      {e.capture && <img src={e.capture} alt={`Capture de ${e.args?.url || "la page"}`} className="mt-2 max-h-44 rounded-lg border border-white/10" />}
      {e.sources?.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">{e.sources.slice(0, 4).map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12.5px] text-gold hover:underline"><ExternalLink size={11} />{s.titre.slice(0, 80)}</a></li>)}</ul>
      )}
      {e.lien && <Link to={e.lien} className="mt-1 inline-flex text-[12.5px] text-gold hover:underline">Voir dans le cockpit →</Link>}
      {e.resultat && e.outil !== "envoyer_email" && (
        <button onClick={() => setOuvert(!ouvert)} className="mt-1 text-[12px] text-white/50 hover:text-white/80" aria-expanded={ouvert}>{ouvert ? "Masquer le détail" : "Voir le détail"}</button>
      )}
      {(ouvert || e.outil === "envoyer_email") && e.resultat && <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white/[0.04] p-2.5 text-[12.5px] text-white/75">{e.resultat}</p>}
    </li>
  );
}

function Validation({ mission, onMaj }) {
  const e = mission.etapes[mission.etapes.length - 1];
  const [args, setArgs] = useState({ a: e.args?.a || "", objet: e.args?.objet || "", corps: e.args?.corps || "" });
  const [envoi, setEnvoi] = useState(false);
  const decider = async (accepter) => {
    setEnvoi(true);
    try { onMaj(await validerMission(mission.id, accepter, accepter ? args : null)); toast.success(accepter ? "Accord donné : l'agent envoie et continue." : "Rien n'est envoyé : l'agent continue sans."); }
    catch (er) { toast.error(er.detail || "Action impossible."); }
    setEnvoi(false);
  };
  return (
    <div className="rounded-2xl border border-gold/50 bg-gold/[0.07] p-4" data-testid="mission-validation">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-white"><Mail size={16} style={{ color: GOLD }} /> Ton agent veut envoyer cet e-mail</p>
      <p className="mt-1 text-[12.5px] text-white/65">Rien ne part sans toi. Corrige si besoin, puis envoie ou refuse.</p>
      <div className="mt-3 space-y-2">
        <input value={args.a} onChange={(x) => setArgs({ ...args, a: x.target.value })} className={champ} aria-label="Destinataire" />
        <input value={args.objet} onChange={(x) => setArgs({ ...args, objet: x.target.value })} className={champ} aria-label="Objet" />
        <textarea value={args.corps} onChange={(x) => setArgs({ ...args, corps: x.target.value })} rows={6} className={`${champ} resize-y`} aria-label="Message" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={bouton} style={{ background: GOLD }} disabled={envoi} onClick={() => decider(true)} data-testid="mission-accepter"><Send size={15} /> Envoyer</button>
        <button className={bouton2} disabled={envoi} onClick={() => decider(false)} data-testid="mission-refuser"><X size={14} /> Ne pas envoyer</button>
      </div>
    </div>
  );
}

export default function MissionsAgent({ agent }) {
  const [caps, setCaps] = useState(null);
  const [objectif, setObjectif] = useState("");
  const [mission, setMission] = useState(null);
  const [liste, setListe] = useState([]);
  const [envoi, setEnvoi] = useState(false);
  const minuteur = useRef(null);
  const chargerListe = useCallback(() => missionsAgent(agent.id).then((r) => setListe(r.missions || [])).catch(() => {}), [agent.id]);
  useEffect(() => {
    capacitesAgents().then(setCaps).catch(() => {});
    chargerListe();
    const id = new URLSearchParams(window.location.search).get("mission");
    if (id) lireMission(id).then(setMission).catch(() => {});
  }, [chargerListe]);
  // Suivi en direct tant que l'agent travaille
  useEffect(() => {
    clearTimeout(minuteur.current);
    if (mission?.statut === "en_cours") {
      minuteur.current = setTimeout(() => lireMission(mission.id).then((m) => { setMission(m); if (m.statut !== "en_cours") chargerListe(); }).catch(() => {}), 2000);
    }
    return () => clearTimeout(minuteur.current);
  }, [mission, chargerListe]);

  const lancer = async () => {
    if (objectif.trim().length < 5) return;
    setEnvoi(true);
    try { const m = await lancerMission(agent.id, objectif.trim()); setMission(m); setObjectif(""); chargerListe(); }
    catch (e) { toast.error(e.detail || "Mission impossible pour le moment."); }
    setEnvoi(false);
  };
  const exemples = EXEMPLES[agent.modele] || DEFAUT;
  const enCours = mission && ["en_cours", "a_valider"].includes(mission.statut);

  return (
    <div className="grid gap-4 lg:grid-cols-5" data-testid="missions-agent">
      <div className="space-y-4 lg:col-span-3">
        {!enCours && (
          <div className={carte}>
            <h3 className="font-display text-[17px] font-semibold text-white">Confier une mission à {agent.nom}</h3>
            <p className="mt-1 text-[13px] text-white/70">Dis-lui le résultat attendu. Il cherche, ouvre les sites, ajoute ce qu'il trouve à ton cockpit et te rend un compte rendu.</p>
            <textarea value={objectif} onChange={(e) => setObjectif(e.target.value)} rows={3} maxLength={2000} placeholder="Ex. : trouve 5 prospects à Lyon et prépare un message pour chacun" className={`${champ} mt-3 resize-y`} data-testid="mission-objectif" />
            <div className="mt-2 flex flex-wrap gap-1.5">{exemples.map((x) => <button key={x} onClick={() => setObjectif(x)} className="rounded-full border border-white/15 px-3 py-1.5 text-left text-[12px] text-white/70 hover:border-white/35 hover:text-white">{x.length > 70 ? `${x.slice(0, 70)}…` : x}</button>)}</div>
            <button className={`${bouton} mt-3 w-full sm:w-auto`} style={{ background: GOLD }} disabled={envoi || objectif.trim().length < 5} onClick={lancer} data-testid="mission-lancer">
              {envoi ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Lancer la mission
            </button>
          </div>
        )}
        {mission && (
          <div className={carte} data-testid="mission-suivi">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="text-[12px] font-semibold uppercase tracking-widest text-white/50">{STATUT[mission.statut]}</p><p className="mt-1 text-[14.5px] text-white">{mission.objectif}</p></div>
              {enCours ? <button className={bouton2} onClick={async () => setMission(await arreterMission(mission.id))}><Square size={13} /> Arrêter</button>
                : <button className={bouton2} onClick={() => setMission(null)}>Nouvelle mission</button>}
            </div>
            <ol className="mt-4 space-y-4 border-l border-white/10 pl-0">{mission.etapes.map((e, i) => <Etape key={i} e={e} n={i + 1} />)}</ol>
            {mission.statut === "en_cours" && <p className="mt-4 flex items-center gap-2 text-[13px] text-white/70"><Loader2 size={15} className="animate-spin" style={{ color: GOLD }} /> {agent.nom} travaille… (étape {mission.etapes.length + 1})</p>}
            {mission.statut === "a_valider" && <div className="mt-4"><Validation mission={mission} onMaj={setMission} /></div>}
            {mission.rapport && (
              <div className="mt-4 rounded-xl border border-white/12 bg-white/[0.04] p-3.5" data-testid="mission-rapport">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-white">{mission.statut === "terminee" ? <CheckCircle2 size={15} className="text-emerald-300" /> : <XCircle size={15} className="text-rose-300" />} Compte rendu</p>
                <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-white/85">{mission.rapport}</p>
              </div>
            )}
            {mission.livrables?.map((l, i) => (
              <div key={i} className="mt-3 rounded-xl border border-white/12 p-3.5">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-white"><FileText size={14} style={{ color: GOLD }} /> {l.titre}</p>
                <p className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap text-[13px] text-white/80">{l.contenu}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {l.drive?.url && <a href={l.drive.url} target="_blank" rel="noopener noreferrer" className={bouton} style={{ background: GOLD }} data-testid="mission-livrable-drive"><ExternalLink size={14} /> Ouvrir dans {l.drive.provider === "microsoft" ? "OneDrive" : "Google Drive"}</a>}
                  <button className={bouton2} onClick={async () => { try { await navigator.clipboard.writeText(l.contenu); toast.success("Copié."); } catch { toast.error("Copie impossible."); } }}><Copy size={13} /> Copier le texte</button>
                </div>
                {!l.drive && <p className="mt-2 text-[12px] text-amber-200/90">Pas rangé dans un Drive : {l.erreur_drive || "aucun Drive relié"}. <Link to="/parametres#connexions" className="underline">Relier mon Drive ou OneDrive</Link></p>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-4 lg:col-span-2">
        <div className={carte}>
          <p className="text-[12px] font-semibold uppercase tracking-widest text-white/60">Ce qu'il sait faire</p>
          <ul className="mt-2 space-y-1.5">
            {(caps?.outils || []).map((o) => { const [I] = OUTIL[o.nom] || [Check]; return <li key={o.nom} className="flex gap-2 text-[13px] text-white/80"><I size={14} className="mt-0.5 shrink-0" style={{ color: GOLD }} />{o.description}{o.validation && <span className="text-gold"> (avec ton accord)</span>}</li>; })}
          </ul>
          {caps && <p className="mt-3 text-[12px] text-white/55">{caps.navigateur ? "Navigateur actif : il ouvre les sites comme toi (pages dynamiques comprises) et en garde une capture." : "Lecture des pages en mode simple (le navigateur complet n'est pas activé sur ce serveur)."} {caps.max_etapes} étapes au plus par mission.</p>}
        </div>
        {liste.length > 0 && (
          <div className={carte}>
            <p className="text-[12px] font-semibold uppercase tracking-widest text-white/60">Missions récentes</p>
            <ul className="mt-2 divide-y divide-white/10">
              {liste.map((m) => (
                <li key={m.id}><button onClick={() => lireMission(m.id).then(setMission).catch(() => {})} className="w-full py-2.5 text-left">
                  <span className="line-clamp-2 text-[13px] text-white">{m.objectif}</span>
                  <span className="text-[11.5px] text-white/50">{STATUT[m.statut]} · {m.etapes.length} étape(s) · {new Date(m.created_at).toLocaleDateString("fr-FR")}</span>
                </button></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
