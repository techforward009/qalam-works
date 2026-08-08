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

/**
 * DOCX-specific fix (2026-08-08, revised same day). Bug: every imported
 * .docx paragraph was followed by a spurious extra blank paragraph that
 * didn't exist in the original Word file.
 *
 * Root cause, confirmed empirically (generated real .docx files with the
 * `docx` package, extracted them with mammoth, inspected the exact raw
 * string): mammoth.extractRawText() always appends "\n\n" (two newlines)
 * after EVERY paragraph, blank or not, including the very last one. It is
 * mammoth's own paragraph separator, not an indication of an actual blank
 * line in the source. A genuine blank paragraph then shows up as "\n\n\n\n"
 * (the normal separator plus the blank paragraph's own separator).
 *
 * Revision (same day): the first version of this fix collapsed every
 * "\n\n" to "\n" but left mammoth's own trailing "\n\n" behind as one
 * extra trailing "\n" after collapsing — producing a spurious final blank
 * paragraph that doesn't exist in the source. Confirmed empirically that
 * this trailing artifact is *always* exactly one extra "\n\n" pair beyond
 * whatever genuine trailing content the document has:
 *   - 3 clean paragraphs, no trailing blank → ends "...\n\n" (1 pair, all artifact)
 *   - 2 real + 1 genuine trailing blank    → ends "...\n\n\n\n" (2 pairs: 1 genuine blank + 1 artifact)
 *   - 1 real + 2 genuine trailing blanks   → ends "...\n\n\n\n\n\n" (3 pairs: 2 genuine blanks + 1 artifact)
 * So after collapsing, stripping exactly ONE trailing "\n" (not all
 * trailing newlines) removes only the universal artifact — any genuine
 * trailing blank paragraph(s) still leave their own newline(s) behind.
 *
 * plainTextToDocNode() itself is left completely unchanged — it already
 * treats a single "\n" as a real line break and an empty line as a blank
 * paragraph, which is exactly the semantics this produces.
 *
 * DOCX-only: never applied to .txt imports, whose blank lines (and
 * trailing newline, if any) are already meaningful as-is and must not be
 * touched.
 */
export function normalizeDocxParagraphBreaks(rawText: string): string {
  const collapsed = rawText.replace(/\n\n/g, "\n");
  return collapsed.replace(/\n$/, "");
}
