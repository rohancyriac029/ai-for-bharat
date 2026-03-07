import { z } from "zod";

// ─── Strategic Path ──────────────────────────────────────────────────────────

export const StrategicPathSchema = z.object({
  label: z.enum(["STRAT-A", "STRAT-B", "STRAT-C"]),
  title: z.string(),
  description: z.string(),
  primary_influence: z.enum(["hype-man", "professor", "skeptic"]),
  icon: z.string().optional(),
});

export type StrategicPath = z.infer<typeof StrategicPathSchema>;

// ─── Debate Message ──────────────────────────────────────────────────────────

export const DebateMessageSchema = z.object({
  id: z.string(),
  agent: z.enum(["hype-man", "professor", "skeptic", "mediator"]),
  content: z.string(),
  timestamp: z.string(),
  round: z.number().optional(),
});

export type DebateMessage = z.infer<typeof DebateMessageSchema>;

// ─── Annotation ─────────────────────────────────────────────────────────────

export const AnnotationSchema = z.object({
  id: z.string().optional(),
  anchor_text: z.string(),
  agent_influence: z.string(),
  explanation: z.string(),
});

export type Annotation = z.infer<typeof AnnotationSchema>;

// ─── Final Draft ─────────────────────────────────────────────────────────────

export const FinalDraftSchema = z.object({
  session_id: z.string(),
  selected_path: StrategicPathSchema,
  generated_at: z.string(),
  word_count: z.number(),
  content: z.string(),
  annotations: z.array(AnnotationSchema),
});

export type FinalDraft = z.infer<typeof FinalDraftSchema>;

// ─── Tension Analysis ────────────────────────────────────────────────────────

export const TensionPointSchema = z.object({
  topic: z.string(),
  agent_positions: z.record(z.string(), z.string()),
  verdict: z.enum(["agreement", "disagreement", "partial"]),
});

export const TensionAnalysisSchema = z.object({
  session_id: z.string(),
  summary: z.string(),
  points: z.array(TensionPointSchema),
  overall_consensus: z.number(),
});

export type TensionPoint = z.infer<typeof TensionPointSchema>;
export type TensionAnalysis = z.infer<typeof TensionAnalysisSchema>;

// ─── Session State ───────────────────────────────────────────────────────────

export const SessionStateSchema = z.object({
  session_id: z.string().uuid(),
  user_prompt: z.string(),
  debate_status: z.enum([
    "idle",
    "initiated",
    "debating",
    "mediating",
    "paths_ready",
    "path_selected",
    "drafting",
    "draft_ready",
    "completed",
    "error",
  ]),
  selected_path: z.enum(["A", "B", "C"]).nullable(),
  paths: z.array(StrategicPathSchema).nullable(),
});

export type SessionStateResponse = z.infer<typeof SessionStateSchema>;

// ─── WebSocket Messages ───────────────────────────────────────────────────────

export const WSMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("agent_token"),
    sessionId: z.string(),
    agent: z.enum(["hype-man", "professor", "skeptic", "mediator"]),
    token: z.string(),
    round: z.number().optional(),
  }),
  z.object({
    type: z.literal("agent_complete"),
    sessionId: z.string(),
    agent: z.enum(["hype-man", "professor", "skeptic", "mediator"]),
    round: z.number().optional(),
  }),
  z.object({
    type: z.literal("paths_ready"),
    sessionId: z.string(),
    paths: z.array(StrategicPathSchema),
  }),
  z.object({
    type: z.literal("draft_ready"),
    sessionId: z.string(),
    draft: FinalDraftSchema,
  }),
  z.object({
    type: z.literal("status_update"),
    sessionId: z.string(),
    status: z.string(),
  }),
  z.object({
    type: z.literal("error"),
    sessionId: z.string(),
    error: z.string(),
  }),
  z.object({
    type: z.literal("tension_analysis"),
    sessionId: z.string(),
    tensionAnalysis: TensionAnalysisSchema,
  }),
]);

export type WSMessage = z.infer<typeof WSMessageSchema>;

// ─── API Responses ───────────────────────────────────────────────────────────

export const StartSessionResponseSchema = z.object({
  session_id: z.string().uuid(),
});
