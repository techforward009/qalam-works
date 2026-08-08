// Phase PDF-Export-v1 adapter. Mirrors the same node/mark coverage as
// buildDocxDocument.ts (paragraphs, headings, bold/italic, links, hard
// breaks, blockquote, bullet/numbered lists, alignment, RTL/LTR) but
// outputs a self-contained HTML string instead of an OOXML Document —
// this is the *visual* PDF path only (see docs/KNOWN-LIMITATIONS.md's
// "PDF Export" section for why v1 does not attempt a searchable text
// layer: five independently-tested PDF engines all failed at that, and
// a follow-up hybrid-layer approach only worked for one of five
// real-world extraction tools).
//
// Deliberately pure and synchronous — no I/O, no Puppeteer here. Font
// files are read by the caller (the API route) and passed in as base64
// strings, keeping this function testable without touching the
// filesystem, matching the rest of this adapter layer's pattern.

import type { DocNode, Direction } from "./extractPlainText";

export interface PdfFonts {
  /** Base64-encoded Noto Nastaliq Urdu, regular weight (woff2). */
  nastaliqRegularBase64: string;
  /** Base64-encoded Noto Nastaliq Urdu, bold weight (woff2). */
  nastaliqBoldBase64: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(text: string): string {
  return escapeHtml(text);
}

const ALIGN_STYLE: Record<string, string> = {
  left: "left",
  center: "center",
  right: "right",
  justify: "justify",
};

function alignStyleFor(node: DocNode): string {
  const textAlign = node.attrs?.textAlign;
  return typeof textAlign === "string" && ALIGN_STYLE[textAlign]
    ? ` style="text-align:${ALIGN_STYLE[textAlign]}"`
    : "";
}

// Walks a paragraph/heading's inline content (text nodes with marks,
// hardBreak) into inline HTML. A link with no valid href falls back to
// plain formatted text rather than dropping the content — same rule as
// buildDocxDocument.ts's convertInline.
function convertInline(nodes: DocNode[] | undefined): string {
  if (!nodes) return "";
  let html = "";

  for (const node of nodes) {
    if (node.type === "hardBreak") {
      html += "<br/>";
      continue;
    }
    if (node.type !== "text" || typeof node.text !== "string" || node.text.length === 0) {
      continue;
    }

    let inner = escapeHtml(node.text);
    const bold = node.marks?.some((m) => m.type === "bold") ?? false;
    const italics = node.marks?.some((m) => m.type === "italic") ?? false;
    const linkMark = node.marks?.find((m) => m.type === "link");
    const href = linkMark?.attrs?.href;

    if (bold) inner = `<strong>${inner}</strong>`;
    if (italics) inner = `<em>${inner}</em>`;
    if (typeof href === "string" && href.trim().length > 0) {
      inner = `<a href="${escapeAttr(href)}">${inner}</a>`;
    }

    html += inner;
  }

  return html;
}

function convertNode(node: DocNode): string {
  switch (node.type) {
    case "paragraph": {
      return `<p${alignStyleFor(node)}>${convertInline(node.content)}</p>`;
    }
    case "heading": {
      const level = node.attrs?.level === 2 ? 2 : 1;
      return `<h${level}${alignStyleFor(node)}>${convertInline(node.content)}</h${level}>`;
    }
    case "blockquote": {
      const inner = (node.content ?? [])
        .map((child) => (child.type === "paragraph" ? `<p>${convertInline(child.content)}</p>` : convertNode(child)))
        .join("");
      return `<blockquote>${inner}</blockquote>`;
    }
    case "bulletList": {
      const items = (node.content ?? []).map((item) => `<li>${convertListItemInner(item)}</li>`).join("");
      return `<ul>${items}</ul>`;
    }
    case "orderedList": {
      const startAttr = typeof node.attrs?.start === "number" && node.attrs.start !== 1 ? ` start="${node.attrs.start}"` : "";
      const items = (node.content ?? []).map((item) => `<li>${convertListItemInner(item)}</li>`).join("");
      return `<ol${startAttr}>${items}</ol>`;
    }
    default: {
      // Unknown/unsupported node (tables, images — out of scope) — walk
      // children defensively rather than dropping the content silently.
      return (node.content ?? []).map(convertNode).join("");
    }
  }
}

function convertListItemInner(item: DocNode): string {
  return (item.content ?? [])
    .map((child, i) => {
      if (i === 0 && child.type === "paragraph") return convertInline(child.content);
      // Nested lists/extra paragraphs inside a list item — out of v1
      // scope (matches buildDocxDocument.ts) — render without special
      // list-item styling rather than dropping the content.
      return convertNode(child);
    })
    .join("");
}

/**
 * Pure: DocNode + direction + pre-loaded font bytes → a complete,
 * self-contained HTML document string, ready to hand to Puppeteer's
 * page.setContent(). No network fetch is ever needed at render time —
 * the font is embedded as a base64 data URI, and there is no external
 * stylesheet, script, or image reference anywhere in the output.
 */
export function buildPdfHtml(doc: DocNode, dir: Direction, fonts: PdfFonts): string {
  const bodyHtml = (doc.content ?? []).map(convertNode).join("\n");
  const isRtl = dir === "rtl";

  return `<!DOCTYPE html>
<html lang="${isRtl ? "ur" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: "Noto Nastaliq Urdu";
    src: url(data:font/woff2;base64,${fonts.nastaliqRegularBase64}) format("woff2");
    font-weight: 400;
  }
  @font-face {
    font-family: "Noto Nastaliq Urdu";
    src: url(data:font/woff2;base64,${fonts.nastaliqBoldBase64}) format("woff2");
    font-weight: 700;
  }
  body {
    font-family: ${isRtl ? '"Noto Nastaliq Urdu", serif' : '"Calibri", "Segoe UI", sans-serif'};
    font-size: 16px;
    line-height: 2;
    padding: 30px;
    color: #1a1a1a;
    margin: 0;
  }
  h1 { font-size: 1.5rem; font-weight: 700; margin: 0.75rem 0 0.5rem; }
  h2 { font-size: 1.25rem; font-weight: 700; margin: 0.65rem 0 0.4rem; }
  p { margin: 0.35rem 0; }
  ul { list-style: disc; padding-inline-start: 1.5rem; margin: 0.35rem 0; }
  ol { list-style: decimal; padding-inline-start: 1.5rem; margin: 0.35rem 0; }
  li { margin: 0.15rem 0; }
  blockquote {
    border-inline-start: 3px solid #d97706;
    padding-inline-start: 1rem;
    color: #57534e;
    font-style: italic;
    margin: 0.5rem 0;
  }
  a { color: #b45309; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
