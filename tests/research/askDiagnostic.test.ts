import { NextRequest } from "next/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { POST } from "../../app/api/research/ask/route";
import { emitResearchDiagnostic, researchDiagnosticsEnabled, sanitizeResearchDiagnostic } from "../../app/api/research/ask/diagnostics";
import { handleResearchAsk } from "../../app/api/research/ask/handleAsk";
import { setResearchBlobClientForTests } from "../../app/api/research/vercelResearchBlob";
import {
  CHUNKER_VERSION,
  INCOMPLETE_ANSWER_COVERAGE_EN,
  INSUFFICIENT_EVIDENCE_EN,
  MIN_UNCOVERED_MATCHED_TERMS,
  PROVIDER_UNAVAILABLE_EN,
  askResearchAsync,
  citationsCoverSelectedEvidence,
  createAskDiagnosticTrace,
  createLlmAnswerAdapter,
  createMemoryResearchEngineStore,
  describeCitationCoverage,
  makeStoredCorpus,
  type AskDiagnosticTrace,
  type DocumentChunk,
  type DocumentPage,
  type ResearchBlobClient,
  type ResearchDocument,
} from "../../app/tools/research-studio/engine";
import { TEST_RESEARCH_PASSWORD, TEST_RESEARCH_SECRET, clearTestResearchAuth, testResearchSessionCookie, useTestResearchAuth } from "./researchAuthFixture";

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

function llm(trace: AskDiagnosticTrace, reply: () => Response) {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    calls.push(String(init?.body ?? ""));
    return reply();
  };
  return {
    calls,
    run: createLlmAnswerAdapter({
      env: { CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_AUTH_TOKEN: TOKEN },
      fetchImpl,
      diagnostic: trace,
    }),
  };
}

function emptyBlob(): ResearchBlobClient {
  return {
    async putObject() {},
    async getObject() {
      return null;
    },
    async listObjects() {
      return [];
    },
  };
}

afterEach(() => {
  delete process.env.QALAM_RESEARCH_DIAGNOSTICS;
  setResearchBlobClientForTests(null);
  clearTestResearchAuth();
  vi.restoreAllMocks();
});

