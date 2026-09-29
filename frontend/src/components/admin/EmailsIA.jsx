import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { FileEdit, Loader2, Send, Copy, Pencil, X, Check, ChevronDown, ChevronUp, KeyRound } from "lucide-react";
import {
  fetchEmailsIA, creerBrouillonEmailIA, envoyerBrouillonEmailIA, annulerBrouillonEmailIA, enregistrerCleBrevo,
  modifierBrouillonEmailIA, dupliquerEmailIA, fetchMoi,
} from "@/lib/kairosApi";

/* « Composeur Email IA » — même parcours que la console admin DeepShield/Sentriq :
   1. Destinataire + intention en langage naturel.
   2. Mode brouillon (par défaut) : l'IA rédige et t'envoie le brouillon pour validation.
      Mode auto : l'IA rédige ET envoie directement via Brevo.
   3. Historique avec statut et bouton « Approuver ».
   Adapté à Zayado : plusieurs destinataires, réponse à un email reçu, retouche
   avant envoi, validation aussi par lien reçu ou « ok envoi » sur WhatsApp. */

const Label = ({ children }) => <label className="mb-2 block text-xs font-mono uppercase tracking-widest text-offwhite/50">{children}</label>;
const CHAMP = "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-offwhite placeholder:text-slate-400 outline-none focus:border-gold/50";
const STATUTS = {
  brouillon: ["draft", "bg-amber-500/15 text-amber-300 border-amber-400/30"],
  envoi: ["envoi…", "bg-white/10 text-offwhite/70 border-white/20"],
  envoye: ["sent", "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"],
  echec: ["failed", "bg-red-500/15 text-red-300 border-red-400/30"],
  annule: ["annulé", "bg-white/10 text-offwhite/40 border-white/15"],
};

