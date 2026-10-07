import { rankLexicalDocuments } from "./lexicalRanking";
import { researchSummaryText, type KnowledgeResearchAnswer } from "./researchAnswer";
import { bookRecordReference, bookRecordNumber, createBookExcerpt, normalizeBookSearch, type BookExcerpt, type BookRecord, type BookSource } from "./bookCorpus";

export type KnowledgeScope = "all" | "quran" | "nahj" | "sahifa";
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
  expandedTerms: string[]; availableCollections: string[];
};
export type QuranInput = { surah: number; ayah: number; text: string; suppliedTranslation?: KnowledgePassage["suppliedTranslation"] };
const concepts = [
  ["صبر", "patience", "patient", "الصبر", "الصابرين", "صابر"],
  ["دعا", "دعاء", "prayer", "supplication", "ادع", "دعوت"],
  ["توبہ", "توبه", "repentance", "repent", "استغفار", "توب", "اغفر"],
  ["موت", "death", "die", "الموت", "اموات"],
  ["آخرت", "اخره", "hereafter", "قيامه", "القيامه", "الاخره"],
  ["عدل", "justice", "انصاف", "العدل"],
  ["امید", "اميد", "hope", "رجاء", "يرجو"],
  ["شکر", "شكر", "gratitude", "grateful", "شكور", "تشكرون"],
  ["تقوی", "تقوي", "piety", "متقين", "تقوا", "اتقوا"],
  ["ایمان", "ايمان", "faith", "belief", "مومن", "مؤمن", "امنوا"],
  ["صدقہ", "صدقه", "charity", "انفاق", "صدقات", "ينفقون"],
  ["معافی", "معافي", "forgiveness", "forgive", "عفو", "صفح"],
  ["اخلاص", "sincerity", "مخلص", "مخلصين"],
  ["علم", "knowledge", "learning", "education", "تعليم", "يعلمون"],
  ["غصہ", "غصه", "anger", "غضب", "غيظ", "الغضب"],
  ["والدین", "والدين", "parents", "والدي", "والد", "والده", "الوالدين", "والديك", "الوالد", "الوالده", "ابويه"],
  ["تربیت", "تربيه", "تربية", "upbringing", "parenting"],
  ["اولاد", "بچے", "بچوں", "child", "children", "الولد", "الاولاد", "البنين", "البنات"],
].map(group => [...new Set(group.map(normalizeBookSearch))]);
const stop = new Set(normalizeBookSearch("کے کی کا کو سے میں پر اور ہے ہیں تھا کیا کیسے بارے متعلق بتائیں نے ایک ہمیں کس وہ یہ اپنے اپنی اس ان فرماتے فرمایا تعلیمات قرآن قران نہج البلاغہ صحیفہ سجادیہ امام علی اللہ مجھے واضح وضاحت عملی روزمرہ مثال مثالیں زندگی اطلاق تعلق ربط موازنہ تقابل اسی موضوع مزید خلاصہ چاہتا چاہتی چاہیے كريں تطبيق کریں the a an of in on about what how does did say said tell me and or is are to from please explain practical everyday daily life examples example application compare comparison relationship connection this topic further summarize summary source sources passages passage discuss material available books book related provide show quran nahj balagha sahifa sajjadiyya teachings").split(" "));

