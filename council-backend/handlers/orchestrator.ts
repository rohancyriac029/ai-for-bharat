/**
 * orchestrator.ts — Main debate + draft orchestration Lambda.
 *
 * POST /api/sessions/{id}/debate
 *   1. Validate session + prompt
 *   2. Invoke 3 debate agents in parallel (each streams tokens via WS)
 *   3. Invoke Mediator to generate 3 strategic paths
 *   4. Persist transcript to S3, paths to DynamoDB
 *   5. Push PATHS_READY over WebSocket
 *
 * POST /api/sessions/{id}/debate (called again after path selection for draft)
 *   — After session.debate_status transitions to "drafting", this handler
 *     detects the selected_path and generates the annotated draft.
 *
 * This Lambda is invoked synchronously by API Gateway (REST).
 */

import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import * as fs from "fs";
import * as path from "path";
import {
  LambdaClient,
  InvokeCommand,
  InvokeCommandOutput,
} from "@aws-sdk/client-lambda";
import { getSession, updateSessionStatus } from "../lib/dynamo-client";
import { putDebateTranscript, putFinalDraft } from "../lib/s3-client";
import { invokeModelWithRetry } from "../lib/bedrock-client";
import { publishToConnection } from "../lib/ws-publisher";
import { logger } from "../lib/logger";
import type {
  AgentName,
  StrategicPath,
  DebateMessageRecord,
  DebateTranscript,
  FinalDraft,
  Annotation,
  WSMessage,
  TensionAnalysis,
  TensionPoint,
} from "../types";
import type { BedrockHandlerEvent, BedrockHandlerResult } from "./bedrock";

const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? "us-east-1" });
const BEDROCK_FUNCTION = process.env.BEDROCK_FUNCTION_NAME ?? "council-bedrock-agent";

function json(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}

function loadPrompt(name: string): string {
  const filePath = path.join(__dirname, "..", "prompts", `${name}.txt`);
  return fs.readFileSync(filePath, "utf-8").trim();
}

async function invokeBedrockAgent(
  event: BedrockHandlerEvent
): Promise<BedrockHandlerResult> {
  const cmd = new InvokeCommand({
    FunctionName: BEDROCK_FUNCTION,
    InvocationType: "RequestResponse",
    Payload: JSON.stringify(event),
  });
  const res: InvokeCommandOutput = await lambda.send(cmd);
  const payload = Buffer.from(res.Payload ?? new Uint8Array()).toString("utf-8");
  if (res.FunctionError) {
    const errObj = JSON.parse(payload) as { errorMessage?: string; errorType?: string };
    throw new Error(`BedrockAgent [${event.agent}] failed: ${errObj.errorMessage ?? payload}`);
  }
  return JSON.parse(payload) as BedrockHandlerResult;
}

function parsePathsFromMediatorResponse(raw: string): StrategicPath[] {
  // The mediator is instructed to return only valid JSON
  // Strip markdown fences if present
  const cleaned = raw
    .replace(/```json\s*/i, "")
    .replace(/```\s*/g, "")
    .trim();
  const parsed = JSON.parse(cleaned) as {
    pathA: Omit<StrategicPath, "label"> & { label?: string };
    pathB: Omit<StrategicPath, "label"> & { label?: string };
    pathC: Omit<StrategicPath, "label"> & { label?: string };
  };
  return [
    { ...parsed.pathA, label: "STRAT-A" },
    { ...parsed.pathB, label: "STRAT-B" },
    { ...parsed.pathC, label: "STRAT-C" },
  ] as StrategicPath[];
}

const VALID_AGENTS: Set<string> = new Set(["hype-man", "professor", "skeptic", "mediator"]);

function normalizeAgentInfluence(raw: string): AgentName {
  // Handle comma-separated ("professor, skeptic" → take first), uppercase ("HYPE-MAN" → lowercase)
  const first = raw.split(",")[0].trim().toLowerCase();
  return VALID_AGENTS.has(first) ? (first as AgentName) : "mediator";
}

