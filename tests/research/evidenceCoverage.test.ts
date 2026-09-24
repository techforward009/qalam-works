import {
  CHUNKER_VERSION,
  EVIDENCE_MIN_INDEPENDENT_CHUNKS,
  EVIDENCE_MIN_SCORE,
  MAX_ANSWER_EVIDENCE,
  askResearch,
  createMemoryResearchEngineStore,
  evaluateEvidence,
  makeStoredCorpus,
  searchKeywords,
  selectCoveredEvidence,
  type DocumentChunk,
  type DocumentPage,
  type ResearchDocument,
  type RetrievedChunk,
} from "../../app/tools/research-studio/engine";

const QUESTION =
  "What are the characteristic features of Abrotanum, and which remedies does Choudhuri compare with it in cases of marasmus?";

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

function page(documentId: string, pageNumber: number, rawText: string): DocumentPage {
  return {
    id: `${documentId}:p${pageNumber}`,
    documentId,
    pageNumber,
    rawText,
    normalizedText: rawText,
    extractionMethod: "plain",
  };
}

function chunk(documentId: string, pageNumber: number, chunkIndex: number, rawText: string): DocumentChunk {
  return {
    id: `${documentId}:p${pageNumber}:c${chunkIndex}`,
    documentId,
    pageNumber,
    chunkIndex,
    rawText,
    normalizedText: rawText,
    language: "mixed",
    direction: "ltr",
    contentType: "paragraph",
  };
}

function storeOf(docs: { id: string; raws: string[] }[]) {
  const store = createMemoryResearchEngineStore();
  for (const doc of docs) {
    const pages = doc.raws.map((raw, index) => page(doc.id, index + 1, raw));
    const chunks = pages.map((item) => chunk(item.documentId, item.pageNumber, 1, item.rawText));
    const saved = store.save(makeStoredCorpus(document(doc.id, pages.length), pages, chunks));
    if (!saved.ok) throw new Error(saved.error);
  }
  return store;
}

function featureText(n: number): string {
  return `${"abrotanum ".repeat(8)}${"marasmus ".repeat(8)}${"features ".repeat(8)}${"characteristic ".repeat(8)}passage ${n}`;
}

const COMPARE_TEXT = "choudhuri compare remedies";

function coverageDocs() {
  return storeOf([
    {
      id: "book_coverage",
      raws: [1, 2, 3, 4, 5].map((n) => featureText(n)).concat(COMPARE_TEXT),
    },
    {
      id: "book_other",
      raws: ["choudhuri compare remedies outside the selected document"],
    },
  ]);
}

function hit(
  documentId: string,
  pageNumber: number,
  chunkIndex: number,
  rawText: string,
  score: number,
  matchedTerms: string[],
): RetrievedChunk {
  return {
    chunk: chunk(documentId, pageNumber, chunkIndex, rawText),
    score,
    source: "keyword",
    matchedTerms,
  };
}

