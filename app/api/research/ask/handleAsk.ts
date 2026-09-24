/**
 * POST /api/research/ask
 * Unsigned local/dev lock: one process memory store, no user accounts.
 * The client cannot supply evidence. Retrieval, the gate, and citation
 * checks stay in the engine.
 */
import {
  MAX_KEYWORD_K,
  askResearchAsync,
  createLlmAnswerAdapter,
  type AsyncAnswerAdapter,
  type ResearchEngineStore,
  type TypedResearchAnswer,
} from "../../../tools/research-studio/engine";
import { getResearchApiStore } from "../memoryStore";

export { getResearchApiStore };

export const MAX_RESEARCH_JSON_BYTES = 16_384;
export const MAX_RESEARCH_QUERY_CHARS = 2_000;

const ALLOWED_KEYS = new Set(["query", "documentIds", "k"]);

export type ResearchAskError = {
  error: string;
  code: "invalid" | "invalid_scope" | "failed";
};

export function researchAskAdapterFromEnv(): AsyncAnswerAdapter {
  return createLlmAnswerAdapter({
    env: {
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_AUTH_TOKEN: process.env.CLOUDFLARE_AUTH_TOKEN,
    },
  });
}

function invalid(error: string, code: ResearchAskError["code"] = "invalid"): {
  status: number;
  body: ResearchAskError;
} {
  return { status: 400, body: { error, code } };
}

export async function handleResearchAsk(input: {
  body: unknown;
  store: ResearchEngineStore;
  adapter?: AsyncAnswerAdapter;
}): Promise<{ status: number; body: TypedResearchAnswer | ResearchAskError }> {
  if (!input.body || typeof input.body !== "object" || Array.isArray(input.body)) {
    return invalid("Malformed request.");
  }
  const record = input.body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!ALLOWED_KEYS.has(key)) return invalid("Malformed request.");
  }
  if (typeof record.query !== "string") return invalid("Malformed request.");
  const query = record.query;
  if (query.trim().length === 0 || query.length > MAX_RESEARCH_QUERY_CHARS) {
    return invalid("Malformed request.");
  }

  let documentIds: string[] | undefined;
  if ("documentIds" in record) {
    if (!Array.isArray(record.documentIds) || record.documentIds.length === 0) {
      return invalid("Invalid document scope.", "invalid_scope");
    }
    if (record.documentIds.some((id) => typeof id !== "string" || id.trim().length === 0 || id.length > 128)) {
      return invalid("Invalid document scope.", "invalid_scope");
    }
    documentIds = record.documentIds;
    const known = new Set(input.store.list());
    if (documentIds.some((id) => !known.has(id))) {
      return invalid("Invalid document scope.", "invalid_scope");
    }
  }

  let k: number | undefined;
  if ("k" in record) {
    if (typeof record.k !== "number" || !Number.isInteger(record.k) || record.k < 1 || record.k > MAX_KEYWORD_K) {
      return invalid("Malformed request.");
    }
    k = record.k;
  }

  try {
    const answer = await askResearchAsync(input.store, query, {
      documentIds,
      k,
      adapter: input.adapter,
    });
    return { status: 200, body: answer };
  } catch {
    return { status: 500, body: { error: "Research request failed.", code: "failed" } };
  }
}
