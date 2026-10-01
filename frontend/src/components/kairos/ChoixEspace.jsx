import React, { useEffect, useState } from "react";
import { Building2, Check, ChevronDown, ExternalLink, UserRound } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { accueilPro, basculerEspace, chargerEspace, enPro, RH } from "@/lib/espace";

// Sélecteur Perso / Entreprise (seulement pour les comptes rattachés à une entreprise).
export default function ChoixEspace() {
  const [esp, setEsp] = useState(null);
  useEffect(() => { chargerEspace().then(setEsp).catch(() => {}); }, []);
  const e = esp?.entreprise;
  if (!e) return null;
  const pro = enPro();
  const nom = e.nom.length > 18 ? `${e.nom.slice(0, 17)}…` : e.nom;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger data-testid="choix-espace"
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[12px] font-semibold transition ${pro ? "border-gold/60 bg-gold/15 text-gold" : "border-white/10 bg-white/5 text-offwhite/80 hover:bg-white/10"}`}>
        {pro ? <Building2 className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
        <span className="hidden max-w-[140px] truncate sm:inline">{pro ? nom : "Perso"}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong w-64 border-white/10 text-offwhite">
        <DropdownMenuLabel className="text-xs uppercase tracking-[0.2em] text-gold">Mon espace</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {esp.perso && (
          <DropdownMenuItem onClick={() => !pro || basculerEspace("perso")} className="cursor-pointer gap-2 focus:bg-white/10 focus:text-offwhite" data-testid="espace-perso">
            <UserRound className="h-4 w-4 text-gold" />
            <span className="flex-1"><span className="block text-sm">Perso</span><span className="block text-[11px] text-offwhite/50">Ton cockpit à toi</span></span>
            {!pro && <Check className="h-4 w-4 text-gold" />}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => pro || basculerEspace("pro", accueilPro(e.modules))} className="cursor-pointer gap-2 focus:bg-white/10 focus:text-offwhite" data-testid="espace-pro">
          <Building2 className="h-4 w-4 text-gold" />
          <span className="flex-1"><span className="block text-sm">{e.nom}</span><span className="block text-[11px] text-offwhite/50">Espace de l'entreprise</span></span>
          {pro && <Check className="h-4 w-4 text-gold" />}
        </DropdownMenuItem>
        {pro && e.modules.includes("rh") && (
          <>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem onClick={() => window.open(RH, "_blank", "noopener")} className="cursor-pointer gap-2 focus:bg-white/10 focus:text-offwhite" data-testid="espace-rh">
              <ExternalLink className="h-4 w-4 text-gold" /> Zayado RH
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
