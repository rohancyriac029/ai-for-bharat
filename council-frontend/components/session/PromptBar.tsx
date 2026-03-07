"use client";

import { useState, type KeyboardEvent } from "react";
import { CONTENT_FORMATS } from "@/lib/constants";

interface PromptBarProps {
  onSubmit: (prompt: string, contentFormat?: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function PromptBar({ onSubmit, isLoading = false, disabled = false }: PromptBarProps) {
  const [value, setValue] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading || disabled) return;
    onSubmit(trimmed, selectedFormat || undefined);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-6 py-4 bg-slate-900/50 border-b border-slate-800 shrink-0">
      <div className="max-w-[1400px] mx-auto flex gap-4 items-start">
        {/* Textarea with icon */}
        <div className="flex-1 relative group">
          <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-primary transition-colors">
            <span className="material-symbols-outlined">psychology</span>
          </div>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
            rows={1}
            className="w-full pl-12 pr-4 py-3 bg-[#1e202f] border border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm resize-none h-12 custom-scrollbar disabled:opacity-50 disabled:cursor-not-allowed outline-none"
            placeholder="Define the prompt for the council debate... e.g., Analyze the Q4 market expansion into Southeast Asia."
          />
          {/* Icon buttons */}
          <div className="absolute right-3 bottom-2.5 flex items-center gap-1">
            <button
              className="p-1.5 text-slate-400 hover:text-primary rounded transition-colors cursor-pointer"
              title="Voice input"
            >
              <span className="material-symbols-outlined text-[18px]">mic</span>
            </button>
            <button
              className="p-1.5 text-slate-400 hover:text-primary rounded transition-colors cursor-pointer"
              title="Attach file"
            >
              <span className="material-symbols-outlined text-[18px]">attach_file</span>
            </button>
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
