import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import type { WSMessage } from "../types";

let client: ApiGatewayManagementApiClient | null = null;

function getClient(): ApiGatewayManagementApiClient {
  if (!client) {
    const endpoint = process.env.WS_ENDPOINT;
    if (!endpoint) throw new Error("WS_ENDPOINT not set");
    client = new ApiGatewayManagementApiClient({ endpoint });
  }
  return client;
}

export async function publishToConnection(
  connectionId: string,
  message: WSMessage
): Promise<void> {
  const api = getClient();
  const data = JSON.stringify(message);
  try {
    await api.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(data),
      })
    );
  } catch (err: unknown) {
    // 410 Gone = stale connection, skip
    if ((err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode === 410) {
      return;
    }
    throw err;
  }
}

export async function broadcastToConnections(
  connectionIds: string[],
  message: WSMessage
): Promise<void> {
  await Promise.allSettled(
    connectionIds.map((id) => publishToConnection(id, message))
  );
}
