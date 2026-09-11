/** @vitest-environment happy-dom */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACTIVE_DOCUMENT_STORAGE_KEY,
  LEGACY_DRAFT_STORAGE_KEY,
  LIBRARY_MIGRATION_KEY,
  createMemoryDocumentLibrary,
  getDocumentLibrary,
  setDocumentLibraryForTests,
  loadActiveDocumentId,
  migrateLegacyDraftIfNeeded,
  saveActiveDocumentId,
  type DocumentLibrary,
  type DocumentRecord,
} from "../app/tools/document-studio/utils/documentLibrary";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

// Narrow IndexedDB event harness: request success and transaction commit are
// separate, so migration must wait for the actual backend's commit boundary.
function installIndexedDB(options: { holdWrites?: boolean; abortWrites?: boolean } = {}) {
  const records = new Map<string, DocumentRecord>();
  const commits: (() => void)[] = [];
  const db = {
    transaction() {
      const tx = {
        oncomplete: null as null | (() => void),
        onabort: null as null | (() => void),
        error: new Error("transaction aborted"),
        objectStore() {
          const requestFor = (result: unknown, write?: () => void) => {
            const request = { result, onsuccess: null as null | (() => void) };
            queueMicrotask(() => {
              request.onsuccess?.();
              const complete = () => {
                if (write && options.abortWrites) { tx.onabort?.(); return; }
                write?.();
                tx.oncomplete?.();
              };
              if (write && options.holdWrites) commits.push(complete);
              else queueMicrotask(complete);
            });
            return request;
          };
          return {
            getAll: () => requestFor([...records.values()]),
            get: (id: string) => requestFor(records.get(id)),
            put: (record: DocumentRecord) => requestFor(record.id, () => records.set(record.id, structuredClone(record))),
          };
        },
      };
      return tx;
    },
  };
  vi.stubGlobal("indexedDB", {
    open: vi.fn(() => {
      const request = { result: db, onsuccess: null as null | (() => void) };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    }),
  });
  return { records, commits };
}

afterEach(() => {
  setDocumentLibraryForTests(null);
  vi.unstubAllGlobals();
  localStorage.clear();
});

