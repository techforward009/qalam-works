"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";
import FeedbackForm from "./FeedbackForm";
import {useLanguage} from "../lib/language-context";
import type {FeedbackTool} from "../lib/feedback";
const mapping:Record<string,FeedbackTool>={
 "translation-studio":"translation-studio","research-studio":"research-studio","khateeb-studio":"khateeb-studio",
 "unicode-standardizer":"unicode-standardizer","quality-checker":"publication-quality-checker",
 "document-studio":"document-studio","document-cleaner":"document-cleaner","arabic-diacritics":"arabic-diacritics",
 "roman-urdu-writer":"roman-urdu-writer","urdu-roman-writer":"urdu-roman-writer",
 "whatsapp-rtl-formatter":"whatsapp-rtl-formatter","invoice-generator":"invoice-generator",
 "date-converter":"date-converter","crescent-visibility":"crescent-visibility",
};
export default function FeedbackInvitation(){
 const pathname=usePathname()??"";
 const {language,dir}=useLanguage();
 const ur=language==="ur";
 const [open,setOpen]=useState(false);
 useEffect(()=>setOpen(false),[pathname]);
 const slug=pathname.split("/").filter(Boolean)[1];
 const tool:FeedbackTool|undefined=pathname.startsWith("/tools/")?mapping[slug]??"other":
   (pathname==="/quran"||pathname.startsWith("/quran/"))?"quran-editions":
   (pathname==="/services"||pathname.startsWith("/services/"))?"services":undefined;
 if(!tool)return null;
 return <div className="site-container py-10">
 <section aria-label="رائے و تجاویز" className="relative isolate rounded-3xl border-2 border-teal-300 bg-gradient-to-l from-[#087c7a] via-[#135a79] to-[#123a62] px-6 py-9 text-white shadow-[0_18px_42px_rgba(12,68,97,0.24)] md:px-10" dir={dir} lang={language}>

  <div className="relative flex flex-col items-start gap-6">
  <div className={`w-full max-w-3xl ${ur?"font-[family-name:var(--font-nastaliq)]":""}`}>
    <span className="inline-block rounded-full bg-amber-200 px-4 py-1 text-sm font-bold text-slate-900">{ur?"✦ خصوصی دعوت: آپ کی آواز، ہماری بہتری":"✦ Your voice shapes Qalam Works"}</span>
    <h2 className="mt-4 text-2xl font-bold leading-relaxed md:text-3xl">{ur?"کیا یہ سہولت آپ کے کام آئی؟":"Was this tool helpful?"}</h2>
    <p className="mt-2 text-base leading-loose text-cyan-50">{ur?"چند لمحوں میں اپنی رائے دیں۔ آپ کی تجاویز سے ہم قلم ورکس کو بہتر بناتے ہیں۔":"Share your experience in a moment. Your feedback helps us improve Qalam Works."}</p>
  </div>
  <div className={`flex flex-wrap gap-3 ${ur?"font-[family-name:var(--font-nastaliq)]":""}`}>
    <button type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-controls="qalam-feedback-inline" className="rounded-xl bg-amber-200 px-6 py-3 font-bold text-slate-900 shadow-lg transition hover:bg-amber-100">{open?(ur?"فارم بند کریں":"Close form"):(ur?"✍ اپنی رائے دیں":"✍ Share feedback")}</button>
    <Link href={`/feedback?tool=${encodeURIComponent(tool)}`} className="rounded-xl border border-white/70 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20">{ur?"رائے و تجاویز کا صفحہ":"Feedback page"}</Link>
  </div>
  </div>
 </section>
 {open&&<div id="qalam-feedback-inline" className="mx-auto mt-5 max-w-3xl rounded-3xl border-2 border-teal-300 bg-white p-6 shadow-xl dark:bg-slate-900"><h3 className="mb-4 text-xl font-bold" dir={dir}>{ur?"اپنی رائے درج کریں":"Share your feedback"}</h3><FeedbackForm key={pathname} tool={tool} page={pathname}/></div>}
 </div>;
}
