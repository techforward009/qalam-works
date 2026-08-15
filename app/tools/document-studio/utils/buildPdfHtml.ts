// Document Studio PDF HTML adapter — pure/sync.
// Fonts and direction resolve through the central font registry.
// Effective CSS classes are chosen only from faces that fully loaded.

import type { DocNode, Direction } from "./extractPlainText";
import {
  collectPdfEmbedFonts,
  directionForNode,
  getFontById,
  resolveEditorFontFamily,
  resolvePdfFontId,
  type FontResolution,
  type StudioFontDefinition,
} from "./fontRegistry";

export interface PdfFontFace {
  familyName: string;
  /** Successfully loaded woff2 subset payloads for regular weight */
  regularSources: string[];
  /** Successfully loaded woff2 subset payloads for bold weight */
  boldSources?: string[];
  /**
   * True only when every declared regular (and bold, if declared)
   * subset file for this family loaded successfully.
   */
  complete: boolean;
  /** Declared subset path counts for diagnostics */
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
  /** familyName → complete loaded face */
  available: Map<string, PdfFontFace>;
  fontsUsed: Set<string>;
  fallbacks: Map<string, string>;
}

/**
 * Resolve the effective PDF family/class using only fully-loaded faces.
 * If the preferred family is missing or incomplete, use the deterministic
 * registry fallback (and record the mapping).
 */
function resolveEffectivePdfFont(
  rawFamily: unknown,
  blockDir: Direction,
  available: Map<string, PdfFontFace>
): { family: string; cssClass: string; requestedLabel: string | null; fellBack: boolean } {
  const base = resolveEditorFontFamily(rawFamily, blockDir);
  // Start from registry PDF family (already may have fallen back from Jameel etc.)
  let preferred = base.pdfFamily;
  let preferredClass = base.cssClass;
  let requestedLabel = base.fallbackFrom ?? base.editorFamily ?? base.pdfFamily;

  const preferComplete = (name: string): PdfFontFace | undefined => {
    const face = available.get(name);
    return face && face.complete ? face : undefined;
  };

  if (preferComplete(preferred)) {
    // Registry may have already recorded a logical fallback (Jameel → Noto)
    return {
      family: preferred,
      cssClass: preferredClass,
      requestedLabel: base.fellBack ? requestedLabel : null,
      fellBack: base.fellBack,
    };
  }

  // Preferred face unavailable/incomplete → document-direction default fallback
  const dirFallbackName = blockDir === "ltr" ? "Inter" : "Noto Nastaliq Urdu";
  const dirFallbackClass = blockDir === "ltr" ? "qf-inter" : "qf-noto-nastaliq";

  // Try registry fallbackFontId chain first if preferred came from a known font
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

  // Last resort: still emit class for dir fallback so HTML is deterministic
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
    const linkMark = node.marks?.find((m) => m.type === "link");
    const href = linkMark?.attrs?.href;
    const styleMark = node.marks?.find((m) => m.type === "textStyle");
    const effective = resolveEffectivePdfFont(
      styleMark?.attrs?.fontFamily,
      blockDir,
      ctx.available
    );
    noteEffective(ctx, effective);

    if (bold) inner = `<strong>${inner}</strong>`;
    if (italics) inner = `<em>${inner}</em>`;
    if (typeof href === "string" && href.trim().length > 0) {
      inner = `<a href="${escapeAttr(href)}">${inner}</a>`;
    }
    // Class always matches the effective (available) family
    inner = `<span class="${effective.cssClass}">${inner}</span>`;
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
    if (!f.complete) continue;
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

/**
 * Pure: DocNode + direction + pre-loaded font faces → self-contained HTML.
 * CSS classes always match faces that are complete/available.
 */
export function buildPdfHtml(doc: DocNode, dir: Direction, fonts: PdfFonts): PdfHtmlResult {
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
  };

  const bodyHtml = (doc.content ?? []).map((n) => convertNode(n, ctx)).join("\n");

  if (ctx.fontsUsed.size === 0) {
    const effective = resolveEffectivePdfFont(null, dir, available);
    noteEffective(ctx, effective);
  }

  const embeddedNames = [...ctx.fontsUsed].filter((n) => available.has(n));
  // Only emit @font-face for families actually used and complete
  const faces = fonts.faces.filter(
    (f) => f.complete && embeddedNames.includes(f.familyName)
  );

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

/** Helper for tests/route: which embed defs are needed for a document. */
export function requiredPdfEmbedFonts(
  doc: DocNode,
  dir: Direction
): StudioFontDefinition[] {
  // Collect preferred families without availability constraint
  const used = new Set<string>();
  const walk = (nodes: DocNode[] | undefined, blockDir: Direction) => {
    if (!nodes) return;
    for (const node of nodes) {
      if (node.type === "text") {
        const styleMark = node.marks?.find((m) => m.type === "textStyle");
        const res = resolveEditorFontFamily(styleMark?.attrs?.fontFamily, blockDir);
        used.add(res.pdfFamily);
      }
      const childDir = directionForNode(node, blockDir);
      walk(node.content, childDir);
    }
  };
  walk(doc.content, dir);
  if (used.size === 0) {
    used.add(resolveEditorFontFamily(null, dir).pdfFamily);
  }
  // Always include direction default for fallback capacity
  used.add(dir === "ltr" ? "Inter" : "Noto Nastaliq Urdu");
  return collectPdfEmbedFonts(used);
}
