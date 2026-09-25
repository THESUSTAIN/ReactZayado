import React, { useState, useEffect, useCallback } from "react";
import {
  fetchEmailsIA, creerBrouillonEmailIA, envoyerBrouillonEmailIA, annulerBrouillonEmailIA, enregistrerCleBrevo,
} from "@/lib/kairosApi";

const Carte = ({ children }) => <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">{children}</div>;
const CHAMP = "w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-offwhite placeholder:text-offwhite/30";
const BTN = "rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50";
const STATUTS = {
  brouillon: ["À valider", "bg-gold/15 text-gold"], envoi: ["Envoi…", "bg-white/10 text-offwhite/70"],
  envoye: ["Envoyé", "bg-emerald-500/15 text-emerald-300"], echec: ["Échec", "bg-red-500/15 text-red-300"],
  annule: ["Annulé", "bg-white/10 text-offwhite/40"],
};

export default function EmailsIA() {
  const [data, setData] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [intention, setIntention] = useState("");
  const [dest, setDest] = useState("");
  const [recu, setRecu] = useState({ expediteur: "", sujet: "", corps: "" });
  const [avecRecu, setAvecRecu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(null);
  const [ouvert, setOuvert] = useState(null);
  const [cle, setCle] = useState({ api_key: "", sender_email: "" });

  const charger = useCallback(() => {
    fetchEmailsIA().then(setData).catch(() => setErreur("Accès refusé ou erreur serveur."));
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const generer = async () => {
    setBusy(true); setInfo(null);
    try {
      const d = await creerBrouillonEmailIA({
        intention, destinataires: dest, email_recu: avecRecu ? recu : null,
      });
      setOuvert(d.id);
      setInfo(d.alerte_apercu
        ? `Brouillon créé, mais l'aperçu par email n'est pas parti : ${d.alerte_apercu} Tu peux quand même le valider ici.`
        : "Brouillon créé et envoyé sur ton email. Valide ici, par le lien reçu, ou réponds « ok envoi » sur WhatsApp.");
      setIntention("");
      charger();
    } catch (e) { setInfo(e?.message || "Échec de la génération."); }
    setBusy(false);
  };
  const action = async (fn, id) => {
    setBusy(true); setInfo(null);
    try {
      const r = await fn(id);
      if (r?.envoyes !== undefined) setInfo(`${r.envoyes} envoyé(s), ${r.echecs.length} échec(s).`);
      charger();
    } catch (e) { setInfo(e?.message || "Action impossible."); }
    setBusy(false);
  };
  const sauverCle = async () => {
    try { await enregistrerCleBrevo(cle); setCle({ api_key: "", sender_email: "" }); setInfo("Clé Brevo enregistrée (chiffrée)."); charger(); }
    catch (e) { setInfo(e?.message || "Clé refusée."); }
  };

  if (erreur) return <Carte><p className="text-red-400 text-sm">{erreur}</p></Carte>;
  if (!data) return <Carte><p className="text-offwhite/50 text-sm">Chargement…</p></Carte>;

  return (
    <div className="space-y-4">
      <Carte>
        <p className="text-offwhite/50 text-xs uppercase tracking-wide mb-1">Nouveau brouillon — {data.marque}</p>
        <p className="text-xs text-offwhite/50 mb-3">
          L'IA rédige, rien ne part sans ta validation. Envoi individuel : chaque destinataire ne voit que lui-même.
        </p>
        <textarea className={CHAMP} rows={3} value={intention} onChange={(e) => setIntention(e.target.value)}
          placeholder="Ce que tu veux dire, en langage naturel…" />
        <textarea className={`${CHAMP} mt-2`} rows={2} value={dest} onChange={(e) => setDest(e.target.value)}
          placeholder="Destinataires : colle une liste (virgules, points-virgules ou une adresse par ligne) — 50 max" />
        <label className="flex items-center gap-2 text-xs text-offwhite/60 mt-3 cursor-pointer">
          <input type="checkbox" checked={avecRecu} onChange={(e) => setAvecRecu(e.target.checked)} />
          Répondre à un email reçu (l'IA l'analyse et propose une réponse corrigée)
        </label>
        {avecRecu && (
          <div className="grid gap-2 mt-2">
            <input className={CHAMP} placeholder="Expéditeur" value={recu.expediteur} onChange={(e) => setRecu({ ...recu, expediteur: e.target.value })} />
            <input className={CHAMP} placeholder="Objet reçu" value={recu.sujet} onChange={(e) => setRecu({ ...recu, sujet: e.target.value })} />
            <textarea className={CHAMP} rows={4} placeholder="Colle ici le contenu de l'email reçu" value={recu.corps} onChange={(e) => setRecu({ ...recu, corps: e.target.value })} />
          </div>
        )}
        <div className="mt-3 flex items-center gap-3">
          <button className={`${BTN} bg-gold text-navy`} disabled={busy || intention.trim().length < 3 || !dest.trim()} onClick={generer}>
            {busy ? "Génération…" : "Générer le brouillon"}
          </button>
          <span className="text-xs text-offwhite/40">
            Envoi via clé Brevo : {data.brevo.configuree ? `${data.brevo.source} (${data.brevo.expediteur})` : "aucune — ajoute-la ci-dessous"}
          </span>
        </div>
        {info && <p className="text-sm text-offwhite/80 mt-3">{info}</p>}
      </Carte>

      <Carte>
        <p className="text-offwhite/50 text-xs uppercase tracking-wide mb-3">Historique ({data.brouillons.length})</p>
        <div className="space-y-2">
          {data.brouillons.length === 0 && <p className="text-sm text-offwhite/40">Aucun email pour le moment.</p>}
          {data.brouillons.map((d) => {
            const [lib, cls] = STATUTS[d.statut] || [d.statut, "bg-white/10"];
            return (
              <div key={d.id} className="rounded-lg border border-white/10 p-3">
                <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => setOuvert(ouvert === d.id ? null : d.id)}>
                  <div className="min-w-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs mr-2 ${cls}`}>{lib}</span>
                    <span className="text-sm font-medium">{d.sujet}</span>
                    <span className="text-xs text-offwhite/40 ml-2">{d.destinataires.length} destinataire(s)</span>
                  </div>
                  {d.statut === "brouillon" && (
                    <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button className={`${BTN} bg-emerald-500 text-white`} disabled={busy} onClick={() => action(envoyerBrouillonEmailIA, d.id)}>Valider et envoyer</button>
                      <button className={`${BTN} bg-white/10`} disabled={busy} onClick={() => action(annulerBrouillonEmailIA, d.id)}>Annuler</button>
                    </div>
                  )}
                </div>
                {ouvert === d.id && (
                  <div className="mt-3 space-y-2">
                    {d.analyse && <p className="text-xs text-offwhite/60 border-l-2 border-gold pl-2">Analyse IA : {d.analyse}</p>}
                    <div className="rounded-lg bg-white text-black p-3 text-sm overflow-x-auto" dangerouslySetInnerHTML={{ __html: d.html }} />
                    <p className="text-xs text-offwhite/40 break-words">→ {d.destinataires.join(", ")}</p>
                    {d.resultat?.echecs?.length > 0 && (
                      <p className="text-xs text-red-300">Échecs : {d.resultat.echecs.map((x) => `${x.email} (${x.erreur})`).join(" · ")}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Carte>

      <Carte>
        <p className="text-offwhite/50 text-xs uppercase tracking-wide mb-2">Clé Brevo de ce compte (optionnel)</p>
        <p className="text-xs text-offwhite/40 mb-2">Sans clé enregistrée, l'envoi utilise la clé plateforme. La clé est chiffrée et jamais réaffichée.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={CHAMP} type="password" placeholder="Clé API Brevo" value={cle.api_key} onChange={(e) => setCle({ ...cle, api_key: e.target.value })} />
          <input className={CHAMP} placeholder="Email expéditeur validé sur Brevo" value={cle.sender_email} onChange={(e) => setCle({ ...cle, sender_email: e.target.value })} />
        </div>
        <button className={`${BTN} bg-white/10 mt-3`} disabled={cle.api_key.length < 20} onClick={sauverCle}>Enregistrer la clé</button>
      </Carte>
    </div>
  );
}
