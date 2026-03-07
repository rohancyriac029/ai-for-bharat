import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import type { DebateTranscript, FinalDraft } from "../types";

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });

const BUCKET = () => process.env.DEBATES_BUCKET ?? "";

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export async function putDebateTranscript(
  sessionId: string,
  transcript: DebateTranscript
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: `debates/${sessionId}/transcript.json`,
      Body: JSON.stringify(transcript),
      ContentType: "application/json",
    })
  );
}

export async function putFinalDraft(
  sessionId: string,
  draft: FinalDraft
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: `debates/${sessionId}/final_draft.json`,
      Body: JSON.stringify(draft),
      ContentType: "application/json",
    })
  );
}

export async function getDebateTranscript(
  sessionId: string
): Promise<DebateTranscript | null> {
  try {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET(),
        Key: `debates/${sessionId}/transcript.json`,
      })
    );
    const body = await streamToString(result.Body as NodeJS.ReadableStream);
    return JSON.parse(body) as DebateTranscript;
  } catch (err: unknown) {
    const code = (err as { name?: string })?.name;
    if (code === "NoSuchKey" || code === "NotFound") return null;
    throw err;
  }
}

export async function getFinalDraft(sessionId: string): Promise<FinalDraft | null> {
  try {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET(),
        Key: `debates/${sessionId}/final_draft.json`,
      })
    );
    const body = await streamToString(result.Body as NodeJS.ReadableStream);
    return JSON.parse(body) as FinalDraft;
  } catch (err: unknown) {
    const code = (err as { name?: string })?.name;
    if (code === "NoSuchKey" || code === "NotFound") return null;
    throw err;
  }
}
