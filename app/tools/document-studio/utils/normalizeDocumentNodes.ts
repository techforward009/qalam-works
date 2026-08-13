// Adapter layer — no React, no editor instance, no DOM API. Takes a TipTap
// JSON document in, returns a NEW normalized document out, plus a report of
// what changed. Never mutates the document that's passed in, and never
// touches node type/marks/attrs — only the `text` field of `text` nodes.
//
// Language-aware: uses processText(mode) so Studio shares Document Cleaner's
// safety contract (auto → rtl-neutral, never silent Urdu maps).

import { processText } from "../../../utils/processing/processText";
import type { ProcessingLanguage, ResolvedLanguage, DocumentDirection } from "../../../utils/processing/types";
import type { DocNode } from "./extractPlainText";
import { extractPlainText } from "./extractPlainText";

export interface NormalizeReport {
  totalCorrections: number;
  scriptNormalizations: number;
  spacingFixes: number;
  punctuationFixes: number;
  resolvedLanguage: ResolvedLanguage;
  direction: DocumentDirection;
}

export interface NormalizeDocumentResult {
  document: DocNode;
  report: NormalizeReport;
  changed: boolean;
}

/** A single text node's worth of normalization. Swappable for testing. */
export type TextNormalizer = (text: string) => {
  output: string;
  scriptNormalizations: number;
  spacingFixes: number;
  punctuationFixes: number;
};

/** Mode-aware normalizer — shared processText engine. */
export function createModeNormalizer(mode: ProcessingLanguage): TextNormalizer {
  return (text) => {
    const result = processText(text, mode);
    return {
      output: result.output,
      scriptNormalizations: result.summary.arabicNormalizations,
      spacingFixes: result.summary.spacingFixes,
      punctuationFixes: result.summary.punctuationFixes,
    };
  };
}

/** Default normalizer — historical Urdu path (explicit "ur"). */
export const defaultTextNormalizer: TextNormalizer = createModeNormalizer("ur");

interface Accumulator {
  scriptNormalizations: number;
  spacingFixes: number;
  punctuationFixes: number;
  changed: boolean;
}

function cloneNode(node: DocNode): DocNode {
  const cloned: DocNode = { ...node };
  if (node.attrs) cloned.attrs = { ...node.attrs };
  if (node.marks) cloned.marks = node.marks.map((mark) => ({ ...mark, attrs: mark.attrs ? { ...mark.attrs } : undefined }));
  return cloned;
}

function normalizeNode(node: DocNode, normalizeText: TextNormalizer, acc: Accumulator): DocNode {
  const cloned = cloneNode(node);

  if (node.type === "text") {
    if (typeof node.text === "string" && node.text.length > 0) {
      const result = normalizeText(node.text);
      acc.scriptNormalizations += result.scriptNormalizations;
      acc.spacingFixes += result.spacingFixes;
      acc.punctuationFixes += result.punctuationFixes;
      if (result.output !== node.text) acc.changed = true;
      cloned.text = result.output;
    }
    return cloned;
  }

  if (node.content) {
    cloned.content = node.content.map((child) => normalizeNode(child, normalizeText, acc));
  }
  return cloned;
}

/**
 * Immutably normalizes every text node in a TipTap JSON document.
 * @param mode Processing language (default "ur" preserves historical callers/tests).
 */
export function normalizeDocumentNodes(
  doc: DocNode,
  mode: ProcessingLanguage = "ur",
  normalizeText: TextNormalizer = createModeNormalizer(mode)
): NormalizeDocumentResult {
  const acc: Accumulator = { scriptNormalizations: 0, spacingFixes: 0, punctuationFixes: 0, changed: false };
  const normalized = normalizeNode(doc, normalizeText, acc);

  // Resolve language/direction from full document text under the selected mode
  const plain = extractPlainText(doc, "rtl");
  const resolved = processText(plain || " ", mode);

  return {
    document: normalized,
    report: {
      totalCorrections: acc.scriptNormalizations + acc.spacingFixes + acc.punctuationFixes,
      scriptNormalizations: acc.scriptNormalizations,
      spacingFixes: acc.spacingFixes,
      punctuationFixes: acc.punctuationFixes,
      resolvedLanguage: resolved.resolvedLanguage,
      direction: resolved.direction,
    },
    changed: acc.changed,
  };
}
