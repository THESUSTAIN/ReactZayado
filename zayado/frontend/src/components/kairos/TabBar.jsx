import React from "react";
import { LayoutDashboard, Compass, Lightbulb, Heart, MessageCircle } from "lucide-react";

const ITEMS = [
  { key: "today", name: "Aujourd'hui", icon: LayoutDashboard },
  { key: "vision", name: "Vision", icon: Compass },
  { key: "ideas", name: "Idées", icon: Lightbulb },
  { key: "wellbeing", name: "Bien-être", icon: Heart },
];

// Barre d'onglets mobile (PWA). `onOpenChat` ouvre l'assistant plein écran.
export function TabBar({ active = "today", onSelect, onOpenChat }) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-navy-900/85 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      data-testid="tabbar"
    >
      <div className="flex items-center justify-around">
        {ITEMS.slice(0, 2).map((it) => (
          <TabButton key={it.key} item={it} active={active === it.key} onClick={() => onSelect?.(it.key)} />
        ))}

        <button
          onClick={onOpenChat}
          data-testid="tabbar-chat"
          className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-navy-900 shadow-[0_8px_24px_-4px_rgba(201,169,106,0.7)] active:scale-95"
        >
          <MessageCircle className="h-6 w-6" />
        </button>

        {ITEMS.slice(2).map((it) => (
          <TabButton key={it.key} item={it} active={active === it.key} onClick={() => onSelect?.(it.key)} />
        ))}
      </div>
    </nav>
  );
}

function TabButton({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      data-testid={`tabbar-${item.key}`}
      className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
        active ? "text-gold" : "text-offwhite/50"
      }`}
    >
      <Icon className="h-5 w-5" />
      {item.name}
    </button>
  );
}
