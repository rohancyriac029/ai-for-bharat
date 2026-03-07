import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";

// Amazon Nova Pro — no Marketplace subscription required
export const MODEL_ID = "us.amazon.nova-pro-v1:0";

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? "us-east-1" });

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface InvokeParams {
  systemPrompt: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
  temperature?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isThrottleError(err: unknown): boolean {
  const name = (err as { name?: string })?.name ?? "";
  return (
    name === "ThrottlingException" ||
    name === "TooManyRequestsException" ||
    name === "ServiceUnavailableException"
  );
}

export interface InvokeResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

export async function invokeModelWithRetry(
  params: InvokeParams,
  maxRetries = 3
): Promise<InvokeResult> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await bedrock.send(
        new ConverseCommand({
          modelId: MODEL_ID,
          system: [{ text: params.systemPrompt }],
          messages: params.messages.map((m) => ({
            role: m.role,
            content: [{ text: m.content }],
          })),
          inferenceConfig: {
            maxTokens: params.maxTokens ?? 2048,
            temperature: params.temperature ?? 0.7,
          },
        })
      );
      const text =
        response.output?.message?.content
          ?.map((c) => ("text" in c ? c.text : ""))
          .join("") ?? "";
      return {
        content: text,
        inputTokens: response.usage?.inputTokens ?? 0,
        outputTokens: response.usage?.outputTokens ?? 0,
      };
    } catch (err) {
      lastErr = err;
      if (!isThrottleError(err) || attempt === maxRetries) break;
      await sleep(Math.pow(2, attempt) * 500);
    }
  }
  throw lastErr;
}

export async function invokeModelStreamingWithRetry(
  params: InvokeParams,
  onToken: (token: string) => Promise<void>,
  maxRetries = 3
): Promise<InvokeResult> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await bedrock.send(
        new ConverseStreamCommand({
          modelId: MODEL_ID,
          system: [{ text: params.systemPrompt }],
          messages: params.messages.map((m) => ({
            role: m.role,
            content: [{ text: m.content }],
          })),
          inferenceConfig: {
            maxTokens: params.maxTokens ?? 2048,
            temperature: params.temperature ?? 0.7,
          },
        })
      );

      let fullText = "";
      let inputTokens = 0;
      let outputTokens = 0;

      for await (const event of response.stream ?? []) {
        if (event.contentBlockDelta?.delta?.text) {
          const token = event.contentBlockDelta.delta.text;
          fullText += token;
          await onToken(token);
        }
        if (event.metadata?.usage) {
          inputTokens = event.metadata.usage.inputTokens ?? 0;
          outputTokens = event.metadata.usage.outputTokens ?? 0;
        }
      }

      return { content: fullText, inputTokens, outputTokens };
    } catch (err) {
      lastErr = err;
      if (!isThrottleError(err) || attempt === maxRetries) break;
      await sleep(Math.pow(2, attempt) * 500);
    }
  }
  throw lastErr;
}
