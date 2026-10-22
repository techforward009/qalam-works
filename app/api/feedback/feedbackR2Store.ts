import type { ResearchBlobClient } from "../../tools/research-studio/engine";
import { researchBlobClientFromEnv } from "../research/vercelResearchBlob";

/** Owner-activated switch; R2 never silently falls back to Vercel Blob. */
type Env = Record<string, string | undefined>;
const MAX_OBJECT_BYTES = 8192;
const MAX_LIST_PAGES = 50;
const PAGE_SIZE = 1000;
const PREFIXES = ["contact-inquiries/v1/", "user-feedback/v1/"] as const;
const OBJECT_PATH = /^(?:contact-inquiries\/v1\/[0-9]{13}-[0-9a-f-]{36}\.json|user-feedback\/v1\/[a-z][a-z0-9-]{0,63}\/[0-9]{13}-[0-9a-f-]{36}\.json)$/;

export class FeedbackStoreUnavailable extends Error {
  constructor() { super("feedback-store-unavailable"); }
}

export function allowedFeedbackObjectPath(path: string): boolean {
  return OBJECT_PATH.test(path) && !path.includes("..");
}
function allowedPrefix(prefix: string): boolean {
  return PREFIXES.some(p => prefix === p);
}
function configuration(env: Env): { origin: string; token: string } {
  let url: URL;
  try { url = new URL(env.QALAM_FEEDBACK_R2_WORKER_URL ?? ""); }
  catch { throw new FeedbackStoreUnavailable(); }
  const token = (env.QALAM_FEEDBACK_R2_BEARER_TOKEN ?? "").trim();
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      (url.pathname !== "/" && url.pathname !== "") || !token || token.length < 32) {
    throw new FeedbackStoreUnavailable();
  }
  return { origin: url.origin, token };
}
export function createFeedbackR2Client(env: Env, fetchImpl: typeof fetch = fetch): ResearchBlobClient {
  const { origin, token } = configuration(env);
  const call = async (path: string, init: RequestInit = {}): Promise<Response> => {
    try {
      return await fetchImpl(origin + path, {
        ...init,
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}`, ...(init.headers as Record<string, string> | undefined) },
        signal: AbortSignal.timeout(12000),
      });
    } catch { throw new FeedbackStoreUnavailable(); }
  };
  return {
    async putObject(path, body) {
      const bytes = Buffer.byteLength(body, "utf8");
      if (!allowedFeedbackObjectPath(path) || bytes < 2 || bytes > MAX_OBJECT_BYTES) throw new FeedbackStoreUnavailable();
      const response = await call("/v1/objects/" + path, {
        method: "PUT",
        body,
        headers: { "Content-Type": "application/json", "Content-Length": String(bytes) },
      });
      if (response.status !== 201) throw new FeedbackStoreUnavailable();
      await response.body?.cancel();
    },
    async getObject(path) {
      if (!allowedFeedbackObjectPath(path)) throw new FeedbackStoreUnavailable();
      const response = await call("/v1/objects/" + path);
      if (response.status === 404) { await response.body?.cancel(); return null; }
      if (response.status !== 200) throw new FeedbackStoreUnavailable();
      const len = Number(response.headers.get("content-length"));
      if (!Number.isInteger(len) || len < 2 || len > MAX_OBJECT_BYTES) { await response.body?.cancel(); throw new FeedbackStoreUnavailable(); }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.byteLength !== len) throw new FeedbackStoreUnavailable();
      return bytes.toString("utf8");
    },
    async listObjects(prefix) {
      if (!allowedPrefix(prefix)) throw new FeedbackStoreUnavailable();
      const paths: string[] = [];
      let cursor: string | undefined;
      for (let n = 0; n < MAX_LIST_PAGES; n++) {
        const args = new URLSearchParams({ prefix });
        if (cursor) args.set("cursor", cursor);
        const response = await call("/v1/objects?" + args.toString());
        if (response.status !== 200) throw new FeedbackStoreUnavailable();
        let page: unknown;
        try { page = await response.json(); } catch { throw new FeedbackStoreUnavailable(); }
        const data = page as { paths?: unknown; cursor?: unknown; truncated?: unknown };
        if (!Array.isArray(data?.paths) || data.paths.length > PAGE_SIZE ||
            !data.paths.every(k => typeof k === "string" && allowedFeedbackObjectPath(k) && k.startsWith(prefix)) ||
            typeof data.truncated !== "boolean" || (data.truncated && (typeof data.cursor !== "string" || !data.cursor))) {
          throw new FeedbackStoreUnavailable();
        }
        paths.push(...(data.paths as string[]));
        if (!data.truncated) return paths;
        if (data.cursor === cursor) throw new FeedbackStoreUnavailable();
        cursor = data.cursor as string;
      }
      throw new FeedbackStoreUnavailable();
    },
  };
}

/** Keep the existing backend until the owner has verified a complete migration. */
export async function feedbackStoreFromEnv(env: Env = process.env): Promise<ResearchBlobClient> {
  const selected = (env.QALAM_FEEDBACK_STORAGE_BACKEND ?? "vercel-blob").trim();
  if (selected === "cloudflare-r2") return createFeedbackR2Client(env);
  if (selected === "vercel-blob") return researchBlobClientFromEnv();
  throw new FeedbackStoreUnavailable();
}
