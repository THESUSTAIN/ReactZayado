// Studio Zayado : les outils internes (production de contenus, reprise, tunnels),
// séparés de la console admin de l'application. Réservé aux comptes Microsoft de
// l'organisation (groupe autorisé, sans invités externes) — voir studio/auth_microsoft.py.
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Video, Newspaper, PenLine, MessageSquareQuote, Globe, Images, Briefcase, Handshake, Route, Wallet, Clapperboard } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { SideMenuPro } from "@/zy/components/pro/SideMenuPro";
import { useThemePro } from "@/zy/lib/themePro";
import AdminNewsletters from "@/zy/components/admin/AdminNewsletters";
import AdminArticles from "@/zy/components/admin/AdminArticles";
import AdminTemoignages from "@/zy/components/admin/AdminTemoignages";
import AdminPagesPubliques from "@/zy/components/admin/AdminPagesPubliques";
import CarrouselLoginAdmin from "@/zy/components/admin/CarrouselLoginAdmin";
import { AdminPaiementsTunnels } from "@/zy/components/vendeur/VendeurDokan";
import { AdminTunnels } from "@/pages/zayado/AdminTunnels";
import { AdminPartenaires } from "@/pages/zayado/AdminPartenaires";
import VideosIA from "./VideosIA";

const ONGLETS = [
  { key: "videos-ia", label: "Vidéos IA", groupe: "Production" },
  { key: "newsletters", label: "Newsletters", groupe: "Contenus" },
  { key: "articles", label: "Articles du Journal", groupe: "Contenus" },
  { key: "temoignages", label: "Témoignages", groupe: "Contenus" },
  { key: "pages-pub", label: "Pages & Traductions", groupe: "Contenus" },
  { key: "carrousel", label: "Carrousel login", groupe: "Contenus" },
  { key: "reprise", label: "Acquisition & transmission (clients sous mandat)", groupe: "Reprise & tunnels" },
  { key: "partenaires-financement", label: "Partenaires reprise sans apport", groupe: "Reprise & tunnels" },
  { key: "tunnels-admin", label: "Tunnels : personnaliser (pages & code)", groupe: "Reprise & tunnels" },
  { key: "tunnels-paiements", label: "Tunnels : paiements & commission", groupe: "Reprise & tunnels" },
];
const ICONES = {
  "videos-ia": <Video size={16} />, newsletters: <Newspaper size={16} />, articles: <PenLine size={16} />,
  temoignages: <MessageSquareQuote size={16} />, "pages-pub": <Globe size={16} />, carrousel: <Images size={16} />,
  reprise: <Briefcase size={16} />, "partenaires-financement": <Handshake size={16} />, "tunnels-admin": <Route size={16} />,
  "tunnels-paiements": <Wallet size={16} />,
};

function useAppUrl() {
  const [url, setUrl] = useState("https://app.zayado.net");
  useEffect(() => {
    fetch("/studio-config.json").then((r) => r.json()).then((c) => c.app_url && setUrl(c.app_url)).catch(() => {});
  }, []);
  return url;
}

const REFUS = {
  invite: "Les comptes invités (externes à l'organisation) n'ont pas accès au Studio.",
  groupe: "Votre compte n'est pas dans le groupe autorisé à utiliser le Studio.",
  domaine: "Seules les adresses de l'organisation ont accès au Studio.",
  trop_de_groupes: "Votre compte appartient à trop de groupes pour être vérifié : contactez l'administrateur.",
  expire: "La connexion a pris trop de temps : réessayez.",
};

function Ecran({ titre, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D1F38] px-4 text-offwhite">
      <div className="w-full max-w-md rounded-2xl border border-white/12 bg-white/[0.05] p-6 text-center">
        <img src="/logo-app.png" alt="Zayado" className="mx-auto h-12 w-12 object-contain" />
        <p className="mt-3 text-[11px] uppercase tracking-[.16em] text-[#EADFC0]">Studio Zayado</p>
        <h1 className="mt-2 text-xl font-semibold">{titre}</h1>
        <div className="mt-4 space-y-3 text-sm text-offwhite/75">{children}</div>
      </div>
    </div>
  );
}

