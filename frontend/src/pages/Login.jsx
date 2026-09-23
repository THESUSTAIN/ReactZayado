import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, ArrowRight, Loader2, Eye, ShieldCheck, Server, Lock, RotateCcw } from "lucide-react";
import { GlassCard } from "@/components/kairos/GlassCard";
import {
  fetchConnexionOptions, demanderLien, entrerApercu, connexionDemo, oauthStart, verifierLien, setToken, fetchState,
  connexionMdp, inscriptionMdp,
} from "@/lib/kairosApi";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 34.9 26.9 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.6 5.1C9.6 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.5C41.4 36.8 44 31 44 24c0-1.3-.1-2.3-.4-3.5z" /></svg>
  );
}
function MicrosoftIcon() {
  return (<svg width="16" height="16" viewBox="0 0 23 23" aria-hidden><path fill="#f35325" d="M1 1h10v10H1z" /><path fill="#81bc06" d="M12 1h10v10H12z" /><path fill="#05a6f0" d="M1 12h10v10H1z" /><path fill="#ffba08" d="M12 12h10v10H12z" /></svg>);
}

const PREVIEW = typeof window !== "undefined" && /(preview\.emergentagent\.com|localhost|127\.0\.0\.1)/i.test(window.location.hostname);

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [lienDirect, setLienDirect] = useState(null);
  const [options, setOptions] = useState({ apercu_actif: false, google: false, microsoft: false });
  const [redirecting, setRedirecting] = useState(null);

  const [verification, setVerification] = useState(false);

  // Connexion email + mot de passe (demande utilisateur : ne pas être limité
  // au lien magique). modeAuth: "lien" | "mdp" ; inscription: bool.
  const [modeAuth, setModeAuth] = useState("lien");
  const [inscription, setInscription] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");
  const [voirMdp, setVoirMdp] = useState(false);

  useEffect(() => {
    fetchConnexionOptions().then(setOptions).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    if (params.get("erreur")) {
      toast.error("Connexion impossible. Réessaie.");
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  const enter = async () => {
    // Corrigé : partait toujours vers /app, même pour un tout nouvel
    // utilisateur — qui ne voyait donc jamais l'onboarding (ni le choix
    // d'offre à la fin). Vérifie le vrai statut avant de rediriger.
    const requested = new URLSearchParams(window.location.search).get("next");
    const next = requested && requested.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/login")
      ? requested : null;
    try {
      const d = await fetchState();
      navigate(next || (d?.profile?.onboarded ? "/app" : "/onboarding"));
    } catch {
      navigate(next || "/onboarding");
    }
  };

  // Retour OAuth : le backend redirige ici avec #access_token=... (jamais en
  // query pour éviter qu'il finisse dans des logs serveur).
  useEffect(() => {
    const hash = window.location.hash || "";
    const m = hash.match(/access_token=([^&]+)/);
    if (m) {
      setToken(decodeURIComponent(m[1]));
      window.history.replaceState({}, "", "/login");
      toast.success("Connexion réussie.");
      enter();
    }
  }, []);

  // Lien magique : /login?token=xxx — vérifié une seule fois au chargement.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) return;
    setVerification(true);
    verifierLien(token)
      .then((rep) => { setToken(rep.access_token); enter(); })
      .catch(() => {
        setVerification(false);
        window.history.replaceState({}, "", "/login");
        toast.error("Ce lien est invalide ou a expiré. Demande-en un nouveau.");
      });
  }, []);

  const doOauth = async (provider, label) => {
    setRedirecting(label);
    try {
      const res = await oauthStart(provider, `${window.location.origin}/login`);
      if (res?.configured && res.authorization_url) {
        window.location.href = res.authorization_url;
        return;
      }
      // Preview : pas encore de clés OAuth → on ouvre le compte démo.
      await connexionDemo();
      toast.info(`${label} : connexion réelle bientôt (production). Ouverture de l'aperçu.`);
      enter();
    } catch {
      toast.error(`Connexion ${label} indisponible pour l'instant.`);
    } finally {
      setRedirecting(null);
    }
  };

  const openThomas = async () => {
    try { await connexionDemo("thomas@zayado.net", "Thomas"); toast.success("Compte test ouvert"); enter(); }
    catch { toast.error("Compte test indisponible ici."); }
  };
  const openThesustain = async () => {
    try { await connexionDemo("membre@thesustain.net"); enter(); }
    catch { toast.error("SSO thesustain.net indisponible ici."); }
  };

  const envoyer = async () => {
    if (!email.includes("@")) { toast.error("Entre une adresse email valide."); return; }
    setSending(true);
    try {
      const r = await demanderLien(email, window.location.origin);
      setSent(true);
      if (r.lien_direct) setLienDirect(r.lien_direct);
      toast.success(r.envoye ? "Lien envoyé — vérifie ta boîte mail." : "Lien prêt.");
    } catch { toast.error("Impossible d'envoyer le lien."); }
    setSending(false);
  };

  const envoyerMdp = async () => {
    if (!email.includes("@")) { toast.error("Entre une adresse email valide."); return; }
    if (motDePasse.length < 8) { toast.error("Mot de passe : 8 caractères minimum."); return; }
    setSending(true);
    try {
      if (inscription) {
        await inscriptionMdp(email, motDePasse);
        toast.success("Compte créé — bienvenue !");
      } else {
        await connexionMdp(email, motDePasse);
        toast.success("Connexion réussie.");
      }
      enter();
    } catch (e) {
      toast.error(e.message || "Connexion impossible.");
    }
    setSending(false);
  };

  return (
    <div className="zayado-blue flex min-h-screen items-center justify-center px-4 py-10">
      {redirecting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-navy-900/80 backdrop-blur-sm" data-testid="login-oauth-overlay">
          <Loader2 size={32} className="animate-spin text-gold" />
          <p className="text-sm text-offwhite/80">Redirection vers {redirecting}…</p>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <GlassCard data-testid="login-card">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F1E2CC] to-[#DEC2A3] font-wordmark text-2xl font-bold text-navy-900">K</div>
            <h1 className="font-display text-3xl font-extrabold text-offwhite">Zayado</h1>
            <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-gold">ESPACE PRIVÉ</p>
            <p className="mt-4 text-sm text-offwhite/70">Connecte-toi à ton espace privé Zayado — sans mot de passe à retenir.</p>
          </div>

          {/* Boutons sociaux */}
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => doOauth("google", "Google")} data-testid="login-google-btn"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-semibold text-offwhite transition hover:bg-white/10">
              <GoogleIcon /> Google
            </button>
            <button onClick={() => doOauth("microsoft", "Microsoft")} data-testid="login-microsoft-btn"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-semibold text-offwhite transition hover:bg-white/10">
              <MicrosoftIcon /> Microsoft
            </button>
          </div>

          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-offwhite/40">
            <span className="h-px flex-1 bg-white/10" /> ou par email <span className="h-px flex-1 bg-white/10" />
          </div>

          {/* Bascule lien magique / mot de passe */}
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/5 p-1" data-testid="login-mode-toggle">
            <button onClick={() => { setModeAuth("lien"); setSent(false); }} data-testid="login-mode-lien"
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${modeAuth === "lien" ? "bg-gold/15 text-gold" : "text-offwhite/60 hover:text-offwhite"}`}>
              Lien magique
            </button>
            <button onClick={() => setModeAuth("mdp")} data-testid="login-mode-mdp"
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${modeAuth === "mdp" ? "bg-gold/15 text-gold" : "text-offwhite/60 hover:text-offwhite"}`}>
              Mot de passe
            </button>
          </div>

          {modeAuth === "mdp" ? (
            <div className="space-y-3" data-testid="login-mdp-form">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="toi@exemple.com" data-testid="login-mdp-email" autoComplete="email"
                  className="w-full rounded-xl border border-white/12 bg-white/8 py-3 pl-9 pr-3 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30" />
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
                <input type={voirMdp ? "text" : "password"} value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && envoyerMdp()}
                  placeholder={inscription ? "Choisis un mot de passe (8+ caractères)" : "Ton mot de passe"}
                  data-testid="login-mdp-password" autoComplete={inscription ? "new-password" : "current-password"}
                  className="w-full rounded-xl border border-white/12 bg-white/8 py-3 pl-9 pr-10 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30" />
                <button type="button" onClick={() => setVoirMdp((v) => !v)} aria-label={voirMdp ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  data-testid="login-mdp-toggle-visibility"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-offwhite/40 hover:text-gold">
                  <Eye className="h-4 w-4" />
                </button>
              </div>
              <button onClick={envoyerMdp} disabled={sending} className="btn-gold w-full justify-center" data-testid="login-mdp-submit">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{inscription ? "Créer mon compte" : "Se connecter"} <ArrowRight className="h-4 w-4" /></>}
              </button>
              <p className="text-center text-[11px] text-offwhite/50">
                {inscription ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
                <button onClick={() => setInscription((v) => !v)} className="font-semibold text-gold hover:underline" data-testid="login-mdp-switch-mode">
                  {inscription ? "Se connecter" : "Créer un compte"}
                </button>
              </p>
            </div>
          ) : sent ? (
            <div className="space-y-4 text-center" data-testid="login-sent">
              <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm text-offwhite/90">
                Si un compte existe, un lien de connexion vient de partir vers <span className="font-semibold text-gold">{email}</span>. Il expire dans 15 minutes.
              </div>
              {lienDirect && (
                <a href={lienDirect} className="btn-ghost w-full justify-center" data-testid="login-lien-direct">
                  Ouvrir le lien (préproduction) <ArrowRight className="h-4 w-4" />
                </a>
              )}
              <button onClick={() => setSent(false)} className="inline-flex items-center gap-1.5 text-xs text-offwhite/50 hover:text-gold" data-testid="login-resend-btn">
                <RotateCcw className="h-3.5 w-3.5" /> Utiliser une autre adresse
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && envoyer()} placeholder="toi@exemple.com" data-testid="login-email"
                  className="w-full rounded-xl border border-white/12 bg-white/8 py-3 pl-9 pr-3 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30" />
              </div>
              <button onClick={envoyer} disabled={sending} className="btn-gold w-full justify-center" data-testid="login-submit">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Recevoir mon lien <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          )}

          {modeAuth === "lien" && (
            <p className="mt-4 text-center text-[11px] text-offwhite/40">Pas de compte ? Il sera créé automatiquement à ta première connexion.</p>
          )}

          <div className="my-4 h-px bg-white/10" />

          <button onClick={openThesustain} data-testid="login-thesustain-btn"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 bg-transparent px-3 py-2.5 text-sm font-semibold text-gold transition hover:bg-gold/10">
            Connexion SSO (thesustain.net)
          </button>

          {(options.apercu_actif || PREVIEW) && (
            <>
              <div className="my-4 h-px bg-white/10" />
              <p className="mb-2 text-center text-[10px] uppercase tracking-[0.2em] text-offwhite/40">Aperçu développeur (preview)</p>
              <button onClick={openThomas} data-testid="login-guest-btn"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20">
                <Eye className="h-4 w-4" /> Ouvrir le compte test (Thomas)
              </button>
            </>
          )}
        </GlassCard>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[11px] text-offwhite/50" data-testid="login-trust-footer">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={12} className="text-gold" /> Connexion chiffrée</span>
          <span className="inline-flex items-center gap-1.5"><Server size={12} /> Hébergement Europe</span>
          <span className="inline-flex items-center gap-1.5"><Lock size={12} /> HTTPS</span>
        </div>
      </motion.div>
    </div>
  );
}
