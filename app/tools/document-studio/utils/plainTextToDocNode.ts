import type { DocNode } from "./extractPlainText";

/**
 * Converts flat plain text into a minimal TipTap-shaped DocNode — one
 * paragraph per line, empty lines preserved as empty paragraphs.
 *
 * Used wherever text arrives with no known structure (an extracted .txt/
 * .docx file, or standardized/cleaned output that's already been flattened
 * to plain text) and needs to become a real DocNode for the editor or the
 * DOCX exporter. This is deliberately honest, not a guess: it does NOT
 * attempt to infer headings, lists, or bold from the plain text — those
 * are simply not knowable at this point, so every line becomes a plain
 * paragraph rather than pretending otherwise.
 *
 * Moved here 2026-08-08 from a local copy inside DocumentCleanerTool.tsx —
 * now shared by both Document Cleaner (cleaned-text → DOCX export) and
 * Document Studio (uploaded .txt/.docx → editor import), so both places
 * changing their conversion logic can never drift apart into two
 * different behaviors for the same operation.
 */
export function plainTextToDocNode(text: string): DocNode {
  const lines = text.split(/\r\n|\r|\n/);
  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      content: line.length > 0 ? [{ type: "text", text: line }] : undefined,
    })),
  };
}
