import React, { useState } from "react";
import axios from "axios";
import { Sparkles, FileText, FilePen, Mail, Check, Plus } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

const iconFor = (id) => {
  if (id === "plan-90j") return FilePen;
  if (id === "email-ia") return Mail;
  return FileText;
};

export default function LivrablesCard({ livrables = [] }) {
  const [validated, setValidated] = useState({});

  const handleValidate = async (id) => {
    setValidated((v) => ({ ...v, [id]: true }));
    try {
      await axios.post(`${API}/dashboard/livrables/validate`, { livrable_id: id });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="glass-card" data-testid="livrables-card">
      <div className="card-label" style={{ marginBottom: 8 }}>
        <Sparkles size={13} />
        Livrables IA
      </div>

      {livrables.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--txt-muted)", margin: "2px 0 4px" }} data-testid="livrables-empty">
          Aucun livrable généré pour l&rsquo;instant. Génère une analyse depuis Vision Board ou Croissance.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {livrables.map((l) => {
          const Icon = iconFor(l.id);
          const done = validated[l.id];
          return (
            <div key={l.id} data-testid={`livrable-${l.id}`}
                 className="livrable-item"
                 style={{
                   display: "flex", alignItems: "center", gap: 10,
                   padding: 10, borderRadius: 12,
                   background: "rgba(255,255,255,0.06)",
                   border: "1px solid rgba(255,255,255,0.10)",
                 }}>
              <span style={{
                width: 32, height: 32, borderRadius: 8,
                background: "rgba(201,164,73,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#C9A449", flexShrink: 0,
              }}>
                <Icon size={14} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--txt)", fontWeight: 500, lineHeight: 1.2 }}>
                  {l.title}
                </div>
                <div style={{ fontSize: 10, color: "var(--txt-muted)" }}>
                  Généré par l&rsquo;IA · {l.time}
                </div>
              </div>
              <button
                onClick={() => handleValidate(l.id)}
                data-testid={`livrable-${l.id}-validate`}
                disabled={done}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "5px 10px", borderRadius: 999,
                  background: done ? "rgba(94,138,90,0.30)" : "linear-gradient(135deg,#C9A449,#E5C887)",
                  border: "none", color: done ? "#8fa876" : "#1a2f4a",
                  fontSize: 11, fontWeight: 500, cursor: done ? "default" : "pointer",
                  fontFamily: "inherit", flexShrink: 0,
                }}>
                <Check size={11} /> {done ? "Validé" : "Valider"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
