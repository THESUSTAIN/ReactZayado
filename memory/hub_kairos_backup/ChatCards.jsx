import React from "react";
import { Sun, ShieldCheck, UserPlus } from "lucide-react";

const IABadge = () => (
  <span className="shrink-0 rounded-md border border-[#e7dfc8] bg-[#faf6e9] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#b78a1a] dark:border-[#3a3320] dark:bg-[#2a2413] dark:text-[#d6ab3f]">
    IA
  </span>
);

const CardShell = ({ children }) => (
  <div className="w-full max-w-full rounded-2xl border border-[#eceae4] bg-[#faf9f6] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-[#2a2a2a] dark:bg-[#171717]">
    {children}
  </div>
);

const IconWrap = ({ children }) => (
  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#eceae4] bg-white text-[#3a3a3a] dark:border-[#2f2f2f] dark:bg-[#202020] dark:text-[#d8d8d8]">
    {children}
  </div>
);

export const DailyReportCard = ({ data }) => (
  <CardShell>
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <IconWrap>
          <Sun size={18} strokeWidth={1.8} />
        </IconWrap>
        <div>
          <h3 className="text-[15px] font-semibold leading-tight text-[#1a1a1a] dark:text-[#f2f2f2]">
            {data.title}
          </h3>
          <p className="mt-0.5 text-[13px] text-[#8a8a85] dark:text-[#8f8f8f]">
            {data.date}
          </p>
        </div>
      </div>
      <IABadge />
    </div>

    <p className="mt-4 text-[13.5px] leading-relaxed text-[#4a4a48] dark:text-[#c4c4c4]">
      {data.summary}
    </p>

    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {data.stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-[#eceae4] bg-white px-4 py-3 dark:border-[#2a2a2a] dark:bg-[#1c1c1c]"
        >
          <p className="text-[12px] text-[#8a8a85] dark:text-[#8f8f8f]">{s.label}</p>
          <p className="mt-1 text-[17px] font-semibold text-[#1a1a1a] dark:text-[#f2f2f2]">
            {s.value}
          </p>
          <p
            className={`mt-0.5 text-[12px] ${
              s.positive
                ? "text-[#b78a1a] dark:text-[#d6ab3f]"
                : "text-[#a5a5a0] dark:text-[#7d7d7d]"
            }`}
          >
            {s.delta}
          </p>
        </div>
      ))}
    </div>
  </CardShell>
);

const ActionButtons = ({ primary, secondary, onAction, resolved }) => {
  if (resolved) {
    return (
      <div className="mt-4 rounded-xl bg-[#f1f0ec] px-4 py-2.5 text-[13px] font-medium text-[#6a6a66] dark:bg-[#242424] dark:text-[#9a9a9a]">
        {resolved}
      </div>
    );
  }
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr]">
      <button
        onClick={() => onAction(primary)}
        className="rounded-xl bg-[#1b1b1b] px-4 py-3 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-[#2e2e2e] dark:bg-[#f2f2f2] dark:text-[#1a1a1a] dark:hover:bg-[#dcdcdc]"
      >
        {primary}
      </button>
      <button
        onClick={() => onAction(secondary)}
        className="rounded-xl border border-[#e2e0d9] bg-white px-4 py-3 text-[14px] font-medium text-[#3a3a3a] transition-colors duration-200 hover:bg-[#f5f4f0] dark:border-[#2f2f2f] dark:bg-[#1c1c1c] dark:text-[#d8d8d8] dark:hover:bg-[#242424]"
      >
        {secondary}
      </button>
    </div>
  );
};

export const ValidationCard = ({ data, onAction, resolved }) => (
  <CardShell>
    <div className="flex items-start gap-3">
      <IconWrap>
        <ShieldCheck size={18} strokeWidth={1.8} />
      </IconWrap>
      <div>
        <h3 className="text-[15px] font-semibold leading-tight text-[#1a1a1a] dark:text-[#f2f2f2]">
          {data.title}
        </h3>
        <p className="mt-0.5 text-[13px] text-[#8a8a85] dark:text-[#8f8f8f]">
          {data.subtitle}
        </p>
      </div>
    </div>
    <p className="mt-4 text-[13.5px] leading-relaxed text-[#4a4a48] dark:text-[#c4c4c4]">
      {data.text}
    </p>
    <ActionButtons
      primary={data.primary}
      secondary={data.secondary}
      onAction={onAction}
      resolved={resolved}
    />
  </CardShell>
);

export const ProspectCard = ({ data, onAction, resolved }) => (
  <CardShell>
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <IconWrap>
          <UserPlus size={18} strokeWidth={1.8} />
        </IconWrap>
        <div>
          <h3 className="text-[15px] font-semibold leading-tight text-[#1a1a1a] dark:text-[#f2f2f2]">
            {data.title}
          </h3>
          <p className="mt-0.5 text-[13px] text-[#8a8a85] dark:text-[#8f8f8f]">
            {data.subtitle}
          </p>
        </div>
      </div>
      <IABadge />
    </div>
    <p className="mt-4 text-[13.5px] leading-relaxed text-[#4a4a48] dark:text-[#c4c4c4]">
      {data.text}
    </p>
    <ActionButtons
      primary={data.primary}
      secondary={data.secondary}
      onAction={onAction}
      resolved={resolved}
    />
  </CardShell>
);
