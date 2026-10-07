import React, { useEffect, useState } from "react";
import {
  Link2, CheckCircle2, Loader2, KeyRound, X, Send, Trash2, ExternalLink,
  Mail, Server, Phone, Notebook, Slack, Hash, Database, Target, Columns,
  Zap, Github, Calendar, Heart, Plug,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/kairos/GlassCard";
import { fetchConnectionProviders, connecterProvider, deconnecterProvider } from "@/lib/kairosApi";

// Le catalogue admin (INTEGRATIONS_CATALOG, IntegrationsSection.jsx) gère
// les clés de la plateforme. Ici, chaque utilisateur branche SES PROPRES
// comptes tiers — catalogue distinct, servi par /connections/providers.
const ICONES = {
  mail: Mail, server: Server, phone: Phone, notebook: Notebook, slack: Slack,
  hash: Hash, database: Database, target: Target, columns: Columns, zap: Zap,
  github: Github, calendar: Calendar, heart: Heart,
};

const CATEGORIES = {
  email: "Email personnel",
  telephonie: "Téléphonie",
  productivite: "Productivité & outils",
};

export default function MesConnexionsSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [retrait, setRetrait] = useState(null);

  const charger = () =>
    fetchConnectionProviders()
      .then((d) => setItems(d || []))
      .catch(() => toast.error("Impossible de charger tes connexions."))
      .finally(() => setLoading(false));

  useEffect(() => { charger(); }, []);

  const grouped = items.reduce((acc, it) => {
    (acc[it.category] = acc[it.category] || []).push(it);
    return acc;
  }, {});

  const ouvrir = (it) => { setOpen(it); setValues({}); };

  const enregistrer = async () => {
    if (!open) return;
    setSaving(true);
    try {
      await connecterProvider(open.id, values);
      toast.success(`${open.name} connecté`);
      setOpen(null);
      charger();
    } catch (e) {
      toast.error(e.message || "Sauvegarde impossible.");
    } finally {
      setSaving(false);
    }
  };

  const deconnecter = async (it) => {
    setRetrait(it.id);
    try {
      await deconnecterProvider(it.id);
      toast.success(`${it.name} déconnecté`);
      charger();
    } catch (e) {
      toast.error(e.message || "Déconnexion impossible.");
    } finally {
      setRetrait(null);
    }
  };

  if (loading) {
    return (
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 text-offwhite/70">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement de tes connexions…
        </div>
      </GlassCard>
    );
  }

  return (
    <>
      <GlassCard className="mb-4 !p-4 sm:!p-6" data-testid="params-mes-connexions">
        <div className="mb-1 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-gold" />
          <h2 className="font-display text-lg font-bold text-offwhite">Mes connexions</h2>
        </div>
        <p className="mb-4 text-xs text-offwhite/60">
          Branche ici tes propres comptes (Notion, Slack, GitHub, ton Brevo perso, etc.) —
          distinct des intégrations de la plateforme réglées par Zayado. Tes identifiants sont
          chiffrés et jamais visibles, même par l'équipe Zayado.
        </p>

        {Object.keys(CATEGORIES).map((cat) => {
          const list = grouped[cat] || [];
          if (list.length === 0) return null;
          return (
            <div key={cat} className="mb-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-offwhite/60">
                {CATEGORIES[cat]}
              </p>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
                {list.map((it) => {
                  const Icon = ICONES[it.icon] || Plug;
                  return (
                    <div key={it.id} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-start gap-2.5">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold/15">
                            <Icon className="h-3.5 w-3.5 text-gold" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-snug text-offwhite">{it.name}</p>
                            <p className="mt-0.5 text-[11px] leading-snug text-offwhite/55">{it.description}</p>
                            {it.connected && (
                              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" /> Connecté
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => ouvrir(it)}
                          data-testid={`mesconnexions-connecter-${it.id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-gold/15 px-3 py-1.5 text-[11px] font-semibold text-gold hover:bg-gold/25"
                        >
                          {it.connected ? "Reconfigurer" : "Connecter"}
                        </button>
                        {it.connected && (
                          <button
                            onClick={() => deconnecter(it)}
                            disabled={retrait === it.id}
                            data-testid={`mesconnexions-deconnecter-${it.id}`}
                            className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-offwhite/60 hover:bg-white/5 disabled:opacity-50"
                          >
                            {retrait === it.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            Déconnecter
                          </button>
                        )}
                        {it.help_url && (
                          <a
                            href={it.help_url}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-auto inline-flex items-center gap-1 text-[10px] text-offwhite/45 hover:text-offwhite/70"
                          >
                            Aide <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </GlassCard>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1a3d]/70 p-4 backdrop-blur-sm" role="dialog">
          <div className="w-full max-w-lg rounded-2xl fenetre p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">Mes connexions</p>
                <h3 className="mt-1 font-display text-xl font-bold text-offwhite">{open.name}</h3>
                {open.description && <p className="mt-1 text-xs text-offwhite/55">{open.description}</p>}
              </div>
              <button onClick={() => setOpen(null)} className="rounded-lg p-1 text-offwhite/60 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {(open.fields || []).map((f) => (
                <div key={f.key}>
                  <label className="mb-1 flex items-center gap-1 text-[11px] font-medium text-offwhite/70">
                    <KeyRound className="h-3 w-3 text-gold" /> {f.label}{f.required ? " *" : ""}
                  </label>
                  <input
                    type={f.type === "password" ? "password" : f.type === "number" ? "number" : f.type === "email" ? "email" : "text"}
                    value={values[f.key] || ""}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    data-testid={`mesconnexions-champ-${f.key}`}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/50 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpen(null)} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-offwhite/80 hover:bg-white/5">
                Annuler
              </button>
              <button
                onClick={enregistrer}
                disabled={saving}
                data-testid="mesconnexions-enregistrer"
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-navy-900 hover:opacity-90 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enregistrer
              </button>
            </div>
            <p className="mt-3 text-[10px] text-offwhite/40">
              🔒 Chiffré au repos. Ni l'équipe Zayado ni l'admin ne peuvent relire ces identifiants.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
