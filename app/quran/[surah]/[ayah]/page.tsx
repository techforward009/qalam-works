import {permanentRedirect,notFound} from "next/navigation";
import {HAFS_AYAH_COUNTS} from "../../../tools/arabic-diacritics/quran/hafsCounts";
export default async function LegacyQuranAyah({params}:{params:Promise<{surah:string;ayah:string}>}){
 const {surah,ayah}=await params;const s=Number(surah),a=Number(ayah);
 if(!/^\d{1,3}$/.test(surah)||!/^\d{1,3}$/.test(ayah)||s<1||s>114||a<1||a>(HAFS_AYAH_COUNTS[s-1]??0))notFound();
 permanentRedirect("/quran/indopak-digital-khatt/"+s+"/"+a);
}

export async function generateStaticParams() { return []; }
export const revalidate = 86400;
