import { cn } from "@/lib/utils";

interface AgentBadgeProps {
  version: string;
  bias: string;
  colorClass?: string;
  borderClass?: string;
}

export function AgentBadge({ version, bias, colorClass = "text-primary", borderClass = "border-primary/30" }: AgentBadgeProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className={cn("font-mono text-[10px] px-2 py-0.5 border rounded uppercase tracking-tighter", colorClass, borderClass)}>
        {version}
      </div>
      <span className="text-xs font-mono text-slate-500 tracking-widest">{bias}</span>
    </div>
  );
}
