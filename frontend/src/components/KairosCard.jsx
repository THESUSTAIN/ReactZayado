import React, { useEffect, useState } from "react";
import { Compass, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const VALUE_TAGS = [
  "Famille", "Intégrité", "Impact", "Liberté", "Simplicité",
  "Excellence", "Foi", "Communauté", "Créativité", "Sérénité",
];

/* Kairos — dimension valeurs, 100% opt-in (backlog #19). Aucun scoring, aucune
 * détection automatique de "désalignement" — juste un choix de valeurs et un
 * rappel hebdomadaire doux (envoyé côté backend par agent_livraison.py),
 * jamais une alerte de jugement. */
export default function KairosCard() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [values, setValues] = useState([]);
  const [freetext, setFreetext] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const k = user?.settings?.kairos || {};
    setEnabled(!!k.enabled);
    setValues(k.values || []);
    setFreetext(k.values_freetext || "");
  }, [user]);

  const toggleValue = (v) => {
    setValues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const save = async (patch) => {
    setSaving(true);
    try {
      await authApi.updateSettings({ kairos: { enabled, values, values_freetext: freetext, ...patch } });
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    save({ enabled: next });
  };

  return (
    <div style={{
      borderRadius: 14, padding: 18, marginBottom: 16,
      background: "var(--glass-soft)", border: "1px solid var(--glass-border)",
    }} data-testid="kairos-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--txt)", fontSize: 13, fontWeight: 700 }}>
          <Compass size={15} /> Kairos — vos valeurs
        </div>
        <button onClick={toggleEnabled} disabled={saving} data-testid="kairos-toggle"
          className={`w-11 h-6 rounded-full relative transition-colors ${enabled ? "bg-navy" : "bg-sand-200"} disabled:opacity-60`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
      <p style={{ fontSize: 12, color: "var(--txt-muted)", margin: "0 0 12px" }}>
        100% optionnel. Si activé, un rappel doux (une fois par semaine maximum) vous
        invite à vérifier que votre cap ressemble à vos valeurs — jamais un jugement,
        jamais un score.
      </p>
      {enabled && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {VALUE_TAGS.map((v) => (
              <button key={v} onClick={() => toggleValue(v)} data-testid={`kairos-value-${v}`}
                style={{
                  padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: values.includes(v) ? "#C9A449" : "var(--glass-soft)",
                  color: values.includes(v) ? "#0B1F3A" : "var(--txt)",
                  border: "1px solid var(--glass-border)",
                }}>
                {v}
              </button>
            ))}
          </div>
          <textarea
            value={freetext}
            onChange={(e) => setFreetext(e.target.value)}
            onBlur={() => save({ values, values_freetext: freetext })}
            placeholder="Ou décrivez avec vos propres mots ce qui compte pour vous…"
            rows={2}
            className="zinput"
            style={{ width: "100%", fontSize: 12.5 }}
            data-testid="kairos-freetext"
          />
          <button onClick={() => save({ values, values_freetext: freetext })} disabled={saving}
            style={{ marginTop: 8, fontSize: 11.5, color: "var(--txt-muted)", background: "none", border: "none", cursor: "pointer" }}>
            {saving ? <Loader2 size={12} className="animate-spin inline" /> : "Enregistrer les valeurs sélectionnées"}
          </button>
        </>
      )}
    </div>
  );
}
