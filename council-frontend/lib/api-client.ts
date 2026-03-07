import { API_BASE_URL, WS_BASE_URL } from "@/lib/constants";
import {
  StartSessionResponseSchema,
  SessionStateSchema,
  FinalDraftSchema,
  WSMessageSchema,
  type FinalDraft,
  type SessionStateResponse,
  type StrategicPath,
  type WSMessage,
  type TensionAnalysis,
} from "@/lib/schemas";
import type { DebateStatus } from "@/lib/constants";

// ─── WebSocket Handlers Interface ─────────────────────────────────────────────

export interface WSHandlers {
  onAgentToken(agent: string, token: string, round?: number): void;
  onAgentComplete(agent: string): void;
  onPathsReady(paths: StrategicPath[]): void;
  onDraftReady(draft: FinalDraft): void;
  onStatusUpdate(status: DebateStatus): void;
  onError(error: string): void;
  onConnectionChange(status: "active" | "disconnected"): void;
  onTensionAnalysis?(analysis: TensionAnalysis): void;
}

export interface WebSocketController {
  disconnect(): void;
  reconnect(): void;
}

// ─── Helper: fetch with basic error handling ──────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── API Client ───────────────────────────────────────────────────────────────

export async function startSession(): Promise<{ session_id: string }> {
  const data = await apiFetch<unknown>("/api/sessions/start", { method: "POST" });
  return StartSessionResponseSchema.parse(data);
}

export async function submitDebate(sessionId: string, prompt: string, contentFormat?: string): Promise<void> {
  await apiFetch(`/api/sessions/${sessionId}/debate`, {
    method: "POST",
    body: JSON.stringify({ prompt, ...(contentFormat && { contentFormat }) }),
  });
}

export async function selectPath(sessionId: string, path: "A" | "B" | "C"): Promise<void> {
  await apiFetch(`/api/sessions/${sessionId}/select-path`, {
    method: "POST",
    body: JSON.stringify({ path }),
  });
}

export async function getSessionState(sessionId: string): Promise<SessionStateResponse> {
  const data = await apiFetch<unknown>(`/api/sessions/${sessionId}`);
  return SessionStateSchema.parse(data);
}

export async function getDraft(sessionId: string): Promise<FinalDraft> {
  const data = await apiFetch<unknown>(`/api/sessions/${sessionId}/draft`);
  return FinalDraftSchema.parse(data);
}

// ─── WebSocket Client ─────────────────────────────────────────────────────────

const MAX_RETRIES = 5;

export function connectWebSocket(
  sessionId: string,
  handlers: WSHandlers
): WebSocketController {
  let ws: WebSocket | null = null;
  let retryCount = 0;
  let intentionalClose = false;

  function connect() {
    const url = `${WS_BASE_URL}?sessionId=${encodeURIComponent(sessionId)}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      retryCount = 0;
      handlers.onConnectionChange("active");
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const raw = JSON.parse(event.data as string) as unknown;
        const msg: WSMessage = WSMessageSchema.parse(raw);

        switch (msg.type) {
          case "agent_token":
            handlers.onAgentToken(msg.agent, msg.token, msg.round);
            break;
          case "agent_complete":
            handlers.onAgentComplete(msg.agent);
            break;
          case "paths_ready":
            handlers.onPathsReady(msg.paths);
            break;
          case "draft_ready":
            handlers.onDraftReady(msg.draft);
            break;
          case "status_update":
            handlers.onStatusUpdate(msg.status as DebateStatus);
            break;
          case "error":
            handlers.onError(msg.error);
            break;
          case "tension_analysis":
            handlers.onTensionAnalysis?.(msg.tensionAnalysis);
            break;
        }
      } catch {
        console.warn("[WS] Failed to parse message:", event.data);
      }
    };

    ws.onclose = () => {
      handlers.onConnectionChange("disconnected");
      if (!intentionalClose && retryCount < MAX_RETRIES) {
        const backoff = Math.pow(2, retryCount) * 500;
        retryCount++;
        setTimeout(connect, backoff);
      }
    };

    ws.onerror = (err) => {
      console.error("[WS] Error:", err);
    };
  }

  connect();

  return {
    disconnect() {
      intentionalClose = true;
      ws?.close();
    },
    reconnect() {
      intentionalClose = false;
      retryCount = 0;
      ws?.close();
    },
  };
}
