import type { ProcessingLanguage } from "../../../../utils/processing/types";
import { adaptProcessText, mapDocumentLanguage } from "../adapter/processTextAdapter";
import type { ResearchDocumentLanguage } from "../types/document";

export { adaptProcessText, mapDocumentLanguage };

export function normalizePageText(rawText: string, mode: ProcessingLanguage = "auto"): string {
  return adaptProcessText(rawText, mode).normalizedText;
}

export function detectDocumentLanguage(
  pages: string[],
  mode: ProcessingLanguage = "auto",
): ResearchDocumentLanguage {
  const sample = pages.join("\n").slice(0, 8000);
  if (sample.trim().length === 0) return "unknown";
  return adaptProcessText(sample, mode).language;
}
