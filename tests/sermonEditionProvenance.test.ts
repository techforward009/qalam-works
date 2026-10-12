import {expect,it} from "vitest";
import {createKnowledgeDraft} from "../app/tools/khateeb-studio/engine/knowledgeDraft";
import {completeQuranTranslationFor} from "../app/lib/knowledge/completeQuranTranslations";
import {QURAN_TRANSLATION_SOURCES} from "../app/tools/khateeb-studio/engine/quranTranslationProvider";
import {buildCustomSermonText,parseCustomSermonProject,serializeCustomSermonProject} from "../app/tools/khateeb-studio/engine/customSermonProject";
import type {KnowledgePassage,KnowledgeResult} from "../app/lib/knowledge/retrieval";
function sample(text:string,translator=QURAN_TRANSLATION_SOURCES.ur.translatorUr):KnowledgeResult{
 const p:KnowledgePassage={
  id:"quran:sample:2:153",collection:"quran",language:"ar",quranLocation:{surah:2,ayah:153},
  text:"يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ",
  referenceUr:"قرآن، ۲:۱۵۳",referenceEn:"Quran, 2:153",sourceSha256:"a".repeat(64),
  translator:null,suppliedTranslation:{text,language:"ur",translator}
 };
 return {question:"صبر",status:"evidence",method:"lexical-bm25-topic-expansion",passages:[p],expandedTerms:[],availableCollections:["quran"]};
}
it("recognizes exact Sheikh Mohsin Ali Najafi Urdu Quran corpus text as named source edition",()=>{
 const canonical=completeQuranTranslationFor(2,153,"ur");
 expect(canonical).toBeTruthy();
 const result=sample(canonical!);
 const project=createKnowledgeDraft(result,[result.passages[0].id],"ur",20);
 expect(project.evidence[0]).toMatchObject({
  sourceSha256:"a".repeat(64),sourceReviewStatus:"corpus-linked",
  translationReviewStatus:"source-linked",translationSource:QURAN_TRANSLATION_SOURCES.ur.sourceLabelUr
 });
 const text=buildCustomSermonText(project,"ur");
 expect(text).toContain(canonical!);
 expect(text).not.toContain("نسخہ جاتی تصدیق باقی");
 expect(text).not.toContain("آزمائشی اقتباس یا ادارتی ترجمہ");
});
it("does not certify a modified or wrongly attributed Quran translation as the named edition",()=>{
 const canonical=completeQuranTranslationFor(2,153,"ur")!;
 for(const item of [sample(canonical+" غیر مصدقہ اضافہ"),sample(canonical,"غلط مترجم")]){
  const project=createKnowledgeDraft(item,[item.passages[0].id],"ur",20);
  expect(project.evidence[0].translationReviewStatus).toBe("supplied-unreviewed");
  expect(buildCustomSermonText(project,"ur")).toContain("نسخہ جاتی تصدیق باقی");
  const serialized=serializeCustomSermonProject(project);
  expect(parseCustomSermonProject(serialized)?.evidence[0].translationReviewStatus).toBe("supplied-unreviewed");
 }
});
it("rejects invalid source and translation provenance fields on saved draft restoration",()=>{
 const result=sample(completeQuranTranslationFor(2,153,"ur")!);
 const draft=createKnowledgeDraft(result,[result.passages[0].id],"ur",20);
 const invalid={...draft,evidence:[{...draft.evidence[0],translationReviewStatus:"official-no-review-needed"}]};
 expect(parseCustomSermonProject(JSON.stringify(invalid))).toBeNull();
});
