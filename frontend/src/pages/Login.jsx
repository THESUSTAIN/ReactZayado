import { useState } from "react";
import { Mail, Lock, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { authLogin } from "../lib/api";

const OAUTH_PROVIDERS = [
  { id: "google", label: "Continuer avec Google" },
  { id: "microsoft", label: "Continuer avec Microsoft" },
  { id: "thesustain", label: "Continuer avec thesustain.net" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [installBannerOpen, setInstallBannerOpen] = useState(true);

  const submit = async (event) => {
    event?.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Email et mot de passe requis");
      return;
    }
    setLoading(true);
    try {
      const res = await authLogin(email.trim(), password);
      if (res?.token) localStorage.setItem("cours_auth_token", res.token);
      toast.success("Connexion réussie");
      window.location.href = res?.user?.onboarding_done ? "/" : "/onboarding";
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Échec de la connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B102B] px-4 py-16 text-white" data-testid="page-login">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(56,91,145,.35),transparent_38%),radial-gradient(circle_at_90%_90%,rgba(201,164,73,.12),transparent_40%)]" />
      {installBannerOpen && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 bg-[#282832] px-4 py-3 text-sm text-[#E5D79E] shadow-lg">
          <span>Installez l'application pour un accès plus rapide.</span>
          <button type="button" onClick={() => setInstallBannerOpen(false)} className="text-[#E5D79E]/75 transition hover:text-white" aria-label="Fermer le bandeau" data-testid="close-install-banner"><X size={18} /></button>
        </div>
      )}

      <section className="relative z-10 w-full max-w-[640px] rounded-[30px] border border-[#8CA2C6]/45 bg-[linear-gradient(145deg,rgba(32,51,88,.92),rgba(24,36,67,.96))] p-7 shadow-[0_28px_80px_rgba(0,0,0,.42)] backdrop-blur-xl sm:p-10" data-testid="login-card">
        <div className="mb-7 flex justify-center">
          <img src="/logo-icon.png" alt="Zayado" className="h-16 w-16 rounded-2xl object-cover shadow-[0_12px_30px_rgba(0,0,0,.3)]" data-testid="login-logo" />
        </div>
        <div className="mb-7 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.22em] text-[#E5C887]">MyExtension AI · Zayado</p>
          <h1 className="font-head text-3xl font-semibold tracking-tight text-white" data-testid="login-title">Connexion</h1>
          <p className="mt-2 text-base text-white/55">Content de vous revoir.</p>
        </div>

        <div className="space-y-3">
          {OAUTH_PROVIDERS.map((provider) => (
            <button key={provider.id} type="button" disabled title="Bientôt disponible — connexion OAuth non configurée" className="flex h-14 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.025] text-base font-medium text-white/35">
              {provider.label} <span className="text-xs uppercase tracking-wide">(bientôt)</span>
            </button>
          ))}
        </div>

        <div className="my-7 flex items-center gap-4 text-sm text-white/45"><div className="h-px flex-1 bg-white/15" /><span>ou par email</span><div className="h-px flex-1 bg-white/15" /></div>

        <form onSubmit={submit} className="space-y-4">
          <label className="relative block">
            <span className="sr-only">Email</span>
            <Mail size={20} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-white/35" />
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="Email" data-testid="login-email" className="h-16 w-full rounded-2xl border border-white/15 bg-white/[.07] pl-14 pr-4 text-base text-white outline-none transition placeholder:text-white/35 focus:border-[#D4AF37]/70 focus:bg-white/[.1]" />
          </label>
          <label className="relative block">
            <span className="sr-only">Mot de passe</span>
            <Lock size={20} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-white/35" />
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="Mot de passe" data-testid="login-password" className="h-16 w-full rounded-2xl border border-white/15 bg-white/[.07] pl-14 pr-4 text-base text-white outline-none transition placeholder:text-white/35 focus:border-[#D4AF37]/70 focus:bg-white/[.1]" />
          </label>
          <button type="submit" disabled={loading} data-testid="login-submit" className="mt-2 flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E5C347] to-[#D4AF37] text-lg font-semibold text-[#11152B] shadow-[0_10px_26px_rgba(212,175,55,.22)] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60">
            {loading ? <Loader2 size={20} className="animate-spin" /> : "Se connecter"}
          </button>
        </form>

        <p className="mt-7 text-center text-sm leading-relaxed text-white/45">L’accès est réservé aux comptes existants. Si votre compte n’est pas encore activé, contactez l’administrateur.</p>
      </section>
    </main>
  );
}
