// Sortie « aimant » : personne ne quitte un tunnel les mains vides — un guide PDF offert, livré tout de suite.
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Download, Gift, Loader2 } from "lucide-react";
import { apiPost, errorMessage } from "@/lib/api";
import { GOLD, LINE, NAVY } from "./TunnelZayado";

export type Aimant = "tresorerie" | "rituel" | "lumiere";
export const GUIDES: Record<Aimant, { titre: string; desc: string }> = {
  tresorerie: { titre: "Le check-up trésorerie en 10 minutes", desc: "Savoir ce soir combien de mois ton activité tient sans nouvelle vente. 4 pages, un stylo suffit." },
  rituel: { titre: "Le rituel anti-surcharge en 7 jours", desc: "15 minutes par jour pour fermer les boucles ouvertes et retrouver des soirées calmes." },
  lumiere: { titre: "Bien choisir sa lumière d'écran", desc: "Yeux qui piquent, sommeil léger ? Les réglages gratuits d'abord, puis quoi acheter (ou pas)." },
};
export const lienGuide = (a: Aimant) => `/aimants/zayado-aimant-${a}.pdf`;

/** Lien direct vers le guide (la personne a déjà laissé son e-mail plus haut dans le tunnel). */
export function GuideOffert({ aimant, accroche, testId }: { aimant: Aimant; accroche: string; testId: string }) {
  const g = GUIDES[aimant];
  return (
    <div className="mt-5 flex flex-col items-start gap-4 rounded-[22px] border bg-white p-6 sm:flex-row sm:items-center" style={{ borderColor: LINE }} data-testid={testId}>
      <Gift className="size-6 flex-none" style={{ color: GOLD }} />
      <div className="flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "#B8893F" }}>{accroche}</p>
        <p className="font-semibold" style={{ color: NAVY }}>{g.titre}</p>
        <p className="text-sm opacity-75">{g.desc}</p>
      </div>
      <a href={lienGuide(aimant)} target="_blank" rel="noreferrer" data-testid={`${testId}-telecharger`} className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4" style={{ color: NAVY }}>
        <Download className="size-4" /> Télécharger (PDF)
      </a>
    </div>
  );
}

/** Capture e-mail → guide livré à l'écran + par e-mail (POST /api/leads avec `aimant`). */
export function AimantSortie({ aimant, source, accroche, testId }: { aimant: Aimant; source: string; accroche: string; testId: string }) {
  const [email, setEmail] = useState("");
  const g = GUIDES[aimant];
  const envoyer = useMutation({ mutationFn: () => apiPost<{ ok: boolean; guide?: string }>("/leads", { email, source, aimant }) });
  return (
    <div className="mt-6 rounded-[22px] border bg-white p-6" style={{ borderColor: LINE }} data-testid={testId}>
      <p className="site-hand text-[20px]">{accroche}</p>
      <p className="mt-1 font-semibold" style={{ color: NAVY }}>{g.titre}</p>
      <p className="text-sm opacity-75">{g.desc}</p>
      {envoyer.isSuccess ? (
        <a href={envoyer.data.guide ?? lienGuide(aimant)} target="_blank" rel="noreferrer" data-testid={`${testId}-telecharger`}
          className="mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold" style={{ background: GOLD, color: NAVY }}>
          <Download className="size-4" /> C'est à toi : télécharger le guide
        </a>
      ) : (
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); envoyer.mutate(); }}>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ton e-mail" aria-label="Ton e-mail" autoComplete="email"
            className="min-w-0 flex-[1_1_200px] rounded-full border bg-[#FDFCF8] px-5 py-3 text-[15px] outline-none focus:border-[#C9A97E]" style={{ borderColor: LINE }} data-testid={`${testId}-email`} />
          <button type="submit" disabled={envoyer.isPending} className="site-btn site-btn-primary px-6 py-3 text-[14.5px] disabled:opacity-50" data-testid={`${testId}-envoyer`}>
            {envoyer.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Recevoir le guide <ArrowRight className="size-4" />
          </button>
        </form>
      )}
      {envoyer.isError ? <p className="mt-2 text-sm" style={{ color: "#B42318" }}>{errorMessage(envoyer.error)}</p> : null}
      <p className="mt-2 text-[12px] opacity-55">Gratuit. Un e-mail utile par semaine au plus, désinscription en un clic.</p>
    </div>
  );
}
