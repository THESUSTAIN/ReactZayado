import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarCheck } from "lucide-react";
import { SimulationReprise, ACCENT } from "@/zy/components/reprise/SimulationReprise";
import { RapportParEmail } from "@/zy/components/reprise/RdvReprise";
import { fetchSimulationPublique, getToken } from "@/zy/lib/kairosApi";

/**
 * Page publique « Testez votre projet » (app.zayado.net/testez-votre-projet), ouverte depuis zayado.net.
 * Sans compte : formulaire en 3 étapes → analyse → résultat → la suite, au choix (rien d'obligatoire).
 * Le compte n'est demandé que pour réserver le rendez-vous ; le rapport suit la personne.
 */
export default function TestezProjetPublic() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    const sid = params.get("sim");
    if (sid) fetchSimulationPublique(sid).then(setInitial).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const versRdv = (id) => {
    const suite = `/app/testez-votre-projet?sim=${encodeURIComponent(id)}`;
    navigate(getToken() ? suite : `/login?next=${encodeURIComponent(suite)}`);
  };

  return (
    <div className="min-h-screen text-offwhite" style={{ background: "linear-gradient(180deg,#294174 0%,#1A2B57 55%,#0B1A3D 100%)" }} data-testid="testez-public">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <a href="https://zayado.net" className="flex items-center gap-3">
          <img src="/logo-z.png" alt="Zayado" className="h-10 w-auto" />
          <span className="leading-tight"><span className="block text-[18px]">Zayado</span><span className="block text-[10.5px] uppercase tracking-[0.16em]" style={{ color: ACCENT }}>La maison des entrepreneurs apaisés</span></span>
        </a>
        <a href="/login" className="text-[13.5px] text-offwhite/70 hover:text-offwhite">Déjà un compte&nbsp;? Se connecter</a>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-20">
        <p className="text-[11.5px] uppercase tracking-[0.18em]" style={{ color: ACCENT }}>Gratuit · sans compte · 3 minutes</p>
        <h1 className="mb-1 mt-2 text-[30px] font-normal leading-tight sm:text-[36px]">
          Testez votre projet de <span style={{ fontFamily: "Caveat, cursive", color: ACCENT, fontSize: "1.25em" }}>reprise</span>
        </h1>
        <p className="mb-8 max-w-2xl text-[15px] text-offwhite/70">Vos chiffres, un plan indicatif sans apport, les points forts et les risques. Le calcul se fait sans IA, en quelques secondes.</p>

        <SimulationReprise publique initial={initial} suite={(r) => (
          <div data-testid="sim-suite">
            <h2 className="mb-1 text-[22px] font-normal">Que souhaitez-vous faire maintenant&nbsp;?</h2>
            <p className="mb-4 text-[13.5px] text-offwhite/65">Rien n'est obligatoire : votre rapport reste à vous.</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl bg-[#FAF7F1] p-5 text-[#1A2B57]">
                <p className="text-[17px]">En parler 20 minutes avec <span className="whitespace-nowrap">Marie-Esther</span></p>
                <p className="mt-1 text-[13px] text-[#4B5568]">Experte en analyse financière, du côté du repreneur. En visio, 5 €, déduits si vous continuez. Vous créez votre accès gratuit (e-mail ou Google) au moment de choisir le créneau : votre rapport vous suit.</p>
                <button onClick={() => versRdv(r.id)} data-testid="suite-rdv"
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#1A2B57] px-5 py-2.5 text-[14px] font-medium text-white">
                  <CalendarCheck size={15} /> Choisir un créneau
                </button>
              </div>
              <div className="rounded-3xl border border-white/12 p-5">
                <p className="text-[17px]">Recevoir mon rapport par e-mail</p>
                <p className="mb-3 mt-1 text-[13px] text-offwhite/65">Gratuit, pour le relire ou le transmettre.</p>
                <RapportParEmail simulationId={r.id} />
              </div>
            </div>
          </div>
        )} />
      </main>
    </div>
  );
}
