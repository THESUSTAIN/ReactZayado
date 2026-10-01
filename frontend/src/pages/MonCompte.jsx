import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  LayoutDashboard, Users, FolderOpen, ShieldCheck, Store, Handshake, ChevronRight, Building2, Receipt, User, Bell,
  Download, LifeBuoy, LogOut, Loader2, ShoppingBag, Compass, TrendingUp, Gift, ExternalLink, Crown,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchMoi, fetchAbonnement, fetchMesFilleuls, fetchOrganisation, fetchCommandes, fetchState, telechargerExport,
  setToken, fetchLoginCarousel, mediaUrl,
} from "@/lib/kairosApi";
import { planNom, PLANS } from "@/lib/plans";
import { ouvrirDossierDocuments } from "@/components/kairos/ChatAssistant";
import { accueilPro, basculerEspace, chargerEspace, enPro } from "@/lib/espace";

const RH_URL = process.env.REACT_APP_RH_URL || "https://rh.zayado.net";
// Commandes de la boutique (Shopify) : l'espace client de la boutique, jamais ouvert dans le cockpit.
const BOUTIQUE_COMPTE_URL = process.env.REACT_APP_BOUTIQUE_COMPTE_URL || "https://zayado.net/account";

// Paliers de parrainage (affichage) : nombre de filleuls abonnés.
const PALIERS = [[0, "Membre"], [1, "Ambassadeur"], [3, "Ambassadeur Or"], [10, "Partenaire"]];

/* « Mon compte » — page d'accueil après connexion, sur le modèle de l'espace client Kiabi :
   une image à gauche (bandeau en haut sur mobile) et, à droite, une liste de lignes par rubrique.
   Deux designs à valider : A « clair » (fond blanc, comme Kiabi) et B « Zayado » (ciel navy, verre).
   ?design=b pour voir le B. */
