import "server-only";
import { ResearchPersistenceError, type ResearchBlobClient } from "../../tools/research-studio/engine";

const PREFIX = "research/v1/documents/";
const OBJECT = /^research\/v1\/documents\/[A-Za-z0-9][A-Za-z0-9_-]{0,127}\.json$/;
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_PAGES = 50;
type Env = Record<string, string | undefined>;

function config(env: Env): { origin: string; token: string } {
  let url: URL;
  try { url = new URL(env.QALAM_RESEARCH_R2_WORKER_URL ?? ""); }
  catch { throw new ResearchPersistenceError("unavailable"); }
  const token = (env.QALAM_RESEARCH_R2_BEARER_TOKEN ?? "").trim();
  if (url.protocol !== "https:" || url.username || url.password || url.search ||
      url.hash || (url.pathname !== "/" && url.pathname !== "") || token.length < 32) {
    throw new ResearchPersistenceError("unavailable");
  }
  return { origin: url.origin, token };
}

export function createResearchR2Client(env: Env, fetchImpl: typeof fetch = fetch): ResearchBlobClient {
  const { origin, token } = config(env);
  async function request(path: string, init: RequestInit = {}): Promise<Response> {
    try {
      return await fetchImpl(origin + path, {
        ...init, cache: "no-store", redirect: "error",
        headers: { Authorization: `Bearer ${token}`, ...(init.headers as Record<string, string> | undefined) },
        signal: AbortSignal.timeout(60000),
      });
    } catch { throw new ResearchPersistenceError("failed"); }
  }
  return {
    async putObject(path, body) {
      const size = Buffer.byteLength(body, "utf8");
      if (!OBJECT.test(path) || size < 2 || size > MAX_BYTES) throw new ResearchPersistenceError("failed");
      const res = await request("/v1/objects/" + path, {
        method: "PUT", body,
        headers: { "Content-Type": "application/json", "Content-Length": String(size) },
      });
      await res.body?.cancel();
      if (res.status !== 201) throw new ResearchPersistenceError("failed");
    },
    async getObject(path) {
      if (!OBJECT.test(path)) throw new ResearchPersistenceError("failed");
      const res = await request("/v1/objects/" + path);
      if (res.status === 404) { await res.body?.cancel(); return null; }
      if (res.status !== 200) throw new ResearchPersistenceError("failed");
      const len = Number(res.headers.get("content-length"));
      if (!Number.isInteger(len) || len < 2 || len > MAX_BYTES) {
        await res.body?.cancel(); throw new ResearchPersistenceError("failed");
      }
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.byteLength !== len) throw new ResearchPersistenceError("failed");
      return bytes.toString("utf8");
    },
    async listObjects(prefix) {
      if (prefix !== PREFIX) throw new ResearchPersistenceError("failed");
      const paths: string[] = [];
      let cursor: string | undefined;
      for (let n = 0; n < MAX_PAGES; n++) {
        const params = new URLSearchParams({ prefix });
        if (cursor) params.set("cursor", cursor);
        const res = await request("/v1/objects?" + params);
        if (res.status !== 200) throw new ResearchPersistenceError("failed");
        let data: { paths?: unknown; cursor?: unknown; truncated?: unknown };
        try { data = await res.json(); } catch { throw new ResearchPersistenceError("failed"); }
        if (!Array.isArray(data.paths) || data.paths.length > 1000 ||
            !data.paths.every(p => typeof p === "string" && OBJECT.test(p)) ||
            typeof data.truncated !== "boolean") throw new ResearchPersistenceError("failed");
        paths.push(...data.paths);
        if (!data.truncated) return paths;
        if (typeof data.cursor !== "string" || !data.cursor || data.cursor === cursor) throw new ResearchPersistenceError("failed");
        cursor = data.cursor;
      }
      throw new ResearchPersistenceError("failed");
    },
  };
}
