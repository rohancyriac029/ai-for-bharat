"use client";

import { useMemo } from "react";
import { ReasoningTooltip } from "@/components/session/ReasoningTooltip";
import type { FinalDraft } from "@/lib/schemas";
import { wordCount } from "@/lib/utils";

interface FinalDraftPanelProps {
  draft: FinalDraft | null;
  onCopy: () => void;
  onGenerate: () => void;
  isGenerating?: boolean;
  isComplete?: boolean;
}

// Parse [ANNOTATION: anchor | influence | explanation] markers from content
function parseContent(content: string, annotations: FinalDraft["annotations"]): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const annotationMap = new Map(annotations.map((a) => [a.anchor_text, a]));

  // Split by double newlines for paragraphs
  const paragraphs = content.split(/\n\n+/);

  paragraphs.forEach((para, pi) => {
    // Replace [ANNOTATION: ...] markers with tooltip spans
    const MARKER_RE = /\[ANNOTATION:\s*([^|]+)\|([^|]+)\|([^\]]+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    let paraText = para;

    // First try structured annotation matching
    let remaining = paraText;
    for (const [anchorText, ann] of annotationMap) {
      if (remaining.includes(anchorText)) {
        const idx = remaining.indexOf(anchorText);
        if (idx > 0) parts.push(remaining.slice(0, idx));
        parts.push(
          <ReasoningTooltip
            key={`${pi}-${anchorText}`}
            anchorText={anchorText}
            explanation={ann.explanation}
          />
        );
        remaining = remaining.slice(idx + anchorText.length);
      }
    }

    if (parts.length > 0) {
      if (remaining) parts.push(remaining);
      nodes.push(
        <p key={pi} className="text-sm leading-relaxed text-slate-400">
          {parts}
        </p>
      );
    } else {
      // Try inline [ANNOTATION: ...] syntax
      const inlineParts: React.ReactNode[] = [];
      lastIndex = 0;
      while ((match = MARKER_RE.exec(para)) !== null) {
        if (match.index > lastIndex) {
          inlineParts.push(para.slice(lastIndex, match.index));
        }
        inlineParts.push(
          <ReasoningTooltip
            key={`${pi}-${match.index}`}
            anchorText={match[1].trim()}
            explanation={match[3].trim()}
          />
        );
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < para.length) inlineParts.push(para.slice(lastIndex));
      nodes.push(
        <p key={pi} className="text-sm leading-relaxed text-slate-400">
          {inlineParts.length > 0 ? inlineParts : para}
        </p>
      );
    }
  });

  return nodes;
}

export function FinalDraftPanel({ draft, onCopy, onGenerate, isGenerating = false, isComplete = false }: FinalDraftPanelProps) {
  const words = draft ? draft.word_count : 0;
  const contentNodes = useMemo(
    () => (draft ? parseContent(draft.content, draft.annotations) : null),
    [draft]
  );

  return (
    <section className="w-[30%] flex flex-col bg-background-dark">
      {/* Panel header */}
      <div className="px-6 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/30 shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Final Draft</h3>
        <div className="flex gap-2">
          {words > 0 && (
            <span className="text-[10px] font-mono text-slate-400">{words} WORDS</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {!draft ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-50">
            <span className="material-symbols-outlined text-4xl text-slate-600">
              description
            </span>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              Select a path to generate draft...
            </p>
          </div>
        ) : (
          <div className="max-w-prose mx-auto space-y-6">
            <h1 className="text-xl font-bold leading-tight tracking-tight">
              {draft.content.split("\n")[0] ?? "Executive Draft"}
            </h1>
            {contentNodes}
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="p-4 border-t border-slate-800 bg-[#111111] shrink-0">
        <div className="flex gap-2">
          <button
            onClick={onCopy}
            disabled={!draft}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
            COPY TEXT
          </button>
          <button
            onClick={onGenerate}
            disabled={isGenerating || isComplete}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-white text-xs font-bold rounded-lg transition-colors disabled:cursor-not-allowed cursor-pointer ${
              isComplete
                ? "bg-emerald-600/80 disabled:opacity-100"
                : "bg-primary hover:bg-primary/90 disabled:opacity-60"
            }`}
          >
            <span className={`material-symbols-outlined text-[18px] ${isGenerating ? "animate-spin" : ""}`}>
              {isComplete ? "check_circle" : isGenerating ? "progress_activity" : "auto_fix_high"}
            </span>
            {isComplete ? "DRAFT COMPLETE" : isGenerating ? "GENERATING..." : "GENERATE DRAFT"}
          </button>
        </div>
      </div>
    </section>
  );
}
