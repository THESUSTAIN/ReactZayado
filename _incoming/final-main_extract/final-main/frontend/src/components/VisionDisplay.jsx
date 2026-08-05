import React, { useState, useEffect } from "react";
import { Images, Quote, ImageIcon, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import VisionCarousel from "@/components/VisionCarousel";
import VisionHeroPanel from "@/components/VisionHeroPanel";
import { visionApi } from "@/lib/api";
import { usePrefs } from "@/context/PrefsContext";

// Icônes utilisées pour le sélecteur (Lucide n'exporte pas "ImageIcon" par défaut,
// mais expose "Image" que l'on renomme).
import { Image as LucideImage } from "lucide-react";

const MODES = [
  { id: "carousel", label: "Carrousel", Icon: Images },
  { id: "phrase",   label: "Phrase",    Icon: Quote },
  { id: "image",    label: "Image",     Icon: LucideImage },
];

function VisionModeSelector({ mode, onChange }) {
  return (
    <div
      className="vision-mode-selector"
      data-testid="vision-mode-selector"
      style={{
        display: "inline-flex",
        gap: 4,
        padding: 4,
        borderRadius: 999,
        background: "rgba(11,31,58,0.35)",
        border: "1px solid rgba(246,242,234,0.12)",
        backdropFilter: "blur(6px)",
      }}
    >
      {MODES.map(({ id, label, Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            data-testid={`vision-mode-${id}`}
            onClick={() => onChange(id)}
            title={`Afficher : ${label}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 999,
              border: "none",
              background: active ? "#C9A449" : "transparent",
              color: active ? "#0B1F3A" : "rgba(246,242,234,0.75)",
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              cursor: "pointer",
              transition: "background 0.2s, color 0.2s",
            }}
          >
            <Icon size={13} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

const DEFAULT_VISION_SLIDES = [
  { title: "Liberté & impact", sub: "Construis une entreprise alignée avec tes valeurs.", grad: "linear-gradient(135deg, #14335c, #0B1F3A)" },
  { title: "Croissance sereine", sub: "Grandir sans t'épuiser — l'IA travaille pour toi.", grad: "linear-gradient(135deg, #1e3a5f, #16324f)" },
  { title: "Ta vision, ton cap", sub: "Personnalise ce tableau pour qu'il te ressemble.", grad: "linear-gradient(135deg, #24406b, #0e2440)" },
];

// Carrousel par défaut affiché quand l'utilisateur n'a pas encore défini sa vision.
// Il reste VISIBLE (le mode Carrousel n'est jamais vide) et invite à personnaliser.
function DefaultVisionCarousel() {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % DEFAULT_VISION_SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);
  const s = DEFAULT_VISION_SLIDES[idx];
  return (
    <div data-testid="vision-default-carousel" style={{
      position: "relative", minHeight: 260, borderRadius: 20, overflow: "hidden",
      background: s.grad, transition: "background 0.6s ease", display: "flex",
      flexDirection: "column", justifyContent: "flex-end", padding: 24,
    }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(11,31,58,0.15), rgba(11,31,58,0.55))" }} />
      <div style={{ position: "relative" }}>
        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#F6F2EA" }}>{s.title}</h3>
        <p style={{ margin: "6px 0 14px", fontSize: 13.5, color: "rgba(246,242,234,0.85)", maxWidth: 380 }}>{s.sub}</p>
        <button type="button" data-testid="vision-personalize-btn" onClick={() => navigate("/vision-board")} style={{
          display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 999,
          background: "#C9A449", color: "#0B1F3A", border: "none", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
        }}>
          Décris ta vision <ArrowRight size={14} />
        </button>
      </div>
      <div style={{ position: "relative", display: "flex", gap: 6, marginTop: 16 }}>
        {DEFAULT_VISION_SLIDES.map((_, i) => (
          <span key={i} style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 999, background: i === idx ? "#C9A449" : "rgba(246,242,234,0.4)", transition: "width 0.3s" }} />
        ))}
      </div>
    </div>
  );
}

export default function VisionDisplay({ data }) {
  const { prefs, setPref } = usePrefs();
  const [board, setBoard] = useState(null);

  useEffect(() => {
    visionApi.getBoard().then(setBoard).catch(() => setBoard({}));
  }, []);

  const mode = prefs.vision_display || "carousel";
  const change = (m) => setPref({ vision_display: m });

  // Images de l'utilisateur (upload inspiration + vision + photo board)
  const userImgs = [];
  if (prefs.inspiration_photo) userImgs.push(prefs.inspiration_photo);
  (prefs.vision_images || []).forEach((u) => { if (u) userImgs.push(u); });
  if (board && board.photo_url) userImgs.push(board.photo_url);

  const backendSlides = data.vision_slides || [];
  const slides = backendSlides.length
    ? backendSlides
    : userImgs.map((url, i) => ({ img: url, title: i === 0 ? "Ma vision" : "" }));

  const heroImage = userImgs[0] || board?.photo_url || null;

  // ─── Rendu selon le mode ───
  let content;
  if (mode === "carousel") {
    content = slides.length > 0 ? <VisionCarousel slides={slides} /> : <DefaultVisionCarousel />;
  } else if (mode === "image" && heroImage) {
    content = (
      <div
        className="vision-hero-panel"
        data-testid="vision-image-only"
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: 260,
          borderRadius: 20,
          backgroundImage: `url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(11,31,58,0.08), rgba(11,31,58,0.55))",
          }}
        />
      </div>
    );
  } else {
    // Fallback : phrase (VisionHeroPanel) — ou si "image" mais aucune photo dispo.
    content = <VisionHeroPanel data={data} board={board} />;
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Sélecteur inline en haut à droite du bloc Vision */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 3,
        }}
      >
        <VisionModeSelector mode={mode} onChange={change} />
      </div>
      {content}
      <div className="vision-timeline" data-testid="vision-timeline">
        {[
          { k: "Aujourd'hui", s: "Poser les bases" },
          { k: "90 jours", s: "Accélérer" },
          { k: "1 an", s: "Devenir incontournable" },
          { k: "3 ans", s: "Rayonner" },
        ].map((it, i) => (
          <div key={i} className="vision-timeline-chip" data-testid={`vision-timeline-${i}`}>
            <span className="vtl-k">{it.k}</span>
            <span className="vtl-s">{it.s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
