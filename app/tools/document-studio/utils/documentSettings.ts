/**
 * Versioned Document Studio settings — document-wide defaults.
 * Explicit TipTap marks/attrs always override these.
 */

import type { FontId } from "./fontRegistry";
import type { MarginPresetId, PageOrientation, PageSizeId, PageMarginsMm } from "./pageLayout";
import { clampMarginMm, resolveMargins } from "./pageLayout";
import type { PresetId } from "./publishingPresets";
import { isValidPresetId } from "./publishingPresets";

export type PageNumberMode = "none" | "current" | "current-total";
export type HeaderMode = "auto-title" | "custom";

export interface DocumentStudioSettings {
  version: 1;
  presetId: PresetId;
  page: {
    size: PageSizeId;
    orientation: PageOrientation;
    margins: {
      preset: MarginPresetId;
      topMm: number;
      bottomMm: number;
      startMm: number;
      endMm: number;
    };
  };
  typography: {
    bodyFontSizePt: number;
    lineHeight: number;
    paragraphBeforePt: number;
    paragraphAfterPt: number;
    firstLineIndentMm: number;
    defaultRtlFontId: FontId;
    defaultLtrFontId: FontId;
  };
  headerFooter: {
    headerEnabled: boolean;
    headerMode: HeaderMode;
    headerText: string;
    footerEnabled: boolean;
    footerText: string;
    pageNumbers: PageNumberMode;
  };
}

export const SETTINGS_STORAGE_KEY = "qalam-document-studio-settings-v1";

export const FONT_SIZE_OPTIONS_PT = [
  8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72,
] as const;

export const LINE_HEIGHT_OPTIONS = [1, 1.15, 1.5, 1.8, 2, 2.2] as const;

export const FONT_SIZE_MIN_PT = 6;
export const FONT_SIZE_MAX_PT = 96;

export function defaultDocumentSettings(): DocumentStudioSettings {
  const margins = resolveMargins("normal");
  return {
    version: 1,
    presetId: "default",
    page: {
      size: "a4",
      orientation: "portrait",
      margins: {
        preset: "normal",
        ...margins,
      },
    },
    typography: {
      bodyFontSizePt: 12,
      lineHeight: 1.5,
      paragraphBeforePt: 0,
      paragraphAfterPt: 6,
      firstLineIndentMm: 0,
      defaultRtlFontId: "noto-nastaliq-urdu",
      defaultLtrFontId: "inter",
    },
    headerFooter: {
      headerEnabled: true,
      headerMode: "auto-title",
      headerText: "",
      footerEnabled: true,
      footerText: "",
      pageNumbers: "current-total",
    },
  };
}

// Batch 16A correction (item 6) — canonical validators for the new
// paragraph/heading schema attrs, reused both in the TipTap schema's
// parseHTML (so a corrupted/imported document can't inject an extreme
// value) and anywhere else these attrs are read. An out-of-range or
// non-finite value falls back to null (== "no override, use the
// document default") rather than clamping to a boundary, since a
// wildly-wrong stored value is more likely corrupt data than a genuine
// intent to hit the extreme end of the range.
export const LINE_HEIGHT_MIN = 0.5;
export const LINE_HEIGHT_MAX = 4;
export const INDENT_MM_MIN = 0;
export const INDENT_MM_MAX = 100;
export const SPACING_PT_MIN = 0;
export const SPACING_PT_MAX = 200;

export function validateLineHeight(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  if (raw < LINE_HEIGHT_MIN || raw > LINE_HEIGHT_MAX) return null;
  return raw;
}

export function validateIndentMm(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  if (raw < INDENT_MM_MIN || raw > INDENT_MM_MAX) return null;
  return raw;
}

export function validateSpacingPt(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  if (raw < SPACING_PT_MIN || raw > SPACING_PT_MAX) return null;
  return raw;
}

export function resolveFontSizePt(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const n = Math.round(raw * 10) / 10;
    if (n < FONT_SIZE_MIN_PT || n > FONT_SIZE_MAX_PT) return null;
    return n;
  }
  if (typeof raw === "string") {
    const m = raw.trim().match(/^(\d+(?:\.\d+)?)\s*pt$/i);
    if (m) return resolveFontSizePt(parseFloat(m[1]));
    const n = parseFloat(raw);
    if (Number.isFinite(n)) return resolveFontSizePt(n);
  }
  return null;
}

export function sanitizeLineHeight(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  if (raw < 0.8 || raw > 3.5) return null;
  return Math.round(raw * 100) / 100;
}

