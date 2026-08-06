// Adapter layer — no React, no editor instance, no DOM API. Takes a TipTap
// JSON document in, returns a NEW normalized document out, plus a report of
// what changed. Never mutates the document that's passed in, and never
// touches node type/marks/attrs — only the `text` field of `text` nodes.
//
// NOTE (for whoever picks up 3B.2): standardizeUrduText() runs its whitespace
// cleanup (trim + collapse repeated spaces) independently on EACH text node.
// For a paragraph that's a single text node this is exactly right. For a
// paragraph split into several inline text nodes by marks — e.g. plain
// "hello " followed by a bold "world" — trimming the first node's trailing
// space could visually join them ("helloworld"). None of the current
// Document Studio content produces that pattern yet, but a node-boundary-
// aware whitespace pass (only trim at the very start/end of a block, not at
// every inline mark boundary) would be a good hardening step before wiring
// this into a visible "Standardize Document" button.

import { standardizeUrduText } from "../../../utils/unicode/standardizeUrduText";
import type { DocNode } from "./extractPlainText";

export interface NormalizeReport {
  totalCorrections: number;
  scriptNormalizations: number;
  spacingFixes: number;
  punctuationFixes: number;
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

/** Default normalizer — wraps the existing Unicode Standardizer engine. */
export const defaultTextNormalizer: TextNormalizer = (text) => {
  const result = standardizeUrduText(text);
  return {
    output: result.output,
    scriptNormalizations: result.summary.arabicNormalizations,
    spacingFixes: result.summary.spacingFixes,
    punctuationFixes: result.summary.punctuationFixes,
  };
};

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
 * Immutably normalizes every text node in a TipTap JSON document. Node
 * type, marks, attrs, links, list structure, and direction are untouched —
 * only the literal text inside `text` nodes changes. The input document is
 * never mutated; a fully new document tree is returned.
 */
export function normalizeDocumentNodes(
  doc: DocNode,
  normalizeText: TextNormalizer = defaultTextNormalizer
): NormalizeDocumentResult {
  const acc: Accumulator = { scriptNormalizations: 0, spacingFixes: 0, punctuationFixes: 0, changed: false };
  const normalized = normalizeNode(doc, normalizeText, acc);

  return {
    document: normalized,
    report: {
      totalCorrections: acc.scriptNormalizations + acc.spacingFixes + acc.punctuationFixes,
      scriptNormalizations: acc.scriptNormalizations,
      spacingFixes: acc.spacingFixes,
      punctuationFixes: acc.punctuationFixes,
    },
    changed: acc.changed,
  };
}
