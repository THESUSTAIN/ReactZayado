import React from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard, Radar, CheckSquare, CalendarCheck, Bot, FileText, Bell, Users, Heart, Sparkles, ArrowLeft, Check,
} from "lucide-react";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import { offreMin } from "@/lib/droits";

// Page d'upsell douce : au lieu d'un simple toast quand une page est verrouillée,
// on explique ce que le module apporte et comment le débloquer (offre + essai 1 €).
const INFOS = {
  cockpit: { titre: "Aujourd'hui", Icon: LayoutDashboard, accent: "#DEC2A3",
    pitch: "Ton point du jour, tes 3 priorités et ton check-in d'énergie, chaque matin.",
    points: ["Le point du jour rédigé pour toi", "Tes 3 priorités, triées par l'IA", "Check-in d'énergie & suivi"] },
  radar: { titre: "Radar", Icon: Radar, accent: "#3E7FA3",
    pitch: "De vrais prospects qualifiés chaque jour, avec le message déjà rédigé.",
    points: ["30 à 150 contacts vérifiés / mois", "Message de prise de contact prêt", "Recherches Google & pub prête à lancer"] },
  idees: { titre: "Plan d'action", Icon: CheckSquare, accent: "#7C7FC9",
    pitch: "Transforme ta vision en objectifs, actions et processus concrets.",
    points: ["Objectifs à 90 jours & 3 ans", "Actions du jour reliées à tes objectifs", "Processus réutilisables"] },
  revue: { titre: "Revue hebdo", Icon: CalendarCheck, accent: "#3E8E86",
    pitch: "Boucle ta semaine en 5 minutes et repars avec un cap clair.",
    points: ["Synthèse de ta semaine", "Victoires & apprentissages", "E-mail du lundi"] },
  agents: { titre: "Agents IA", Icon: Bot, accent: "#9B86B0",
    pitch: "Tes assistants IA qui connaissent ton projet et préparent ton travail.",
    points: ["Agents personnalisés", "Contexte de ton projet injecté", "Gain de temps au quotidien"] },
  agent_business: { titre: "Agent Business", Icon: Bot, accent: "#9B86B0",
    pitch: "Ton chatbot client, à ta marque, qui répond pour toi 24/7.",
    points: ["Chatbot à ta marque", "Répond avec tes documents", "Capte les demandes clients"] },
  documents: { titre: "Documents IA", Icon: FileText, accent: "#C08497",
    pitch: "Brief, plan 30 jours, SWOT — générés et prêts à l'emploi.",
    points: ["Brief & plan d'action 30 j", "Analyse SWOT", "Documents à ta charte"] },
  alertes: { titre: "Alertes WhatsApp & Telegram", Icon: Bell, accent: "#DEC2A3",
    pitch: "Reçois l'essentiel là où tu es, sans ouvrir l'app.",
    points: ["Rappels de check-in", "Décisions en attente", "Opportunités du Radar"] },
  equipe: { titre: "Équipe", Icon: Users, accent: "#3E7FA3",
    pitch: "Avance à plusieurs : chacun son cockpit, sa Vision et son Radar.",
    points: ["2 comptes Solo inclus", "Invite ou retire en 1 clic", "150 prospects / mois pour toi"] },
  bienetre: { titre: "Bien-être & Mindset", Icon: Heart, accent: "#C08497",
    pitch: "Parcours 7 jours, rituels et carnet pour garder le cap sereinement.",
    points: ["Parcours 7 jours", "Rituels doux", "Carnet & carte du jour"] },
};

export default function Debloquer() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mod = params.get("m") || "cockpit";
  const info = INFOS[mod] || INFOS.cockpit;
  const { Icon } = info;
  const offre = offreMin(mod);

  return (
    <div className="min-h-screen" data-testid="debloquer-page">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header />
        <main className="mx-auto max-w-2xl px-4 pb-28 pt-8 sm:px-6 lg:pb-12">
          <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-1.5 text-sm text-offwhite/60 transition hover:text-offwhite" data-testid="debloquer-retour">
            <ArrowLeft size={15} /> Retour
          </button>

          <div className="overflow-hidden rounded-[26px] border border-white/12 bg-white/[0.05] p-7 text-center backdrop-blur-xl sm:p-10">
            <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg" style={{ background: info.accent }}>
              <Icon size={30} className="text-white" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">Inclus dès l'offre {offre}</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-offwhite sm:text-4xl" data-testid="debloquer-titre">{info.titre}</h1>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-offwhite/65">{info.pitch}</p>

            <ul className="mx-auto mt-6 max-w-sm space-y-2.5 text-left">
              {info.points.map((p, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-offwhite/80">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: "linear-gradient(to bottom,#F1E2CC,#DEC2A3)" }}>
                    <Check size={12} className="text-navy-900" strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/pricing" data-testid="debloquer-offres" className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-semibold text-navy-900 shadow-[0_10px_30px_rgba(222,194,163,0.25)] transition hover:brightness-105" style={{ background: "linear-gradient(to bottom,#F1E2CC,#DEC2A3)" }}>
                <Sparkles size={16} /> Voir les offres
              </Link>
              <Link to="/activer" data-testid="debloquer-essai" className="inline-flex items-center rounded-full border border-white/20 px-7 py-3.5 text-[15px] font-semibold text-offwhite transition hover:bg-white/10">
                Essayer Solo · 1 mois pour 1 €
              </Link>
            </div>
            <p className="mt-4 text-xs text-offwhite/40">Sans engagement, résiliable en 1 clic.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
