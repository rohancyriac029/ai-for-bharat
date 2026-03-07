"use client";

import { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { DebateMessage } from "@/components/session/DebateMessage";
import type { DebateMessage as DebateMessageType } from "@/lib/schemas";

interface DebatePanelProps {
  messages: DebateMessageType[];
  isStreaming: boolean;
}

function RoundDivider({ round, label }: { round: number; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 py-2"
    >
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
        <span className="material-symbols-outlined text-primary text-[14px]">
          {round === 1 ? "record_voice_over" : round === 2 ? "forum" : "gavel"}
        </span>
        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
          {label}
        </span>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </motion.div>
  );
}

export function DebatePanel({ messages, isStreaming }: DebatePanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build messages with round dividers
  const messagesWithDividers = useMemo(() => {
    const items: Array<{ type: "message"; msg: DebateMessageType; index: number } | { type: "divider"; round: number; label: string }> = [];
    let currentRound = 0;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const msgRound = msg.round ?? 1;

      if (msgRound !== currentRound) {
        currentRound = msgRound;
        const roundLabels: Record<number, string> = {
          1: "Round 1 — Opening Arguments",
          2: "Round 2 — Rebuttals",
          3: "Round 3 — Final Positions",
        };
        items.push({
          type: "divider",
          round: msgRound,
          label: roundLabels[msgRound] ?? `Round ${msgRound}`,
        });
      }

      items.push({ type: "message", msg, index: i });
    }

    return items;
  }, [messages]);

  return (
    <section className="w-[40%] border-r border-slate-800 flex flex-col bg-[#0D0D0D]">
      {/* Panel header */}
      <div className="px-6 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/30 shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <span className="size-2 bg-agent-indigo rounded-full" />
          Live Debate
        </h3>
        {isStreaming && (
          <span className="text-[10px] font-mono text-slate-500 uppercase animate-pulse">
            Streaming...
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-50">
            <span className="material-symbols-outlined text-4xl text-slate-600">forum</span>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              Awaiting debate...
            </p>
          </div>
        ) : (
          messagesWithDividers.map((item, idx) => {
            if (item.type === "divider") {
              return <RoundDivider key={`divider-${item.round}`} round={item.round} label={item.label} />;
            }
            return (
              <DebateMessage
                key={item.msg.id}
                message={item.msg}
                isLast={idx === messagesWithDividers.length - 1}
              />
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
