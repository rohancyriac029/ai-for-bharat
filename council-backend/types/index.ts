// ─── Shared TypeScript types for the Lambda backend ────────────────────────

export type AgentName = "hype-man" | "professor" | "skeptic" | "mediator";

export type DebateStatus =
  | "idle"
  | "debating"
  | "mediating"
  | "paths_ready"
  | "path_selected"
  | "drafting"
  | "draft_ready"
  | "error";

export type PathKey = "A" | "B" | "C";
export type PathLabel = "STRAT-A" | "STRAT-B" | "STRAT-C";

export interface StrategicPath {
  label: PathLabel;
  title: string;
  description: string;
  primary_influence: "hype-man" | "professor" | "skeptic";
  icon?: string;
}

export interface DebateMessageRecord {
  agent: AgentName;
  content: string;
  timestamp: string;
  token_count?: number;
  duration_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  round?: number;
}

export interface DebateTranscript {
  session_id: string;
  prompt: string;
  messages: DebateMessageRecord[];
  created_at: string;
}

export interface Annotation {
  id?: string;
  anchor_text: string;
  agent_influence: AgentName;
  explanation: string;
}

export interface FinalDraft {
  session_id: string;
  selected_path: StrategicPath;
  generated_at: string;
  word_count: number;
  content: string;
  annotations: Annotation[];
}

// ── Tension Analysis ───────────────────────────────────────────────────────
export interface TensionPoint {
  topic: string;
  agent_positions: Record<string, string>;
  verdict: "agreement" | "disagreement" | "partial";
}

export interface TensionAnalysis {
  session_id: string;
  summary: string;
  points: TensionPoint[];
  overall_consensus: number; // 0-100
}

// ── WebSocket message types ────────────────────────────────────────────────
export type WSMessageType =
  | "agent_token"
  | "agent_complete"
  | "paths_ready"
  | "draft_ready"
  | "error"
  | "status_update"
  | "tension_analysis";

export interface WSMessage {
  type: WSMessageType;
  sessionId: string;
  agent?: AgentName;
  token?: string;
  paths?: StrategicPath[];
  draft?: FinalDraft;
  status?: DebateStatus;
  error?: string;
  round?: number;
  tensionAnalysis?: TensionAnalysis;
}

export interface SessionRecord {
  session_id: string;
  prompt?: string;
  debate_status: DebateStatus;
  selected_path?: StrategicPath;
  paths?: StrategicPath[];
  connection_ids: string[];
  created_at: string;
  updated_at: string;
  ttl?: number;
  version: number;
}

export interface LambdaEnv {
  SESSIONS_TABLE: string;
  DEBATES_BUCKET: string;
  WS_ENDPOINT: string;
  BEDROCK_FUNCTION_NAME: string;
  BEDROCK_MODEL_ID: string;
  STAGE: string;
}
