"use client";
import {useLanguage} from "../lib/language-context";
export default function LanguageSwitch(){
 const {language,setLanguage}=useLanguage();
 return <div dir="ltr" className="flex shrink-0 items-center gap-1 rounded-full border border-[#d7e5e9] bg-[#edf3f5] p-1">
  <button type="button" lang="ur" dir="rtl" aria-pressed={language==="ur"} onClick={()=>setLanguage("ur")} className={`min-w-12 rounded-full px-3 py-1.5 font-nastaliq text-[14px] leading-[2] transition-colors ${language==="ur"?"bg-white text-[#087467] shadow-sm":"bg-transparent text-[#667781] hover:text-[#087467]"}`}>اردو</button>
  <button type="button" lang="en" aria-pressed={language==="en"} onClick={()=>setLanguage("en")} className={`min-w-12 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${language==="en"?"bg-white text-[#087467] shadow-sm":"bg-transparent text-[#667781] hover:text-[#087467]"}`}>EN</button>
 </div>
}