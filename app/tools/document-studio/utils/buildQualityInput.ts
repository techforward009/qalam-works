// Adapter layer — no React, no editor instance, no DOM API. Prepares a
// TipTap JSON document as input for checkTextQuality() (app/utils/quality/
// checkTextQuality.ts), which treats each newline-separated chunk of its
// input as one "paragraph" for its long-paragraph check.
//
// Each heading, list item, and blockquote line is kept as its own entry
// (via getBlockTexts) and joined with a single "\n" — never merged into one
// long line — so a document made of several short headings/list items
// doesn't get flagged as one long paragraph. Display-only decorations
// (list numbering, bullets, RTL bidi marks) are intentionally left out:
// the checker should see the actual authored text, not the export markers
// extractPlainText.ts adds for Copy/Download.

import { getBlockTexts, type DocNode, type DocumentAnalysisContext } from "./extractPlainText";

/**
 * Plain text for the Quality Checker, with paragraph boundaries preserved.
 * Accepts an optional shared DocumentAnalysisContext (2026-08-09) to avoid
 * a redundant getBlockTexts(doc) traversal when the caller already has
 * one from createDocumentAnalysisContext(doc) — falls back to computing
 * it internally when not provided, so existing (doc)-only calls are
 * unaffected.
 */
export function buildQualityInput(doc: DocNode, context?: DocumentAnalysisContext): string {
  if (context) return context.joinedText;
  return getBlockTexts(doc).join("\n");
}
