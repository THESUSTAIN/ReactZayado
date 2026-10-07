import React, { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircle, HandHelping, Send, Users, Check } from "lucide-react";
import { toast } from "sonner";
import { fetchIdeesEquipe, fetchCommentairesIdee, commenterIdee, prendreIdee } from "@/lib/kairosApi";

// Idées que l'équipe a choisi de partager. Chacun garde son espace : « Je prends » crée une action
// dans MON Plan d'action, sans toucher à l'idée de l'auteur.
export function IdeesEquipe({ equipe, onInviter }) {
  const [items, setItems] = useState(null);
  const [ouverte, setOuverte] = useState(null);
  const [comms, setComms] = useState({});
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(() => fetchIdeesEquipe().then((r) => setItems(r.items || [])).catch(() => setItems([])), []);
  useEffect(() => { charger(); }, [charger]);

  const ouvrir = async (id) => {
    if (ouverte === id) { setOuverte(null); return; }
    setOuverte(id); setTexte("");
    try { const r = await fetchCommentairesIdee(id); setComms((c) => ({ ...c, [id]: r.items || [] })); } catch { /* silencieux */ }
  };
  const envoyer = async (id) => {
    if (!texte.trim()) return;
    setEnvoi(true);
    try {
      await commenterIdee(id, texte.trim());
      setTexte("");
      const r = await fetchCommentairesIdee(id);
      setComms((c) => ({ ...c, [id]: r.items || [] }));
      charger();
    } catch (e) { toast.error(e.detail || "Message non envoyé."); }
    setEnvoi(false);
  };
  const prendre = async (id) => {
    try { await prendreIdee(id); toast.success("Ajoutée à ton Plan d'action."); charger(); }
    catch (e) { toast.error(e.detail || "Impossible pour le moment."); }
  };

  if (items === null) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-gold" /></div>;

  return (
    <div data-testid="ideas-equipe">
      <p className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-offwhite/80">
        <Users size={14} className="text-gold" />
        {(equipe?.membres || []).map((m) => m.nom + (m.moi ? " (toi)" : "")).join(" · ")}
      </p>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/12 bg-white/[0.05] p-6 text-center text-sm leading-relaxed text-offwhite/80" data-testid="ideas-equipe-vide">
          Aucune idée partagée pour l'instant. Ouvre une de tes idées et active « Partager avec mon équipe » : tes coéquipiers
          la verront, pourront la commenter et la prendre en charge.
          {equipe?.seul && <button onClick={onInviter} className="mt-3 block w-full font-semibold text-gold hover:underline">Inviter un coéquipier</button>}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.id} className="rounded-2xl border border-white/12 bg-white/[0.06] p-4" data-testid={`equipe-idee-${i.id}`}>
              <p className="text-[12.5px] font-semibold text-gold">{i.a_moi ? "Toi" : i.auteur}</p>
              <p className="mt-0.5 break-words font-display text-[15.5px] font-semibold text-offwhite">{i.titre}</p>
              {i.description ? <p className="mt-1 line-clamp-3 break-words text-[13px] text-offwhite/75">{i.description}</p> : null}
              {i.prises.length > 0 && (
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[12.5px] font-semibold text-emerald-300">
                  <Check size={12} /> Prise par {i.prises.map((p) => p.nom).join(", ")}
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => ouvrir(i.id)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/25 px-3 py-2.5 text-[13px] font-semibold text-offwhite/90 hover:bg-white/10" data-testid={`equipe-commenter-${i.id}`}>
                  <MessageCircle size={14} /> Commenter{i.commentaires ? ` (${i.commentaires})` : ""}
                </button>
                <button onClick={() => prendre(i.id)} disabled={i.je_prends} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gold px-3 py-2.5 text-[13px] font-bold text-navy-900 disabled:opacity-50" data-testid={`equipe-prendre-${i.id}`}>
                  <HandHelping size={14} /> {i.je_prends ? "Dans mon plan" : "Je prends"}
                </button>
              </div>
              {ouverte === i.id && (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  {(comms[i.id] || []).map((c) => (
                    <p key={c.id} className="break-words text-[13px] text-offwhite/85"><b className={c.moi ? "text-gold" : "text-offwhite"}>{c.moi ? "Toi" : c.auteur}</b> : {c.texte}</p>
                  ))}
                  <div className="flex gap-2">
                    <input value={texte} onChange={(e) => setTexte(e.target.value)} onKeyDown={(e) => e.key === "Enter" && envoyer(i.id)} maxLength={1000}
                      placeholder="Ton message…" className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[14px] text-offwhite placeholder:text-offwhite/50" />
                    <button onClick={() => envoyer(i.id)} disabled={envoi || !texte.trim()} aria-label="Envoyer" className="rounded-xl bg-gold px-3 text-navy-900 disabled:opacity-50"><Send size={15} /></button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
