import {
  CHUNKER_VERSION,
  INSUFFICIENT_EVIDENCE_EN,
  MAX_ANSWER_EVIDENCE,
  askResearch,
  createMemoryResearchEngineStore,
  deterministicEvidenceAdapter,
  makeStoredCorpus,
  verifyAnswer,
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

function save(
  docs: { id: string; pages: DocumentPage[]; chunks: DocumentChunk[] }[],
) {
  const store = createMemoryResearchEngineStore();
  for (const doc of docs) {
    const saved = store.save(makeStoredCorpus(document(doc.id, doc.pages.length), doc.pages, doc.chunks));
    if (!saved.ok) throw new Error(saved.error);
  }
  return store;
}

describe("typed research answer", () => {
  const store = save([
    {
      id: "book_001",
      pages: [
        page("book_001", 1, "امام حسن   عسکری کا ذکر۔", "امام حسن عسکری کا ذکر۔"),
        page("book_001", 2, "دوسرا صفحہ بھی عسکری کو یاد کرتا ہے۔"),
      ],
      chunks: [
        chunk("book_001", 1, 1, "امام حسن   عسکری کا ذکر۔", "امام حسن عسکری کا ذکر۔"),
        chunk("book_001", 2, 1, "دوسرا صفحہ بھی عسکری کو یاد کرتا ہے۔"),
      ],
    },
    {
      id: "book_002",
      pages: [page("book_002", 1, "پیدائش 868 میں ہوئی"), page("book_002", 2, "پیدائش 874 میں ہوئی")],
      chunks: [
        chunk("book_002", 1, 1, "پیدائش 868 میں ہوئی"),
        chunk("book_002", 2, 1, "پیدائش 874 میں ہوئی"),
      ],
    },
    {
      id: "book_003",
      pages: [page("book_003", 1, "صرف ایک عسکری")],
      chunks: [chunk("book_003", 1, 1, "صرف ایک عسکری")],
    },
  ]);

  test("sufficient evidence returns verified raw quotes and no extra prose", () => {
    const result = askResearch(store, "عسکری", { documentIds: ["book_001"] });
    expect(result.status).toBe("answered");
    expect(result.answered).toBe(true);
    expect(result.refusalReason).toBeUndefined();
    expect(result.citations).toHaveLength(2);
    expect(result.citations.map((citation) => citation.quote)).toEqual([
      "امام حسن   عسکری کا ذکر۔",
      "دوسرا صفحہ بھی عسکری کو یاد کرتا ہے۔",
    ]);
    expect(result.answer).toBe(result.citations.map((citation) => citation.quote).join("\n\n"));
    expect(result.answer).not.toMatch(/therefore|نتیجہ|I think/i);
    expect(result.sections).toEqual(result.citations);
    expect(result.citations.map((citation) => citation.chunkId)).toEqual(["book_001:p1:c1", "book_001:p2:c1"]);
    expect(result.evidence).toEqual({ chunksUsed: 2, reason: "sufficient" });
    expect(verifyAnswer(result, [
      chunk("book_001", 1, 1, "امام حسن   عسکری کا ذکر۔"),
      chunk("book_001", 2, 1, "دوسرا صفحہ بھی عسکری کو یاد کرتا ہے۔"),
    ]).answered).toBe(true);
  });

  test("no evidence, weak evidence, and conflicting evidence refuse without citations", () => {
    const missing = askResearch(store, "یہ لفظ موجود نہیں");
    expect(missing.status).toBe("refused");
    expect(missing.refusalReason).toBe("no_evidence");
    expect(missing.citations).toEqual([]);
    expect(missing.answer).toBe(INSUFFICIENT_EVIDENCE_EN);

    const weak = askResearch(store, "عسکری زائد", { documentIds: ["book_003"] });
    expect(weak.refusalReason).toBe("weak_retrieval");
    expect(weak.citations).toEqual([]);
    expect(weak.sections).toEqual([]);

    const conflict = askResearch(store, "پیدائش", { documentIds: ["book_002"] });
    expect(conflict.status).toBe("refused");
    expect(conflict.refusalReason).toBe("conflicting_evidence");
    expect(conflict.citations).toEqual([]);
    expect(conflict.answer).toBe(INSUFFICIENT_EVIDENCE_EN);
  });

  test("the answer adapter is not called when the gate refuses", () => {
    let calls = 0;
    const refused = askResearch(store, "عسکری زائد", {
      documentIds: ["book_003"],
      adapter: (input) => {
        calls += 1;
        return deterministicEvidenceAdapter(input);
      },
    });
    expect(refused.refusalReason).toBe("weak_retrieval");
    expect(calls).toBe(0);
  });

  test("an unverified citation refuses the whole answer", () => {
    const result = askResearch(store, "عسکری", {
      documentIds: ["book_001"],
      adapter: () => ({
        answer: "بنایا ہوا خلاصہ",
        citations: [
          {
            documentId: "book_001",
            pageNumber: 1,
            chunkId: "book_001:p1:c1",
            quote: "یہ اقتباس متن میں نہیں",
          },
        ],
      }),
    });
    expect(result.status).toBe("refused");
    expect(result.refusalReason).toBe("invalid_citation");
    expect(result.citations).toEqual([]);
    expect(result.answer).toBe(INSUFFICIENT_EVIDENCE_EN);
    expect(result.answer).not.toContain("بنایا ہوا خلاصہ");
  });

  test("malformed adapter output and an empty query refuse", () => {
    const malformed = askResearch(store, "عسکری", {
      documentIds: ["book_001"],
      adapter: () => ({ answer: "x", citations: [{ quote: 1 }] as unknown as [] }),
    });
    expect(malformed.refusalReason).toBe("malformed_evidence");
    expect(malformed.citations).toEqual([]);

    let calls = 0;
    const empty = askResearch(store, "   ", {
      adapter: (input) => {
        calls += 1;
        return deterministicEvidenceAdapter(input);
      },
    });
    expect(empty.refusalReason).toBe("empty_query");
    expect(empty.query).toBe("   ");
    expect(calls).toBe(0);
  });

  test("document scope and repeated runs stay deterministic", () => {
    const scoped = askResearch(store, "عسکری", { documentIds: ["book_001"] });
    const again = askResearch(store, "عسکری", { documentIds: ["book_001"] });
    expect(again).toEqual(scoped);
    expect(scoped.citations.every((citation) => citation.documentId === "book_001")).toBe(true);
    expect(askResearch(store, "عسکری", { documentIds: ["book_002"] }).refusalReason).toBe("no_evidence");
  });

  test("more than five strong chunks are capped", () => {
    const pages = Array.from({ length: 6 }, (_, index) =>
      page("many", index + 1, `نشان نمبر ${index + 1} الگ عبارت`),
    );
    const chunks = pages.map((item, index) =>
      chunk("many", index + 1, 1, item.rawText),
    );
    const many = save([{ id: "many", pages, chunks }]);
    const result = askResearch(many, "نشان", { k: 10 });
    expect(result.status).toBe("answered");
    expect(result.citations).toHaveLength(MAX_ANSWER_EVIDENCE);
    expect(result.citations).toHaveLength(5);
  });
});
