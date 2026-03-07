"use client";

import { motion } from "framer-motion";
import type { StrategicPath } from "@/lib/schemas";

interface PathCardProps {
  path: StrategicPath;
  isSelected: boolean;
  onSelect: () => void;
}

const PATH_ICONS: Record<string, string> = {
  "STRAT-A": "bolt",
  "STRAT-B": "account_tree",
  "STRAT-C": "balance",
};

export function PathCard({ path, isSelected, onSelect }: PathCardProps) {
  const icon = path.icon ?? PATH_ICONS[path.label] ?? "auto_awesome";

  if (isSelected) {
    return (
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="p-4 rounded-xl border-2 border-primary bg-primary/5 cursor-pointer relative"
        onClick={onSelect}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="size-10 rounded-lg bg-primary flex items-center justify-center text-white">
            <span className="material-symbols-outlined">{icon}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary text-white">
              SELECTED
            </span>
            <span className="material-symbols-outlined text-primary text-[18px]">
              check_circle
            </span>
          </div>
        </div>
        <h4 className="text-sm font-bold mb-1 text-primary">{path.title}</h4>
        <p className="text-xs text-slate-400 leading-normal">{path.description}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="p-4 rounded-xl border border-slate-700 bg-[#1e202f] hover:border-primary transition-all cursor-pointer group"
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-500">
          {path.label}
        </span>
      </div>
      <h4 className="text-sm font-bold mb-1 group-hover:text-primary transition-colors">
        {path.title}
      </h4>
      <p className="text-xs text-slate-500 leading-normal">{path.description}</p>
    </motion.div>
  );
}