function sanitizeFontId(raw: unknown, fallback: FontId): FontId {
  const allowed: FontId[] = [
    "default",
    "jameel-noori-nastaleeq",
    "noto-nastaliq-urdu",
    "amiri",
    "noto-naskh-arabic",
    "vazirmatn",
    "sahel",
    "inter",
  ];
  return typeof raw === "string" && (allowed as string[]).includes(raw)
    ? (raw as FontId)
    : fallback;
}

/** Validate and coerce unknown input into safe settings. */
export function parseDocumentSettings(raw: unknown): DocumentStudioSettings {
  const defaults = defaultDocumentSettings();
  if (!raw || typeof raw !== "object") return defaults;
  const o = raw as Record<string, unknown>;

  const presetId =
    typeof o.presetId === "string" && isValidPresetId(o.presetId)
      ? o.presetId
      : defaults.presetId;

  const pageIn = (o.page && typeof o.page === "object" ? o.page : {}) as Record<string, unknown>;
  const size =
    pageIn.size === "a4" || pageIn.size === "a5" || pageIn.size === "letter"
      ? pageIn.size
      : defaults.page.size;
  const orientation =
    pageIn.orientation === "landscape" ? "landscape" : "portrait";
  const marginsIn =
    pageIn.margins && typeof pageIn.margins === "object"
      ? (pageIn.margins as Record<string, unknown>)
      : {};
  const marginPreset: MarginPresetId =
    marginsIn.preset === "narrow" ||
    marginsIn.preset === "wide" ||
    marginsIn.preset === "custom" ||
    marginsIn.preset === "normal"
      ? marginsIn.preset
      : "normal";
  const custom: PageMarginsMm = {
    topMm: clampMarginMm(Number(marginsIn.topMm)),
    bottomMm: clampMarginMm(Number(marginsIn.bottomMm)),
    startMm: clampMarginMm(Number(marginsIn.startMm)),
    endMm: clampMarginMm(Number(marginsIn.endMm)),
  };
  const marginsResolved = resolveMargins(marginPreset, custom);

  const typoIn =
    o.typography && typeof o.typography === "object"
      ? (o.typography as Record<string, unknown>)
      : {};
  const bodyFontSizePt =
    resolveFontSizePt(typoIn.bodyFontSizePt) ?? defaults.typography.bodyFontSizePt;
  const lineHeight =
    sanitizeLineHeight(typoIn.lineHeight) ?? defaults.typography.lineHeight;

  const hfIn =
    o.headerFooter && typeof o.headerFooter === "object"
      ? (o.headerFooter as Record<string, unknown>)
      : {};
  const pageNumbers: PageNumberMode =
    hfIn.pageNumbers === "none" ||
    hfIn.pageNumbers === "current" ||
    hfIn.pageNumbers === "current-total"
      ? hfIn.pageNumbers
      : defaults.headerFooter.pageNumbers;

  return {
    version: 1,
    presetId,
    page: {
      size,
      orientation,
      margins: {
        preset: marginPreset,
        ...marginsResolved,
      },
    },
    typography: {
      bodyFontSizePt,
      lineHeight,
      paragraphBeforePt: Math.min(
        48,
        Math.max(0, Number(typoIn.paragraphBeforePt) || 0)
      ),
      paragraphAfterPt: Math.min(
        48,
        Math.max(0, Number(typoIn.paragraphAfterPt) || 0)
      ),
      firstLineIndentMm: Math.min(
        30,
        Math.max(0, Number(typoIn.firstLineIndentMm) || 0)
      ),
      defaultRtlFontId: sanitizeFontId(
        typoIn.defaultRtlFontId,
        defaults.typography.defaultRtlFontId
      ),
      defaultLtrFontId: sanitizeFontId(
        typoIn.defaultLtrFontId,
        defaults.typography.defaultLtrFontId
      ),
    },
    headerFooter: {
      headerEnabled: hfIn.headerEnabled !== false,
      headerMode: hfIn.headerMode === "custom" ? "custom" : "auto-title",
      headerText: typeof hfIn.headerText === "string" ? hfIn.headerText.slice(0, 200) : "",
      footerEnabled: hfIn.footerEnabled !== false,
      footerText: typeof hfIn.footerText === "string" ? hfIn.footerText.slice(0, 200) : "",
      pageNumbers,
    },
  };
}

export function loadDocumentSettings(): DocumentStudioSettings {
  if (typeof window === "undefined") return defaultDocumentSettings();
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaultDocumentSettings();
    return parseDocumentSettings(JSON.parse(raw));
  } catch {
    return defaultDocumentSettings();
  }
}

export function saveDocumentSettings(settings: DocumentStudioSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // quota / private mode — ignore
  }
}

export function clearDocumentSettings(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  } catch {
    // ignore
  }
}
