"use client";
import Link from "next/link";
import { useState } from "react";
import styles from "./owner.module.css";

type Verse = {ayah:number;text:string};
export default function PrivateQuranReader({
  surah, surahNames, verses,
}: {surah:number;surahNames:string[];verses:Verse[]}) {
  const [lastCopied,setLastCopied]=useState<string | null>(null);
  const copy = async (value:string,label:string) => {
    try { await navigator.clipboard.writeText(value);setLastCopied(label); }
    catch { setLastCopied(null); }
  };
  return <main dir="rtl" lang="ur" className="mx-auto max-w-4xl px-4 py-8">
    <header className="mb-8 text-right">
      <h1 className="text-2xl font-semibold">ذاتی قرآن — محمدی قرآنی رسم الخط</h1>
      <p className="mt-2 text-sm">صرف مالک کے لیے — اصل احمد گراف متن، بغیر تبدیلی کے نقل ہوتا ہے۔</p>
    </header>
    <nav aria-label="سورت منتخب کریں" className="mb-7 flex flex-wrap gap-3 items-center">
      <label htmlFor="owner-surah">سورۃ:</label>
      <select id="owner-surah" value={surah} onChange={e=>{window.location.assign("/my/quran?surah="+e.target.value)}} className="rounded border p-2 bg-white text-black">
        {surahNames.map((name,i)=><option key={i} value={i+1}>{i+1} — {name}</option>)}
      </select>
      {surah>1&&<Link prefetch={false} href={"/my/quran?surah="+(surah-1)}>پچھلی سورت</Link>}
      {surah<114&&<Link prefetch={false} href={"/my/quran?surah="+(surah+1)}>اگلی سورت</Link>}
      <button type="button" onClick={()=>copy(verses.map(v=>v.text).join("\n"),"surah")} className="rounded bg-emerald-900 px-4 py-2 text-white">پوری سورت نقل کریں</button>
      <span role="status">{lastCopied==="surah"?"سورت نقل ہوگئی":""}</span>
    </nav>
    <section lang="ar" dir="rtl" className={styles.verses}>
      {verses.map((verse)=><article key={verse.ayah} className="mb-5 border-b border-stone-200 pb-5">
        <p className={styles.ayah}>{verse.text}</p>
        <div className="mt-1 flex items-center justify-between font-sans text-sm">
          <span>آیت {verse.ayah}</span>
          <button type="button" onClick={()=>copy(verse.text,String(verse.ayah))} className="rounded border px-3 py-1">
            {lastCopied===String(verse.ayah)?"نقل ہوگئی":"آیت نقل کریں"}
          </button>
        </div>
      </article>)}
    </section>
  </main>;
}
