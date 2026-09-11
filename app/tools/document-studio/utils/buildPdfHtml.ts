// Document Studio PDF HTML adapter — pure/sync.
// Fonts and direction resolve through the central font registry.
// Effective CSS classes are chosen only from faces that fully loaded.

import type { DocNode, Direction } from "./extractPlainText";
import { resolveFontSizePt, type DocumentStudioSettings, validateLineHeight, validateIndentMm, validateSpacingPt } from "./documentSettings";
import { BLOCK_STYLES, isBlockStyleId } from "./documentStyles";
import {
  collectPdfEmbedFonts,
  directionForNode,
  getFontById,
  resolveEditorFontFamily,
  resolvePdfFontId,
  type FontResolution,
  type StudioFontDefinition,
} from "./fontRegistry";
import { normalizeSafeHex } from "./studioColors";
import { pdfFontUnicodeRange } from "./pdfFontSubsets";

export interface PdfFontFace {
  familyName: string;
  regularSources: string[];
  boldSources?: string[];
  complete: boolean;
  declaredRegular: number;
  declaredBold: number;
  loadedRegular: number;
  loadedBold: number;
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
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;")
    .replace(/'/g, "\u0026#39;");
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
  available: Map<string, PdfFontFace>;
  fontsUsed: Set<string>;
  fallbacks: Map<string, string>;
  typography?: DocumentStudioSettings["typography"];
}

function resolveEffectivePdfFont(
  rawFamily: unknown,
  blockDir: Direction,
  available: Map<string, PdfFontFace>,
  typography?: DocumentStudioSettings["typography"]
): { family: string; cssClass: string; requestedLabel: string | null; fellBack: boolean } {
  const effectiveRawFamily = (() => {
    if (typeof rawFamily === "string" && rawFamily.trim().length > 0) return rawFamily;
    if (typography) {
      const defaultId = blockDir === "rtl" ? typography.defaultRtlFontId : typography.defaultLtrFontId;
      const def = getFontById(defaultId);
      if (def?.editorFamily) return def.editorFamily;
    }
    return rawFamily;
  })();

  const base = resolveEditorFontFamily(effectiveRawFamily, blockDir);
  let preferred = base.pdfFamily;
  let preferredClass = base.cssClass;
  let requestedLabel = base.fallbackFrom ?? base.editorFamily ?? base.pdfFamily;

  const preferComplete = (name: string): PdfFontFace | undefined => {
    const face = available.get(name);
    return face && face.complete ? face : undefined;
  };

  if (preferComplete(preferred)) {
    return {
      family: preferred,
      cssClass: preferredClass,
      requestedLabel: base.fellBack ? requestedLabel : null,
      fellBack: base.fellBack,
    };
  }

  const dirFallbackName = blockDir === "ltr" ? "Inter" : "Noto Nastaliq Urdu";
  const dirFallbackClass = blockDir === "ltr" ? "qf-inter" : "qf-noto-nastaliq";

  const preferredId = resolvePdfFontId(preferred);
  if (preferredId) {
    const def = getFontById(preferredId);
    if (def.fallbackFontId) {
      const fb = getFontById(def.fallbackFontId);
      if (fb.pdf.familyName && preferComplete(fb.pdf.familyName)) {
        return {
          family: fb.pdf.familyName,
          cssClass: fb.cssClass,
          requestedLabel: base.editorFamily ?? preferred,
          fellBack: true,
        };
      }
    }
  }

  if (preferComplete(dirFallbackName)) {
    return {
      family: dirFallbackName,
      cssClass: dirFallbackClass,
      requestedLabel: base.editorFamily ?? preferred,
      fellBack: true,
    };
  }

  return {
    family: dirFallbackName,
    cssClass: dirFallbackClass,
    requestedLabel: base.editorFamily ?? preferred,
    fellBack: true,
  };
}

function noteEffective(
  ctx: WalkCtx,
  effective: ReturnType<typeof resolveEffectivePdfFont>
) {
  ctx.fontsUsed.add(effective.family);
  if (effective.fellBack && effective.requestedLabel) {
    ctx.fallbacks.set(effective.requestedLabel, effective.family);
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
    const underline = node.marks?.some((m) => m.type === "underline") ?? false;
    const linkMark = node.marks?.find((m) => m.type === "link");
    const href = linkMark?.attrs?.href;
    const styleMark = node.marks?.find((m) => m.type === "textStyle");
    const effective = resolveEffectivePdfFont(
      styleMark?.attrs?.fontFamily,
      blockDir,
      ctx.available,
      ctx.typography
    );
    noteEffective(ctx, effective);
    const explicitSizePt = resolveFontSizePt(styleMark?.attrs?.fontSize);
    const safeColor = normalizeSafeHex(styleMark?.attrs?.color);
    const highlightMark = node.marks?.find((m) => m.type === "highlight");
    const safeHighlight = normalizeSafeHex(highlightMark?.attrs?.color);
    const sizeStyle = [
      explicitSizePt ? `font-size:${explicitSizePt}pt;` : "",
      safeColor ? `color:${safeColor};` : "",
      safeHighlight ? `background-color:${safeHighlight};` : "",
    ].join("");

    if (bold) inner = `<strong>${inner}</strong>`;
    if (italics) inner = `<em>${inner}</em>`;
    if (underline) inner = `<u>${inner}</u>`;
    if (typeof href === "string" && href.trim().length > 0) {
      inner = `<a href="${escapeAttr(href)}">${inner}</a>`;
    }
    const fontMarker = effective.family === "Jameel Noori Nastaleeq" ? ` data-pdf-font="${escapeAttr(effective.family)}"` : "";
    const urduMarker = /\p{Script=Arabic}/u.test(node.text) ? ' data-pdf-urdu="true"' : "";
    inner = `<span class="${effective.cssClass}"${fontMarker}${urduMarker}${sizeStyle ? ` style="${sizeStyle}"` : ""}>${inner}</span>`;
    html += inner;
  }

  return html;
}

function openAttrs(node: DocNode, blockDir: Direction, ctx: WalkCtx): string {
  const blockStyleId = typeof node.attrs?.blockStyle === "string" && isBlockStyleId(node.attrs.blockStyle) ? node.attrs.blockStyle : null;
  const styleDef = node.type === "heading"
    ? BLOCK_STYLES[`heading-${node.attrs?.level}` as keyof typeof BLOCK_STYLES]
    : blockStyleId ? BLOCK_STYLES[blockStyleId] : null;
  const lh =
    typeof node.attrs?.lineHeight === "number"
      ? validateLineHeight(node.attrs.lineHeight)
      : ctx.typography?.lineHeight ?? null;
  const firstLineIndentMm =
    typeof node.attrs?.firstLineIndentMm === "number"
      ? validateIndentMm(node.attrs.firstLineIndentMm)
      : node.type === "paragraph"
        ? ctx.typography?.firstLineIndentMm ?? null
        : null;
  const indentStartMm = typeof node.attrs?.indentStartMm === "number" ? validateIndentMm(node.attrs.indentStartMm) : null;
  const indentEndMm = typeof node.attrs?.indentEndMm === "number" ? validateIndentMm(node.attrs.indentEndMm) : null;
  const spaceBeforePt =
    typeof node.attrs?.spaceBeforePt === "number"
      ? validateSpacingPt(node.attrs.spaceBeforePt)
      : node.type === "paragraph"
        ? ctx.typography?.paragraphBeforePt ?? null
        : null;
  const spaceAfterPt =
    typeof node.attrs?.spaceAfterPt === "number"
      ? validateSpacingPt(node.attrs.spaceAfterPt)
      : node.type === "paragraph"
        ? ctx.typography?.paragraphAfterPt ?? null
        : null;

  const styles = [
    `direction:${blockDir}`,
    "unicode-bidi:isolate",
    "text-align:start",
    alignStyleFor(node) || (styleDef?.align ? `text-align:${styleDef.align}` : ""),
    styleDef?.defaultFontSizePt ? `font-size:${styleDef.defaultFontSizePt}pt` : "",
    styleDef?.bold ? "font-weight:bold" : "",
    lh !== null ? `line-height:${lh}` : "",
    firstLineIndentMm !== null && firstLineIndentMm > 0 ? `text-indent:${firstLineIndentMm}mm` : "",
    indentStartMm !== null ? `margin-inline-start:${indentStartMm}mm` : "",
    indentEndMm !== null ? `margin-inline-end:${indentEndMm}mm` : "",
    spaceBeforePt !== null ? `margin-block-start:${spaceBeforePt}pt` : "",
    spaceAfterPt !== null ? `margin-block-end:${spaceAfterPt}pt` : "",
  ]
    .filter(Boolean)
    .join(";");
  return ` dir="${blockDir}" style="${styles}"`;
}

function convertNode(node: DocNode, ctx: WalkCtx): string {
  const blockDir = directionForNode(node, ctx.globalDir);

  switch (node.type) {
    case "paragraph":
      return `<p${openAttrs(node, blockDir, ctx)}>${convertInline(node.content, ctx, blockDir)}</p>`;
    case "heading": {
      const raw = typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      const level = Math.min(4, Math.max(1, raw));
      return `<h${level}${openAttrs(node, blockDir, ctx)}>${convertInline(node.content, ctx, blockDir)}</h${level}>`;
    }
    case "blockquote": {
      const inner = (node.content ?? [])
        .map((child) =>
          child.type === "paragraph"
            ? `<p${openAttrs(child, directionForNode(child, blockDir), ctx)}>${convertInline(child.content, ctx, directionForNode(child, blockDir))}</p>`
            : convertNode(child, ctx)
        )
        .join("");
      return `<blockquote dir="${blockDir}" style="direction:${blockDir};unicode-bidi:isolate">${inner}</blockquote>`;
    }
    case "bulletList": {
      const items = (node.content ?? [])
        .map((item) => `<li dir="${blockDir}"${listItemStyleAttrs(item, blockDir, ctx)}>${convertListItemInner(item, ctx, blockDir)}</li>`)
        .join("");
      return `<ul dir="${blockDir}">${items}</ul>`;
    }
    case "orderedList": {
      const startAttr =
        typeof node.attrs?.start === "number" && node.attrs.start !== 1
          ? ` start="${node.attrs.start}"`
          : "";
      const items = (node.content ?? [])
        .map((item) => `<li dir="${blockDir}"${listItemStyleAttrs(item, blockDir, ctx)}>${convertListItemInner(item, ctx, blockDir)}</li>`)
        .join("");
      return `<ol${startAttr} dir="${blockDir}">${items}</ol>`;
    }
    default:
      return (node.content ?? []).map((c) => convertNode(c, ctx)).join("");
  }
}

function listItemStyleAttrs(item: DocNode, parentDir: Direction, ctx: WalkCtx): string {
  const firstChild = item.content?.[0];
  if (!firstChild || firstChild.type !== "paragraph") return "";
  const d = directionForNode(firstChild, parentDir);
  const full = openAttrs(firstChild, d, ctx);
  const match = full.match(/style="([^"]*)"/);
  return match ? ` style="${match[1]}"` : "";
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
    if (!f.complete) continue;
    const id = resolvePdfFontId(f.familyName);
    const definition = id ? getFontById(id) : undefined;
    const coverage = (file: string | undefined) => {
      const range = file ? pdfFontUnicodeRange(file) : undefined;
      return range ? `unicode-range:${range};` : "";
    };
    for (const [index, src] of f.regularSources.entries()) {
      rules.push(
        `@font-face{font-family:"${f.familyName}";src:url(data:font/woff2;base64,${src}) format("woff2");font-weight:400;font-style:normal;font-display:block;${coverage(definition?.pdf.regularFiles?.[index])}}`
      );
    }
    for (const [index, src] of (f.boldSources ?? []).entries()) {
      rules.push(
        `@font-face{font-family:"${f.familyName}";src:url(data:font/woff2;base64,${src}) format("woff2");font-weight:700;font-style:normal;font-display:block;${coverage(definition?.pdf.boldFiles?.[index])}}`
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
  .qf-jameel { font-family: "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif; }
  .qf-sahel { font-family: Vazirmatn, sans-serif; }
`;
}

export function buildPdfHtml(
  doc: DocNode,
  dir: Direction,
  fonts: PdfFonts,
  typography?: DocumentStudioSettings["typography"]
): PdfHtmlResult {
  const available = new Map<string, PdfFontFace>();
  for (const face of fonts.faces) {
    if (face.complete && face.regularSources.length > 0) {
      available.set(face.familyName, face);
    }
  }

  const ctx: WalkCtx = {
    globalDir: dir,
    available,
    fontsUsed: new Set(),
    fallbacks: new Map(),
    typography,
  };

  const bodyHtml = (doc.content ?? []).map((n) => convertNode(n, ctx)).join("\n");

  if (ctx.fontsUsed.size === 0) {
    const effective = resolveEffectivePdfFont(null, dir, available, typography);
    noteEffective(ctx, effective);
  }

  // A CSS fallback must be embedded even when no run selects it as primary.
  const embeddedNames = [...new Set([...ctx.fontsUsed, "Noto Nastaliq Urdu", "Inter"])].filter((n) => available.has(n));
  const faces = fonts.faces.filter(
    (f) => f.complete && embeddedNames.includes(f.familyName)
  );

  const defaultFamily =
    dir === "ltr" ? "Inter, system-ui, sans-serif" : '"Noto Nastaliq Urdu", serif';
  const bodyFontSize = typography ? `${typography.bodyFontSizePt}pt` : "12pt";
  const bodyLineHeight = typography ? typography.lineHeight : 2;

  const html = `<!DOCTYPE html>
<html lang="${dir === "rtl" ? "ur" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8" />
<style>
${fontFaceCss(faces)}
${classRulesCss()}
  body {
    font-family: ${defaultFamily};
    font-size: ${bodyFontSize};
    line-height: ${bodyLineHeight};
    margin: 0;
    padding: 0;
    color: #111;
  }
  p, h1, h2, h3, h4, li, blockquote { margin: 0.5em 0; }
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
    fontsUsed: embeddedNames.sort(),
    fontFallbacks: [...ctx.fallbacks.entries()].map(([requested, used]) => ({
      requested,
      used,
    })),
  };
}

export function requiredPdfEmbedFonts(
  doc: DocNode,
  dir: Direction,
  typography?: DocumentStudioSettings["typography"]
): StudioFontDefinition[] {
  const used = new Set<string>();
  const walk = (nodes: DocNode[] | undefined, blockDir: Direction) => {
    if (!nodes) return;
    for (const node of nodes) {
      if (node.type === "text") {
        const styleMark = node.marks?.find((m) => m.type === "textStyle");
        const rawFamily = styleMark?.attrs?.fontFamily;
        const effectiveFamily = (() => {
          if (typeof rawFamily === "string" && rawFamily.trim().length > 0) return rawFamily;
          if (typography) {
            const defaultId = blockDir === "rtl" ? typography.defaultRtlFontId : typography.defaultLtrFontId;
            const def = getFontById(defaultId);
            if (def?.editorFamily) return def.editorFamily;
          }
          return rawFamily;
        })();
        const res = resolveEditorFontFamily(effectiveFamily, blockDir);
        used.add(res.pdfFamily);
      }
      const childDir = directionForNode(node, blockDir);
      walk(node.content, childDir);
    }
  };
  walk(doc.content, dir);
  if (used.size === 0) {
    if (typography) {
      const defaultId = dir === "rtl" ? typography.defaultRtlFontId : typography.defaultLtrFontId;
      const def = getFontById(defaultId);
      used.add(resolveEditorFontFamily(def?.editorFamily ?? null, dir).pdfFamily);
    } else {
      used.add(resolveEditorFontFamily(null, dir).pdfFamily);
    }
  }
  used.add(dir === "ltr" ? "Inter" : "Noto Nastaliq Urdu");
  used.add("Noto Nastaliq Urdu");
  return collectPdfEmbedFonts(used);
}
