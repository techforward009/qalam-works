import { describe, expect, it, vi } from "vitest";
import {
  ACTION_MAX_TOKENS,
  QALAM_AI_MODEL_ID,
  buildCloudflareMessages,
  buildSystemPrompt,
} from "../app/tools/document-studio/utils/qalamAi";
import {
  classifyProviderFailure,
  cloudflareChatUrl,
  extractProviderText,
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
  it("rejects invalid action, empty text, and oversized text", () => {
    expect(validateQalamAiRequest({ action: "translate", text: "hi" }).ok).toBe(false);
    expect(validateQalamAiRequest({ action: "improve", text: "   " }).ok).toBe(false);
    expect(validateQalamAiRequest({ action: "improve", text: "a".repeat(2001) }).ok).toBe(false);
    expect(validateQalamAiRequest({ action: "improve", text: "سلام" })).toMatchObject({ ok: true, action: "improve" });
  });

  it("posts to OpenAI-compatible chat completions with the fixed GLM model", async () => {
    let seenUrl = "";
    let seenBody: Record<string, unknown> = {};
    const fetchImpl = fetchJson(200, { choices: [{ message: { content: "done" } }] }, (url, init) => {
      seenUrl = url;
      seenBody = JSON.parse(String(init?.body));
    });
    const result = await runQalamAiInference({ action: "summarize", text: "Hello" }, { fetchImpl, env: ENV });
    expect(result.status).toBe(200);
    expect(seenUrl).toBe(cloudflareChatUrl(ENV.CLOUDFLARE_ACCOUNT_ID));
    expect(seenUrl).toContain("/ai/v1/chat/completions");
    expect(seenUrl).not.toContain("/ai/run/");
    expect(seenBody.model).toBe(QALAM_AI_MODEL_ID);
    expect(seenBody.messages).toEqual(buildCloudflareMessages("summarize", "Hello"));
    expect(seenBody.max_completion_tokens).toBe(ACTION_MAX_TOKENS.summarize);
    expect(seenBody.n).toBe(1);
    expect(seenBody.reasoning_effort).toBeNull();
    expect(seenBody.chat_template_kwargs).toEqual({ enable_thinking: false });
    expect(seenBody).not.toHaveProperty("tools");
    expect(JSON.stringify(result.json)).not.toContain("token_secret_value");
    expect(JSON.stringify(result.json)).not.toContain("acct_test");
  });

  it("builds Urdu-preserving server messages", () => {
    const messages = buildCloudflareMessages("improve", "اردو متن");
    expect(buildSystemPrompt()).toContain("Urdu stays Urdu");
    expect(messages[1]?.content).toContain("اردو متن");
    expect(ACTION_MAX_TOKENS.improve).toBe(180);
  });

  it("keeps the Cloudflare token on the server request only", async () => {
    let auth = "";
    const fetchImpl = fetchJson(200, { choices: [{ message: { content: "ok" } }] }, (_url, init) => {
      const headers = init?.headers as Record<string, string>;
      auth = headers.Authorization;
    });
    const result = await runQalamAiInference({ action: "formal", text: "Please rewrite." }, { fetchImpl, env: ENV });
    expect(auth).toBe("Bearer token_secret_value");
    expect(JSON.stringify(result.json)).toEqual(JSON.stringify({ text: "ok" }));
  });

  it("extracts choices[0].message.content and typed text blocks", () => {
    expect(extractProviderText({ choices: [{ message: { content: "  سلام  " } }] })).toBe("سلام");
    expect(extractProviderText({
      choices: [{
        message: {
          content: [
            { type: "text", text: "ہیلو " },
            { type: "reasoning", text: "hidden" },
            { type: "text", text: "دنیا" },
          ],
        },
      }],
    })).toBe("ہیلو دنیا");
  });

  it("never returns reasoning_content as the answer", () => {
    expect(extractProviderText({
      choices: [{ message: { content: "جواب", reasoning_content: "secret chain" } }],
    })).toBe("جواب");
    expect(extractProviderText({
      choices: [{ message: { content: "", reasoning_content: "should not leak" } }],
    })).toBe("");
  });

  it("returns a controlled error for provider 400/500", async () => {
    const logs: unknown[] = [];
    const fetchImpl = fetchJson(400, { errors: [{ code: "invalid_request", message: "internal boom stack Bearer token_secret_value accounts/acct_test" }] });
    const result = await runQalamAiInference({ action: "improve", text: "user selected secret" }, {
      fetchImpl,
      env: ENV,
      log: (message, details) => logs.push({ message, details }),
    });
    expect(result.status).toBe(502);
    expect(result.json.code).toBe("failed");
    expect(JSON.stringify(result.json)).not.toMatch(/boom stack|token_secret|acct_test|user selected secret/i);
    expect(JSON.stringify(logs)).not.toMatch(/token_secret_value|acct_test|user selected secret/i);
    expect(JSON.stringify(logs)).toContain("invalid_request");
  });

  it("sanitizes diagnostic messages", () => {
    const sanitized = sanitizeProviderError({
      errors: [{ code: 10000, message: "Bearer abc123 failed for accounts/acct_test" }],
    });
    expect(sanitized.code).toBe("10000");
    expect(sanitized.message).toContain("Bearer [redacted]");
    expect(sanitized.message).toContain("accounts/[redacted]");
    expect(sanitized.message).not.toContain("abc123");
    expect(sanitized.message).not.toContain("acct_test");
  });

  it("maps quota/rate-limit and auth failures to controlled errors", async () => {
    expect(classifyProviderFailure(429, {})).toBe("limit");
    expect(classifyProviderFailure(401, {})).toBe("unavailable");
    const limit = await runQalamAiInference({ action: "improve", text: "hi" }, { fetchImpl: fetchJson(429, { errors: [{ message: "quota exceeded" }] }), env: ENV });
    expect(limit.status).toBe(429);
    expect(limit.json.code).toBe("limit");
    const auth = await runQalamAiInference({ action: "improve", text: "hi" }, { fetchImpl: fetchJson(403, { errors: [{ message: "forbidden" }] }), env: ENV });
    expect(auth.status).toBe(503);
    expect(auth.json.code).toBe("unavailable");
  });

  it("handles timeout without leaking provider details", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    const result = await runQalamAiInference({ action: "improve", text: "hi" }, { fetchImpl, env: ENV, timeoutMs: 5 });
    expect(result.status).toBe(504);
    expect(result.json.code).toBe("failed");
  });

  it("does not call Cloudflare when credentials are missing", async () => {
    const fetchImpl = fetchJson(200, { choices: [{ message: { content: "nope" } }] });
    const result = await runQalamAiInference({ action: "improve", text: "hi" }, { fetchImpl, env: {} });
    expect(result.status).toBe(503);
    expect(result.json.code).toBe("unavailable");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
