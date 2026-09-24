import {
  CHUNKER_VERSION,
  createMemoryResearchEngineStore,
  makeStoredCorpus,
  searchKeywords,
  type DocumentChunk,
  type DocumentPage,
  type ResearchDocument,
} from "../../app/tools/research-studio/engine";

function document(id: string, pageCount: number): ResearchDocument {
  return {
    id,
    filename: `${id}.txt`,
    mimeType: "text/plain",
    language: "mixed",
    pageCount,
    createdAt: "2026-09-24T00:00:00.000Z",
    processingStatus: "ready",
    chunkerVersion: CHUNKER_VERSION,
  };
}

function page(documentId: string, pageNumber: number, rawText: string, normalizedText = rawText): DocumentPage {
  return {
    id: `${documentId}:p${pageNumber}`,
    documentId,
    pageNumber,
    rawText,
    normalizedText,
    extractionMethod: "plain",
  };
}

function chunk(
  documentId: string,
  pageNumber: number,
  chunkIndex: number,
  rawText: string,
  normalizedText = rawText,
): DocumentChunk {
  return {
    id: `${documentId}:p${pageNumber}:c${chunkIndex}`,
    documentId,
    pageNumber,
    chunkIndex,
    rawText,
    normalizedText,
    language: "mixed",
    direction: "rtl",
    contentType: "paragraph",
  };
}

function storeOf(
  docs: { id: string; pages: DocumentPage[]; chunks: DocumentChunk[] }[],
) {
  const store = createMemoryResearchEngineStore();
  for (const doc of docs) {
    const saved = store.save(makeStoredCorpus(document(doc.id, doc.pages.length), doc.pages, doc.chunks));
    if (!saved.ok) throw new Error(saved.error);
  }
  return store;
}

