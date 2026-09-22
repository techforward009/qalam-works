import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CHUNKER_VERSION,
  adaptProcessText,
  createChunks,
  ingestDocument,
  pageId,
  type DocumentPage,
} from "../../app/tools/research-studio/engine";

function page(rawText: string, pageNumber = 1, documentId = "book_001"): DocumentPage {
  return {
    id: pageId(documentId, pageNumber),
    documentId,
    pageNumber,
    rawText,
    normalizedText: adaptProcessText(rawText).normalizedText,
    extractionMethod: "plain",
  };
}

describe("createChunks", () => {
  test("page 137 with two paragraphs → p137:c1 and p137:c2", () => {
    const fixture = JSON.parse(
      readFileSync(resolve(__dirname, "fixtures/page-137.json"), "utf8"),
    ) as {
      documentId: string;
      pageNumber: number;
      rawText: string;
      expected: { id: string; pageNumber: number; chunkIndex: number }[];
    };
    const { chunks, chunkerVersion } = createChunks([
      page(fixture.rawText, fixture.pageNumber, fixture.documentId),
    ]);
    expect(chunkerVersion).toBe(CHUNKER_VERSION);
    expect(chunks.map((c) => ({ id: c.id, pageNumber: c.pageNumber, chunkIndex: c.chunkIndex }))).toEqual(
      fixture.expected,
    );
    expect(chunks[0].rawText).toContain("امام حسن عسکری");
    expect(chunks[1].rawText).toContain("Imam Hasan al-Askari");
    expect(fixture.rawText.includes(chunks[0].rawText)).toBe(true);
    expect(fixture.rawText.includes(chunks[1].rawText)).toBe(true);
  });

  test("Urdu, Arabic, Persian, and mixed RTL/LTR stay on one page as separate paragraphs", () => {
    const ur = "یہ اردو پیراگراف ہے۔";
    const ar = "هذا نص عربي.";
    const fa = "این گزارش پارسی است.";
    const mixed = "اردو https://qalamworks.com دیکھیں";
    const raw = [ur, ar, fa, mixed].join("\n\n");
    const { chunks } = createChunks([page(raw, 1, "mix_001")]);
    expect(chunks).toHaveLength(4);
    expect(chunks.map((c) => c.id)).toEqual([
      "mix_001:p1:c1",
      "mix_001:p1:c2",
      "mix_001:p1:c3",
      "mix_001:p1:c4",
    ]);
    expect(chunks[0].rawText).toBe(ur);
    expect(chunks[1].rawText).toBe(ar);
    expect(chunks[2].rawText).toBe(fa);
    expect(chunks[3].rawText).toBe(mixed);
    expect(chunks[3].rawText).toContain("https://qalamworks.com");
  });

  test("Urdu paragraph with inner Latin stays one chunk", () => {
    const raw = "امام Hasan al-Askari علمی رہنما تھے۔";
    const { chunks } = createChunks([page(raw)]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].id).toBe("book_001:p1:c1");
    expect(chunks[0].rawText).toBe(raw);
  });

  test("chunks never cross page boundaries; ids match pageNumber", () => {
    const pages = [page("صفحہ ایک۔", 1, "doc_a"), page("صفحہ دو۔", 2, "doc_a")];
    const { chunks } = createChunks(pages);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].id).toBe("doc_a:p1:c1");
    expect(chunks[1].id).toBe("doc_a:p2:c1");
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[1].pageNumber).toBe(2);
    expect(chunks.every((c) => c.id === `${c.documentId}:p${c.pageNumber}:c${c.chunkIndex}`)).toBe(true);
  });

  test("empty / whitespace pages produce no chunks", () => {
    const { chunks } = createChunks([page(""), page("   \n\t  ", 2), page("متن", 3)]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].id).toBe("book_001:p3:c1");
  });

  test("same input twice → identical ids and rawText", () => {
    const pages = [
      page("پہلا پیراگراف۔\n\nدوسرا پیراگراف۔", 4, "stable"),
      page("This is English.", 5, "stable"),
    ];
    const a = createChunks(pages);
    const b = createChunks(pages);
    expect(a.chunkerVersion).toBe(b.chunkerVersion);
    expect(a.chunks.map((c) => ({ id: c.id, rawText: c.rawText, pageNumber: c.pageNumber }))).toEqual(
      b.chunks.map((c) => ({ id: c.id, rawText: c.rawText, pageNumber: c.pageNumber })),
    );
  });

  test("ingest then chunk is deterministic across two runs", async () => {
    const bytes = new TextEncoder().encode("ایک\n\nدو");
    const input = { bytes, filename: "n.md", documentId: "md_001" };
    const first = await ingestDocument(input);
    const second = await ingestDocument(input);
    const c1 = createChunks(first.pages);
    const c2 = createChunks(second.pages);
    expect(c1.chunks.map((c) => c.id)).toEqual(["md_001:p1:c1", "md_001:p1:c2"]);
    expect(c1.chunks.map((c) => c.rawText)).toEqual(c2.chunks.map((c) => c.rawText));
    expect(c1.chunks[0].normalizedText).toBe(adaptProcessText(c1.chunks[0].rawText).normalizedText);
  });
});
