import {permanentRedirect,notFound} from "next/navigation";
export default async function LegacyQuranSurah({params}:{params:Promise<{surah:string}>}){
 const {surah}=await params;const s=Number(surah);
 if(!/^\d{1,3}$/.test(surah)||s<1||s>114)notFound();
 permanentRedirect("/quran/indopak-digital-khatt/"+s+"/1");
}

export async function generateStaticParams() { return []; }
export const revalidate = 86400;
