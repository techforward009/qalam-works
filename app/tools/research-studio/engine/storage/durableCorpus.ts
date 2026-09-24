/**
 * Durable Research corpus boundary.
 * Blob bytes are untrusted until parseStoredCorpus accepts them.
 * This module does not talk to a provider and does not cache across calls.
 */
import { parseStoredCorpus, type StoredCorpus } from "./parseStoredCorpus";
import {
  createMemoryResearchEngineStore,
  type EngineStoreResult,
  type ResearchEngineStore,
} from "./researchEngineStore";

export const RESEARCH_BLOB_PREFIX = "research/v1/documents/";

const DOCUMENT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export class ResearchPersistenceError extends Error {
  readonly code: "unavailable" | "failed";

  constructor(code: "unavailable" | "failed") {
    super(code);
    this.name = "ResearchPersistenceError";
    this.code = code;
  }
}

export interface ResearchBlobClient {
  putObject(pathname: string, body: string): Promise<void>;
  getObject(pathname: string): Promise<string | null>;
  listObjects(prefix: string): Promise<string[]>;
}

export function researchDocumentPathname(documentId: string): string | null {
  if (!DOCUMENT_ID.test(documentId)) return null;
  return `${RESEARCH_BLOB_PREFIX}${documentId}.json`;
}

export function documentIdFromResearchPathname(pathname: string): string | null {
  if (!pathname.startsWith(RESEARCH_BLOB_PREFIX) || !pathname.endsWith(".json")) return null;
  const documentId = pathname.slice(RESEARCH_BLOB_PREFIX.length, -".json".length);
  if (researchDocumentPathname(documentId) !== pathname) return null;
  return documentId;
}

function parseJson(text: string): unknown {
  return JSON.parse(text, (key, value) => {
    if (FORBIDDEN_KEYS.has(key)) throw new Error("forbidden");
    return value;
  });
}

/** Null when JSON, schema, or pathname provenance is not acceptable. */
export function parseDurableCorpusJson(text: string, expectedDocumentId: string): StoredCorpus | null {
  const pathname = researchDocumentPathname(expectedDocumentId);
  if (!pathname) return null;
  let raw: unknown;
  try {
    raw = parseJson(text);
  } catch {
    return null;
  }
  const parsed = parseStoredCorpus(raw);
  if (!parsed) return null;
  if (parsed.document.id !== expectedDocumentId) return null;
  return parsed;
}

export async function saveDurableCorpus(
  client: ResearchBlobClient,
  corpus: StoredCorpus,
): Promise<EngineStoreResult<void>> {
  const parsed = parseStoredCorpus(corpus);
  if (!parsed) return { ok: false, error: "corrupt" };
  const pathname = researchDocumentPathname(parsed.document.id);
  if (!pathname) return { ok: false, error: "corrupt" };
  const body = JSON.stringify(parsed);
  if (!parseDurableCorpusJson(body, parsed.document.id)) return { ok: false, error: "corrupt" };
  try {
    await client.putObject(pathname, body);
  } catch (err) {
    if (err instanceof ResearchPersistenceError) throw err;
    throw new ResearchPersistenceError("failed");
  }
  return { ok: true, value: undefined };
}

export async function loadDurableCorpus(
  client: ResearchBlobClient,
  documentId: string,
): Promise<EngineStoreResult<StoredCorpus>> {
  const pathname = researchDocumentPathname(documentId);
  if (!pathname) return { ok: false, error: "corrupt" };
  let text: string | null;
  try {
    text = await client.getObject(pathname);
  } catch (err) {
    if (err instanceof ResearchPersistenceError) throw err;
    throw new ResearchPersistenceError("failed");
  }
  if (text === null) return { ok: false, error: "not_found" };
  const parsed = parseDurableCorpusJson(text, documentId);
  if (!parsed) return { ok: false, error: "corrupt" };
  return { ok: true, value: parsed };
}

export async function listDurableDocumentIds(client: ResearchBlobClient): Promise<string[]> {
  let pathnames: string[];
  try {
    pathnames = await client.listObjects(RESEARCH_BLOB_PREFIX);
  } catch (err) {
    if (err instanceof ResearchPersistenceError) throw err;
    throw new ResearchPersistenceError("failed");
  }
  const ids: string[] = [];
  for (const pathname of pathnames) {
    const documentId = documentIdFromResearchPathname(pathname);
    if (documentId) ids.push(documentId);
  }
  return ids;
}

/**
 * Load Blob objects into a new memory store for this call only.
 * Corrupt and unknown records are left out. They are not repaired.
 * A provider failure throws and does not return an empty stand-in.
 */
export async function hydrateResearchStore(
  client: ResearchBlobClient,
  documentIds?: string[],
): Promise<ResearchEngineStore> {
  const ids = documentIds ?? (await listDurableDocumentIds(client));
  const store = createMemoryResearchEngineStore();
  for (const documentId of ids) {
    const loaded = await loadDurableCorpus(client, documentId);
    if (!loaded.ok) continue;
    const saved = store.save(loaded.value);
    if (!saved.ok) throw new ResearchPersistenceError("failed");
  }
  return store;
}
