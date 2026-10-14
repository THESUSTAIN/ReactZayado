import { useState, type ReactNode } from "react";
import { BarreHaute, OngletsMobile, Rail } from "@/components/vision/chrome";
import { EnTetePage } from "@/components/vision/EnTete";
import { useMoi } from "@/components/vision/menus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useProfil, useZMutation, z } from "@/zayado/api";
import { DROITS, OFFRES } from "@/zayado/droits";
import type { Offre, ProfilIn } from "@/zayado/types";

/* Aperçu d'une offre : réservé aux administrateurs (le serveur refuse aussi les autres).
   Un client change d'offre uniquement par la page Tarifs et le paiement. */
function SelecteurOffre() {
  const profil = useProfil();
  const moi = useMoi();
  const changer = useZMutation((o: Offre) => z.changerOffre(o), (p) => `Aperçu : offre ${p.offre}`);
  const offre = profil.data?.offre;
  if (!offre || moi.data?.role !== "admin") return null;
  return (
    <div className="flex items-center gap-2" data-testid="offre-selector">
      <div className="grid grid-cols-3 gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
        {OFFRES.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => o !== offre && changer.mutate(o)}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium transition-colors duration-150",
              o === offre ? "bg-[#DEC2A3] text-[#0f1b3a]" : "text-[#9fb0cf] hover:text-white",
            )}
            data-testid={`offre-option-${o}`}
          >
            {o}
          </button>
        ))}
      </div>
      <span className="hidden text-xs text-[#9fb0cf] xl:inline" data-testid="offre-current-price">
        {DROITS[offre].prix} · commission {DROITS[offre].commission}
      </span>
    </div>
  );
}

function Onboarding() {
  const [f, setF] = useState<ProfilIn>({ prenom: "", offre: "Rêveur", metier: "", clientele: "les_deux", zone: "", mots_cles: [] });
  const [mots, setMots] = useState("");
  const enregistrer = useZMutation((b: ProfilIn) => z.enregistrerProfil(b), "Bienvenue dans ton cockpit");
  const sel = "h-9 w-full rounded-lg border border-input bg-white px-3 text-sm";
  return (
    <form
      className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm animate-rise"
      onSubmit={(e) => {
        e.preventDefault();
        enregistrer.mutate({ ...f, mots_cles: mots.split(",").map((m) => m.trim()).filter(Boolean) });
      }}
      data-testid="onboarding-form"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Trois questions, et c'est parti</p>
      <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-slate-900">Ton cockpit démarre vide — rien n'est inventé.</h2>
      <p className="mt-1 text-sm text-slate-500">Zayado s'appuie sur ton métier, ta clientèle et ta zone pour te trouver des prospects.</p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">Prénom</Label>
          <Input required value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} className="bg-white" data-testid="onboarding-prenom-input" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">Métier</Label>
          <Input required value={f.metier} onChange={(e) => setF({ ...f, metier: e.target.value })} placeholder="Ex. coach, expert-comptable" className="bg-white" data-testid="onboarding-metier-input" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">Clientèle</Label>
          <select className={sel} value={f.clientele} onChange={(e) => setF({ ...f, clientele: e.target.value as ProfilIn["clientele"] })} data-testid="onboarding-clientele-select">
            <option value="les_deux">Entreprises et particuliers</option>
            <option value="entreprises">Entreprises</option>
            <option value="particuliers">Particuliers</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">Zone (département)</Label>
          <Input required value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })} placeholder="Ex. 69 — Rhône" className="bg-white" data-testid="onboarding-zone-input" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-semibold text-slate-600">Mots-clés de veille (séparés par des virgules)</Label>
          <Input value={mots} onChange={(e) => setMots(e.target.value)} placeholder="Ex. conseil, formation, coaching" className="bg-white" data-testid="onboarding-mots-input" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-semibold text-slate-600">Offre</Label>
          <div className="grid grid-cols-3 gap-3">
            {OFFRES.map((o) => (
              <button
                type="button"
                key={o}
                onClick={() => setF({ ...f, offre: o })}
                className={cn(
                  "rounded-xl border p-3 text-left transition-[border-color,box-shadow] duration-150",
                  f.offre === o ? "border-amber-400 shadow-[0_0_0_3px_rgb(251_191_36/0.25)]" : "border-slate-200 hover:border-slate-300",
                )}
                data-testid={`onboarding-offre-${o}`}
              >
                <span className="block font-heading font-semibold text-slate-900">{o}</span>
                <span className="block tabular-nums text-sm text-slate-600">{DROITS[o].prix}</span>
                <span className="block text-xs text-slate-500">commission {DROITS[o].commission}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <Button type="submit" className="mt-6 w-full" disabled={enregistrer.isPending} data-testid="onboarding-submit-button">
        Ouvrir mon cockpit
      </Button>
    </form>
  );
}

export default function ZShell({ title, subtitle, actions, onglets, aide, children }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; onglets?: ReactNode; aide?: ReactNode; children: ReactNode }) {
  const profil = useProfil();
  const needsOnboarding = profil.isSuccess && !profil.data;
  return (
    <div className="zy-root zy-nuit min-h-screen w-full">
      <Rail />
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-28 sm:px-6 lg:pb-12 lg:pl-[120px] lg:pr-8">
        <BarreHaute prenom={profil.data?.prenom ?? ""} offre={profil.data?.offre ?? ""} />
        <div className="pb-6" data-testid="zpage-title-wrap">
          <EnTetePage
            titre={<span data-testid="zpage-title">{title}</span>}
            phrase={subtitle}
            onglets={onglets}
            aide={aide}
            actions={!needsOnboarding ? (<>{actions}<SelecteurOffre /></>) : undefined}
          />
        </div>
        <main>{needsOnboarding ? <Onboarding /> : children}</main>
      </div>
      <OngletsMobile />
    </div>
  );
}
