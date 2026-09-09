/**
 * Local Document Library — storage-agnostic API.
 * IndexedDB is the browser backend; tests use the in-memory backend.
 * Document JSON is stored as-is (no schema transform).
 */

import type { DocNode } from "./extractPlainText";
import {
  defaultDocumentSettings,
  parseDocumentSettings,
  type DocumentStudioSettings,
} from "./documentSettings";
import { defaultDocumentTitle, sanitizeDocumentTitle } from "./documentTitle";

export const DOCUMENT_LIBRARY_SCHEMA_VERSION = 1 as const;
export const LEGACY_DRAFT_STORAGE_KEY = "qalam-document-studio-draft";
export const LIBRARY_MIGRATION_KEY = "qalam-document-studio-library-migration-v1";
export const ACTIVE_DOCUMENT_STORAGE_KEY = "qalam-document-studio-active-document-v1";

export interface DocumentRecord {
  id: string;
  title: string;
  content: DocNode;
  documentSettings: DocumentStudioSettings;
  createdAt: number;
  updatedAt: number;
  schemaVersion: 1;
}

export interface DocumentListItem {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentWriteInput {
  title?: string;
  content?: DocNode;
  documentSettings?: DocumentStudioSettings;
}

export interface DocumentLibrary {
  listDocuments(): Promise<DocumentListItem[]>;
  getDocument(id: string): Promise<DocumentRecord | null>;
  createDocument(input?: DocumentWriteInput): Promise<DocumentRecord>;
  updateDocument(id: string, patch: DocumentWriteInput): Promise<DocumentRecord>;
  deleteDocument(id: string): Promise<void>;
  renameDocument(id: string, title: string): Promise<DocumentRecord>;
}

export function emptyDocumentContent(dir: "rtl" | "ltr" = "rtl"): DocNode {
  return { type: "doc", content: [{ type: "paragraph", attrs: { dir }, content: [] }] };
}

export function createDocumentId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sortDocumentsNewestFirst<T extends { updatedAt: number; createdAt: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt);
}

function isDocNode(value: unknown): value is DocNode {
  return Boolean(value) && typeof value === "object" && (value as DocNode).type === "doc";
}

export function normalizeDocumentRecord(raw: unknown, now = Date.now()): DocumentRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id) return null;
  const content = isDocNode(o.content) ? o.content : emptyDocumentContent();
  const title = sanitizeDocumentTitle(o.title) || defaultDocumentTitle(false);
  const createdAt = typeof o.createdAt === "number" ? o.createdAt : now;
  const updatedAt = typeof o.updatedAt === "number" ? o.updatedAt : createdAt;
  return {
    id: o.id,
    title,
    content,
    documentSettings: parseDocumentSettings(o.documentSettings),
    createdAt,
    updatedAt,
    schemaVersion: 1,
  };
}

export function createDocumentRecord(input: DocumentWriteInput = {}, now = Date.now()): DocumentRecord {
  return {
    id: createDocumentId(),
    title: sanitizeDocumentTitle(input.title) || defaultDocumentTitle(false),
    content: isDocNode(input.content) ? input.content : emptyDocumentContent(),
    documentSettings: input.documentSettings ? parseDocumentSettings(input.documentSettings) : defaultDocumentSettings(),
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  };
}

