import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import mammoth from "mammoth";
import JSZip from "jszip";
import { NextRequest } from "next/server";
import { bookRecordReference, createBookExcerpt, isBookExcerpt, searchBookRecords, type BookRecord, type BookSource } from "../app/lib/knowledge/bookCorpus";
import { parseBookArchive, saveBookArchive, validateBookRecords, BOOK_POINTER_PATH } from "../app/lib/knowledge/store";
import { retrieveKnowledge, knowledgeResultText } from "../app/lib/knowledge/retrieval";
import { synthesizeKnowledgeAnswer } from "../app/lib/knowledge/researchAnswer";
import { clearBookSourceCache } from "../app/lib/knowledge/sourceCache";
import { POST as ask } from "../app/api/knowledge/ask/route";
import { GET as library } from "../app/api/khateeb/library/route";
import { setResearchBlobClientForTests } from "../app/api/research/vercelResearchBlob";
import { createKnowledgeDraft } from "../app/tools/khateeb-studio/engine/knowledgeDraft";
import { buildCustomSermonText, parseCustomSermonProject, serializeCustomSermonProject } from "../app/tools/khateeb-studio/engine/customSermonProject";

const source: BookSource = { id: "kafi-v6-ar", book: "kafi", language: "ar", filename: "al-kafi-vol6-arabic.docx", sha256: "a".repeat(64), translator: null };
function chapter(ordinal: number, title: string, start: number): BookRecord {
  const id = `${source.id}:chapter:${ordinal}`;
  const text = [title, "1- قال في فضل الولد وتربية الأطفال بالخير", "وهذه تتمة النص الأصلية دون رقم مستقل.", "2- قال في العلم وصبر المتعلم"];
  return { id, sourceId: source.id, book: "kafi", language: "ar", kind: "chapter", number: ordinal, title,
    reference: { sourceId: source.id, section: "chapter", number: ordinal, locator: `word/document.xml paragraphs ${start}-${start + 3}`, printPage: null,
      kafi: { volume: 6, bookTitle: null, chapterTitle: title, sectionTitle: null, sourceParagraphs: text.map((_, i) => start + i) } },
    paragraphs: text.map((text, i) => ({ id: `${id}:p${i + 1}`, text })), textSha256: createHash("sha256").update(text.join("\n")).digest("hex") };
}
const records = [chapter(1, "باب فضل الولد", 1), chapter(2, "باب تعليم الولد", 5)];
const retrieve = (question: string, data = records, sources = [source]) => retrieveKnowledge({ question, scope: "kafi", locale: "ur", records: data, sources, quran: [], quranSha256: "" });

describe("source-bound Kafi references", () => {
  it("keeps duplicate local hadith numbers distinct across chapters and filters the quoted chapter", () => {
    expect(retrieve("جلد 6 حدیث 1").passages).toHaveLength(2);
    const result = retrieve('جلد ۶ حدیث ۱ "باب فضل الولد"');
    expect(result.passages).toHaveLength(1);
    expect(result.passages[0].referenceUr).toBe("الکافی، جلد 6، باب فضل الولد، حدیث 1");
    expect(result.passages[0].text).toBe(records[0].paragraphs.slice(1, 3).map(p => p.text).join("\n"));
    expect(retrieve("جلد 7 حدیث 1").passages).toEqual([]);
  });
  it("does not treat import ordinals as hadith numbers and attaches continuations to their numbered source", () => {
    expect(bookRecordReference(records[1], "ur")).toBe("الکافی، جلد 6، باب تعليم الولد");
    expect(bookRecordReference(records[0], "ur", records[0].paragraphs[2].id)).not.toContain("حدیث");
    expect(retrieve('"تتمة النص الأصلية"').passages[0].referenceUr).toContain("حدیث 1");
  });
  it("matches a number and query in the same numbered paragraph", () => {
    expect(searchBookRecords(records, { book: "kafi", number: "۱", query: "العلم" }).total).toBe(0);
    const search = searchBookRecords(records, { book: "kafi", sourceId: source.id, number: "۲", query: "العلم" });
    expect(search.total).toBe(2); expect(search.hits[0].number).toBe(2); expect(search.hits[0].referenceLabelUr).toContain("حدیث 2");
  });
  it("preserves Kafi quotations, references and fingerprints through copy and saved-draft restore", () => {
    const result = retrieve('جلد 6 حدیث 1 "باب فضل الولد"');
    const excerpt = result.passages[0].excerpt!;
    expect(isBookExcerpt(excerpt)).toBe(true);
    const draft = createKnowledgeDraft(result, [result.passages[0].id], "ur", 30);
    expect(parseCustomSermonProject(serializeCustomSermonProject(draft))).toEqual(draft);
    expect(buildCustomSermonText(draft, "ur")).toContain("باب فضل الولد، حدیث 1");
    expect(knowledgeResultText(result, "ur")).not.toMatch(/\.docx|word\/document|:chapter:/);
    expect(createBookExcerpt(records[0], source, records[0].paragraphs.slice(1, 3).map(p => p.id)).referenceLabelUr).not.toContain("حدیث 1");
  });
  it("rejects mismatched volume metadata, missing paragraphs and fabricated chapter labels", () => {
    expect(validateBookRecords(records, source)).toEqual(records);
    for (const change of [(r: BookRecord) => { r.reference.kafi!.volume = 7; }, (r: BookRecord) => { r.reference.kafi!.sourceParagraphs[1] = 99; }, (r: BookRecord) => { r.reference.kafi!.chapterTitle = "باب مخترع"; }]) {
      const altered = structuredClone(records); change(altered[0]);
      expect(() => validateBookRecords(altered, source)).toThrow("invalid-kafi-reference");
    }
  });
  it("retains Arabic-only sources without generating an unsupplied Urdu translation", async () => {
    const provider = { id: "test", draft: async () => { throw new Error("must not translate"); }, review: async () => { throw new Error("must not run"); } };
    expect(await synthesizeKnowledgeAnswer(retrieve('جلد 6 حدیث 1 "باب فضل الولد"'), "ur", provider)).toEqual({ status: "missing-translation", claims: [] });
  });
});

