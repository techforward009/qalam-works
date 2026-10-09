"use client";
import {useState,type FormEvent} from "react";
import {useLanguage} from "../lib/language-context";
import {translations} from "../lib/translations";

export default function ContactContent(){
 const {language,dir}=useLanguage();const ur=language==="ur";
 const t=translations[language].contactPage;
 const [name,setName]=useState("");const [email,setEmail]=useState("");
 const [topic,setTopic]=useState("general");const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);const [status,setStatus]=useState<"idle"|"sent"|"error">("idle");
 async function send(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||!message.trim())return;
  setBusy(true);setStatus("idle");
  try{
   const r=await fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"contact",name,email,topic,message})});
   if(!r.ok)throw Error("not saved");
   setStatus("sent");setMessage("");
  }catch{setStatus("error")}finally{setBusy(false)}
 }
 return <main className="min-h-screen bg-[#f5f8fa] py-12 dark:bg-[#0e1524] md:py-20" dir={dir} lang={language}>
  <div className="site-container max-w-5xl">
   <div className="mb-9">
    <h1 className={`text-3xl font-bold text-[#153445] dark:text-white ${ur?"font-nastaliq leading-[2.1]":""}`}>{t.heading}</h1>
    <p className={`mt-3 text-[#536875] dark:text-slate-300 ${ur?"font-nastaliq leading-[2.5]":"leading-7"}`}>{ur?"ترجمہ، تدوین، پروف خوانی، اشاعتی خدمات یا ہمارے اوزاروں سے متعلق کوئی سوال ہو تو یہاں پیغام بھیجیں۔ ای میل کرنا ضروری نہیں۔":"Questions about translation, editing, proofreading, publishing services or our tools? Send us a message here — no email app needed."}</p>
   </div>
   <div className="grid gap-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(250px,.7fr)]">
    <form onSubmit={send} className="rounded-3xl border border-[#dce7e9] bg-white p-6 shadow-sm md:p-8 dark:border-slate-700 dark:bg-slate-900">
     <h2 className={`mb-5 text-xl font-bold text-[#153445] dark:text-white ${ur?"font-nastaliq leading-[2]":""}`}>{ur?"اپنا پیغام بھیجیں":"Send us a message"}</h2>
     <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm text-[#294655] dark:text-white"><span className="mb-2 block">{ur?"نام (اختیاری)":"Name (optional)"}</span><input value={name} onChange={e=>setName(e.target.value)} maxLength={80} className="w-full rounded-xl border border-[#cddde2] bg-white px-3 py-2.5 text-[#153445] dark:bg-slate-800 dark:text-white"/></label>
      <label className="block text-sm text-[#294655] dark:text-white"><span className="mb-2 block">{ur?"ای میل (جواب کے لیے، اختیاری)":"Email (for a reply, optional)"}</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={180} className="w-full rounded-xl border border-[#cddde2] bg-white px-3 py-2.5 text-[#153445] dark:bg-slate-800 dark:text-white" dir="ltr"/></label>
     </div>
     <label className="mt-4 block text-sm text-[#294655] dark:text-white"><span className="mb-2 block">{ur?"موضوع":"Topic"}</span><select value={topic} onChange={e=>setTopic(e.target.value)} className="w-full rounded-xl border border-[#cddde2] bg-white px-3 py-2.5 text-[#153445] dark:bg-slate-800 dark:text-white"><option value="general">{ur?"عمومی سوال":"General inquiry"}</option><option value="services">{ur?"ترجمہ و اشاعتی خدمات":"Translation & publishing services"}</option><option value="tools">{ur?"اوزاروں سے متعلق سوال":"Question about a tool"}</option><option value="other">{ur?"دیگر":"Other"}</option></select></label>
     <label className="mt-4 block text-sm text-[#294655] dark:text-white"><span className="mb-2 block">{ur?"آپ کا پیغام":"Your message"} *</span><textarea required minLength={10} maxLength={2000} rows={6} value={message} onChange={e=>setMessage(e.target.value)} placeholder={ur?"اپنا سوال یا پیغام یہاں لکھیں…":"Write your question or message here…"} className="w-full rounded-xl border border-[#cddde2] bg-white p-3 text-[#153445] dark:bg-slate-800 dark:text-white"/></label>
     <p className={`mt-2 text-xs text-[#647986] dark:text-slate-300 ${ur?"font-nastaliq leading-[2]":""}`}>{ur?"اگر جواب چاہتے ہیں تو ای میل پتہ ضرور درج کریں؛ اس کے بغیر بھی آپ کا پیغام محفوظ ہوگا۔":"Add your email if you would like a reply. Your message can be submitted without one."}</p>
     {status==="sent"&&<p role="status" className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{ur?"✓ آپ کا پیغام محفوظ ہوگیا۔ شکریہ!":"✓ Your message has been saved. Thank you!"}</p>}
     {status==="error"&&<p role="alert" className="mt-4 text-sm font-semibold text-red-700">{ur?"پیغام محفوظ نہیں ہوسکا۔ دوبارہ کوشش کریں۔":"Could not save your message. Please try again."}</p>}
     <button type="submit" disabled={busy||message.trim().length<10} className={`mt-5 rounded-xl bg-[#ffdb83] px-7 py-3 font-bold text-[#14363d] hover:bg-[#ffe6a6] disabled:opacity-50 ${ur?"font-nastaliq leading-[2]":""}`}>{busy?(ur?"بھیجا جارہا ہے…":"Sending…"):(ur?"پیغام بھیجیں":"Send message")}</button>
    </form>
    <aside className="h-fit rounded-3xl border border-[#dce7e9] bg-[#eaf4f2] p-6 md:p-7 dark:border-slate-700 dark:bg-slate-900">
     <h2 className={`text-xl font-bold text-[#153445] dark:text-white ${ur?"font-nastaliq leading-[2]":""}`}>{ur?"ای میل کے ذریعے رابطہ":"Contact by email"}</h2>
     <a href="mailto:info@qalamworks.com?subject=Qalam%20Works%20Inquiry" className="mt-4 block break-all font-semibold text-[#087467]">info@qalamworks.com</a>
     <p className={`mt-5 text-sm text-[#536875] dark:text-slate-300 ${ur?"font-nastaliq leading-[2.3]":"leading-6"}`}>{t.responseNote}</p>
    </aside>
   </div>
  </div>
 </main>;
}
