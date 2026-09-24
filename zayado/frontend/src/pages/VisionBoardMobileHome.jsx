import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu, Bell, Plus, Sparkles, Trophy, Heart, TrendingUp, Target, User,
  Home as HomeIcon, LayoutGrid, MoreHorizontal, Briefcase, Compass, Leaf,
} from "lucide-react";
import { useKairos } from "@/context/KairosContext";

const GOLD = "#DEC2A3";

const DEFAULT_BOARDS = [
  { key: "perso",    emoji: "🌱", name: "Ma vie rêvée",    items: 12, image: "https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=600&q=80" },
  { key: "pro",      emoji: "💼", name: "Mon business",    items: 8,  image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80" },
  { key: "voyage",   emoji: "✈️", name: "Mes voyages",      items: 10, image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80" },
  { key: "famille",  emoji: "❤️", name: "Ma famille",       items: 7,  image: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=600&q=80" },
];

const QUOTES = [
  { text: "L'avenir dépend de ce que tu fais aujourd'hui.", author: "Mahatma Gandhi" },
  { text: "Va doucement, ça avance quand même.", author: "Zayado" },
  { text: "Prends soin de la journée, elle prendra soin de la vie.", author: "Anonyme" },
  { text: "La clarté vient après le premier pas, pas avant.", author: "Zayado" },
];

/**
 * Vision Board Mobile Home
 * - Header "Welcome back, {name}"
 * - Hero "Create Your Vision"
 * - My Vision Boards grid 2 cols
 * - Daily Motivation quote
 * - Progress Overview 3 stats
 * - Bottom tab bar (Home/Boards/+/Goals/Profile)
 */
export default function VisionBoardMobileHome({ onOpenBoard }) {
  const navigate = useNavigate();
  const { user } = useKairos();
  const [boards, setBoards] = useState(DEFAULT_BOARDS);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [stats, setStats] = useState({ active: 12, done: 5, progress: 68 });
  const firstName = user?.firstName || "Thomas";

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kairos_boards_gallery");
      if (saved) setBoards(JSON.parse(saved));
    } catch {}
  }, []);

  const openBoard = (b) => {
    localStorage.setItem("kairos_board_key", b.key);
    if (onOpenBoard) onOpenBoard(b);
    else navigate(`/app/vision?view=canvas&board=${b.key}`);
  };

  const nextQuote = () => setQuoteIndex((i) => (i + 1) % QUOTES.length);
  const q = QUOTES[quoteIndex];

  return (
    <div className="min-h-screen text-white" style={{
      background: `#0f1b3a radial-gradient(ellipse 800px 500px at 50% 0%, rgba(74,106,158,0.35) 0%, transparent 60%) no-repeat`,
    }}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 pt-4 pb-3 backdrop-blur-xl" style={{ background: "rgba(15,27,58,0.72)" }}>
        <button className="rounded-lg p-2 hover:bg-white/5"><Menu size={22} /></button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>Zayado</div>
          <div className="font-display text-[15px] font-semibold">Welcome back, {firstName} <span className="ml-1">👋</span></div>
        </div>
        <button className="relative rounded-lg p-2 hover:bg-white/5">
          <Bell size={20} />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-400" />
        </button>
      </header>
      <p className="text-center text-[12px] text-white/55 pb-4">Keep focusing on your goals!</p>

      <main className="px-5 pb-28 space-y-6">
        {/* Hero card */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white p-5 text-navy-900"
          style={{ boxShadow: "0 20px 40px -20px rgba(0,0,0,0.5)" }}>
          <div className="relative z-10 max-w-[60%]">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `linear-gradient(135deg, ${GOLD}, #b89566)` }}>
              <Sparkles size={20} className="text-white" />
            </div>
            <h2 className="font-display text-[22px] font-semibold leading-tight">Create Your Vision</h2>
            <p className="mt-1 text-[12.5px] text-navy-900/65">Transforme tes rêves en une histoire visuelle.</p>
            <button onClick={() => openBoard({ key: `new_${Date.now()}` })}
              className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${GOLD}, #a97e42)`, boxShadow: `0 8px 20px -6px ${GOLD}80` }}>
              <Plus size={15} /> Nouveau board
            </button>
          </div>
          {/* Splash art on the right */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-2/5 opacity-90">
            <div className="absolute inset-0 rounded-3xl" style={{
              background: `radial-gradient(circle at 60% 40%, ${GOLD}44, transparent 60%), radial-gradient(circle at 30% 80%, #38b2ac44, transparent 60%), radial-gradient(circle at 80% 80%, #60a5fa44, transparent 60%)`,
            }} />
            <div className="absolute right-2 top-4 grid grid-cols-2 gap-1 rotate-[-6deg]">
              {["photo-1470071459604-3b5ec3a7fe05", "photo-1505843513577-22bb7d21e455", "photo-1567808291548-fc3ee04dbcf0", "photo-1571019614242-c5c5dee9f50b"].map((p, i) => (
                <div key={i} className="h-12 w-14 overflow-hidden rounded-sm border-[1.5px] border-white shadow-md" style={{ transform: `rotate(${(i % 2 ? 4 : -3)}deg)` }}>
                  <img src={`https://images.unsplash.com/${p}?w=200&q=60`} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* My Vision Boards */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-[17px] font-semibold">Mes Vision Boards</h3>
            <button className="text-[12px] font-semibold" style={{ color: GOLD }}>Tout voir</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {boards.map((b) => (
              <button key={b.key} onClick={() => openBoard(b)}
                className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 text-left transition active:scale-[0.98]">
                <img src={b.image} alt={b.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1b3a] via-[#0f1b3a]/40 to-transparent" />
                <div className="absolute inset-x-3 bottom-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[16px]">{b.emoji}</span>
                    <h4 className="font-display text-[15px] font-semibold text-white">{b.name}</h4>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[10.5px] text-white/70">
                    <LayoutGrid size={10} /> {b.items} éléments
                  </div>
                </div>
                <div className="absolute right-2 top-2 rounded-md bg-black/40 p-1 backdrop-blur-sm">
                  <MoreHorizontal size={13} className="text-white/80" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Daily motivation */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-[17px] font-semibold">Motivation du jour</h3>
            <button onClick={nextQuote} className="text-[12px] font-semibold" style={{ color: GOLD }}>Nouvelle citation</button>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/10 p-5"
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(15,27,58,0.7), rgba(15,27,58,0.4)), url(https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&q=60)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}>
            <Sparkles size={14} style={{ color: GOLD }} />
            <p className="mt-2 font-serif-italic italic text-[18px] leading-tight text-white">« {q.text} »</p>
            <p className="mt-2 text-[12px] text-white/70">— {q.author}</p>
            <button className="absolute right-4 top-4 rounded-full bg-black/30 p-1.5 backdrop-blur-sm">
              <Heart size={13} className="text-white/70" />
            </button>
          </div>
        </section>

        {/* Progress overview */}
        <section>
          <h3 className="mb-3 font-display text-[17px] font-semibold">Aperçu progression</h3>
          <div className="grid grid-cols-3 gap-2">
            <StatCard icon={Target} label="Objectifs" value={stats.active} sub="Actifs" bg="rgba(96,165,250,0.15)" fg="#60a5fa" />
            <StatCard icon={Trophy} label="Complétés" value={stats.done} sub="Ce mois" bg="rgba(244,114,182,0.15)" fg="#f472b6" />
            <StatCard icon={TrendingUp} label="Progression" value={`${stats.progress}%`} sub="Continue !" bg="rgba(222,194,163,0.15)" fg={GOLD} />
          </div>
        </section>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 backdrop-blur-2xl" style={{ background: "rgba(15,27,58,0.85)" }}>
        <div className="relative flex items-center justify-around px-2 py-2.5">
          <TabItem icon={HomeIcon} label="Cockpit" active onClick={() => navigate("/app")} />
          <TabItem icon={LayoutGrid} label="Boards" onClick={() => navigate("/app/vision")} />
          <div className="w-14" />
          <TabItem icon={Target} label="Idées" onClick={() => navigate("/app/ideas")} />
          <TabItem icon={User} label="Profil" onClick={() => navigate("/parametres")} />
          <button onClick={() => openBoard({ key: `new_${Date.now()}` })}
            className="absolute left-1/2 -top-5 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #b89566)`, boxShadow: `0 10px 24px -6px ${GOLD}` }}>
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>
      </nav>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, bg, fg }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: bg }}>
        <Icon size={16} style={{ color: fg }} />
      </div>
      <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
      <div className="mt-0.5 font-display text-[20px] font-semibold" style={{ color: fg }}>{value}</div>
      <div className="text-[10.5px] text-white/55">{sub}</div>
    </div>
  );
}

function TabItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition ${active ? "" : "text-white/50 hover:text-white/80"}`}
      style={active ? { color: GOLD } : {}}>
      <Icon size={19} />
      <span className="text-[9.5px] font-semibold">{label}</span>
    </button>
  );
}
