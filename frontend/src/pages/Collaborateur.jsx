import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import { ArrowRight, Map, ShieldCheck, Send, Loader2, MessageSquare, Clock, CheckCircle2, CircleDot } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { envoyerDemandeCollaborateur, fetchMesDemandes, fetchMoi } from "@/lib/kairosApi";

const STATUTS = {
  nouvelle: { label: "Envoyée", Icone: Clock, cls: "bg-white/10 text-offwhite/70" },
  en_cours: { label: "En cours", Icone: CircleDot, cls: "bg-gold/15 text-gold" },
  traitee: { label: "Traitée", Icone: CheckCircle2, cls: "bg-emerald-400/15 text-emerald-300" },
};

const NIVEAUX = [
  { value: "avec", label: "Faire avec moi", desc: "On avance ensemble sur ta demande" },
  { value: "analyser", label: "Analyser avec moi", desc: "On regarde ensemble ce qui bloque" },
  { value: "preparer", label: "Préparer pour moi", desc: "On te livre un livrable, tu valides" },
  { value: "executer", label: "Exécuter après validation", desc: "On exécute une fois que tu dis OK" },
];

export default function Collaborateur() {
  const [message, setMessage] = useState("");
  const [niveau, setNiveau] = useState("avec");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [demandes, setDemandes] = useState(null);
  const navigate = useNavigate();
  const chargerDemandes = () => fetchMesDemandes().then((d) => setDemandes(d.demandes || [])).catch(() => setDemandes([]));
  useEffect(() => {
    chargerDemandes();
    // E-mail du compte proposé d'office (modifiable).
    fetchMoi().then((m) => { if (m?.email) setContact((c) => c || m.email); }).catch(() => {});
  }, []);

  const submit = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      // Avec le jeton de session (avant : fetch sans en-tête → demande rattachée au compte démo).
      await envoyerDemandeCollaborateur({ message: `[${NIVEAUX.find((n) => n.value === niveau)?.label}] ${message.trim()}`, contact, channel: "collaborateur" });
      setSent(true);
      setMessage("");
      chargerDemandes();
      toast.success("Demande envoyée à l'équipe Zayado. Tu suivras la réponse ici.");
    } catch {
      // Corrigé : affichait « envoyée » même quand rien n'était enregistré.
      toast.error("La demande n'a pas pu être envoyée. Réessaie dans un instant.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header title="Collaborateurs" subtitle="Une personne de l'équipe Zayado avec toi." />

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <section className="mb-6">
            <p className="font-serif-italic italic text-[26px] leading-tight text-white sm:text-[32px]">« Ne porte pas tout seul. »</p>
            <p className="mt-2 max-w-2xl text-[14.5px] text-offwhite/60">
              Demande à une personne du réseau Zayado de clarifier, construire, analyser ou préparer avec toi. Tu gardes toujours la validation finale.
            </p>
          </section>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="glass rounded-2xl p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold"><MessageSquare size={17} className="text-navy-900" /></span>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-gold">Demande structurée</span>
              </div>
              <h2 className="font-display text-lg font-semibold text-white">De quoi as-tu besoin ?</h2>

              <label className="mt-4 block text-xs text-offwhite/60">Ton besoin</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
                placeholder="Ex. analyser mon offre, préparer une prospection, clarifier une priorité…"
                className="mt-1 w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-gold focus:outline-none" />

              <label className="mt-4 block text-xs text-offwhite/60">Niveau d'aide</label>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                {NIVEAUX.map((n) => (
                  <button key={n.value} onClick={() => setNiveau(n.value)}
                    className={`rounded-xl border p-3 text-left transition ${niveau === n.value ? "border-gold bg-gold/10" : "border-white/12 bg-white/[0.04] hover:border-gold/40"}`}>
                    <div className="text-[13px] font-semibold text-white">{n.label}</div>
                    <div className="text-[11.5px] text-offwhite/55">{n.desc}</div>
                  </button>
                ))}
              </div>

              <label className="mt-4 block text-xs text-offwhite/60">E-mail pour te répondre</label>
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="toi@exemple.fr"
                className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-gold focus:outline-none" />

              <button onClick={submit} disabled={sending || !message.trim()}
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-navy-900 disabled:opacity-50" data-testid="collab-envoyer">
                {sending ? <><Loader2 size={15} className="animate-spin" /> Envoi…</> : <>{sent ? "Envoyer une autre demande" : "Valider ma demande"} <Send size={14} /></>}
              </button>
            </div>

            <div className="space-y-4">
              <div className="glass rounded-2xl p-6">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-gold" />
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gold">Transparence</p>
                </div>
                <h2 className="font-display text-lg font-semibold text-white">Tu gardes la validation finale.</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-offwhite/60">
                  Le Collaborateur ne reçoit que les éléments que tu choisis de partager. Le délai, le périmètre et le statut sont visibles avant l'exécution.
                </p>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-offwhite/45">Mes demandes</p>
                <div className="mt-2 space-y-2" data-testid="collab-mes-demandes">
                  {demandes === null && <p className="text-sm text-offwhite/50">Chargement…</p>}
                  {demandes?.length === 0 && <p className="text-sm text-offwhite/50">Aucune demande pour l'instant.</p>}
                  {demandes?.slice(0, 5).map((d) => {
                    const st = STATUTS[d.statut] || STATUTS.nouvelle;
                    return (
                      <div key={d.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}><st.Icone size={11} /> {st.label}</span>
                          <span className="text-[11px] text-offwhite/40">{d.created_at ? new Date(d.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : ""}</span>
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-[13px] text-offwhite/75">{d.message.replace(/^\[[^\]]+\]\s*/, "")}</p>
                        {d.reponse && <p className="mt-2 rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-[12.5px] text-emerald-100">{d.reponse}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button onClick={() => navigate("/app/roadmap")} className="glass w-full rounded-2xl p-4 text-left transition hover:border-gold/40">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold"><Map size={18} /></span>
                  <div className="flex-1">
                    <div className="text-[13.5px] font-semibold text-white">Voir la roadmap</div>
                    <div className="text-[11.5px] text-offwhite/55">Ce qui arrive dans le cockpit</div>
                  </div>
                  <ArrowRight size={15} className="text-gold" />
                </div>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
