import { useEffect, useState } from "react";

// Flag d'activation de « Ma Foi » — 100% localStorage, aucun endpoint backend.
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

// Hook d'état persisté dans localStorage (préfixe zayado_mafoi_).
export function useLocal(key, initial) {
  const full = `zayado_mafoi_${key}`;
  const [val, setVal] = useState(initial);
  useEffect(() => {
    try {
      const s = localStorage.getItem(full);
      if (s !== null) setVal(JSON.parse(s));
    } catch (e) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try { localStorage.setItem(full, JSON.stringify(val)); } catch (e) { /* ignore */ }
  }, [full, val]);
  return [val, setVal];
}

export const uid = (p = "id") => `${p}-${Date.now()}-${Math.floor(Math.random() * 999)}`;
