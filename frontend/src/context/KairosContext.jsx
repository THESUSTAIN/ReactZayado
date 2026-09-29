import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import { energyModes } from "@/mock/data";
import { fetchState, postCheckin, toggleTache } from "@/lib/kairosApi";

const KairosContext = createContext(null);

function deriveMode(score) {
  if (score <= 2) return "recuperation";
  if (score === 3) return "soutien";
  return "elan";
}

const SAFE = {
  user: { firstName: "" },
  energy: { score: 4, mood: "" },
  balance: { pro: 60, perso: 40 },
  priorities: [],
  goal: { title: "", percent: 0, daysLeft: 0, substeps: [] },
  victory: { title: "", detail: "", date: "" },
  trend: [],
  aCheckin: false,
};

export function KairosProvider({ children }) {
  const [user, setUser] = useState(SAFE.user);
  const [energy, setEnergy] = useState(SAFE.energy);
  const [balance, setBalance] = useState(SAFE.balance);
  const [priorities, setPriorities] = useState(SAFE.priorities);
  const [goal, setGoal] = useState(SAFE.goal);
  const [victory, setVictory] = useState(SAFE.victory);
  const [trend, setTrend] = useState(SAFE.trend);
  const [aCheckin, setACheckin] = useState(SAFE.aCheckin);
  const [contexte, setContexte] = useState({});
  const [onboardingData, setOnboardingData] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const hydrate = useCallback((s) => {
    setUser({ firstName: s.profile?.prenom || "toi" });
    setEnergy({ score: s.energy?.score ?? 4, mood: s.energy?.mood || "aligné" });
    setACheckin(Boolean(s.energy?.a_checkin));
    setContexte(s.vision?.contexte_metier || {});
    setBalance(s.balance || null);  // null = pas encore de mesure (plus de 60/40 inventé)
    setPriorities(s.priorities || []);
    if (s.goal) {
      const dl = s.goal.echeance ? Math.max(0, Math.round((new Date(s.goal.echeance) - new Date()) / 86400000)) : 0;
      setGoal({ title: s.goal.title, percent: s.goal.percent, daysLeft: dl, substeps: [] });
    }
    if (s.victory) setVictory(s.victory);
    setTrend(s.trend || []);
    setLoaded(true);
  }, []);

  const refresh = useCallback(() => fetchState().then(hydrate).catch(() => setLoaded(true)), [hydrate]);
  useEffect(() => { refresh(); }, [refresh]);
  // Connexion en SPA (pas de rechargement) : un nouveau token déclenche la
  // re-hydratation — sinon prénom, préférences et contexte restaient vides.
  useEffect(() => {
    const onToken = () => refresh();
    window.addEventListener("zayado:token", onToken);
    return () => window.removeEventListener("zayado:token", onToken);
  }, [refresh]);

  const mode = deriveMode(energy.score);
  const modeInfo = energyModes[mode];
  const isRecovery = mode === "recuperation";

  const togglePriority = useCallback((id) => {
    setPriorities((prev) => prev.map((p) => (p.id === id ? { ...p, done: !p.done, progress: !p.done ? 100 : p.progress } : p)));
    toggleTache(id).catch(() => {});
  }, []);

  const submitCheckin = useCallback(({ score, mental, mood }) => {
    setEnergy({ score, mood });
    setACheckin(true);
    postCheckin({ energie: score, charge: mental, mood }).then(() => refresh()).catch(() => {});
  }, [refresh]);

  const value = useMemo(() => ({
    user, energy, setEnergy, balance, priorities, togglePriority,
    goal, victory, trend, mode, modeInfo, isRecovery, loaded, aCheckin, contexte,
    submitCheckin, onboardingData, setOnboardingData,
  }), [user, energy, balance, priorities, goal, victory, trend, mode, modeInfo, isRecovery, loaded, aCheckin, contexte, togglePriority, submitCheckin, onboardingData]);

  return <KairosContext.Provider value={value}>{children}</KairosContext.Provider>;
}

export function useKairos() {
  const ctx = useContext(KairosContext);
  if (!ctx) throw new Error("useKairos must be used within KairosProvider");
  return ctx;
}
