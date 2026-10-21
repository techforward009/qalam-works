import { beforeEach, describe, expect, it, vi } from "vitest";

const r2 = vi.hoisted(() => ({
  selected: vi.fn(),
  catalog: vi.fn(),
  source: vi.fn(),
}));
const blob = vi.hoisted(() => ({
  client: vi.fn(),
  catalog: vi.fn(),
  source: vi.fn(),
}));
vi.mock("../app/api/research/bookLibraryR2Reader", () => ({
  bookLibraryR2IsSelected: r2.selected,
  loadBookLibraryR2Catalog: r2.catalog,
  readBookSourceFromR2: r2.source,
}));
vi.mock("../app/api/research/vercelResearchBlob", () => ({
  researchBlobClientFromEnv: blob.client,
}));
vi.mock("../app/lib/knowledge/store", () => ({ loadBookCatalog: blob.catalog }));
vi.mock("../app/lib/knowledge/sourceCache", () => ({ readBookSource: blob.source }));

import { loadKnowledgeBooks } from "../app/lib/knowledge/knowledgeBookBackend";

const sources = [
  { id: "nahj-ar", book: "nahj", language: "ar" },
  { id: "nahj-ur", book: "nahj", language: "ur" },
  { id: "sahifa-ar", book: "sahifa", language: "ar" },
  { id: "sahifa-en", book: "sahifa", language: "en" },
  { id: "kafi-v1-ar", book: "kafi", language: "ar" },
];
describe("Knowledge Assistant R2 book retrieval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    r2.selected.mockResolvedValue(true);
    r2.catalog.mockResolvedValue({ ready: true, sources, recordCount: 42 });
    r2.source.mockImplementation(async (id: string) => ({
      source: sources.find(source => source.id === id),
      records: [{ id: `${id}:test`, sourceId: id }],
    }));
  });
  it("reads all eligible Urdu and Arabic sources from R2, never Blob", async () => {
    const result = await loadKnowledgeBooks("all", "ur");
    expect(result.backend).toBe("r2");
    expect(result.sources.map(source => source.id)).toEqual(["nahj-ar", "nahj-ur", "sahifa-ar", "kafi-v1-ar"]);
    expect(result.records).toHaveLength(4);
    expect(blob.client).not.toHaveBeenCalled();
    expect(blob.catalog).not.toHaveBeenCalled();
  });
  it("respects selected collection and English edition", async () => {
    const result = await loadKnowledgeBooks("sahifa", "en");
    expect(result.sources.map(source => source.id)).toEqual(["sahifa-ar", "sahifa-en"]);
    expect(r2.source).toHaveBeenCalledTimes(2);
  });
  it("keeps Quran-only requests independent from either book store", async () => {
    const result = await loadKnowledgeBooks("quran", "ur");
    expect(result).toMatchObject({ backend: "none", sources: [], records: [] });
    expect(r2.catalog).not.toHaveBeenCalled();
    expect(blob.client).not.toHaveBeenCalled();
  });
  it("fails closed instead of switching to Blob if R2 is unavailable", async () => {
    r2.source.mockRejectedValueOnce(new Error("r2 unavailable"));
    await expect(loadKnowledgeBooks("nahj", "ur")).rejects.toThrow("r2 unavailable");
    expect(blob.client).not.toHaveBeenCalled();
  });
  it("preserves legacy Blob behavior only when R2 is explicitly disabled", async () => {
    r2.selected.mockResolvedValue(false);
    const client = { store: "legacy" };
    blob.client.mockResolvedValue(client);
    blob.catalog.mockResolvedValue({ manifest: { sources } });
    blob.source.mockImplementation(async (_client: unknown, _catalog: unknown, id: string) => [{ id: `${id}:test` }]);
    const result = await loadKnowledgeBooks("nahj", "ur");
    expect(result.backend).toBe("blob");
    expect(result.records).toHaveLength(2);
    expect(blob.client).toHaveBeenCalledTimes(1);
    expect(r2.catalog).not.toHaveBeenCalled();
  });
});
