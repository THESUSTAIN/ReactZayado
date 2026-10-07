// Les réponses de l'IA arrivent parfois en markdown (# titres, **gras**, puces) : on les affiche proprement.
export function texteSimple(t) {
  return String(t || "")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/__(.+?)__/gs, "$1")
    .replace(/^\s*[-*•]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
