import { describe, expect, it, vi } from "vitest";
import {
  ACTION_MAX_TOKENS,
  MAX_PROVIDER_CHUNK_CHARS,
  QALAM_AI_MODEL_ID,
  buildCloudflareMessages,
  buildSystemPrompt,
} from "../app/tools/document-studio/utils/qalamAi";
import {
  classifyProviderFailure,
  cloudflareChatUrl,
  extractFinishReason,
  extractProviderText,
  isTruncatedFinishReason,
  runQalamAiInference,
  sanitizeProviderError,
  validateQalamAiRequest,
} from "../app/tools/document-studio/utils/qalamAiCloud";

const ENV = { CLOUDFLARE_ACCOUNT_ID: "acct_test", CLOUDFLARE_AUTH_TOKEN: "token_secret_value" };

function fetchJson(status: number, json: unknown, inspect?: (url: string, init?: RequestInit) => void) {
  return vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    inspect?.(String(url), init);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => json,
    } as Response;
  });
}

describe("Qalam AI cloud inference", () => {
  it("rejects invalid action, empty text, and oversized provider chunks", () => {
    expect(validateQalamAiRequest({ action: "translate", text: "hi" }).ok).toBe(false);
    expect(validateQalamAiRequest({ action: "improve", text: "   " }).ok).toBe(false);
    expect(validateQalamAiRequest({ action: "improve", text: "a".repeat(MAX_PROVIDER_CHUNK_CHARS + 1) }).ok).toBe(false);
    expect(validateQalamAiRequest({ action: "improve", text: "سلام" })).toMatchObject({ ok: true, action: "improve" });
    expect(validateQalamAiRequest({ action: "summarizeCombine", text: "one\n\ntwo" }).ok).toBe(true);
  });

  it("posts to OpenAI-compatible chat completions with the fixed GLM model", async () => {
    let seenUrl = "";
    let seenBody: Record<string, unknown> = {};
    const fetchImpl = fetchJson(200, { choices: [{ message: { content: "done" }, finish_reason: "stop" }] }, (url, init) => {
      seenUrl = url;
      seenBody = JSON.parse(String(init?.body));
    });
    const result = await runQalamAiInference({ action: "summarize", text: "Hello" }, { fetchImpl, env: ENV });
    expect(result.status).toBe(200);
    expect(seenUrl).toBe(cloudflareChatUrl(ENV.CLOUDFLARE_ACCOUNT_ID));
    expect(seenUrl).toContain("/ai/v1/chat/completions");
    expect(seenBody.model).toBe(QALAM_AI_MODEL_ID);
    expect(seenBody.messages).toEqual(buildCloudflareMessages("summarize", "Hello"));
    expect(seenBody.max_completion_tokens).toBe(ACTION_MAX_TOKENS.summarize);
    expect(seenBody.n).toBe(1);
    expect(seenBody.reasoning_effort).toBeNull();
    expect(JSON.stringify(result.json)).not.toContain("token_secret_value");
  });

  it("uses enlarged rewrite token caps", () => {
    expect(ACTION_MAX_TOKENS.improve).toBe(1200);
    expect(ACTION_MAX_TOKENS.formal).toBe(1200);
    expect(ACTION_MAX_TOKENS.simplify).toBe(1000);
    expect(ACTION_MAX_TOKENS.summarize).toBe(300);
    expect(buildSystemPrompt()).toContain("Do not invent facts");
  });

  it("marks finish_reason=length as truncated", async () => {
    expect(extractFinishReason({ choices: [{ finish_reason: "length" }] })).toBe("length");
    expect(isTruncatedFinishReason("length")).toBe(true);
    const fetchImpl = fetchJson(200, { choices: [{ message: { content: "partial" }, finish_reason: "length" }] });
    const result = await runQalamAiInference({ action: "improve", text: "hi" }, { fetchImpl, env: ENV });
    expect(result.status).toBe(200);
    expect(result.json.truncated).toBe(true);
    expect(result.json.text).toBe("partial");
  });

  it("extracts choices[0].message.content and typed text blocks", () => {
    expect(extractProviderText({ choices: [{ message: { content: "  سلام  " } }] })).toBe("سلام");
  });

  it("returns a controlled error for provider 400/500", async () => {
    const fetchImpl = fetchJson(400, { errors: [{ code: "invalid_request", message: "internal boom stack Bearer token_secret_value accounts/acct_test" }] });
    const result = await runQalamAiInference({ action: "improve", text: "user selected secret" }, { fetchImpl, env: ENV, log: () => {} });
    expect(result.status).toBe(502);
    expect(result.json.code).toBe("failed");
    expect(JSON.stringify(result.json)).not.toMatch(/boom stack|token_secret|acct_test|user selected secret/i);
  });

  it("sanitizes diagnostic messages", () => {
    const sanitized = sanitizeProviderError({
      errors: [{ code: 10000, message: "Bearer abc123 failed for accounts/acct_test" }],
    });
    expect(sanitized.message).toContain("Bearer [redacted]");
    expect(sanitized.message).not.toContain("acct_test");
  });

  it("maps quota/rate-limit and auth failures to controlled errors", async () => {
    expect(classifyProviderFailure(429, {})).toBe("limit");
    const limit = await runQalamAiInference({ action: "improve", text: "hi" }, { fetchImpl: fetchJson(429, { errors: [{ message: "quota exceeded" }] }), env: ENV, log: () => {} });
    expect(limit.status).toBe(429);
    const auth = await runQalamAiInference({ action: "improve", text: "hi" }, { fetchImpl: fetchJson(403, { errors: [{ message: "forbidden" }] }), env: ENV, log: () => {} });
    expect(auth.status).toBe(503);
  });

  it("does not call Cloudflare when credentials are missing", async () => {
    const fetchImpl = fetchJson(200, { choices: [{ message: { content: "nope" } }] });
    const result = await runQalamAiInference({ action: "improve", text: "hi" }, { fetchImpl, env: {} });
    expect(result.status).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
