// Paragraph-based segmentation for Translation Studio.
// One non-empty paragraph = one segment. Deterministic, no sentence splitting.

import { detectBlockDirection } from "../../document-studio/utils/plainTextToDocNode";
import type { TranslationLanguage, TranslationSegment } from "./translationTypes";
import { languageDir } from "./translationTypes";

/** Stable segment ID format: SEG-0001 */
export function makeSegmentId(order: number): string {
  return `SEG-${String(order).padStart(4, "0")}`;
}

/** Simple non-cryptographic fingerprint — SHA-ish using hash code. Deterministic. */
export function segmentFingerprint(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (Math.imul(31, h) + text.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Splits raw text into TranslationSegments, one per non-empty paragraph.
 * Empty lines are skipped. Source is immutable and never normalized here.
 */
export function segmentText(
  text: string,
  sourceLanguage: TranslationLanguage,
  targetLanguage: TranslationLanguage
): TranslationSegment[] {
  const fallbackSourceDir = languageDir(sourceLanguage);
  const fallbackTargetDir = languageDir(targetLanguage);
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
  return lines.map((line, i) => ({
    id: makeSegmentId(i + 1),
    order: i + 1,
    source: line,
    target: "",
    sourceDir: detectBlockDirection(line, fallbackSourceDir),
    targetDir: fallbackTargetDir,
    status: "untranslated" as const,
    sourceFingerprint: segmentFingerprint(line),
  }));
}

/**
 * Determines a target's effective direction: if target has strong-script text,
 * use first-strong on that; otherwise use the target-language fallback.
 */
export function resolveTargetDir(
  targetText: string,
  targetLanguage: TranslationLanguage
): "rtl" | "ltr" {
  if (targetText.trim().length === 0) return languageDir(targetLanguage);
  return detectBlockDirection(targetText, languageDir(targetLanguage));
}

/** Status transition rules. */
export type StatusTransition = {
  from: "untranslated" | "draft" | "final" | "*";
  event: "edit" | "set_final" | "clear";
  to: "untranslated" | "draft" | "final";
};

export function nextStatus(
  current: "untranslated" | "draft" | "final",
  event: "edit" | "set_final" | "clear"
): "untranslated" | "draft" | "final" {
  if (event === "clear") return "untranslated";
  if (event === "set_final") return "final";
  // edit: untranslated→draft, draft stays draft, final→draft (edited)
  if (event === "edit") return current === "untranslated" ? "draft" : current === "final" ? "draft" : "draft";
  return current;
}