function parseAnnotationsFromDraft(content: string): Annotation[] {
  const re = /\[ANNOTATION:\s*([^|]+)\|([^|]+)\|([^\]]+)\]/g;
  const annotations: Annotation[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    annotations.push({
      anchor_text: match[1].trim(),
      agent_influence: normalizeAgentInfluence(match[2]),
      explanation: match[3].trim(),
    });
  }
  return annotations;
}

/**
 * Main orchestrator handler — routes to debate or draft logic.
 */
export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const sessionId = event.pathParameters?.id;
  if (!sessionId) return json(400, { error: "Missing session id" });

  let body: { prompt?: string; contentFormat?: string } | undefined;
  try {
    body = JSON.parse(event.body ?? "{}") as { prompt?: string; contentFormat?: string };
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const prompt = body?.prompt?.trim();
  const contentFormat = body?.contentFormat?.trim();
  if (!prompt) return json(400, { error: "prompt is required" });

  const session = await getSession(sessionId);
  if (!session) return json(404, { error: "Session not found" });

  const connectionIds = session.connection_ids ?? [];

  // ----- If status is "drafting", generate the annotated draft -----
  if (session.debate_status === "drafting" && session.selected_path) {
    return generateDraft(sessionId, prompt, session.selected_path as StrategicPath, connectionIds, context, contentFormat);
  }

  // ----- Otherwise run the full debate -----
  return runDebate(sessionId, prompt, connectionIds, context, contentFormat);
}

