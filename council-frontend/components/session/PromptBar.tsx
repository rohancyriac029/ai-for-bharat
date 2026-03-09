"use client";

import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type ChangeEvent } from "react";
import { CONTENT_FORMATS } from "@/lib/constants";

interface PromptBarProps {
  onSubmit: (prompt: string, contentFormat?: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

// ─── Attachment helpers ────────────────────────────────────────────────────────

interface AttachedFile {
  name: string;
  sizeBytes: number;
  charCount: number;
  text: string;
  status: "ok" | "warn" | "error";
  message?: string;
}

const MAX_FILE_BYTES  = 10 * 1024 * 1024; // 10 MB hard limit on raw file
const WARN_TEXT_CHARS = 20_000;            // soft warning threshold
const MAX_TEXT_CHARS  = 80_000;            // hard limit on extracted text

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

async function extractFileText(file: File): Promise<string> {
  if (file.name.endsWith(".txt") || file.type === "text/plain") {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsText(file, "utf-8");
    });
  }
  if (file.name.endsWith(".pdf") || file.type === "application/pdf") {
    // Lazy-load pdfjs only when needed to keep initial bundle small
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).href;
    const buffer = await file.arrayBuffer();
    const doc    = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pages: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page    = await doc.getPage(p);
      const content = await page.getTextContent();
      const text    = content.items
        .filter((item) => "str" in item)
        .map((item) => (item as { str: string }).str)
        .join(" ");
      pages.push(text);
    }
    return pages.join("\n\n");
  }
  throw new Error("Only .txt and .pdf files are supported.");
}

// ─── Textarea sizing ───────────────────────────────────────────────────────────

const MIN_HEIGHT = 48;
const MAX_HEIGHT = 160;

// ─── Component ─────────────────────────────────────────────────────────────────

