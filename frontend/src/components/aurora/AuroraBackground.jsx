import React from "react";

/**
 * Ciel navy de final 13 (« Apple Weather ») : bleu roi profond → quasi-noir,
 * halos bleus en haut, nuages blancs très doux qui dérivent, léger grain.
 * Plus de rubans teal/cyan : c'étaient eux qui donnaient ce bleu « bizarre ».
 */
const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='4'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export function AuroraBackground() {
  return (
    <div className="aurora-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background: "var(--fond-zayado)",
        }}
      />
      {/* Nuages doux */}
      <div
        className="absolute inset-0 animate-aurora-drift"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 800px 300px at 15% 25%, rgba(255,255,255,0.12) 0%, transparent 55%)," +
            "radial-gradient(ellipse 600px 200px at 75% 35%, rgba(255,255,255,0.08) 0%, transparent 60%)," +
            "radial-gradient(ellipse 900px 250px at 40% 60%, rgba(255,255,255,0.06) 0%, transparent 60%)",
          filter: "blur(20px)",
          animationDuration: "90s",
        }}
      />
      {/* Grain */}
      <div className="absolute inset-0" style={{ backgroundImage: NOISE, opacity: 0.35, mixBlendMode: "overlay" }} />
    </div>
  );
}

export default AuroraBackground;