export function queryTerms(question: string): { direct: string[]; groups: string[][] } {
  const direct = [...new Set(normalizeBookSearch(question).split(" ").filter(t => t.length > 1 && !stop.has(t) && !/^\d+$/.test(t)))].slice(0, 24);
  const groups = direct.map(term => concepts.find(g => g.includes(term)) ?? [term]);
  return { direct, groups };
}
function explicitReference(question: string) {
  const q = normalizeBookSearch(question);
  const match = q.match(/(?:حكمت|حکمت|saying|sermon|خطبہ|خطبه|letter|مكتوب|دعا|supplication)\s+(\d+)/u);
  if (!match) return null;
  const kind = /saying|حكمت|حکمت/u.test(match[0]) ? "saying" : /sermon|خطب/u.test(match[0]) ? "sermon" : /letter|مكتوب/u.test(match[0]) ? "letter" : "supplication";
  return { kind, number: Number(match[1]) };
}
export function retrieveKnowledge(input: { question: string; scope: KnowledgeScope; locale: "ur" | "en"; records: readonly BookRecord[]; sources: readonly BookSource[]; quran: readonly QuranInput[]; quranSha256: string }): KnowledgeResult {
  const { question, scope, locale } = input;
  const { direct, groups } = queryTerms(question);
  const base = { question, method: "lexical-bm25-topic-expansion" as const, expandedTerms: [...new Set(groups.flat())], availableCollections: [...new Set([...(input.quran.length ? ["quran"] : []), ...input.sources.map(s => s.book)])] };
  if (/(?:فتوي|فتوا|fatwa|مرجع|مراجع|marja)/iu.test(normalizeBookSearch(question))) return { ...base, status: "unsupported-fatwa", passages: [] };
  const reference = explicitReference(question);
  const quoted = question.match(/["“«]([^"”»]+)["”»]/u)?.[1];
  const exact = quoted ? normalizeBookSearch(quoted) : null;
  const quranRef = question.match(/([0-9۰-۹٠-٩]{1,3})\s*[:：]\s*([0-9۰-۹٠-٩]{1,3})(?:\s*[–—-]\s*([0-9۰-۹٠-٩]{1,3}))?/u);
  const eligibleRecords = input.records.filter(record => (scope === "all" || record.book === scope) && (record.language === "ar" || record.language === locale));
  const lexicalDocuments = [...eligibleRecords.flatMap(record => record.paragraphs.map(p => ({ text: p.text, heading: record.title }))), ...((scope === "all" || scope === "quran") ? input.quran.map(a => ({ text: a.text })) : [])];
  const lexicalScores = !exact && !reference && !quranRef ? rankLexicalDocuments(lexicalDocuments, groups, direct) : [];
  const rankedScores = new Map<string, number>();
  lexicalDocuments.forEach((doc, i) => { if ((lexicalScores[i] ?? 0) > (rankedScores.get(doc.text) ?? 0)) rankedScores.set(doc.text, lexicalScores[i]); });
  const candidates: { passage: KnowledgePassage; score: number; section: string }[] = [];
  function score(text: string, heading = "") {
    const body = normalizeBookSearch(text);
    if (exact) return body.includes(exact) ? 100 : 0;
    void heading;
    return rankedScores.get(text) ?? 0;
  }
  for (const record of input.records) {
    if (scope !== "all" && record.book !== scope || record.language !== "ar" && record.language !== locale) continue;
    const source = input.sources.find(s => s.id === record.sourceId && s.book === record.book && s.language === record.language);
    if (!source || reference && (record.kind !== reference.kind || bookRecordNumber(record) !== reference.number)) continue;
    record.paragraphs.forEach((paragraph, index) => {
      if (index === 0 && paragraph.text.length < 150 && record.paragraphs.length > 1 && /^\s*[(（][0-9۰-۹٠-٩]+[)）]/u.test(paragraph.text)) return;
      // Preserve the full paragraph within the existing portable excerpt limit.
      if (paragraph.text.length > 150_000 || paragraph.text.trim().length < 15) return;
      const value = reference ? 100 + score(paragraph.text) : score(paragraph.text, record.title);
      if (!value) return;
      const excerpt = createBookExcerpt(record, source, [paragraph.id]);
      candidates.push({ score: value, section: `${record.book}:${record.kind}:${bookRecordNumber(record) ?? record.id}:${record.language}`, passage: { id: excerpt.id, collection: record.book, language: record.language, referenceUr: bookRecordReference(record, "ur"), referenceEn: bookRecordReference(record, "en"), text: paragraph.text, sourceSha256: source.sha256, recordId: record.id, sourceId: source.id, paragraphId: paragraph.id, excerpt, translator: source.translator } });
    });
  }
  if (scope === "all" || scope === "quran") for (const ayah of input.quran) {
    const value = quranRef ? ayah.surah === Number(normalizeBookSearch(quranRef[1])) && ayah.ayah >= Number(normalizeBookSearch(quranRef[2])) && ayah.ayah <= Math.min(Number(normalizeBookSearch(quranRef[3] ?? quranRef[2])), Number(normalizeBookSearch(quranRef[2])) + 7) ? 100 : 0 : reference ? 0 : score(ayah.text);
    if (value) candidates.push({ score: value, section: `quran:${ayah.surah}:${ayah.ayah}`, passage: { id: `quran:${input.quranSha256}:${ayah.surah}:${ayah.ayah}`, collection: "quran", language: "ar", referenceUr: `قرآن، ${ayah.surah}:${ayah.ayah}`, referenceEn: `Quran, ${ayah.surah}:${ayah.ayah}`, text: ayah.text, sourceSha256: input.quranSha256, quranLocation: { surah: ayah.surah, ayah: ayah.ayah }, translator: null, ...(ayah.suppliedTranslation ? { suppliedTranslation: ayah.suppliedTranslation } : {}) } });
  }
  candidates.sort((a, b) => b.score - a.score || (quranRef && a.passage.quranLocation && b.passage.quranLocation ? a.passage.quranLocation.ayah - b.passage.quranLocation.ayah : a.passage.id.localeCompare(b.passage.id)));
  // Rerank for source coverage without letting unrelated low-scoring passages in.
  const eligible = candidates.filter(c => c.score >= (candidates[0]?.score ?? 0) * .55);
  const chosen: typeof candidates = [];
  const sections = new Set<string>();
  const add = (c: typeof candidates[number]) => { if (!sections.has(c.section) && chosen.length < 8) { chosen.push(c); sections.add(c.section); } };
  for (const collection of ["quran", "nahj", "sahifa"]) for (const lang of ["ar", locale]) {
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
  const previous = retrieveKnowledge({ ...input, question: input.contextQuestion });
  if (previous.status === "unsupported-fatwa") return { ...current, contextQuestion: input.contextQuestion, status: "unsupported-fatwa", passages: [] };
  const passages: KnowledgePassage[] = [];
  const ids = new Set<string>();
  for (let index = 0; index < Math.max(current.passages.length, previous.passages.length); index++) {
    for (const p of [current.passages[index], previous.passages[index]]) if (p && !ids.has(p.id) && passages.length < 8) { ids.add(p.id); passages.push(p); }
  }
  return { ...current, contextQuestion: input.contextQuestion, status: passages.length ? "evidence" : "not-found", passages, expandedTerms: [...new Set([...current.expandedTerms, ...previous.expandedTerms])], availableCollections: [...new Set([...current.availableCollections, ...previous.availableCollections])] };
}
