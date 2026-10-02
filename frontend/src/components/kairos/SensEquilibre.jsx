import React from "react";
import { useNavigate } from "react-router-dom";
import { useKairos } from "@/context/KairosContext";
import { Compass, Sun, RefreshCw, Sparkles, HeartHandshake, Users, Scale, Cloud, HandHeart, Quote, ArrowUpRight, Cross } from "lucide-react";
import { THESUSTAIN_URL } from "@/components/kairos/TheSustainInfo";

// Rubrique « Sens & équilibre » : la passerelle « Sens » de l'écosystème.
// Ton professionnel et inclusif ; une section clairement marquée
// « Inspiration chrétienne » invite (sans imposer) vers TheSustain.
const THEMES = [
  { icon: Compass, titre: "Trouver du sens dans son travail", texte: "Relier ce que tu fais à ce qui compte vraiment pour toi." },
  { icon: RefreshCw, titre: "Prendre du recul", texte: "Sortir la tête du guidon pour décider avec clarté." },
  { icon: Sun, titre: "Gratitude", texte: "Nommer ce qui va, même les jours difficiles." },
  { icon: Cloud, titre: "Espérance", texte: "Garder le cap quand l'horizon se brouille." },
  { icon: HandHeart, titre: "Pardon & relations", texte: "Alléger ce qui pèse dans tes relations pro et perso." },
  { icon: Scale, titre: "Équilibre vie pro / perso", texte: "Sanctuariser ton temps et ton énergie." },
  { icon: HeartHandshake, titre: "Épreuves & solitude de l'entrepreneur", texte: "Traverser les turbulences sans rester seul." },
  { icon: Quote, titre: "Témoignages", texte: "Des parcours d'entrepreneurs qui inspirent." },
];

export default function SensEquilibre() {
  const communaute = `${THESUSTAIN_URL}/communaute`;
  const { contexte } = useKairos();
  const navigate = useNavigate();
  // Contenu chrétien : proposé en grand seulement à qui a activé Ma Foi ; sinon une simple ligne discrète.
  const foi = contexte?.parcours_foi === true;

  return (
    <div data-testid="sens-equilibre" className="space-y-8">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
          <Sparkles size={13} /> Sens & équilibre
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Réconcilier sens, travail et bien-être</h2>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-offwhite/65">
          Des repères courts pour prendre soin de ce qui compte vraiment. Ouvert à tous —
          quelques contenus sont explicitement d'inspiration chrétienne, toujours signalés.
        </p>
      </div>

      {/* Thèmes (neutres) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="sens-themes">
        {THEMES.map((t) => (
          <div key={t.titre} className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 backdrop-blur-xl transition hover:border-white/25">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold"><t.icon size={18} /></span>
            <p className="mt-3 text-[14.5px] font-semibold text-offwhite">{t.titre}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-offwhite/60">{t.texte}</p>
          </div>
        ))}
      </div>

      {/* Bloc clairement marqué « Inspiration chrétienne » → passerelle TheSustain.
          Avant : une page TheSustain intégrée (iframe) montrée à tous, souvent vide car le site
          refuse l'affichage intégré. Maintenant : un lien, et le bloc complet seulement si Ma Foi est activée. */}
      {foi ? (
        <section className="overflow-hidden rounded-[22px] border border-gold/30 p-6"
          style={{ background: "linear-gradient(160deg, rgba(222,194,163,0.12), rgba(41,65,116,0.25))" }} data-testid="sens-inspiration-chretienne">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold"><Cross size={13} /> Inspiration chrétienne</p>
          <h3 className="mt-2 font-display text-xl font-bold sm:text-2xl">Prolonger dans Ma Foi</h3>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-offwhite/75">Verset et pause du jour, prière, parcours de 7 jours et le Cercle des bâtisseurs : tout est dans ton espace Ma Foi.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => navigate("/app/ma-foi")} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-6 py-2.5 text-[13.5px] font-bold text-navy-900 transition hover:brightness-105" data-testid="sens-ma-foi">
              Ouvrir Ma Foi <ArrowUpRight size={15} />
            </button>
            <a href={communaute} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-[12.5px] text-offwhite/75 hover:bg-white/5">
              <Users size={13} /> Communauté TheSustain <ArrowUpRight size={12} />
            </a>
          </div>
        </section>
      ) : (
        <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-offwhite/55" data-testid="sens-inspiration-discrete">
          <Cross size={13} className="text-gold" /> Envie d'une dimension chrétienne ?
          <button onClick={() => navigate("/app/ma-foi")} className="font-semibold text-gold hover:underline" data-testid="sens-decouvrir-thesustain">Découvrir Ma Foi par TheSustain</button>
        </p>
      )}

    </div>
  );
}
