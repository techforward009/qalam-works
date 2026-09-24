/**
 * Private qalam-research Blob client.
 * Never reads the font store token or BLOB_STORE_ID.
 * Never returns a blob URL to callers.
 */
import { get, list, put } from "@vercel/blob";
import {
  ResearchPersistenceError,
  type ResearchBlobClient,
} from "../../tools/research-studio/engine";

type BlobAuth =
  | { token: string }
  | { storeId: string; oidcToken: string };

type ListedPage = {
  blobs: Array<{ pathname: string }>;
  hasMore: boolean;
  cursor?: string;
};

type GotObject = {
  statusCode: number;
  stream: ReadableStream<Uint8Array> | null;
  blob?: { pathname?: string };
} | null;

export type ResearchBlobSdk = {
  put: (pathname: string, body: string, options: Record<string, unknown>) => Promise<unknown>;
  get: (pathname: string, options: Record<string, unknown>) => Promise<GotObject>;
  list: (options: Record<string, unknown>) => Promise<ListedPage>;
};

const MAX_LIST_PAGES = 50;

function authOptions(auth: BlobAuth): Record<string, unknown> {
  if ("token" in auth) return { token: auth.token };
  return { storeId: auth.storeId, oidcToken: auth.oidcToken };
}

type EnvLike = Record<string, string | undefined>;

export function researchBlobAuth(env: EnvLike): BlobAuth {
  const storeId = env.QALAM_RESEARCH_STORE_ID?.trim() ?? "";
  if (!storeId) throw new ResearchPersistenceError("unavailable");
  const token = env.QALAM_RESEARCH_READ_WRITE_TOKEN?.trim() ?? "";
  if (token) return { token };
  const oidcToken = env.VERCEL_OIDC_TOKEN?.trim() ?? "";
  if (!oidcToken) throw new ResearchPersistenceError("unavailable");
  return { storeId, oidcToken };
}

const defaultSdk: ResearchBlobSdk = {
  put: (pathname, body, options) => put(pathname, body, options as never),
  get: async (pathname, options) => {
    const result = await get(pathname, options as never);
    if (!result) return null;
    return {
      statusCode: result.statusCode,
      stream: result.stream,
      blob: { pathname: result.blob.pathname },
    };
  },
  list: async (options) => {
    const result = await list(options as never);
    return {
      blobs: result.blobs.map((blob) => ({ pathname: blob.pathname })),
      hasMore: result.hasMore,
      cursor: result.cursor,
    };
  },
};

export function createVercelResearchBlobClient(
  auth: BlobAuth,
  sdk: ResearchBlobSdk = defaultSdk,
): ResearchBlobClient {
  const authFields = authOptions(auth);
  return {
    async putObject(pathname, body) {
      await sdk.put(pathname, body, {
        ...authFields,
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      });
    },
    async getObject(pathname) {
      const result = await sdk.get(pathname, {
        ...authFields,
        access: "private",
        useCache: false,
      });
      if (!result) return null;
      if (result.statusCode !== 200 || !result.stream) {
        throw new ResearchPersistenceError("failed");
      }
      if (result.blob?.pathname && result.blob.pathname !== pathname) {
        throw new ResearchPersistenceError("failed");
      }
      return new Response(result.stream).text();
    },
    async listObjects(prefix) {
      const pathnames: string[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
        const listed = await sdk.list({
          ...authFields,
          prefix,
          cursor,
          limit: 1000,
        });
        for (const blob of listed.blobs) {
          if (blob.pathname.startsWith(prefix)) pathnames.push(blob.pathname);
        }
        if (!listed.hasMore || !listed.cursor) return pathnames;
        cursor = listed.cursor;
      }
      throw new ResearchPersistenceError("failed");
    },
  };
}

let testClient: ResearchBlobClient | null = null;

/** Test-only seam. Production calls must not set this. */
export function setResearchBlobClientForTests(client: ResearchBlobClient | null): void {
  testClient = client;
}

export function researchBlobClientFromEnv(
  env: EnvLike = process.env,
  sdk?: ResearchBlobSdk,
): ResearchBlobClient {
  if (testClient) return testClient;
  return createVercelResearchBlobClient(researchBlobAuth(env), sdk);
}

