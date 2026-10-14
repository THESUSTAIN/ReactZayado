import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Mail, Loader2, Check } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("idle");

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      await axios.post(`${API}/newsletter`, { email, name: name || null });
      setStatus("done");
      toast.success("Inscription confirmée !", { description: "Merci, on reste en contact." });
      setEmail("");
      setName("");
    } catch (err) {
      setStatus("idle");
      const msg = err?.response?.status === 409
        ? "Cet email est déjà inscrit."
        : "Une erreur est survenue, réessayez.";
      toast.error(msg);
    }
  };

  if (status === "done") {
    return (
      <div data-testid="newsletter-success" className="mt-4 flex items-center gap-3 rounded-2xl bg-cream-deep px-5 py-4 text-navy">
        <span className="grid place-items-center h-9 w-9 rounded-full bg-navy text-cream"><Check className="h-5 w-5" /></span>
        <p className="font-medium">Vous êtes bien inscrit·e à la newsletter.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3" data-testid="newsletter-form">
      <input data-testid="newsletter-name" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Votre prénom (optionnel)"
        className="w-full rounded-full bg-secondary px-5 py-3 text-navy placeholder:text-muted-foreground outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-navy transition" />
      <div className="flex gap-2">
        <input data-testid="newsletter-email" type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="Votre email"
          className="flex-1 rounded-full bg-secondary px-5 py-3 text-navy placeholder:text-muted-foreground outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-navy transition" />
        <button data-testid="newsletter-submit" type="submit" disabled={status === "loading"}
          className="shrink-0 grid place-items-center h-12 w-12 rounded-full bg-terracotta text-cream hover:bg-[#a83a2e] transition-colors shadow-lg disabled:opacity-60">
          {status === "loading" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
        </button>
      </div>
    </form>
  );
};
