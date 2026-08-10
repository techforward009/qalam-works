// Word-like Professional Editing Layer — Phase 1 (2026-08-09). Publishing
// Preset Foundation: types and pure selection/storage logic ONLY. These
// presets describe FUTURE formatting intent — nothing here is wired
// into PDF/DOCX export yet, and selecting a preset does not currently
// change any document output. localStorage persistence follows the
// exact same pattern already established in DocumentStudioEditor.tsx
// for draft autosave (plain key → JSON.stringify/parse, guarded by
// `typeof window === "undefined"` for SSR safety) — no new mechanism
// introduced.

export type PresetId = "default" | "book-manuscript" | "newspaper-article" | "academic-paper";

export interface PublishingPreset {
  id: PresetId;
  labelUrdu: string;
  labelEnglish: string;
  description: string;
  // Future formatting intent only — descriptive metadata, not yet
  // applied anywhere. A later phase would read these to actually
  // configure DOCX/PDF export; this phase only defines what they WOULD
  // mean.
  intendedLineSpacing: "single" | "1.5" | "double";
  intendedFirstLineIndent: boolean;
  intendedFontSizePt: number;
}

export const PUBLISHING_PRESETS: Record<PresetId, PublishingPreset> = {
  default: {
    id: "default",
    labelUrdu: "ڈیفالٹ",
    labelEnglish: "Default",
    description: "موجودہ، معیاری فارمیٹنگ — کوئی خاص انداز مسلط نہیں",
    intendedLineSpacing: "1.5",
    intendedFirstLineIndent: false,
    intendedFontSizePt: 12,
  },
  "book-manuscript": {
    id: "book-manuscript",
    labelUrdu: "کتابی نسخہ",
    labelEnglish: "Book Manuscript",
    description: "طویل کتابی متن کے لیے — ڈبل لائن اسپیسنگ، پہلی سطر کا حاشیہ",
    intendedLineSpacing: "double",
    intendedFirstLineIndent: true,
    intendedFontSizePt: 12,
  },
  "newspaper-article": {
    id: "newspaper-article",
    labelUrdu: "اخباری مضمون",
    labelEnglish: "Newspaper Article",
    description: "مختصر، کالمی مضامین کے لیے — سنگل اسپیسنگ، کوئی حاشیہ نہیں",
    intendedLineSpacing: "single",
    intendedFirstLineIndent: false,
    intendedFontSizePt: 11,
  },
  "academic-paper": {
    id: "academic-paper",
    labelUrdu: "علمی مقالہ",
    labelEnglish: "Academic Paper",
    description: "تحقیقی مقالوں کے لیے — ڈبل اسپیسنگ، حوالہ جاتی ضوابط کے مطابق",
    intendedLineSpacing: "double",
    intendedFirstLineIndent: false,
    intendedFontSizePt: 12,
  },
};

export const ALL_PRESET_IDS: PresetId[] = ["default", "book-manuscript", "newspaper-article", "academic-paper"];

/** Pure — type guard confirming a string is a known preset id. */
export function isValidPresetId(id: string): id is PresetId {
  return (ALL_PRESET_IDS as string[]).includes(id);
}

/** Pure — looks up a preset by id, falling back to "default" for an unrecognized id rather than throwing. */
export function getPreset(id: string): PublishingPreset {
  return isValidPresetId(id) ? PUBLISHING_PRESETS[id] : PUBLISHING_PRESETS.default;
}

const PRESET_STORAGE_KEY = "qalam-selected-publishing-preset";

/** Loads the last-selected preset id from localStorage. Returns "default" on any failure (missing key, corrupt value, SSR) rather than throwing. */
export function loadSelectedPresetId(): PresetId {
  if (typeof window === "undefined") return "default";
  try {
    const saved = localStorage.getItem(PRESET_STORAGE_KEY);
    if (saved && isValidPresetId(saved)) return saved;
  } catch (err) {
    console.error("Failed to load selected preset from localStorage:", err);
  }
  return "default";
}

/** Saves the selected preset id to localStorage. Silently logs (never throws) on failure, matching the existing draft-autosave error-handling convention. */
export function saveSelectedPresetId(id: PresetId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, id);
  } catch (err) {
    console.error("Failed to save selected preset to localStorage:", err);
  }
}
