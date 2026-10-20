import QuranReader from "../../../QuranReader";
import {notFound} from "next/navigation";
import {HAFS_AYAH_COUNTS} from "../../../../tools/arabic-diacritics/quran/hafsCounts";
export default async function DigitalKhattAyahPage({params}:{params:Promise<{surah:string;ayah:string}>}){
 const {surah,ayah}=await params;const s=Number(surah),a=Number(ayah);
 if(!Number.isInteger(s)||!Number.isInteger(a)||s<1||s>114||a<1||a>(HAFS_AYAH_COUNTS[s-1]??0))notFound();
 return <QuranReader editionId="digital-khatt" surah={s} ayah={a}/>;
}
