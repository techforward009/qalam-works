/**
 * LI-3 — context-aware punctuation.
 * Local run context decides style. Protected tokens never produce issues.
 */

import type { DocumentRunAnalysis, ParagraphRunAnalysis, ScriptRun, ScriptRunKind } from "./analyzeLanguageRuns";
import type { ProcessingLanguage, ResolvedLanguage } from "../processing/types";
import { resolveProcessingLanguage } from "../processing/detectLanguage";

export type PunctuationContext = "arabic" | "latin" | "neutral" | "protected" | "ambiguous";

export type ContextualPunctuationIssueType =
  | "comma-style"
  | "semicolon-style"
  | "question-mark-style"
  | "sentence-ending-style";

export interface ContextualPunctuationIssue {
  type: ContextualPunctuationIssueType;
  start: number;
  end: number;
  originalText: string;
  suggestedText: string;
  context: PunctuationContext;
}

export interface DocumentPunctuationAnalysis {
  issues: ContextualPunctuationIssue[];
}

const TARGETS: Record<string, { type: ContextualPunctuationIssueType; suggested: string }> = {
  ",": { type: "comma-style", suggested: "،" },
  ";": { type: "semicolon-style", suggested: "؛" },
  "?": { type: "question-mark-style", suggested: "؟" },
  ".": { type: "sentence-ending-style", suggested: "۔" },
};

const MEANINGFUL: ReadonlySet<ScriptRunKind> = new Set(["arabic", "latin", "protected"]);

function isArabicChar(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= 0x0600 && code <= 0x06ff;
}

function resolveMode(mode: ProcessingLanguage | ResolvedLanguage, text: string): ResolvedLanguage {
  if (mode === "ur" || mode === "en" || mode === "ar" || mode === "rtl-neutral") return mode;
  return resolveProcessingLanguage(mode, text || " ");
}

function runAt(runs: readonly ScriptRun[], index: number): ScriptRun | null {
  for (const run of runs) {
    if (run.start <= index && index < run.end) return run;
  }
  return null;
}

function nearestMeaningful(runs: readonly ScriptRun[], index: number, side: "left" | "right"): ScriptRun | null {
  if (side === "left") {
    for (let i = runs.length - 1; i >= 0; i--) {
      const run = runs[i];
      if (run.end <= index && MEANINGFUL.has(run.kind)) return run;
    }
    return null;
  }
  for (const run of runs) {
    if (run.start >= index && MEANINGFUL.has(run.kind)) return run;
  }
  return null;
}

function localContext(left: ScriptRun | null, right: ScriptRun | null, paragraph: ParagraphRunAnalysis): PunctuationContext {
  const l = left?.kind ?? null;
  const r = right?.kind ?? null;
  if (l === "protected" || r === "protected") return "protected";
  if (l === "arabic" && r === "arabic") return "arabic";
  if (l === "latin" && r === "latin") return "latin";
  if (l && r && l !== r) return "ambiguous";
  if (l === "latin" || r === "latin") return "latin";
  if (l === "arabic" || r === "arabic") return "arabic";
  if (paragraph.context === "arabic") return "arabic";
  if (paragraph.context === "latin") return "latin";
  return "ambiguous";
}

function prevNonSpace(text: string, index: number): string {
  for (let i = index - 1; i >= 0; i--) {
    if (!/\s/.test(text[i])) return text[i];
  }
  return "";
}

function isSentenceEndingPeriod(text: string, index: number): boolean {
  const prev = prevNonSpace(text, index);
  const next = index + 1 < text.length ? text[index + 1] : "";
  if (!isArabicChar(prev)) return false;
  if (next >= "0" && next <= "9") return false;
  if (next === "." || next === "۔") return false;
  if (next && /[A-Za-z]/.test(next)) return false;
  return !next || /\s/.test(next) || next === '"' || next === "'" || next === "”" || next === "’";
}

function shouldIssue(mark: string, context: PunctuationContext, text: string, index: number): boolean {
  if (context !== "arabic") return false;
  if (mark === "." && !isSentenceEndingPeriod(text, index)) return false;
  return true;
}

export function analyzeContextualPunctuation(
  runAnalysis: DocumentRunAnalysis,
  mode: ProcessingLanguage | ResolvedLanguage = "auto",
): DocumentPunctuationAnalysis {
  const text = runAnalysis.paragraphs.map((paragraph) => paragraph.text).join("\n");
  const resolved = resolveMode(mode, text);
  if (resolved === "en" || resolved === "rtl-neutral") return { issues: [] };

  const issues: ContextualPunctuationIssue[] = [];
  for (const paragraph of runAnalysis.paragraphs) {
    const source = paragraph.text;
    for (let i = 0; i < source.length; i++) {
      const mark = source[i];
      const target = TARGETS[mark];
      if (!target) continue;
      if (runAt(paragraph.runs, i)?.kind === "protected") continue;
      const left = nearestMeaningful(paragraph.runs, i, "left");
      const right = nearestMeaningful(paragraph.runs, i + 1, "right");
      const context = localContext(left, right, paragraph);
      if (!shouldIssue(mark, context, source, i)) continue;
      const start = paragraph.start + i;
      issues.push({
        type: target.type,
        start,
        end: start + 1,
        originalText: mark,
        suggestedText: target.suggested,
        context,
      });
    }
  }
  return { issues };
}

export function countContextualPunctuationIssues(analysis: DocumentPunctuationAnalysis): number {
  return analysis.issues.length;
}
