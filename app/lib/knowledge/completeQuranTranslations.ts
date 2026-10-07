import chunk00 from "../../../public/quran/translations/00.json";
import chunk01 from "../../../public/quran/translations/01.json";
import chunk02 from "../../../public/quran/translations/02.json";
import chunk03 from "../../../public/quran/translations/03.json";
import chunk04 from "../../../public/quran/translations/04.json";
import chunk05 from "../../../public/quran/translations/05.json";
import chunk06 from "../../../public/quran/translations/06.json";
import chunk07 from "../../../public/quran/translations/07.json";
import chunk08 from "../../../public/quran/translations/08.json";
import chunk09 from "../../../public/quran/translations/09.json";
import chunk10 from "../../../public/quran/translations/10.json";
import chunk11 from "../../../public/quran/translations/11.json";
import chunk12 from "../../../public/quran/translations/12.json";
import chunk13 from "../../../public/quran/translations/13.json";
import chunk14 from "../../../public/quran/translations/14.json";
import chunk15 from "../../../public/quran/translations/15.json";
import chunk16 from "../../../public/quran/translations/16.json";
import chunk17 from "../../../public/quran/translations/17.json";
import chunk18 from "../../../public/quran/translations/18.json";
import chunk19 from "../../../public/quran/translations/19.json";
import chunk20 from "../../../public/quran/translations/20.json";
import chunk21 from "../../../public/quran/translations/21.json";
import chunk22 from "../../../public/quran/translations/22.json";
import chunk23 from "../../../public/quran/translations/23.json";
import chunk24 from "../../../public/quran/translations/24.json";
import { translationGlobalIndex } from "../../quran/reader/translationCorpus";
const rows:readonly (readonly string[])[]=[
...chunk00,...chunk01,...chunk02,...chunk03,...chunk04,...chunk05,...chunk06,...chunk07,...chunk08,...chunk09,...chunk10,...chunk11,...chunk12,...chunk13,...chunk14,...chunk15,...chunk16,...chunk17,...chunk18,...chunk19,...chunk20,...chunk21,...chunk22,...chunk23,...chunk24];
/** Reuse the exact, complete reader edition without synthesizing translations. */
export function completeQuranTranslationFor(surah:number,ayah:number,locale:"ur"|"en"):string|null{
 const index=translationGlobalIndex(surah,ayah);
 return index===null?null:rows[index]?.[locale==="ur"?0:1]??null;
}
export const completeQuranTranslationCount=rows.length;
