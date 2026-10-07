import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { pickOpportunities, seedState, todayKey } from "./seed";
import type { CockpitState } from "./types";

const STORAGE_KEY = "zayado-cockpit-v1";

function loadState(): CockpitState {
  const seed = seedState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as Partial<CockpitState>;
    const merged: CockpitState = { ...seed, ...parsed };
    // Day rollover: the Radar regenerates each morning, scans reset (max 5/day).
    const day = todayKey();
    if (merged.radar.day !== day) {
      merged.radar = { day, scansUsed: 0, opportunities: pickOpportunities(day, 0), handledIds: [] };
    }
    return merged;
  } catch {
    return seed;
  }
}

interface CockpitContextValue {
  state: CockpitState;
  patch: (p: Partial<CockpitState>) => void;
}

const CockpitContext = createContext<CockpitContextValue | null>(null);

export function CockpitProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CockpitState>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full or unavailable — the app keeps working in memory
    }
  }, [state]);

  const patch = useCallback(
    (p: Partial<CockpitState>) => setState((s) => ({ ...s, ...p })),
    [],
  );

  return <CockpitContext.Provider value={{ state, patch }}>{children}</CockpitContext.Provider>;
}

export function useCockpit(): CockpitContextValue {
  const ctx = useContext(CockpitContext);
  if (!ctx) throw new Error("useCockpit must be used within CockpitProvider");
  return ctx;
}
