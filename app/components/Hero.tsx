"use client";
import Link from "next/link";
import {FileText,PenLine,Library,BookOpen} from "lucide-react";
import {useLanguage} from "../lib/language-context";

export default function Hero(){
 const {language}=useLanguage();const ur=language==="ur";
 const items=[
  {en:"Write & prepare documents for publication",ur:"دستاویزات لکھیں اور اشاعت کے لیے تیار کریں",Icon:FileText},
  {en:"Refine & improve your writing",ur:"اپنی تحریر کو نکھاریں اور بہتر بنائیں",Icon:PenLine},
  {en:"Research & explore knowledge resources",ur:"تحقیق کریں اور علمی ذخیرے سے استفادہ کریں",Icon:Library},
  {en:"Recite the Holy Qur’an & benefit from its verses",ur:"قرآن کریم کی تلاوت اور اس کی آیات سے استفادہ کریں",Icon:BookOpen}
 ];
 return <section className="bg-[#f4f7f9] px-3 py-7 md:px-6 md:py-14" dir={ur?"rtl":"ltr"}>
  <div style={{backgroundColor:'#102b40',backgroundImage:'linear-gradient(112deg,#102b40 5%,#12505b 70%,#0c766c 100%)'}} className="site-container grid items-center gap-8 rounded-[28px] px-6 py-12 text-white shadow-lg md:grid-cols-[1.3fr_.9fr] md:gap-12 md:px-12 md:py-16">
   <div>
    <span className="inline-flex rounded-full bg-[#d5fbef] px-4 py-2 text-xs font-bold text-[#04584b]">{ur?"اردو اور دیگر زبانوں کے لیے مفید اوزار":"TOOLS FOR URDU & MULTILINGUAL WORK"}</span>
    <h1 className={`my-6 max-w-2xl font-bold ${ur?"font-nastaliq text-4xl leading-[2] md:text-5xl":"text-4xl leading-tight tracking-tight md:text-6xl"}`}>{ur?"لکھنے سے اشاعت تک، سب ایک جگہ":"From writing to publishing, all in one place."}</h1>
    <p className={`max-w-2xl text-[#d8eaf0] ${ur?"font-nastaliq text-lg leading-[2.7]":"text-base leading-8 md:text-lg"}`}>
     {ur?"اردو اور دیگر زبانوں میں تحریر، تحقیق اور اشاعت کے کام کو آسان اور سہل بنانے کے لیے خصوصی توجہ سے تیار کردہ اوزار۔":"Thoughtfully designed tools to make writing, research and publishing in Urdu and other languages simpler, easier and more accessible."}
    </p>
    <Link href="/tools" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#ffdb83] px-6 py-3 text-sm font-bold text-[#14363d] shadow-md transition-colors hover:bg-[#ffe6a6]">{ur?"تمام اوزار دیکھیں ←":"Explore the tools ↗"}</Link>
   </div>
   <div className="rounded-3xl border border-[#dbe8e9] bg-[#f7fbfa] p-5 text-[#153445] shadow-lg md:p-6">
    <h2 className={`mb-5 text-lg font-bold ${ur?"font-nastaliq leading-[2.2]":""}`}>{ur?"آپ کے تمام کاموں کے لیے ایک ہی پلیٹ فارم":"One platform for all your work"}</h2>
    <ul className="space-y-3">{items.map(({en,ur:ar,Icon},i)=><li key={en} className={`flex items-center gap-3 rounded-xl border border-[#d9e5e7] bg-white px-4 py-3 text-sm text-[#1b3945] ${ur?"font-nastaliq leading-[2.2]":""}`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e0f4ee] text-[#087b69]"><Icon size={19}/></span><span>{ur?ar:en}</span>
    </li>)}</ul>
   </div>
  </div>
 </section>
}
