import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, ShieldCheck, RotateCcw, ArrowRight, Server } from "lucide-react";
import { toast } from "sonner";
import {
  authLogin, sendMagicLink, verifyMagicLink, demoLogin, oauthStart, setLanguage,
} from "../lib/api";

// Reprend fidèlement la structure de la page login d'origine de final-main
// (sélecteur de langue, mémoire de la dernière méthode utilisée, bandeau de
// confiance factuel) — recolorée sur la palette Cours-main. Boutons
// Google/Microsoft/lien magique/démo tous branchés sur de vrais endpoints
// existants côté serveur (voir routes/auth.py, routes/oauth.py) — jamais
// un bouton décoratif.
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 34.9 26.9 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.6 5.1C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.5C41.4 36.8 44 31 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
function MicrosoftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 23 23">
      <path fill="#f35325" d="M1 1h10v10H1z" /><path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" /><path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  );
}

const STR = {
  fr: {
    welcome: "Bienvenue sur", subtitle: "Connectez-vous à votre espace Zayado en quelques secondes.",
    google: "Google", microsoft: "Microsoft", orEmail: "ou par email", yourEmail: "Votre email",
    getLink: "Recevoir mon lien", emailSent: "Email envoyé",
    clickLink: (e) => <>Cliquez sur le lien reçu à <b>{e}</b> pour vous connecter.</>,
    previewText: "Envoi d'email momentanément indisponible — utilisez ce lien pour vous connecter :",
    connectNow: "→ Se connecter maintenant", resend: "Renvoyer un lien",
    withPassword: "Se connecter avec un mot de passe", withMagic: "Se connecter sans mot de passe (lien par email)",
    lastLogin: "Dernière méthode utilisée", thesustain: "Continuer avec thesustain.net",
    testAccount: "Ouvrir le compte test (Thomas)", cgu: "CGU", privacy: "Confidentialité",
    trustHosting: "Hébergement Railway", trustEncryption: "Connexion chiffrée (HTTPS)",
  },
  en: {
    welcome: "Welcome to", subtitle: "Sign in to your Zayado space in a few seconds.",
    google: "Google", microsoft: "Microsoft", orEmail: "or with email", yourEmail: "Your email",
    getLink: "Send me a link", emailSent: "Email sent",
    clickLink: (e) => <>Click the link sent to <b>{e}</b> to sign in.</>,
    previewText: "Email delivery temporarily unavailable — use this link to sign in:",
    connectNow: "→ Sign in now", resend: "Resend a link",
    withPassword: "Sign in with a password", withMagic: "Sign in without a password (email link)",
    lastLogin: "Last method used", thesustain: "Continue with thesustain.net",
    testAccount: "Open test account (Thomas)", cgu: "Terms", privacy: "Privacy",
    trustHosting: "Hosted on Railway", trustEncryption: "Encrypted connection (HTTPS)",
  },
};

const LAST_METHOD_KEY = "zayado_last_login_method";

