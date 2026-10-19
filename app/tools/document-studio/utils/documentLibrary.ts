/**
 * Local Document Library — storage-agnostic API.
 * IndexedDB is persistent; the in-memory backend is a temporary fallback.
 * Retired Alvi Nastaleeq marks and font ids are rewritten to Mehr Nastaliq Web.
 * Opening a stored Alvi document writes that rewrite back without changing updatedAt.
 */

import type { DocNode } from "./extractPlainText";
import {
  defaultDocumentSettings,
  parseDocumentSettings,
  type DocumentStudioSettings,
} from "./documentSettings";
import { defaultDocumentTitle, sanitizeDocumentTitle } from "./documentTitle";
import { migrateAlviDocumentContent, QURAN_FONT_FALLBACK_FAMILY, isRemovedQuranFont, removedQuranFontReplacement, storedRecordUsesAlvi } from "./fontRegistry";

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
  readonly durability: "persistent" | "memory";
  listDocuments(): Promise<DocumentListItem[]>;
  getDocument(id: string): Promise<DocumentRecord | null>;
  /** Persistent backends resolve only after the write transaction commits. */
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

export function replaceRetiredAlviContent(content: unknown, fallback: DocNode): DocNode {
  return isDocNode(content) ? migrateAlviDocumentContent(content) : fallback;
}

/** Normalize a stored row. `persist` is true only when the raw row still names Alvi. */
export function openedDocumentRecord(raw: unknown): { record: DocumentRecord | null; persist: boolean } {
  const record = normalizeDocumentRecord(raw);
  return { record, persist: Boolean(record && storedRecordUsesAlvi(raw)) };
}

function plainText(node: DocNode | undefined): string {
  if (!node) return "";
  return (node.text ?? "") + (node.content ?? []).map(plainText).join("");
}

export function withRemovedQuranDefaults(
  settings: DocumentStudioSettings,
  content: DocNode,
  rawSettings: unknown,
): DocumentStudioSettings {
  const typography = rawSettings && typeof rawSettings === "object"
    ? (rawSettings as { typography?: { defaultRtlFontId?: unknown; defaultLtrFontId?: unknown } }).typography
    : undefined;
  const rtl = isRemovedQuranFont(typography?.defaultRtlFontId);
  const ltr = isRemovedQuranFont(typography?.defaultLtrFontId);
  if (!rtl && !ltr) return settings;
  const fontId = removedQuranFontReplacement(plainText(content)) === QURAN_FONT_FALLBACK_FAMILY
    ? "muhammadi-quranic"
    : "scheherazade-new";
  return {
    ...settings,
    typography: {
      ...settings.typography,
      ...(rtl ? { defaultRtlFontId: fontId } : {}),
      ...(ltr ? { defaultLtrFontId: fontId } : {}),
    },
  };
}

export function normalizeDocumentRecord(raw: unknown, now = Date.now()): DocumentRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id) return null;
  const content = replaceRetiredAlviContent(o.content, emptyDocumentContent());
  const title = sanitizeDocumentTitle(o.title) || defaultDocumentTitle(false);
  const createdAt = typeof o.createdAt === "number" ? o.createdAt : now;
  const updatedAt = typeof o.updatedAt === "number" ? o.updatedAt : createdAt;
  return {
    id: o.id,
    title,
    content,
    documentSettings: withRemovedQuranDefaults(parseDocumentSettings(o.documentSettings), content, o.documentSettings),
    createdAt,
    updatedAt,
    schemaVersion: 1,
  };
}

export function createDocumentRecord(input: DocumentWriteInput = {}, now = Date.now()): DocumentRecord {
  const content = replaceRetiredAlviContent(input.content, emptyDocumentContent());
  const documentSettings = input.documentSettings
    ? withRemovedQuranDefaults(parseDocumentSettings(input.documentSettings), content, input.documentSettings)
    : defaultDocumentSettings();
  return {
    id: createDocumentId(),
    title: sanitizeDocumentTitle(input.title) || defaultDocumentTitle(false),
    content,
    documentSettings,
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
    durability: "memory",
    async listDocuments() {
      return sortDocumentsNewestFirst(Array.from(records.values())).map((record) => ({
        id: record.id,
        title: record.title,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      }));
    },
    async getDocument(id) {
      const current = records.get(id) ?? null;
      if (!current || !storedRecordUsesAlvi(current)) return current;
      const migrated = normalizeDocumentRecord(current);
      if (migrated) records.set(id, migrated);
      return migrated;
    },
    async createDocument(input = {}) {
      const record = createDocumentRecord(input);
      records.set(record.id, record);
      return record;
    },
    async updateDocument(id, patch) {
      const current = records.get(id);
      if (!current) throw new Error(`Document not found: ${id}`);
      const content = patch.content !== undefined ? replaceRetiredAlviContent(patch.content, current.content) : current.content;
      const next: DocumentRecord = {
        ...current,
        title: patch.title !== undefined ? sanitizeDocumentTitle(patch.title) || current.title : current.title,
        content,
        documentSettings: patch.documentSettings
          ? withRemovedQuranDefaults(parseDocumentSettings(patch.documentSettings), content, patch.documentSettings)
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
 * Only a committed persistent destination permits legacy cleanup.
 * Errors propagate to the editor's storage-error status.
 */
export async function migrateLegacyDraftIfNeeded(
  library: DocumentLibrary,
  storage: LegacyStorage,
  options?: { defaultTitle?: string; settings?: DocumentStudioSettings },
): Promise<DocumentRecord | null> {
  if (storage.getItem(LIBRARY_MIGRATION_KEY) === "done") return null;

  const draftRaw = storage.getItem(LEGACY_DRAFT_STORAGE_KEY);
  const titleRaw = storage.getItem("qalam-document-studio-title");
  const settingsRaw = storage.getItem("qalam-document-studio-settings-v1");
  if (!draftRaw && !titleRaw && !settingsRaw) {
    if (library.durability === "persistent") storage.setItem(LIBRARY_MIGRATION_KEY, "done");
    return null;
  }

  let content = emptyDocumentContent();
  if (draftRaw) {
    const parsed = JSON.parse(draftRaw) as unknown;
    if (!isDocNode(parsed)) throw new Error("Invalid legacy document draft");
    content = parsed;
  }

  const rawSettings = settingsRaw
    ? JSON.parse(settingsRaw) as DocumentStudioSettings
    : options?.settings;

  const record = await library.createDocument({
    title: sanitizeDocumentTitle(titleRaw) || options?.defaultTitle || defaultDocumentTitle(false),
    content,
    ...(rawSettings ? { documentSettings: rawSettings } : {}),
  });

  if (library.durability === "memory") return record;

  // IndexedDB createDocument resolves only after transaction completion.
  // An unrelated library document is not proof this draft was migrated.
  try {
    storage.setItem(LIBRARY_MIGRATION_KEY, "done");
    storage.removeItem("qalam-document-studio-title");
    storage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
  } catch (error) {
    // Keep migration retryable if cleanup fails. The destination is already
    // durable, even if the browser also refuses these restorations.
    try {
      if (draftRaw !== null) storage.setItem(LEGACY_DRAFT_STORAGE_KEY, draftRaw);
      if (titleRaw !== null) storage.setItem("qalam-document-studio-title", titleRaw);
    } finally {
      storage.removeItem(LIBRARY_MIGRATION_KEY);
    }
    throw error;
  }
  return record;
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
