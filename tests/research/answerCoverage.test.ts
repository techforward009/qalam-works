import {
  CHUNKER_VERSION,
  INCOMPLETE_ANSWER_COVERAGE_EN,
  INSUFFICIENT_EVIDENCE_EN,
  MIN_UNCOVERED_MATCHED_TERMS,
  PROVIDER_UNAVAILABLE_EN,
  askResearch,
  askResearchAsync,
  createMemoryResearchEngineStore,
  makeStoredCorpus,
  type AnswerAdapter,
  type DocumentChunk,
  type DocumentPage,
  type ResearchDocument,
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

function chunk(documentId: string, pageNumber: number, rawText: string): DocumentChunk {
  return {
    id: `${documentId}:p${pageNumber}:c1`,
    documentId,
    pageNumber,
    chunkIndex: 1,
    rawText,
    normalizedText: rawText,
    language: "mixed",
    direction: "ltr",
    contentType: "paragraph",
  };
}

function storeOf(id: string, raws: string[]) {
  const store = createMemoryResearchEngineStore();
  const pages = raws.map((raw, index) => page(id, index + 1, raw));
  const chunks = pages.map((item) => chunk(item.documentId, item.pageNumber, item.rawText));
  const saved = store.save(makeStoredCorpus(document(id, pages.length), pages, chunks));
  if (!saved.ok) throw new Error(saved.error);
  return store;
}

function featureText(n: number): string {
  return `${"abrotanum ".repeat(8)}${"marasmus ".repeat(8)}${"features ".repeat(8)}${"characteristic ".repeat(8)}passage ${n}`;
}

const COMPARE_TEXT = "choudhuri compare remedies";

function cite(id: string, pageNumber: number, quote: string) {
  return {
    documentId: id,
    pageNumber,
    chunkId: `${id}:p${pageNumber}:c1`,
    quote,
  };
}

function quoting(pages: number[]): AnswerAdapter {
  return ({ evidence }) => ({
    answer: "quoted",
    citations: pages.map((pageNumber) => {
      const hit = evidence.find((item) => item.chunk.pageNumber === pageNumber);
      if (!hit) throw new Error(`missing page ${pageNumber}`);
      return cite(hit.chunk.documentId, pageNumber, hit.chunk.rawText);
    }),
  });
}

describe("answer citation coverage", () => {
  test("the uncovered-term minimum is two", () => {
    expect(MIN_UNCOVERED_MATCHED_TERMS).toBe(2);
  });

  test("citing only one term cluster of a two-part question is refused", () => {
    const store = storeOf("book_coverage", [featureText(1), COMPARE_TEXT]);
    const before = store.get("book_coverage");
    const result = askResearch(store, QUESTION, {
      documentIds: ["book_coverage"],
      adapter: quoting([1]),
    });
    expect(result.answered).toBe(false);
    expect(result.refusalReason).toBe("insufficient_answer_coverage");
    expect(result.answer).toBe(INCOMPLETE_ANSWER_COVERAGE_EN);
    expect(result.answer).not.toBe(INSUFFICIENT_EVIDENCE_EN);
    expect(result.citations).toEqual([]);
    const after = store.get("book_coverage");
    expect(after.ok && before.ok).toBe(true);
    if (after.ok && before.ok) {
      expect(after.value.pages.map((item) => item.rawText)).toEqual(before.value.pages.map((item) => item.rawText));
      expect(after.value.chunks.map((item) => item.normalizedText)).toEqual(
        before.value.chunks.map((item) => item.normalizedText),
      );
    }
  });

  test("citing both term clusters is answered, and a repeated citation does not add coverage", () => {
    const store = storeOf("book_coverage", [featureText(1), COMPARE_TEXT]);
    const covered = askResearch(store, QUESTION, {
      documentIds: ["book_coverage"],
      adapter: quoting([1, 2]),
    });
    expect(covered.answered).toBe(true);
    expect(covered.refusalReason).toBeUndefined();
    expect(covered.citations.map((citation) => citation.chunkId)).toEqual([
      "book_coverage:p1:c1",
      "book_coverage:p2:c1",
    ]);
    expect(covered.citations.map((citation) => citation.quote)).toEqual([featureText(1), COMPARE_TEXT]);

    const duplicated = askResearch(store, QUESTION, {
      documentIds: ["book_coverage"],
      adapter: () => ({
        answer: "quoted twice",
        citations: [cite("book_coverage", 1, featureText(1)), cite("book_coverage", 1, featureText(1))],
      }),
    });
    expect(duplicated.refusalReason).toBe("insufficient_answer_coverage");
    expect(duplicated.citations).toEqual([]);
  });

  test("a single-term question can cite one of several chunks", () => {
    const store = storeOf("book_one", ["عسکری صفحہ ایک", "عسکری صفحہ دو"]);
    const result = askResearch(store, "عسکری", {
      documentIds: ["book_one"],
      adapter: quoting([1]),
    });
    expect(result.answered).toBe(true);
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]?.quote).toBe("عسکری صفحہ ایک");
  });

  test("one missing matched term does not refuse", () => {
    const store = storeOf("book_overlap", ["عسکری روایت", "عسکری روایت علم"]);
    const result = askResearch(store, "عسکری روایت علم", {
      documentIds: ["book_overlap"],
      adapter: quoting([1]),
    });
    expect(result.answered).toBe(true);
    expect(result.citations[0]?.quote).toBe("عسکری روایت");
  });

  test("folded non-English term clusters use the same rule", () => {
    const store = storeOf("book_ur", ["عسکری روایت یہاں ہے۔", "سامرا شہر یہاں ہے۔"]);
    const query = "عسکری روایت سامرا شہر";
    const partial = askResearch(store, query, { documentIds: ["book_ur"], adapter: quoting([1]) });
    expect(partial.refusalReason).toBe("insufficient_answer_coverage");
    const full = askResearch(store, query, { documentIds: ["book_ur"], adapter: quoting([1, 2]) });
    expect(full.answered).toBe(true);
    expect(full.citations.map((citation) => citation.quote)).toEqual(["عسکری روایت یہاں ہے۔", "سامرا شہر یہاں ہے۔"]);
  });

  test("an invalid citation stays invalid_citation and is not rewritten as coverage", () => {
    const store = storeOf("book_coverage", [featureText(1), COMPARE_TEXT]);
    const result = askResearch(store, QUESTION, {
      documentIds: ["book_coverage"],
      adapter: () => ({
        answer: "bad quote",
        citations: [cite("book_coverage", 1, "not the stored text")],
      }),
    });
    expect(result.refusalReason).toBe("invalid_citation");
    expect(result.answer).toBe(INSUFFICIENT_EVIDENCE_EN);
  });

  test("provider and evidence-gate refusals stay on their own reasons", async () => {
    const store = storeOf("book_coverage", [featureText(1), COMPARE_TEXT]);
    let calls = 0;
    const provider = await askResearchAsync(store, QUESTION, {
      documentIds: ["book_coverage"],
      adapter: async () => {
        calls += 1;
        return { kind: "refuse", reason: "provider_error" };
      },
    });
    expect(calls).toBe(1);
    expect(provider.refusalReason).toBe("provider_error");
    expect(provider.answer).toBe(PROVIDER_UNAVAILABLE_EN);

    const weak = storeOf("book_weak", ["صرف ایک عسکری"]);
    expect(askResearch(weak, "عسکری زائد").refusalReason).toBe("weak_retrieval");
    expect(askResearch(storeOf("book_none", ["عسکری"]), "zzzznotpresent").refusalReason).toBe("no_evidence");
    const conflict = storeOf("book_conflict", ["پیدائش 868 میں ہوئی", "پیدائش 874 میں ہوئی"]);
    expect(askResearch(conflict, "پیدائش").refusalReason).toBe("conflicting_evidence");
  });

  test("the same citations always produce the same refusal", () => {
    const store = storeOf("book_coverage", [featureText(1), COMPARE_TEXT]);
    const first = askResearch(store, QUESTION, { documentIds: ["book_coverage"], adapter: quoting([1]) });
    const second = askResearch(store, QUESTION, { documentIds: ["book_coverage"], adapter: quoting([1]) });
    expect(second).toEqual(first);
  });
});
