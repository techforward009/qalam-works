import { describe, expect, it } from "vitest";
import { asksAboutRespectForParents, isRespectForParentsEvidence } from "../app/lib/knowledge/knowledgeRelevance";
import { bookSearchUnits, isBookLocator } from "../app/lib/knowledge/sourceUnits";
import { groupKnowledgeSources } from "../app/lib/knowledge/knowledgeSourceGroups";
import type { BookRecord } from "../app/lib/knowledge/bookCorpus";
import type { KnowledgePassage } from "../app/lib/knowledge/retrieval";

const question = "والدین کا احترام";
const quran31_33 = "يَا أَيُّهَا النَّاسُ اتَّقُوا رَبَّكُمْ وَاخْشَوْا يَوْمًا لَا يَجْزِي وَالِدٌ عَنْ وَلَدِهِ وَلَا مَوْلُودٌ هُوَ جَازٍ عَنْ وَالِدِهِ شَيْئًا إِنَّ وَعْدَ اللَّهِ حَقٌّ فَلَا تَغُرَّنَّكُمُ الْحَيَاةُ الدُّنْيَا";
const quran17_23 = "وَقَضَى رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا إِمَّا يَبْلُغَنَّ عِنْدَكَ الْكِبَرَ أَحَدُهُمَا أَوْ كِلَاهُمَا فَلَا تَقُلْ لَهُمَا أُفٍّ وَلَا تَنْهَرْهُمَا";
const quran31_14 = "وَوَصَّيْنَا الْإِنْسَانَ بِوَالِدَيْهِ حَمَلَتْهُ أُمُّهُ وَهْنًا عَلَى وَهْنٍ وَفِصَالُهُ فِي عَامَيْنِ أَنِ اشْكُرْ لِي وَلِوَالِدَيْكَ إِلَيَّ الْمَصِيرُ";
const sourceRef = "صحیفہ کاملہ سجادیہ، دعا 24";
const prayer: BookRecord = {
  id: "sahifa-ur:supplication:24",
  sourceId: "sahifa-ur",
  book: "sahifa", language: "ur", kind: "supplication", number: 24,
  title: "24. دُعَآؤُهٗ لِاَبَوَیْهِ",
  reference: { sourceId: "sahifa-ur", section: "supplication", number: 24, locator: "word/document.xml", printPage: null },
  textSha256: "a".repeat(64),
  paragraphs: [
    "اپنے والدین کے حق میں حضرتؑ کی دُعا:",
    "اے اللہ! میرے ماں باپ کو بھی اپنے نزدیک عزت و کرامت اور اپنی رحمت سے مخصوص فرما۔",
    "اے اللہ! محمدؐ اور ان کی آلؑ پر رحمت نازل فرما اور ان کے جو حقوق مجھ پر واجب ہیں ان کا علم عطا کر۔",
    "اے اللہ! میری آواز کو ان کے سامنے آہستہ، میرے کلام کو ان کیلئے خوشگوار، میری طبیعت کو نرم بنا دے۔",
    "خداوند عالم کے عظیم احسانات کے بعد ماں باپ کے احسانات کا درجہ ہے جن کی پرورش و تربیت میں ربوبیت الٰہی کی جھلک نظر آتی ہے۔",
    "﴿وَقَضٰى رَبُّكَ اَلَّا تَعْبُدُوْٓا اِلَّآ اِيَّاہُ وَبِالْوَالِدَيْنِ اِحْسَانًا ۝۲۳﴾",
    "اللہ تعالیٰ نے اس آیت میں اپنی عبادت کا حکم دیا ہے۔",
  ].map((text,i)=>({id:`sahifa-ur:supplication:24:p${i+1}`,text}))
};
const passage=(id:string,language:"ar"|"ur",collection:"nahj"|"sahifa"|"kafi",ref:string):KnowledgePassage =>
 ({id,collection,language,text:id,referenceUr:ref,referenceEn:ref,sourceSha256:"b".repeat(64),translator:null});
describe("parent-respect source precision and presentation", () => {
  it("does not misread Quran 31:33 general 'Allah's promise is true' as parental rights", () => {
    expect(asksAboutRespectForParents(question)).toBe(true);
    expect(isRespectForParentsEvidence(quran31_33)).toBe(false);
    expect(isRespectForParentsEvidence(quran17_23)).toBe(true);
    expect(isRespectForParentsEvidence(quran31_14)).toBe(true);
  });
  it("keeps the original verified Sahifa Urdu prayer and excludes following translator commentary and Quran quotation", () => {
    const units = bookSearchUnits(prayer);
    expect(units).toHaveLength(4);
    expect(units.some(unit => unit.text.includes("میری آواز کو ان کے سامنے آہستہ"))).toBe(true);
    expect(units.some(unit => unit.text.includes("خداوند عالم کے عظیم احسانات"))).toBe(false);
    expect(units.some(unit => unit.text.startsWith("﴿"))).toBe(false);
    expect(isBookLocator(prayer, {paragraph:prayer.paragraphs[0],paragraphs:[prayer.paragraphs[0]],text:prayer.paragraphs[0].text},0)).toBe(true);
  });
  it("displays matching Arabic and Urdu source editions under one reference without claiming paragraph-aligned translation", () => {
    const passages=[
      passage("nahj-ar:saying", "ar", "nahj", "نہج البلاغہ، حکمت 399"),
      passage("nahj-ur:saying", "ur", "nahj", "نہج البلاغہ، حکمت 399"),
      passage("sahifa-ar:24", "ar", "sahifa", sourceRef),
      passage("sahifa-ur:24", "ur", "sahifa", sourceRef),
      passage("kafi-v2:4", "ar", "kafi", "الکافی، جلد 2، حدیث 4")
    ];
    const result=groupKnowledgeSources(passages);
    expect(result).toHaveLength(3);
    expect(result.map(x=>x.passages.length)).toEqual([2,2,1]);
    expect(result[0].passages.map(p=>p.language)).toEqual(["ar","ur"]);
    expect(result[1].passages.map(p=>p.language)).toEqual(["ar","ur"]);
    expect(result.flatMap(x=>x.passages.map(p=>p.id))).toEqual(passages.map(p=>p.id));
  });
  it("does not combine two separate same-language hadiths under one title", () => {
    const rows=[passage("kafi:1","ar","kafi","الکافی، جلد 2"),passage("kafi:2","ar","kafi","الکافی، جلد 2")];
    expect(groupKnowledgeSources(rows)).toHaveLength(2);
  });
});