export default function MonCompte() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const design = params.get("design") === "b" ? "b" : "a";
  const [d, setD] = useState(null);

  const [esp, setEsp] = useState(null);
  useEffect(() => { chargerEspace().then(setEsp).catch(() => {}); }, []);
  useEffect(() => {
    Promise.allSettled([fetchMoi(), fetchAbonnement(), fetchMesFilleuls(), fetchOrganisation(), fetchCommandes(), fetchState(), fetchLoginCarousel()])
      .then(([moi, abo, fil, org, cmd, st, car]) => setD({
        moi: moi.value || {}, abo: abo.value || {}, filleuls: fil.value?.items || [],
        org: org.value?.organisation || null, commandes: cmd.value?.items || [],
        prenom: st.value?.profile?.prenom || "",
        // L'image vient du carrousel de connexion (modifiable dans la console admin).
        image: car.value?.slides?.[0]?.src ? mediaUrl(car.value.slides[0].src) : "/presentation-poster.jpg",
      }));
  }, []);

  if (!d) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>;

  const clair = design === "a";
  const role = d.moi.role;
  const actif = d.abo.acces === "actif";
  const plan = d.abo.plan;
  const actifs = d.filleuls.filter((f) => f.statut === "actif").length;
  const palier = [...PALIERS].reverse().find(([n]) => actifs >= n);
  const suivant = PALIERS.find(([n]) => n > actifs);
  const ordre = PLANS.map((p) => p.key);
  const offreSuivante = actif && plan !== "offert" ? PLANS[ordre.indexOf(plan) + 1] : PLANS.find((p) => p.key === "serenite");

  const c = clair
    ? { page: "bg-[#F6F1E9] text-[#0f1b3a]", ligne: "bg-[#EADFCC] hover:bg-[#E2D4BC] border border-[#DCCBAF]", titre: "text-[#0f1b3a]", doux: "text-[#6b6252]", icone: "text-[#0f1b3a]", carte: "bg-[#EFE6D6] border border-[#DCCBAF]", barre: "bg-[#DCCBAF]" }
    : { page: "text-offwhite", ligne: "bg-white/[0.09] hover:bg-white/[0.14] border border-white/15", titre: "text-offwhite", doux: "text-offwhite/60", icone: "text-gold", carte: "glass", barre: "bg-white/15" };

  const Ligne = ({ Icone, label, sous, onClick, testid, externe, badge }) => (
    <button onClick={onClick} data-testid={testid} className={`flex w-full items-center gap-4 rounded-xl px-5 py-4 text-left transition ${c.ligne}`}>
      <Icone size={20} className={`shrink-0 ${c.icone}`} strokeWidth={1.8} />
      <span className="min-w-0 flex-1">
        <span className={`flex items-center gap-2 text-[15px] ${c.titre}`}>{label}{badge && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${clair ? "bg-[#0f1b3a] text-white" : "bg-gold/20 text-gold"}`}>{badge}</span>}</span>
        {sous && <span className={`block truncate text-[12.5px] ${c.doux}`}>{sous}</span>}
      </span>
      {externe ? <ExternalLink size={16} className={c.doux} /> : <ChevronRight size={18} className={c.titre} />}
    </button>
  );
  const Rubrique = ({ titre, children }) => (
    <section className="mt-9">
      <h2 className={`mb-3 text-[15px] font-bold ${c.titre}`}>{titre}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );

  const deconnexion = () => { setToken(null); navigate("/login"); };

  return (
    <div className={`min-h-screen ${c.page}`} data-testid="mon-compte" data-design={design}>
      {/* Barre du haut, comme Kiabi : logo au centre, raccourci cockpit à droite */}
      <header className={`sticky top-0 z-20 flex items-center justify-between px-4 py-3 sm:px-8 ${clair ? "border-b border-[#DCCBAF] bg-[#F6F1E9]/95" : "border-b border-white/10 bg-[#0b1a3d]/80"} backdrop-blur`}>
        <span className={`text-[12px] font-semibold uppercase tracking-[0.2em] ${clair ? "text-[#8A5A1E]" : "text-gold"}`}>Mon compte</span>
        <img src={clair ? "/logo-zayado-bleu.png" : "/logo-zayado-blanc.png"} alt="Zayado" className="h-8 object-contain" onError={(e) => { e.currentTarget.src = "/logo.png"; }} />
        <button onClick={() => navigate(actif ? "/app" : "/activer")} className={`rounded-full px-4 py-2 text-[13px] font-semibold ${clair ? "bg-[#0f1b3a] text-white" : "bg-gold text-navy-900"}`} data-testid="compte-vers-cockpit">Cockpit</button>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Image : colonne fixe à gauche sur ordinateur, bandeau en haut sur mobile */}
        <div className="h-52 overflow-hidden sm:h-72 lg:sticky lg:top-[57px] lg:h-[calc(100vh-57px)]">
          <img src={d.image} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = "/presentation-poster.jpg"; }} />
        </div>

        <main className="mx-auto w-full max-w-[560px] px-5 pb-20 pt-8 lg:px-10">
          {params.get("vue") === "achats" ? (
            <MesAchats commandes={d.commandes} c={c} clair={clair} onRetour={() => navigate("/compte")} />
          ) : (<>
          <h1 className={`text-[26px] font-bold ${c.titre}`}>Bonjour {d.prenom || "à toi"}</h1>
          <p className={`mt-1 text-[15px] ${c.doux}`}>{d.moi.email}</p>

          <Rubrique titre="Mes espaces">
            {(!esp?.entreprise || esp.perso) && <Ligne Icone={LayoutDashboard} label="Mon cockpit perso" sous={actif ? `Offre ${planNom(plan)}` : "Active ton offre pour y accéder"} onClick={() => (enPro() ? basculerEspace("perso") : navigate(actif ? "/app" : "/activer"))} testid="compte-espace-cockpit" />}
            {esp?.entreprise && <Ligne Icone={Building2} label={`Espace ${esp.entreprise.nom}`} sous="Les outils partagés de l'entreprise" onClick={() => (enPro() ? navigate(accueilPro(esp.entreprise.modules)) : basculerEspace("pro", accueilPro(esp.entreprise.modules)))} testid="compte-espace-entreprise" />}
            {["business", "entreprise"].includes(plan) && actif && <Ligne Icone={Users} label="Zayado RH" sous="Planning, présence et absences de ton équipe" onClick={() => window.open(RH_URL, "_blank", "noopener")} externe testid="compte-espace-rh" />}
            {(role === "vendeur" || role === "admin") && <Ligne Icone={Store} label="Espace vendeur" sous="Tes produits sur la marketplace" onClick={() => navigate("/espace-vendeur")} testid="compte-espace-vendeur" />}
            {role === "admin" && <Ligne Icone={ShieldCheck} label="Console admin" sous="Utilisateurs, offres, contenus" onClick={() => navigate("/admin")} testid="compte-espace-admin" />}
            {role === "admin" && <Ligne Icone={Handshake} label="Cession & Reprise" sous="Cédants, repreneurs, fiches entreprise" badge="bientôt" onClick={() => toast("En préparation.")} testid="compte-espace-cession" />}
          </Rubrique>

          <Rubrique titre="Mes commandes">
            <Ligne Icone={ShoppingBag} label="Mes achats sur la boutique" sous="Commandes zayado.net : suivi, factures, retours" onClick={() => window.open(BOUTIQUE_COMPTE_URL, "_blank", "noopener")} externe testid="compte-boutique" />
            <Ligne Icone={Receipt} label="Mes factures d'abonnement" onClick={() => navigate("/parametres#offre")} testid="compte-factures" />
            <Ligne Icone={Gift} label={`Mes services achetés${d.commandes.length ? ` (${d.commandes.length})` : ""}`} sous="Formations, accompagnements et services payés dans Zayado" onClick={() => navigate("/compte?vue=achats")} testid="compte-achats" />
          </Rubrique>

          <Rubrique titre="Mon espace fidélité">
            <div className="grid gap-3 sm:grid-cols-2" data-testid="compte-fidelite">
              <button onClick={() => navigate("/parametres#offre")} className={`rounded-xl p-5 text-left ${c.ligne}`}>
                <p className={`text-[13px] ${c.doux}`}>Mes filleuls abonnés</p>
                <p className={`mt-1 text-3xl font-bold ${c.titre}`}>{actifs}</p>
                <p className={`mt-3 text-[14px] font-semibold ${c.titre}`}>Tu es <span className={clair ? "text-[#B07A2E]" : "text-gold"}>{palier?.[1]}</span></p>
                {suivant && <p className={`text-[12px] ${c.doux}`}>Plus que {suivant[0] - actifs} filleul{suivant[0] - actifs > 1 ? "s" : ""} pour devenir {suivant[1]}</p>}
                {suivant && <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${c.barre}`}><div className={`h-full rounded-full ${clair ? "bg-[#B07A2E]" : "bg-gold"}`} style={{ width: `${Math.max(6, (actifs / suivant[0]) * 100)}%` }} /></div>}
                <p className={`mt-3 text-[12px] ${c.doux}`}>1 mois offert pour chaque filleul qui s'abonne.</p>
              </button>
              {offreSuivante && (
                <button onClick={() => navigate("/parametres#offre")} className="rounded-xl bg-[#0f1b3a] p-5 text-left text-white">
                  <Crown size={20} className="text-[#DEC2A3]" />
                  <p className="mt-2 text-[15px] font-semibold">{actif ? `Passer à ${offreSuivante.nom}` : "Activer mon offre"}</p>
                  <p className="mt-1 text-[12.5px] text-white/70">{offreSuivante.points?.slice(1, 3).join(" · ")}</p>
                  <span className="mt-4 block rounded-lg bg-white py-2 text-center text-[13px] font-semibold text-[#0f1b3a]">Voir</span>
                </button>
              )}
            </div>
          </Rubrique>

          <Rubrique titre="Ma rentabilité">
            <Ligne Icone={TrendingUp} label="Analyse financière de mon entreprise" sous="Chiffre d'affaires, marges, trésorerie, point mort" badge="bientôt" onClick={() => toast("En préparation : envoie-nous ton exemple d'analyse.")} testid="compte-rentabilite" />
          </Rubrique>

          <Rubrique titre="Nos services">
            <Ligne Icone={Compass} label="Mon diagnostic d'équilibre" sous="3 minutes · 8 domaines · tes 2 priorités" onClick={() => navigate("/app/diagnostic")} testid="compte-diagnostic" />
            <Ligne Icone={LifeBuoy} label="Un expert Zayado avec moi" sous="Demande d'aide et suivi de tes demandes" onClick={() => navigate("/app/collaborateurs")} testid="compte-collaborateurs" />
          </Rubrique>

          <Rubrique titre="Mon profil">
            <Ligne Icone={FolderOpen} label="Mes documents" sous="Les fichiers créés par l'IA, dans ton Drive ou OneDrive" onClick={ouvrirDossierDocuments} externe testid="compte-documents" />
            <Ligne Icone={User} label="Informations" onClick={() => navigate("/parametres#compte")} testid="compte-infos" />
            <Ligne Icone={Building2} label={d.org?.nom ? `Mon entreprise · ${d.org.nom}` : "Déclarer mon entreprise"} onClick={() => navigate("/parametres#compte")} testid="compte-entreprise" />
            <Ligne Icone={Bell} label="Préférences et confidentialité" onClick={() => navigate("/parametres#notifications")} testid="compte-preferences" />
            <Ligne Icone={Download} label="Télécharger mes données" onClick={async () => { try { await telechargerExport(); } catch { toast.error("Export impossible pour le moment."); } }} testid="compte-export" />
          </Rubrique>

          <Rubrique titre="Besoin d'aide">
            <Ligne Icone={LifeBuoy} label="Contacter l'équipe Zayado" onClick={() => window.open("mailto:contact@zayado.net", "_self")} testid="compte-aide" />
          </Rubrique>

          <button onClick={deconnexion} className={`mt-10 inline-flex items-center gap-2 text-[15px] ${c.titre}`} data-testid="compte-deconnexion">Se déconnecter <LogOut size={17} /></button>
          </>)}
        </main>
      </div>
    </div>
  );
}

