import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  books: vi.fn(),
  blob: vi.fn(),
  retrieve: vi.fn(),
  translation: vi.fn(),
  corpus: vi.fn(),
  understand: vi.fn(),
  rank: vi.fn(),
  provider: vi.fn(),
  answer: vi.fn(),
}));

vi.mock("../app/lib/knowledge/knowledgeBookBackend", () => ({ loadKnowledgeBooks: mocks.books }));
vi.mock("../app/api/research/vercelResearchBlob", () => ({ researchBlobClientFromEnv: mocks.blob }));
vi.mock("../app/lib/knowledge/retrieval", () => ({ retrieveKnowledgeWithContext: mocks.retrieve }));
vi.mock("../app/lib/knowledge/bookTranslations", () => ({ attachBookTranslations: mocks.translation }));
vi.mock("../app/lib/knowledge/suppliedTranslations", () => ({ attachCorpusTranslations: mocks.corpus }));
vi.mock("../app/lib/knowledge/questionUnderstanding", () => ({ understandKnowledgeQuestion: mocks.understand }));
vi.mock("../app/lib/knowledge/passageRanking", () => ({ rankKnowledgePassages: mocks.rank }));
vi.mock("../app/lib/knowledge/cloudflareAnswerProvider", () => ({ createCloudflareKnowledgeProvider: mocks.provider }));
vi.mock("../app/lib/knowledge/answerService", () => ({ answerKnowledgeQuestion: mocks.answer }));
vi.mock("../app/lib/knowledge/digitalKhattKnowledge", () => ({
  DIGITAL_KHATT_KNOWLEDGE_SHA256: "f".repeat(64),
  digitalKhattKnowledgeAyahs: () => [],
}));
import { POST } from "../app/api/knowledge/ask/route";

function question(body: unknown) {
  return new NextRequest("https://qalam.test/api/knowledge/ask", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://qalam.test" },
    body: JSON.stringify(body),
  });
}
describe("Ask the books source and answer endpoint on R2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.books.mockResolvedValue({
      backend: "r2",
      sources: [{ id: "nahj-ur", book: "nahj", language: "ur" }],
      records: [{ id: "nahj-ur:saying:55", sourceId: "nahj-ur" }],
    });
    mocks.retrieve.mockReturnValue({
      question: "صبر", status: "evidence", passages: [{
        id: "passage", collection: "nahj", language: "ur",
        sourceId: "nahj-ur", recordId: "nahj-ur:saying:55",
        text: "اصل عبارت", referenceUr: "نہج البلاغہ، حکمت 55", referenceEn: "Saying 55",
      }], expandedTerms: [], availableCollections: ["nahj"], method: "lexical-bm25-topic-expansion",
    });
    mocks.corpus.mockImplementation((result: unknown) => result);
    mocks.understand.mockResolvedValue([]);
    mocks.rank.mockImplementation(async (result: unknown) => result);
    mocks.provider.mockReturnValue({ name: "test" });
    mocks.answer.mockResolvedValue({ status: "answered", claims: [] });
  });
  it("returns source passages with references from R2, never touching Blob", async () => {
    const response = await POST(question({ question: "صبر", scope: "nahj", locale: "ur", mode: "sources" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.passages[0].referenceUr).toBe("نہج البلاغہ، حکمت 55");
    expect(mocks.books).toHaveBeenCalledWith("nahj", "ur");
    expect(mocks.corpus).toHaveBeenCalledTimes(1);
    expect(mocks.blob).not.toHaveBeenCalled();
    expect(mocks.translation).not.toHaveBeenCalled();
    expect(mocks.answer).not.toHaveBeenCalled();
  });
  it("uses the existing answer service while retaining R2 originals", async () => {
    const response = await POST(question({ question: "صبر", scope: "all", locale: "ur", mode: "research" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.passages[0].text).toBe("اصل عبارت");
    expect(body.research.status).toBe("answered");
    expect(mocks.understand).toHaveBeenCalledTimes(1);
    expect(mocks.rank).toHaveBeenCalledTimes(1);
    expect(mocks.answer).toHaveBeenCalledTimes(1);
    expect(mocks.blob).not.toHaveBeenCalled();
  });
  it("fails closed when private R2 is unavailable", async () => {
    mocks.books.mockRejectedValue(new Error("Cloudflare unavailable"));
    const response = await POST(question({ question: "صبر", scope: "kafi", locale: "ur", mode: "sources" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: "unavailable" });
    expect(mocks.blob).not.toHaveBeenCalled();
  });
  it("rejects unknown input before reading from either store", async () => {
    const response = await POST(question({ question: "صبر", scope: "nahj", locale: "ur", leak: "bad" }));
    expect(response.status).toBe(400);
    expect(mocks.books).not.toHaveBeenCalled();
  });
});