describe("keyword retrieval", () => {
  const book = storeOf([
    {
      id: "book_001",
      pages: [
        page("book_001", 1, "Hadith 289 is cited here."),
        page("book_001", 2, "امام حسن العسکری کی روایت۔   اصل فاصلے۔", "امام حسن العسکری کی روایت۔ اصل فاصلے۔"),
        page("book_001", 3, "امام Hasan al-Askari کا ذکر اسی صفحے پر ہے۔"),
      ],
      chunks: [
        chunk("book_001", 1, 1, "Hadith 289 is cited here."),
        chunk(
          "book_001",
          2,
          1,
          "امام حسن العسکری کی روایت۔   اصل فاصلے۔",
          "امام حسن العسکری کی روایت۔ اصل فاصلے۔",
        ),
        chunk("book_001", 3, 1, "امام Hasan al-Askari کا ذکر اسی صفحے پر ہے۔"),
        chunk("book_001", 3, 2, "ایک عام کتاب کا صفحہ۔"),
      ],
    },
    {
      id: "book_002",
      pages: [page("book_002", 1, "هذا نص عربي عن الإمام."), page("book_002", 2, "این گزارش پارسی است.")],
      chunks: [
        chunk("book_002", 1, 1, "هذا نص عربي عن الإمام."),
        chunk("book_002", 2, 1, "این گزارش پارسی است."),
      ],
    },
  ]);

  test("exact keyword and reference number", () => {
    const hits = searchKeywords(book, "Hadith 289");
    expect(hits[0]?.chunk.id).toBe("book_001:p1:c1");
    expect(hits[0]?.chunk.rawText).toContain("Hadith 289");
    expect(hits[0]?.source).toBe("keyword");
  });

  test("Urdu name, article variant, and short form hit the same page", () => {
    for (const query of ["امام حسن عسکری", "امام حسن العسکری", "حسن عسکری"]) {
      const hits = searchKeywords(book, query, { k: 5 });
      expect(hits.map((hit) => hit.chunk.id)).toContain("book_001:p2:c1");
      expect(hits[0]?.chunk.pageNumber).toBe(2);
    }
  });

  test("Arabic, Persian, and mixed queries keep page and chunk ids", () => {
    const ar = searchKeywords(book, "نص عربي");
    expect(ar[0]?.chunk.id).toBe("book_002:p1:c1");
    expect(ar[0]?.chunk.rawText).toContain("عربي");

    const fa = searchKeywords(book, "گزارش پارسی");
    expect(fa[0]?.chunk.id).toBe("book_002:p2:c1");

    const mixed = searchKeywords(book, "امام Hasan al-Askari");
    expect(mixed[0]?.chunk.id).toBe("book_001:p3:c1");
    expect(mixed[0]?.chunk.rawText).toContain("Hasan");
    expect(mixed[0]?.matchedTerms).toEqual(expect.arrayContaining(["امام", "hasan"]));
  });

  test("punctuation and hamza folding still match", () => {
    const punct = searchKeywords(book, "عسکری۔");
    expect(punct.some((hit) => hit.chunk.id === "book_001:p2:c1")).toBe(true);

    const hamzaStore = storeOf([
      {
        id: "names",
        pages: [page("names", 1, "أحمد")],
        chunks: [chunk("names", 1, 1, "أحمد", "أحمد")],
      },
    ]);
    const hits = searchKeywords(hamzaStore, "احمد");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.chunk.rawText).toBe("أحمد");
    expect(hits[0]?.chunk.normalizedText).toBe("أحمد");
  });

  test("repeated terms rank above a single mention; order is stable", () => {
    const store = storeOf([
      {
        id: "rep",
        pages: [page("rep", 2, "حسن"), page("rep", 1, "حسن حسن")],
        chunks: [
          chunk("rep", 2, 1, "حسن"),
          chunk("rep", 1, 1, "حسن حسن"),
          chunk("rep", 1, 2, "حسن"),
        ],
      },
    ]);
    const first = searchKeywords(store, "حسن", { k: 5 });
    const second = searchKeywords(store, "حسن", { k: 5 });
    expect(first.map((hit) => hit.chunk.id)).toEqual(second.map((hit) => hit.chunk.id));
    expect(first.map((hit) => hit.score)).toEqual(second.map((hit) => hit.score));
    expect(first[0]?.chunk.id).toBe("rep:p1:c1");
    expect(first[0]!.score).toBeGreaterThan(first[1]!.score);
    expect(first[1]?.chunk.id).toBe("rep:p1:c2");
    expect(first[2]?.chunk.id).toBe("rep:p2:c1");
  });

  test("equal scores tie-break by document, page, then chunk", () => {
    const store = storeOf([
      {
        id: "b",
        pages: [page("b", 1, "عسکری")],
        chunks: [chunk("b", 1, 1, "عسکری")],
      },
      {
        id: "a",
        pages: [page("a", 1, "عسکری"), page("a", 2, "عسکری")],
        chunks: [chunk("a", 2, 1, "عسکری"), chunk("a", 1, 2, "عسکری"), chunk("a", 1, 1, "عسکری")],
      },
    ]);
    const hits = searchKeywords(store, "عسکری", { k: 10 });
    expect(hits.map((hit) => hit.chunk.id)).toEqual(["a:p1:c1", "a:p1:c2", "a:p2:c1", "b:p1:c1"]);
    expect(new Set(hits.map((hit) => hit.score)).size).toBe(1);
  });

  test("missing terms, empty query, and punctuation-only query return nothing", () => {
    expect(searchKeywords(book, "xyzzy-not-in-corpus")).toEqual([]);
    expect(searchKeywords(book, "")).toEqual([]);
    expect(searchKeywords(book, "   ۔،؟ ")).toEqual([]);
  });

  test("document scope and result limit", () => {
    const scoped = searchKeywords(book, "عسکری", { documentIds: ["book_002"] });
    expect(scoped).toEqual([]);

    const limited = searchKeywords(book, "عسکری", { documentIds: ["book_001"], k: 1 });
    expect(limited).toHaveLength(1);
    expect(limited[0]?.chunk.documentId).toBe("book_001");

    expect(searchKeywords(book, "عسکری", { documentIds: [] })).toEqual([]);
    expect(searchKeywords(book, "عسکری", { documentIds: ["missing"] })).toEqual([]);
    expect(searchKeywords(book, "Hadith", { k: 0 })).toEqual([]);
  });

  test("rawText stays distinct from normalizedText", () => {
    const hits = searchKeywords(book, "العسکری");
    const hit = hits.find((item) => item.chunk.id === "book_001:p2:c1");
    expect(hit?.chunk.rawText).toContain("   ");
    expect(hit?.chunk.normalizedText).not.toContain("   ");
    expect(hit?.chunk.pageNumber).toBe(2);
    expect(hit?.chunk.documentId).toBe("book_001");
  });
});
