"use client";
import { useState } from "react";

type Report={total:number;counts:Record<string,{total:number;helpful:number;partial:number;notHelpful:number}>;recent:{tool:string;rating:string;comment:string;createdAt:string}[];capped:boolean};
export default function FeedbackReportPage(){
 const [key,setKey]=useState(""),[data,setData]=useState<Report|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(false);
 async function load(){
  setLoading(true);setError("");setData(null);
  try{
   const response=await fetch("/api/feedback/report",{headers:{Authorization:"Bearer "+key},cache:"no-store"});
   if(!response.ok)throw Error(response.status===401?"غلط انتظامی کلید یا رسائی کی اجازت نہیں۔":"ابھی رپورٹ نہیں مل سکی۔");
   setData(await response.json());
  }catch(e){setError(e instanceof Error?e.message:"خرابی پیش آگئی۔");}
  finally{setLoading(false);}
 }
 return <main lang="ur" dir="rtl" className="mx-auto w-full max-w-5xl px-5 py-12 text-right">
  <h1 className="mb-4 text-3xl font-semibold">صارفین کی رائے — انتظامی رپورٹ</h1>
  <p className="mb-4">یہ رپورٹ صرف انتظامی اجازت کے ساتھ کھلتی ہے۔ کلید محفوظ نہیں کی جاتی۔</p>
  <form onSubmit={e=>{e.preventDefault();void load();}} className="mb-8 flex flex-wrap gap-2">
   <input aria-label="انتظامی کلید" type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} className="min-w-52 flex-1 rounded-lg border p-3 text-black" placeholder="انتظامی کلید"/>
   <button type="submit" disabled={!key||loading} className="rounded-lg bg-neutral-900 px-5 py-3 text-white disabled:opacity-50">رپورٹ دیکھیں</button>
  </form>
  {error&&<p role="alert">{error}</p>}
  {data&&<section className="space-y-8">
   <p>موصولہ آرا: <strong>{data.total}</strong>{data.capped?" — صرف تازہ ترین دستیاب ۵۰۰ آرا کا جائزہ":""}</p>
   <div className="overflow-x-auto"><table className="w-full border-collapse text-right"><thead><tr>{["اوزار","کل","مفید","جزوی فائدہ","غیر مفید"].map(s=><th key={s} className="border p-2">{s}</th>)}</tr></thead><tbody>{Object.entries(data.counts).map(([name,c])=><tr key={name}><td className="border p-2">{name}</td>{[c.total,c.helpful,c.partial,c.notHelpful].map((n,i)=><td className="border p-2" key={i}>{n}</td>)}</tr>)}</tbody></table></div>
   <h2 className="text-xl font-semibold">تازہ تجاویز اور شکایات</h2>
   <div className="space-y-3">{data.recent.filter(r=>r.comment).map((r,i)=><article key={i} className="rounded-lg border p-3"><p className="text-sm opacity-70">{r.tool} — {r.rating} — {new Date(r.createdAt).toLocaleString("ur-PK")}</p><p className="whitespace-pre-wrap break-words">{r.comment}</p></article>)}</div>
  </section>}
 </main>;
}
