import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, Lightbulb, Lock, HeartHandshake, MailOpen, Send, CalendarClock, Hourglass } from "lucide-react";
import { fetchCarnet, supprimerEntreeCarnet, recadrerPensee, fetchLettres, scellerLettre, marquerLettreLue } from "@/lib/kairosApi";

// Onglet « Mon carnet » : l'outil « Une pensée qui bloque ? » et toutes tes réponses.
function Recadrage({ onAjout }) {
  const [pensee, setPensee] = useState("");
  const [res, setRes] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const envoyer = async (e) => {
    e.preventDefault();
    if (pensee.trim().length < 3) return;
    setEnvoi(true);
    try { const r = await recadrerPensee(pensee.trim()); setRes(r); if (!r.detresse) onAjout(); }
    catch { toast.error("Impossible pour le moment. Réessaie dans un instant."); }
    setEnvoi(false);
  };
  return (
    <div className="mb-8 rounded-[22px] border border-white/[0.16] bg-white/[0.10] p-5 backdrop-blur-xl sm:p-7" data-testid="mindset-recadrage">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold"><Lightbulb size={14} /> Une pensée qui bloque ?</p>
      <p className="mt-2 text-[14px] leading-relaxed text-offwhite/70">Écris-la telle qu'elle vient (« je vais déranger si je relance », « je suis trop cher »…). Zayado t'aide à la regarder avec un peu de recul.</p>
      <form onSubmit={envoyer} className="mt-4">
        <textarea rows={2} value={pensee} onChange={(e) => setPensee(e.target.value)} placeholder="La pensée qui me freine…" data-testid="mindset-pensee"
          className="w-full resize-y rounded-xl border border-white/[0.14] bg-white/[0.08] px-3.5 py-2.5 text-[14px] text-offwhite outline-none placeholder:text-offwhite/40 focus:border-gold/60" />
        <button disabled={envoi || pensee.trim().length < 3} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-gold px-5 text-[13px] font-semibold text-navy-900 disabled:opacity-50" data-testid="mindset-recadrer">
          {envoi && <Loader2 size={14} className="animate-spin" />} Prendre du recul
        </button>
      </form>
      {res?.detresse && (
        <div className="mt-5 flex gap-3 rounded-xl border border-rose-300/30 bg-rose-300/10 p-4 text-[14px] leading-relaxed text-offwhite/90" data-testid="mindset-detresse">
          <HeartHandshake size={20} className="mt-0.5 shrink-0 text-rose-200" /> <p>{res.message}</p>
        </div>
      )}
      {res && !res.detresse && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3" data-testid="mindset-recadrage-resultat">
          {[["Les faits", res.faits], ["Un autre regard", res.autre_regard], ["Ton petit pas", res.petit_pas]].map(([t, v]) => (
            <div key={t} className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">{t}</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-offwhite/85">{v}</p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-[11.5px] text-offwhite/45">Un outil de recul, pas un avis médical. Si ça pèse depuis longtemps, parles-en à un professionnel.</p>
    </div>
  );
}

export default function MindsetCarnet() {
  const [items, setItems] = useState(null);
  const charger = () => fetchCarnet().then((d) => setItems(d.items)).catch(() => setItems([]));
  useEffect(() => { charger(); }, []);
  const supprimer = async (id) => {
    if (!window.confirm("Supprimer cette entrée de ton carnet ?")) return;
    try { await supprimerEntreeCarnet(id); setItems((x) => x.filter((e) => e.id !== id)); } catch { toast.error("Suppression impossible"); }
  };
  const parJour = (items || []).reduce((acc, e) => { (acc[e.jour] = acc[e.jour] || []).push(e); return acc; }, {});

  return (
    <div data-testid="mindset-carnet">
      <LettreFutur />
      <Recadrage onAjout={charger} />
      <p className="mb-4 flex items-center gap-1.5 text-[12px] text-offwhite/50"><Lock size={13} /> Ton carnet est privé : personne d'autre ne le lit.</p>
      {items === null && <Loader2 size={18} className="animate-spin text-gold" />}
      {items?.length === 0 && <p className="text-[14px] text-offwhite/60">Ton carnet est vide pour l'instant. Tes réponses aux cartes du jour et aux parcours s'afficheront ici.</p>}
      <div className="space-y-6">
        {Object.entries(parJour).map(([jour, entrees]) => (
          <div key={jour}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-offwhite/50">
              {new Date(jour).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <div className="space-y-3">
              {entrees.map((e) => (
                <div key={e.id} className="group rounded-2xl border border-white/[0.12] bg-white/[0.06] p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <p className="flex-1 text-[15px] font-semibold text-offwhite">{e.titre}</p>
                    <button onClick={() => supprimer(e.id)} aria-label="Supprimer" className="rounded-lg p-1.5 text-offwhite/40 hover:bg-white/10 hover:text-rose-300"><Trash2 size={14} /></button>
                  </div>
                  <dl className="mt-2 space-y-2">
                    {(e.reponses || []).filter((r) => r.reponse).map((r, i) => (
                      <div key={i}>
                        <dt className="text-[12px] text-offwhite/55">{r.question}</dt>
                        <dd className="text-[14px] leading-relaxed text-offwhite/90">{r.reponse}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** « Lettre à ton futur moi » — tu écris aujourd'hui, la lettre reste scellée
    jusqu'à la date choisie (90 jours par défaut). Le jour venu, la cloche de
    l'en-tête annonce qu'elle est prête : relire où tu en étais, c'est souvent
    le meilleur carburant pour continuer. Une seule lettre scellée à la fois. */
function LettreFutur() {
  const [lettres, setLettres] = useState(null);
  const [texte, setTexte] = useState("");
  const [dateOuverture, setDateOuverture] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 90); return d.toISOString().slice(0, 10);
  });
  const [envoi, setEnvoi] = useState(false);
  const [ouverte, setOuverte] = useState(null); // lettre en cours de lecture

  const charger = () => fetchLettres().then((d) => setLettres(d.items || [])).catch(() => setLettres([]));
  useEffect(() => { charger(); }, []);

  const scellee = (lettres || []).find((l) => !l.prete);
  const pretes = (lettres || []).filter((l) => l.prete && !l.lue);
  const demain = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();

  const joursRestants = (l) => Math.max(0, Math.ceil((new Date(l.ouvre_le) - new Date()) / 86400000));

  const envoyer = async (e) => {
    e.preventDefault();
    if (texte.trim().length < 10) return;
    setEnvoi(true);
    try {
      await scellerLettre(texte.trim(), dateOuverture);
      toast.success("Lettre scellée. Elle te sera livrée à la date choisie.");
      setTexte("");
      charger();
    } catch (err) { toast.error(err.message || "Impossible de sceller la lettre."); }
    setEnvoi(false);
  };

  const lire = async (l) => {
    setOuverte(l);
    try { await marquerLettreLue(l.id); charger(); } catch { /* lecture quand même */ }
  };

  return (
    <section className="mb-8 rounded-[22px] border border-gold/25 bg-white/[0.06] p-5 backdrop-blur-xl sm:p-7" data-testid="lettre-futur">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold"><MailOpen size={14} /> Lettre à ton futur moi</p>
      <p className="mt-2 text-[14px] leading-relaxed text-offwhite/70">
        Écris à la personne que tu seras : où tu en es, ce que tu espères, ce que tu ne veux pas lâcher.
        La lettre reste scellée jusqu'à la date choisie — puis Zayado te la remet en main propre.
      </p>

      {pretes.map((l) => (
        <div key={l.id} className="mt-4 rounded-2xl border border-gold/50 bg-gold/[0.08] p-4" data-testid={`lettre-prete-${l.id}`}>
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-gold"><MailOpen size={15} /> Une lettre de toi, écrite le {new Date(l.ecrite_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}, vient d'arriver.</p>
          {ouverte?.id === l.id ? (
            <p className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.05] p-4 font-hand text-[19px] leading-relaxed text-offwhite" data-testid="lettre-texte">{l.texte}</p>
          ) : (
            <button onClick={() => lire(l)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-gold px-5 text-[13px] font-semibold text-navy-900" data-testid="lettre-lire">
              Ouvrir ma lettre
            </button>
          )}
        </div>
      ))}

      {scellee && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.04] p-4" data-testid="lettre-scellee">
          <Hourglass size={18} className="shrink-0 text-gold" />
          <p className="text-[13.5px] text-offwhite/80">
            Une lettre est scellée jusqu'au <b className="text-gold">{new Date(scellee.ouvre_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</b>
            {" "}— encore {joursRestants(scellee)} jour{joursRestants(scellee) > 1 ? "s" : ""}.
          </p>
        </div>
      )}

      {!scellee && (
        <form onSubmit={envoyer} className="mt-4" data-testid="lettre-form">
          <textarea rows={4} value={texte} onChange={(e) => setTexte(e.target.value)}
            placeholder="À moi, dans quelques mois. Aujourd'hui j'en suis là… Ce que je ne veux pas lâcher : …"
            data-testid="lettre-texte-input"
            className="w-full resize-y rounded-xl border border-white/[0.14] bg-white/[0.08] px-3.5 py-2.5 text-[14px] text-offwhite outline-none placeholder:text-offwhite/40 focus:border-gold/60" />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[12.5px] text-offwhite/60">
              <CalendarClock size={15} className="text-gold" /> Ouverture le
              <input type="date" min={demain} value={dateOuverture} onChange={(e) => setDateOuverture(e.target.value)}
                data-testid="lettre-date-input"
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[13px] text-offwhite focus:border-gold/50 focus:outline-none" />
            </label>
            <button disabled={envoi || texte.trim().length < 10} className="inline-flex h-10 items-center gap-2 rounded-full bg-gold px-5 text-[13px] font-semibold text-navy-900 disabled:opacity-50" data-testid="lettre-sceller">
              {envoi ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Sceller ma lettre
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
