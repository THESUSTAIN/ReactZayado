import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bot, BookOpen, CalendarCheck, CreditCard, FileText, HandHeart, HeartPulse, Home,
  LogOut, MessageSquare, Search, Settings, Shield, Store, User, Users, Building2,
  CheckSquare, Compass, Filter, Radar, Wallet, Stethoscope, Moon, Sun, HelpCircle, Lock, ChevronRight, X, Star, Eye, EyeOff,
} from "lucide-react";
import { apercuPlan, setApercuPlan, NOMS_OFFRES } from "@/zy/lib/droits";
import { startTour } from "@/zy/components/kairos/GuidedTour";
import { chargerAbonnement } from "@/zy/lib/acces";
import { appliquerTheme } from "@/zy/lib/theme";
import { chargerEspaceEntreprise } from "@/zy/lib/sectionsEntreprise";
import { apiGet, TOKEN_KEY } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/* Toutes les pages de l'espace privé, en un seul endroit : menu de l'avatar, feuille
   « Plus » sur mobile et barre de recherche s'en servent. Rien n'est caché derrière une adresse à taper. */

export type Moi = { mode: string; email: string | null; role: string };

export function useMoi() {
  return useQuery({ queryKey: ["auth-me"], queryFn: () => apiGet<Moi>("/auth/me"), staleTime: 5 * 60_000, retry: false });
}

export function deconnecter() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* stockage indisponible */ }
  queryClient.clear();
  window.location.assign("/login");
}

type Lien = { nom: string; chemin: string; Icone: typeof Home; groupe: string; mots?: string; roles?: string[] };

export const PAGES: Lien[] = [
  { nom: "Aujourd'hui", chemin: "/", Icone: Home, groupe: "Piloter", mots: "accueil aujourd'hui cockpit tableau de bord" },
  { nom: "Plan d'action", chemin: "/plan-action", Icone: CheckSquare, groupe: "Piloter", mots: "plan actions tâches objectifs processus" },
  { nom: "Chiffres", chemin: "/pilotage", Icone: Wallet, groupe: "Piloter", mots: "pilotage finances trésorerie point mort fec csv chiffres ca" },
  { nom: "Revue de la semaine", chemin: "/app/revue", Icone: CalendarCheck, groupe: "Piloter", mots: "bilan hebdo revue semaine" },
  { nom: "Prospects", chemin: "/radar", Icone: Radar, groupe: "Radar", mots: "radar prospects clients signaux bodacc relances" },
  { nom: "Tunnels de vente", chemin: "/tunnels", Icone: Filter, groupe: "Radar", mots: "tunnel vente page capture offre" },
  { nom: "Vision & Élan", chemin: "/vision-board", Icone: Compass, groupe: "Avancer", mots: "vision board rêves images élan idées lettres mur roue" },
  { nom: "Transformer mes notes", chemin: "/app/sources", Icone: FileText, groupe: "Avancer", mots: "sources notes compte rendu texte importer" },
  { nom: "Bien-être", chemin: "/app/bien-etre", Icone: HeartPulse, groupe: "Prendre soin", mots: "énergie humeur check-in carnet corps routines" },
  { nom: "Ma foi", chemin: "/app/ma-foi", Icone: HandHeart, groupe: "Prendre soin", mots: "foi prière verset thesustain âme esprit" },
  { nom: "Agents IA", chemin: "/app/agents", Icone: Bot, groupe: "Se faire aider", mots: "agents ia missions canaux whatsapp telegram" },
  { nom: "Mon chatbot client", chemin: "/app/chatbot-b2b", Icone: MessageSquare, groupe: "Se faire aider", mots: "chatbot agent business marque clients" },
  { nom: "Se faire accompagner", chemin: "/app/collaborateurs", Icone: Users, groupe: "Se faire aider", mots: "collaborateurs aide accompagnement demande service" },
  { nom: "Programmes", chemin: "/programmes", Icone: BookOpen, groupe: "Se faire aider", mots: "programmes formation accompagnement" },
  { nom: "Diagnostic d'équilibre", chemin: "/app/diagnostic", Icone: Stethoscope, groupe: "Se faire aider", mots: "diagnostic équilibre test" },
  { nom: "Équipe", chemin: "/entreprise", Icone: Building2, groupe: "Équipe", mots: "entreprise équipe planning absences salariés" },
  { nom: "Mon compte", chemin: "/compte", Icone: User, groupe: "Compte", mots: "compte commandes achats parrainage factures" },
  { nom: "Réglages", chemin: "/parametres", Icone: Settings, groupe: "Compte", mots: "paramètres réglages connexions abonnement résilier données notifications" },
  { nom: "Offres et tarifs", chemin: "/pricing", Icone: CreditCard, groupe: "Compte", mots: "tarifs prix offre abonnement solo pro" },
  { nom: "Espace vendeur", chemin: "/espace-vendeur", Icone: Store, groupe: "Compte", mots: "vendeur produits boutique box", roles: ["vendeur", "admin"] },
  { nom: "Console admin", chemin: "/admin", Icone: Shield, groupe: "Compte", mots: "admin console", roles: ["admin"] },
];

