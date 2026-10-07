import { createHash } from "node:crypto";
import type { ResearchBlobClient } from "../../tools/research-studio/engine";
import type { BookRecord, BookSource } from "./bookCorpus";
import { bookSearchUnits } from "./sourceUnits";
import type { KnowledgePassage, KnowledgeResult } from "./retrieval";

const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const root = "khateeb-translations/v1/";
export type BookTranslation = {
  format: "qalam-book-translation"; version: 1;
  sourceId: string; recordId: string; paragraphIds: string[]; sourceSha256: string; originalTextSha256: string;
  language: "ur" | "en"; text: string; translator: string; translationSource: string; reviewed: true;
};
function key(value: Pick<BookTranslation, "sourceId" | "recordId" | "paragraphIds" | "sourceSha256" | "originalTextSha256" | "language">) {
  return hash(JSON.stringify([value.sourceId,value.recordId,value.paragraphIds,value.sourceSha256,value.originalTextSha256,value.language]));
}
export function prepareBookTranslation(value: unknown, record: BookRecord, source: BookSource): BookTranslation {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid-translation");
  const v = value as Record<string, unknown>;
  if (record.language !== "ar" || source.language !== "ar" || record.sourceId !== source.id || v.sourceId !== source.id || v.recordId !== record.id || v.sourceSha256 !== source.sha256 || v.reviewed !== true || !["ur","en"].includes(String(v.language)) || !Array.isArray(v.paragraphIds) || typeof v.originalText !== "string" || typeof v.text !== "string" || v.text.trim().length < 2 || v.text.length > 30000 || typeof v.translator !== "string" || !v.translator.trim() || v.translator.length > 200 || typeof v.translationSource !== "string" || !v.translationSource.trim() || v.translationSource.length > 1000) throw new Error("invalid-translation");
  const unit = bookSearchUnits(record).find(u => JSON.stringify(u.paragraphs.map(p=>p.id)) === JSON.stringify(v.paragraphIds));
  if (!unit || unit.text !== v.originalText) throw new Error("source-mismatch");
  return { format: "qalam-book-translation", version: 1, sourceId: source.id, recordId: record.id, paragraphIds: unit.paragraphs.map(p=>p.id), sourceSha256: source.sha256, originalTextSha256: hash(unit.text), language: v.language as "ur" | "en", text: v.text.trim(), translator: v.translator.trim(), translationSource: v.translationSource.trim(), reviewed: true };
}
export async function saveBookTranslation(client: ResearchBlobClient, value: BookTranslation) {
  const serialized = JSON.stringify(value);
  const path = `${root}${key(value)}.json`;
  // Retain the previous edition in immutable history before replacing the active entry.
  await client.putObject(`${root}history/${key(value)}/${hash(serialized)}.json`, serialized);
  await client.putObject(path, serialized);
  cache.delete(path);
}
const cache = new Map<string, { value: BookTranslation | null; expires: number }>();
export async function attachBookTranslations(client: ResearchBlobClient, result: KnowledgeResult, language: "ur" | "en"): Promise<KnowledgeResult> {
  const passages = await Promise.all(result.passages.map(async (p): Promise<KnowledgePassage> => {
    if (p.collection === "quran" || p.language !== "ar" || !p.excerpt || !p.sourceId || !p.recordId) return p;
    const identity = { sourceId: p.sourceId, recordId: p.recordId, paragraphIds: p.excerpt.paragraphs.map(x=>x.id), sourceSha256: p.sourceSha256, originalTextSha256: hash(p.text), language };
    const path = `${root}${key(identity)}.json`;
    let value = cache.get(path);
    if (!value || value.expires <= Date.now()) {
      try {
        const raw = await client.getObject(path);
        const parsed = raw && raw.length <= 50000 ? JSON.parse(raw) as BookTranslation : null;
        const valid = parsed && parsed.format === "qalam-book-translation" && parsed.version === 1 && parsed.reviewed === true && key(parsed) === key(identity) && typeof parsed.text === "string" && parsed.text.trim().length >= 2 && parsed.text.length <= 30000 && typeof parsed.translator === "string" && parsed.translator.trim() && typeof parsed.translationSource === "string" && parsed.translationSource.trim();
        value = { value: valid ? parsed : null, expires: Date.now() + 60000 };
        if (cache.size >= 256) cache.delete(cache.keys().next().value!);
        cache.set(path, value);
      } catch { return p; }
    }
    const translation = value.value;
    return translation ? { ...p, suppliedTranslation: { text: translation.text, language, translator: translation.translator, source: translation.translationSource } } : p;
  }));
  return { ...result, passages };
}
