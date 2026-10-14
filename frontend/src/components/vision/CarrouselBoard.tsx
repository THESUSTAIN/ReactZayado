import { Link } from "react-router-dom";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Carte } from "@/components/vision/atomes";
import type { Board } from "@/types/vision";

/* Le carrousel du Vision Board. Les images sont la respiration de l'écran :
   si elles manquent, la citation reste — on n'affiche jamais une carte vide. */

export function CarrouselBoard({ board, className = "" }: { board: Board; className?: string }) {
  const [index, setIndex] = useState(0);
  const images = board.images;
  const total = images.length;
  // Sans image : une carte normale qui invite à commencer (pas de voile sombre sur du vide).
  if (total === 0) {
    return (
      <Carte haut className={`flex flex-col justify-end p-5 sm:p-6 ${className}`} testId="carte-vision-board">
        <p className="etiquette-carte"><Sparkles /> Ta vision</p>
        {board.citation?.trim() ? (
          <blockquote className="mt-2 text-xl font-semibold leading-snug" data-testid="citation-vision">« {board.citation} »</blockquote>
        ) : (
          <p className="titre-carte mt-2" data-testid="citation-vision">Ce qui te fait <span className="mot-main">te lever le matin</span>.</p>
        )}
        <Link to="/vision-board" data-testid="lien-vision-board" className="btn-secondaire mt-4 w-fit">
          {board.citation?.trim() ? "Ajouter des images" : "Créer ma vision"}
        </Link>
      </Carte>
    );
  }
  const courante = total > 0 ? images[index % total] : null;

  const bouge = (pas: number) => setIndex((i) => (total === 0 ? 0 : (i + pas + total) % total));

  return (
    <Carte haut className={`relative overflow-hidden ${className}`} testId="carte-vision-board">
      {courante ? (
        <img
          key={courante.id}
          src={courante.url}
          alt={courante.legende || "Vision Board"}
          className="anim-monte absolute inset-0 size-full object-cover"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-[#060b18]/95 via-[#060b18]/55 to-[#060b18]/25" />

      <div className="relative flex min-h-[230px] flex-col justify-end gap-2 p-5 sm:min-h-[260px]">
        <p className="surtitre flex items-center gap-2">
          <Sparkles className="size-4" /> Mon Vision Board
        </p>
        {board.citation?.trim() ? (
          <blockquote className="titre-serif text-lg leading-snug text-[#eceff7] sm:text-xl" data-testid="citation-vision">
            « {board.citation} »
          </blockquote>
        ) : total === 0 ? (
          <p className="text-base leading-snug text-[#eceff7]" data-testid="citation-vision">
            Ta vision est encore vide. Une image, une phrase : ce qui te fait te lever le matin.
          </p>
        ) : null}
        <Link
          to="/vision-board"
          data-testid="lien-vision-board"
          className="w-fit text-sm font-medium text-[#F4EFE6] underline decoration-white/30 underline-offset-4 transition-opacity hover:opacity-80"
        >
          {total === 0 && !board.citation?.trim() ? "Créer ma vision →" : "Ouvrir mon Vision Board →"}
        </Link>
      </div>

      {total > 1 ? (
        <>
          <button
            type="button"
            onClick={() => bouge(-1)}
            aria-label="Image précédente"
            data-testid="carrousel-precedent"
            className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#060b18]/70 text-[#eceff7] transition-colors hover:bg-[#060b18]/90"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => bouge(1)}
            aria-label="Image suivante"
            data-testid="carrousel-suivant"
            className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#060b18]/70 text-[#eceff7] transition-colors hover:bg-[#060b18]/90"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute left-5 top-5 flex gap-1.5" data-testid="carrousel-points">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Image ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index % total ? "w-5 bg-[#dec2a3]" : "w-1.5 bg-white/35"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </Carte>
  );
}
