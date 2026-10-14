import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

/* Marque de l'entreprise (Admin › Marque & entreprise) : chargée une fois,
   partagée partout. Champ vide côté serveur = valeur d'origine ci-dessous. */
const DEFAUT = {
  nom_marque: "Zayado",
  logo_app_url: "",
  logo_email_url: "",
  email_pied: "",
  site_pied: "",
  contact_email: "contact@zayado.net",
};

let cache = null;
let promesse = null;
const auditeurs = new Set();

export function chargerMarque(force = false) {
  if (cache && !force) return Promise.resolve(cache);
  if (!promesse) {
    promesse = apiGet("/marque")
      .then((d) => {
        cache = { ...DEFAUT, ...(d || {}) };
        promesse = null;
        auditeurs.forEach((f) => f(cache));
        return cache;
      })
      .catch(() => {
        promesse = null;
        return cache || DEFAUT;
      });
  }
  return promesse;
}

export function rafraichirMarque() {
  return chargerMarque(true);
}

export function useMarque() {
  const [marque, setMarque] = useState(cache || DEFAUT);
  useEffect(() => {
    let actif = true;
    chargerMarque().then((d) => actif && setMarque(d));
    const f = (d) => setMarque(d);
    auditeurs.add(f);
    return () => {
      actif = false;
      auditeurs.delete(f);
    };
  }, []);
  return marque;
}

/** Logo de l'appli : celui de l'admin si défini, sinon le fichier d'origine. */
export function logoApp(marque, defaut = "/logo-app.png") {
  return (marque && marque.logo_app_url) || defaut;
}
