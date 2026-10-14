import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users, Handshake, ChevronRight, Receipt, User, Download, LifeBuoy, LogOut, Loader2, ShoppingBag, Gift, ExternalLink, Crown,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchMoi, fetchAbonnement, fetchMesFilleuls, fetchCommandes, fetchCommandesBoutique, fetchState, telechargerExport, setToken,
} from "@/zy/lib/kairosApi";
import { planNom, PLANS, usePrix } from "@/zy/lib/plans";
import { themeActuel } from "@/zy/lib/theme";
import { Sidebar } from "@/zy/components/kairos/Sidebar";
import { Header } from "@/zy/components/kairos/Header";
import { EnTetePage, MotMain } from "@/components/vision/EnTete";

// Commandes de la boutique (Shopify) : l'espace client de la boutique, jamais ouvert dans le cockpit.
const BOUTIQUE_COMPTE_URL = process.env.REACT_APP_BOUTIQUE_COMPTE_URL || "https://zayado.net/account";

// Paliers de parrainage (affichage) : nombre de filleuls abonnés.
const PALIERS = [[0, "Membre"], [1, "Ambassadeur"], [3, "Ambassadeur Or"], [10, "Partenaire"]];

/* « Mon compte » — refait en v11.
   Une seule question : « où en est mon compte ? » → mon offre, mes achats, mon parrainage.
   Tout ce qui existe déjà ailleurs n'est PLUS ici (avant : 17 boutons, la moitié en double) :
   · ouvrir l'appli, changer d'espace (Entreprise, Admin, vendeur) → barre du haut et rail ;
   · thème clair/sombre, visite guidée → menu de l'avatar ;
   · informations, entreprise, notifications, connexions → Réglages (une seule entrée ici).
   La page porte la même navigation que le reste de l'appli : on n'en « sort » plus. */
