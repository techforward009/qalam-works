"use client";
import {useSearchParams} from "next/navigation";
import {Suspense,useState} from "react";
import Link from "next/link";
import FeedbackForm from "../components/FeedbackForm";
import {useLanguage} from "../lib/language-context";
import {FEEDBACK_TOOLS,type FeedbackTool} from "../lib/feedback";
const tools:{id:FeedbackTool;label:string}[]=[
 {id:"document-studio",label:"دستاویز اسٹوڈیو"},{id:"translation-studio",label:"ترجمہ اسٹوڈیو"},{id:"research-studio",label:"تحقیقی اسٹوڈیو"},
 {id:"khateeb-studio",label:"خطیب اسٹوڈیو"},{id:"quran-editions",label:"قرآن ایڈیشنز"},
 {id:"document-cleaner",label:"دستاویز صاف کریں"},{id:"publication-quality-checker",label:"اردو متن کی جانچ"},
 {id:"unicode-standardizer",label:"یونی کوڈ کی اصلاح"},{id:"roman-urdu-writer",label:"رومن سے اردو"},
 {id:"urdu-roman-writer",label:"اردو سے رومن"},{id:"arabic-diacritics",label:"عربی اعراب"},
 {id:"whatsapp-rtl-formatter",label:"واٹس ایپ فارمیٹر"},{id:"invoice-generator",label:"انوائس جنریٹر"},
 {id:"date-converter",label:"تاریخ کنورٹر"},{id:"crescent-visibility",label:"رؤیت ہلال"},
 {id:"services",label:"خدمات"},{id:"other",label:"دیگر سہولت"},
];
function FeedbackPageInner(){
 const {language,dir}=useLanguage(); const ur=language==="ur";
 const search=useSearchParams();
 const initial=search.get("tool");
 const [selected,setSelected]=useState<FeedbackTool>(initial&&FEEDBACK_TOOLS.includes(initial as FeedbackTool)?initial as FeedbackTool:"other");
 return <main dir={dir} lang={language} className="min-h-[70vh] bg-slate-50 pb-20 dark:bg-slate-950">
 <header className="bg-gradient-to-l from-[#087c7a] via-[#135a79] to-[#123a62] px-5 py-14 text-white">
  <div className="site-container"><span className="rounded-full bg-amber-200 px-4 py-1 text-sm font-bold text-slate-900">{ur?"✦ آپ کی آواز، ہماری بہتری":"✦ Your voice, our progress"}</span>
  <h1 className="mt-5 text-3xl font-bold leading-loose md:text-4xl">{ur?"رائے و تجاویز":"Feedback & Suggestions"}</h1>
  <p className="max-w-3xl text-base leading-loose text-cyan-50">{ur?"قلم ورکس میں کیا اچھا لگا اور کیا بہتر ہوسکتا ہے؟ آپ کی رائے ہمارے لیے اہم ہے۔":"What worked well, and what could be better? Tell us about your experience with Qalam Works."}</p></div>
 </header>
 <div className="site-container mt-9 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,.7fr)]">
 <section className="rounded-3xl border border-teal-200 bg-white p-6 shadow-xl dark:border-teal-900 dark:bg-slate-900 md:p-8">
 <h2 className="text-2xl font-bold">{ur?"اپنی رائے درج کریں":"Share your feedback"}</h2><p className="mb-6 mt-1 text-sm text-slate-600 dark:text-slate-300">{ur?"ایک سہولت منتخب کریں اور ہمیں اپنی رائے بتائیں۔":"Choose a tool or service and share your thoughts."}</p>
 <label htmlFor="feedback-tool" className="mb-2 block font-bold">{ur?"متعلقہ اوزار یا سہولت":"Tool or service"}</label>
 <select id="feedback-tool" className="mb-6 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white" value={selected} onChange={e=>setSelected(e.target.value as FeedbackTool)}>
 {tools.map(t=><option key={t.id} value={t.id}>{ur?t.label:t.id.split("-").map(x=>x[0].toUpperCase()+x.slice(1)).join(" ")}</option>)}
 </select>
 <FeedbackForm key={selected} tool={selected} page="/feedback"/>
 </section>
 <aside className="self-start rounded-3xl bg-[#123a62] p-7 text-white shadow-lg">
 <h2 className="text-2xl font-bold">{ur?"آپ بتائیں، ہم سنیں گے":"Your feedback matters"}</h2><p className="mt-3 leading-loose text-blue-100">{ur?"آپ کی رائے متعلقہ اوزار کے ساتھ محفوظ ہوتی ہے اور قلم ورکس کی ٹیم تک پہنچتی ہے۔":"Feedback is saved with the relevant tool and delivered to the Qalam Works team."}</p>
 <div className="mt-6 space-y-4">
 <p>{ur?"✓ ہر اوزار کی الگ رائے اور رپورٹ":"✓ Feedback tracked by tool"}</p><p>{ur?"✓ اصلاح کے لیے واضح تجاویز":"✓ Clear improvement suggestions"}</p><p>{ur?"✓ نجی معلومات کے بغیر رائے دینے کی سہولت":"✓ No personal details required"}</p>
 </div>
 <Link href="/tools" className="mt-6 inline-block rounded-lg border border-white/60 px-4 py-2 text-white hover:bg-white/10">{ur?"اوزار دیکھیں":"Explore tools"}</Link>
 </aside>
 </div>
 <p className="site-container mt-7 text-sm text-slate-600 dark:text-slate-300">{ur?"صارفین کی تحریری آرا نجی رہیں گی۔ عوامی تجاویز اور ووٹنگ کا نظام الگ منظوری اور جائزے کے بعد شامل کیا جائے گا۔":"Submitted feedback stays private. Public suggestions and voting may be introduced after separate review and approval."}</p>
 </main>;
}

export default function FeedbackPage(){return <Suspense fallback={<main className="site-container p-10">رائے و تجاویز…</main>}><FeedbackPageInner/></Suspense>;}
