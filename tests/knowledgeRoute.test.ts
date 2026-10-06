import { afterEach, beforeEach, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import { POST } from "../app/api/knowledge/ask/route";
import { setResearchBlobClientForTests } from "../app/api/research/vercelResearchBlob";
import { parseBookArchive, saveBookArchive } from "../app/lib/knowledge/store";
import { clearBookSourceCache } from "../app/lib/knowledge/sourceCache";
const objects = new Map<string, string>(); let reads: string[] = [];
const client = { putObject: async (p: string, b: string) => { objects.set(p,b); }, getObject: async (p: string) => { reads.push(p); return objects.get(p) ?? null; }, listObjects: async () => [] };
const request = (input: unknown) => new NextRequest("http://localhost:3000/api/knowledge/ask", { method: "POST", body: JSON.stringify(input) });
beforeEach(() => { objects.clear(); reads = []; clearBookSourceCache(); setResearchBlobClientForTests(client); });
afterEach(() => { setResearchBlobClientForTests(null); });
it("allows public Quran evidence without private document access or authentication", async () => {
  const response = await POST(request({ question: "2:153", scope: "quran" }));
  expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect((await response.json()).passages[0].quranLocation).toEqual({ surah: 2, ayah: 153 }); expect(reads).toEqual([]);
});
it("rejects malformed and oversized input before touching storage", async () => {
  for (const input of [null, [], { question: "x" }, { question: "x".repeat(601) }, { question: "صبر", scope: "../../private" }, { question: "صبر", locale: "ar" }]) expect((await POST(request(input))).status).toBe(400);
  expect((await POST(new NextRequest("http://localhost:3000/api/knowledge/ask", { method: "POST", body: "x".repeat(4097) }))).status).toBe(400);
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
  expect(reads.every(p => p.startsWith("khateeb-foundational/v1/"))).toBe(true);
});