function paragraph(text: string): DocNode {
  return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

function memoryStorage(seed: Record<string, string> = {}) {
  const data = { ...seed };
  return {
    getItem(key: string) {
      return key in data ? data[key] : null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
    removeItem(key: string) {
      delete data[key];
    },
    snapshot() {
      return { ...data };
    },
  };
}

describe("document library storage", () => {
  it("creates a document record", async () => {
    const library = createMemoryDocumentLibrary();
    const record = await library.createDocument({ title: "First", content: paragraph("سلام") });
    expect(record.id).toBeTruthy();
    expect(record.title).toBe("First");
    expect(record.schemaVersion).toBe(1);
    expect(record.content.type).toBe("doc");
    const loaded = await library.getDocument(record.id);
    expect(loaded?.title).toBe("First");
  });

  it("lists documents newest-first", async () => {
    const library = createMemoryDocumentLibrary();
    const older = await library.createDocument({ title: "Older" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await library.createDocument({ title: "Newer" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await library.updateDocument(older.id, { title: "Older updated" });
    const list = await library.listDocuments();
    expect(list.map((item) => item.title)).toEqual(["Older updated", "Newer"]);
  });

  it("opens / loads a document by id", async () => {
    const library = createMemoryDocumentLibrary();
    const created = await library.createDocument({ title: "Notes", content: paragraph("abc") });
    const loaded = await library.getDocument(created.id);
    expect(loaded?.id).toBe(created.id);
    expect(JSON.stringify(loaded?.content)).toContain("abc");
  });

  it("autosave updates the active record without creating another", async () => {
    const library = createMemoryDocumentLibrary();
    const created = await library.createDocument({ title: "Draft", content: paragraph("one") });
    const updated = await library.updateDocument(created.id, { content: paragraph("two") });
    expect(updated.id).toBe(created.id);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
    expect(JSON.stringify((await library.getDocument(created.id))?.content)).toContain("two");
    expect((await library.listDocuments()).length).toBe(1);
  });

  it("persists title in the record", async () => {
    const library = createMemoryDocumentLibrary();
    const created = await library.createDocument({ title: "Old" });
    await library.renameDocument(created.id, "  New title  ");
    expect((await library.getDocument(created.id))?.title).toBe("New title");
  });

  it("persists document settings in the record", async () => {
    const library = createMemoryDocumentLibrary();
    const settings = defaultDocumentSettings();
    settings.page.size = "a5";
    const created = await library.createDocument({ documentSettings: settings });
    expect((await library.getDocument(created.id))?.documentSettings.page.size).toBe("a5");
    settings.page.orientation = "landscape";
    await library.updateDocument(created.id, { documentSettings: settings });
    expect((await library.getDocument(created.id))?.documentSettings.page.orientation).toBe("landscape");
  });

  it("New creates a second document instead of destroying the first", async () => {
    const library = createMemoryDocumentLibrary();
    const first = await library.createDocument({ title: "Keep me", content: paragraph("keep") });
    const second = await library.createDocument({ title: "Untitled document" });
    expect((await library.listDocuments()).length).toBe(2);
    expect((await library.getDocument(first.id))?.title).toBe("Keep me");
    expect(second.id).not.toBe(first.id);
  });

  it("deletes a non-active document without touching others", async () => {
    const library = createMemoryDocumentLibrary();
    const keep = await library.createDocument({ title: "Keep" });
    const drop = await library.createDocument({ title: "Drop" });
    await library.deleteDocument(drop.id);
    expect(await library.getDocument(drop.id)).toBeNull();
    expect((await library.getDocument(keep.id))?.title).toBe("Keep");
  });
});

describe("active document id persistence", () => {
  afterEach(() => {
    saveActiveDocumentId(null);
  });

  it("stores only the active id in localStorage", () => {
    const storage = memoryStorage();
    saveActiveDocumentId("abc-123", storage);
    expect(loadActiveDocumentId(storage)).toBe("abc-123");
    expect(storage.getItem(ACTIVE_DOCUMENT_STORAGE_KEY)).toBe("abc-123");
    expect(storage.getItem(LEGACY_DRAFT_STORAGE_KEY)).toBeNull();
  });
});

describe("legacy localStorage draft migration", () => {
  it("preserves real localStorage through open failure, reload, and later durable recovery", async () => {
    const raw = JSON.stringify(paragraph("recover this draft"));
    localStorage.setItem(LEGACY_DRAFT_STORAGE_KEY, raw);
    localStorage.setItem("qalam-document-studio-title", "Recover me");
    const open = vi.fn(() => {
      const request = { error: new Error("open denied"), onerror: null as null | (() => void) };
      queueMicrotask(() => request.onerror?.());
      return request;
    });
    vi.stubGlobal("indexedDB", { open });
    const first = await getDocumentLibrary();
    expect(open).toHaveBeenCalledOnce();
    expect(first.durability).toBe("memory");
    const temporary = await migrateLegacyDraftIfNeeded(first, localStorage);
    expect((await first.getDocument(temporary!.id))?.content).toEqual(paragraph("recover this draft"));
    expect(localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY)).toBe(raw);
    expect(localStorage.getItem("qalam-document-studio-title")).toBe("Recover me");
    expect(localStorage.getItem(LIBRARY_MIGRATION_KEY)).toBeNull();

    // Reload drops the module singleton and its session-only documents.
    setDocumentLibraryForTests(null);
    const reloaded = await getDocumentLibrary();
    expect(reloaded).not.toBe(first);
    expect(reloaded.durability).toBe("memory");
    expect(await reloaded.listDocuments()).toEqual([]);
    const recovered = await migrateLegacyDraftIfNeeded(reloaded, localStorage);
    expect(recovered?.content).toEqual(temporary?.content);
    expect(localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY)).toBe(raw);
    expect(localStorage.getItem(LIBRARY_MIGRATION_KEY)).toBeNull();

    setDocumentLibraryForTests(null);
    installIndexedDB();
    const persistent = await getDocumentLibrary();
    expect(persistent.durability).toBe("persistent");
    const migrated = await migrateLegacyDraftIfNeeded(persistent, localStorage);
    expect((await persistent.getDocument(migrated!.id))?.content).toEqual(temporary?.content);
    expect(localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(LIBRARY_MIGRATION_KEY)).toBe("done");
  });

  it("does not mark an empty memory session migrated", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const library = await getDocumentLibrary();
    expect(library.durability).toBe("memory");
    expect(await migrateLegacyDraftIfNeeded(library, localStorage)).toBeNull();
    expect(localStorage.getItem(LIBRARY_MIGRATION_KEY)).toBeNull();
  });

  it("waits for transaction commit, not merely request success, before cleanup", async () => {
    const { commits, records } = installIndexedDB({ holdWrites: true });
    const library = await getDocumentLibrary();
    const raw = JSON.stringify(paragraph("pending commit"));
    localStorage.setItem(LEGACY_DRAFT_STORAGE_KEY, raw);
    const migration = migrateLegacyDraftIfNeeded(library, localStorage);
    await vi.waitFor(() => expect(commits).toHaveLength(1));
    expect(records.size).toBe(0);
    expect(localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY)).toBe(raw);
    expect(localStorage.getItem(LIBRARY_MIGRATION_KEY)).toBeNull();
    commits.shift()!();
    const migrated = await migration;
    expect(records.get(migrated!.id)?.content).toEqual(paragraph("pending commit"));
    expect(localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(LIBRARY_MIGRATION_KEY)).toBe("done");
  });

  it("preserves the source and surfaces an IndexedDB transaction abort", async () => {
    const { records } = installIndexedDB({ abortWrites: true });
    const library = await getDocumentLibrary();
    const raw = JSON.stringify(paragraph("aborted"));
    localStorage.setItem(LEGACY_DRAFT_STORAGE_KEY, raw);
    await expect(migrateLegacyDraftIfNeeded(library, localStorage)).rejects.toThrow("transaction aborted");
    expect(records.size).toBe(0);
    expect(localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY)).toBe(raw);
    expect(localStorage.getItem(LIBRARY_MIGRATION_KEY)).toBeNull();
  });

  it.each(["{broken", '{"type":"unknown"}'])("does not replace an unreadable legacy draft with an empty document: %s", async (raw) => {
    installIndexedDB();
    const library = await getDocumentLibrary();
    localStorage.setItem(LEGACY_DRAFT_STORAGE_KEY, raw);
    await expect(migrateLegacyDraftIfNeeded(library, localStorage)).rejects.toThrow();
    expect(await library.listDocuments()).toEqual([]);
    expect(localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY)).toBe(raw);
    expect(localStorage.getItem(LIBRARY_MIGRATION_KEY)).toBeNull();
  });

  it("does not invalidate a legacy draft merely because another document exists", async () => {
    installIndexedDB();
    const library = await getDocumentLibrary();
    await library.createDocument({ content: paragraph("unrelated") });
    localStorage.setItem(LEGACY_DRAFT_STORAGE_KEY, JSON.stringify(paragraph("legacy")));
    const migrated = await migrateLegacyDraftIfNeeded(library, localStorage);
    expect((await library.getDocument(migrated!.id))?.content).toEqual(paragraph("legacy"));
    expect(await library.listDocuments()).toHaveLength(2);
  });

  it("preserves legacy content when its settings cannot be parsed", async () => {
    installIndexedDB();
    const library = await getDocumentLibrary();
    const raw = JSON.stringify(paragraph("keep with settings"));
    localStorage.setItem(LEGACY_DRAFT_STORAGE_KEY, raw);
    localStorage.setItem("qalam-document-studio-settings-v1", "{broken");
    await expect(migrateLegacyDraftIfNeeded(library, localStorage)).rejects.toThrow();
    expect(localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY)).toBe(raw);
    expect(localStorage.getItem("qalam-document-studio-settings-v1")).toBe("{broken");
    expect(localStorage.getItem(LIBRARY_MIGRATION_KEY)).toBeNull();
  });

  it.each(["marker", "cleanup"])("preserves the source and clears the marker on %s failure", async (stage) => {
    installIndexedDB();
    const library = await getDocumentLibrary();
    const raw = JSON.stringify(paragraph("keep after cleanup failure"));
    const storage = memoryStorage({ [LEGACY_DRAFT_STORAGE_KEY]: raw, "qalam-document-studio-title": "Keep" });
    const failing = {
      ...storage,
      setItem(key: string, value: string) {
        if (stage === "marker" && key === LIBRARY_MIGRATION_KEY) throw new Error("storage denied");
        storage.setItem(key, value);
      },
      removeItem(key: string) {
        if (stage === "cleanup" && key === LEGACY_DRAFT_STORAGE_KEY) throw new Error("storage denied");
        storage.removeItem(key);
      },
    };
    await expect(migrateLegacyDraftIfNeeded(library, failing)).rejects.toThrow("storage denied");
    expect(storage.getItem(LEGACY_DRAFT_STORAGE_KEY)).toBe(raw);
    expect(storage.getItem("qalam-document-studio-title")).toBe("Keep");
    expect(storage.getItem(LIBRARY_MIGRATION_KEY)).toBeNull();
  });

  it("migrates an existing draft once and then removes legacy content keys", async () => {
    installIndexedDB();
    const library = await getDocumentLibrary();
    const storage = memoryStorage({
      [LEGACY_DRAFT_STORAGE_KEY]: JSON.stringify(paragraph("میراث")),
      "qalam-document-studio-title": "Old draft",
    });
    const first = await migrateLegacyDraftIfNeeded(library, storage);
    expect(first?.title).toBe("Old draft");
    expect(JSON.stringify(first?.content)).toContain("میراث");
    expect(storage.getItem(LIBRARY_MIGRATION_KEY)).toBe("done");
    expect(storage.getItem(LEGACY_DRAFT_STORAGE_KEY)).toBeNull();
    expect(storage.getItem("qalam-document-studio-title")).toBeNull();

    const second = await migrateLegacyDraftIfNeeded(library, storage);
    expect(second).toBeNull();
    expect((await library.listDocuments()).length).toBe(1);
  });

  it("does not erase legacy data when migration save fails", async () => {
    const failing: DocumentLibrary = {
      durability: "persistent",
      async listDocuments() {
        return [];
      },
      async getDocument() {
        return null;
      },
      async createDocument(): Promise<DocumentRecord> {
        throw new Error("quota");
      },
      async updateDocument(): Promise<DocumentRecord> {
        throw new Error("quota");
      },
      async deleteDocument() {},
      async renameDocument(): Promise<DocumentRecord> {
        throw new Error("quota");
      },
    };
    const storage = memoryStorage({
      [LEGACY_DRAFT_STORAGE_KEY]: JSON.stringify(paragraph("keep")),
      "qalam-document-studio-title": "Keep title",
    });
    await expect(migrateLegacyDraftIfNeeded(failing, storage)).rejects.toThrow("quota");
    expect(storage.getItem(LEGACY_DRAFT_STORAGE_KEY)).toBeTruthy();
    expect(storage.getItem("qalam-document-studio-title")).toBe("Keep title");
    expect(storage.getItem(LIBRARY_MIGRATION_KEY)).toBeNull();
  });

  it("does not keep full document content dependent on localStorage after migration", async () => {
    installIndexedDB();
    const library = await getDocumentLibrary();
    const storage = memoryStorage({
      [LEGACY_DRAFT_STORAGE_KEY]: JSON.stringify(paragraph("full-document-json")),
    });
    await migrateLegacyDraftIfNeeded(library, storage, { defaultTitle: "Migrated" });
    expect(storage.getItem(LEGACY_DRAFT_STORAGE_KEY)).toBeNull();
    const values = Object.values(storage.snapshot());
    expect(values.some((value) => value.includes("full-document-json"))).toBe(false);
    expect(JSON.stringify((await library.listDocuments())[0])).not.toContain("full-document-json");
    const loaded = await library.getDocument((await library.listDocuments())[0].id);
    expect(JSON.stringify(loaded?.content)).toContain("full-document-json");
  });
});
