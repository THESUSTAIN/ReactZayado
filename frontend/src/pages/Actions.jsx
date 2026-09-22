import React, { useEffect, useMemo, useState } from "react";
import { Plus, ArrowLeft, ArrowRight, Loader2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import { GlassCard } from "@/components/kairos/GlassCard";
import { fetchTaches, creerTache, majTacheStatut } from "@/lib/kairosApi";

const COLONNES = [
  { key: "a_faire", label: "À faire", accent: "text-gold", dot: "bg-gold" },
  { key: "en_cours", label: "En cours", accent: "text-blue-300", dot: "bg-blue-400" },
  { key: "fait", label: "Terminé", accent: "text-emerald-300", dot: "bg-emerald-400" },
];
const ORDRE = ["a_faire", "en_cours", "fait"];

export default function Actions() {
  const [taches, setTaches] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [titre, setTitre] = useState("");
  const [ajout, setAjout] = useState(false);

  const charger = () => {
    setChargement(true);
    fetchTaches()
      .then((d) => setTaches(d.items || []))
      .catch(() => toast.error("Actions indisponibles"))
      .finally(() => setChargement(false));
  };
  useEffect(charger, []);

  const ajouter = async (e) => {
    e.preventDefault();
    if (!titre.trim()) return;
    setAjout(true);
    try {
      await creerTache(titre.trim());
      setTitre("");
      charger();
      toast.success("Action ajoutée");
    } catch {
      toast.error("Échec de l'ajout");
    } finally {
      setAjout(false);
    }
  };

  const deplacer = async (t, sens) => {
    const cible = ORDRE[ORDRE.indexOf(t.statut) + sens];
    if (!cible) return;
    try {
      await majTacheStatut(t.id, cible);
      charger();
    } catch {
      toast.error("Déplacement impossible");
    }
  };

  const parColonne = useMemo(() => {
    const g = { a_faire: [], en_cours: [], fait: [] };
    taches.forEach((t) => (g[t.statut] || g.a_faire).push(t));
    return g;
  }, [taches]);

  return (
    <div className="min-h-screen" data-testid="actions-page">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:pr-[380px]">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
              <ListChecks size={18} />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold text-offwhite" data-testid="actions-title">Actions</h1>
              <p className="text-xs text-offwhite/55">Ton mouvement de la semaine — une colonne à la fois, en douceur.</p>
            </div>
          </div>

          <form onSubmit={ajouter} className="mb-8 flex gap-2">
            <input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Nouvelle action… (ex. Envoyer la proposition à Nova Studio)"
              data-testid="actions-add-input"
              className="flex-1 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-offwhite placeholder:text-offwhite/35 focus:border-gold/50 focus:outline-none"
            />
            <button type="submit" disabled={ajout} data-testid="actions-add-btn" className="btn-gold">
              {ajout ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Ajouter
            </button>
          </form>

          {chargement ? (
            <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-gold" /></div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {COLONNES.map((col) => (
                <div key={col.key} data-testid={`actions-col-${col.key}`}>
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${col.accent}`}>{col.label}</p>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-offwhite/60">{parColonne[col.key].length}</span>
                  </div>
                  <div className="space-y-3">
                    {parColonne[col.key].map((t) => (
                      <GlassCard key={t.id} className="!p-4" data-testid={`actions-card-${t.id}`}>
                        <p className={`text-sm font-medium leading-snug ${t.statut === "fait" ? "text-offwhite/45 line-through" : "text-offwhite"}`}>
                          {t.titre}
                        </p>
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wide text-offwhite/40">
                            {t.duree_min} min{t.micro ? " · micro" : ""}
                          </span>
                          <div className="flex gap-1.5">
                            {col.key !== "a_faire" && (
                              <button onClick={() => deplacer(t, -1)} data-testid={`actions-move-left-${t.id}`} className="rounded-lg border border-white/12 p-1.5 text-offwhite/55 transition-colors hover:border-gold/40 hover:text-gold" title="Reculer">
                                <ArrowLeft size={13} />
                              </button>
                            )}
                            {col.key !== "fait" && (
                              <button onClick={() => deplacer(t, 1)} data-testid={`actions-move-right-${t.id}`} className="rounded-lg border border-white/12 p-1.5 text-offwhite/55 transition-colors hover:border-gold/40 hover:text-gold" title={col.key === "en_cours" ? "Terminer" : "Avancer"}>
                                <ArrowRight size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </GlassCard>
                    ))}
                    {!parColonne[col.key].length && (
                      <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-offwhite/35">
                        Rien ici pour l'instant
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
