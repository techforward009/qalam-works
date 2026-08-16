/**
 * Batch 17B.2 — Deterministic Translation QA.
 * Pure functions, no React, no side effects. All findings are DERIVED STATE.
 *
 * Scope: numeric integrity, percentage integrity, reference-marker integrity,
 * bracket structure, double-quote structure, suspicious identical source/target.
 *
 * Explicitly NOT in scope: date reformatting (number components are still
 * compared), duplicate spaces, grammar/spelling, semantic faithfulness,
 * glossary mismatch (handled by 17B.1 terminology.ts), repeated-source
 * conflict (handled by 17B.1 terminology.ts).
 */

import type { TranslationSegment, TranslationLanguage } from "./translationTypes";

export type QASeverity = "critical" | "warning" | "info";

export interface QAIssue {
  code: string;
  severity: QASeverity;
  message: string;
}

// ── Unicode digit normalisation ───────────────────────────────────────────────

/** Normalise Arabic-Indic (٠-٩) and Persian/Urdu (۰-۹) digits to ASCII 0-9.
 *  Matching-only: never mutates stored text. */
function normaliseDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, c => String(c.codePointAt(0)! - 0x0660))
    .replace(/[۰-۹]/g, c => String(c.codePointAt(0)! - 0x06F0));
}

/** Normalise number string: remove thousands separators (comma, Arabic ٬)
 *  that sit between digits; convert Arabic decimal separator ٫ to period. */
function canonicalNumber(raw: string): string {
  let s = normaliseDigits(raw);
  s = s.replace(/(\d)[٬,](\d)/g, "$1$2"); // thousands separator
  s = s.replace(/(\d)[٫.](\d)/g, "$1.$2"); // Arabic OR ASCII decimal separator
  return s;
}

// ── Percentage extraction ─────────────────────────────────────────────────────

const PCT_WORDS = /\s*(?:%|٪|percent|per\s+cent|فیصد|بالمئة|في\s+المئة|بالمائة|في\s+المائة|درصد)/gu;

/** Returns the numeric value of each percentage expression in text.
 *  Supports Arabic decimal ٫, Eastern digits, and written forms (case-insensitive). */
function extractPercentageValues(text: string): string[] {
  const re = /([٠-٩۰-۹\d][٬,.٠-٩۰-۹٫\d]*)\s*(?:%|٪|percent|per\s+cent|فیصد|بالمئة|في\s+المئة|بالمائة|في\s+المائة|درصد)/gui;
  return [...text.matchAll(re)].map(m => canonicalNumber(m[1]));
}

/** Mask all percentage expressions in text with a placeholder. */
function maskPercentages(text: string): string {
  const re = /[٠-٩۰-۹\d][٬,.٠-٩۰-۹٫\d]*\s*(?:%|٪|percent|per\s+cent|فیصد|بالمئة|في\s+المئة|بالمائة|في\s+المائة|درصد)/gui;
  return text.replace(re, "PCT_MASKED");
}

// ── Reference-marker extraction ───────────────────────────────────────────────

/** Extracts reference markers [N] and (N) with digit-normalised values. */
function extractRefValues(text: string): string[] {
  const re = /\[([^\]]+)\]|\(([^)]+)\)/g;
  const results: string[] = [];
  for (const m of text.matchAll(re)) {
    const inner = m[1] ?? m[2];
    const normed = normaliseDigits(inner.trim());
    // Only pure-numeric references
    if (/^\d+$/.test(normed)) results.push(normed);
  }
  return results;
}

/** Mask reference markers so their digits are not also counted as general numbers. */
function maskRefs(text: string): string {
  return text.replace(/\[[^\]]+\]|\([^)]+\)/g, m => {
    const inner = m.slice(1, -1);
    if (/^[٠-٩۰-۹\d]+$/.test(inner.trim())) return "REF_MASKED";
    return m;
  });
}

// ── General number extraction ─────────────────────────────────────────────────

/** Extracts canonical numeric values from text (after masking percentages
 *  and references to avoid double-reporting).
 *  Date-like patterns (YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY) are extracted
 *  as their component values — allowing reordering, as per spec §8. */
