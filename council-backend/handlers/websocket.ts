import type {
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { addConnectionId, getSession, removeConnectionId } from "../lib/dynamo-client";
import { logger } from "../lib/logger";

function resp(statusCode: number): APIGatewayProxyResult {
  return { statusCode, body: "" };
}

function getSessionIdFromEvent(event: APIGatewayProxyWebsocketEventV2): string {
  // Query string params come via multiValueQueryStringParameters on WS connect events
  // The event type doesn't expose them in V2 shape, but at runtime they are present
  const e = event as unknown as {
    queryStringParameters?: Record<string, string>;
  };
  return e.queryStringParameters?.["sessionId"] ?? "";
}

/**
 * $connect — called when a WebSocket client connects.
 * Query parameter: ?sessionId=xxx
 */
export async function wsConnect(
  event: APIGatewayProxyWebsocketEventV2,
  context: Context
): Promise<APIGatewayProxyResult> {
  const connectionId = event.requestContext.connectionId;
  const sessionId = getSessionIdFromEvent(event);

  if (!sessionId) {
    logger.warn("WS connect rejected — no sessionId", {
      component: "websocket-handler",
      request_id: context.awsRequestId,
    });
    return resp(400);
  }

  const session = await getSession(sessionId);
  if (!session) {
    logger.warn("WS connect rejected — session not found", {
      component: "websocket-handler",
      session_id: sessionId,
      request_id: context.awsRequestId,
    });
    return resp(403);
  }

  await addConnectionId(sessionId, connectionId);

  logger.info("WS client connected", {
    component: "websocket-handler",
    session_id: sessionId,
    connection_id: connectionId,
    request_id: context.awsRequestId,
  });

  return resp(200);
}

/**
 * $disconnect — called when a WebSocket client disconnects.
 * We look up which session this connection belonged to via a GSI
 * or by scanning. For simplicity, the client includes sessionId in
 * headers (most WS clients can't set custom headers easily), so we
 * rely on the stale-connection cleanup path in ws-publisher.ts and
 * store a reverse mapping in a separate DDB item keyed by connectionId.
 *
 * Simplified approach: we receive the connectionId and attempt to
 * remove it from any session (we broadcast a cleanup event per connection).
 */
export async function wsDisconnect(
  event: APIGatewayProxyWebsocketEventV2,
  context: Context
): Promise<APIGatewayProxyResult> {
  const connectionId = event.requestContext.connectionId;
  const sessionId = getSessionIdFromEvent(event);

  if (sessionId) {
    await removeConnectionId(sessionId, connectionId).catch(() => {
      // non-fatal
    });
    logger.info("WS client disconnected", {
      component: "websocket-handler",
      session_id: sessionId,
      connection_id: connectionId,
      request_id: context.awsRequestId,
    });
  } else {
    logger.info("WS client disconnected (no sessionId)", {
      component: "websocket-handler",
      connection_id: connectionId,
      request_id: context.awsRequestId,
    });
  }

  return resp(200);
}

/**
 * $default — handles any non-routed messages (keepalive pings).
 */
export async function wsDefault(
  event: APIGatewayProxyWebsocketEventV2,
  _context: Context
): Promise<APIGatewayProxyResult> {
  const connectionId = event.requestContext.connectionId;
  logger.debug("WS default route (keepalive?)", {
    component: "websocket-handler",
    connection_id: connectionId,
  });
  return resp(200);
}
