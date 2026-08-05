import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <motion.div
      data-testid="page-not-found"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background:
          "radial-gradient(ellipse at top left, rgba(30,58,138,0.35), transparent 55%), radial-gradient(ellipse at bottom right, rgba(201,164,73,0.12), transparent 60%), #0B1F3A",
        color: "#F6F2EA",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(201,164,73,0.25), rgba(201,164,73,0.05))",
            border: "1px solid rgba(201,164,73,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <Compass size={40} style={{ color: "#C9A449" }} />
        </motion.div>

        <p
          data-testid="not-found-code"
          style={{
            fontFamily: "'Instrument Serif', 'Playfair Display', Georgia, serif",
            fontSize: 72,
            lineHeight: 1,
            margin: 0,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            color: "#C9A449",
          }}
        >
          404
        </p>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            margin: "16px 0 8px",
            color: "#F6F2EA",
          }}
        >
          Cette page n'existe pas
        </h1>

        <p
          style={{
            fontSize: 15,
            color: "rgba(246,242,234,0.7)",
            lineHeight: 1.6,
            margin: "0 0 28px",
          }}
        >
          Le lien que tu as suivi est cassé ou la page a été déplacée.
          Pas de panique — reviens à ton cockpit et reprends ton envol.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            data-testid="not-found-back-btn"
            onClick={() => navigate(-1)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 20px",
              borderRadius: 999,
              border: "1px solid rgba(246,242,234,0.2)",
              background: "transparent",
              color: "#F6F2EA",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s, border-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(246,242,234,0.05)";
              e.currentTarget.style.borderColor = "rgba(246,242,234,0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(246,242,234,0.2)";
            }}
          >
            <ArrowLeft size={15} /> Page précédente
          </button>

          <button
            data-testid="not-found-home-btn"
            onClick={() => navigate("/")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 22px",
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(135deg, #C9A449, #D6A85F)",
              color: "#0B1F3A",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(201,164,73,0.35)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(201,164,73,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(201,164,73,0.35)";
            }}
          >
            <Home size={15} /> Retour au cockpit
          </button>
        </div>
      </div>
    </motion.div>
  );
}
