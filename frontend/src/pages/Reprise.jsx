import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Check, ExternalLink, FileText, Handshake, Loader2, Plus, Sparkles, Trash2, TrendingDown, TrendingUp,
} from "lucide-react";
import { Sidebar } from "@/components/kairos/Sidebar";
import TexteIA from "@/components/ui/TexteIA";
import { Header } from "@/components/kairos/Header";
import {
  cessionDossiers, cessionDossier, cessionCreer, cessionModifier, cessionSupprimer, cessionEtapes, cessionDoc, cessionDocRetirer,
  cessionSuivi, cessionSuiviRetirer, cessionAnalyse, cessionPartager, fetchMoi,
} from "@/lib/kairosApi";

// Reprise & cession : de la recherche de la cible aux 100 premiers jours, et le suivi de rentabilité après le rachat.
const ACCOMPAGNEMENT = process.env.REACT_APP_URL_ACCOMPAGNEMENT || "https://zayado.net";
const SECTEURS = [["commerce", "Commerce"], ["restauration", "Restauration"], ["services", "Services"], ["industrie", "Industrie"],
  ["btp", "BTP"], ["sante", "Santé"], ["numerique", "Numérique"], ["autre", "Autre"]];
const champ = "w-full rounded-xl border border-white/20 bg-white/[0.07] px-3.5 py-2.5 text-[15px] text-white outline-none placeholder:text-white/40 focus:border-gold";
const bouton = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#DEC2A3] to-[#F1E2CC] px-5 text-[14px] font-semibold text-navy-900 disabled:opacity-50";
const bouton2 = "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-white/25 px-3.5 text-[13px] font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50";
const carte = "ok p-4 sm:p-5";
const eur = (n) => (n == null || Number.isNaN(Number(n)) ? "—" : `${Math.round(Number(n)).toLocaleString("fr-FR")} €`);
const msg = (e) => e?.detail || e?.message || "Action impossible pour le moment.";
const num = (v) => (v === "" || v == null ? null : Number(String(v).replace(/\s/g, "").replace(",", ".")));

function Pastille({ actif, children, ...p }) {
  return <button type="button" {...p} className={`inline-flex min-h-[40px] shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-[13.5px] font-medium transition ${actif ? "border-gold bg-gold text-navy-900" : "border-white/20 bg-white/[0.06] text-white/85"}`}>{children}</button>;
}
function Kpi({ l, v, sous, ton }) {
  // Tuile de chiffre au gabarit validé : libellé en capitales, nombre en serif.
  return (
    <div className="ok px-4 py-3.5">
      <p className="ok-lab">{l}</p>
      <p className={`ok-num !mt-2 !text-[26px] ${ton || ""}`}>{v}</p>
      {sous && <p className="ok-sub">{sous}</p>}
    </div>
  );
}
function Champ({ l, v, on, ...p }) {
  return <label className="text-[12.5px] text-white/65">{l}<input value={v ?? ""} onChange={(e) => on(e.target.value)} className={`${champ} mt-1`} {...p} /></label>;
}

