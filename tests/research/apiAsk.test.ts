import { NextRequest } from "next/server";
import { afterEach, beforeEach } from "vitest";
import { POST } from "../../app/api/research/ask/route";
import { handleResearchAsk } from "../../app/api/research/ask/handleAsk";
import { setResearchBlobClientForTests } from "../../app/api/research/vercelResearchBlob";
import { clearTestResearchAuth, testResearchSessionCookie, useTestResearchAuth } from "./researchAuthFixture";
import {
  CHUNKER_VERSION,
  INSUFFICIENT_EVIDENCE_EN,
  MAX_ANSWER_EVIDENCE,
  createMemoryResearchEngineStore,
  makeStoredCorpus,
  type AsyncAnswerAdapter,
  type DocumentChunk,
  type DocumentPage,
  type ResearchBlobClient,
  type ResearchDocument,
} from "../../app/tools/research-studio/engine";

const TOKEN = "super-secret-token";

beforeEach(() => {
  useTestResearchAuth();
});

afterEach(() => {
  setResearchBlobClientForTests(null);
  clearTestResearchAuth();
});

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
    direction: "rtl",
    contentType: "paragraph",
  };
}

function storeWith(docs: { id: string; raws: string[] }[]) {
  const store = createMemoryResearchEngineStore();
  for (const doc of docs) {
    const pages = doc.raws.map((raw, index) => page(doc.id, index + 1, raw));
    const saved = store.save(
      makeStoredCorpus(
        document(doc.id, pages.length),
        pages,
        pages.map((item) => chunk(item.documentId, item.pageNumber, item.rawText)),
      ),
    );
    if (!saved.ok) throw new Error(saved.error);
  }
  return store;
}

function countingAdapter(draft: Parameters<AsyncAnswerAdapter>[0] extends never ? never : {
  answer: string;
  citations: { documentId: string; pageNumber: number; chunkId: string; quote: string }[];
} | { refuse: "provider_error" | "malformed_evidence" }): { adapter: AsyncAnswerAdapter; calls: number; seen: number } {
  const state = { calls: 0, seen: 0 };
  const adapter: AsyncAnswerAdapter = async (input) => {
    state.calls += 1;
    state.seen = input.evidence.length;
    if ("refuse" in draft) return { kind: "refuse", reason: draft.refuse };
    return { kind: "draft", draft };
  };
  return { adapter, get calls() { return state.calls; }, get seen() { return state.seen; } };
}

