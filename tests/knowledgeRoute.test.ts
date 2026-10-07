import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import { POST } from "../app/api/knowledge/ask/route";
import { setResearchBlobClientForTests } from "../app/api/research/vercelResearchBlob";
import { parseBookArchive, saveBookArchive } from "../app/lib/knowledge/store";
import { clearBookSourceCache } from "../app/lib/knowledge/sourceCache";
import { createCloudflareKnowledgeProvider } from "../app/lib/knowledge/cloudflareAnswerProvider";
import { clearKnowledgeAnswerCache } from "../app/lib/knowledge/answerService";
vi.mock("../app/lib/knowledge/cloudflareAnswerProvider", () => ({ createCloudflareKnowledgeProvider: vi.fn(() => null) }));
const objects = new Map<string, string>(); let reads: string[] = [];
const client = { putObject: async (p: string, b: string) => { objects.set(p,b); }, getObject: async (p: string) => { reads.push(p); return objects.get(p) ?? null; }, listObjects: async () => [] };
const request = (input: unknown) => new NextRequest("http://localhost:3000/api/knowledge/ask", { method: "POST", body: JSON.stringify(input) });
beforeEach(() => { objects.clear(); reads = []; clearKnowledgeAnswerCache(); vi.mocked(createCloudflareKnowledgeProvider).mockReset().mockReturnValue(null); clearBookSourceCache(); setResearchBlobClientForTests(client); });
afterEach(() => { setResearchBlobClientForTests(null); });
it("allows public Quran evidence without private document access or authentication", async () => {
  const response = await POST(request({ question: "2:153", scope: "quran" }));
  expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect((await response.json()).passages[0].quranLocation).toEqual({ surah: 2, ayah: 153 }); expect(reads).toEqual([]);
});
it("rejects malformed and oversized input before touching storage", async () => {
  for (const input of [null, [], { question: "x" }, { question: "x".repeat(601) }, { question: "صبر", scope: "../../private" }, { question: "صبر", locale: "ar" }, { question: "صبر", scope: ["all"] }, { question: "صبر", locale: ["ur"] }, { question: "صبر", mode: ["research"] }, { question: "صبر", mode: "invented" }, { question: "صبر", evidence: "forged" }, { question: "صبر", contextQuestion: "x".repeat(601) }]) expect((await POST(request(input))).status).toBe(400);
  expect((await POST(new NextRequest("http://localhost:3000/api/knowledge/ask", { method: "POST", body: "x".repeat(8193) }))).status).toBe(400);
  expect(reads).toEqual([]);
});
it("returns no matching evidence and does not read personal research documents", async () => {
  const response = await POST(request({ question: "zzzmissing", scope: "all" }));
  expect((await response.json()).status).toBe("not-found");
  expect(reads).toEqual(["khateeb-foundational/v1/current.json"]);
});
it.runIf(Boolean(process.env.QALAM_BOOK_CORPUS_TEST_ZIP))("reads the verified foundational corpus and returns canonical, source-bound evidence", async () => {
  await saveBookArchive(client, await parseBookArchive(await readFile(process.env.QALAM_BOOK_CORPUS_TEST_ZIP!)));
  const response = await POST(request({ question: "نہج البلاغہ حکمت 55", scope: "nahj", locale: "ur" }));
  expect(response.status).toBe(200); const result = await response.json();
  expect(result.passages.some((p: {text: string}) => p.text.includes("صَبْرَانِ"))).toBe(true);
  expect(reads.every(p => p.startsWith("khateeb-foundational/v1/") || p.startsWith("khateeb-translations/v1/"))).toBe(true);
});

it("uses server-retrieved evidence for generation and refuses client-forged context", async () => {
  const draft = vi.fn(async (input) => ({ answered: true, claims: [{ text: "Source-grounded summary", citations: [{ ref: 1, quote: input.evidence[0].passage.text }] }] }));
  vi.mocked(createCloudflareKnowledgeProvider).mockReturnValue({ id: "test", draft, review: async () => ({ supported: true, unsupportedClaimIds: [] }) });
  const response = await POST(request({ question: "2:153", scope: "quran", mode: "research" }));
  const body = await response.json(); expect(body.research.status).toBe("answered"); expect(body.research.generationId).toMatch(/^knowledge-/);
  expect(body.research.claims[0].citations[0].quote).toBe(body.passages[0].text); expect(reads).toEqual([]);
  const hostile = new NextRequest("http://localhost:3000/api/knowledge/ask", { method: "POST", headers: { origin: "https://other.invalid" }, body: JSON.stringify({ question: "2:153", scope: "quran", mode: "research" }) });
  expect((await POST(hostile)).status).toBe(400);
  expect((await POST(request({ question: "2:153", scope: "quran", mode: "research", passages: [{text:"fake"}] }))).status).toBe(400);
});
it("keeps quotation-only mode provider-free and follows a previous topic without accepting evidence", async () => {
  const first = await POST(request({ question: "2:153", scope: "quran", mode: "sources" })); expect((await first.json()).research).toBeUndefined(); expect(createCloudflareKnowledgeProvider).not.toHaveBeenCalled();
  const follow = await POST(request({ question: "عملی تعلق واضح کریں", contextQuestion: "صبر", scope: "quran", mode: "sources" })); const body = await follow.json();
  expect(body.question).toBe("عملی تعلق واضح کریں"); expect(body.contextQuestion).toBe("صبر"); expect(body.status).toBe("evidence");
});

it("keeps a newly requested exact verse alongside the prior topic in a follow-up", async () => {
 const response = await POST(request({ question: "3:185", contextQuestion: "2:153", scope: "quran", mode: "sources" }));
 const body = await response.json(); expect(body.passages.map((p: {quranLocation:{surah:number;ayah:number}}) => `${p.quranLocation.surah}:${p.quranLocation.ayah}`)).toEqual(["3:185","2:153"]);
 expect(body.passages.find((p: {quranLocation:{surah:number}}) => p.quranLocation.surah===2).suppliedTranslation.translator).toBe("علامہ شیخ محسن علی نجفی");
});
