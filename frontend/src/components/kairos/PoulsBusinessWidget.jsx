import React, { useEffect, useState } from "react";
import { Activity, Landmark, Receipt, Wallet, PenLine, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/kairos/GlassCard";
import { fetchPouls, savePouls } from "@/lib/kairosApi";
import PoulsQonto from "@/components/kairos/PoulsQonto";

const ALERTE_META = {
  vert:   { color: "#7A9E7E", label: "Rythme sain",     bg: "rgba(122,158,126,0.15)" },
  orange: { color: "#C9A66B", label: "Vigilance",       bg: "rgba(201,166,107,0.15)" },
  rouge:  { color: "#B9524E", label: "Attention",       bg: "rgba(185,82,78,0.15)" },
};

export default function PoulsBusinessWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ ca_mensuel: 0, ca_objectif: 0, factures_en_attente: 0, tresorerie: 0, source: "manuel" });
  const [saving, setSaving] = useState(false);

  const reload = () => {
    setLoading(true);
    fetchPouls().then((d) => {
      setData(d);
      setForm({
        ca_mensuel: d.ca_mensuel || 0, ca_objectif: d.ca_objectif || 0,
        factures_en_attente: d.factures_en_attente || 0, tresorerie: d.tresorerie || 0,
        source: d.source || "manuel",
      });
    }).catch(() => toast.error("Pouls Business indisponible")).finally(() => setLoading(false));
  };
  useEffect(() => { reload(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const d = await savePouls(form);
      setData(d);
      setEdit(false);
      toast.success("Pouls Business à jour");
    } catch { toast.error("Sauvegarde impossible"); }
    setSaving(false);
  };

  if (loading || !data) {
    return (
      <GlassCard className="animate-fade-up">
        <div className="flex items-center gap-2 text-offwhite/60"><Loader2 className="h-4 w-4 animate-spin" /> Pouls Business…</div>
      </GlassCard>
    );
  }

  const meta = ALERTE_META[data.alerte] || ALERTE_META.vert;
  const fmt = (v) => (v || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 });

  return (
    <GlassCard className="animate-fade-up" data-testid="widget-pouls-business">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/15 text-gold"><Activity size={16} /></span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">Pouls Business</p>
            <p className="text-[11px] text-offwhite/55">{data.source === "manuel" ? "Saisie manuelle" : `Source : ${data.source}`}</p>
          </div>
        </div>
        <button onClick={() => setEdit((v) => !v)} data-testid="pouls-edit"
          className="flex h-8 items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 text-[11px] text-offwhite/80 hover:bg-white/10">
          <PenLine size={13} /> {edit ? "Fermer" : "Éditer"}
        </button>
      </div>

      {!edit ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KPI icon={Landmark} label="CA du mois" value={`${fmt(data.ca_mensuel)}€`}
                 sub={data.ca_objectif > 0 ? `${data.avancement}% de l'objectif` : "Fixe un objectif"} />
            <KPI icon={Receipt} label="Factures en attente" value={fmt(data.factures_en_attente)}
                 sub="À relancer" />
            <KPI icon={Wallet}  label="Trésorerie" value={`${fmt(data.tresorerie)}€`}
                 sub="Disponible" />
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-[10px] font-semibold" style={{ background: meta.bg, color: meta.color }}>
              ● {meta.label}
            </span>
            <p className="flex-1 text-[12.5px] italic leading-relaxed text-offwhite/80">{data.phrase_ia}</p>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Champ label="CA du mois (€)"        value={form.ca_mensuel}
                   onChange={(v) => setForm({ ...form, ca_mensuel: v })} />
            <Champ label="Objectif CA mensuel (€)" value={form.ca_objectif}
                   onChange={(v) => setForm({ ...form, ca_objectif: v })} />
            <Champ label="Factures en attente"    value={form.factures_en_attente} integer
                   onChange={(v) => setForm({ ...form, factures_en_attente: v })} />
            <Champ label="Trésorerie (€)"         value={form.tresorerie}
                   onChange={(v) => setForm({ ...form, tresorerie: v })} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-offwhite/70">Source</label>
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-offwhite outline-none focus:border-gold/50">
              <option value="manuel">Manuel (je remplis)</option>
              <option value="qonto">Qonto (auto)</option>
              <option value="pennylane">Pennylane (auto)</option>
              <option value="drive">Google Drive (fichier)</option>
              <option value="sharepoint">SharePoint (fichier)</option>
            </select>
          </div>
          {form.source === "qonto" && (
            <PoulsQonto onSynced={(d) => { setData(d); setForm((f) => ({ ...f, ca_mensuel: d.ca_mensuel, tresorerie: d.tresorerie, source: "qonto" })); }} />
          )}
          <button onClick={save} disabled={saving} data-testid="pouls-save"
            className="w-full rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-navy-900 hover:opacity-90 disabled:opacity-60">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      )}
    </GlassCard>
  );
}

function KPI({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-1.5 text-offwhite/60">
        <Icon size={12} className="text-gold" />
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      <p className="mt-1 font-display text-xl font-bold text-offwhite">{value}</p>
      <p className="text-[10px] text-offwhite/45">{sub}</p>
    </div>
  );
}

function Champ({ label, value, onChange, integer }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] text-offwhite/70">{label}</label>
      <input type="number" min={0} step={integer ? 1 : 100}
        value={value} onChange={(e) => onChange(integer ? parseInt(e.target.value || "0", 10) : parseFloat(e.target.value || "0"))}
        className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-offwhite outline-none focus:border-gold/50" />
    </div>
  );
}
