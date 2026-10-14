import { Asterisk } from "lucide-react";
import { MARQUEE_ITEMS } from "@/data/content";

export default function Marquee({ light = false }) {
  return (
    <div
      data-testid="marquee-band"
      className="marquee-wrap border-y py-5"
      style={{
        borderColor: light ? "rgba(253,252,248,0.15)" : "var(--line)",
        background: light ? "transparent" : "var(--paper-2)",
      }}
    >
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <div className="marquee-row" key={copy} aria-hidden={copy === 1}>
            {MARQUEE_ITEMS.map((it, i) => (
              <span
                className="marquee-item text-[15px] font-medium tracking-[0.14em] uppercase"
                style={{ color: light ? "var(--paper-2)" : "var(--navy)" }}
                key={i}
              >
                {it}
                <Asterisk size={18} style={{ color: "var(--gold)" }} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
