import {
  CHUNKER_VERSION,
  createMemoryResearchEngineStore,
  makeStoredCorpus,
  verifyAnswer,
  verifyCitation,
  type Citation,
  type DocumentChunk,
  type DocumentPage,
  type ResearchAnswer,
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

const urduRaw = "یہ    اردو ہے۔";
const arabicRaw = "هذا نص عربي.";
const persianRaw = "این گزارش پارسی است.";
const mixedRaw = "اردو https://qalamworks.com دیکھیں";

const store = createMemoryResearchEngineStore();
store.save(
  makeStoredCorpus(document("book_001", 2), [
    page("book_001", 1, `${urduRaw}\n${arabicRaw}`, "یہ اردو ہے۔\nهذا نص عربي."),
    page("book_001", 2, `${persianRaw} ${mixedRaw}`, persianRaw),
  ], [
    chunk("book_001", 1, 1, urduRaw, "یہ اردو ہے۔"),
    chunk("book_001", 1, 2, arabicRaw),
    chunk("book_001", 2, 1, persianRaw),
    chunk("book_001", 2, 2, mixedRaw),
    chunk("book_001", 2, 3, "كراچى", "کراچی"),
    chunk("book_001", 2, 4, "عسکری کا ذکر۔ عسکری کا ذکر۔"),
  ]),
);

function check(pageNumber: number, chunkIndex: number, quote: string, documentId = "book_001") {
  return verifyCitation(store, {
    documentId,
    pageNumber,
    chunkId: `${documentId}:p${pageNumber}:c${chunkIndex}`,
    quote,
  });
}

describe("citation verification", () => {
  test("exact Urdu, Arabic, Persian, and mixed quotes verify against rawText", () => {
    const urdu = check(1, 1, "یہ    اردو ہے۔");
    expect(urdu.ok).toBe(true);
    expect(urdu.status).toBe("verified");
    expect(urdu.sourceQuote).toBe(urduRaw);
    expect(urdu.pageNumber).toBe(1);
    expect(urdu.chunkId).toBe("book_001:p1:c1");

    expect(check(1, 2, arabicRaw).ok).toBe(true);
    expect(check(2, 1, persianRaw).sourceQuote).toBe(persianRaw);
    const mixed = check(2, 2, "https://qalamworks.com");
    expect(mixed.ok).toBe(true);
    expect(mixed.sourceQuote).toBe("https://qalamworks.com");
  });

  test("punctuation must be present, and a middle slice of one chunk passes", () => {
    expect(check(1, 2, "عربي.").ok).toBe(true);
    expect(check(1, 2, "عربي!").reason).toBe("quote_not_found");
    expect(check(1, 2, "عربی").reason).toBe("quote_not_found");
    expect(check(2, 1, "گزارش پارسی").sourceQuote).toBe("گزارش پارسی");
  });

  test("whitespace fold passes; an inserted Latin word fails", () => {
    const folded = check(1, 1, "یہ اردو ہے۔");
    expect(folded.ok).toBe(true);
    expect(folded.quote).toBe("یہ اردو ہے۔");
    expect(folded.sourceQuote).toBe("یہ    اردو ہے۔");
    expect(check(1, 1, "یہ foo اردو ہے۔").status).toBe("invalid_citation");
  });

  test("a quote that only matches normalizedText is not verified", () => {
    const result = check(2, 3, "کراچی");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("quote_not_found");
    expect(check(2, 3, "كراچى").ok).toBe(true);
  });

  test("partial invention and a quote across two chunks fail", () => {
    expect(check(1, 1, "یہ اردو نہیں").reason).toBe("quote_not_found");
    expect(check(1, 1, `${urduRaw} ${arabicRaw}`).reason).toBe("quote_not_found");
  });

  test("empty quote, missing document, missing page, and bad provenance", () => {
    expect(check(1, 1, "   ").reason).toBe("empty_quote");
    expect(check(1, 1, "   ").status).toBe("invalid_citation");

    const missing = verifyCitation(store, {
      documentId: "missing",
      pageNumber: 1,
      chunkId: "missing:p1:c1",
      quote: "اردو",
    });
    expect(missing.status).toBe("missing_source");
    expect(missing.reason).toBe("missing_document");

    expect(check(9, 1, "اردو").reason).toBe("missing_page");
    expect(check(1, 9, "اردو").reason).toBe("missing_chunk");

    const forged = verifyCitation(store, {
      documentId: "book_001",
      pageNumber: 1,
      chunkId: "forged",
      quote: urduRaw,
    });
    expect(forged.status).toBe("invalid_provenance");
    expect(forged.reason).toBe("provenance_mismatch");

    const wrongPage = verifyCitation(store, {
      documentId: "book_001",
      pageNumber: 1,
      chunkId: "book_001:p2:c1",
      quote: persianRaw,
    });
    expect(wrongPage.status).toBe("invalid_provenance");
  });

  test("repeated phrase verifies the first raw slice, and repeats are identical", () => {
    const first = check(2, 4, "عسکری کا ذکر۔");
    const second = check(2, 4, "عسکری کا ذکر۔");
    expect(first).toEqual(second);
    expect(first.sourceQuote).toBe("عسکری کا ذکر۔");
    expect(first.ok).toBe(true);
  });

  test("stored chunks are not rewritten", () => {
    const before = store.get("book_001");
    check(1, 1, "یہ اردو ہے۔");
    const after = store.get("book_001");
    expect(after).toEqual(before);
  });

  test("verifyAnswer refuses a forged chunk id and does not invent a quote", () => {
    const chunks = [
      chunk("book_001", 1, 2, arabicRaw),
    ];
    const citation: Citation = {
      documentId: "book_001",
      pageNumber: 1,
      chunkId: "book_001:p1:c2",
      quote: arabicRaw,
    };
    const answer: ResearchAnswer = {
      answered: true,
      answer: "موجودہ جواب",
      citations: [citation],
      evidence: { chunksUsed: 1, reason: "sufficient" },
    };
    expect(verifyAnswer(answer, chunks)).toBe(answer);

    const forged = verifyAnswer(
      { ...answer, citations: [{ ...citation, chunkId: "book_001:p1:c9" }] },
      chunks,
    );
    expect(forged.answered).toBe(false);
    expect(forged.citations).toEqual([]);
    expect(forged.answer).toBe("موجودہ جواب");

    const invented = verifyAnswer(
      { ...answer, citations: [{ ...citation, quote: "نص مزید" }] },
      chunks,
    );
    expect(invented.answered).toBe(false);
    expect(invented.citations).toEqual([]);
  });
});
