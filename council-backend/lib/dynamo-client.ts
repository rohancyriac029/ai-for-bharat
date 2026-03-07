import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { SessionRecord } from "../types";

const raw = new DynamoDBClient({ region: process.env.AWS_REGION ?? "us-east-1" });
const dynamo = DynamoDBDocumentClient.from(raw);

const TABLE = () => process.env.SESSIONS_TABLE ?? "council_sessions";

export async function getSession(sessionId: string): Promise<SessionRecord | null> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: TABLE(),
      Key: { session_id: sessionId },
    })
  );
  return (result.Item as SessionRecord) ?? null;
}

export async function createSession(session: SessionRecord): Promise<void> {
  await dynamo.send(
    new PutCommand({
      TableName: TABLE(),
      Item: session,
      ConditionExpression: "attribute_not_exists(session_id)",
    })
  );
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionRecord["debate_status"],
  extra?: Partial<Record<string, unknown>>
): Promise<void> {
  const now = new Date().toISOString();
  const setExprParts = ["#st = :status", "updated_at = :now", "#ver = #ver + :one"];
  const names: Record<string, string> = { "#st": "debate_status", "#ver": "version" };
  const values: Record<string, unknown> = {
    ":status": status,
    ":now": now,
    ":one": 1,
  };

  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      setExprParts.push(`${k} = :${k}`);
      values[`:${k}`] = v;
    }
  }

  await dynamo.send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { session_id: sessionId },
      UpdateExpression: `SET ${setExprParts.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}

export async function addConnectionId(
  sessionId: string,
  connectionId: string
): Promise<void> {
  const now = new Date().toISOString();
  await dynamo.send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { session_id: sessionId },
      UpdateExpression:
        "SET connection_ids = list_append(if_not_exists(connection_ids, :empty), :cid), updated_at = :now",
      ExpressionAttributeValues: {
        ":empty": [],
        ":cid": [connectionId],
        ":now": now,
      },
    })
  );
}

export async function removeConnectionId(
  sessionId: string,
  connectionId: string
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;
  const updated = (session.connection_ids ?? []).filter((id) => id !== connectionId);
  await dynamo.send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { session_id: sessionId },
      UpdateExpression: "SET connection_ids = :ids, updated_at = :now",
      ExpressionAttributeValues: {
        ":ids": updated,
        ":now": new Date().toISOString(),
      },
    })
  );
}
