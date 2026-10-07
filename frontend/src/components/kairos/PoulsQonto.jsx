import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Landmark } from "lucide-react";
import { call } from "@/lib/part2Api";

// Bloc « source Qonto » du Pouls Business : connexion (login d'organisation + clé secrète,
// chiffrés côté serveur) puis synchronisation trésorerie + encaissements du mois.
export default function PoulsQonto({ onSynced }) {
  const [connecte, setConnecte] = useState(null);
  const [login, setLogin] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    call("/connections/qonto/status").then((r) => setConnecte(!!r.connecte)).catch(() => setConnecte(false));
  }, []);

  const synchroniser = async (silencieux = false) => {
    setBusy(true);
    try {
      const d = await call("/cockpit/pouls/sync", "POST");
      onSynced && onSynced(d);
      if (!silencieux) toast.success("Pouls synchronisé avec Qonto");
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const connecter = async () => {
    setBusy(true);
    try {
      await call("/connections/qonto/connect", "POST", { login, secret_key: secret });
      setSecret("");
      setConnecte(true);
      toast.success("Qonto connecté");
    } catch (e) { toast.error(e.message); setBusy(false); return; }
    setBusy(false);
    await synchroniser(true);
  };

  const champ = "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-offwhite outline-none focus:border-gold/50";
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid="pouls-qonto">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-offwhite/80"><Landmark size={13} /> Qonto</p>
      {connecte ? (
        <button onClick={() => synchroniser()} disabled={busy} data-testid="pouls-qonto-sync"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 px-3 py-2 text-sm text-gold disabled:opacity-60">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Synchroniser maintenant
        </button>
      ) : (
        <>
          <input className={champ} placeholder="Identifiant d'organisation Qonto" value={login} onChange={(e) => setLogin(e.target.value)} />
          <input className={champ} type="password" placeholder="Clé secrète API" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" />
          <button onClick={connecter} disabled={busy || login.length < 3 || secret.length < 8} data-testid="pouls-qonto-connect"
            className="w-full rounded-xl bg-gold px-3 py-2 text-sm font-bold text-navy-900 disabled:opacity-60">
            {busy ? "Connexion…" : "Connecter Qonto"}
          </button>
        </>
      )}
      <p className="text-[10px] text-offwhite/45">Trésorerie = soldes des comptes EUR. « CA mensuel » = encaissements du mois en cours (approximation).</p>
    </div>
  );
}
