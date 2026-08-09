// Phase 1 Professional Usability (2026-08-09) — Document Outline. Pure
// extraction from the DocNode's existing structure, no DocNode schema
// changes. Only looks at TOP-LEVEL headings (doc.content directly),
// matching the same established convention already used by
// buildDocxDocument.ts's deriveDocumentTitle and
// buildDocumentAuditReport.ts's countHeadingHierarchyIssues — TipTap/
// ProseMirror's schema doesn't allow a heading node to be nested inside
// a list item or blockquote anyway, so headings are always block-level
// siblings.

import type { DocNode } from "./extractPlainText";

export interface OutlineEntry {
  level: number;
  text: string;
  // Position of this heading within doc.content (0-based) — the editor
  // integration layer (DocumentStudioEditor.tsx) maps this back to a
  // real ProseMirror document position for "click to navigate", without
  // this pure function needing any editor/DOM dependency itself.
  blockIndex: number;
}

/**
 * Pure — extracts H1-H4 headings from a document in reading order. Levels
 * above 4 are intentionally excluded per this feature's scope (H1-H4
 * only); a document with no headings returns an empty array.
 */
export function extractDocumentOutline(doc: DocNode): OutlineEntry[] {
  const entries: OutlineEntry[] = [];

  (doc.content ?? []).forEach((node, blockIndex) => {
    if (node.type !== "heading") return;
    const level = node.attrs?.level;
    if (typeof level !== "number" || level < 1 || level > 4) return;

    const text = (node.content ?? [])
      .filter((n) => n.type === "text" && typeof n.text === "string")
      .map((n) => n.text)
      .join("");

    entries.push({ level, text, blockIndex });
  });

  return entries;
}
