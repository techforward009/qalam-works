import {
  CHUNKER_VERSION,
  INCOMPLETE_ANSWER_COVERAGE_EN,
  INSUFFICIENT_EVIDENCE_EN,
  MIN_UNCOVERED_MATCHED_TERMS,
  PROVIDER_UNAVAILABLE_EN,
  askResearchAsync,
  buildEvidencePrompt,
  createLlmAnswerAdapter,
  createMemoryResearchEngineStore,
  makeStoredCorpus,
  type DocumentChunk,
  type DocumentPage,
  type ResearchDocument,
} from "../../app/tools/research-studio/engine";

const QUESTION =
  "What are the characteristic features of Abrotanum, and which remedies does Choudhuri compare with it in cases of marasmus?";
const TOKEN = "super-secret-token";
const ACCOUNT = "acct-1";

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

function featureText(n: number): string {
  return `${"abrotanum ".repeat(8)}${"marasmus ".repeat(8)}${"features ".repeat(8)}${"characteristic ".repeat(8)}passage ${n}`;
}

const COMPARE_TEXT = "choudhuri compare remedies";

function storeOf() {
  const id = "book_coverage";
  const raws = [featureText(1), COMPARE_TEXT];
  const store = createMemoryResearchEngineStore();
  const pages = raws.map((raw, index) => page(id, index + 1, raw));
  const saved = store.save(
    makeStoredCorpus(
      document(id, pages.length),
      pages,
      pages.map((item) => chunk(item.documentId, item.pageNumber, item.rawText)),
    ),
  );
  if (!saved.ok) throw new Error(saved.error);
  return store;
}

function modelJson(body: unknown): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(body), finish_reason: "stop" } }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function cite(pageNumber: number, quote: string) {
  return {
    documentId: "book_coverage",
    pageNumber,
    chunkId: `book_coverage:p${pageNumber}:c1`,
    quote,
  };
}

function adapter(reply: () => Response) {
  const calls: { body: string }[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    calls.push({ body: String(init?.body ?? "") });
    return reply();
  };
  return {
    calls,
    run: createLlmAnswerAdapter({
      env: { CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_AUTH_TOKEN: TOKEN },
      fetchImpl,
    }),
  };
}

function promptOf(body: string): { system: string; user: string } {
  const parsed = JSON.parse(body) as { messages: { role: string; content: string }[] };
  return {
    system: parsed.messages.find((message) => message.role === "system")?.content ?? "",
    user: parsed.messages.find((message) => message.role === "user")?.content ?? "",
  };
}

function blockFor(user: string, chunkId: string): string {
  const start = user.indexOf(`chunkId: ${chunkId}`);
  const end = user.indexOf("UNTRUSTED>>>", start);
  return user.slice(start, end);
}

