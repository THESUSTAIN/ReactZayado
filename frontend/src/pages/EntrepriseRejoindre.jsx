import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import { entInvitationInfos, entRejoindre, getToken, fetchConnexionOptions, oauthStart } from "@/lib/kairosApi";
import { oublierAbonnement } from "@/lib/acces";
import { oublierEspace } from "@/lib/espace";
import { garderInvitation, lireInvitation, oublierInvitation, urlRejoindre } from "@/lib/invitationEquipe";

// Page d'arrivée du lien d'invitation. L'invité n'a besoin d'aucune offre payante :
// il se connecte avec son compte Microsoft (pro ou perso), son compte Google, ou crée un compte Zayado gratuit
// avec son e-mail. L'invitation est mémorisée le temps de la connexion puis il revient ici.

const DANS_IFRAME = (() => { try { return window.self !== window.top; } catch { return true; } })();

function MicrosoftIcon() {
  return (<svg width="16" height="16" viewBox="0 0 23 23" aria-hidden><path fill="#f35325" d="M1 1h10v10H1z" /><path fill="#81bc06" d="M12 1h10v10H12z" /><path fill="#05a6f0" d="M1 12h10v10H1z" /><path fill="#ffba08" d="M12 12h10v10H12z" /></svg>);
}
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 34.9 26.9 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.6 5.1C9.6 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.5C41.4 36.8 44 31 44 24c0-1.3-.1-2.3-.4-3.5z" /></svg>
  );
}

const BTN_SOCIAL = "flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-2xl border border-white/20 bg-white/[0.07] px-4 text-[15px] font-semibold text-white transition hover:bg-white/10 disabled:opacity-60";

export default function EntrepriseRejoindre() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || lireInvitation() || "";
  const [infos, setInfos] = useState(null);
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [options, setOptions] = useState({ google: false, microsoft: false });
  const [consent, setConsent] = useState(false);
  const [redirection, setRedirection] = useState("");
  const connecte = Boolean(getToken && getToken());

  useEffect(() => {
    if (!token) { setErreur("Ce lien est incomplet."); return; }
    garderInvitation(token);
    entInvitationInfos(token).then(setInfos).catch(() => {
      oublierInvitation();
      setErreur("Cette invitation n'existe plus ou a expiré. Demande un nouveau lien.");
    });
  }, [token]);

  useEffect(() => {
    if (connecte) return;
    fetchConnexionOptions().then((o) => setOptions({ google: !!o?.google, microsoft: !!o?.microsoft })).catch(() => {});
  }, [connecte]);

  const rejoindre = async () => {
    setOccupe(true);
    try {
      await entRejoindre(token);
      oublierInvitation();
      oublierAbonnement();   // l'état « salarié » doit être relu tout de suite (cache de 60 s sinon → renvoi vers le paiement)
      oublierEspace();
      toast.success("Bienvenue dans l'équipe !");
      navigate("/app/entreprise", { replace: true });
    } catch (e) { toast.error(e?.detail || "Impossible de rejoindre pour le moment."); }
    setOccupe(false);
  };

  // Même mécanique que la page /login : le fournisseur renvoie sur /login?code=…, qui échange le code,
  // puis /login ramène ici grâce à l'invitation mémorisée.
  const connecterAvec = async (provider, label) => {
    if (!consent) { toast.error("Merci d'accepter la politique de confidentialité pour continuer."); return; }
    garderInvitation(token);
    setRedirection(label);
    try {
      const res = await oauthStart(provider, `${window.location.origin}/login`);
      if (res?.configured && res.authorization_url) {
        try { localStorage.setItem("zayado_oauth_state", new URL(res.authorization_url).searchParams.get("state") || ""); } catch { /* rien */ }
        window.location.href = res.authorization_url;
        return;
      }
      toast.error(`La connexion ${label} n'est pas encore disponible. Utilise ton e-mail.`);
    } catch {
      toast.error(`Connexion ${label} indisponible pour l'instant.`);
    }
    setRedirection("");
  };

  const social = !DANS_IFRAME && (options.microsoft || options.google);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10" data-testid="entreprise-rejoindre">
      <div className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 text-center">
        <Building2 className="mx-auto h-8 w-8 text-gold" />
        {!infos && !erreur && <Loader2 className="mx-auto mt-4 animate-spin text-white/60" />}
        {erreur && <p className="mt-4 text-[15px] text-white/85">{erreur}</p>}
        {infos && (
          <>
            <h1 className="mt-3 text-[20px] font-semibold text-white">{infos.entreprise || "Une équipe"} t'invite</h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-white/75">Tu rejoins l'équipe pour la présence, les absences, le planning et le temps. Rien de personnel (énergie, vision, foi) n'est partagé. C'est gratuit pour toi.</p>
            {connecte ? (
              <button onClick={rejoindre} disabled={occupe} data-testid="rejoindre-go" className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#DEC2A3] to-[#F1E2CC] px-5 text-[15px] font-semibold text-navy-900 disabled:opacity-60">
                {occupe && <Loader2 size={16} className="animate-spin" />} Rejoindre l'équipe
              </button>
            ) : (
              <div className="mt-5 space-y-2.5 text-left">
                {social && (
                  <>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5" data-testid="rejoindre-consent">
                      <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#DEC2A3]" />
                      <span className="text-[12.5px] leading-relaxed text-white/70">
                        J'ai lu et j'accepte la <a href="/legal/confidentialite" target="_blank" rel="noreferrer" className="font-semibold text-gold hover:underline">politique de confidentialité</a>.
                      </span>
                    </label>
                    {options.microsoft && (
                      <button onClick={() => connecterAvec("microsoft", "Microsoft")} disabled={!!redirection} data-testid="rejoindre-microsoft" className={BTN_SOCIAL}>
                        {redirection === "Microsoft" ? <Loader2 size={16} className="animate-spin" /> : <MicrosoftIcon />} Continuer avec Microsoft
                      </button>
                    )}
                    {options.google && (
                      <button onClick={() => connecterAvec("google", "Google")} disabled={!!redirection} data-testid="rejoindre-google" className={BTN_SOCIAL}>
                        {redirection === "Google" ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />} Continuer avec Google
                      </button>
                    )}
                    <p className="pt-1 text-center text-[12px] text-white/50">ou</p>
                  </>
                )}
                <Link to={`/login?next=${encodeURIComponent(urlRejoindre(token))}`} data-testid="rejoindre-email"
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-[#DEC2A3] to-[#F1E2CC] px-5 text-[15px] font-semibold text-navy-900">
                  {social ? "Utiliser mon e-mail" : "Créer mon compte ou me connecter"}
                </Link>
              </div>
            )}
            <button onClick={() => { oublierInvitation(); navigate("/"); }} className="mt-4 text-[12.5px] text-white/50 underline-offset-2 hover:text-white/80 hover:underline" data-testid="rejoindre-plus-tard">Pas maintenant</button>
          </>
        )}
      </div>
    </div>
  );
}
