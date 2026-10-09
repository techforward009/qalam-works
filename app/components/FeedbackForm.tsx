"use client";
import {useState} from "react";
import type {FeedbackTool,FeedbackRating} from "../lib/feedback";

const choices:{id:FeedbackRating;icon:string;title:string;note:string}[]=[
 {id:"helpful",icon:"😍",title:"بہت فائدہ ہوا",note:"اوزار مفید رہا"},
 {id:"partial",icon:"🙂",title:"کچھ فائدہ ہوا",note:"مزید بہتری چاہیے"},
 {id:"not-helpful",icon:"😕",title:"فائدہ نہیں ہوا",note:"مسئلہ بتائیں"},
];
export default function FeedbackForm({tool,page}:{tool:FeedbackTool;page:string}){
 const [rating,setRating]=useState<FeedbackRating|null>(null);
 const [comment,setComment]=useState("");
 const [status,setStatus]=useState<"idle"|"busy"|"sent"|"error">("idle");
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!rating||status==="busy"||status==="sent")return;
  setStatus("busy");
  try{
   const r=await fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tool,rating,comment,page})});
   if(!r.ok)throw new Error("send failed");
   setStatus("sent");
  }catch{setStatus("error");}
 }
 return <form onSubmit={submit} className="space-y-5" dir="rtl" lang="ur">
  {status==="sent"?<div role="status" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"><strong className="text-xl">✓ شکریہ! آپ کی رائے محفوظ ہوگئی۔</strong><p className="mt-2">آپ کی رائے سے قلم ورکس کو بہتر بنانے میں مدد ملے گی۔</p></div>:<>
  <fieldset><legend className="mb-3 text-base font-bold">یہ سہولت آپ کے کتنے کام آئی؟</legend><div className="grid gap-3 sm:grid-cols-3">
   {choices.map(c=><label key={c.id} className={`cursor-pointer rounded-2xl border-2 p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg ${rating===c.id?"border-teal-600 bg-teal-50 text-slate-900 shadow-md dark:bg-teal-950 dark:text-white":"border-slate-200 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-white"}`}>
    <input type="radio" name="rating" className="sr-only" value={c.id} checked={rating===c.id} onChange={()=>setRating(c.id)}/><span className="block text-3xl" aria-hidden="true">{c.icon}</span><span className="mt-2 block font-semibold">{c.title}</span><span className="mt-1 block text-xs opacity-70">{c.note}</span>
   </label>)}
  </div></fieldset>
  <label className="block"><span className="mb-2 block font-semibold">آپ کی تجویز یا شکایت (اختیاری)</span><textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={1200} rows={3} placeholder="ہم کیا بہتر کرسکتے ہیں؟ ذاتی معلومات شامل نہ کریں۔" className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 focus:border-teal-600 focus:outline-2 focus:outline-offset-2 focus:outline-teal-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white"/></label>
  {status==="error"&&<p role="alert" className="font-semibold text-red-700 dark:text-red-300">رائے محفوظ نہیں ہوسکی۔ دوبارہ کوشش کریں۔</p>}
  <button disabled={!rating||status==="busy"} type="submit" className="rounded-xl bg-amber-300 px-7 py-3 font-bold text-slate-900 shadow-lg transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50">{status==="busy"?"محفوظ ہو رہی ہے…":"رائے بھیجیں ←"}</button>
  </>}
 </form>;
}
