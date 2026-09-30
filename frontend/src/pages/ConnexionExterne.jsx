import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ShieldCheck, Loader2, Check, X } from "lucide-react";
import { useKairos } from "@/context/KairosContext";
import { fetchClientSso, creerCodeSso } from "@/lib/kairosApi";

const CLE_OK = "zayado_sso_autorise";

// « Se connecter avec Zayado » : une application séparée (ex. l'app RH entreprise)
// demande l'identité du compte. On montre ce qui est partagé, puis on renvoie
// vers l'application avec un code à usage unique.
export default function ConnexionExterne() {
  const [params] = useSearchParams();
  const { user } = useKairos();
  const clientId = params.get("client_id") || "";
  const redirectUri = params.get("redirect_uri") || "";
  const state = params.get("state") || "";
  const [client, setClient] = useState(null);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const deja = () => { try { return (JSON.parse(localStorage.getItem(CLE_OK) || "[]")).includes(clientId); } catch { return false; } };

  const autoriser = async () => {
    setEnvoi(true);
    try {
      const r = await creerCodeSso({ client_id: clientId, redirect_uri: redirectUri, state });
      try {
        const l = JSON.parse(localStorage.getItem(CLE_OK) || "[]");
        if (!l.includes(clientId)) localStorage.setItem(CLE_OK, JSON.stringify([...l, clientId]));
      } catch { /* stockage indisponible */ }
      window.location.assign(r.redirect);
    } catch {
      setErreur("Connexion impossible pour le moment. Réessaie dans un instant.");
      setEnvoi(false);
    }
  };

  useEffect(() => {
    fetchClientSso(clientId, redirectUri)
      .then((c) => { setClient(c); if (deja()) autoriser(); })
      .catch(() => setErreur("Cette application n'est pas reconnue par Zayado."));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const annuler = () => {
    if (!client) { window.location.assign("/"); return; }
    const sep = redirectUri.includes("?") ? "&" : "?";
    window.location.assign(`${redirectUri}${sep}error=access_denied&state=${encodeURIComponent(state)}`);
  };

  return (
    <div className="zayado-blue flex min-h-screen items-center justify-center px-4" data-testid="connexion-externe">
      <div className="w-full max-w-md rounded-3xl border border-white/12 bg-white/[0.06] p-7 text-center">
        <img src="/logo.png" alt="Zayado" className="mx-auto h-14 w-14 object-contain" />
        {erreur ? (
          <>
            <h1 className="mt-4 font-display text-2xl font-bold text-offwhite">Connexion refusée</h1>
            <p className="mt-2 text-sm text-offwhite/65">{erreur}</p>
          </>
        ) : !client ? (
          <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-gold" />
        ) : (
          <>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Se connecter avec Zayado</p>
            <h1 className="mt-2 font-display text-2xl font-bold text-offwhite">{client.nom} veut utiliser ton compte</h1>
            <p className="mt-2 text-sm text-offwhite/60">Connecté·e en tant que <b className="text-offwhite">{user.firstName}</b>. L'application ({client.domaine}) recevra :</p>
            <ul className="mx-auto mt-4 max-w-xs space-y-2 text-left text-sm text-offwhite/80">
              {["Ton e-mail et ton prénom", "Le nom de ton entreprise", "Ton offre Zayado (pour ouvrir l'accès)"].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-gold" /> {t}</li>
              ))}
            </ul>
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-offwhite/45"><ShieldCheck className="h-3.5 w-3.5" /> Ni ton mot de passe, ni tes données Zayado ne sont partagés.</p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button onClick={annuler} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 px-4 py-3 text-sm font-semibold text-offwhite/80" data-testid="sso-annuler"><X className="h-4 w-4" /> Annuler</button>
              <button onClick={autoriser} disabled={envoi} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#F4EFE6] px-4 py-3 text-sm font-bold text-navy-900 disabled:opacity-60" data-testid="sso-autoriser">
                {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Autoriser
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
