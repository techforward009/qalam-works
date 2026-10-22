/**
 * Portable Document Studio file (.qalam).
 * JSON only. Text, marks, and settings are stored as authored.
 * This file does not depend on the browser that saved it.
 */
import type { DocNode } from "./extractPlainText";
import {
  parseDocumentSettings,
  type DocumentStudioSettings,
} from "./documentSettings";
import { sanitizeDocumentTitle } from "./documentTitle";

export const QALAM_DOCUMENT_FORMAT = "qalam-document" as const;
export const QALAM_DOCUMENT_SCHEMA_VERSION = 1 as const;
export const QALAM_DOCUMENT_EXTENSION = ".qalam";

const MAX_NODES = 200_000;
const MAX_DEPTH = 64;

export interface QalamDocumentFile {
  format: typeof QALAM_DOCUMENT_FORMAT;
  schemaVersion: typeof QALAM_DOCUMENT_SCHEMA_VERSION;
  title: string;
  content: DocNode;
  documentSettings: DocumentStudioSettings;
}

export type QalamDocumentParseResult =
  | { ok: true; document: QalamDocumentFile }
  | { ok: false; error: string };

function fail(ur: string, en: string): QalamDocumentParseResult {
  return { ok: false, error: `${ur} / ${en}` };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateNode(value: unknown, depth: number, budget: { count: number }): string | null {
  if (budget.count >= MAX_NODES) return "too-large";
  if (depth > MAX_DEPTH) return "too-deep";
  if (!isPlainObject(value) || typeof value.type !== "string" || value.type.length === 0) return "node";
  budget.count += 1;
  if (value.text !== undefined && typeof value.text !== "string") return "text";
  if (value.attrs !== undefined && !isPlainObject(value.attrs)) return "attrs";
  if (value.marks !== undefined) {
    if (!Array.isArray(value.marks)) return "marks";
    for (const mark of value.marks) {
      if (!isPlainObject(mark) || typeof mark.type !== "string" || mark.type.length === 0) return "marks";
      if (mark.attrs !== undefined && !isPlainObject(mark.attrs)) return "marks";
      if (
        mark.type === "textStyle"
        && mark.attrs
        && "fontFamily" in mark.attrs
        && mark.attrs.fontFamily != null
        && typeof mark.attrs.fontFamily !== "string"
      ) {
        return "font";
      }
    }
  }
  if (value.content !== undefined) {
    if (!Array.isArray(value.content)) return "content";
    for (const child of value.content) {
      const error = validateNode(child, depth + 1, budget);
      if (error) return error;
    }
  }
  return null;
}

function nodeError(code: string | null): QalamDocumentParseResult | null {
  if (!code) return null;
  if (code === "too-large") return fail("دستاویز بہت بڑی ہے۔", "This document is too large to open.");
  if (code === "too-deep") return fail("دستاویز کی ساخت درست نہیں۔", "This document structure is too deeply nested.");
  if (code === "font") return fail("فونٹ کا نشان درست نہیں۔", "A font mark in this file is not valid.");
  return fail("دستاویز کا متن درست نہیں۔", "This file does not contain a valid Qalam document.");
}

function settingsUnchanged(raw: unknown): DocumentStudioSettings | null {
  if (!isPlainObject(raw) || raw.version !== 1) return null;
  const parsed = parseDocumentSettings(raw);
  if (JSON.stringify(parseDocumentSettings(parsed)) !== JSON.stringify(parsed)) return null;
  if (raw.presetId !== parsed.presetId) return null;

  const page = raw.page;
  if (!isPlainObject(page)) return null;
  if (page.size !== parsed.page.size || page.orientation !== parsed.page.orientation) return null;
  const margins = page.margins;
  if (!isPlainObject(margins)) return null;
  if (margins.preset !== parsed.page.margins.preset) return null;
  if (Number(margins.topMm) !== parsed.page.margins.topMm) return null;
  if (Number(margins.bottomMm) !== parsed.page.margins.bottomMm) return null;
  if (Number(margins.startMm) !== parsed.page.margins.startMm) return null;
  if (Number(margins.endMm) !== parsed.page.margins.endMm) return null;

  const typography = raw.typography;
  if (!isPlainObject(typography)) return null;
  if (typography.bodyFontSizePt !== parsed.typography.bodyFontSizePt) return null;
  if (typography.lineHeight !== parsed.typography.lineHeight) return null;
  if (Number(typography.paragraphBeforePt) !== parsed.typography.paragraphBeforePt) return null;
  if (Number(typography.paragraphAfterPt) !== parsed.typography.paragraphAfterPt) return null;
  if (Number(typography.firstLineIndentMm) !== parsed.typography.firstLineIndentMm) return null;
  if (typography.defaultRtlFontId !== parsed.typography.defaultRtlFontId) return null;
  if (typography.defaultLtrFontId !== parsed.typography.defaultLtrFontId) return null;

  const headerFooter = raw.headerFooter;
  if (!isPlainObject(headerFooter)) return null;
  if (headerFooter.headerEnabled !== parsed.headerFooter.headerEnabled) return null;
  if (headerFooter.headerMode !== parsed.headerFooter.headerMode) return null;
  if (headerFooter.headerText !== parsed.headerFooter.headerText) return null;
  if (headerFooter.footerEnabled !== parsed.headerFooter.footerEnabled) return null;
  if (headerFooter.footerText !== parsed.headerFooter.footerText) return null;
  if (headerFooter.pageNumbers !== parsed.headerFooter.pageNumbers) return null;
  return parsed;
}

export function buildQalamDocumentFile(input: {
  title: string;
  content: DocNode;
  documentSettings: DocumentStudioSettings;
}): QalamDocumentFile {
  const settings = parseDocumentSettings(input.documentSettings);
  return {
    format: QALAM_DOCUMENT_FORMAT,
    schemaVersion: QALAM_DOCUMENT_SCHEMA_VERSION,
    title: sanitizeDocumentTitle(input.title) || "Untitled document",
    content: input.content,
    documentSettings: settings,
  };
}

export function serializeQalamDocument(document: QalamDocumentFile): string {
  return JSON.stringify(document);
}

export function qalamDocumentFilename(title: string): string {
  const base = sanitizeDocumentTitle(title)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 80);
  return `${base || "qalam-document"}${QALAM_DOCUMENT_EXTENSION}`;
}

