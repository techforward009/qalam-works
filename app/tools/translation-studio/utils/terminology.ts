// Pure utilities for Translation Studio terminology checking and exact-match TM.
// No UI logic, no React, no side effects. All testable independently.

import type { GlossaryEntry, TranslationProject, TranslationSegment } from "./translationTypes";

// ── Term matching ─────────────────────────────────────────────────────────────

/** NFC-normalize for matching only; never mutates stored text. */
function normForMatch(s: string): string {
  return s.normalize("NFC");
}

/** Unicode-aware word-boundary check: ch is a "word" character if it is a
 *  Unicode letter, number, combining mark or connector punctuation.
 *  This avoids JS's Latin-centric \b which treats Arabic/Urdu as non-word. */
function isWordChar(ch: string): boolean {
  // Quick ASCII fast path
  if (ch >= "a" && ch <= "z") return true;
  if (ch >= "A" && ch <= "Z") return true;
  if (ch >= "0" && ch <= "9") return true;
  // Unicode categories via regex
  return /[\p{L}\p{N}\p{M}\p{Pc}]/u.test(ch);
}

/**
 * Returns true iff `text` contains `term` as a standalone word (not as part
 * of a longer word). Both are NFC-normalized for comparison only.
 * For non-ASCII scripts, boundaries are detected via isWordChar() so
 * Arabic/Urdu terms work correctly. English matching is case-insensitive.
 */
export function containsTerm(text: string, term: string, caseSensitive = false): boolean {
  const haystack = normForMatch(caseSensitive ? text : text.toLowerCase());
  const needle = normForMatch(caseSensitive ? term : term.toLowerCase());
  if (!needle) return false;
  let start = 0;
  while (true) {
    const idx = haystack.indexOf(needle, start);
    if (idx === -1) return false;
    const before = idx > 0 ? haystack[idx - 1] : "";
    const after = idx + needle.length < haystack.length ? haystack[idx + needle.length] : "";
    const leftOk = !before || !isWordChar(before);
    const rightOk = !after || !isWordChar(after);
    if (leftOk && rightOk) return true;
    start = idx + 1;
  }
}

export interface TerminologyFinding {
  entry: GlossaryEntry;
}

/**
 * Returns findings for every glossary source term found in `source` whose
 * approved target is absent from `target`. Empty target → no findings
 * (untranslated segments are not cluttered with glossary warnings).
 */
export function findTerminologyFindings(
  source: string,
  target: string,
  glossary: GlossaryEntry[]
): TerminologyFinding[] {
  if (!target.trim()) return []; // no warnings for untranslated segments
  const findings: TerminologyFinding[] = [];
  for (const entry of glossary) {
    if (!containsTerm(source, entry.sourceTerm)) continue;
    if (containsTerm(target, entry.targetTerm, true)) continue; // approved term present
    findings.push({ entry });
  }
  return findings;
}

// ── Duplicate glossary check ──────────────────────────────────────────────────

/**
 * Returns true iff a glossary already contains a term equal to `sourceTerm`.
 * English: case-insensitive. Other scripts: character-exact.
 */
export function isDuplicateTerm(glossary: GlossaryEntry[], sourceTerm: string, excludeId?: string): boolean {
  const needle = normForMatch(sourceTerm.trim().toLowerCase());
  return glossary.some((e) => e.id !== excludeId && normForMatch(e.sourceTerm.trim().toLowerCase()) === needle);
}

// ── Exact-match Translation Memory ───────────────────────────────────────────

export interface MemorySuggestion {
  sourceSegmentId: string;
  target: string;
  status: "final" | "draft";
}

/**
 * Finds the best exact-match TM suggestion for a segment.
 * Eligible: same source, different id, non-empty target, and EARLIER order
 * than the current segment (future segments are never suggested).
 * Preference: Final over Draft; within same status, nearest previous (highest order).
 */
export function findExactMemorySuggestion(
  segment: TranslationSegment,
  allSegments: TranslationSegment[]
): MemorySuggestion | null {
  const candidates = allSegments
    .filter((s) => s.id !== segment.id && s.source === segment.source && s.target.trim().length > 0 && s.order < segment.order)
    .sort((a, b) => {
      if (a.status === "final" && b.status !== "final") return -1;
      if (b.status === "final" && a.status !== "final") return 1;
      return b.order - a.order; // nearest earlier = highest order first
    });
  if (candidates.length === 0) return null;
  const best = candidates[0];
  return { sourceSegmentId: best.id, target: best.target, status: best.status as "final" | "draft" };
}

/**
 * Returns true iff the same source appears in multiple segments with
 * distinct non-empty target text — a consistency warning.
 */
export function hasRepeatedSourceConflict(
  segment: TranslationSegment,
  allSegments: TranslationSegment[]
): boolean {
  const peers = allSegments.filter((s) => s.id !== segment.id && s.source === segment.source && s.target.trim().length > 0);
  const uniqueTargets = new Set(peers.map((s) => s.target.trim()));
  if (segment.target.trim().length > 0) uniqueTargets.add(segment.target.trim());
  return uniqueTargets.size > 1;
}
