import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, ShieldCheck, Store, Handshake, ChevronRight, Building2, Receipt, User, Bell,
  Download, LifeBuoy, LogOut, Gift, Loader2, Sparkles, ExternalLink, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchMoi, fetchAbonnement, fetchMesFilleuls, fetchOrganisation, fetchCommandes, fetchState, telechargerExport, setToken,
} from "@/lib/kairosApi";
import { planNom } from "@/lib/plans";

const RH_URL = process.env.REACT_APP_RH_URL || "https://rh.zayado.net";

/* « Mon compte » : un seul point d'entrée après la connexion (comme l'espace client Kiabi).
   Les espaces s'affichent selon l'offre et le rôle : Cockpit (SaaS), Zayado RH (Équipe/Entreprise),
   Console admin, Espace vendeur (marketplace) ; la boutique n'est jamais ouverte d'ici. */
export default function MonCompte() {
  const navigate = useNavigate();
  const [d, setD] = useState(null);

  useEffect(() => {
    Promise.allSettled([fetchMoi(), fetchAbonnement(), fetchMesFilleuls(), fetchOrganisation(), fetchCommandes(), fetchState()])
      .then(([moi, abo, fil, org, cmd, st]) => setD({
        moi: moi.value || {}, abo: abo.value || {}, filleuls: fil.value?.items || [],
        org: org.value?.organisation || null, commandes: cmd.value?.items || [],
        prenom: st.value?.profile?.prenom || "",
      }));
  }, []);

  if (!d) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>;

  const role = d.moi.role;
  const actif = d.abo.acces === "actif";
  const plan = d.abo.plan;
  const espaces = [
    { cle: "cockpit", titre: "Mon cockpit", desc: actif ? `Offre ${planNom(plan)}` : "Active ton offre pour y accéder", Icone: LayoutDashboard, go: () => navigate(actif ? "/app" : "/activer"), visible: true, principal: true },
    { cle: "rh", titre: "Zayado RH", desc: "Planning, présence, absences de ton équipe", Icone: Users, go: () => window.open(RH_URL, "_blank", "noopener"), visible: ["business", "entreprise"].includes(plan) && actif, externe: true },
    { cle: "vendeur", titre: "Espace vendeur", desc: "Tes produits sur la marketplace", Icone: Store, go: () => navigate("/espace-vendeur"), visible: role === "vendeur" || role === "admin" },
    { cle: "admin", titre: "Console admin", desc: "Utilisateurs, offres, contenus", Icone: ShieldCheck, go: () => navigate("/admin"), visible: role === "admin" },
    { cle: "cession", titre: "Cession & Reprise", desc: "Cédants, repreneurs, fiches entreprise", Icone: Handshake, go: () => toast("En préparation : bientôt disponible."), visible: role === "admin", bientot: true },
  ].filter((e) => e.visible);

  const actifs = d.filleuls.filter((f) => f.statut === "actif").length;
  const deconnexion = () => { setToken(null); navigate("/login"); };
  const Ligne = ({ Icone, label, onClick, testid }) => (
    <button onClick={onClick} data-testid={testid} className="glass flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[15px] text-offwhite transition hover:border-gold/40">
      <Icone size={19} className="text-gold" /><span className="flex-1">{label}</span><ChevronRight size={17} className="text-offwhite/45" />
    </button>
  );
  const Titre = ({ children }) => <h2 className="mb-3 mt-8 font-display text-lg font-semibold text-offwhite">{children}</h2>;

  return (
    <main className="min-h-screen px-4 pb-16 pt-8 text-offwhite sm:px-8" data-testid="mon-compte">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <img src="/logo.png" alt="Zayado" className="h-10 w-10 object-contain" />
          <button onClick={deconnexion} className="inline-flex items-center gap-1.5 text-sm text-offwhite/60 hover:text-offwhite" data-testid="compte-deconnexion"><LogOut size={15} /> Se déconnecter</button>
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">Bonjour {d.prenom || "à toi"}</h1>
        <p className="mt-1 text-sm text-offwhite/60">{d.moi.email}</p>

        <Titre>Mes espaces</Titre>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="compte-espaces">
          {espaces.map((e) => (
            <button key={e.cle} onClick={e.go} data-testid={`compte-espace-${e.cle}`}
              className={`glass group flex items-start gap-3 rounded-2xl p-5 text-left transition hover:border-gold/50 ${e.principal ? "ring-1 ring-gold/40" : ""}`}>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${e.principal ? "bg-gold text-navy-900" : "bg-gold/15 text-gold"}`}><e.Icone size={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-display text-[17px] font-semibold">{e.titre}{e.bientot && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-offwhite/70">bientôt</span>}</span>
                <span className="mt-0.5 block text-[13px] text-offwhite/60">{e.desc}</span>
              </span>
              {e.externe ? <ExternalLink size={15} className="mt-1 text-offwhite/40" /> : <ChevronRight size={17} className="mt-1 text-offwhite/40 transition group-hover:translate-x-0.5" />}
            </button>
          ))}
        </div>

        <div className="grid gap-x-8 lg:grid-cols-2">
          <div>
            <Titre>Mon offre & parrainage</Titre>
            <div className="glass rounded-2xl p-5" data-testid="compte-offre">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-offwhite/50">Offre</p>
                  <p className="mt-1 font-display text-2xl font-semibold">{actif ? planNom(plan) : "Aucune offre active"}</p>
                  <p className="mt-0.5 text-xs text-offwhite/55">{d.abo.cycle === "offert" ? "Offert par Zayado" : d.abo.renouvellement?.date ? `Renouvellement le ${new Date(d.abo.renouvellement.date).toLocaleDateString("fr-FR")}` : ""}</p>
                </div>
                <button onClick={() => navigate("/parametres#offre")} className="rounded-xl border border-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"><CreditCard size={13} className="mr-1 inline" /> Gérer</button>
              </div>
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="flex items-center gap-2 text-sm font-semibold"><Gift size={15} className="text-gold" /> {actifs} filleul{actifs > 1 ? "s" : ""} abonné{actifs > 1 ? "s" : ""}</p>
                <p className="mt-0.5 text-xs text-offwhite/55">Chaque personne invitée qui s'abonne t'offre 1 mois d'abonnement{d.filleuls.length > actifs ? ` · ${d.filleuls.length - actifs} invitation(s) en attente` : ""}.</p>
                <button onClick={() => navigate("/parametres#offre")} className="mt-3 text-xs font-semibold text-gold hover:underline">Inviter quelqu'un →</button>
              </div>
            </div>

            <Titre>Mon entreprise</Titre>
            <button onClick={() => navigate("/parametres#compte")} className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left hover:border-gold/40" data-testid="compte-entreprise">
              <Building2 size={20} className="text-gold" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{d.org?.nom || "Déclarer mon entreprise"}</span>
                <span className="block truncate text-xs text-offwhite/55">{d.org ? [d.org.siret && `SIRET ${d.org.siret}`, d.org.details?.naf_libelle].filter(Boolean).join(" · ") : "Nom ou SIRET : sert à ton actualité légale et à ta veille"}</span>
              </span>
              <ChevronRight size={17} className="text-offwhite/45" />
            </button>
          </div>

          <div>
            <Titre>Mes factures & achats</Titre>
            <Ligne Icone={Receipt} label={`Factures d'abonnement`} onClick={() => navigate("/parametres#offre")} testid="compte-factures" />
            {d.commandes.length > 0 && <div className="mt-3"><Ligne Icone={Sparkles} label={`Mes achats (${d.commandes.length})`} onClick={() => navigate("/mon-espace")} testid="compte-achats" /></div>}

            <Titre>Mon profil</Titre>
            <div className="space-y-3">
              <Ligne Icone={User} label="Informations" onClick={() => navigate("/parametres#compte")} testid="compte-infos" />
              <Ligne Icone={Bell} label="Préférences et confidentialité" onClick={() => navigate("/parametres#notifications")} testid="compte-preferences" />
              <Ligne Icone={Download} label="Télécharger mes données" onClick={async () => { try { await telechargerExport(); } catch { toast.error("Export impossible pour le moment."); } }} testid="compte-export" />
            </div>

            <Titre>Besoin d'aide</Titre>
            <Ligne Icone={LifeBuoy} label="Écrire à l'équipe Zayado" onClick={() => navigate("/app/collaborateurs")} testid="compte-aide" />
          </div>
        </div>
      </div>
    </main>
  );
}
