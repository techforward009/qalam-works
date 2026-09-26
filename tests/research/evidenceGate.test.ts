import {
  EVIDENCE_MIN_SCORE,
  createChunks,
  createMemoryResearchEngineStore,
  evaluateEvidence,
  ingestDocument,
  makeStoredCorpus,
  searchKeywords,
  type DocumentChunk,
  type RetrievedChunk,
} from "../../app/tools/research-studio/engine";

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

function hit(
  documentId: string,
  pageNumber: number,
  chunkIndex: number,
  rawText: string,
  score: number,
  matchedTerms: string[],
  normalizedText = rawText,
): RetrievedChunk {
  return {
    chunk: chunk(documentId, pageNumber, chunkIndex, rawText, normalizedText),
    score,
    source: "keyword",
    matchedTerms,
  };
}

const strong = EVIDENCE_MIN_SCORE;

describe("evidence gate", () => {
  test("empty retrieval is no_evidence", () => {
    const decision = evaluateEvidence([], { query: "عسکری" });
    expect(decision).toMatchObject({ allowed: false, reason: "no_evidence", hits: [], independentCount: 0 });
  });

  test("one weak score is refused and rawText stays intact", () => {
    const raw = "امام حسن   عسکری";
    const only = hit("book_001", 2, 1, raw, strong - 1, ["عسکری"], "امام حسن عسکری");
    const decision = evaluateEvidence([only], { query: "عسکری" });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("weak_retrieval");
    expect(decision.hits[0]?.chunk.rawText).toBe(raw);
    expect(decision.hits[0]?.chunk.normalizedText).toBe("امام حسن عسکری");
    expect(decision.hits[0]?.chunk.id).toBe("book_001:p2:c1");
    expect(decision.hits[0]?.score).toBe(strong - 1);
    expect(only.chunk.rawText).toBe(raw);
  });

  test("a weak single lexical term stays weak_retrieval", () => {
    const decision = evaluateEvidence(
      [hit("book_001", 2, 5, "Abrotanum Southernwood.", strong - 1, ["abrotanum"])],
      { query: "Abrotanum" },
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("weak_retrieval");
    expect(decision.independentCount).toBe(0);
  });

  test("one strong exact lexical term is sufficient", () => {
    const decision = evaluateEvidence(
      [hit("book_001", 2, 5, "Abrotanum Southernwood.", strong, ["abrotanum"])],
      { query: "Abrotanum" },
    );
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("sufficient");
    expect(decision.independentCount).toBe(1);
    expect(decision.hits[0]?.chunk.id).toBe("book_001:p2:c5");
    expect(decision.hits[0]?.chunk.pageNumber).toBe(2);
  });

  test("an ordinary multi-term query still needs a second independent chunk", () => {
    const decision = evaluateEvidence(
      [hit("book_001", 2, 5, "Abrotanum marasmus of children", strong, ["abrotanum", "marasmus"])],
      { query: "Abrotanum marasmus" },
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("weak_retrieval");
    expect(decision.independentCount).toBe(1);
  });

  test("one exact reference is sufficient", () => {
    const decision = evaluateEvidence(
      [hit("book_001", 1, 1, "Hadith 289 is cited here.", strong, ["hadith", "289"])],
      { query: "Hadith 289" },
    );
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("sufficient");
    expect(decision.hits[0]?.chunk.pageNumber).toBe(1);
    expect(decision.hits[0]?.chunk.id).toBe("book_001:p1:c1");
  });

  test("two chunks on different pages are sufficient", () => {
    const decision = evaluateEvidence(
      [
        hit("book_001", 4, 1, "پہلا صفحہ عسکری", strong, ["عسکری"]),
        hit("book_001", 2, 1, "دوسرا صفحہ عسکری", strong, ["عسکری"]),
      ],
      { query: "عسکری" },
    );
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("sufficient");
    expect(decision.hits.map((item) => item.chunk.id)).toEqual(["book_001:p2:c1", "book_001:p4:c1"]);
  });

  test("two different chunks on the same page count as independent", () => {
    const decision = evaluateEvidence(
      [
        hit("book_001", 3, 2, "دوسرا ٹکڑا عسکری", strong, ["عسکری"]),
        hit("book_001", 3, 1, "پہلا ٹکڑا عسکری", strong, ["عسکری"]),
      ],
      { query: "عسکری" },
    );
    expect(decision.reason).toBe("sufficient");
    expect(decision.independentCount).toBe(2);
    expect(decision.hits.map((item) => item.chunk.chunkIndex)).toEqual([1, 2]);
  });

  test("duplicate normalized text does not count twice", () => {
    const decision = evaluateEvidence(
      [
        hit("book_001", 1, 1, "liver action abrotanum", strong + 10, ["liver", "action"], "liver action abrotanum"),
        hit("book_001", 2, 1, "liver action abrotanum", strong, ["liver", "action"], "liver action abrotanum"),
      ],
      { query: "liver action" },
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("weak_retrieval");
    expect(decision.independentCount).toBe(1);
    expect(decision.hits).toHaveLength(1);
    expect(decision.hits[0]?.chunk.rawText).toBe("liver action abrotanum");
  });

  test("two documents can pass, and documentIds can narrow them to a refusal", () => {
    const hits = [
      hit("book_001", 1, 1, "کتاب الف عسکری", strong, ["عسکری"]),
      hit("book_002", 1, 1, "کتاب ب عسکری", strong, ["عسکری"]),
    ];
    expect(evaluateEvidence(hits, { query: "عسکری" }).reason).toBe("sufficient");
    const scoped = evaluateEvidence(hits, { query: "عسکری", documentIds: ["book_002"] });
    expect(scoped.reason).toBe("sufficient");
    expect(scoped.independentCount).toBe(1);
    expect(scoped.hits.map((item) => item.chunk.documentId)).toEqual(["book_002"]);
    const multi = [
      hit("book_001", 1, 1, "کتاب الف عسکری سامرا", strong, ["عسکری", "سامرا"]),
      hit("book_002", 1, 1, "کتاب ب عسکری سامرا", strong, ["عسکری", "سامرا"]),
    ];
    const narrowed = evaluateEvidence(multi, { query: "عسکری سامرا", documentIds: ["book_002"] });
    expect(narrowed.reason).toBe("weak_retrieval");
    expect(narrowed.independentCount).toBe(1);
    expect(evaluateEvidence(hits, { query: "عسکری", documentIds: [] }).reason).toBe("no_evidence");
  });

  test("disjoint dates on otherwise strong chunks are conflicting_evidence", () => {
    const decision = evaluateEvidence(
      [
        hit("book_001", 1, 1, "پیدائش 868 میں ہوئی", strong, ["پیدائش"]),
        hit("book_001", 2, 1, "پیدائش 874 میں ہوئی", strong, ["پیدائش"]),
      ],
      { query: "پیدائش" },
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("conflicting_evidence");
    expect(decision.hits).toHaveLength(2);
  });

  test("the same input always yields the same decision", () => {
    const hits = [
      hit("b", 1, 1, "متن عسکری", strong, ["عسکری"]),
      hit("a", 2, 1, "دوسرا عسکری", strong, ["عسکری"]),
    ];
    const first = evaluateEvidence(hits, { query: "عسکری" });
    const second = evaluateEvidence(hits, { query: "عسکری" });
    expect(second).toEqual(first);
    expect(first.hits.map((item) => item.chunk.id)).toEqual(["a:p2:c1", "b:p1:c1"]);
  });

  test("broken provenance is not treated as evidence", () => {
    const broken = hit("book_001", 1, 1, "عسکری", strong, ["عسکری"]);
    broken.chunk = { ...broken.chunk, id: "forged" };
    expect(evaluateEvidence([broken], { query: "عسکری" }).reason).toBe("no_evidence");
  });

  test("keyword retrieval feeds the gate without rewriting stored text", async () => {
    const ingested = await ingestDocument({
      bytes: new TextEncoder().encode("Hadith 289 is cited here.\fHadith 289 is repeated on the next page."),
      filename: "h.txt",
      documentId: "hadith",
    });
    const { chunks } = createChunks(ingested.pages);
    const store = createMemoryResearchEngineStore();
    store.save(makeStoredCorpus(ingested.document, ingested.pages, chunks));
    const hits = searchKeywords(store, "Hadith 289", { k: 5 });
    const before = hits.map((item) => item.chunk.rawText);
    const decision = evaluateEvidence(hits, { query: "Hadith 289" });
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("sufficient");
    expect(hits.map((item) => item.chunk.rawText)).toEqual(before);
    expect(decision.hits.every((item) => item.chunk.pageNumber >= 1)).toBe(true);
  });
});
