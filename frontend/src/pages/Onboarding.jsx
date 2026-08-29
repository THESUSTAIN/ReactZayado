import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, ArrowLeft, Check, Compass } from "lucide-react";
import { toast } from "sonner";
import { authOnboarding } from "../lib/api";

// Onboarding relié à la Vision.
//
// Avant : l'inscription demandait quatre préférences (prénom, inspiration,
// espace, type de projet) puis déposait l'utilisateur sur une application
// entièrement vide — la page Vision comprise, alors que c'est elle que
// l'onboarding est censé amorcer. Aucun message ne confirmait quoi que ce
// soit, et rien n'indiquait quoi faire ensuite.
//
// Maintenant : deux étapes courtes, dont la Vision, qui est ENREGISTRÉE
// (POST /api/onboarding → champ `vision`, persisté côté serveur), confirmée
// à l'écran, puis suivie d'une première action explicite.

const WORKSPACES = ["Solo", "Petite équipe", "Agence / Cabinet"];
const PROJECT_TYPES = ["Service", "Produit", "Les deux"];
const INSPIRATIONS = [
  { id: "universelle", label: "Inspiration universelle" },
  { id: "foi", label: "Foi" },
];

const VISION_EXAMPLES = [
  "Vivre de mon activité de conseil sans dépasser 4 jours par semaine.",
  "Passer de missions ponctuelles à trois clients récurrents d'ici un an.",
  "Construire une petite équipe qui tourne sans moi au quotidien.",
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [inspiration, setInspiration] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [projectType, setProjectType] = useState("");
  const [vision, setVision] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await authOnboarding({
        first_name: firstName.trim(),
        inspiration,
        workspace_type: workspace,
        project_type: projectType,
        vision: vision.trim(),
      });
      // Confirmation explicite : l'utilisateur voit ce qui a été retenu,
      // au lieu d'être renvoyé sans un mot sur une application vide.
      setDone(true);
      if (res?.vision_saved) toast.success("Votre Vision est enregistrée.");
    } catch {
      toast.error("Impossible d'enregistrer pour le moment. Réessayez dans un instant.");
    } finally {
      setSaving(false);
    }
  };

  const Chip = ({ active, children, ...rest }) => (
    <button type="button" {...rest}
      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "border-[#DEC2A3] bg-[#DEC2A3]/15 text-[#F0DCA5]" : "border-white/15 bg-white/5 text-white/70 hover:border-white/30"}`}>
      {children}
    </button>
  );

  if (done) {
    return (
      <div className="min-h-screen bg-[#0A1128] p-4" data-testid="page-onboarding">
        <div className="mx-auto max-w-lg py-14">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
            <Check size={22} />
          </span>
          <h1 className="font-head mt-4 text-2xl font-semibold text-white">
            C'est enregistré{firstName.trim() ? `, ${firstName.trim()}` : ""}.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Votre espace est prêt. Voici ce que nous avons retenu — tout reste modifiable à tout moment.
          </p>

          {vision.trim() && (
            <div className="glass mt-6 rounded-2xl p-5" data-testid="onboarding-vision-recap">
              <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#DEC2A3]">
                <Compass size={13} /> Votre Vision
              </span>
              <p className="font-head mt-2 text-lg leading-snug text-white">« {vision.trim()} »</p>
            </div>
          )}

          <p className="mt-7 text-sm font-semibold text-white">Une seule chose à faire maintenant</p>
          <p className="mt-1 text-sm text-white/55">
            Choisissez la première action qui fait avancer cette Vision. Une seule — le reste attendra.
          </p>
          <button onClick={() => navigate("/")} data-testid="onboarding-go-home"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#DEC2A3] py-3 text-sm font-semibold text-[#0A1128] hover:opacity-90">
            Ouvrir mon espace <ArrowRight size={15} />
          </button>
          <button onClick={() => navigate("/vision")} data-testid="onboarding-go-vision"
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 py-3 text-sm font-semibold text-white/80 hover:bg-white/5">
            Voir ma page Vision
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1128] p-4" data-testid="page-onboarding">
      <div className="mx-auto max-w-lg py-10">
        <div className="flex items-center gap-1.5" aria-label={`Étape ${step} sur 2`}>
          {[1, 2].map((n) => (
            <span key={n} className={`h-1 flex-1 rounded-full ${n <= step ? "bg-[#DEC2A3]" : "bg-white/12"}`} />
          ))}
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[.14em] text-[#DEC2A3]">Étape {step} / 2</p>

        {step === 1 ? (
          <>
            <h1 className="font-head mt-1 text-2xl font-semibold text-white">Bienvenue</h1>
            <p className="mt-1 text-sm text-white/55">
              Deux minutes pour personnaliser votre espace. Rien n'est imposé, tout se modifie ensuite.
            </p>

            <div className="glass mt-6 space-y-5 rounded-2xl p-5">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-white/70" htmlFor="ob-firstname">Votre prénom</label>
                <input id="ob-firstname" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[#DEC2A3]/50 focus:outline-none" />
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-white/70">Votre espace de travail</label>
                <div className="grid grid-cols-3 gap-2">
                  {WORKSPACES.map((w) => (
                    <Chip key={w} active={workspace === w} onClick={() => setWorkspace(w)}>{w}</Chip>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-white/70">Ce que vous vendez</label>
                <div className="grid grid-cols-3 gap-2">
                  {PROJECT_TYPES.map((t) => (
                    <Chip key={t} active={projectType === t} onClick={() => setProjectType(t)}>{t}</Chip>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-white/70">Le ton qui vous parle — au choix, jamais imposé</label>
                <div className="grid grid-cols-2 gap-2">
                  {INSPIRATIONS.map((i) => (
                    <Chip key={i.id} active={inspiration === i.id} onClick={() => setInspiration(i.id)} data-testid={`inspiration-${i.id}`}>{i.label}</Chip>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={() => setStep(2)} data-testid="onboarding-next"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#DEC2A3] py-3 text-sm font-semibold text-[#0A1128] hover:opacity-90">
              Continuer <ArrowRight size={15} />
            </button>
          </>
        ) : (
          <>
            <h1 className="font-head mt-1 text-2xl font-semibold text-white">Où voulez-vous aller ?</h1>
            <p className="mt-1 text-sm leading-relaxed text-white/55">
              Une phrase suffit. C'est elle qui servira de repère à chaque fois que l'application vous
              aidera à choisir entre deux priorités.
            </p>

            <div className="glass mt-6 rounded-2xl p-5">
              <label className="mb-1.5 block text-[12px] font-medium text-white/70" htmlFor="ob-vision">Votre Vision</label>
              <textarea id="ob-vision" rows={3} value={vision} onChange={(e) => setVision(e.target.value)}
                placeholder="Dans un an, mon activité ressemble à…" data-testid="onboarding-vision-input"
                className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm leading-relaxed text-white placeholder:text-white/35 focus:border-[#DEC2A3]/50 focus:outline-none" />
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[.12em] text-white/40">Des exemples, pour démarrer</p>
              <div className="mt-2 space-y-1.5">
                {VISION_EXAMPLES.map((example) => (
                  <button key={example} type="button" onClick={() => setVision(example)}
                    className="block w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs leading-relaxed text-white/60 transition-colors hover:border-[#DEC2A3]/40 hover:text-white/85">
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={submit} disabled={saving} data-testid="onboarding-submit"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#DEC2A3] py-3 text-sm font-semibold text-[#0A1128] hover:opacity-90 disabled:opacity-60">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <>Enregistrer ma Vision <ArrowRight size={15} /></>}
            </button>
            <div className="mt-3 flex items-center justify-between">
              <button onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80">
                <ArrowLeft size={13} /> Retour
              </button>
              <button onClick={submit} disabled={saving} data-testid="onboarding-skip-vision"
                className="text-xs text-white/45 hover:text-white/75">
                Je la définirai plus tard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
