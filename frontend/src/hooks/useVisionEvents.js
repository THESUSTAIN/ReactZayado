import { useEffect, useRef } from "react";

const TOKEN_KEY = "zayado_token";

/**
 * useVisionEvents — Remplace le polling `setInterval` par un flux SSE
 * (backend: /api/vision/events/stream, correction backlog #2).
 *
 * EventSource ne permet pas d'ajouter un header Authorization : au lieu d'y
 * passer directement le token de session (long-vécu), on demande d'abord un
 * ticket court (45s, usage unique) via POST /vision/events/ticket, et c'est
 * ce ticket qui voyage dans l'URL du flux SSE — portée réduite au strict
 * nécessaire (voir routes/vision_events.py::issue_sse_ticket).
 *
 * Reconnexion : EventSource se reconnecte déjà nativement sur coupure réseau,
 * mais avec un délai fixe. On ajoute un backoff exponentiel manuel (2s → 30s
 * max) pour éviter de marteler le serveur en cas de panne prolongée.
 *
 * Filet de sécurité : si la connexion SSE ne peut PAS s'établir du tout
 * (proxy d'entreprise qui bloque le streaming, ad-blocker agressif...),
 * `onFallbackPoll` est appelé toutes les `fallbackIntervalMs` — par défaut le
 * composant appelant doit alors retomber sur son ancien fetch ponctuel.
 *
 * @param {Object} opts
 * @param {(data:any)=>void} [opts.onTick] - appelé à chaque event "tick" (signal périodique, ~60s)
 * @param {(data:any)=>void} [opts.onCardUpdate] - appelé immédiatement à chaque event "card_update"
 * @param {()=>void} [opts.onFallbackPoll] - filet de sécurité si SSE indisponible
 * @param {number} [opts.fallbackIntervalMs=90000]
 * @param {boolean} [opts.enabled=true]
 */
export default function useVisionEvents({
  onTick,
  onCardUpdate,
  onFallbackPoll,
  fallbackIntervalMs = 90000,
  enabled = true,
} = {}) {
  const esRef = useRef(null);
  const retryRef = useRef(2000);
  const reconnectTimerRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const everConnectedRef = useRef(false);
  const closedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;
    closedRef.current = false;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      // Pas de session : rien à streamer, le composant appelant garde son
      // comportement existant (pas de crash, pas de connexion tentée).
      return undefined;
    }

    const base = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

    const startFallback = () => {
      if (fallbackTimerRef.current || !onFallbackPoll) return;
      fallbackTimerRef.current = setInterval(onFallbackPoll, fallbackIntervalMs);
    };
    const stopFallback = () => {
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };

    const connect = async () => {
      if (closedRef.current) return;
      let ticket;
      try {
        // Ticket court-vécu (45s, usage unique) au lieu du vrai token de
        // session dans l'URL — voir routes/vision_events.py::issue_sse_ticket.
        const r = await fetch(`${base}/vision/events/ticket`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error(`ticket ${r.status}`);
        ticket = (await r.json()).ticket;
      } catch {
        if (!everConnectedRef.current) startFallback();
        const delay = retryRef.current;
        retryRef.current = Math.min(delay * 2, 30000);
        reconnectTimerRef.current = setTimeout(connect, delay);
        return;
      }
      if (closedRef.current) return;
      let es;
      try {
        es = new EventSource(`${base}/vision/events/stream?token=${encodeURIComponent(ticket)}`);
      } catch {
        startFallback();
        return;
      }
      esRef.current = es;

      es.onopen = () => {
        everConnectedRef.current = true;
        retryRef.current = 2000;
        stopFallback();
      };

      es.addEventListener("tick", (e) => {
        try { onTick?.(e.data ? JSON.parse(e.data) : {}); } catch { onTick?.({}); }
      });

      es.addEventListener("card_update", (e) => {
        try { onCardUpdate?.(e.data ? JSON.parse(e.data) : {}); } catch { onCardUpdate?.({}); }
      });

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (closedRef.current) return;
        // Si on n'a jamais réussi à se connecter au moins une fois, on suppose
        // un blocage réseau structurel (proxy/ad-blocker) plutôt qu'une simple
        // coupure passagère → filet de sécurité en polling lent.
        if (!everConnectedRef.current) startFallback();
        const delay = retryRef.current;
        retryRef.current = Math.min(delay * 2, 30000);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closedRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      stopFallback();
      esRef.current?.close();
      esRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