describe("query-term evidence coverage", () => {
  test("the evidence gate thresholds are unchanged", () => {
    expect(EVIDENCE_MIN_SCORE).toBe(1_000_000);
    expect(EVIDENCE_MIN_INDEPENDENT_CHUNKS).toBe(2);
  });

  test("a lower-ranked second aspect is kept when top-k would repeat the first", () => {
    const store = coverageDocs();
    const ranked = searchKeywords(store, QUESTION, { documentIds: ["book_coverage"], k: 5 });
    expect(ranked).toHaveLength(5);
    expect(ranked.map((item) => item.chunk.id)).not.toContain("book_coverage:p6:c1");
    expect(ranked[0]?.chunk.id).toBe("book_coverage:p1:c1");
    expect(ranked[0]!.score).toBeGreaterThan(searchKeywords(store, QUESTION, { documentIds: ["book_coverage"], k: 20 })[5]!.score);

    const pool = searchKeywords(store, QUESTION, { documentIds: ["book_coverage"], k: 20 });
    const gate = evaluateEvidence(pool, { query: QUESTION, documentIds: ["book_coverage"] });
    expect(gate.reason).toBe("sufficient");
    const selected = selectCoveredEvidence(gate.hits, {
      limit: MAX_ANSWER_EVIDENCE,
      documentIds: ["book_coverage"],
    });
    const ids = selected.map((item) => item.chunk.id);
    expect(ids).toContain("book_coverage:p1:c1");
    expect(ids).toContain("book_coverage:p6:c1");
    expect(selected).toHaveLength(MAX_ANSWER_EVIDENCE);
    expect(selected).toHaveLength(5);

    const answer = askResearch(store, QUESTION, { documentIds: ["book_coverage"] });
    expect(answer.answered).toBe(true);
    expect(answer.refusalReason).toBeUndefined();
    expect(answer.citations.map((citation) => citation.chunkId)).toEqual(expect.arrayContaining([
      "book_coverage:p1:c1",
      "book_coverage:p6:c1",
    ]));
    expect(answer.citations.length).toBeLessThanOrEqual(5);
    const compare = answer.citations.find((citation) => citation.chunkId === "book_coverage:p6:c1");
    const feature = answer.citations.find((citation) => citation.chunkId === "book_coverage:p1:c1");
    expect(compare?.quote).toBe(COMPARE_TEXT);
    expect(feature?.quote).toBe(featureText(1));
    expect(compare?.pageNumber).toBe(6);
    expect(feature?.pageNumber).toBe(1);
  });

  test("the same pool always selects the same chunks in the same order", () => {
    const store = coverageDocs();
    const first = askResearch(store, QUESTION, { documentIds: ["book_coverage"] });
    const second = askResearch(store, QUESTION, { documentIds: ["book_coverage"] });
    expect(second).toEqual(first);
  });

  test("document scope, invalid provenance, and stored text are unchanged", () => {
    const raw = "  features   abrotanum  ";
    const outside = hit("book_other", 1, 1, "choudhuri compare remedies", 9_000_000, ["choudhuri", "compare", "remedies"]);
    const broken = hit("book_coverage", 1, 1, raw, 8_000_000, ["abrotanum"]);
    broken.chunk = { ...broken.chunk, id: "forged" };
    const kept = hit("book_coverage", 2, 1, raw, 2_000_000, ["abrotanum", "features"]);
    const selected = selectCoveredEvidence([outside, broken, kept], { documentIds: ["book_coverage"] });
    expect(selected.map((item) => item.chunk.id)).toEqual(["book_coverage:p2:c1"]);
    expect(selected[0]?.chunk.rawText).toBe(raw);
    expect(selected[0]?.chunk).toBe(kept.chunk);
    expect(kept.chunk.rawText).toBe(raw);
    expect(selectCoveredEvidence([kept], { documentIds: [] })).toEqual([]);
  });

  test("a single-term question keeps rank order and the five-chunk cap", () => {
    const store = storeOf([
      {
        id: "book_one",
        raws: Array.from({ length: 6 }, (_, index) => `عسکری صفحہ ${index + 1}`),
      },
    ]);
    const ranked = searchKeywords(store, "عسکری", { k: 5 });
    const answer = askResearch(store, "عسکری", { documentIds: ["book_one"] });
    expect(answer.answered).toBe(true);
    expect(answer.citations).toHaveLength(5);
    expect(answer.citations.map((citation) => citation.chunkId)).toEqual(ranked.map((item) => item.chunk.id));
    expect(answer.citations.map((citation) => citation.quote)).toEqual(ranked.map((item) => item.chunk.rawText));
  });

  test("exact reference, conflict, and a multi-word weak hit keep the current gate", () => {
    const exact = storeOf([{ id: "hadith", raws: ["Hadith 289 is recorded on this page."] }]);
    const exactAnswer = askResearch(exact, "Hadith 289", { documentIds: ["hadith"] });
    expect(exactAnswer.answered).toBe(true);
    expect(exactAnswer.citations).toHaveLength(1);
    expect(exactAnswer.citations[0]?.quote).toBe("Hadith 289 is recorded on this page.");

    const conflict = storeOf([
      { id: "dates", raws: ["پیدائش 868 میں ہوئی", "پیدائش 874 میں ہوئی"] },
    ]);
    expect(askResearch(conflict, "پیدائش", { documentIds: ["dates"] }).refusalReason).toBe("conflicting_evidence");

    const weak = storeOf([{ id: "one", raws: ["صرف ایک عسکری"] }]);
    const refused = askResearch(weak, "What are the characteristic features of عسکری and which pages mention it?");
    expect(refused.refusalReason).toBe("weak_retrieval");
    expect(refused.answered).toBe(false);
    expect(evaluateEvidence(searchKeywords(weak, refused.query), { query: refused.query }).reason).toBe("weak_retrieval");
  });
});