function usePagesVisibles() {
  const moi = useMoi();
  const role = moi.data?.role ?? "client";
  return PAGES.filter((p) => !p.roles || p.roles.includes(role));
}

const normaliser = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Thème clair / sombre : une seule bascule, mémorisée sur l'appareil. */
export function useTheme() {
  const [clair, setClair] = useState(() => typeof document !== "undefined" && document.body.classList.contains("theme-clair"));
  const basculer = () => {
    const v = !clair;
    appliquerTheme(v ? "clair" : "sombre", { sauver: true });
    setClair(v);
  };
  return { clair, basculer };
}

/** Menu du compte (avatar) : court et prévisible — compte, réglages, thème, visite, (admin), déconnexion.
    Les outils du cockpit sont dans la navigation, pas ici (pas de doublon). */
export function MenuAvatar({ prenom, offre }: { prenom: string; offre: string }) {
  const navigate = useNavigate();
  const moi = useMoi();
  const { clair, basculer } = useTheme();
  const admin = moi.data?.role === "admin";
  const apercu = apercuPlan();
  const item = "gap-2.5 py-2 focus:bg-white/10 focus:text-[#eceff7]";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Mon compte"
        data-testid="profil-utilisateur"
        className="flex shrink-0 items-center gap-2 rounded-full p-0.5 outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#F4EFE6]"
      >
        <span className="avatar-rond flex size-9 items-center justify-center rounded-full text-sm font-semibold">
          {(prenom || "Z").slice(0, 1).toUpperCase()}
        </span>
        {admin && apercu ? (
          <span className="hidden rounded-full border border-[#F4EFE6]/40 px-2 py-0.5 text-[10.5px] font-semibold text-[#F4EFE6] sm:inline" data-testid="apercu-banniere">
            Aperçu {NOMS_OFFRES[apercu as keyof typeof NOMS_OFFRES] ?? apercu}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="menu-compte max-h-[80vh] w-72 overflow-y-auto border-white/10 bg-[#16244a] p-1.5 text-[#eceff7]">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-2">
            <span className="block text-sm font-semibold">{prenom || "Mon espace"}</span>
            <span className="block truncate text-xs font-normal text-[#9fb0cf]">{moi.data?.email}{offre ? ` · offre ${offre}` : ""}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem onClick={() => navigate("/compte")} className={item} data-testid="profile-compte"><User className="size-4 text-[#9fb0cf]" /> Mon compte</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/parametres")} className={item} data-testid="profile-settings"><Settings className="size-4 text-[#9fb0cf]" /> Réglages</DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.preventDefault(); basculer(); }} className={item} data-testid="header-darkmode">
          {clair ? <Moon className="size-4 text-[#9fb0cf]" /> : <Sun className="size-4 text-[#9fb0cf]" />} {clair ? "Passer en sombre" : "Passer en clair"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => startTour()} className={item} data-testid="profile-tour"><HelpCircle className="size-4 text-[#9fb0cf]" /> Visite guidée</DropdownMenuItem>
        {admin ? (
          <>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem onClick={() => navigate("/admin")} className={item} data-testid="header-admin"><Shield className="size-4 text-[#9fb0cf]" /> Console admin</DropdownMenuItem>
            <div className="px-2 py-1.5" data-testid="apercu-offre" onKeyDown={(e) => e.stopPropagation()}>
              <p className="pb-1 text-[11px] text-[#9fb0cf]">Voir l'app comme</p>
              <select
                value={apercu || ""}
                onChange={(e) => { setApercuPlan(e.target.value || null); window.location.reload(); }}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-[#eceff7]"
                data-testid="apercu-offre-select"
              >
                <option value="" className="text-[#0f1b3a]">Mon accès admin (tout)</option>
                {["reveur", "serenite", "pro", "business", "entreprise"].map((k) => (
                  <option key={k} value={k} className="text-[#0f1b3a]">Offre {NOMS_OFFRES[k as keyof typeof NOMS_OFFRES]}</option>
                ))}
              </select>
            </div>
          </>
        ) : null}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem onClick={deconnecter} data-testid="menu-deconnexion" className="gap-2.5 py-2 text-[#f3b4b4] focus:bg-white/10 focus:text-[#f8caca]">
          <LogOut className="size-4" /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const CLE_FAVORIS = "zy-menu-favoris";
const MAX_FAVORIS = 3;
const CLE_MASQUEES = "zy-menu-masquees";
const lireMasquees = (): string[] => { try { return JSON.parse(localStorage.getItem(CLE_MASQUEES) || "[]"); } catch { return []; } };
const lireFavoris = (): string[] => { try { return JSON.parse(localStorage.getItem(CLE_FAVORIS) || "[]").slice(0, MAX_FAVORIS); } catch { return []; } };

/** Feuille « Menu » (mobile) : toutes les pages, regroupées en listes, recherche, thème et déconnexion. */
export function FeuillePlus({ ouverte, onFermer, exclure = [] }: { ouverte: boolean; onFermer: () => void; exclure?: string[] }) {
  const { pathname } = useLocation();
  const pages = usePagesVisibles().filter((p) => !exclure.includes(p.chemin) && p.groupe !== "Compte");
  const moi = useMoi();
  const [q, setQ] = useState("");
  const [edition, setEdition] = useState(false);
  const [favoris, setFavoris] = useState<string[]>(lireFavoris);
  const [masquees, setMasquees] = useState<string[]>(lireMasquees);
  const ecrireMasquees = (n: string[]) => { setMasquees(n); try { localStorage.setItem(CLE_MASQUEES, JSON.stringify(n)); } catch { /* stockage indisponible */ } };
  const basculerMasquee = (chemin: string) => ecrireMasquees(masquees.includes(chemin) ? masquees.filter((x) => x !== chemin) : [...masquees, chemin]);
  useEffect(() => { if (!ouverte) { setQ(""); setEdition(false); } }, [ouverte]);
  const basculerFavori = (chemin: string) => setFavoris((f) => {
    const n = f.includes(chemin) ? f.filter((x) => x !== chemin) : f.length >= MAX_FAVORIS ? f : [...f, chemin];
    if (n === f && !f.includes(chemin)) toast.info(`${MAX_FAVORIS} favoris maximum : retire-en un d'abord.`);
    try { localStorage.setItem(CLE_FAVORIS, JSON.stringify(n)); } catch { /* stockage indisponible */ }
    return n;
  });
  const toutes = usePagesVisibles();
  const pagesFavorites = favoris.map((c) => toutes.find((p) => p.chemin === c)).filter(Boolean) as Lien[];
  // Glisser vers le bas (poignée / en-tête) pour fermer, comme une app native.
  const glisse = useRef<{ y: number; el: HTMLElement | null; dy: number } | null>(null);
  const debut = (e: React.PointerEvent) => {
    glisse.current = { y: e.clientY, el: (e.currentTarget as HTMLElement).closest(".fp-feuille"), dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const bouge = (e: React.PointerEvent) => {
    const g = glisse.current; if (!g?.el) return;
    g.dy = Math.max(0, e.clientY - g.y);
    g.el.style.transition = "none"; g.el.style.transform = `translateY(${g.dy}px)`;
  };
  const fin = () => {
    const g = glisse.current; glisse.current = null; if (!g?.el) return;
    g.el.style.transition = "transform .22s cubic-bezier(.2,.8,.2,1)";
    if (g.dy > 110) { g.el.style.transform = "translateY(100%)"; setTimeout(onFermer, 180); }
    else g.el.style.transform = "";
  };
  const groupes = useMemo(() => {
    const t = normaliser(q.trim());
    const m = new Map<string, Lien[]>();
    // Pages masquées : cachées du menu (sauf en mode « Modifier » et dans la recherche, pour les retrouver).
    pages.filter((p) => (t ? normaliser(`${p.nom} ${p.mots ?? ""} ${p.groupe}`).includes(t) : edition || !masquees.includes(p.chemin)))
      .forEach((p) => m.set(p.groupe, [...(m.get(p.groupe) ?? []), p]));
    return [...m.entries()];
  }, [pages, q, edition, masquees]);
  return (
    <Sheet open={ouverte} onOpenChange={(o) => !o && onFermer()}>
      <SheetContent side="bottom" showCloseButton={false} className="fp-feuille" data-testid="feuille-plus">
        <div className="fp-glisse" onPointerDown={debut} onPointerMove={bouge} onPointerUp={fin} onPointerCancel={fin} data-testid="plus-poignee">
        <div className="fp-poignee" aria-hidden />
        <div className="fp-tete">
          <SheetHeader className="p-0">
            <SheetTitle className="fp-titre">Menu</SheetTitle>
            <p className="fp-sous">Toutes tes pages VisionAct</p>
          </SheetHeader>
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={onFermer} aria-label="Fermer le menu" className="fp-fermer" data-testid="plus-fermer"><X className="size-[18px]" /></button>
        </div>
        </div>
        <div className="fp-corps">
          <label className="fp-recherche">
            <Search className="size-4 shrink-0 opacity-60" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une page" aria-label="Rechercher une page" data-testid="plus-recherche" />
          </label>
          {!q ? (
            <Link to="/compte" onClick={onFermer} className="fp-compte" data-testid="plus-mon-compte">
              <span className="avatar-rond flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">{(moi.data?.email || "Z").slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">Mon compte</span>
                <span className="block truncate text-xs opacity-65">Commandes, services, offre, réglages, déconnexion</span>
              </span>
              <ChevronRight className="fp-chevron size-4" />
            </Link>
          ) : null}
          {!q ? <SelecteurEspace className="fp-espace flex w-full justify-between [&>a]:flex-1 [&>a]:justify-center" /> : null}
          {!q ? (
            <section className="fp-section" data-testid="plus-favoris">
              <div className="flex items-center justify-between">
                <h3 className="fp-groupe-titre">Favoris</h3>
                <button type="button" onClick={() => setEdition(!edition)} className="fp-lien" data-testid="plus-favoris-modifier">{edition ? "Terminé" : "Modifier"}</button>
              </div>
              {pagesFavorites.length ? (
                <div className="fp-favoris">
                  {pagesFavorites.map((p) => (
                    <Link key={p.chemin} to={p.chemin} onClick={onFermer} className="fp-favori" data-testid={`plus-favori-${p.chemin.replace(/\W+/g, "-")}`}>
                      <span className="fp-icone"><p.Icone className="size-[18px]" strokeWidth={1.9} /></span>
                      <span className="fp-favori-nom">{p.nom}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="fp-astuce" data-testid="plus-favoris-vide">{edition ? "Étoile : épingler (3 maximum). Œil : masquer une page que tu n'utilises pas." : "Épingle tes 3 pages préférées et masque celles que tu n'utilises pas : touche « Modifier »."}</p>
              )}
            </section>
          ) : null}
          {groupes.map(([g, liens]) => (
            <section key={g} className="fp-section">
              <h3 className="fp-groupe-titre">{g}</h3>
              <ul className="fp-liste">
                {liens.map((p) => {
                  const actif = pathname === p.chemin || (p.chemin !== "/" && pathname.startsWith(p.chemin));
                  return (
                    <li key={p.chemin}>
                      {edition ? (
                        <div className={`fp-ligne ${masquees.includes(p.chemin) ? "fp-ligne-masquee" : ""}`}>
                          <span className="fp-icone"><p.Icone className="size-[18px]" strokeWidth={1.9} /></span>
                          <span className="fp-nom">{p.nom}</span>
                          <button type="button" onClick={() => basculerFavori(p.chemin)} aria-pressed={favoris.includes(p.chemin)} aria-label={`Épingler ${p.nom}`} className="fp-action"
                            data-testid={`plus-epingler-${p.chemin.replace(/\W+/g, "-")}`}>
                            <Star className={`size-[18px] ${favoris.includes(p.chemin) ? "fill-[#DEC2A3] text-[#DEC2A3]" : "opacity-45"}`} />
                          </button>
                          <button type="button" onClick={() => basculerMasquee(p.chemin)} aria-pressed={masquees.includes(p.chemin)} aria-label={masquees.includes(p.chemin) ? `Afficher ${p.nom}` : `Masquer ${p.nom}`} className="fp-action"
                            data-testid={`plus-masquer-${p.chemin.replace(/\W+/g, "-")}`}>
                            {masquees.includes(p.chemin) ? <EyeOff className="size-[18px] text-[#F6B2B2]" /> : <Eye className="size-[18px] opacity-45" />}
                          </button>
                        </div>
                      ) : (
                        <Link to={p.chemin} onClick={onFermer} aria-current={actif ? "page" : undefined} className="fp-ligne"
                          data-testid={`plus-${p.chemin.replace(/\W+/g, "-")}`}>
                          <span className="fp-icone"><p.Icone className="size-[18px]" strokeWidth={1.9} /></span>
                          <span className="fp-nom">{p.nom}</span>
                          <ChevronRight className="fp-chevron size-4" />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {!groupes.length ? <p className="fp-vide" data-testid="plus-aucun">Aucune page pour « {q} ».</p> : null}
          {!q && !edition && masquees.length ? (
            <button type="button" onClick={() => ecrireMasquees([])} className="fp-masquees" data-testid="plus-masquees-tout-afficher">
              {masquees.length} page{masquees.length > 1 ? "s" : ""} masquée{masquees.length > 1 ? "s" : ""} · Tout afficher
            </button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Recherche de la barre du haut : trouve une page par son nom ou un mot-clé (⌘K / Ctrl+K pour y aller). */
export function RechercheGlobale() {
  const pages = usePagesVisibles();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); champ.current?.focus(); }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  const resultats = useMemo(() => {
    const t = normaliser(q.trim());
    if (!t) return [];
    return pages.filter((p) => normaliser(`${p.nom} ${p.mots ?? ""}`).includes(t)).slice(0, 7);
  }, [q, pages]);
  const aller = (chemin: string) => { setQ(""); setOuvert(false); champ.current?.blur(); navigate(chemin); };
  return (
    <div className={`verre verre-haut recherche relative flex min-w-0 items-center gap-2 rounded-full px-3 py-2 transition-[width,flex] duration-200 sm:px-4 ${ouvert || q ? "flex-1 sm:w-[420px] sm:flex-none" : "flex-none sm:w-[260px] xl:w-[300px]"}`}>
      <button type="button" onClick={() => { setOuvert(true); setTimeout(() => champ.current?.focus(), 0); }} aria-label="Rechercher" className="shrink-0" data-testid="recherche-loupe">
        <Search className="size-4 text-[#9fb0cf]" />
      </button>
      <input
        ref={champ}
        type="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOuvert(true); }}
        onFocus={() => setOuvert(true)}
        onBlur={() => setTimeout(() => setOuvert(false), 150)}
        onKeyDown={(e) => { if (e.key === "Enter" && resultats[0]) aller(resultats[0].chemin); if (e.key === "Escape") setQ(""); }}
        placeholder="Rechercher…"
        aria-label="Rechercher dans Zayado"
        data-testid="champ-recherche"
        className={`min-w-0 flex-1 bg-transparent text-sm text-[#eceff7] outline-none placeholder:text-[#9fb0cf] ${ouvert || q ? "block" : "hidden sm:block"}`}
      />
      <kbd className="chiffre hidden rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[0.65rem] text-[#a8b6d1] sm:block">⌘K</kbd>
      {ouvert && q.trim() ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#16244a] shadow-2xl" data-testid="recherche-resultats">
          {resultats.length ? resultats.map((p) => (
            <button key={p.chemin} type="button" onMouseDown={(e) => { e.preventDefault(); aller(p.chemin); }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#eceff7] hover:bg-white/10">
              <p.Icone className="size-4 text-[#dec2a3]" /> {p.nom}
              <span className="ml-auto text-[11px] text-[#9fb0cf]">{p.groupe}</span>
            </button>
          )) : <p className="px-4 py-3 text-sm text-[#9fb0cf]">Aucune page ne correspond.</p>}
        </div>
      ) : null}
    </div>
  );
}

/** Les espaces de Zayado, toujours visibles en haut : Mon espace · Entreprise · Admin.
    « Entreprise » reste visible pour tous (cadenas si l'offre ne l'inclut pas) : on sait que ça existe. */
export function useEspaces() {
  const moi = useMoi();
  const { pathname } = useLocation();
  const [eligible, setEligible] = useState(false);
  useEffect(() => {
    let vivant = true;
    (chargerAbonnement() as Promise<{ salarie?: boolean; plan?: string } | null>)
      .then((a) => vivant && a && (a.salarie || ["business", "entreprise"].includes(a.plan ?? "")) && setEligible(true)).catch(() => {});
    (chargerEspaceEntreprise() as Promise<{ moi?: { actif?: boolean } } | null>)
      .then((e) => vivant && e?.moi?.actif && setEligible(true)).catch(() => {});
    return () => { vivant = false; };
  }, []);
  const role = moi.data?.role;
  const admin = role === "admin";
  const espaces = [
    { cle: "perso", nom: "Mon espace", chemin: "/", actif: !pathname.startsWith("/entreprise") && !pathname.startsWith("/admin"), Icone: User, verrou: false },
    { cle: "entreprise", nom: "Entreprise", chemin: "/entreprise", actif: pathname.startsWith("/entreprise"), Icone: Building2, verrou: !(eligible || admin || role === "vendeur") },
    ...(admin ? [{ cle: "admin", nom: "Admin", chemin: "/admin", actif: pathname.startsWith("/admin"), Icone: Shield, verrou: false }] : []),
  ];
  return espaces;
}

export function SelecteurEspace({ className = "" }: { className?: string }) {
  const espaces = useEspaces();
  return (
    <nav aria-label="Changer d'espace" className={`espaces ${className || "inline-flex"}`} data-testid="selecteur-espace">
      {espaces.map((e) => (
        <Link key={e.cle} to={e.chemin} aria-current={e.actif ? "page" : undefined} className="espace-item" data-testid={`espace-${e.cle}`}
          title={e.verrou ? "Inclus dans les offres Équipe et Entreprise" : e.nom}>
          <e.Icone className="size-4" /> {e.nom}
          {e.verrou ? <Lock className="size-3 opacity-60" /> : null}
        </Link>
      ))}
    </nav>
  );
}
