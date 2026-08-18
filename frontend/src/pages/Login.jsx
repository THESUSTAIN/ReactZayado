import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { authSignup, authLogin } from "../lib/api";

/* Boutons Google/Microsoft/thesustain.net : présents mais honnêtement
 * désactivés — demandent de vraies clés OAuth (client ID/secret) qu'on n'a
 * pas encore. Pas de fausse connexion qui ne ferait rien de réel derrière. */
const OAUTH_PROVIDERS = [
  { id: "google", label: "Continuer avec Google" },
  { id: "microsoft", label: "Continuer avec Microsoft" },
  { id: "thesustain", label: "Continuer avec thesustain.net" },
];

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(false);
  const [installBannerOpen, setInstallBannerOpen] = useState(true);

  const submit = async () => {
    if (!email.trim() || !password) return toast.error("Email et mot de passe requis");
    setLoading(true);
    try {
      const res = mode === "signup"
        ? await authSignup(email.trim(), password, firstName.trim())
        : await authLogin(email.trim(), password);
      localStorage.setItem("cours_auth_token", res.token);
      toast.success(mode === "signup" ? "Compte créé" : "Connexion réussie");
      navigate(res.user.onboarding_done ? "/" : "/onboarding");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Échec de la connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A1128] p-4" data-testid="page-login">
      {installBannerOpen && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 bg-[#D4AF37]/15 px-4 py-2.5 text-[13px] text-[#F0DCA5]">
          <span>Installez l'application pour un accès plus rapide.</span>
          <button onClick={() => setInstallBannerOpen(false)} className="shrink-0 text-[#F0DCA5]/70 hover:text-white" data-testid="close-install-banner"><X size={16} /></button>
        </div>
      )}

      <div className="glass w-full max-w-sm rounded-2xl p-6">
        <h1 className="font-head text-xl font-semibold text-white">{mode === "signup" ? "Créer un compte" : "Connexion"}</h1>
        <p className="mt-1 text-sm text-white/55">{mode === "signup" ? "Quelques secondes pour commencer." : "Content de vous revoir."}</p>

        <div className="mt-5 space-y-2.5">
          {OAUTH_PROVIDERS.map((p) => (
            <button key={p.id} disabled title="Bientôt disponible — nécessite une vraie connexion OAuth"
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm font-medium text-white/35">
              {p.label} <span className="text-[10px] uppercase tracking-wide">(bientôt)</span>
            </button>
          ))}
        </div>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" /><span className="text-[11px] text-white/40">ou par email</span><div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="space-y-2.5">
          {mode === "signup" && (
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom"
                className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-9 pr-3.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#D4AF37]/50" />
            </div>
          )}
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" data-testid="login-email"
              className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-9 pr-3.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#D4AF37]/50" />
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Mot de passe" data-testid="login-password"
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-9 pr-3.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#D4AF37]/50" />
          </div>
        </div>

        <button onClick={submit} disabled={loading} data-testid="login-submit"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] py-2.5 text-sm font-semibold text-[#0A1128] hover:opacity-90 disabled:opacity-60">
          {loading ? <Loader2 size={15} className="animate-spin" /> : (mode === "signup" ? "Créer mon compte" : "Se connecter")}
        </button>

        <button onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="mt-4 w-full text-center text-xs text-white/50 hover:text-white/80">
          {mode === "signup" ? "Déjà un compte ? Se connecter" : "Pas encore de compte ? En créer un"}
        </button>
      </div>
    </div>
  );
}
