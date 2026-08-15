// Publishing presets — configure document-wide defaults only.
// Explicit TipTap marks are never rewritten by preset application.

import type { DocumentStudioSettings } from "./documentSettings";
import { defaultDocumentSettings } from "./documentSettings";
import type { FontId } from "./fontRegistry";
import type { MarginPresetId, PageSizeId } from "./pageLayout";

export type PresetId =
  | "default"
  | "book-manuscript"
  | "newspaper-article"
  | "academic-paper"
  | "web-article";

export interface PublishingPreset {
  id: PresetId;
  labelUrdu: string;
  labelEnglish: string;
  description: string;
  pageSize: PageSizeId;
  marginPreset: MarginPresetId;
  bodyFontSizePt: number;
  lineHeight: number;
  firstLineIndentMm: number;
  paragraphAfterPt: number;
  defaultRtlFontId: FontId;
  defaultLtrFontId: FontId;
}

export const PUBLISHING_PRESETS: Record<PresetId, PublishingPreset> = {
  default: {
    id: "default",
    labelUrdu: "ڈیفالٹ",
    labelEnglish: "Default",
    description: "Neutral A4 defaults for general writing.",
    pageSize: "a4",
    marginPreset: "normal",
    bodyFontSizePt: 12,
    lineHeight: 1.5,
    firstLineIndentMm: 0,
    paragraphAfterPt: 6,
    defaultRtlFontId: "noto-nastaliq-urdu",
    defaultLtrFontId: "inter",
  },
  "book-manuscript": {
    id: "book-manuscript",
    labelUrdu: "کتابی نسخہ",
    labelEnglish: "Book Manuscript",
    description: "Comfortable long-form reading with first-line indent.",
    pageSize: "a5",
    marginPreset: "normal",
    bodyFontSizePt: 13,
    lineHeight: 1.8,
    firstLineIndentMm: 8,
    paragraphAfterPt: 4,
    defaultRtlFontId: "noto-nastaliq-urdu",
    defaultLtrFontId: "inter",
  },
  "newspaper-article": {
    id: "newspaper-article",
    labelUrdu: "اخباری مضمون",
    labelEnglish: "Newspaper Article",
    description: "Compact column style — tighter spacing, no first-line indent.",
    pageSize: "a4",
    marginPreset: "narrow",
    bodyFontSizePt: 11,
    lineHeight: 1.15,
    firstLineIndentMm: 0,
    paragraphAfterPt: 4,
    defaultRtlFontId: "noto-nastaliq-urdu",
    defaultLtrFontId: "inter",
  },
  "academic-paper": {
    id: "academic-paper",
    labelUrdu: "علمی مقالہ",
    labelEnglish: "Academic Paper",
    description: "Restrained academic layout with generous line spacing.",
    pageSize: "a4",
    marginPreset: "wide",
    bodyFontSizePt: 12,
    lineHeight: 2,
    firstLineIndentMm: 0,
    paragraphAfterPt: 0,
    defaultRtlFontId: "noto-nastaliq-urdu",
    defaultLtrFontId: "inter",
  },
  "web-article": {
    id: "web-article",
    labelUrdu: "ویب آرٹیکل",
    labelEnglish: "Web Article",
    description: "Screen-friendly spacing without first-line indent.",
    pageSize: "a4",
    marginPreset: "normal",
    bodyFontSizePt: 14,
    lineHeight: 1.6,
    firstLineIndentMm: 0,
    paragraphAfterPt: 8,
    defaultRtlFontId: "noto-nastaliq-urdu",
    defaultLtrFontId: "inter",
  },
};

export const ALL_PRESET_IDS: PresetId[] = [
  "default",
  "book-manuscript",
  "newspaper-article",
  "academic-paper",
  "web-article",
];

export function isValidPresetId(id: string): id is PresetId {
  return (ALL_PRESET_IDS as string[]).includes(id);
}

export function getPreset(id: string): PublishingPreset {
  return isValidPresetId(id) ? PUBLISHING_PRESETS[id] : PUBLISHING_PRESETS.default;
}

/** Apply preset values onto document settings (does not touch TipTap content). */
export function applyPresetToSettings(
  current: DocumentStudioSettings,
  presetId: PresetId
): DocumentStudioSettings {
  const p = getPreset(presetId);
  return {
    ...current,
    presetId: p.id,
    page: {
      ...current.page,
      size: p.pageSize,
      margins: {
        ...current.page.margins,
        preset: p.marginPreset,
      },
    },
    typography: {
      ...current.typography,
      bodyFontSizePt: p.bodyFontSizePt,
      lineHeight: p.lineHeight,
      firstLineIndentMm: p.firstLineIndentMm,
      paragraphAfterPt: p.paragraphAfterPt,
      defaultRtlFontId: p.defaultRtlFontId,
      defaultLtrFontId: p.defaultLtrFontId,
    },
  };
}

const PRESET_STORAGE_KEY = "qalam-selected-publishing-preset";

export function loadSelectedPresetId(): PresetId {
  if (typeof window === "undefined") return "default";
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    if (raw && isValidPresetId(raw)) return raw;
  } catch {
    // ignore
  }
  return "default";
}

export function saveSelectedPresetId(id: PresetId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

export function resetPublishingPresetSelection(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PRESET_STORAGE_KEY);
  } catch {
    // ignore
  }
}