export function qalamReplaceConfirmMessage(title: string): string {
  return [
    `“${title}” کھولیں؟`,
    "یہ اس وقت کھلی ہوئی دستاویز کی جگہ لے گا۔ لائبریری کی باقی دستاویزات محفوظ رہیں گی۔ منسوخ کرنے سے موجودہ دستاویز نہیں بدلے گی۔",
    `Open “${title}”?`,
    "This replaces the document that is currently open. Other documents in your library are kept. Cancel leaves the current document unchanged.",
  ].join("\n\n");
}

export function parseQalamDocument(raw: string): QalamDocumentParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail("یہ فائل پڑھی نہیں جا سکی۔", "This file could not be read as a Qalam document.");
  }
  if (!isPlainObject(parsed)) {
    return fail("یہ قلم کی دستاویز نہیں۔", "This file is not a Qalam document.");
  }
  if (parsed.format !== QALAM_DOCUMENT_FORMAT) {
    return fail("یہ قلم کی دستاویز نہیں۔", "This file is not a Qalam document.");
  }
  if (parsed.schemaVersion !== QALAM_DOCUMENT_SCHEMA_VERSION) {
    return fail("اس فائل کا ورژن تعاون یافتہ نہیں۔", "This Qalam document version is not supported.");
  }
  if (!isPlainObject(parsed.content) || parsed.content.type !== "doc") {
    return fail("دستاویز کا متن موجود نہیں۔", "This Qalam document has no document content.");
  }
  const structure = nodeError(validateNode(parsed.content, 0, { count: 0 }));
  if (structure) return structure;
  const documentSettings = settingsUnchanged(parsed.documentSettings);
  if (!documentSettings) {
    return fail("صفحہ یا فونٹ کی ترتیبات محفوظ نہیں رہ سکتیں۔", "Page or font settings in this file could not be preserved.");
  }
  const title = sanitizeDocumentTitle(parsed.title) || "Untitled document";
  return {
    ok: true,
    document: {
      format: QALAM_DOCUMENT_FORMAT,
      schemaVersion: QALAM_DOCUMENT_SCHEMA_VERSION,
      title,
      content: parsed.content as DocNode,
      documentSettings,
    },
  };
}