// extractNumbers is now split into a bilateral function used by runSegmentQA
// ── Date-aware masking ────────────────────────────────────────────────────────
//
// Conservative approach: detect date-like spans in BOTH source and target,
// then mask their numeric components before general number comparison.
// This prevents false positives when a date is reformatted (e.g. 2026-08-16
// → 16 اگست 2026) without adding any DATE_MISMATCH logic.
//
// Strategy:
//  - Identify numeric date spans in the source (YYYY-MM-DD or DD/MM/YYYY etc.)
//  - For each, find the corresponding date span in the target:
//    either numeric (compare year+month+day) or textual-month (compare year+day,
//    treat numeric month as represented by text — no month-name dictionary needed)
//  - Mask matched components from general number extraction
//
// Changed day or changed year will still mismatch because those numerics won't
// appear in the target's date span.

interface DateSpan {
  year: string;
  month: string;   // empty if textual in target
  day: string;
  raw: string;     // matched text to replace
}

const NUM_DATE_SRC = /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b|\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/g;

function extractNumericDates(normed: string): DateSpan[] {
  const results: DateSpan[] = [];
  for (const m of normed.matchAll(NUM_DATE_SRC)) {
    if (m[1]) {
      results.push({ year: m[1], month: m[2], day: m[3], raw: m[0] });
    } else {
      // DD/MM/YYYY or DD-MM-YYYY
      results.push({ year: m[6], month: m[5], day: m[4], raw: m[0] });
    }
  }
  return results;
}

// Match textual-month date: day + non-digit month word + year, or year + non-digit + day
const TEXTUAL_DATE = /\b(\d{1,4})\s+[^\d\s،,،.]+\s+(\d{4})\b|\b(\d{4})\s+[^\d\s،,،.]+\s+(\d{1,2})\b/g;

interface TextualDateMatch { day: string; year: string; raw: string }

function extractTextualDates(text: string): TextualDateMatch[] {
  const results: TextualDateMatch[] = [];
  for (const m of text.matchAll(TEXTUAL_DATE)) {
    if (m[1] && m[2]) {
      results.push({ day: m[1], year: m[2], raw: m[0] }); // DD MONTH YYYY
    } else if (m[3] && m[4]) {
      results.push({ day: m[4], year: m[3], raw: m[0] }); // YYYY MONTH DD
    }
  }
  return results;
}

/**
 * Masks date components in both texts so they are skipped in general number
 * comparison. Returns the two masked strings. This is purely for masking —
 * no DATE_MISMATCH is ever emitted. Date value changes are still caught when
 * both sides use purely numeric dates (the component numbers differ).
 */
function maskDates(srcNormed: string, tgtNormed: string): [string, string] {
  const srcDates = extractNumericDates(srcNormed);
  const tgtDates = extractNumericDates(tgtNormed);
  const tgtTextDates = extractTextualDates(tgtNormed);

  let maskedSrc = srcNormed;
  let maskedTgt = tgtNormed;

  for (const sd of srcDates) {
    // Try to find a matching numeric date in target
    const numMatch = tgtDates.find(td => td.year === sd.year && td.month === sd.month && td.day === sd.day);
    if (numMatch) {
      maskedSrc = maskedSrc.replace(sd.raw, "DATE_MASKED");
      maskedTgt = maskedTgt.replace(numMatch.raw, "DATE_MASKED");
      continue;
    }
    // Try a textual-month date: year and day must match; month is text
    const txtMatch = tgtTextDates.find(td => td.year === sd.year && td.day === sd.day);
    if (txtMatch) {
      maskedSrc = maskedSrc.replace(sd.raw, "DATE_MASKED");
      maskedTgt = maskedTgt.replace(txtMatch.raw, "DATE_MASKED");
    }
    // No match: leave unmasked so mismatch is detectable
  }
  return [maskedSrc, maskedTgt];
}
function multisetEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const countA: Record<string, number> = {};
  for (const v of a) countA[v] = (countA[v] ?? 0) + 1;
  const countB: Record<string, number> = {};
  for (const v of b) countB[v] = (countB[v] ?? 0) + 1;
  for (const k of Object.keys(countA)) {
    if (countA[k] !== (countB[k] ?? 0)) return false;
  }
  return true;
}

function normaliseText(text: string): string {
  return normaliseDigits(text)
    .replace(/(\d)[٬,](\d)/g, "$1$2")
    .replace(/(\d)٫(\d)/g, "$1.$2");
}

function extractNumbersFromNormed(text: string): string[] {
  return [...text.matchAll(/\d[\d.]*(?:\.\d+)?/g)]
    .map(m => m[0].replace(/\.$/, ""))
    .filter(n => n.length > 0);
}

