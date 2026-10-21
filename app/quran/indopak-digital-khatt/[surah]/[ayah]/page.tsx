import type {Metadata} from "next";
import {surahTitle} from "../../../reader/metadata";
import QuranReader from "../../../QuranReader";
import {notFound} from "next/navigation";
import {HAFS_AYAH_COUNTS} from "../../../../tools/arabic-diacritics/quran/hafsCounts";
export async function generateMetadata({params}:{params:Promise<{surah:string;ayah:string}>}):Promise<Metadata>{
 const {surah,ayah}=await params;
 return {title:`${surahTitle(Number(surah))} ${ayah} — Digital Khatt Quran | Qalam Works`};
}
export default async function DigitalKhattAyahPage({params}:{params:Promise<{surah:string;ayah:string}>}){
 const {surah,ayah}=await params;const s=Number(surah),a=Number(ayah);
 if(!Number.isInteger(s)||!Number.isInteger(a)||s<1||s>114||a<1||a>(HAFS_AYAH_COUNTS[s-1]??0))notFound();
 return <QuranReader editionId="digital-khatt" surah={s} ayah={a}/>;
}
