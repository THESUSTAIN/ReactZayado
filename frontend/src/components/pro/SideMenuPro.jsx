import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import { getToken, setToken } from "@/lib/kairosApi";

// Menu latéral pro (modèle « Victoires ») : rail navy foncé + libellés, pour la
// console admin et l'espace vendeur — volontairement différent du rail d'icônes SaaS.
export function SideMenuPro({ titre, sousTitre, items, actif, onChange, retour }) {
  const navigate = useNavigate();
  const connecte = !!getToken();

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[248px] flex-col px-5 py-6 lg:flex" style={{ background: "linear-gradient(180deg, #1a3a6e 0%, #102945 60%, #0c1d33 100%)" }} data-testid="side-menu-pro">
      <div className="flex items-center gap-3 px-1">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F1E2CC] to-[#DEC2A3] font-wordmark text-xl font-bold text-[#14243F]">K</span>
        <div>
          <p className="font-display text-[15px] font-bold text-white">{titre}</p>
          <p className="text-[10px] leading-tight text-white/45">{sousTitre}</p>
        </div>
      </div>

      <nav className="mt-9 flex flex-1 flex-col gap-1.5">
        {items.map((it) => {
          const isActive = actif === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              data-testid={`pro-menu-${it.key}`}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm transition-all duration-200 border-l-2 ${
                isActive
                  ? "bg-gradient-to-r from-[#F1E2CC] to-[#DEC2A3] font-semibold text-[#14243F] border-l-[#C1272D]"
                  : "border-l-transparent text-white/65 backdrop-blur-md hover:bg-white/10 hover:border-l-[#C1272D]/50 hover:text-white"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center">{it.icon}</span>
              <span className="flex-1">{it.label}</span>
              {it.badge != null && it.badge > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? "bg-[#14243F]/15 text-[#14243F]" : "bg-[#C1272D] text-white"}`}>{it.badge}</span>
              )}
            </button>
          );
        })}
      </nav>


      <div className="space-y-1.5 border-t border-white/10 pt-4">
        {retour && (
          <button onClick={() => navigate(retour.to)} data-testid="pro-menu-retour" className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-white/55 transition-colors hover:bg-white/8 hover:text-white">
            <ArrowLeft size={16} /> {retour.label}
          </button>
        )}
        {connecte && (
          <button
            onClick={() => { setToken(null); navigate("/login"); }}
            data-testid="pro-menu-logout"
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-white/55 transition-colors hover:bg-white/8 hover:text-white"
          >
            <LogOut size={16} /> Se déconnecter
          </button>
        )}
        <p className="px-3.5 pt-2 font-serif-italic text-[11px] leading-relaxed text-white/35">
          « Le calme est un avantage compétitif. »
        </p>
      </div>
    </aside>
  );
}
