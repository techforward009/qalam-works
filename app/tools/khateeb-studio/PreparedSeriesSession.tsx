"use client";
import type { MajlisSeriesSession } from './engine/seriesPlanner';
import { preparedArabicSourceTexts, preparedQuranSourceTexts, estimatePreparedSpeech } from './engine/preparedSeries';
import type { SermonDuration } from './engine/sermonPrep';
import { buildSessionWorkbench, buildSessionWorkbenchText } from './engine/sessionWorkbench';
import KhateebScriptText from './KhateebScriptText';

export default function PreparedSeriesSession({session,duration,locale,onCopy}:{session:MajlisSeriesSession;duration:SermonDuration;locale:'ur'|'en';onCopy:(text:string)=>Promise<void>}) {
 const w=buildSessionWorkbench(session,duration);
 const ur=locale==='ur';
 const quranTexts=preparedQuranSourceTexts(session.preparation!);
 const arabicTexts=preparedArabicSourceTexts(session.preparation!);
 const sourceLinks=session.preparation?.scholarSources??[];
 const estimate=estimatePreparedSpeech(session.preparation!,locale,duration);
 const {words:wordCount,lowMinutes,highMinutes}=estimate;
 const shortfall=duration>highMinutes;
 return <section data-testid={`prepared-session-${session.number}`} className="mt-5 space-y-5" dir={ur?'rtl':'ltr'}>
  <div className="rounded-xl border border-[#B8935A]/30 bg-[#faf6eb] p-4 dark:border-[#6f5b35] dark:bg-[#241f14]">
   <p className="font-semibold leading-8 text-[#59452c] dark:text-[#e2c895]">{ur?'قرآن و روایت کے اصل نصوص، ترجمے اور منبری گفتگو الگ رکھی گئی ہے۔ یہ علمی مسودہ ہے؛ درج شدہ منٹ تیاری کی تقسیم ہیں، ناپی ہوئی مدت نہیں۔':'Qur’anic and hadith sources, translations and editorial speaking passages are separated. Timing is a preparation guide, not a certified duration.'}</p>
   {sourceLinks.length>0?<p data-testid="ghaflah-reading-estimate" className="mt-3 border-t border-[#B8935A]/20 pt-3 text-sm leading-8 text-[#6a5436] dark:text-[#d7bc8a]">
     {ur?`اصل قابلِ بیان متن، مصائب اور نصوص میں تقریباً ${wordCount.toLocaleString("ur-PK")} الفاظ ہیں؛ مسلسل قرأت کا محتاط اندازہ ${lowMinutes}–${highMinutes} منٹ ہے۔ ${shortfall ? `منتخب ${duration} منٹ کی مجلس کے لیے مزید مکمل قابلِ بیان مواد اور مستند مصائب درکار ہیں۔` : "اصل ادائیگی کی مدت خطیب کے انداز اور وقفوں سے بدلے گی۔"}`:
     `About ${wordCount.toLocaleString("en")} words of actual speaking text and sources, roughly ${lowMinutes}–${highMinutes} minutes of continuous delivery. ${shortfall ? `The requested ${duration}-minute sermon needs further fully written content and separately sourced masaib.` : "Actual duration varies with recitation and pauses."}`}
   </p>:null}
  </div>
  {w.blocks.map((block,index)=><section key={index} className="rounded-xl border border-[#1A3A2A]/15 bg-white px-4 py-5 shadow-sm dark:border-[#35513d] dark:bg-[#162a1e] sm:px-7">
   <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-[#B8935A]/25 pb-3">
    <h5 className="text-lg font-bold leading-9 text-[#1A3A2A] dark:text-[#e7eee9]">{ur?block.headingUr:block.headingEn}</h5>
    <span className="text-xs font-medium text-[#836436] dark:text-[#d7bc8a]">{block.minutes} {ur?'منٹ کا مجوزہ حصہ':'min suggested'}</span>
   </div>
   <div className="space-y-4">{(ur?block.bodyUr:block.bodyEn).map((point,n)=>arabicTexts.has(point)?
      <div key={n} className="break-inside-avoid rounded-lg border border-[#B8935A]/25 bg-[#fbf7ee] px-4 py-5 text-center dark:border-[#6f5b35] dark:bg-[#241f14]"><KhateebScriptText text={point} forceArabic nonQuran={!quranTexts.has(point)}/></div>:
      <p key={n} className={`whitespace-pre-line break-words leading-9 ${point.includes('قابلِ بیان عبارت') || point.includes('Ready-to-deliver paragraph') || point.includes('وضاحت اور ربط') || point.includes('Explanation and connection') ? 'text-xs font-bold text-[#8a6838] dark:text-[#d7bc8a]' : 'text-base text-[#303830] dark:text-[#d7e1d9]'}`}>{point}</p>
    )}</div>
  </section>)}
  {sourceLinks.length>0?<aside className="rounded-xl border border-[#1A3A2A]/15 p-4 dark:border-[#35513d]">
    <h5 className="font-bold text-[#1A3A2A] dark:text-[#e7eee9]">{ur?'اصل علمی ماخذ — براہِ راست مطالعہ':'Original scholarly sources'}</h5>
    <ul className="mt-3 space-y-3">{sourceLinks.map(link=><li key={link.url} className="text-sm leading-7">
      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-[#276448] underline decoration-[#B8935A] underline-offset-4 dark:text-[#a3d7b4]">{link.label[locale]}</a>
    </li>)}</ul>
  </aside>:null}
  <div className="rounded-xl border border-[#B8935A]/30 bg-[#fbf7ee] p-5 leading-9 dark:border-[#6f5b35] dark:bg-[#241f14]">
   <p><strong>{ur?'سامعین سے سوال: ':'Audience question: '}</strong>{ur?w.audienceQuestionUr:w.audienceQuestionEn}</p>
   <p className="mt-3"><strong>{ur?'عملی قدم: ':'Action: '}</strong>{session.preparation!.action[locale]}</p>
  </div>
  <button type="button" onClick={()=>onCopy(buildSessionWorkbenchText(w,locale))} className="khateeb-no-print rounded-lg bg-[#1A3A2A] px-5 py-3 text-sm font-bold text-white hover:bg-[#244E38]">{ur?'اس مجلس کی عبارت اور اصل حوالے نقل کریں':'Copy speaking text and sources'}</button>
 </section>;
}
