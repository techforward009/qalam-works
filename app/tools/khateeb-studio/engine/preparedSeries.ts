import type { MajlisSeriesPlan, MajlisSeriesSession } from './seriesPlanner';
import type { SourcedMasaib } from './ghaflahMasaib';
import type { MajlisSessionWorkbench } from './sessionWorkbench';
import type { SermonDuration } from './sermonPrep';
import { buildSessionWorkbenchText } from './sessionWorkbench';
import { ahmedgrafQuranReference } from '../../arabic-diacritics/quran/ahmedgrafProvider';
import { quranTranslationFor, QURAN_TRANSLATION_SOURCES } from './quranTranslationProvider';
import { verifiedHadithForDossierText } from './verifiedHadithCorpus';
export type SeriesBilingual = { ur: string; en: string };
export type PreparedQuranGroup = { heading: SeriesBilingual; locations: readonly { surah: number; ayah: number }[] };
export type PreparedPrimaryExcerpt = { arabic: string; translation: SeriesBilingual; reference: SeriesBilingual; attribution: SeriesBilingual; sourceUrl: string };
export type PreparedSessionMaterial = {
 blocks: readonly { heading: SeriesBilingual; delivery: SeriesBilingual; explanation: SeriesBilingual }[];
 quran: readonly {surah: number; ayah: number}[];
 quranGroups?: readonly PreparedQuranGroup[];
 primaryExcerpts?: readonly PreparedPrimaryExcerpt[];
 hadithId?: string;
 masaib?: SourcedMasaib;
 durationExtra?: {extra30:readonly SeriesBilingual[];extra45:readonly SeriesBilingual[]};
 additionalHadithIds?: readonly string[];
 scholarSources?: readonly { label: SeriesBilingual; url: string }[];
 scholarlyExcerpts?: readonly {scholar:SeriesBilingual;original:string;originalLanguage:"fa"|"en";translation:SeriesBilingual;sourceUrl:string;sourceKind:string;sourceNote:SeriesBilingual}[];
 question: SeriesBilingual; example: SeriesBilingual; action: SeriesBilingual;
};
export function preparedSourceLines(preparation: PreparedSessionMaterial, locale: 'ur'|'en') {
 const ur=locale==='ur';const lines: string[]=[];
 const used = new Set<string>();
 for (const location of preparation.quran) {
  const key = `${location.surah}:${location.ayah}`;
  if (used.has(key)) continue;
  const group = preparation.quranGroups?.find(item => item.locations.some(verse => verse.surah === location.surah && verse.ayah === location.ayah));
  const locations = group?.locations ?? [location];
  const verses = locations.map(({surah, ayah}) => {
   const arabic = ahmedgrafQuranReference.getAyah(surah, ayah)?.text;
   const translation = quranTranslationFor(surah, ayah, locale);
   if (!arabic || !translation) throw Error(`Missing prepared series verse ${surah}:${ayah}`);
   used.add(`${surah}:${ayah}`);
   return {arabic, translation};
  });
  const reference = locations.map(({surah, ayah}) => `${surah}:${ayah}`).join(', ');
  lines.push(group ? `${group.heading[locale]} — ${reference}` : `${ur?'اصل قرآنی آیت':'Qur’anic source verse'} — ${reference}`, verses.map(verse => verse.arabic).join(' '), verses.map(verse => verse.translation).join(' '), QURAN_TRANSLATION_SOURCES[locale][ur?'sourceLabelUr':'sourceLabelEn']);
 }
 for(const voice of preparation.scholarlyExcerpts??[]){
  lines.push(voice.scholar[locale],voice.original,voice.translation[locale],voice.sourceNote[locale],voice.sourceUrl);
 }
 for (const excerpt of preparation.primaryExcerpts ?? []) {
  lines.push(excerpt.attribution[locale], excerpt.reference[locale], excerpt.arabic, excerpt.translation[locale], ur?'قلم ورکس — اصل عربی سے تدوینی ترجمہ':'Qalam Works — editorial translation from the Arabic', excerpt.sourceUrl);
 }
 for (const hadithId of [preparation.hadithId, ...(preparation.additionalHadithIds ?? [])]) {
  if (!hadithId) continue;
  const hadith=verifiedHadithForDossierText(hadithId);
  if (!hadith?.exactArabic)throw Error(`Missing verified series hadith ${hadithId}`);
  lines.push(ur?hadith.attributedToUr:hadith.attributedToEn,hadith.exactArabic, (ur?hadith.translationUr:hadith.translationEn)??'', (ur?hadith.translationSourceLabelUr:hadith.translationSourceLabelEn)??'', (ur?hadith.verifiedReferenceUr:hadith.verifiedReferenceEn)!,hadith.verifiedSourceUrl??hadith.sourceUrl);
 }
 return lines;
}
export function preparedQuranSourceTexts(preparation: PreparedSessionMaterial): Set<string | undefined> {
 const texts = new Set(preparation.quran.map(({surah, ayah}) => ahmedgrafQuranReference.getAyah(surah, ayah)?.text));
 for (const group of preparation.quranGroups ?? []) texts.add(group.locations.map(({surah, ayah}) => ahmedgrafQuranReference.getAyah(surah, ayah)?.text).join(' '));
 return texts;
}
export function preparedArabicSourceTexts(preparation: PreparedSessionMaterial): Set<string | undefined> {
 const texts = preparedQuranSourceTexts(preparation);
 for (const excerpt of preparation.primaryExcerpts ?? []) texts.add(excerpt.arabic);
 for (const hadithId of [preparation.hadithId, ...(preparation.additionalHadithIds ?? [])]) {
  if (hadithId) texts.add(verifiedHadithForDossierText(hadithId)?.exactArabic);
 }
 return texts;
}
export function buildPreparedSessionWorkbench(session: MajlisSeriesSession, duration: SermonDuration): MajlisSessionWorkbench {
 const p=session.preparation!;
 const minutes=duration===20?[3,4,5,5,3]:duration===30?[4,6,8,8,4]:[5,10,12,12,6];
 const body=(index: number,locale:'ur'|'en')=>[
  ...(index===0 && session.previousBridgeUr?[locale==='ur'?session.previousBridgeUr:session.previousBridgeEn!]:[]),
  ...(index===1?preparedSourceLines(p,locale):[]),
  ...(index===1?(p.scholarSources ?? []).flatMap(source => [source.label[locale], source.url]):[]),
  locale==='ur'?'قابلِ بیان عبارت — قلم ورکس کی تدوین':'Ready-to-deliver paragraph — Qalam Works editorial material',p.blocks[index].delivery[locale],
  locale==='ur'?'وضاحت اور ربط — قلم ورکس کی تدوین':'Explanation and connection — Qalam Works editorial material',p.blocks[index].explanation[locale],

  ...(index===2 && duration>=30 ? (p.durationExtra?.extra30??[]).map(row=>row[locale]) : []),
  ...(index===3 && duration===45 ? (p.durationExtra?.extra45??[]).map(row=>row[locale]) : []),
  ...(index===3?[`${locale==='ur'?'فرضی روزمرہ مثال':'Hypothetical everyday example'}: ${p.example[locale]}`]:[]),
  ...(index===4 && p.masaib ? [
   locale==='ur'?'مصائبِ اہلِ بیتؑ — تاریخی واقعے کا محتاط خلاصہ (اصل عربی کی مستقل تصدیق ابھی باقی)':'Masaib — careful summary of a translated historical account (original Arabic not independently collated)',
   p.masaib.title[locale],
   p.masaib.history[locale],
   locale==='ur'?'تدوینی منبری ربط، تاریخ کے لفظی اقتباس کے طور پر پیش نہ کریں':'Editorial pulpit transition, not a direct historical quotation',
   p.masaib.editorialReflection[locale],
   p.masaib.source[locale],
   p.masaib.sourceUrl,
  ] : []),
  ...(index===4?[`${locale==='ur'?'عملی قدم':'Practical step'}: ${p.action[locale]}`]:[]),
 ];
 return {
  titleUr:`مجلس ${session.number} — ${session.titleUr}`,titleEn:`Session ${session.number} — ${session.titleEn}`,duration,
  openingUr:p.blocks[0].delivery.ur,openingEn:p.blocks[0].delivery.en,centralUr:session.purposeUr,centralEn:session.purposeEn,
  blocks:p.blocks.map((block,index)=>({minutes:minutes[index],headingUr:block.heading.ur,headingEn:block.heading.en,bodyUr:body(index,'ur'),bodyEn:body(index,'en')})),
  audienceQuestionUr:p.question.ur,audienceQuestionEn:p.question.en,ownExampleUr:p.example.ur,ownExampleEn:p.example.en,
  voiceGuardUr:session.avoidRepeatUr!,voiceGuardEn:session.avoidRepeatEn!,closingUr:p.blocks[4].delivery.ur,closingEn:p.blocks[4].delivery.en,nextUr:session.nextBridgeUr,nextEn:session.nextBridgeEn,
 };
}
export function buildPreparedSeriesText(plan: MajlisSeriesPlan,locale:'ur'|'en',duration:SermonDuration) {
 const ur=locale==='ur';return [ur?plan.titleUr:plan.titleEn,ur?plan.aimUr:plan.aimEn,ur?'ہر مجلس کی مجوزہ مدت؛ اصل آیات، تراجم اور تدوینی عبارتیں الگ درج ہیں۔':'Suggested duration per session; source texts, translations, and editorial material are identified separately.',...plan.sessions.map(session=>buildSessionWorkbenchText(buildPreparedSessionWorkbench(session,duration),locale)),ur?plan.finalUr:plan.finalEn].join('\n\n');
}

