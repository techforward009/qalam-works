import {
  ACTION_MAX_TOKENS,
  MAX_PROVIDER_CHUNK_CHARS,
  QALAM_AI_MODEL_ID,
  QALAM_AI_TIMEOUT_MS,
  buildCloudflareMessages,
  isServerQalamAiAction,
  type QalamAiClientErrorCode,
  type ServerQalamAiAction,
} from "./qalamAi";

export const MAX_JSON_BODY_BYTES = 16384;

export type QalamAiCloudEnv = {
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_AUTH_TOKEN?: string;
};

export type QalamAiCloudResult = {
  status: number;
  json: { text?: string; truncated?: boolean; error?: string; code?: QalamAiClientErrorCode };
};

type ProviderLogger = (message: string, details: { status: number; code?: string; message?: string }) => void;

export function validateQalamAiRequest(body: unknown):
  | { ok: true; action: ServerQalamAiAction; text: string }
  | { ok: false; status: number; code: QalamAiClientErrorCode; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, code: "invalid", error: "Malformed request." };
  }
  const record = body as Record<string, unknown>;
  if (!isServerQalamAiAction(record.action)) {
    return { ok: false, status: 400, code: "invalid", error: "Unknown action." };
  }
  if (typeof record.text !== "string") {
    return { ok: false, status: 400, code: "invalid", error: "Text is required." };
  }
  const text = record.text.trim();
  if (!text) {
    return { ok: false, status: 400, code: "invalid", error: "Text is required." };
  }
  if (text.length > MAX_PROVIDER_CHUNK_CHARS) {
    return { ok: false, status: 400, code: "invalid", error: "Text exceeds the processing limit." };
  }
  return { ok: true, action: record.action, text };
}

export function cloudflareChatUrl(accountId: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function extractTextBlocks(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((block) => {
      const item = asRecord(block);
      if (!item) return "";
      if (typeof item.type === "string" && item.type !== "text") return "";
      return typeof item.text === "string" ? item.text : "";
    })
    .join("")
    .trim();
}

export function extractProviderText(payload: unknown): string {
  const root = asRecord(payload);
  const result = asRecord(root?.result) ?? root;
  const choices = result && Array.isArray(result.choices) ? result.choices : root && Array.isArray(root.choices) ? root.choices : [];
  const first = asRecord(choices[0]);
  const message = asRecord(first?.message);
  if (message) {
    const fromContent = extractTextBlocks(message.content);
    if (fromContent) return fromContent;
  }
  if (typeof first?.text === "string" && first.text.trim()) return first.text.trim();
  if (typeof result?.response === "string" && result.response.trim()) return result.response.trim();
  return "";
}

export function extractFinishReason(payload: unknown): string | null {
  const root = asRecord(payload);
  const result = asRecord(root?.result) ?? root;
  const choices = result && Array.isArray(result.choices) ? result.choices : root && Array.isArray(root.choices) ? root.choices : [];
  const first = asRecord(choices[0]);
  const reason = first?.finish_reason ?? first?.native_finish_reason;
  return typeof reason === "string" ? reason : null;
}

export function isTruncatedFinishReason(reason: string | null): boolean {
  return reason === "length" || reason === "max_tokens";
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
  if (code === "truncated") return "Qalam AI could not finish this section. Please try again.";
  return "Qalam AI could not generate a response. Please try again.";
}

export function sanitizeProviderError(payload: unknown): { code?: string; message?: string } {
  const root = asRecord(payload);
  const firstError = Array.isArray(root?.errors) ? asRecord(root.errors[0]) : null;
  const errorObj = asRecord(root?.error) ?? firstError;
  const codeRaw = errorObj?.code ?? root?.code;
  const messageRaw = errorObj?.message ?? root?.message;
  const code = typeof codeRaw === "string" || typeof codeRaw === "number" ? String(codeRaw).slice(0, 80) : undefined;
  let message = typeof messageRaw === "string" ? messageRaw : undefined;
  if (message) {
    message = message
      .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
      .replace(/accounts\/[A-Za-z0-9_-]+/gi, "accounts/[redacted]")
      .slice(0, 180);
  }
  return { code, message };
}

export function buildCloudflareRequestBody(action: ServerQalamAiAction, text: string) {
  return {
    model: QALAM_AI_MODEL_ID,
    messages: buildCloudflareMessages(action, text),
    max_completion_tokens: ACTION_MAX_TOKENS[action],
    temperature: 0.2,
    n: 1,
    reasoning_effort: null,
    chat_template_kwargs: { enable_thinking: false },
  };
}

export async function runQalamAiInference(
  body: unknown,
  options?: {
    fetchImpl?: typeof fetch;
    env?: QalamAiCloudEnv;
    timeoutMs?: number;
    log?: ProviderLogger;
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

  const log: ProviderLogger = options?.log ?? ((message, details) => console.error(message, details));
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? QALAM_AI_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const fetchImpl = options?.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(cloudflareChatUrl(accountId), {
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
      const sanitized = sanitizeProviderError(payload);
      log("Qalam AI provider error", { status: response.status, code: sanitized.code, message: sanitized.message });
      const code = classifyProviderFailure(response.status, payload);
      return { status: code === "limit" ? 429 : code === "unavailable" ? 503 : 502, json: { error: safeError(code, ""), code } };
    }
    const text = extractProviderText(payload);
    const truncated = isTruncatedFinishReason(extractFinishReason(payload));
    if (!text) {
      log("Qalam AI provider error", { status: response.status, code: truncated ? "truncated" : "empty-output" });
      return { status: 502, json: { error: safeError(truncated ? "truncated" : "failed", ""), code: truncated ? "truncated" : "failed", truncated } };
    }
    return { status: 200, json: { text, truncated: truncated || undefined } };
  } catch (err) {
    const aborted = err instanceof Error && (err.name === "AbortError" || /aborted/i.test(err.message));
    log("Qalam AI provider error", { status: aborted ? 504 : 502, code: aborted ? "timeout" : "network" });
    return { status: aborted ? 504 : 502, json: { error: safeError("failed", ""), code: "failed" } };
  } finally {
    clearTimeout(timer);
  }
}
