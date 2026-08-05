import React, { useEffect, useState } from "react";
import { visionApi } from "@/lib/api";

const MODULE_ROUTE = { pilotage: "/pilotage", "bien-etre": "/bien-etre", croissance: "/croissance" };

/**
 * #4 Live Cards — cartes du Vision Board reliées aux données live des autres
 * modules (CA Pilotage, streak/score Bien-être, prospects Croissance).
 */
export default function LiveCardsStrip() {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = () => visionApi.liveData().then((d) => { if (alive) setCards(d.cards || []); }).catch(() => {});
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!cards.length) return null;

  return (
    <div className="mb-3 flex gap-3 overflow-x-auto pb-1" data-testid="vision-live-cards">
      {cards.map((c) => (
        <a
          key={c.key}
          href={MODULE_ROUTE[c.module] || "#"}
          data-testid={`live-card-${c.key}`}
          className="group min-w-[150px] flex-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 no-underline transition-colors hover:border-[var(--app-accent)]"
        >
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-[var(--app-text-muted,#8a8a8a)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--app-accent,#C9A449)] animate-pulse" />
            {c.label}
          </div>
          <div className="mt-1 text-xl font-semibold text-[var(--app-text)]" data-testid={`live-card-${c.key}-value`}>
            {c.value}
          </div>
          <div className="text-[11px] text-[var(--app-text-muted,#8a8a8a)]">{c.sub}</div>
          {c.progress != null && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--app-border)]">
              <div className="h-full rounded-full bg-[var(--app-accent,#C9A449)]" style={{ width: `${Math.min(100, c.progress)}%` }} />
            </div>
          )}
        </a>
      ))}
    </div>
  );
}
