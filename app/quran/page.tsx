"use client";
import {useEffect} from "react";
export default function QuranIndexPage(){
 useEffect(()=>{const m=/^(\d{1,3}):(\d{1,3})$/.exec(location.hash.slice(1));
   location.replace(m ? "/quran/indopak-digital-khatt/"+m[1]+"/"+m[2] : "/quran/madinah/1/1");},[]);
 return <main role="status" aria-label="Opening Madinah Quran" className="min-h-[40vh] p-8 text-center">Opening Madinah Quran…</main>;
}
