"use client";

import { useEffect, useCallback, useRef } from "react";
import { SessionHeader } from "@/components/layout/SessionHeader";
import { PromptBar } from "@/components/session/PromptBar";
import { DebatePanel } from "@/components/session/DebatePanel";
import { PathSelector } from "@/components/session/PathSelector";
import { FinalDraftPanel } from "@/components/session/FinalDraftPanel";
import { SessionProvider, useSession } from "@/lib/session-context";
import { startSession, submitDebate, selectPath, connectWebSocket } from "@/lib/api-client";
import type { WebSocketController } from "@/lib/api-client";

// ─── Inner workspace (needs SessionContext) ───────────────────────────────────

function WorkspaceInner() {
  const { state, setSessionId, setPrompt, setDebateStatus, appendToken, finalizeMessage, setPaths, selectPath: ctxSelectPath, setFinalDraft, setWsStatus, setTensionAnalysis } = useSession();
  const wsRef = useRef<WebSocketController | null>(null);
  // Store prompt and contentFormat in refs so callbacks always access latest values
  const promptRef = useRef<string>("");
  const contentFormatRef = useRef<string | undefined>(undefined);
  const isStreaming = state.debateStatus === "debating" || state.debateStatus === "mediating";
  const isBusy = isStreaming || state.debateStatus === "initiated" || state.debateStatus === "drafting";
  const isDraftComplete = state.debateStatus === "completed" || state.debateStatus === "draft_ready";

  // Connect WebSocket once we have a sessionId
  useEffect(() => {
    if (!state.sessionId) return;

    const controller = connectWebSocket(state.sessionId, {
      onAgentToken(agent, token, round) {
        appendToken(agent as Parameters<typeof appendToken>[0], token, new Date().toISOString(), round);
      },
      onAgentComplete(agent) {
        finalizeMessage(agent as Parameters<typeof finalizeMessage>[0]);
      },
      onPathsReady(paths) {
        setPaths(paths);
        setDebateStatus("paths_ready");
      },
      onDraftReady(draft) {
        setFinalDraft(draft);
        setDebateStatus("completed");
      },
      onStatusUpdate(status) {
        setDebateStatus(status);
      },
      onError(error) {
        console.error("[COUNCIL WS]", error);
      },
      onConnectionChange(status) {
        setWsStatus(status);
      },
      onTensionAnalysis(analysis) {
        setTensionAnalysis(analysis);
      },
    });

    wsRef.current = controller;
    setWsStatus("connecting");

    return () => {
      controller.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sessionId]);

  // Handle prompt submission — always creates a new session so each submit
  // is a clean slate (avoids stale draft/messages from a previous session).
  const handleSubmit = useCallback(
    async (prompt: string, contentFormat?: string) => {
      try {
        // Disconnect stale WS before creating new session
        wsRef.current?.disconnect();
        wsRef.current = null;
        const { session_id } = await startSession();
        setSessionId(session_id); // also resets messages/paths/draft via reducer
        promptRef.current = prompt;
        contentFormatRef.current = contentFormat;
        setPrompt(prompt);
        setDebateStatus("debating");

        // Fire-and-forget: the orchestrator Lambda runs 60-120s but API Gateway
        // times out at 29s with a 504. WS handles all real-time status updates.
        submitDebate(session_id, prompt, contentFormat).catch((err) => {
          console.warn("[COUNCIL] submitDebate HTTP error (Lambda still running):", err);
        });
      } catch (err) {
        console.error("[COUNCIL] Failed to start session:", err);
        setDebateStatus("idle");
      }
    },
    [setSessionId, setPrompt, setDebateStatus]
  );

  // Handle path selection — immediately triggers draft generation so the user
  // doesn't need to click a separate "Generate" button.
  const handleSelectPath = useCallback(
    async (path: "A" | "B" | "C") => {
      if (!state.sessionId) return;
      ctxSelectPath(path);
      try {
        await selectPath(state.sessionId, path);
        // Backend has now set debate_status = "drafting"; kick off generation.
        if (!promptRef.current) return;
        setDebateStatus("drafting");

        // Fire-and-forget: draft generation may exceed API Gateway 29s timeout.
        submitDebate(state.sessionId, promptRef.current, contentFormatRef.current).catch((err) => {
          console.warn("[COUNCIL] submitDebate HTTP error (Lambda still running):", err);
        });
      } catch (err) {
        console.error("[COUNCIL] Failed to select path:", err);
        setDebateStatus("paths_ready");
      }
    },
    [state.sessionId, ctxSelectPath, setDebateStatus]
  );

  // Handle generate draft – retry button; also relies on promptRef so it
  // works even if state.prompt has a stale value.
  const handleGenerate = useCallback(async () => {
    if (!state.sessionId || !state.selectedPath || !promptRef.current) return;
    setDebateStatus("drafting");

    // Fire-and-forget: draft generation may exceed API Gateway 29s timeout.
    submitDebate(state.sessionId, promptRef.current, contentFormatRef.current).catch((err) => {
      console.warn("[COUNCIL] submitDebate HTTP error (Lambda still running):", err);
    });
  }, [state.sessionId, state.selectedPath, setDebateStatus]);

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    if (!state.finalDraft) return;
    navigator.clipboard.writeText(state.finalDraft.content).catch(console.error);
  }, [state.finalDraft]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background-dark text-slate-100">
      <SessionHeader wsStatus={state.wsStatus} />

      <PromptBar
        onSubmit={handleSubmit}
        isLoading={state.debateStatus === "initiated"}
        disabled={isBusy}
      />

      <div className="flex-1 flex overflow-hidden">
        <DebatePanel messages={state.messages} isStreaming={isStreaming} />
        <PathSelector
          paths={state.paths}
          selectedPath={state.selectedPath}
          onSelectPath={handleSelectPath}
          tensionAnalysis={state.tensionAnalysis}
        />
        <FinalDraftPanel
          draft={state.finalDraft}
          onCopy={handleCopy}
          onGenerate={handleGenerate}
          isGenerating={
            state.selectedPath !== null &&
            (state.debateStatus === "initiated" || state.debateStatus === "debating" || state.debateStatus === "drafting")
          }
          isComplete={isDraftComplete}
        />
      </div>
    </div>
  );
}

// ─── Export with SessionProvider wrapper ─────────────────────────────────────

export function SessionWorkspace() {
  return (
    <SessionProvider>
      <WorkspaceInner />
    </SessionProvider>
  );
}