describe("multipart evidence prompt", () => {
  test("selected chunks are distinct citation-addressable sources, and the prompt is deterministic", async () => {
    expect(MIN_UNCOVERED_MATCHED_TERMS).toBe(2);
    const store = storeOf();
    const before = store.get("book_coverage");
    const client = adapter(() =>
      modelJson({
        answered: true,
        answer: "Both supplied parts.",
        citations: [cite(1, featureText(1)), cite(2, COMPARE_TEXT)],
      }),
    );
    const result = await askResearchAsync(store, QUESTION, {
      documentIds: ["book_coverage"],
      adapter: client.run,
    });
    expect(client.calls).toHaveLength(1);
    const first = promptOf(client.calls[0].body);
    const again = adapter(() => modelJson({ answered: false, answer: "", citations: [] }));
    await askResearchAsync(store, QUESTION, { documentIds: ["book_coverage"], adapter: again.run });
    expect(promptOf(again.calls[0].body)).toEqual(first);

    expect(first.system).toContain("The question may contain more than one part.");
    expect(first.system).toContain("cite each relevant item");
    expect(first.system).toContain("does not establish that part");
    expect(first.system).not.toContain("Bryonia");
    expect(first.user).toContain("separately addressable source");
    expect(first.user).toContain("citationRef: 1");
    expect(first.user).toContain("citationRef: 2");
    expect(first.user).toContain("book_coverage:p1:c1");
    expect(first.user).toContain("book_coverage:p2:c1");
    expect(first.user).toContain(featureText(1));
    expect(first.user).toContain(COMPARE_TEXT);
    const featureBlock = blockFor(first.user, "book_coverage:p1:c1");
    const compareBlock = blockFor(first.user, "book_coverage:p2:c1");
    expect(featureBlock).toContain("matchedTerms:");
    expect(featureBlock).toContain("abrotanum");
    expect(featureBlock).toContain("marasmus");
    expect(featureBlock).not.toContain("choudhuri");
    expect(compareBlock).toContain("choudhuri");
    expect(compareBlock).toContain("compare");
    expect(compareBlock).toContain("remedies");
    expect(compareBlock).not.toContain("abrotanum");
    expect(first.user).not.toContain("Bryonia");
    expect(first.user).not.toContain("Iodium");

    expect(result.answered).toBe(true);
    expect(result.refusalReason).toBeUndefined();
    expect(result.citations.map((citation) => citation.quote)).toEqual([featureText(1), COMPARE_TEXT]);
    const after = store.get("book_coverage");
    expect(after.ok && before.ok).toBe(true);
    if (after.ok && before.ok) {
      expect(after.value.pages.map((item) => item.rawText).join("\0")).toBe(
        before.value.pages.map((item) => item.rawText).join("\0"),
      );
    }
  });

  test("a one-sided citation still fails the coverage guard, and a duplicate does not cover the other item", async () => {
    const store = storeOf();
    const partial = adapter(() =>
      modelJson({
        answered: true,
        answer: "Only the first supplied part.",
        citations: [cite(1, featureText(1))],
      }),
    );
    const refused = await askResearchAsync(store, QUESTION, {
      documentIds: ["book_coverage"],
      adapter: partial.run,
    });
    expect(partial.calls).toHaveLength(1);
    expect(refused.refusalReason).toBe("insufficient_answer_coverage");
    expect(refused.answer).toBe(INCOMPLETE_ANSWER_COVERAGE_EN);
    expect(refused.citations).toEqual([]);

    const duplicated = adapter(() =>
      modelJson({
        answered: true,
        answer: "Repeated.",
        citations: [cite(1, featureText(1)), cite(1, featureText(1))],
      }),
    );
    const duplicateResult = await askResearchAsync(store, QUESTION, {
      documentIds: ["book_coverage"],
      adapter: duplicated.run,
    });
    expect(duplicated.calls).toHaveLength(1);
    expect(duplicateResult.refusalReason).toBe("insufficient_answer_coverage");
  });

  test("an invalid quote stays invalid_citation, and provider failure stays provider_error", async () => {
    const store = storeOf();
    const bad = adapter(() =>
      modelJson({
        answered: true,
        answer: "Invented Bryonia.",
        citations: [cite(1, "not the stored text")],
      }),
    );
    const invalid = await askResearchAsync(store, QUESTION, {
      documentIds: ["book_coverage"],
      adapter: bad.run,
    });
    expect(bad.calls).toHaveLength(2);
    expect(invalid.refusalReason).toBe("invalid_citation");
    expect(invalid.answer).toBe(INSUFFICIENT_EVIDENCE_EN);
    expect(invalid.answer).not.toContain("Bryonia");

    const offline = createLlmAnswerAdapter({
      env: {},
      fetchImpl: async () => {
        throw new Error("should not fetch");
      },
    });
    const provider = await askResearchAsync(store, QUESTION, {
      documentIds: ["book_coverage"],
      adapter: offline,
    });
    expect(provider.refusalReason).toBe("provider_error");
    expect(provider.answer).toBe(PROVIDER_UNAVAILABLE_EN);
  });

  test("the same evidence prompt is byte-stable", () => {
    const evidence = [
      {
        chunk: chunk("book_coverage", 1, featureText(1)),
        score: 2,
        source: "keyword" as const,
        matchedTerms: ["abrotanum", "marasmus", "features", "characteristic"],
      },
      {
        chunk: chunk("book_coverage", 2, COMPARE_TEXT),
        score: 1,
        source: "keyword" as const,
        matchedTerms: ["choudhuri", "compare", "remedies"],
      },
    ];
    const first = buildEvidencePrompt(QUESTION, evidence);
    const second = buildEvidencePrompt(QUESTION, evidence);
    expect(second).toBe(first);
    expect(first).not.toContain("Bryonia");
  });
});