const archivePath = process.env.QALAM_KAFI_TEST_ZIP;
const originals = process.env.QALAM_KAFI_SOURCE_DIR;
describe.runIf(Boolean(archivePath))("actual fifteen-source Kafi package", () => {
  const objects = new Map<string, string>();
  const client = { putObject: async (p: string, b: string) => { objects.set(p, b); }, getObject: async (p: string) => objects.get(p) ?? null, listObjects: async () => [] };
  beforeEach(() => { objects.clear(); clearBookSourceCache(); setResearchBlobClientForTests(client); });
  afterEach(() => setResearchBlobClientForTests(null));
  it.runIf(Boolean(process.env.QALAM_BOOK_CORPUS_TEST_ZIP))("keeps the original seven compressed source members byte-identical", async () => {
    const base = await JSZip.loadAsync(await readFile(process.env.QALAM_BOOK_CORPUS_TEST_ZIP!));
    const expanded = await JSZip.loadAsync(await readFile(archivePath!));
    const manifest = JSON.parse(await base.file("manifest.json")!.async("string"));
    for (const source of manifest.sources) {
      const name = `${source.id}.json.gz`;
      expect((await base.file(name)!.async("nodebuffer")).equals(await expanded.file(name)!.async("nodebuffer"))).toBe(true);
    }
  });
  it("validates the expanded archive and retains every original DOCX paragraph exactly", async () => {
    const archive = await parseBookArchive(await readFile(archivePath!));
    expect(archive.manifest.sources).toHaveLength(15);
    expect(archive.manifest.recordCount).toBe(4978);
    if (!originals) throw new Error("QALAM_KAFI_SOURCE_DIR is required for lossless validation");
    for (let volume = 1; volume <= 8; volume++) {
      const bytes = await readFile(`${originals}/al-kafi-vol${volume}-arabic.docx`);
      const raw = (await mammoth.extractRawText({ buffer: bytes })).value;
      const paragraphs = raw.split("\n\n"); if (paragraphs.at(-1) === "") paragraphs.pop();
      const id = `kafi-v${volume}-ar`; const rows = archive.records[id];
      expect(rows.flatMap(r => r.paragraphs.map(p => p.text))).toEqual(paragraphs);
      expect(rows.flatMap(r => r.reference.kafi!.sourceParagraphs)).toEqual(paragraphs.map((_, i) => i + 1));
      expect(archive.manifest.sources.find(s => s.id === id)!.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
    }
    expect(archive.records["kafi-v2-ar"].every(r => r.reference.kafi!.bookTitle === null)).toBe(true);
  });
  it("serves public exact Kafi passages and full original context from the validated server corpus", async () => {
    await saveBookArchive(client, await parseBookArchive(await readFile(archivePath!)));
    const response = await ask(new NextRequest("http://localhost/api/knowledge/ask", { method: "POST", body: JSON.stringify({ question: 'جلد 6 حدیث 1 "باب فضل الولد"', scope: "kafi", locale: "ur", mode: "sources" }) }));
    expect(response.status).toBe(200); const result = await response.json();
    expect(result.passages).toHaveLength(1); expect(result.passages[0].referenceUr).toContain("حدیث 1");
    const passage = result.passages[0];
    const detail = await library(new NextRequest(`http://localhost/api/khateeb/library?${new URLSearchParams({ op: "record", sourceId: passage.sourceId, id: passage.recordId })}`));
    expect(detail.status).toBe(200); const body = await detail.json();
    expect(body.record.paragraphs.find((p: { id: string }) => p.id === passage.paragraphId).text).toBe(passage.text);
    expect(body.record.reference.printPage).toBeNull();
  });
  it("retrieves the complete Rawda narration containing its 9,013-character continuation with the printed anchor", async () => {
    const archive = await parseBookArchive(await readFile(archivePath!));
    const rows = archive.records["kafi-v8-ar"];
    const long = rows.flatMap(r => r.paragraphs).find(p => p.text.length === 9013)!;
    const result = retrieve(`"${long.text.slice(8050, 8130)}"`, rows, archive.manifest.sources.filter(s => s.book === "kafi"));
    const passage = result.passages.find(p => p.text.includes(long.text))!;
    expect(passage).toBeDefined();
    expect(passage.excerpt!.paragraphs.some(p => p.id === long.id && p.text === long.text)).toBe(true);
    expect(passage.referenceUr).toContain("حدیث 1");
    expect(rows.every(r => r.reference.kafi!.chapterTitle === null && r.reference.kafi!.bookTitle === null)).toBe(true);
  });
  it("keeps the prior active catalog when any expanded-source write fails", async () => {
    objects.set(BOOK_POINTER_PATH, "previous catalog");
    const archive = await parseBookArchive(await readFile(archivePath!));
    await expect(saveBookArchive({ ...client, putObject: async (p, b) => { if (p.endsWith("kafi-v8-ar.json")) throw new Error("write-failed"); await client.putObject(p, b); } }, archive)).rejects.toThrow("write-failed");
    expect(objects.get(BOOK_POINTER_PATH)).toBe("previous catalog");
  });
});
