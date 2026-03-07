"use client";

import { motion } from "framer-motion";
import { AGENTS, type AgentName } from "@/lib/constants";
import { formatTimestamp } from "@/lib/utils";
import type { DebateMessage as DebateMessageType } from "@/lib/schemas";

interface DebateMessageProps {
  message: DebateMessageType;
  isLast?: boolean;
}

export function DebateMessage({ message, isLast = false }: DebateMessageProps) {
  const agent = AGENTS[message.agent as AgentName];
  if (!agent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, x: -8 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex gap-4 group"
    >
      {/* Icon + timeline connector */}
      <div className="shrink-0 flex flex-col items-center gap-1">
        <div
          className={`size-10 rounded-lg ${agent.bg} border ${agent.border} flex items-center justify-center ${agent.text}`}
        >
          <span className="material-symbols-outlined">{agent.icon}</span>
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-slate-800" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase tracking-tight ${agent.text}`}>
            {agent.name}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
        <div
          className={`bg-[#1e202f] p-4 rounded-xl rounded-tl-none border-l-4 ${agent.borderLeft} shadow-sm`}
        >
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    </motion.div>
  );
}
