const SHADDA = "\u0651";
const INVERTED_DAMMA = "\u0657";

/**
 * Presentation-only conversion for already sourced Arabic text.
 *
 * Important: this function does NOT invent tashkeel. It preserves the marks
 * present in the verified source and only applies Qalam's established
 * Pakistani publishing conventions.
 */
export function toQalamArabicPresentation(source: string): string {
  if (!source) return "";

  let out = source
    .normalize("NFC")
    .replace(/[أإ]/gu, "ا")
    .replace(/ک/gu, "ك")
    .replace(/[یے]/gu, "ي")
    .replace(/[ہھ]/gu, "ه")
    .replace(/ۃ/gu, "ة")
    .replace(/الل(?:َّ|ّٰ|ّ)?ه/gu, "اللّٰه")
    .replace(/الله/gu, "اللّٰه")
    .replace(/([\u064B-\u0650\u0652\u0670]+)\u0651/gu, `${SHADDA}$1`)
    .replace(/و(?=ا(?=$|[\s\p{P}\p{S}]))/gu, "وْ");

  out = out
    .replace(/اَنَّهُ/gu, `اَنَّه${INVERTED_DAMMA}`)
    .replace(/لَهُ/gu, `لَه${INVERTED_DAMMA}`);

  return out;
}
