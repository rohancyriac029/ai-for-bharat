// ─── Agent Configuration ───────────────────────────────────────────────────

export const AGENTS = {
  "hype-man": {
    name: "Hype-Man",
    icon: "rocket_launch",
    color: "agent-orange",
    colorHex: "#E8734A",
    bg: "bg-agent-orange/10",
    border: "border-agent-orange/20",
    text: "text-agent-orange",
    borderLeft: "border-l-agent-orange",
  },
  professor: {
    name: "Professor",
    icon: "menu_book",
    color: "agent-indigo",
    colorHex: "#6366f1",
    bg: "bg-agent-indigo/10",
    border: "border-agent-indigo/20",
    text: "text-agent-indigo",
    borderLeft: "border-l-agent-indigo",
  },
  skeptic: {
    name: "Skeptic",
    icon: "gpp_maybe",
    color: "agent-red",
    colorHex: "#ef4444",
    bg: "bg-agent-red/10",
    border: "border-agent-red/20",
    text: "text-agent-red",
    borderLeft: "border-l-agent-red",
  },
  mediator: {
    name: "Mediator",
    icon: "mediation",
    color: "primary",
    colorHex: "#E8734A",
    bg: "bg-primary/10",
    border: "border-primary/20",
    text: "text-primary",
    borderLeft: "border-l-primary",
  },
} as const;

export type AgentName = keyof typeof AGENTS;

// ─── Debate Status ──────────────────────────────────────────────────────────

export const DEBATE_STATUSES = [
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
] as const;

export type DebateStatus = (typeof DEBATE_STATUSES)[number];

// ─── Strategic Path Labels ──────────────────────────────────────────────────

export const PATH_LABELS = ["STRAT-A", "STRAT-B", "STRAT-C"] as const;
export type PathLabel = (typeof PATH_LABELS)[number];

// ─── Model IDs ──────────────────────────────────────────────────────────────

export const BEDROCK_MODEL_ID = "us.anthropic.claude-sonnet-4-5-20250929-v1:0";

// ─── API ─────────────────────────────────────────────────────────────────────

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";

// ─── Session ────────────────────────────────────────────────────────────────

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const SESSION_STORAGE_KEY = "council_session_id";

// ─── Content Formats ────────────────────────────────────────────────────────

export const CONTENT_FORMATS = [
  { value: "", label: "General", icon: "edit_note" },
  { value: "Blog Post", label: "Blog", icon: "article" },
  { value: "Twitter Thread", label: "Thread", icon: "tag" },
  { value: "YouTube Script", label: "YouTube", icon: "play_circle" },
  { value: "Newsletter", label: "Newsletter", icon: "mail" },
  { value: "Ad Copy", label: "Ad Copy", icon: "campaign" },
  { value: "Press Release", label: "Press Release", icon: "newspaper" },
] as const;
