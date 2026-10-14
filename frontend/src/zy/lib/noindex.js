import { useEffect } from "react";

/** Pages ouvertes par un lien privé (board partagé, invitation, liaison) : jamais dans les moteurs de recherche. */
export function useNoIndex() {
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => { m.remove(); };
  }, []);
}
