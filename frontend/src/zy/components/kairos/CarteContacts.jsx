import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Mail, HeartHandshake, Sheet, FileSpreadsheet, Zap, Ban, ExternalLink, AlertTriangle, Send } from "lucide-react";
import { call } from "@/zy/lib/part2Api";

// « Où vont tes contacts » : Zayado relie, il ne stocke pas.
// Les inscrits de tes tunnels partent tout de suite dans TON outil (Brevo, HubSpot, ton classeur, Make).
// Zayado garde seulement le fil : le Radar et une relance par jour dans le Plan d'action.

const OPTIONS = [
  { id: "brevo", nom: "Brevo", Icone: Mail, sous: "Contact créé ou mis à jour, dans ta liste si tu en donnes une.",
    champs: [{ cle: "api_key", label: "Clé API Brevo", type: "password", aide: "Brevo › ton profil › SMTP & API › Clés API" },
             { cle: "liste_id", label: "ID de la liste (facultatif)", type: "text", aide: "Brevo › Contacts › Listes : le numéro de la liste" }] },
  { id: "hubspot", nom: "HubSpot", Icone: HeartHandshake, sous: "Contact créé (ou mis à jour) comme prospect.",
    champs: [{ cle: "access_token", label: "Jeton d'application privée", type: "password", aide: "HubSpot › Paramètres › Intégrations › Applications privées (droit crm.objects.contacts.write)" }] },
  { id: "google-sheets", nom: "Google Sheets", Icone: Sheet, sous: "Un classeur « Zayado — Contacts » dans ton Google Drive, une ligne par demande.", cloud: "Google Drive" },
  { id: "excel", nom: "Excel (OneDrive)", Icone: FileSpreadsheet, sous: "Le même classeur, en Excel, dans ton OneDrive.", cloud: "OneDrive" },
  { id: "make", nom: "Un autre outil (Make)", Icone: Zap, sous: "Ton scénario Make reçoit l'événement « contact_tunnel » : Pipedrive, Notion, Airtable…",
    champs: [{ cle: "url", label: "Adresse du webhook Make", type: "text", aide: "Commence par https://hook.eu1.make.com/" }] },
  { id: "aucun", nom: "Rester dans Zayado", Icone: Ban, sous: "Tes contacts restent dans le Radar, rien ne sort." },
];
const PROVIDER = { brevo: "brevo", hubspot: "hubspot", make: "make" };

const depuis = (iso) => {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (min < 1440) return `il y a ${Math.round(min / 60)} h`;
  return `le ${new Date(iso).toLocaleDateString("fr-FR")}`;
};