export default function EmailsIA() {
  const [data, setData] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [adminEmail, setAdminEmail] = useState("");
  // Composeur
  const [dest, setDest] = useState("");
  const [intention, setIntention] = useState("");
  const [ton, setTon] = useState("professionnel et chaleureux");
  const [auto, setAuto] = useState(false);
  const [avecRecu, setAvecRecu] = useState(false);
  const [recu, setRecu] = useState({ expediteur: "", sujet: "", corps: "" });
  const [busy, setBusy] = useState(false);
  // Historique
  const [ouvert, setOuvert] = useState(null);
  const [edition, setEdition] = useState(null);
  const [cleOuverte, setCleOuverte] = useState(false);
  const [cle, setCle] = useState({ api_key: "", sender_email: "" });

  const charger = useCallback(() => {
    fetchEmailsIA().then(setData).catch(() => setErreur("Accès refusé ou erreur serveur."));
  }, []);
  useEffect(() => { charger(); fetchMoi().then((m) => setAdminEmail(m?.email || "")).catch(() => {}); }, [charger]);

  const generer = async (e) => {
    e.preventDefault();
    if (!dest.trim() || intention.trim().length < 3) return;
    setBusy(true);
    try {
      const d = await creerBrouillonEmailIA({
        intention: intention.trim(), destinataires: dest, ton, envoi_direct: auto,
        email_recu: avecRecu ? recu : null,
      });
      if (auto) {
        const r = d.envoi || {};
        if (r.envoyes) toast.success(`Email envoyé via Brevo ! (${r.envoyes} destinataire${r.envoyes > 1 ? "s" : ""})`);
        else toast.error(`Envoi échoué : ${r.echecs?.[0]?.erreur || "erreur Brevo"}`);
      } else if (d.alerte_apercu) {
        toast.warning(`Brouillon créé, mais l'aperçu par email n'est pas parti : ${d.alerte_apercu} Tu peux l'approuver ici.`, { duration: 9000 });
      } else {
        toast.success(`Brouillon envoyé sur ${adminEmail || "ton email"} pour validation.`);
      }
      setIntention(""); setOuvert(d.id); setAvecRecu(false); setRecu({ expediteur: "", sujet: "", corps: "" });
      charger();
    } catch (err) { toast.error(err?.message || "Erreur de génération."); }
    setBusy(false);
  };

  const executer = async (fn, id, ok) => {
    setBusy(true);
    try {
      const r = await fn(id);
      if (r?.envoyes !== undefined) {
        if (r.envoyes) toast.success(`Email envoyé ! (${r.envoyes} envoyé${r.envoyes > 1 ? "s" : ""}${r.echecs?.length ? `, ${r.echecs.length} échec(s)` : ""})`);
        else toast.error(`Aucun envoi : ${r.echecs?.[0]?.erreur || "erreur"}`);
      } else if (ok) toast.success(ok);
      if (r?.id && r.statut === "brouillon") setOuvert(r.id);
      charger();
    } catch (err) { toast.error(err?.message || "Action impossible."); }
    setBusy(false);
  };

  const sauverCle = async () => {
    try { await enregistrerCleBrevo(cle); setCle({ api_key: "", sender_email: "" }); toast.success("Clé Brevo enregistrée (chiffrée)."); charger(); }
    catch (err) { toast.error(err?.message || "Clé refusée."); }
  };

  if (erreur) return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><p className="text-sm text-red-400">{erreur}</p></div>;
  if (!data) return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><p className="text-sm text-offwhite/50">Chargement…</p></div>;

  return (
    <div className="space-y-6" data-testid="admin-emails">
      <h2 className="font-display text-2xl font-semibold">Composeur Email IA</h2>
      <form onSubmit={generer} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <p className="rounded-lg border border-blue-400/20 bg-blue-500/10 p-3 text-xs text-offwhite/80">
          💡 <strong>Mode brouillon</strong> : tu écris ce que tu veux dire en langage naturel. L'IA rédige un email pro au nom de <strong>{data.marque}</strong> et te l'envoie sur <strong>{adminEmail || "ton email"}</strong> pour validation (ou réponds « ok envoi » sur WhatsApp). <strong>Mode auto</strong> : envoie directement au(x) destinataire(s) via Brevo.
        </p>
        <div>
          <Label>Destinataire(s)</Label>
          <input required value={dest} onChange={(e) => setDest(e.target.value)} placeholder="client@exemple.com — plusieurs : séparés par des virgules (50 max)" className={`${CHAMP} h-11`} data-testid="admin-draft-to-input" />
        </div>
        <div>
          <Label>Intention (langage naturel)</Label>
          <textarea required value={intention} onChange={(e) => setIntention(e.target.value)} rows={4}
            placeholder="Ex : Remercier ce nouveau client Pro, lui rappeler qu'il peut relier son Radar à sa ville, et l'inviter à sa première revue du lundi"
            className={`${CHAMP} resize-none`} data-testid="admin-draft-intent-input" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Ton</Label>
            <select value={ton} onChange={(e) => setTon(e.target.value)} className={`${CHAMP} h-11`} data-testid="admin-draft-ton">
              {["professionnel et chaleureux", "formel", "amical et direct", "commercial mais sobre", "empathique"].map((t) => <option key={t} value={t} className="bg-navy-800">{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={avecRecu} onChange={(e) => setAvecRecu(e.target.checked)} className="h-4 w-4" data-testid="admin-draft-recu-checkbox" />
              <span className="text-offwhite/75">Répondre à un email reçu (analyse + réponse)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="h-4 w-4" data-testid="admin-draft-auto-checkbox" />
              <span className="text-offwhite/75">Envoyer directement (sans validation manuelle)</span>
            </label>
          </div>
        </div>
        {avecRecu && (
          <div className="grid gap-2">
            <input className={CHAMP} placeholder="Expéditeur de l'email reçu" value={recu.expediteur} onChange={(e) => setRecu({ ...recu, expediteur: e.target.value })} />
            <input className={CHAMP} placeholder="Objet reçu" value={recu.sujet} onChange={(e) => setRecu({ ...recu, sujet: e.target.value })} />
            <textarea className={CHAMP} rows={4} placeholder="Colle ici le contenu de l'email reçu" value={recu.corps} onChange={(e) => setRecu({ ...recu, corps: e.target.value })} />
          </div>
        )}
        <button type="submit" disabled={busy || !dest.trim() || intention.trim().length < 3}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold font-medium text-navy-900 transition hover:brightness-95 disabled:opacity-50" data-testid="admin-draft-submit-btn">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération…</> : <><FileEdit className="h-4 w-4" /> {auto ? "Générer + envoyer" : "Générer le brouillon"}</>}
        </button>
        <p className="text-center text-[11px] text-offwhite/40">
          Envoi : {data.brevo.configuree ? `clé Brevo ${data.brevo.source} · expéditeur ${data.brevo.expediteur}` : "aucune clé Brevo — ajoute-la en bas de page"}
        </p>
      </form>

      <h3 className="mt-8 font-display text-lg">Historique ({data.brouillons.length})</h3>
      <div className="space-y-2">
        {data.brouillons.map((m) => {
          const [lib, cls] = STATUTS[m.statut] || [m.statut, "bg-white/10 border-white/15"];
          const deplie = ouvert === m.id;
          return (
            <div key={m.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4" data-testid={`admin-email-${m.id}`}>
              <div className="flex items-start justify-between gap-3">
                <button className="min-w-0 flex-1 text-left" onClick={() => setOuvert(deplie ? null : m.id)}>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${cls}`}>{lib}</span>
                    <span className="font-mono text-[10px] text-offwhite/45">→ {m.destinataires.slice(0, 3).join(", ")}{m.destinataires.length > 3 ? ` +${m.destinataires.length - 3}` : ""}</span>
                    <span className="text-[10px] text-offwhite/35">{m.cree_le ? new Date(m.cree_le).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : ""}</span>
                  </div>
                  <p className="truncate text-sm font-medium">{m.sujet}</p>
                  {m.intention && <p className="mt-0.5 truncate text-xs text-offwhite/50">{m.intention}</p>}
                </button>
                <div className="flex shrink-0 items-center gap-1.5">
                  {m.statut === "brouillon" && (
                    <>
                      <button onClick={() => executer(envoyerBrouillonEmailIA, m.id)} disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50" data-testid={`admin-approve-${m.id}`}>
                        <Send className="h-3 w-3" /> Approuver
                      </button>
                      <button onClick={() => setEdition(m)} className="rounded-lg border border-white/15 p-1.5 text-offwhite/70 hover:bg-white/10" title="Retoucher" data-testid={`admin-edit-${m.id}`}><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => executer(annulerBrouillonEmailIA, m.id, "Brouillon annulé")} disabled={busy} className="rounded-lg border border-white/15 p-1.5 text-offwhite/70 hover:bg-white/10" title="Annuler" data-testid={`admin-cancel-${m.id}`}><X className="h-3.5 w-3.5" /></button>
                    </>
                  )}
                  {m.statut !== "brouillon" && m.statut !== "envoi" && (
                    <button onClick={() => executer(dupliquerEmailIA, m.id, "Nouveau brouillon créé à partir de cet email")} disabled={busy}
                      className="rounded-lg border border-white/15 p-1.5 text-offwhite/70 hover:bg-white/10" title="Réutiliser" data-testid={`admin-dupliquer-${m.id}`}><Copy className="h-3.5 w-3.5" /></button>
                  )}
                  <button onClick={() => setOuvert(deplie ? null : m.id)} className="p-1 text-offwhite/50">{deplie ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
                </div>
              </div>
              {deplie && (
                <div className="mt-3 space-y-2">
                  {m.analyse && <p className="border-l-2 border-gold pl-2 text-xs text-offwhite/65">Analyse IA : {m.analyse}</p>}
                  <Apercu html={m.html} />
                  <p className="break-words text-xs text-offwhite/45">→ {m.destinataires.join(", ")}</p>
                  {m.resultat?.echecs?.length > 0 && (
                    <p className="text-xs text-red-300">Échecs : {m.resultat.echecs.map((x) => `${x.email} (${x.erreur})`).join(" · ")}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {data.brouillons.length === 0 && <p className="py-6 text-center text-sm text-offwhite/45">Aucun email pour le moment.</p>}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <button onClick={() => setCleOuverte((v) => !v)} className="flex w-full items-center gap-2 text-left text-xs uppercase tracking-wide text-offwhite/55">
          <KeyRound className="h-3.5 w-3.5" /> Clé Brevo de ce compte (optionnel) {cleOuverte ? <ChevronUp className="ml-auto h-4 w-4" /> : <ChevronDown className="ml-auto h-4 w-4" />}
        </button>
        {cleOuverte && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-offwhite/45">Sans clé enregistrée, l'envoi utilise la clé plateforme. La clé est chiffrée et jamais réaffichée.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={CHAMP} type="password" placeholder="Clé API Brevo" value={cle.api_key} onChange={(e) => setCle({ ...cle, api_key: e.target.value })} />
              <input className={CHAMP} placeholder="Email expéditeur validé sur Brevo" value={cle.sender_email} onChange={(e) => setCle({ ...cle, sender_email: e.target.value })} />
            </div>
            <button className="mt-3 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold disabled:opacity-50" disabled={cle.api_key.length < 20} onClick={sauverCle}>Enregistrer la clé</button>
          </div>
        )}
      </div>

      {edition && <FenetreRetouche m={edition} onClose={() => setEdition(null)} onOk={() => { setEdition(null); charger(); }} />}
    </div>
  );
}

// Aperçu isolé (iframe sans script) : le HTML rédigé par l'IA ne s'exécute jamais dans la console admin.
function Apercu({ html }) {
  return <iframe title="Aperçu de l'email" sandbox="" srcDoc={`<meta charset="utf-8"><body style="margin:12px;font-family:Arial,sans-serif">${html || ""}</body>`} className="h-80 w-full rounded-lg border-0 bg-white" />;
}

function FenetreRetouche({ m, onClose, onOk }) {
  const [sujet, setSujet] = useState(m.sujet);
  const [html, setHtml] = useState(m.html);
  const [dest, setDest] = useState(m.destinataires.join(", "));
  const [envoi, setEnvoi] = useState(false);
  const enregistrer = async () => {
    setEnvoi(true);
    try { await modifierBrouillonEmailIA(m.id, { sujet, html, destinataires: dest }); toast.success("Brouillon mis à jour"); onOk(); }
    catch (err) { toast.error(err?.message || "Modification refusée."); setEnvoi(false); }
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#13254f] p-6 text-offwhite" onClick={(e) => e.stopPropagation()} data-testid="admin-email-retouche">
        <p className="font-display text-lg font-semibold">Retoucher le brouillon</p>
        <div className="mt-4 space-y-3">
          <div><Label>Objet</Label><input value={sujet} onChange={(e) => setSujet(e.target.value)} className={CHAMP} /></div>
          <div><Label>Destinataire(s)</Label><input value={dest} onChange={(e) => setDest(e.target.value)} className={CHAMP} /></div>
          <div><Label>Contenu (HTML)</Label><textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={10} className={`${CHAMP} font-mono text-xs`} /></div>
          <div><Label>Aperçu</Label><Apercu html={html} /></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Annuler</button>
          <button onClick={enregistrer} disabled={envoi} className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy-900 disabled:opacity-50">
            {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
