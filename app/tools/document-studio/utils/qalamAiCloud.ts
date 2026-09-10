import {
  ACTION_MAX_TOKENS,
  MAX_SELECTION_CHARS,
  QALAM_AI_MODEL_ID,
  QALAM_AI_TIMEOUT_MS,
  buildCloudflareMessages,
  isQalamAiAction,
  type QalamAiAction,
  type QalamAiClientErrorCode,
} from "./qalamAi";

export const MAX_JSON_BODY_BYTES = 8192;

export type QalamAiCloudEnv = {
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_AUTH_TOKEN?: string;
};

export type QalamAiCloudResult = {
  status: number;
  json: { text?: string; error?: string; code?: QalamAiClientErrorCode };
};

export function validateQalamAiRequest(body: unknown):
  | { ok: true; action: QalamAiAction; text: string }
  | { ok: false; status: number; code: QalamAiClientErrorCode; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, code: "invalid", error: "Malformed request." };
  }
  const record = body as Record<string, unknown>;
  if (!isQalamAiAction(record.action)) {
    return { ok: false, status: 400, code: "invalid", error: "Unknown action." };
  }
  if (typeof record.text !== "string") {
    return { ok: false, status: 400, code: "invalid", error: "Text is required." };
  }
  const text = record.text.trim();
  if (!text) {
    return { ok: false, status: 400, code: "invalid", error: "Text is required." };
  }
  if (text.length > MAX_SELECTION_CHARS) {
    return { ok: false, status: 400, code: "invalid", error: "Text exceeds the 2000-character limit." };
  }
  return { ok: true, action: record.action, text };
}

export function cloudflareRunUrl(accountId: string, modelId = QALAM_AI_MODEL_ID): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelId}`;
}

export function extractProviderText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as Record<string, unknown>;
  const result = (root.result ?? root) as unknown;
  if (typeof result === "string") return result.trim();
  if (!result || typeof result !== "object") return "";
  const obj = result as Record<string, unknown>;
  if (typeof obj.response === "string") return obj.response.trim();
  if (typeof obj.text === "string") return obj.text.trim();
  const choices = obj.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
    const choice = choices[0] as { message?: { content?: unknown }; text?: unknown };
    if (typeof choice.message?.content === "string") return choice.message.content.trim();
    if (typeof choice.text === "string") return choice.text.trim();
  }
  return "";
}

export function classifyProviderFailure(status: number, payload: unknown): QalamAiClientErrorCode {
  if (status === 401 || status === 403) return "unavailable";
  if (status === 429) return "limit";
  const blob = JSON.stringify(payload ?? {}).toLowerCase();
  if (blob.includes("quota") || blob.includes("rate limit") || blob.includes("capacity")) return "limit";
  return "failed";
}

function safeError(code: QalamAiClientErrorCode, fallback: string): string {
  if (code === "unavailable") return "Qalam AI is temporarily unavailable.";
  if (code === "limit") return "Qalam AI usage limit has been reached. Please try again later.";
  if (code === "invalid") return fallback;
  return "Qalam AI could not generate a response. Please try again.";
}

export function buildCloudflareRequestBody(action: QalamAiAction, text: string) {
  return {
    messages: buildCloudflareMessages(action, text),
    max_completion_tokens: ACTION_MAX_TOKENS[action],
    temperature: 0.2,
    n: 1,
  };
}

export async function runQalamAiInference(
  body: unknown,
  options?: {
    fetchImpl?: typeof fetch;
    env?: QalamAiCloudEnv;
    timeoutMs?: number;
  },
): Promise<QalamAiCloudResult> {
  const validated = validateQalamAiRequest(body);
  if (!validated.ok) {
    return { status: validated.status, json: { error: validated.error, code: validated.code } };
  }

  const accountId = options?.env?.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = options?.env?.CLOUDFLARE_AUTH_TOKEN?.trim();
  if (!accountId || !token) {
    return { status: 503, json: { error: safeError("unavailable", ""), code: "unavailable" } };
  }

  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? QALAM_AI_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const fetchImpl = options?.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(cloudflareRunUrl(accountId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(buildCloudflareRequestBody(validated.action, validated.text)),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const code = classifyProviderFailure(response.status, payload);
      return { status: code === "limit" ? 429 : code === "unavailable" ? 503 : 502, json: { error: safeError(code, ""), code } };
    }
    const text = extractProviderText(payload);
    if (!text) {
      return { status: 502, json: { error: safeError("failed", ""), code: "failed" } };
    }
    return { status: 200, json: { text } };
  } catch (err) {
    const aborted = err instanceof Error && (err.name === "AbortError" || /aborted/i.test(err.message));
    const code: QalamAiClientErrorCode = aborted ? "failed" : "failed";
    return { status: aborted ? 504 : 502, json: { error: safeError(code, ""), code } };
  } finally {
    clearTimeout(timer);
  }
}
