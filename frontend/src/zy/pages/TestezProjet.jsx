import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Sidebar } from "@/zy/components/kairos/Sidebar";
import { Header } from "@/zy/components/kairos/Header";
import { SimulationReprise, ACCENT } from "@/zy/components/reprise/SimulationReprise";
import { RdvReprise, creneauLisible } from "@/zy/components/reprise/RdvReprise";
import { fetchDerniereSimulation, fetchRdvReprise, rattacherSimulation } from "@/zy/lib/kairosApi";

/**
 * « Testez votre projet » dans l'app (compte connecté).
 * ?sim=<id> : simulation faite sans compte sur la page publique, rattachée au compte à l'arrivée.
 * ?rdv=<id> : retour du paiement Mollie du rendez-vous.
 */
export default function TestezProjet() {
  const [params, setParams] = useSearchParams();
  const [initial, setInitial] = useState(undefined);       // undefined = chargement ; null = aucune simulation
  const [courante, setCourante] = useState(null);
  const [rdv, setRdv] = useState(null);

  useEffect(() => {
    const sid = params.get("sim");
    const charger = sid
      ? rattacherSimulation(sid).catch(() => { toast.error("Ce rapport n'a pas pu être retrouvé. Refaites le test."); return null; })
      : fetchDerniereSimulation().then((d) => (d && !d.vide ? d : null)).catch(() => null);
    charger.then((d) => { setInitial(d); setCourante(d); });
    const id = params.get("rdv");
    if (id) fetchRdvReprise(id).then(setRdv).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[96px]">
        <Header title="Testez votre projet de reprise" subtitle="Vos chiffres, un plan indicatif, puis 20 minutes avec Marie-Esther" />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6" data-testid="testez-projet">
          <h1 className="mb-1 font-display text-2xl font-normal">Testez votre projet de reprise</h1>
          <p className="mb-6 text-[14px] text-offwhite/65">Vos chiffres, un plan indicatif sans apport, puis, si vous le souhaitez, 20 minutes avec <span className="whitespace-nowrap">Marie-Esther</span>.</p>
          {rdv ? (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.05] p-4" data-testid="rdv-etat">
              <CheckCircle2 size={20} style={{ color: ACCENT }} />
              <p className="text-[14px]">
                {rdv.statut === "paid" ? <>Votre rendez-vous est confirmé : {creneauLisible(rdv.creneau)}. <span className="whitespace-nowrap">Marie-Esther</span> vous enverra le lien de la visio par e-mail avant le rendez-vous.</>
                  : rdv.statut === "pending" ? <>Paiement en cours de validation pour le créneau {creneauLisible(rdv.creneau)}.</>
                    : <>Le paiement n'a pas abouti. Vous pouvez choisir un autre créneau.</>}
              </p>
              <button className="ml-auto text-[12.5px] underline" onClick={() => { params.delete("rdv"); setParams(params); setRdv(null); }}>Fermer</button>
            </div>
          ) : null}
          {initial === undefined ? <p className="flex items-center gap-2 text-[14px]"><Loader2 size={15} className="animate-spin" /> Chargement…</p> : (
            <div className={`grid gap-6 ${courante ? "lg:grid-cols-[1fr_330px]" : ""}`}>
              <div className={courante ? "" : "rounded-3xl border border-white/10 bg-white/[0.04] p-6"}>
                <SimulationReprise initial={initial} onResultat={setCourante} />
              </div>
              {courante ? <aside className="h-fit"><RdvReprise simulationId={courante.id || ""} /></aside> : null}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
