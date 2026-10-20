"use client";
import Link from "next/link";
import {useLanguage} from "../../lib/language-context";
import {QURAN_EDITIONS,type QuranEditionId,getQuranEdition} from "../editions";
export default function EditionTopBar({editionId,surah=1,ayah=1}:{editionId:QuranEditionId;surah?:number;ayah?:number}){
 const {language,dir}=useLanguage();
 const edition=getQuranEdition(editionId);
 const prefix=(id:QuranEditionId)=>id==="madinah-v2"?"/quran/madinah":id==="digital-khatt"?"/quran/indopak-digital-khatt":"/quran/ahmedgraf";
 return <header data-quran-edition-picker className="mb-4 flex w-full min-w-0 flex-col gap-3 border-b border-[#d9d2c2] pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between" dir={dir}>
   <div lang={language} className="w-full min-w-0 sm:flex-1">
     <p className="text-sm font-semibold text-[#2f8f68]">{edition.name[language]}</p>
     <p className="mt-1 text-xs text-[#756f62]">{edition.description[language]}</p>
   </div>
   <label className="flex w-full min-w-0 flex-wrap items-center gap-2 text-xs font-medium text-[#354a3d] sm:w-auto">
    <span>{language==="ur"?"قرآنی ایڈیشن":"Quran edition"}</span>
    <select aria-label={language==="ur"?"قرآنی ایڈیشن منتخب کریں":"Select Quran edition"} className="min-w-0 max-w-full flex-1 rounded-lg sm:max-w-[190px] sm:flex-none border border-[#a4b3a1] bg-white px-3 py-2 text-[#1b332a] dark:bg-slate-900 dark:text-white"
      value={editionId} onChange={e=>{window.location.assign(prefix(e.target.value as QuranEditionId)+"/"+surah+"/"+ayah)}}>
      {QURAN_EDITIONS.map(v=><option key={v.id} value={v.id}>{v.name[language]}</option>)}
    </select>
   </label>
   <Link href="/quran" className="text-xs text-[#2f8f68] underline">{language==="ur"?"مدینہ سے آغاز":"Open default"}</Link>
 </header>;
}
