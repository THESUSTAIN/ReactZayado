import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/kairos/GlassCard";
import { entApercu } from "@/lib/kairosApi";

// Cockpit : l'équipe aujourd'hui, en un coup d'œil. N'apparaît que si la personne a une entreprise (activée ou rejointe).
const LIBELLES = [["bureau", "au bureau"], ["teletravail", "en télétravail"], ["deplacement", "en déplacement"], ["absent", "absent(s)"]];

export default function CarteEquipe() {
  const [a, setA] = useState(null);
  useEffect(() => { entApercu().then(setA).catch(() => setA(null)); }, []);
  if (!a?.actif) return null;
  const parts = LIBELLES.filter(([k]) => a.aujourdhui?.[k] > 0).map(([k, l]) => `${a.aujourdhui[k]} ${l}`);
  const alertes = [
    a.pieces_a_verifier > 0 && [`${a.pieces_a_verifier} pièce(s) déposée(s) à vérifier`, "pieces"],
    a.plannings_a_regarder > 0 && [`${a.plannings_a_regarder} planning(s) de l'équipe à regarder`, "planning"],
    a.absences_a_decider > 0 && [`${a.absences_a_decider} demande(s) d'absence à valider`, "absences"],
    a.pieces_a_fournir > 0 && [`${a.pieces_a_fournir} pièce(s) à déposer dans ton Drive pro`, "pieces"],
    a.ma_presence == null && ["Indique où tu travailles aujourd'hui", "aujourdhui"],
  ].filter(Boolean);
  return (
    <GlassCard className="p-5" data-testid="cockpit-equipe">
      <Link to="/app/entreprise" className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[15px] font-semibold text-offwhite"><Users className="h-4 w-4 text-gold" /> Ton entreprise aujourd'hui</span>
        <ChevronRight className="h-4 w-4 text-offwhite/50" />
      </Link>
      <p className="mt-2 text-[14px] text-offwhite/85">
        {parts.length ? parts.join(" · ") : `${a.effectif} personne(s) dans l'équipe, présence pas encore renseignée.`}
        {a.non_renseigne > 0 && parts.length > 0 ? ` · ${a.non_renseigne} sans réponse` : ""}
      </p>
      {alertes.length > 0 && (
        <ul className="mt-2 space-y-1">{alertes.map(([x, vue]) => <li key={x}><Link to={`/app/entreprise?vue=${vue}`} className="text-[13px] text-gold hover:underline">• {x}</Link></li>)}</ul>
      )}
    </GlassCard>
  );
}
