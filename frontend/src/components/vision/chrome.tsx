import { useEffect, useState, type ReactNode } from "react";
import { FeuillePlus, MenuAvatar, RechercheGlobale, SelecteurEspace, useMoi } from "@/components/vision/menus";
import { Header as EnteteZayado } from "@/zy/components/kairos/Header";
import { Link, useLocation } from "react-router-dom";
import {
  Bot,
  Building2,
  CheckSquare,
  Compass,
  HandHeart,
  HeartPulse,
  LayoutDashboard,
  Lock,
  LayoutGrid,
  Settings,
  Shield,
  Target,
  Wallet,
} from "lucide-react";
import { chargerAbonnement, estSalarie } from "@/zy/lib/acces";
import { aDroit, planEffectif } from "@/zy/lib/droits";
import { chargerEspace, enPro, menusPro } from "@/zy/lib/espace";
import { chargerEspaceEntreprise } from "@/zy/lib/sectionsEntreprise";
import { useKairos } from "@/zy/context/KairosContext";

/* ─────────────────────────────────────────────────────────────────────────────
   LA navigation de Zayado — une seule, pour toutes les pages.

   Principes :
   · Mêmes entrées, même ordre, mêmes mots sur ordinateur (rail) et téléphone (barre du bas).
   · Chaque entrée a une icône ET un mot (une icône seule se devine, un mot se lit).
   · 5 cases maximum en bas d'écran : Aujourd'hui · Plan · Clients · Vision · Plus.
   · Ce qui n'est pas dans l'offre reste visible avec un cadenas (on sait que ça existe).
   ───────────────────────────────────────────────────────────────────────────── */

type Abo = Parameters<typeof planEffectif>[0];

export type EntreeNav = {
  cle: string;
  nom: string;
  Icone: typeof LayoutDashboard;
  chemin: string;
  /** Préfixes d'adresse qui allument l'entrée (en plus de son chemin). */
  aussi?: string[];
  /** Module des droits (verrou si l'offre ne l'inclut pas). */
  module?: string;
  /** Clé de l'ancien menu, pour l'espace Pro d'une entreprise. */
  menuPro?: string;
};

const ENTREES: EntreeNav[] = [
  { cle: "today", nom: "Aujourd'hui", Icone: LayoutDashboard, chemin: "/", module: "cockpit", menuPro: "today" },
  { cle: "plan", nom: "Plan", Icone: CheckSquare, chemin: "/plan-action", aussi: ["/app/actions", "/app/processus", "/app/ideas", "/app/sources", "/app/revue"], module: "idees", menuPro: "actions" },
  { cle: "chiffres", nom: "Chiffres", Icone: Wallet, chemin: "/pilotage", module: "cockpit", menuPro: "pilotage" },
  { cle: "clients", nom: "Radar", Icone: Target, chemin: "/radar", aussi: ["/tunnels", "/app/radar"], module: "radar", menuPro: "radar" },
  { cle: "vision", nom: "Vision", Icone: Compass, chemin: "/vision-board", aussi: ["/app/elan", "/app/partager"], module: "vision", menuPro: "vision" },
  { cle: "bienetre", nom: "Bien-être", Icone: HeartPulse, chemin: "/app/bien-etre", module: "bienetre", menuPro: "wellbeing" },
  { cle: "foi", nom: "Ma foi", Icone: HandHeart, chemin: "/app/ma-foi", module: "mafoi", menuPro: "mafoi" },
  { cle: "agents", nom: "Agents", Icone: Bot, chemin: "/app/agents", aussi: ["/app/chatbot-b2b"], module: "agents", menuPro: "agent" },
  { cle: "equipe", nom: "Équipe", Icone: Building2, chemin: "/entreprise" },
  { cle: "admin", nom: "Admin", Icone: Shield, chemin: "/admin" },
];

export const estActif = (e: EntreeNav, pathname: string) =>
  e.chemin === "/" ? pathname === "/" : [e.chemin, ...(e.aussi ?? [])].some((p) => pathname.startsWith(p));

