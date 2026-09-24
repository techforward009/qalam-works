import { NextRequest } from "next/server";
import { afterEach } from "vitest";
import { GET } from "../../app/api/research/documents/[id]/pages/[page]/route";
import * as pageRoute from "../../app/api/research/documents/[id]/pages/[page]/route";
import { handleResearchUpload } from "../../app/api/research/documents/handleUpload";
import { handleResearchPage } from "../../app/api/research/documents/handlePage";
import { setResearchBlobClientForTests } from "../../app/api/research/vercelResearchBlob";
import {
  CHUNKER_VERSION,
  createMemoryResearchEngineStore,
  makeStoredCorpus,
  type DocumentChunk,
  type DocumentPage,
  type ResearchDocument,
  type ResearchEngineStore,
} from "../../app/tools/research-studio/engine";

afterEach(() => {
  setResearchBlobClientForTests(null);
});

function document(id: string, pageCount: number): ResearchDocument {
  return {
    id,
    filename: `${id}.txt`,
    mimeType: "text/plain",
    language: "ur",
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
    normalizedText: rawText.trim().replace(/\s+/g, " "),
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
    normalizedText: rawText.trim(),
    language: "ur",
    direction: "rtl",
    contentType: "paragraph",
  };
}

function storeWith(): ResearchEngineStore {
  const store = createMemoryResearchEngineStore();
  const saved = store.save(
    makeStoredCorpus(
      document("book_001", 2),
      [page("book_001", 1, "  پہلا صفحہ  "), page("book_001", 2, "دوسرا    صفحہ۔")],
      [chunk("book_001", 1, "CHUNK ONLY"), chunk("book_001", 2, "CHUNK TWO")],
    ),
  );
  if (!saved.ok) throw new Error(saved.error);
  return store;
}

describe("GET /api/research/documents/:id/pages/:page", () => {
  test("returns the stored page rawText only, unchanged", async () => {
    const store = storeWith();
    const first = await handleResearchPage({ documentId: "book_001", page: "1", store });
    const second = await handleResearchPage({ documentId: "book_001", page: "2", store });
    expect(first.status).toBe(200);
    expect(first.body).toEqual({
      documentId: "book_001",
      pageNumber: 1,
      rawText: "  پہلا صفحہ  ",
    });
    expect(second.body).toEqual({
      documentId: "book_001",
      pageNumber: 2,
      rawText: "دوسرا    صفحہ۔",
    });
    expect(JSON.stringify(first.body)).not.toContain("CHUNK ONLY");
    expect(JSON.stringify(first.body)).not.toContain("normalizedText");
  });

  test("missing document and missing page are 404; bad params are 400", async () => {
    const store = storeWith();
    expect((await handleResearchPage({ documentId: "doc_missing", page: "1", store })).status).toBe(404);
    expect((await handleResearchPage({ documentId: "book_001", page: "9", store })).body).toEqual({
      error: "Not found.",
      code: "not_found",
    });
    for (const pageNumber of ["0", "-1", "1.5", "two", "01"]) {
      const result = await handleResearchPage({ documentId: "book_001", page: pageNumber, store });
      expect(result.status).toBe(400);
      expect(result.body).toEqual({ error: "Malformed request.", code: "invalid" });
    }
    for (const id of ["", "bad id", "../secret", "a/b", "x".repeat(129)]) {
      expect((await handleResearchPage({ documentId: id, page: "1", store })).status).toBe(400);
    }
    expect(store.get("book_001").ok).toBe(true);
  });

  test("does not call a model and ignores a request body", async () => {
    const store = storeWith();
    let fetches = 0;
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetches += 1;
      throw new Error("page fetch must not call a provider");
    }) as typeof fetch;
    const result = await handleResearchPage({ documentId: "book_001", page: "1", store });
    globalThis.fetch = original;
    expect(fetches).toBe(0);
    expect(result.status).toBe(200);
    const again = store.get("book_001");
    if (!again.ok) throw new Error("missing");
    expect(again.value.pages[0]?.rawText).toBe("  پہلا صفحہ  ");
    expect("POST" in pageRoute).toBe(false);
  });

  test("unexpected store failure is a safe 500", async () => {
    const store = storeWith();
    const broken: ResearchEngineStore = {
      list: () => store.list(),
      save: (corpus) => store.save(corpus),
      remove: (id) => store.remove(id),
      get: () => {
        throw new Error("stack /tmp/secret CLOUDFLARE_AUTH_TOKEN");
      },
    };
    const result = await handleResearchPage({ documentId: "book_001", page: "1", store: broken });
    expect(result.status).toBe(500);
    expect(result.body).toEqual({ error: "Research page fetch failed.", code: "failed" });
    expect(JSON.stringify(result.body)).not.toContain("secret");
    expect(JSON.stringify(result.body)).not.toContain("stack");
  });

  test("an uploaded document page is fetchable from the same store", async () => {
    const store = createMemoryResearchEngineStore();
    const form = new FormData();
    form.append("file", new File(["alpha marker\f  beta marker  "], "note.txt"));
    const uploaded = await handleResearchUpload({ form, store });
    expect(uploaded.status).toBe(200);
    if (!("documentId" in uploaded.body)) throw new Error("expected upload");
    const page = await handleResearchPage({
      documentId: uploaded.body.documentId,
      page: "2",
      store,
    });
    expect(page.body).toEqual({
      documentId: uploaded.body.documentId,
      pageNumber: 2,
      rawText: "  beta marker  ",
    });
  });

  test("the route returns 404 for an unknown document and 400 for a bad id", async () => {
    setResearchBlobClientForTests({
      async putObject() {},
      async getObject() {
        return null;
      },
      async listObjects() {
        return [];
      },
    });
    const missing = await GET(new NextRequest("http://localhost/api/research/documents/doc_missing/pages/1"), {
      params: Promise.resolve({ id: "doc_missing", page: "1" }),
    });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Not found.", code: "not_found" });

    const invalid = await GET(new NextRequest("http://localhost/api/research/documents/bad id/pages/1"), {
      params: Promise.resolve({ id: "bad id", page: "1" }),
    });
    expect(invalid.status).toBe(400);
  });
});
