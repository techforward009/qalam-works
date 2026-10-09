"use client";
import {useState} from "react";
export default function ContactInbox(){
 const [key,setKey]=useState("");
 const [items,setItems]=useState<Array<{id:string;createdAt:string;topic:string;name:string;email:string;message:string}>>([]);
 const [state,setState]=useState<"idle"|"loading"|"error"|"done">("idle");
 async function load(){
  setState("loading");
  try{
   const r=await fetch("/api/contact/admin",{method:"POST",headers:{"Content-Type":"application/json","x-qalam-admin-key":key},body:JSON.stringify({limit:50}),cache:"no-store"});
   if(!r.ok)throw Error("Cannot load");
   const data=await r.json() as {items:typeof items};
   setItems(data.items);setState("done");
  }catch{setState("error")}
 }
 return <main className="site-container min-h-screen py-12" dir="rtl" lang="ur">
  <h1 className="text-2xl font-bold">موصولہ رابطہ پیغامات</h1>
  <p className="my-4 text-sm text-slate-600">یہ صفحہ صرف منتظم کے لیے ہے۔ خفیہ انتظامی کلید درج کریں۔</p>
  <div className="flex max-w-xl flex-wrap gap-3">
   <input aria-label="انتظامی کلید" type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} className="min-w-60 flex-1 rounded-lg border p-3" placeholder="انتظامی کلید"/>
   <button type="button" disabled={!key||state==="loading"} onClick={load} className="rounded-lg bg-[#087c7a] px-6 py-3 text-white disabled:opacity-50">پیغامات دیکھیں</button>
  </div>
  {state==="error"&&<p role="alert" className="my-4 text-red-700">کلید غلط ہے یا پیغامات دستیاب نہیں۔</p>}
  {state==="done"&&<p className="my-4">کل پیغامات: {items.length}</p>}
  <div className="mt-5 grid gap-4">{items.map(x=><article key={x.id} className="rounded-xl border bg-white p-5 text-slate-900">
   <p className="text-xs text-slate-500" dir="ltr">{x.createdAt}</p>
   <p className="mt-2 font-semibold">{x.topic} — {x.name||"بے نام"}</p>
   {x.email&&<p dir="ltr" className="my-2 text-sm">{x.email}</p>}
   <p className="mt-3 whitespace-pre-wrap leading-8">{x.message}</p>
  </article>)}</div>
 </main>;
}