export default function Login() {
  const navigate = useNavigate();
  const [lang, setLang] = useState(() => localStorage.getItem("zayado_lang") || "fr");
  const t = STR[lang] || STR.fr;
  const [mode, setMode] = useState("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [magicSent, setMagicSent] = useState(false);
  const [devLink, setDevLink] = useState(null);

  const changeLang = (l) => { setLang(l); localStorage.setItem("zayado_lang", l); setLanguage(l).catch(() => {}); };
  const rememberMethod = (m) => localStorage.setItem(LAST_METHOD_KEY, m);
  const lastMethod = localStorage.getItem(LAST_METHOD_KEY);
  const lastMethodLabel = lastMethod === "google" ? "Google" : lastMethod === "microsoft" ? "Microsoft" : lastMethod === "email" ? "Email" : lastMethod === "thesustain" ? "TheSustain" : null;

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return;
    verifyMagicLink(token)
      .then((res) => {
        localStorage.setItem("cours_auth_token", res.access_token || res.token);
        toast.success("Connexion réussie");
        navigate(res.user?.onboarding_done ? "/" : "/onboarding");
      })
      .catch(() => toast.error("Ce lien de connexion est invalide ou a expiré."));
  }, [navigate]);

  const finishLogin = (res) => {
    localStorage.setItem("cours_auth_token", res.access_token || res.token);
    navigate(res.user?.onboarding_done ? "/" : "/onboarding");
  };

  const submit = async () => {
    if (!email.trim() || !password) return toast.error("Email et mot de passe requis");
    setLoading(true);
    try {
      const res = await authLogin(email.trim(), password);
      rememberMethod("email");
      toast.success("Connexion réussie");
      finishLogin(res);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Échec de la connexion");
    } finally { setLoading(false); }
  };

  const sendLink = async () => {
    if (!email.trim()) return toast.error("Entrez votre adresse email.");
    setLoading(true);
    try {
      const res = await sendMagicLink(email.trim());
      setMagicSent(true);
      rememberMethod("email");
      if (res.dev_link) { setDevLink(res.dev_link); toast.success("Utilisez le lien affiché pour vous connecter."); }
      else if (res.delivered_via_email) toast.success(`Lien envoyé à ${res.masked_email || email}`);
      else { toast.error("Envoi impossible pour le moment. Essayez un mot de passe."); setMagicSent(false); }
    } catch { toast.error("Envoi impossible pour le moment."); }
    finally { setLoading(false); }
  };

  const openDemo = async (demoEmail, methodTag) => {
    setLoading(true);
    try {
      const res = await demoLogin(demoEmail);
      rememberMethod(methodTag);
      toast.success("Compte ouvert");
      finishLogin(res);
    } catch { toast.error("Compte de démo indisponible ici."); }
    finally { setLoading(false); }
  };

  const doOauth = async (provider) => {
    setOauthLoading(provider);
    try {
      const redirectUri = `${window.location.origin}/login`;
      const res = await oauthStart(provider, redirectUri);
      rememberMethod(provider);
      window.location.href = res.authorization_url;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(detail || `Connexion ${provider === "google" ? "Google" : "Microsoft"} pas encore configurée.`);
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-10" data-testid="login-page">
      {/* Même fond que le reste de l'application (classe .sky-bg, index.css).
          Avant : un backgroundColor inline sur ce conteneur passait AU-DESSUS
          du dégradé .sky-bg (même contexte d'empilement, priorité de
          cascade) — d'où le bleu plat trop sombre signalé, différent du
          reste de l'app. Retiré : .sky-bg fixed suffit, comme dans Layout.jsx. */}
      <div className="fixed inset-0 -z-10 sky-bg" aria-hidden="true" />

      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-3">
          <div className="inline-flex rounded-full border border-white/15 p-0.5" role="group" aria-label="Language" data-testid="login-lang-switch">
            <button onClick={() => changeLang("fr")} data-testid="login-lang-fr"
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${lang === "fr" ? "gold-bg text-[#0A1128]" : "text-white/50"}`}>FR</button>
            <button onClick={() => changeLang("en")} data-testid="login-lang-en"
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${lang === "en" ? "gold-bg text-[#0A1128]" : "text-white/50"}`}>EN</button>
          </div>
        </div>

        <div className="text-center mb-6">
          <img src="/logo-icon.png" alt="MyExtension Business — by Zayado" className="w-14 h-14 mx-auto rounded-2xl mb-4" onError={(e) => { e.target.style.display = "none"; }} />
          <h1 className="font-head text-2xl font-semibold text-white" data-testid="login-title">
            {t.welcome} MyExtension Business{" "}
            <span className="text-[11px] font-normal text-[#DEC2A3]/75 align-middle" data-testid="login-title-by">
              <em className="not-italic font-light">by</em> Zayado
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-white/55">{t.subtitle}</p>
        </div>

        <div className="glass rounded-2xl p-6" data-testid="login-card">
          <div className="space-y-2.5">
            <button onClick={() => doOauth("google")} disabled={!!oauthLoading} data-testid="login-google-btn"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/95 py-2.5 text-sm font-medium text-[#1F1F1F] hover:bg-white disabled:opacity-60">
              {oauthLoading === "google" ? <Loader2 size={15} className="animate-spin" /> : <GoogleIcon />} {t.google}
            </button>
            <button onClick={() => doOauth("microsoft")} disabled={!!oauthLoading} data-testid="login-microsoft-btn"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60">
              {oauthLoading === "microsoft" ? <Loader2 size={15} className="animate-spin" /> : <MicrosoftIcon />} {t.microsoft}
            </button>
          </div>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" /><span className="text-[11px] text-white/40">{t.orEmail}</span><div className="h-px flex-1 bg-white/10" />
          </div>

          {mode === "magic" ? (
            magicSent ? (
              <div className="rounded-xl border border-[#DEC2A3]/30 bg-[#DEC2A3]/10 p-4 text-sm text-white/85" data-testid="login-email-sent">
                <div className="flex items-center gap-2 mb-1.5"><Mail size={16} className="text-[#DEC2A3]" /><strong>{t.emailSent}</strong></div>
                {devLink ? (
                  <>
                    <p className="text-white/60 text-[13px]">{t.previewText}</p>
                    <a href={devLink} data-testid="login-dev-link"
                      className="mt-2 inline-flex items-center gap-1 rounded-full gold-bg px-3.5 py-1.5 text-xs font-semibold text-[#0A1128]">
                      {t.connectNow} <ArrowRight size={12} />
                    </a>
                  </>
                ) : <p className="text-white/60 text-[13px]">{t.clickLink(email)}</p>}
                <button onClick={sendLink} disabled={loading} data-testid="login-resend-btn" className="mt-2.5 inline-flex items-center gap-1 text-xs text-white/50 hover:text-white/80">
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} {t.resend}
                </button>
              </div>
            ) : (
              <>
                <label className="mb-1.5 block text-[12px] font-medium text-white/60" htmlFor="login-email">{t.yourEmail}</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                  <input id="login-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="vous@exemple.fr" data-testid="login-email"
                    onKeyDown={(e) => e.key === "Enter" && sendLink()}
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-9 pr-3.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#DEC2A3]/50" />
                </div>
                <button onClick={sendLink} disabled={loading} data-testid="login-email-btn"
                  className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl gold-bg py-2.5 text-sm font-semibold text-[#0A1128] disabled:opacity-60">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} {t.getLink}
                </button>
                <button onClick={() => setMode("login")} className="mt-2.5 w-full text-center text-xs text-white/50 hover:text-white/80">{t.withPassword}</button>
              </>
            )
          ) : (
            <div className="space-y-2.5">
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" data-testid="login-email"
                  className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-9 pr-3.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#DEC2A3]/50" />
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Mot de passe" data-testid="login-password"
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-9 pr-3.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#DEC2A3]/50" />
              </div>
              <button onClick={submit} disabled={loading} data-testid="login-submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl gold-bg py-2.5 text-sm font-semibold text-[#0A1128] disabled:opacity-60">
                {loading ? <Loader2 size={15} className="animate-spin" /> : "Se connecter"}
              </button>
              <button onClick={() => setMode("magic")} className="w-full text-center text-xs text-white/50 hover:text-white/80">{t.withMagic}</button>
            </div>
          )}

          {lastMethodLabel && (
            <p className="mt-3 text-center text-[11px] text-white/35" data-testid="login-last-method">{t.lastLogin} : {lastMethodLabel}</p>
          )}

          {process.env.NODE_ENV !== "production" && (
            <>
              <div className="my-4 h-px bg-white/10" />
              <button onClick={() => openDemo("membre@thesustain.net", "thesustain")} disabled={loading} data-testid="login-thesustain-btn"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#DEC2A3]/25 bg-[#DEC2A3]/5 py-2.5 text-sm font-medium text-[#DEC2A3] hover:text-[#E5C887] hover:bg-[#DEC2A3]/10 disabled:opacity-60">
                {t.thesustain}
              </button>
              <button onClick={() => openDemo("thomas@zayado.fr", "demo")} disabled={loading} data-testid="login-guest-btn"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent py-2.5 text-sm font-medium text-white/60 hover:text-white/85 hover:bg-white/5 disabled:opacity-60">
                {t.testAccount}
              </button>
            </>
          )}
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-white/40">
          <ShieldCheck size={12} />
          <a href="https://zayado.net/cgu" target="_blank" rel="noreferrer" className="hover:text-white/70">{t.cgu}</a>
          <span>·</span>
          <a href="https://zayado.net/confidentialite" target="_blank" rel="noreferrer" data-testid="login-privacy-link" className="hover:text-white/70">{t.privacy}</a>
        </p>

        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-3.5 opacity-70" data-testid="login-trust-footer">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-white/60" title={t.trustHosting}><Server size={12} /> {t.trustHosting}</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-white/60" title={t.trustEncryption}><Lock size={12} /> {t.trustEncryption}</span>
        </div>
      </div>
    </div>
  );
}
