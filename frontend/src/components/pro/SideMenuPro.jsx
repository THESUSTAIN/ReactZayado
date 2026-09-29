import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Moon, Sun, Menu, X } from "lucide-react";
import { useThemePro } from "@/lib/themePro";
import { getToken, setToken, fetchMoi } from "@/lib/kairosApi";

const ROLE_LABEL = { admin: "Administrateur", vendeur: "Vendeur", client: "Client" };

// Menu latéral pro — forme et couleurs exactes du modèle « Cours » (Cockpit RH) :
// barre latérale FLOTTANTE arrondie (navy #182d5e → #0d1838), onglet actif doré
// (#DEC2A3/#C9A96A), carte utilisateur en bas (initiales + rôle), tiroir mobile.
// Utilisé par la console admin et l'espace vendeur.
export function SideMenuPro({ titre, sousTitre, items, actif, onChange, retour }) {
  const navigate = useNavigate();
  const connecte = !!getToken();
  const [theme, basculerTheme] = useThemePro();
  const [ouvert, setOuvert] = useState(false);
  const [moi, setMoi] = useState(null);

  useEffect(() => {
    if (connecte) fetchMoi().then(setMoi).catch(() => {});
  }, [connecte]);

  const nomAffiche = moi?.email ? moi.email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";
  const initiales = nomAffiche.split(" ").map((p) => p[0]).slice(0, 2).join("") || "Z";
  const roleLabel = ROLE_LABEL[moi?.role] || (moi?.role ? moi.role : "");

  const choisir = (key) => { onChange(key); setOuvert(false); };
  const quitter = () => { setToken(null); navigate("/login"); };

  const Contenu = () => (
    <>
      <div className="flex items-center gap-3 px-3 pb-6">
        <img src="/logo.png" alt="Zayado" className="h-10 w-10 object-contain" />
        <div className="min-w-0">
          <p className="truncate font-display text-[15px] font-bold text-white">{titre}</p>
          <p className="truncate text-[10px] leading-tight text-white/45">{sousTitre}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {items.map((it) => {
          const isActive = actif === it.key;
          return (
            <button
              key={it.key}
              onClick={() => choisir(it.key)}
              data-testid={`pro-menu-${it.key}`}
              className="pro-nav-item"
              data-active={isActive ? "true" : "false"}
            >
              <span className="flex h-5 w-5 items-center justify-center">{it.icon}</span>
              <span className="flex-1 text-left text-sm">{it.label}</span>
              {it.badge != null && it.badge > 0 && (
                <span className="rounded-full bg-[#C1272D] px-2 py-0.5 text-[10px] font-bold text-white">{it.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-2 space-y-1 px-2 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        {connecte && moi && (
          <div className="flex items-center gap-3 px-2 py-2" data-testid="pro-menu-user">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold"
              style={{ background: "linear-gradient(135deg,#C9A96A,#DEC2A3)", color: "#1F2A44" }}
            >
              {initiales}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold" style={{ color: "#EDF2FF" }}>{nomAffiche}</div>
              <div className="text-xs" style={{ color: "#DEC2A3" }}>{roleLabel}</div>
            </div>
          </div>
        )}
        <button onClick={basculerTheme} data-testid="pro-theme" className="pro-nav-item w-full">
          {theme === "clair" ? <Moon size={18} /> : <Sun size={18} />}
          <span className="text-sm">{theme === "clair" ? "Mode sombre" : "Mode clair"}</span>
        </button>
        {retour && (
          <button onClick={() => navigate(retour.to)} data-testid="pro-menu-retour" className="pro-nav-item w-full">
            <ArrowLeft size={18} /><span className="text-sm">{retour.label}</span>
          </button>
        )}
        {connecte && (
          <button onClick={quitter} data-testid="pro-menu-logout" className="pro-nav-item w-full">
            <LogOut size={18} /><span className="text-sm">Déconnexion</span>
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile : en-tête compact + tiroir latéral (modèle « Cours ») */}
      <div className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-white/10 px-4 py-3 lg:hidden"
        style={{ background: "linear-gradient(180deg,#182d5e,#0d1838)" }} data-testid="side-menu-pro-mobile">
        <button onClick={() => setOuvert(true)} aria-label="Ouvrir le menu" data-testid="pro-menu-burger"
          className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/10">
          <Menu size={20} />
        </button>
        <img src="/logo.png" alt="Zayado" className="h-8 w-8 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[14px] font-bold text-white">{titre}</p>
          <p className="truncate text-[10px] leading-tight text-white/45">{sousTitre}</p>
        </div>
      </div>

      {ouvert && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOuvert(false)} style={{ background: "rgba(0,0,0,0.5)" }} data-testid="pro-menu-overlay">
          <aside className="pro-sidebar flex h-full w-[264px] flex-col py-6" onClick={(e) => e.stopPropagation()} data-testid="pro-menu-drawer">
            <button onClick={() => setOuvert(false)} aria-label="Fermer le menu" data-testid="pro-menu-close"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-white/70 transition hover:bg-white/10">
              <X size={18} />
            </button>
            <Contenu />
          </aside>
        </div>
      )}

      {/* Desktop : barre flottante arrondie, détachée du bord (modèle « Cours ») */}
      <aside
        className="pro-sidebar fixed left-3 top-3 z-30 hidden h-[calc(100vh-24px)] w-[264px] flex-col py-6 lg:flex"
        style={{ borderRadius: 24 }}
        data-testid="side-menu-pro"
      >
        <Contenu />
      </aside>
    </>
  );
}
