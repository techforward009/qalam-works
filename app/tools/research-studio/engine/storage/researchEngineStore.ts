/**
 * Research Engine persistence — separate keys and types from the notes store.
 * Memory backend is always available; localStorage is optional and swappable.
 */
import { CHUNKER_VERSION, type DocumentChunk, type DocumentPage, type ResearchDocument } from "../types/document";
import {
  ENGINE_STORE_SCHEMA_VERSION,
  parseStoredCorpus,
  type StoredCorpus,
} from "./parseStoredCorpus";

export type EngineStoreError = "quota" | "corrupt" | "not_found" | "unknown";

export type EngineStoreResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: EngineStoreError };

export interface ResearchEngineStore {
  list(): string[];
  get(documentId: string): EngineStoreResult<StoredCorpus>;
  save(corpus: StoredCorpus): EngineStoreResult<void>;
  remove(documentId: string): void;
}

export const ENGINE_LIST_KEY = "qalam-research-engine-docs-v1";
export const ENGINE_DOC_KEY_PREFIX = "qalam-research-engine-doc-v1-";

export function engineDocKey(documentId: string): string {
  return `${ENGINE_DOC_KEY_PREFIX}${documentId}`;
}

export function makeStoredCorpus(
  document: ResearchDocument,
  pages: DocumentPage[],
  chunks: DocumentChunk[],
  chunkerVersion: string = CHUNKER_VERSION,
): StoredCorpus {
  return {
    schemaVersion: ENGINE_STORE_SCHEMA_VERSION,
    document: { ...document, chunkerVersion, pageCount: pages.length },
    pages,
    chunks,
  };
}

class MemoryResearchEngineStore implements ResearchEngineStore {
  private readonly docs = new Map<string, string>();
  private order: string[] = [];

  list(): string[] {
    return [...this.order];
  }

  get(documentId: string): EngineStoreResult<StoredCorpus> {
    const raw = this.docs.get(documentId);
    if (raw === undefined) return { ok: false, error: "not_found" };
    try {
      const parsed = parseStoredCorpus(JSON.parse(raw));
      if (!parsed) return { ok: false, error: "corrupt" };
      return { ok: true, value: parsed };
    } catch {
      return { ok: false, error: "corrupt" };
    }
  }

  save(corpus: StoredCorpus): EngineStoreResult<void> {
    const parsed = parseStoredCorpus(corpus);
    if (!parsed) return { ok: false, error: "corrupt" };
    try {
      this.docs.set(parsed.document.id, JSON.stringify(parsed));
      if (!this.order.includes(parsed.document.id)) this.order.push(parsed.document.id);
      return { ok: true, value: undefined };
    } catch {
      return { ok: false, error: "unknown" };
    }
  }

  remove(documentId: string): void {
    this.docs.delete(documentId);
    this.order = this.order.filter((id) => id !== documentId);
  }
}

class LocalStorageResearchEngineStore implements ResearchEngineStore {
  constructor(private readonly storage: Storage) {}

  list(): string[] {
    try {
      const raw = this.storage.getItem(ENGINE_LIST_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  }

  get(documentId: string): EngineStoreResult<StoredCorpus> {
    try {
      const raw = this.storage.getItem(engineDocKey(documentId));
      if (raw === null) return { ok: false, error: "not_found" };
      const parsed = parseStoredCorpus(JSON.parse(raw));
      if (!parsed) return { ok: false, error: "corrupt" };
      return { ok: true, value: parsed };
    } catch {
      return { ok: false, error: "unknown" };
    }
  }

  save(corpus: StoredCorpus): EngineStoreResult<void> {
    const parsed = parseStoredCorpus(corpus);
    if (!parsed) return { ok: false, error: "corrupt" };
    try {
      const data = JSON.stringify(parsed);
      this.storage.setItem(engineDocKey(parsed.document.id), data);
      const ids = this.list();
      if (!ids.includes(parsed.document.id)) {
        try {
          this.storage.setItem(ENGINE_LIST_KEY, JSON.stringify([...ids, parsed.document.id]));
        } catch {
          /* list update is non-fatal */
        }
      }
      return { ok: true, value: undefined };
    } catch (err) {
      const name = err && typeof err === "object" && "name" in err ? String(err.name) : "";
      if (name === "QuotaExceededError") return { ok: false, error: "quota" };
      return { ok: false, error: "unknown" };
    }
  }

  remove(documentId: string): void {
    try {
      this.storage.removeItem(engineDocKey(documentId));
    } catch {
      /* ignore */
    }
    const ids = this.list().filter((id) => id !== documentId);
    try {
      this.storage.setItem(ENGINE_LIST_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }
}

export function createMemoryResearchEngineStore(): ResearchEngineStore {
  return new MemoryResearchEngineStore();
}

export function createLocalStorageResearchEngineStore(storage: Storage): ResearchEngineStore {
  return new LocalStorageResearchEngineStore(storage);
}

export function createResearchEngineStore(storage?: Storage): ResearchEngineStore {
  if (storage) return createLocalStorageResearchEngineStore(storage);
  if (typeof localStorage !== "undefined") return createLocalStorageResearchEngineStore(localStorage);
  return createMemoryResearchEngineStore();
}
