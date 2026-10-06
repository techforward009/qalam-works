import type { KnowledgePassage } from "./retrieval";

// A translated edition can include Arabic-only quotations inside its commentary.
export function hasAnswerLanguageText(text: string, locale: "ur" | "en"): boolean {
  if (locale === "en") {
    const words = text.toLowerCase().split(/[^a-z]+/);
    const englishWords = new Set(["the", "a", "an", "and", "or", "is", "are", "was", "were", "be", "been", "to", "of", "in", "for", "from", "with", "by", "on", "at", "that", "who", "which", "you", "your", "he", "his", "we", "our", "they", "their", "it", "its", "not", "do", "does", "all", "except", "only", "this", "those", "one"]);
    return words.some(word => englishWords.has(word));
  }
  const words = text.normalize("NFC").replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "").split(/[^\p{L}]+/u);
  const urduWords = new Set(["ہے", "ہیں", "ہوں", "تھا", "تھی", "تھے", "اور", "میں", "سے", "پر", "کو", "کا", "کی", "کے", "کہ", "یہ", "وہ", "جو", "لیکن", "نہیں", "اپنے", "اپنی"]);
  return words.some(word => urduWords.has(word));
}
export function hasSuppliedAnswerText(passage: KnowledgePassage, locale: "ur" | "en"): boolean {
  return passage.language === locale && hasAnswerLanguageText(passage.text, locale) || passage.suppliedTranslation?.language === locale && hasAnswerLanguageText(passage.suppliedTranslation.text, locale);
}
