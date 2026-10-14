import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Check } from "lucide-react";
import { fetchTemoignagePublic, envoyerTemoignagePublic } from "@/zy/lib/kairosApi";
import { useNoIndex } from "@/zy/lib/noindex";

// Formulaire de témoignage ouvert par un lien personnel (e-mail, WhatsApp).
// Le client écrit lui-même, choisit comment il est nommé, et donne ou non son accord de publication.

const CHAMP = "w-full rounded-2xl border border-[#0D1F38]/15 bg-white px-4 py-3 text-[15px] text-[#0D1F38] placeholder:text-[#8FA3B8] focus:border-[#2E4A6B] focus:outline-none focus:ring-2 focus:ring-[#2E4A6B]/15";

export default function TemoignagePublic() {
  useNoIndex();
  const { jeton } = useParams();
  const [etat, setEtat] = useState("chargement"); // chargement | form | merci | invalide
  const [prenom, setPrenom] = useState("");
  const [f, setF] = useState({ texte: "", nom_affiche: "", activite: "", accord_publication: true, accord_nom: true });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    document.title = "Votre avis · Zayado";
    fetchTemoignagePublic(jeton)
      .then((d) => {
        setPrenom(d.prenom || "");
        setF((x) => ({ ...x, texte: d.texte || "", nom_affiche: d.nom_affiche || d.prenom || "", activite: d.activite || "" }));
        setEtat("form");
      })
      .catch(() => setEtat("invalide"));
  }, [jeton]);

  const envoyer = async (e) => {
    e.preventDefault();
    setErreur("");
    if (f.texte.trim().length < 30) { setErreur("Quelques phrases suffisent, mais au moins une trentaine de caractères."); return; }
    setEnvoi(true);
    try { await envoyerTemoignagePublic(jeton, f); setEtat("merci"); }
    catch (err) { setErreur(err?.message || "L'envoi n'a pas abouti. Réessayez dans un instant."); }
    setEnvoi(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] px-4 py-10 font-sans text-[#0D1F38] sm:py-16" style={{ fontFamily: "Poppins, system-ui, sans-serif" }}>
      <main className="mx-auto w-full max-w-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#B08A4A]">Zayado · la maison des entrepreneurs apaisés</p>

        {etat === "chargement" ? <p className="mt-10 flex items-center gap-2 text-sm text-[#2E4A6B]"><Loader2 size={16} className="animate-spin" /> Un instant…</p> : null}

        {etat === "invalide" ? (
          <div className="mt-8">
            <h1 className="text-3xl font-semibold leading-tight">Ce lien n'est plus valable.</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#2E4A6B]">Écrivez-nous à <a className="underline underline-offset-2" href="mailto:contact@zayado.net">contact@zayado.net</a>, nous vous renverrons un lien.</p>
          </div>
        ) : null}

        {etat === "merci" ? (
          <div className="mt-8" data-testid="temoignage-merci">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-[#0D1F38] text-[#F4EFE6]"><Check size={22} /></span>
            <h1 className="mt-5 text-3xl font-semibold leading-tight">Merci{prenom ? ` ${prenom}` : ""}, <span className="font-hand mr-1 text-[1.2em] text-[#B08A4A]" style={{ fontFamily: "Caveat, cursive" }}>vraiment.</span>{" "}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#2E4A6B]">
              {f.accord_publication ? "Nous relisons votre message avant toute publication. Vous pouvez retirer votre accord à tout moment en nous écrivant." : "Votre message reste entre nous : il nous aide à faire mieux."}
            </p>
          </div>
        ) : null}

        {etat === "form" ? (
          <form onSubmit={envoyer} className="mt-6" data-testid="temoignage-form">
            <h1 className="text-[30px] font-semibold leading-tight tracking-tight sm:text-4xl">
              {prenom ? `${prenom}, qu'est-ce` : "Qu'est-ce"} qui a <span className="font-hand mr-1 text-[1.2em] text-[#B08A4A]" style={{ fontFamily: "Caveat, cursive" }}>changé</span>{" "}pour vous ?
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#2E4A6B]">Deux ou trois phrases, avec vos mots. Ce qui était difficile avant, ce qui va mieux maintenant.</p>

            <label className="mt-6 block">
              <span className="sr-only">Votre témoignage</span>
              <textarea rows={6} maxLength={1500} className={CHAMP} value={f.texte} onChange={(e) => setF({ ...f, texte: e.target.value })}
                placeholder="Avant, je… Aujourd'hui, je…" data-testid="temoignage-texte" />
            </label>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block"><span className="mb-1.5 block text-[13px] font-medium">Nom affiché</span>
                <input className={CHAMP} value={f.nom_affiche} maxLength={80} onChange={(e) => setF({ ...f, nom_affiche: e.target.value })} placeholder="Claire M." required /></label>
              <label className="block"><span className="mb-1.5 block text-[13px] font-medium">Votre activité <span className="text-[#8FA3B8]">(facultatif)</span></span>
                <input className={CHAMP} value={f.activite} maxLength={120} onChange={(e) => setF({ ...f, activite: e.target.value })} placeholder="Fleuriste à Lyon" /></label>
            </div>

            <fieldset className="mt-5 space-y-3 rounded-2xl bg-[#F6F5F2] p-4">
              <legend className="sr-only">Vos accords</legend>
              <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-snug">
                <input type="checkbox" className="mt-0.5 size-5 flex-none accent-[#0D1F38]" checked={f.accord_publication} onChange={(e) => setF({ ...f, accord_publication: e.target.checked })} />
                <span>J'accepte que Zayado publie ce témoignage (site, Journal, réseaux sociaux). Je peux retirer mon accord à tout moment.</span>
              </label>
              <label className={`flex cursor-pointer items-start gap-3 text-[14px] leading-snug ${f.accord_publication ? "" : "opacity-40"}`}>
                <input type="checkbox" disabled={!f.accord_publication} className="mt-0.5 size-5 flex-none accent-[#0D1F38]" checked={f.accord_nom} onChange={(e) => setF({ ...f, accord_nom: e.target.checked })} />
                <span>Afficher mon nom et mon activité. <span className="text-[#5B6B80]">Sinon : « Un client Zayado ».</span></span>
              </label>
            </fieldset>

            {erreur ? <p className="mt-3 text-sm text-[#B42318]" role="alert">{erreur}</p> : null}

            <button type="submit" disabled={envoi} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0D1F38] px-6 text-[15px] font-semibold text-[#FDFCF8] shadow-[0_10px_30px_rgba(13,31,56,.18)] transition hover:-translate-y-0.5 disabled:opacity-60 sm:w-auto" data-testid="temoignage-envoyer">
              {envoi ? <Loader2 size={16} className="animate-spin" /> : null} Envoyer mon témoignage
            </button>
            <p className="mt-3 text-[12px] text-[#8FA3B8]">Rien n'est publié sans relecture. Vos coordonnées ne sont jamais affichées.</p>
          </form>
        ) : null}
      </main>
    </div>
  );
}
