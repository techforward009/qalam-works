"use client";
import Link from "next/link";
import {useState,useRef,useEffect} from "react";
import {createPortal} from "react-dom";
import {useRouter} from "next/navigation";

export function StudioHomeButton({dirty}:{dirty:boolean}){
 const [confirm,setConfirm]=useState(false);const router=useRouter();const stay=useRef<HTMLButtonElement>(null),link=useRef<HTMLAnchorElement>(null);
 useEffect(()=>{if(confirm)stay.current?.focus();},[confirm]);
 const close=()=>{setConfirm(false);link.current?.focus();};
 return <>
  <Link ref={link} href="/" data-studio-home title="Home" aria-label="Home" className="me-1 inline-flex h-4 w-4 shrink-0 items-center justify-center text-black" onClick={event=>{if(dirty){event.preventDefault();setConfirm(true);}}}>
   <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M1.5 7 8 1.5 14.5 7M3.5 5.5V14h3V9h3v5h3V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/></svg>
  </Link>
  {confirm?createPortal(<div data-studio-dialog="en" data-studio-zoom-scope className="fixed inset-0 z-[150] grid place-items-center bg-black/30 p-4" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){event.preventDefault();const buttons=[...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')];buttons[document.activeElement===buttons[0]?1:0]?.focus();}}}>
   <div role="dialog" aria-modal="true" aria-labelledby="studio-leave-title" dir="ltr" className="w-full max-w-sm border border-gray-500 bg-white p-4 text-black shadow-xl" style={{fontFamily:'Tahoma, Arial, sans-serif',fontSize:13}}>
    <p id="studio-leave-title">You have unsaved changes. Leave Qalam Page?</p>
    <div className="mt-4 flex justify-end gap-2"><button type="button" className="border px-3 py-1" onClick={()=>router.push('/')}>Leave</button><button ref={stay} type="button" className="border px-3 py-1" onClick={close}>Stay</button></div>
   </div>
  </div>,document.body):null}
 </>;
}
