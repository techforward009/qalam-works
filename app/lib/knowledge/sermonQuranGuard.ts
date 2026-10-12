import { ahmedgrafQuranReference } from "../../tools/arabic-diacritics/quran/ahmedgrafProvider";
import { completeQuranTranslationFor } from "./completeQuranTranslations";
import { QURAN_TRANSLATION_SOURCES } from "../../tools/khateeb-studio/engine/quranTranslationProvider";
import type { AnswerEvidence } from "./researchAnswer";

/**
 * Pre-inference proof that every Quran verse about to be supplied to a sermon
 * model is the exact Ahmedgraf Indo-Pak original and exact named Urdu/English
 * translation already shipped with the Qalam Quran reader. No fuzzy comparison,
 * model "correction", normalized glyph substitution or external network calls.
 *
 * This does NOT validate the authenticity or interpretation of book narrations.
 */
export function verifyCanonicalSermonQuran(
 evidence:readonly AnswerEvidence[],locale:"ur"|"en"
):{verifiedAyahs:number;edition:string}{
 const quran=evidence.filter(e=>e.passage.collection==="quran");
 if(!quran.length)throw new Error("sermon-quran-mismatch");
 const metadata=ahmedgrafQuranReference.getMetadata();
 const byLocation=new Map(ahmedgrafQuranReference.listAyahs()
   .map(ayah=>[ayah.surah+":"+ayah.ayah,ayah.text]));
 const expectedTranslator=locale==="ur"
   ?QURAN_TRANSLATION_SOURCES.ur.translatorUr
   :QURAN_TRANSLATION_SOURCES.en.translatorEn;
 const seen=new Set<string>();
 for(const {passage:p} of quran){
   const at=p.quranLocation;
   const key=at?.surah+":"+at?.ayah;
   const expected=at&&byLocation.get(key);
   const translation=at&&completeQuranTranslationFor(at.surah,at.ayah,locale);
   if(!at||!expected||!translation
     ||p.language!=="ar"||p.text!==expected
     ||p.sourceSha256!==metadata.sourceSha256
     ||p.suppliedTranslation?.language!==locale
     ||p.suppliedTranslation.translator!==expectedTranslator
     ||p.suppliedTranslation.text!==translation
     ||seen.has(key))
     throw new Error("sermon-quran-mismatch");
   seen.add(key);
 }
 return {verifiedAyahs:seen.size,edition:metadata.referenceEdition};
}
