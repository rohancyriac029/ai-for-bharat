"use client";

import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from "react";
import { CONTENT_FORMATS } from "@/lib/constants";

interface PromptBarProps {
  onSubmit: (prompt: string, contentFormat?: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const MIN_HEIGHT = 48;  // single-line height
const MAX_HEIGHT = 160; // ~5 lines before scroll kicks in

export function PromptBar({ onSubmit, isLoading = false, disabled = false }: PromptBarProps) {
  const [value, setValue] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const scrollH = el.scrollHeight;
    const clamped = Math.min(Math.max(scrollH, MIN_HEIGHT), MAX_HEIGHT);
    el.style.height = `${clamped}px`;
    el.style.overflowY = scrollH > MAX_HEIGHT ? "auto" : "hidden";
    setIsExpanded(clamped > MIN_HEIGHT);
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading || disabled) return;
    onSubmit(trimmed, selectedFormat || undefined);
    setValue("");
    // reset height after clearing
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = `${MIN_HEIGHT}px`;
        textareaRef.current.style.overflowY = "hidden";
      }
      setIsExpanded(false);
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const lineCount = value.split("\n").length;

  return (
    <div className="px-6 py-4 bg-slate-900/50 border-b border-slate-800 shrink-0">
      <div className="max-w-[1400px] mx-auto flex gap-4 items-end">
        {/* Auto-expanding textarea */}
        <div className="flex-1 relative group">
          <div className={`absolute left-4 transition-all duration-200 text-slate-400 group-focus-within:text-primary ${isExpanded ? "top-3" : "top-3"}`}>
            <span className="material-symbols-outlined">psychology</span>
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
            rows={1}
            className="prompt-textarea w-full pl-12 pr-4 py-3 bg-[#1e202f] border border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none custom-scrollbar disabled:opacity-50 disabled:cursor-not-allowed outline-none"
            style={{ height: MIN_HEIGHT, overflowY: "hidden" }}
            placeholder="Define the prompt for the council debate... e.g., Analyze the Q4 market expansion into Southeast Asia."
          />
          {/* Subtle line counter – only visible when multi-line */}
          <div
            className={`absolute right-3 bottom-2 text-[10px] font-mono tracking-wider transition-all duration-300 ${
              lineCount > 1 ? "opacity-60 translate-y-0" : "opacity-0 translate-y-1"
            } text-slate-500`}
          >
            {lineCount} lines
          </div>
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading || disabled}
          className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>{isLoading ? "CONVENING..." : "CONVENE COUNCIL"}</span>
          <span className={`material-symbols-outlined text-[18px] ${isLoading ? "animate-pulse" : ""}`}>
            groups
          </span>
        </button>
      </div>

      {/* Content Format Selector */}
      <div className="max-w-[1400px] mx-auto mt-3 flex items-center gap-2">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest shrink-0">
          Format:
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {CONTENT_FORMATS.map((fmt) => (
            <button
              key={fmt.value}
              onClick={() => setSelectedFormat(fmt.value)}
              disabled={disabled || isLoading}
              className={`px-3 py-1 text-[11px] font-medium rounded-full border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                selectedFormat === fmt.value
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{fmt.icon}</span>
              {fmt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
