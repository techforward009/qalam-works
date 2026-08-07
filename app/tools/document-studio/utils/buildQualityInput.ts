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

import { getBlockTexts, type DocNode } from "./extractPlainText";

/** Plain text for the Quality Checker, with paragraph boundaries preserved. */
export function buildQualityInput(doc: DocNode): string {
  return getBlockTexts(doc).join("\n");
}
