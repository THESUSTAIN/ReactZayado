import React from "react";

// Ciel navy immersif — dégradé bleu navy vers noir + ruban aurora teal VISIBLE (comme la maquette validée).
export function AuroraBackground() {
  return (
    <div className="aurora-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Dégradé navy → noir */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #16305C 0%, #101F47 40%, #0B1F3A 74%, #081734 100%)",
        }}
      />
      {/* Grand ruban aurora teal/cyan diagonal, bien visible */}
      <div
        className="absolute left-[28%] top-[-18%] h-[125vh] w-[46vw] animate-aurora-drift"
        style={{
          background:
            "radial-gradient(closest-side, rgba(74,206,224,0.38) 0%, rgba(56,180,214,0.20) 42%, rgba(56,180,214,0) 72%)",
          filter: "blur(46px)",
          transform: "rotate(22deg)",
        }}
      />
      {/* Second ruban teal plus étroit et lumineux au centre */}
      <div
        className="absolute left-[44%] top-[-8%] h-[110vh] w-[22vw] animate-aurora-drift"
        style={{
          background:
            "radial-gradient(closest-side, rgba(120,225,235,0.30) 0%, rgba(120,225,235,0) 68%)",
          filter: "blur(38px)",
          transform: "rotate(24deg)",
          animationDelay: "-7s",
        }}
      />
      {/* Halo bleu doux à droite */}
      <div
        className="absolute right-[-6%] top-[4%] h-[60vw] w-[42vw] rounded-full animate-aurora-drift"
        style={{
          background: "radial-gradient(circle, rgba(60,120,210,0.20) 0%, rgba(60,120,210,0) 62%)",
          filter: "blur(70px)",
          animationDelay: "-12s",
        }}
      />
      {/* Halo teal bas-gauche */}
      <div
        className="absolute bottom-[-16%] left-[-8%] h-[46vw] w-[46vw] rounded-full animate-aurora-drift"
        style={{
          background: "radial-gradient(circle, rgba(40,170,190,0.18) 0%, rgba(40,170,190,0) 60%)",
          filter: "blur(72px)",
          animationDelay: "-16s",
        }}
      />
    </div>
  );
}
