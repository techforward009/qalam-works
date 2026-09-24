/**
 * POST /api/research/ask
 * The route checks the owner session before calling this handler.
 * The client cannot supply evidence. Retrieval, the gate, and citation
 * checks stay in the engine. Documents are loaded from durable storage
 * by the route before this handler runs.
 */
import {
  MAX_KEYWORD_K,
  askResearchAsync,
  createLlmAnswerAdapter,
  type AsyncAnswerAdapter,
  type ResearchEngineStore,
  type TypedResearchAnswer,
} from "../../../tools/research-studio/engine";

export const MAX_RESEARCH_JSON_BYTES = 16_384;
export const MAX_RESEARCH_QUERY_CHARS = 2_000;

const ALLOWED_KEYS = new Set(["query", "documentIds", "k"]);

export type ResearchAskError = {
  error: string;
  code: "invalid" | "invalid_scope" | "failed";
};

export type PreparedResearchAsk =
  | { ok: false; status: number; body: ResearchAskError }
  | { ok: true; query: string; documentIds?: string[]; k?: number };

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

/** Validation that does not read the store. Invalid requests never need Blob. */
export function prepareResearchAsk(body: unknown): PreparedResearchAsk {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, ...invalid("Malformed request.") };
  }
  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!ALLOWED_KEYS.has(key)) return { ok: false, ...invalid("Malformed request.") };
  }
  if (typeof record.query !== "string") return { ok: false, ...invalid("Malformed request.") };
  const query = record.query;
  if (query.trim().length === 0 || query.length > MAX_RESEARCH_QUERY_CHARS) {
    return { ok: false, ...invalid("Malformed request.") };
  }

  let documentIds: string[] | undefined;
  if ("documentIds" in record) {
    if (!Array.isArray(record.documentIds) || record.documentIds.length === 0) {
      return { ok: false, ...invalid("Invalid document scope.", "invalid_scope") };
    }
    if (record.documentIds.some((id) => typeof id !== "string" || id.trim().length === 0 || id.length > 128)) {
      return { ok: false, ...invalid("Invalid document scope.", "invalid_scope") };
    }
    documentIds = record.documentIds;
  }

  let k: number | undefined;
  if ("k" in record) {
    if (typeof record.k !== "number" || !Number.isInteger(record.k) || record.k < 1 || record.k > MAX_KEYWORD_K) {
      return { ok: false, ...invalid("Malformed request.") };
    }
    k = record.k;
  }

  return { ok: true, query, documentIds, k };
}

export async function handleResearchAsk(input: {
  body: unknown;
  store: ResearchEngineStore;
  adapter?: AsyncAnswerAdapter;
}): Promise<{ status: number; body: TypedResearchAnswer | ResearchAskError }> {
  const prepared = prepareResearchAsk(input.body);
  if (!prepared.ok) return { status: prepared.status, body: prepared.body };

  if (prepared.documentIds) {
    const known = new Set(input.store.list());
    if (prepared.documentIds.some((id) => !known.has(id))) {
      return invalid("Invalid document scope.", "invalid_scope");
    }
  }

  try {
    const answer = await askResearchAsync(input.store, prepared.query, {
      documentIds: prepared.documentIds,
      k: prepared.k,
      adapter: input.adapter,
    });
    return { status: 200, body: answer };
  } catch {
    return { status: 500, body: { error: "Research request failed.", code: "failed" } };
  }
}