describe("POST /api/research/ask", () => {
  const store = storeWith([
    { id: "book_001", raws: ["یہ اردو عبارت ہے۔", "دوسری اردو عبارت بھی ہے۔"] },
    { id: "book_003", raws: ["صرف ایک عسکری"] },
    { id: "book_004", raws: ["پیدائش 868 میں ہوئی", "پیدائش 874 میں ہوئی"] },
    { id: "many", raws: Array.from({ length: 6 }, (_, index) => `نشان نمبر ${index + 1} الگ عبارت`) },
  ]);

  test("a valid ask returns the typed answer and ignores client evidence", async () => {
    const client = countingAdapter({
      answer: "یہ اردو جواب ہے۔",
      citations: [
        {
          documentId: "book_001",
          pageNumber: 1,
          chunkId: "book_001:p1:c1",
          quote: "یہ اردو عبارت ہے۔",
        },
      ],
    });
    const result = await handleResearchAsk({
      body: {
        query: "اردو عبارت",
        documentIds: ["book_001"],
        evidence: "client text must not count",
        rawText: "forged source",
      },
      store,
      adapter: client.adapter,
    });
    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: "Malformed request.", code: "invalid" });
    expect(client.calls).toBe(0);

    const ok = await handleResearchAsk({
      body: { query: "اردو عبارت", documentIds: ["book_001"] },
      store,
      adapter: client.adapter,
    });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({
      status: "answered",
      answered: true,
      answer: "یہ اردو جواب ہے۔",
      evidence: { chunksUsed: 1, reason: "sufficient" },
    });
    if (!("citations" in ok.body)) throw new Error("expected answer");
    expect(ok.body.citations[0]?.quote).toBe("یہ اردو عبارت ہے۔");
    expect(JSON.stringify(ok.body)).not.toContain(TOKEN);
  });

  test("empty, missing, and oversized queries are rejected before the model", async () => {
    const client = countingAdapter({ answer: "x", citations: [] });
    for (const body of [{}, { query: "   " }, { query: 12 }, { query: "a".repeat(2001) }]) {
      const result = await handleResearchAsk({ body, store, adapter: client.adapter });
      expect(result.status).toBe(400);
      expect(result.body).toMatchObject({ code: "invalid" });
    }
    expect(client.calls).toBe(0);
  });

  test("unknown scope and invalid k do not call the model", async () => {
    const client = countingAdapter({ answer: "x", citations: [] });
    const missing = await handleResearchAsk({
      body: { query: "عبارت", documentIds: ["missing"] },
      store,
      adapter: client.adapter,
    });
    expect(missing.status).toBe(400);
    expect(missing.body).toMatchObject({ code: "invalid_scope" });

    const emptyScope = await handleResearchAsk({
      body: { query: "عبارت", documentIds: [] },
      store,
      adapter: client.adapter,
    });
    expect(emptyScope.body).toMatchObject({ code: "invalid_scope" });

    for (const k of [0, 21, 1.5, "5"]) {
      const result = await handleResearchAsk({
        body: { query: "عبارت", documentIds: ["book_001"], k },
        store,
        adapter: client.adapter,
      });
      expect(result.status).toBe(400);
    }
    expect(client.calls).toBe(0);
  });

  test("domain refusals stay HTTP 200 and do not call the model", async () => {
    const client = countingAdapter({ answer: "should not run", citations: [] });
    const none = await handleResearchAsk({
      body: { query: "zzzznotpresent" },
      store,
      adapter: client.adapter,
    });
    expect(none.status).toBe(200);
    expect(none.body).toMatchObject({
      answered: false,
      refusalReason: "no_evidence",
      citations: [],
      answer: INSUFFICIENT_EVIDENCE_EN,
    });

    const weak = await handleResearchAsk({
      body: { query: "عسکری زائد", documentIds: ["book_003"] },
      store,
      adapter: client.adapter,
    });
    expect(weak.body).toMatchObject({ answered: false, refusalReason: "weak_retrieval", citations: [] });

    const conflict = await handleResearchAsk({
      body: { query: "پیدائش", documentIds: ["book_004"] },
      store,
      adapter: client.adapter,
    });
    expect(conflict.body).toMatchObject({ answered: false, refusalReason: "conflicting_evidence", citations: [] });
    expect(client.calls).toBe(0);
  });

  test("the adapter receives at most five approved chunks", async () => {
    const client = countingAdapter({
      answer: "پانچ تک",
      citations: [
        {
          documentId: "many",
          pageNumber: 1,
          chunkId: "many:p1:c1",
          quote: "نشان نمبر 1 الگ عبارت",
        },
      ],
    });
    const result = await handleResearchAsk({
      body: { query: "نشان", documentIds: ["many"], k: 20 },
      store,
      adapter: client.adapter,
    });
    expect(result.status).toBe(200);
    expect(client.calls).toBe(1);
    expect(client.seen).toBe(MAX_ANSWER_EVIDENCE);
    expect(client.seen).toBe(5);
  });

  test("a bad model citation and a provider failure stay typed and secret-free", async () => {
    const bad = countingAdapter({
      answer: `leak ${TOKEN}`,
      citations: [
        {
          documentId: "book_001",
          pageNumber: 1,
          chunkId: "book_001:p1:c1",
          quote: "یہ اقتباس متن میں نہیں",
        },
      ],
    });
    const refused = await handleResearchAsk({
      body: { query: "اردو عبارت", documentIds: ["book_001"] },
      store,
      adapter: bad.adapter,
    });
    expect(refused.status).toBe(200);
    expect(refused.body).toMatchObject({
      answered: false,
      refusalReason: "invalid_citation",
      citations: [],
      answer: INSUFFICIENT_EVIDENCE_EN,
    });
    expect(JSON.stringify(refused.body)).not.toContain(TOKEN);

    const down = countingAdapter({ refuse: "provider_error" });
    const provider = await handleResearchAsk({
      body: { query: "اردو عبارت", documentIds: ["book_001"] },
      store,
      adapter: down.adapter,
    });
    expect(provider.body).toMatchObject({ answered: false, refusalReason: "provider_error" });
    expect(JSON.stringify(provider.body)).not.toContain("Bearer");
  });

  test("the route rejects malformed JSON and an oversized body", async () => {
    const malformed = await POST(
      new NextRequest("http://localhost/api/research/ask", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: testResearchSessionCookie() },
        body: "{",
      }),
    );
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ error: "Malformed request.", code: "invalid" });

    const oversized = await POST(
      new NextRequest("http://localhost/api/research/ask", {
        method: "POST",
        headers: { "content-type": "application/json", "content-length": "999999", cookie: testResearchSessionCookie() },
        body: JSON.stringify({ query: "عبارت" }),
      }),
    );
    expect(oversized.status).toBe(400);

    setResearchBlobClientForTests(emptyBlob());
    const emptyStore = await POST(
      new NextRequest("http://localhost/api/research/ask", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: testResearchSessionCookie() },
        body: JSON.stringify({ query: "عبارت" }),
      }),
    );
    expect(emptyStore.status).toBe(200);
    const json = await emptyStore.json();
    expect(json).toMatchObject({ answered: false, refusalReason: "no_evidence", citations: [] });
    expect(JSON.stringify(json)).not.toContain("CLOUDFLARE");
  });
});
