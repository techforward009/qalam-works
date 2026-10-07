import { planKnowledgeQuery, type SearchTopic } from "./searchConcepts";
import { bookSearchUnits } from "./sourceUnits";
import { rankLexicalDocuments } from "./lexicalRanking";
import { researchSummaryText, type KnowledgeResearchAnswer } from "./researchAnswer";
import { bookRecordReference, bookRecordNumber, kafiHadithNumber, createBookExcerpt, normalizeBookSearch, type BookExcerpt, type BookRecord, type BookSource } from "./bookCorpus";

export type KnowledgeScope = "all" | "quran" | "nahj" | "sahifa" | "kafi";
export type KnowledgePassage = {
  id: string; collection: Exclude<KnowledgeScope, "all">; language: "ar" | "ur" | "en";
  referenceUr: string; referenceEn: string; text: string; sourceSha256: string;
  recordId?: string; sourceId?: string; paragraphId?: string; excerpt?: BookExcerpt;
  quranLocation?: { surah: number; ayah: number };
  translator: string | null;
  suppliedTranslation?: { text: string; language: "ur" | "en"; translator: string };
};
export type KnowledgeResult = {
  question: string; contextQuestion?: string; research?: KnowledgeResearchAnswer; status: "evidence" | "not-found" | "unsupported-fatwa";
  method: "lexical-topic-expansion" | "lexical-bm25-topic-expansion"; passages: KnowledgePassage[];
  expandedTerms: string[]; availableCollections: string[]; searchTopics?: SearchTopic[]; questionUnderstanding?: "model" | "lexical"; passageRanking?: "model" | "lexical";
};
export type QuranInput = { surah: number; ayah: number; text: string; suppliedTranslation?: KnowledgePassage["suppliedTranslation"] };
export function queryTerms(question: string): { direct: string[]; groups: string[][] } {
  const { direct, groups } = planKnowledgeQuery(question);
  return { direct, groups };
}
function explicitReference(question: string) {
  const q = normalizeBookSearch(question);
  const match = q.match(/(?:حكمت|حکمت|saying|sermon|خطبہ|خطبه|letter|مكتوب|دعا|supplication|حديث|hadith)\s+(\d+)/u);
  if (!match) return null;
  const kind = /saying|حكمت|حکمت/u.test(match[0]) ? "saying" : /sermon|خطب/u.test(match[0]) ? "sermon" : /letter|مكتوب/u.test(match[0]) ? "letter" : /حديث|hadith/u.test(match[0]) ? "hadith" : "supplication";
  return { kind, number: Number(match[1]) };
}
export function retrieveKnowledge(input: { question: string; inferredTopicIds?: readonly string[]; candidateLimit?: number; scope: KnowledgeScope; locale: "ur" | "en"; records: readonly BookRecord[]; sources: readonly BookSource[]; quran: readonly QuranInput[]; quranSha256: string }): KnowledgeResult {
  const { question, scope, locale } = input;
  const { direct, groups, topics } = planKnowledgeQuery(question, input.inferredTopicIds);
  const base = { question, method: "lexical-bm25-topic-expansion" as const, expandedTerms: [...new Set(groups.flat())], searchTopics: topics, availableCollections: [...new Set([...(input.quran.length ? ["quran"] : []), ...input.sources.map(s => s.book)])] };
  if (/(?:فتوي|فتوا|fatwa|مرجع|مراجع|marja)/iu.test(normalizeBookSearch(question))) return { ...base, status: "unsupported-fatwa", passages: [] };
  const reference = explicitReference(question);
  const kafiVolume = normalizeBookSearch(question).match(/(?:جلد|volume)\s+(\d+)/u)?.[1];
  const quoted = question.match(/["“«]([^"”»]+)["”»]/u)?.[1];
  const exact = quoted ? normalizeBookSearch(quoted) : null;
  const quranRef = question.match(/([0-9۰-۹٠-٩]{1,3})\s*[:：]\s*([0-9۰-۹٠-٩]{1,3})(?:\s*[–—-]\s*([0-9۰-۹٠-٩]{1,3}))?/u);
  const eligibleRecords = input.records.filter(record => (scope === "all" || record.book === scope) && (record.language === "ar" || record.language === locale));
  const chapterQuery = exact ?? direct.filter(t => !["باب", "جلد", "volume", "الکافي", "الكافي", "kafi"].includes(t)).join(" ");
  const matchingChapters = !reference && chapterQuery.split(" ").length >= 2 ? new Set(eligibleRecords.filter(record => record.book === "kafi"
    && (!kafiVolume || record.reference.kafi?.volume === Number(kafiVolume))
    && normalizeBookSearch(record.reference.kafi?.chapterTitle ?? "").includes(chapterQuery)).map(record => record.id)) : new Set<string>();
  const searchRecords = eligibleRecords.filter(record => (!matchingChapters.size || matchingChapters.has(record.id))
    && !(record.book === "kafi" && (record.kind === "front-matter" || kafiVolume && record.reference.kafi?.volume !== Number(kafiVolume)))
    && (!reference || (reference.kind === "hadith" ? record.book === "kafi" : record.kind === reference.kind && bookRecordNumber(record) === reference.number)));
  const units = new Map(searchRecords.map(record => [record.id, bookSearchUnits(record)]));
  const lexicalDocuments = [...searchRecords.flatMap(record => units.get(record.id)!.map(unit => ({ text: unit.text, heading: record.title }))), ...((scope === "all" || scope === "quran") ? input.quran.map(a => ({ text: a.text })) : [])];
  const lexicalScores = !exact && !reference && !quranRef ? rankLexicalDocuments(lexicalDocuments, groups, direct, input.inferredTopicIds?.length && (input.candidateLimit ?? 8) > 8 ? [] : groups.slice(0, topics.length)) : [];
  const rankedScores = new Map<string, number>();
  lexicalDocuments.forEach((doc, i) => { if ((lexicalScores[i] ?? 0) > (rankedScores.get(doc.text) ?? 0)) rankedScores.set(doc.text, lexicalScores[i]); });
  const candidates: { passage: KnowledgePassage; score: number; section: string }[] = [];
  function score(text: string, heading = "") {
    const body = normalizeBookSearch(text);
    if (exact) return body.includes(exact) ? 100 : 0;
    void heading;
    return rankedScores.get(text) ?? 0;
  }
  for (const record of searchRecords) {
    if (scope !== "all" && record.book !== scope || record.language !== "ar" && record.language !== locale) continue;
    const source = input.sources.find(s => s.id === record.sourceId && s.book === record.book && s.language === record.language);
    if (!source || record.book === "kafi" && (record.kind === "front-matter" || kafiVolume && record.reference.kafi?.volume !== Number(kafiVolume))) continue;
    if (reference && (reference.kind === "hadith" ? record.book !== "kafi" : record.kind !== reference.kind || bookRecordNumber(record) !== reference.number)) continue;
    if (matchingChapters.size && !matchingChapters.has(record.id)) continue;
    units.get(record.id)?.forEach((unit, index) => {
      const paragraph = unit.paragraph;
      if (record.book === "kafi" && [record.reference.kafi?.bookTitle, record.reference.kafi?.chapterTitle, record.reference.kafi?.sectionTitle].includes(paragraph.text)) return;
      // Printed contents entries are locators, not the hadith text they point to.
      if (record.book === "kafi" && (paragraph.text.match(/\//g)?.length ?? 0) >= 2 && /^\d+\s+باب\s+.+\s+\d+$/u.test(normalizeBookSearch(paragraph.text))) return;
      if (matchingChapters.has(record.id) && kafiHadithNumber(paragraph.text) === null) return;
      if (reference?.kind === "hadith" && kafiHadithNumber(paragraph.text) !== reference.number) return;
      if (index === 0 && paragraph.text.length < 150 && record.paragraphs.length > 1 && /^\s*[(（][0-9۰-۹٠-٩]+[)）]/u.test(paragraph.text)) return;
      // Preserve the full paragraph within the existing portable excerpt limit.
      if (unit.text.length > 150_000 || unit.text.trim().length < 15) return;
      const value = reference ? 100 + score(unit.text) : matchingChapters.has(record.id) ? 100 : score(unit.text, record.title);
      if (reference && exact && !score(unit.text) && !(record.book === "kafi" && normalizeBookSearch(record.reference.kafi?.chapterTitle ?? "").includes(exact))) return;
      if (!value) return;
      const selected = unit.paragraphs;
      if (selected.map(p => p.text).join("\n").length > 150_000) return;
      const excerpt = createBookExcerpt(record, source, selected.map(p => p.id));
      excerpt.referenceLabelUr = bookRecordReference(record, "ur", paragraph.id);
      excerpt.referenceLabelEn = bookRecordReference(record, "en", paragraph.id);
      candidates.push({ score: value, section: matchingChapters.has(record.id) || (input.candidateLimit ?? 8) > 8 ? `${record.id}:${paragraph.id}` : `${record.book}:${record.kind}:${bookRecordNumber(record) ?? record.id}:${record.language}`, passage: { id: excerpt.id, collection: record.book, language: record.language, referenceUr: bookRecordReference(record, "ur", paragraph.id), referenceEn: bookRecordReference(record, "en", paragraph.id), text: selected.map(p => p.text).join("\n"), sourceSha256: source.sha256, recordId: record.id, sourceId: source.id, paragraphId: paragraph.id, excerpt, translator: source.translator } });
    });
  }
  if (scope === "all" || scope === "quran") for (const ayah of input.quran) {
    const value = quranRef ? ayah.surah === Number(normalizeBookSearch(quranRef[1])) && ayah.ayah >= Number(normalizeBookSearch(quranRef[2])) && ayah.ayah <= Math.min(Number(normalizeBookSearch(quranRef[3] ?? quranRef[2])), Number(normalizeBookSearch(quranRef[2])) + 7) ? 100 : 0 : reference ? 0 : score(ayah.text);
    if (value) candidates.push({ score: value, section: `quran:${ayah.surah}:${ayah.ayah}`, passage: { id: `quran:${input.quranSha256}:${ayah.surah}:${ayah.ayah}`, collection: "quran", language: "ar", referenceUr: `قرآن، ${ayah.surah}:${ayah.ayah}`, referenceEn: `Quran, ${ayah.surah}:${ayah.ayah}`, text: ayah.text, sourceSha256: input.quranSha256, quranLocation: { surah: ayah.surah, ayah: ayah.ayah }, translator: null, ...(ayah.suppliedTranslation ? { suppliedTranslation: ayah.suppliedTranslation } : {}) } });
  }
  candidates.sort((a, b) => b.score - a.score || (quranRef && a.passage.quranLocation && b.passage.quranLocation ? a.passage.quranLocation.ayah - b.passage.quranLocation.ayah : a.passage.id.localeCompare(b.passage.id, undefined, { numeric: true })));
  // Rerank for source coverage without letting unrelated low-scoring passages in.
  const eligible = candidates.filter(c => c.score >= (candidates[0]?.score ?? 0) * .55);
  const chosen: typeof candidates = [];
  const sections = new Set<string>();
  const limit = Math.min(16, Math.max(1, input.candidateLimit ?? 8));
  const add = (c: typeof candidates[number]) => { if (!sections.has(c.section) && chosen.length < limit) { chosen.push(c); sections.add(c.section); } };
  for (const collection of ["quran", "nahj", "sahifa", "kafi"]) for (const lang of ["ar", locale]) {
    const first = eligible.find(c => c.passage.collection === collection && c.passage.language === lang);
    if (first) add(first);
  }
  eligible.forEach(add);
  return { ...base, status: chosen.length ? "evidence" : "not-found", passages: chosen.map(c => c.passage) };
}

/** Provider-neutral answer contract. A model may only cite retrieved, exact source text. */
export type CitedClaim = { text: string; citations: { passageId: string; quote: string }[] };
export type KnowledgeAnswerProvider = { generate(question: string, evidence: readonly KnowledgePassage[]): Promise<CitedClaim[]> };
export function verifyKnowledgeClaims(claims: readonly CitedClaim[], passages: readonly KnowledgePassage[]): boolean {
  return claims.length > 0 && claims.every(claim => claim.text.trim().length > 0 && claim.citations.length > 0 && claim.citations.every(c => c.quote.trim().length > 0 && passages.some(p => p.id === c.passageId && p.text.includes(c.quote))));
}
export function knowledgeResultText(result: KnowledgeResult, locale: "ur" | "en") {
  return [result.question, ...(result.contextQuestion ? [`${locale === "ur" ? "پچھلا سوال" : "Previous question"}: ${result.contextQuestion}`] : []), researchSummaryText(result.research, result.passages, locale), locale === "ur" ? "متعلقہ اصل عبارتیں — یہ تحقیقی خلاصہ یا فتویٰ نہیں" : "Related source passages — not a synthesized answer or fatwa", ...result.passages.map(p => [locale === "ur" ? p.referenceUr : p.referenceEn, p.language === "ar" ? locale === "ur" ? "اصل عربی عبارت" : "Arabic source text" : locale === "ur" ? "فراہم کردہ ترجمہ / حواشی" : "Supplied translation / commentary", p.text, ...(p.suppliedTranslation ? [`${locale === "ur" ? "فراہم کردہ ترجمہ" : "Supplied translation"} — ${p.suppliedTranslation.translator}`, p.suppliedTranslation.text] : []), p.translator ? `${locale === "ur" ? "مترجم" : "Translator"}: ${p.translator}` : ""].filter(Boolean).join("\n"))].join("\n\n");
}

/** Follow-ups retrieve both questions independently, so a new exact reference is never shadowed. */
export function retrieveKnowledgeWithContext(input: Parameters<typeof retrieveKnowledge>[0] & { contextQuestion?: string }): KnowledgeResult {
  const current = retrieveKnowledge(input);
  if (!input.contextQuestion || current.status === "unsupported-fatwa") return current;
  const previous = retrieveKnowledge({ ...input, question: input.contextQuestion, inferredTopicIds: undefined });
  if (previous.status === "unsupported-fatwa") return { ...current, contextQuestion: input.contextQuestion, status: "unsupported-fatwa", passages: [] };
  const passages: KnowledgePassage[] = [];
  const ids = new Set<string>();
  for (let index = 0; index < Math.max(current.passages.length, previous.passages.length); index++) {
    for (const p of [current.passages[index], previous.passages[index]]) if (p && !ids.has(p.id) && passages.length < Math.min(16, input.candidateLimit ?? 8)) { ids.add(p.id); passages.push(p); }
  }
  return { ...current, contextQuestion: input.contextQuestion, status: passages.length ? "evidence" : "not-found", passages, expandedTerms: [...new Set([...current.expandedTerms, ...previous.expandedTerms])], availableCollections: [...new Set([...current.availableCollections, ...previous.availableCollections])], searchTopics: [...new Map([...(current.searchTopics ?? []), ...(previous.searchTopics ?? [])].map(t => [t.id, t])).values()] };
}
