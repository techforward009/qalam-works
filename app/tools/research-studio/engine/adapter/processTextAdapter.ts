/**
 * Sole Research Engine boundary around processText().
 * Does not modify app/utils/processing/processText.ts.
 * rawText is never overwritten.
 */
import { processText } from "../../../../utils/processing/processText";
import type { ProcessingLanguage } from "../../../../utils/processing/types";
import type { ResearchDocumentLanguage } from "../types/document";

const PERSIAN_LETTERS = /[پچژگ]/;
const URDU_MARKERS = /[ےھ]/;
const ARABIC_SCRIPT = /[\u0600-\u06FF]/;
const LATIN = /[A-Za-z]/;

export type AdaptedText = {
  rawText: string;
  normalizedText: string;
  language: ResearchDocumentLanguage;
  direction: "rtl" | "ltr";
};

export function mapDocumentLanguage(
  resolved: string,
  sample: string,
): ResearchDocumentLanguage {
  if (resolved === "ur") return "ur";
  if (resolved === "en") return "en";
  if (resolved === "ar") {
    if (PERSIAN_LETTERS.test(sample) && !URDU_MARKERS.test(sample)) return "fa";
    return "ar";
  }

  if (ARABIC_SCRIPT.test(sample) && LATIN.test(sample)) return "mixed";
  if (PERSIAN_LETTERS.test(sample) && !URDU_MARKERS.test(sample)) return "fa";
  if (ARABIC_SCRIPT.test(sample)) return "unknown";
  if (LATIN.test(sample)) return "en";
  return "unknown";
}

export function adaptProcessText(
  rawText: string,
  mode: ProcessingLanguage = "auto",
): AdaptedText {
  if (rawText.length === 0) {
    return { rawText, normalizedText: "", language: "unknown", direction: "ltr" };
  }
  const result = processText(rawText, mode);
  return {
    rawText,
    normalizedText: result.output,
    language: mapDocumentLanguage(result.resolvedLanguage, rawText),
    direction: result.direction,
  };
}
