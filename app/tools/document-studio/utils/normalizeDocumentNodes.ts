// Adapter layer — no React, no editor instance, no DOM API. Takes a TipTap
// JSON document in, returns a NEW normalized document out, plus a report of
// what changed. Never mutates the document that's passed in, and never
// touches node type/marks/attrs — only the `text` field of `text` nodes.
//
// Language-aware: uses processText(mode) so Studio shares Document Cleaner's
// safety contract (auto → rtl-neutral, never silent Urdu maps).
//
// Rich-text boundary safety: contiguous inline text nodes inside a block are
// normalized without stripping intentional inter-node whitespace (e.g. the
// trailing space on "hello " before a bold "world"). Full processText trim
// applies only to a whole single-node block, or to logical block edges.

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

/** Mode-aware normalizer — shared processText engine (full trim). */
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
  if (node.marks)
    cloned.marks = node.marks.map((mark) => ({
      ...mark,
      attrs: mark.attrs ? { ...mark.attrs } : undefined,
    }));
  return cloned;
}

/**
 * Process core text with processText but restore leading/trailing whitespace
 * so internal TipTap text-node boundaries do not lose intentional spaces.
 * Edge whitespace is normalized to a single space (or kept if newlines).
 */
function processTextPreserveEdgeWhitespace(
  text: string,
  mode: ProcessingLanguage
): { output: string; scriptNormalizations: number; spacingFixes: number; punctuationFixes: number } {
  const leadMatch = text.match(/^\s*/);
  const trailMatch = text.match(/\s*$/);
  const lead = leadMatch ? leadMatch[0] : "";
  const trail = trailMatch && text.length > lead.length ? trailMatch[0] : "";
  const coreStart = lead.length;
  const coreEnd = text.length - trail.length;
  const core = coreEnd > coreStart ? text.slice(coreStart, coreEnd) : "";

  if (!core) {
    // Whitespace-only node: keep a single space if it was only spaces/tabs
    // (preserves inter-word gap); leave newlines alone.
    if (/^[ \t]+$/.test(text)) return { output: " ", scriptNormalizations: 0, spacingFixes: text.length > 1 ? 1 : 0, punctuationFixes: 0 };
    return { output: text, scriptNormalizations: 0, spacingFixes: 0, punctuationFixes: 0 };
  }

  const result = processText(core, mode);
  const outLead = lead ? (/[\n\r]/.test(lead) ? lead : " ") : "";
  const outTrail = trail ? (/[\n\r]/.test(trail) ? trail : " ") : "";
  return {
    output: outLead + result.output + outTrail,
    scriptNormalizations: result.summary.arabicNormalizations,
    spacingFixes: result.summary.spacingFixes,
    punctuationFixes: result.summary.punctuationFixes,
  };
}

function applyResult(
  node: DocNode,
  result: { output: string; scriptNormalizations: number; spacingFixes: number; punctuationFixes: number },
  acc: Accumulator
): DocNode {
  const cloned = cloneNode(node);
  acc.scriptNormalizations += result.scriptNormalizations;
  acc.spacingFixes += result.spacingFixes;
  acc.punctuationFixes += result.punctuationFixes;
  if (result.output !== node.text) acc.changed = true;
  cloned.text = result.output;
  return cloned;
}

/** True for nodes that act as hard breaks inside a block's inline content. */
function isInlineBreaker(node: DocNode): boolean {
  return node.type === "hardBreak";
}

/**
 * Normalize a block's child list: consecutive text nodes form a run.
 * - Single text node in a run: full processText (block-edge trim OK when the
 *   run is the only content, or when adjacent to breakers/start/end).
 * - Multiple text nodes: edge-preserving process so "hello " + bold "world"
 *   stays "hello world".
 */
function normalizeInlineContent(
  content: DocNode[],
  mode: ProcessingLanguage,
  normalizeText: TextNormalizer,
  acc: Accumulator
): DocNode[] {
  const out: DocNode[] = [];
  let i = 0;
  while (i < content.length) {
    const node = content[i];
    if (node.type === "text") {
      const run: DocNode[] = [];
      while (i < content.length && content[i].type === "text") {
        run.push(content[i]);
        i++;
      }
      if (run.length === 1) {
        const text = typeof run[0].text === "string" ? run[0].text : "";
        if (text.length > 0) {
          // Use injectable normalizer for single nodes (tests / default path)
          const result = normalizeText(text);
          out.push(applyResult(run[0], result, acc));
        } else {
          out.push(cloneNode(run[0]));
        }
      } else {
        for (const textNode of run) {
          const text = typeof textNode.text === "string" ? textNode.text : "";
          if (text.length > 0) {
            const result = processTextPreserveEdgeWhitespace(text, mode);
            out.push(applyResult(textNode, result, acc));
          } else {
            out.push(cloneNode(textNode));
          }
        }
      }
      continue;
    }

    if (isInlineBreaker(node)) {
      out.push(cloneNode(node));
      i++;
      continue;
    }

    // Nested structures (e.g. unexpected nodes) — recurse
    out.push(normalizeNode(node, mode, normalizeText, acc));
    i++;
  }
  return out;
}

function normalizeNode(
  node: DocNode,
  mode: ProcessingLanguage,
  normalizeText: TextNormalizer,
  acc: Accumulator
): DocNode {
  const cloned = cloneNode(node);

  if (node.type === "text") {
    // Orphan text node (should be rare at root) — full process
    if (typeof node.text === "string" && node.text.length > 0) {
      return applyResult(node, normalizeText(node.text), acc);
    }
    return cloned;
  }

  if (node.content) {
    cloned.content = normalizeInlineContent(node.content, mode, normalizeText, acc);
  }
  return cloned;
}

/**
 * Immutably normalizes every text node in a TipTap JSON document.
 * @param mode Processing language (default "ur" preserves historical callers/tests).
 * @param normalizeText Optional override; default is mode-aware processText.
 */
export function normalizeDocumentNodes(
  doc: DocNode,
  mode: ProcessingLanguage = "ur",
  normalizeText: TextNormalizer = createModeNormalizer(mode)
): NormalizeDocumentResult {
  const acc: Accumulator = {
    scriptNormalizations: 0,
    spacingFixes: 0,
    punctuationFixes: 0,
    changed: false,
  };
  const normalized = normalizeNode(doc, mode, normalizeText, acc);

  const plain = extractPlainText(doc, "rtl");
  const resolved = processText(plain || " ", mode);

  return {
    document: normalized,
    report: {
      totalCorrections:
        acc.scriptNormalizations + acc.spacingFixes + acc.punctuationFixes,
      scriptNormalizations: acc.scriptNormalizations,
      spacingFixes: acc.spacingFixes,
      punctuationFixes: acc.punctuationFixes,
      resolvedLanguage: resolved.resolvedLanguage,
      direction: resolved.direction,
    },
    changed: acc.changed,
  };
}
