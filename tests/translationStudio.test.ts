// Batch 17A — Translation Studio core tests

import {
  parseProject,
  languageDir,
  SUPPORTED_LANGUAGES,
  defaultBrief,
  type TranslationProject,
} from "../app/tools/translation-studio/utils/translationTypes";
import {
  segmentText,
  makeSegmentId,
  segmentFingerprint,
  nextStatus,
  resolveTargetDir,
} from "../app/tools/translation-studio/utils/segmentation";
import { exportProjectBackup, importProjectBackup } from "../app/tools/translation-studio/utils/projectStore";
import { generateProjectId } from "../app/tools/translation-studio/utils/projectId";

// ── Languages ──────────────────────────────────────────────────────────────

describe("SUPPORTED_LANGUAGES", () => {
  test("exactly 4 languages", () => expect(SUPPORTED_LANGUAGES).toHaveLength(4));
  test("Urdu is rtl", () => expect(languageDir("ur")).toBe("rtl"));
  test("Arabic is rtl", () => expect(languageDir("ar")).toBe("rtl"));
  test("Persian is rtl", () => expect(languageDir("fa")).toBe("rtl"));
  test("English is ltr", () => expect(languageDir("en")).toBe("ltr"));
});

// ── Segment IDs ────────────────────────────────────────────────────────────

describe("makeSegmentId", () => {
  test("format SEG-0001", () => expect(makeSegmentId(1)).toBe("SEG-0001"));
  test("format SEG-0042", () => expect(makeSegmentId(42)).toBe("SEG-0042"));
  test("format SEG-9999", () => expect(makeSegmentId(9999)).toBe("SEG-9999"));
});

// ── Fingerprint ─────────────────────────────────────────────────────────────

describe("segmentFingerprint", () => {
  test("deterministic", () => expect(segmentFingerprint("hello")).toBe(segmentFingerprint("hello")));
  test("different inputs differ", () => expect(segmentFingerprint("hello")).not.toBe(segmentFingerprint("Hello")));
  test("8 hex chars", () => expect(segmentFingerprint("test")).toMatch(/^[0-9a-f]{8}$/));
});

// ── Segmentation ───────────────────────────────────────────────────────────

describe("segmentText", () => {
  test("splits on newlines into segments, skipping empty lines", () => {
    const segs = segmentText("para one\n\npara two\n\npara three", "ur", "en");
    expect(segs).toHaveLength(3);
    expect(segs[0].source).toBe("para one");
    expect(segs[2].source).toBe("para three");
  });

  test("stable IDs in order SEG-0001, SEG-0002…", () => {
    const segs = segmentText("a\nb\nc", "en", "ur");
    expect(segs.map(s => s.id)).toEqual(["SEG-0001", "SEG-0002", "SEG-0003"]);
  });

  test("source is immutable (stored as-is, no normalization)", () => {
    const raw = "  original  text  ";
    const segs = segmentText(raw, "en", "ur");
    // trimmed in filter (empty lines removed) but non-empty lines stored verbatim
    expect(segs[0].source).toBe(raw);
  });

  test("all new segments start as untranslated with empty target", () => {
    const segs = segmentText("hello\nworld", "en", "ur");
    segs.forEach(s => {
      expect(s.status).toBe("untranslated");
      expect(s.target).toBe("");
    });
  });

  test("source fingerprint matches segmentFingerprint of the source", () => {
    const segs = segmentText("test line", "en", "ur");
    expect(segs[0].sourceFingerprint).toBe(segmentFingerprint("test line"));
  });
});

// ── Direction ──────────────────────────────────────────────────────────────

describe("per-segment direction (first-strong)", () => {
  test.each([
    ["اردو اور English", "ur", "rtl"],
    ["English اور اردو", "ur", "ltr"],
    ["123 English text", "ur", "ltr"],
    ["123 اردو متن", "en", "rtl"],
    ["2026-08-16", "ur", "rtl"],  // neutral → language fallback
  ] as const)("'%s' with source lang %s → sourceDir=%s", (text, lang, expectedDir) => {
    const segs = segmentText(text, lang as "ur" | "en", "en");
    expect(segs[0].sourceDir).toBe(expectedDir);
  });
});

describe("resolveTargetDir", () => {
  test("empty target → language fallback", () => {
    expect(resolveTargetDir("", "ur")).toBe("rtl");
    expect(resolveTargetDir("", "en")).toBe("ltr");
  });
  test("Urdu target text → rtl", () => expect(resolveTargetDir("یہ اردو ہے", "en")).toBe("rtl"));
  test("English target text → ltr", () => expect(resolveTargetDir("This is English", "ur")).toBe("ltr"));
});

// ── Status transitions ──────────────────────────────────────────────────────

describe("nextStatus", () => {
  test.each([
    ["untranslated", "edit", "draft"],
    ["draft", "edit", "draft"],
    ["final", "edit", "draft"],     // final edited → back to draft
    ["draft", "set_final", "final"],
    ["draft", "clear", "untranslated"],
    ["final", "clear", "untranslated"],
  ] as const)("%s + %s → %s", (from, event, to) => {
    expect(nextStatus(from, event)).toBe(to);
  });
});

// ── Schema / parseProject ──────────────────────────────────────────────────

describe("parseProject", () => {
  const minimal: TranslationProject = {
    schemaVersion: 1,
    id: "test-id",
    name: "Test",
    sourceLanguage: "ur",
    targetLanguage: "en",
    brief: defaultBrief(),
    segments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test("valid project parses successfully", () => {
    expect(parseProject(minimal)).not.toBeNull();
  });

  test("wrong schemaVersion → null", () => {
    expect(parseProject({ ...minimal, schemaVersion: 2 })).toBeNull();
  });

  test("unknown language → null", () => {
    expect(parseProject({ ...minimal, sourceLanguage: "de" })).toBeNull();
  });

  test("corrupt JSON (null) → null", () => {
    expect(parseProject(null)).toBeNull();
  });

  test("missing id → null", () => {
    expect(parseProject({ ...minimal, id: "" })).toBeNull();
  });

  test("missing segments field → null", () => {
    const { segments: _, ...rest } = minimal;
    expect(parseProject(rest)).toBeNull();
  });
});

// ── Backup ─────────────────────────────────────────────────────────────────

describe("exportProjectBackup / importProjectBackup", () => {
  const segs = segmentText("Source text.\nAnother line.", "en", "ur");
  const project: TranslationProject = {
    schemaVersion: 1,
    id: generateProjectId(),
    name: "Backup Test",
    sourceLanguage: "en",
    targetLanguage: "ur",
    brief: defaultBrief(),
    segments: segs,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test("export produces valid JSON string", () => {
    const json = exportProjectBackup(project);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  test("import restores original project (round-trip)", () => {
    const json = exportProjectBackup(project);
    const result = importProjectBackup(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe(project.name);
      expect(result.value.segments).toHaveLength(2);
    }
  });

  test("corrupted JSON → error", () => {
    const result = importProjectBackup("not valid json {{{");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("corrupt");
  });
});

// ── Source immutability ─────────────────────────────────────────────────────

describe("source immutability", () => {
  test("source text in segments matches input exactly", () => {
    const input = "Draft notes: Review spacing.";
    const segs = segmentText(input, "en", "ur");
    expect(segs[0].source).toBe(input);
  });
});
