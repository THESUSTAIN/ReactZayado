import { useEffect } from "react";

// SEO des pages publiques : titre, description, lien canonique, Open Graph /
// Twitter et consigne aux robots. Les valeurs par défaut (et celles lues par
// les réseaux sociaux, qui n'exécutent pas le JavaScript) sont dans
// public/index.html ; ce hook les ajuste page par page.
const SITE = "https://app.zayado.net";

function meta(attr, cle, valeur) {
  let m = document.head.querySelector(`meta[${attr}="${cle}"]`);
  if (!m) {
    m = document.createElement("meta");
    m.setAttribute(attr, cle);
    document.head.appendChild(m);
  }
  m.setAttribute("content", valeur);
}

// index = false par défaut : l'appli n'est jamais indexée (doublon avec Shopify).
export function useSeo({ title, description, path, index = false, image = "/og-zayado.png" }) {
  useEffect(() => {
    document.title = title;
    meta("name", "description", description);
    meta("name", "robots", index ? "index, follow, max-image-preview:large" : "noindex, nofollow, noarchive");
    const url = `${SITE}${path ?? window.location.pathname}`;
    meta("property", "og:title", title);
    meta("property", "og:description", description);
    meta("property", "og:url", url);
    meta("property", "og:image", `${SITE}${image}`);
    meta("name", "twitter:title", title);
    meta("name", "twitter:description", description);
    meta("name", "twitter:image", `${SITE}${image}`);
  }, [title, description, path, index, image]);
}
