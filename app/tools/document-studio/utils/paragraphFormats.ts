import { parseLeading, type Leading } from "./leading";
import { validateIndentMm, validateLineHeight, validateSpacingPt } from "./documentSettings";
import { paragraphCount } from "./paragraphAlign";

export const PARAGRAPH_FORMAT_KEYS = [
  "lineHeight",
  "leading",
  "spaceBeforePt",
  "spaceAfterPt",
  "lineGapPt",
  "firstLineIndentMm",
  "indentStartMm",
  "indentEndMm",
] as const;

export type ParagraphFormatKey = (typeof PARAGRAPH_FORMAT_KEYS)[number];

export type ParagraphFormat = {
  lineHeight?: number | null;
  leading?: Leading | null;
  spaceBeforePt?: number | null;
  spaceAfterPt?: number | null;
  lineGapPt?: number | null;
  firstLineIndentMm?: number | null;
  indentStartMm?: number | null;
  indentEndMm?: number | null;
} | null;

export function isEmptyParagraphFormat(format: ParagraphFormat): boolean {
  if (!format || typeof format !== "object") return true;
  return PARAGRAPH_FORMAT_KEYS.every((key) => format[key] === undefined || format[key] === null);
}

export function normalizeParagraphFormat(value: unknown): ParagraphFormat {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const out: NonNullable<ParagraphFormat> = {};
  let hasKey = false;

  if (raw.lineHeight !== undefined) {
    const v = raw.lineHeight === null ? null : validateLineHeight(raw.lineHeight);
    if (v !== null) { out.lineHeight = v; hasKey = true; }
  }
  if (raw.leading !== undefined) {
    const v = raw.leading === null ? null : parseLeading(raw.leading);
    if (v !== null) { out.leading = v; hasKey = true; }
  }
  if (raw.spaceBeforePt !== undefined) {
    const v = raw.spaceBeforePt === null ? null : validateSpacingPt(raw.spaceBeforePt);
    if (v !== null) { out.spaceBeforePt = v; hasKey = true; }
  }
  if (raw.spaceAfterPt !== undefined) {
    const v = raw.spaceAfterPt === null ? null : validateSpacingPt(raw.spaceAfterPt);
    if (v !== null) { out.spaceAfterPt = v; hasKey = true; }
  }
  if (raw.lineGapPt !== undefined) {
    const v = raw.lineGapPt === null ? null : validateSpacingPt(raw.lineGapPt);
    if (v !== null) { out.lineGapPt = v; hasKey = true; }
  }
  if (raw.firstLineIndentMm !== undefined) {
    const v = raw.firstLineIndentMm === null ? null : validateIndentMm(raw.firstLineIndentMm);
    if (v !== null) { out.firstLineIndentMm = v; hasKey = true; }
  }
  if (raw.indentStartMm !== undefined) {
    const v = raw.indentStartMm === null ? null : validateIndentMm(raw.indentStartMm);
    if (v !== null) { out.indentStartMm = v; hasKey = true; }
  }
  if (raw.indentEndMm !== undefined) {
    const v = raw.indentEndMm === null ? null : validateIndentMm(raw.indentEndMm);
    if (v !== null) { out.indentEndMm = v; hasKey = true; }
  }

  return hasKey ? out : null;
}

export function isParagraphFormat(value: unknown): value is ParagraphFormat {
  if (value === null) return true;
  if (typeof value !== "object" || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  const keys = Object.keys(raw);
  for (const key of keys) {
    if (!(PARAGRAPH_FORMAT_KEYS as readonly string[]).includes(key)) return false;
    const v = raw[key];
    if (v === null || v === undefined) continue;
    if (key === "lineHeight" && validateLineHeight(v) === null) return false;
    if (key === "leading" && parseLeading(v) === null) return false;
    if ((key === "spaceBeforePt" || key === "spaceAfterPt" || key === "lineGapPt") && validateSpacingPt(v) === null) return false;
    if ((key === "firstLineIndentMm" || key === "indentStartMm" || key === "indentEndMm") && validateIndentMm(v) === null) return false;
  }
  return true;
}

export function isParagraphFormatList(value: unknown): value is ParagraphFormat[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 10000 && value.every(isParagraphFormat);
}

export function resolvedParagraphFormats(
  text: string,
  paragraphFormats?: readonly ParagraphFormat[] | null,
): ParagraphFormat[] {
  const count = paragraphCount(text);
  return Array.from({ length: count }, (_, index) => {
    const stored = paragraphFormats?.[index];
    return stored ? normalizeParagraphFormat(stored) : null;
  });
}

export function collapseParagraphFormats(formats: readonly ParagraphFormat[]): ParagraphFormat[] | null {
  const normalized = formats.map(normalizeParagraphFormat);
  if (normalized.every(isEmptyParagraphFormat)) return null;
  return normalized;
}

export function fitParagraphFormats(
  text: string,
  paragraphFormats?: readonly ParagraphFormat[] | null,
): ParagraphFormat[] | null {
  if (!paragraphFormats || !paragraphFormats.length) return null;
  return collapseParagraphFormats(resolvedParagraphFormats(text, paragraphFormats));
}
