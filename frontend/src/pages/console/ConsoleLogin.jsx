import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import { setToken } from "@/lib/kairosApi";

const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

// Porte unique de la console admin (admin.zayado.net).
// L'espace vendeur vit dans la SaaS (app.zayado.net) : un utilisateur peut être vendeur.
export default function ConsoleLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);
  const navigate = useNavigate();

  const soumettre = async (e) => {
    e.preventDefault();
    setChargement(true);
    setErreur(null);
    try {
      const r = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || "Identifiants incorrects");
      const probe = await fetch(`${API}/admin/vue-ensemble`, { headers: { Authorization: `Bearer ${j.access_token}` } });
      if (probe.status === 403) throw new Error("Ce compte n'a pas le rôle administrateur.");
      if (!probe.ok) throw new Error("Console indisponible.");
      setToken(j.access_token);
      navigate("/admin");
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="theme-creme flex min-h-screen items-center justify-center px-4" data-testid="console-login-page">
      <div className="glass w-full max-w-sm rounded-2xl p-8">
        <div className="tiret-rouge" />
        <div className="mt-4 flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold"><ShieldCheck size={18} /></span>
          <div>
            <h1 className="font-display text-lg font-bold">Console Admin</h1>
            <p className="text-[11px] text-offwhite/50">Zayado — accès restreint à l'équipe</p>
          </div>
        </div>
        <form onSubmit={soumettre} className="mt-6 space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email admin" data-testid="console-login-email" className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm focus:border-gold/50 focus:outline-none" />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" data-testid="console-login-password" className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm focus:border-gold/50 focus:outline-none" />
          {erreur && <p className="text-xs text-[#E0676E]" data-testid="console-login-error">{erreur}</p>}
          <button type="submit" disabled={chargement} data-testid="console-login-submit" className="btn-gold w-full justify-center">
            {chargement ? <Loader2 size={15} className="animate-spin" /> : "Entrer dans la console"}
          </button>
        </form>
        <p className="mt-4 text-center text-[11px] text-offwhite/45">Vendeur ou utilisateur ? C'est dans l'app : <a href="https://app.zayado.net" className="text-gold hover:underline">app.zayado.net</a></p>
      </div>
    </div>
  );
}
