import React, { useEffect, useState } from "react";
import {
  Plug, CheckCircle2, CircleAlert, Loader2, ArrowRight, KeyRound,
  Landmark, Users2, Cloud, MessageSquare, Sparkles, CreditCard, Send, X,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/kairos/GlassCard";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

const CATEGORY_META = {
  IA:       { icon: Sparkles,      label: "IA & Contenu" },
  Stockage: { icon: Cloud,         label: "Stockage & Fichiers" },
  Paiement: { icon: CreditCard,    label: "Paiement" },
  Comms:    { icon: MessageSquare, label: "Communication" },
  Banque:   { icon: Landmark,      label: "Banque & Compta" },
  CRM:      { icon: Users2,        label: "CRM & Équipe" },
};

const INTEGRATION_HELP = {
  telegram: {
    steps: [
      "Sur Telegram, cherche @BotFather et ouvre une conversation.",
      "Envoie /newbot puis suis les instructions (nom + @username).",
      "BotFather te renvoie un token du type 123456789:ABC-DEF... Colle-le ici.",
    ],
    fields: [{ key: "TELEGRAM_BOT_TOKEN", label: "Bot Token", placeholder: "123456789:AA..." }],
  },
  qonto: {
    steps: [
      "Ouvre Qonto → Paramètres → Développeurs → Clés API.",
      "Crée une nouvelle clé et copie le Login + Secret Key.",
    ],
    fields: [
      { key: "QONTO_LOGIN", label: "Login", placeholder: "org-slug-1234" },
      { key: "QONTO_SECRET_KEY", label: "Secret Key", placeholder: "abc123..." },
    ],
  },
  pennylane: {
    steps: [
      "Ouvre Pennylane → Paramètres → API.",
      "Génère une clé API et colle-la ici.",
    ],
    fields: [{ key: "PENNYLANE_API_KEY", label: "API Key", placeholder: "pk_..." }],
  },
  hubspot: {
    steps: [
      "HubSpot → Paramètres → Intégrations → Comptes de service.",
      "Crée un jeton privé (private access token) et colle-le.",
    ],
    fields: [{ key: "HUBSPOT_ACCESS_TOKEN", label: "Private Token", placeholder: "pat-eu1-..." }],
  },
  odoo: {
    steps: [
      "Depuis Odoo → Paramètres → Utilisateurs, active la clé API.",
      "Renseigne l'URL de ton instance, la base, le login et le mot de passe API.",
    ],
    fields: [
      { key: "ODOO_URL", label: "URL Odoo", placeholder: "https://mon-entreprise.odoo.com" },
      { key: "ODOO_DB", label: "Base de données", placeholder: "mon-entreprise" },
      { key: "ODOO_USERNAME", label: "Login", placeholder: "admin@..." },
      { key: "ODOO_PASSWORD", label: "Mot de passe / clé API", placeholder: "•••" },
    ],
  },
  slack:  { steps: ["Crée une app sur api.slack.com/apps → OAuth & Permissions → Bot User Token."],
            fields: [{ key: "SLACK_BOT_TOKEN", label: "Bot Token", placeholder: "xoxb-..." }] },
  teams: {
    steps: [
      "Microsoft Teams utilise le même OAuth que Microsoft (déjà configuré si Microsoft est vert).",
      "Clique Connecter pour lancer l'autorisation — les scopes Teams sont ajoutés automatiquement.",
    ],
    fields: [],
  },
  trello: {
    steps: [
      "Va sur trello.com/app-key pour récupérer ta clé API.",
      "Sur la même page clique « Manually generate a Token » → autorise → copie le token.",
    ],
    fields: [
      { key: "TRELLO_API_KEY", label: "API Key", placeholder: "abc123..." },
      { key: "TRELLO_TOKEN",   label: "Token",   placeholder: "ATTA..." },
    ],
  },
  jira: {
    steps: [
      "Depuis Atlassian → id.atlassian.com/manage-profile/security/api-tokens → « Create API token ».",
      "Renseigne l'URL de ton instance, ton email et le token généré.",
    ],
    fields: [
      { key: "JIRA_URL",       label: "URL Jira",  placeholder: "https://mon-org.atlassian.net" },
      { key: "JIRA_EMAIL",     label: "Email",     placeholder: "moi@exemple.com" },
      { key: "JIRA_API_TOKEN", label: "API Token", placeholder: "ATATT3x..." },
    ],
  },
  whatsapp: { steps: ["Déploie le service /app/WhatsApp-service sur Railway et récupère son URL publique."],
              fields: [{ key: "WA_SERVICE_URL", label: "URL du service", placeholder: "https://wa-xxx.railway.app" },
                       { key: "WA_SERVICE_SECRET", label: "Secret partagé", placeholder: "•••" }] },
};

export default function IntegrationsSection({ onOnboardingChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openConfig, setOpenConfig] = useState(null);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [onboardChoices, setOnboardChoices] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kairos_onboard_integrations") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    fetch(`${BACKEND}/api/integrations/status`)
      .then((r) => r.json())
      .then((d) => setItems(d.integrations || []))
      .catch(() => toast.error("Impossible de charger les intégrations"))
      .finally(() => setLoading(false));
  }, []);

  const grouped = items.reduce((acc, it) => {
    (acc[it.category] = acc[it.category] || []).push(it);
    return acc;
  }, {});

  const toggleOnboard = (id) => {
    setOnboardChoices((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : (prev.length >= 2 ? [prev[1], id] : [...prev, id]);
      localStorage.setItem("kairos_onboard_integrations", JSON.stringify(next));
      onOnboardingChange?.(next);
      return next;
    });
  };

  const connect = async (it) => {
    if (it.oauth) {
      try {
        const r = await fetch(`${BACKEND}/api/connexion/oauth/${it.id}/start`);
        const d = await r.json();
        if (d.configured && d.authorization_url) window.location.href = d.authorization_url;
        else toast.error("Cette intégration n'est pas encore configurée côté serveur.");
      } catch { toast.error("Erreur OAuth"); }
      return;
    }
    setOpenConfig(it);
    setValues({});
  };

  const saveConfig = async () => {
    if (!openConfig) return;
    setSaving(true);
    try {
      const r = await fetch(`${BACKEND}/api/integrations/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: openConfig.id, values }),
      });
      const d = await r.json();
      if (d.ok) {
        toast.success(`${openConfig.name} connecté`);
        setItems((prev) => prev.map((x) => (x.id === openConfig.id ? { ...x, configured: d.configured } : x)));
        setOpenConfig(null);
      } else {
        toast.error("Sauvegarde impossible");
      }
    } catch { toast.error("Erreur réseau"); }
    setSaving(false);
  };

  if (loading) {
    return (
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 text-offwhite/70"><Loader2 className="h-4 w-4 animate-spin" /> Chargement des intégrations…</div>
      </GlassCard>
    );
  }

  return (
    <>
      <GlassCard className="mb-4" data-testid="params-integrations">
        <div className="mb-4 flex items-center gap-2">
          <Plug className="h-4 w-4 text-gold" />
          <h2 className="font-display text-lg font-bold text-offwhite">Intégrations</h2>
        </div>
        <p className="mb-4 text-xs text-offwhite/60">
          Coche 2 intégrations à activer prioritairement pendant l'onboarding
          ({onboardChoices.length}/2 sélectionnée{onboardChoices.length > 1 ? "s" : ""}).
          Les autres restent accessibles depuis cette page.
        </p>

        {Object.keys(CATEGORY_META).map((cat) => {
          const list = grouped[cat] || [];
          if (list.length === 0) return null;
          const Meta = CATEGORY_META[cat];
          return (
            <div key={cat} className="mb-5">
              <div className="mb-2 flex items-center gap-2">
                <Meta.icon className="h-3.5 w-3.5 text-gold" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-offwhite/60">{Meta.label}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {list.map((it) => (
                  <div key={it.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-offwhite">{it.name}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          {it.configured ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" /> Configuré
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                              <CircleAlert className="h-3 w-3" /> À configurer
                            </span>
                          )}
                          {it.oauth && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-offwhite/60">
                              OAuth
                            </span>
                          )}
                        </div>
                      </div>
                      {it.onboardable && (
                        <label className="flex cursor-pointer items-center gap-1 text-[10px] text-offwhite/60">
                          <input
                            type="checkbox"
                            checked={onboardChoices.includes(it.id)}
                            onChange={() => toggleOnboard(it.id)}
                            data-testid={`onboard-check-${it.id}`}
                            className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-gold"
                          />
                          Onboarding
                        </label>
                      )}
                    </div>
                    <button
                      onClick={() => connect(it)}
                      data-testid={`connect-${it.id}`}
                      className="mt-3 inline-flex items-center gap-1 rounded-xl bg-gold/15 px-3 py-1.5 text-[11px] font-semibold text-gold hover:bg-gold/25"
                    >
                      {it.configured ? "Reconfigurer" : "Connecter"}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </GlassCard>

      {/* Modal config */}
      {openConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-navy-900/95 p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">Intégration</p>
                <h3 className="mt-1 font-display text-xl font-bold text-offwhite">{openConfig.name}</h3>
              </div>
              <button onClick={() => setOpenConfig(null)} className="rounded-lg p-1 text-offwhite/60 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            {INTEGRATION_HELP[openConfig.id]?.steps && (
              <ol className="mb-4 space-y-1.5 text-xs text-offwhite/75">
                {INTEGRATION_HELP[openConfig.id].steps.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[9px] font-bold text-gold">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            )}

            <div className="space-y-3">
              {(INTEGRATION_HELP[openConfig.id]?.fields || [{ key: "TOKEN", label: "Clé / Token", placeholder: "..." }]).map((f) => (
                <div key={f.key}>
                  <label className="mb-1 flex items-center gap-1 text-[11px] font-medium text-offwhite/70">
                    <KeyRound className="h-3 w-3 text-gold" /> {f.label}
                  </label>
                  <input
                    type={f.key.toLowerCase().includes("password") || f.key.includes("SECRET") || f.key.includes("TOKEN") ? "password" : "text"}
                    value={values[f.key] || ""}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/50 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpenConfig(null)} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-offwhite/80 hover:bg-white/5">Annuler</button>
              <button onClick={saveConfig} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-navy-900 hover:opacity-90 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enregistrer
              </button>
            </div>
            <p className="mt-3 text-[10px] text-offwhite/40">
              🔒 Session uniquement en preview. Pour la production, définissez ces clés dans le panneau Publish → Secrets.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
