import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  BatteryLow,
  Bot,
  CalendarCheck,
  Compass,
  HeartPulse,
  Lightbulb,
  ListChecks,
  Menu,
  Radar as RadarIcon,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useCockpit } from "@/lib/store";
import { cn } from "@/lib/utils";
import { MOTTO } from "@/components/Shared";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  n: string;
}

export const NAV: NavItem[] = [
  { to: "/", label: "Aujourd'hui", icon: Sun, n: "01" },
  { to: "/vision", label: "Vision", icon: Compass, n: "02" },
  { to: "/radar", label: "Radar Prospection", icon: RadarIcon, n: "03" },
  { to: "/agent", label: "Agent Business", icon: Bot, n: "04" },
  { to: "/actions", label: "Actions", icon: ListChecks, n: "05" },
  { to: "/idees", label: "Boîte à Idées", icon: Lightbulb, n: "06" },
  { to: "/copilote", label: "Copilote IA", icon: Sparkles, n: "07" },
  { to: "/pouls", label: "Pouls Business", icon: TrendingUp, n: "08" },
  { to: "/revue", label: "Revue Hebdo", icon: CalendarCheck, n: "09" },
  { to: "/bienetre", label: "Bien-être & Énergie", icon: HeartPulse, n: "10" },
];

const MODE_ICONS: Record<string, LucideIcon> = {
  "Focus maximal": Zap,
  "Rythme de croisière": Activity,
  "Mode récupération": BatteryLow,
};

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-800 font-heading text-lg font-bold text-white shadow-[0_0_24px_rgba(30,64,175,0.45)]">
        Z
      </div>
      <div>
        <p className="font-heading text-sm font-semibold tracking-tight text-white">Zayado</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Cockpit IA</p>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={onNavigate}
          data-testid={`nav-${item.to === "/" ? "aujourdhui" : item.to.slice(1)}`}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-slate-800 font-medium text-blue-400"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200",
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          <span className="font-mono text-[10px] text-slate-600 group-data-[status]:text-slate-600">
            {item.n}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}

function MottoCard() {
  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-950/40 p-3">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
        <p className="text-xs leading-relaxed text-slate-300">{MOTTO}</p>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const { state } = useCockpit();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const current = NAV.find((n) => (n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to)));
  const todayEntry = state.energy.find((e) => e.date === new Date().toISOString().slice(0, 10));
  const ModeIcon = todayEntry ? (MODE_ICONS[todayEntry.mode] ?? Activity) : null;

  const dateLabel = new Date()
    .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="min-h-svh text-slate-200">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800/80 bg-[#0B0F19] lg:flex xl:w-72">
        <div className="flex h-16 items-center border-b border-slate-800/80 px-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Modules — 10
          </p>
          <NavList />
        </div>
        <div className="space-y-3 border-t border-slate-800/80 p-4">
          <MottoCard />
          <p className="px-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
            Offre Solo — données locales
          </p>
        </div>
      </aside>

      {/* Header */}
      <div className="lg:pl-64 xl:pl-72">
        <header className="sticky top-0 z-20 h-16 border-b border-slate-800/80 bg-[#07090E]/80 backdrop-blur-md">
          <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger
                  render={
                    <Button variant="ghost" size="icon" data-testid="btn-open-menu" className="lg:hidden" />
                  }
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Ouvrir le menu</span>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 overflow-y-auto bg-[#0B0F19] p-4">
                  <div className="mb-4 px-1">
                    <Brand />
                  </div>
                  <NavList onNavigate={() => setOpen(false)} />
                  <div className="mt-4">
                    <MottoCard />
                  </div>
                </SheetContent>
              </Sheet>
              <h1 className="truncate font-heading text-base font-semibold tracking-tight text-white sm:text-lg">
                {current ? current.label : "Cockpit"}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 md:inline">
                {dateLabel}
              </span>
              <span
                data-testid="chip-energie-header"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em]",
                  todayEntry
                    ? "border-sky-400/40 bg-sky-400/10 text-sky-300"
                    : "border-amber-400/40 bg-amber-400/10 text-amber-300",
                )}
              >
                {ModeIcon ? <ModeIcon className="h-3 w-3" /> : null}
                {todayEntry ? `Énergie ${todayEntry.level}/10` : "Check-in à faire"}
              </span>
              <span className="hidden items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-950/50 px-3 py-1 text-[11px] text-blue-200 xl:inline-flex">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                L'IA prépare. Vous décidez.
              </span>
            </div>
          </div>
        </header>

        {/* Main scrollable area */}
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
