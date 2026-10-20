"use client";
import Link from "next/link";
import {FileText,PenLine,Languages,BookOpen} from "lucide-react";
import {useLanguage} from "../lib/language-context";

export default function Hero(){
 const {language}=useLanguage();const ur=language==="ur";
 const items=[
  {en:"Write & prepare documents for publication",ur:"دستاویزات لکھیں اور اشاعت کے لیے تیار کریں",Icon:FileText},
  {en:"Refine & improve your writing",ur:"اپنی تحریر کو نکھاریں اور بہتر بنائیں",Icon:PenLine},
  {en:"Type, convert & translate Urdu",ur:"اردو ٹائپ کریں، رسم الخط بدلیں اور ترجمہ کریں",Icon:Languages},
  {en:"Prepare books, stories & poetry for publishing",ur:"کتابیں، کہانیاں اور شاعری اشاعت کے لیے تیار کریں",Icon:BookOpen}
 ];
 return <section className="bg-[#f4f7f9] px-3 py-7 md:px-6 md:py-14" dir={ur?"rtl":"ltr"}>
  <div style={{backgroundColor:'#102b40',backgroundImage:'linear-gradient(112deg,#102b40 5%,#12505b 70%,#0c766c 100%)'}} className="site-container grid items-center gap-8 rounded-[28px] px-6 py-12 text-white shadow-lg md:grid-cols-[1.3fr_.9fr] md:gap-12 md:px-12 md:py-16">
   <div>
    <span className="qalam-home-eyebrow inline-flex items-center justify-center rounded-full bg-[#d5fbef] px-4 py-2 text-xs font-normal text-[#04584b]">{ur?"اردو استعمال کرنے والے ہر شخص کے لیے":"MADE FOR EVERYONE WHO USES URDU"}</span>
    <h1 className={`my-6 max-w-2xl font-bold ${ur?"font-nastaliq text-4xl leading-[2] md:text-5xl":"text-4xl leading-tight tracking-tight md:text-6xl"}`}>{ur?"لکھنے سے اشاعت تک، سب ایک جگہ":"From writing to publishing, all in one place."}</h1>
    <p className={`max-w-2xl text-[#d8eaf0] ${ur?"font-nastaliq text-lg leading-[2.7]":"text-base leading-8 md:text-lg"}`}>
     {ur?"کہانی ہو یا نظم، تعلیمی کام ہو یا کاروباری دستاویز — اردو میں لکھیں، متن سنواریں اور اشاعت کے لیے تیار کریں۔":"Stories and poetry, class assignments and business documents — write in Urdu, refine your words and prepare your work for publication."}
    </p>
    <Link href="/tools" className="qalam-home-cta mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#ffdb83] px-6 py-3 text-sm font-bold text-[#14363d] shadow-md transition-colors hover:bg-[#ffe6a6]">{ur?"تمام اوزار دیکھیں ←":"Explore the tools ↗"}</Link>
   </div>
   <div style={{backgroundColor:"rgba(255,255,255,0.09)",borderColor:"rgba(255,255,255,0.24)"}} className="rounded-3xl border p-5 text-white md:p-6">
    <h2 className={`mb-5 text-lg font-bold ${ur?"font-nastaliq leading-[2.2]":""}`}>{ur?"آپ کے تمام کاموں کے لیے ایک ہی پلیٹ فارم":"One platform for all your work"}</h2>
    <ul className="space-y-3">{items.map(({en,ur:ar,Icon},i)=><li key={en} className={`flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white ${ur?"font-nastaliq leading-[2.2]":""}`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#144c53] text-[#55e8b2]"><Icon size={19}/></span><span>{ur?ar:en}</span>
    </li>)}</ul>
   </div>
  </div>
 </section>
}
