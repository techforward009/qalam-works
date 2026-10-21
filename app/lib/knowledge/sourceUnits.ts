import type { BookRecord } from './bookCorpus';
import { kafiHadithNumber, normalizeBookSearch, cleanBookTitle, bookSearchableParagraphs } from './bookCorpus';
export type BookSearchUnit = { paragraph: BookRecord['paragraphs'][number]; paragraphs: BookRecord['paragraphs']; text: string };
/** A numbered narration and its continuation are one source unit in every search mode. */
export function bookSearchUnits(record: BookRecord): BookSearchUnit[] {
 if (record.book === "nahj" && record.kind === "saying") {
  // The translator's first parenthesized number is the printed saying
  // reference; subsequent paragraphs may be a single continuous saying.
  // Combine them for faithful, complete quotation; never join notes.
  const body = record.paragraphs.filter((p, index) => !isBookLocator(record, { paragraph: p, paragraphs: [p], text: p.text }, index));
  return body.length ? [{ paragraph: body[0], paragraphs: body, text: body.map(p => p.text).join("\n") }] : [];
 }
 if (record.book === "sahifa" && record.language === "ur") {
  // The supplied Urdu edition of prayer 24 appends the translator's
  // editorial explanation and an embedded Quran quotation AFTER the prayer.
  // Detect the verified boundary without modifying or shortening prayer text.
  const prayerBody = bookSearchableParagraphs(record);
  return prayerBody.map(p => ({ paragraph: p, paragraphs: [p], text: p.text }));
 }
 if(record.book!=='kafi')return record.paragraphs.map(p=>({paragraph:p,paragraphs:[p],text:p.text}));
 const headings=new Set([record.reference.kafi?.bookTitle,record.reference.kafi?.chapterTitle,record.reference.kafi?.sectionTitle]);
 const result:BookSearchUnit[]=[];let current:BookSearchUnit|null=null;
 for(const p of record.paragraphs){
  const contents=(p.text.match(/\//g)?.length??0)>=2&&/^\d+\s+باب\s+.+\s+\d+$/u.test(normalizeBookSearch(p.text));
  if(headings.has(p.text)||contents){current=null;continue;}
  if(kafiHadithNumber(p.text)!==null){current={paragraph:p,paragraphs:[p],text:p.text};result.push(current);}
  else if(current){current.paragraphs.push(p);current.text+='\n'+p.text;}
  else result.push({paragraph:p,paragraphs:[p],text:p.text});
 }
 return result;
}

/** Known printed prayer preambles identify the occasion, not the prayer body. */
export function isBookLocator(record: BookRecord, unit: BookSearchUnit, index: number): boolean {
 const text = unit.text.trim();
 const normalized = normalizeBookSearch(text);
 if (!normalized || text.length < 5) return true;
 // Translator's notes are metadata, not sayings, sermons or prayers.
 if (/^(?:[0-9۰-۹٠-٩]+؂|\[[0-9۰-۹٠-٩]+\](?:[۔.]|\s)|[؂٭]+|[–—-]*[٭*]{2,})/u.test(text)) return true;
 if (record.paragraphs.length > 1 && index === 0 && text.length < 150 && /^[(（][0-9۰-۹٠-٩]+[)）]/u.test(text)) return true;
 if (record.paragraphs.length > 1 && text.length < 140 &&
     normalized === normalizeBookSearch(cleanBookTitle(record.title))) return true;
 if (record.book === "sahifa") {
   // Prayer 24 and other supplications have source headings before actual prayer.
   if (index === 0 && text.length < 180 &&
       (record.language === "ur" && /(?:دعا|حضرت)/u.test(normalized) ||
        record.language === "ar" && /(?:دعائ|دعاء|من دعا|كان من)/u.test(normalized))) return true;
   if (record.language === "ar" && index < 3 && text.length < 100 &&
       /(?:ابويه|عليهما السلام|لربه|لدعائه)/u.test(normalized) &&
       !/(?:اللهم|ربي|يا رب)/u.test(normalized)) return true;
   if (record.language === "ar" && index < 2 && /^(?:في |اذا |و كان |وكان )/u.test(normalized)) return true;
   // A quoted Quranic passage inside an editor's explanation must never
   // be presented as though it were the translator's rendering of this dua.
   if (record.language === "ur" && /^[﴿«]/u.test(text) &&
       /[﴾۝]/u.test(text)) return true;
   // Clearly labelled editorial interpretation in a translated prayer is not
   // a supplication; display it only in the book reader in its own context.
   if (record.language === "ur" && /^(?:اس آیت میں|اس دعا میں|خداوند عالم کے عظیم احسانات|مترجم کا حاشیہ|شرح|تشریح)/u.test(normalized)) return true;
 }
 return false;
}
