"use client";
import type { MajlisSeriesSession } from './engine/seriesPlanner';
import { ahmedgrafQuranReference } from '../arabic-diacritics/quran/ahmedgrafProvider';
import { verifiedHadithForDossierText } from './engine/verifiedHadithCorpus';
import type { SermonDuration } from './engine/sermonPrep';
import { buildSessionWorkbench, buildSessionWorkbenchText } from './engine/sessionWorkbench';
import KhateebScriptText from './KhateebScriptText';
export default function PreparedSeriesSession({session,duration,locale,onCopy}:{session:MajlisSeriesSession;duration:SermonDuration;locale:'ur'|'en';onCopy:(text:string)=>Promise<void>}) {
 const w=buildSessionWorkbench(session,duration);const ur=locale==='ur';
 const arabicTexts=new Set(session.preparation!.quran.map(({surah,ayah})=>ahmedgrafQuranReference.getAyah(surah,ayah)?.text));
 if(session.preparation!.hadithId) arabicTexts.add(verifiedHadithForDossierText(session.preparation!.hadithId)?.exactArabic);
 return <section data-testid={`prepared-session-${session.number}`} className="mt-5 space-y-4" dir={ur?'rtl':'ltr'}>
  <p className="text-xs leading-7">{ur?'یہ مکمل مجوزہ تیاری ہے۔ اصل آیات، تراجم، روایت اور قلم ورکس کی عبارتیں الگ درج ہیں۔':'This is a complete suggested preparation. Verses, translations, the narration, and Qalam Works wording are identified separately.'}</p>
  {w.blocks.map((block,index)=><section key={index} className="rounded-lg border border-[#1A3A2A]/15 p-4 dark:border-[#35513d]">
   <h5 className="font-bold">{ur?block.headingUr:block.headingEn} — {block.minutes} {ur?'منٹ':'min'}</h5>
   {(ur?block.bodyUr:block.bodyEn).map((point,n)=>arabicTexts.has(point)?<div key={n} className="mt-3"><KhateebScriptText text={point} forceArabic/></div>:<p key={n} className="mt-3 break-words text-sm leading-8">{point}</p>)}
  </section>)}
  <p className="text-sm leading-8"><strong>{ur?'سامعین سے سوال: ':'Audience question: '}</strong>{ur?w.audienceQuestionUr:w.audienceQuestionEn}</p>
  <p className="text-sm leading-8"><strong>{ur?'عملی قدم: ':'Practical step: '}</strong>{session.preparation!.action[locale]}</p>
  <button type="button" onClick={()=>onCopy(buildSessionWorkbenchText(w,locale))} className="khateeb-no-print rounded-lg bg-[#1A3A2A] px-4 py-2 text-sm text-white">{ur?'اس مجلس کی مکمل تیاری نقل کریں':'Copy full session preparation'}</button>
 </section>;
}
