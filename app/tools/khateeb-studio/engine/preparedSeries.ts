import type { MajlisSeriesPlan, MajlisSeriesSession } from './seriesPlanner';
import type { SourcedMasaib } from './ghaflahMasaib';
import type { MajlisSessionWorkbench } from './sessionWorkbench';
import type { SermonDuration } from './sermonPrep';
import { buildSessionWorkbenchText } from './sessionWorkbench';
import { publicDigitalKhattQuranReference } from '../../arabic-diacritics/quran/publicDigitalKhattProvider';
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
 speakerReady?: boolean;
 masaib?: SourcedMasaib;
 durationExtra?: {extra30:readonly SeriesBilingual[];extra45:readonly SeriesBilingual[]};
 additionalHadithIds?: readonly string[];
 scholarSources?: readonly { label: SeriesBilingual; url: string }[];
 scholarlyExcerpts?: readonly {scholar:SeriesBilingual;original:string;originalLanguage:"fa"|"en";work:SeriesBilingual;perspective:SeriesBilingual;translation:SeriesBilingual;sourceUrl:string;sourceKind:string;sourceNote:SeriesBilingual}[];
 question: SeriesBilingual; example: SeriesBilingual; action: SeriesBilingual;
};
/** On-reader and copy-ready primary texts. URLs remain internal for editorial audits only. */
export function preparedSourceLines(preparation: PreparedSessionMaterial, locale: 'ur'|'en') {
 const ur=locale==='ur';const lines:string[]=[];const used=new Set<string>();
 for(const location of preparation.quran){
  const key=`${location.surah}:${location.ayah}`; if(used.has(key))continue;
  const group=preparation.quranGroups?.find(g=>g.locations.some(loc=>loc.surah===location.surah&&loc.ayah===location.ayah));
  const locations=group?.locations??[location];
  const verses=locations.map(({surah,ayah})=>{
   const ref=`${surah}:${ayah}`, arabic=publicDigitalKhattQuranReference.getAyah(surah,ayah)?.text;
   const translation=quranTranslationFor(surah,ayah,locale);
   if(!arabic||!translation)throw Error(`Missing prepared series verse ${ref}`);
   used.add(ref);return {ref,arabic,translation};
  });
  lines.push(`${group?group.heading[locale]:(ur?'قرآن مجید':'Holy Qur’an')} — ${verses.map(v=>v.ref).join('، ')}`,
   verses.map(v=>v.arabic).join(' '),verses.map(v=>v.translation).join(' '),
   QURAN_TRANSLATION_SOURCES[locale][ur?'sourceLabelUr':'sourceLabelEn']);
 }
 for(const row of preparation.primaryExcerpts??[]){
  lines.push(row.attribution[locale],row.arabic,row.translation[locale],row.reference[locale]);
 }
 for(const id of [preparation.hadithId,...(preparation.additionalHadithIds??[])]){
  if(!id)continue;
  const hadith=verifiedHadithForDossierText(id);
  if(!hadith?.exactArabic)throw Error(`Missing verified series hadith ${id}`);
  lines.push(ur?hadith.attributedToUr:hadith.attributedToEn,hadith.exactArabic,
   (ur?hadith.translationUr:hadith.translationEn)??'',
   (ur?hadith.verifiedReferenceUr:hadith.verifiedReferenceEn)??'');
 }
 return lines;
}

