// Translation Studio QA — deterministic checks per §20 of the spec.
// Pure functions, no React, no side effects. Every check runs per-segment.

import type { TranslationSegment, GlossaryEntry } from "./translationTypes";
import { findTerminologyFindings } from "./terminology";

export type QASeverity = "critical" | "warning" | "info";

export interface QAIssue {
  code: string;
  severity: QASeverity;
  message: string;
}

// ── Token extractors ──────────────────────────────────────────────────────────

function extractNumbers(text: string): string[] {
  return [...text.matchAll(/\d[\d,._]*(?:\.\d+)?%?/g)]
    .map(m => m[0].replace(/,/g, "").replace(/\.$/, "")); // strip trailing period
}

function extractDates(text: string): string[] {
  // common date patterns: 2026-08-16, 16/08/2026, 16.08.2026, August 16 etc.
  const patterns = [
    /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g,
    /\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/g,
    /\b\d{1,2}\.\d{1,2}\.\d{4}\b/g,
  ];
  const found: string[] = [];
  for (const pat of patterns) found.push(...[...text.matchAll(pat)].map(m => m[0]));
  return found;
}

function extractBracketedRefs(text: string): string[] {
  // [1], [2], (1), (a), §1, footnote markers
  return [
    ...[...text.matchAll(/\[\d+\]/g)].map(m => m[0]),
    ...[...text.matchAll(/\(\d+\)/g)].map(m => m[0]),
    ...[...text.matchAll(/§\d+/g)].map(m => m[0]),
  ];
}

function countBrackets(text: string, open: string, close: string): number {
  let count = 0;
  for (const ch of text) {
    if (ch === open) count++;
    else if (ch === close) count--;
  }
  return count;
}

function hasDuplicateSpaces(text: string): boolean {
  return /[ \t]{2,}/.test(text);
}

// ── Main QA runner ────────────────────────────────────────────────────────────

/**
 * Runs all deterministic QA checks for a single segment.
 * Returns issues in severity order: critical → warning → info.
 * Results are DERIVED STATE — computed fresh every render, never stored.
 */
export function runSegmentQA(
  segment: TranslationSegment,
  glossary: GlossaryEntry[],
  hasRepeatedConflict: boolean
): QAIssue[] {
  const issues: QAIssue[] = [];
  const src = segment.source;
  const tgt = segment.target;

  // ── CRITICAL ──────────────────────────────────────────────────────────────

  if (segment.status === "final" && !tgt.trim()) {
    issues.push({ code: "EMPTY_FINAL", severity: "critical", message: "Segment is marked Final but has no target text" });
  }

  // ── WARNINGS ──────────────────────────────────────────────────────────────

  if (!tgt.trim()) return issues; // no warnings for untranslated segments

  // Glossary mismatch (already computed in terminology, reuse)
  for (const f of findTerminologyFindings(src, tgt, glossary)) {
    issues.push({ code: "GLOSSARY_MISMATCH", severity: "warning", message: `Approved term not found: "${f.entry.sourceTerm}" → "${f.entry.targetTerm}"` });
  }

  // Repeated source / conflicting translations
  if (hasRepeatedConflict) {
    issues.push({ code: "REPEATED_SOURCE_CONFLICT", severity: "warning", message: "Same source has different translations in this project" });
  }

  // Number mismatch
  const srcNums = extractNumbers(src);
  const tgtNums = extractNumbers(tgt);
  const missingNums = srcNums.filter(n => !tgtNums.includes(n));
  if (missingNums.length > 0) {
    issues.push({ code: "NUMBER_MISMATCH", severity: "warning", message: `Number(s) in source missing from target: ${missingNums.join(", ")}` });
  }

  // Date mismatch
  const srcDates = extractDates(src);
  const tgtDates = extractDates(tgt);
  const missingDates = srcDates.filter(d => !tgtDates.includes(d));
  if (missingDates.length > 0) {
    issues.push({ code: "DATE_MISMATCH", severity: "warning", message: `Date(s) in source not found in target: ${missingDates.join(", ")}` });
  }

  // Bracketed reference mismatch
  const srcRefs = extractBracketedRefs(src);
  const tgtRefs = extractBracketedRefs(tgt);
  const missingRefs = srcRefs.filter(r => !tgtRefs.includes(r));
  if (missingRefs.length > 0) {
    issues.push({ code: "REFERENCE_MISSING", severity: "warning", message: `Reference marker(s) missing from target: ${missingRefs.join(", ")}` });
  }

  // Bracket imbalance in target
  if (countBrackets(tgt, "(", ")") !== 0) {
    issues.push({ code: "BRACKET_IMBALANCE", severity: "warning", message: "Unbalanced parentheses in target" });
  }
  if (countBrackets(tgt, "[", "]") !== 0) {
    issues.push({ code: "BRACKET_IMBALANCE_SQUARE", severity: "warning", message: "Unbalanced square brackets in target" });
  }

  // Quote imbalance in target (straight quotes only — curved quote pairs are language-specific)
  const dqCount = (tgt.match(/"/g) ?? []).length;
  if (dqCount % 2 !== 0) {
    issues.push({ code: "QUOTE_IMBALANCE", severity: "warning", message: "Unmatched double-quote in target" });
  }

  // Suspicious source=target (non-trivial identical content)
  if (src.trim().length > 10 && src.trim() === tgt.trim()) {
    issues.push({ code: "SOURCE_EQUALS_TARGET", severity: "warning", message: "Target is identical to source — verify this is intentional" });
  }

  // ── INFO ──────────────────────────────────────────────────────────────────

  if (hasDuplicateSpaces(tgt)) {
    issues.push({ code: "DUPLICATE_SPACES", severity: "info", message: "Target contains duplicate spaces" });
  }

  return issues;
}

/**
 * Project-level QA summary: total critical / warning / info counts.
 */
export interface QASummary {
  critical: number;
  warning: number;
  info: number;
  total: number;
  segmentIssues: Map<string, QAIssue[]>;
}

export function runProjectQA(
  segments: TranslationSegment[],
  glossary: GlossaryEntry[],
  conflictMap: Map<string, boolean>
): QASummary {
  let critical = 0; let warning = 0; let info = 0;
  const segmentIssues = new Map<string, QAIssue[]>();
  for (const seg of segments) {
    const issues = runSegmentQA(seg, glossary, conflictMap.get(seg.id) ?? false);
    if (issues.length > 0) segmentIssues.set(seg.id, issues);
    for (const issue of issues) {
      if (issue.severity === "critical") critical++;
      else if (issue.severity === "warning") warning++;
      else info++;
    }
  }
  return { critical, warning, info, total: critical + warning + info, segmentIssues };
}
