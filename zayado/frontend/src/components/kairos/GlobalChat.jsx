import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChatBody } from "./ChatAssistant";
import { getToken } from "@/lib/kairosApi";

/**
 * Chat « Collaborateur IA » accessible depuis toutes les pages (comme dans final 13) :
 * rail gauche, en-tête ou barre mobile envoient l'événement « zayado:open-chat ».
 * Sur le Cockpit en grand écran, le panneau est déjà ouvert à droite : on ne double pas.
 */
export const openChat = (onglet) => {
  window.dispatchEvent(new Event("zayado:open-chat"));
  if (onglet === "decisions") setTimeout(() => window.dispatchEvent(new Event("kairos:ouvrir-decisions")), 50);
  if (onglet === "actu") setTimeout(() => window.dispatchEvent(new Event("kairos:ouvrir-actu")), 50);
};

export default function GlobalChat() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const surCockpitLarge = () => location.pathname === "/app" && window.innerWidth >= 1280;

  useEffect(() => {
    const onOpen = () => { if (!surCockpitLarge()) setOpen(true); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("zayado:open-chat", onOpen);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("zayado:open-chat", onOpen); window.removeEventListener("keydown", onKey); };
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setOpen(false); }, [location.pathname]);

  if (!getToken() || !(location.pathname.startsWith("/app") || location.pathname === "/parametres")) return null;
  return (
    <>
      <div
        className={`fixed inset-0 z-[55] bg-[#060a18]/70 backdrop-blur-sm transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed right-0 top-0 z-[56] flex h-[100dvh] w-full flex-col border-l border-white/10 bg-[#101a34]/[0.97] shadow-2xl backdrop-blur-2xl transition-transform duration-300 sm:w-[400px] ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!open}
        data-testid="global-chat"
      >
        {open && <ChatBody onClose={() => setOpen(false)} />}
      </aside>
    </>
  );
}
