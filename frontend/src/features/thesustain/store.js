import { useEffect, useRef, useState } from "react";
import { fetchFoiEtat, getToken, saveFoiEtat } from "@/lib/kairosApi";

// Flag d'activation de « Ma Foi » (préférence d'affichage, par navigateur).
export const MA_FOI_KEY = "zayado_ma_foi";

export function getMaFoiActive() {
  try { return localStorage.getItem(MA_FOI_KEY) === "1"; } catch (e) { return false; }
}

export function setMaFoiActive(v) {
  try {
    localStorage.setItem(MA_FOI_KEY, v ? "1" : "0");
    window.dispatchEvent(new Event("mafoi-change"));
  } catch (e) { /* stockage indisponible */ }
}

// Données personnelles du module : désormais enregistrées sur le COMPTE
// (avant : uniquement dans ce navigateur — perdues sur un autre appareil).
// Un seul chargement serveur partagé par tous les hooks de la page.
let _etatServeur = null;
const chargerEtat = () => {
  if (!getToken()) return Promise.resolve({});
  if (!_etatServeur) _etatServeur = fetchFoiEtat().catch(() => { _etatServeur = null; return {}; });
  return _etatServeur;
};

export function useLocal(key, initial) {
  const full = `zayado_mafoi_${key}`;
  const [val, setVal] = useState(initial);
  const pret = useRef(false);
  const minuteur = useRef(null);
  useEffect(() => {
    let vivant = true;
    chargerEtat().then((etat) => {
      if (!vivant) return;
      if (etat && Object.prototype.hasOwnProperty.call(etat, key) && etat[key] !== null) {
        setVal(etat[key]);
      } else {
        // Reprise unique de ce qui était stocké dans le navigateur avant.
        try {
          const s = localStorage.getItem(full);
          if (s !== null) { const v = JSON.parse(s); setVal(v); saveFoiEtat(key, v).catch(() => {}); }
        } catch (e) { /* ignore */ }
      }
      pret.current = true;
    });
    return () => { vivant = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!pret.current) return undefined;
    try { localStorage.setItem(full, JSON.stringify(val)); } catch (e) { /* ignore */ }
    clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => {
      saveFoiEtat(key, val).then(() => { if (_etatServeur) _etatServeur.then((e) => { if (e) e[key] = val; }); }).catch(() => {});
    }, 600);
    return () => clearTimeout(minuteur.current);
  }, [full, key, val]);
  return [val, setVal];
}

export const uid = (p = "id") => `${p}-${Date.now()}-${Math.floor(Math.random() * 999)}`;
