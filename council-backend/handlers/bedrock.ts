/**
 * bedrock.ts — Direct-invoked Lambda.
 * Invoked by the Orchestrator for each agent debate turn.
 * Streams tokens back to connected WebSocket clients as it receives them.
 */
import type { Context } from "aws-lambda";
import * as fs from "fs";
import * as path from "path";
import { invokeModelStreamingWithRetry } from "../lib/bedrock-client";
import { publishToConnection } from "../lib/ws-publisher";
import { getSession } from "../lib/dynamo-client";
import { logger } from "../lib/logger";
import type { AgentName, WSMessage } from "../types";

// Agent-specific Bedrock parameters
const AGENT_CONFIG: Record<
  AgentName,
  { temperature: number; maxTokens: number }
> = {
  "hype-man": { temperature: 0.9, maxTokens: 800 },
  professor: { temperature: 0.3, maxTokens: 900 },
  skeptic: { temperature: 0.5, maxTokens: 800 },
  mediator: { temperature: 0.4, maxTokens: 2000 },
};

function loadPrompt(name: string): string {
  const filePath = path.join(__dirname, "..", "prompts", `${name}.txt`);
  return fs.readFileSync(filePath, "utf-8").trim();
}

export interface BedrockHandlerEvent {
  sessionId: string;
  agent: AgentName;
  userPrompt: string;
  /** Previous messages in the debate (for multi-turn context) */
  previousMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  /** Debate round number (1 = opening, 2 = rebuttal) */
  round?: number;
}

export interface BedrockHandlerResult {
  agent: AgentName;
  content: string;
  inputTokens: number;
  outputTokens: number;
}

export async function handler(
  event: BedrockHandlerEvent,
  context: Context
): Promise<BedrockHandlerResult> {
  const { sessionId, agent, userPrompt, previousMessages = [], round } = event;

  logger.info("Bedrock agent handler invoked", {
    component: "bedrock-handler",
    session_id: sessionId,
    agent,
    request_id: context.awsRequestId,
  });

  const systemPrompt = loadPrompt(agent);
  const agentCfg = AGENT_CONFIG[agent];

  // Retrieve active WebSocket connections for streaming
  const session = await getSession(sessionId);
  const connectionIds = session?.connection_ids ?? [];

  // Build message chain
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...previousMessages,
    { role: "user", content: userPrompt },
  ];

  const onToken = async (token: string): Promise<void> => {
    const wsMsg: WSMessage = {
      type: "agent_token",
      sessionId,
      agent,
      token,
      round,
    };
    await Promise.allSettled(
      connectionIds.map((cid) => publishToConnection(cid, wsMsg))
    );
  };

  const result = await invokeModelStreamingWithRetry(
    {
      systemPrompt,
      messages,
      maxTokens: agentCfg.maxTokens,
      temperature: agentCfg.temperature,
    },
    onToken
  );

  // Notify clients that this agent is done
  const completeMsg: WSMessage = {
    type: "agent_complete",
    sessionId,
    agent,
    round,
  };
  await Promise.allSettled(
    connectionIds.map((cid) => publishToConnection(cid, completeMsg))
  );

  logger.info("Bedrock agent complete", {
    component: "bedrock-handler",
    session_id: sessionId,
    agent,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });

  return {
    agent,
    content: result.content,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}
