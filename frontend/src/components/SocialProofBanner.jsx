import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp, FileCheck } from "lucide-react";
import axios from "axios";
import { API } from "@/lib/api";

// Messages de secours si l'API /social-proof n'est pas encore branchée côté backend.
const FALLBACK_STATS = [
  { Icon: FileCheck, text: "127 solopreneurs ont validé leur projet cette semaine" },
  { Icon: TrendingUp, text: "43 leads générés via l'Expansion Agent aujourd'hui" },
  { Icon: Users, text: "2 480 entrepreneurs accompagnés par Zayado" },
];

export default function SocialProofBanner() {
  const [stats, setStats] = useState(FALLBACK_STATS);
  const [i, setI] = useState(0);

  useEffect(() => {
    // Route backend attendue : GET /api/social-proof -> [{ text, icon }]
    axios.get(`${API}/social-proof`)
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length) {
          setStats(res.data.map((s) => ({ Icon: FileCheck, text: s.text })));
        }
      })
      .catch(() => {}); // silencieux — on garde le fallback
  }, []);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % stats.length), 5000);
    return () => clearInterval(t);
  }, [stats.length]);

  const Current = stats[i];

  return (
    <div className="glass-card" data-testid="social-proof-banner" style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
      background: "rgba(201,164,73,0.06)", border: "1px solid rgba(201,164,73,0.2)",
      marginBottom: 16, overflow: "hidden",
    }}>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}
          style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Current.Icon size={16} style={{ color: "#C9A449", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "var(--txt)" }}>{Current.text}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
