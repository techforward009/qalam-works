import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { asksAboutRespectForParents, isRespectForParentsEvidence } from "../app/lib/knowledge/knowledgeRelevance";
import { bookSearchUnits, isBookLocator } from "../app/lib/knowledge/sourceUnits";
import { retrieveKnowledge } from "../app/lib/knowledge/retrieval";
import type { BookRecord, BookSource } from "../app/lib/knowledge/bookCorpus";

const sha = (p: string[]) => createHash("sha256").update(p.join("\n")).digest("hex");
const source = (id: string, book: BookSource["book"], language: BookSource["language"]): BookSource => ({
  id, book, language, filename: "verified-edition.docx", sha256: "a".repeat(64), translator: language === "ar" ? null : "Original supplied translator",
});
function record(s: BookSource, id: string, title: string, kind: string, number: number, texts: string[], kafi = false): BookRecord {
  return { id, sourceId: s.id, book: s.book, language: s.language, title, kind, number, textSha256: sha(texts),
    reference: { sourceId: s.id, section: kind, number, locator: "word/document.xml", printPage: null,
       ...(kafi ? { kafi: { volume: 2, bookTitle: null, chapterTitle: title, sectionTitle: null, sourceParagraphs: texts.map((_,i)=>650+i) } } : {}) },
    paragraphs: texts.map((text,i)=>({ id: `${id}:p${i+1}`, text })) };
}
const kafi = source("kafi-v2-ar","kafi","ar");
const kafiLegal = source("kafi-v7-ar","kafi","ar");
const sahifa = source("sahifa-ar","sahifa","ar");
const sahifaUr = source("sahifa-ur","sahifa","ur");
const nahj = source("nahj-ur","nahj","ur");
const kafiEthic = record(kafi,"kafi-v2-ar:chapter:70","بَابُ الْبِرِّ بِالْوَالِدَيْنِ","chapter",70,[
 "بَابُ الْبِرِّ بِالْوَالِدَيْنِ",
 "4ـ عَنْ أَبِي عَبْدِ الله عَلَيْهِ السَّلَامُ قَالَ أَيُّ الْأَعْمَالِ أَفْضَلُ قَالَ الصَّلَاةُ لِوَقْتِهَا وَبِرُّ الْوَالِدَيْنِ وَالْجِهَادُ فِي سَبِيلِ الله.",
],true);
const kafiWitness = record(kafiLegal,"kafi-v7-ar:chapter:99","بَابُ شَهَادَةِ الْوَالِدِ لِلْوَلَدِ","chapter",99,[
 "2ـ عَنْ أَبِي عَبْدِ الله عَلَيْهِ السَّلَامُ قَالَ سَأَلْتُهُ عَنْ شَهَادَةِ الْوَالِدِ لِوَلَدِهِ وَالْوَلَدِ لِوَالِدِهِ فَقَالَ تَجُوزُ."
],true);
const note = record(nahj,"nahj-ur:sermon:178","178. اپنے اصحاب کی مذمت","sermon",178,[
 "خطبہ (۱۷۸)", "میں نے اپنے اصحاب کو مخاطب کیا۔",
 "۱؂ ’’نابغہ‘‘ عمرو ابن عاص کی والدہ کا لقب ہے۔ اس کی عمومی شہرت تھی۔"
]);
const saying = record(nahj,"nahj-ur:saying:318","318. فرزند و پدر کے حقوق","saying",318,[
 "(۳۹۹)", "ایک حق فرزند کا باپ پر ہوتا ہے اور ایک حق باپ کا فرزند پر ہوتا ہے:",
 "باپ کا فرزند پر یہ حق ہے کہ وہ سوائے اللہ کی معصیت کے ہر بات میں اس کی اطاعت کرے۔",
 "اور فرزند کا باپ پر یہ حق ہے کہ اس کا نام اچھا تجویز کرے، اچھے اخلاق و آداب سے آراستہ کرے اور قرآن کی اسے تعلیم دے۔"
]);
const prayer = record(sahifa,"sahifa-ar:supplication:24","24. دُعَاؤُهُ لِأَبَوَيْهِ","supplication",24,[
 "(۲۴) وَ كَانَ مِنْ دُعَائِهِ عَلَيْهِ السَّلَامُ",
 "لِأَبَوَيْهِ عَلَيْهِمَا السَّلَامُ",
 "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَخَصُّصْ وَالِدَيَّ بِالْكَرَامَةِ",
 "اللَّهُمَّ خَفِّضْ لَهُمَا صَوْتِي وَأَطِبْ لَهُمَا كَلَامِي وَأَلِنْ لَهُمَا عَرِيكَتِي."
]);
const prayerUr = record(sahifaUr,"sahifa-ur:supplication:24","24. والدین کے حق میں دعا","supplication",24,[
 "اپنے والدین کے حق میں حضرتؑ کی دعا:",
 "اے اللہ! میری آواز کو ان کے سامنے آہستہ، میرے کلام کو ان کے لیے خوشگوار، میری طبیعت کو نرم بنا دے۔"
]);
const quran = [
 { surah: 90, ayah: 3, text: "وَوَالِدٍ وَمَا وَلَدَ" },
 { surah: 17, ayah: 23, text: "وَقَضَى رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا إِمَّا يَبْلُغَنَّ عِنْدَكَ الْكِبَرَ أَحَدُهُمَا أَوْ كِلَاهُمَا فَلَا تَقُلْ لَهُمَا أُفٍّ وَلَا تَنْهَرْهُمَا وَقُلْ لَهُمَا قَوْلًا كَرِيمًا" },
 { surah: 31, ayah: 14, text: "وَوَصَّيْنَا الْإِنْسَانَ بِوَالِدَيْهِ حَمَلَتْهُ أُمُّهُ وَهْنًا عَلَى وَهْنٍ وَفِصَالُهُ فِي عَامَيْنِ أَنِ اشْكُرْ لِي وَلِوَالِدَيْكَ إِلَيَّ الْمَصِيرُ" }
];
describe("Source-grounded scholarly retrieval: والدین کا احترام", () => {
 it("does not turn genealogy into an ethical teaching",()=>{
   expect(asksAboutRespectForParents("والدین کا احترام")).toBe(true);
   expect(asksAboutRespectForParents("والدین کی گواہی")).toBe(false);
   expect(isRespectForParentsEvidence("ووالد وما ولد")).toBe(false);
   expect(isRespectForParentsEvidence("شهادة الوالد لولده والولد لوالده فقال تجوز")).toBe(false);
   expect(isRespectForParentsEvidence("وَبِالْوَالِدَيْنِ إِحْسَانًا")).toBe(true);
 });
 it("joins an entire multi-paragraph Nahj wisdom without its index", () => {
   const units=bookSearchUnits(saying);
   expect(units).toHaveLength(1);
   expect(units[0].paragraphs).toHaveLength(3);
   expect(units[0].text).toContain("اور فرزند کا باپ پر یہ حق");
   expect(units[0].text).not.toContain("(۳۹۹)");
 });
 it("omits source/translator headings and footnotes without omitting prayer", () => {
   expect(isBookLocator(note,{paragraph:note.paragraphs[2],paragraphs:[note.paragraphs[2]],text:note.paragraphs[2].text},2)).toBe(true);
   expect(isBookLocator(prayer,{paragraph:prayer.paragraphs[1],paragraphs:[prayer.paragraphs[1]],text:prayer.paragraphs[1].text},1)).toBe(true);
   expect(isBookLocator(prayerUr,{paragraph:prayerUr.paragraphs[0],paragraphs:[prayerUr.paragraphs[0]],text:prayerUr.paragraphs[0].text},0)).toBe(true);
   expect(isBookLocator(prayer,{paragraph:prayer.paragraphs[3],paragraphs:[prayer.paragraphs[3]],text:prayer.paragraphs[3].text},3)).toBe(false);
 });
 it("presents Quran ethics, a complete Nahj saying, Sahifa prayer body and Kafi ethics without irrelevant samples", () => {
   const records=[note,saying,prayer,prayerUr,kafiEthic,kafiWitness];
   const sources=[nahj,sahifa,sahifaUr,kafi,kafiLegal];
   const result=retrieveKnowledge({question:"والدین کا احترام",scope:"all",locale:"ur",candidateLimit:16,
       records,sources,quran,quranSha256:"a".repeat(64)});
   const ids=result.passages.map(p=>p.id);
   expect(result.status).toBe("evidence");
   expect(result.passages.map(p=>p.collection)).toContain("kafi");
   expect(result.passages.some(p=>p.sourceId==="kafi-v2-ar")).toBe(true);
   expect(result.passages.some(p=>p.recordId==="nahj-ur:saying:318")).toBe(true);
   expect(result.passages.some(p=>p.recordId==="sahifa-ar:supplication:24")).toBe(true);
   expect(result.passages.some(p=>p.quranLocation?.surah===17&&p.quranLocation.ayah===23)).toBe(true);
   expect(result.passages.some(p=>p.quranLocation?.surah===31&&p.quranLocation.ayah===14)).toBe(true);
   expect(result.passages.some(p=>p.quranLocation?.surah===90&&p.quranLocation.ayah===3)).toBe(false);
   expect(result.passages.some(p=>p.sourceId==="kafi-v7-ar")).toBe(false);
   expect(result.passages.some(p=>p.text.includes("نابغہ"))).toBe(false);
   expect(result.passages.some(p=>p.text.trim()==="لِأَبَوَيْهِ عَلَيْهِمَا السَّلَامُ")).toBe(false);
   expect(result.passages.some(p=>p.text.includes("حق فرزند")&&p.text.includes("اخلاق و آداب"))).toBe(true);
   expect(new Set(ids).size).toBe(ids.length);
 });
 it("preserves unrelated request paths, e.g. legal testimony question",()=>{
   const result=retrieveKnowledge({question:"شهادة الوالد لولده",scope:"kafi",locale:"ur",
     records:[kafiWitness],sources:[kafiLegal],quran:[],quranSha256:"a".repeat(64)});
   expect(result.passages.some(p=>p.recordId===kafiWitness.id)).toBe(true);
 });
});
