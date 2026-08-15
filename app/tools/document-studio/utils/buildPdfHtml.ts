// Document Studio PDF HTML adapter — pure/sync.
// Fonts and direction resolve through the central font registry.

import type { DocNode, Direction } from "./extractPlainText";
import {
  collectPdfEmbedFonts,
  directionForNode,
  resolveEditorFontFamily,
  type FontResolution,
  type StudioFontDefinition,
} from "./fontRegistry";

export interface PdfFontFace {
  familyName: string;
  /** One or more woff2 subset payloads for regular weight */
  regularSources: string[];
  /** One or more woff2 subset payloads for bold weight */
  boldSources?: string[];
}

export interface PdfFonts {
  faces: PdfFontFace[];
}

export interface PdfHtmlResult {
  html: string;
  fontsUsed: string[];
  fontFallbacks: Array<{ requested: string; used: string }>;
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
    ? `text-align:${ALIGN_STYLE[textAlign]};`
    : "";
}

interface WalkCtx {
  globalDir: Direction;
  fontsUsed: Set<string>;
  fallbacks: Map<string, string>;
}

function noteResolution(ctx: WalkCtx, res: FontResolution) {
  ctx.fontsUsed.add(res.pdfFamily);
  if (res.fellBack && res.fallbackFrom) {
    ctx.fallbacks.set(res.fallbackFrom, res.pdfFamily);
  }
}

function convertInline(nodes: DocNode[] | undefined, ctx: WalkCtx, blockDir: Direction): string {
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
    const styleMark = node.marks?.find((m) => m.type === "textStyle");
    const res = resolveEditorFontFamily(styleMark?.attrs?.fontFamily, blockDir);
    noteResolution(ctx, res);

    if (bold) inner = `<strong>${inner}</strong>`;
    if (italics) inner = `<em>${inner}</em>`;
    if (typeof href === "string" && href.trim().length > 0) {
      inner = `<a href="${escapeAttr(href)}">${inner}</a>`;
    }
    inner = `<span class="${res.cssClass}">${inner}</span>`;
    html += inner;
  }

  return html;
}

function openAttrs(node: DocNode, blockDir: Direction): string {
  const styles = [
    `direction:${blockDir}`,
    "unicode-bidi:isolate",
    "text-align:start",
    alignStyleFor(node),
  ]
    .filter(Boolean)
    .join(";");
  return ` dir="${blockDir}" style="${styles}"`;
}

function convertNode(node: DocNode, ctx: WalkCtx): string {
  const blockDir = directionForNode(node, ctx.globalDir);

  switch (node.type) {
    case "paragraph":
      return `<p${openAttrs(node, blockDir)}>${convertInline(node.content, ctx, blockDir)}</p>`;
    case "heading": {
      const raw = typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      const level = Math.min(4, Math.max(1, raw));
      return `<h${level}${openAttrs(node, blockDir)}>${convertInline(node.content, ctx, blockDir)}</h${level}>`;
    }
    case "blockquote": {
      const inner = (node.content ?? [])
        .map((child) =>
          child.type === "paragraph"
            ? `<p${openAttrs(child, directionForNode(child, blockDir))}>${convertInline(child.content, ctx, directionForNode(child, blockDir))}</p>`
            : convertNode(child, ctx)
        )
        .join("");
      return `<blockquote dir="${blockDir}" style="direction:${blockDir};unicode-bidi:isolate">${inner}</blockquote>`;
    }
    case "bulletList": {
      const items = (node.content ?? [])
        .map((item) => `<li dir="${blockDir}">${convertListItemInner(item, ctx, blockDir)}</li>`)
        .join("");
      return `<ul dir="${blockDir}">${items}</ul>`;
    }
    case "orderedList": {
      const startAttr =
        typeof node.attrs?.start === "number" && node.attrs.start !== 1
          ? ` start="${node.attrs.start}"`
          : "";
      const items = (node.content ?? [])
        .map((item) => `<li dir="${blockDir}">${convertListItemInner(item, ctx, blockDir)}</li>`)
        .join("");
      return `<ol${startAttr} dir="${blockDir}">${items}</ol>`;
    }
    default:
      return (node.content ?? []).map((c) => convertNode(c, ctx)).join("");
  }
}

function convertListItemInner(item: DocNode, ctx: WalkCtx, parentDir: Direction): string {
  return (item.content ?? [])
    .map((child, i) => {
      if (i === 0 && child.type === "paragraph") {
        const d = directionForNode(child, parentDir);
        return convertInline(child.content, ctx, d);
      }
      return convertNode(child, ctx);
    })
    .join("");
}

