import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Gauge,
  MoreHorizontal,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";
import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api";
import { Carte, CarteKpi, PastilleIcone, euros } from "@/components/vision/atomes";
import { GraphiqueFinances } from "@/components/vision/graphiques";
import { BarreHaute, OngletsMobile, Rail } from "@/components/vision/chrome";
import { EnTetePage, EtatVide, MotMain } from "@/components/vision/EnTete";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PilotageVue } from "@/types/pilotage";
import { useProfil } from "@/zayado/api";
import type { SupprimeOut } from "@/types/plan";

const CLE = ["pilotage", "vue"] as const;

export default function PilotagePage() {
  const profil = useProfil();
  const qc = useQueryClient();
  const champFichier = useRef<HTMLInputElement>(null);
  const [lecture, setLecture] = useState(false);

  const { data, isError, isLoading } = useQuery({
    queryKey: CLE,
    queryFn: () => apiGet<PilotageVue>("/copilote/pilotage/vue"),
  });

  const rafraichir = () => {
    qc.invalidateQueries({ queryKey: ["pilotage"] });
    qc.invalidateQueries({ queryKey: ["vision"] });
  };

  const importer = useMutation({
    mutationFn: (payload: { nom: string; contenu_b64: string }) =>
      apiPost<PilotageVue>("/copilote/pilotage/imports", payload),
    onSuccess: (vue) => {
      toast.success(`${vue.ecritures_total} écritures lues — tes chiffres sont à jour`);
      rafraichir();
    },
    onError: (e) => {
      const detail = e instanceof ApiError ? (e.body as { detail?: string } | null)?.detail : null;
      toast.error(detail ?? "Import impossible");
    },
  });

  const supprimer = useMutation({
    mutationFn: (id: string) => apiDelete<SupprimeOut>(`/copilote/pilotage/imports/${id}`),
    onSuccess: () => {
      toast("Import retiré — les chiffres sont recalculés");
      rafraichir();
    },
    onError: () => toast.error("Retrait impossible pour le moment."),
  });

  const choisirFichier = (fichier: File) => {
    if (fichier.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop lourd : 10 Mo maximum.");
      return;
    }
    setLecture(true);
    const lecteur = new FileReader();
    lecteur.onload = () => {
      setLecture(false);
      const resultat = String(lecteur.result ?? "");
      importer.mutate({ nom: fichier.name, contenu_b64: resultat.split(",").pop() ?? "" });
    };
    lecteur.onerror = () => {
      setLecture(false);
      toast.error("Lecture du fichier impossible");
    };
    lecteur.readAsDataURL(fichier);
  };

  const pm = data?.point_mort ?? null;
  const vide = Boolean(data && data.imports.length === 0);
  const enCours = lecture || importer.isPending;

  return (
    <div className="zy-root min-h-dvh text-[#eceff7]">
      <Rail />
      <OngletsMobile />

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-28 sm:px-6 lg:pb-12 lg:pl-[120px] lg:pr-8">
        <BarreHaute prenom={profil.data?.prenom ?? ""} offre={profil.data?.offre ?? ""} />

        <EnTetePage
          testId="pilotage"
          titre={<>Tes <MotMain>chiffres</MotMain></>}
          phrase="Combien tu gagnes, combien tu dépenses, et combien de clients il te faut ce mois-ci."
          aide={<>
            <p>Importe l'export de ton logiciel comptable (fichier FEC), un CSV ou un Excel de ta banque. Zayado calcule ton seuil de rentabilité (le « point mort »), ta trésorerie et ton évolution.</p>
            <p>Il en déduit combien de clients il te faut : ce chiffre devient l'objectif de tes prospects. Rien n'est inventé, tout vient de tes écritures.</p>
          </>}
          actions={vide ? undefined : <>
            <button
              type="button"
              onClick={() => champFichier.current?.click()}
              disabled={enCours}
              data-testid="pilotage-importer"
              className="btn-principal"
            >
              <Upload className="size-4" /> {enCours ? "Lecture…" : "Importer mes chiffres"}
            </button>
          </>}
        />
        <input
              ref={champFichier}
              type="file"
              accept=".txt,.csv,.tsv,.xlsx,.xls"
              data-testid="pilotage-champ-fichier"
              className="hidden"
              onChange={(e) => {
                const fichier = e.target.files?.[0];
                if (fichier) choisirFichier(fichier);
                e.target.value = "";
              }}
            />

        {isLoading ? (
          <Carte className="mt-6 p-5" testId="pilotage-chargement">
            <p className="animate-pulse text-sm text-[#a8b6d1]">Chargement de tes chiffres…</p>
          </Carte>
        ) : null}

        {isError ? (
          <Carte className="mt-6 p-5" testId="pilotage-indisponible">
            <p className="text-sm text-[#a8b6d1]">Le Pilotage n'est pas joignable pour le moment.</p>
          </Carte>
        ) : null}

        {vide ? (
          <div className="mt-6">
            <EtatVide
              testId="pilotage-aucun-import"
              icone={<Upload className="size-6" />}
              titre="Tes chiffres apparaîtront ici"
              texte={<>Importe l'export de ton comptable (FEC) ou le <strong>relevé de ta banque</strong> exporté en CSV ou Excel depuis ton espace en ligne (BNP, Crédit Agricole, Société Générale, LCL, Qonto, Shine…) : colonnes <em>Date</em> et <em>Montant</em>, ou <em>Débit</em> / <em>Crédit</em>. Si le relevé a une colonne <em>Solde</em>, ta trésorerie est mise à jour. Aucun identifiant bancaire n'est demandé : seul le fichier est lu.</>}
              action={<button type="button" onClick={() => champFichier.current?.click()} disabled={enCours} className="btn-principal" data-testid="pilotage-importer-vide"><Upload className="size-4" /> Importer mes chiffres</button>}
            />
          </div>
        ) : null}

        {data && !vide ? (
          <>
            {/* Les quatre chiffres du mois le plus récent importé */}
            <section className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" data-testid="pilotage-chiffres">
              <CarteKpi
                label={`Revenus — ${data.mois_courant ?? ""}`}
                valeur={euros(data.revenus_mois)}
                precision={`${data.ecritures_total} écritures lues`}
                icone={<TrendingUp className="size-4" />}
                testId="pilotage-kpi-revenus"
              />
              <CarteKpi
                label="Dépenses du mois"
                valeur={euros(data.depenses_mois)}
                precision={pm ? `dont ${euros(pm.charges_fixes_mensuelles)} de fixes` : undefined}
                icone={<TrendingDown className="size-4" />}
                testId="pilotage-kpi-depenses"
              />
              <CarteKpi
                label="Résultat du mois"
                valeur={euros(data.resultat_mois)}
                precision={data.resultat_mois >= 0 ? "au-dessus de l'équilibre" : "sous l'équilibre"}
                icone={<Scale className="size-4" />}
                testId="pilotage-kpi-resultat"
              />
              <CarteKpi
                label="Trésorerie"
                valeur={euros(data.tresorerie.solde)}
                precision={`${data.tresorerie.autonomie_mois} mois d'autonomie · ${data.tresorerie.source}`}
                icone={<Wallet className="size-4" />}
                testId="pilotage-kpi-tresorerie"
              />
            </section>

            {/* Le point mort : une phrase, un seuil, une barre */}
            {pm ? (
              <Carte haut className="mt-4 p-4 sm:p-5" testId="pilotage-point-mort">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex items-center gap-3">
                    <PastilleIcone>
                      <Gauge className="size-4" />
                    </PastilleIcone>
                    <div>
                      <p className="text-sm font-medium text-[#a8b6d1]">Ton seuil de rentabilité par mois</p>
                      <p className="chiffre text-3xl font-medium" data-testid="pilotage-point-mort-seuil">
                        {pm.seuil_euros !== null ? euros(pm.seuil_euros) : "—"}
                      </p>
                    </div>
                  </div>
                  {pm.clients_necessaires !== null ? (
                    <div className="rounded-xl border border-white/12 bg-white/[0.05] px-4 py-2.5">
                      <p className="text-xs text-[#a8b6d1]">Soit, à ton panier moyen</p>
                      <p className="chiffre text-xl" data-testid="pilotage-point-mort-clients">
                        {pm.clients_necessaires} client{pm.clients_necessaires > 1 ? "s" : ""} ·{" "}
                        {pm.panier_moyen !== null ? euros(pm.panier_moyen) : "—"}
                      </p>
                    </div>
                  ) : null}
                  <div className="ml-auto text-right">
                    <p className="text-xs text-[#a8b6d1]">Ce qu'il te reste sur 100 € vendus</p>
                    <p className="chiffre text-xl">
                      {Math.round(pm.taux_marge_variable * 100)} €
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-[width] duration-700 ${
                        pm.atteint ? "bg-emerald-400" : "bg-[#F4EFE6]"
                      }`}
                      style={{ width: `${pm.pourcentage}%` }}
                      data-testid="pilotage-point-mort-barre"
                    />
                  </div>
                  <p className="mt-2 text-sm text-[#a8b6d1]" data-testid="pilotage-point-mort-phrase">
                    {pm.explication}{" "}
                    {pm.atteint
                      ? "Le mois en cours couvre déjà tes charges."
                      : `Le mois en cours en est à ${pm.pourcentage} %.`}
                  </p>
                </div>
              </Carte>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
              {/* Réutilisé de l'accueil : une seule courbe financière dans l'application */}
              <GraphiqueFinances evolution={data.mois} />

              <Carte className="p-4 sm:p-5" testId="pilotage-colonne-imports">
                <div className="mb-3 flex items-center gap-3">
                  <PastilleIcone>
                    <FileSpreadsheet className="size-4" />
                  </PastilleIcone>
                  <h2 className="titre-serif text-lg">Fichiers importés</h2>
                  <span className="chiffre ml-auto text-sm text-[#a8b6d1]">{data.imports.length}</span>
                </div>
                <ul className="flex flex-col gap-2">
                  {data.imports.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3"
                      data-testid={`pilotage-import-${f.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[#eceff7]">{f.nom}</p>
                        <p className="etiquette mt-1 text-[#9fb0cf]">
                          {f.format} · {f.lignes} lignes · {f.periode_debut} → {f.periode_fin}
                        </p>
                        <p className="chiffre mt-1 text-xs text-[#dec2a3]">
                          {euros(f.revenus)} de revenus · {euros(f.depenses)} de dépenses
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label="Autres choix"
                          data-testid={`pilotage-menu-${f.id}`}
                          className="grid size-8 shrink-0 place-items-center rounded-full text-[#9fb0cf] transition-colors hover:bg-white/10 hover:text-[#eceff7]"
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-52 border-white/10 bg-[#16244a] text-[#eceff7]"
                        >
                          <DropdownMenuItem
                            onClick={() => window.confirm(`Retirer l'import « ${f.nom} » ? Les chiffres seront recalculés sans lui.`) && supprimer.mutate(f.id)}
                            data-testid={`pilotage-supprimer-${f.id}`}
                            className="gap-2 focus:bg-white/10 focus:text-[#eceff7]"
                          >
                            <Trash2 className="size-3.5" /> Retirer cet import
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="surtitre !text-[0.62rem]">Détail par mois</p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {data.mois.map((m) => (
                      <li
                        key={m.cle}
                        className="flex items-center justify-between text-sm"
                        data-testid={`pilotage-mois-${m.cle}`}
                      >
                        <span className="text-[#a8b6d1]">{m.mois}</span>
                        <span className="chiffre text-xs text-[#9fb0cf]">
                          {m.ventes} vente{m.ventes > 1 ? "s" : ""}
                        </span>
                        <span
                          className={`chiffre ${m.resultat >= 0 ? "text-[#dec2a3]" : "text-[#e3a2a2]"}`}
                        >
                          {euros(m.resultat)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Carte>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
