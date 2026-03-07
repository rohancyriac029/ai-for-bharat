"use client";

import { motion } from "framer-motion";

const AGENTS = [
  {
    version: "Optimist v4",
    versionColor: "text-primary",
    versionBorder: "border-primary/30",
    topBorder: "border-t-primary",
    name: "The Hype-Man",
    description:
      "Focuses on market traction, positive velocity, and exponential scaling opportunities.",
    icon: "rocket_launch",
    iconBg: "bg-primary/20",
    iconColor: "text-primary",
    bias: "BIAS: BULLISH",
  },
  {
    version: "Academic v1",
    versionColor: "text-slate-400",
    versionBorder: "border-slate-500/30",
    topBorder: "border-t-slate-500",
    name: "The Professor",
    description:
      "Prioritizes historical precedence, structural integrity, and long-term sustainability.",
    icon: "menu_book",
    iconBg: "bg-slate-500/20",
    iconColor: "text-slate-400",
    bias: "BIAS: ANALYTICAL",
  },
  {
    version: "Critical v2",
    versionColor: "text-red-500",
    versionBorder: "border-red-500/30",
    topBorder: "border-t-red-500",
    name: "The Skeptic",
    description:
      "Identifies system vulnerabilities, tail risks, and logical fallacies in real-time.",
    icon: "security",
    iconBg: "bg-red-500/20",
    iconColor: "text-red-500",
    bias: "BIAS: BEARISH",
  },
];

export function AgentRosterSection() {
  return (
    <section className="py-24 border-t border-border-dark">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
        <div className="max-w-xl">
          <h2 className="text-3xl font-bold text-white mb-4">Meet the Council</h2>
          <p className="text-slate-400">
            Select your active roster. Each agent brings a specialized heuristic
            filter to the debate floor.
          </p>
        </div>
        <a
          href="#"
          className="text-primary text-sm font-bold flex items-center gap-2 hover:underline"
        >
          View Agent Catalog
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </a>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {AGENTS.map((agent, i) => (
          <motion.div
            key={agent.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className={`bg-card-dark border border-border-dark ${agent.topBorder} border-t-4 rounded-xl p-8 hover:bg-border-dark/30 transition-all cursor-pointer`}
          >
            {/* Version + more options */}
            <div className="flex justify-between items-start mb-6">
              <div
                className={`font-mono text-[10px] px-2 py-0.5 border rounded uppercase tracking-tighter ${agent.versionColor} ${agent.versionBorder}`}
              >
                {agent.version}
              </div>
              <span className="material-symbols-outlined text-slate-600">more_horiz</span>
            </div>

            {/* Name + description */}
            <h4 className="text-xl font-bold text-white mb-2">{agent.name}</h4>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              {agent.description}
            </p>

            {/* Footer */}
            <div className="pt-6 border-t border-border-dark flex items-center gap-3">
              <div
                className={`size-8 rounded-full ${agent.iconBg} flex items-center justify-center`}
              >
                <span className={`material-symbols-outlined ${agent.iconColor} text-sm`}>
                  {agent.icon}
                </span>
              </div>
              <span className="text-xs font-mono text-slate-500 tracking-widest">
                {agent.bias}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
