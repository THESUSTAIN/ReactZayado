import React, { useState, useRef, useEffect } from "react";
import {
  Moon,
  Sun,
  ArrowUp,
  MessageSquareDot,
  LineChart,
  TrendingUp,
  Wallet,
  LayoutGrid,
} from "lucide-react";
import { navItems, initialMessages, cannedReplies } from "../mock";
import { DailyReportCard, ValidationCard, ProspectCard } from "./ChatCards";

const iconMap = {
  MessageSquareDot,
  LineChart,
  TrendingUp,
  Wallet,
  LayoutGrid,
};

const TimeLabel = ({ sender, time }) => (
  <div className="mb-2 flex items-center gap-2 px-1">
    <span className="h-1.5 w-1.5 rounded-full bg-[#d6ab3f]" />
    <span className="text-[12px] font-medium text-[#9a9a95] dark:text-[#7d7d7d]">
      {sender} · {time}
    </span>
  </div>
);

const AssistantBubble = ({ text }) => (
  <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-[#f3f2ee] px-4 py-3 text-[14px] leading-relaxed text-[#2a2a28] dark:bg-[#202020] dark:text-[#e2e2e2]">
    {text}
  </div>
);

const UserBubble = ({ text }) => (
  <div className="flex justify-end">
    <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-[#1b1b1b] px-4 py-3 text-[14px] leading-relaxed text-white dark:bg-[#f2f2f2] dark:text-[#1a1a1a]">
      {text}
    </div>
  </div>
);

const ChatPage = () => {
  const [dark, setDark] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [resolved, setResolved] = useState({});
  const [activeNav, setActiveNav] = useState("hub");
  const scrollRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [dark]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCardAction = (msgId, choice) => {
    setResolved((r) => ({
      ...r,
      [msgId]:
        choice.toLowerCase().includes("approuv") ||
        choice.toLowerCase().includes("génér")
          ? `${choice} · Action confirmée`
          : `${choice} · Reporté à plus tard`,
    }));
  };

  const send = () => {
    const value = input.trim();
    if (!value) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
    const userMsg = {
      id: `u-${Date.now()}`,
      type: "user-text",
      time,
      text: value,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTimeout(() => {
      const reply = cannedReplies[Math.floor(Math.random() * cannedReplies.length)];
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          type: "assistant-text",
          sender: "MyExtension AI",
          time,
          text: reply,
        },
      ]);
    }, 700);
  };

  const renderMessage = (msg) => {
    switch (msg.type) {
      case "assistant-text":
        return (
          <div key={msg.id} className="mb-6">
            <TimeLabel sender={msg.sender} time={msg.time} />
            <AssistantBubble text={msg.text} />
          </div>
        );
      case "user-text":
        return (
          <div key={msg.id} className="mb-6">
            <UserBubble text={msg.text} />
          </div>
        );
      case "daily-report":
        return (
          <div key={msg.id} className="mb-6">
            <TimeLabel sender={msg.sender} time={msg.time} />
            <DailyReportCard data={msg} />
          </div>
        );
      case "validation":
        return (
          <div key={msg.id} className="mb-6">
            <TimeLabel sender={msg.sender} time={msg.time} />
            <ValidationCard
              data={msg}
              resolved={resolved[msg.id]}
              onAction={(c) => handleCardAction(msg.id, c)}
            />
          </div>
        );
      case "prospect":
        return (
          <div key={msg.id} className="mb-6">
            <TimeLabel sender={msg.sender} time={msg.time} />
            <ProspectCard
              data={msg}
              resolved={resolved[msg.id]}
              onAction={(c) => handleCardAction(msg.id, c)}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen flex-col bg-white text-[#1a1a1a] dark:bg-[#0f0f0f] dark:text-[#f2f2f2]">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-[#eeece6] px-5 py-3.5 dark:border-[#222]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1b1b1b] text-white dark:bg-[#f2f2f2] dark:text-[#1a1a1a]">
            <MessageSquareDot size={18} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold leading-tight">Hub IA</h1>
            <p className="text-[12px] text-[#9a9a95] dark:text-[#7d7d7d]">
              Votre extension intelligente
            </p>
          </div>
        </div>
        <button
          onClick={() => setDark((d) => !d)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#eeece6] text-[#6a6a66] transition-colors duration-200 hover:bg-[#f5f4f0] dark:border-[#2a2a2a] dark:text-[#c4c4c4] dark:hover:bg-[#1c1c1c]"
          aria-label="Basculer le thème"
        >
          {dark ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
        </button>
      </header>

      {/* Chat scroll area */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-5 py-6">
          {messages.map(renderMessage)}
          <div ref={endRef} />
        </div>
      </main>

      {/* Input */}
      <div className="shrink-0 border-t border-[#eeece6] px-5 py-3 dark:border-[#222]">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Écrivez à votre assistant..."
            className="flex-1 bg-transparent text-[14px] text-[#1a1a1a] placeholder:text-[#a5a5a0] focus:outline-none dark:text-[#f2f2f2] dark:placeholder:text-[#6a6a66]"
          />
          <button
            onClick={send}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1b1b1b] text-white transition-colors duration-200 hover:bg-[#2e2e2e] dark:bg-[#f2f2f2] dark:text-[#1a1a1a] dark:hover:bg-[#dcdcdc]"
            aria-label="Envoyer"
          >
            <ArrowUp size={18} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="shrink-0 border-t border-[#eeece6] dark:border-[#222]">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-5">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon];
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`flex flex-col items-center gap-1 py-3 transition-colors duration-200 ${
                  active
                    ? "text-[#1a1a1a] dark:text-[#f2f2f2]"
                    : "text-[#a5a5a0] hover:text-[#6a6a66] dark:text-[#6a6a66] dark:hover:text-[#a5a5a0]"
                }`}
              >
                <Icon size={20} strokeWidth={1.8} />
                <span className="text-[11px] font-medium">{item.label}</span>
                {active && (
                  <span className="h-1 w-1 rounded-full bg-[#d6ab3f]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default ChatPage;