describe("research ask diagnostics", () => {
  test("diagnostics are off unless the server flag is exactly true", () => {
    delete process.env.QALAM_RESEARCH_DIAGNOSTICS;
    expect(researchDiagnosticsEnabled()).toBe(false);
    process.env.QALAM_RESEARCH_DIAGNOSTICS = "1";
    expect(researchDiagnosticsEnabled()).toBe(false);
    process.env.QALAM_RESEARCH_DIAGNOSTICS = "true";
    expect(researchDiagnosticsEnabled()).toBe(true);
    expect(MIN_UNCOVERED_MATCHED_TERMS).toBe(2);
  });

  test("the coverage trace uses the same threshold as the guard and drops secrets", async () => {
    const store = storeOf();
    const trace = createAskDiagnosticTrace();
    const client = llm(trace, () =>
      modelJson({
        answered: true,
        answer: "Only one part. Bearer " + TOKEN,
        citations: [cite(1, featureText(1))],
      }),
    );
    const result = await askResearchAsync(store, QUESTION, {
      documentIds: ["book_coverage"],
      adapter: client.run,
      diagnostic: trace,
    });
    expect(result.refusalReason).toBe("insufficient_answer_coverage");
    expect(result.answer).toBe(INCOMPLETE_ANSWER_COVERAGE_EN);
    expect(result.citations).toEqual([]);
    expect(JSON.stringify(result)).not.toContain(trace.correlationId);

    const again = describeCitationCoverage(
      trace.selectedChunks.map((item) => ({
        chunk: chunk(item.documentId, item.pageNumber, item.chunkId),
        score: 1,
        source: "keyword" as const,
        matchedTerms: item.matchedTerms,
      })),
      [{ documentId: "book_coverage", pageNumber: 1, chunkId: "book_coverage:p1:c1" }],
    );
    expect(citationsCoverSelectedEvidence(
      again.chunks.map((item) => ({
        chunk: chunk(item.documentId, item.pageNumber, item.chunkId),
        score: 1,
        source: "keyword" as const,
        matchedTerms: item.matchedTerms,
      })),
      [{ documentId: "book_coverage", pageNumber: 1, chunkId: "book_coverage:p1:c1" }],
    )).toBe(!again.thresholdTriggered);

    const feature = trace.selectedChunks.find((item) => item.chunkId === "book_coverage:p1:c1");
    const compare = trace.selectedChunks.find((item) => item.chunkId === "book_coverage:p2:c1");
    expect(feature?.matchedTerms).toEqual(expect.arrayContaining(["abrotanum", "characteristic"]));
    expect(compare?.matchedTerms).toEqual(expect.arrayContaining(["choudhuri", "compare", "remedies"]));
    expect(trace.verifiedCitationRefs).toEqual([feature?.citationRef]);
    expect(compare?.thresholdTriggered).toBe(true);
    expect(compare?.uncoveredMatchedTerms).toEqual(expect.arrayContaining(["choudhuri", "remedies"]));
    expect(trace.thresholdTriggered).toBe(true);
    expect(trace.coverageChecked).toBe(true);
    expect(trace.citedMatchedTerms).toEqual(expect.arrayContaining(["abrotanum"]));
    expect(trace.citedMatchedTerms).not.toContain("choudhuri");
    expect(trace.modelCallStatus).toBe("ok");
    expect(trace.firstParseStatus).toBe("parsed");
    expect(trace.firstQuoteVerified).toBe(true);
    expect(trace.firstCitationCount).toBe(1);
    expect(trace.firstAnswerCharCount).toBeGreaterThan(0);
    expect(trace.repairOccurred).toBe(false);
    expect(trace.citationVerification).toBe("passed");
    expect(client.calls).toHaveLength(1);

    const dirty = Object.assign(createAskDiagnosticTrace(), {
      rawText: featureText(1),
      prompt: "SYSTEM " + featureText(1),
      authorization: `Bearer ${TOKEN}`,
      password: "secret-password",
      cookie: "qalam_research_session=abc",
      answer: "Only one part. Bearer " + TOKEN,
      quote: featureText(1),
    });
    dirty.selectedChunks = trace.selectedChunks.map((item) =>
      Object.assign({}, item, { rawText: featureText(1), quote: COMPARE_TEXT }),
    );
    const safe = sanitizeResearchDiagnostic(dirty);
    const encoded = JSON.stringify(safe);
    expect(encoded).not.toContain("passage 1");
    expect(encoded).not.toContain(COMPARE_TEXT);
    expect(encoded).not.toContain("Bearer");
    expect(encoded).not.toContain(TOKEN);
    expect(encoded).not.toContain("secret-password");
    expect(encoded).not.toContain("qalam_research_session");
    expect(encoded).not.toContain("SYSTEM");
    expect(Object.keys(safe)).not.toContain("rawText");
    expect(Object.keys(safe)).not.toContain("prompt");
    expect(safe.selectedChunks[0] && "rawText" in safe.selectedChunks[0]).toBe(false);

    const logged: string[] = [];
    const spy = vi.spyOn(console, "info").mockImplementation((message?: unknown) => {
      logged.push(String(message));
    });
    emitResearchDiagnostic(trace);
    expect(spy).toHaveBeenCalled();
    expect(logged.join("\n")).toContain("research_ask_diagnostic");
    expect(logged.join("\n")).toContain(trace.correlationId);
    expect(logged.join("\n")).not.toContain("passage 1");
    expect(logged.join("\n")).not.toContain(COMPARE_TEXT);
    expect(logged.join("\n")).not.toContain("Bearer");
    expect(logged.join("\n")).not.toContain("<<<UNTRUSTED");
  });

  test("answered, invalid citation, and provider error keep their public results", async () => {
    const store = storeOf();
    const answeredTrace = createAskDiagnosticTrace();
    const answeredClient = llm(answeredTrace, () =>
      modelJson({
        answered: true,
        answer: "Both parts.",
        citations: [cite(1, featureText(1)), cite(2, COMPARE_TEXT)],
      }),
    );
    const answered = await handleResearchAsk({
      body: { query: QUESTION, documentIds: ["book_coverage"] },
      store,
      adapter: answeredClient.run,
      diagnostic: answeredTrace,
    });
    expect(answered.body).toMatchObject({ answered: true, status: "answered" });
    expect(answeredTrace.finalStatus).toBe("answered");
    expect(answeredTrace.thresholdTriggered).toBe(false);
    expect(answeredTrace.repairOccurred).toBe(false);
    expect(answeredTrace.verifiedSectionCount).toBe(2);
    expect(JSON.stringify(answered.body)).not.toContain(answeredTrace.correlationId);
    if ("citations" in answered.body) {
      expect(answered.body.citations.map((citation) => citation.quote)).toEqual([featureText(1), COMPARE_TEXT]);
    }

    const invalidTrace = createAskDiagnosticTrace();
    const invalidClient = llm(invalidTrace, () =>
      modelJson({
        answered: true,
        answer: "bad",
        citations: [cite(1, "not the stored text")],
      }),
    );
    const invalid = await handleResearchAsk({
      body: { query: QUESTION, documentIds: ["book_coverage"] },
      store,
      adapter: invalidClient.run,
      diagnostic: invalidTrace,
    });
    expect(invalid.body).toMatchObject({
      refusalReason: "invalid_citation",
      answer: INSUFFICIENT_EVIDENCE_EN,
      citations: [],
    });
    expect(invalidTrace.repairOccurred).toBe(true);
    expect(invalidTrace.citationVerification).toBe("failed");
    expect(invalidTrace.coverageChecked).toBe(false);
    expect(invalidClient.calls).toHaveLength(2);
    expect(JSON.stringify(sanitizeResearchDiagnostic(invalidTrace))).not.toContain("not the stored text");

    const providerTrace = createAskDiagnosticTrace();
    const offline = createLlmAnswerAdapter({ env: {}, diagnostic: providerTrace });
    const provider = await handleResearchAsk({
      body: { query: QUESTION, documentIds: ["book_coverage"] },
      store,
      adapter: offline,
      diagnostic: providerTrace,
    });
    expect(provider.body).toMatchObject({
      refusalReason: "provider_error",
      answer: PROVIDER_UNAVAILABLE_EN,
    });
    expect(providerTrace.modelCallStatus).toBe("provider_error");
    expect(providerTrace.repairOccurred).toBe(false);
    expect(providerTrace.selectedChunkCount).toBe(2);
  });

  test("the same citations produce the same coverage trace", () => {
    const evidence = [
      {
        chunk: chunk("book_coverage", 1, featureText(1)),
        score: 2,
        source: "keyword" as const,
        matchedTerms: ["abrotanum", "marasmus"],
      },
      {
        chunk: chunk("book_coverage", 2, COMPARE_TEXT),
        score: 1,
        source: "keyword" as const,
        matchedTerms: ["choudhuri", "compare", "remedies"],
      },
    ];
    const citations = [{ documentId: "book_coverage", pageNumber: 1, chunkId: "book_coverage:p1:c1" }];
    expect(describeCitationCoverage(evidence, citations)).toEqual(describeCitationCoverage(evidence, citations));
    expect(citationsCoverSelectedEvidence(evidence, citations)).toBe(false);
  });

  test("an unauthenticated request cannot turn diagnostics on, and a normal response omits them", async () => {
    useTestResearchAuth();
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    process.env.QALAM_RESEARCH_DIAGNOSTICS = "true";
    const denied = await POST(
      new NextRequest("http://localhost/api/research/ask", {
        method: "POST",
        headers: { "content-type": "application/json", "x-qalam-research-diagnostics": "true" },
        body: JSON.stringify({ query: QUESTION, diagnostics: true }),
      }),
    );
    expect(denied.status).toBe(401);
    expect(spy.mock.calls.map((call) => String(call[0])).join("\n")).not.toContain("research_ask_diagnostic");

    delete process.env.QALAM_RESEARCH_DIAGNOSTICS;
    setResearchBlobClientForTests(emptyBlob());
    const quiet = await POST(
      new NextRequest("http://localhost/api/research/ask", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: testResearchSessionCookie() },
        body: JSON.stringify({ query: "عبارت", diagnostics: true }),
      }),
    );
    expect(quiet.status).toBe(400);
    expect(spy.mock.calls.map((call) => String(call[0])).join("\n")).not.toContain("research_ask_diagnostic");

    process.env.QALAM_RESEARCH_DIAGNOSTICS = "true";
    const logged = await POST(
      new NextRequest("http://localhost/api/research/ask", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: testResearchSessionCookie() },
        body: JSON.stringify({ query: "عبارت" }),
      }),
    );
    expect(logged.status).toBe(200);
    const body = await logged.json();
    expect(body.refusalReason).toBe("no_evidence");
    expect(JSON.stringify(body)).not.toContain("research_ask_diagnostic");
    expect(JSON.stringify(body)).not.toContain("selectedChunks");
    const lines = spy.mock.calls.map((call) => String(call[0])).filter((line) => line.includes("research_ask_diagnostic"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("\"finalStatus\":\"no_evidence\"");
    expect(lines[0]).toContain("\"modelCallStatus\":\"not_called\"");
    expect(lines[0]).not.toContain(TEST_RESEARCH_PASSWORD);
    expect(lines[0]).not.toContain(TEST_RESEARCH_SECRET);
    expect(lines[0]).not.toContain("عبارت");
  });
});