export function PromptBar({ onSubmit, isLoading = false, disabled = false }: PromptBarProps) {
  const [value, setValue]           = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [attachment, setAttachment] = useState<AttachedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const scrollH  = el.scrollHeight;
    const clamped  = Math.min(Math.max(scrollH, MIN_HEIGHT), MAX_HEIGHT);
    el.style.height      = `${clamped}px`;
    el.style.overflowY   = scrollH > MAX_HEIGHT ? "auto" : "hidden";
  }, []);

  useEffect(() => { autoResize(); }, [value, autoResize]);

  // ─── File selection ──────────────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = ""; // allow re-select
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setAttachment({
        name: file.name, sizeBytes: file.size,
        charCount: 0, text: "", status: "error",
        message: `File too large (${fmtBytes(file.size)}). Max allowed: 10 MB.`,
      });
      return;
    }

    setIsProcessing(true);
    try {
      const text      = await extractFileText(file);
      const charCount = text.length;
      let status: AttachedFile["status"] = "ok";
      let message: string | undefined;

      if (charCount > MAX_TEXT_CHARS) {
        status  = "error";
        message = `Extracted text too long (${charCount.toLocaleString()} chars). Trim to under ${MAX_TEXT_CHARS.toLocaleString()} chars to fit the model context window.`;
      } else if (charCount > WARN_TEXT_CHARS) {
        status  = "warn";
        message = `Large document (${charCount.toLocaleString()} chars) — consider trimming to key sections for best debate quality.`;
      }

      setAttachment({ name: file.name, sizeBytes: file.size, charCount, text, status, message });
    } catch (err) {
      setAttachment({
        name: file.name, sizeBytes: file.size,
        charCount: 0, text: "", status: "error",
        message: err instanceof Error ? err.message : "Failed to read file.",
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    const trimmed = value.trim();
    const hasFile = attachment !== null && attachment.status !== "error" && attachment.text.length > 0;
    if ((!trimmed && !hasFile) || isLoading || disabled || isProcessing) return;

    let finalPrompt = trimmed;
    if (hasFile) {
      const docBlock = `\n\n--- ATTACHED: ${attachment!.name} ---\n${attachment!.text}\n--- END OF DOCUMENT ---`;
      finalPrompt = trimmed ? `${trimmed}${docBlock}` : `Analyse the following document:${docBlock}`;
    }

    onSubmit(finalPrompt, selectedFormat || undefined);
    setValue("");
    setAttachment(null);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = `${MIN_HEIGHT}px`;
        textareaRef.current.style.overflowY = "hidden";
      }
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit =
    (value.trim().length > 0 || (attachment !== null && attachment.status !== "error" && attachment.text.length > 0))
    && !isLoading && !disabled && !isProcessing;

  const lineCount = value.split("\n").length;

  // ─── Attachment chip colours ─────────────────────────────────────────────────

  const chipCls =
    attachment?.status === "error"
      ? "bg-red-500/10 border-red-500/30 text-red-400"
      : attachment?.status === "warn"
        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
        : "bg-primary/10 border-primary/30 text-primary";

  const btnCls =
    attachment
      ? attachment.status === "error"
        ? "border-red-500/50 bg-red-500/10 text-red-400"
        : attachment.status === "warn"
          ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
          : "border-primary/40 bg-primary/10 text-primary"
      : "border-slate-700 bg-[#1e202f] text-slate-400 hover:border-slate-500 hover:text-slate-300";

  return (
    <div className="px-6 py-4 bg-slate-900/50 border-b border-slate-800 shrink-0">
      <div className="max-w-[1400px] mx-auto flex gap-4 items-end">

        {/* Auto-expanding textarea */}
        <div className="flex-1 relative group">
          <div className="absolute left-4 top-3 text-slate-400 group-focus-within:text-primary transition-colors duration-200">
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
            className={`absolute right-3 bottom-2 text-[10px] font-mono tracking-wider transition-all duration-300 pointer-events-none ${
              lineCount > 1 ? "opacity-60 translate-y-0" : "opacity-0 translate-y-1"
            } text-slate-500`}
          >
            {lineCount} lines
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || isLoading || isProcessing}
        />

        {/* Attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading || isProcessing}
          title="Attach .txt or .pdf (max 10 MB)"
          className={`h-12 w-12 flex items-center justify-center rounded-xl border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${btnCls}`}
        >
          {isProcessing
            ? <span className="material-symbols-outlined text-[20px] animate-spin" style={{ animationDuration: "0.9s" }}>progress_activity</span>
            : <span className="material-symbols-outlined text-[20px]">attach_file</span>
          }
        </button>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>{isLoading ? "CONVENING..." : "CONVENE COUNCIL"}</span>
          <span className={`material-symbols-outlined text-[18px] ${isLoading ? "animate-pulse" : ""}`}>
            groups
          </span>
        </button>
      </div>

      {/* Attachment chip — slides in when a file is attached */}
      {attachment && (
        <div className="max-w-[1400px] mx-auto mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-mono max-w-full ${chipCls}`}>
            <span className="material-symbols-outlined text-[13px] shrink-0">
              {attachment.status === "error" ? "error" : attachment.status === "warn" ? "warning" : "description"}
            </span>
            <span className="truncate max-w-[160px]" title={attachment.name}>{attachment.name}</span>
            {attachment.charCount > 0 && (
              <span className="opacity-60 shrink-0">{attachment.charCount.toLocaleString()} chars</span>
            )}
            <span className="opacity-50 shrink-0">·</span>
            <span className="opacity-60 shrink-0">{fmtBytes(attachment.sizeBytes)}</span>
            {attachment.message && (
              <span className="opacity-80 truncate max-w-[280px]" title={attachment.message}>
                · {attachment.message}
              </span>
            )}
            <button
              onClick={() => setAttachment(null)}
              className="ml-1 shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              title="Remove attachment"
            >
              <span className="material-symbols-outlined text-[13px]">close</span>
            </button>
          </div>
        </div>
      )}


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
