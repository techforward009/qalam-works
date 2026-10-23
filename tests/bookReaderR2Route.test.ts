import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const r2 = vi.hoisted(() => ({
  selected: vi.fn(), catalog: vi.fn(), source: vi.fn(), record: vi.fn(),
}));
vi.mock("../app/api/research/bookLibraryR2Reader", () => ({
  bookLibraryR2IsSelected: r2.selected,
  loadBookLibraryR2Catalog: r2.catalog,
  readBookSourceFromR2: r2.source,
  readBookRecordFromR2: r2.record,
}));
import { GET, POST } from "../app/api/khateeb/book-reader/route";
import type { BookSource, BookRecord } from "../app/lib/knowledge/bookCorpus";

const source: BookSource = {
  id: "sahifa-ur", book: "sahifa", language: "ur",
  filename: "reviewed-sahifa.docx", sha256: "a".repeat(64), translator: "Provided edition",
};
const original: BookRecord = {
  id: "sahifa-ur:supplication:24", sourceId: source.id, book: source.book, language: "ur",
  kind: "supplication", number: 24, title: "والدین کے لیے دعا",
  textSha256: "b".repeat(64),
  reference: { sourceId: source.id, section: "supplication", number: 24, locator: "word/document.xml", printPage: null },
  paragraphs: [
    { id: "sahifa-ur:supplication:24:p1", text: "اپنے والدین کے حق میں حضرتؑ کی دُعا:" },
    { id: "sahifa-ur:supplication:24:p2", text: "اے اللہ! میرے والدین پر رحم فرما۔" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  r2.selected.mockResolvedValue(true);
  r2.catalog.mockResolvedValue({ ready: true, revision: "c".repeat(64), recordCount: 1, sources: [source] });
  r2.source.mockResolvedValue({ source, records: [original] });
  r2.record.mockResolvedValue({ source, record: original });
});

const url = "https://qalam.test/api/khateeb/book-reader";

describe("Public Book Reader: verified R2-only delivery", () => {
  it("serves public shelf, bounded contents, and exact source records", async () => {
    const shelf = await GET(new NextRequest(url + "?op=catalog"));
    expect(shelf.status).toBe(200);
    expect(shelf.headers.get("cache-control")).toBe("public, max-age=60, s-maxage=300, stale-while-revalidate=604800");
    expect((await shelf.json()).sources[0].id).toBe(source.id);
    const contents = await GET(new NextRequest(url + "?op=contents&sourceId=sahifa-ur"));
    expect(contents.status).toBe(200);
    expect((await contents.json()).entries[0].id).toBe(original.id);
    const read = await GET(new NextRequest(url + "?op=read&sourceId=sahifa-ur&id=" + original.id));
    expect(read.status).toBe(200);
    expect(read.headers.get("cache-control")).toBe("public, max-age=60, s-maxage=86400, stale-while-revalidate=604800");
    const body = await read.json();
    expect(body.paragraphs.map((p: { text: string }) => p.text)).toEqual(original.paragraphs.map(p => p.text));
    expect(body.recordSha256).toBe(original.textSha256);
    expect(body.sourceSha256).toBe(source.sha256);
    expect(body.screenPartOnly).toBe(true);
    expect(body.pageCount).toBe(1);
    expect(r2.record).toHaveBeenCalledWith(source.id, original.id);
    expect(r2.source).toHaveBeenCalledWith(source.id);
  });

  it("supports source-scoped search and does not invent printed page numbers", async () => {
    const response = await GET(new NextRequest(url + "?op=find&sourceId=sahifa-ur&query=" + encodeURIComponent("والدین")));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.total).toBeGreaterThan(0);
    expect(data.hits[0].recordId).toBe(original.id);
  });

  it("assembles source-verified excerpt without changing the corpus", async () => {
    const before = JSON.stringify(original);
    const req = new NextRequest(url, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://qalam.test" },
      body: JSON.stringify({ sourceId: source.id, recordId: original.id, part: 1,
        sourceSha256: source.sha256, recordSha256: original.textSha256,
        paragraphIds: [original.paragraphs[1].id] }) });
    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const data = await response.json();
    expect(data.excerpt.paragraphs).toEqual([original.paragraphs[1]]);
    expect(data.excerpt.sourceSha256).toBe(source.sha256);
    expect(JSON.stringify(original)).toBe(before);
  });

  it("rejects stale data and forged cross-origin posts", async () => {
    const bad = await POST(new NextRequest(url, { method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://attacker.invalid" },
      body: JSON.stringify({}) }));
    expect(bad.status).toBe(400);
    expect(bad.headers.get("cache-control")).toBe("private, no-store");
    const stale = await POST(new NextRequest(url, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId: source.id, recordId: original.id, part: 1,
        sourceSha256: "d".repeat(64), recordSha256: original.textSha256,
        paragraphIds: [original.paragraphs[1].id] }) }));
    expect(stale.status).toBe(409);
  });

  it.each([["cookie", "qalam_research_session=owner"], ["authorization", "Bearer owner"]])("does not publicly cache credential-bearing GETs: %j", async (name, value) => {
    const response = await GET(new NextRequest(url, { headers: { [name]: value } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("keeps invalid and unavailable GET responses private", async () => {
    const invalid = await GET(new NextRequest(url + "?op=invalid"));
    expect(invalid.status).toBe(400);
    expect(invalid.headers.get("cache-control")).toBe("private, no-store");
    r2.selected.mockResolvedValue(false);
    const unavailable = await GET(new NextRequest(url));
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get("cache-control")).toBe("private, no-store");
  });

  it("fails closed with no Vercel Blob fallback", async () => {
    r2.selected.mockResolvedValue(false);
    expect((await GET(new NextRequest(url))).status).toBe(503);
    expect((await POST(new NextRequest(url, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId: source.id, recordId: original.id, part: 1,
        sourceSha256: source.sha256, recordSha256: original.textSha256,
        paragraphIds: [original.paragraphs[1].id] }) }))).status).toBe(503);
    expect(r2.record).not.toHaveBeenCalled();
  });
});
