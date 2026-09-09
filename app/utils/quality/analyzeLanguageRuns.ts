/**
 * LI-1 — deterministic run-level script analysis.
 * Pure functions only: no DOM, React, network, or models.
 * Offsets always refer to the original source string.
 */

import {
  EMAIL_LIKE_REGEX,
  FILENAME_LIKE_REGEX,
  PRESERVE_MARKER_REGEX,
  TECHNICAL_ACRONYM_REGEX,
  URL_LIKE_REGEX,
  freshRegex,
  isArabicScriptContext,
  scriptContextForText,
  splitParagraphs,
  type ParagraphScriptContext,
} from "./sharedTextPatterns";

export type ScriptRunKind = "arabic" | "latin" | "numeric" | "neutral" | "protected";

export interface ScriptRun {
  kind: ScriptRunKind;
  text: string;
  start: number;
  end: number;
}

export interface ParagraphRunAnalysis {
  text: string;
  start: number;
  end: number;
  context: ParagraphScriptContext;
  runs: ScriptRun[];
}

export interface DocumentRunAnalysis {
  paragraphs: ParagraphRunAnalysis[];
}

const LATIN_LETTER = /[A-Za-z]/;
const WHITESPACE_ONLY = /^[\s]+$/;

function classifyChar(ch: string): Exclude<ScriptRunKind, "protected"> {
  const code = ch.charCodeAt(0);
  if ((code >= 0x0660 && code <= 0x0669) || (code >= 0x06f0 && code <= 0x06f9) || (code >= 0x30 && code <= 0x39)) {
    return "numeric";
  }
  if (code >= 0x0600 && code <= 0x06ff) return "arabic";
  if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return "latin";
  return "neutral";
}

function markProtected(text: string): boolean[] {
  const flags = new Array<boolean>(text.length).fill(false);
  const mark = (pattern: RegExp) => {
    const regex = freshRegex(pattern);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const end = match.index + match[0].length;
      for (let i = match.index; i < end; i++) flags[i] = true;
    }
  };
  mark(PRESERVE_MARKER_REGEX);
  mark(URL_LIKE_REGEX);
  mark(EMAIL_LIKE_REGEX);
  mark(FILENAME_LIKE_REGEX);
  mark(TECHNICAL_ACRONYM_REGEX);
  return flags;
}

function mergeAdjacent(runs: ScriptRun[]): ScriptRun[] {
  const out: ScriptRun[] = [];
  for (const run of runs) {
    const last = out[out.length - 1];
    if (last && last.kind === run.kind && last.end === run.start) {
      last.text += run.text;
      last.end = run.end;
    } else {
      out.push({ kind: run.kind, text: run.text, start: run.start, end: run.end });
    }
  }
  return out;
}

/** Merge latin/arabic/numeric runs split only by whitespace into one meaningful run. */
function absorbWhitespaceGaps(runs: ScriptRun[]): ScriptRun[] {
  const out: ScriptRun[] = [];
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (run.kind !== "neutral" || !WHITESPACE_ONLY.test(run.text)) {
      out.push({ kind: run.kind, text: run.text, start: run.start, end: run.end });
      continue;
    }
    const prev = out[out.length - 1];
    const next = runs[i + 1];
    if (prev && next && prev.kind === next.kind && (prev.kind === "latin" || prev.kind === "arabic" || prev.kind === "numeric")) {
      prev.text += run.text;
      prev.end = run.end;
      continue;
    }
    out.push({ kind: run.kind, text: run.text, start: run.start, end: run.end });
  }
  return mergeAdjacent(out);
}

export function analyzeScriptRuns(text: string): ScriptRun[] {
  if (!text) return [];
  const protectedAt = markProtected(text);
  const raw: ScriptRun[] = [];
  let i = 0;
  while (i < text.length) {
    const kind: ScriptRunKind = protectedAt[i] ? "protected" : classifyChar(text[i]);
    let j = i + 1;
    while (j < text.length) {
      const nextKind: ScriptRunKind = protectedAt[j] ? "protected" : classifyChar(text[j]);
      if (nextKind !== kind) break;
      j++;
    }
    raw.push({ kind, text: text.slice(i, j), start: i, end: j });
    i = j;
  }
  return absorbWhitespaceGaps(raw);
}

export function analyzeParagraphRuns(text: string, start = 0): ParagraphRunAnalysis {
  return {
    text,
    start,
    end: start + text.length,
    context: scriptContextForText(text),
    runs: analyzeScriptRuns(text),
  };
}

export function analyzeDocumentRuns(blocks: readonly string[]): DocumentRunAnalysis {
  const paragraphs: ParagraphRunAnalysis[] = [];
  let offset = 0;
  for (let i = 0; i < blocks.length; i++) {
    const text = blocks[i];
    paragraphs.push(analyzeParagraphRuns(text, offset));
    offset += text.length + 1;
  }
  return { paragraphs };
}

export function latinIntrusionRuns(analysis: DocumentRunAnalysis): Array<ScriptRun & { paragraph: ParagraphRunAnalysis }> {
  const found: Array<ScriptRun & { paragraph: ParagraphRunAnalysis }> = [];
  for (const paragraph of analysis.paragraphs) {
    if (!isArabicScriptContext(paragraph.context)) continue;
    for (const run of paragraph.runs) {
      if (run.kind === "latin" && LATIN_LETTER.test(run.text)) {
        found.push({ ...run, paragraph });
      }
    }
  }
  return found;
}

export function countLatinIntrusionsFromAnalysis(analysis: DocumentRunAnalysis): number {
  return latinIntrusionRuns(analysis).length;
}

export function countLatinIntrusions(text: string): number {
  return countLatinIntrusionsFromAnalysis(analyzeDocumentRuns(splitParagraphs(text)));
}
