import {
  PUBLISHING_PRESETS,
  ALL_PRESET_IDS,
  isValidPresetId,
  getPreset,
  loadSelectedPresetId,
  saveSelectedPresetId,
  type PresetId,
} from "../app/tools/document-studio/utils/publishingPresets";

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
  test("exactly the 4 required presets are defined", () => {
    expect(ALL_PRESET_IDS).toEqual(["default", "book-manuscript", "newspaper-article", "academic-paper"]);
    expect(Object.keys(PUBLISHING_PRESETS)).toHaveLength(4);
  });

  test("every preset has a matching id field and both language labels", () => {
    for (const id of ALL_PRESET_IDS) {
      const preset = PUBLISHING_PRESETS[id];
      expect(preset.id).toBe(id);
      expect(preset.labelUrdu.length).toBeGreaterThan(0);
      expect(preset.labelEnglish.length).toBeGreaterThan(0);
    }
  });

  test("Book Manuscript and Academic Paper both intend double spacing", () => {
    expect(PUBLISHING_PRESETS["book-manuscript"].intendedLineSpacing).toBe("double");
    expect(PUBLISHING_PRESETS["academic-paper"].intendedLineSpacing).toBe("double");
  });

  test("Newspaper Article intends single spacing", () => {
    expect(PUBLISHING_PRESETS["newspaper-article"].intendedLineSpacing).toBe("single");
  });
});

describe("isValidPresetId", () => {
  test("accepts all 4 known preset ids", () => {
    for (const id of ALL_PRESET_IDS) {
      expect(isValidPresetId(id)).toBe(true);
    }
  });

  test("rejects an unknown string", () => {
    expect(isValidPresetId("something-else")).toBe(false);
    expect(isValidPresetId("")).toBe(false);
  });
});

describe("getPreset", () => {
  test("returns the correct preset for a valid id", () => {
    expect(getPreset("academic-paper").labelEnglish).toBe("Academic Paper");
  });

  test("falls back to 'default' for an unrecognized id, rather than throwing", () => {
    expect(getPreset("nonsense-id").id).toBe("default");
  });
});

describe("Preset storage serialization (localStorage persistence)", () => {
  test("loadSelectedPresetId returns 'default' when nothing has been saved", () => {
    delete mockStore["qalam-selected-publishing-preset"];
    expect(loadSelectedPresetId()).toBe("default");
  });

  test("saveSelectedPresetId then loadSelectedPresetId round-trips correctly", () => {
    saveSelectedPresetId("newspaper-article");
    expect(loadSelectedPresetId()).toBe("newspaper-article");
  });

  test("every valid preset id round-trips correctly", () => {
    for (const id of ALL_PRESET_IDS) {
      saveSelectedPresetId(id);
      expect(loadSelectedPresetId()).toBe(id);
    }
  });

  test("loadSelectedPresetId falls back to 'default' when the stored value is corrupt/invalid", () => {
    mockStore["qalam-selected-publishing-preset"] = "not-a-real-preset";
    expect(loadSelectedPresetId()).toBe("default");
  });
});

describe("Preset selection logic", () => {
  test("selecting a preset and looking it up via getPreset gives consistent, matching data", () => {
    const selected: PresetId = "book-manuscript";
    saveSelectedPresetId(selected);
    const loadedId = loadSelectedPresetId();
    const preset = getPreset(loadedId);
    expect(preset.id).toBe(selected);
    expect(preset.intendedFirstLineIndent).toBe(true);
  });
});