function parseTensionAnalysis(raw: string, sessionId: string): TensionAnalysis | null {
  try {
    const cleaned = raw
      .replace(/```json\s*/i, "")
      .replace(/```\s*/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as {
      summary: string;
      points: TensionPoint[];
      overall_consensus: number;
    };
    return {
      session_id: sessionId,
      summary: parsed.summary,
      points: parsed.points ?? [],
      overall_consensus: Math.min(100, Math.max(0, parsed.overall_consensus ?? 50)),
    };
  } catch {
    return null;
  }
}

async function runDebate(
  sessionId: string,
  prompt: string,
  connectionIds: string[],
  context: Context,
  contentFormat?: string,
): Promise<APIGatewayProxyResult> {
  logger.info("Starting debate", {
    component: "orchestrator",
    session_id: sessionId,
    request_id: context.awsRequestId,
    contentFormat,
  });

  await updateSessionStatus(sessionId, "debating");

  // Notify clients debate is starting
  const startMsg: WSMessage = { type: "status_update", sessionId, status: "debating" };
  await Promise.allSettled(connectionIds.map((cid) => publishToConnection(cid, startMsg)));

  // Build enriched prompt with content format context
  const formatContext = contentFormat
    ? `\n\n[Content Format: ${contentFormat}. Shape your perspective for this specific media format.]`
    : "";
  const enrichedPrompt = prompt + formatContext;

  // ── ROUND 1: Opening Arguments (parallel) ──────────────────────────────
  const agents: AgentName[] = ["hype-man", "professor", "skeptic"];
  const round1Events: BedrockHandlerEvent[] = agents.map((agent) => ({
    sessionId,
    agent,
    userPrompt: enrichedPrompt,
    round: 1,
  }));

  let round1Results: BedrockHandlerResult[];
  try {
    round1Results = await Promise.all(round1Events.map(invokeBedrockAgent));
  } catch (err) {
    logger.error("Round 1 agent invocation failed", {
      component: "orchestrator",
      session_id: sessionId,
      error: String(err),
    });
    await updateSessionStatus(sessionId, "error");
    return json(500, { error: "Agent invocation failed" });
  }

  // ── ROUND 2: Rebuttals (parallel, each agent sees all Round 1 output) ──
  const round1Context = round1Results
    .map((r) => `[${r.agent.toUpperCase()}]: ${r.content}`)
    .join("\n\n");

  const round2Prompt = [
    enrichedPrompt,
    "\n\n--- ROUND 1 POSITIONS ---",
    round1Context,
    "\n\n--- ROUND 2: REBUTTAL ---",
    "You have now seen the other agents' Round 1 arguments above.",
    "Respond directly to their points. Challenge weak arguments, reinforce strong ones,",
    "and refine your own position based on what they said.",
    "Be specific about which agent you're addressing. Keep responses under 150 words.",
  ].join("\n");

  let round2Results: BedrockHandlerResult[];
  try {
    round2Results = await Promise.all(
      agents.map((agent) =>
        invokeBedrockAgent({
          sessionId,
          agent,
          userPrompt: round2Prompt,
          round: 2,
        })
      )
    );
  } catch (err) {
    logger.error("Round 2 agent invocation failed", {
      component: "orchestrator",
      session_id: sessionId,
      error: String(err),
    });
    // Round 2 failure is non-fatal — fall back to Round 1 only
    round2Results = [];
  }

  // ── ROUND 3: Final Positions (parallel, each agent sees Round 1 + 2) ──
  const round2Context = round2Results
    .map((r) => `[${r.agent.toUpperCase()}]: ${r.content}`)
    .join("\n\n");

  const round3Prompt = [
    enrichedPrompt,
    "\n\n--- ROUND 1 POSITIONS ---",
    round1Context,
    "\n\n--- ROUND 2 REBUTTALS ---",
    round2Context,
    "\n\n--- ROUND 3: FINAL POSITION ---",
    "You have now seen everyone's opening arguments AND rebuttals.",
    "Address any points from the rebuttals that were directed at you or that you disagree with.",
    "State your final, refined position on the original topic.",
    "Be concise and decisive. Maximum 100 words.",
  ].join("\n");

  let round3Results: BedrockHandlerResult[] = [];
  if (round2Results.length > 0) {
    try {
      round3Results = await Promise.all(
        agents.map((agent) =>
          invokeBedrockAgent({
            sessionId,
            agent,
            userPrompt: round3Prompt,
            round: 3,
          })
        )
      );
    } catch (err) {
      logger.warn("Round 3 agent invocation failed, continuing without it", {
        component: "orchestrator",
        session_id: sessionId,
        error: String(err),
      });
    }
  }

  // Combine all rounds into transcript messages
  const allMessages: DebateMessageRecord[] = [
    ...round1Results.map((r) => ({
      agent: r.agent,
      content: r.content,
      timestamp: new Date().toISOString(),
      token_count: r.outputTokens,
      round: 1,
    })),
    ...round2Results.map((r) => ({
      agent: r.agent,
      content: r.content,
      timestamp: new Date().toISOString(),
      token_count: r.outputTokens,
      round: 2,
    })),
    ...round3Results.map((r) => ({
      agent: r.agent,
      content: r.content,
      timestamp: new Date().toISOString(),
      token_count: r.outputTokens,
      round: 3,
    })),
  ];

  const transcript: DebateTranscript = {
    session_id: sessionId,
    prompt,
    messages: allMessages,
    created_at: new Date().toISOString(),
  };

  // ── TENSION ANALYSIS (non-fatal) ───────────────────────────────────────
  const fullTranscriptText = allMessages
    .map((m) => `[${m.agent.toUpperCase()} - Round ${m.round ?? 1}]: ${m.content}`)
    .join("\n\n");

  try {
    const tensionSystemPrompt = loadPrompt("tension-analyst");
    const tensionUserMsg = `Original prompt: ${prompt}\n\nFull debate transcript:\n${fullTranscriptText}`;
    const tensionResult = await invokeModelWithRetry({
      systemPrompt: tensionSystemPrompt,
      messages: [{ role: "user", content: tensionUserMsg }],
      maxTokens: 1500,
      temperature: 0.3,
    });
    const tensionAnalysis = parseTensionAnalysis(tensionResult.content, sessionId);
    if (tensionAnalysis) {
      const tensionMsg: WSMessage = { type: "tension_analysis", sessionId, tensionAnalysis };
      await Promise.allSettled(connectionIds.map((cid) => publishToConnection(cid, tensionMsg)));
    }
  } catch (err) {
    logger.warn("Tension analysis failed, continuing without it", {
      component: "orchestrator",
      session_id: sessionId,
      error: String(err),
    });
  }

  // ── MEDIATOR: Synthesize paths ──────────────────────────────────────────
  const mediatorSystemPrompt = loadPrompt("mediator-paths");
  const mediatorUserMessage = `Original prompt: ${prompt}${formatContext}\n\nFull debate transcript (2 rounds):\n${fullTranscriptText}`;

  let paths: StrategicPath[];
  try {
    const mediatorResult = await invokeModelWithRetry({
      systemPrompt: mediatorSystemPrompt,
      messages: [{ role: "user", content: mediatorUserMessage }],
      maxTokens: 2000,
      temperature: 0.4,
    });
    paths = parsePathsFromMediatorResponse(mediatorResult.content);
  } catch (err) {
    logger.error("Mediator path synthesis failed", {
      component: "orchestrator",
      session_id: sessionId,
      error: String(err),
    });
    await updateSessionStatus(sessionId, "error");
    return json(500, { error: "Mediator synthesis failed" });
  }

  // Persist transcript + update session
  await Promise.all([
    putDebateTranscript(sessionId, transcript),
    updateSessionStatus(sessionId, "paths_ready", { paths }),
  ]);

  // Broadcast PATHS_READY
  const pathsMsg: WSMessage = { type: "paths_ready", sessionId, paths };
  await Promise.allSettled(connectionIds.map((cid) => publishToConnection(cid, pathsMsg)));

  logger.info("Debate complete, paths ready", {
    component: "orchestrator",
    session_id: sessionId,
    path_count: paths.length,
    rounds: round2Results.length > 0 ? 2 : 1,
  });

  return json(200, { ok: true, paths });
}

async function generateDraft(
  sessionId: string,
  prompt: string,
  selectedPath: StrategicPath,
  connectionIds: string[],
  context: Context,
  contentFormat?: string,
): Promise<APIGatewayProxyResult> {
  logger.info("Generating annotated draft", {
    component: "orchestrator",
    session_id: sessionId,
    selected_path: selectedPath.label,
    request_id: context.awsRequestId,
    contentFormat,
  });

  // Retrieve transcript from S3
  const { getDebateTranscript } = await import("../lib/s3-client");
  const transcript = await getDebateTranscript(sessionId);

  const transcriptText = transcript
    ? transcript.messages
        .map((m) => `[${m.agent.toUpperCase()}]: ${m.content}`)
        .join("\n\n")
    : "(no transcript available)";

  const mediatorDraftPrompt = loadPrompt("mediator-draft");
  const formatInstruction = contentFormat
    ? `\nContent format: ${contentFormat}. Structure the draft specifically for this media format.`
    : "";
  const userMsg = [
    `Original prompt: ${prompt}`,
    `Selected strategic path: ${selectedPath.label} — ${selectedPath.title}`,
    `Path description: ${selectedPath.description}`,
    `Primary influence: ${selectedPath.primary_influence}`,
    formatInstruction,
    `\nDebate transcript:\n${transcriptText}`,
  ].join("\n\n");

  let draftContent: string;
  try {
    const result = await invokeModelWithRetry({
      systemPrompt: mediatorDraftPrompt,
      messages: [{ role: "user", content: userMsg }],
      maxTokens: 2000,
      temperature: 0.4,
    });
    draftContent = result.content;
  } catch (err) {
    logger.error("Draft generation failed", {
      component: "orchestrator",
      session_id: sessionId,
      error: String(err),
    });
    await updateSessionStatus(sessionId, "error");
    return json(500, { error: "Draft generation failed" });
  }

  const annotations = parseAnnotationsFromDraft(draftContent);
  // Strip annotation markers from display content
  const cleanContent = draftContent
    .replace(/\[ANNOTATION:[^\]]+\]/g, "")
    .trim();

  const finalDraft: FinalDraft = {
    session_id: sessionId,
    selected_path: selectedPath,
    content: cleanContent,
    annotations,
    word_count: cleanContent.split(/\s+/).filter(Boolean).length,
    generated_at: new Date().toISOString(),
  };

  await Promise.all([
    putFinalDraft(sessionId, finalDraft),
    updateSessionStatus(sessionId, "draft_ready"),
  ]);

  // Broadcast DRAFT_READY
  const draftMsg: WSMessage = { type: "draft_ready", sessionId, draft: finalDraft };
  await Promise.allSettled(connectionIds.map((cid) => publishToConnection(cid, draftMsg)));

  logger.info("Draft ready", {
    component: "orchestrator",
    session_id: sessionId,
    word_count: finalDraft.word_count,
    annotation_count: annotations.length,
  });

  return json(200, finalDraft);
}
