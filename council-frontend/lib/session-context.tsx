"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type {
  DebateMessage,
  StrategicPath,
  FinalDraft,
  TensionAnalysis,
} from "@/lib/schemas";
import type { DebateStatus } from "@/lib/constants";
import { SESSION_STORAGE_KEY } from "@/lib/constants";

// ─── State ───────────────────────────────────────────────────────────────────

interface SessionState {
  sessionId: string | null;
  prompt: string;
  debateStatus: DebateStatus;
  messages: DebateMessage[];
  paths: StrategicPath[] | null;
  selectedPath: "A" | "B" | "C" | null;
  finalDraft: FinalDraft | null;
  wsStatus: "connecting" | "active" | "disconnected";
  tensionAnalysis: TensionAnalysis | null;
  currentDebateRound: number;
}

const initialState: SessionState = {
  sessionId: null,
  prompt: "",
  debateStatus: "idle",
  messages: [],
  paths: null,
  selectedPath: null,
  finalDraft: null,
  wsStatus: "disconnected",
  tensionAnalysis: null,
  currentDebateRound: 1,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_SESSION_ID"; payload: string }
  | { type: "SET_PROMPT"; payload: string }
  | { type: "SET_DEBATE_STATUS"; payload: DebateStatus }
  | { type: "APPEND_TOKEN"; agent: DebateMessage["agent"]; token: string; timestamp: string; round?: number }
  | { type: "FINALIZE_MESSAGE"; agent: DebateMessage["agent"] }
  | { type: "SET_PATHS"; payload: StrategicPath[] }
  | { type: "SELECT_PATH"; payload: "A" | "B" | "C" }
  | { type: "SET_FINAL_DRAFT"; payload: FinalDraft }
  | { type: "SET_WS_STATUS"; payload: "connecting" | "active" | "disconnected" }
  | { type: "SET_TENSION_ANALYSIS"; payload: TensionAnalysis }
  | { type: "SET_DEBATE_ROUND"; payload: number }
  | { type: "RESET" };

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "SET_SESSION_ID":
      // New session: wipe all session-scoped state so stale debate/draft don't bleed through
      return {
        ...initialState,
        sessionId: action.payload,
        wsStatus: state.wsStatus,
      };
    case "SET_PROMPT":
      return { ...state, prompt: action.payload };
    case "SET_DEBATE_STATUS":
      return { ...state, debateStatus: action.payload };
    case "APPEND_TOKEN": {
      const roundNum = action.round ?? state.currentDebateRound;
      const streamingId = `streaming-${action.agent}-r${roundNum}`;
      const existing = state.messages.find(
        (m) => m.id === streamingId
      );
      if (existing) {
        return {
          ...state,
          currentDebateRound: roundNum,
          messages: state.messages.map((m) =>
            m.id === streamingId
              ? { ...m, content: m.content + action.token }
              : m
          ),
        };
      }
      return {
        ...state,
        currentDebateRound: roundNum,
        messages: [
          ...state.messages,
          {
            id: streamingId,
            agent: action.agent,
            content: action.token,
            timestamp: action.timestamp,
            round: roundNum,
          },
        ],
      };
    }
    case "FINALIZE_MESSAGE": {
      // Finalize the latest streaming message for this agent (any round)
      const streamR1 = `streaming-${action.agent}-r1`;
      const streamR2 = `streaming-${action.agent}-r2`;
      const streamR3 = `streaming-${action.agent}-r3`;
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === streamR1 || m.id === streamR2 || m.id === streamR3
            ? { ...m, id: `${action.agent}-r${m.round ?? 1}-${Date.now()}` }
            : m
        ),
      };
    }
    case "SET_PATHS":
      return { ...state, paths: action.payload };
    case "SELECT_PATH":
      return { ...state, selectedPath: action.payload };
    case "SET_FINAL_DRAFT":
      return { ...state, finalDraft: action.payload };
    case "SET_WS_STATUS":
      return { ...state, wsStatus: action.payload };
    case "SET_TENSION_ANALYSIS":
      return { ...state, tensionAnalysis: action.payload };
    case "SET_DEBATE_ROUND":
      return { ...state, currentDebateRound: action.payload };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface SessionContextValue {
  state: SessionState;
  setSessionId: (id: string) => void;
  setPrompt: (prompt: string) => void;
  setDebateStatus: (status: DebateStatus) => void;
  appendToken: (agent: DebateMessage["agent"], token: string, timestamp: string, round?: number) => void;
  finalizeMessage: (agent: DebateMessage["agent"]) => void;
  setPaths: (paths: StrategicPath[]) => void;
  selectPath: (path: "A" | "B" | "C") => void;
  setFinalDraft: (draft: FinalDraft) => void;
  setWsStatus: (status: "connecting" | "active" | "disconnected") => void;
  setTensionAnalysis: (analysis: TensionAnalysis) => void;
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (storedId) {
      dispatch({ type: "SET_SESSION_ID", payload: storedId });
    }
  }, []);

  // Persist sessionId to localStorage whenever it changes
  useEffect(() => {
    if (state.sessionId) {
      localStorage.setItem(SESSION_STORAGE_KEY, state.sessionId);
    }
  }, [state.sessionId]);

  const setSessionId = useCallback((id: string) => dispatch({ type: "SET_SESSION_ID", payload: id }), []);
  const setPrompt = useCallback((p: string) => dispatch({ type: "SET_PROMPT", payload: p }), []);
  const setDebateStatus = useCallback((s: DebateStatus) => dispatch({ type: "SET_DEBATE_STATUS", payload: s }), []);
  const appendToken = useCallback((agent: DebateMessage["agent"], token: string, timestamp: string, round?: number) =>
    dispatch({ type: "APPEND_TOKEN", agent, token, timestamp, round }), []);
  const finalizeMessage = useCallback((agent: DebateMessage["agent"]) =>
    dispatch({ type: "FINALIZE_MESSAGE", agent }), []);
  const setPaths = useCallback((paths: StrategicPath[]) => dispatch({ type: "SET_PATHS", payload: paths }), []);
  const selectPath = useCallback((path: "A" | "B" | "C") => dispatch({ type: "SELECT_PATH", payload: path }), []);
  const setFinalDraft = useCallback((draft: FinalDraft) => dispatch({ type: "SET_FINAL_DRAFT", payload: draft }), []);
  const setWsStatus = useCallback((s: "connecting" | "active" | "disconnected") =>
    dispatch({ type: "SET_WS_STATUS", payload: s }), []);
  const setTensionAnalysis = useCallback((analysis: TensionAnalysis) =>
    dispatch({ type: "SET_TENSION_ANALYSIS", payload: analysis }), []);
  const reset = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    dispatch({ type: "RESET" });
  }, []);

  return (
    <SessionContext.Provider
      value={{
        state,
        setSessionId,
        setPrompt,
        setDebateStatus,
        appendToken,
        finalizeMessage,
        setPaths,
        selectPath,
        setFinalDraft,
        setWsStatus,
        setTensionAnalysis,
        reset,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
