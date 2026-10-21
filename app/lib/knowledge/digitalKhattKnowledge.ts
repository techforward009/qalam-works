import corpusJson from "../../../public/quran/indopak-digital-khatt.json";
import manifest from "../../../public/quran/indopak-digital-khatt-manifest.json";
import { flattenDigitalKhatt, isDigitalKhattCorpus, DIGITAL_KHATT_EDITION } from "../../quran/indopak-digital-khatt/data";
import { completeQuranTranslationFor } from "./completeQuranTranslations";
import { QURAN_TRANSLATION_SOURCES } from "../../tools/khateeb-studio/engine/quranTranslationProvider";
import type { QuranInput } from "./retrieval";

const corpus: unknown = corpusJson;
/** Unchanged reader edition; integrity checks against the shipped original
 * bytes and SHA-256 manifest are exercised by the dedicated regression suite.
 */
if (!isDigitalKhattCorpus(corpus)) throw new Error("Digital Khatt source shape is invalid");
const verses = flattenDigitalKhatt(corpus);
if (verses.length !== DIGITAL_KHATT_EDITION.verseCount ||
    Object.keys(corpus).length !== 114 ||
    manifest.textSha256.length !== 64 ||
    manifest.verses !== verses.length ||
    verses[0]?.chapter !== 1 || verses[0]?.verse !== 1 ||
    verses.at(-1)?.chapter !== 114 || verses.at(-1)?.verse !== 6) {
  throw new Error("Digital Khatt Quran source integrity failed");
}
const originalAyahs: readonly QuranInput[] = verses.map(item => ({
  surah: item.chapter,
  ayah: item.verse,
  text: item.text,
  edition: "digital-khatt",
}));
export const DIGITAL_KHATT_KNOWLEDGE_SHA256 = manifest.textSha256;

export function digitalKhattKnowledgeAyahs(locale: "ur" | "en"): QuranInput[] {
  return originalAyahs.map(ayah => {
    // Supplied translations number Fatihah's basmala as 1:1, whereas
    // Digital Khatt numbers "Alhamdu lillah" as 1:1. Do not attach a
    // mismatched translation without independently verified alignment.
    const text = ayah.surah === 1 ? null : completeQuranTranslationFor(ayah.surah, ayah.ayah, locale);
    return {
      ...ayah,
      ...(text ? { suppliedTranslation: {
        text, language: locale,
        translator: locale === "ur" ? QURAN_TRANSLATION_SOURCES.ur.translatorUr : QURAN_TRANSLATION_SOURCES.en.translatorEn,
      } } : {}),
    };
  });
}
