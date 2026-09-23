import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { fetchState, saveProfile, exportData, deleteData } from "@/lib/kairosApi";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  User, CreditCard, Bell, Palette, ShieldCheck, Check, Download, Trash2, Clock, Lock, Loader2, Mail,
} from "lucide-react";

const PLANS = [
  { key: "essentielle", name: "Découverte", price: "0 €", period: "pour toujours" },
  { key: "serenite", name: "Solo", price: "24 €", period: "HT / mois", highlight: true },
  { key: "pro", name: "Pro", price: "69 €", period: "HT / mois" },
];
const MASQUES = ["Sécurité / mot de passe", "Intégrations (Qonto, Pennylane, Odoo)", "Facturation Stripe", "Mémoire IA", "Recommandations Zayado", "Équipe & membres"];
const inputCls = "w-full rounded-xl border border-white/12 bg-white/8 px-3 py-2.5 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30";

export function SettingsModal({ open, onClose }) {
  const navigate = useNavigate();
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [heure, setHeure] = useState("08:30");
  const [plan, setPlan] = useState("serenite");
  const [notif, setNotif] = useState(true);
  const [marche, setMarche] = useState("france");
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState("");

  useEffect(() => {
    if (!open) return;
    fetchState().then((s) => {
      setPrenom(s.profile?.prenom || ""); setEmail(s.profile?.email || "");
      setHeure(s.profile?.heure_checkin || "08:30"); setPlan(s.profile?.plan || "essentielle");
      setNotif(s.profile?.notifications ?? true);
      setMarche(s.profile?.contexte_metier?.marche || "france");
    }).catch(() => {});
  }, [open]);

  const save = async () => {
    setSaving(true);
    try { await saveProfile({ prenom, email, heure_checkin: heure, plan, notifications: notif, contexte_metier: { marche } }); toast.success("Paramètres enregistrés"); onClose(); }
    catch { toast.error("Enregistrement impossible."); }
    setSaving(false);
  };
  const doExport = async () => {
    try {
      const data = await exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a"); a.href = url; a.download = "kairos-export.json"; a.click(); URL.revokeObjectURL(url);
      toast.success("Données exportées");
    } catch { toast.error("Export impossible."); }
  };
  const doDelete = async () => {
    if (confirmDel.trim().toUpperCase() !== "SUPPRIMER") { toast.error("Tape SUPPRIMER pour confirmer."); return; }
    try { await deleteData(); toast.success("Données supprimées"); onClose(); navigate("/onboarding"); } catch { toast.error("Suppression impossible."); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong max-h-[88vh] overflow-y-auto border-white/12 text-offwhite sm:max-w-2xl" data-testid="settings-modal">
        <DialogTitle className="font-display text-2xl font-extrabold">Paramètres</DialogTitle>
        <DialogDescription className="text-offwhite/60">Ton espace, tes règles. Tu choisis, tu changes quand tu veux.</DialogDescription>

        <div className="mt-2 space-y-5">
          <section data-testid="settings-profil">
            <Title icon={User} t="Profil" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field l="Prénom"><input value={prenom} onChange={(e) => setPrenom(e.target.value)} data-testid="settings-prenom" className={inputCls} /></Field>
              <Field l="Email (pour valider par email)">
                <div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.com" data-testid="settings-email" className={`${inputCls} pl-9`} /></div>
              </Field>
              <Field l="Heure de check-in">
                <div className="relative"><Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
                  <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} data-testid="settings-heure" className={`${inputCls} pl-9`} /></div>
              </Field>
              <Field l="Pays / marché — actualité & contexte économique">
                <select value={marche} onChange={(e) => setMarche(e.target.value)} data-testid="settings-marche" className={inputCls}>
                  <option value="france">France</option>
                  <option value="senegal">Sénégal</option>
                  <option value="cote_ivoire">Côte d'Ivoire</option>
                  <option value="cameroun">Cameroun</option>
                  <option value="maroc">Maroc</option>
                  <option value="belgique">Belgique</option>
                </select>
              </Field>
            </div>
          </section>

          <section data-testid="settings-offre">
            <Title icon={CreditCard} t="Ton offre" h="Tu choisis, tu changes quand tu veux." />
            <div className="grid gap-2.5 sm:grid-cols-3">
              {PLANS.map((p) => (
                <button key={p.key} onClick={() => setPlan(p.key)} data-testid={`settings-plan-${p.key}`}
                  className={`rounded-2xl border p-3 text-left transition-all ${plan === p.key ? "border-gold/60 bg-gold/10 ring-1 ring-gold/30" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                  <div className="flex items-center justify-between"><span className="font-display text-base font-bold">{p.name}</span>{plan === p.key && <Check className="h-4 w-4 text-gold" />}</div>
                  <div className="mt-1 flex items-baseline gap-1">{p.old && <span className="text-xs text-offwhite/40 line-through">{p.old}</span>}<span className="font-display text-xl font-extrabold">{p.price}</span><span className="text-[10px] text-offwhite/50">{p.period}</span></div>
                  {p.highlight && <span className="mt-1 inline-block rounded-full bg-gold px-2 py-0.5 text-[9px] font-bold text-navy-900">Recommandé</span>}
                </button>
              ))}
            </div>
          </section>

          <section data-testid="settings-notifs">
            <Title icon={Bell} t="Notifications" h="Max 2 par jour, rien en mode récupération." />
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm text-offwhite/85">Rappel de check-in & souvenirs</span>
              <button onClick={() => setNotif((v) => !v)} data-testid="settings-notif-toggle" className={`relative h-6 w-11 rounded-full transition-colors ${notif ? "bg-gold" : "bg-white/15"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${notif ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </label>
          </section>

          <section data-testid="settings-apparence">
            <Title icon={Palette} t="Apparence" />
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <span className="text-offwhite/85">Thème sombre Aurora</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-xs text-offwhite/50"><Lock className="h-3 w-3" /> Mode clair bientôt</span>
            </div>
          </section>

          <section data-testid="settings-rgpd">
            <Title icon={ShieldCheck} t="Confidentialité & données" h="Tes données bien-être t'appartiennent." />
            <button onClick={doExport} className="btn-ghost" data-testid="settings-export"><Download className="h-4 w-4" /> Exporter (JSON)</button>
            <div className="mt-3 rounded-xl border border-alert/30 bg-alert/5 p-3">
              <p className="text-xs text-offwhite/70">Suppression définitive. Tape <span className="font-semibold text-alert">SUPPRIMER</span>.</p>
              <div className="mt-2 flex gap-2">
                <input value={confirmDel} onChange={(e) => setConfirmDel(e.target.value)} placeholder="SUPPRIMER" data-testid="settings-delete-input" className={inputCls} />
                <button onClick={doDelete} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-alert px-3 py-2 text-sm font-semibold text-white" data-testid="settings-delete-btn"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </section>

          <section data-testid="settings-masques">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-offwhite/40">Bientôt (masqué)</p>
            <div className="flex flex-wrap gap-1.5">{MASQUES.map((m) => <span key={m} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-offwhite/45">{m}</span>)}</div>
          </section>

          <button onClick={save} disabled={saving} className="btn-gold w-full" data-testid="settings-save">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Enregistrer</>}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Title({ icon: Icon, t, h }) {
  return <div className="mb-3"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-gold" /><h3 className="font-display text-lg font-bold">{t}</h3></div>{h && <p className="mt-0.5 text-xs text-offwhite/55">{h}</p>}</div>;
}
function Field({ l, children }) {
  return <div><label className="mb-1.5 block text-xs font-medium text-offwhite/70">{l}</label>{children}</div>;
}
