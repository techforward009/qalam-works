import type { Page } from "puppeteer-core";
import { buildPdfHtml, type PdfFonts } from "./buildPdfHtml";
import type { DocumentStudioSettings } from "./documentSettings";
import { documentPrintCss } from "./documentView";
import type { DocNode, Direction } from "./extractPlainText";
import { resolvePageLayout, resolvePhysicalMargins } from "./pageLayout";

const PAINTED_FAMILY: Record<string, RegExp> = {
  "Alvi Nastaleeq": /Alvi/i,
  "Jameel Noori Nastaleeq": /Jameel/i,
  Gulzar: /Gulzar/i,
  Amiri: /Amiri/i,
  "Digital Khatt Indo-Pak": /Digital\s*Khatt/i,
  "Noto Nastaliq Urdu": /Noto\s*Nastaliq|NotoNastaliq/i,
  "Noto Naskh Arabic": /Noto\s*Naskh|NotoNaskh/i,
  Inter: /Inter/i,
};

/** Same portal Direct Print clones in the browser, built from the document JSON. */
export function buildPrintDocumentHtml(
  doc: DocNode,
  dir: Direction,
  fonts: PdfFonts,
  settings: DocumentStudioSettings,
) {
  const built = buildPdfHtml(doc, dir, fonts, settings.typography);
  const style = (built.html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "").replace(/overflow:\s*hidden;?/g, "overflow:visible;");
  const body = built.html.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? "";
  const layout = resolvePageLayout({
    size: settings.page.size,
    orientation: settings.page.orientation,
    marginPreset: settings.page.margins.preset,
    customMargins: settings.page.margins,
  });
  const physical = resolvePhysicalMargins(layout.margins, dir);
  const typography = settings.typography;
  const html = `<!DOCTYPE html>
<html lang="${dir === "rtl" ? "ur" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8" />
<style>
${style}
${documentPrintCss(layout.widthMm, layout.heightMm, layout.margins.topMm, layout.margins.bottomMm)}
[data-studio-print-page]{padding-left:${physical.leftMm}mm;padding-right:${physical.rightMm}mm;}
</style>
</head>
<body>
<div data-studio-print-portal="true">
<div data-studio-print-page="true" class="qalam-editor-content" dir="${dir}" style="--qalam-body-size:${typography.bodyFontSizePt}pt;--qalam-line-height:${typography.lineHeight};--qalam-paragraph-before:${typography.paragraphBeforePt}pt;--qalam-paragraph-after:${typography.paragraphAfterPt}pt;--qalam-first-line-indent:${typography.firstLineIndentMm}mm">
<div class="ProseMirror" dir="${dir}">
${body}
</div>
</div>
</div>
</body>
</html>`;
  return { html, fontsUsed: built.fontsUsed, fontFallbacks: built.fontFallbacks, layout, physical };
}

const UNMARKED_FALLBACK_FAMILIES = new Set(["Noto Nastaliq Urdu", "Inter"]);

type PlatformFont = { familyName?: string; glyphCount?: number };

/** Every marked run of the requested faces. An empty list means the face was requested and no run painted it. */
export async function readPaintedPdfFonts(page: Page, families: string[]): Promise<Record<string, string[][]>> {
  const session = await page.createCDPSession();
  try {
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    const root = await session.send("DOM.getDocument");
    const found = await session.send("DOM.querySelectorAll", {
      nodeId: root.root.nodeId,
      selector: "[data-pdf-font]",
    });
    const painted: Record<string, string[][]> = {};
    for (const family of families) painted[family] = [];
    for (const nodeId of found.nodeIds ?? []) {
      const described = await session.send("DOM.getAttributes", { nodeId });
      const attributes = described.attributes ?? [];
      let family = "";
      for (let index = 0; index < attributes.length - 1; index += 2) {
        if (attributes[index] === "data-pdf-font") family = attributes[index + 1] ?? "";
      }
      if (!family) continue;
      const used = await session.send("CSS.getPlatformFontsForNode", { nodeId });
      const names = ((used.fonts ?? []) as PlatformFont[])
        .filter((font) => (font.glyphCount ?? 0) > 0 && (font.familyName ?? "").length > 0)
        .map((font) => font.familyName ?? "");
      if (!painted[family]) painted[family] = [];
      painted[family].push(names);
    }
    return painted;
  } finally {
    await session.detach();
  }
}

/** Every run of a requested face must paint that face. No painted text is not success. */
export function paintedFontMismatch(family: string, runs: string[][]): string | null {
  if (runs.length === 0) {
    return `PDF font ${family} did not render (no painted text); a different face was not substituted; export blocked`;
  }
  const expected = PAINTED_FAMILY[family];
  if (!expected) return null;
  for (const painted of runs) {
    if (painted.length === 0) {
      return `PDF font ${family} did not render (no painted glyphs); a different face was not substituted; export blocked`;
    }
    if (!painted.some((name) => expected.test(name))) {
      return `PDF font ${family} painted as ${painted.join(", ")}; a different face was not substituted; export blocked`;
    }
    const foreign = painted.filter((name) => !expected.test(name) && /Alvi|Jameel|Gulzar|Nastaliq|Naskh|Amiri|Khatt|Times/i.test(name));
    if (foreign.length > 0) {
      return `PDF font ${family} also painted ${foreign.join(", ")}; a different face was not substituted; export blocked`;
    }
  }
  return null;
}

/** Noto and Inter are the unmarked generic fallbacks. Every other requested face must paint on all of its runs. */
export function requestedFontPaintMismatch(families: string[], painted: Record<string, string[][]>): string | null {
  for (const family of families) {
    if (UNMARKED_FALLBACK_FAMILIES.has(family)) continue;
    const mismatch = paintedFontMismatch(family, painted[family] ?? []);
    if (mismatch) return mismatch;
  }
  return null;
}
