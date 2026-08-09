// Batch 1 (2026-08-09) — Document Studio's own statistics/intelligence
// layer. Pure, no I/O, no React — same adapter pattern as
// buildDocumentAuditReport.ts. Reuses getBlockTexts() (already used by
// the long-paragraph check and Quality Checker input) as the single
// source of text, rather than re-walking the DocNode tree again.
//
// Word/character counting reuses the EXACT same convention already used
// in app/actions/documentAction.ts (Document Cleaner) —
// `text.trim() ? text.trim().split(/\s+/).length : 0` — so "word count"
// means the same thing everywhere in the app, not two different
// definitions in two tools.
//
// Deliberately analysis-only: this reports what's in the document, it
// does not change or "correct" anything (no auto-conversion of numerals,
// no rewriting) — safer than a correction feature, and honest about what
// it is ("Intelligence"/detection, not "Correction").

import { getBlockTexts, type DocNode } from "./extractPlainText";
import {
  WESTERN_DIGIT_CHAR,
  ARABIC_INDIC_DIGIT_CHAR,
  URDU_INDIC_DIGIT_CHAR,
  freshRegex,
} from "../../../utils/quality/sharedTextPatterns";

export interface NumeralIntelligence {
  western: number; // 0-9
  arabicIndic: number; // ٠-٩ (U+0660–U+0669)
  urduIndic: number; // ۰-۹ (U+06F0–U+06F9, "Extended Arabic-Indic")
  isMixed: boolean; // more than one numeral system present at all
}

export interface LanguageIntelligence {
  arabicScriptChars: number;
  latinChars: number;
  arabicScriptPercent: number; // 0-100, rounded; 0 if no letters at all
  latinPercent: number; // 0-100, rounded
  dominant: "arabic-script" | "latin" | "mixed" | "none";
}

export interface DocumentStats {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  numerals: NumeralIntelligence;
  language: LanguageIntelligence;
}

// Arabic script block (covers Arabic, Persian, and Urdu letters — they
// share the same Unicode block) + Arabic Supplement, matching the same
// range convention already used elsewhere in this app (e.g.
// checkTextQuality.ts's missingSpaceAfterPunctuation check). Not moved to
// the shared module — this counts individual characters for a
// percentage calculation, a different purpose from
// generateDocumentSuggestions.ts's run-based LATIN_LETTERS_REGEX
// (/[a-zA-Z]+/g, used to find whole mixed-script spans), so despite the
// visual similarity these were never actually the same duplicated
// pattern.
const ARABIC_SCRIPT_CHAR = /[\u0600-\u06FF\u0750-\u077F]/g;
const LATIN_CHAR = /[a-zA-Z]/g;

// Maintenance Batch (2026-08-09) — numeral ranges now come from the
// shared module (previously duplicated here and in
// generateDocumentSuggestions.ts with DIFFERENT flags: this file used
// /g for .match(), the other used no flag for .test()). freshRegex(...,
// "g") constructs an independent, correctly-flagged instance each call —
// this function runs once per document analysis, so there is no
// lastIndex-leakage risk the way a loop reusing one shared object would
// have (see sharedTextPatterns.ts's own comment on why the canonical
// export has no flag at all).
function countNumerals(text: string): NumeralIntelligence {
  const western = (text.match(freshRegex(WESTERN_DIGIT_CHAR, "g")) ?? []).length;
  const arabicIndic = (text.match(freshRegex(ARABIC_INDIC_DIGIT_CHAR, "g")) ?? []).length;
  const urduIndic = (text.match(freshRegex(URDU_INDIC_DIGIT_CHAR, "g")) ?? []).length;
  const systemsPresent = [western > 0, arabicIndic > 0, urduIndic > 0].filter(Boolean).length;
  return { western, arabicIndic, urduIndic, isMixed: systemsPresent > 1 };
}

function countLanguage(text: string): LanguageIntelligence {
  const arabicScriptChars = (text.match(ARABIC_SCRIPT_CHAR) ?? []).length;
  const latinChars = (text.match(LATIN_CHAR) ?? []).length;
  const totalLetters = arabicScriptChars + latinChars;

  if (totalLetters === 0) {
    return { arabicScriptChars: 0, latinChars: 0, arabicScriptPercent: 0, latinPercent: 0, dominant: "none" };
  }

  const arabicScriptPercent = Math.round((arabicScriptChars / totalLetters) * 100);
  const latinPercent = 100 - arabicScriptPercent;

  let dominant: LanguageIntelligence["dominant"];
  if (arabicScriptPercent >= 90) dominant = "arabic-script";
  else if (latinPercent >= 90) dominant = "latin";
  else dominant = "mixed";

  return { arabicScriptChars, latinChars, arabicScriptPercent, latinPercent, dominant };
}

/** Analysis-only — computes statistics from the document, changes nothing. */
export function buildDocumentStats(doc: DocNode): DocumentStats {
  const blocks = getBlockTexts(doc);
  const fullText = blocks.join(" ");
  const trimmed = fullText.trim();

  return {
    wordCount: trimmed ? trimmed.split(/\s+/).length : 0,
    characterCount: fullText.length,
    paragraphCount: blocks.filter((b) => b.trim().length > 0).length,
    numerals: countNumerals(fullText),
    language: countLanguage(fullText),
  };
}
