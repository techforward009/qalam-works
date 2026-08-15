import { describe, expect, test, beforeAll } from "vitest";
import {
  PUBLISHING_PRESETS,
  ALL_PRESET_IDS,
  isValidPresetId,
  getPreset,
  loadSelectedPresetId,
  saveSelectedPresetId,
  applyPresetToSettings,
  type PresetId,
} from "../app/tools/document-studio/utils/publishingPresets";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";

const mockStore: Record<string, string> = {};
beforeAll(() => {
  (global as any).window = {};
  (global as any).localStorage = {
    getItem: (k: string) => mockStore[k] ?? null,
    setItem: (k: string, v: string) => {
      mockStore[k] = v;
    },
  };
});

describe("Publishing preset definitions", () => {
  test("required presets are defined including web-article", () => {
    expect(ALL_PRESET_IDS).toContain("default");
    expect(ALL_PRESET_IDS).toContain("book-manuscript");
    expect(ALL_PRESET_IDS).toContain("newspaper-article");
    expect(ALL_PRESET_IDS).toContain("academic-paper");
    expect(ALL_PRESET_IDS).toContain("web-article");
    expect(Object.keys(PUBLISHING_PRESETS)).toHaveLength(5);
  });

  test("every preset has a matching id field and both language labels", () => {
    for (const id of ALL_PRESET_IDS) {
      const preset = PUBLISHING_PRESETS[id];
      expect(preset.id).toBe(id);
      expect(preset.labelUrdu.length).toBeGreaterThan(0);
      expect(preset.labelEnglish.length).toBeGreaterThan(0);
    }
  });

  test("Book Manuscript and Academic Paper use generous line spacing", () => {
    expect(PUBLISHING_PRESETS["book-manuscript"].lineHeight).toBeGreaterThanOrEqual(1.8);
    expect(PUBLISHING_PRESETS["academic-paper"].lineHeight).toBe(2);
  });

  test("Newspaper Article uses compact spacing", () => {
    expect(PUBLISHING_PRESETS["newspaper-article"].lineHeight).toBeLessThanOrEqual(1.15);
  });
});

describe("isValidPresetId / getPreset", () => {
  test("accepts known ids", () => {
    expect(isValidPresetId("default")).toBe(true);
    expect(isValidPresetId("web-article")).toBe(true);
  });

  test("rejects unknown ids", () => {
    expect(isValidPresetId("nonsense")).toBe(false);
  });

  test("falls back to default for unrecognized id", () => {
    expect(getPreset("nonsense-id").id).toBe("default");
  });
});

describe("Preset storage serialization (localStorage persistence)", () => {
  test("loadSelectedPresetId returns default when nothing saved", () => {
    delete mockStore["qalam-selected-publishing-preset"];
    expect(loadSelectedPresetId()).toBe("default");
  });

  test("save then load round-trips", () => {
    saveSelectedPresetId("newspaper-article");
    expect(loadSelectedPresetId()).toBe("newspaper-article");
  });

  test("every valid preset id round-trips", () => {
    for (const id of ALL_PRESET_IDS) {
      saveSelectedPresetId(id);
      expect(loadSelectedPresetId()).toBe(id);
    }
  });

  test("corrupt stored value falls back to default", () => {
    mockStore["qalam-selected-publishing-preset"] = "not-a-real-preset";
    expect(loadSelectedPresetId()).toBe("default");
  });
});

describe("Preset application", () => {
  test("applyPresetToSettings updates defaults without needing tip-tap content", () => {
    const selected: PresetId = "book-manuscript";
    saveSelectedPresetId(selected);
    const loadedId = loadSelectedPresetId();
    const preset = getPreset(loadedId);
    expect(preset.id).toBe(selected);
    expect(preset.firstLineIndentMm).toBeGreaterThan(0);

    const next = applyPresetToSettings(defaultDocumentSettings(), selected);
    expect(next.typography.firstLineIndentMm).toBe(preset.firstLineIndentMm);
    expect(next.typography.lineHeight).toBe(preset.lineHeight);
  });
});