/** Les entrées visibles pour ce compte, et celles verrouillées par l'offre. Une seule règle pour tout l'écran. */
export function useNavigation() {
  const moi = useMoi();
  const { contexte } = useKairos() as { contexte?: { parcours_foi?: boolean } };
  const [abo, setAbo] = useState<Abo | null>(null);
  const [aUneEntreprise, setAUneEntreprise] = useState(false);
  const [menusEntreprise, setMenusEntreprise] = useState<string[] | null>(null);
  useEffect(() => {
    let vivant = true;
    (chargerAbonnement() as Promise<Abo>).then((a) => vivant && setAbo(a)).catch(() => {});
    (chargerEspaceEntreprise() as Promise<{ moi?: { actif?: boolean } } | null>).then((e) => vivant && setAUneEntreprise(Boolean(e?.moi?.actif))).catch(() => {});
    if (enPro()) (chargerEspace() as Promise<{ entreprise?: { modules?: string[] } } | null>).then((e) => vivant && setMenusEntreprise(e?.entreprise ? menusPro(e.entreprise.modules) : null)).catch(() => {});
    return () => { vivant = false; };
  }, []);
  const role = moi.data?.role ?? "client";
  const interne = role === "admin" || role === "vendeur";
  const plan = planEffectif(abo);
  const a = abo as { salarie?: boolean; plan?: string } | null;
  void a; void aUneEntreprise; void interne;

  const visible = (e: EntreeNav) => {
    // Équipe et Admin sont des ESPACES : ils vivent dans le sélecteur d'espace en haut, pas dans le rail.
    if (e.cle === "admin") return false;
    if (estSalarie(abo)) return e.cle === "equipe";
    if (e.cle === "equipe") return false;
    if (menusEntreprise) return Boolean(e.menuPro && menusEntreprise.includes(e.menuPro));
    if (e.cle === "foi") return contexte?.parcours_foi === true;
    // Les agents vivent dans « Plus » (et le menu du compte), sauf dans l'espace Pro.
    if (e.cle === "agents") return false;
    return true;
  };
  const verrouille = (e: EntreeNav) => !menusEntreprise && !!plan && !!e.module && !aDroit(plan, e.module);
  const entrees = ENTREES.filter(visible).map((e) => ({ ...e, verrouille: verrouille(e) }));
  return { entrees, salarieSeul: estSalarie(abo) };
}

/* ───────────── Rail (ordinateur) ───────────── */

const Encoche = ({ position }: { position: "haut" | "bas" }) => (
  <svg
    width="30"
    height="30"
    viewBox="0 0 30 30"
    aria-hidden="true"
    className={`nav-encoche nav-encoche-${position} pointer-events-none absolute left-0 ${
      position === "haut" ? "top-[-30px] -rotate-90" : "bottom-[-30px]"
    }`}
  >
    <path d="M30 0H0V30C0 13.431 13.431 0 30 0Z" />
  </svg>
);

function ItemRail({ e, actif }: { e: EntreeNav & { verrouille: boolean }; actif: boolean }) {
  return (
    <Link
      to={e.chemin}
      data-testid={`nav-${e.cle}`}
      aria-current={actif ? "page" : undefined}
      title={e.verrouille ? `${e.nom} — pas inclus dans ton offre` : e.nom}
      className="nav-rail-item"
    >
      <span className="nav-pastille">
        <e.Icone size={19} strokeWidth={actif ? 2.2 : 1.8} className={e.verrouille ? "opacity-45" : ""} />
        {e.verrouille ? <Lock size={9} className="nav-cadenas" data-testid={`nav-lock-${e.cle}`} /> : null}
      </span>
      <span className="nav-libelle">{e.nom}</span>
    </Link>
  );
}

export function Rail() {
  const { pathname } = useLocation();
  const { entrees } = useNavigation();
  return (
    <aside data-testid="sidebar" className="nav-rail pointer-events-none fixed inset-y-0 left-0 z-40 hidden w-24 flex-col items-center lg:flex">
      <Link to="/" aria-label="Accueil VisionAct" className="pointer-events-auto mt-4 mb-3 flex flex-col items-center gap-1">
        <img src="/logo-app.png" alt="" className="h-11 w-11 object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.3)]" />
        <span className="nav-marque" data-testid="nav-marque">VisionAct</span>
        <span className="nav-marque-sous">par Zayado</span>
      </Link>

      <div className="pointer-events-auto relative flex min-h-0 w-full flex-1 flex-col justify-center py-8">
        <div className="nav-ile relative w-24">
          <Encoche position="haut" />
          <Encoche position="bas" />
          <nav aria-label="Navigation principale" className="nav-ile-defile relative z-10 flex flex-col items-center gap-1">
            {entrees.map((e) => (
              <ItemRail key={e.cle} e={e} actif={estActif(e, pathname)} />
            ))}
          </nav>
        </div>
      </div>

      <Link
        to="/parametres"
        data-testid="nav-settings"
        aria-current={pathname === "/parametres" ? "page" : undefined}
        title="Paramètres"
        className="nav-rail-item nav-rail-reglages pointer-events-auto mb-4"
      >
        <span className="nav-pastille"><Settings size={18} strokeWidth={1.8} /></span>
        <span className="nav-libelle">Réglages</span>
      </Link>
    </aside>
  );
}

