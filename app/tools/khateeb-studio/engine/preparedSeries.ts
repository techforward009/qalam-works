import type { MajlisSeriesPlan, MajlisSeriesSession } from './seriesPlanner';
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
 for (const excerpt of preparation.primaryExcerpts ?? []) {
  lines.push(excerpt.attribution[locale], excerpt.reference[locale], excerpt.arabic, excerpt.translation[locale], ur?'قلم ورکس — اصل عربی سے تدوینی ترجمہ':'Qalam Works — editorial translation from the Arabic', excerpt.sourceUrl);
 }
 if(preparation.hadithId) {
  const hadith=verifiedHadithForDossierText(preparation.hadithId);
  if(!hadith?.exactArabic)throw Error('Missing verified series hadith');
  lines.push(ur?hadith.attributedToUr:hadith.attributedToEn,hadith.exactArabic, (ur?hadith.translationUr:hadith.translationEn)??'', (ur?hadith.translationSourceLabelUr:hadith.translationSourceLabelEn)??'', (ur?hadith.verifiedReferenceUr:hadith.verifiedReferenceEn)!,hadith.verifiedSourceUrl??hadith.sourceUrl);
 }
 return lines;
}
export function preparedArabicSourceTexts(preparation: PreparedSessionMaterial): Set<string | undefined> {
 const texts = new Set(preparation.quran.map(({surah, ayah}) => ahmedgrafQuranReference.getAyah(surah, ayah)?.text));
 for (const group of preparation.quranGroups ?? []) texts.add(group.locations.map(({surah, ayah}) => ahmedgrafQuranReference.getAyah(surah, ayah)?.text).join(' '));
 for (const excerpt of preparation.primaryExcerpts ?? []) texts.add(excerpt.arabic);
 if (preparation.hadithId) texts.add(verifiedHadithForDossierText(preparation.hadithId)?.exactArabic);
 return texts;
}
export function buildPreparedSessionWorkbench(session: MajlisSeriesSession, duration: SermonDuration): MajlisSessionWorkbench {
 const p=session.preparation!;
 const minutes=duration===20?[3,4,5,5,3]:duration===30?[4,6,8,8,4]:[5,10,12,12,6];
 const body=(index: number,locale:'ur'|'en')=>[
  ...(index===0 && session.previousBridgeUr?[locale==='ur'?session.previousBridgeUr:session.previousBridgeEn!]:[]),
  ...(index===1?preparedSourceLines(p,locale):[]),
  locale==='ur'?'قابلِ بیان عبارت — قلم ورکس کی تدوین':'Ready-to-deliver paragraph — Qalam Works editorial material',p.blocks[index].delivery[locale],
  locale==='ur'?'وضاحت اور ربط — قلم ورکس کی تدوین':'Explanation and connection — Qalam Works editorial material',p.blocks[index].explanation[locale],
  ...(index===3?[`${locale==='ur'?'فرضی روزمرہ مثال':'Hypothetical everyday example'}: ${p.example[locale]}`]:[]),
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