/** A narrated, attributed insight, not a raw foreign-language quotation or reading assignment. */
export function preparedScholarNarration(preparation:PreparedSessionMaterial,locale:'ur'|'en'):string[]{
 const ur=locale==='ur';
 return (preparation.scholarlyExcerpts??[]).map(voice=>{
  const idea=voice.translation[locale];
  const intro=voice.sourceKind==='official-published-outline'||voice.sourceKind==='official-published-quote'
   ? (ur?'ان کے شائع شدہ علمی نکات کے مطابق':'According to the published scholarly outline')
   : (ur?'ان کی کتاب یا درس کا مفہوم یہ ہے':'The published work makes this point');
  return ur
    ? `${voice.scholar.ur} کی علمی گفتگو میں ایک اہم بات سامنے آتی ہے۔ ${intro}: ${idea} اس سے ہمیں یہ سبق ملتا ہے کہ ${voice.perspective.ur} (حوالہ: ${voice.work.ur}، ${voice.scholar.ur})`
    : `${voice.scholar.en}: ${intro}: ${idea} ${voice.perspective.en} (Source: ${voice.work.en})`;
 });
}
export function preparedQuranSourceTexts(preparation: PreparedSessionMaterial): Set<string | undefined> {
 const texts = new Set(preparation.quran.map(({surah, ayah}) => publicDigitalKhattQuranReference.getAyah(surah, ayah)?.text));
 for (const group of preparation.quranGroups ?? []) texts.add(group.locations.map(({surah, ayah}) => publicDigitalKhattQuranReference.getAyah(surah, ayah)?.text).join(' '));
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
 const body=(index:number,locale:'ur'|'en')=>{
  if(p.speakerReady){
   const speaking= p.blocks[index].delivery[locale];
   const extras=index===2&&duration>=30?(p.durationExtra?.extra30??[]).map(x=>x[locale]):[];
   const longExtras=index===3&&duration===45?(p.durationExtra?.extra45??[]).map(x=>x[locale]):[];
   const historical=index===4&&p.masaib?[
     p.masaib.title[locale],p.masaib.history[locale],p.masaib.editorialReflection[locale],
     `${locale==='ur'?'تاریخی حوالہ':'Historical source'}: ${p.masaib.source[locale]}`,
   ]:[];
   return [
    ...(index===1?preparedSourceLines(p,locale):[]),
    speaking,
    ...(index===2?preparedScholarNarration(p,locale):[]),
    ...extras,...longExtras,...historical,
   ];
  }
  return [
   ...(index===0&&session.previousBridgeUr?[locale==='ur'?session.previousBridgeUr:session.previousBridgeEn!]:[]),
   ...(index===1?preparedSourceLines(p,locale):[]),
   locale==='ur'?'قابلِ بیان عبارت — قلم ورکس کی تدوین':'Ready-to-deliver paragraph — Qalam Works editorial material',
   p.blocks[index].delivery[locale],
   locale==='ur'?'وضاحت اور ربط — قلم ورکس کی تدوین':'Explanation and connection — Qalam Works editorial material',
   p.blocks[index].explanation[locale],
   ...(index===2&&duration>=30?(p.durationExtra?.extra30??[]).map(x=>x[locale]):[]),
   ...(index===3&&duration===45?(p.durationExtra?.extra45??[]).map(x=>x[locale]):[]),
   ...(index===3?[`${locale==='ur'?'فرضی روزمرہ مثال':'Hypothetical everyday example'}: ${p.example[locale]}`]:[]),
   ...(index===4&&p.masaib?[p.masaib.title[locale],p.masaib.history[locale],
     p.masaib.editorialReflection[locale],p.masaib.source[locale]]:[]),
   ...(index===4?[`${locale==='ur'?'عملی قدم':'Practical step'}: ${p.action[locale]}`]:[]),
  ];
 };
 return {
  titleUr:`مجلس ${session.number} — ${session.titleUr}`,titleEn:`Session ${session.number} — ${session.titleEn}`,duration,
  readyToDeliver:p.speakerReady===true,
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
   const arabic=publicDigitalKhattQuranReference.getAyah(surah,ayah)?.text??'';
   const translation=quranTranslationFor(surah,ayah,locale)??'';
   return sum+count(arabic)+count(translation);
 },0);
 const hadiths=[preparation.hadithId,...(preparation.additionalHadithIds??[])].reduce((sum,id)=>{
   if(!id)return sum;
   const row=verifiedHadithForDossierText(id);
   return sum+count(row?.exactArabic??'')+count((locale==='ur'?row?.translationUr:row?.translationEn)??'');
 },0);
 const scholars=preparation.speakerReady ? preparedScholarNarration(preparation,locale).reduce((sum,line)=>sum+count(line),0) : 0;
 const words=prose+masaib+verses+hadiths+expansions+scholars;
 // Conservative *planning* band, never an empirically measured delivery duration.
 const low=Math.max(1,Math.floor(words/(locale==='ur'?110:145)));
 const high=Math.max(low,Math.ceil(words/(locale==='ur'?75:105)));
 return {words, lowMinutes:low, highMinutes:high, categories:{prose,masaib,verses,hadiths,expansions,scholars}};
}
