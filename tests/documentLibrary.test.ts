import { afterEach, describe, expect, it } from "vitest";
import {
  ACTIVE_DOCUMENT_STORAGE_KEY,
  LEGACY_DRAFT_STORAGE_KEY,
  LIBRARY_MIGRATION_KEY,
  createMemoryDocumentLibrary,
  loadActiveDocumentId,
  migrateLegacyDraftIfNeeded,
  saveActiveDocumentId,
  type DocumentLibrary,
  type DocumentRecord,
} from "../app/tools/document-studio/utils/documentLibrary";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

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
  it("migrates an existing draft once and then removes legacy content keys", async () => {
    const library = createMemoryDocumentLibrary();
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
    const result = await migrateLegacyDraftIfNeeded(failing, storage);
    expect(result).toBeNull();
    expect(storage.getItem(LEGACY_DRAFT_STORAGE_KEY)).toBeTruthy();
    expect(storage.getItem("qalam-document-studio-title")).toBe("Keep title");
    expect(storage.getItem(LIBRARY_MIGRATION_KEY)).toBeNull();
  });

  it("does not keep full document content dependent on localStorage after migration", async () => {
    const library = createMemoryDocumentLibrary();
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
