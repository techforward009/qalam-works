import { processText } from "../../../../utils/processing/processText";
import type { ProcessingLanguage } from "../../../../utils/processing/types";
import type { ResearchDocumentLanguage } from "../types/document";

const PERSIAN_LETTERS = /[پچژگ]/;
const URDU_MARKERS = /[ےھ]/;
const ARABIC_SCRIPT = /[\u0600-\u06FF]/;
const LATIN = /[A-Za-z]/;

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

export function normalizePageText(rawText: string, mode: ProcessingLanguage = "auto"): string {
  if (rawText.length === 0) return "";
  return processText(rawText, mode).output;
}

export function detectDocumentLanguage(
  pages: string[],
  mode: ProcessingLanguage = "auto",
): ResearchDocumentLanguage {
  const sample = pages.join("\n").slice(0, 8000);
  if (sample.trim().length === 0) return "unknown";
  const resolved = processText(sample, mode).resolvedLanguage;
  return mapDocumentLanguage(resolved, sample);
}
