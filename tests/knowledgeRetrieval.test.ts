import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { retrieveKnowledge, verifyKnowledgeClaims, knowledgeResultText } from "../app/lib/knowledge/retrieval";
import type { BookRecord, BookSource } from "../app/lib/knowledge/bookCorpus";
import { ahmedgrafQuranReference } from "../app/tools/arabic-diacritics/quran/ahmedgrafProvider";
import { createKnowledgeDraft } from "../app/tools/khateeb-studio/engine/knowledgeDraft";
import { buildCustomSermonText, parseCustomSermonProject, serializeCustomSermonProject, validateCustomSermonProject } from "../app/tools/khateeb-studio/engine/customSermonProject";
const corpus = process.env.QALAM_BOOK_CORPUS_DIR;
const sources: BookSource[] = corpus ? JSON.parse(readFileSync(`${corpus}/manifest.json`, "utf8")).sources : [];
const records: BookRecord[] = sources.flatMap(s => JSON.parse(readFileSync(`${corpus}/${s.id}.json`, "utf8")));
const ask = (question: string, scope: "all" | "quran" | "nahj" | "sahifa" = "all", locale: "ur" | "en" = "ur") => retrieveKnowledge({ question, scope, locale, sources, records, quran: ahmedgrafQuranReference.listAyahs(), quranSha256: ahmedgrafQuranReference.getMetadata().sourceSha256! });
describe("shared evidence-first knowledge retrieval", () => {
  it("returns exact Ahmedgraf verses without normalizing stored text", () => {
    const result = ask("2:153", "quran");
    expect(result.passages).toHaveLength(1);
    expect(result.passages[0].text).toBe(ahmedgrafQuranReference.getAyah(2, 153)!.text);
    expect(result.passages[0].sourceSha256).toMatch(/^[a-f0-9]{64}$/);
  });
  it("keeps the complete requested surah al-Asr in canonical order", () => {
    const result = ask("103:1–3", "quran");
    expect(result.passages.map(p => p.quranLocation!.ayah)).toEqual([1, 2, 3]);
    expect(result.passages[2].text).toBe(ahmedgrafQuranReference.getAyah(103, 3)!.text);
  });
  it("does not fabricate an answer or source when nothing matches", () => {
    expect(ask("zzzxxyyunknown", "quran").status).toBe("not-found");
    expect(ask("فلاں مرجع کا فتویٰ کیا ہے؟").status).toBe("unsupported-fatwa");
  });
  it("copies and restores selected Quran sources into the printable draft", () => {
    const result = ask("2:153", "quran");
    const draft = createKnowledgeDraft(result, result.passages.map(p => p.id), "ur", 45);
    expect(validateCustomSermonProject(draft)).toEqual([]);
    expect(parseCustomSermonProject(serializeCustomSermonProject(draft))).toEqual(draft);
    expect(buildCustomSermonText(draft, "ur")).toContain(result.passages[0].text);
    expect(() => createKnowledgeDraft(result, [], "ur", 30)).toThrow();
  });
  it("rejects invented citation IDs, empty citations and altered quotes", () => {
    const result = ask("2:153", "quran"); const p = result.passages[0];
    expect(verifyKnowledgeClaims([{ text: "Claim", citations: [{ passageId: p.id, quote: p.text }] }], result.passages)).toBe(true);
    for (const citations of [[], [{ passageId: "invented", quote: p.text }], [{ passageId: p.id, quote: "not in text" }], [{ passageId: p.id, quote: "" }]]) expect(verifyKnowledgeClaims([{ text: "Claim", citations }], result.passages)).toBe(false);
  });
  it.runIf(Boolean(corpus))("finds Arabic and Urdu passages across all three sources for an Urdu question", () => {
    const result = ask("صبر کے بارے میں قرآن اور نہج البلاغہ میں کیا مواد ہے؟");
    expect(result.status).toBe("evidence");
    expect(new Set(result.passages.map(p => p.collection))).toEqual(new Set(["quran", "nahj", "sahifa"]));
    expect(result.passages.some(p => p.language === "ur")).toBe(true);
    for (const p of result.passages.filter(p => p.excerpt)) expect(records.find(r => r.id === p.recordId)!.paragraphs.find(x => x.id === p.paragraphId)!.text).toBe(p.text);
    expect(result.passages.length).toBeLessThanOrEqual(8);
  });
  it.runIf(Boolean(corpus))("uses canonical saying 55, not file entry 109, and returns the actual quote", () => {
    const result = ask("نہج البلاغہ حکمت ۵۵", "nahj");
    const ar = result.passages.find(p => p.language === "ar")!;
    expect(ar.referenceUr).toBe("نہج البلاغہ، حکمت 55");
    expect(ar.text).toContain("صَبْرَانِ");
    expect(ar.excerpt!.paragraphNumbers).toEqual([2]);
    const draft = createKnowledgeDraft(result, result.passages.map(p => p.id), "ur", 30);
    expect(buildCustomSermonText(draft, "ur")).toContain(ar.text);
    expect(knowledgeResultText(result, "ur")).not.toMatch(/\.docx|word\/document.xml|:saying:109/);
  });
  it.runIf(Boolean(corpus))("keeps quoted exact phrases strict and scopes editions", () => {
    const result = ask('"اَلصَّبْرُ صَبْرَانِ"', "nahj", "en");
    expect(result.passages.length).toBeGreaterThan(0);
    expect(result.passages.every(p => p.collection === "nahj" && p.language !== "ur")).toBe(true);
    expect(ask('"اَلصَّبْرُ xyzdoesnotexist"', "nahj").passages).toEqual([]);
    const dua = ask("دعا ۲۸", "sahifa");
    expect(dua.passages.length).toBeGreaterThan(0);
    expect(dua.passages.every(p => p.referenceUr.includes("28"))).toBe(true);
  });
});
