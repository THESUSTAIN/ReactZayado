import React, { useCallback, useEffect, useState } from "react";
import { MessageSquareQuote, Mail, MessageCircle, Link2, Loader2, Copy, Store, Trash2, Check, X, Zap, Play } from "lucide-react";
import { toast } from "sonner";
import {
  fetchTemoignages, demanderTemoignage, majTemoignage, supprimerTemoignage, temoignageVersShopify, temoignagesAuto, temoignagesTour,
} from "@/zy/lib/kairosApi";

// Admin › Témoignages : demander, recevoir, valider, publier.
// Jamais de témoignage inventé : seul un texte écrit par le client, avec son accord, peut être publié.

const Carte = ({ children, className = "" }) => <section className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${className}`}>{children}</section>;
const CHAMP = "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-offwhite placeholder:text-offwhite/30 focus:border-[#DEC2A3]/60 focus:outline-none";
const BTN = "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50";
const BTN_PLEIN = `${BTN} admin-btn-plein`;
const BTN_LIGNE = `${BTN} border border-white/15 hover:border-[#DEC2A3]/60`;

const STATUTS = {
  demande: ["Demandé", "bg-white/10 text-offwhite/70"], recu: ["À valider", "bg-amber-500/15 text-amber-200"],
  valide: ["Validé", "bg-sky-500/15 text-sky-300"], publie: ["Publié", "bg-emerald-500/15 text-emerald-300"], refuse: ["Écarté", "bg-white/5 text-offwhite/40"],
};
const FILTRES = [["", "Tous"], ["recu", "À valider"], ["demande", "Demandés"], ["valide", "Validés"], ["publie", "Publiés"]];
const Badge = ({ s }) => { const [l, c] = STATUTS[s] || [s, ""]; return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c}`}>{l}</span>; };
const CANAUX = [["email", "E-mail", Mail], ["whatsapp", "WhatsApp", MessageCircle], ["lien", "Lien à copier", Link2]];

export default function AdminTemoignages() {
  const [donnees, setDonnees] = useState(null);
  const [filtre, setFiltre] = useState("");
  const [form, setForm] = useState({ prenom: "", email: "", telephone: "", contexte: "", canal: "email" });
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState(null);

  const charger = useCallback(() => { fetchTemoignages(filtre).then(setDonnees).catch(() => setDonnees({ temoignages: [], auto: false })); }, [filtre]);
  useEffect(() => { charger(); }, [charger]);

  const copier = async (t, quoi = "Copié") => { try { await navigator.clipboard.writeText(t); toast.success(quoi); } catch { toast.error("Copie impossible."); } };

  const demander = async () => {
    setEnvoi(true); setResultat(null);
    try {
      const r = await demanderTemoignage(form);
      setResultat(r);
      if (form.canal === "email") toast.success(`Demande envoyée à ${form.email}.`);
      if (form.canal === "whatsapp" && r.whatsapp) window.open(r.whatsapp, "_blank", "noopener");
      setForm({ prenom: "", email: "", telephone: "", contexte: "", canal: form.canal });
      charger();
    } catch (e) { toast.error(e?.message || "Demande impossible."); }
    setEnvoi(false);
  };
  const statut = async (t, s) => { try { await majTemoignage(t.id, { statut: s }); charger(); } catch (e) { toast.error(e?.message || "Échec."); } };
  const shopify = async (t) => {
    try { await temoignageVersShopify(t.id); toast.success("Créé en brouillon dans le Journal Shopify (étiquette « temoignage »)."); charger(); }
    catch (e) { toast.error(e?.message || "Shopify indisponible."); }
  };
  const basculerAuto = async () => {
    try { const r = await temoignagesAuto(!donnees.auto); setDonnees((d) => ({ ...d, auto: r.auto })); toast.success(r.auto ? "Demandes automatiques activées." : "Demandes automatiques coupées."); }
    catch (e) { toast.error(e?.message || "Échec."); }
  };
  const lancerTour = async () => {
    try { const r = await temoignagesTour(); toast.success(r.envoyes ? `${r.envoyes} demande(s) envoyée(s).` : "Personne à solliciter pour l'instant."); charger(); }
    catch (e) { toast.error(e?.message || "Échec."); }
  };

  const valideForm = form.canal === "email" ? form.email.includes("@") : form.canal === "whatsapp" ? form.telephone.replace(/\D/g, "").length >= 9 : true;

  return (
    <div className="max-w-4xl space-y-4" data-testid="admin-temoignages">
      <Carte>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold"><Zap size={15} className="text-[#DEC2A3]" /> Demandes automatiques</p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-offwhite/55">
              Un client abonné depuis 45 jours qui a noté 3 victoires, ou dont l'accompagnement payé date de 14 jours, reçoit une seule demande par e-mail. 20 envois par jour au plus, jamais deux fois la même personne.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {donnees?.auto ? <button type="button" onClick={lancerTour} className={BTN_LIGNE} title="Chercher tout de suite"><Play size={12} /> Lancer</button> : null}
            <button type="button" role="switch" aria-checked={!!donnees?.auto} onClick={basculerAuto} disabled={!donnees} data-testid="temoignages-auto"
              className={`relative h-7 w-12 rounded-full transition-colors ${donnees?.auto ? "bg-emerald-400/80" : "bg-white/15"}`}>
              <span className={`absolute top-1 size-5 rounded-full bg-white transition-all ${donnees?.auto ? "left-6" : "left-1"}`} />
              <span className="sr-only">Demandes automatiques</span>
            </button>
          </div>
        </div>
      </Carte>

      <Carte>
        <p className="mb-1 flex items-center gap-2 text-sm font-semibold"><MessageSquareQuote size={15} className="text-[#DEC2A3]" /> Demander un témoignage</p>
        <p className="mb-4 text-xs text-offwhite/55">Le client reçoit un lien personnel : il écrit lui-même, choisit comment il est nommé et donne (ou non) son accord de publication.</p>
        <div className="mb-3 inline-flex flex-wrap gap-1 rounded-full border border-white/10 p-0.5 text-xs">
          {CANAUX.map(([k, l, Ic]) => (
            <button key={k} type="button" onClick={() => setForm({ ...form, canal: k })} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 ${form.canal === k ? "bg-white/10 font-semibold" : "opacity-60"}`}><Ic size={12} /> {l}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <input className={CHAMP} placeholder="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
          {form.canal === "whatsapp"
            ? <input className={CHAMP} inputMode="tel" placeholder="Téléphone (06… ou +33…)" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            : <input className={CHAMP} type="email" placeholder={form.canal === "email" ? "E-mail" : "E-mail (facultatif)"} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
        </div>
        <input className={`${CHAMP} mt-2`} placeholder="Ce qu'il a réussi (facultatif) : « votre reprise signée », « vos premiers clients »" value={form.contexte} onChange={(e) => setForm({ ...form, contexte: e.target.value })} />
        {form.canal === "whatsapp" ? <p className="mt-2 text-[11px] text-offwhite/45">WhatsApp s'ouvre avec le message prêt : vous l'envoyez depuis votre téléphone (l'envoi automatique demanderait l'API WhatsApp Business payante).</p> : null}
        <button type="button" onClick={demander} disabled={envoi || !valideForm} className={`${BTN_PLEIN} mt-3`} data-testid="temoignages-demander">
          {envoi ? <Loader2 size={13} className="animate-spin" /> : null}
          {form.canal === "email" ? "Envoyer la demande" : form.canal === "whatsapp" ? "Préparer le message WhatsApp" : "Créer le lien"}
        </button>
        {resultat ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
            <p className="mb-2 break-all text-offwhite/70">{resultat.lien}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => copier(resultat.lien, "Lien copié.")} className={BTN_LIGNE}><Copy size={12} /> Copier le lien</button>
              <button type="button" onClick={() => copier(resultat.message, "Message copié.")} className={BTN_LIGNE}><Copy size={12} /> Copier le message</button>
            </div>
          </div>
        ) : null}
      </Carte>

      <Carte>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Témoignages</p>
          <div className="flex flex-wrap gap-1 text-xs">
            {FILTRES.map(([k, l]) => <button key={k} type="button" onClick={() => setFiltre(k)} className={`rounded-full px-3 py-1 ${filtre === k ? "bg-white/10 font-semibold" : "opacity-60 hover:opacity-100"}`}>{l}</button>)}
          </div>
        </div>
        {!donnees ? <p className="text-xs text-offwhite/50">Chargement…</p> : donnees.temoignages.length === 0 ? (
          <p className="text-xs text-offwhite/50">Rien ici pour l'instant.</p>
        ) : (
          <ul className="space-y-3">
            {donnees.temoignages.map((t) => (
              <li key={t.id} className="rounded-xl border border-white/[0.07] p-4">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-offwhite/50">
                  <Badge s={t.statut} />
                  <span>{t.prenom || t.nom_affiche || t.email || "Client"}</span>
                  <span>· {t.canal === "auto" ? "automatique" : t.canal}</span>
                  {t.recu_le ? <span>· reçu le {new Date(t.recu_le).toLocaleDateString("fr-FR")}</span> : null}
                </div>
                {t.texte ? (
                  <>
                    <blockquote className="mt-2 border-l-2 border-[#DEC2A3] pl-3 text-sm leading-relaxed">« {t.texte} »</blockquote>
                    <p className="mt-1.5 text-xs text-offwhite/60">{t.accord_nom ? `${t.nom_affiche || ""}${t.activite ? `, ${t.activite}` : ""}` : `Anonyme${t.activite ? ` (${t.activite})` : ""}`}</p>
                    <p className={`mt-1 text-[11px] ${t.accord_publication ? "text-emerald-300/80" : "text-amber-300/80"}`}>{t.accord_publication ? "Accord de publication donné" : "Pas d'accord de publication : usage interne uniquement"}</p>
                  </>
                ) : <p className="mt-2 text-xs text-offwhite/45">En attente de réponse.{t.contexte ? ` Contexte : ${t.contexte}.` : ""}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {t.statut === "recu" && t.accord_publication ? <button type="button" onClick={() => statut(t, "valide")} className={BTN_PLEIN}><Check size={12} /> Valider</button> : null}
                  {t.statut === "recu" ? <button type="button" onClick={() => statut(t, "refuse")} className={BTN_LIGNE}><X size={12} /> Écarter</button> : null}
                  {t.statut === "valide" && donnees.shopify_pret ? <button type="button" onClick={() => shopify(t)} className={BTN_LIGNE}><Store size={12} /> Créer dans le Journal Shopify</button> : null}
                  {t.statut === "valide" ? <button type="button" onClick={() => statut(t, "publie")} className={BTN_LIGNE}><Check size={12} /> Marquer publié</button> : null}
                  {t.texte ? <button type="button" onClick={() => copier(`« ${t.texte} »\n${t.accord_nom ? t.nom_affiche || "" : "Un client Zayado"}${t.activite ? `, ${t.activite}` : ""}`, "Témoignage copié.")} className={BTN_LIGNE}><Copy size={12} /> Copier</button> : null}
                  {t.statut === "demande" ? <button type="button" onClick={() => copier(t.lien, "Lien copié.")} className={BTN_LIGNE}><Link2 size={12} /> Lien</button> : null}
                  <button type="button" onClick={async () => { if (window.confirm("Supprimer ?")) { await supprimerTemoignage(t.id); charger(); } }} aria-label="Supprimer" className="ml-auto rounded-lg p-2 text-offwhite/40 hover:bg-white/5 hover:text-red-300"><Trash2 size={14} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </div>
  );
}
