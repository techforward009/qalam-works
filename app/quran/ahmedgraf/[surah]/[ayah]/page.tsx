import {notFound} from "next/navigation";
import QuranReader from "../../../QuranReader";
import {ahmedgrafQuranReference} from "../../../../tools/arabic-diacritics/quran/ahmedgrafProvider";
export default async function AhmedGrafPage({params}:{params:Promise<{surah:string;ayah:string}>}){
 const {surah,ayah}=await params;const s=Number(surah),a=Number(ayah);
 if(!Number.isInteger(s)||!Number.isInteger(a)||!ahmedgrafQuranReference.getAyah(s,a))notFound();
 return <QuranReader editionId="qalam-indopak" surah={s} ayah={a}/>;
}