/* ───────────── Barre du haut (toutes les pages) ───────────── */

export function BarreHaute({ prenom, offre }: { prenom: string; offre: string }) {
  return (
    <div className="flex items-center gap-2 pt-4 sm:gap-3" data-testid="barre-haute">
      <Link to="/" aria-label="Accueil VisionAct" className="shrink-0 lg:hidden">
        <img src="/logo-app.png" alt="" className="h-9 w-9 object-contain" />
      </Link>
      <RechercheGlobale />
      <SelecteurEspace className="ml-auto hidden md:inline-flex" />
      {/* Check-in, chat et cloche : les mêmes partout. */}
      <EnteteZayado variante="actions" />
      <MenuAvatar prenom={prenom} offre={offre} />
    </div>
  );
}

/* ───────────── Barre du bas (téléphone) ───────────── */

const CLES_BAS = ["today", "plan", "clients", "vision"];

/** Barre du bas. `reserverEspace` : ajoute la marge sous les pages qui ne la prévoient pas. */
export function OngletsMobile({ reserverEspace = false }: { reserverEspace?: boolean }) {
  const { pathname } = useLocation();
  const { entrees, salarieSeul } = useNavigation();
  const [plus, setPlus] = useState(false);
  useEffect(() => setPlus(false), [pathname]);
  useEffect(() => {
    if (!reserverEspace) return undefined;
    // Compteur : plusieurs barres peuvent être montées (page + chat plein écran).
    const b = document.body;
    b.dataset.navBas = String(Number(b.dataset.navBas || 0) + 1);
    b.classList.add("avec-nav-bas");
    return () => {
      const n = Number(b.dataset.navBas || 1) - 1;
      b.dataset.navBas = String(n);
      if (n <= 0) b.classList.remove("avec-nav-bas");
    };
  }, [reserverEspace]);

  const principales = salarieSeul ? entrees : CLES_BAS.map((c) => entrees.find((e) => e.cle === c)).filter(Boolean) as typeof entrees;
  const plusActif = !principales.some((e) => estActif(e, pathname));

  const contenu = (icone: ReactNode, nom: string) => (
    <>
      <span className="nav-pastille">{icone}</span>
      <span className="nav-libelle">{nom}</span>
    </>
  );

  return (
    <nav aria-label="Navigation principale" data-testid="bottomnav" className="nav-bas fixed inset-x-0 bottom-0 z-50 lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {principales.map((e) => {
          const actif = estActif(e, pathname);
          return (
            <Link key={e.cle} to={e.chemin} data-testid={`bottomnav-${e.cle}`} aria-current={actif ? "page" : undefined} className="nav-bas-item">
              {contenu(
                <>
                  <e.Icone className={`size-5 ${e.verrouille ? "opacity-45" : ""}`} strokeWidth={actif ? 2.2 : 1.8} />
                  {e.verrouille ? <Lock size={9} className="nav-cadenas" /> : null}
                </>,
                e.nom,
              )}
            </Link>
          );
        })}
        <button
          type="button"
          data-testid="bottomnav-plus"
          onClick={() => setPlus(true)}
          aria-label="Ouvrir le menu : toutes les pages"
          aria-expanded={plus}
          aria-current={plusActif || plus ? "page" : undefined}
          className="nav-bas-item"
        >
          {contenu(<LayoutGrid className="size-5" strokeWidth={plusActif || plus ? 2.2 : 1.8} />, "Menu")}
        </button>
      </div>
      <FeuillePlus ouverte={plus} onFermer={() => setPlus(false)} exclure={principales.map((e) => e.chemin)} />
    </nav>
  );
}

/* ───────────── Sélecteur « Radar » : Prospects ⇄ Tunnels ───────────── */

/** Les deux faces de « Radar » : trouver des prospects (Radar) et les convertir (Tunnels). */
export function OngletsClients() {
  const { pathname } = useLocation();
  const onglets = [
    { chemin: "/radar", nom: "Prospects" },
    { chemin: "/tunnels", nom: "Tunnels de vente" },
  ];
  return (
    <div role="tablist" aria-label="Radar" className="segment" data-testid="onglets-clients">
      {onglets.map((o) => {
        const actif = pathname.startsWith(o.chemin);
        return (
          <Link key={o.chemin} to={o.chemin} role="tab" aria-selected={actif} className="segment-item" data-testid={`onglet-clients-${o.chemin.slice(1)}`}>
            {o.nom}
          </Link>
        );
      })}
    </div>
  );
}
