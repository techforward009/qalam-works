import bindings from "./suppliedTranslationBindings.json";
import { bookRecordNumber, bookRecordReference, type BookRecord, type BookSource } from "./bookCorpus";
import type { KnowledgeResult } from "./retrieval";

/** Edition-bound correspondences contain identifiers and digests, never private book text. */
export function attachCorpusTranslations(result: KnowledgeResult, records: readonly BookRecord[], sources: readonly BookSource[], locale: "ur" | "en"): KnowledgeResult {
  if (locale !== "ur") return result;
  const byRecord = new Map(records.map(r=>[r.id,r]));
  const bySource = new Map(sources.map(s=>[s.id,s]));
  const byParagraph = new Map(bindings.map(b=>[b.originalParagraphId,b]));
  return { ...result, passages: result.passages.map(p=>{
    if (p.language !== "ar" || p.collection === "quran" || p.suppliedTranslation || p.excerpt?.paragraphs.length !== 1) return p;
    const binding = byParagraph.get(p.excerpt.paragraphs[0].id);
    if (!binding || p.recordId !== binding.originalRecordId || p.sourceId !== binding.originalSourceId || p.sourceSha256 !== binding.originalSourceSha256) return p;
    const original = byRecord.get(binding.originalRecordId);
    const translated = byRecord.get(binding.translationRecordId);
    const originalSource = bySource.get(binding.originalSourceId);
    const translationSource = bySource.get(binding.translationSourceId);
    if (!original || !translated || !originalSource || !translationSource || original.language !== "ar" || translated.language !== "ur" || original.book !== translated.book || original.kind !== translated.kind || original.textSha256 !== binding.originalRecordSha256 || translated.textSha256 !== binding.translationRecordSha256 || originalSource.sha256 !== binding.originalSourceSha256 || translationSource.sha256 !== binding.translationSourceSha256 || bookRecordNumber(original) !== binding.canonicalNumber || bookRecordNumber(translated) !== binding.canonicalNumber) return p;
    const originalParagraph = original.paragraphs.find(x=>x.id===binding.originalParagraphId);
    const translationParagraph = translated.paragraphs.find(x=>x.id===binding.translationParagraphId);
    if (!originalParagraph || !translationParagraph || originalParagraph.text !== p.text || !translationParagraph.text.trim()) return p;
    const translator = translationSource.translator ?? "فراہم کردہ اردو نسخہ — مترجم کا نام درج نہیں";
    const reference = bookRecordReference(translated,"ur",translationParagraph.id);
    const provenance = `${reference}؛ ${original.book === "nahj" ? "مرکز افکار اسلامی کا فراہم کردہ نسخہ" : "مرکز افکار اسلامی، ایڈیشن ۲۰۲۰"}`;
    return { ...p, suppliedTranslation: { text: translationParagraph.text, language: "ur" as const, translator, source: provenance, sourceId: translationSource.id, sourceSha256: translationSource.sha256, recordId: translated.id, paragraphIds: [translationParagraph.id] } };
  }) };
}
