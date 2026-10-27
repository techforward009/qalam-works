import type { DocNode } from "./extractPlainText";
import { deriveDocumentTitle } from "./extractPlainText";
import type { DocumentStudioSettings } from "./documentSettings";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function templateFontStyle(css: string): string { return css ? `<style>${css}</style>` : ""; }
function templateStyle(css: string): string {
  return css ? HF_STYLE.replace("Arial,Tahoma,sans-serif", "Inter,Mehr Nastaliq Web,Noto Nastaliq Urdu") : HF_STYLE;
}

function safeDir(text: string): string {
  return /^[\x20-\x7E]*$/.test(text) ? "ltr" : "auto";
}

const HF_STYLE = "font-family:Arial,Tahoma,sans-serif;font-size:9px;color:#444;width:100%;padding:0 10mm;box-sizing:border-box;";

export function buildPdfHeaderTemplate(settings: DocumentStudioSettings, doc: DocNode, fontCss = ""): string {
  if (!settings.headerFooter.headerEnabled) return "<div></div>";
  const text =
    settings.headerFooter.headerMode === "custom" && settings.headerFooter.headerText
      ? settings.headerFooter.headerText
      : deriveDocumentTitle(doc);
  const d = safeDir(text);
  return `${templateFontStyle(fontCss)}<div dir="${d}" style="${templateStyle(fontCss)}text-align:center;">${escapeHtml(text)}</div>`;
}

export function buildPdfFooterTemplate(settings: DocumentStudioSettings, fontCss = ""): string {
  if (!settings.headerFooter.footerEnabled) return "<div></div>";
  const { footerText, pageNumbers } = settings.headerFooter;
  const hasText = footerText.trim().length > 0;
  const hasNumbers = pageNumbers !== "none";
  if (!hasText && !hasNumbers) return "<div></div>";
  const pageSpan =
    pageNumbers === "current"
      ? `<span class="pageNumber"></span>`
      : `<span class="pageNumber"></span> / <span class="totalPages"></span>`;
  if (!hasText) return `${templateFontStyle(fontCss)}<div style="${templateStyle(fontCss)}text-align:center;">${pageSpan}</div>`;
  if (!hasNumbers) {
    const d = safeDir(footerText);
    return `${templateFontStyle(fontCss)}<div dir="${d}" style="${templateStyle(fontCss)}text-align:center;">${escapeHtml(footerText)}</div>`;
  }
  const d = safeDir(footerText);
  return `${templateFontStyle(fontCss)}<div dir="${d}" style="${templateStyle(fontCss)}display:flex;justify-content:space-between;align-items:center;"><span>${escapeHtml(footerText)}</span><span>${pageSpan}</span></div>`;
}
