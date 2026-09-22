import {
  CHUNKER_VERSION,
  ENGINE_DOC_KEY_PREFIX,
  ENGINE_LIST_KEY,
  createChunks,
  createLocalStorageResearchEngineStore,
  createMemoryResearchEngineStore,
  engineDocKey,
  ingestDocument,
  makeStoredCorpus,
  parseStoredCorpus,
} from "../../app/tools/research-studio/engine";

function makeStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  } as Storage;
}

describe("Research Engine storage", () => {
  test("memory write → read round trip preserves pages, chunks, and both texts", async () => {
    const ingested = await ingestDocument({
      bytes: new TextEncoder().encode("اردو پیراگراف۔\n\nThis is English.\n\nهذا عربي.\n\nاین گزارش پارسی است."),
      filename: "mix.txt",
      documentId: "book_001",
    });
    const { chunks, chunkerVersion } = createChunks(ingested.pages);
    const store = createMemoryResearchEngineStore();
    const saved = store.save(makeStoredCorpus(ingested.document, ingested.pages, chunks, chunkerVersion));
    expect(saved.ok).toBe(true);

    const loaded = store.get("book_001");
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.document.id).toBe("book_001");
    expect(loaded.value.document.chunkerVersion).toBe(CHUNKER_VERSION);
    expect(loaded.value.pages).toHaveLength(1);
    expect(loaded.value.pages[0].pageNumber).toBe(1);
    expect(loaded.value.chunks.length).toBeGreaterThanOrEqual(4);
    expect(loaded.value.chunks.map((c) => c.id)).toEqual(chunks.map((c) => c.id));
    expect(loaded.value.pages[0].rawText).toBe(ingested.pages[0].rawText);
    expect(loaded.value.pages[0].normalizedText).toBe(ingested.pages[0].normalizedText);
    expect(loaded.value.chunks[0].rawText).toContain("اردو");
    expect(loaded.value.chunks.some((c) => c.rawText.includes("https://") || c.rawText.includes("English"))).toBe(
      true,
    );
    expect(loaded.value.chunks.some((c) => c.rawText.includes("عربي"))).toBe(true);
    expect(loaded.value.chunks.some((c) => c.rawText.includes("پارسی"))).toBe(true);
  });

  test("multiple pages and form-feed chunks keep stable ids", async () => {
    const ingested = await ingestDocument({
      bytes: new TextEncoder().encode("ایک\fدو\fthree"),
      filename: "p.txt",
      documentId: "doc_pages",
    });
    const { chunks } = createChunks(ingested.pages);
    const store = createMemoryResearchEngineStore();
    store.save(makeStoredCorpus(ingested.document, ingested.pages, chunks));
    const loaded = store.get("doc_pages");
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.pages.map((p) => p.pageNumber)).toEqual([1, 2, 3]);
    expect(loaded.value.pages.map((p) => p.id)).toEqual(["doc_pages:p1", "doc_pages:p2", "doc_pages:p3"]);
    expect(loaded.value.chunks.map((c) => c.id)).toEqual(["doc_pages:p1:c1", "doc_pages:p2:c1", "doc_pages:p3:c1"]);
  });

  test("blank page empty rawText is valid and distinct from normalizedText contract", async () => {
    const ingested = await ingestDocument({
      bytes: new TextEncoder().encode("Alpha\f\fGamma"),
      filename: "gaps.txt",
      documentId: "gaps",
    });
    expect(ingested.pages[1].rawText.trim()).toBe("");
    const { chunks } = createChunks(ingested.pages);
    const store = createMemoryResearchEngineStore();
    store.save(makeStoredCorpus(ingested.document, ingested.pages, chunks));
    const loaded = store.get("gaps");
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.pages).toHaveLength(3);
    expect(loaded.value.pages[1].rawText).toBe(ingested.pages[1].rawText);
    expect(loaded.value.pages[1].normalizedText).toBe(ingested.pages[1].normalizedText);
    expect(loaded.value.chunks.some((c) => c.pageNumber === 2)).toBe(false);
  });

  test("missing document → not_found", () => {
    const store = createMemoryResearchEngineStore();
    expect(store.get("nope")).toEqual({ ok: false, error: "not_found" });
  });

  test("corrupt JSON and invalid corpus → corrupt", () => {
    const storage = makeStorage();
    storage.setItem(engineDocKey("bad"), "{");
    const store = createLocalStorageResearchEngineStore(storage);
    expect(store.get("bad")).toEqual({ ok: false, error: "unknown" });

    storage.setItem(engineDocKey("bad2"), JSON.stringify({ schemaVersion: 2, document: {}, pages: [], chunks: [] }));
    const bad2 = store.get("bad2");
    expect(bad2.ok).toBe(false);
    if (!bad2.ok) expect(bad2.error).toBe("corrupt");
  });

  test("parseStoredCorpus rejects pageCount mismatch and forged chunk ids", async () => {
    const ingested = await ingestDocument({
      bytes: new TextEncoder().encode("سلام"),
      filename: "a.txt",
      documentId: "x1",
    });
    const { chunks } = createChunks(ingested.pages);
    const good = makeStoredCorpus(ingested.document, ingested.pages, chunks);
    expect(parseStoredCorpus(good)).not.toBeNull();
    expect(parseStoredCorpus({ ...good, document: { ...good.document, pageCount: 9 } })).toBeNull();
    expect(
      parseStoredCorpus({
        ...good,
        chunks: [{ ...chunks[0], id: "forged" }],
      }),
    ).toBeNull();
    expect(
      parseStoredCorpus({
        ...good,
        pages: [{ ...good.pages[0], rawText: undefined }],
      }),
    ).toBeNull();
  });

  test("rawText is not replaced by normalizedText on round trip", async () => {
    const ingested = await ingestDocument({
      bytes: new TextEncoder().encode("یہ    متن ہے۔"),
      filename: "sp.txt",
      documentId: "sp1",
    });
    expect(ingested.pages[0].rawText).not.toBe(ingested.pages[0].normalizedText);
    const { chunks } = createChunks(ingested.pages);
    const store = createMemoryResearchEngineStore();
    store.save(makeStoredCorpus(ingested.document, ingested.pages, chunks));
    const loaded = store.get("sp1");
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.pages[0].rawText).toBe(ingested.pages[0].rawText);
    expect(loaded.value.pages[0].normalizedText).toBe(ingested.pages[0].normalizedText);
    expect(loaded.value.chunks[0].rawText).toBe(chunks[0].rawText);
    expect(loaded.value.chunks[0].normalizedText).toBe(chunks[0].normalizedText);
  });

  test("localStorage backend does not write notes-store keys", async () => {
    const storage = makeStorage();
    const ingested = await ingestDocument({
      bytes: new TextEncoder().encode("نمبر"),
      filename: "n.txt",
      documentId: "n1",
    });
    const { chunks } = createChunks(ingested.pages);
    const store = createLocalStorageResearchEngineStore(storage);
    store.save(makeStoredCorpus(ingested.document, ingested.pages, chunks));
    expect(storage.getItem(ENGINE_LIST_KEY)).toContain("n1");
    expect(storage.getItem(engineDocKey("n1"))).toContain("نمبر");
    expect(storage.getItem("qalam-research-projects-v1")).toBeNull();
    expect(storage.getItem("qalam-research-project-v1-n1")).toBeNull();
    expect(engineDocKey("n1").startsWith(ENGINE_DOC_KEY_PREFIX)).toBe(true);
    store.remove("n1");
    expect(store.get("n1").ok).toBe(false);
    expect(store.list()).toEqual([]);
  });
});
