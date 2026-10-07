import React, { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Loader2, Copy, Check, ListPlus, EyeOff, CornerDownRight, ExternalLink, Facebook,
} from "lucide-react";
import { Ok } from "@/components/kairos/Ok";
import { creerTache } from "@/lib/kairosApi";

/* ═══════════════════════════════════════════════════════════════════
   La réponse au signal — l'annonce, collée au mot-clé qui la justifie.

   Ce bloc vit SOUS le tableau des recherches, dans l'onglet « Signaux ».
   Il n'a pas d'onglet à lui : en faire un quatrième onglet séparait la
   preuve de la proposition, alors que c'est justement leur voisinage qui
   fait la différence entre un radar et un générateur de contenu. On ne
   génère pas une annonce « parce qu'on sait le faire » : on répond à une
   demande mesurée, affichée juste au-dessus.

   Et « Valider » ne publie pas — Zayado n'a pas la main sur le compte
   publicitaire. Le Radar décide, le Plan d'action fait : valider dépose
   une action, qui garde la trace du signal d'origine.
   ═══════════════════════════════════════════════════════════════════ */

const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("fr-FR"));
const euro = (n) => (n == null ? "—" : `${Number(n).toFixed(2).replace(".", ",")} €`);

function Tendance({ v }) {
  // La tendance arrive soit en pourcentage, soit déjà en flèche selon la source.
  const n = typeof v === "number" ? v : null;
  const haut = n != null ? n > 5 : v === "↗";
  const bas = n != null ? n < -5 : v === "↘";
  const c = haut ? "#5DCAA5" : bas ? "#E8907F" : "rgba(255,255,255,.38)";
  return <span style={{ color: c }}>{haut ? "↗" : bas ? "↘" : "→"}</span>;
}

