import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Pin } from "lucide-react";
import { fetchBoard } from "@/lib/kairosApi";
import { LiveCard, LIVE_SOURCES, useVisionLive } from "@/components/vision/SfCards";
import "./sf.css";

/**
 * Cockpit : cartes Live épinglées depuis le Vision Board (bouton 📌 sur une carte Live).
 * Rien n'est affiché tant que l'utilisateur n'a rien épinglé.
 */
export default function PinnedVisionCards() {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const live = useVisionLive();

  useEffect(() => {
    fetchBoard("perso")
      .then((r) => {
        const all = Array.isArray(r.cards) ? r.cards : [];
        const trashed = new Set(all.filter((c) => c.trashed).map((c) => c.id));
        setCards(all.filter((c) => c.type === "live" && c.pinned && !c.trashed && !(c.parent && trashed.has(c.parent))));
      })
      .catch(() => setCards([]));
  }, []);

  if (!cards.length) return null;
  const openModule = (source) => {
    const s = LIVE_SOURCES.find((x) => x.id === source);
    if (s) navigate(s.route);
  };

  return (
    <section className="mb-5 animate-fade-up" data-testid="cockpit-pinned-vision">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-offwhite"><Pin className="h-4 w-4 text-gold" /> Épinglé depuis ma Vision</h2>
        <button onClick={() => navigate("/app/vision?view=canvas")} className="inline-flex items-center gap-1 text-xs font-semibold text-gold">
          Ouvrir le board <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="sf grid gap-4 rounded-2xl bg-transparent md:grid-cols-2 xl:grid-cols-3" style={{ background: "transparent" }}>
        {cards.map((c) => (
          <div key={c.id} className="sf-pinned">
            <LiveCard card={c} live={live} onOpen={openModule} />
          </div>
        ))}
      </div>
    </section>
  );
}