export default function CarteContacts() {
  const [r, setR] = useState(null);
  const [ouvert, setOuvert] = useState(null);
  const [valeurs, setValeurs] = useState({});
  const [envoi, setEnvoi] = useState("");

  const charger = () => call("/crm/reglages").then(setR).catch(() => setR({ cible: "aucun", disponibles: { aucun: true } }));
  useEffect(() => { charger(); }, []);

  const choisir = async (id) => {
    setEnvoi(id);
    try {
      const o = OPTIONS.find((x) => x.id === id);
      if (o.champs && !r.disponibles?.[id]) {
        await call(`/connections/${PROVIDER[id]}`, "POST", { values: valeurs });
      }
      const n = await call("/crm/reglages", "PUT", { cible: id });
      setR(n); setOuvert(null); setValeurs({});
      toast.success(id === "aucun" ? "Tes contacts restent dans Zayado." : `C'est fait : tes nouveaux inscrits partent dans ${o.nom}.`);
    } catch (e) { toast.error(e?.message || "Impossible pour le moment."); }
    setEnvoi("");
  };
  const toutEnvoyer = async () => {
    setEnvoi("tout");
    try { const x = await call("/crm/envoyer-tout", "POST"); toast.success(`${x.envoyes} contact${x.envoyes > 1 ? "s" : ""} envoyé${x.envoyes > 1 ? "s" : ""} sur ${x.total}.`); charger(); }
    catch (e) { toast.error(e?.message || "Envoi impossible."); }
    setEnvoi("");
  };

  if (!r) return <p className="text-sm text-offwhite/50">Chargement…</p>;
  const actuel = OPTIONS.find((o) => o.id === r.cible) || OPTIONS[OPTIONS.length - 1];

  return (
    <div data-testid="carte-contacts">
      <div className={`mb-3 rounded-xl border px-3 py-2.5 text-sm ${r.derniere_erreur ? "border-amber-400/30 bg-amber-400/[0.06]" : "border-white/10 bg-white/[0.04]"}`}>
        <p className="font-medium text-offwhite">
          Tes inscrits partent dans : <strong>{actuel.nom}</strong>
          {r.cible !== "aucun" && r.envoyes ? <span className="font-normal text-offwhite/55"> · {r.envoyes} envoyé{r.envoyes > 1 ? "s" : ""}{r.dernier_envoi ? `, dernier ${depuis(r.dernier_envoi)}` : ""}</span> : null}
        </p>
        {r.derniere_erreur ? <p className="mt-1 flex items-start gap-1.5 text-[12px] text-amber-200"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> {r.derniere_erreur}</p> : null}
        {r.fichier_url && ["google-sheets", "excel"].includes(r.cible)
          ? <a href={r.fichier_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] text-offwhite/75 underline underline-offset-2">Ouvrir le classeur <ExternalLink size={11} /></a> : null}
      </div>

      <div className="divide-y divide-white/[0.07]">
        {OPTIONS.map((o) => {
          const choisi = r.cible === o.id;
          const relie = !!r.disponibles?.[o.id];
          const formulaire = ouvert === o.id && o.champs && !relie;
          return (
            <div key={o.id} className="py-3">
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${choisi ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.06] text-offwhite/60"}`}><o.Icone size={17} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-offwhite">{o.nom}</p>
                  <p className="text-[12px] leading-snug text-offwhite/55">{o.cloud && !relie ? `Relie d'abord ${o.cloud} juste au-dessus.` : o.sous}</p>
                </div>
                {choisi
                  ? <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 px-2.5 py-1 text-[12px] text-emerald-300"><Check size={12} /> Choisi</span>
                  : <button type="button" disabled={!!envoi || (o.cloud && !relie)} data-testid={`contacts-${o.id}`}
                      onClick={() => (o.champs && !relie ? setOuvert(ouvert === o.id ? null : o.id) : choisir(o.id))}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-[12px] font-semibold text-offwhite hover:bg-white/10 disabled:opacity-40">
                      {envoi === o.id ? <Loader2 size={13} className="animate-spin" /> : o.champs && !relie ? "Relier" : "Choisir"}
                    </button>}
              </div>
              {formulaire ? (
                <form className="mt-3 space-y-2 pl-12" onSubmit={(e) => { e.preventDefault(); choisir(o.id); }}>
                  {o.champs.map((c) => (
                    <label key={c.cle} className="block">
                      <span className="mb-1 block text-[12px] text-offwhite/70">{c.label}</span>
                      <input type={c.type} autoComplete="off" value={valeurs[c.cle] || ""} onChange={(e) => setValeurs({ ...valeurs, [c.cle]: e.target.value })}
                        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-offwhite" />
                      <span className="mt-0.5 block text-[11px] text-offwhite/45">{c.aide}</span>
                    </label>
                  ))}
                  <button type="submit" disabled={!!envoi} className="btn-principal">{envoi === o.id ? <Loader2 size={14} className="animate-spin" /> : null} Relier et choisir {o.nom}</button>
                  <p className="text-[11px] text-offwhite/45">Chiffré sur nos serveurs, jamais affiché ni partagé.</p>
                </form>
              ) : null}
            </div>
          );
        })}
      </div>

      {r.cible !== "aucun" ? (
        <button type="button" onClick={toutEnvoyer} disabled={!!envoi} className="btn-secondaire mt-3" data-testid="contacts-tout-envoyer">
          {envoi === "tout" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Envoyer aussi les contacts déjà reçus
        </button>
      ) : null}
    </div>
  );
}
