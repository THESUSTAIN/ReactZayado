import { useCallback, useLayoutEffect, useRef, useState } from "react";

// Défilement d'une conversation, comme WhatsApp / Messenger :
// 1. à l'ouverture, on arrive DIRECTEMENT sur le dernier message (pas d'animation qui parcourt tout l'historique) ;
// 2. tant que la personne est en bas, on suit les nouveaux messages et l'écriture en direct de l'IA ;
// 3. si elle remonte lire plus haut, on ne la ramène JAMAIS de force, même quand l'IA écrit ;
//    un bouton « Dernier message » apparaît pour redescendre ;
// 4. quand elle envoie elle-même un message, on redescend toujours.
const SEUIL_BAS = 120; // px : en dessous, on considère qu'elle est « en bas »

export function useChatScroll(deps, { pret = true, dernierEstMoi = false } = {}) {
  const ref = useRef(null);
  const colle = useRef(true);
  const dejaPlace = useRef(false);
  const [decolle, setDecolle] = useState(false);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const bas = el.scrollHeight - el.scrollTop - el.clientHeight < SEUIL_BAS;
    colle.current = bas;
    setDecolle((d) => (d === !bas ? d : !bas));
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !pret) return;
    if (!dejaPlace.current) {
      el.scrollTop = el.scrollHeight; // instantané : on arrive sur la dernière discussion
      dejaPlace.current = true;
      colle.current = true;
      return;
    }
    if (colle.current || dernierEstMoi) {
      colle.current = true;
      el.scrollTop = el.scrollHeight;
      setDecolle(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, pret]);

  const versLeBas = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    colle.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setDecolle(false);
  }, []);

  return { ref, onScroll, decolle, versLeBas };
}
