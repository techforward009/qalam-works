"use client";
import { GHAF_LAH_SCHOLARLY_VOICES } from "./engine/ghaflahScholarlyVoices";

/** Primary-source excerpts, distinguished from translations and publisher summaries. */
export default function GhaflahScholarlyVoices({ur}:{ur:boolean}){
 return <section data-testid="ghaflah-scholarly-voices" dir={ur?"rtl":"ltr"}
   className="mt-6 space-y-4 rounded-2xl border border-[#B8935A]/30 bg-[#fffdf8] p-4 dark:border-[#6f5b35] dark:bg-[#201d15] sm:p-6">
   <div className="space-y-2">
    <h3 className="text-xl font-bold text-[#1A3A2A] dark:text-[#e7eee9]">{ur?"منتخب علما کے اصل حوالے اور علمی اقتباسات":"Source-grounded excerpts from respected scholars"}</h3>
    <p className="text-sm leading-8 text-[#4b574c] dark:text-[#c7d4cb]">
     {ur?"غفلت پر بڑی اخلاقی تصانیف اور دروس سے اصل مختصر اقتباس، محتاط اردو مفہوم اور ماخذ پیش ہیں۔ مترجم کتاب اور شائع شدہ خلاصے کو اصل فارسی یا عربی تقریر نہیں کہا گیا۔ یہ ان ۲۹ مقررین کی لازمی فہرست سے الگ علمی ماخذ بھی شامل کرتا ہے۔":"Short verified excerpts with translations and exact source links, explicitly separating original Persian, published English translation, and official lecture outlines. Some classical scholars are not among the 29 registered speakers."}
    </p>
   </div>
   <div className="grid gap-4 lg:grid-cols-2">
    {GHAF_LAH_SCHOLARLY_VOICES.map(item=><article key={item.id} className="rounded-xl border border-[#1A3A2A]/15 bg-white p-4 dark:border-[#35513d] dark:bg-[#162a1e]">
      <h4 className="text-base font-bold leading-8 text-[#183727] dark:text-[#e7eee9]">{ur?item.scholarUr:item.scholarEn}</h4>
      <p className="text-xs leading-6 text-[#69776d] dark:text-[#a8c8b0]">{ur?item.workUr:item.workEn}</p>
      <blockquote lang={item.language} dir={item.language==="fa"?"rtl":"ltr"}
        className="mt-3 border-s-4 border-[#B8935A] bg-[#f8f3e8] px-4 py-3 text-base leading-9 text-[#293d30] dark:bg-[#29271c] dark:text-[#e5dfcf]">
        {item.quote}
      </blockquote>
      <p className="mt-3 leading-8 text-[#263d2f] dark:text-[#d7e1d9]">{ur?item.ur:item.en}</p>
      <p className="mt-2 text-sm leading-7 text-[#4a6053] dark:text-[#b4c9b9]">{ur?item.whyUr:item.whyEn}</p>
      <p className="mt-2 text-xs leading-6 text-[#765e3b] dark:text-[#d3b88e]">{ur?item.noteUr:item.noteEn}</p>
      <a href={item.url} target="_blank" rel="noopener noreferrer"
       className="mt-3 inline-block text-sm font-semibold text-[#276448] underline underline-offset-4 dark:text-[#a3d7b4]">
       {ur?"اصل عبارت اور مکمل ماخذ کھولیں":"Open published source"}
      </a>
    </article>)}
   </div>
 </section>;
}
