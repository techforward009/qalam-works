"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { FeedbackRating, FeedbackTool } from "../lib/feedback";

const definitions:Record<string,FeedbackTool>={
 "translation-studio":"translation-studio","research-studio":"research-studio","khateeb-studio":"khateeb-studio",
 "unicode-standardizer":"unicode-standardizer","quality-checker":"publication-quality-checker",
 "document-studio":"document-studio","document-cleaner":"document-cleaner","arabic-diacritics":"arabic-diacritics",
 "roman-urdu-writer":"roman-urdu-writer","urdu-roman-writer":"urdu-roman-writer",
 "whatsapp-rtl-formatter":"whatsapp-rtl-formatter",
};
export default function ToolFeedback(){
 const pathname=usePathname()??"";
 const tool=pathname.startsWith("/tools/") && pathname.split("/").filter(Boolean).length>=2
  ? definitions[pathname.split("/").filter(Boolean)[1]] ?? "other"
  : undefined;
 const [open,setOpen]=useState(false),[rating,setRating]=useState<FeedbackRating|null>(null);
 const [comment,setComment]=useState(""),[state,setState]=useState<"idle"|"busy"|"saved"|"error">("idle");
 useEffect(()=>{setOpen(false);setRating(null);setComment("");setState("idle");},[pathname]);
 if(!tool)return null;
 const submit=async()=>{
   if(!rating||state==="busy")return;
   setState("busy");
   try{
     const response=await fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tool,rating,comment,page:pathname})});
     if(!response.ok)throw Error("failed");
     setState("saved");
   }catch{setState("error");}
 };
 return <section dir="rtl" lang="ur" aria-label="صارفین کی رائے" className="mx-auto my-8 w-full max-w-3xl rounded-xl border border-neutral-300 bg-white p-5 text-right text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
  <div className="mb-3"><h2 className="text-xl font-semibold">اس اوزار کے بارے میں اپنی رائے دیں</h2><p className="mt-1 text-sm opacity-80">آپ کی رائے سے قلم ورکس کو بہتر بنانے میں مدد ملے گی۔</p></div>
  {open&&<div className="mb-2 rounded-xl border border-neutral-300 bg-white p-4 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white">
   <div className="mb-3 flex items-center justify-between gap-4"><strong>کیا یہ اوزار آپ کے کام آیا؟</strong><button aria-label="بند کریں" onClick={()=>setOpen(false)} type="button">✕</button></div>
   {state==="saved"?<p role="status">شکریہ! آپ کی رائے محفوظ ہوگئی۔</p>:<>
    <div className="grid gap-2">{([["helpful","جی ہاں، بہت فائدہ ہوا"],["partial","کچھ فائدہ ہوا، اصلاح چاہیے"],["not-helpful","میرے کام نہیں آیا"]] as const).map(([value,label])=><label className="flex items-center gap-2" key={value}><input type="radio" name="tool-feedback-rating" checked={rating===value} onChange={()=>setRating(value)}/>{label}</label>)}</div>
    <label className="mt-3 block"><span className="text-sm">کیا بہتر ہونا چاہیے؟ (اختیاری)</span><textarea className="mt-1 w-full rounded border border-neutral-400 bg-transparent p-2" rows={3} maxLength={1200} value={comment} onChange={e=>setComment(e.target.value)} placeholder="اپنی تجویز لکھیں؛ ذاتی معلومات یا کتاب کا اصل متن نہ بھیجیں۔"/></label>
    {state==="error"&&<p role="alert" className="my-2 text-red-600">رائے محفوظ نہیں ہوسکی، دوبارہ کوشش کریں۔</p>}
    <button type="button" disabled={!rating||state==="busy"} onClick={submit} className="mt-3 rounded-lg bg-neutral-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black">{state==="busy"?"محفوظ ہو رہی ہے…":"رائے بھیجیں"}</button>
   </>}
  </div>}
  <button type="button" onClick={()=>setOpen(x=>!x)} className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-neutral-900 shadow-lg dark:border-neutral-600 dark:bg-neutral-900 dark:text-white">{open?"رائے کا فارم بند کریں":"رائے دینے کے لیے یہاں دبائیں"}</button>
 </section>;
}
