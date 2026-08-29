import React, { useState } from "react";
import { ArrowUp, Sparkles, Loader2 } from "lucide-react";
import { api } from "../lib/api";

const SUGGEST = [
  "Résume ma journée idéale de solopreneur",
  "Donne-moi une astuce de trésorerie",
  "Comment relancer un prospect sans insister ?",
];

export default function LiveCopiloteDemo() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const send = async (text) => {
    const value = (text || input).trim();
    if (!value || loading) return;
    setMessages((m) => [...m, { role: "user", text: value }]);
    setInput("");
    setLoading(true);
    try {
      const r = await api.post("/growth/copilote", { message: value });
      const reply = r?.data?.reply || "Le copilote est momentanément indisponible. Réessayez.";
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: "Connexion au copilote impossible pour l'instant." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-demo-box" data-testid="live-copilote-demo">
      <div className="lp-demo-head"><Sparkles size={16} className="lp-gold" /> Copilote IA · démo en direct</div>
      <div className="lp-demo-stream">
        {messages.length === 0 && <p className="lp-demo-empty">Posez une question — le copilote répond réellement (IA Mammouth).</p>}
        {messages.map((m, i) => (
          <div key={i} className={`lp-demo-msg ${m.role}`}>{m.text}</div>
        ))}
        {loading && <div className="lp-demo-msg assistant lp-demo-loading"><Loader2 size={15} className="lp-spin" /> Le copilote réfléchit…</div>}
      </div>
      <div className="lp-demo-suggest">
        {SUGGEST.map((s) => <button key={s} onClick={() => send(s)} disabled={loading}>{s}</button>)}
      </div>
      <div className="lp-demo-input">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Écrivez au copilote…" data-testid="demo-input" />
        <button onClick={() => send()} disabled={loading} data-testid="demo-send" aria-label="Envoyer"><ArrowUp size={18} /></button>
      </div>
    </div>
  );
}