function LaReponse({ c, signalTop, volumeTop, motTop }) {
  const navigate = useNavigate();
  const [canal, setCanal] = useState("meta");
  const [posee, setPosee] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [ecarte, setEcarte] = useState(false);
  const meta = c?.meta || {};
  const cib = meta.ciblage || {};

  const texteComplet = [
    meta.texte, meta.titre && `Titre : ${meta.titre}`, meta.description && `Description : ${meta.description}`,
    meta.cta && `Bouton : ${meta.cta}`,
    `Ciblage : ${c?.ville ? c.ville + " + " : ""}${cib.rayon_km || 10} km, ${cib.age_min || 25}-${cib.age_max || 65} ans`,
    `Budget : ${meta.budget_jour || 5} €/jour pendant ${meta.duree_jours || 7} jours`,
  ].filter(Boolean).join("\n");

  // On ne publie PAS à la place de l'utilisateur : Zayado n'a pas la main sur
  // son compte publicitaire, et un bouton « Publier » qui ne publie rien est
  // pire que pas de bouton. Valider dépose l'annonce dans le Plan d'action,
  // texte prêt à coller — c'est la même promesse, tenable.
  const valider = async () => {
    if (posee || envoi) return;
    setEnvoi(true);
    try {
      await creerTache(
        `Publier l'annonce « ${meta.titre || signalTop || "pub locale"} »`, 20, null,
        "radar",
        signalTop ? `Signal : « ${signalTop} »${volumeTop ? ` — ${volumeTop} recherches/mois` : ""}` : "Signal du Radar");
      setPosee(true);
      toast.success("Dans ton Plan d'action", {
        description: "Le texte de l'annonce est copiable ici quand tu la lanceras.",
        action: { label: "Ouvrir", onClick: () => navigate("/app/actions?tab=actions") },
      });
    } catch { toast.error("Impossible de l'ajouter pour l'instant."); }
    finally { setEnvoi(false); }
  };

  if (ecarte) {
    return (
      <Ok data-testid="radar-reponse-ecartee">
        <p className="ok-lab">Signal écarté</p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-offwhite/70">
          Entendu, ce n'est pas pour toi. Je garde la mesure et je te reproposerai autre chose au prochain scan.
        </p>
        <button onClick={() => setEcarte(false)} className="mt-4 text-[12.5px] font-semibold text-gold hover:underline">Revoir cette proposition</button>
      </Ok>
    );
  }

  return (
    <Ok data-testid="radar-la-reponse">
      {motTop?.mot && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border px-3.5 py-2.5"
          style={{ background: "rgba(93,202,165,.08)", borderColor: "rgba(93,202,165,.2)" }}>
          <span className="mt-0.5 shrink-0" style={{ color: "#5DCAA5" }}><CornerDownRight size={14} /></span>
          <p className="text-[12.5px] leading-relaxed text-offwhite/70">
            Réponse à <b className="text-offwhite">« {motTop.mot} »</b>
            {motTop.volume ? <> — {fmt(motTop.volume)} recherches/mois, à gauche</> : null}.
            Sans demande mesurée, rien ne s'affiche ici.
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ok-lab">La réponse · prête à publier</p>
          <p className="mt-1.5 font-display text-[18px] font-semibold">
            {canal === "meta" ? "Annonce Facebook / Instagram" : "Post sur ta fiche Google"}
          </p>
        </div>
        <div className="flex gap-1.5">
          {[["meta", "Meta"], ["google", "Google"]].map(([k, l]) => (
            <button key={k} onClick={() => setCanal(k)} data-testid={`radar-reponse-${k}`}
              className="ok-chip px-3 py-1.5"
              style={canal === k ? { background: "#DEC2A3", color: "#0A1128" } : { background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.62)" }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {canal === "meta" ? (
        <div className="mt-4 overflow-hidden rounded-[15px] bg-white text-[#1b1f28]" data-testid="radar-apercu-meta">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#0B1F3A] font-display text-sm text-[#DEC2A3]">Z</span>
            <div><p className="text-[13.5px] font-bold">{c?.nom_page || "Ta page"}</p><p className="text-[11.5px] text-[#6b7280]">Sponsorisé</p></div>
          </div>
          <p className="whitespace-pre-line px-4 pb-3.5 text-[13px] leading-relaxed text-[#374151]">{meta.texte}</p>
          <div className="grid h-[104px] place-items-center text-[12px] text-[#8b97a8]" style={{ background: "linear-gradient(135deg,#e8eef7,#d6e0ee)" }}>
            {meta.visuel || "Visuel à venir"}
          </div>
          <div className="flex items-center justify-between gap-3 bg-[#f3f5f9] px-4 py-3.5">
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-bold">{meta.titre}</p>
              <p className="truncate text-[11.5px] text-[#6b7280]">{meta.description}</p>
            </div>
            <span className="shrink-0 rounded-lg bg-[#1b1f28] px-3.5 py-2 text-[11.5px] font-semibold text-white">{meta.cta || "En savoir plus"}</span>
          </div>
        </div>
      ) : (
        <p className="mt-4 whitespace-pre-line rounded-[15px] border border-white/10 bg-white/[0.05] p-4 text-[14px] leading-relaxed text-offwhite/85" data-testid="radar-apercu-google">
          {c?.post_google || "Pas encore de post généré pour ta fiche Google."}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="ok-lab">Ciblage conseillé</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-offwhite/62">
            {c?.ville ? `${c.ville} + ` : ""}{cib.rayon_km || 10} km · {cib.age_min || 25}–{cib.age_max || 65} ans
            {(cib.interets || []).length > 0 && <> · {cib.interets.join(", ")}</>}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="ok-lab">Budget test</p>
          <p className="mt-1 font-display text-[22px] font-semibold">{meta.budget_jour || 5} € / jour</p>
          <p className="mt-0.5 text-[11.5px] text-offwhite/38">pendant {meta.duree_jours || 7} jours ≈ {(meta.budget_jour || 5) * (meta.duree_jours || 7)} €</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={valider} disabled={posee || envoi} data-testid="radar-reponse-valider"
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${posee
            ? "cursor-default border border-emerald-400/35 bg-emerald-400/10 text-emerald-300"
            : "bg-gold text-navy-900 hover:bg-gold-hover disabled:opacity-60"}`}>
          {posee ? <><Check size={13} /> Dans ton plan</> : envoi ? <><Loader2 size={13} className="animate-spin" /> Ajout…</> : <><ListPlus size={13} /> Valider cette annonce</>}
        </button>
        <button onClick={() => { navigator.clipboard?.writeText(texteComplet); toast.success("Annonce copiée"); }}
          data-testid="radar-reponse-copier"
          className="inline-flex items-center gap-2 rounded-full border border-white/18 px-4 py-2 text-xs font-semibold text-offwhite/80 hover:bg-white/10">
          <Copy size={13} /> Copier le texte
        </button>
        <a href="https://adsmanager.facebook.com/adsmanager/manage/campaigns" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/18 px-4 py-2 text-xs font-semibold text-offwhite/80 hover:bg-white/10">
          <Facebook size={13} /> Ouvrir mon gestionnaire de pub <ExternalLink size={11} />
        </a>
        <button onClick={() => setEcarte(true)} data-testid="radar-reponse-ecarter"
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-offwhite/45 hover:text-offwhite/80">
          <EyeOff size={13} /> Écarter ce signal
        </button>
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-offwhite/38">
        Zayado n'a pas la main sur ton compte publicitaire : « Valider » dépose l'annonce dans ton Plan d'action,
        texte prêt à coller. C'est toi qui appuies sur publier.
      </p>
    </Ok>
  );
}

/** Le bloc « réponse au signal », à poser EN FACE du tableau des recherches. */
export default function ReponseAuSignal({ contenus, recherches }) {
  const c = contenus;
  if (!c) return null;
  const top = (recherches?.mots || [])[0];
  return <LaReponse c={c} signalTop={top?.mot} volumeTop={top?.volume} motTop={top} />;
}