export function createMemoryDocumentLibrary(seed: DocumentRecord[] = []): DocumentLibrary {
  const records = new Map<string, DocumentRecord>();
  for (const item of seed) {
    const normalized = normalizeDocumentRecord(item);
    if (normalized) records.set(normalized.id, normalized);
  }

  return {
    async listDocuments() {
      return sortDocumentsNewestFirst(Array.from(records.values())).map((record) => ({
        id: record.id,
        title: record.title,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      }));
    },
    async getDocument(id) {
      return records.get(id) ?? null;
    },
    async createDocument(input = {}) {
      const record = createDocumentRecord(input);
      records.set(record.id, record);
      return record;
    },
    async updateDocument(id, patch) {
      const current = records.get(id);
      if (!current) throw new Error(`Document not found: ${id}`);
      const next: DocumentRecord = {
        ...current,
        title: patch.title !== undefined ? sanitizeDocumentTitle(patch.title) || current.title : current.title,
        content: patch.content !== undefined && isDocNode(patch.content) ? patch.content : current.content,
        documentSettings: patch.documentSettings
          ? parseDocumentSettings(patch.documentSettings)
          : current.documentSettings,
        updatedAt: Date.now(),
        schemaVersion: 1,
      };
      records.set(id, next);
      return next;
    },
    async deleteDocument(id) {
      records.delete(id);
    },
    async renameDocument(id, title) {
      const current = records.get(id);
      if (!current) throw new Error(`Document not found: ${id}`);
      const next: DocumentRecord = {
        ...current,
        title: sanitizeDocumentTitle(title) || current.title,
        updatedAt: Date.now(),
        schemaVersion: 1,
      };
      records.set(id, next);
      return next;
    },
  };
}

export function loadActiveDocumentId(storage: Pick<Storage, "getItem"> | null = typeof window === "undefined" ? null : window.localStorage): string | null {
  try {
    const value = storage?.getItem(ACTIVE_DOCUMENT_STORAGE_KEY);
    return value && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

export function saveActiveDocumentId(
  id: string | null,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null = typeof window === "undefined" ? null : window.localStorage,
): void {
  try {
    if (!storage) return;
    if (!id) storage.removeItem(ACTIVE_DOCUMENT_STORAGE_KEY);
    else storage.setItem(ACTIVE_DOCUMENT_STORAGE_KEY, id);
  } catch {
    /* quota / private mode */
  }
}

export interface LegacyStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * One-time migration from the single localStorage draft.
 * Never duplicates. On failure, leaves legacy keys intact.
 */
export async function migrateLegacyDraftIfNeeded(
  library: DocumentLibrary,
  storage: LegacyStorage,
  options?: { defaultTitle?: string; settings?: DocumentStudioSettings },
): Promise<DocumentRecord | null> {
  try {
    if (storage.getItem(LIBRARY_MIGRATION_KEY) === "done") return null;
    const existing = await library.listDocuments();
    if (existing.length > 0) {
      storage.setItem(LIBRARY_MIGRATION_KEY, "done");
      return null;
    }

    const draftRaw = storage.getItem(LEGACY_DRAFT_STORAGE_KEY);
    const titleRaw = storage.getItem("qalam-document-studio-title");
    const settingsRaw = storage.getItem("qalam-document-studio-settings-v1");
    if (!draftRaw && !titleRaw && !settingsRaw) {
      storage.setItem(LIBRARY_MIGRATION_KEY, "done");
      return null;
    }

    let content = emptyDocumentContent();
    if (draftRaw) {
      try {
        const parsed = JSON.parse(draftRaw) as unknown;
        if (isDocNode(parsed)) content = parsed;
      } catch {
        content = emptyDocumentContent();
      }
    }

    let settings = options?.settings ?? defaultDocumentSettings();
    if (settingsRaw) {
      try {
        settings = parseDocumentSettings(JSON.parse(settingsRaw));
      } catch {
        /* keep fallback */
      }
    }

    const record = await library.createDocument({
      title: sanitizeDocumentTitle(titleRaw) || options?.defaultTitle || defaultDocumentTitle(false),
      content,
      documentSettings: settings,
    });

    storage.setItem(LIBRARY_MIGRATION_KEY, "done");
    storage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
    storage.removeItem("qalam-document-studio-title");
    return record;
  } catch {
    return null;
  }
}

let singleton: DocumentLibrary | null = null;

export function setDocumentLibraryForTests(library: DocumentLibrary | null): void {
  singleton = library;
}

export async function getDocumentLibrary(): Promise<DocumentLibrary> {
  if (singleton) return singleton;
  try {
    const { createIndexedDBDocumentLibrary } = await import("./documentLibraryIdb");
    singleton = await createIndexedDBDocumentLibrary();
  } catch {
    singleton = createMemoryDocumentLibrary();
  }
  return singleton;
}
