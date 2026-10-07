import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Mail, Plus, Users, X } from "lucide-react";
import { fetchBoards, fetchInvitations, inviterBoard, retirerInvitation, fetchBoardsPartages, fetchContactsPartage } from "@/lib/kairosApi";

// « Partager mes boards » : pour chaque board, qui peut le modifier. On coche ses membres (Ton entreprise, son équipe)
// ou on ajoute un e-mail. Rien n'est partagé par défaut ; retirer quelqu'un lui coupe l'accès tout de suite.
const champ = "min-w-0 flex-1 rounded-xl border border-white/20 bg-white/[0.07] px-3.5 py-2.5 text-[14px] text-white outline-none placeholder:text-white/40 focus:border-gold";

function Board({ b, contacts }) {
  const [inv, setInv] = useState(null);
  const [email, setEmail] = useState("");
  const [occupe, setOccupe] = useState(null);
  const charger = useCallback(() => fetchInvitations(b.key).then((d) => setInv((d.invitations || []).map((x) => x.email))).catch(() => setInv([])), [b.key]);
  useEffect(() => { charger(); }, [charger]);
  const basculer = async (e) => {
    setOccupe(e);
    try {
      if (inv.includes(e)) { await retirerInvitation(b.key, e); toast.success(`${e} n'a plus accès à « ${b.nom} ».`); }
      else { await inviterBoard(b.key, e); toast.success(`${e} peut maintenant voir et modifier « ${b.nom} ». Il est prévenu par e-mail.`); }
      await charger();
    } catch { toast.error("Action impossible pour le moment."); }
    setOccupe(null);
  };
  const ajouter = async (ev) => {
    ev.preventDefault();
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { toast.error("Entre un e-mail valide."); return; }
    if (!inv.includes(e)) await basculer(e);
    setEmail("");
  };
  const autres = (inv || []).filter((e) => !contacts.some((c) => c.email === e));
  return (
    <section className="rounded-2xl border border-white/15 bg-white/[0.06] p-4" data-testid={`partage-board-${b.key}`}>
      <div className="flex items-center gap-2">
        <span className="text-[20px]" aria-hidden>{b.emoji || "🧭"}</span>
        <h2 className="min-w-0 flex-1 truncate text-[15.5px] font-semibold text-white">{b.nom}</h2>
        <span className="shrink-0 text-[12px] text-white/55">{inv === null ? "…" : inv.length ? `${inv.length} personne(s)` : "privé"}</span>
      </div>
      {inv === null ? <Loader2 size={15} className="mt-3 animate-spin text-white/50" /> : (
        <>
          {contacts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {contacts.map((c) => {
                const actif = inv.includes(c.email);
                return (
                  <button key={c.email} onClick={() => basculer(c.email)} disabled={occupe === c.email} aria-pressed={actif} title={c.email}
                    className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3 text-[13px] transition ${actif ? "border-gold bg-gold text-navy-900" : "border-white/20 text-white/85 hover:border-white/40"}`}>
                    {occupe === c.email ? <Loader2 size={13} className="animate-spin" /> : actif ? <Check size={13} /> : <Plus size={13} />}
                    {c.nom}<span className={`text-[11px] ${actif ? "text-navy-900/60" : "text-white/40"}`}>· {c.origine}</span>
                  </button>
                );
              })}
            </div>
          )}
          {autres.length > 0 && (
            <ul className="mt-3 space-y-1">{autres.map((e) => (
              <li key={e} className="flex items-center gap-2 text-[13px] text-white/85"><Mail size={13} className="text-gold" /><span className="min-w-0 flex-1 truncate">{e}</span>
                <button onClick={() => basculer(e)} className="rounded p-1 text-white/45 hover:text-rose-200" aria-label={`Retirer ${e}`}><X size={14} /></button></li>
            ))}</ul>
          )}
          <form onSubmit={ajouter} className="mt-3 flex gap-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Ajouter quelqu'un par e-mail" className={champ} />
            <button className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-white/25 px-3.5 text-[13px] font-semibold text-white/85 hover:bg-white/10"><Plus size={14} /> Inviter</button>
          </form>
        </>
      )}
    </section>
  );
}

export default function PartageBoards({ onOpenBoard }) {
  const [boards, setBoards] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [partages, setPartages] = useState([]);
  useEffect(() => {
    fetchBoards().then((d) => setBoards(d.boards || [])).catch(() => setBoards([]));
    fetchContactsPartage().then((d) => setContacts(d.contacts || [])).catch(() => {});
    fetchBoardsPartages().then((d) => setPartages(d.boards || [])).catch(() => {});
  }, []);
  return (
    <div className="mx-auto max-w-3xl space-y-4" data-testid="vision-partage">
      <div>
        <p className="text-[14px] text-white/75">Choisis, board par board, qui peut le voir et le modifier avec toi. Rien n'est partagé tant que tu ne coches personne.</p>
        {contacts.length === 0 && <p className="mt-1 text-[12.5px] text-white/50">Tes membres (Ton entreprise, ton équipe) apparaîtront ici pour être ajoutés d'un clic. En attendant, invite par e-mail.</p>}
      </div>
      {boards === null ? <Loader2 className="mx-auto animate-spin text-white/50" /> : boards.map((b) => <Board key={b.key} b={b} contacts={contacts} />)}
      {partages.length > 0 && (
        <section className="rounded-2xl border border-gold/30 bg-gold/[0.05] p-4">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white"><Users size={16} className="text-gold" /> Partagés avec moi</h2>
          <ul className="mt-2 divide-y divide-white/10">
            {partages.map((b) => (
              <li key={`${b.owner || ""}-${b.key}`}><button onClick={() => onOpenBoard({ ...b, partage: true })} className="flex w-full items-center gap-2 py-2.5 text-left">
                <span aria-hidden>{b.emoji || "🧭"}</span><span className="min-w-0 flex-1 truncate text-[14px] text-white">{b.nom}</span><span className="shrink-0 text-[12px] text-white/55">par {b.proprietaire || "un membre"}</span>
              </button></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