// ── Bracket structure ─────────────────────────────────────────────────────────

const PAIRS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const OPENS = new Set(["(", "[", "{"]);
const CLOSES = new Set([")", "]", "}"]);

interface BracketResult { balanced: boolean; pairCount: number }

/** Check bracket structure. To avoid double-reporting with REFERENCE_MISMATCH,
 *  mask valid numeric reference markers before counting pairs. */
function checkBrackets(text: string): BracketResult {
  const maskedText = maskRefs(text); // exclude [N] and (N) from bracket counting
  const stack: string[] = [];
  let pairCount = 0;
  for (const ch of maskedText) {
    if (OPENS.has(ch)) { stack.push(ch); continue; }
    if (CLOSES.has(ch)) {
      if (stack.length === 0 || PAIRS[stack[stack.length - 1]] !== ch) return { balanced: false, pairCount };
      stack.pop();
      pairCount++;
    }
  }
  return { balanced: stack.length === 0, pairCount };
}

// ── Quote structure ───────────────────────────────────────────────────────────

type QuoteClose = '"' | "\u201D" | "\u00BB";

const QUOTE_PAIRS: Record<string, QuoteClose> = {
  '"': '"',           // ASCII straight → straight (toggle)
  "\u201C": "\u201D", // " → "
  "\u00AB": "\u00BB", // « → »
};
const QUOTE_OPENS = new Set(['"', "\u201C", "\u00AB"]);
const QUOTE_CLOSES = new Set(['"', "\u201D", "\u00BB"]);

/** Count quoted spans tracking expected closing character per quote style.
 *  Returns -1 on structural mismatch (mismatched open/close pair, unclosed span). */
function countQuotedSpans(text: string): number {
  const stack: QuoteClose[] = [];
  let spans = 0;
  for (const ch of text) {
    if (QUOTE_OPENS.has(ch) && stack.length === 0) {
      // ASCII " can also close an ASCII-opened span
      if (ch === '"' && stack.length === 0) {
        stack.push('"');
        continue;
      }
      stack.push(QUOTE_PAIRS[ch] as QuoteClose);
      continue;
    }
    if (QUOTE_CLOSES.has(ch)) {
      if (stack.length === 0) return -1;
      const expected = stack[stack.length - 1];
      // ASCII " can close an ASCII span
      if (expected === '"' && ch === '"') { stack.pop(); spans++; continue; }
      if (ch === expected) { stack.pop(); spans++; continue; }
      return -1; // mismatched pair
    }
  }
  if (stack.length > 0) return -1; // unclosed
  return spans;
}

// ── Identical source/target ───────────────────────────────────────────────────

const URL_LIKE = /^https?:\/\//i;
const EMAIL_LIKE = /@.+\./;

function isSubstantialText(text: string): boolean {
  // Require ≥12 Unicode letters AND ≥2 word-like runs
  const letters = [...text.matchAll(/\p{L}/gu)].length;
  if (letters < 12) return false;
  const words = text.trim().split(/\s+/).filter(w => /\p{L}/u.test(w));
  return words.length >= 2;
}

function normaliseForIdentical(s: string): string {
  return s.normalize("NFC").trim().replace(/\s+/g, " ");
}

// ── Main QA runner ────────────────────────────────────────────────────────────

