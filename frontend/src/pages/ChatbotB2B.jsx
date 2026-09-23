import React, { useState } from "react";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import {
  MessageCircle, Check, ArrowRight, Copy, Palette, Bot, Zap, ShieldCheck,
  Globe, Code2, Settings, TrendingUp, Sparkles, Play, Loader2,
} from "lucide-react";
import { toast } from "sonner";

const GOLD = "#DEC2A3";

const PLANS = [
  { id: "starter", label: "Starter", price: 49, features: ["1 chatbot marque blanche", "1 000 conversations / mois", "Personnalisation logo + couleurs", "Widget 1-ligne à coller", "Analytics de base", "Support email"] },
  { id: "pro", label: "Pro", price: 99, popular: true, features: ["3 chatbots marque blanche", "5 000 conversations / mois", "IA custom sur ta base de connaissance", "Widget + intégration API", "Analytics avancées + export", "Support prioritaire"] },
  { id: "complet", label: "Complet", price: 149, features: ["Chatbots illimités", "20 000 conversations / mois", "Multi-langues + tickets Zendesk", "White-label total (ton domaine)", "Rapports mensuels", "Support dédié 24h"] },
];

export default function ChatbotB2B() {
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [config, setConfig] = useState({
    brandName: "", primaryColor: "#DEC2A3", welcomeMsg: "Bonjour ! Comment puis-je vous aider ?", kb: "",
  });
  const [tab, setTab] = useState("config"); // config | preview | plan
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const embedCode = `<script src="https://cdn.zayado.net/chatbot.js" data-brand="${config.brandName || "Ma marque"}" data-color="${config.primaryColor}" async></script>`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code embed copié !");
  };

  const startCheckout = async () => {
    setLoading(true);
    try {
      const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
      // Aligné sur l'échelle tarifaire unique du backend : le chatbot est
      // inclus dans les paliers Pro (1) et Business (3) ; au-delà c'est
      // Entreprise, sur devis — jamais de paiement Mollie direct.
      if (selectedPlan === "complet") {
        toast.info("L'offre Complet est sur devis — contacte l'équipe Zayado pour la mettre en place.");
        return;
      }
      const planId = selectedPlan === "starter" ? "pro" : "business";
      const r = await fetch(`${BACKEND}/api/checkout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, cycle: "mensuel" }),
      });
      const j = await r.json();
      if (j.checkoutUrl) window.location.href = j.checkoutUrl;
      else toast.error("Impossible de créer le paiement");
    } catch (e) { toast.error("Erreur : " + String(e).slice(0, 60)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header title="Agent Business" subtitle="Ton agent IA marque blanche + tes agents automatisés." />

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Sub-nav Agent Business (Chatbot Client / Agents IA) */}
          <div className="mb-5 inline-flex rounded-full border border-white/15 bg-white/5 p-1" data-testid="agent-business-subnav">
            <button
              className="rounded-full px-4 py-2 text-[12.5px] font-semibold text-navy-900"
              style={{ background: GOLD }}
              data-testid="subnav-chatbot"
            >
              Chatbot Client
            </button>
            <button
              onClick={() => window.location.assign("/app/agents")}
              className="rounded-full px-4 py-2 text-[12.5px] font-semibold text-white/70 hover:text-white"
              data-testid="subnav-agents-ia"
            >
              Agents IA
            </button>
          </div>
          {/* Hero */}
          <div className="mb-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${GOLD}22` }}>
                <MessageCircle size={26} style={{ color: GOLD }} />
              </div>
              <div className="flex-1">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>Agent Business · Dès 49€/mois</p>
                <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight sm:text-[34px]">
                  Ton propre chatbot IA, <span className="font-serif-italic italic" style={{ color: GOLD }}>en marque blanche.</span>
                </h1>
                <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-white/60">
                  Hébergé sur Railway, maintenu par Zayado. Tes clients discutent avec l'IA sur ton site, aux couleurs de ta marque. Aucune ligne de code compliquée.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[
                { icon: Palette, label: "Marque blanche" },
                { icon: Bot, label: "IA sur ta base" },
                { icon: Code2, label: "1 ligne à coller" },
                { icon: ShieldCheck, label: "Hébergé en Europe" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
                  <f.icon size={14} style={{ color: GOLD }} />
                  <span className="text-[12.5px] text-white/85">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-5 inline-flex rounded-full border border-white/15 bg-white/5 p-1">
            {[{ id: "config", label: "Configuration", Icon: Settings }, { id: "preview", label: "Aperçu", Icon: Play }, { id: "plan", label: "Plan", Icon: TrendingUp }].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold transition ${tab === t.id ? "text-navy-900" : "text-white/70 hover:text-white"}`}
                style={tab === t.id ? { background: GOLD } : {}}>
                <t.Icon size={13} /> {t.label}
              </button>
            ))}
          </div>

          {/* Configuration */}
          {tab === "config" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Nom de ta marque</label>
                  <input value={config.brandName} onChange={(e) => setConfig({ ...config, brandName: e.target.value })}
                    placeholder="Ex. Ma Boutique"
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Couleur principale</label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input type="color" value={config.primaryColor} onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                      className="h-10 w-10 rounded-lg border border-white/15 bg-transparent cursor-pointer" />
                    <input value={config.primaryColor} onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                      className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Message d'accueil</label>
                  <input value={config.welcomeMsg} onChange={(e) => setConfig({ ...config, welcomeMsg: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Base de connaissance (URL ou texte)</label>
                  <textarea value={config.kb} onChange={(e) => setConfig({ ...config, kb: e.target.value })} rows={4}
                    placeholder="https://tonsite.com/faq ou colle ta FAQ ici…"
                    className="mt-1.5 w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold" />
                </div>
              </div>

              <div className="rounded-2xl border border-gold/30 bg-gold/[0.06] p-6">
                <div className="mb-3 flex items-center gap-2">
                  <Code2 size={16} style={{ color: GOLD }} />
                  <h3 className="font-display text-[15px] font-semibold text-white">Code embed à coller</h3>
                </div>
                <p className="mb-3 text-[12.5px] text-white/60">Colle ce code juste avant <code className="rounded bg-black/30 px-1 text-[11px]">&lt;/body&gt;</code> sur ton site.</p>
                <pre className="whitespace-pre-wrap break-all rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] leading-relaxed text-emerald-200">{embedCode}</pre>
                <button onClick={copyEmbed}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-[12.5px] font-semibold text-navy-900">
                  {copied ? <><Check size={14} /> Copié !</> : <><Copy size={14} /> Copier le code</>}
                </button>
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[11.5px] text-white/60">
                  <ShieldCheck size={13} className="mt-0.5 shrink-0" style={{ color: GOLD }} />
                  <span>Hébergement, mises à jour et maintenance gérés par Zayado (Railway). Tu n'as rien à installer.</span>
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {tab === "preview" && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <p className="mb-4 text-center text-[12.5px] text-white/50">Aperçu du widget tel qu'il apparaîtra sur ton site</p>
              <div className="mx-auto max-w-sm rounded-3xl border border-white/15 bg-navy-800 shadow-2xl">
                <div className="flex items-center gap-2 rounded-t-3xl px-4 py-3" style={{ background: config.primaryColor }}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20"><Bot size={17} className="text-white" /></div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-white">{config.brandName || "Ma marque"}</div>
                    <div className="flex items-center gap-1 text-[10px] text-white/85"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> En ligne</div>
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white/10 px-3.5 py-2 text-[12.5px] text-white">{config.welcomeMsg}</div>
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 text-[12.5px] font-medium" style={{ background: config.primaryColor, color: "#0f1b3a" }}>
                    Quels sont vos horaires ?
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white/10 px-3.5 py-2 text-[12.5px] text-white">
                    Nous sommes ouverts du lundi au vendredi de 9h à 18h. Souhaitez-vous réserver un créneau ?
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-white/10 p-3">
                  <input placeholder="Écrivez votre question…" disabled className="flex-1 rounded-full bg-white/5 px-3.5 py-2 text-[12px] text-white/60 outline-none" />
                  <button className="h-9 w-9 rounded-full text-navy-900" style={{ background: config.primaryColor }}><ArrowRight size={15} className="mx-auto" /></button>
                </div>
              </div>
            </div>
          )}

          {/* Plan */}
          {tab === "plan" && (
            <div>
              <div className="grid gap-4 md:grid-cols-3">
                {PLANS.map((p) => {
                  const active = selectedPlan === p.id;
                  return (
                    <button key={p.id} onClick={() => setSelectedPlan(p.id)}
                      className={`relative flex flex-col rounded-2xl border p-6 text-left transition ${active ? "border-gold bg-gold/[0.08] scale-[1.01]" : "border-white/10 bg-white/[0.04] hover:border-white/25"}`}>
                      {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-navy-900" style={{ background: GOLD }}>Le plus choisi</span>}
                      <div className="font-display text-[16px] font-bold" style={{ color: GOLD }}>{p.label}</div>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="font-display text-[36px] font-semibold">{p.price}</span>
                        <span className="text-[13px] text-white/50">€ / mois</span>
                      </div>
                      <ul className="mt-4 flex-1 space-y-2">
                        {p.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-[12.5px] text-white/75">
                            <Check size={13} className="mt-0.5 shrink-0" style={{ color: GOLD }} />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <div className={`mt-5 rounded-lg py-2 text-center text-[11.5px] font-semibold ${active ? "bg-gold text-navy-900" : "border border-white/20 text-white/70"}`}>
                        {active ? "Sélectionné" : "Choisir"}
                      </div>
                    </button>
                  );
                })}
              </div>
              <button onClick={startCheckout} disabled={loading}
                className="mx-auto mt-6 flex items-center gap-2 rounded-xl bg-gold px-8 py-3.5 text-[13px] font-semibold text-navy-900 shadow-lg disabled:opacity-60">
                {loading ? <><Loader2 size={15} className="animate-spin" /> Redirection Mollie…</> : <>Payer avec Mollie <ArrowRight size={15} /></>}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
