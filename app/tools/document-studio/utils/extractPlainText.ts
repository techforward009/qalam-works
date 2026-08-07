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

// "1." is plain Latin digits + a neutral period, and digits are ordered
// left-to-right by nature. Sitting right inside RTL text with no direction
// marker, the digit/period pair can visually reorder (dot before the digit).
// Wrapping it in LTR marks (U+200E — NOT U+200F/RTL, since the run needs to
// resolve as LTR to keep its own internal left-to-right order) forces the
// correct order in any app, without changing the underlying characters.
function formatOrderedPrefix(n: number, dir: Direction): string {
  return dir === "rtl" ? `\u200E${n}.\u200E ` : `${n}. `;
}

// Same idea as the numbering fix above, but for two related, distinct bidi
// problems that both showed up in one document (found 2026-08-07, confirmed
// via a live A/B test: the exact same downloaded text kept its "]...[" bug
// in Word's default RTL paragraph direction, but rendered correctly the
// moment the paragraph was switched to LTR — proving this is a mirroring
// issue, not a missing-marker issue):
//
// 1. Brackets/parens ( ) [ ] are Unicode "mirrored" characters — Word (and
//    other bidi-aware renderers) deliberately flips their GLYPH when the
//    run resolves as RTL, by design, so a "grouping" symbol still opens
//    toward the start of the text visually. That's correct behavior for
//    brackets used as grouping symbols — but wrong for brackets that are
//    just literal citation-marker characters authored as part of the text
//    (e.g. "[Reference]"), which should keep their authored shape.
// 2. Digits, same reordering risk as the "1." case above.
//
// An earlier version of this used RTL marks (U+200F) here — which did
// nothing, because the surrounding text was already RTL; adding more "this
// is RTL" markers to an already-RTL run changes nothing. The actual fix is
// the opposite: force an LTR-resolved run (U+200E) around these characters,
// which both keeps digit/period order correct AND stops the bracket
// mirroring, matching the LTR-paragraph behavior that confirmed this works.
const BIDI_WEAK_RUN = /[0-9[\]().]+/g;

function isolateBidiWeakRuns(text: string): string {
  return text.replace(BIDI_WEAK_RUN, (match) => `\u200E${match}\u200E`);
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
      node.content?.forEach((item, i) => walkForDisplay(item, lines, dir, formatOrderedPrefix(start + i, dir)));
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
 * bullets reconstructed (they're CSS-only in the editor, not real text),
 * and RTL-safe numbering when dir is "rtl". Joined with \r\n so line
 * breaks render correctly in every Notepad variant, not just Word.
 */
export function extractPlainText(doc: DocNode, dir: Direction): string {
  const lines: string[] = [];
  (doc.content ?? []).forEach((node) => walkForDisplay(node, lines, dir));
  const joined = lines.join("\r\n");
  return dir === "rtl" ? isolateBidiWeakRuns(joined) : joined;
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