function fontFaceCss(faces: PdfFontFace[]): string {
  const rules: string[] = [];
  for (const f of faces) {
    for (const src of f.regularSources) {
      rules.push(
        `@font-face{font-family:"${f.familyName}";src:url(data:font/woff2;base64,${src}) format("woff2");font-weight:400;font-display:block;}`
      );
    }
    for (const src of f.boldSources ?? []) {
      rules.push(
        `@font-face{font-family:"${f.familyName}";src:url(data:font/woff2;base64,${src}) format("woff2");font-weight:700;font-display:block;}`
      );
    }
  }
  return rules.join("\n");
}

function classRulesCss(): string {
  return `
  .qf-default { font-family: inherit; }
  .qf-noto-nastaliq { font-family: "Noto Nastaliq Urdu", serif; }
  .qf-amiri { font-family: Amiri, serif; }
  .qf-noto-naskh { font-family: "Noto Naskh Arabic", serif; }
  .qf-vazirmatn { font-family: Vazirmatn, sans-serif; }
  .qf-inter { font-family: Inter, system-ui, sans-serif; }
  .qf-jameel { font-family: "Noto Nastaliq Urdu", serif; }
  .qf-sahel { font-family: Vazirmatn, sans-serif; }
`;
}

export function buildPdfHtml(doc: DocNode, dir: Direction, fonts: PdfFonts): PdfHtmlResult {
  const ctx: WalkCtx = {
    globalDir: dir,
    fontsUsed: new Set(),
    fallbacks: new Map(),
  };

  const bodyHtml = (doc.content ?? []).map((n) => convertNode(n, ctx)).join("\n");

  if (ctx.fontsUsed.size === 0) {
    const def = resolveEditorFontFamily(null, dir);
    ctx.fontsUsed.add(def.pdfFamily);
  }

  const resolvedNames = [...ctx.fontsUsed];
  const availableFaceNames = new Set(fonts.faces.map((f) => f.familyName));
  // Truthful embed list: only fonts whose faces actually loaded
  const embeddedNames: string[] = resolvedNames.filter((n) => availableFaceNames.has(n));
  // If a resolved font has no face, record deterministic fallback honestly
  for (const name of resolvedNames) {
    if (!availableFaceNames.has(name)) {
      const fb = dir === "ltr" ? "Inter" : "Noto Nastaliq Urdu";
      ctx.fallbacks.set(name, fb);
      if (availableFaceNames.has(fb) && !embeddedNames.includes(fb)) {
        embeddedNames.push(fb);
      }
    }
  }
  const faces = fonts.faces.filter((f) => embeddedNames.includes(f.familyName));
  const defaultFamily =
    dir === "ltr" ? "Inter, system-ui, sans-serif" : '"Noto Nastaliq Urdu", serif';

  const html = `<!DOCTYPE html>
<html lang="${dir === "rtl" ? "ur" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8" />
<style>
${fontFaceCss(faces)}
${classRulesCss()}
  body {
    font-family: ${defaultFamily};
    font-size: 16px;
    line-height: 2;
    margin: 0;
    padding: 0;
    color: #111;
  }
  p, h1, h2, h3, li, blockquote { margin: 0.5em 0; }
  h1 { font-size: 1.6rem; }
  h2 { font-size: 1.3rem; }
  h3 { font-size: 1.15rem; }
  h4 { font-size: 1.05rem; }
  blockquote {
    border-inline-start: 3px solid #d97706;
    padding-inline-start: 1rem;
    color: #444;
  }
  a { color: #b45309; }
</style>
</head>
<body dir="${dir}">
${bodyHtml}
</body>
</html>`;

  return {
    html,
    fontsUsed: [...new Set(embeddedNames)].sort(),
    fontFallbacks: [...ctx.fallbacks.entries()].map(([requested, used]) => ({
      requested,
      used,
    })),
  };
}

export function requiredPdfEmbedFonts(
  doc: DocNode,
  dir: Direction
): StudioFontDefinition[] {
  const ctx: WalkCtx = {
    globalDir: dir,
    fontsUsed: new Set(),
    fallbacks: new Map(),
  };
  (doc.content ?? []).forEach((n) => convertNode(n, ctx));
  if (ctx.fontsUsed.size === 0) {
    ctx.fontsUsed.add(resolveEditorFontFamily(null, dir).pdfFamily);
  }
  return collectPdfEmbedFonts(ctx.fontsUsed);
}
