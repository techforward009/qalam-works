import type { MajlisSeriesPlan, MajlisSeriesSession } from './seriesPlanner';
import type { MajlisSessionWorkbench } from './sessionWorkbench';
import type { SermonDuration } from './sermonPrep';
import { buildSessionWorkbenchText } from './sessionWorkbench';
import { ahmedgrafQuranReference } from '../../arabic-diacritics/quran/ahmedgrafProvider';
import { quranTranslationFor, QURAN_TRANSLATION_SOURCES } from './quranTranslationProvider';
import { verifiedHadithForDossierText } from './verifiedHadithCorpus';
export type SeriesBilingual = { ur: string; en: string };
export type PreparedSessionMaterial = {
 blocks: readonly { heading: SeriesBilingual; delivery: SeriesBilingual; explanation: SeriesBilingual }[];
 quran: readonly {surah: number; ayah: number}[];
 hadithId?: string;
 question: SeriesBilingual; example: SeriesBilingual; action: SeriesBilingual;
};
export function preparedSourceLines(preparation: PreparedSessionMaterial, locale: 'ur'|'en') {
 const ur=locale==='ur';const lines: string[]=[];
 for(const {surah,ayah} of preparation.quran) {
  const arabic=ahmedgrafQuranReference.getAyah(surah,ayah)?.text;
  const translation=quranTranslationFor(surah,ayah,locale);
  if(!arabic || !translation)throw Error(`Missing prepared series verse ${surah}:${ayah}`);
  lines.push(`${ur?'اصل قرآنی آیت':'Qur’anic source verse'} — ${surah}:${ayah}`,arabic,translation,QURAN_TRANSLATION_SOURCES[locale][ur?'sourceLabelUr':'sourceLabelEn']);
 }
 if(preparation.hadithId) {
  const hadith=verifiedHadithForDossierText(preparation.hadithId);
  if(!hadith?.exactArabic)throw Error('Missing verified series hadith');
  lines.push(ur?hadith.attributedToUr:hadith.attributedToEn,hadith.exactArabic, (ur?hadith.translationUr:hadith.translationEn)??'', (ur?hadith.translationSourceLabelUr:hadith.translationSourceLabelEn)??'', (ur?hadith.verifiedReferenceUr:hadith.verifiedReferenceEn)!,hadith.verifiedSourceUrl??hadith.sourceUrl);
 }
 return lines;
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
