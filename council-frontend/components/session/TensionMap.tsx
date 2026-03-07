"use client";

import { motion } from "framer-motion";
import { AGENTS, type AgentName } from "@/lib/constants";
import type { TensionAnalysis } from "@/lib/schemas";

interface TensionMapProps {
  analysis: TensionAnalysis | null;
}

const VERDICT_CONFIG = {
  agreement: {
    label: "Agreement",
    icon: "handshake",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    dot: "bg-emerald-400",
  },
  disagreement: {
    label: "Disagreement",
    icon: "gavel",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
    dot: "bg-red-400",
  },
  partial: {
    label: "Partial",
    icon: "balance",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    dot: "bg-amber-400",
  },
} as const;

function ConsensusBar({ value }: { value: number }) {
  const color =
    value >= 70 ? "bg-emerald-400" : value >= 40 ? "bg-amber-400" : "bg-red-400";
  const textColor =
    value >= 70 ? "text-emerald-400" : value >= 40 ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          Consensus
        </span>
        <span className={`text-xs font-bold font-mono ${textColor}`}>{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

export function TensionMap({ analysis }: TensionMapProps) {
  if (!analysis) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[18px]">analytics</span>
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Debate Analysis
        </h4>
      </div>

      {/* Consensus Bar */}
      <ConsensusBar value={analysis.overall_consensus} />

      {/* Summary */}
      <p className="text-xs text-slate-400 leading-relaxed border-l-2 border-primary/30 pl-3">
        {analysis.summary}
      </p>

      {/* Tension Points */}
      <div className="space-y-3">
        {analysis.points.map((point, i) => {
          const verdict = VERDICT_CONFIG[point.verdict];

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className={`p-3 rounded-lg border ${verdict.border} ${verdict.bg}`}
            >
              {/* Topic + Verdict */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-200">{point.topic}</span>
                <div className="flex items-center gap-1">
                  <span className={`size-1.5 rounded-full ${verdict.dot}`} />
                  <span className={`text-[10px] font-mono ${verdict.color}`}>
                    {verdict.label}
                  </span>
                </div>
              </div>

              {/* Agent Positions */}
              <div className="space-y-1">
                {Object.entries(point.agent_positions).map(([agentKey, position]) => {
                  const agent = AGENTS[agentKey as AgentName];
                  if (!agent) return null;

                  return (
                    <div key={agentKey} className="flex items-start gap-2">
                      <span className={`text-[12px] ${agent.text} shrink-0`}>
                        <span className="material-symbols-outlined text-[12px]">{agent.icon}</span>
                      </span>
                      <span className="text-[11px] text-slate-400 leading-snug">{String(position)}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
