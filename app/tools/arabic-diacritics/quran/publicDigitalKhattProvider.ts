import raw from "../../../../public/quran/indopak-digital-khatt.json";
import { HAFS_AYAH_COUNTS } from "./hafsCounts";
import { createQuranReference, quranReferenceHash } from "./reference";
import { alignDigitalKhattToTranslation, type DigitalKhattCorpus } from "../../../quran/indopak-digital-khatt/data";
import type { QuranAyah } from "./types";
/** Original DigitalKhatt snapshot (MIT upstream; quran-json CC BY-SA 4.0).
 * Only Fatiha boundaries are aligned to the already-published Urdu translation.
 */
const source=alignDigitalKhattToTranslation(raw as DigitalKhattCorpus);
const ayahs: QuranAyah[]=[];
for(let surah=1;surah<=114;surah++){
  const rows=source[String(surah)]??[];
  if(rows.length!==HAFS_AYAH_COUNTS[surah-1])throw new Error("DigitalKhatt count: "+surah);
  for(let i=0;i<rows.length;i++){
    const v=rows[i];
    if(v.chapter!==surah||v.verse!==i+1||!v.text)throw new Error("DigitalKhatt identity "+surah+":"+i);
    ayahs.push({surah,ayah:v.verse,id:surah+":"+v.verse,text:v.text});
  }
}
if(ayahs.length!==6236)throw new Error("DigitalKhatt must contain exactly 6236 ayahs");
const hash=quranReferenceHash(ayahs);
export const publicDigitalKhattQuranReference=createQuranReference(ayahs,{
  referenceName:"DigitalKhatt IndoPak Quran",referenceEdition:"Qalam Urdu translation-aligned",
  referenceScript:"Indo-Pakistani",referenceSource:"https://github.com/risan/quran-json",
  referenceVersion:"data/digitalkhatt/quran.json (immutable snapshot)",
  referenceLicense:"MIT upstream / CC BY-SA 4.0 distribution",referenceVerifiedAt:null,
  verseCountConvention:"hafs-6236",provenanceStatus:"source-attributed",
  tajCompanyOfficial:false,referenceHash:hash,expectedHash:hash,
});
