import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/format";

export default function StatusPill({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        statusTone(value),
        className,
      )}
    >
      {value}
    </span>
  );
}
