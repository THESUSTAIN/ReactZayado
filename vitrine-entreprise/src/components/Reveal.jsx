import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const EASE = [0.16, 1, 0.3, 1];

export const Reveal = ({ children, delay = 0, y = 28, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 0.75, delay, ease: EASE }}
  >
    {children}
  </motion.div>
);

/* masked line-by-line reveal — for on-load hero moment */
export const KineticLine = ({ children, delay = 0 }) => (
  <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
    <motion.span
      className="block"
      initial={{ y: "115%" }}
      animate={{ y: 0 }}
      transition={{ duration: 0.95, delay, ease: EASE }}
    >
      {children}
    </motion.span>
  </span>
);

export const GoldUnderline = ({ className = "", delay = 0.6 }) => (
  <svg viewBox="0 0 220 14" fill="none" className={className} preserveAspectRatio="none" aria-hidden="true">
    <motion.path
      d="M4 10C50 3 150 2 216 8"
      stroke="var(--gold)"
      strokeWidth="4"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      whileInView={{ pathLength: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9, delay, ease: "easeOut" }}
    />
  </svg>
);

export const CountUp = ({ to, suffix = "", decimals = 0, className = "" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const t0 = performance.now();
    const d = 1600;
    const tick = (t) => {
      const p = Math.min((t - t0) / d, 1);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, to]);
  return (
    <span ref={ref} className={className}>
      {v.toFixed(decimals).replace(".", ",")}{suffix}
    </span>
  );
};

export const Stamp = ({ children, dark = false, className = "" }) => (
  <span className={`stamp ${dark ? "text-[var(--paper-2)]" : "text-[var(--navy)]"} ${className}`}>{children}</span>
);
