import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

export default function VisionCarousel({ slides: rawSlides = [] }) {
  const slides = (rawSlides || []).map((s, i) => ({
    id: s.id ?? `slide-${i}`,
    img: s.img || s.image || s.url,
    title: s.title || "",
    subtitle: s.subtitle || s.univers || "",
  })).filter((s) => s.img);
  const [idx, setIdx] = useState(1);
  const autoplayRef = useRef(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    autoplayRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, 4500);
    return () => clearInterval(autoplayRef.current);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const prevIdx = (idx - 1 + slides.length) % slides.length;
  const nextIdx = (idx + 1) % slides.length;
  const stop = () => clearInterval(autoplayRef.current);
  const goPrev = () => { stop(); setIdx((idx - 1 + slides.length) % slides.length); };
  const goNext = () => { stop(); setIdx((idx + 1) % slides.length); };

  return (
    <div data-testid="vision-carousel" style={{ padding: 6 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase",
        color: "var(--txt-muted)", fontWeight: 500, marginBottom: 14,
      }}>
        <Sparkles size={13} style={{ color: "#C9A449" }} />
        Inspiration du jour
      </div>

      <div style={{
        position: "relative", height: 240, display: "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        <button onClick={goPrev} data-testid="carousel-prev"
          style={{
            position: "absolute", left: -6, zIndex: 20,
            width: 34, height: 34, borderRadius: "50%",
            background: "rgba(255,255,255,0.18)",
            border: "1px solid rgba(255,255,255,0.25)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            color: "var(--txt)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}>
          <ChevronLeft size={16} />
        </button>

        {slides.length > 1 && (
          <img src={slides[prevIdx].img} alt=""
            style={{
              position: "absolute", left: "6%", zIndex: 10,
              width: "42%", height: "78%", objectFit: "cover",
              borderRadius: 16, opacity: 0.6,
              boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
            }} />
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={slides[idx].id}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "relative", width: "60%", height: "100%",
              borderRadius: 18, overflow: "hidden", zIndex: 20,
              boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
            }}>
            <img src={slides[idx].img} alt={slides[idx].title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 45%, transparent 100%)",
            }} />
            <div style={{ position: "absolute", left: 16, right: 16, bottom: 14 }}>
              <div style={{ fontSize: 17, fontWeight: 500, color: "var(--txt)", lineHeight: 1.2 }}>
                {slides[idx].title}
              </div>
              <div style={{ fontSize: 12, color: "var(--txt)", marginTop: 3 }}>
                {slides[idx].subtitle}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {slides.length > 1 && (
          <img src={slides[nextIdx].img} alt=""
            style={{
              position: "absolute", right: "6%", zIndex: 10,
              width: "42%", height: "78%", objectFit: "cover",
              borderRadius: 16, opacity: 0.6,
              boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
            }} />
        )}

        <button onClick={goNext} data-testid="carousel-next"
          style={{
            position: "absolute", right: -6, zIndex: 20,
            width: 34, height: 34, borderRadius: "50%",
            background: "rgba(255,255,255,0.18)",
            border: "1px solid rgba(255,255,255,0.25)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            color: "var(--txt)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
        {slides.map((_, i) => (
          <button key={i} onClick={() => { stop(); setIdx(i); }}
            data-testid={`carousel-dot-${i}`}
            style={{
              height: 6, width: i === idx ? 22 : 6,
              borderRadius: 999,
              background: i === idx ? "#C9A449" : "rgba(255,255,255,0.3)",
              border: "none", cursor: "pointer", transition: "all 0.3s ease", padding: 0,
            }} />
        ))}
      </div>
    </div>
  );
}
