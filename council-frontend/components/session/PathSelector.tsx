"use client";

import { PathCard } from "@/components/session/PathCard";
import { TensionMap } from "@/components/session/TensionMap";
import type { StrategicPath, TensionAnalysis } from "@/lib/schemas";

interface PathSelectorProps {
  paths: StrategicPath[] | null;
  selectedPath: "A" | "B" | "C" | null;
  onSelectPath: (path: "A" | "B" | "C") => void;
  tensionAnalysis?: TensionAnalysis | null;
}

const LABEL_TO_KEY: Record<string, "A" | "B" | "C"> = {
  "STRAT-A": "A",
  "STRAT-B": "B",
  "STRAT-C": "C",
};

export function PathSelector({ paths, selectedPath, onSelectPath, tensionAnalysis }: PathSelectorProps) {
  const hasPaths = paths && paths.length > 0;
  const hasTension = tensionAnalysis && tensionAnalysis.points.length > 0;
  const isEmpty = !hasPaths && !hasTension;

  return (
    <section className="w-[30%] border-r border-slate-800 flex flex-col bg-slate-900/20">
      {/* Panel header */}
      <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/50 shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {hasTension && !hasPaths ? "Debate Analysis" : "Choose Your Path"}
        </h3>
      </div>

      {/* Path cards */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-50">
            <span className="material-symbols-outlined text-4xl text-slate-600">
              account_tree
            </span>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              Awaiting synthesis...
            </p>
          </div>
        ) : (
          <>
            {/* Tension Map (shows above paths when available) */}
            {hasTension && (
              <div className={hasPaths ? "pb-4 mb-4 border-b border-slate-800" : ""}>
                <TensionMap analysis={tensionAnalysis} />
              </div>
            )}

            {/* Strategic Paths */}
            {hasPaths &&
              paths.map((path) => (
                <PathCard
                  key={path.label}
                  path={path}
                  isSelected={selectedPath === LABEL_TO_KEY[path.label]}
                  onSelect={() => onSelectPath(LABEL_TO_KEY[path.label])}
                />
              ))
            }
          </>
        )}
      </div>
    </section>
  );
}
