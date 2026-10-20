"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useLayoutEffect,useRef,useState} from "react";
import {ChevronDown,Menu,X,PenLine} from "lucide-react";
import {TOOL_GROUPS,toolsInGroup} from "../lib/toolCatalog";
import {useLanguage} from "../lib/language-context";



function CompactLanguageSwitch(){
 const {language,setLanguage}=useLanguage();
 return <div role="group" aria-label={language==="ur"?"سائٹ کی زبان":"Site language"} dir="ltr" className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full border border-[#111827] bg-[#101820] p-[2px] shadow-sm sm:h-9 sm:p-[3px]">
  <button type="button" lang="en" aria-pressed={language==="en"} onClick={()=>setLanguage("en")} className={`flex h-[26px] min-w-[44px] sm:h-[28px] items-center justify-center rounded-full px-1 text-[13px] sm:min-w-[54px] sm:px-2 font-semibold transition-colors ${language==="en"?"bg-[#059669] text-white shadow-sm":"text-[#d1d5db] hover:text-white"}`}>English</button>
  <button type="button" lang="ur" dir="rtl" style={{fontSize:"26px",lineHeight:1}} aria-pressed={language==="ur"} onClick={()=>setLanguage("ur")} className={`flex h-[26px] min-w-[44px] sm:h-[28px] items-center justify-center rounded-full px-1 font-nastaliq sm:min-w-[48px] sm:px-2 text-[24px] leading-[1.9] transition-colors ${language==="ur"?"bg-[#059669] text-white shadow-sm":"text-[#d1d5db] hover:text-white"}`}>اردو</button>
 </div>;
}

export default function Header(){
 const {language}=useLanguage();const ur=language==="ur";const pathname=usePathname();
 const [open,setOpen]=useState<number|null>(null);const [mobile,setMobile]=useState(false);
 const wrap=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const header=wrap.current;
  if(!header)return;
  const update=()=>document.documentElement.style.setProperty("--site-header-height",`${header.getBoundingClientRect().height}px`);
  update();
  const observer=new ResizeObserver(update);observer.observe(header);
  return()=>observer.disconnect();
 },[]);
 useEffect(()=>{setOpen(null);setMobile(false)},[pathname]);
 useEffect(()=>{const down=(e:MouseEvent)=>{if(!wrap.current?.contains(e.target as Node))setOpen(null)};const key=(e:KeyboardEvent)=>{if(e.key==="Escape"){setOpen(null);setMobile(false)}};document.addEventListener("mousedown",down);document.addEventListener("keydown",key);return()=>{document.removeEventListener("mousedown",down);document.removeEventListener("keydown",key)}},[]);
 return <div className="sticky top-0 z-50" data-site-header ref={wrap}>
  <div style={{backgroundColor:"#153b62",backgroundImage:"linear-gradient(105deg,#153b62 0%,#135a79 55%,#087c7a 100%)"}}>
   <div className="site-container flex min-h-[44px] items-center justify-end gap-2 py-1 px-4" dir="ltr">
    {([["About","تعارف","/about"],["Services","خدمات","/services"],["Contact","رابطہ","/contact"]] as const).map(([en,ar,href])=><Link key={href} href={href} className={`inline-flex h-8 items-center justify-center rounded-full border border-white/40 px-4 py-0 font-semibold text-white hover:bg-white/15 ${ur?"font-nastaliq text-[15px] leading-[2]":"text-xs"}`}>{ur?ar:en}</Link>)}
   </div>
  </div>
  <header className="border-b border-[#dce6eb] bg-white shadow-[0_6px_24px_#1a405513]">
   <div className="site-container flex min-h-[68px] items-center justify-between gap-1 !px-3 sm:min-h-[84px] sm:gap-3 sm:!px-6 lg:gap-4" dir="ltr">
    <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 font-sans sm:gap-3 lg:flex-none" dir="ltr">
     <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#12a082] to-[#086656] text-white shadow-md sm:h-12 sm:w-12 sm:rounded-xl"><PenLine className="h-5 w-5 sm:h-6 sm:w-6"/></span>
     <span className="min-w-0"><strong className="block truncate whitespace-nowrap text-[18px] font-extrabold leading-tight tracking-[-0.035em] text-[#152238] sm:text-[24px]" style={{fontFamily:"var(--font-inter), Inter, Arial, sans-serif"}}>Qalam Works</strong><span className={`mt-1 hidden font-semibold text-[#607382] sm:block ${ur?"font-nastaliq text-[15px] normal-case tracking-normal":"text-[10px] uppercase tracking-[.10em]"}`} style={ur?{fontFamily:"var(--qalam-urdu-primary)",fontSize:15,letterSpacing:0,lineHeight:1.8}:{fontFamily:"var(--font-inter), Inter, Arial, sans-serif"}} dir={ur?"rtl":"ltr"}>{ur?"لکھیں — سنواریں — شائع کریں":"Write — Refine — Publish"}</span></span>
    </Link>

    <nav aria-label="Primary navigation" className="hidden min-w-0 flex-1 items-center justify-center gap-1 font-sans lg:flex" dir={ur?"rtl":"ltr"}>
     {TOOL_GROUPS.map((s,i)=><div className="relative" key={s.id}>
       <button type="button" aria-expanded={open===i} aria-controls={`qalam-menu-${i}`} style={{fontSize:16,lineHeight:ur?1.8:1.5}} onClick={()=>setOpen(open===i?null:i)} className={`inline-flex items-center gap-1 rounded-xl px-2 py-3 text-sm font-semibold transition-colors ${ur?"font-nastaliq text-[16px] leading-[2.1]":""} ${!ur?"font-sans tracking-[.005em]":""} ${open===i?"bg-[#e7f5f1] text-[#0a655c]":"text-[#25394a] hover:bg-[#e7f5f1] hover:text-[#0a655c]"}`}>
        <span className="whitespace-nowrap text-center">{s.name[language]}</span><ChevronDown size={15} className={open===i?"rotate-180 transition-transform":"transition-transform"}/>
       </button>
       {open===i&&<div id={`qalam-menu-${i}`} className={`absolute top-full z-50 mt-2 max-h-[calc(100dvh-150px)] w-[290px] overflow-y-auto rounded-2xl border border-[#e0e9ed] bg-white p-2 shadow-[0_18px_45px_#162a3c26] ${i===TOOL_GROUPS.length-1?"end-0": "start-0"}`} dir={ur?"rtl":"ltr"}>
        {toolsInGroup(s).map(({route,Icon,iconColor:fg,iconBg:bg,name})=><Link key={route} href={route} onClick={()=>setOpen(null)} className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[#f0f8f6] focus-visible:bg-[#f0f8f6]">
         <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${fg} ${bg}`}><Icon size={21} strokeWidth={2.1}/></span>
         <span className="min-w-0"><strong className={`block text-[#1b3543] ${ur?"font-nastaliq text-[16px] font-normal leading-[2.1]":"text-sm leading-relaxed"}`}>{name[language]}</strong></span>
        </Link>)}
       </div>}
      </div>)}
    </nav>
    <div className="flex shrink-0 items-center gap-1 sm:gap-2" dir="ltr"><CompactLanguageSwitch/><button type="button" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#cbdce0] bg-[#f0f6f6] text-[#153b50] hover:bg-[#e5f2ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087c7a] lg:hidden" aria-label={ur?(mobile?"مینو بند کریں":"مینو کھولیں"):(mobile?"Close menu":"Open menu")} aria-expanded={mobile} aria-controls="mobile-nav" onClick={()=>{setMobile(!mobile);setOpen(null)}}>{mobile?<X size={20}/>:<Menu size={20}/>}</button></div>
   </div>

  </header>
  {mobile&&<nav id="mobile-nav" aria-label={ur?"موبائل مینو":"Mobile menu"} className="max-h-[calc(100dvh-112px)] overflow-y-auto border-b bg-white p-4 shadow-xl lg:hidden" dir={ur?"rtl":"ltr"}>
   {TOOL_GROUPS.map((s,i)=><div key={s.id} className="border-b border-slate-100">
    <button className={`flex w-full items-center justify-between py-3 font-semibold text-[#25394a] ${ur?"font-nastaliq text-base leading-[2.1]":""}`} aria-expanded={open===i} onClick={()=>setOpen(open===i?null:i)}>{s.name[language]}<ChevronDown size={16}/></button>
    {open===i&&<div className="pb-2">{toolsInGroup(s).map(({route,Icon,iconColor:fg,iconBg:bg,name})=><Link key={route} href={route} onClick={()=>{setOpen(null);setMobile(false)}} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-[#f0f8f6]"><span className={`grid size-9 place-items-center rounded-lg ${fg} ${bg}`}><Icon size={19}/></span><span className={`text-[#25394a] ${ur?"font-nastaliq text-base leading-[2.1]":"text-sm font-medium"}`}>{name[language]}</span></Link>)}</div>}
   </div>)}
  </nav>}
 </div>
}
