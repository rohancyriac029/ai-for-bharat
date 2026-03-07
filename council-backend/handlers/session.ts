import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { createSession, getSession, updateSessionStatus } from "../lib/dynamo-client";
import { getFinalDraft } from "../lib/s3-client";
import { logger } from "../lib/logger";
import type { SessionRecord, PathKey } from "../types";

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

/**
 * POST /api/sessions/start
 */
export async function startSession(
  _event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const sessionId = uuidv4();
  const now = new Date().toISOString();

  const record: SessionRecord = {
    session_id: sessionId,
    debate_status: "idle",
    connection_ids: [],
    created_at: now,
    updated_at: now,
    ttl: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h
    version: 0,
  };

  await createSession(record);
  logger.info("Session created", {
    component: "session-handler",
    session_id: sessionId,
    request_id: context.awsRequestId,
  });

  return json(201, { session_id: sessionId });
}

/**
 * GET /api/sessions/{id}
 */
export async function getSessionState(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const sessionId = event.pathParameters?.id;
  if (!sessionId) return json(400, { error: "Missing session id" });

  const session = await getSession(sessionId);
  if (!session) return json(404, { error: "Session not found" });

  logger.info("Session retrieved", {
    component: "session-handler",
    session_id: sessionId,
    request_id: context.awsRequestId,
  });

  return json(200, {
    session_id: session.session_id,
    debate_status: session.debate_status,
    selected_path: session.selected_path,
    paths: session.paths,
    created_at: session.created_at,
    updated_at: session.updated_at,
  });
}

/**
 * POST /api/sessions/{id}/select-path
 * Body: { path: "A" | "B" | "C" }
 */
export async function selectPath(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const sessionId = event.pathParameters?.id;
  if (!sessionId) return json(400, { error: "Missing session id" });

  let body: { path?: PathKey };
  try {
    body = JSON.parse(event.body ?? "{}") as { path?: PathKey };
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const { path } = body;
  if (!path || !["A", "B", "C"].includes(path)) {
    return json(400, { error: "path must be A, B, or C" });
  }

  const session = await getSession(sessionId);
  if (!session) return json(404, { error: "Session not found" });

  const selectedPath = session.paths?.find(
    (p) => p.label === `STRAT-${path}`
  );
  if (!selectedPath) return json(400, { error: "Paths not ready yet" });

  await updateSessionStatus(sessionId, "drafting", {
    selected_path: selectedPath,
  });

  logger.info("Path selected", {
    component: "session-handler",
    session_id: sessionId,
    request_id: context.awsRequestId,
    path,
  });

  return json(200, { ok: true, selected_path: selectedPath });
}

/**
 * GET /api/sessions/{id}/draft
 */
export async function getDraft(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const sessionId = event.pathParameters?.id;
  if (!sessionId) return json(400, { error: "Missing session id" });

  const draft = await getFinalDraft(sessionId);
  if (!draft) return json(404, { error: "Draft not ready" });

  logger.info("Draft retrieved", {
    component: "session-handler",
    session_id: sessionId,
    request_id: context.awsRequestId,
  });

  return json(200, draft);
}

/**
 * OPTIONS – CORS preflight
 */
export async function corsOptions(
  _event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,x-session-id",
    },
    body: "",
  };
}

/**
 * Unified router – dispatches all /api/sessions/* routes to the correct handler.
 * Set this as the Lambda handler: handlers/session.handler
 */
export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const { httpMethod, resource } = event;

  if (httpMethod === "OPTIONS") return corsOptions(event);

  // POST /api/sessions/start
  if (resource === "/api/sessions/start" && httpMethod === "POST") {
    return startSession(event, context);
  }

  // GET /api/sessions/{id}
  if (resource === "/api/sessions/{id}" && httpMethod === "GET") {
    return getSessionState(event, context);
  }

  // POST /api/sessions/{id}/select-path
  if (resource === "/api/sessions/{id}/select-path" && httpMethod === "POST") {
    return selectPath(event, context);
  }

  // GET /api/sessions/{id}/draft
  if (resource === "/api/sessions/{id}/draft" && httpMethod === "GET") {
    return getDraft(event, context);
  }

  return json(404, { error: `No handler for ${httpMethod} ${resource}` });
}
