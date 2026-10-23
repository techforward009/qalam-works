import bindings from "./patienceBookBindings.json";
import { bookRecordNumber, bookRecordReference, createBookExcerpt, type BookRecord, type BookSource } from "./bookCorpus";
import { hasAnswerLanguageText } from "./answerLanguage";
import type { KnowledgeResult } from "./retrieval";

/** Reuse the reviewed Arabic/English source selections, not paragraph offsets
 * guessed from differently split editions. In particular, Sahifa English records
 * include commentary: a whole record is NOT a translation of the prayer.
 * The R2 loader verifies the corpus; these bindings additionally pin the reviewed
 * source and record hashes. Missing/changed/unreviewed units stay untranslated.
 */
export function attachR2EnglishSermonTranslations(result: KnowledgeResult, records: readonly BookRecord[], sources: readonly BookSource[]): KnowledgeResult {
  const byRecord = new Map(records.map(r=>[r.id,r]));
  const bySource = new Map(sources.map(s=>[s.id,s]));
  const seen = new Set<string>();
  const passages = result.passages.flatMap(p=>{
    if (p.collection === "quran" || p.language !== "ar" || !p.recordId || !p.excerpt) return [p];
    const original = byRecord.get(p.recordId), source = bySource.get(p.sourceId ?? "");
    if (!original || !source || original.language !== "ar" || source.language !== "ar" || original.sourceId !== source.id || p.sourceSha256 !== source.sha256 || p.excerpt.recordSha256 !== original.textSha256 || p.text !== p.excerpt.paragraphs.map(x=>x.text).join("\n") || !p.excerpt.paragraphs.every(x=>original.paragraphs.some(y=>y.id===x.id && y.text===x.text))) return [p];
    const originalBindings = bindings.filter(b=>b.recordId===original.id && b.sourceId===source.id && b.sourceSha256===source.sha256 && b.recordSha256===original.textSha256 && b.paragraphNumbers.some(n=>p.excerpt!.paragraphs.some(x=>x.id===original.paragraphs[n-1]?.id)));
    const pairs = originalBindings.flatMap(originalBinding=>bindings.filter(b=>b.angleId===originalBinding.angleId && ["nahj-letters-sayings-en","nahj-sermons-en","sahifa-en"].includes(b.sourceId)).map(translationBinding=>({originalBinding,translationBinding})));
    if (pairs.length !== 1) return [p];
    const {originalBinding,translationBinding}=pairs[0];
    const translated=byRecord.get(translationBinding.recordId), translationSource=bySource.get(translationBinding.sourceId);
    if (!translated || !translationSource || translated.sourceId!==translationSource.id || translated.language!=="en" || translationSource.language!=="en" || translated.book!==original.book || translationSource.book!==original.book || translated.kind!==original.kind || bookRecordNumber(translated)!==bookRecordNumber(original) || translated.textSha256!==translationBinding.recordSha256 || translationSource.sha256!==translationBinding.sourceSha256) return [p];
    const originalBody=originalBinding.paragraphNumbers.map(n=>original.paragraphs[n-1]);
    const translationBody=translationBinding.paragraphNumbers.map(n=>translated.paragraphs[n-1]);
    if(originalBody.some(x=>!x)||translationBody.some(x=>!x))return [p];
    const text=translationBody.map(x=>x.text).join("\n");
    if(!hasAnswerLanguageText(text,"en"))return [p];
    const key=`${original.id}:${originalBinding.angleId}`;
    if(seen.has(key))return [];
    seen.add(key);
    const excerpt=createBookExcerpt(original,source,originalBody.map(x=>x.id));
    return [{...p,id:excerpt.id,paragraphId:undefined,excerpt,text:excerpt.paragraphs.map(x=>x.text).join("\n"),
      referenceUr:bookRecordReference(original,"ur"),referenceEn:bookRecordReference(original,"en"),
      suppliedTranslation:{text,language:"en" as const,translator:translationSource.translator ?? "Supplied English edition — translator not named",
        source:translationBinding.referenceLabelEn,sourceId:translationSource.id,sourceSha256:translationSource.sha256,
        recordId:translated.id,paragraphIds:translationBody.map(x=>x.id)}}];
  });
  return {...result,passages};
}