export function runSegmentQA(
  segment: TranslationSegment,
  sourceLanguage: TranslationLanguage,
  targetLanguage: TranslationLanguage
): QAIssue[] {
  const issues: QAIssue[] = [];
  const src = segment.source;
  const tgt = segment.target;

  // CRITICAL: Final with empty target
  if (segment.status === "final" && !tgt.trim()) {
    issues.push({ code: "FINAL_TARGET_EMPTY", severity: "critical", message: "Segment is marked Final but has no target text" });
    return issues; // no further checks make sense
  }

  // No warnings for untranslated/empty target
  if (!tgt.trim()) return issues;

  // ── Percentage ──────────────────────────────────────────────────────────────
  const srcPcts = extractPercentageValues(src);
  const tgtPcts = extractPercentageValues(tgt);
  if (srcPcts.length > 0 || tgtPcts.length > 0) {
    if (!multisetEqual(srcPcts, tgtPcts)) {
      issues.push({ code: "PERCENTAGE_MISMATCH", severity: "warning", message: `Percentage value differs: source has [${srcPcts.join(", ")}], target has [${tgtPcts.join(", ")}]` });
    }
  }

  // ── References ──────────────────────────────────────────────────────────────
  const srcRefs = extractRefValues(src);
  const tgtRefs = extractRefValues(tgt);
  if (srcRefs.length > 0 || tgtRefs.length > 0) {
    if (!multisetEqual(srcRefs, tgtRefs)) {
      issues.push({ code: "REFERENCE_MISMATCH", severity: "warning", message: `Reference marker differs: source has [${srcRefs.map(r => `[${r}]`).join(", ")}], target has [${tgtRefs.map(r => `[${r}]`).join(", ")}]` });
    }
  }

  // ── Numbers (after masking percentages + refs) ───────────────────────────────
  // ── Numbers (bilateral date masking + percentage + ref masking) ─────────────
  const srcPreMasked = maskRefs(maskPercentages(src));
  const tgtPreMasked = maskRefs(maskPercentages(tgt));
  const srcNormBase = normaliseText(srcPreMasked);
  const tgtNormBase = normaliseText(tgtPreMasked);
  const [srcDateMasked, tgtDateMasked] = maskDates(srcNormBase, tgtNormBase);
  const srcNums = extractNumbersFromNormed(srcDateMasked);
  const tgtNums = extractNumbersFromNormed(tgtDateMasked);
  if (!multisetEqual(srcNums, tgtNums)) {
    issues.push({ code: "NUMBER_MISMATCH", severity: "warning", message: `Numeric values differ: source [${srcNums.join(", ")}], target [${tgtNums.join(", ")}]` });
  }

  // ── Bracket structure ────────────────────────────────────────────────────────
  const srcBrackets = checkBrackets(src);
  const tgtBrackets = checkBrackets(tgt);
  if (!tgtBrackets.balanced) {
    issues.push({ code: "BRACKET_UNBALANCED", severity: "warning", message: "Bracket structure in target is unbalanced or incorrectly nested" });
  } else if (srcBrackets.balanced && srcBrackets.pairCount !== tgtBrackets.pairCount) {
    issues.push({ code: "BRACKET_COUNT_DIFFERS", severity: "info", message: `Bracket pair count differs: source has ${srcBrackets.pairCount}, target has ${tgtBrackets.pairCount}` });
  }

  // ── Quote structure ──────────────────────────────────────────────────────────
  const srcQuotes = countQuotedSpans(src);
  const tgtQuotes = countQuotedSpans(tgt);
  if (tgtQuotes === -1) {
    issues.push({ code: "QUOTE_UNBALANCED", severity: "warning", message: "Quotation marks in target appear unbalanced" });
  } else if (srcQuotes >= 0 && srcQuotes !== tgtQuotes) {
    issues.push({ code: "QUOTE_COUNT_DIFFERS", severity: "info", message: `Quoted span count differs: source has ${srcQuotes}, target has ${tgtQuotes}` });
  }

  // ── Identical source/target ──────────────────────────────────────────────────
  if (sourceLanguage !== targetLanguage) {
    const nSrc = normaliseForIdentical(src);
    const nTgt = normaliseForIdentical(tgt);
    if (nSrc === nTgt && !URL_LIKE.test(nSrc) && !EMAIL_LIKE.test(nSrc) && isSubstantialText(nSrc)) {
      issues.push({ code: "SOURCE_TARGET_IDENTICAL", severity: "info", message: "Source and target are identical — review if intentional" });
    }
  }

  return issues;
}

// ── Project-level summary ─────────────────────────────────────────────────────

export interface QASummary {
  critical: number;
  warning: number;
  info: number;
  total: number;
  untranslatedCount: number;
  segmentIssues: Map<string, QAIssue[]>;
}

export function runProjectQA(
  segments: TranslationSegment[],
  sourceLanguage: TranslationLanguage,
  targetLanguage: TranslationLanguage
): QASummary {
  let critical = 0, warning = 0, info = 0, untranslatedCount = 0;
  const segmentIssues = new Map<string, QAIssue[]>();
  for (const seg of segments) {
    if (!seg.target.trim() && seg.status !== "final") untranslatedCount++;
    const issues = runSegmentQA(seg, sourceLanguage, targetLanguage);
    if (issues.length > 0) segmentIssues.set(seg.id, issues);
    for (const issue of issues) {
      if (issue.severity === "critical") critical++;
      else if (issue.severity === "warning") warning++;
      else info++;
    }
  }
  return { critical, warning, info, total: critical + warning + info, untranslatedCount, segmentIssues };
}
