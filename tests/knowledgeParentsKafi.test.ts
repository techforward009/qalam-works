import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { planKnowledgeQuery } from "../app/lib/knowledge/searchConcepts";
import { rankLexicalDocuments } from "../app/lib/knowledge/lexicalRanking";
import { retrieveKnowledge } from "../app/lib/knowledge/retrieval";
import type { BookRecord, BookSource } from "../app/lib/knowledge/bookCorpus";

const originalHeading = "بَابُ الْبِرِّ بِالْوَالِدَيْنِ";
const originalNarration = "4ـ الْحُسَيْنُ بْنُ مُحَمَّدٍ عَنْ مُعَلَّى بْنِ مُحَمَّدٍ عَنِ الْوَشَّاءِ عَنْ مَنْصُورِ بْنِ حَازِمٍ عَنْ أَبِي عَبْدِ الله (عَلَيهِ السَّلام) قَالَ قُلْتُ أَيُّ الأعْمَالِ أَفْضَلُ قَالَ الصَّلاةُ لِوَقْتِهَا وَبِرُّ الْوَالِدَيْنِ وَالْجِهَادُ فِي سَبِيلِ الله عَزَّ وَجَلَّ.";
const source: BookSource = { id: "kafi-v2-ar", book: "kafi", language: "ar", filename: "al-kafi-vol2-arabic.docx", sha256: "1b31b7cfff1d82bc4884f30494a903fbdf454066350ca6b5502f098c54e20a30", translator: null };
const record: BookRecord = {
 id: "kafi-v2-ar:chapter:70", sourceId: source.id, book: "kafi", language: "ar",
 kind: "chapter", title: originalHeading, number: 70,
 reference: { sourceId: source.id, section: "chapter", number: 70, locator: "word/document.xml paragraphs 651-672", printPage: null,
   kafi: { volume: 2, bookTitle: null, chapterTitle: originalHeading, sectionTitle: null, sourceParagraphs: [651, 652] }},
 paragraphs: [
   { id: "kafi-v2-ar:chapter:70:p1", text: originalHeading },
   { id: "kafi-v2-ar:chapter:70:p2", text: originalNarration },
 ],
 textSha256: createHash("sha256").update([originalHeading,originalNarration].join("\n")).digest("hex")
};
describe("Urdu respect-for-parents questions find original Kafi narrations", () => {
 it.each(["والدین کا احترام", "والدین کی عزت", "ماں باپ کا احترام"])(
  "treats %s as one strong subject, not an Arabic-unmatched second subject",
  question => {
   const result=planKnowledgeQuery(question, ["kindness","rights","marriage"]);
   expect(result.topics.map(t=>t.id)).toContain("parents");
   expect(result.groups).toHaveLength(1);
  }
 );
 it("uses verified original chapter context to find a narration without inventing a translation", () => {
   const terms=planKnowledgeQuery("والدین کا احترام");
   const scores=rankLexicalDocuments([{ text: "4ـ عمل نافع مؤمن کے لیے", heading: originalHeading }], terms.groups, terms.direct);
   expect(scores[0]).toBeGreaterThan(0);
 });
 it.each(["kafi","all"] as const)("retrieves the original Kafi volume 2 narration with a precise source reference in %s scope", scope => {
   const result=retrieveKnowledge({
    question: "والدین کا احترام",scope,locale:"ur",records:[record],sources:[source],quran:[],quranSha256:"f".repeat(64),
   });
   expect(result.status).toBe("evidence");
   const p=result.passages.find(p=>p.collection==="kafi");
   expect(p).toBeTruthy();
   expect(p?.recordId).toBe("kafi-v2-ar:chapter:70");
   expect(p?.text).toBe(originalNarration);
   expect(p?.referenceUr).toContain("الکافی");
   expect(p?.referenceUr).toContain("جلد 2");
   expect(p?.suppliedTranslation).toBeUndefined();
 });
});
