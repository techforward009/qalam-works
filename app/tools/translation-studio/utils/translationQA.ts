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
  // Arabic thousands separator → remove (only between digits)
  s = s.replace(/(\d)[٬,](\d)/g, "$1$2");
  // Arabic decimal separator → period
  s = s.replace(/(\d)٫(\d)/g, "$1.$2");
  return s;
}

// ── Percentage extraction ─────────────────────────────────────────────────────

const PCT_WORDS = /\s*(?:%|٪|percent|per\s+cent|فیصد|بالمئة|في\s+المئة|بالمائة|في\s+المائة|درصد)/gu;

/** Returns the numeric value of each percentage expression in text.
 *  e.g. "75 فیصد" → ["75"], "۷۵٪" → ["75"]. */
function extractPercentageValues(text: string): string[] {
  const re = /([٠-٩۰-۹\d][٬,.٠-٩۰-۹\d]*)\s*(?:%|٪|percent|per\s+cent|فیصد|بالمئة|في\s+المئة|بالمائة|في\s+المائة|درصد)/gu;
  return [...text.matchAll(re)].map(m => canonicalNumber(m[1]));
}

/** Mask all percentage expressions in text with a placeholder so they are
 *  not also counted as general numbers. */
function maskPercentages(text: string): string {
  const re = /[٠-٩۰-۹\d][٬,.٠-٩۰-۹\d]*\s*(?:%|٪|percent|per\s+cent|فیصد|بالمئة|في\s+المئة|بالمائة|في\s+المائة|درصد)/gu;
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
function extractNumbers(text: string): string[] {
  const masked = maskRefs(maskPercentages(text));
  const normed = normaliseDigits(masked)
    .replace(/(\d)[٬,](\d)/g, "$1$2")  // thousands separator
    .replace(/(\d)٫(\d)/g, "$1.$2");    // Arabic decimal
  // Replace date-like patterns with individual components (space-separated)
  // so 2026-08-16 and 16/08/2026 both yield {2026,08,16} regardless of format.
  const withDatesExpanded = normed
    .replace(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/g, "$1 $2 $3")
    .replace(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/g, "$1 $2 $3");
  return [...withDatesExpanded.matchAll(/\d[\d.]*(?:\.\d+)?/g)]
    .map(m => m[0].replace(/\.$/, ""))
    .filter(n => n.length > 0);
}

/** Compare two arrays as multisets: same values with same multiplicity. */
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

// ── Bracket structure ─────────────────────────────────────────────────────────

const PAIRS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const OPENS = new Set(["(", "[", "{"]);
const CLOSES = new Set([")", "]", "}"]);

interface BracketResult { balanced: boolean; pairCount: number }

function checkBrackets(text: string): BracketResult {
  const stack: string[] = [];
  let pairCount = 0;
  for (const ch of text) {
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

/** Count quoted spans using double-quote systems ("", "", «»). Ignores
 *  apostrophes and single-quote forms. Returns -1 if structurally malformed. */
function countQuotedSpans(text: string): number {
  // Normalise to a simple open/close token stream
  let open = 0;
  let spans = 0;
  let inSpan = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    // ASCII double quote toggles
    if (ch === '"') {
      if (!inSpan) { inSpan = true; open++; }
      else { inSpan = false; spans++; }
      continue;
    }
    // Curly open
    if (ch === "\u201C") { inSpan = true; open++; continue; }
    // Curly close
    if (ch === "\u201D") { if (!inSpan) return -1; inSpan = false; spans++; continue; }
    // Guillemet open «
    if (ch === "\u00AB") { inSpan = true; open++; continue; }
    // Guillemet close »
    if (ch === "\u00BB") { if (!inSpan) return -1; inSpan = false; spans++; continue; }
  }
  if (inSpan) return -1; // unclosed span
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
  const srcNums = extractNumbers(src);
  const tgtNums = extractNumbers(tgt);
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
