// Adapter layer — no React, no editor instance, no DOM API. Pure functions
// over a plain TipTap-shaped JSON document in, plain text out. Anything
// that needs "the document as text" (Copy button, Download button, or the
// Quality Checker input in buildQualityInput.ts) should import from this
// file rather than re-walking the document tree itself.

// A minimal structural type for a TipTap/ProseMirror JSON node. Deliberately
// not imported from @tiptap/core — this file has zero package dependencies
// so it can be tested and reused without pulling in TipTap or React. The
// real editor.getJSON() return value (type JSONContent) satisfies this shape.
export interface DocNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

export type Direction = "rtl" | "ltr";

// Concatenates the literal text inside a single block node (paragraph,
// heading, one list item's own paragraph, etc.), following inline marks
// (bold/italic/link) transparently and turning an explicit line break
// (Shift+Enter → hardBreak node) into "\n".
function nodeText(node: DocNode): string {
  if (!node.content) return "";
  return node.content
    .map((child) => {
      if (child.type === "text") return child.text ?? "";
      if (child.type === "hardBreak") return "\n";
      return nodeText(child);
    })
    .join("");
}

// ROLLED BACK 2026-08-07, BRIEFLY RESTORED AND RE-REVERTED 2026-08-08.
// A brief restoration of RLM marks here (to fix "1." reordering when a
// downloaded .txt is opened directly in Word) was itself reverted the same
// day: a 3-way comparison (direct clipboard paste vs. opening the
// downloaded .txt vs. opening a .docx) showed paste already renders
// numbering AND brackets correctly with NO marks at all — Word inherits
// the paste target's context. Since paste and file-open share the exact
// same string, adding marks to fix file-open risks reintroducing the
// exact paste regression from the earlier LRM incident, for a benefit
// that's no longer worth the risk: `.txt` is now positioned as a plain-
// text-only export (see the Download .txt / .docx button labels), with
// DOCX as the actual Word-quality path. See KNOWN-LIMITATIONS.md.
function formatOrderedPrefix(n: number): string {
  return `${n}. `;
}

function walkForDisplay(node: DocNode, lines: string[], dir: Direction, listPrefix?: string) {
  switch (node.type) {
    case "paragraph":
    case "heading": {
      const text = nodeText(node);
      lines.push(listPrefix ? `${listPrefix}${text}` : text);
      break;
    }
    case "blockquote": {
      node.content?.forEach((child) => walkForDisplay(child, lines, dir, listPrefix));
      break;
    }
    case "bulletList": {
      node.content?.forEach((item) => walkForDisplay(item, lines, dir, "• "));
      break;
    }
    case "orderedList": {
      const start = typeof node.attrs?.start === "number" ? (node.attrs.start as number) : 1;
      node.content?.forEach((item, i) => walkForDisplay(item, lines, dir, formatOrderedPrefix(start + i)));
      break;
    }
    case "listItem": {
      // Only the list item's own first block gets the number/bullet prefix;
      // further nested blocks (nested lists, extra paragraphs) are walked
      // without repeating the prefix.
      node.content?.forEach((child, i) => walkForDisplay(child, lines, dir, i === 0 ? listPrefix : undefined));
      break;
    }
    default: {
      node.content?.forEach((child) => walkForDisplay(child, lines, dir, listPrefix));
    }
  }
}

/**
 * Plain text for Copy Text / Download .txt — mirrors what's shown on
 * screen: each block on its own line, "1. "/"2. " numbering and "• "
 * bullets reconstructed (they're CSS-only in the editor, not real text).
 * Joined with \r\n so line breaks render correctly in every Notepad
 * variant, not just Word.
 */
export function extractPlainText(doc: DocNode, dir: Direction): string {
  const lines: string[] = [];
  (doc.content ?? []).forEach((node) => walkForDisplay(node, lines, dir));
  return lines.join("\r\n");
}

// Walks the document collecting one raw-text entry per block — no list
// numbering/bullets, no bidi markers, no direction handling. This is the
// shared traversal buildQualityInput.ts uses so headings/list items/
// blockquote lines stay on separate lines for the Quality Checker (which
// treats each newline-separated chunk as its own paragraph) without also
// pulling in Copy/Download's display-only decorations.
function walkForBlocks(node: DocNode, lines: string[]) {
  switch (node.type) {
    case "paragraph":
    case "heading": {
      lines.push(nodeText(node));
      break;
    }
    default: {
      node.content?.forEach((child) => walkForBlocks(child, lines));
    }
  }
}

/** One raw-text string per block (paragraph/heading/list-item line/quote line), in document order. */
export function getBlockTexts(doc: DocNode): string[] {
  const lines: string[] = [];
  (doc.content ?? []).forEach((node) => walkForBlocks(node, lines));
  return lines;
}

// Shared Analysis Context (2026-08-09) — reduces the 8 independent
// getBlockTexts(doc) traversals measured per analysis cycle (across
// buildDocumentStats, buildDocumentHealthReport→buildDocumentAuditReport,
// and generateDocumentSuggestions) down to 1, by computing the block
// list ONCE and letting each consumer accept it instead of re-walking
// the DocNode itself. No caching, no memoization, no provider — this is
// just a plain, immutable value object passed as a normal function
// argument; a fresh one is created per analysis cycle, same as before,
// just shared within that cycle instead of recomputed 8 times.
//
// `joinedText` uses "\n" as the separator, matching the convention
// buildQualityInput.ts and generateDocumentSuggestions.ts already used
// before this change. buildDocumentStats.ts joins blocks with " "
// instead (its own established convention, for word/character
// counting) — it uses `context.blocks` directly and does its own join,
// rather than `context.joinedText`, so its behavior is byte-for-byte
// unchanged.
export interface DocumentAnalysisContext {
  readonly blocks: readonly string[];
  readonly joinedText: string;
}

export function createDocumentAnalysisContext(doc: DocNode): DocumentAnalysisContext {
  const blocks = getBlockTexts(doc);
  return Object.freeze({
    blocks: Object.freeze(blocks),
    joinedText: blocks.join("\n"),
  });
}