function AccesReprise({ appUrl }) {
  // Les dossiers des clients sous mandat vivent dans l'espace « Ton entreprise » de l'application.
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.05] p-5" data-testid="studio-reprise">
      <p className="font-display text-[17px] font-semibold text-offwhite">Acquisition & transmission</p>
      <p className="mt-1 text-[13.5px] text-offwhite/70">Monte les dossiers des clients sous mandat (chiffres, financement, honoraires, étapes, documents), puis partage chaque dossier avec l'e-mail de l'entrepreneur : il le suit dans son espace « Ton entreprise ». Les autres utilisateurs ne voient rien.</p>
      <a href={`${appUrl}/entreprise?vue=reprise`} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-[44px] items-center rounded-2xl bg-gradient-to-br from-[#DEC2A3] to-[#F1E2CC] px-5 text-[14px] font-semibold text-navy-900">Ouvrir les dossiers ↗</a>
    </div>
  );
}

export default function Studio() {
  const appUrl = useAppUrl();
  const [theme] = useThemePro();
  const [etat, setEtat] = useState("verification");
  const refus = new URLSearchParams(window.location.search).get("refus");
  const [onglet, setOnglet] = useState(() => {
    const k = new URLSearchParams(window.location.search).get("onglet");
    return ONGLETS.some((o) => o.key === k) ? k : "videos-ia";
  });

  useEffect(() => {
    fetch("/auth/session", { credentials: "same-origin" })
      .then((r) => setEtat(r.ok ? "ok" : "deconnecte"))
      .catch(() => setEtat("deconnecte"));
  }, []);

  // « Déconnexion » du menu renvoie vers /login : on ferme la session du Studio.
  const { pathname } = useLocation();
  useEffect(() => { if (pathname === "/login") window.location.assign("/auth/logout"); }, [pathname]);

  const changer = (k) => {
    setOnglet(k);
    window.history.replaceState(null, "", `/?onglet=${k}`);
  };

  if (etat === "verification") return <Ecran titre="Vérification de l'accès…" />;
  if (etat === "deconnecte") {
    return (
      <Ecran titre={refus ? "Accès refusé" : "Connexion"}>
        {refus && <p className="rounded-xl bg-red-400/10 px-3 py-2 text-red-200">{REFUS[refus] || "Connexion impossible : réessayez ou contactez l'administrateur."}</p>}
        <p>Le Studio est réservé aux membres de l'organisation, avec leur compte Microsoft professionnel.</p>
        <a href="/auth/microsoft/login" data-testid="studio-connexion"
           className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#F1E2CC] px-5 font-semibold text-[#0D1F38]">
          <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true"><rect width="10" height="10" fill="#F25022"/><rect x="11" width="10" height="10" fill="#7FBA00"/><rect y="11" width="10" height="10" fill="#00A4EF"/><rect x="11" y="11" width="10" height="10" fill="#FFB900"/></svg>
          Se connecter avec Microsoft
        </a>
      </Ecran>
    );
  }

  const items = ONGLETS.map((o) => ({ ...o, icon: ICONES[o.key] }));
  return (
    <div className={`min-h-screen text-offwhite ${theme === "clair" ? "pro-clair pro-cours" : "pro-sombre"}`} data-testid="studio-root">
      <SideMenuPro
        titre="Studio Zayado"
        sousTitre="Contenus, reprise & tunnels"
        items={items}
        actif={onglet}
        onChange={changer}
        iconesGroupes={{ Production: <Clapperboard size={14} />, Contenus: <Newspaper size={14} />, "Reprise & tunnels": <Briefcase size={14} /> }}
        retour={null}
      />
      <div className="min-w-0 px-4 py-5 sm:px-6 lg:ml-[288px] lg:px-10 lg:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-2xl font-bold">{ONGLETS.find((o) => o.key === onglet)?.label}</h1>
          <a href={`${appUrl}/admin`} className="text-xs text-offwhite/60 underline hover:text-offwhite">Console admin de l'application ↗</a>
        </div>
        <div className="mt-6">
          {onglet === "videos-ia" && <VideosIA />}
          {onglet === "newsletters" && <AdminNewsletters />}
          {onglet === "articles" && <AdminArticles />}
          {onglet === "temoignages" && <AdminTemoignages />}
          {onglet === "pages-pub" && <AdminPagesPubliques />}
          {onglet === "carrousel" && <CarrouselLoginAdmin />}
          {onglet === "reprise" && <AccesReprise appUrl={appUrl} />}
          {onglet === "partenaires-financement" && <AdminPartenaires />}
          {onglet === "tunnels-admin" && <AdminTunnels />}
          {onglet === "tunnels-paiements" && <AdminPaiementsTunnels />}
        </div>
      </div>
      <Toaster toastOptions={{ className: "zy-toast" }} />
    </div>
  );
}
