import { describe, expect, it, vi } from "vitest";
import {
  ACTION_MAX_TOKENS,
  QALAM_AI_MODEL_ID,
  buildCloudflareMessages,
  buildSystemPrompt,
} from "../app/tools/document-studio/utils/qalamAi";
import {
  classifyProviderFailure,
  cloudflareRunUrl,
  extractProviderText,
  runQalamAiInference,
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

  it("uses the fixed GLM model and token caps", async () => {
    let seenUrl = "";
    let seenBody: Record<string, unknown> = {};
    const fetchImpl = fetchJson(200, { result: { response: "done" } }, (url, init) => {
      seenUrl = url;
      seenBody = JSON.parse(String(init?.body));
    });
    const result = await runQalamAiInference({ action: "summarize", text: "Hello" }, { fetchImpl, env: ENV });
    expect(result.status).toBe(200);
    expect(seenUrl).toBe(cloudflareRunUrl(ENV.CLOUDFLARE_ACCOUNT_ID));
    expect(seenUrl).toContain(QALAM_AI_MODEL_ID);
    expect(seenBody.max_completion_tokens).toBe(ACTION_MAX_TOKENS.summarize);
    expect(seenBody.n).toBe(1);
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
    const fetchImpl = fetchJson(200, { result: { choices: [{ message: { content: "ok" } }] } }, (_url, init) => {
      const headers = init?.headers as Record<string, string>;
      auth = headers.Authorization;
    });
    const result = await runQalamAiInference({ action: "formal", text: "Please rewrite." }, { fetchImpl, env: ENV });
    expect(auth).toBe("Bearer token_secret_value");
    expect(JSON.stringify(result.json)).toEqual(JSON.stringify({ text: "ok" }));
  });

  it("normalizes provider payloads to { text }", async () => {
    expect(extractProviderText({ result: { response: "  سلام  " } })).toBe("سلام");
    const fetchImpl = fetchJson(200, { result: { response: "نیا متن" } });
    const result = await runQalamAiInference({ action: "simplify", text: "پیچیدہ متن" }, { fetchImpl, env: ENV });
    expect(result).toEqual({ status: 200, json: { text: "نیا متن" } });
  });

  it("returns a controlled error for provider failure", async () => {
    const fetchImpl = fetchJson(500, { errors: [{ message: "internal boom stack" }] });
    const result = await runQalamAiInference({ action: "improve", text: "hi" }, { fetchImpl, env: ENV });
    expect(result.status).toBe(502);
    expect(result.json.code).toBe("failed");
    expect(JSON.stringify(result.json)).not.toMatch(/boom stack|token_secret|acct_test/i);
  });

  it("maps quota/rate-limit to a controlled limit error", async () => {
    expect(classifyProviderFailure(429, {})).toBe("limit");
    const fetchImpl = fetchJson(429, { errors: [{ message: "quota exceeded" }] });
    const result = await runQalamAiInference({ action: "improve", text: "hi" }, { fetchImpl, env: ENV });
    expect(result.status).toBe(429);
    expect(result.json.code).toBe("limit");
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
    const fetchImpl = fetchJson(200, { result: { response: "nope" } });
    const result = await runQalamAiInference({ action: "improve", text: "hi" }, { fetchImpl, env: {} });
    expect(result.status).toBe(503);
    expect(result.json.code).toBe("unavailable");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