// Achats faits dans Zayado (services, accompagnements) — remplace l'ancienne page « Mon espace ».
const STATUTS_ACHAT = { paid: ["Payé", "text-emerald-600"], authorized: ["Autorisé", "text-emerald-600"], pending: ["En attente", "text-amber-600"],
  failed: ["Échec", "text-rose-600"], canceled: ["Annulé", "text-rose-600"], expired: ["Expiré", "text-rose-600"] };
function MesAchats({ commandes, c, clair, onRetour }) {
  return (
    <div data-testid="compte-vue-achats">
      <button onClick={onRetour} className={`mb-5 text-[13px] ${c.doux} hover:underline`}>← Mon compte</button>
      <h1 className={`text-[26px] font-bold ${c.titre}`}>Mes services achetés</h1>
      <p className={`mt-1 text-[14px] ${c.doux}`}>Confirmés automatiquement après validation du paiement.</p>
      <div className="mt-6 space-y-3">
        {!commandes.length && <p className={`rounded-xl p-6 text-center text-[14px] ${c.ligne} ${c.doux}`}>Aucun achat pour le moment.</p>}
        {commandes.map((o) => {
          const [libelle, couleur] = STATUTS_ACHAT[o.status] || STATUTS_ACHAT.pending;
          return (
            <div key={o.id} className={`rounded-xl px-5 py-4 ${c.ligne}`}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className={`text-[15px] font-semibold ${c.titre}`}>{o.title || "Commande"}</p>
                  <p className={`mt-0.5 text-[12.5px] ${c.doux}`}>{o.amount} {o.currency} · {o.created_at ? new Date(o.created_at).toLocaleDateString("fr-FR") : ""}</p>
                </div>
                <span className={`text-[12.5px] font-semibold ${clair ? couleur : couleur.replace("600", "300")}`}>{libelle}</span>
              </div>
              {o.status === "paid" && o.access_url && <a href={o.access_url} target="_blank" rel="noreferrer" className={`mt-2 inline-block text-[13px] font-semibold underline ${c.titre}`}>Accéder</a>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