export default function MonCompte() {
  usePrix(); // prix saisis dans Admin › Prix
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [d, setD] = useState(null);
  useEffect(() => {
    Promise.allSettled([fetchMoi(), fetchAbonnement(), fetchMesFilleuls(), fetchCommandes(), fetchState(), fetchCommandesBoutique()])
      .then(([moi, abo, fil, cmd, st, cb]) => setD({
        moi: moi.value || {}, abo: abo.value || {}, filleuls: fil.value?.items || [],
        commandes: cmd.value?.items || [], commandesBoutique: cb.value?.items || [],
        prenom: st.value?.profile?.prenom || "",
      }));
  }, []);

  const clair = themeActuel() === "clair";
  const c = { ligne: "ok px-5 py-4", titre: "", doux: "text-[#a8b6d1]" };
  const coque = (contenu) => (
    <div className="min-h-screen" data-testid="mon-compte">
      <Sidebar />
      <div className="lg:pl-[96px]">
        <Header />
        <main className="mx-auto w-full max-w-[1400px] px-4 pb-28 sm:px-6 lg:pb-12 lg:pr-8">{contenu}</main>
      </div>
    </div>
  );
  if (!d) return coque(<div className="flex items-center gap-2 py-16 text-sm text-[#a8b6d1]"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>);

  if (params.get("vue") === "commandes") return coque(<div className="pt-8"><SuiviCommandes commandes={d.commandesBoutique} c={c} clair={clair} onRetour={() => navigate("/compte")} /></div>);
  if (params.get("vue") === "achats") return coque(<div className="pt-8"><MesAchats commandes={d.commandes} c={c} clair={clair} onRetour={() => navigate("/compte")} /></div>);

  const abo = d.abo;
  const actif = abo.acces === "actif";
  const plan = abo.plan;
  const renouv = abo.renouvellement;
  const dateFr = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");
  const visibles = PLANS.filter((p) => !p.masque);
  const idxPlan = visibles.findIndex((p) => p.key === plan);
  const offreSuivante = actif && idxPlan >= 0 ? visibles[idxPlan + 1] || null : null;
  const etatOffre = !actif
    ? "Aucune offre active pour l'instant."
    : abo.en_essai ? `Période d'essai jusqu'au ${dateFr(abo.fin)}.`
    : abo.role_interne ? "Accès complet (équipe Zayado)."
    : renouv?.resilie ? `Résiliée : accès jusqu'au ${dateFr(renouv.date)}.`
    : renouv?.automatique ? `Renouvellement automatique le ${dateFr(renouv.date)}${renouv.montant_ttc ? ` · ${renouv.montant_ttc} € TTC` : ""}.`
    : abo.fin ? `Accès jusqu'au ${dateFr(abo.fin)}.` : "Offre active.";

  const actifs = d.filleuls.filter((f) => f.statut === "actif").length;
  const palier = [...PALIERS].reverse().find(([n]) => actifs >= n);
  const suivant = PALIERS.find(([n]) => n > actifs);
  const nbBoutique = d.commandesBoutique.length;
  const nbServices = d.commandes.length;

  const exporter = async () => { try { await telechargerExport(); toast.success("Export lancé : tes données arrivent en fichier."); } catch { toast.error("Export impossible pour le moment."); } };
  const deconnexion = () => { setToken(null); navigate("/login"); };

  const Ligne = ({ Icone, label, sous, onClick, testid, externe, valeur }) => (
    <button onClick={onClick} data-testid={testid} className="flex min-h-[64px] w-full items-center gap-4 border-t border-white/[0.08] py-3 text-left first:border-t-0 hover:opacity-90">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[#DEC2A3]"><Icone size={18} strokeWidth={1.8} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{label}</span>
        {sous ? <span className="block truncate text-[12.5px] text-[#a8b6d1]">{sous}</span> : null}
      </span>
      {valeur != null ? <span className="chiffre shrink-0 text-[15px] font-semibold">{valeur}</span> : null}
      {externe ? <ExternalLink size={16} className="shrink-0 text-[#a8b6d1]" /> : <ChevronRight size={18} className="shrink-0 text-[#a8b6d1]" />}
    </button>
  );

  return coque(<>
    <EnTetePage testId="compte" titre={<>Mon <MotMain>compte</MotMain></>}
      phrase={<>{d.prenom ? `${d.prenom} · ` : ""}{d.moi.email}</>} />

    <div className="mt-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.25fr_1fr]">
      {/* 1 · Mon offre : où j'en suis, et LE geste utile */}
      <section className="ok p-5 sm:p-6" data-testid="compte-offre">
        <p className="etiquette-carte"><Crown />Mon offre</p>
        <h2 className="titre-carte mt-2">{actif ? <>Offre <MotMain>{planNom(plan)}</MotMain></> : <>Pas encore <MotMain>d'offre</MotMain></>}</h2>
        <p className="mt-1.5 text-sm text-[#a8b6d1]" data-testid="compte-offre-etat">{etatOffre}{abo.fondateur ? " Tarif fondateur garanti." : ""}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {actif ? (
            <>
              <button onClick={() => navigate("/parametres#offre")} className="btn-principal" data-testid="compte-factures">
                <Receipt className="size-4" /> Gérer mon offre et mes factures
              </button>
              {offreSuivante && !abo.role_interne ? (
                <button onClick={() => navigate("/pricing")} className="btn-secondaire" data-testid="compte-upgrade">Passer à {offreSuivante.nom}</button>
              ) : null}
            </>
          ) : (
            <button onClick={() => navigate("/activer")} className="btn-principal" data-testid="compte-activer">Choisir mon offre</button>
          )}
        </div>
      </section>

      {/* 2 · Mon parrainage : un chiffre, un palier, ce que ça rapporte */}
      <section className="ok p-5 sm:p-6" data-testid="compte-fidelite">
        <p className="etiquette-carte"><Gift />Parrainage</p>
        <h2 className="titre-carte mt-2"><span className="chiffre">{actifs}</span> filleul{actifs > 1 ? "s" : ""} · <MotMain>{palier?.[1]}</MotMain></h2>
        <p className="mt-1.5 text-sm text-[#a8b6d1]">1 mois offert pour chaque personne qui s'abonne grâce à toi.</p>
        {suivant ? (
          <>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#F4EFE6]" style={{ width: `${Math.max(6, (actifs / suivant[0]) * 100)}%` }} /></div>
            <p className="mt-1.5 text-xs text-[#a8b6d1]">Plus que {suivant[0] - actifs} pour devenir {suivant[1]}</p>
          </>
        ) : null}
        <button onClick={() => navigate("/parametres#offre")} className="btn-secondaire mt-4" data-testid="compte-inviter"><Users className="size-4" /> Inviter quelqu'un</button>
      </section>

      {/* 3 · Mes achats : boutique et services, avec leur suivi */}
      <section className="ok p-5 sm:p-6" data-testid="compte-achats">
        <p className="etiquette-carte"><ShoppingBag />Mes achats</p>
        <div className="mt-2">
          <Ligne Icone={ShoppingBag} label="Commandes de la boutique" sous={nbBoutique ? "Suivi, colis, statut en direct" : "Objets et box pour entrepreneurs"}
            valeur={nbBoutique || null} onClick={() => (nbBoutique ? navigate("/compte?vue=commandes") : window.open("https://zayado.net/collections/all", "_blank", "noopener"))}
            externe={!nbBoutique} testid="compte-univers-boutique" />
          <Ligne Icone={Handshake} label="Services et accompagnements" sous={nbServices ? "Formations, accompagnements, accès" : "Diagnostic, expert Zayado, reprise d'entreprise"}
            valeur={nbServices || null} onClick={() => navigate(nbServices ? "/compte?vue=achats" : "/app/collaborateurs")} testid="compte-univers-services" />
          {nbBoutique ? <Ligne Icone={Receipt} label="Factures et retours de la boutique" onClick={() => window.open(BOUTIQUE_COMPTE_URL, "_blank", "noopener")} externe testid="compte-boutique-factures" /> : null}
        </div>
      </section>

      {/* 4 · Le reste du compte : une liste courte, sans doublon */}
      <section className="ok p-5 sm:p-6" data-testid="compte-reglages">
        <p className="etiquette-carte"><User />Mon compte</p>
        <div className="mt-2">
          <Ligne Icone={User} label="Mes informations et réglages" sous="Profil, entreprise, notifications, connexions" onClick={() => navigate("/parametres")} testid="compte-infos" />
          <Ligne Icone={Download} label="Télécharger mes données" sous="Tout ce que Zayado garde de toi, en un fichier" onClick={exporter} testid="compte-export" />
          <Ligne Icone={LifeBuoy} label="Écrire à l'équipe Zayado" sous="contact@zayado.net" onClick={() => window.open("mailto:contact@zayado.net", "_self")} testid="compte-aide" />
        </div>
        <button onClick={deconnexion} className="mt-4 inline-flex items-center gap-2 text-sm text-[#f3b4b4] hover:underline" data-testid="compte-deconnexion"><LogOut size={16} /> Se déconnecter</button>
      </section>
    </div>
  </>);
}

// Suivi des commandes de la boutique (Shopify) : statut par commande, rattaché à la boutique vendeuse.
const STATUTS_BOUTIQUE = { en_attente: ["En attente", "text-amber-600"], autorise: ["Paiement autorisé", "text-emerald-600"],
  paye: ["Payé · en préparation", "text-emerald-600"], expedie: ["Expédié", "text-sky-600"],
  annule: ["Annulé", "text-rose-600"], rembourse: ["Remboursé", "text-rose-600"] };
function SuiviCommandes({ commandes, c, clair, onRetour }) {
  return (
    <div data-testid="compte-vue-commandes">
      <button onClick={onRetour} className={`mb-5 text-[13px] ${c.doux} hover:underline`}>← Mon compte</button>
      <h1 className="titre-page">Mes <span className="mot-main">commandes</span></h1>
      <p className={`mt-1 text-[14px] ${c.doux}`}>Le statut se met à jour automatiquement, sans que tu aies à recharger quoi que ce soit.</p>
      <div className="mt-6 space-y-3">
        {!commandes.length && <p className={`rounded-xl p-6 text-center text-[14px] ${c.ligne} ${c.doux}`}>Aucune commande pour le moment.</p>}
        {commandes.map((o) => {
          const [libelle, couleur] = STATUTS_BOUTIQUE[o.statut] || STATUTS_BOUTIQUE.en_attente;
          return (
            <div key={o.id} className={`rounded-xl px-5 py-4 ${c.ligne}`} data-testid="commande-boutique">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className={`text-[15px] font-semibold ${c.titre}`}>Commande {o.commande} · {o.boutique}</p>
                  <p className={`mt-0.5 text-[12.5px] ${c.doux}`}>{o.montant} {o.devise} · {o.passee_le ? new Date(o.passee_le).toLocaleDateString("fr-FR") : ""}</p>
                </div>
                <span className={`text-[12.5px] font-semibold ${clair ? couleur : couleur.replace("600", "300")}`}>{libelle}</span>
              </div>
              {(o.lignes || []).length > 0 && (
                <ul className={`mt-2 space-y-0.5 text-[13px] ${c.doux}`}>{o.lignes.map((l, i) => <li key={i}>{l.quantite} × {l.titre}</li>)}</ul>
              )}
              {(o.suivi || []).map((t, i) => (
                <p key={i} className={`mt-2 text-[13px] ${c.doux}`}>
                  {t.transporteur || "Colis"} {t.numero}{" "}
                  {/^https?:\/\//.test(t.url) && <a href={t.url} target="_blank" rel="noreferrer" className={`font-semibold underline ${c.titre}`}>Suivre le colis</a>}
                </p>
              ))}
            </div>
          );
        })}
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
      <h1 className="titre-page">Mes <span className="mot-main">services</span></h1>
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
