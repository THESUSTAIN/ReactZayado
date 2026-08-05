import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { visionApi } from "@/lib/api";

export default function VisionHeroPanel({ data, board: boardProp }) {
  const navigate = useNavigate();
  const [boardState, setBoardState] = useState(boardProp || null);

  useEffect(() => {
    if (boardProp) { setBoardState(boardProp); return; }
    visionApi.getBoard().then(setBoardState).catch(() => setBoardState({}));
  }, [boardProp]);

  const board = boardState;
  const photo = board?.photo_url;
  const phrase = board?.ikigai_citation || board?.mission || data?.vision_phrase || "";
  const hasPhrase = !!phrase;

  return (
    <div className="vision-hero-panel" data-testid="vision-hero-panel">
      <div className="vision-hero-head">
        <Sparkles size={13} style={{ color: "#C9A449" }} /> Ma vision
      </div>

      {photo ? (
        <div className="vision-hero-photo" style={{ backgroundImage: `url(${photo})` }} data-testid="vision-hero-photo">
          <div className="vision-hero-photo-veil" />
          {hasPhrase && <p className="vision-hero-photo-caption">{phrase}</p>}
        </div>
      ) : hasPhrase ? (
        <div className="vision-hero-navy" data-testid="vision-hero-navy">
          <p className="vision-hero-phrase" data-testid="vision-hero-phrase">« {phrase} »</p>
          <button className="vision-hero-link" onClick={() => navigate("/vision-board")} data-testid="vision-hero-link">
            Voir mon Vision Board <ArrowRight size={13} />
          </button>
        </div>
      ) : (
        <div className="vision-hero-navy" data-testid="vision-hero-empty">
          <p className="vision-hero-phrase" style={{ opacity: 0.7 }} data-testid="vision-hero-phrase">
            Tu n&rsquo;as pas encore défini ta vision.
          </p>
          <button className="vision-hero-link" onClick={() => navigate("/vision-board")} data-testid="vision-hero-link">
            Définir ma vision <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
