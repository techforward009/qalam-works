/**
 * buildInvoiceHtml
 *
 * Standalone HTML document for invoice PDF export.
 * Fonts are embedded as base64 data URIs. Layout comes from
 * invoiceDocumentHtml so preview and PDF share the same geometry.
 */
import path from "path";
import { readFileSync, existsSync } from "fs";
import {
  buildInvoiceDocument,
  invoiceDocumentCss,
  type InvoiceExportPayload,
  type LogoState,
  type SigState,
} from "./invoiceDocumentHtml";
import type { Alignment, InvoiceLanguage, SizeOption, WesternSkin } from "./invoiceLayout";

export type { InvoiceExportPayload, LogoState, SigState };
export type Template = WesternSkin | "classic";
export type { InvoiceLanguage, Alignment, SizeOption };

function loadFontBase64(relPath: string): string | null {
  const full = path.join(process.cwd(), "node_modules", relPath);
  if (!existsSync(full)) return null;
  return readFileSync(full).toString("base64");
}

function fontFaceBlock(familyName: string, weight: number, b64: string | null): string {
  if (!b64) return "";
  return `@font-face{font-family:"${familyName}";src:url(data:font/woff2;base64,${b64}) format("woff2");font-weight:${weight};font-display:block;}`;
}

export function buildInvoiceHtml(payload: InvoiceExportPayload): string {
  const doc = buildInvoiceDocument(payload);
  const urFont = payload.invoiceLang === "ur";

  const interReg    = loadFontBase64("@fontsource/inter/files/inter-latin-400-normal.woff2");
  const interBold   = loadFontBase64("@fontsource/inter/files/inter-latin-700-normal.woff2");
  const nastaliqReg = loadFontBase64("@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-400-normal.woff2");
  const nastaliqLat = loadFontBase64("@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-latin-400-normal.woff2");

  const fontFaces = [
    fontFaceBlock("Inter", 400, interReg),
    fontFaceBlock("Inter", 700, interBold),
    fontFaceBlock("Noto Nastaliq Urdu", 400, nastaliqReg),
    fontFaceBlock("Noto Nastaliq Urdu", 400, nastaliqLat),
  ].join("\n");

  const baseFontFamily = urFont
    ? "'Noto Nastaliq Urdu', serif"
    : "Inter, system-ui, sans-serif";

  return `<!DOCTYPE html>
<html lang="${doc.dir === "rtl" ? "ur" : "en"}" dir="${doc.dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
${fontFaces}
${invoiceDocumentCss(doc.box, baseFontFamily)}
</style>
</head>
<body>
${doc.pageHtml}
</body>
</html>`;
}
