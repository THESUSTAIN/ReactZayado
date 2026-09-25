import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Moon, Sun } from "lucide-react";
import { useThemePro } from "@/lib/themePro";
import { getToken, setToken } from "@/lib/kairosApi";

// Menu latéral pro (modèle « Victoires ») : rail navy foncé + libellés, pour la
// console admin et l'espace vendeur — volontairement différent du rail d'icônes SaaS.
export function SideMenuPro({ titre, sousTitre, items, actif, onChange, retour }) {
  const navigate = useNavigate();
  const connecte = !!getToken();
  const [theme, basculerTheme] = useThemePro();
  const FOND = "linear-gradient(180deg, #14254f 0%, #0f1d40 55%, #0b1633 100%)";

  return (
    <>
    {/* Mobile / tablette : le rail latéral est masqué sous 1024 px — avant, il
        n'y avait alors AUCUNE navigation. Bandeau d'onglets défilant à la place. */}
    <div className="border-b border-white/10 lg:hidden" style={{ background: FOND }} data-testid="side-menu-pro-mobile">
      <div className="flex items-center gap-2.5 px-4 pb-2 pt-3">
        {retour && (
          <button onClick={() => navigate(retour.to)} aria-label={retour.label} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10"><ArrowLeft size={18} /></button>
        )}
        <img src="/logo.png" alt="Zayado" className="h-8 w-8 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[14px] font-bold text-white">{titre}</p>
          <p className="truncate text-[10px] leading-tight text-white/45">{sousTitre}</p>
        </div>
        <button onClick={basculerTheme} aria-label={theme === "clair" ? "Mode sombre" : "Mode clair"} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10" data-testid="pro-theme-m">{theme === "clair" ? <Moon size={17} /> : <Sun size={17} />}</button>
        {connecte && (
          <button onClick={() => { setToken(null); navigate("/login"); }} aria-label="Se déconnecter" className="rounded-lg p-1.5 text-white/60 hover:bg-white/10"><LogOut size={17} /></button>
        )}
      </div>
      <nav className="flex gap-1.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
        {items.map((it) => {
          const isActive = actif === it.key;
          return (
            <button key={it.key} onClick={() => onChange(it.key)} data-testid={`pro-menu-m-${it.key}`}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] transition ${
                isActive ? "bg-[#DEC2A3]/20 font-semibold text-[#F1E2CC]" : "bg-white/[0.07] text-white/70"}`}>
              <span className="flex h-4 w-4 items-center justify-center">{it.icon}</span>{it.label}
              {it.badge != null && it.badge > 0 && <span className="rounded-full bg-[#C1272D] px-1.5 text-[10px] font-bold text-white">{it.badge}</span>}
            </button>
          );
        })}
      </nav>
    </div>
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[248px] flex-col px-5 py-6 lg:flex" style={{ background: FOND, borderRight: "1px solid rgba(255,255,255,0.06)" }} data-testid="side-menu-pro">
      <div className="flex items-center gap-3 px-1">
        <img src="/logo.png" alt="Zayado" className="h-10 w-10 object-contain" />
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
              className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-[13.5px] transition-all duration-200 border-l-2 ${
                isActive
                  ? "bg-white/[0.09] font-semibold text-white border-l-[#DEC2A3]"
                  : "border-l-transparent text-white/60 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center">{it.icon}</span>
              <span className="flex-1">{it.label}</span>
              {it.badge != null && it.badge > 0 && (
                <span className="rounded-full bg-[#C1272D] px-2 py-0.5 text-[10px] font-bold text-white">{it.badge}</span>
              )}
            </button>
          );
        })}
      </nav>


      <div className="space-y-1.5 border-t border-white/10 pt-4">
        <button onClick={basculerTheme} data-testid="pro-theme" className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white">
          {theme === "clair" ? <Moon size={16} /> : <Sun size={16} />} {theme === "clair" ? "Mode sombre" : "Mode clair"}
        </button>
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
    </>
  );
}
