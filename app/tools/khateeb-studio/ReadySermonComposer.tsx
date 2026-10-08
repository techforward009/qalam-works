"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import BookPassageText from "./BookPassageText";
import { bookExcerptReference } from "./engine/bookLibrary";
import { buildCustomSermonText, parseCustomSermonProject, type CustomSermonProject } from "./engine/customSermonProject";
import type { SermonDuration } from "./engine/sermonPrep";
type Props={locale:"ur"|"en";project:CustomSermonProject|null;onPrepared:(project:CustomSermonProject)=>boolean;onCopy?:()=>void;onPrint?:()=>void};
export default function ReadySermonComposer({locale,project,onPrepared,onCopy,onPrint}:Props){
 const ur=locale==="ur";const [title,setTitle]=useState("");const [duration,setDuration]=useState<SermonDuration>(30);const [instruction,setInstruction]=useState("");const [pending,setPending]=useState(false);const [error,setError]=useState("");const [generated,setGenerated]=useState<string[]>([]);const controller=useRef<AbortController|null>(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const revision=project?.sections.some(s=>s.id.startsWith("composed-"))?project:null;
 useEffect(()=>{if(revision)setDuration(revision.duration);},[revision?.id,revision?.duration]);
 async function prepare(revise:boolean){
  const topic=revise?revision?.title:title.trim();if(!topic||pending)return;
  setPending(true);setError("");const abort=new AbortController();controller.current=abort;
  try{
   const previous=revise&&revision?revision.sections.map(s=>`${s.headingUr}\n${s.userText}`).join("\n\n"):undefined;
   const response=await fetch("/api/khateeb/compose",{method:"POST",headers:{"Content-Type":"application/json"},signal:abort.signal,body:JSON.stringify({title:topic,duration,locale,...(revise?{instruction,previous:previous?.slice(0,24000)}:{})})});
   const payload=await response.json();if(!response.ok){const messages:Record<string,string>={"missing-translation":ur?"اس موضوع کا اردو ماخذی مواد ابھی ناکافی ہے۔ عنوان واضح کریں یا کسی دوسرے موضوع سے شروع کریں۔":"Supplied translations are insufficient for this topic.","no-evidence":ur?"اس عنوان کا متعلقہ ماخذی مواد نہیں ملا۔ عنوان مزید واضح کریں۔":"No relevant sources found. Make the topic more specific.","insufficient-evidence":ur?"اس دورانیے کی مجلس کے لیے کافی متعلقہ اور مصدقہ کتابی مواد نہیں ملا۔ مختصر دورانیہ یا زیادہ واضح موضوع آزمائیں۔":"There are not enough relevant, verified source passages for this duration. Try a shorter duration or a more specific topic.","insufficient-draft":ur?"تیار مواد اس دورانیے کے لیے کافی نہیں بنا۔ مختصر دورانیہ منتخب کریں یا موضوع مزید واضح کریں۔":"The generated material was insufficient for the selected duration. Try a shorter duration or a more specific topic.","unverified":ur?"مسودے کے تمام علمی نکات حوالوں سے ثابت نہیں ہوئے؛ دوبارہ کوشش کریں۔ پچھلا نسخہ محفوظ ہے۔":"Source verification did not pass. Retry; the previous draft is preserved.","busy":ur?"چند لمحوں بعد دوبارہ کوشش کریں۔":"Please try again shortly."};throw new Error(messages[payload.code]??(ur?"مجلس تیار نہیں ہوسکی؛ دوبارہ کوشش کریں۔":"The sermon could not be prepared. Please retry."));}
   const next=parseCustomSermonProject(JSON.stringify(payload.project));if(!next)throw new Error(ur?"مسودہ درست حالت میں نہیں ملا۔":"Invalid draft response.");
   const saved=onPrepared(next);setGenerated(ids=>[next.id,...ids]);setInstruction("");if(!saved)setError(ur?"مجلس تیار ہے مگر محفوظ نہیں ہوسکی؛ محفوظ فائل بنائیں۔":"The sermon is ready but could not be saved. Export a backup.");
  }catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:(ur?"دوبارہ کوشش کریں۔":"Please retry."));}finally{if(controller.current===abort){setPending(false);controller.current=null;}}
 }
 return <section dir={ur?"rtl":"ltr"} className="mb-6 rounded-2xl border border-emerald-300 bg-white p-5 dark:border-emerald-900 dark:bg-[#162a1e]" aria-busy={pending}>
  <h3 className="text-xl font-bold">{ur?"عنوان دیں، مجلس تیار کریں":"Give a topic, prepare a sermon"}</h3>
  <p className="mt-2 leading-8">{ur?"قلم متعلقہ مواد اور حوالے خود جمع کرکے مربوط مسودہ تیار کرے گا۔ پھر اسی مجلس میں اپنی پسند کے مطابق تبدیلی کروائیں۔":"Qalam collects sources and writes a connected draft. Refine it with further requests."}</p>
  <label className="mt-4 grid gap-2">{ur?"مجلس کا موضوع":"Sermon topic"}<input maxLength={200} disabled={pending} value={title} onChange={e=>setTitle(e.target.value)} placeholder={ur?"مثلاً: غصے کے وقت صبر اور ضبطِ نفس":"e.g. Patience and self-restraint in anger"} className="rounded-lg border bg-transparent p-3"/></label>
  <label className="mt-3 flex items-center gap-3">{ur?"دورانیہ":"Duration"}<select disabled={pending} value={duration} onChange={e=>setDuration(Number(e.target.value) as SermonDuration)} className="rounded border bg-transparent p-2">{[20,30,45].map(n=><option key={n} value={n}>{n} {ur?"منٹ":"minutes"}</option>)}</select></label>
  <button disabled={pending||title.trim().length<2} onClick={()=>void prepare(false)} className="mt-4 rounded-lg bg-[#1A3A2A] px-5 py-3 text-white disabled:opacity-50">{pending?<Loader2 className="inline h-4 w-4 animate-spin"/>:null} {ur?"میری مجلس تیار کریں":"Prepare my sermon"}</button>
  {pending?<p role="status" className="mt-3 leading-7">{ur?"مواد منتخب ہو رہا ہے، مجلس لکھی جا رہی ہے اور حوالے جانچے جا رہے ہیں…":"Selecting sources, composing and checking references…"}</p>:null}
  {error?<p role="alert" className="mt-3 text-red-700 dark:text-red-300">{error}</p>:null}
  {revision?<div className="mt-6 border-t pt-4">
   <h4 className="text-lg font-bold">{ur?"تیار مجلس":"Prepared sermon"}: {revision.title}</h4>
   <button className="mt-3 rounded border px-4 py-2" onClick={()=>{const blob=new Blob([buildCustomSermonText(revision,locale)],{type:"text/plain;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="qalam-sermon.txt";a.click();URL.revokeObjectURL(url);}}>{ur?"مجلس کی متنی فائل لیں":"Download sermon text"}</button>
   {onCopy?<button className="ms-2 mt-3 rounded border px-4 py-2" onClick={onCopy}>{ur?"مجلس نقل کریں":"Copy sermon"}</button>:null}
   {onPrint?<button className="ms-2 mt-3 rounded border px-4 py-2" onClick={onPrint}>{ur?"مجلس کی طباعت":"Print sermon"}</button>:null}
   {revision.sections.map(s=><article key={s.id} className="mt-5"><h5 className="font-bold">{ur?s.headingUr:s.headingEn}</h5><div className="mt-2 whitespace-pre-wrap leading-9">{s.userText}</div></article>)}
   <details className="mt-5 rounded-lg border p-3"><summary className="cursor-pointer font-bold">{ur?"اصل عبارتیں، تراجم اور حوالے":"Original passages, translations and references"}</summary>
    {revision.evidence.map(e=><article key={e.id} className="mt-4"><strong>{ur?e.citationUr:e.citationEn}</strong>{e.arabic?<BookPassageText text={e.arabic} language="ar" quran={e.kind==="quran"}/>:null}<p className="whitespace-pre-wrap leading-8">{ur?e.detailUr:e.detailEn}</p></article>)}
    {revision.bookExcerpts?.map(e=><article key={e.id} className="mt-4"><strong>{bookExcerptReference(e,locale)}</strong>{e.paragraphs.map(p=><BookPassageText key={p.id} text={p.text} language={e.language}/>)}{e.suppliedTranslation?<><p className="mt-2 whitespace-pre-wrap leading-8">{e.suppliedTranslation.text}</p><p className="text-sm leading-7">{e.suppliedTranslation.translator} — {e.suppliedTranslation.source}</p></>:null}</article>)}
   </details>
  </div>:null}
  {revision?<div className="mt-6 border-t pt-4">
   <h4 className="font-bold">{ur?"اسی مجلس کو بہتر کریں":"Refine this sermon"}: {revision.title}</h4>
   <label className="mt-3 grid gap-2">{ur?"کیا تبدیلی چاہیے؟":"What would you like to change?"}<textarea disabled={pending} maxLength={600} value={instruction} onChange={e=>setInstruction(e.target.value)} rows={3} placeholder={ur?"زبان آسان کریں، نوجوانوں کے لیے بنائیں، یا دوسرے نکتے کو مزید واضح کریں۔":"Simplify the language, adapt for young listeners, or explain the second point."} className="rounded-lg border bg-transparent p-3 leading-8"/></label>
   <button disabled={pending||!instruction.trim()} onClick={()=>void prepare(true)} className="mt-3 rounded-lg bg-[#1A3A2A] px-5 py-3 text-white disabled:opacity-50">{ur?"تبدیلی کے ساتھ نیا نسخہ بنائیں":"Create a revised version"}</button>
   <p className="mt-2 text-sm leading-7">{ur?"ہر تبدیلی الگ نسخہ بنتی ہے؛ پچھلی مجلس میرے محفوظ مسودوں میں رہتی ہے۔":"Each revision is saved separately; previous versions remain in My saved drafts."}</p>
  </div>:null}
  {generated.length?<p role="status" className="mt-3 text-sm">{ur?"تیار مجلس نیچے موجود ہے۔":"Your prepared sermon is below."}</p>:null}
 </section>;
}