/** Counts deliverable speech, not URLs, editorial instructions, or citation labels. */
export function estimatePreparedSpeech(preparation: PreparedSessionMaterial, locale:'ur'|'en', duration:SermonDuration=20) {
 const count=(s:string)=>s.trim().split(/\s+/u).filter(Boolean).length;
 const prose=preparation.blocks.reduce((sum,b)=>sum+count(b.delivery[locale]),0);
 const masaib=preparation.masaib ? count(preparation.masaib.history[locale])+count(preparation.masaib.editorialReflection[locale]) : 0;
 const expansions=(duration>=30 ? (preparation.durationExtra?.extra30??[]).reduce((sum,row)=>sum+count(row[locale]),0) : 0)
  +(duration===45 ? (preparation.durationExtra?.extra45??[]).reduce((sum,row)=>sum+count(row[locale]),0) : 0);
 const verses=preparation.quran.reduce((sum,{surah,ayah})=>{
   const arabic=ahmedgrafQuranReference.getAyah(surah,ayah)?.text??'';
   const translation=quranTranslationFor(surah,ayah,locale)??'';
   return sum+count(arabic)+count(translation);
 },0);
 const hadiths=[preparation.hadithId,...(preparation.additionalHadithIds??[])].reduce((sum,id)=>{
   if(!id)return sum;
   const row=verifiedHadithForDossierText(id);
   return sum+count(row?.exactArabic??'')+count((locale==='ur'?row?.translationUr:row?.translationEn)??'');
 },0);
 const words=prose+masaib+verses+hadiths+expansions;
 // Conservative *planning* band, never an empirically measured delivery duration.
 const low=Math.max(1,Math.floor(words/(locale==='ur'?110:145)));
 const high=Math.max(low,Math.ceil(words/(locale==='ur'?75:105)));
 return {words, lowMinutes:low, highMinutes:high, categories:{prose,masaib,verses,hadiths,expansions}};
}
