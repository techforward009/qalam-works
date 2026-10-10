"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useRef,useState} from "react";
import {ChevronDown,Menu,X,FileText,Brush,CheckCircle,Languages,BookOpen,Library,Mic2,CaseSensitive,Receipt,CalendarDays,Moon,MessageSquareText,PenLine,BookMarked} from "lucide-react";
import {useLanguage} from "../lib/language-context";



function CompactLanguageSwitch(){
 const {language,setLanguage}=useLanguage();
 return <div role="group" aria-label="Choose language" dir="ltr" className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full border border-[#111827] bg-[#101820] p-[2px] shadow-sm sm:h-9 sm:p-[3px]">
  <button type="button" lang="en" aria-pressed={language==="en"} onClick={()=>setLanguage("en")} className={`flex h-[26px] min-w-[29px] items-center justify-center rounded-full px-1 text-[10px] sm:h-[28px] sm:min-w-[34px] sm:px-2 font-semibold transition-colors ${language==="en"?"bg-[#059669] text-white shadow-sm":"text-[#d1d5db] hover:text-white"}`}>EN</button>
  <button type="button" lang="ur" dir="rtl" aria-pressed={language==="ur"} onClick={()=>setLanguage("ur")} className={`flex h-[26px] min-w-[35px] items-center justify-center rounded-full px-1 font-nastaliq sm:h-[28px] sm:min-w-[43px] sm:px-2 text-[13px] leading-[1.9] transition-colors ${language==="ur"?"bg-[#059669] text-white shadow-sm":"text-[#d1d5db] hover:text-white"}`}>اردو</button>
 </div>;
}

const sections=[
 {en:"Write & Publish",ur:"تحریر و اشاعت",tools:[
  ["Document Studio","دستاویز اسٹوڈیو","document-studio",FileText,"text-teal-700","bg-teal-50"],
  ["Urdu Text Cleaner","اردو متن کی صفائی","document-cleaner",Brush,"text-blue-700","bg-blue-50"],
  ["Urdu Text Check","اردو متن کی جانچ","quality-checker",CheckCircle,"text-violet-700","bg-violet-50"],
  ["Urdu Unicode Fixer","یونی کوڈ کی اصلاح","unicode-standardizer",CaseSensitive,"text-rose-700","bg-rose-50"]]},
 {en:"Research & Knowledge",ur:"تحقیق و علم",tools:[
  ["Quran Editions","قرآن کریم","/quran",BookOpen,"text-emerald-700","bg-emerald-50"],
  ["Research Studio","ریسرچ اسٹوڈیو","research-studio",Library,"text-amber-700","bg-amber-50"],
  ["Khateeb Studio","خطیب اسٹوڈیو","khateeb-studio",Mic2,"text-indigo-700","bg-indigo-50"],
  ["Arabic Diacritics","عربی اعراب","arabic-diacritics",BookMarked,"text-pink-700","bg-pink-50"]]},
 {en:"Language Tools",ur:"زبان کے اوزار",tools:[
  ["Translation Studio","ترجمہ اسٹوڈیو","translation-studio",Languages,"text-sky-700","bg-sky-50"],
  ["Roman Urdu → Urdu","رومن سے اردو","roman-urdu-writer",PenLine,"text-orange-700","bg-orange-50"],
  ["Urdu → Roman","اردو سے رومن","urdu-roman-writer",CaseSensitive,"text-purple-700","bg-purple-50"]]},
 {en:"Utilities",ur:"دیگر سہولتیں",tools:[
  ["Invoice Generator","انوائس جنریٹر","invoice-generator",Receipt,"text-teal-700","bg-teal-50"],
  ["Date Converter","تاریخ کنورٹر","date-converter",CalendarDays,"text-blue-700","bg-blue-50"],
  ["Crescent Visibility","رؤیتِ ہلال","crescent-visibility",Moon,"text-orange-700","bg-orange-50"],
  ["WhatsApp RTL Formatter","واٹس ایپ فارمیٹر","whatsapp-rtl-formatter",MessageSquareText,"text-violet-700","bg-violet-50"]]}
] as const;
export default function Header(){
 const {language}=useLanguage();const ur=language==="ur";const pathname=usePathname();
 const [open,setOpen]=useState<number|null>(null);const [mobile,setMobile]=useState(false);
 const wrap=useRef<HTMLDivElement>(null);
 useEffect(()=>{setOpen(null);setMobile(false)},[pathname]);
 useEffect(()=>{const down=(e:MouseEvent)=>{if(!wrap.current?.contains(e.target as Node))setOpen(null)};const key=(e:KeyboardEvent)=>{if(e.key==="Escape"){setOpen(null);setMobile(false)}};document.addEventListener("mousedown",down);document.addEventListener("keydown",key);return()=>{document.removeEventListener("mousedown",down);document.removeEventListener("keydown",key)}},[]);
 return <div className="sticky top-0 z-50" ref={wrap}>
  <div style={{backgroundColor:"#153b62",backgroundImage:"linear-gradient(105deg,#153b62 0%,#135a79 55%,#087c7a 100%)"}}>
   <div className="site-container flex min-h-[44px] items-center justify-end gap-2 py-1 px-4" dir="ltr">
    {([["About","تعارف","/about"],["Services","خدمات","/services"],["Contact","رابطہ","/contact"]] as const).map(([en,ar,href])=><Link key={href} href={href} className={`inline-flex min-h-8 items-center justify-center rounded-full border border-white/40 px-4 py-1 text-xs font-semibold text-white hover:bg-white/15 ${ur?"font-nastaliq leading-[2]":""}`}>{ur?ar:en}</Link>)}
   </div>
  </div>
  <header className="border-b border-[#dce6eb] bg-white shadow-[0_6px_24px_#1a405513]">
   <div className="site-container flex min-h-[68px] items-center justify-between gap-1 !px-3 sm:min-h-[84px] sm:gap-3 sm:!px-6 lg:gap-4" dir="ltr">
    <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 font-sans sm:gap-3 lg:flex-none" dir="ltr">
     <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#12a082] to-[#086656] text-white shadow-md sm:h-12 sm:w-12 sm:rounded-xl"><PenLine className="h-5 w-5 sm:h-6 sm:w-6"/></span>
     <span className="min-w-0"><strong className="block truncate whitespace-nowrap text-[18px] font-extrabold leading-tight tracking-[-0.035em] text-[#152238] sm:text-[24px]" style={{fontFamily:"var(--font-inter), Inter, Arial, sans-serif"}}>Qalam Works</strong><span className="mt-1 hidden text-[10px] font-semibold uppercase tracking-[.10em] text-[#607382] sm:block" style={{fontFamily:"var(--font-inter), Inter, Arial, sans-serif"}}>Write — Refine — Publish</span></span>
    </Link>
    <nav aria-label="Primary navigation" className="hidden items-center gap-1 font-sans lg:flex" dir={ur?"rtl":"ltr"}>
     {sections.map((s,i)=><div className="relative" key={s.en}>
       <button type="button" aria-expanded={open===i} aria-controls={`qalam-menu-${i}`} onClick={()=>setOpen(open===i?null:i)} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${ur?"font-nastaliq text-[15px] leading-[2.1]":""} ${!ur?"font-sans tracking-[.005em]":""} ${open===i?"bg-[#e7f5f1] text-[#0a655c]":"text-[#25394a] hover:bg-[#e7f5f1] hover:text-[#0a655c]"}`}>
        {ur?s.ur:s.en}<ChevronDown size={15} className={open===i?"rotate-180 transition-transform":"transition-transform"}/>
       </button>
       {open===i&&<div id={`qalam-menu-${i}`} className={`absolute top-full z-50 mt-2 w-[290px] rounded-2xl border border-[#e0e9ed] bg-white p-2 shadow-[0_18px_45px_#162a3c26] ${ur?"right-0":"left-0"}`} dir={ur?"rtl":"ltr"}>
        {s.tools.map(([en,ar,path,Icon,fg,bg])=><Link key={path} href={path.startsWith("/")?path:`/tools/${path}`} onClick={()=>setOpen(null)} className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[#f0f8f6] focus-visible:bg-[#f0f8f6]">
         <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${fg} ${bg}`}><Icon size={21} strokeWidth={2.1}/></span>
         <span className="min-w-0"><strong className={`block text-[#1b3543] ${ur?"font-nastaliq text-[16px] font-normal leading-[2.1]":"text-sm leading-relaxed"}`}>{ur?ar:en}</strong></span>
        </Link>)}
       </div>}
      </div>)}
    </nav>
    <div className="flex shrink-0 items-center gap-1 sm:gap-2" dir="ltr"><CompactLanguageSwitch/><button type="button" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#cbdce0] bg-[#f0f6f6] text-[#153b50] hover:bg-[#e5f2ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087c7a] lg:hidden" aria-label={mobile?"Close menu":"Open menu"} aria-expanded={mobile} aria-controls="mobile-nav" onClick={()=>{setMobile(!mobile);setOpen(null)}}>{mobile?<X size={20}/>:<Menu size={20}/>}</button></div>
   </div>
  </header>
  {mobile&&<nav id="mobile-nav" aria-label={ur?"موبائل مینو":"Mobile menu"} className="max-h-[75vh] overflow-y-auto border-b bg-white p-4 shadow-xl lg:hidden" dir={ur?"rtl":"ltr"}>
   {sections.map((s,i)=><div key={s.en} className="border-b border-slate-100">
    <button className={`flex w-full items-center justify-between py-3 font-semibold text-[#25394a] ${ur?"font-nastaliq text-base leading-[2.1]":""}`} aria-expanded={open===i} onClick={()=>setOpen(open===i?null:i)}>{ur?s.ur:s.en}<ChevronDown size={16}/></button>
    {open===i&&<div className="pb-2">{s.tools.map(([en,ar,path,Icon,fg,bg])=><Link key={path} href={path.startsWith("/")?path:`/tools/${path}`} onClick={()=>{setOpen(null);setMobile(false)}} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-[#f0f8f6]"><span className={`grid size-9 place-items-center rounded-lg ${fg} ${bg}`}><Icon size={19}/></span><span className={`text-[#25394a] ${ur?"font-nastaliq text-base leading-[2.1]":"text-sm font-medium"}`}>{ur?ar:en}</span></Link>)}</div>}
   </div>)}
  </nav>}
 </div>
}
