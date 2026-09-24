import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Layers, Plus, Check, Trash2, Loader2, Pencil } from "lucide-react";
import { useI18n } from "@/i18n";
import { fetchBoards, createBoard, renameBoard, deleteBoard } from "@/lib/kairosApi";

const EMOJIS = ["🎯", "💼", "🌱", "🏡", "🚀", "🎨", "💰", "❤️", "🧭", "📚"];

/**
 * Sélecteur de boards (perso / pro / personnalisés).
 * Appelle onSwitch(key) quand l'utilisateur change de board.
 */
export function BoardSwitcher({ current, onSwitch, onBoardsLoaded }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("🎯");
  const [renamingKey, setRenamingKey] = useState(null);
  const ref = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetchBoards();
      const list = r.boards || [];
      setBoards(list);
      onBoardsLoaded?.(list);
      if (list.length && !list.some((b) => b.key === current)) onSwitch?.(list[0].key);
    } catch {
      setBoards([{ key: "perso", nom: t("vision.boards.perso"), emoji: "🌱", count: 0 }]);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setCreating(false); setRenamingKey(null); } };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const label = (b) => (b.key === "perso" && b.nom === "Perso" ? t("vision.boards.perso")
    : b.key === "pro" && b.nom === "Pro" ? t("vision.boards.pro") : b.nom);

  const active = boards.find((b) => b.key === current);

  const submitNew = async () => {
    const nom = newName.trim();
    if (nom.length < 2) return;
    try {
      const b = await createBoard({ nom, emoji: newEmoji });
      setNewName(""); setCreating(false);
      await load();
      onSwitch?.(b.key);
      toast.success(t("vision.boards.created", { name: nom }));
    } catch { toast.error(t("common.unavailable")); }
  };

  const submitRename = async (key, nom) => {
    setRenamingKey(null);
    if (!nom.trim()) return;
    try { await renameBoard(key, { nom: nom.trim() }); await load(); }
    catch { toast.error(t("common.unavailable")); }
  };

  const remove = async (b) => {
    if (boards.length <= 1) return toast.error(t("vision.boards.lastOne"));
    if (!window.confirm(t("vision.boards.deleteConfirm", { name: label(b) }))) return;
    try {
      await deleteBoard(b.key);
      const rest = boards.filter((x) => x.key !== b.key);
      setBoards(rest);
      if (current === b.key && rest[0]) onSwitch?.(rest[0].key);
      toast.success(t("vision.boards.deleted"));
      load();
    } catch { toast.error(t("common.unavailable")); }
  };

  return (
    <div ref={ref} className="relative" data-testid="vision-board-switcher">
      <button
        onClick={() => setOpen((v) => !v)}
        title={t("vision.boards.switch")}
        data-testid="vision-board-switcher-btn"
        className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs font-semibold text-offwhite/85 transition hover:bg-white/10"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <span>{active?.emoji || "🧭"}</span>}
        <span className="max-w-[90px] truncate">{active ? label(active) : t("vision.boards.title")}</span>
        <Layers size={12} className="opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[70] mt-2 w-[250px] rounded-xl fenetre p-2" data-testid="vision-board-menu">
          <p className="px-1.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gold">
            {t("vision.boards.title")}
          </p>

          <div className="max-h-[240px] space-y-0.5 overflow-y-auto">
            {boards.map((b) => (
              <div key={b.key} className="group flex items-center gap-1 rounded-lg px-1 transition hover:bg-white/8">
                {renamingKey === b.key ? (
                  <input
                    autoFocus
                    defaultValue={label(b)}
                    onBlur={(e) => submitRename(b.key, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submitRename(b.key, e.target.value); if (e.key === "Escape") setRenamingKey(null); }}
                    className="my-1 w-full rounded-md border border-gold/50 bg-white/5 px-2 py-1 text-xs text-offwhite outline-none"
                  />
                ) : (
                  <>
                    <button
                      onClick={() => { onSwitch?.(b.key); setOpen(false); }}
                      data-testid={`vision-board-${b.key}`}
                      className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-xs text-offwhite"
                    >
                      <span className="text-base leading-none">{b.emoji || "🧭"}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{label(b)}</span>
                      <span className="text-[10px] text-offwhite/40">{b.count ?? 0}</span>
                      {current === b.key && <Check size={13} className="text-gold" />}
                    </button>
                    <button
                      onClick={() => setRenamingKey(b.key)}
                      title={t("vision.boards.rename")}
                      className="hidden h-6 w-6 items-center justify-center rounded-md text-offwhite/50 hover:text-gold group-hover:flex"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => remove(b)}
                      data-testid={`vision-board-delete-${b.key}`}
                      className="hidden h-6 w-6 items-center justify-center rounded-md text-offwhite/50 hover:text-alert group-hover:flex"
                    >
                      <Trash2 size={11} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="mt-1.5 border-t border-white/10 pt-1.5">
            {creating ? (
              <div className="space-y-1.5 px-1 pb-1">
                <div className="flex flex-wrap gap-1">
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => setNewEmoji(e)}
                      className={`h-6 w-6 rounded-md text-sm leading-none transition ${newEmoji === e ? "bg-gold/25 ring-1 ring-gold" : "hover:bg-white/10"}`}>
                      {e}
                    </button>
                  ))}
                </div>
                <input
                  autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitNew(); if (e.key === "Escape") setCreating(false); }}
                  placeholder={t("vision.boards.newName")}
                  data-testid="vision-board-new-name"
                  className="w-full rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-offwhite outline-none focus:border-gold placeholder:text-offwhite/40"
                />
                <button onClick={submitNew} disabled={newName.trim().length < 2} data-testid="vision-board-create-confirm"
                  className="w-full rounded-md bg-gold py-1.5 text-[11px] font-bold text-navy-900 transition hover:opacity-90 disabled:opacity-40">
                  {t("common.add")}
                </button>
              </div>
            ) : (
              <button onClick={() => setCreating(true)} data-testid="vision-board-create"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-offwhite/75 transition hover:bg-white/10 hover:text-gold">
                <Plus size={13} /> {t("vision.boards.new")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BoardSwitcher;
