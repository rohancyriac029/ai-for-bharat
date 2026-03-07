import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "active" | "disconnected" | "connecting";
  label?: string;
  className?: string;
}

const STATUS_CONFIG = {
  active: {
    dot: "bg-emerald-500",
    text: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    label: "Session Active",
  },
  connecting: {
    dot: "bg-primary",
    text: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    label: "Connecting...",
  },
  disconnected: {
    dot: "bg-red-500",
    text: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    label: "Disconnected",
  },
};

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
        cfg.bg,
        cfg.border,
        className
      )}
    >
      <span className={cn("size-2 rounded-full animate-pulse", cfg.dot)} />
      <span className={cn("text-xs font-bold uppercase tracking-wider", cfg.text)}>
        {label ?? cfg.label}
      </span>
    </div>
  );
}