function Formulaire({ d, onSauve }) {
  const [f, setF] = useState(d);
  const [occupe, setOccupe] = useState(false);
  const s = (k) => (v) => setF({ ...f, [k]: v });
  const achat = f.sens === "achat";
  const sauver = async () => {
    setOccupe(true);
    const corps = { ...f };
    ["prix_affiche", "prix_final", "ca", "ebe", "resultat", "ebe_previsionnel", "apport", "emprunt", "taux", "duree_mois"].forEach((k) => { corps[k] = num(f[k]); });
    corps.date_reprise = f.date_reprise || null;
    try { onSauve(await cessionModifier(d.id, corps)); toast.success("Dossier enregistré."); } catch (e) { toast.error(msg(e)); }
    setOccupe(false);
  };
  return (
    <section className={carte} data-testid="reprise-formulaire">
      <h2 className="text-[15px] font-semibold text-white">Les chiffres du dossier</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Champ l="Nom de l'entreprise" v={f.nom} on={s("nom")} maxLength={160} />
        <label className="text-[12.5px] text-white/65">Secteur<select value={f.secteur} onChange={(e) => s("secteur")(e.target.value)} className={`${champ} mt-1`}>{SECTEURS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <Champ l={achat ? "Prix demandé par le cédant (€)" : "Prix demandé (€)"} v={f.prix_affiche} on={s("prix_affiche")} inputMode="decimal" />
        <Champ l={achat ? "Prix final négocié (€)" : "Prix obtenu (€)"} v={f.prix_final} on={s("prix_final")} inputMode="decimal" />
        <Champ l="Chiffre d'affaires annuel (€)" v={f.ca} on={s("ca")} inputMode="decimal" />
        <Champ l="EBE annuel (€)" v={f.ebe} on={s("ebe")} inputMode="decimal" />
        <Champ l="Résultat net (€)" v={f.resultat} on={s("resultat")} inputMode="decimal" />
        {achat && <Champ l="EBE prévu la 1re année (€)" v={f.ebe_previsionnel} on={s("ebe_previsionnel")} inputMode="decimal" />}
      </div>
      {achat && (
        <>
          <p className="mt-4 text-[13px] font-semibold text-white">Financement</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Champ l="Apport (€)" v={f.apport} on={s("apport")} inputMode="decimal" />
            <Champ l="Emprunt (€)" v={f.emprunt} on={s("emprunt")} inputMode="decimal" />
            <Champ l="Taux annuel (%)" v={f.taux} on={s("taux")} inputMode="decimal" />
            <Champ l="Durée (mois)" v={f.duree_mois} on={s("duree_mois")} inputMode="numeric" />
          </div>
          <div className="mt-2 max-w-xs"><Champ l="Date de reprise" v={f.date_reprise} on={s("date_reprise")} type="date" /></div>
        </>
      )}
      <label className="mt-3 block text-[12.5px] text-white/65">Notes<textarea value={f.notes || ""} onChange={(e) => s("notes")(e.target.value)} rows={3} maxLength={10000} className={`${champ} mt-1`} /></label>
      <button className={`${bouton} mt-3`} onClick={sauver} disabled={occupe}>{occupe ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Enregistrer</button>
    </section>
  );
}

function Synthese({ d, setD }) {
  const i = d.indicateurs || {};
  const [ia, setIa] = useState(false);
  const analyser = async () => { setIa(true); try { setD(await cessionAnalyse(d.id)); } catch (e) { toast.error(msg(e)); } setIa(false); };
  const ton = { confortable: "text-emerald-200", tendu: "text-amber-200", "risqué": "text-rose-200" };
  return (
    <div className="space-y-4">
      {i.valorisation && (
        <section className={carte} data-testid="reprise-valorisation">
          <h2 className="text-[15px] font-semibold text-white">Valorisation indicative</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Kpi l="Fourchette basse" v={eur(i.valorisation.basse)} sous={`${i.valorisation.multiples[0]} × EBE`} />
            <Kpi l="Fourchette haute" v={eur(i.valorisation.haute)} sous={`${i.valorisation.multiples[1]} × EBE`} />
            {i.valorisation.multiple_prix && <Kpi l="Prix retenu" v={eur(i.prix_retenu)} sous={`${String(i.valorisation.multiple_prix).replace(".", ",")} × EBE · ${i.valorisation.avis}`} ton={i.valorisation.avis === "dans la fourchette" ? "text-emerald-200" : "text-amber-200"} />}
          </div>
          <p className="mt-2 text-[11.5px] text-white/50">Repère de conseil (méthode des multiples d'EBE) : pas une évaluation certifiée.</p>
        </section>
      )}
      {i.financement && (
        <section className={carte} data-testid="reprise-financement">
          <h2 className="text-[15px] font-semibold text-white">Financement</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Kpi l="Mensualité" v={eur(i.financement.mensualite)} />
            <Kpi l="Coût du crédit" v={eur(i.financement.cout_credit)} />
            <Kpi l="Apport" v={i.financement.apport_pct != null ? `${String(i.financement.apport_pct).replace(".", ",")} %` : "—"} sous="du prix" />
            <Kpi l="Capacité de remboursement" v={i.financement.couverture != null ? `${String(i.financement.couverture).replace(".", ",")} ×` : "—"} sous={i.financement.niveau || "EBE à renseigner"} ton={ton[i.financement.niveau]} />
            {i.financement.besoin_couvert != null && <Kpi l={i.financement.besoin_couvert >= 0 ? "Financement couvert" : "Il manque"} v={eur(Math.abs(i.financement.besoin_couvert))} ton={i.financement.besoin_couvert >= 0 ? "text-emerald-200" : "text-rose-200"} />}
          </div>
          <p className="mt-2 text-[11.5px] text-white/50">Capacité = EBE ÷ remboursements annuels. Les banques attendent en général au moins 1,3.</p>
        </section>
      )}
      {i.negociation && (
        <section className={carte} data-testid="reprise-negociation">
          <h2 className="text-[15px] font-semibold text-white">Négociation</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Kpi l="Économie négociée" v={eur(i.negociation.economie)} ton="text-emerald-200" />
            <Kpi l="Honoraires (forfait 3)" v={eur(i.negociation.honoraires_forfait3_ht)} sous="HT" />
            <Kpi l="Gain net" v={eur(i.negociation.gain_net)} ton={i.negociation.gain_net >= 0 ? "text-gold" : "text-rose-200"} />
          </div>
          <p className="mt-2 text-[11.5px] text-white/50">Économie = prix demandé − prix final. Forfait 3 : 2 850 € HT + 20 % de l'économie (3 300 € HT sans négociation).</p>
        </section>
      )}
      {!i.valorisation && !i.financement && <p className="text-[13.5px] text-white/60">Renseigne l'EBE, le prix et le financement dans « Chiffres » pour voir l'analyse.</p>}
      <section className={carte}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white"><Sparkles size={16} className="text-gold" /> Lecture IA du dossier</h2>
          <button className={bouton2} onClick={analyser} disabled={ia} data-testid="reprise-analyse">{ia ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {d.analyse_ia ? "Refaire" : "Analyser"}</button>
        </div>
        {d.analyse_ia ? <TexteIA texte={d.analyse_ia} className="mt-3" />
          : <p className="mt-2 text-[13px] text-white/60">Points forts, risques, questions à poser et prochaine étape, à partir de tes chiffres seulement.</p>}
      </section>
      <PartageClient d={d} />
      <section className={`${carte} border-gold/40`}>
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white"><Handshake size={16} className="text-gold" /> Être accompagné par Zayado</h2>
        <p className="mt-1 text-[13px] text-white/70">Évaluation (1 990 € HT), stratégie de reprise (2 850 € HT) ou accompagnement complet jusqu'à la signature, payé en partie sur l'économie négociée.</p>
        <a href={ACCOMPAGNEMENT} target="_blank" rel="noopener noreferrer" className={`${bouton} mt-3`}>Découvrir l'accompagnement <ExternalLink size={14} /></a>
      </section>
    </div>
  );
}

// Conseiller Zayado : rendre le dossier visible du client partenaire (mandat signé) dans son espace « Ton entreprise »
function PartageClient({ d }) {
  const [interne, setInterne] = useState(false);
  const [email, setEmail] = useState("");
  const [occupe, setOccupe] = useState(false);
  useEffect(() => { fetchMoi().then((m) => setInterne(["admin", "vendeur"].includes(m?.role))).catch(() => {}); }, []);
  if (!interne) return null;
  const partager = async (vide = false) => {
    setOccupe(true);
    try { const r = await cessionPartager(d.id, vide ? "" : email.trim()); toast.success(r.partage ? "Le dirigeant voit maintenant ce dossier dans Ton entreprise (sans tes notes internes)." : "Dossier retiré de l'espace du client."); }
    catch (e) { toast.error(msg(e)); }
    setOccupe(false);
  };
  return (
    <section className={carte} data-testid="reprise-partage-client">
      <h2 className="text-[15px] font-semibold text-white">Partager avec le client (mandat signé)</h2>
      <p className="mt-1 text-[12.5px] text-white/60">Le dirigeant suit l'avancement, les chiffres et les documents dans son espace « Ton entreprise ». Tes notes restent internes.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="E-mail du dirigeant client" className={`${champ} min-w-0 flex-1`} />
        <button className={bouton2} disabled={occupe || !email.includes("@")} onClick={() => partager(false)}>Partager</button>
        <button className={bouton2} disabled={occupe} onClick={() => partager(true)}>Retirer</button>
      </div>
    </section>
  );
}

function Etapes({ d, setD }) {
  const basculer = async (n) => {
    const faites = d.etapes_faites.includes(n) ? d.etapes_faites.filter((x) => x !== n) : [...d.etapes_faites, n];
    try { setD(await cessionEtapes(d.id, faites)); } catch (e) { toast.error(msg(e)); }
  };
  return (
    <section className={carte} data-testid="reprise-etapes">
      <div className="flex items-baseline justify-between"><h2 className="text-[15px] font-semibold text-white">Le parcours</h2><span className="text-[13px] text-white/60">{d.avancement} %</span></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gold" style={{ width: `${d.avancement}%` }} /></div>
      <ol className="mt-3 space-y-1">
        {d.etapes.map((t, n) => {
          const ok = d.etapes_faites.includes(n);
          return (
            <li key={t}><button onClick={() => basculer(n)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-white/[0.04]" aria-pressed={ok}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${ok ? "border-gold bg-gold text-navy-900" : "border-white/30 text-white/60"}`}>{ok ? <Check size={13} /> : n + 1}</span>
              <span className={`text-[14px] ${ok ? "text-white/55 line-through" : "text-white"}`}>{t}</span>
            </button></li>
          );
        })}
      </ol>
    </section>
  );
}

function Documents({ d, setD }) {
  const [f, setF] = useState({ titre: "", url: "" });
  const ajouter = async (e) => { e.preventDefault(); try { setD(await cessionDoc(d.id, f.titre, f.url)); setF({ titre: "", url: "" }); } catch (er) { toast.error(msg(er)); } };
  return (
    <section className={carte} data-testid="reprise-documents">
      <h2 className="text-[15px] font-semibold text-white">Documents</h2>
      <p className="mt-1 text-[12.5px] text-white/60">Bilans, baux, fiche de proposition de vente, mandat… Les fichiers restent dans ton Drive : colle leur lien.</p>
      <ul className="mt-3 divide-y divide-white/10">
        {d.documents.map((x) => (
          <li key={x.id} className="flex items-center gap-2 py-2.5">
            <FileText size={15} className="shrink-0 text-gold" />
            <a href={x.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[14px] text-white hover:underline">{x.titre}</a>
            <button className={bouton2} onClick={async () => { try { setD(await cessionDocRetirer(d.id, x.id)); } catch (e) { toast.error(msg(e)); } }} aria-label={`Retirer ${x.titre}`}><Trash2 size={13} /></button>
          </li>
        ))}
        {!d.documents.length && <li className="py-2 text-[13.5px] text-white/55">Aucun document pour l'instant.</li>}
      </ul>
      <form onSubmit={ajouter} className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
        <input value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} placeholder="Titre (ex. Bilan 2025)" className={champ} required maxLength={160} />
        <input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://…" className={champ} required />
        <button className={bouton2}><Plus size={14} /> Ajouter</button>
      </form>
    </section>
  );
}

function Suivi({ d, setD }) {
  const s = d.indicateurs?.suivi;
  const [f, setF] = useState({ mois: new Date().toISOString().slice(0, 7), ca: "", charges: "", tresorerie: "" });
  const saisir = async (e) => {
    e.preventDefault();
    try { setD(await cessionSuivi(d.id, { mois: f.mois, ca: num(f.ca) || 0, charges: num(f.charges) || 0, tresorerie: num(f.tresorerie) })); setF({ ...f, ca: "", charges: "", tresorerie: "" }); toast.success("Mois enregistré."); }
    catch (er) { toast.error(msg(er)); }
  };
  const max = s ? Math.max(...s.mois.map((m) => Math.abs(m.ebe)), s.objectif_mensuel || 0, 1) : 1;
  return (
    <div className="space-y-4">
      <form onSubmit={saisir} className={carte} data-testid="reprise-suivi-form">
        <h2 className="text-[15px] font-semibold text-white">Rentabilité après la reprise</h2>
        <p className="mt-1 text-[12.5px] text-white/60">Chaque mois : chiffre d'affaires et charges. Zayado calcule l'EBE, le compare au prévisionnel et à ta mensualité.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Champ l="Mois" v={f.mois} on={(v) => setF({ ...f, mois: v })} type="month" />
          <Champ l="CA (€)" v={f.ca} on={(v) => setF({ ...f, ca: v })} inputMode="decimal" required />
          <Champ l="Charges (€)" v={f.charges} on={(v) => setF({ ...f, charges: v })} inputMode="decimal" required />
          <Champ l="Trésorerie (€)" v={f.tresorerie} on={(v) => setF({ ...f, tresorerie: v })} inputMode="decimal" />
        </div>
        <button className={`${bouton} mt-3`}><Plus size={16} /> Enregistrer le mois</button>
      </form>
      {s && (
        <section className={carte} data-testid="reprise-suivi">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Kpi l="EBE cumulé" v={eur(s.ebe_cumule)} />
            <Kpi l="EBE moyen / mois" v={eur(s.ebe_moyen)} sous={s.objectif_mensuel != null ? `objectif ${eur(s.objectif_mensuel)}` : null} ton={s.objectif_mensuel != null && s.ebe_moyen < s.objectif_mensuel ? "text-amber-200" : "text-emerald-200"} />
            {s.marge_apres_credit != null && <Kpi l="Reste après crédit" v={eur(s.marge_apres_credit)} ton={s.marge_apres_credit >= 0 ? "text-emerald-200" : "text-rose-200"} />}
            {s.tendance && <Kpi l="Tendance" v={<span className="inline-flex items-center gap-1">{s.tendance === "baisse" ? <TrendingDown size={17} /> : <TrendingUp size={17} />}{s.tendance}</span>} ton={s.tendance === "baisse" ? "text-rose-200" : "text-emerald-200"} />}
          </div>
          <ul className="mt-4 space-y-2">
            {s.mois.map((m) => (
              <li key={m.mois} className="text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/80">{new Date(`${m.mois}-15`).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}</span>
                  <span className="flex items-center gap-2">
                    <b className={m.ebe >= 0 ? "text-white" : "text-rose-200"}>{eur(m.ebe)}</b>
                    {m.couvre_mensualite === false && <span className="rounded-full bg-rose-400/15 px-2 py-0.5 text-[11px] text-rose-200">ne couvre pas la mensualité</span>}
                    <button onClick={async () => { try { setD(await cessionSuiviRetirer(d.id, m.mois)); } catch (e) { toast.error(msg(e)); } }} className="text-white/35 hover:text-rose-200" aria-label={`Retirer ${m.mois}`}><Trash2 size={13} /></button>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${m.ebe >= 0 ? "bg-gold" : "bg-rose-300"}`} style={{ width: `${Math.round((Math.abs(m.ebe) / max) * 100)}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Dossier({ id, onRetour }) {
  const [d, setD] = useState(null);
  const [vue, setVue] = useState("synthese");
  useEffect(() => { cessionDossier(id).then(setD).catch((e) => { toast.error(msg(e)); onRetour(); }); }, [id, onRetour]);
  if (!d) return <Loader2 className="mx-auto mt-10 animate-spin text-white/60" />;
  const supprimer = async () => { if (!window.confirm(`Supprimer le dossier « ${d.nom} » ?`)) return; try { await cessionSupprimer(d.id); onRetour(); } catch (e) { toast.error(msg(e)); } };
  const vues = [["synthese", "Synthèse"], ["chiffres", "Chiffres"], ["etapes", "Étapes"], ["documents", "Documents"], ...(d.sens === "achat" ? [["suivi", "Suivi après reprise"]] : [])];
  return (
    <div>
      <button onClick={onRetour} className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-white/70 hover:text-white"><ArrowLeft size={14} /> Mes dossiers</button>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-[12px] font-semibold uppercase tracking-widest text-gold">{d.sens === "achat" ? "Je reprends" : "Je cède"}</p><h1 className="truncate text-[21px] font-semibold text-white">{d.nom}</h1></div>
        <button className={`${bouton2} !border-rose-300/40 !text-rose-200`} onClick={supprimer} aria-label="Supprimer le dossier"><Trash2 size={14} /></button>
      </div>
      <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">{vues.map(([k, l]) => <Pastille key={k} actif={vue === k} onClick={() => setVue(k)} data-testid={`reprise-vue-${k}`}>{l}</Pastille>)}</nav>
      {vue === "synthese" && <Synthese d={d} setD={setD} />}
      {vue === "chiffres" && <Formulaire key={d.updated_at} d={d} onSauve={(x) => { setD(x); setVue("synthese"); }} />}
      {vue === "etapes" && <Etapes d={d} setD={setD} />}
      {vue === "documents" && <Documents d={d} setD={setD} />}
      {vue === "suivi" && <Suivi d={d} setD={setD} />}
    </div>
  );
}

export default function Reprise() {
  const [params, setParams] = useSearchParams();
  const ouvert = params.get("dossier");
  const [liste, setListe] = useState(null);
  const [nv, setNv] = useState({ sens: "achat", nom: "" });
  const charger = useCallback(() => cessionDossiers().then((r) => setListe(r.dossiers || [])).catch(() => setListe([])), []);
  useEffect(() => { if (!ouvert) charger(); }, [ouvert, charger]);
  const creer = async (e) => {
    e.preventDefault();
    try { const d = await cessionCreer({ ...nv, nom: nv.nom.trim() }); setParams({ dossier: d.id }); } catch (er) { toast.error(msg(er)); }
  };
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-5 pb-28 sm:px-6" data-testid="reprise">
          {ouvert ? <Dossier id={ouvert} onRetour={() => setParams({})} /> : (
            <div className="space-y-4">
              <div>
                <h1 className="flex items-center gap-2 text-[22px] font-semibold text-white"><Handshake size={22} className="text-gold" /> Acquisition & transmission</h1>
                <p className="mt-1 text-[14px] text-white/70">Racheter ou vendre une entreprise : chiffres, financement, étapes, documents, puis la rentabilité mois après mois.</p>
              </div>
              <form onSubmit={creer} className={carte} data-testid="reprise-nouveau">
                <h2 className="text-[15px] font-semibold text-white">Nouveau dossier</h2>
                <div className="mt-3 flex flex-wrap gap-2"><Pastille actif={nv.sens === "achat"} onClick={() => setNv({ ...nv, sens: "achat" })}>Je reprends une entreprise</Pastille><Pastille actif={nv.sens === "cession"} onClick={() => setNv({ ...nv, sens: "cession" })}>Je cède la mienne</Pastille></div>
                <div className="mt-3 flex gap-2"><input value={nv.nom} onChange={(e) => setNv({ ...nv, nom: e.target.value })} placeholder="Nom de l'entreprise" className={champ} required maxLength={160} /><button className={bouton}><Plus size={16} /> Créer</button></div>
              </form>
              {liste === null ? <Loader2 className="mx-auto animate-spin text-white/50" /> : (
                <ul className="space-y-2">
                  {liste.map((d) => (
                    <li key={d.id}><button onClick={() => setParams({ dossier: d.id })} className={`${carte} block w-full text-left hover:border-white/30`}>
                      <div className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-[15px] font-semibold text-white">{d.nom}</span><span className="shrink-0 text-[12px] text-gold">{d.sens === "achat" ? "Reprise" : "Cession"}</span></div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gold" style={{ width: `${d.avancement}%` }} /></div>
                      <p className="mt-1.5 text-[12px] text-white/55">{d.avancement} % du parcours{d.prix_final || d.prix_affiche ? ` · ${eur(d.prix_final || d.prix_affiche)}` : ""}</p>
                    </button></li>
                  ))}
                  {!liste.length && <li className="text-[13.5px] text-white/55">Aucun dossier pour l'instant.</li>}
                </ul>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
